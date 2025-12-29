# Raffle App - DrawScreen Revision 14

## Overview

Revisi untuk fix duplicate key warning dan confirm yang stuck.

| # | Issue | Severity |
|---|-------|----------|
| 1 | Duplicate React key warning setelah redraw | 🔴 Critical |
| 2 | Confirm stuck di "Confirming..." tidak pernah selesai | 🔴 Critical |

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

## Issue 1: Duplicate React Key Warning Setelah Redraw

### Error Message:
```
Warning: Encountered two children with the same key, `mjq0cpv4-7fliokp-2-redraw-0`. 
Keys should be unique so that components maintain their identity across updates. 
Non-unique keys may cause children to be duplicated and/or omitted — the behavior 
is unsupported and could change in a future version.
```

### Analisa Key Format:
```
mjq0cpv4-7fliokp-2-redraw-0
^^^^^^^^ ^^^^^^^ ^ ^^^^^^ ^
   |        |    |    |   |
   |        |    |    |   └── redraw index (0)
   |        |    |    └────── "redraw" marker
   |        |    └─────────── batch number (2)
   |        └──────────────── coupon ID atau slot
   └───────────────────────── winner ID atau participant ID
```

### Analisa yang Diperlukan:
1. Cari dimana key ini di-generate (kemungkinan di winner card rendering)
2. Check apakah redraw create entries dengan key yang sama
3. Check apakah old cancelled entry di-delete sebelum create new
4. Check bagaimana key di-construct untuk winner cards

### Kemungkinan Root Cause:

**Kemungkinan 1: Old winner entry tidak di-delete**
```typescript
// redrawAll() mungkin tidak delete old entry sebelum create new
// Sehingga ada 2 entries dengan slot yang sama

// BUGGY:
const newWinner = await winnerRepository.create({...})
// Old cancelled winner masih ada!

// CORRECT:
await winnerRepository.delete(cancelledWinner.id)  // Delete dulu
const newWinner = await winnerRepository.create({...})
```

**Kemungkinan 2: Key generation tidak unique setelah redraw**
```typescript
// BUGGY key format:
key={`${winner.participantId}-${winner.batchNumber}-redraw-${index}`}
// Jika redraw berkali-kali, index akan sama

// CORRECT key format - gunakan winner.id yang unique:
key={winner.id}
```

**Kemungkinan 3: State tidak di-update dengan benar**
```typescript
// Setelah redraw, state masih hold old + new winners
// Sehingga render duplicate

// BUGGY:
setWinners([...winners, ...newWinners])  // Append, not replace

// CORRECT:
setWinners(prev => {
  // Remove old cancelled, add new
  const withoutCancelled = prev.filter(w => w.status !== 'cancelled')
  return [...withoutCancelled, ...newWinners]
})
```

### Expected Fix:

```typescript
// 1. Gunakan winner.id sebagai key (selalu unique)
{winners.map(winner => (
  <WinnerCard key={winner.id} winner={winner} />
))}

// 2. Pastikan redraw delete old entry
async redrawAll(eventId: string, prizeId: string) {
  const cancelledWinners = await winnerRepository.getCancelledUnconfirmed(prizeId)
  
  for (const cancelled of cancelledWinners) {
    // DELETE old entry FIRST
    await winnerRepository.delete(cancelled.id)
    
    // Then create new
    const newWinner = await winnerRepository.create({...})
  }
}

// 3. Update state correctly
dispatch({ 
  type: 'REDRAW_COMPLETE', 
  payload: {
    deletedIds: cancelledWinners.map(w => w.id),
    newWinners: newWinners
  }
})
```

---

## Issue 2: Confirm Stuck di "Confirming..."

### Symptoms:
- Klik Confirm → button berubah ke "Confirming..." (disabled)
- Proses tidak pernah selesai
- Tidak ada error di console
- UI tetap stuck

### Evidence dari Console:
```
[DrawScreen] handleConfirm called, state: reviewing isConfirming: false
[useDrawState] confirm called
... (tidak ada log lanjutan, tidak ada "confirm succeeded")
```

### Analisa yang Diperlukan:
1. Check `confirm` function di `useDrawState.ts`
2. Trace flow setelah `confirm called` - dimana stuck?
3. Check apakah ada `await` yang tidak resolve
4. Check apakah ada error yang tidak ter-catch
5. Check apakah `try-catch` ada tapi tidak log error

### Kemungkinan Root Cause:

**Kemungkinan 1: Await yang tidak resolve (promise stuck)**
```typescript
// Ada await yang tidak pernah resolve
const confirm = async () => {
  console.log('[useDrawState] confirm called')
  
  // Salah satu await ini stuck:
  await winnerRepository.confirmByPrizeId(prizeId)  // Stuck?
  await couponRepository.voidByParticipantId(...)   // Stuck?
  await someOtherAsyncOperation()                    // Stuck?
  
  console.log('[useDrawState] confirm succeeded')  // Tidak pernah sampai sini
}
```

**Kemungkinan 2: Error tidak ter-catch**
```typescript
// Error terjadi tapi tidak di-catch dengan benar
const confirm = async () => {
  console.log('[useDrawState] confirm called')
  
  try {
    await riskyOperation()  // Throw error
  } catch (e) {
    // Catch tapi tidak log atau re-throw
    // Silent fail, function selesai tanpa log
  }
  
  // Tidak sampai sini jika catch tidak continue
  console.log('[useDrawState] confirm succeeded')
}
```

**Kemungkinan 3: Infinite loop atau deadlock**
```typescript
// Ada loop yang tidak pernah selesai
const confirm = async () => {
  console.log('[useDrawState] confirm called')
  
  while (someConditionNeverFalse) {
    await something()  // Infinite loop
  }
  
  console.log('[useDrawState] confirm succeeded')
}
```

**Kemungkinan 4: State guard yang salah**
```typescript
// Guard condition prevent execution
const confirm = async () => {
  console.log('[useDrawState] confirm called')
  
  // Ini sudah log 'confirm called', tapi masih ada guard setelahnya
  if (state.status !== 'reviewing') {
    console.warn('[useDrawState] Not reviewing, returning')
    return  // Return tanpa log 'succeeded'
  }
  
  if (hasCancelledWinners) {
    console.warn('[useDrawState] Has cancelled, returning')
    return  // Return tanpa log 'succeeded'
  }
  
  // ... rest
}
```

### Debug yang Diperlukan:

```typescript
// Tambahkan log DETAIL di setiap step
const confirm = async () => {
  console.log('[useDrawState] confirm called')
  console.log('[useDrawState] state:', JSON.stringify(state, null, 2))
  
  // Check guards
  if (state.status !== 'reviewing') {
    console.error('[useDrawState] BLOCKED: status is', state.status)
    return
  }
  
  if (hasCancelledWinners) {
    console.error('[useDrawState] BLOCKED: has cancelled winners')
    return
  }
  
  console.log('[useDrawState] Starting confirm process...')
  
  try {
    console.log('[useDrawState] Step 1: confirmByPrizeId...')
    await winnerRepository.confirmByPrizeId(prizeId)
    console.log('[useDrawState] Step 1 done')
    
    console.log('[useDrawState] Step 2: voidCouponsForWinners...')
    await voidCouponsForWinners()
    console.log('[useDrawState] Step 2 done')
    
    console.log('[useDrawState] Step 3: updatePrizeDrawnCount...')
    await prizeRepository.updateDrawnCount(prizeId, count)
    console.log('[useDrawState] Step 3 done')
    
    console.log('[useDrawState] Step 4: dispatch...')
    dispatch({ type: 'CONFIRM_SUCCESS' })
    console.log('[useDrawState] Step 4 done')
    
    console.log('[useDrawState] confirm succeeded')
  } catch (error) {
    console.error('[useDrawState] CONFIRM ERROR:', error)
    console.error('[useDrawState] Error stack:', error.stack)
    throw error  // Re-throw agar bisa di-handle di UI
  }
}
```

### Check Database Operations:

```typescript
// winnerRepository.confirmByPrizeId
async confirmByPrizeId(prizeId: string): Promise<void> {
  console.log('[WinnerRepo] confirmByPrizeId called:', prizeId)
  
  try {
    const result = await db.winners
      .where('prizeId')
      .equals(prizeId)
      .filter(w => w.status === 'valid' && !w.confirmedAt)
      .modify({ confirmedAt: new Date().toISOString() })
    
    console.log('[WinnerRepo] confirmByPrizeId done, modified:', result)
  } catch (error) {
    console.error('[WinnerRepo] confirmByPrizeId ERROR:', error)
    throw error
  }
}
```

---

## Files yang Perlu Dimodifikasi

| File | Issue | Changes |
|------|-------|---------|
| `src/components/draw/WinnerCard.tsx` atau parent | #1 | Fix key generation - gunakan `winner.id` |
| `src/services/drawService.ts` | #1 | Pastikan delete old entry sebelum create new |
| `src/hooks/useDrawState.ts` | #1, #2 | Fix state update logic, add detailed debug logs |
| `src/repositories/winnerRepository.ts` | #2 | Add debug logs, check confirmByPrizeId |
| `src/repositories/couponRepository.ts` | #2 | Add debug logs, check void operations |

---

## Execution Priority

```
1. Issue #2 (Confirm stuck) - BLOCKING, tidak bisa proceed tanpa fix
       ↓
2. Issue #1 (Duplicate key) - Bisa cause unexpected UI behavior
```

---

## Testing Checklist

### Issue #1 (Duplicate Key):
- [ ] No warning di console setelah redraw
- [ ] Winner cards tidak duplicate
- [ ] Each winner card has unique key
- [ ] Setelah redraw, old cancelled tidak tampil duplicate

### Issue #2 (Confirm Stuck):
- [ ] Klik Confirm → proses berjalan
- [ ] Console log semua steps
- [ ] Confirm selesai dalam waktu reasonable (< 5 detik)
- [ ] "Confirming..." berubah ke state selanjutnya
- [ ] Tidak ada silent error
- [ ] winner.confirmedAt ter-set di database

### Debug Verification:
- [ ] Semua console.log muncul secara sequential
- [ ] Identify step mana yang stuck (jika masih stuck)
- [ ] No uncaught errors
- [ ] Database operations complete successfully
