# React Lottery App - Revision 02

## Overview

Revisi lanjutan berdasarkan review setelah Revision 01.

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi, approach, potensi impact
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Revision Tasks

### Task 1: Date Range Picker - Gunakan Library

**Problem:** 
Date picker dibuat dari scratch, hasilnya:
- Keterangan hari tidak pas dengan tanggal
- Range yang dipilih tidak ada highlight warna
- UI tidak sesuai standar

**Solution:**
Gunakan library yang sudah mature. Pilihan:

**Opsi A: react-datepicker (Recommended)**
```bash
npm install react-datepicker
npm install -D @types/react-datepicker
```

```typescript
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function EventDateRange({ startDate, endDate, onChange }) {
  return (
    <DatePicker
      selectsRange
      startDate={startDate}
      endDate={endDate}
      onChange={(dates) => {
        const [start, end] = dates;
        onChange({ startDate: start, endDate: end });
      }}
      dateFormat="dd MMM yyyy"
      placeholderText="Pilih tanggal event"
      isClearable
    />
  );
}
```

**Opsi B: shadcn/ui Calendar + Popover**
Jika project sudah pakai shadcn, bisa pakai component bawaan:
- https://ui.shadcn.com/docs/components/date-picker

Pilih salah satu yang konsisten dengan component library yang sudah dipakai.

---

### Task 2: Save Draft - Redirect to Home

**Lokasi:** `StepReview.tsx` atau handler save di wizard

**Current behavior:**
- Save draft → notifikasi sukses → tetap di halaman wizard

**Expected behavior:**
- Save draft → notifikasi sukses → redirect ke home (`/`)

**Implementation:**
```typescript
import { useNavigate } from 'react-router-dom';

function StepReview() {
  const navigate = useNavigate();
  
  const handleSaveDraft = async () => {
    try {
      await saveEventAsDraft(eventData);
      
      toast.success('Event berhasil disimpan sebagai draft');
      
      // Redirect ke home setelah delay singkat agar toast terlihat
      setTimeout(() => {
        navigate('/');
      }, 500);
      
    } catch (error) {
      toast.error('Gagal menyimpan event');
    }
  };
  
  // ...
}
```

---

### Task 3: Import Table - Ubah ke Pagination

**Lokasi:** `StepParticipants.tsx` + table components

**Current:** Virtualized table (semua data di-render on scroll)

**Expected:** Pagination table

**Implementation:**

```typescript
interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
}

function ParticipantTable({ data, viewMode }: Props) {
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 15,
    totalItems: data.length,
  });
  
  const totalPages = Math.ceil(pagination.totalItems / pagination.pageSize);
  
  const paginatedData = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return data.slice(start, end);
  }, [data, pagination.page, pagination.pageSize]);
  
  return (
    <div>
      {/* Table */}
      <table>
        <thead>...</thead>
        <tbody>
          {paginatedData.map(item => (
            <tr key={item.id}>...</tr>
          ))}
        </tbody>
      </table>
      
      {/* Pagination Controls */}
      <div className="pagination">
        <button 
          disabled={pagination.page === 1}
          onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
        >
          Previous
        </button>
        
        <span>Page {pagination.page} of {totalPages}</span>
        
        <button
          disabled={pagination.page === totalPages}
          onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
        >
          Next
        </button>
        
        <select 
          value={pagination.pageSize}
          onChange={(e) => setPagination(p => ({ 
            ...p, 
            pageSize: Number(e.target.value),
            page: 1 // reset ke page 1
          }))}
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

**UI Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ [Group] [Detail]                              Search: [_______] │
├─────────────────────────────────────────────────────────────────┤
│ Participant ID    Name           Coupons                        │
│ ────────────────────────────────────────────                    │
│ P001              John Doe       4,712                          │
│ P002              Jane Smith     2,103                          │
│ P003              Bob Lee        891                            │
│ ... (50 rows)                                                   │
├─────────────────────────────────────────────────────────────────┤
│ [<] [1] [2] [3] ... [100] [>]     Page 1 of 100    [50 ▼]/page  │
└─────────────────────────────────────────────────────────────────┘
```

**Note:** Hapus dependency `@tanstack/react-virtual` jika tidak dipakai di tempat lain.

---

### Task 4: Edit Event - Participant Table dengan Search

**Lokasi:** `StepParticipants.tsx`

**Problem:** 
Saat edit event yang sudah ada participant, tidak ada tabel untuk melihat data participant.

**Expected:**
Sama seperti tampilan setelah import, dengan:
- Toggle button Group/Detail
- Search functionality
- Pagination

**Flow:**

```
Edit Event → Step 3 (Participants)
                │
                ├── Jika BELUM ada participant:
                │   └── Tampilkan upload area
                │
                └── Jika SUDAH ada participant:
                    └── Tampilkan:
                        ├── Analytics summary
                        ├── Table dengan toggle Group/Detail
                        ├── Search
                        ├── Pagination
                        └── [Re-upload] button untuk ganti data
```

**UI Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Participants                                        [Re-upload] │
├─────────────────────────────────────────────────────────────────┤
│ ┌─ Analytics ─────────────────────────────────────────────────┐ │
│ │ Total Participants: 50,000                                  │ │
│ │ Total Coupons: 120,000                                      │ │
│ │ Avg Coupons/Participant: 2.4                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Data Table ────────────────────────────────────────────────┐ │
│ │ [Group] [Detail]                        Search: [_________] │ │
│ │                                                             │ │
│ │ Participant ID    Name           Coupons                    │ │
│ │ ────────────────────────────────────────────                │ │
│ │ P001              John Doe       4,712                      │ │
│ │ P002              Jane Smith     2,103                      │ │
│ │ ...                                                         │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ [<] [1] [2] [3] ... [>]           Page 1 of 100   [50 ▼]    │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Search Implementation:**

```typescript
function ParticipantTable({ data, viewMode }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50 });
  
  // Filter by search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    
    const query = searchQuery.toLowerCase();
    return data.filter(item => 
      item.id.toLowerCase().includes(query) ||
      item.name?.toLowerCase().includes(query) ||
      // search di custom fields juga
      Object.values(item.customFields || {}).some(v => 
        v.toLowerCase().includes(query)
      )
    );
  }, [data, searchQuery]);
  
  // Reset page saat search berubah
  useEffect(() => {
    setPagination(p => ({ ...p, page: 1 }));
  }, [searchQuery]);
  
  // Paginate filtered data
  const paginatedData = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    return filteredData.slice(start, start + pagination.pageSize);
  }, [filteredData, pagination]);
  
  return (
    <div>
      <div className="toolbar">
        <ToggleGroup viewMode={viewMode} />
        <input 
          type="text"
          placeholder="Search participant..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <table>...</table>
      
      <Pagination 
        current={pagination.page}
        total={Math.ceil(filteredData.length / pagination.pageSize)}
        onChange={(page) => setPagination(p => ({ ...p, page }))}
      />
    </div>
  );
}
```

---

## Execution Order

```
1. Task 1: Date Range Picker
   └── Remove custom implementation, install & use library
       ↓
2. Task 2: Save Draft Redirect
   └── Add navigate('/') after save success
       ↓
3. Task 3: Table Pagination
   └── Replace virtualized with pagination
       ↓
4. Task 4: Edit Event Participant Table
   └── Add table view for existing participants + search
```

---

## Cleanup

Setelah selesai, hapus jika tidak terpakai:
- `@tanstack/react-virtual` (jika tidak dipakai di tempat lain)
- Custom date picker component yang dibuat dari scratch

---

## Notes

- Pastikan pagination state di-reset saat search query berubah
- Search harus case-insensitive
- Pagination component bisa di-extract jadi reusable component
