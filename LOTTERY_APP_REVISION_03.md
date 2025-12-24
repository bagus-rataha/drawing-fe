# React Lottery App - Revision 03

## Overview

Bug fixes untuk save draft dan edit participant.

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi, approach, potensi impact
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Bug Reports

### Bug 1: Save Draft Tidak Redirect + Event Duplikasi

**Lokasi:** `StepReview.tsx` atau wizard save handler

**Current behavior:**
- Klik [Save Draft] → tidak redirect ke home
- User klik berulang → event terduplikasi di database

**Expected behavior:**
- Klik [Save Draft] → simpan → redirect ke home (`/`)
- Prevent double submit

**Root cause kemungkinan:**
1. `navigate('/')` tidak dipanggil atau dipanggil tapi tidak execute
2. Tidak ada loading state / disable button saat proses save

**Solution:**

```typescript
import { useNavigate } from 'react-router-dom';

function StepReview() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSaveDraft = async () => {
    // Prevent double submit
    if (isSaving) return;
    
    setIsSaving(true);
    
    try {
      await saveEventAsDraft(eventData);
      
      toast.success('Event berhasil disimpan sebagai draft');
      
      // PENTING: Redirect HARUS terjadi
      navigate('/', { replace: true });
      
    } catch (error) {
      toast.error('Gagal menyimpan event');
      setIsSaving(false); // Reset hanya jika error
    }
  };
  
  return (
    <button 
      onClick={handleSaveDraft}
      disabled={isSaving}
    >
      {isSaving ? 'Menyimpan...' : 'Save Draft'}
    </button>
  );
}
```

**Checklist:**
- [ ] Pastikan `navigate` dari `useNavigate()` benar-benar dipanggil
- [ ] Gunakan `{ replace: true }` agar tidak bisa back ke wizard
- [ ] Disable button saat `isSaving` untuk prevent double click
- [ ] Tidak perlu setTimeout, langsung navigate setelah save berhasil

---

### Bug 2: Edit Event - Step Participant Kosong

**Lokasi:** `StepParticipants.tsx`

**Current behavior:**
- Edit event yang sudah ada participant → step participant kosong
- Tampil form upload seperti create baru

**Expected behavior:**
- Edit event dengan participant → tampil table data yang sudah diimport
- Ada toggle Group/Detail, search, pagination
- Ada button [Re-upload] untuk ganti data jika diperlukan

**Root cause kemungkinan:**
1. Tidak fetch participant data saat mode edit
2. Kondisi check `hasParticipants` salah
3. Data tidak di-load dari database/store

**Solution:**

```typescript
function StepParticipants({ eventId, mode }: Props) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load existing data saat mode edit
  useEffect(() => {
    if (mode === 'edit' && eventId) {
      loadExistingData();
    }
  }, [mode, eventId]);
  
  const loadExistingData = async () => {
    setIsLoading(true);
    try {
      // Fetch dari database
      const existingParticipants = await participantRepository.getByEventId(eventId);
      const existingCoupons = await couponRepository.getByEventId(eventId);
      
      setParticipants(existingParticipants);
      setCoupons(existingCoupons);
    } catch (error) {
      toast.error('Gagal memuat data participant');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Determine what to show
  const hasData = participants.length > 0 || coupons.length > 0;
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  // Jika sudah ada data, tampilkan table
  if (hasData) {
    return (
      <div>
        <div className="header">
          <h3>Participants</h3>
          <button onClick={handleReupload}>Re-upload</button>
        </div>
        
        <AnalyticsSummary 
          totalParticipants={participants.length}
          totalCoupons={coupons.length}
        />
        
        <ParticipantTable
          participants={participants}
          coupons={coupons}
          onDelete={handleDeleteParticipant}  // untuk hapus participant
          onDeleteCoupon={handleDeleteCoupon} // untuk hapus kupon tertentu
        />
      </div>
    );
  }
  
  // Jika belum ada data, tampilkan upload form
  return (
    <UploadForm onUploadComplete={handleUploadComplete} />
  );
}
```

**Checklist:**
- [ ] Load participant & coupon data dari database saat `mode === 'edit'`
- [ ] Check `hasData` berdasarkan data dari database, bukan dari state kosong
- [ ] Tampilkan loading state saat fetch data
- [ ] Table harus punya fitur: toggle Group/Detail, search, pagination
- [ ] Tambah fungsi delete participant dan delete coupon untuk adjustment

---

## Additional: Delete Functionality untuk Adjustment

Karena user menyebutkan "ada kemungkinan adjustment dari panitia untuk membuang/menghapus beberapa participant maupun beberapa kupon", tambahkan:

**UI Table dengan Delete:**

```
┌─────────────────────────────────────────────────────────────────┐
│ [Group] [Detail]                        Search: [_________]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ (Group View)                                                    │
│ Participant ID    Name           Coupons    Action              │
│ ────────────────────────────────────────────────────────        │
│ P001              John Doe       4,712      [🗑️ Delete]         │
│ P002              Jane Smith     2,103      [🗑️ Delete]         │
│                                                                 │
│ (Detail View)                                                   │
│ Coupon ID    Participant ID    Name         Action              │
│ ────────────────────────────────────────────────────────        │
│ C00001       P001              John Doe     [🗑️ Delete]         │
│ C00002       P001              John Doe     [🗑️ Delete]         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Delete Logic:**

```typescript
// Delete participant = hapus participant + semua kuponnya
const handleDeleteParticipant = async (participantId: string) => {
  const confirmed = window.confirm(
    'Hapus participant ini beserta semua kuponnya?'
  );
  
  if (confirmed) {
    await participantRepository.delete(participantId);
    await couponRepository.deleteByParticipantId(participantId);
    
    // Refresh data
    await loadExistingData();
    
    // Update event stats
    await updateEventStats(eventId);
    
    toast.success('Participant berhasil dihapus');
  }
};

// Delete coupon = hapus 1 kupon saja
const handleDeleteCoupon = async (couponId: string) => {
  const confirmed = window.confirm('Hapus kupon ini?');
  
  if (confirmed) {
    await couponRepository.delete(couponId);
    
    // Refresh data
    await loadExistingData();
    
    // Update event stats
    await updateEventStats(eventId);
    
    toast.success('Kupon berhasil dihapus');
  }
};
```

---

## Execution Order

```
1. Bug 1: Fix Save Draft Redirect
   ├── Add isSaving state
   ├── Disable button saat saving
   └── Pastikan navigate('/') dipanggil dengan benar
       ↓
2. Bug 2: Fix Edit Participant Table
   ├── Load existing data saat mode edit
   ├── Show table jika hasData
   └── Add delete functionality untuk adjustment
```

---

## Testing Checklist

**Save Draft:**
- [ ] Klik Save Draft → redirect ke home
- [ ] Event hanya tersimpan 1x (tidak duplikat)
- [ ] Button disabled saat proses save
- [ ] Toast sukses muncul

**Edit Participant:**
- [ ] Edit event dengan participant → table muncul
- [ ] Toggle Group/Detail berfungsi
- [ ] Search berfungsi
- [ ] Pagination berfungsi
- [ ] Delete participant berfungsi (hapus participant + semua kupon)
- [ ] Delete coupon berfungsi (hapus 1 kupon)
- [ ] Analytics summary ter-update setelah delete
