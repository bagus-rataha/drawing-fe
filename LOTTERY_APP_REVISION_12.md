# React Lottery App - Revision 12

## Overview

1. Fix delay saat back ke step participant (staleTime)
2. Add totalPrizes ke Event schema (pre-computed)

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi, approach, potensi impact
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Issues

### Issue 1: Delay saat Back ke Step Participant

**Current behavior:**
- Navigate ke step lain → back ke step participant → delay/loading

**Root cause:**
- TanStack Query default `staleTime: 0`
- Data dianggap stale → refetch setiap mount

**Solution:**

Set `staleTime: 5 menit` untuk participant/coupon queries di wizard:

```typescript
// hooks/useParticipants.ts
export function useParticipantsPaginated(
  eventId: string | undefined,
  page: number,
  pageSize: number,
  searchQuery?: string
) {
  return useQuery({
    queryKey: ['participants', 'paginated', eventId, page, pageSize, searchQuery],
    queryFn: () => {...},
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,  // 5 menit
  });
}

// hooks/useCoupons.ts
export function useCouponsPaginated(...) {
  return useQuery({
    // ...
    staleTime: 5 * 60 * 1000,  // 5 menit
  });
}
```

---

### Issue 2: Prize Count Kosong di Event Card

**Current behavior:**
- Event card menampilkan `0 prizes` untuk semua events
- Tidak ada fetch untuk prize count

**Solution:**

Add `totalPrizes` ke Event schema (pre-computed):

**Schema update:**

```typescript
// types/index.ts
interface Event {
  id: string;
  name: string;
  description?: string;
  // ... existing fields
  totalParticipants: number;
  totalCoupons: number;
  totalPrizes: number;  // NEW
}
```

**DB Migration:**

```typescript
// db.ts
const DB_VERSION = X + 1; // increment version

// Jika perlu migrate existing data
db.version(DB_VERSION).stores({
  // ... existing stores
}).upgrade(async tx => {
  // Set default totalPrizes untuk existing events
  await tx.table('events').toCollection().modify(event => {
    if (event.totalPrizes === undefined) {
      event.totalPrizes = 0;
    }
  });
});
```

**Update totalPrizes saat add/remove prize:**

```typescript
// wizardStore.ts atau prizeRepository.ts

// Saat save event dengan prizes
const saveDraft = async () => {
  // ... existing logic
  
  // Update totalPrizes
  await db.events.update(eventId, {
    // ... other fields
    totalPrizes: draft.prizes.length,
  });
};

// Atau di repository level
async savePrizes(eventId: string, prizes: Prize[]) {
  await db.transaction('rw', [db.prizes, db.events], async () => {
    // ... save prizes logic
    
    // Update event totalPrizes
    await db.events.update(eventId, {
      totalPrizes: prizes.length,
    });
  });
}
```

**Update Event Card:**

```typescript
// pages/Home.tsx atau EventCard.tsx

// Hapus prizeCounts memo yang hardcoded 0
// Langsung baca dari event.totalPrizes

<div className="flex items-center gap-1.5">
  <Gift className="h-4 w-4 text-primary" />
  <span className="font-semibold">{event.totalPrizes}</span>
  <span className="text-content-muted">prizes</span>
</div>
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useParticipants.ts` | Add staleTime: 5 min |
| `src/hooks/useCoupons.ts` | Add staleTime: 5 min |
| `src/types/index.ts` | Add totalPrizes to Event |
| `src/db.ts` | Increment version, migrate existing events |
| `src/stores/wizardStore.ts` | Update totalPrizes saat save |
| `src/pages/Home.tsx` | Use event.totalPrizes |
| `src/components/event/EventCard.tsx` | Use event.totalPrizes |

---

## Execution Order

```
1. Add staleTime to queries (Issue 1)
       ↓
2. Add totalPrizes to Event schema (Issue 2)
   ├── Update types
   ├── DB migration
   └── Update save logic
       ↓
3. Update Event Card UI
       ↓
4. Test
```

---

## Testing Checklist

**Issue 1 - staleTime:**
- [ ] Navigate step participant → next → back → instant (no loading)
- [ ] Data tetap konsisten

**Issue 2 - totalPrizes:**
- [ ] Create event dengan 3 prizes → save → card shows "3 prizes"
- [ ] Edit event, add 2 prizes → save → card shows "5 prizes"
- [ ] Edit event, remove 1 prize → save → card shows "4 prizes"
- [ ] Existing events get totalPrizes = 0 after migration
