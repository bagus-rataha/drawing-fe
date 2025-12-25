# React Lottery App - Revision 13

## Overview

1. Fix prize tidak muncul saat edit (issue recurring)
2. Fix participant delay setelah confirm import
3. Fix progress bar tidak sinkron dengan persentase

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi, approach, potensi impact
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Issues

### Issue 1: Prize Tidak Muncul saat Edit (Recurring)

**Symptom:**
- Sama seperti sebelumnya: loading skeleton = prize tidak akan muncul
- Harus back dan buka lagi baru muncul

**Root cause:**
Fix sebelumnya belum mengatasi. Kemungkinan:
- `initForEdit` tidak dipanggil dengan benar
- Atau ada race condition antara route navigation dan data fetch
- Atau prizes di-set sebelum fetch selesai

**Solution:**

Investigasi dan fix dengan approach berbeda:

```typescript
// EventWizard.tsx
function EventWizard() {
  const { eventId } = useParams();
  const mode = eventId ? 'edit' : 'create';
  
  const { isLoading, isInitialized, initForEdit, initForCreate } = useWizardStore();
  
  // KUNCI: useEffect dengan proper dependencies
  useEffect(() => {
    if (mode === 'edit' && eventId) {
      initForEdit(eventId);
    } else {
      initForCreate();
    }
    
    // Cleanup saat unmount
    return () => {
      // reset wizard state jika perlu
    };
  }, [mode, eventId]); // HANYA re-run jika mode/eventId berubah
  
  // BLOCK render sampai initialized
  if (mode === 'edit' && (isLoading || !isInitialized)) {
    return <FullPageLoadingSkeleton />;
  }
  
  return (
    // ... wizard content
  );
}

// wizardStore.ts
interface WizardState {
  isLoading: boolean;
  isInitialized: boolean;  // NEW: flag untuk memastikan init selesai
  // ...
}

initForEdit: async (eventId: string) => {
  // Cegah double init
  const currentState = get();
  if (currentState.eventId === eventId && currentState.isInitialized) {
    return; // Sudah init untuk event ini
  }
  
  set({ isLoading: true, isInitialized: false });
  
  try {
    const [event, prizes] = await Promise.all([
      eventRepository.getById(eventId),
      prizeRepository.getByEventId(eventId),
    ]);
    
    if (!event) throw new Error('Event not found');
    
    // PENTING: set semua state dalam satu update
    set({
      mode: 'edit',
      eventId,
      draft: {
        event,
        prizes: prizes || [],
      },
      original: {
        event: { ...event },
        prizes: [...(prizes || [])],
      },
      isLoading: false,
      isInitialized: true,  // Mark as initialized
    });
  } catch (error) {
    console.error('initForEdit error:', error);
    set({ isLoading: false, isInitialized: false, error });
  }
};
```

---

### Issue 2: Participant Delay Setelah Confirm Import

**Symptom:**
- Confirm import → next → back → delay 1-2 detik
- Atau: confirm import → prev → next → delay 1-2 detik

**Root cause:**
`staleTime` mungkin tidak diterapkan ke query yang benar, atau ada query lain yang tidak pakai `staleTime`.

**Solution:**

Cek dan pastikan SEMUA query terkait participant pakai staleTime:

```typescript
// hooks/useParticipants.ts

// Query untuk paginated list
export function useParticipantsPaginated(...) {
  return useQuery({
    queryKey: ['participants', 'paginated', eventId, page, pageSize, searchQuery],
    queryFn: ...,
    staleTime: 5 * 60 * 1000,
    enabled: !!eventId,
  });
}

// Query untuk count (jika ada)
export function useParticipantsCount(eventId: string | undefined) {
  return useQuery({
    queryKey: ['participants', 'count', eventId],
    queryFn: ...,
    staleTime: 5 * 60 * 1000,  // PASTIKAN ini juga ada staleTime
    enabled: !!eventId,
  });
}

// hooks/useCoupons.ts - sama
export function useCouponsPaginated(...) {
  return useQuery({
    ...
    staleTime: 5 * 60 * 1000,
  });
}

export function useCouponsCount(...) {
  return useQuery({
    ...
    staleTime: 5 * 60 * 1000,
  });
}
```

**Atau:** Set default staleTime di QueryClient:

```typescript
// main.tsx atau queryClient.ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // Default 5 menit untuk semua queries
      refetchOnWindowFocus: false,
    },
  },
});
```

---

### Issue 3: Progress Bar Tidak Sinkron dengan Persentase

**Symptom:**
- Upload file 148K data
- Progress bar: ~25%
- Persentase text: 90%

**Root cause:**
Progress bar width dan percentage text menggunakan data berbeda, atau salah satu tidak di-update dengan benar.

**Solution:**

Pastikan keduanya dari source yang sama:

```typescript
// components/wizard/ImportProgress.tsx

interface ImportProgressProps {
  progress: number;  // 0-100
  status: string;
}

export function ImportProgress({ progress, status }: ImportProgressProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{status}</span>
        <span>{Math.round(progress)}%</span>  {/* Percentage text */}
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}  {/* Progress bar - HARUS sama dengan text */}
        />
      </div>
    </div>
  );
}
```

**Cek juga di parent component:**

```typescript
// Pastikan progress di-pass ke kedua tempat dari state yang sama
const [importProgress, setImportProgress] = useState(0);

// Update progress
const handleProgress = (progress: number) => {
  setImportProgress(progress);
};

// Render
<ImportProgress progress={importProgress} status="Importing..." />
```

**Investigasi:** Cek apakah ada 2 state berbeda untuk progress bar dan percentage, atau ada transform/calculation yang berbeda.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/stores/wizardStore.ts` | Add isInitialized flag, fix initForEdit |
| `src/pages/EventWizard.tsx` | Block render until isInitialized |
| `src/hooks/useParticipants.ts` | Ensure staleTime on all queries |
| `src/hooks/useCoupons.ts` | Ensure staleTime on all queries |
| `src/main.tsx` atau `src/queryClient.ts` | Optional: set default staleTime |
| `src/components/wizard/ImportProgress.tsx` | Fix progress bar sync |

---

## Execution Order

```
1. Fix Issue 3 - Progress bar sync (quick fix)
       ↓
2. Fix Issue 2 - staleTime semua queries
       ↓
3. Fix Issue 1 - isInitialized flag
       ↓
4. Test semua scenario
```

---

## Testing Checklist

**Issue 1 - Prize Loading:**
- [ ] Create event dengan prizes → save → edit immediately → prizes muncul
- [ ] Tidak ada loading skeleton saat data sudah ready
- [ ] Back → edit lagi → tetap muncul (no regression)

**Issue 2 - Participant Delay:**
- [ ] Upload → confirm → next → back → instant (no delay)
- [ ] Upload → confirm → prev → next → instant (no delay)

**Issue 3 - Progress Bar:**
- [ ] Upload file → progress bar width = percentage text
- [ ] Progress bar smooth dari 0% ke 100%
