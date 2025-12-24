# React Lottery App - Revision 07

## Overview

Fix issues di mode Detail dan implementasi delete confirmation.

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi, approach, potensi impact
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Issues

### Issue 1: Loading Skeleton Terapply ke Analytics saat Switch Group → Detail

**Current behavior:**
- Switch dari Group ke Detail → skeleton muncul di analytics + table
- Seharusnya analytics tidak perlu loading (data sudah ada di Event)

**Expected behavior:**
- Switch mode → loading indicator HANYA di table
- Analytics tetap terlihat (ambil dari Event.totalParticipants, Event.totalCoupons)

**Solution:**

Pisahkan loading state untuk table saja:

```typescript
function StepParticipants({ eventId }: Props) {
  const [viewMode, setViewMode] = useState<'group' | 'detail'>('group');
  
  // Analytics dari Event - tidak perlu loading
  const { data: event } = useEvent(eventId);
  
  // Table data - ada loading
  const { data: tableData, isLoading: isTableLoading } = viewMode === 'group' 
    ? useParticipantsPaginated(eventId, page, pageSize, searchQuery)
    : useCouponsPaginated(eventId, page, pageSize, searchQuery);
  
  return (
    <div>
      {/* Analytics - TIDAK ADA loading, data dari Event */}
      <AnalyticsSummary 
        totalParticipants={event?.totalParticipants || 0}
        totalCoupons={event?.totalCoupons || 0}
      />
      
      {/* Table - dengan loading */}
      <div className="relative">
        {isTableLoading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
            <Spinner />
          </div>
        )}
        
        <DataTable data={tableData} viewMode={viewMode} />
      </div>
    </div>
  );
}
```

**Key point:** Saat switch mode, JANGAN render skeleton untuk seluruh halaman. Cukup overlay spinner di table area.

---

### Issue 2: Search di Mode Detail Tidak Berfungsi

**Current behavior:**
- Mode Detail → ketik di search box → tidak ada filter/hasil

**Root cause kemungkinan:**
1. Search query tidak di-pass ke `useCouponsPaginated` hook
2. Repository method `searchCoupons` tidak diimplementasi
3. Search field tidak ter-bind dengan benar

**Solution:**

**Step 1: Pastikan repository punya method search untuk coupons**

```typescript
// repositories/interfaces/couponRepository.ts
interface ICouponRepository {
  // ... existing methods
  
  searchByEventId(
    eventId: string,
    searchQuery: string,
    params: PaginationParams
  ): Promise<PaginatedResult<Coupon>>;
}
```

**Step 2: Implement search di Dexie repository**

```typescript
// repositories/dexie/couponRepository.ts

async searchByEventId(
  eventId: string, 
  searchQuery: string,
  { offset, limit }: PaginationParams
): Promise<PaginatedResult<Coupon>> {
  const query = searchQuery.toLowerCase();
  
  // Filter dengan Dexie
  const allMatching = await db.coupons
    .where('eventId').equals(eventId)
    .filter(c => 
      c.id.toLowerCase().includes(query) ||
      c.participantId.toLowerCase().includes(query)
    )
    .toArray();
  
  const total = allMatching.length;
  const data = allMatching.slice(offset, offset + limit);
  
  return {
    data,
    total,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  };
}
```

**Step 3: Update hook untuk support search**

```typescript
// hooks/useCoupons.ts

export function useCouponsPaginated(
  eventId: string | undefined,
  page: number,
  pageSize: number,
  searchQuery?: string
) {
  const offset = (page - 1) * pageSize;
  
  return useQuery({
    queryKey: ['coupons', 'paginated', eventId, page, pageSize, searchQuery],
    queryFn: () => {
      if (searchQuery?.trim()) {
        return couponRepository.searchByEventId(eventId!, searchQuery, { offset, limit: pageSize });
      }
      return couponRepository.getByEventIdPaginated(eventId!, { offset, limit: pageSize });
    },
    enabled: !!eventId,
  });
}
```

**Step 4: Pastikan searchQuery di-pass ke hook**

```typescript
// StepParticipants.tsx
const [searchQuery, setSearchQuery] = useState('');
const debouncedSearch = useDebounce(searchQuery, 300);

// Pass ke hook yang sesuai dengan viewMode
const { data, isLoading } = viewMode === 'group'
  ? useParticipantsPaginated(eventId, page, pageSize, debouncedSearch)
  : useCouponsPaginated(eventId, page, pageSize, debouncedSearch);
```

---

### Issue 3: Mode Detail Lambat saat Pagination

**User question:** "Apa yang menyebabkan loading ini? Tidak ada count seperti di group mode."

**INSTRUKSI: Investigasi dulu sebelum fix**

Tambahkan console.log/console.time untuk identifikasi penyebab:

```typescript
// Di couponRepository.getByEventIdPaginated atau method terkait
async getByEventIdPaginated(eventId: string, { offset, limit }: PaginationParams) {
  console.time('coupon-pagination-total');
  
  console.time('coupon-count');
  // Cek apakah ada query count() di sini
  console.timeEnd('coupon-count');
  
  console.time('coupon-fetch');
  const data = await db.coupons
    .where('eventId').equals(eventId)
    .offset(offset)
    .limit(limit)
    .toArray();
  console.timeEnd('coupon-fetch');
  
  console.timeEnd('coupon-pagination-total');
  
  return { data, ... };
}
```

**Kemungkinan penyebab:**

1. **Query `count()` setiap page change**
   ```typescript
   // LAMBAT untuk data besar
   const total = await db.coupons.where('eventId').equals(eventId).count();
   ```
   **Fix:** Gunakan `Event.totalCoupons` (pre-computed)

2. **Index tidak ada untuk eventId di coupons table**
   ```typescript
   // db.ts - pastikan ada index
   coupons: '[eventId+id], eventId, participantId'
   //                      ^^^^^^^ index ini penting
   ```

3. **Multiple queries tidak perlu**
   - Cek apakah ada hook/effect lain yang trigger query

4. **Re-render berlebihan**
   - Cek apakah component re-render tidak perlu

**Setelah investigasi, fix sesuai penyebab:**

Jika penyebabnya `count()`, ganti dengan:

```typescript
async getByEventIdPaginated(eventId: string, { offset, limit }: PaginationParams) {
  // Fetch kupon untuk page ini saja
  const data = await db.coupons
    .where('eventId').equals(eventId)
    .offset(offset)
    .limit(limit)
    .toArray();
  
  // Ambil total dari Event (sudah pre-computed), BUKAN count()
  const event = await db.events.get(eventId);
  const total = event?.totalCoupons || 0;
  
  return {
    data,
    total,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  };
}
```

**Catatan untuk search di Detail mode:**
Saat search aktif, total TIDAK bisa pakai `Event.totalCoupons` karena sudah di-filter. Untuk search, tetap perlu hitung total dari hasil filter:

```typescript
async searchByEventId(eventId: string, searchQuery: string, { offset, limit }) {
  const query = searchQuery.toLowerCase();
  
  const allMatching = await db.coupons
    .where('eventId').equals(eventId)
    .filter(c => 
      c.id.toLowerCase().includes(query) ||
      c.participantId.toLowerCase().includes(query)
    )
    .toArray();
  
  // Untuk search, total dari hasil filter
  const total = allMatching.length;
  const data = allMatching.slice(offset, offset + limit);
  
  return { data, total, ... };
}
```

---

### Issue 4: Konfirmasi Delete untuk Participant dan Coupon

**Current behavior:**
- Klik delete → langsung delete tanpa konfirmasi

**Expected behavior:**
- Klik delete → muncul dialog konfirmasi → user confirm → baru delete

**Solution:**

**Buat reusable ConfirmDialog component:**

```typescript
// components/ui/ConfirmDialog.tsx

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelText}
          </Button>
          <Button 
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Usage untuk delete participant:**

```typescript
function ParticipantTable({ ... }) {
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'participant' | 'coupon';
    id: string;
    name?: string;
    couponCount?: number;
  } | null>(null);
  
  const handleDeleteParticipant = (participant: Participant) => {
    setDeleteTarget({
      type: 'participant',
      id: participant.id,
      name: participant.name,
      couponCount: participant.couponCount,
    });
  };
  
  const handleDeleteCoupon = (coupon: Coupon) => {
    setDeleteTarget({
      type: 'coupon',
      id: coupon.id,
    });
  };
  
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    if (deleteTarget.type === 'participant') {
      await deleteParticipant(eventId, deleteTarget.id);
    } else {
      await deleteCoupon(eventId, deleteTarget.id);
    }
    
    setDeleteTarget(null);
    // Refresh data
  };
  
  return (
    <>
      <table>
        {/* ... rows with delete buttons */}
        <button onClick={() => handleDeleteParticipant(participant)}>
          🗑️ Delete
        </button>
      </table>
      
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget?.type === 'participant' 
          ? 'Delete Participant?' 
          : 'Delete Coupon?'
        }
        description={deleteTarget?.type === 'participant'
          ? `Are you sure you want to delete participant "${deleteTarget.name || deleteTarget.id}"? This will also delete ${deleteTarget.couponCount} coupon(s) owned by this participant.`
          : `Are you sure you want to delete coupon "${deleteTarget?.id}"?`
        }
        confirmText="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </>
  );
}
```

---

### Issue 5: Delete Event Tidak Berfungsi + Cascade Delete

**Current behavior:**
- Klik delete event → data masih ada

**Expected behavior:**
- Klik delete → konfirmasi dialog → cascade delete semua data terkait:
  - Event
  - All Prizes
  - All Participants
  - All Coupons
  - All Winners (jika ada)

**Solution:**

**Step 1: Implement cascade delete di repository**

```typescript
// repositories/dexie/eventRepository.ts

async deleteWithCascade(eventId: string): Promise<void> {
  // Delete in order to avoid FK issues (jika ada)
  
  // 1. Delete all winners
  await db.winners.where('eventId').equals(eventId).delete();
  
  // 2. Delete all coupons
  await db.coupons.where('eventId').equals(eventId).delete();
  
  // 3. Delete all participants
  await db.participants.where('eventId').equals(eventId).delete();
  
  // 4. Delete all prizes
  await db.prizes.where('eventId').equals(eventId).delete();
  
  // 5. Delete event
  await db.events.delete(eventId);
}
```

**Step 2: Add confirmation dialog di Home page**

```typescript
// pages/Home.tsx

function Home() {
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [deleteEventName, setDeleteEventName] = useState<string>('');
  
  const handleDeleteClick = (event: Event) => {
    setDeleteEventId(event.id);
    setDeleteEventName(event.name);
  };
  
  const confirmDeleteEvent = async () => {
    if (!deleteEventId) return;
    
    await eventRepository.deleteWithCascade(deleteEventId);
    setDeleteEventId(null);
    
    // Refresh event list
    refetchEvents();
    
    toast.success('Event deleted successfully');
  };
  
  return (
    <>
      {/* Event cards with delete button */}
      <EventCard 
        event={event}
        onDelete={() => handleDeleteClick(event)}
      />
      
      <ConfirmDialog
        open={!!deleteEventId}
        onOpenChange={(open) => !open && setDeleteEventId(null)}
        title="Delete Event?"
        description={`Are you sure you want to delete "${deleteEventName}"? This action cannot be undone and will permanently delete:
        
• All prizes
• All participants  
• All coupons
• All winner records (if any)`}
        confirmText="Delete Event"
        variant="destructive"
        onConfirm={confirmDeleteEvent}
      />
    </>
  );
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/ui/ConfirmDialog.tsx` | NEW - reusable confirmation dialog |
| `src/components/wizard/StepParticipants.tsx` | Fix loading scope, add delete confirmations |
| `src/components/wizard/import/PaginatedTable.tsx` | Fix search di Detail mode |
| `src/repositories/interfaces/couponRepository.ts` | Add searchByEventId method |
| `src/repositories/dexie/couponRepository.ts` | Implement searchByEventId, optimize pagination (use Event.totalCoupons) |
| `src/repositories/interfaces/eventRepository.ts` | Add deleteWithCascade method |
| `src/repositories/dexie/eventRepository.ts` | Implement deleteWithCascade |
| `src/hooks/useCoupons.ts` | Add search support to useCouponsPaginated |
| `src/pages/Home.tsx` | Add delete event confirmation |

---

## Execution Order

```
1. Create ConfirmDialog component
   └── Reusable untuk semua delete confirmations
       ↓
2. Fix Loading Scope (Issue 1)
   └── Loading hanya di table saat switch mode
       ↓
3. Fix Detail Search (Issue 2)
   ├── Add searchByEventId to coupon repository
   └── Pass searchQuery to useCouponsPaginated
       ↓
4. Investigate & Fix Detail Pagination Performance (Issue 3)
   ├── Tambah console.time untuk identifikasi penyebab
   ├── Cek apakah ada count() yang tidak perlu
   └── Fix sesuai hasil investigasi (kemungkinan: gunakan Event.totalCoupons)
       ↓
5. Add Participant/Coupon Delete Confirmation (Issue 4)
   └── Integrate ConfirmDialog di table
       ↓
6. Fix Event Delete + Cascade (Issue 5)
   ├── Implement deleteWithCascade
   └── Add ConfirmDialog di Home page
       ↓
7. Remove console.time setelah fix selesai
       ↓
8. Test & Build
```

---

## Testing Checklist

**Issue 1 - Loading Scope:**
- [ ] Switch Group → Detail → analytics tetap terlihat
- [ ] Loading indicator hanya di table area
- [ ] Tidak ada full-page skeleton saat switch mode

**Issue 2 - Detail Search:**
- [ ] Mode Detail → ketik di search → filter berfungsi
- [ ] Search by coupon_id → hasil sesuai
- [ ] Search by participant_id → hasil sesuai
- [ ] Clear search → data kembali normal

**Issue 3 - Detail Performance:**
- [ ] Console.time output menunjukkan penyebab lambat
- [ ] Setelah fix, page change di Detail mode cepat (< 200ms)
- [ ] Tidak ada query count() di console (jika itu penyebabnya)
- [ ] Console.time sudah di-remove setelah fix

**Issue 4 - Delete Confirmation:**
- [ ] Delete participant → muncul dialog dengan info cascade
- [ ] Cancel → tidak jadi delete
- [ ] Confirm → delete + update analytics
- [ ] Delete coupon → muncul dialog
- [ ] Cancel → tidak jadi delete
- [ ] Confirm → delete + update analytics

**Issue 5 - Delete Event:**
- [ ] Klik delete di event card → muncul dialog
- [ ] Dialog menunjukkan apa saja yang akan dihapus
- [ ] Cancel → event masih ada
- [ ] Confirm → event + semua data terkait terhapus
- [ ] Event list ter-refresh setelah delete
