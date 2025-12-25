# React Lottery App - Revision 10

## Overview

1. Fix prize data tidak muncul saat pertama kali edit event
2. Fix Import Analytics tidak refresh setelah delete
3. Fix double decrement saat hapus coupon
4. Implement atomic edit (sama seperti create)

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi, approach, potensi impact
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Issues

### Issue 1: Prize Data Tidak Muncul saat Pertama Kali Edit

**Current behavior:**
- Create event dengan prizes → save
- Edit event → navigate ke Step Prize → **kosong**
- Back to events → edit lagi → Step Prize → muncul

**Root cause kemungkinan:**
- Race condition: `initWizardForEdit` belum selesai fetch prizes saat component Step Prize mount
- Atau: prizes di-fetch tapi state belum ter-update saat navigate ke step

**Solution:**

Pastikan data fully loaded sebelum render step:

```typescript
// wizardStore.ts atau hook terkait

// Option A: Add loading state per data type
interface WizardState {
  isLoadingEvent: boolean;
  isLoadingPrizes: boolean;
  isLoadingParticipants: boolean;
  // ...
}

// Option B: Single loading state yang wait semua data
initWizardForEdit: async (eventId: string) => {
  set({ isLoading: true });
  
  try {
    // Fetch semua data secara parallel
    const [event, prizes, participants] = await Promise.all([
      eventRepository.getById(eventId),
      prizeRepository.getByEventId(eventId),
      // participants count saja, tidak full data
    ]);
    
    // Set semua data sekaligus (single state update)
    set({
      event,
      prizes,
      // ...
      isLoading: false,
    });
  } catch (error) {
    set({ isLoading: false, error });
  }
}
```

```typescript
// StepPrizes.tsx - pastikan tidak render saat loading
function StepPrizes() {
  const { prizes, isLoading } = useWizardStore();
  
  if (isLoading) {
    return <LoadingSkeleton />;
  }
  
  // render prizes...
}
```

**Investigasi dulu:** Cek di console apakah prizes ter-fetch tapi render duluan, atau fetch-nya yang delay.

---

### Issue 2: Import Analytics Tidak Refresh Setelah Delete

**Current behavior:**
- Delete participant/coupon
- Import Analytics statistics tidak berubah
- Harus manual refresh

**Root cause:**
- Query tidak di-invalidate setelah delete
- ATAU: analytics tidak baca dari query yang di-invalidate

**Solution:**

```typescript
// Setelah delete, invalidate semua query terkait
const queryClient = useQueryClient();

const handleDeleteParticipant = async (participantId: string) => {
  await participantRepository.deleteWithCascade(eventId, participantId);
  
  // Invalidate queries
  await queryClient.invalidateQueries({ queryKey: ['event', eventId] });
  await queryClient.invalidateQueries({ queryKey: ['participants', eventId] });
  await queryClient.invalidateQueries({ queryKey: ['coupons', eventId] });
};

const handleDeleteCoupon = async (couponId: string) => {
  await couponRepository.delete(eventId, couponId);
  
  // Invalidate queries
  await queryClient.invalidateQueries({ queryKey: ['event', eventId] });
  await queryClient.invalidateQueries({ queryKey: ['participants', eventId] });
  await queryClient.invalidateQueries({ queryKey: ['coupons', eventId] });
};
```

**Pastikan juga:** Analytics component membaca dari query yang benar:

```typescript
// Import Analytics harus baca dari Event query atau dedicated query
const { data: event } = useQuery({
  queryKey: ['event', eventId],
  queryFn: () => eventRepository.getById(eventId),
});

// Tampilkan dari event
<div>Total Participants: {event?.totalParticipants}</div>
<div>Total Coupons: {event?.totalCoupons}</div>
```

---

### Issue 3: Double Decrement saat Hapus Coupon

**Current behavior:**
- Total coupons: 148,705
- Hapus 1 coupon dari participant dengan 550 coupons
- Participant couponCount: 550 → 549 ✓
- Expected Event totalCoupons: 148,705 → 148,704
- Actual Event totalCoupons: 148,705 → 148,703 ✗ (double decrement)

**Root cause:**
Kemungkinan `deleteCoupon` melakukan 2x decrement:
1. Decrement `Event.totalCoupons`
2. Decrement `Participant.couponCount` → yang kemudian trigger logic lain yang juga decrement `Event.totalCoupons`

**Solution:**

Review dan fix delete logic:

```typescript
// couponRepository.ts - DELETE COUPON
async delete(eventId: string, couponId: string): Promise<void> {
  const coupon = await db.coupons.get([eventId, couponId]);
  if (!coupon) return;
  
  await db.transaction('rw', [db.coupons, db.participants, db.events], async () => {
    // 1. Delete coupon
    await db.coupons.delete([eventId, couponId]);
    
    // 2. Decrement participant couponCount (HANYA couponCount, tidak trigger event update)
    await db.participants
      .where('[eventId+id]')
      .equals([eventId, coupon.participantId])
      .modify(p => {
        p.couponCount = (p.couponCount || 1) - 1;
      });
    
    // 3. Decrement event totalCoupons (SEKALI SAJA)
    await db.events
      .where('id')
      .equals(eventId)
      .modify(e => {
        e.totalCoupons = (e.totalCoupons || 1) - 1;
      });
  });
}

// participantRepository.ts - DELETE PARTICIPANT (cascade)
async deleteWithCascade(eventId: string, participantId: string): Promise<void> {
  const participant = await db.participants.get([eventId, participantId]);
  if (!participant) return;
  
  const couponCount = participant.couponCount || 0;
  
  await db.transaction('rw', [db.coupons, db.participants, db.events], async () => {
    // 1. Delete all coupons for this participant
    await db.coupons
      .where('[eventId+participantId]')
      .equals([eventId, participantId])
      .delete();
    
    // 2. Delete participant
    await db.participants.delete([eventId, participantId]);
    
    // 3. Update event counts (SEKALI, berdasarkan participant.couponCount)
    await db.events
      .where('id')
      .equals(eventId)
      .modify(e => {
        e.totalParticipants = (e.totalParticipants || 1) - 1;
        e.totalCoupons = (e.totalCoupons || couponCount) - couponCount;
      });
  });
}
```

**Key point:** Jangan ada logic yang auto-trigger update event counts di tempat lain. Semua update harus explicit dan SEKALI saja dalam transaction.

---

### Issue 4: Implement Atomic Edit

**Current behavior:**
- Edit langsung modify data di database
- Jika user cancel, partial changes sudah tersimpan

**Expected behavior:**
- Edit bekerja seperti create: perubahan disimpan di memory/store dulu
- Hanya persist ke database saat "Save" diklik
- Cancel = discard semua perubahan

**Solution:**

```typescript
// wizardStore.ts

interface WizardState {
  mode: 'create' | 'edit';
  eventId?: string;
  
  // Draft state (in-memory, belum persist)
  draft: {
    event: Partial<Event>;
    prizes: Prize[];
  };
  
  // Pending deletes (hanya simpan ID, bukan full data)
  pendingDeletes: {
    participantIds: string[];
    couponIds: string[];
  };
  
  // Original data (untuk edit mode, bisa compare/revert)
  original?: {
    event: Event;
    prizes: Prize[];
  };
  
  // Actions
  initForCreate: () => void;
  initForEdit: (eventId: string) => Promise<void>;
  updateDraft: (updates: Partial<WizardState['draft']>) => void;
  
  // Pending delete actions
  markParticipantForDelete: (participantId: string) => void;
  markCouponForDelete: (couponId: string) => void;
  unmarkParticipantForDelete: (participantId: string) => void;
  unmarkCouponForDelete: (couponId: string) => void;
  
  saveDraft: () => Promise<void>;  // Persist to DB + execute pending deletes
  discardDraft: () => void;        // Revert to original + clear pending deletes
}

// markParticipantForDelete - hanya simpan ID
markParticipantForDelete: (participantId: string) => {
  set(state => ({
    pendingDeletes: {
      ...state.pendingDeletes,
      participantIds: [...state.pendingDeletes.participantIds, participantId],
    }
  }));
};

// markCouponForDelete - hanya simpan ID
markCouponForDelete: (couponId: string) => {
  set(state => ({
    pendingDeletes: {
      ...state.pendingDeletes,
      couponIds: [...state.pendingDeletes.couponIds, couponId],
    }
  }));
};

// saveDraft - persist changes + execute pending deletes
saveDraft: async () => {
  const { mode, eventId, draft, pendingDeletes } = get();
  
  if (mode === 'edit' && eventId) {
    await db.transaction('rw', [db.events, db.prizes, db.participants, db.coupons], async () => {
      // 1. Update event
      await db.events.update(eventId, draft.event);
      
      // 2. Sync prizes
      const existingPrizes = await db.prizes.where('eventId').equals(eventId).toArray();
      const existingIds = new Set(existingPrizes.map(p => p.id));
      const draftIds = new Set(draft.prizes.map(p => p.id));
      
      for (const existing of existingPrizes) {
        if (!draftIds.has(existing.id)) {
          await db.prizes.delete([eventId, existing.id]);
        }
      }
      
      for (const prize of draft.prizes) {
        if (existingIds.has(prize.id)) {
          await db.prizes.update([eventId, prize.id], prize);
        } else {
          await db.prizes.add(prize);
        }
      }
      
      // 3. Execute pending coupon deletes (sebelum participant, karena participant cascade)
      for (const couponId of pendingDeletes.couponIds) {
        await couponRepository.delete(eventId, couponId);
      }
      
      // 4. Execute pending participant deletes (cascade ke coupons)
      for (const participantId of pendingDeletes.participantIds) {
        await participantRepository.deleteWithCascade(eventId, participantId);
      }
      
      // 5. Update event counts setelah semua delete
      const finalParticipantCount = await db.participants.where('eventId').equals(eventId).count();
      const finalCouponCount = await db.coupons.where('eventId').equals(eventId).count();
      
      await db.events.update(eventId, {
        totalParticipants: finalParticipantCount,
        totalCoupons: finalCouponCount,
      });
    });
  }
  
  // Clear pending deletes
  set({ pendingDeletes: { participantIds: [], couponIds: [] } });
};

// discardDraft - revert to original + clear pending deletes
discardDraft: () => {
  const { original } = get();
  if (original) {
    set({
      draft: { ...original },
      pendingDeletes: { participantIds: [], couponIds: [] },
    });
  }
};
```

**UI untuk participants/coupons table:**

```typescript
// StepParticipants.tsx

const { pendingDeletes } = useWizardStore();

// Filter out pending deletes dari tampilan
const visibleParticipants = participants.filter(
  p => !pendingDeletes.participantIds.includes(p.id)
);

const visibleCoupons = coupons.filter(
  c => !pendingDeletes.couponIds.includes(c.id)
);

// Hitung coupon count dari participants yang pending delete
const pendingParticipantCouponCount = participants
  .filter(p => pendingDeletes.participantIds.includes(p.id))
  .reduce((sum, p) => sum + (p.couponCount || 0), 0);

// Analytics reflect pending deletes
const adjustedTotalParticipants = event.totalParticipants - pendingDeletes.participantIds.length;
const adjustedTotalCoupons = event.totalCoupons 
  - pendingDeletes.couponIds.length 
  - pendingParticipantCouponCount;

// Delete handler - hanya mark, tidak execute
const handleDeleteParticipant = (participantId: string) => {
  markParticipantForDelete(participantId);
};

const handleDeleteCoupon = (couponId: string) => {
  markCouponForDelete(couponId);
};
```

**Note:** Konfirmasi delete (ketik `ID/Xxxx`) dari revision 08 tetap berlaku sebagai safeguard sebelum mark for delete.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/stores/wizardStore.ts` | Add pendingDeletes state, mark/unmark actions, fix race condition |
| `src/components/wizard/StepPrizes.tsx` | Add loading check |
| `src/components/wizard/StepParticipants.tsx` | Filter pending deletes dari tampilan, adjust analytics |
| `src/repositories/dexie/couponRepository.ts` | Fix delete logic (single decrement) |
| `src/repositories/dexie/participantRepository.ts` | Fix deleteWithCascade logic |
| `src/components/wizard/ImportAnalytics.tsx` | Show adjusted counts (reflect pending deletes) |

---

## Execution Order

```
1. Fix Issue 3 - Double Decrement (PRIORITY)
   ├── Review delete coupon logic
   ├── Review delete participant logic
   └── Ensure single decrement dalam transaction
       ↓
2. Fix Issue 2 - Analytics Refresh
   ├── Add proper query invalidation
   └── Ensure analytics reads from correct query
       ↓
3. Fix Issue 1 - Prize Race Condition
   ├── Add loading state check
   └── Ensure data loaded before render
       ↓
4. Implement Issue 4 - Atomic Edit
   ├── Add draft/original state
   ├── Modify save logic
   └── Add discard logic
       ↓
5. Test All Scenarios
```

---

## Testing Checklist

**Issue 1 - Prize Loading:**
- [ ] Create event dengan prizes → edit → Step Prize langsung muncul data
- [ ] Tidak perlu back-and-forth untuk melihat prizes

**Issue 2 - Analytics Refresh:**
- [ ] Delete participant → analytics langsung update
- [ ] Delete coupon → analytics langsung update
- [ ] Tidak perlu manual refresh

**Issue 3 - Correct Count:**
- [ ] Delete 1 coupon → totalCoupons berkurang 1 (bukan 2)
- [ ] Delete participant dengan 100 coupons → totalCoupons berkurang 100, totalParticipants berkurang 1

**Issue 4 - Atomic Edit:**
- [ ] Edit event name → cancel/back → nama tidak berubah di DB
- [ ] Edit prizes → cancel/back → prizes tidak berubah di DB
- [ ] Delete participant → participant hilang dari tampilan
- [ ] Delete participant → cancel/back → participant masih ada di DB
- [ ] Delete coupon → coupon hilang dari tampilan
- [ ] Delete coupon → cancel/back → coupon masih ada di DB
- [ ] Edit + delete → save → semua changes persist
- [ ] Analytics reflect pending deletes (adjusted counts)
