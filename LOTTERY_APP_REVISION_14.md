# React Lottery App - Revision 14

## Overview

1. Fix participant UI freeze setelah confirm import (main thread blocked)
2. Rename app dari "Lottery" ke "Raffle"

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi, approach, potensi impact
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Issues

### Issue 1: Participant UI Freeze Setelah Confirm Import

**Symptom:**
- Confirm import → next → back → freeze 1-2 detik
- Pointer tidak berubah dari hand ke default
- Tidak ada loading indicator, tidak ada console log
- Sama seperti freeze saat klik "Confirm Import"

**Root cause:**
UI freeze = main thread blocked oleh heavy computation saat StepParticipants mount.

Kemungkinan blocking code:
```typescript
// Filter 148K data setiap mount
const visibleParticipants = participants.filter(
  p => !pendingDeletes.participantIds.includes(p.id)
);

// Atau compute analytics dari semua data
const pendingParticipantCouponCount = participants
  .filter(p => pendingDeletes.participantIds.includes(p.id))
  .reduce((sum, p) => sum + (p.couponCount || 0), 0);
```

**Solution:**

1. **Pastikan hanya process current page data, bukan ALL data:**

```typescript
// SALAH - iterate semua participants
const visibleParticipants = allParticipants.filter(...);

// BENAR - pagination sudah di DB level, hanya filter current page
const { data: paginatedResult } = useParticipantsPaginated(eventId, page, pageSize);
// paginatedResult.data sudah hanya 50-100 rows
```

2. **Untuk pending deletes filter, cek di query level (bukan component):**

```typescript
// Di repository/query - exclude pending deletes
async getByEventIdPaginated(
  eventId: string,
  { offset, limit }: PaginationParams,
  excludeIds?: string[]  // pending delete IDs
) {
  let query = db.participants.where('eventId').equals(eventId);
  
  if (excludeIds?.length) {
    // Filter di DB level jika possible, atau di query result (small set)
  }
  
  return query.offset(offset).limit(limit).toArray();
}
```

3. **Untuk analytics, gunakan pre-computed dari Event + adjustment:**

```typescript
// SALAH - compute dari semua data
const totalParticipants = participants.length;

// BENAR - dari Event (pre-computed) minus pending deletes
const adjustedTotal = event.totalParticipants - pendingDeletes.participantIds.length;
```

4. **Lazy mount dengan startTransition (jika masih freeze):**

```typescript
import { startTransition, useState } from 'react';

function StepParticipants() {
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    startTransition(() => {
      setIsReady(true);
    });
  }, []);
  
  if (!isReady) return <Skeleton />;
  
  return <ActualContent />;
}
```

---

### Issue 2: Rename App dari "Lottery" ke "Raffle"

**Changes:**

| Location | From | To |
|----------|------|-----|
| Header logo text | LotteryApp | RaffleApp |
| Page titles | Lottery Event | Raffle Event |
| Meta/HTML title | Lottery App | Raffle App |
| README (jika ada) | lottery | raffle |
| Comments/docs | lottery | raffle |

**Note:** Folder/file structure tidak perlu di-rename untuk avoid git chaos.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/wizard/StepParticipants.tsx` | Remove heavy computation, use pre-computed data |
| `src/components/layout/Header.tsx` | Rename LotteryApp → RaffleApp |
| `index.html` | Update title |
| `src/pages/*.tsx` | Update any "lottery" text references |

---

## Execution Order

```
1. Fix Issue 1 - UI freeze
   ├── Identify blocking computation
   ├── Move to DB level atau use pre-computed
   └── Test dengan 148K data
       ↓
2. Rename app (Issue 2)
   └── Update all text references
       ↓
3. Test
```

---

## Testing Checklist

**Issue 1 - UI Freeze:**
- [ ] Upload 148K → confirm → next → back → instant (no freeze)
- [ ] Pointer changes immediately saat click step
- [ ] No main thread blocking

**Issue 2 - Rename:**
- [ ] Header shows "RaffleApp"
- [ ] Browser tab title updated
- [ ] No "lottery" text visible in UI
