# Raffle App - DrawScreen Revision 18

## Issues & Improvements:

| # | Issue/Improvement | Type | Severity |
|---|-------------------|------|----------|
| 1 | Prize quantity habis tapi masih bisa drawing (qty: 0) | Bug | 🔴 Critical |
| 2 | Create/Wizard page belum responsif | Improvement | 🟡 Medium |
| 3 | Urutan winner berubah setelah redraw | Bug/Improvement | 🟡 Medium |
| 4 | Perlu page detail event (readonly) | New Feature | 🟢 Enhancement |

---

## WAJIB: Analisis Dulu, Fix Kemudian

```
┌─────────────────────────────────────────────────────────────────┐
│  LANGKAH WAJIB:                                                  │
│                                                                  │
│  1. TAMPILKAN CODE YANG RELEVAN                                  │
│  2. TRACE FLOW                                                   │
│  3. IDENTIFY ROOT CAUSE                                          │
│  4. PROPOSE FIX                                                  │
│  5. TUNGGU APPROVAL sebelum implementasi                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Issue 1: Prize Quantity Habis Tapi Masih Bisa Drawing

### Evidence dari Console:
```
[useDrawState] calling drawService.draw, qty: 0    ← Quantity sudah 0!
[Draw] quantity: 0                                  ← Tetap dipanggil!
[Draw] batchNumber: 21                              ← Batch ke-21 (seharusnya max 20)
[Draw] Active coupons count: 129929
[Draw] Complete, results: 0
```

### Problem:
- Prize qty: 20, tapi bisa draw sampai batch 21
- Draw dipanggil dengan quantity: 0
- Tidak ada guard untuk prevent drawing ketika qty habis

### Analisa yang Diperlukan:
1. **Tampilkan** bagaimana `quantity` dihitung untuk setiap draw
2. **Tampilkan** apakah ada check sebelum `drawService.draw()` dipanggil
3. **Tampilkan** apakah tombol Start Draw di-disable ketika qty habis

### Expected Guards:
```typescript
// Guard 1: Di UI - disable Start Draw button
const remainingQty = prize.quantity - prize.drawnCount
const canDraw = remainingQty > 0
<button disabled={!canDraw}>Start Draw</button>

// Guard 2: Di drawService.draw()
if (quantity <= 0) {
  console.log('[Draw] Quantity is 0, nothing to draw')
  return []
}

// Guard 3: Di useDrawState
const quantityToDraw = Math.min(batchSize, remainingQty)
if (quantityToDraw <= 0) {
  throw new Error('No more winners to draw for this prize')
}
```

---

## Issue 2: Create/Wizard Page Belum Responsif

### Problem:
- Home dan History sudah responsif
- Create/Wizard page masih belum responsif

### Analisa yang Diperlukan:
1. **Tampilkan** current layout structure di Wizard pages (Step 1-4)
2. **Identifikasi** hardcoded widths, missing breakpoints
3. **List** komponen-komponen yang perlu diubah

### Responsive Guidelines (sama seperti Rev 13):
```
Breakpoints:
- sm: 640px
- md: 768px  
- lg: 1024px
- xl: 1280px

Pattern:
- Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
- Stack on mobile, side-by-side on desktop
```

---

## Issue 3: Urutan Winner Berubah Setelah Redraw

### Problem:
```
Original order: a, b, c, d, e, f, g, h, i, j
                            ↑
                         f cancelled
                            ↓
After redraw:   a, b, c, d, e, g, h, i, j, k
                                        ↑
                                  k di akhir (seharusnya di posisi f)
```

### Expected Behavior:
```
Original order: a, b, c, d, e, f, g, h, i, j
                            ↑
                         f cancelled
                            ↓
After redraw:   a, b, c, d, e, k, g, h, i, j
                            ↑
                      k menggantikan posisi f
```

### Analisa yang Diperlukan:
1. **Tampilkan** bagaimana redraw winner di-create
2. **Tampilkan** apakah `lineNumber` atau `slot` digunakan untuk urutan
3. **Tampilkan** bagaimana winners di-sort saat display

### Kemungkinan Penyebab:
- Winner baru dibuat dengan `lineNumber` baru (increment), bukan reuse `lineNumber` dari cancelled
- Atau sorting tidak berdasarkan `lineNumber`

### Expected Fix:
```typescript
// redrawAll() - reuse lineNumber dari cancelled winner
const newWinner = await winnerRepository.create({
  ...
  lineNumber: cancelledWinner.lineNumber,  // Reuse posisi!
  ...
})

// Display - sort by lineNumber
const sortedWinners = winners.sort((a, b) => a.lineNumber - b.lineNumber)
```

### Kompleksitas:
- **Tidak kompleks** jika `lineNumber` sudah ada dan tinggal reuse
- Perlu pastikan sorting konsisten di semua tempat display

---

## Issue 4: Perlu Page Detail Event (Readonly)

### Current Pages:
| Route | Page | Purpose |
|-------|------|---------|
| `/` | Home | List events |
| `/event/new` | Create Wizard | Create new event |
| `/event/:id/edit` | Edit Wizard | Edit existing event |
| `/event/:id/draw` | Draw Screen | Drawing process |
| `/event/:id/history` | History | View winners |

### New Page:
| Route | Page | Purpose |
|-------|------|---------|
| `/event/:id` | Event Detail | View event info (readonly) |

---

### Home Page Card UX (Opsi C3 - Contextual by Status):

**Interaction:**
- Klik card body → `/event/:id` (Detail page)
- Klik icon → Quick action langsung

**Status: draft / ready**
```
┌─────────────────────────────────────┐
│  Event Name                 🎲 ✏️ ⋮ │
│  Draft | 5 Prizes | 1000 Coupons   │  ← Klik → Detail
│                                     │
│  Created: 2025-01-15                │
└─────────────────────────────────────┘

🎲 = Draw (/event/:id/draw)
✏️ = Edit (/event/:id/edit)
⋮  = More (History, Delete, Export)
```

**Status: in_progress**
```
┌─────────────────────────────────────┐
│  Event Name                 🎲 📋 ⋮ │
│  In Progress | 3/5 Prizes Done     │  ← Klik → Detail
│                                     │
│  Created: 2025-01-15                │
└─────────────────────────────────────┘

🎲 = Draw (/event/:id/draw)
📋 = History (/event/:id/history)
⋮  = More (Edit, Delete, Export)
```

**Status: completed**
```
┌─────────────────────────────────────┐
│  Event Name                    📋 ⋮ │
│  Completed | 5/5 Prizes Done       │  ← Klik → Detail
│                                     │
│  Created: 2025-01-15                │
└─────────────────────────────────────┘

📋 = History (/event/:id/history)
⋮  = More (Edit, Delete, Export)
```

---

### Event Detail Page Content:

```
Event Detail Page (/event/:id)
├── Header
│   ├── Event Name
│   ├── Status Badge (draft/ready/in_progress/completed)
│   └── Action Buttons [Draw] [History] [Edit] (contextual by status)
│
├── Section: Event Info
│   ├── Description
│   ├── Start Date
│   ├── End Date
│   └── Win Rule (type + maxWins jika limited)
│
├── Section: Prizes
│   ├── Prize 1: Name, Image, Qty, Drawn/Confirmed
│   ├── Prize 2: Name, Image, Qty, Drawn/Confirmed
│   └── ... (card atau table format)
│
├── Section: Participants
│   ├── Total Participants: X
│   ├── Total Coupons: Y
│   └── Active Coupons: Z (remaining in pool)
│
└── Section: Display Settings
    ├── Animation Type
    ├── Winner Display Mode
    ├── Grid: X × Y
    └── Background Image (thumbnail preview)
```

### Detail Page Action Buttons (Contextual):

| Status | Actions |
|--------|---------|
| draft | [Edit] |
| ready | [Start Draw] [Edit] |
| in_progress | [Continue Draw] [History] [Edit] |
| completed | [History] [Edit] |

---

### UI Style:
- Clean, card-based sections
- Readonly display (no editable inputs)
- Responsive (mobile-friendly)
- Consistent with existing design system

---

## Execution Priority

```
1. Issue #1 (Qty guard) - CRITICAL, prevent invalid state
       ↓
2. Issue #3 (Redraw order) - Affects data integrity
       ↓
3. Issue #2 (Wizard responsive) - UI polish
       ↓
4. Issue #4 (Detail page) - New feature
```

---

## Testing Checklist

### Issue #1 (Qty Guard):
- [ ] Prize qty: 20, draw 20 → tidak bisa draw lagi
- [ ] Start Draw button disabled ketika qty habis
- [ ] Console tidak show "quantity: 0"
- [ ] Proper message/UI ketika prize completed

### Issue #2 (Wizard Responsive):
- [ ] Test di 320px, 375px, 768px, 1024px
- [ ] Form inputs tidak overflow
- [ ] Buttons accessible di mobile
- [ ] Steps indicator responsive

### Issue #3 (Redraw Order):
- [ ] Cancel winner di posisi 3
- [ ] Redraw → winner baru di posisi 3 (bukan di akhir)
- [ ] Urutan tampilan tetap konsisten

### Issue #4 (Detail Page):
- [ ] Route `/event/:id` accessible
- [ ] Semua info event ditampilkan
- [ ] Readonly (tidak bisa edit)
- [ ] Links ke edit/draw/history berfungsi
- [ ] Responsive
