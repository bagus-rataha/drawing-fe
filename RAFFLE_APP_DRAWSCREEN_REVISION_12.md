# Raffle App - DrawScreen Revision 12

## Overview

Revisi untuk fix performance issues dan UI bugs setelah Revision 11.

| # | Issue | Severity |
|---|-------|----------|
| 1 | Stuck "Drawing...", sphere tidak berhenti, confetti muncul tapi winner tidak reveal | 🔴 Critical |
| 2 | Reveal animation laggy setelah page 1 (page 2, 3, dst) | 🟡 Medium |
| 3 | Confirm masih butuh 2x klik | 🟡 Medium |
| 4 | History page butuh improvement (pagination, search, cancelled table) | 🟢 Enhancement |
| 5 | Winner tidak muncul di History sampai Ctrl+F5 | 🔴 Critical |
| 6 | Tombol Confirm muncul padahal ada cancelled winner | 🔴 Critical |
| 7 | Performance: void coupon sangat lambat (sequential) | 🔴 Critical |

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

## Issue 1: Stuck "Drawing...", Sphere Tidak Berhenti

### Symptoms:
- Klik Start Draw → Klik Stop Draw
- Tombol berubah ke "Drawing..." dan disabled
- Sphere tetap berputar, tidak berhenti
- Tidak ada winner yang ter-reveal
- Tiba-tiba confetti muncul
- Side panel progress bertambah

### Evidence dari Console:
```
[CouponRepo] Voided coupon: howxpwagl5xk9z
[CouponRepo] Voided coupon: 7734kkvodoajsg
[CouponRepo] Voided coupon: 0lq1y972f50730
... (sangat lambat per line)
```

### Analisa yang Diperlukan:
1. Cari flow dari Stop button → draw() → void coupon
2. Identifikasi apakah void dilakukan sequential (`await` dalam loop)
3. Check apakah UI state update menunggu semua void selesai
4. Check apakah sphere rotation ter-pause saat drawing

### Kemungkinan Root Cause:
- Sequential `await couponRepository.void()` dalam loop
- UI thread ter-block karena menunggu semua DB operations
- State `'drawing'` tidak transition ke `'revealing'` sampai semua void selesai

### Expected Fix:
- Batch void operations (single transaction)
- Atau parallel void dengan `Promise.all()`
- Update UI state sebelum void operations
- Show winners dulu, void di background

---

## Issue 2: Reveal Animation Laggy Setelah Page 1

### Symptoms:
- Page 1 reveal animation smooth
- Batch 50 winners, 10 per page = 5 pages
- Page 2, 3, 4, 5 terasa laggy
- Confetti muncul setelah page 1
- Console log: `[DrawScreen] Revealed: 50 / 50` di akhir

### Evidence:
```
Ketika mencapai reveal terakhir (50/50), laggy hilang
```

### Analisa yang Diperlukan:
1. Cari animation logic di `WinnerRevealAnimation.tsx`
2. Check apakah animation interval berjalan untuk SEMUA 50 cards
3. Check apakah animation hanya perlu untuk visible page (10 cards)

### Kemungkinan Root Cause:
- Animation loop iterasi untuk semua 50 cards, bukan hanya 10 visible
- `setRevealedCount` dipanggil 50x, menyebabkan 50x re-render

### Expected Fix:
- Hanya animasikan cards di current visible page
- Cards di page lain langsung tampil tanpa animation
- Atau: animate semua tapi dengan requestAnimationFrame/batch updates

---

## Issue 3: Confirm Masih Butuh 2x Klik

### Symptoms:
- Klik Confirm pertama → tidak ada respon
- Klik Confirm kedua → baru proceed

### Analisa yang Diperlukan:
1. Check `handleConfirm` function
2. Check `state.status` saat Confirm diklik (harusnya `'reviewing'`)
3. Check apakah `REVEAL_COMPLETE` sudah dispatch sebelum Confirm available
4. Add console.log untuk debug

### Kemungkinan Root Cause:
- Klik pertama: status masih `'revealing'`, guard condition return early
- `onRevealComplete` tidak terpanggil atau terlambat
- Race condition antara animation complete dan button click

### Expected Fix:
- Pastikan `onRevealComplete` dipanggil setelah animation selesai
- Atau: auto-transition setelah timeout
- Atau: relax guard condition

---

## Issue 4: History Page Enhancement

### Requirements:
1. **Per-prize table dengan pagination**
   - Setiap prize punya table terpisah
   - Pagination untuk table besar

2. **Cancelled/Invalid winners table**
   - Table terpisah untuk cancelled winners
   - Show cancel reason

3. **Search functionality**
   - Search by participant name
   - Search by coupon ID
   - Search across all winners

### Analisa yang Diperlukan:
1. Check current History page structure
2. Identify components yang perlu dibuat/modified
3. Check data fetching logic

### Implementation Plan:
- Create `PrizeWinnersTable` component dengan pagination
- Create `CancelledWinnersTable` component
- Add search input dengan filter logic
- Update History page layout

---

## Issue 5: Winner Tidak Muncul di History Sampai Ctrl+F5

### Symptoms:
- Confirm winners di Draw screen
- Buka History page di tab lain
- Winners tidak muncul
- Harus Ctrl+F5 (hard refresh) baru muncul

### Analisa yang Diperlukan:
1. Check React Query cache settings
2. Check apakah `invalidateQueries` dipanggil setelah confirm
3. Check query key untuk history page
4. Check apakah cache stale time terlalu lama

### Kemungkinan Root Cause:
- React Query cache tidak ter-invalidate setelah confirm
- History page query menggunakan cached data
- Tidak ada refetch on focus/mount

### Expected Fix:
- `queryClient.invalidateQueries(['winners'])` setelah confirm
- Set `staleTime: 0` untuk winners query
- Atau: `refetchOnMount: 'always'`

---

## Issue 6: Tombol Confirm Muncul Padahal Ada Cancelled Winner

### Symptoms:
- Ada cancelled winners di batch
- Tombol Confirm tetap muncul
- Seharusnya: hanya Redraw All yang muncul

### Analisa yang Diperlukan:
1. Check button rendering logic di `DrawControls.tsx`
2. Check kondisi untuk show Confirm vs Redraw All
3. Check bagaimana cancelled winners di-detect

### Expected Logic:
```
if (hasCancelledWinners) {
  show: [Redraw All]
} else {
  show: [Confirm]
}
```

### Kemungkinan Root Cause:
- `hasCancelledWinners` tidak dihitung dengan benar
- Logic salah: `&&` vs `||`
- Cancelled winners dari batch sebelumnya tidak di-reset

### Expected Fix:
- Fix cancelled winner detection
- Ensure Confirm ONLY shows when ALL winners valid

---

## Issue 7: Performance - Void Coupon Sangat Lambat

### Symptoms:
- Draw 50 winners
- Console log void coupon sangat lambat (1 per second atau lebih)
- Total blocking time: 50+ seconds

### Evidence:
```
[CouponRepo] Voided coupon: xxx
(long pause)
[CouponRepo] Voided coupon: yyy
(long pause)
...
```

### Analisa yang Diperlukan:
1. Check `draw()` function - bagaimana void dipanggil
2. Check `couponRepository.void()` implementation
3. Check apakah ada index di IndexedDB untuk coupon.id
4. Check apakah ada transaction overhead

### Current Code (Kemungkinan):
```typescript
// Sequential - SLOW!
for (const coupon of selectedCoupons) {
  await couponRepository.void(eventId, coupon.id)
}
```

### Expected Fix - Batch Operation:
```typescript
// Option A: Single transaction with batch modify
await db.transaction('rw', db.coupons, async () => {
  const couponIds = selectedCoupons.map(c => c.id)
  await db.coupons
    .where('id')
    .anyOf(couponIds)
    .modify({ status: 'void' })
})

// Option B: Parallel with Promise.all (less efficient but simpler)
await Promise.all(
  selectedCoupons.map(c => couponRepository.void(eventId, c.id))
)
```

---

## Additional Context

### Data Scale:
- Participants: 1,540
- Coupons: 148,705
- Some participants have 1000+ coupons
- Win rule: `limited` with `maxWins: 2`

### voidByParticipantId Behavior (Expected):
Ketika participant mencapai `maxWins`, SEMUA kupon participant di-void.
- Participant dengan 1000 kupon → 1000 kupon di-void sekaligus
- Ini expected behavior untuk performance pool query
- Namun perlu optimize batch operation

### Active Coupon Count Evidence:
```
Batch 9: [Draw] Active coupons count: 89807
Expected: 148,705 - (8 × 50) = 148,305
Actual: 89,807
Missing: ~59,000 coupons (voided via voidByParticipantId)
```

Ini expected karena beberapa participant besar sudah mencapai maxWins.

---

## Files yang Kemungkinan Perlu Dimodifikasi

| File | Issues |
|------|--------|
| `src/services/drawService.ts` | #1, #7 - batch void operations |
| `src/repositories/couponRepository.ts` | #7 - batch void method |
| `src/components/draw/WinnerRevealAnimation.tsx` | #2 - visible page only animation |
| `src/components/draw/DrawControls.tsx` | #3, #6 - button logic |
| `src/pages/DrawScreen.tsx` | #1, #3, #5 - state management, cache invalidation |
| `src/pages/History.tsx` | #4 - pagination, search, tables |
| `src/components/history/PrizeWinnersTable.tsx` | #4 - new component |
| `src/components/history/CancelledWinnersTable.tsx` | #4 - new component |
| `src/hooks/useWinners.ts` | #5 - query settings |

---

## Execution Priority

```
1. Issue #7 (Performance) - karena mempengaruhi #1
       ↓
2. Issue #1 (Stuck Drawing) - critical UX
       ↓
3. Issue #6 (Confirm dengan Cancelled) - logic error
       ↓
4. Issue #3 (Confirm 2x klik) - UX
       ↓
5. Issue #2 (Animation laggy) - performance
       ↓
6. Issue #5 (Cache invalidation) - data freshness
       ↓
7. Issue #4 (History enhancement) - new feature
```

---

## Testing Checklist

### Issue #1 & #7 (Performance):
- [ ] Draw 50 winners selesai dalam < 5 detik
- [ ] UI tidak stuck di "Drawing..."
- [ ] Sphere berhenti saat stop diklik
- [ ] Winners reveal segera setelah draw selesai

### Issue #2 (Animation):
- [ ] Page 1 animation smooth
- [ ] Page 2+ tidak laggy
- [ ] Cards di page lain sudah revealed saat navigate

### Issue #3 (Confirm):
- [ ] Confirm hanya butuh 1x klik
- [ ] Console log: status = 'reviewing' saat klik

### Issue #4 (History):
- [ ] Setiap prize punya table terpisah
- [ ] Pagination berfungsi
- [ ] Cancelled winners table ada
- [ ] Search berfungsi (by name, by coupon)

### Issue #5 (Cache):
- [ ] Confirm di tab A
- [ ] Refresh tab B (bukan Ctrl+F5)
- [ ] Winners muncul di tab B

### Issue #6 (Button Logic):
- [ ] Ada cancelled → hanya Redraw All
- [ ] Semua valid → hanya Confirm
- [ ] Tidak ada Confirm + Cancelled bersamaan
