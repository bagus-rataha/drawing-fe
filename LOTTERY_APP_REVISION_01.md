# React Lottery App - Revision 01

## Overview

Revisi untuk Phase 1 berdasarkan review. **TIDAK termasuk styling** (akan di-handle terpisah).

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi, approach, potensi impact
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Revision Tasks

### Task 1: Event Info - Date Range Picker

**Lokasi:** `StepEventInfo.tsx`

**Requirement:**
- Tambah field date range untuk waktu event berlangsung
- Klik untuk buka calendar picker
- Pilih start date + end date (dengan waktu)
- Format display: "DD MMM YYYY HH:mm - DD MMM YYYY HH:mm"

**Update Data Model:**
```typescript
interface Event {
  // ... existing fields
  startDate: Date;
  endDate: Date;
}
```

**Library suggestion:** `react-day-picker` atau shadcn/ui DatePicker component

---

### Task 2: Prize Batch Input Fix

**Lokasi:** `StepPrizes.tsx` (atau component terkait)

**Problem:** Input untuk batch mode hanya menerima number, tidak bisa input "15, 10, 10"

**Solution:**
- Ubah dari `<input type="number">` ke `<input type="text">`
- Validasi format: comma-separated numbers
- Parse ke array `[15, 10, 10]` saat save
- Show error jika format salah

**Validation:**
```typescript
// Valid: "15, 10, 10" atau "15,10,10"
// Invalid: "15, abc, 10" atau "15..10"

function parseBatchConfig(input: string): number[] | null {
  const parts = input.split(',').map(s => s.trim());
  const numbers = parts.map(Number);
  
  if (numbers.some(isNaN) || numbers.some(n => n <= 0)) {
    return null; // invalid
  }
  
  return numbers;
}
```

---

### Task 3: Import Participants - Major Enhancement

**Lokasi:** `StepParticipants.tsx` + new components

#### 3.1 Upload Phase (sebelum import)

```
┌─────────────────────────────────────────────────────────────────┐
│ Upload Excel File                                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                     [Drop file here]                        │ │
│ │                     or click to browse                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Uploading: participants.xlsx                                    │
│ [████████████████████░░░░░░░░░░] 67%                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Requirement:**
- Progress bar saat upload/parsing file
- Async parsing untuk file besar

#### 3.2 Preview Phase (setelah upload, sebelum import)

```
┌─────────────────────────────────────────────────────────────────┐
│ Preview Import                                        [Cancel]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─ Analytics ─────────────────────────────────────────────────┐ │
│ │ Total Participants: 50,000                                  │ │
│ │ Total Coupons: 120,000                                      │ │
│ │ Avg Coupons/Participant: 2.4                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Preview Table ─────────────────────────────────────────────┐ │
│ │ [Group] [Detail]                                            │ │
│ │                                                             │ │
│ │ (Group View - default)                                      │ │
│ │ Participant ID    Name         Coupons                      │ │
│ │ ────────────────────────────────────────────                │ │
│ │ P001              John Doe     4,712                        │ │
│ │ P002              Jane Smith   2,103                        │ │
│ │ P003              Bob Lee      891                          │ │
│ │ ...                                                         │ │
│ │                                                             │ │
│ │ (Detail View)                                               │ │
│ │ Coupon ID    Participant ID    Name         Department      │ │
│ │ ────────────────────────────────────────────────────────    │ │
│ │ C00001       P001              John Doe     Marketing       │ │
│ │ C00002       P001              John Doe     Marketing       │ │
│ │ C00003       P002              Jane Smith   Finance         │ │
│ │ ...                                                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                           [Import to Database]  │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.3 Import Phase (saat klik Import to Database)

```
┌─────────────────────────────────────────────────────────────────┐
│ Importing to database...                                        │
│ [████████████████████░░░░░░░░░░] 67%                            │
│ 80,400 / 120,000 coupons                                        │
└─────────────────────────────────────────────────────────────────┘
```

**Requirement:**
- Progress bar saat import ke IndexedDB
- Batch insert untuk performance (misal 1000 records per batch)

#### 3.4 Completed Phase (setelah import selesai)

```
┌─────────────────────────────────────────────────────────────────┐
│ ✅ Import Completed                                  [Re-upload]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─ Analytics ─────────────────────────────────────────────────┐ │
│ │ Total Participants: 50,000                                  │ │
│ │ Total Coupons: 120,000                                      │ │
│ │ Avg Coupons/Participant: 2.4                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Data Table ────────────────────────────────────────────────┐ │
│ │ [Group] [Detail]                                            │ │
│ │ ... (sama seperti preview, tapi dari database)              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.5 Technical Implementation

**Library:** `@tanstack/react-virtual` untuk virtualized table

```typescript
// Contoh virtualized table
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualizedTable({ data }: { data: Participant[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // row height
    overscan: 10,
  });
  
  // ... render virtual rows
}
```

**Batch insert untuk IndexedDB:**
```typescript
async function batchInsert(coupons: Coupon[], batchSize = 1000) {
  const total = coupons.length;
  let processed = 0;
  
  for (let i = 0; i < total; i += batchSize) {
    const batch = coupons.slice(i, i + batchSize);
    await db.coupons.bulkAdd(batch);
    
    processed += batch.length;
    onProgress?.(processed / total * 100);
  }
}
```

---

### Task 4: Display Settings Fix

**Lokasi:** `StepDisplay.tsx`

**Current (salah):**
```
Show Coupon ID: [toggle]
Display the coupon ID on winner cards
```

**Should be:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Winner Display Options                                          │
│                                                                 │
│ What to show during drawing:                                    │
│                                                                 │
│ ○ Coupon ID only                                                │
│ ○ Coupon ID + Participant ID                                    │
│ ○ Coupon ID + Participant Name    ← (disabled jika tidak ada    │
│                                      kolom name di Excel)       │
└─────────────────────────────────────────────────────────────────┘
```

**Update Data Model:**
```typescript
type WinnerDisplayMode = 'coupon-only' | 'coupon-participant-id' | 'coupon-participant-name';

interface DisplaySettings {
  backgroundImage?: string;
  animationType: AnimationType;
  winnerDisplayMode: WinnerDisplayMode;  // ganti showCouponId
  customFieldsToShow: string[];
}
```

**Logic:**
- Opsi "Coupon ID + Participant Name" hanya enabled jika Excel import punya kolom `participant_name`
- Perlu track `hasParticipantName: boolean` di event atau participant store

---

### Task 5: Prize Drag & Drop Fix

**Lokasi:** `StepPrizes.tsx`

**Problem:** UI drag handle ada tapi tidak fungsional

**Solution:** Implementasi dengan `@dnd-kit/core` dan `@dnd-kit/sortable`

```typescript
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';

function PrizeList({ prizes, onReorder }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const oldIndex = prizes.findIndex(p => p.id === active.id);
      const newIndex = prizes.findIndex(p => p.id === over.id);
      
      const reordered = arrayMove(prizes, oldIndex, newIndex);
      // Update sequence numbers
      const withSequence = reordered.map((p, i) => ({ ...p, sequence: i + 1 }));
      onReorder(withSequence);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={prizes} strategy={verticalListSortingStrategy}>
        {prizes.map(prize => (
          <SortablePrizeItem key={prize.id} prize={prize} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

---

## Dependencies to Add

```bash
npm install @tanstack/react-virtual @dnd-kit/core @dnd-kit/sortable
```

Untuk date picker, jika belum ada:
```bash
npm install react-day-picker date-fns
```
Atau gunakan shadcn/ui DatePicker jika sudah tersedia.

---

## Execution Order

```
1. Task 5: Prize Drag & Drop Fix
   └── Install @dnd-kit, implement functionality
       ↓
2. Task 2: Prize Batch Input Fix
   └── Change input type, add validation
       ↓
3. Task 1: Event Info Date Range
   └── Add date picker component
       ↓
4. Task 4: Display Settings Fix
   └── Change from toggle to radio options
       ↓
5. Task 3: Import Enhancement (biggest task)
   ├── Install @tanstack/react-virtual
   ├── Create progress bar component
   ├── Create analytics summary component
   ├── Create virtualized table component
   ├── Implement Group/Detail toggle
   └── Implement batch insert with progress
```

---

## Notes

- **Styling tetap polos** - akan di-handle di revisi terpisah setelah user memberikan preferensi
- Pastikan semua perubahan **backward compatible** dengan data yang sudah ada
- Test dengan data besar (100K+ records) untuk validasi performance virtualized table
