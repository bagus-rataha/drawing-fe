# React Lottery App - Revision 08

## Overview

1. Delete confirmation dengan extra validation (ketik konfirmasi)
2. Fix production build error (React Error #185) saat edit event

**SKIPPED (akan di-handle di Phase 2):**
- Search di mode Detail yang lambat
- Pagination lambat saat page besar (IndexedDB offset O(n))
- Caching strategy (keep default TanStack Query)

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi, approach, potensi impact
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Issues

### Issue 1: Delete Confirmation dengan Extra Validation

**Current behavior:**
- Klik delete → dialog konfirmasi → klik confirm button → delete

**Expected behavior:**
- Klik delete → dialog konfirmasi → **ketik kode konfirmasi** → confirm button enabled → delete

**Format konfirmasi:** `[identifier]/[4-char-random]` (CASE SENSITIVE)

| Delete Type | Format | Contoh |
|-------------|--------|--------|
| Event | `[EventName]/[random]` | `MyEvent/A7x2` |
| Participant | `[ParticipantID]/[random]` | `P001/B3k9` |
| Coupon | `[CouponID]/[random]` | `C00001/X2m4` |

**Behavior:**
- Setiap dialog dibuka → generate random code baru (4 karakter alphanumeric campuran huruf + angka)
- Tutup/cancel dialog → code hilang
- Buka dialog lagi → random code berbeda
- User harus ketik EXACT match (case sensitive) → baru confirm button enabled

**Implementation:**

```typescript
// utils/helpers.ts

/**
 * Generate random alphanumeric code
 * @param length - panjang code (default 4)
 * @returns random code campuran huruf (upper/lower) + angka
 */
export function generateConfirmationCode(length: number = 4): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate confirmation text untuk delete
 * @param identifier - nama/ID yang akan dihapus
 * @returns format: identifier/randomCode
 */
export function generateDeleteConfirmation(identifier: string): string {
  const code = generateConfirmationCode(4);
  return `${identifier}/${code}`;
}
```

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
  
  // Extra validation
  requireTypedConfirmation?: boolean;
  confirmationIdentifier?: string;  // nama/ID yang dipakai untuk generate code
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
  requireTypedConfirmation = false,
  confirmationIdentifier = '',
}: ConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  
  // Generate new confirmation code setiap dialog dibuka
  useEffect(() => {
    if (open && requireTypedConfirmation && confirmationIdentifier) {
      const newConfirmation = generateDeleteConfirmation(confirmationIdentifier);
      setConfirmationText(newConfirmation);
      setTypedValue('');
    }
  }, [open, requireTypedConfirmation, confirmationIdentifier]);
  
  // Reset saat dialog ditutup
  useEffect(() => {
    if (!open) {
      setTypedValue('');
      setConfirmationText('');
    }
  }, [open]);
  
  // Case sensitive comparison
  const isConfirmEnabled = requireTypedConfirmation 
    ? typedValue === confirmationText
    : true;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="whitespace-pre-line">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        {requireTypedConfirmation && confirmationText && (
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground">
              To confirm, type <span className="font-mono font-bold bg-muted px-2 py-1 rounded">{confirmationText}</span> below:
            </p>
            <Input
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder="Type confirmation code..."
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              * Case sensitive
            </p>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelText}
          </Button>
          <Button 
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            disabled={!isConfirmEnabled}
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

**Usage:**

```typescript
// Delete Event
<ConfirmDialog
  open={!!deleteEventId}
  onOpenChange={(open) => !open && setDeleteEventId(null)}
  title="Delete Event?"
  description={`This will permanently delete "${eventName}" and all related data (prizes, participants, coupons, winners).`}
  requireTypedConfirmation={true}
  confirmationIdentifier={eventName}
  confirmText="Delete Event"
  variant="destructive"
  onConfirm={confirmDeleteEvent}
/>

// Delete Participant
<ConfirmDialog
  open={!!deleteParticipantId}
  onOpenChange={(open) => !open && setDeleteParticipantId(null)}
  title="Delete Participant?"
  description={`This will delete participant "${participantId}" and all ${couponCount} coupon(s).`}
  requireTypedConfirmation={true}
  confirmationIdentifier={participantId}
  confirmText="Delete"
  variant="destructive"
  onConfirm={confirmDeleteParticipant}
/>

// Delete Coupon
<ConfirmDialog
  open={!!deleteCouponId}
  onOpenChange={(open) => !open && setDeleteCouponId(null)}
  title="Delete Coupon?"
  description={`This will permanently delete coupon "${couponId}".`}
  requireTypedConfirmation={true}
  confirmationIdentifier={couponId}
  confirmText="Delete"
  variant="destructive"
  onConfirm={confirmDeleteCoupon}
/>
```

---

### Issue 2: Production Build Error - React Error #185

**Symptom:**
- `npm run dev` → tidak ada error
- `npm run build` → build berhasil
- Akses production build → klik Edit event → page blank + console error:

```
Error: Minified React error #185
at initWizardForEdit (index-xxx.js:319:2323)
```

**React Error #185:** "Maximum update depth exceeded" - infinite re-render loop

**Root cause kemungkinan:**
Di `initWizardForEdit` atau useEffect terkait ada pattern yang menyebabkan infinite loop. Error muncul di production karena:
1. Dev mode punya safeguard yang hide certain bugs
2. React Strict Mode di dev menjalankan effect 2x
3. Minification mengubah execution timing

**Debug steps:**

1. **Cari `initWizardForEdit` function dan semua tempat yang memanggilnya**

2. **Cek pattern useEffect yang bermasalah:**

```typescript
// BERMASALAH - dependency menyebabkan loop
useEffect(() => {
  initWizardForEdit(eventId); // setState di dalam
}, [someStateYangDiSetDiDalam]); // ← loop

// BERMASALAH - missing dependency tapi effect jalan terus
useEffect(() => {
  if (mode === 'edit') {
    setSomeState(value); // trigger re-render
  }
}); // ← no dependency array = setiap render

// BERMASALAH - object/array sebagai dependency
useEffect(() => {
  initWizardForEdit(data);
}, [{ eventId }]); // ← object baru setiap render = loop
```

3. **Fix pattern:**

```typescript
// BENAR - jalankan sekali saat mount/eventId berubah
const hasInitialized = useRef(false);

useEffect(() => {
  if (mode === 'edit' && eventId && !hasInitialized.current) {
    hasInitialized.current = true;
    initWizardForEdit(eventId);
  }
}, [mode, eventId]);

// Reset ref saat eventId berubah
useEffect(() => {
  hasInitialized.current = false;
}, [eventId]);
```

**Atau gunakan pattern lazy initialization:**

```typescript
// BENAR - check sebelum setState
useEffect(() => {
  if (mode === 'edit' && eventId) {
    // Cek apakah sudah initialized untuk mencegah loop
    const currentState = useWizardStore.getState();
    if (currentState.eventId !== eventId) {
      initWizardForEdit(eventId);
    }
  }
}, [mode, eventId]);
```

4. **Investigate di Zustand store:**

Cek apakah `initWizardForEdit` di store melakukan setState yang trigger subscriber, yang kemudian trigger effect lagi.

```typescript
// wizardStore.ts - cek function ini
initWizardForEdit: async (eventId) => {
  // Apakah ada set() yang tidak perlu?
  // Apakah ada multiple set() yang bisa digabung?
  
  // BERMASALAH - multiple set() bisa trigger multiple re-render
  set({ loading: true });
  const data = await fetchEvent(eventId);
  set({ eventData: data });
  set({ loading: false });
  
  // LEBIH BAIK - single set()
  set({ loading: true });
  const data = await fetchEvent(eventId);
  set({ eventData: data, loading: false });
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/utils/helpers.ts` | Add `generateConfirmationCode`, `generateDeleteConfirmation` |
| `src/components/ui/ConfirmDialog.tsx` | Add typed confirmation support |
| `src/pages/Home.tsx` | Update delete event dengan typed confirmation |
| `src/components/wizard/StepParticipants.tsx` | Update delete participant/coupon dengan typed confirmation |
| `src/stores/wizardStore.ts` | Investigate & fix initWizardForEdit |
| `src/pages/EventWizard.tsx` | Fix useEffect yang menyebabkan infinite loop |

---

## Execution Order

```
1. Fix Production Build Error (Issue 2) - PRIORITY
   ├── Investigate initWizardForEdit dan useEffect terkait
   ├── Cari infinite loop pattern
   ├── Fix dengan useRef atau conditional check
   └── Test di production build
       ↓
2. Update ConfirmDialog (Issue 1)
   ├── Add generateConfirmationCode helper
   ├── Update ConfirmDialog component
   └── Update semua delete dialogs (event, participant, coupon)
       ↓
3. Build & Test Production
   └── npm run build && npm run preview
```

---

## Testing Checklist

**Issue 1 - Typed Confirmation:**
- [ ] Delete event → muncul confirmation code format `EventName/Xxxx`
- [ ] Random code berubah setiap buka dialog
- [ ] Ketik salah (case berbeda) → button disabled
- [ ] Ketik exact match → button enabled → delete berhasil
- [ ] Delete participant → format `ParticipantID/Xxxx`
- [ ] Delete coupon → format `CouponID/Xxxx`

**Issue 2 - Production Build:**
- [ ] `npm run build` → no errors
- [ ] `npm run preview` → akses app
- [ ] Create new event → no errors
- [ ] Edit existing event → no errors, page loads correctly
- [ ] Console tidak ada Error #185
