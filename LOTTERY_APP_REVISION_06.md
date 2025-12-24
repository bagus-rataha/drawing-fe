# React Lottery App - Revision 06

## Overview

1. Fix loading animation scope - skeleton hanya di datatable saat page change
2. Fix search di mode Detail yang tidak bisa diketik
3. Fix pagination performance dengan **pre-computed couponCount** (bukan N+1 query)

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi, approach, potensi impact
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Issues

### Issue 1: Loading Skeleton Scope Terlalu Luas

**Current behavior:**
- Pindah page → skeleton muncul di SEMUA area (analytics + datatable)

**Expected behavior:**
- Pindah page → loading overlay/skeleton HANYA di datatable
- Analytics tetap terlihat (tidak perlu loading karena data statis)

**Solution:**

Pisahkan loading state:
- `isInitialLoading` → full skeleton (analytics + table) - hanya pertama kali
- `isPageLoading` → overlay di table saja

```typescript
function StepParticipants({ eventId, mode }: Props) {
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const { data, isLoading, isFetching } = useParticipantsPaginatedWithCouponCount(...);
  
  // Track initial load completion
  useEffect(() => {
    if (data && !hasInitiallyLoaded) {
      setHasInitiallyLoaded(true);
    }
  }, [data, hasInitiallyLoaded]);
  
  const isInitialLoading = !hasInitiallyLoaded && isLoading;
  const isPageChanging = hasInitiallyLoaded && isFetching;
  
  // Initial load - full skeleton
  if (isInitialLoading) {
    return <FullPageSkeleton />; // analytics + table skeleton
  }
  
  return (
    <div>
      {/* Analytics - TIDAK ada loading overlay */}
      <AnalyticsSummary 
        totalParticipants={data?.total || 0}
        totalCoupons={totalCoupons}
      />
      
      {/* Table - dengan loading overlay saat page change */}
      <div className="relative">
        {isPageChanging && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
            <Spinner />
          </div>
        )}
        
        <ParticipantTable data={data} ... />
      </div>
    </div>
  );
}
```

---

### Issue 2: Search di Mode Detail Tidak Bisa Diketik

**Current behavior:**
- Toggle ke Detail view → search field tidak bisa diketik
- Kemungkinan: input tidak ter-handle atau ada issue dengan state

**Root cause kemungkinan:**
1. Search state tidak di-share antara Group dan Detail view
2. Input onChange tidak ter-bind dengan benar di Detail mode
3. Re-render yang reset input value

**Solution:**

Check dan fix search input handling:

```typescript
// PaginatedTable.tsx atau StepParticipants.tsx

// Pastikan search state di-lift ke parent dan di-share ke kedua view
const [searchQuery, setSearchQuery] = useState('');

// Pastikan onChange handler benar
<input
  type="text"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  placeholder="Search..."
  // Pastikan TIDAK ada kondisi yang disable input di Detail mode
/>
```

**Debug checklist:**
- [ ] Cek apakah input punya `disabled` prop di Detail mode
- [ ] Cek apakah input punya `readOnly` prop
- [ ] Cek apakah `onChange` handler ter-bind
- [ ] Cek apakah ada CSS `pointer-events: none` di Detail mode
- [ ] Cek console untuk error

**Kemungkinan fix:**

```typescript
// Jika search field berbeda untuk Group dan Detail, unify:
<PaginatedTable
  // ... props
  searchQuery={searchQuery}           // controlled dari parent
  onSearchChange={setSearchQuery}     // handler dari parent
  viewMode={viewMode}                 // group atau detail
/>

// Di dalam PaginatedTable - search input SAMA untuk kedua mode:
<input
  type="text"
  value={searchQuery}
  onChange={(e) => onSearchChange(e.target.value)}
  placeholder={viewMode === 'group' ? 'Search participant...' : 'Search coupon...'}
/>
```

---

### Issue 3: Pagination Performance Lambat

**Root Cause: N+1 Query Problem**

Saat pindah page (50 records per page):
```
1 query: fetch 50 participants
50 queries: fetch coupon count untuk SETIAP participant
─────────────────────────────────────────────────
Total: 51 queries ke IndexedDB = LAMBAT
```

**Solusi yang SALAH:**
```typescript
// JANGAN - fetch semua coupon lalu count di memory
const allCoupons = await db.coupons.where('eventId').equals(eventId).toArray();
// Masalah: miliaran kupon = memory crash, pagination jadi sia-sia
```

**Solusi yang BENAR: Pre-computed Coupon Count**

Simpan `couponCount` langsung di Participant table, bukan query setiap kali.

```typescript
interface Participant {
  id: string;
  eventId: string;
  name?: string;
  couponCount: number;  // ← PRE-COMPUTED saat import
  // ...
}
```

**Kapan couponCount di-update:**

| Event | Action |
|-------|--------|
| Import Excel | Hitung jumlah kupon per participant, simpan ke `couponCount` |
| Delete coupon | Decrement `couponCount` participant terkait |
| Add coupon (jika ada) | Increment `couponCount` participant terkait |

**Kapan Event analytics di-update:**

| Action | Event.totalParticipants | Event.totalCoupons |
|--------|-------------------------|-------------------|
| Import Excel | Set jumlah participant | Set jumlah kupon |
| Delete coupon | - | Decrement 1 |
| Delete participant | Decrement 1 | Decrement sebanyak `participant.couponCount` |
| Add coupon (jika ada) | - | Increment 1 |

**Query jadi sangat simple:**
```typescript
// CEPAT - 1 query saja, couponCount sudah embedded
const participants = await db.participants
  .where('eventId').equals(eventId)
  .offset(offset)
  .limit(limit)
  .toArray();

// Tidak perlu query coupon sama sekali untuk display table
// participants[0].couponCount sudah ada

// Analytics juga dari Event, bukan query count
const event = await db.events.get(eventId);
// event.totalParticipants, event.totalCoupons sudah ada
```

**Perbandingan:**

| Approach | Queries/page | Memory | Scalability |
|----------|--------------|--------|-------------|
| N+1 query (current) | 51 | OK | ❌ Lambat |
| Fetch all coupons | 1 | ❌ Crash | ❌ Tidak scalable |
| Pre-computed (recommended) | 1 | OK | ✅ O(1) konstan |

**Keuntungan untuk Phase 2:**
- Pattern sama untuk SQL database
- Bisa pakai database trigger untuk auto-update count
- Query tetap simple: `SELECT * FROM participants WHERE eventId = ? LIMIT ? OFFSET ?`

---

## Implementation Plan

### Phase 1: Fix Loading Scope

1. Tambah `hasInitiallyLoaded` state
2. Bedakan `isInitialLoading` vs `isPageChanging`
3. Initial: full skeleton
4. Page change: overlay di table saja

### Phase 2: Fix Detail Search

1. Debug: cek console untuk error
2. Pastikan search input controlled dari parent
3. Pastikan onChange handler tidak di-block di Detail mode
4. Test ketik di input

### Phase 3: Pre-computed Coupon Count (Performance Fix)

**Step 1: Update Participant type**
```typescript
// types/index.ts
interface Participant {
  id: string;
  eventId: string;
  name?: string;
  email?: string;
  phone?: string;
  customFields: Record<string, string>;
  couponCount: number;  // TAMBAH INI
  winCount: number;
  status: ParticipantStatus;
}
```

**Step 2: Update Excel import logic**
```typescript
// services/excelService.ts atau tempat import logic

async function importParticipants(eventId: string, rows: ExcelRow[]) {
  // Group coupons by participant
  const couponsByParticipant = new Map<string, number>();
  
  rows.forEach(row => {
    const pid = row.participant_id;
    couponsByParticipant.set(pid, (couponsByParticipant.get(pid) || 0) + 1);
  });
  
  // Create participants with couponCount
  const participants: Participant[] = [];
  const uniqueParticipants = new Map<string, ExcelRow>();
  
  rows.forEach(row => {
    if (!uniqueParticipants.has(row.participant_id)) {
      uniqueParticipants.set(row.participant_id, row);
    }
  });
  
  uniqueParticipants.forEach((row, pid) => {
    participants.push({
      id: pid,
      eventId,
      name: row.participant_name,
      couponCount: couponsByParticipant.get(pid) || 0,  // SET SAAT IMPORT
      winCount: 0,
      status: 'active',
      customFields: { ... },
    });
  });
  
  await participantRepository.bulkAdd(participants);
}
```

**Step 3: Update delete coupon logic**
```typescript
// Saat delete coupon, decrement participant couponCount + event totalCoupons
async function deleteCoupon(eventId: string, couponId: string) {
  const coupon = await couponRepository.getById(eventId, couponId);
  
  if (coupon) {
    // Delete coupon
    await couponRepository.delete(eventId, couponId);
    
    // Decrement participant couponCount
    const participant = await participantRepository.getById(eventId, coupon.participantId);
    if (participant) {
      await participantRepository.update(eventId, participant.id, {
        couponCount: participant.couponCount - 1,
      });
    }
    
    // Decrement event totalCoupons
    const event = await eventRepository.getById(eventId);
    if (event) {
      await eventRepository.update(eventId, {
        totalCoupons: event.totalCoupons - 1,
      });
    }
  }
}
```

**Step 3b: Update delete participant logic**
```typescript
// Saat delete participant, decrement event totalParticipants + totalCoupons
async function deleteParticipant(eventId: string, participantId: string) {
  const participant = await participantRepository.getById(eventId, participantId);
  
  if (participant) {
    // Delete all coupons of this participant
    await couponRepository.deleteByParticipantId(eventId, participantId);
    
    // Delete participant
    await participantRepository.delete(eventId, participantId);
    
    // Update event analytics
    const event = await eventRepository.getById(eventId);
    if (event) {
      await eventRepository.update(eventId, {
        totalParticipants: event.totalParticipants - 1,
        totalCoupons: event.totalCoupons - participant.couponCount,
      });
    }
  }
}
```

**Step 4: Simplify repository query**
```typescript
// repositories/dexie/participantRepository.ts

async getByEventIdPaginated(eventId: string, { offset, limit }: PaginationParams) {
  const total = await db.participants
    .where('eventId').equals(eventId)
    .count();
  
  const data = await db.participants
    .where('eventId').equals(eventId)
    .offset(offset)
    .limit(limit)
    .toArray();
  
  // TIDAK PERLU query coupon counts lagi
  // data[].couponCount sudah ada
  
  return {
    data,
    total,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  };
}
```

**Step 5: Remove unused coupon count methods**
- Hapus `getCountsByParticipantIds()` di couponRepository
- Hapus `useCouponCountsByParticipants()` hook
- Hapus logic merge couponCount di component

**Step 6: Update Event analytics saat delete**

Event model sudah punya `totalParticipants` dan `totalCoupons`. Perlu di-update saat delete:

```typescript
// Saat delete participant
async function deleteParticipant(eventId: string, participantId: string) {
  const participant = await participantRepository.getById(eventId, participantId);
  
  if (participant) {
    // Delete all coupons milik participant
    await couponRepository.deleteByParticipantId(eventId, participantId);
    
    // Delete participant
    await participantRepository.delete(eventId, participantId);
    
    // Update Event analytics
    const event = await eventRepository.getById(eventId);
    if (event) {
      await eventRepository.update(eventId, {
        totalParticipants: event.totalParticipants - 1,
        totalCoupons: event.totalCoupons - participant.couponCount,
      });
    }
  }
}

// Saat delete coupon
async function deleteCoupon(eventId: string, couponId: string) {
  const coupon = await couponRepository.getById(eventId, couponId);
  
  if (coupon) {
    // Delete coupon
    await couponRepository.delete(eventId, couponId);
    
    // Decrement participant couponCount
    const participant = await participantRepository.getById(eventId, coupon.participantId);
    if (participant) {
      await participantRepository.update(eventId, participant.id, {
        couponCount: participant.couponCount - 1,
      });
    }
    
    // Decrement Event totalCoupons
    const event = await eventRepository.getById(eventId);
    if (event) {
      await eventRepository.update(eventId, {
        totalCoupons: event.totalCoupons - 1,
      });
    }
  }
}
```

**Summary update logic:**

| Action | Participant.couponCount | Event.totalParticipants | Event.totalCoupons |
|--------|-------------------------|-------------------------|---------------------|
| Import Excel | Set per participant | Set total | Set total |
| Delete participant | - (deleted) | Decrement 1 | Decrement by couponCount |
| Delete coupon | Decrement 1 | - | Decrement 1 |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `couponCount` to Participant interface |
| `src/components/wizard/StepParticipants.tsx` | Fix loading scope (initial vs page change) |
| `src/components/wizard/import/PaginatedTable.tsx` | Fix Detail search input |
| `src/services/excelService.ts` | Compute couponCount saat import |
| `src/repositories/dexie/participantRepository.ts` | Simplify query (hapus coupon count lookup) |
| `src/repositories/dexie/couponRepository.ts` | Hapus `getCountsByParticipantIds()` |
| `src/repositories/dexie/eventRepository.ts` | Add method update analytics |
| `src/hooks/useCoupons.ts` | Hapus `useCouponCountsByParticipants()`, update delete logic |
| `src/hooks/useParticipants.ts` | Update delete logic (decrement counts + update event analytics) |

---

## Execution Order

```
1. Update Types
   └── Add couponCount to Participant interface
       ↓
2. Update Excel Import
   └── Compute & store couponCount saat import
   └── Set Event.totalParticipants & totalCoupons
       ↓
3. Simplify Repository
   ├── Hapus coupon count query di participantRepository
   └── Hapus getCountsByParticipantIds di couponRepository
       ↓
4. Update Hooks & Delete Logic
   ├── Hapus useCouponCountsByParticipants
   ├── Update delete participant (decrement Event.totalParticipants & totalCoupons)
   └── Update delete coupon (decrement Participant.couponCount & Event.totalCoupons)
       ↓
5. Fix Loading Scope
   └── Separate initial loading vs page change loading
       ↓
6. Fix Detail Search
   └── Debug & fix search input di Detail mode
       ↓
7. Update DB Version (jika schema berubah)
   └── Increment DB_VERSION untuk migration
       ↓
8. Test & Build
```

---

## Database Migration Note

Karena menambah field `couponCount` ke Participant:
- Increment `DB_VERSION` di db.ts
- Data lama perlu di-clear atau migrate
- Untuk existing data, bisa jalankan migration script untuk compute couponCount

---

## Testing Checklist

**Loading Scope:**
- [ ] Initial load → full skeleton (analytics + table)
- [ ] Page change → overlay HANYA di table, analytics tetap terlihat
- [ ] Search → overlay HANYA di table

**Detail Search:**
- [ ] Toggle ke Detail mode
- [ ] Klik search input → bisa fokus
- [ ] Ketik → karakter muncul di input
- [ ] Search filter bekerja di Detail mode

**Performance (Pre-computed couponCount):**
- [ ] Import Excel → couponCount tersimpan di participant
- [ ] Page change cepat (< 200ms)
- [ ] Group view: couponCount langsung muncul (tidak ada delay)
- [ ] Console: hanya 1 query per page change (tidak ada N+1)

**Analytics Update:**
- [ ] Import Excel → Event.totalParticipants & totalCoupons ter-set
- [ ] Delete participant → totalParticipants decrement 1, totalCoupons decrement by couponCount
- [ ] Delete coupon → Participant.couponCount decrement 1, Event.totalCoupons decrement 1
- [ ] Analytics summary di UI ter-update setelah delete

**Regression:**
- [ ] Create event → import → save draft masih work
- [ ] Edit event → participant table muncul
- [ ] Delete participant masih work
- [ ] Delete coupon masih work

---

## Performance Target

| Metric | Before | Target |
|--------|--------|--------|
| Queries per page | 51 (N+1) | 1 |
| Page change time | 500-2000ms | < 200ms |
| Coupon count delay | Ada ("-" → angka) | Tidak ada |
