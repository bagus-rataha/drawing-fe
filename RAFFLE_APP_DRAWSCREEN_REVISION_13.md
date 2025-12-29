# Raffle App - DrawScreen Revision 13

## Overview

Revisi untuk fix search functionality, responsive design, dan button behavior.

| # | Issue | Severity |
|---|-------|----------|
| 1 | Table cancelled coupons tidak bisa di-search | 🟡 Medium |
| 2 | Home dan History page tidak responsif | 🟡 Medium |
| 3 | Confirm masih butuh 2x klik - klik 1 panggil `nextBatch`, klik 2 baru `confirm` | 🔴 Critical |
| 4 | Klik Redraw → cancelled kupon justru bertambah | 🔴 Critical |
| 5 | Tombol Redraw tidak di-disable saat proses redraw | 🔴 Critical |

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

## Issue 1: Table Cancelled Coupons Tidak Bisa Di-Search

### Symptoms:
- Search box ada di History page
- Search berfungsi untuk valid winners table
- Search TIDAK berfungsi untuk cancelled coupons table
- Tidak bisa search by participant name maupun by coupon ID

### Analisa yang Diperlukan:
1. Check `CancelledWinnersTable` component
2. Check apakah search filter diterapkan ke cancelled data
3. Check apakah cancelled table menggunakan search state yang sama

### Kemungkinan Root Cause:
- Search filter hanya diterapkan ke valid winners
- Cancelled table tidak subscribe ke search state
- Atau: search logic terpisah dan tidak include cancelled

### Expected Fix:
```typescript
// Pastikan search filter berlaku untuk kedua table

const filteredCancelledWinners = useMemo(() => {
  if (!searchQuery) return cancelledWinners
  
  const query = searchQuery.toLowerCase()
  return cancelledWinners.filter(winner => 
    winner.participantName?.toLowerCase().includes(query) ||
    winner.participantId?.toLowerCase().includes(query) ||
    winner.couponId?.toLowerCase().includes(query)
  )
}, [cancelledWinners, searchQuery])
```

---

## Issue 2: Home dan History Page Tidak Responsif

### Symptoms:
- Mengubah viewport size via DevTools
- Layout tidak responsive
- Content kadang rata ke kiri
- Tidak optimal untuk mobile view

### Analisa yang Diperlukan:
1. Check current layout structure di Home page
2. Check current layout structure di History page
3. Identifikasi hardcoded widths/margins
4. Check breakpoint usage (jika ada)

### Kemungkinan Root Cause:
- Hardcoded width values (px instead of %)
- Missing responsive classes (Tailwind breakpoints)
- Fixed grid columns tanpa responsive variant
- Container tanpa proper max-width/padding

### Responsive Design Guidelines:

#### Breakpoints (Tailwind Default):
```
sm: 640px   - Mobile landscape / small tablet
md: 768px   - Tablet
lg: 1024px  - Desktop
xl: 1280px  - Large desktop
2xl: 1536px - Extra large
```

#### Container Pattern:
```tsx
// Responsive container
<div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* content */}
</div>
```

#### Grid Pattern:
```tsx
// Responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
  {/* cards */}
</div>
```

#### Table Pattern:
```tsx
// Responsive table wrapper
<div className="overflow-x-auto -mx-4 sm:mx-0">
  <div className="inline-block min-w-full align-middle">
    <table className="min-w-full">
      {/* ... */}
    </table>
  </div>
</div>
```

### Home Page Responsive Requirements:

```tsx
// Home.tsx - Responsive layout

<div className="min-h-screen bg-[#f6f9fc]">
  {/* Header */}
  <header className="bg-white border-b border-[#e2e8f0]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-[#0a2540]">
          Lottery Events
        </h1>
        <button className="w-full sm:w-auto px-4 py-2 bg-[#635bff] text-white rounded-lg">
          Create Event
        </button>
      </div>
    </div>
  </header>

  {/* Content */}
  <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
    {/* Search & Filters */}
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <input 
        className="w-full sm:max-w-xs px-4 py-2 border rounded-lg"
        placeholder="Search events..."
      />
      <select className="w-full sm:w-auto px-4 py-2 border rounded-lg">
        <option>All Status</option>
      </select>
    </div>

    {/* Event Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>

    {/* Empty State */}
    {events.length === 0 && (
      <div className="text-center py-12 sm:py-16">
        <p className="text-[#64748b]">No events found</p>
      </div>
    )}
  </main>
</div>
```

### History Page Responsive Requirements:

```tsx
// History.tsx - Responsive layout

<div className="min-h-screen bg-[#f6f9fc]">
  {/* Header */}
  <header className="bg-white border-b border-[#e2e8f0]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0a2540]">
            {event.name} - Winners
          </h1>
          <p className="text-sm text-[#64748b] mt-1">
            Total: {totalWinners} winners
          </p>
        </div>
        <button className="w-full sm:w-auto px-4 py-2 border rounded-lg">
          Export
        </button>
      </div>
    </div>
  </header>

  {/* Content */}
  <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
    {/* Search */}
    <div className="mb-6">
      <input 
        className="w-full sm:max-w-md px-4 py-2 border rounded-lg"
        placeholder="Search by name or coupon ID..."
      />
    </div>

    {/* Prize Sections */}
    <div className="space-y-6 sm:space-y-8">
      {prizes.map(prize => (
        <section key={prize.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Prize Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-[#e2e8f0]">
            <h2 className="text-lg font-semibold text-[#0a2540]">{prize.name}</h2>
            <p className="text-sm text-[#64748b]">{prize.quantity} winners</p>
          </div>

          {/* Table Wrapper - Responsive Scroll */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#e2e8f0]">
              <thead className="bg-[#f6f9fc]">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider">
                    Participant
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider">
                    Coupon ID
                  </th>
                  <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#e2e8f0]">
                {/* rows */}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 sm:px-6 py-3 border-t border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-[#64748b] text-center sm:text-left">
              Showing 1-10 of 100
            </p>
            <div className="flex justify-center gap-2">
              <button className="px-3 py-1 border rounded">Prev</button>
              <button className="px-3 py-1 border rounded">Next</button>
            </div>
          </div>
        </section>
      ))}
    </div>

    {/* Cancelled Winners Section */}
    <section className="mt-6 sm:mt-8 bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-[#e2e8f0] bg-red-50">
        <h2 className="text-lg font-semibold text-red-700">Cancelled Winners</h2>
      </div>
      
      {/* Same responsive table pattern */}
      <div className="overflow-x-auto">
        {/* table */}
      </div>
    </section>
  </main>
</div>
```

### Mobile-Specific Considerations:

```tsx
// Card view for mobile, table for desktop
<div className="hidden sm:block">
  {/* Table view for desktop */}
  <table>...</table>
</div>

<div className="sm:hidden space-y-3">
  {/* Card view for mobile */}
  {winners.map(winner => (
    <div key={winner.id} className="bg-white p-4 rounded-lg shadow-sm">
      <div className="font-medium">{winner.participantName}</div>
      <div className="text-sm text-[#64748b]">{winner.couponId}</div>
    </div>
  ))}
</div>
```

---

## Issue 3: Confirm Masih Butuh 2x Klik

### Symptoms:
- Klik Confirm pertama → tidak proceed ke confirm
- Klik Confirm kedua → baru proceed

### Evidence dari Console:
```
Klik 1: [useDrawState] confirm called
Klik 2: [useDrawState] confirm succeeded
```

### Analisa yang Diperlukan:
1. Check `useDrawState` hook - function `confirm`
2. Check mengapa klik pertama hanya log `confirm called` tapi tidak `succeeded`
3. Check apakah ada guard condition yang block klik pertama
4. Check apakah ada async operation yang belum selesai saat klik pertama

### Kemungkinan Root Cause:
- Klik pertama: `confirm called` tapi ada condition yang return early sebelum `succeeded`
- State belum ready saat klik pertama (mungkin masih `revealing` bukan `reviewing`)
- Async guard: ada check `isConfirming` yang block klik pertama
- Race condition: state update belum selesai saat user klik

### Debug yang Diperlukan:
```typescript
// Di useDrawState - confirm function
const confirm = async () => {
  console.log('[useDrawState] confirm called')
  console.log('[useDrawState] Current state:', state)
  console.log('[useDrawState] Status:', state.status)
  console.log('[useDrawState] isConfirming:', isConfirming)
  
  // Check guard conditions
  if (state.status !== 'reviewing') {
    console.warn('[useDrawState] BLOCKED! Status is:', state.status)
    return
  }
  
  if (isConfirming) {
    console.warn('[useDrawState] BLOCKED! Already confirming')
    return
  }
  
  // ... proceed with confirm
  console.log('[useDrawState] confirm succeeded')
}
```

---

## Issue 4: Klik Redraw → Cancelled Kupon Bertambah

### Symptoms:
- Ada cancelled winners
- Klik Redraw All
- Cancelled winners justru BERTAMBAH, bukan berkurang

### Analisa yang Diperlukan:
1. Check `redrawAll` function di `drawService.ts`
2. Check apakah redraw dipanggil multiple times (terkait Issue #5)
3. Check apakah validation logic benar untuk redraw results
4. Check apakah old cancelled winners di-delete sebelum create new

### Kemungkinan Root Cause:
1. **Multiple clicks** pada tombol Redraw (tidak ada disable) → Issue #5
2. Redraw tidak delete old cancelled entry, hanya create new
3. Validation selalu return cancelled untuk coupon baru
4. Race condition: redraw dipanggil sebelum yang sebelumnya selesai

### Expected Flow:
```
Redraw All clicked
    ↓
Get cancelled winners (misal 5)
    ↓
For each cancelled:
    - Delete old winner entry
    - Draw new coupon
    - Validate → valid atau cancelled
    - Create new winner entry
    ↓
Result: 
    - Beberapa jadi valid
    - Beberapa mungkin cancelled lagi (tapi jumlah sama atau berkurang)
```

### Debug yang Diperlukan:
```typescript
// Di redrawAll atau handler
console.log('=== REDRAW STARTED ===')
console.log('[Redraw] Cancelled winners before:', cancelledWinners.length)

// ... redraw logic

console.log('[Redraw] New winners:', newWinners.length)
console.log('[Redraw] New cancelled:', newWinners.filter(w => w.status === 'cancelled').length)
console.log('=== REDRAW COMPLETED ===')
```

---

## Issue 5: Tombol Redraw Tidak Di-Disable Saat Proses

### Symptoms:
- Klik Redraw → proses berjalan
- Tombol Redraw masih bisa diklik lagi
- User klik berkali-kali → Issue #4 terjadi

### Analisa yang Diperlukan:
1. Check button disable state di `DrawControls.tsx`
2. Check apakah ada `isRedrawing` state
3. Check loading/processing state management

### Expected Behavior:
```
Klik Redraw
    ↓
Tombol disable + loading indicator
    ↓
Proses redraw (tidak bisa klik lagi)
    ↓
Selesai → tombol enable kembali
```

### Fix:
```typescript
// State
const [isRedrawing, setIsRedrawing] = useState(false)

// Handler
const handleRedraw = async () => {
  if (isRedrawing) return  // Guard
  
  setIsRedrawing(true)
  try {
    await drawService.redrawAll(eventId, prizeId)
    // ... update state
  } finally {
    setIsRedrawing(false)
  }
}

// Button
<button
  onClick={handleRedraw}
  disabled={isRedrawing}
  className={cn(
    "px-6 py-2 rounded-lg",
    isRedrawing 
      ? "bg-gray-300 cursor-not-allowed" 
      : "bg-amber-500 hover:bg-amber-600 text-white"
  )}
>
  {isRedrawing ? (
    <>
      <Spinner className="w-4 h-4 mr-2 inline animate-spin" />
      Redrawing...
    </>
  ) : (
    'Redraw All'
  )}
</button>
```

### Buttons yang Perlu Disable Pattern:
| Button | Disable When |
|--------|--------------|
| Start Draw | `isSpinning`, `isDrawing`, `isRevealing` |
| Stop | `isDrawing` |
| Redraw All | `isRedrawing`, `isConfirming` |
| Confirm | `isRedrawing`, `isConfirming`, `hasCancelledWinners` |

---

## Files yang Perlu Dimodifikasi

| File | Issue | Changes |
|------|-------|---------|
| `src/pages/History.tsx` | #1, #2 | Add search for cancelled, responsive layout |
| `src/components/history/CancelledWinnersTable.tsx` | #1 | Implement search filter |
| `src/pages/Home.tsx` | #2 | Responsive layout |
| `src/hooks/useDrawState.ts` | #3 | Fix confirm vs nextBatch logic |
| `src/components/draw/DrawControls.tsx` | #3, #5 | Fix button handler, add isRedrawing disable |
| `src/pages/DrawScreen.tsx` | #3, #4, #5 | Fix state management, add loading states |
| `src/services/drawService.ts` | #4 | Debug/fix redrawAll logic |

---

## Execution Priority

```
1. Issue #5 (Disable Redraw button) - mencegah #4
       ↓
2. Issue #4 (Cancelled bertambah) - setelah #5 fixed, verify masih terjadi?
       ↓
3. Issue #3 (Confirm 2x klik) - critical UX
       ↓
4. Issue #1 (Cancelled search) - functionality
       ↓
5. Issue #2 (Responsive) - polish
```

---

## Testing Checklist

### Issue #1 (Cancelled Search):
- [ ] Type participant name → cancelled table filtered
- [ ] Type coupon ID → cancelled table filtered
- [ ] Clear search → semua cancelled tampil
- [ ] Search works sama seperti valid winners table

### Issue #2 (Responsive):
- [ ] Open DevTools → Toggle device toolbar
- [ ] Test iPhone SE (320px) → layout tidak broken
- [ ] Test iPhone X (375px) → layout readable
- [ ] Test iPad (768px) → layout uses tablet view
- [ ] Test Desktop (1280px) → layout uses full width
- [ ] No horizontal scrollbar pada body (except tables)
- [ ] Text readable pada semua sizes
- [ ] Buttons tappable pada mobile (min 44px)

### Responsive Breakpoints to Verify:
- [ ] 320px (iPhone SE)
- [ ] 375px (iPhone X/12/13)
- [ ] 414px (iPhone Plus)
- [ ] 768px (iPad)
- [ ] 1024px (iPad Pro / Desktop)
- [ ] 1280px (Desktop)
- [ ] 1536px+ (Large Desktop)

### Home Page Responsive:
- [ ] Header stack vertically on mobile
- [ ] Create button full width on mobile
- [ ] Search/filter stack on mobile
- [ ] Event cards 1 column on mobile, 2 on tablet, 3 on desktop

### History Page Responsive:
- [ ] Header stack on mobile
- [ ] Search full width on mobile
- [ ] Tables scroll horizontally on mobile
- [ ] Pagination controls centered on mobile

### Issue #3 (Confirm 2x klik):
- [ ] Confirm hanya butuh 1x klik
- [ ] Console log: klik 1 = confirm succeeded (bukan nextBatch)
- [ ] Verify logic: last batch → confirm, else → nextBatch

### Issue #4 (Cancelled bertambah):
- [ ] Klik Redraw → cancelled count TIDAK bertambah
- [ ] Cancelled count berkurang atau sama
- [ ] New valid winners muncul

### Issue #5 (Redraw disable):
- [ ] Klik Redraw → button disabled + loading indicator
- [ ] Tidak bisa klik lagi saat proses
- [ ] Setelah selesai → button enabled kembali
- [ ] Semua action buttons disabled saat redraw
