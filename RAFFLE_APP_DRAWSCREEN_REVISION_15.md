# Raffle App - DrawScreen Revision 15

## CRITICAL: Confirm Button Stuck - HARUS SOLVE!

### Problem:
```
[DrawScreen] handleConfirm called, state: reviewing isConfirming: false
[useDrawState] confirm called
... (STUCK - tidak ada log lanjutan, tidak pernah selesai)
```

---

## LANGKAH 1: TAMPILKAN CODE SAAT INI

**SEBELUM melakukan apapun, tampilkan FULL CODE dari function-function berikut:**

```bash
# Jalankan command ini dan tampilkan hasilnya:

# 1. useDrawState hook - function confirm
cat src/hooks/useDrawState.ts

# 2. DrawScreen - handleConfirm
cat src/pages/DrawScreen.tsx

# 3. winnerRepository - confirmByPrizeId
cat src/repositories/winnerRepository.ts

# 4. couponRepository - void functions
cat src/repositories/couponRepository.ts

# 5. drawService - jika ada confirm related
cat src/services/drawService.ts
```

**TUNGGU USER APPROVAL sebelum melanjutkan.**

---

## LANGKAH 2: TRACE DENGAN CONSOLE.LOG SETIAP LINE

Setelah melihat code, tambahkan console.log di SETIAP LINE dalam function confirm:

```typescript
// useDrawState.ts - confirm function
const confirm = async () => {
  console.log('[CONFIRM] Step 0: Function entered')
  
  // Log semua variables
  console.log('[CONFIRM] state:', state)
  console.log('[CONFIRM] prizeId:', prizeId)
  console.log('[CONFIRM] eventId:', eventId)
  console.log('[CONFIRM] currentBatchWinners:', currentBatchWinners)
  
  // SETIAP kondisi if harus ada log
  if (someCondition) {
    console.log('[CONFIRM] BLOCKED BY: someCondition')
    return
  }
  
  console.log('[CONFIRM] Step 1: Passed all guards')
  
  // SETIAP await harus ada log sebelum dan sesudah
  console.log('[CONFIRM] Step 2: About to call winnerRepository.confirmByPrizeId')
  try {
    await winnerRepository.confirmByPrizeId(prizeId)
    console.log('[CONFIRM] Step 2: DONE - confirmByPrizeId')
  } catch (error) {
    console.error('[CONFIRM] Step 2: ERROR -', error)
    throw error
  }
  
  console.log('[CONFIRM] Step 3: About to call voidCoupons')
  try {
    await voidCoupons()
    console.log('[CONFIRM] Step 3: DONE - voidCoupons')
  } catch (error) {
    console.error('[CONFIRM] Step 3: ERROR -', error)
    throw error
  }
  
  // ... dst untuk setiap operation
  
  console.log('[CONFIRM] Step FINAL: All done')
}
```

---

## LANGKAH 3: CHECK COMMON STUCK POINTS

### A. Check jika ada infinite loop atau deadlock:

```typescript
// Cari pattern seperti ini:
while (condition) {
  // Jika condition tidak pernah false = infinite loop
}

// Atau forEach dengan await (tidak akan wait):
items.forEach(async (item) => {
  await something(item)  // TIDAK AKAN WAIT!
})

// HARUS pakai for...of:
for (const item of items) {
  await something(item)  // Ini baru wait
}
```

### B. Check jika ada Promise yang tidak resolve:

```typescript
// Promise tanpa resolve
new Promise((resolve, reject) => {
  // Lupa panggil resolve()!
})

// Atau await pada function yang bukan async
const syncFunction = () => { return 'value' }
await syncFunction()  // Ini akan instant, tapi kalau function throw...
```

### C. Check try-catch yang swallow error:

```typescript
// BUGGY - error di-catch tapi tidak di-handle
try {
  await something()
} catch (e) {
  // Silent! Tidak ada log, tidak re-throw
}

// CORRECT
try {
  await something()
} catch (e) {
  console.error('ERROR:', e)
  throw e  // Re-throw agar caller tahu
}
```

### D. Check conditional return tanpa log:

```typescript
// BUGGY - return tanpa log
if (state.status !== 'reviewing') return

// CORRECT
if (state.status !== 'reviewing') {
  console.warn('[CONFIRM] EARLY RETURN: status is', state.status)
  return
}
```

---

## LANGKAH 4: SIMPLIFY UNTUK TEST

Jika masih tidak ketemu, SIMPLIFY function untuk test:

```typescript
const confirm = async () => {
  console.log('[CONFIRM] START - simplified version')
  
  // Hapus semua logic dulu, cuma test basic flow
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  console.log('[CONFIRM] END - simplified version')
  
  // Dispatch success
  dispatch({ type: 'CONFIRM_SUCCESS' })
}
```

Jika ini WORKS, berarti masalah ada di salah satu operation yang dihapus.
Tambahkan kembali satu per satu sampai ketemu yang stuck.

---

## LANGKAH 5: CHECK DATABASE OPERATIONS

### winnerRepository.confirmByPrizeId:

```typescript
async confirmByPrizeId(prizeId: string): Promise<void> {
  console.log('[WinnerRepo] confirmByPrizeId START, prizeId:', prizeId)
  
  // Check if there are winners to confirm
  const winners = await db.winners
    .where('prizeId')
    .equals(prizeId)
    .filter(w => w.status === 'valid' && !w.confirmedAt)
    .toArray()
  
  console.log('[WinnerRepo] Winners to confirm:', winners.length)
  
  if (winners.length === 0) {
    console.log('[WinnerRepo] No winners to confirm, returning')
    return
  }
  
  // Modify
  console.log('[WinnerRepo] About to modify...')
  const modified = await db.winners
    .where('prizeId')
    .equals(prizeId)
    .filter(w => w.status === 'valid' && !w.confirmedAt)
    .modify({ confirmedAt: new Date().toISOString() })
  
  console.log('[WinnerRepo] Modified count:', modified)
  console.log('[WinnerRepo] confirmByPrizeId END')
}
```

### couponRepository void operations:

```typescript
async voidByWinnerCouponIds(couponIds: string[]): Promise<void> {
  console.log('[CouponRepo] voidByWinnerCouponIds START, count:', couponIds.length)
  
  if (couponIds.length === 0) {
    console.log('[CouponRepo] No coupons to void, returning')
    return
  }
  
  console.log('[CouponRepo] About to modify...')
  const modified = await db.coupons
    .where('id')
    .anyOf(couponIds)
    .modify({ status: 'void' })
  
  console.log('[CouponRepo] Modified count:', modified)
  console.log('[CouponRepo] voidByWinnerCouponIds END')
}
```

---

## KEMUNGKINAN BUG SPESIFIK

### Bug 1: filter() pada Dexie query tidak bekerja dengan modify()

```typescript
// BUGGY - filter + modify tidak work seperti expected di Dexie
await db.winners
  .where('prizeId')
  .equals(prizeId)
  .filter(w => w.status === 'valid')  // Filter di JS, bukan query
  .modify({ confirmedAt: now })        // Modify semua hasil where, BUKAN hasil filter!

// CORRECT - pakai toArray dulu, lalu update satu-satu
const winners = await db.winners
  .where('prizeId')
  .equals(prizeId)
  .filter(w => w.status === 'valid' && !w.confirmedAt)
  .toArray()

for (const winner of winners) {
  await db.winners.update(winner.id, { confirmedAt: now })
}

// ATAU gunakan bulkPut
const updated = winners.map(w => ({ ...w, confirmedAt: now }))
await db.winners.bulkPut(updated)
```

### Bug 2: voidByParticipantId dengan participant yang punya banyak kupon

```typescript
// Jika participant punya 1000+ kupon, ini bisa timeout
async voidByParticipantId(eventId: string, participantId: string) {
  // Single query untuk void ribuan coupons
  await db.coupons
    .where(['eventId', 'participantId'])
    .equals([eventId, participantId])
    .modify({ status: 'void' })
}

// SOLUTION: Batch jika terlalu banyak
async voidByParticipantId(eventId: string, participantId: string) {
  const coupons = await db.coupons
    .where('participantId')
    .equals(participantId)
    .filter(c => c.eventId === eventId && c.status === 'active')
    .toArray()
  
  console.log('[CouponRepo] Coupons to void:', coupons.length)
  
  // Batch update
  const BATCH_SIZE = 100
  for (let i = 0; i < coupons.length; i += BATCH_SIZE) {
    const batch = coupons.slice(i, i + BATCH_SIZE)
    await db.coupons.bulkPut(
      batch.map(c => ({ ...c, status: 'void' }))
    )
    console.log('[CouponRepo] Voided batch', i / BATCH_SIZE + 1)
  }
}
```

### Bug 3: Transaction deadlock

```typescript
// BUGGY - nested transactions bisa deadlock
await db.transaction('rw', db.winners, async () => {
  await db.transaction('rw', db.coupons, async () => {  // NESTED = DEADLOCK!
    await db.coupons.modify(...)
  })
})

// CORRECT - single transaction with multiple tables
await db.transaction('rw', [db.winners, db.coupons], async () => {
  await db.winners.modify(...)
  await db.coupons.modify(...)
})
```

---

## QUICK FIX ATTEMPT

Jika tidak punya waktu untuk debug penuh, coba quick fix ini:

```typescript
// useDrawState.ts - confirm function

const confirm = async () => {
  console.log('[CONFIRM] Starting...')
  
  try {
    // Get valid winners
    const validWinners = currentBatchWinners.filter(w => w.status === 'valid')
    console.log('[CONFIRM] Valid winners:', validWinners.length)
    
    if (validWinners.length === 0) {
      console.log('[CONFIRM] No valid winners, skipping')
      dispatch({ type: 'CONFIRM_SUCCESS' })
      return
    }
    
    // Confirm winners one by one (slower but more reliable)
    const now = new Date().toISOString()
    for (const winner of validWinners) {
      console.log('[CONFIRM] Confirming winner:', winner.id)
      await db.winners.update(winner.id, { confirmedAt: now })
    }
    console.log('[CONFIRM] All winners confirmed')
    
    // Void coupons one by one
    for (const winner of validWinners) {
      console.log('[CONFIRM] Voiding coupon:', winner.couponId)
      await db.coupons.update(winner.couponId, { status: 'void' })
    }
    console.log('[CONFIRM] All coupons voided')
    
    // Dispatch success
    console.log('[CONFIRM] Dispatching success')
    dispatch({ type: 'CONFIRM_SUCCESS' })
    console.log('[CONFIRM] DONE!')
    
  } catch (error) {
    console.error('[CONFIRM] ERROR:', error)
    // Reset confirming state
    setIsConfirming(false)
    throw error
  }
}
```

---

## FILES TO CHECK

| File | What to Look For |
|------|------------------|
| `src/hooks/useDrawState.ts` | `confirm` function - setiap line |
| `src/repositories/winnerRepository.ts` | `confirmByPrizeId` - database operations |
| `src/repositories/couponRepository.ts` | `void`, `voidByParticipantId` - database operations |
| `src/services/drawService.ts` | Any confirm-related logic |
| `src/db/index.ts` | Database schema, indexes |

---

## TESTING

Setelah fix, test dengan:
1. Draw beberapa winners
2. Klik Confirm
3. Console harus show semua steps sampai "DONE!"
4. Button harus kembali ke state normal
5. Winners harus ter-confirm di database (check IndexedDB)
