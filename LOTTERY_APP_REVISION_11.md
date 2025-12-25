# React Lottery App - Revision 11

## Overview

1. Fix prize masih tidak muncul saat pertama kali edit (cache issue)
2. Fix data participant hilang saat back ke step sebelumnya
3. Add browser refresh prevention saat unsaved changes

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi, approach, potensi impact
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Issues

### Issue 1: Prize Tidak Muncul saat Pertama Kali Edit

**Current behavior:**
- Edit event → loading skeleton muncul → step prize kosong
- Back → edit lagi → tidak ada skeleton → prize muncul (dari cache)

**Root cause:**
- TanStack Query cache: pertama kali fetch → belum ada cache → loading
- Component StepPrizes render sebelum data ready
- Kedua kali: data sudah di cache → instant

**Solution:**

Pastikan wizard WAIT sampai semua data ter-load sebelum allow navigation ke steps:

```typescript
// wizardStore.ts atau EventWizard.tsx

// Option A: Block step navigation sampai loaded
const { isLoading, prizes } = useWizardStore();

// Di Stepper/Step navigation
const canNavigateToStep = (step: number) => {
  if (isLoading) return false;
  // ... other validations
};

// Option B: Ensure initForEdit FULLY completes before setting isLoading = false
initForEdit: async (eventId: string) => {
  set({ isLoading: true });
  
  try {
    // Fetch ALL data dan WAIT semua selesai
    const [event, prizes, participantCount, couponCount] = await Promise.all([
      eventRepository.getById(eventId),
      prizeRepository.getByEventId(eventId),
      participantRepository.countByEventId(eventId),
      couponRepository.countByEventId(eventId),
    ]);
    
    if (!event) throw new Error('Event not found');
    
    // Set ALL data dalam satu state update
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
      isLoading: false,  // HANYA set false setelah SEMUA data ready
    });
  } catch (error) {
    set({ isLoading: false, error });
  }
};
```

```typescript
// EventWizard.tsx - Block render sampai ready
function EventWizard() {
  const { isLoading } = useWizardStore();
  
  if (isLoading) {
    return <FullPageLoadingSkeleton />;
  }
  
  return (
    // ... wizard content
  );
}
```

---

### Issue 2: Data Participant Hilang saat Back ke Step Sebelumnya

**Current behavior:**
- Create event → import participants → confirm → next
- Back ke step participants → table kosong
- Analytics (card Import Analytics) masih ada data

**Root cause kemungkinan:**
- State/query untuk table participants tidak persist saat navigate antar step
- Atau: pagination/filter state reset saat back

**Solution:**

```typescript
// Option A: Persist pagination/table state di wizard store
interface WizardState {
  // ... existing
  participantTableState: {
    page: number;
    pageSize: number;
    searchQuery: string;
    viewMode: 'group' | 'detail';
  };
}

// Saat navigate away dari step, save state
// Saat navigate back, restore state

// Option B: Check if issue is query-related
// Di StepParticipants.tsx
const { data: participants, isLoading } = useParticipantsPaginated(
  eventId,  // Pastikan eventId TIDAK undefined/null saat back
  page,
  pageSize,
  searchQuery
);

// Debug: log eventId saat mount
useEffect(() => {
  console.log('StepParticipants mounted, eventId:', eventId);
}, [eventId]);
```

**Investigasi dulu:**
1. Cek apakah `eventId` masih valid saat back ke step
2. Cek apakah query ter-trigger saat back
3. Cek apakah data ada tapi tidak ter-render (filter issue)

---

### Issue 3: Browser Refresh Prevention

**Problem:**
- User accidentally refresh browser saat create/edit
- Semua unsaved changes hilang

**Solution:**

Gunakan `beforeunload` event:

```typescript
// hooks/useUnsavedChangesWarning.ts
import { useEffect } from 'react';

export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        // Modern browsers ignore custom message, tapi tetap show default warning
        e.returnValue = '';
        return '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);
}
```

```typescript
// EventWizard.tsx
function EventWizard() {
  const { draft, original, pendingDeletes } = useWizardStore();
  
  // Check if ada unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!original) return true; // Create mode selalu ada "changes"
    
    // Compare draft vs original
    const eventChanged = JSON.stringify(draft.event) !== JSON.stringify(original.event);
    const prizesChanged = JSON.stringify(draft.prizes) !== JSON.stringify(original.prizes);
    const hasPendingDeletes = 
      pendingDeletes.participantIds.length > 0 || 
      pendingDeletes.couponIds.length > 0;
    
    return eventChanged || prizesChanged || hasPendingDeletes;
  }, [draft, original, pendingDeletes]);
  
  // Activate warning
  useUnsavedChangesWarning(hasUnsavedChanges);
  
  // ... rest of component
}
```

**Behavior:**
- User refresh/close tab saat ada unsaved changes → browser show confirmation dialog
- User confirm → proceed (data lost)
- User cancel → stay on page

**Untuk Backend Terpisah:**
Ya, masih relevan. Bahkan lebih penting karena:
- Network latency bisa menyebabkan partial save
- Solution sama: `beforeunload` warning
- Tambahan: bisa implement auto-save draft ke server setiap X detik

---

## Files to Modify

| File | Change |
|------|--------|
| `src/stores/wizardStore.ts` | Ensure full data load before isLoading=false |
| `src/pages/EventWizard.tsx` | Block render until loaded, add useUnsavedChangesWarning |
| `src/hooks/useUnsavedChangesWarning.ts` | New hook |
| `src/components/wizard/StepParticipants.tsx` | Debug/fix table data persistence |

---

## Execution Order

```
1. Fix Issue 1 - Prize loading
   └── Ensure initForEdit fully completes
       ↓
2. Fix Issue 2 - Participant table persistence
   └── Investigate root cause, fix accordingly
       ↓
3. Add Issue 3 - Refresh prevention
   └── Add beforeunload hook
       ↓
4. Test All Scenarios
```

---

## Testing Checklist

**Issue 1 - Prize Loading:**
- [ ] Create event dengan prizes → edit immediately → prizes muncul
- [ ] Tidak perlu back-and-forth
- [ ] Loading skeleton muncul → setelah selesai, semua data ready

**Issue 2 - Participant Table:**
- [ ] Create → import → confirm → next → back → table masih ada data
- [ ] Analytics dan table konsisten

**Issue 3 - Refresh Prevention:**
- [ ] Create mode → refresh → browser warning muncul
- [ ] Edit mode dengan changes → refresh → browser warning muncul
- [ ] Edit mode tanpa changes → refresh → no warning
- [ ] After save → refresh → no warning
