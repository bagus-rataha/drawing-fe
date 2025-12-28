# Raffle App - DrawScreen Animation Revision 09

## Overview

Revisi untuk fix 4 issues:
1. Animasi winner hanya di row pertama
2. Batch ter-reset saat keluar dan resume (perlu DB persistence)
3. **CRITICAL:** Draw tidak bertambah setelah redraw
4. Confirm button butuh 2x klik

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Issue 1: Animasi Winner Hanya di Row Pertama

### Problem
Saat Stop → reveal, hanya winner di row pertama yang ada animasi. Row berikutnya langsung muncul tanpa animasi.

### Root Cause
Animation loop kemungkinan hanya iterate berdasarkan `gridX` (columns) saja, bukan total visible cards.

### Solution: Fix Animation Loop untuk Semua Cards

```typescript
// src/components/draw/WinnerRevealAnimation.tsx

interface WinnerRevealAnimationProps {
  winners: DrawResult[];
  isRevealing: boolean;
  onRevealComplete: () => void;
  gridX?: number;
  gridY?: number;
}

export function WinnerRevealAnimation({
  winners,
  isRevealing,
  onRevealComplete,
  gridX = 5,
  gridY = 2
}: WinnerRevealAnimationProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const animationCompleteRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Total cards per page
  const cardsPerPage = gridX * gridY;
  
  // Winners to show (limited by grid)
  const visibleWinners = winners.slice(0, cardsPerPage);

  // Reset state when winners change or revealing starts
  useEffect(() => {
    if (isRevealing && winners.length > 0) {
      setRevealedCount(0);
      animationCompleteRef.current = false;
    }
  }, [isRevealing, winners]);

  // Reveal animation - sequential for ALL visible winners
  useEffect(() => {
    if (!isRevealing || visibleWinners.length === 0 || animationCompleteRef.current) {
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    let currentCount = 0;

    intervalRef.current = setInterval(() => {
      currentCount++;
      setRevealedCount(currentCount);

      // Check if all visible winners are revealed
      if (currentCount >= visibleWinners.length) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        // Call onRevealComplete after last card animation settles
        setTimeout(() => {
          if (!animationCompleteRef.current) {
            animationCompleteRef.current = true;
            onRevealComplete();
          }
        }, 500);
      }
    }, 200); // 200ms between each card

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRevealing, visibleWinners.length, onRevealComplete]);

  // Render grid with animation
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div 
        className="grid gap-4 pointer-events-auto"
        style={{ 
          gridTemplateColumns: `repeat(${gridX}, minmax(0, 1fr))`,
          maxWidth: '90%'
        }}
      >
        {visibleWinners.map((winner, index) => {
          const isRevealed = index < revealedCount;
          const isNewlyRevealed = index === revealedCount - 1;

          return (
            <div
              key={winner.id}
              className={cn(
                "transform transition-all duration-300",
                isRevealed 
                  ? "opacity-100 scale-100 translate-y-0" 
                  : "opacity-0 scale-75 -translate-y-4"
              )}
            >
              <WinnerCard
                winner={winner}
                isNew={isNewlyRevealed}
                // ... other props
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Key Changes:**
- Gunakan `visibleWinners.length` (bukan hanya gridX)
- Loop sampai semua visible cards (gridX × gridY)
- Proper cleanup dengan ref untuk interval

---

## Issue 2: Batch Ter-reset Saat Keluar dan Resume

### Problem
- Drawing prize ke 2, batch 3/10
- Keluar dari event
- Resume → batch kembali ke 1/10

### Root Cause
`currentBatchIndex` dan `currentPrizeIndex` hanya disimpan di React state, tidak di database.

### Solution: Draw Progress Persistence

**Perlu table/model baru: `DrawProgress`**

```typescript
// src/types/index.ts

interface DrawProgress {
  id: string;
  eventId: string;
  prizeId: string;
  prizeIndex: number;        // Index prize saat ini (0-based)
  batchIndex: number;        // Index batch saat ini (0-based)
  totalBatches: number;      // Total batches untuk prize ini
  status: 'in-progress' | 'completed';
  startedAt: string;
  updatedAt: string;
}
```

**Update Event model:**

```typescript
interface Event {
  id: string;
  name: string;
  status: 'draft' | 'in-progress' | 'completed' | 'cancelled';
  currentPrizeId?: string;   // Prize yang sedang di-draw
  // ... other fields
}
```

### Repository: DrawProgressRepository

```typescript
// src/repositories/drawProgressRepository.ts

import { db } from '../db';
import { DrawProgress } from '../types';
import { generateId } from '../utils/id';

export const drawProgressRepository = {
  // Get current progress for event
  async getCurrentProgress(eventId: string): Promise<DrawProgress | null> {
    const progress = await db.drawProgress
      .where('eventId')
      .equals(eventId)
      .and(p => p.status === 'in-progress')
      .first();
    return progress || null;
  },

  // Get progress for specific prize
  async getByPrize(eventId: string, prizeId: string): Promise<DrawProgress | null> {
    return await db.drawProgress
      .where(['eventId', 'prizeId'])
      .equals([eventId, prizeId])
      .first() || null;
  },

  // Create new progress
  async create(data: Omit<DrawProgress, 'id'>): Promise<DrawProgress> {
    const progress: DrawProgress = {
      ...data,
      id: generateId('progress')
    };
    await db.drawProgress.add(progress);
    return progress;
  },

  // Update progress
  async update(id: string, data: Partial<DrawProgress>): Promise<void> {
    await db.drawProgress.update(id, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  },

  // Increment batch index
  async incrementBatch(id: string): Promise<void> {
    const progress = await db.drawProgress.get(id);
    if (!progress) return;

    const newBatchIndex = progress.batchIndex + 1;
    const isCompleted = newBatchIndex >= progress.totalBatches;

    await db.drawProgress.update(id, {
      batchIndex: newBatchIndex,
      status: isCompleted ? 'completed' : 'in-progress',
      updatedAt: new Date().toISOString()
    });
  },

  // Move to next prize
  async moveToNextPrize(
    eventId: string, 
    nextPrizeId: string, 
    nextPrizeIndex: number,
    totalBatches: number
  ): Promise<DrawProgress> {
    // Mark current as completed
    const current = await this.getCurrentProgress(eventId);
    if (current) {
      await this.update(current.id, { status: 'completed' });
    }

    // Create new progress for next prize
    return await this.create({
      eventId,
      prizeId: nextPrizeId,
      prizeIndex: nextPrizeIndex,
      batchIndex: 0,
      totalBatches,
      status: 'in-progress',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
};
```

### Update Dexie Schema

```typescript
// src/db/index.ts

const db = new Dexie('RaffleAppDB');

db.version(X).stores({
  // ... existing stores
  drawProgress: '++id, eventId, prizeId, [eventId+prizeId], status'
});
```

### Update DrawScreen to Use Persistence

```typescript
// src/pages/DrawScreen.tsx

export function DrawScreen() {
  const { eventId } = useParams();
  const { data: event } = useEvent(eventId);
  const { data: prizes } = usePrizes(eventId);

  // Load persisted progress on mount
  const [state, dispatch] = useReducer(drawReducer, null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize state from DB
  useEffect(() => {
    async function loadProgress() {
      if (!eventId || !prizes || prizes.length === 0) return;

      const progress = await drawProgressRepository.getCurrentProgress(eventId);

      if (progress) {
        // Resume from saved progress
        dispatch({
          type: 'INIT_FROM_PROGRESS',
          prizeIndex: progress.prizeIndex,
          batchIndex: progress.batchIndex,
          totalBatches: progress.totalBatches,
          progressId: progress.id
        });
      } else {
        // Start fresh - create new progress
        const firstPrize = prizes[0];
        const totalBatches = getTotalBatches(firstPrize);
        
        const newProgress = await drawProgressRepository.create({
          eventId,
          prizeId: firstPrize.id,
          prizeIndex: 0,
          batchIndex: 0,
          totalBatches,
          status: 'in-progress',
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        dispatch({
          type: 'INIT_FROM_PROGRESS',
          prizeIndex: 0,
          batchIndex: 0,
          totalBatches,
          progressId: newProgress.id
        });
      }

      setIsLoading(false);
    }

    loadProgress();
  }, [eventId, prizes]);

  // Save progress after each batch confirm
  const handleConfirm = useCallback(async () => {
    if (state.status !== 'reviewing') return;

    try {
      // Confirm winners in DB
      await drawService.confirmBatch(currentPrize!.id, state.batchIndex + 1);

      // Update progress in DB
      await drawProgressRepository.incrementBatch(state.progressId);

      // Check if more batches
      if (state.batchIndex + 1 >= state.totalBatches) {
        // Prize complete
        if (state.prizeIndex + 1 >= prizes!.length) {
          // Event complete
          await eventRepository.update(eventId!, {
            status: 'completed',
            completedAt: new Date().toISOString()
          });
          navigate(`/event/${eventId}/results`);
        } else {
          // Move to next prize
          const nextPrize = prizes![state.prizeIndex + 1];
          const nextTotalBatches = getTotalBatches(nextPrize);

          await drawProgressRepository.moveToNextPrize(
            eventId!,
            nextPrize.id,
            state.prizeIndex + 1,
            nextTotalBatches
          );

          dispatch({ type: 'NEXT_PRIZE', totalBatches: nextTotalBatches });
        }
      } else {
        dispatch({ type: 'CONFIRM_WINNERS' });
      }
    } catch (error) {
      console.error('[HandleConfirm] Error:', error);
    }
  }, [state, currentPrize, prizes, eventId]);

  // ... rest
}
```

### Updated Reducer

```typescript
type DrawAction =
  | { type: 'INIT_FROM_PROGRESS'; prizeIndex: number; batchIndex: number; totalBatches: number; progressId: string }
  | { type: 'START_SPIN' }
  | { type: 'STOP_SPIN' }
  | { type: 'DRAW_COMPLETE'; winners: DrawResult[] }
  | { type: 'REVEAL_COMPLETE' }
  | { type: 'CONFIRM_WINNERS' }
  | { type: 'NEXT_PRIZE'; totalBatches: number }
  | { type: 'REDRAW_COMPLETE'; winners: DrawResult[] };

interface DrawState {
  status: DrawStatus;
  prizeIndex: number;
  batchIndex: number;
  totalBatches: number;
  progressId: string;
  currentBatchWinners: DrawResult[];
}

function drawReducer(state: DrawState | null, action: DrawAction): DrawState | null {
  if (action.type === 'INIT_FROM_PROGRESS') {
    return {
      status: 'idle',
      prizeIndex: action.prizeIndex,
      batchIndex: action.batchIndex,
      totalBatches: action.totalBatches,
      progressId: action.progressId,
      currentBatchWinners: []
    };
  }

  if (!state) return null;

  switch (action.type) {
    case 'START_SPIN':
      if (state.status !== 'idle') return state;
      return { ...state, status: 'spinning' };

    case 'STOP_SPIN':
      if (state.status !== 'spinning') return state;
      return { ...state, status: 'drawing' };

    case 'DRAW_COMPLETE':
      if (state.status !== 'drawing') return state;
      return { 
        ...state, 
        status: 'revealing',
        currentBatchWinners: action.winners
      };

    case 'REVEAL_COMPLETE':
      if (state.status !== 'revealing') return state;
      return { ...state, status: 'reviewing' };

    case 'CONFIRM_WINNERS':
      if (state.status !== 'reviewing') return state;
      return {
        ...state,
        status: 'idle',
        batchIndex: state.batchIndex + 1,
        currentBatchWinners: []
      };

    case 'NEXT_PRIZE':
      return {
        ...state,
        status: 'idle',
        prizeIndex: state.prizeIndex + 1,
        batchIndex: 0,
        totalBatches: action.totalBatches,
        currentBatchWinners: []
      };

    case 'REDRAW_COMPLETE':
      return {
        ...state,
        status: 'revealing',
        currentBatchWinners: action.winners
      };

    default:
      return state;
  }
}
```

---

## Issue 3: Redraw Menyebabkan Semua Draw Berikutnya Tidak Bertambah (CRITICAL BUG)

### Problem
- Draw 1 → Start → Ada auto Cancel → Redraw → Confirm (Tidak bertambah)
- Draw 2 → Start → Confirm (Tidak bertambah)  
- Draw 3 → Start → Confirm (Tidak bertambah)

Setelah Redraw di Draw 1, **semua draw berikutnya juga tidak menambah winner**.

Pool ada 148K kupon, jadi bukan masalah pool habis.

### Root Cause Analysis

**Ini bug serius** - ada sesuatu yang "rusak" setelah redraw pertama.

Kemungkinan penyebab:

| # | Kemungkinan | Description |
|---|-------------|-------------|
| 1 | Coupon status stuck | Semua coupon status berubah ke 'used' atau 'cancelled' dan tidak di-reset |
| 2 | Query pool salah | Query available coupons return 0 setelah redraw |
| 3 | Transaction tidak commit | INSERT winner tidak tersimpan ke DB |
| 4 | Flag/state corrupt | Ada flag global yang corrupt setelah redraw |
| 5 | Win rule query salah | isWinning check return true untuk semua coupon |

### Debug Step 1: Check Console & DB

Tambahkan console logs untuk trace masalah:

```typescript
// src/services/drawService.ts

async draw(eventId: string, prizeId: string, quantity: number, batchNumber: number): Promise<DrawResult[]> {
  console.log('=== DRAW SERVICE START ===');
  console.log('[Draw] eventId:', eventId);
  console.log('[Draw] prizeId:', prizeId);
  console.log('[Draw] quantity:', quantity);
  console.log('[Draw] batchNumber:', batchNumber);

  // Check 1: Available pool
  const availablePool = await couponRepository.getAvailableForDraw(eventId);
  console.log('[Draw] Available pool count:', availablePool.length);
  
  if (availablePool.length === 0) {
    console.error('[Draw] POOL IS EMPTY! Checking why...');
    
    // Debug: Get all coupons and their status
    const allCoupons = await couponRepository.getByEvent(eventId);
    console.log('[Draw] Total coupons:', allCoupons.length);
    
    const statusCounts = allCoupons.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('[Draw] Coupon status breakdown:', statusCounts);
    
    return [];
  }

  // Check 2: Draw winners
  const winners: DrawResult[] = [];
  
  for (let i = 0; i < quantity; i++) {
    console.log(`[Draw] Drawing winner ${i + 1}/${quantity}`);
    
    const result = await this.drawSingleWinner(eventId, prizeId, i + 1);
    console.log(`[Draw] Result ${i + 1}:`, result);
    
    winners.push(result);
  }

  console.log('[Draw] Total winners drawn:', winners.length);
  console.log('=== DRAW SERVICE END ===');
  
  return winners;
}

async redrawAll(prizeId: string): Promise<DrawResult[]> {
  console.log('=== REDRAW SERVICE START ===');
  console.log('[Redraw] prizeId:', prizeId);

  // Get cancelled entries
  const cancelledEntries = await winnerRepository.getCancelledForRedraw(prizeId);
  console.log('[Redraw] Cancelled entries:', cancelledEntries.length);
  console.log('[Redraw] Cancelled entries detail:', cancelledEntries);

  // ... rest of redraw logic

  console.log('=== REDRAW SERVICE END ===');
}
```

### Debug Step 2: Check Coupon Repository

```typescript
// src/repositories/couponRepository.ts

async getAvailableForDraw(eventId: string): Promise<Coupon[]> {
  console.log('[CouponRepo] Getting available coupons for event:', eventId);
  
  const coupons = await db.coupons
    .where('eventId')
    .equals(eventId)
    .filter(c => c.status === 'active') // <-- CHECK THIS FILTER
    .toArray();

  console.log('[CouponRepo] Available coupons:', coupons.length);
  
  // DEBUG: If 0, check what statuses exist
  if (coupons.length === 0) {
    const allCoupons = await db.coupons
      .where('eventId')
      .equals(eventId)
      .toArray();
    
    console.log('[CouponRepo] Total coupons in DB:', allCoupons.length);
    
    const statuses = [...new Set(allCoupons.map(c => c.status))];
    console.log('[CouponRepo] Unique statuses:', statuses);
    
    // Sample first 5
    console.log('[CouponRepo] Sample coupons:', allCoupons.slice(0, 5));
  }

  return coupons;
}
```

### Likely Bug: Coupon Status Update Salah

**Kemungkinan besar bug ada di sini:**

```typescript
// BUGGY CODE (kemungkinan)
async cancelWinner(winnerId: string): Promise<void> {
  const winner = await winnerRepository.getById(winnerId);
  
  // Update winner status
  await winnerRepository.update(winnerId, { status: 'cancelled' });
  
  // BUG: Mungkin update SEMUA coupon, bukan hanya yang cancelled
  await couponRepository.updateStatus(winner.couponId, 'cancelled');
  // atau
  await db.coupons.where('eventId').equals(eventId).modify({ status: 'cancelled' }); // BUG!
}
```

### Fix: Check Coupon Status Update Logic

```typescript
// src/services/drawService.ts atau src/repositories/couponRepository.ts

// CORRECT: Only update specific coupon
async cancelWinnerCoupon(couponId: string): Promise<void> {
  console.log('[CouponRepo] Cancelling coupon:', couponId);
  
  // Update ONLY this specific coupon
  await db.coupons
    .where('id')
    .equals(couponId)  // <-- MUST be specific coupon ID
    .modify({ status: 'cancelled' });
    
  console.log('[CouponRepo] Coupon cancelled:', couponId);
}

// WRONG: This would cancel ALL coupons!
// await db.coupons.where('eventId').equals(eventId).modify({ status: 'cancelled' });
```

### Fix: Reset Coupon Status on Redraw

Saat redraw, coupon yang cancelled harus di-reset ke 'active':

```typescript
// src/services/drawService.ts

async redrawAll(prizeId: string): Promise<DrawResult[]> {
  // Get cancelled entries
  const cancelledEntries = await winnerRepository.getCancelledForRedraw(prizeId);
  
  // IMPORTANT: Reset coupon status back to 'active'
  for (const entry of cancelledEntries) {
    await couponRepository.updateStatus(entry.couponId, 'active');
    console.log('[Redraw] Reset coupon to active:', entry.couponId);
  }

  // Now draw new winners
  const newWinners: DrawResult[] = [];
  
  for (let i = 0; i < cancelledEntries.length; i++) {
    const result = await this.drawSingleWinner(
      cancelledEntries[i].eventId,
      prizeId,
      cancelledEntries[i].slot
    );
    newWinners.push(result);
  }

  return newWinners;
}
```

### Check: Winner Insert Actually Works

```typescript
// src/repositories/winnerRepository.ts

async create(winner: Omit<Winner, 'id'>): Promise<Winner> {
  const newWinner: Winner = {
    ...winner,
    id: generateId('winner'),
    createdAt: new Date().toISOString()
  };

  console.log('[WinnerRepo] Creating winner:', newWinner);

  try {
    await db.winners.add(newWinner);
    console.log('[WinnerRepo] Winner created successfully:', newWinner.id);
    
    // Verify it was saved
    const saved = await db.winners.get(newWinner.id);
    console.log('[WinnerRepo] Verification - saved winner:', saved);
    
    return newWinner;
  } catch (error) {
    console.error('[WinnerRepo] Failed to create winner:', error);
    throw error;
  }
}
```

### Full Debug Checklist

Claude CLI harus check:

1. **Buka DevTools → Application → IndexedDB → RaffleAppDB**
   - Check `coupons` table: berapa yang status 'active'?
   - Check `winners` table: apakah entries ter-insert?

2. **Add console logs** di:
   - `drawService.draw()`
   - `drawService.redrawAll()`
   - `couponRepository.getAvailableForDraw()`
   - `couponRepository.updateStatus()`
   - `winnerRepository.create()`

3. **Trace the bug:**
   - Sebelum Draw 1: berapa coupon status 'active'?
   - Setelah Draw 1 + Redraw: berapa coupon status 'active'?
   - Jika 0 → bug di coupon status update

4. **Check query filters:**
   - `getAvailableForDraw` filter apa?
   - Apakah ada filter yang terlalu ketat?

### Kemungkinan Fix

**Jika bug adalah coupon status di-update semua:**

```typescript
// Find and fix the buggy code
// Look for patterns like:
await db.coupons.where('eventId').equals(eventId).modify(...) // BUG
await db.coupons.toCollection().modify(...) // BUG
await db.coupons.bulkPut(...) // Might be BUG

// Should be:
await db.coupons.where('id').equals(specificCouponId).modify(...) // CORRECT
await db.coupons.update(specificCouponId, {...}) // CORRECT
```

**Jika bug adalah winner tidak ter-insert:**

```typescript
// Check if transaction is being used correctly
await db.transaction('rw', [db.winners, db.coupons], async () => {
  await db.winners.add(winner);
  await db.coupons.update(couponId, { status: 'used' });
});
// Make sure transaction commits
```

---

## Issue 4: Confirm Button Butuh 2x Klik

### Problem
Confirm button seringkali harus diklik 2 kali sebelum bisa lanjut ke Start Draw berikutnya.

### Possible Root Causes

| # | Kemungkinan | Description |
|---|-------------|-------------|
| 1 | State belum 'reviewing' | Klik pertama masih di state lain (revealing?) |
| 2 | Async operation belum selesai | Handler return sebelum state update |
| 3 | Guard condition terlalu ketat | `if (state.status !== 'reviewing')` reject klik pertama |
| 4 | Double dispatch | 2 dispatch terjadi, saling override |
| 5 | Event propagation | onClick terpanggil tapi tidak execute |

### Debug: Add Console Logs

```typescript
// src/pages/DrawScreen.tsx

const handleConfirm = useCallback(async () => {
  console.log('=== CONFIRM CLICKED ===');
  console.log('[Confirm] Current state:', state);
  console.log('[Confirm] Status:', state.status);
  
  if (state.status !== 'reviewing') {
    console.warn('[Confirm] BLOCKED - status is not reviewing:', state.status);
    return;
  }

  console.log('[Confirm] Proceeding with confirm...');
  
  try {
    // ... confirm logic
    
    console.log('[Confirm] Dispatching CONFIRM_WINNERS');
    dispatch({ type: 'CONFIRM_WINNERS' });
    
    console.log('[Confirm] Done');
  } catch (error) {
    console.error('[Confirm] Error:', error);
  }
}, [state.status, /* other deps */]);
```

### Debug: Check Button Click

```typescript
// src/components/draw/DrawControls.tsx

case 'reviewing':
  return (
    <button
      onClick={() => {
        console.log('[Button] Confirm clicked at:', Date.now());
        onConfirm();
      }}
      className="..."
    >
      Confirm
    </button>
  );
```

### Likely Fix: State Transition Timing

Kemungkinan `REVEAL_COMPLETE` belum dispatch saat user klik Confirm:

```typescript
// Check: Is onRevealComplete being called?
const handleRevealComplete = useCallback(() => {
  console.log('[RevealComplete] Called at:', Date.now());
  console.log('[RevealComplete] Current status:', state.status);
  
  if (state.status !== 'revealing') {
    console.warn('[RevealComplete] BLOCKED - not in revealing state');
    return;
  }
  
  dispatch({ type: 'REVEAL_COMPLETE' });
  console.log('[RevealComplete] Dispatched REVEAL_COMPLETE');
}, [state.status]);
```

### Fix: Ensure REVEAL_COMPLETE Happens

```typescript
// src/components/draw/WinnerRevealAnimation.tsx

useEffect(() => {
  if (!isRevealing || visibleWinners.length === 0 || animationCompleteRef.current) {
    return;
  }

  // ... animation logic

  // After all cards revealed
  if (currentCount >= visibleWinners.length) {
    clearInterval(intervalRef.current);
    
    // IMPORTANT: Call onRevealComplete immediately, not in setTimeout
    console.log('[Animation] All cards revealed, calling onRevealComplete');
    
    // Small delay for last card animation to settle
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (!animationCompleteRef.current) {
          animationCompleteRef.current = true;
          console.log('[Animation] Executing onRevealComplete');
          onRevealComplete();
        }
      }, 300);
    });
  }
}, [/* deps */]);
```

### Alternative Fix: Remove Guard or Make It Lenient

```typescript
// Option A: Log but don't block
const handleConfirm = useCallback(async () => {
  if (state.status !== 'reviewing') {
    console.warn('[Confirm] Status is', state.status, '- but proceeding anyway');
    // Don't return, let it try anyway
  }
  
  // ... rest of logic
}, [state]);

// Option B: Accept multiple valid states
const handleConfirm = useCallback(async () => {
  const validStates = ['reviewing', 'revealing']; // Accept both
  
  if (!validStates.includes(state.status)) {
    console.warn('[Confirm] Invalid state:', state.status);
    return;
  }
  
  // ... rest of logic
}, [state]);
```

### Fix: Disable Button Until Ready

```typescript
// src/components/draw/DrawControls.tsx

case 'reviewing':
  const isReady = state.status === 'reviewing' && !isProcessing;
  
  return (
    <button
      onClick={onConfirm}
      disabled={!isReady}
      className={cn(
        "px-8 py-3 rounded-full shadow-lg font-medium",
        isReady 
          ? "bg-[#635bff] text-white hover:bg-[#524acc]" 
          : "bg-gray-300 text-gray-500 cursor-not-allowed"
      )}
    >
      {isReady ? 'Confirm' : 'Please wait...'}
    </button>
  );
```

---

## Summary of Changes

| # | Issue | Solution |
|---|-------|----------|
| 1 | Animasi hanya row 1 | Fix animation loop untuk semua visible winners (gridX × gridY) |
| 2 | Batch reset saat resume | Add `DrawProgress` table, load/save progress dari DB |
| 3 | **CRITICAL: Draw tidak bertambah setelah redraw** | Debug coupon status, fix status update logic, reset coupon on redraw |
| 4 | Confirm butuh 2x klik | Debug state transition, fix REVEAL_COMPLETE timing |

---

## New Files

| File | Description |
|------|-------------|
| `src/repositories/drawProgressRepository.ts` | CRUD untuk draw progress |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/db/index.ts` | Add drawProgress store |
| `src/types/index.ts` | Add DrawProgress type |
| `src/components/draw/WinnerRevealAnimation.tsx` | Fix animation loop, fix onRevealComplete timing |
| `src/components/draw/DrawControls.tsx` | Add debug logs for button clicks |
| `src/pages/DrawScreen.tsx` | Load/save progress, init from DB, debug confirm handler |
| `src/services/drawService.ts` | **ADD DEBUG LOGS**, fix redraw logic, reset coupon status |
| `src/repositories/couponRepository.ts` | **ADD DEBUG LOGS**, fix getAvailableForDraw |
| `src/repositories/winnerRepository.ts` | **ADD DEBUG LOGS**, verify insert |

---

## Testing Checklist

### Issue 1 - Animation:
- [ ] Winner di row 1 ada animasi
- [ ] Winner di row 2 ada animasi
- [ ] Semua winners (sampai gridX × gridY) ada animasi sequential

### Issue 2 - Progress Persistence:
- [ ] Draw batch 3/10 → keluar → resume → masih di batch 3/10
- [ ] Progress tersimpan di IndexedDB (check DevTools)
- [ ] New event mulai dari batch 1
- [ ] Completed prize tidak bisa di-draw lagi

### Issue 3 - CRITICAL BUG DEBUG:
- [ ] Check console logs saat draw
- [ ] Check IndexedDB → coupons table → berapa status 'active'?
- [ ] Check IndexedDB → winners table → apakah entries ada?
- [ ] Sebelum Draw 1: log available pool count
- [ ] Setelah Draw 1 + Redraw: log available pool count
- [ ] Identify: apakah coupon status ter-update semua?
- [ ] Fix: coupon status update hanya untuk specific coupon ID
- [ ] Fix: reset coupon status to 'active' saat redraw
- [ ] Verify: Draw 2, 3, dst menambah winner setelah fix

### Issue 4 - Confirm Button:
- [ ] Check console: status saat Confirm diklik
- [ ] Check: apakah REVEAL_COMPLETE sudah dispatch sebelum klik?
- [ ] Confirm hanya butuh 1x klik
- [ ] State transition: revealing → reviewing → idle smooth
