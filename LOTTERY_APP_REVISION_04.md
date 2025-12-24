# React Lottery App - Revision 04

## Overview

Fix pagination - implementasi database-level pagination untuk performance optimal.

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi, approach, potensi impact
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Root Cause Analysis

**Problem:**
Saat edit event di step participant:
- Table muncul kosong (no data) di awal
- Data muncul beberapa saat kemudian

**Penyebab:**
Pagination saat ini dilakukan di **frontend level** - fetch SEMUA data dulu, baru slice:

```typescript
// SALAH - fetch 100K+ records, lalu slice
const allData = await participantRepository.getByEventId(eventId);
const pageData = allData.slice(start, end); // slice di frontend
```

**Solusi:**
Pagination harus di **database level** - hanya fetch data yang dibutuhkan:

```typescript
// BENAR - fetch hanya 50 records yang dibutuhkan
const pageData = await participantRepository.getByEventId(eventId, {
  offset: 0,
  limit: 50
});
```

---

## Solution: Database-Level Pagination

### 1. Update Repository Interface

```typescript
// repositories/interfaces/participantRepository.ts

interface PaginationParams {
  offset: number;
  limit: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface IParticipantRepository {
  // ... existing methods
  
  getByEventIdPaginated(
    eventId: string, 
    params: PaginationParams
  ): Promise<PaginatedResult<Participant>>;
  
  countByEventId(eventId: string): Promise<number>;
}
```

### 2. Update Dexie Repository Implementation

```typescript
// repositories/dexie/participantRepository.ts

export const participantRepository: IParticipantRepository = {
  // ... existing methods
  
  async getByEventIdPaginated(eventId: string, { offset, limit }: PaginationParams) {
    // Get total count
    const total = await db.participants
      .where('eventId').equals(eventId)
      .count();
    
    // Get paginated data
    const data = await db.participants
      .where('eventId').equals(eventId)
      .offset(offset)
      .limit(limit)
      .toArray();
    
    return {
      data,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  },
  
  async countByEventId(eventId: string) {
    return db.participants
      .where('eventId').equals(eventId)
      .count();
  },
};
```

### 3. Update Coupon Repository (sama untuk Detail view)

```typescript
// repositories/dexie/couponRepository.ts

export const couponRepository: ICouponRepository = {
  // ... existing methods
  
  async getByEventIdPaginated(eventId: string, { offset, limit }: PaginationParams) {
    const total = await db.coupons
      .where('eventId').equals(eventId)
      .count();
    
    const data = await db.coupons
      .where('eventId').equals(eventId)
      .offset(offset)
      .limit(limit)
      .toArray();
    
    return {
      data,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  },
};
```

### 4. Update ParticipantTable Component

```typescript
// components/wizard/ParticipantTable.tsx

function ParticipantTable({ eventId, viewMode }: Props) {
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  });
  const [data, setData] = useState<Participant[] | Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch data saat page/pageSize/viewMode berubah
  useEffect(() => {
    fetchPageData();
  }, [eventId, pagination.page, pagination.pageSize, viewMode]);
  
  const fetchPageData = async () => {
    setIsLoading(true);
    
    const offset = (pagination.page - 1) * pagination.pageSize;
    
    try {
      if (viewMode === 'group') {
        // Group view - fetch participants
        const result = await participantRepository.getByEventIdPaginated(
          eventId, 
          { offset, limit: pagination.pageSize }
        );
        setData(result.data);
        setPagination(prev => ({
          ...prev,
          total: result.total,
          totalPages: result.totalPages,
        }));
      } else {
        // Detail view - fetch coupons
        const result = await couponRepository.getByEventIdPaginated(
          eventId,
          { offset, limit: pagination.pageSize }
        );
        setData(result.data);
        setPagination(prev => ({
          ...prev,
          total: result.total,
          totalPages: result.totalPages,
        }));
      }
    } catch (error) {
      toast.error('Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };
  
  const handlePageSizeChange = (newPageSize: number) => {
    setPagination(prev => ({ 
      ...prev, 
      pageSize: newPageSize, 
      page: 1  // reset ke page 1
    }));
  };
  
  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar">
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
        <SearchInput value={searchQuery} onChange={setSearchQuery} />
      </div>
      
      {/* Table with loading overlay */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <Spinner />
          </div>
        )}
        
        <table>
          <thead>...</thead>
          <tbody>
            {data.map(item => (
              <tr key={item.id}>...</tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="pagination">
        <span>
          Showing {((pagination.page - 1) * pagination.pageSize) + 1} - 
          {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
        </span>
        
        <div className="pagination-controls">
          <button 
            disabled={pagination.page === 1 || isLoading}
            onClick={() => handlePageChange(pagination.page - 1)}
          >
            Previous
          </button>
          
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          
          <button
            disabled={pagination.page === pagination.totalPages || isLoading}
            onClick={() => handlePageChange(pagination.page + 1)}
          >
            Next
          </button>
        </div>
        
        <select 
          value={pagination.pageSize}
          onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          disabled={isLoading}
        >
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
      </div>
    </div>
  );
}
```

### 5. Search dengan Database Query (Optional Enhancement)

Untuk search, ada 2 opsi:

**Opsi A: Client-side search (current page only)**
```typescript
const filteredData = data.filter(item => 
  item.id.toLowerCase().includes(searchQuery.toLowerCase())
);
```
- Pro: Simple
- Con: Hanya search di page yang sedang dilihat

**Opsi B: Database-level search**
```typescript
// Repository method
async searchByEventId(eventId: string, query: string, { offset, limit }) {
  // Dexie tidak support LIKE, jadi perlu filter manual
  // Tapi tetap lebih efisien dengan index
  const allMatching = await db.participants
    .where('eventId').equals(eventId)
    .filter(p => 
      p.id.toLowerCase().includes(query.toLowerCase()) ||
      p.name?.toLowerCase().includes(query.toLowerCase())
    )
    .toArray();
  
  return {
    data: allMatching.slice(offset, offset + limit),
    total: allMatching.length,
  };
}
```
- Pro: Search di semua data
- Con: Lebih complex, perlu index yang tepat

**Rekomendasi:** Mulai dengan Opsi A, enhance ke Opsi B jika dibutuhkan.

---

## Loading Animation (WAJIB)

Meskipun delay minimal dengan database-level pagination, loading animation **WAJIB** ditampilkan untuk UX yang baik.

### Opsi 1: Overlay Spinner (Recommended)

```typescript
<div className="relative">
  {/* Loading overlay */}
  {isLoading && (
    <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded">
      <div className="flex flex-col items-center gap-2">
        <Spinner className="h-8 w-8 animate-spin text-blue-500" />
        <span className="text-sm text-gray-500">Memuat data...</span>
      </div>
    </div>
  )}
  
  <table>...</table>
</div>
```

### Opsi 2: Skeleton Rows

```typescript
<tbody>
  {isLoading ? (
    // Skeleton rows saat loading
    Array.from({ length: pagination.pageSize }).map((_, i) => (
      <tr key={i} className="border-b">
        <td className="p-3">
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
        </td>
        <td className="p-3">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </td>
        <td className="p-3">
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
        </td>
        <td className="p-3">
          <div className="h-4 w-8 bg-gray-200 rounded animate-pulse" />
        </td>
      </tr>
    ))
  ) : (
    // Actual data rows
    data.map(item => (
      <tr key={item.id} className="border-b">
        <td className="p-3">{item.id}</td>
        <td className="p-3">{item.name}</td>
        <td className="p-3">{item.couponCount}</td>
        <td className="p-3">
          <button onClick={() => onDelete(item.id)}>🗑️</button>
        </td>
      </tr>
    ))
  )}
</tbody>
```

### Opsi 3: Kombinasi (Best UX)

- **Initial load:** Skeleton rows (full table skeleton)
- **Page change:** Overlay spinner (table tetap terlihat, ada overlay di atas)

```typescript
function ParticipantTable({ eventId, viewMode }: Props) {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  
  const fetchPageData = async (isInitial = false) => {
    if (isInitial) {
      setIsInitialLoading(true);
    } else {
      setIsPageLoading(true);
    }
    
    try {
      // fetch data...
    } finally {
      setIsInitialLoading(false);
      setIsPageLoading(false);
    }
  };
  
  // Initial load - skeleton
  if (isInitialLoading) {
    return <TableSkeleton rows={pagination.pageSize} />;
  }
  
  return (
    <div className="relative">
      {/* Page change - overlay */}
      {isPageLoading && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
          <Spinner />
        </div>
      )}
      
      <table>...</table>
    </div>
  );
}
```

### Spinner Component (jika belum ada)

```typescript
// components/ui/Spinner.tsx

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
```

Atau gunakan spinner dari shadcn/ui jika tersedia.

---

## Execution Order

```
1. Update repository interfaces
   └── Add PaginationParams, PaginatedResult types
       ↓
2. Update Dexie implementations
   ├── participantRepository.getByEventIdPaginated()
   └── couponRepository.getByEventIdPaginated()
       ↓
3. Update ParticipantTable component
   ├── Fetch data per page (bukan semua)
   ├── Handle page change → refetch
   └── Add loading indicator
       ↓
4. Test dengan dataset besar
```

---

## Testing Checklist

- [ ] Edit event → table load cepat (hanya 50 records pertama)
- [ ] **Initial load → skeleton animation muncul**
- [ ] **Page change → overlay spinner muncul**
- [ ] Klik next page → fetch page berikutnya
- [ ] Change page size → reset ke page 1, fetch ulang
- [ ] Toggle Group/Detail → fetch ulang sesuai view
- [ ] Total count benar
- [ ] "Showing X - Y of Z" benar
- [ ] **Animation smooth, tidak flickering**

---

## Performance Comparison

| Approach | 100K records | First Load |
|----------|--------------|------------|
| Fetch all + slice | ~5-10 detik | Lambat |
| Database pagination | ~50-100ms | Cepat |
