# Raffle App - DrawScreen Revision 21

## 🔴 CRITICAL BUG: Redraw Menyebabkan Winner Count Bertambah

### Problem:
- Event dengan 1 batch = 50 winners, per page = 10 (seharusnya 5 pages)
- Setelah redraw:
  - Page bertambah dari 5 → 6 (SALAH)
  - Tombol confirm menunjukkan "Confirm 58 Winners" (SALAH)
  - Tapi di DB/history hanya 50 yang tersimpan (BENAR)

### Root Cause:

**Location:** `src/hooks/useDrawState.ts` line 375

**Bug:** State merge filter berdasarkan `status` bukan `lineNumber`

```typescript
// ❌ CURRENT (BUGGY)
const validWinners = state.winners.filter((w) => w.status !== 'cancelled')
const allWinners = [...validWinners, ...newResultsWithId]
```

**Problem Scenario:**
```
Before redraw (state.winners = 50):
- lineNumber 3: valid (original)
- lineNumber 7: cancelled (will be redrawn)
- lineNumber 12: cancelled (will be redrawn)
- ... total 50 entries

After redraw service returns newResults = [lineNumber 7, 12] (2 new winners)

State merge (BUGGY):
validWinners = filter(status !== 'cancelled') = 48 entries
allWinners = [...48, ...2 new] = 50 ✓ seems correct...

BUT! If there are edge cases where:
- Same lineNumber exists as both cancelled AND valid (race condition)
- Multiple redraw cycles create orphan entries
- State not properly synced with DB

Result: Duplicate lineNumbers → 58 entries instead of 50
```

### Fix:

```typescript
// ✅ FIXED - Filter by lineNumber, not status
const redrawPositions = newResultsWithId.map(r => r.lineNumber)
const winnersToKeep = state.winners.filter(
  (w) => !redrawPositions.includes(w.lineNumber)
)
const allWinners = [...winnersToKeep, ...newResultsWithId]
const sortedWinners = allWinners.sort((a, b) => a.lineNumber - b.lineNumber)
```

**Why this works:**
- Remove ALL winners at redrawn positions (regardless of status)
- Add new winners at those positions
- No duplicates by lineNumber
- Total count stays at 50

---

## File to Modify

| File | Change |
|------|--------|
| `src/hooks/useDrawState.ts` | Fix merge logic in redrawAll callback (line ~375) |

---

## Implementation

### Before (line ~375 in useDrawState.ts):

```typescript
// In redrawAll callback
const validWinners = state.winners.filter((w) => w.status !== 'cancelled')
const allWinners = [...validWinners, ...newResultsWithId]
const sortedWinners = allWinners.sort((a, b) => a.lineNumber - b.lineNumber)
```

### After:

```typescript
// In redrawAll callback

// Get lineNumbers yang di-redraw
const redrawPositions = newResultsWithId.map(r => r.lineNumber)

// Remove ALL winners at redrawn positions (bukan filter by status)
const winnersToKeep = state.winners.filter(
  (w) => !redrawPositions.includes(w.lineNumber)
)

// Merge: existing (tanpa redrawn positions) + new results
const allWinners = [...winnersToKeep, ...newResultsWithId]
const sortedWinners = allWinners.sort((a, b) => a.lineNumber - b.lineNumber)
```

---

## Testing Checklist

### Scenario 1: Single Redraw
- [ ] Draw 50 winners (5 pages)
- [ ] 8 auto-cancelled
- [ ] Click Redraw
- [ ] **VERIFY:** Total masih 50, pages masih 5
- [ ] **VERIFY:** Confirm button shows "Confirm 50 Winners"

### Scenario 2: Multiple Redraw Cycles
- [ ] Draw 50 winners
- [ ] Redraw (first cycle)
- [ ] Some auto-cancelled again
- [ ] Redraw (second cycle)
- [ ] **VERIFY:** Total STILL 50, pages STILL 5

### Scenario 3: Manual Cancel + Redraw
- [ ] Draw 50 winners
- [ ] Manually cancel 3 winners
- [ ] Click Redraw
- [ ] **VERIFY:** Total masih 50

### Scenario 4: Mixed Cancel (Auto + Manual) + Redraw
- [ ] Draw 50 winners
- [ ] 5 auto-cancelled + manually cancel 2 more
- [ ] Click Redraw
- [ ] **VERIFY:** Total masih 50, all 7 positions replaced

---

## Expected Behavior After Fix

```
Initial Draw: 50 winners (pages 1-5)
        ↓
Auto-Cancel: 8 winners cancelled
        ↓
State: 50 entries (42 valid + 8 cancelled)
        ↓
User clicks Redraw
        ↓
Service: Creates 8 NEW winners at positions [3,7,12,15,22,30,41,48]
        ↓
State Merge (FIXED):
  - Remove ALL entries at positions [3,7,12,15,22,30,41,48] = 42 remaining
  - Add 8 new winners = 42 + 8 = 50
        ↓
Result: 50 winners, 5 pages ✅
```
