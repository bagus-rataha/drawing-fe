# Raffle App - DrawScreen Revision 16

## Issues:

| # | Issue | Severity |
|---|-------|----------|
| 1 | Confirm sangat lambat (2 detik × 50 = 100 detik) | 🔴 Critical |
| 2 | REVERT: Delete cancelled winner saat redraw (kesalahan Rev 11 & 14) | 🔴 Critical |

---

## WAJIB: Untuk Setiap Issue

```
┌─────────────────────────────────────────────────────────────────┐
│  UNTUK SETIAP ISSUE:                                             │
│                                                                  │
│  1. ANALISA ROOT CAUSE                                           │
│     - Cari code yang terkait                                     │
│     - Identifikasi mengapa bug terjadi                          │
│     - Tampilkan code snippet yang bermasalah                    │
│                                                                  │
│  2. BUAT PLAN                                                    │
│     - Files yang akan dimodifikasi                              │
│     - Perubahan yang akan dilakukan                             │
│                                                                  │
│  3. TUNGGU APPROVAL dari user                                    │
│                                                                  │
│  4. EKSEKUSI setelah approved                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Issue 1: Confirm Sangat Lambat

### Problem:
```
[CONFIRM] Step 7.50: Voiding for winner mjq5mbhy-zjwscbd
... (2 detik per winner)
... (50 winners × 2 detik = 100 detik total!)
```

### Root Cause:
Void coupon dilakukan **SEQUENTIAL** - satu per satu dengan `await` dalam loop.

```typescript
// CURRENT - SANGAT LAMBAT!
for (const winner of validWinners) {
  console.log('[CONFIRM] Voiding for winner', winner.id)
  await voidCouponsForWinner(winner)  // 2 detik per operation!
}
// Total: 50 × 2 detik = 100 detik
```

---

## SOLUTION: BATCH OPERATION

### Option A: Single Transaction dengan Batch Modify (RECOMMENDED)

```typescript
// useDrawState.ts atau drawService.ts - confirm function

const confirm = async () => {
  console.log('[CONFIRM] Starting batch confirm...')
  
  const validWinners = currentBatchWinners.filter(w => w.status === 'valid')
  console.log('[CONFIRM] Valid winners count:', validWinners.length)
  
  if (validWinners.length === 0) {
    dispatch({ type: 'CONFIRM_SUCCESS' })
    return
  }
  
  const now = new Date().toISOString()
  
  try {
    // SINGLE TRANSACTION untuk semua operations
    await db.transaction('rw', [db.winners, db.coupons], async () => {
      
      // Step 1: Batch confirm all winners
      console.log('[CONFIRM] Step 1: Batch confirming winners...')
      const winnerIds = validWinners.map(w => w.id)
      await db.winners
        .where('id')
        .anyOf(winnerIds)
        .modify({ confirmedAt: now })
      console.log('[CONFIRM] Step 1: DONE')
      
      // Step 2: Batch void all winning coupons
      console.log('[CONFIRM] Step 2: Batch voiding coupons...')
      const couponIds = validWinners.map(w => w.couponId)
      await db.coupons
        .where('id')
        .anyOf(couponIds)
        .modify({ status: 'void' })
      console.log('[CONFIRM] Step 2: DONE')
      
      // Step 3: Handle win rule (void remaining coupons for participants who reached max)
      console.log('[CONFIRM] Step 3: Handling win rule...')
      await handleWinRuleBatch(validWinners)
      console.log('[CONFIRM] Step 3: DONE')
    })
    
    console.log('[CONFIRM] All operations completed!')
    dispatch({ type: 'CONFIRM_SUCCESS' })
    
  } catch (error) {
    console.error('[CONFIRM] ERROR:', error)
    throw error
  }
}
```

### Option B: Promise.all untuk Parallel Operations

```typescript
const confirm = async () => {
  const validWinners = currentBatchWinners.filter(w => w.status === 'valid')
  const now = new Date().toISOString()
  
  // Parallel confirm all winners
  console.log('[CONFIRM] Parallel confirming winners...')
  await Promise.all(
    validWinners.map(w => 
      db.winners.update(w.id, { confirmedAt: now })
    )
  )
  
  // Parallel void all coupons
  console.log('[CONFIRM] Parallel voiding coupons...')
  await Promise.all(
    validWinners.map(w => 
      db.coupons.update(w.couponId, { status: 'void' })
    )
  )
  
  dispatch({ type: 'CONFIRM_SUCCESS' })
}
```

### Option C: Bulk Operations dengan Dexie

```typescript
const confirm = async () => {
  const validWinners = currentBatchWinners.filter(w => w.status === 'valid')
  const now = new Date().toISOString()
  
  // Bulk update winners
  console.log('[CONFIRM] Bulk updating winners...')
  const updatedWinners = validWinners.map(w => ({
    ...w,
    confirmedAt: now
  }))
  await db.winners.bulkPut(updatedWinners)
  
  // Bulk update coupons - need to fetch first
  console.log('[CONFIRM] Fetching coupons to void...')
  const couponIds = validWinners.map(w => w.couponId)
  const coupons = await db.coupons
    .where('id')
    .anyOf(couponIds)
    .toArray()
  
  console.log('[CONFIRM] Bulk voiding coupons...')
  const voidedCoupons = coupons.map(c => ({
    ...c,
    status: 'void' as const
  }))
  await db.coupons.bulkPut(voidedCoupons)
  
  dispatch({ type: 'CONFIRM_SUCCESS' })
}
```

---

## Win Rule Batch Handler

```typescript
// Handle win rule in batch (not one by one)
async function handleWinRuleBatch(
  validWinners: Winner[], 
  event: Event
): Promise<void> {
  const { winRule } = event
  
  switch (winRule.type) {
    case 'one-time':
      // Void ALL coupons for ALL winning participants
      console.log('[WinRule] one-time: voiding all participant coupons')
      const participantIds = [...new Set(validWinners.map(w => w.participantId))]
      await db.coupons
        .where('participantId')
        .anyOf(participantIds)
        .filter(c => c.eventId === event.id && c.status === 'active')
        .modify({ status: 'void' })
      break
      
    case 'limited':
      // Check each participant's win count and void if reached max
      console.log('[WinRule] limited: checking participant win counts')
      const participantWinCounts = new Map<string, number>()
      
      // Count wins per participant
      for (const winner of validWinners) {
        const count = participantWinCounts.get(winner.participantId) || 0
        participantWinCounts.set(winner.participantId, count + 1)
      }
      
      // Get participants who reached max
      const maxWins = winRule.maxWins || 1
      const participantsAtMax: string[] = []
      
      for (const [participantId, batchWins] of participantWinCounts) {
        // Get previous confirmed wins
        const previousWins = await db.winners
          .where('participantId')
          .equals(participantId)
          .filter(w => w.eventId === event.id && w.confirmedAt && w.status === 'valid')
          .count()
        
        if (previousWins + batchWins >= maxWins) {
          participantsAtMax.push(participantId)
        }
      }
      
      // Void all coupons for participants at max
      if (participantsAtMax.length > 0) {
        console.log('[WinRule] Voiding coupons for', participantsAtMax.length, 'participants at max')
        await db.coupons
          .where('participantId')
          .anyOf(participantsAtMax)
          .filter(c => c.eventId === event.id && c.status === 'active')
          .modify({ status: 'void' })
      }
      break
      
    case 'unlimited':
      // Do nothing - only void winning coupon (already done)
      console.log('[WinRule] unlimited: no additional voiding needed')
      break
  }
}
```

---

## Performance Comparison

| Method | 50 Winners | Time |
|--------|------------|------|
| Sequential (current) | 50 × 2s | ~100 seconds |
| Single Transaction | 1 batch | ~1-2 seconds |
| Promise.all | Parallel | ~2-3 seconds |
| Bulk Operations | 2 batches | ~1-2 seconds |

**Expected improvement: 50-100x faster!**

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useDrawState.ts` | Replace sequential void with batch operation |
| `src/services/drawService.ts` | Update confirm logic if exists here |
| `src/repositories/winnerRepository.ts` | Add `bulkConfirm` method |
| `src/repositories/couponRepository.ts` | Add `bulkVoid` method |

---

## Implementation Steps

### Step 1: Add Batch Methods to Repositories

```typescript
// winnerRepository.ts
async bulkConfirm(winnerIds: string[]): Promise<number> {
  console.log('[WinnerRepo] bulkConfirm, count:', winnerIds.length)
  const now = new Date().toISOString()
  
  return await db.winners
    .where('id')
    .anyOf(winnerIds)
    .modify({ confirmedAt: now })
}

// couponRepository.ts
async bulkVoid(couponIds: string[]): Promise<number> {
  console.log('[CouponRepo] bulkVoid, count:', couponIds.length)
  
  return await db.coupons
    .where('id')
    .anyOf(couponIds)
    .modify({ status: 'void' })
}

async bulkVoidByParticipantIds(eventId: string, participantIds: string[]): Promise<number> {
  console.log('[CouponRepo] bulkVoidByParticipantIds, count:', participantIds.length)
  
  return await db.coupons
    .where('participantId')
    .anyOf(participantIds)
    .filter(c => c.eventId === eventId && c.status === 'active')
    .modify({ status: 'void' })
}
```

### Step 2: Update Confirm Function

```typescript
// useDrawState.ts - confirm function
const confirm = async () => {
  console.log('[CONFIRM] Starting...')
  const startTime = Date.now()
  
  const validWinners = state.currentBatchWinners.filter(w => w.status === 'valid')
  
  if (validWinners.length === 0) {
    console.log('[CONFIRM] No valid winners')
    dispatch({ type: 'CONFIRM_SUCCESS' })
    return
  }
  
  try {
    // All in single transaction
    await db.transaction('rw', [db.winners, db.coupons], async () => {
      // 1. Bulk confirm winners
      const winnerIds = validWinners.map(w => w.id)
      await winnerRepository.bulkConfirm(winnerIds)
      
      // 2. Bulk void winning coupons
      const couponIds = validWinners.map(w => w.couponId)
      await couponRepository.bulkVoid(couponIds)
      
      // 3. Handle win rule
      await handleWinRuleBatch(validWinners, event)
    })
    
    const elapsed = Date.now() - startTime
    console.log(`[CONFIRM] Completed in ${elapsed}ms`)
    
    dispatch({ type: 'CONFIRM_SUCCESS' })
    
  } catch (error) {
    console.error('[CONFIRM] Error:', error)
    throw error
  }
}
```

---

## Testing Checklist

- [ ] Confirm 50 winners dalam < 5 detik (bukan 100 detik)
- [ ] Console log tidak show 50 iterasi terpisah
- [ ] Single batch log: "bulkConfirm, count: 50"
- [ ] Single batch log: "bulkVoid, count: 50"
- [ ] Win rule tetap berfungsi dengan benar
- [ ] No errors di console
- [ ] Winners ter-confirm di database
- [ ] Coupons ter-void di database

---

## Issue 2: REVERT Delete Cancelled Winner (Kesalahan Rev 11 & 14)

### Problem:
Di Revision 11 dan 14, ada instruksi yang **SALAH** untuk delete cancelled winner saat redraw:

```typescript
// SALAH - INI YANG HARUS DI-REVERT!
// Delete old cancelled winner entry first
console.log('[RedrawAll] Deleting old cancelled winner:', cancelledWinner.id)
await winnerRepository.delete(cancelledWinner.id)
```

### Dampak:
- Cancelled winners **HILANG** dari database
- **History page table cancelled KOSONG** karena datanya sudah di-delete
- Tidak ada audit trail

### Fix - HAPUS DELETE LOGIC:

Cari dan **HAPUS** semua code seperti ini di `redrawAll()`:

```typescript
// HAPUS LINE INI:
await winnerRepository.delete(cancelledWinner.id)

// HAPUS JUGA LOG-NYA JIKA ADA:
console.log('[RedrawAll] Deleting old cancelled winner:', cancelledWinner.id)
```

### Flow yang BENAR:

```typescript
// redrawAll() - CORRECT VERSION

async redrawAll(eventId: string, prizeId: string): Promise<DrawResult[]> {
  // 1. Get cancelled winners
  const cancelledWinners = await winnerRepository.getCancelledUnconfirmed(prizeId)
  
  if (cancelledWinners.length === 0) {
    return []
  }
  
  // 2. Get active coupons
  const activeCoupons = await couponRepository.getActive(eventId)
  
  // 3. For each cancelled winner, draw NEW coupon
  const newWinners: DrawResult[] = []
  
  for (const cancelledWinner of cancelledWinners) {
    // Draw new coupon
    const [newCoupon] = weightedRandomSelect(eligibleCoupons, 1)
    
    // Validate
    const validation = await validateWinner(newCoupon, event, currentBatchParticipantIds)
    
    // ❌ JANGAN DELETE cancelled winner!
    // await winnerRepository.delete(cancelledWinner.id) // HAPUS INI!
    
    // ✅ Cancelled winner TETAP ADA di database untuk audit
    // History page akan tampilkan di table cancelled
    
    // Create NEW winner entry (slot baru, bukan replace)
    const newWinner = await winnerRepository.create({
      eventId,
      prizeId,
      couponId: newCoupon.id,
      participantId: newCoupon.participantId,
      participantName: newCoupon.participantName,
      lineNumber: getNextLineNumber(),  // Line number baru
      batchNumber: cancelledWinner.batchNumber,
      status: validation.valid ? 'valid' : 'cancelled',
      cancelReason: validation.valid ? undefined : {
        type: 'auto',
        message: validation.reason
      },
      drawnAt: new Date()
    })
    
    // Void new coupon
    await couponRepository.void(eventId, newCoupon.id)
    
    newWinners.push(newWinner)
  }
  
  return newWinners
}
```

### Penjelasan:
- Cancelled winner **TETAP ADA** di database
- Saat redraw, **CREATE winner BARU** (tidak replace/delete yang lama)
- History page menampilkan:
  - **Table Winners:** semua winner dengan `status = 'valid'` dan `confirmedAt != null`
  - **Table Cancelled:** semua winner dengan `status = 'cancelled'`

### Data di Database Setelah Redraw:

| id | slot | couponId | status | Keterangan |
|----|------|----------|--------|------------|
| winner-1 | 1 | coupon-A | valid | Winner pertama |
| winner-2 | 2 | coupon-B | cancelled | Cancelled, tidak di-delete |
| winner-3 | 3 | coupon-C | valid | Hasil redraw untuk slot 2 |

---

## Files to Modify

| File | Issue | Changes |
|------|-------|---------|
| `src/hooks/useDrawState.ts` | #1 | Batch operation untuk confirm |
| `src/services/drawService.ts` | #1, #2 | Batch operation, HAPUS delete logic |
| `src/repositories/winnerRepository.ts` | #1 | Add bulkConfirm method |
| `src/repositories/couponRepository.ts` | #1 | Add bulkVoid method |

---

## Testing Checklist (Issue 2)

- [ ] Redraw **TIDAK** delete cancelled winner
- [ ] Setelah redraw, cancelled winner masih ada di database
- [ ] History page table cancelled **TETAP MENAMPILKAN** data
- [ ] New winner dari redraw adalah entry terpisah (bukan replace)
