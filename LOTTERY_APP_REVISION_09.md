# React Lottery App - Revision 09

## Overview

1. Fix breadcrumb/page title positioning di Wizard
2. Fix Import Analytics tidak refresh setelah delete
3. Fix browser lag saat Confirm Import (mass insert)
4. Add optional image untuk Prize

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi, approach, potensi impact
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Issues

### Issue 1: Breadcrumb/Page Title Positioning

**Current behavior:**
- "Back to Events" dan "Create New Event" menempel ke sisi kiri browser
- Tidak selaras dengan form container yang centered

**Expected behavior:**
- Breadcrumb dan title selaras dengan form container (max-width 832px, centered)

**Solution:** Wrap dalam container yang sama dengan form (max-width 832px, centered).

```tsx
// EventWizard.tsx layout structure
<div className="min-h-screen bg-surface-alt">
  <Header />
  
  <main className="container mx-auto px-5 py-8">
    {/* Breadcrumb & Title - same max-width as form */}
    <div className="max-w-[832px] mx-auto mb-6">
      <button className="text-sm text-content-muted hover:text-primary">
        ← Back to Events
      </button>
      <h1 className="text-2xl font-bold text-navy mt-2">
        {mode === 'edit' ? 'Edit Event' : 'Create New Event'}
      </h1>
    </div>
    
    {/* Stepper */}
    <WizardStepper ... />
    
    {/* Form Container */}
    <div className="max-w-[832px] mx-auto bg-white rounded-xl shadow-card p-8">
      {/* form content */}
    </div>
  </main>
</div>
```

---

### Issue 2: Import Analytics Tidak Refresh Setelah Delete

**Current behavior:**
- Delete participant/coupon di Step Participants
- Import Analytics (total participants, total coupons) tidak update
- Harus manual refresh browser untuk melihat perubahan

**Expected behavior:**
- Setelah delete, analytics langsung update tanpa refresh

**Solution:** Invalidate query atau refetch setelah delete.

```typescript
// Setelah delete participant
const handleDeleteParticipant = async () => {
  await deleteParticipant(eventId, participantId);
  
  // Invalidate queries untuk refresh data
  queryClient.invalidateQueries(['event', eventId]);
  queryClient.invalidateQueries(['participants', eventId]);
  queryClient.invalidateQueries(['coupons', eventId]);
};

// Atau jika analytics di-fetch dari Event object
// Pastikan Event.totalParticipants dan Event.totalCoupons di-update saat delete
```

**Cek juga:** Apakah `Event.totalParticipants` dan `Event.totalCoupons` di-update saat delete? Jika tidak, perlu update:

```typescript
// Di deleteParticipant function
async deleteParticipant(eventId: string, participantId: string) {
  const participant = await db.participants.get([eventId, participantId]);
  const couponCount = participant?.couponCount || 0;
  
  // Delete participant & coupons
  await db.participants.delete([eventId, participantId]);
  await db.coupons.where({ eventId, participantId }).delete();
  
  // Update event counts
  await db.events.where('id').equals(eventId).modify(event => {
    event.totalParticipants = (event.totalParticipants || 0) - 1;
    event.totalCoupons = (event.totalCoupons || 0) - couponCount;
  });
}
```

---

### Issue 3: Browser Lag saat Confirm Import

**Current behavior:**
- Klik "Confirm Import" → browser freeze beberapa detik
- UI tidak responsive selama proses import

**Root cause:**
- Mass insert ke IndexedDB dilakukan di main thread
- Blocking UI thread

**Expected behavior:**
- Import berjalan tanpa freeze browser
- Idealnya ada progress indicator

**Solution:**

Batch insert dengan chunks + yield ke main thread:

```typescript
async function importParticipants(eventId: string, data: ParsedData[]) {
  const BATCH_SIZE = 1000;
  const total = data.length;
  
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    
    // Insert batch
    await db.participants.bulkAdd(
      batch.map(p => ({ ...p, eventId }))
    );
    
    // Yield ke main thread agar UI responsive
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Optional: update progress
    onProgress?.((i + batch.length) / total * 100);
  }
}
```

---

### Issue 4: Image Opsional untuk Prize

**Current behavior:**
- Prize hanya memiliki name dan quantity
- Tidak ada opsi untuk menambahkan gambar

**Expected behavior:**
- Setiap prize bisa memiliki gambar (opsional)
- Gambar disimpan sebagai base64
- Ada preview dan opsi untuk ganti/hapus

**Solution:**

**Schema update:**

```typescript
interface Prize {
  id: string;
  eventId: string;
  name: string;
  quantity: number;
  order: number;
  image?: string;  // NEW: base64 atau URL
  createdAt: Date;
  updatedAt: Date;
}
```

**UI di Step Prizes:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Prize 1                                              [Remove]  │
│                                                                 │
│  ┌──────────┐  Prize Name *                                     │
│  │          │  ┌──────────────────────────────────────────┐     │
│  │  [Image] │  │ Grand Prize                              │     │
│  │          │  └──────────────────────────────────────────┘     │
│  │ + Upload │                                                   │
│  └──────────┘  Quantity *                                       │
│                ┌───────┐                                        │
│                │ 1     │                                        │
│                └───────┘                                        │
└─────────────────────────────────────────────────────────────────┘

Image Preview:
- 80x80px square
- border-radius: 8px
- border: 1px dashed #e6ebf1
- Jika belum ada: tampilkan icon + "Upload"
- Jika sudah ada: tampilkan preview + hover untuk ganti/hapus
```

**Implementation:**

```typescript
// components/wizard/PrizeImageUpload.tsx
interface PrizeImageUploadProps {
  value?: string;
  onChange: (base64: string | undefined) => void;
}

export function PrizeImageUpload({ value, onChange }: PrizeImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  return (
    <div className="relative w-20 h-20">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {value ? (
        <div className="group relative w-full h-full">
          <img
            src={value}
            alt="Prize"
            className="w-full h-full object-cover rounded-lg border border-border"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <button onClick={() => inputRef.current?.click()}>
              <Edit className="w-4 h-4 text-white" />
            </button>
            <button onClick={() => onChange(undefined)}>
              <Trash className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full h-full border border-dashed border-border rounded-lg flex flex-col items-center justify-center text-content-muted hover:border-primary hover:text-primary transition-colors"
        >
          <ImagePlus className="w-5 h-5" />
          <span className="text-xs mt-1">Upload</span>
        </button>
      )}
    </div>
  );
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/EventWizard.tsx` | Fix breadcrumb positioning |
| `src/components/wizard/StepParticipants.tsx` | Invalidate queries after delete |
| `src/repositories/dexie/participantRepository.ts` | Update event counts on delete |
| `src/services/importService.ts` | Batch import dengan yield |
| `src/types/index.ts` | Add image field to Prize |
| `src/components/wizard/PrizeImageUpload.tsx` | New component |
| `src/components/wizard/StepPrizes.tsx` | Integrate image upload |

---

## Execution Order

```
1. Fix breadcrumb positioning (Issue 1)
       ↓
2. Fix analytics refresh after delete (Issue 2)
       ↓
3. Optimize import dengan batch + yield (Issue 3)
       ↓
4. Add prize image feature (Issue 4)
       ↓
5. Test & Build
```

---

## Testing Checklist

- [ ] Breadcrumb & title aligned dengan form container
- [ ] Delete participant → analytics langsung update
- [ ] Delete coupon → analytics langsung update
- [ ] Import 100K+ data → UI tetap responsive, ada progress
- [ ] Prize image upload works
- [ ] Prize image preview shows correctly
- [ ] Prize image bisa dihapus/ganti
- [ ] Prize tanpa image tetap bisa disimpan
