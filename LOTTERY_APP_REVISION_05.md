# React Lottery App - Revision 05

## Overview

Fix search box yang hilang dan delay coupon count di mode edit/existing.

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi, approach, potensi impact
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Issues

### Issue 1: Search Box Hilang

**Current behavior:**
- Edit event → step participant → search box tidak ada
- Search di-hide karena dianggap tidak kompatibel dengan server-side pagination

**Expected behavior:**
- Search box tetap ada
- Search berfungsi untuk filter data

**Solution:**
Implement server-side search dengan database query.

```typescript
// Repository method
async searchByEventId(
  eventId: string, 
  searchQuery: string,
  { offset, limit }: PaginationParams
): Promise<PaginatedResult<Participant>> {
  const query = searchQuery.toLowerCase();
  
  // Filter dengan Dexie
  const filtered = await db.participants
    .where('eventId').equals(eventId)
    .filter(p => 
      p.id.toLowerCase().includes(query) ||
      p.name?.toLowerCase().includes(query)
    )
    .toArray();
  
  const total = filtered.length;
  const data = filtered.slice(offset, offset + limit);
  
  return {
    data,
    total,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  };
}
```

**Hook update:**
```typescript
export function useParticipantsPaginated(
  eventId: string | undefined, 
  page: number, 
  pageSize: number,
  searchQuery?: string  // tambah parameter
) {
  const offset = (page - 1) * pageSize;
  
  return useQuery({
    queryKey: participantKeys.paginated(eventId!, page, pageSize, searchQuery),
    queryFn: () => {
      if (searchQuery?.trim()) {
        return participantRepository.searchByEventId(eventId!, searchQuery, { offset, limit: pageSize });
      }
      return participantRepository.getByEventIdPaginated(eventId!, { offset, limit: pageSize });
    },
    enabled: !!eventId,
  });
}
```

**UI update:**
- Tampilkan search box di semua mode (hapus kondisi hide saat serverSide=true)
- Debounce search input (300ms) untuk avoid excessive queries
- Reset ke page 1 saat search query berubah

---

### Issue 2: Coupon Count Delay

**Current behavior:**
- Toggle ke Group view → participant_id dan name muncul
- Coupon count muncul belakangan (delay dari "-" ke angka)
- UX buruk, terlihat seperti bug

**Root cause:**
Coupon counts di-fetch terpisah dari participants. Dua query terpisah = render terpisah.

**Expected behavior:**
- Semua data muncul bersamaan
- Loading state sampai SEMUA data ready

**Solution A: Gabungkan query (Recommended)**

Fetch coupon counts bersamaan dengan participants dalam 1 operasi:

```typescript
// Repository method
async getByEventIdPaginatedWithCouponCount(
  eventId: string, 
  { offset, limit }: PaginationParams
): Promise<PaginatedResult<ParticipantWithCouponCount>> {
  const total = await db.participants
    .where('eventId').equals(eventId)
    .count();
  
  const participants = await db.participants
    .where('eventId').equals(eventId)
    .offset(offset)
    .limit(limit)
    .toArray();
  
  // Fetch coupon counts untuk participants di page ini
  const participantIds = participants.map(p => p.id);
  const couponCounts = await Promise.all(
    participantIds.map(async (pid) => {
      const count = await db.coupons
        .where('[eventId+participantId]')
        .equals([eventId, pid])
        .count();
      return { participantId: pid, count };
    })
  );
  
  // Merge data
  const couponCountMap = new Map(couponCounts.map(c => [c.participantId, c.count]));
  const dataWithCount = participants.map(p => ({
    ...p,
    couponCount: couponCountMap.get(p.id) || 0,
  }));
  
  return {
    data: dataWithCount,
    total,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  };
}
```

**Solution B: Tunggu kedua query selesai**

Jika tidak ingin mengubah repository, bisa tunggu kedua query di component:

```typescript
const { data: participantsResult, isLoading: isLoadingParticipants } = useParticipantsPaginated(...);
const { data: couponCounts, isLoading: isLoadingCounts } = useCouponCountsByParticipants(...);

// Loading sampai KEDUA query selesai
const isLoading = isLoadingParticipants || isLoadingCounts;

// Baru render table setelah semua ready
if (isLoading) {
  return <TableSkeleton />;
}
```

**Recommendation:** Solution A lebih clean karena 1 query = 1 render.

---

## Implementation Plan

### Phase 0: Loading Animation (Initial Load + Page Change)

**Initial Load:** Skeleton table saat pertama kali mount

```typescript
function StepParticipants({ eventId, mode }: Props) {
  const { data, isLoading } = useParticipantsPaginatedWithCouponCount(...);
  
  // Initial load - full skeleton
  if (isLoading && !data) {
    return <ParticipantTableSkeleton />;
  }
  
  return (
    <div className="relative">
      {/* Page change - overlay spinner (data tetap terlihat) */}
      {isLoading && data && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
          <Spinner />
        </div>
      )}
      
      <ParticipantTable data={data} ... />
    </div>
  );
}
```

**Skeleton Component:**

```typescript
function ParticipantTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Analytics skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 border rounded">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
      
      {/* Table skeleton */}
      <div className="border rounded">
        {/* Toolbar */}
        <div className="p-4 border-b flex justify-between">
          <div className="flex gap-2">
            <div className="h-9 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-9 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-9 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        
        {/* Rows */}
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-3"><div className="h-4 w-24 bg-gray-200 rounded" /></th>
              <th className="p-3"><div className="h-4 w-32 bg-gray-200 rounded" /></th>
              <th className="p-3"><div className="h-4 w-16 bg-gray-200 rounded" /></th>
              <th className="p-3"><div className="h-4 w-12 bg-gray-200 rounded" /></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="border-b">
                <td className="p-3"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
                <td className="p-3"><div className="h-4 w-28 bg-gray-200 rounded animate-pulse" /></td>
                <td className="p-3"><div className="h-4 w-12 bg-gray-200 rounded animate-pulse" /></td>
                <td className="p-3"><div className="h-4 w-8 bg-gray-200 rounded animate-pulse" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination */}
        <div className="p-4 border-t flex justify-between">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-9 bg-gray-200 rounded animate-pulse" />
            <div className="h-9 w-9 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Phase 1: Fix Coupon Count Delay

1. **Update repository interface**
   ```typescript
   interface ParticipantWithCouponCount extends Participant {
     couponCount: number;
   }
   
   getByEventIdPaginatedWithCouponCount(
     eventId: string, 
     params: PaginationParams
   ): Promise<PaginatedResult<ParticipantWithCouponCount>>;
   ```

2. **Implement di dexie repository**
   - Fetch participants dengan pagination
   - Fetch coupon counts untuk participant IDs di page tersebut
   - Merge dan return sebagai satu result

3. **Update hook**
   - Gunakan method baru `getByEventIdPaginatedWithCouponCount`
   - Hapus hook `useCouponCountsByParticipants` jika tidak dipakai lagi

4. **Update component**
   - Langsung pakai `couponCount` dari data, tidak perlu lookup terpisah

### Phase 2: Fix Search Box

1. **Tambah search method di repository**
   ```typescript
   searchByEventId(
     eventId: string, 
     searchQuery: string,
     params: PaginationParams
   ): Promise<PaginatedResult<ParticipantWithCouponCount>>;
   ```

2. **Update hook** untuk terima searchQuery parameter

3. **Update PaginatedTable**
   - Tampilkan search box (hapus kondisi hide)
   - Debounce search input
   - Pass searchQuery ke hook

4. **Update StepParticipants**
   - Manage searchQuery state
   - Reset page ke 1 saat search berubah

---

## Files to Modify

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `ParticipantWithCouponCount` interface |
| `src/repositories/interfaces/participantRepository.ts` | Add new methods |
| `src/repositories/dexie/participantRepository.ts` | Implement new methods |
| `src/hooks/useParticipants.ts` | Update hook dengan couponCount & search |
| `src/hooks/useDebounce.ts` | NEW - debounce hook |
| `src/components/ui/ParticipantTableSkeleton.tsx` | NEW - skeleton component |
| `src/components/wizard/import/PaginatedTable.tsx` | Show search box, debounce |
| `src/components/wizard/StepParticipants.tsx` | Add skeleton, manage search state |

---

## Execution Order

```
1. Types
   └── Add ParticipantWithCouponCount
       ↓
2. Repository interface
   └── Add getByEventIdPaginatedWithCouponCount, searchByEventId
       ↓
3. Repository implementation
   └── Implement both methods with merged coupon count
       ↓
4. Hooks
   ├── Add useDebounce hook
   └── Update useParticipantsPaginated with search support
       ↓
5. UI Components
   ├── Create ParticipantTableSkeleton
   └── Update PaginatedTable (show search box, add debounce)
       ↓
6. StepParticipants
   ├── Add initial loading skeleton
   ├── Add page change overlay spinner
   └── Pass searchQuery to hook, reset page on search
       ↓
7. Test & Build
```

---

## Debounce Implementation

```typescript
// hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage di component
const [searchInput, setSearchInput] = useState('');
const debouncedSearch = useDebounce(searchInput, 300);

// Query hanya jalan setelah user berhenti typing 300ms
const { data } = useParticipantsPaginated(eventId, page, pageSize, debouncedSearch);
```

---

## Testing Checklist

**Initial Loading:**
- [ ] Edit event → step participant → skeleton/loading muncul saat pertama load
- [ ] Loading hilang setelah data ready (participants + coupon counts)
- [ ] Tidak ada flash "empty table" sebelum data muncul

**Coupon Count:**
- [ ] Toggle ke Group view → semua kolom muncul bersamaan
- [ ] Tidak ada "-" yang berubah ke angka (no delay)
- [ ] Loading state sampai semua data ready

**Search:**
- [ ] Search box muncul di mode edit/existing
- [ ] Ketik search → ada delay 300ms sebelum query
- [ ] Search filter bekerja (by participant_id, name)
- [ ] Search reset ke page 1
- [ ] Clear search → kembali ke semua data
- [ ] Pagination tetap work dengan search aktif

**Page Change:**
- [ ] Klik next/prev page → overlay spinner muncul
- [ ] Data lama tetap terlihat di belakang overlay
- [ ] Overlay hilang setelah data baru ready
