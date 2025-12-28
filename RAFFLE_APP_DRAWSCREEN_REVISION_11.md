# Raffle App - DrawScreen Revision 11

## Overview

**CRITICAL BUG FIXES** - Coupon status handling & validation logic.

| # | Issue | Severity |
|---|-------|----------|
| 1 | Valid winner coupon tetap 'active' | 🔴 Critical |
| 2 | Cancelled coupon di-RESTORE saat redraw | 🔴 Critical |
| 3 | Valid winner dari redraw juga tetap 'active' | 🔴 Critical |
| 4 | Duplicate check tidak mempertimbangkan win rule | 🔴 Critical |
| 5 | Confirm button butuh 2x klik | 🟡 Medium |

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## ATURAN ABSOLUT (TIDAK BOLEH DILANGGAR)

```
┌─────────────────────────────────────────────────────────────────┐
│  ATURAN ABSOLUT:                                                 │
│  1. Coupon yang sudah 'void' TIDAK BOLEH kembali ke 'active'    │
│  2. Sekali keluar dari pool = keluar selamanya                  │
│  3. Redraw = ambil coupon BARU, bukan restore yang lama         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Simplify CouponStatus

### BEFORE:
```typescript
export type CouponStatus = 'active' | 'void' | 'cancelled'
```

### AFTER:
```typescript
export type CouponStatus = 'active' | 'void'
```

| Status | Artinya | Di Pool? |
|--------|---------|----------|
| `active` | Bisa di-draw | ✅ Ya |
| `void` | Sudah keluar dari pool (selamanya) | ❌ Tidak |

**Catatan:** Info "mengapa keluar" (cancel reason) ada di **Winner table**, bukan di Coupon.

---

## Part 2: Fix Coupon Status Flow

### Flow yang BENAR:

```
┌─────────────────────────────────────────────────────────────────┐
│                      CORRECT FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DRAW                                                            │
│  ├─ Coupon terpilih (valid/invalid)                             │
│  │   ├─ coupon.status = 'void' ✅ (keluar dari pool)            │
│  │   └─ winner entry created (status: valid/cancelled)          │
│  │                                                               │
│  MANUAL CANCEL                                                   │
│  ├─ Operator cancel valid winner                                │
│  │   ├─ coupon.status = tetap 'void' (tidak kembali!)           │
│  │   └─ winner.status = 'cancelled'                             │
│  │                                                               │
│  REDRAW                                                          │
│  ├─ Draw coupon BARU dari pool                                  │
│  │   ├─ coupon lama: tetap 'void'                               │
│  │   ├─ coupon baru: 'active' → 'void'                          │
│  │   └─ winner entry baru created                               │
│  │                                                               │
│  CONFIRM                                                         │
│  ├─ Finalize valid winners                                      │
│  │   ├─ coupon.status = tetap 'void'                            │
│  │   └─ winner.confirmedAt = Date                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 3: Bug Fixes in drawService.ts

### Bug 1 & 3: Valid Winner Coupon Tetap 'active'

**Current (BUGGY):**
```typescript
// draw() dan redrawAll()
if (!validation.valid) {
  await couponRepository.cancel(eventId, coupon.id)  // Hanya invalid
}
// Valid winner TIDAK di-handle!
```

**Fix:**
```typescript
// draw() - SETELAH create winner entry
await winnerRepository.create({
  ...winner,
  status: validation.valid ? 'valid' : 'cancelled',
})

// Void coupon untuk SEMUA hasil draw (valid maupun invalid)
// Karena coupon sudah "keluar dari bola", tidak boleh masuk lagi
await couponRepository.void(eventId, coupon.id)

// HAPUS conditional lama:
// if (!validation.valid) {
//   await couponRepository.cancel(eventId, coupon.id)
// }
```

### Bug 2: Cancelled Coupon di-RESTORE saat Redraw

**Current (BUGGY - MELANGGAR ATURAN ABSOLUT!):**
```typescript
// redrawAll() line 429-437
console.log('[RedrawAll] Restoring cancelled coupons to active...')
for (const cancelledWinner of cancelledWinners) {
  if (cancelledWinner.couponId) {
    await couponRepository.restore(event.id, cancelledWinner.couponId)  // 🔴 FATAL!
  }
}
```

**Fix - HAPUS SEMUA RESTORE LOGIC:**
```typescript
// redrawAll() - FIXED VERSION

async redrawAll(eventId: string, prizeId: string): Promise<DrawResult[]> {
  const event = await eventRepository.getById(eventId)
  if (!event) throw new Error('Event not found')

  // 1. Get cancelled winners (unconfirmed)
  const cancelledWinners = await winnerRepository.getCancelledUnconfirmed(prizeId)
  
  if (cancelledWinners.length === 0) {
    console.log('[RedrawAll] No cancelled winners to redraw')
    return []
  }

  console.log('[RedrawAll] Found', cancelledWinners.length, 'cancelled winners')

  // ❌ HAPUS RESTORE LOGIC - JANGAN RESTORE CANCELLED COUPONS!
  // for (const cancelledWinner of cancelledWinners) {
  //   await couponRepository.restore(event.id, cancelledWinner.couponId)
  // }

  // 2. Get active coupons (pool) - HANYA yang masih 'active'
  const activeCoupons = await couponRepository.getActive(eventId)
  
  console.log('[RedrawAll] Active pool:', activeCoupons.length)

  if (activeCoupons.length === 0) {
    console.log('[RedrawAll] Pool exhausted!')
    return cancelledWinners.map(w => ({
      ...w,
      status: 'skipped' as const,
      cancelReason: { type: 'pool_exhausted', message: 'Pool kupon habis' }
    }))
  }

  // 3. Get valid winners in current batch to track participants
  const validWinners = await winnerRepository.getValidUnconfirmed(prizeId)
  const currentBatchParticipantIds = validWinners.map(w => w.participantId)

  // 4. Draw NEW coupons untuk menggantikan cancelled winners
  const newWinners: DrawResult[] = []
  let eligibleCoupons = [...activeCoupons]

  for (const cancelledWinner of cancelledWinners) {
    if (eligibleCoupons.length === 0) {
      newWinners.push({
        ...cancelledWinner,
        status: 'skipped',
        cancelReason: { type: 'pool_exhausted', message: 'Pool kupon habis' }
      })
      continue
    }

    // Draw new coupon
    const [selectedCoupon] = weightedRandomSelect(eligibleCoupons, 1)
    
    // Remove from eligible pool (untuk batch ini)
    eligibleCoupons = eligibleCoupons.filter(c => c.id !== selectedCoupon.id)

    // Validate new winner
    const validation = await validateWinner(
      selectedCoupon,
      event,
      currentBatchParticipantIds
    )

    const status = validation.valid ? 'valid' : 'cancelled'

    // Create NEW winner entry
    const newWinner = await winnerRepository.create({
      eventId,
      prizeId,
      couponId: selectedCoupon.id,
      participantId: selectedCoupon.participantId,
      participantName: selectedCoupon.participantName,
      slot: cancelledWinner.slot,
      status,
      cancelReason: validation.valid ? undefined : { 
        type: 'auto', 
        message: validation.reason 
      },
      batchNumber: cancelledWinner.batchNumber,
    })

    // Void the NEW coupon (keluar dari pool selamanya)
    await couponRepository.void(eventId, selectedCoupon.id)

    // Track participant for duplicate check
    if (validation.valid) {
      currentBatchParticipantIds.push(selectedCoupon.participantId)
    }

    newWinners.push(newWinner)

    // Delete old cancelled winner entry
    await winnerRepository.delete(cancelledWinner.id)
  }

  return newWinners
}
```

---

## Part 4: Fix Win Rule Validation

### Bug 4: Duplicate Check Tidak Mempertimbangkan Win Rule

**Situasi yang Salah:**
- Win rule: `limited` dengan `maxWins = 2`
- Participant muncul 2x dalam batch
- Kupon ke-2 di-cancel → **SALAH!** (masih dalam limit)

**Current (BUGGY):**
```typescript
// validateWinner() - SELALU cancel duplicate
const duplicateIndex = currentBatchParticipantIds.indexOf(participantId)
if (duplicateIndex !== -1) {
  return { valid: false, reason: 'Sudah muncul di line sebelumnya' }
}
```

**Fix - Pertimbangkan Win Rule:**
```typescript
// validateWinner() - FIXED

async function validateWinner(
  coupon: Coupon,
  event: Event,
  currentBatchParticipantIds: string[]
): Promise<{ valid: boolean; reason?: string }> {
  
  const { participantId } = coupon
  const { winRule } = event

  // Count berapa kali participant sudah muncul di batch ini
  const countInBatch = currentBatchParticipantIds.filter(
    id => id === participantId
  ).length

  // Get confirmed wins dari database
  const confirmedWins = await winnerRepository.getConfirmedWinCount(
    event.id, 
    participantId
  )

  // Total wins = confirmed + yang sudah ada di batch ini
  const totalWins = confirmedWins + countInBatch

  switch (winRule.type) {
    case 'one-time':
      // Hanya boleh 1x menang
      if (totalWins >= 1) {
        return { 
          valid: false, 
          reason: `Sudah menang ${totalWins}x (max: 1x)` 
        }
      }
      break

    case 'limited':
      // Boleh menang sampai maxWins
      const maxWins = winRule.maxWins || 1
      if (totalWins >= maxWins) {
        return { 
          valid: false, 
          reason: `Sudah menang ${totalWins}x (max: ${maxWins}x)` 
        }
      }
      break

    case 'unlimited':
      // Tidak ada batasan, selalu valid (selama masih punya kupon)
      break
  }

  return { valid: true }
}
```

### Win Rule Behavior Table:

| Rule | Count in Batch | Confirmed Wins | Total | Max | Result |
|------|----------------|----------------|-------|-----|--------|
| `one-time` | 0 | 0 | 0 | 1 | ✅ Valid |
| `one-time` | 1 | 0 | 1 | 1 | ❌ Cancel |
| `one-time` | 0 | 1 | 1 | 1 | ❌ Cancel |
| `limited(2)` | 0 | 0 | 0 | 2 | ✅ Valid |
| `limited(2)` | 1 | 0 | 1 | 2 | ✅ Valid |
| `limited(2)` | 2 | 0 | 2 | 2 | ❌ Cancel |
| `limited(2)` | 0 | 2 | 2 | 2 | ❌ Cancel |
| `limited(2)` | 1 | 1 | 2 | 2 | ❌ Cancel |
| `unlimited` | Any | Any | - | ∞ | ✅ Valid |

---

## Part 5: Fix Confirm Button (Issue 5)

### Problem:
Confirm button harus diklik 2x sebelum lanjut ke Start Draw berikutnya.

### Root Cause:
Status masih `'revealing'` saat user klik Confirm pertama. `REVEAL_COMPLETE` belum dispatch.

### Debug Logs:
```typescript
// src/pages/DrawScreen.tsx

const handleConfirm = useCallback(async () => {
  console.log('=== CONFIRM CLICKED ===')
  console.log('[Confirm] state.status:', state.status)
  
  if (state.status !== 'reviewing') {
    console.warn('[Confirm] BLOCKED! Status is:', state.status)
    return
  }
  
  console.log('[Confirm] Proceeding...')
  // ... rest of logic
}, [state.status])
```

### Fix Option A: Ensure REVEAL_COMPLETE is Called

```typescript
// src/components/draw/WinnerRevealAnimation.tsx

useEffect(() => {
  if (!isRevealing || winners.length === 0) return
  
  let currentIndex = 0
  const totalToReveal = Math.min(winners.length, gridX * gridY)
  
  const interval = setInterval(() => {
    currentIndex++
    setRevealedCount(currentIndex)
    
    if (currentIndex >= totalToReveal) {
      clearInterval(interval)
      
      // IMPORTANT: Small delay then call onRevealComplete
      setTimeout(() => {
        console.log('[Animation] All revealed, calling onRevealComplete')
        onRevealComplete()
      }, 300)
    }
  }, 200)
  
  return () => clearInterval(interval)
}, [isRevealing, winners.length, gridX, gridY, onRevealComplete])
```

### Fix Option B: Auto-transition with Timeout (Backup)

```typescript
// src/pages/DrawScreen.tsx

// Setelah DRAW_COMPLETE dispatch
dispatch({ type: 'DRAW_COMPLETE', winners: results })

// Auto transition jika callback tidak terpanggil
const animationDuration = results.length * 200 + 1500 // buffer
const timeoutId = setTimeout(() => {
  if (state.status === 'revealing') {
    console.log('[Auto] Force transition to reviewing')
    dispatch({ type: 'REVEAL_COMPLETE' })
  }
}, animationDuration)

// Cleanup
return () => clearTimeout(timeoutId)
```

### Fix Option C: Remove Guard (Less Safe)

```typescript
// Jika timing sulit di-fix, bisa relax guard
const handleConfirm = useCallback(async () => {
  // Accept both 'revealing' dan 'reviewing'
  if (!['revealing', 'reviewing'].includes(state.status)) {
    console.warn('[Confirm] Invalid state:', state.status)
    return
  }
  
  // Force transition jika masih revealing
  if (state.status === 'revealing') {
    dispatch({ type: 'REVEAL_COMPLETE' })
    // Small delay untuk state update
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  // ... rest of confirm logic
}, [state.status])
```

---

## Part 6: Update Repository Functions

### couponRepository.ts

```typescript
// HAPUS atau DISABLE restore function
async restore(eventId: string, couponId: string): Promise<void> {
  throw new Error('FATAL: Restore coupon is NOT ALLOWED! Violates absolute rule.')
}

// RENAME cancel → void (untuk clarity)
async void(eventId: string, couponId: string): Promise<void> {
  await db.coupons
    .where('id')
    .equals(couponId)
    .modify({ status: 'void' })
  
  console.log('[CouponRepo] Voided coupon:', couponId)
}

// HAPUS fungsi cancel yang lama jika ada
// async cancel(...) { ... }
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `src/types/index.ts` | Simplify `CouponStatus` to `'active' \| 'void'` |
| `src/services/drawService.ts` | Fix `draw()`, `redrawAll()`, `validateWinner()` |
| `src/repositories/couponRepository.ts` | Rename `cancel()` → `void()`, remove `restore()` |
| `src/components/draw/WinnerRevealAnimation.tsx` | Fix `onRevealComplete` timing |
| `src/pages/DrawScreen.tsx` | Fix confirm handler, add debug logs |

---

## Testing Checklist

### Coupon Status Flow:
- [ ] Draw valid winner → coupon.status = 'void'
- [ ] Draw invalid winner → coupon.status = 'void'
- [ ] Manual cancel → coupon tetap 'void'
- [ ] Redraw → coupon lama tetap 'void', coupon baru jadi 'void'
- [ ] Tidak ada coupon yang kembali ke 'active'

### Win Rule Validation:
- [ ] `one-time`: participant hanya bisa menang 1x
- [ ] `limited(2)`: participant bisa menang 2x dalam batch yang sama ✅
- [ ] `limited(2)`: participant ke-3 di-cancel ❌
- [ ] `unlimited`: participant bisa menang berkali-kali

### Confirm Button:
- [ ] Confirm hanya butuh 1x klik
- [ ] State transition: revealing → reviewing smooth
- [ ] Console log menunjukkan status 'reviewing' saat klik

### Redraw:
- [ ] Redraw tidak restore cancelled coupons
- [ ] Redraw mengambil coupon BARU dari pool
- [ ] Pool exhausted → status 'skipped'

---

## Execution Order

```
1. Update types/index.ts (CouponStatus)
       ↓
2. Update couponRepository.ts (rename cancel → void, remove restore)
       ↓
3. Update drawService.ts (draw, redrawAll, validateWinner)
       ↓
4. Update WinnerRevealAnimation.tsx (timing fix)
       ↓
5. Update DrawScreen.tsx (confirm handler)
       ↓
6. Test semua scenarios
```
