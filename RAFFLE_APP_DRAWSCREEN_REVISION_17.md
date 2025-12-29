# Raffle App - DrawScreen Revision 17

## Issues:

| # | Issue | Severity |
|---|-------|----------|
| 1 | Tombol Confirm kadang berfungsi, kadang tidak | 🔴 Critical |
| 2 | Redraw All → cancelled count bertambah/berkurang tidak konsisten | 🔴 Critical |

---

## WAJIB: Analisis Dulu, Fix Kemudian

```
┌─────────────────────────────────────────────────────────────────┐
│  LANGKAH WAJIB:                                                  │
│                                                                  │
│  1. TAMPILKAN CODE YANG RELEVAN                                  │
│     - drawService.ts → redrawAll(), confirm()                   │
│     - useDrawState.ts → handler redraw, confirm, state update   │
│     - DrawControls.tsx → button logic, counting                 │
│     - winnerRepository.ts → getCancelledUnconfirmed()           │
│                                                                  │
│  2. TRACE FLOW                                                   │
│     - Dari button click sampai state update                     │
│     - Bagaimana cancelled count dihitung?                       │
│     - Filter apa yang dipakai di setiap tempat?                 │
│                                                                  │
│  3. IDENTIFY ROOT CAUSE                                          │
│     - Apakah filter berbeda di tempat berbeda?                  │
│     - Apakah state tidak sync dengan database?                  │
│     - Apakah ada race condition?                                │
│     - Apakah batchNumber dipakai dengan benar?                  │
│                                                                  │
│  4. TUNGGU APPROVAL sebelum fix                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pertanyaan untuk Analisis

### Issue 1: Confirm Kadang Berfungsi, Kadang Tidak

1. **Tampilkan** function `confirm()` di `drawService.ts`
2. **Tampilkan** bagaimana confirm di-trigger di `useDrawState.ts` atau `DrawScreen.tsx`
3. **Jawab:**
   - Filter apa yang dipakai untuk check cancelled?
   - Apakah menggunakan `batchNumber`?
   - Apakah menggunakan `confirmedAt`?

### Issue 2: Cancelled Count Tidak Konsisten

1. **Tampilkan** function `redrawAll()` di `drawService.ts`
2. **Tampilkan** bagaimana cancelled count dihitung di button (`DrawControls.tsx`)
3. **Tampilkan** bagaimana state di-update setelah redraw
4. **Jawab:**
   - Cancelled count di button dari STATE atau DATABASE?
   - Filter apa yang dipakai untuk count?
   - Apakah sama dengan filter di `redrawAll()`?
   - Apakah state di-update dengan benar setelah redraw?

---

## Expected Analysis Output

Setelah analisis, Claude CLI harus memberikan:

```
### ROOT CAUSE ANALYSIS

#### Issue 1 (Confirm):
- Code saat ini: [snippet]
- Masalah: [deskripsi]
- Bukti: [line number, logic yang salah]

#### Issue 2 (Cancelled Count):
- Button count logic: [snippet]
- redrawAll filter: [snippet]
- State update logic: [snippet]
- Masalah: [deskripsi - apakah filter berbeda? state tidak sync?]

### PROPOSED FIX
[Setelah root cause jelas, baru propose fix]
```

---

## JANGAN LANGSUNG FIX TANPA ANALISIS!

Claude CLI harus **membaca code dulu** dan **identify masalah spesifik** sebelum membuat perubahan.
