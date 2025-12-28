# Raffle App - DrawScreen Animation Revision 08

## Overview

Revisi untuk fix button state machine yang tidak bekerja dengan benar.

**Issue Sphere hilang** → ✅ SOLVED dengan disable React Strict Mode di `main.tsx`

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Issue (SOLVED): Sphere Hilang di Dev Mode

**Status:** ✅ SOLVED

**Solution:** Disable React Strict Mode di `src/main.tsx`

```tsx
// src/main.tsx
createRoot(document.getElementById('root')!).render(
  //<StrictMode>
    <App />
  //</StrictMode>,
)
```

**Reason:** React Strict Mode melakukan double-rendering yang tidak kompatibel dengan Three.js/WebGL.

---

## Issue 1: Button State Machine Tidak Bekerja Dengan Benar

### Current Problems

| Problem | Description |
|---------|-------------|
| Button stuck "Processing" | Setelah Stop → reveal, button tetap disabled "Processing" |
| Sphere masih berputar | Setelah winner revealed, sphere tidak berhenti |
| Stop → Start glitch | Kadang Stop button berubah ke Start tanpa action |
| Confirm 2x klik | Confirm button perlu diklik 2 kali |
| Confirm → Start skip | Confirm kadang langsung skip ke Start tanpa tampil |

### Root Cause Analysis

1. **`FINISH_REVEAL` tidak terpanggil** - setTimeout mungkin tidak execute karena component unmount atau closure issue
2. **`isTransitioning` tidak di-reset** - flag tetap true
3. **Sphere rotation tidak sync dengan state** - `isSpinning` prop tidak update
4. **Animation duration hardcoded** - tidak sync dengan actual animation

### Solution: Simplified State Machine + Event-Based Transitions

**HAPUS `isTransitioning` flag** - terlalu kompleks dan menyebabkan stuck state.
Gunakan state machine yang lebih simple:

```typescript
// src/pages/DrawScreen.tsx

type DrawStatus = 
  | 'idle'           // Waiting to start
  | 'spinning'       // Sphere spinning, waiting for Stop
  | 'drawing'        // Drawing winners (DB operation)
  | 'revealing'      // Animating winner cards
  | 'reviewing';     // Showing winners, waiting for Confirm/Redraw

interface DrawState {
  status: DrawStatus;
  currentPrizeIndex: number;
  currentBatchIndex: number;
  currentBatchWinners: DrawResult[];  // Current batch only
  allWinners: DrawResult[];           // All confirmed winners for this prize
}

type DrawAction =
  | { type: 'START_SPIN' }
  | { type: 'STOP_SPIN' }
  | { type: 'DRAW_COMPLETE'; winners: DrawResult[] }
  | { type: 'REVEAL_COMPLETE' }
  | { type: 'CONFIRM_WINNERS' }
  | { type: 'REDRAW_ALL' }
  | { type: 'NEXT_BATCH' }
  | { type: 'NEXT_PRIZE' }
  | { type: 'FINISH_EVENT' };

function drawReducer(state: DrawState, action: DrawAction): DrawState {
  console.log('[DrawReducer]', action.type, 'current:', state.status);

  switch (action.type) {
    case 'START_SPIN':
      // Only allow from idle
      if (state.status !== 'idle') {
        console.warn('[DrawReducer] START_SPIN blocked, status:', state.status);
        return state;
      }
      return { ...state, status: 'spinning' };

    case 'STOP_SPIN':
      // Only allow from spinning
      if (state.status !== 'spinning') {
        console.warn('[DrawReducer] STOP_SPIN blocked, status:', state.status);
        return state;
      }
      return { ...state, status: 'drawing' };

    case 'DRAW_COMPLETE':
      // Only allow from drawing
      if (state.status !== 'drawing') {
        console.warn('[DrawReducer] DRAW_COMPLETE blocked, status:', state.status);
        return state;
      }
      return { 
        ...state, 
        status: 'revealing',
        currentBatchWinners: action.winners
      };

    case 'REVEAL_COMPLETE':
      // Only allow from revealing
      if (state.status !== 'revealing') {
        console.warn('[DrawReducer] REVEAL_COMPLETE blocked, status:', state.status);
        return state;
      }
      return { ...state, status: 'reviewing' };

    case 'CONFIRM_WINNERS':
      // Only allow from reviewing
      if (state.status !== 'reviewing') {
        console.warn('[DrawReducer] CONFIRM_WINNERS blocked, status:', state.status);
        return state;
      }
      return {
        ...state,
        status: 'idle',
        currentBatchIndex: state.currentBatchIndex + 1,
        allWinners: [...state.allWinners, ...state.currentBatchWinners.filter(w => w.status === 'valid')],
        currentBatchWinners: []
      };

    case 'NEXT_PRIZE':
      return {
        ...state,
        status: 'idle',
        currentPrizeIndex: state.currentPrizeIndex + 1,
        currentBatchIndex: 0,
        currentBatchWinners: [],
        allWinners: []
      };

    default:
      return state;
  }
}
```

### Handler Functions dengan Proper Async Flow

```typescript
export function DrawScreen() {
  const [state, dispatch] = useReducer(drawReducer, {
    status: 'idle',
    currentPrizeIndex: 0,
    currentBatchIndex: 0,
    currentBatchWinners: [],
    allWinners: []
  });

  // Refs untuk track mounted state
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // START DRAW
  const handleStartDraw = useCallback(() => {
    console.log('[HandleStartDraw] called, status:', state.status);
    if (state.status !== 'idle') return;
    dispatch({ type: 'START_SPIN' });
  }, [state.status]);

  // STOP - with complete async flow
  const handleStop = useCallback(async () => {
    console.log('[HandleStop] called, status:', state.status);
    if (state.status !== 'spinning') return;

    // 1. Stop spinning immediately
    dispatch({ type: 'STOP_SPIN' });

    try {
      // 2. Draw winners from service
      const drawQty = getDrawQuantity(currentPrize!, state.currentBatchIndex);
      console.log('[HandleStop] Drawing', drawQty, 'winners');
      
      const results = await drawService.draw(
        eventId!,
        currentPrize!.id,
        drawQty,
        state.currentBatchIndex + 1
      );

      if (!isMountedRef.current) return;

      // 3. Mark draw complete - this triggers reveal animation
      console.log('[HandleStop] Draw complete, results:', results.length);
      dispatch({ type: 'DRAW_COMPLETE', winners: results });

      // 4. Wait for reveal animation to complete
      // Animation component will call onRevealComplete when done
      
    } catch (error) {
      console.error('[HandleStop] Error:', error);
      // Reset to idle on error
      if (isMountedRef.current) {
        dispatch({ type: 'REVEAL_COMPLETE' }); // Go to reviewing
        // Or show error state
      }
    }
  }, [state.status, state.currentBatchIndex, currentPrize, eventId]);

  // Called by animation component when reveal animation is done
  const handleRevealComplete = useCallback(() => {
    console.log('[HandleRevealComplete] called, status:', state.status);
    if (state.status !== 'revealing') return;
    dispatch({ type: 'REVEAL_COMPLETE' });
  }, [state.status]);

  // CONFIRM
  const handleConfirm = useCallback(async () => {
    console.log('[HandleConfirm] called, status:', state.status);
    if (state.status !== 'reviewing') return;

    try {
      await drawService.confirmBatch(currentPrize!.id, state.currentBatchIndex + 1);
      
      if (!isMountedRef.current) return;

      // Check if more batches needed
      const totalBatches = getTotalBatches(currentPrize!);
      if (state.currentBatchIndex + 1 >= totalBatches) {
        // Prize complete - check if more prizes
        if (state.currentPrizeIndex + 1 >= prizes!.length) {
          // Event complete
          await eventRepository.update(eventId!, {
            status: 'completed',
            completedAt: new Date().toISOString()
          });
          navigate(`/event/${eventId}/results`);
        } else {
          dispatch({ type: 'NEXT_PRIZE' });
        }
      } else {
        dispatch({ type: 'CONFIRM_WINNERS' });
      }
    } catch (error) {
      console.error('[HandleConfirm] Error:', error);
    }
  }, [state.status, state.currentBatchIndex, state.currentPrizeIndex, currentPrize, prizes, eventId]);

  // Compute derived state
  const isSpinning = state.status === 'spinning';
  const isIdle = state.status === 'idle';
  const showWinners = state.status === 'revealing' || state.status === 'reviewing';

  return (
    <div className="...">
      {/* Sphere */}
      <Sphere3D
        isSpinning={isSpinning}
        isIdle={isIdle}
        coupons={coupons}
        displayMode={displayMode}
      />

      {/* Winner Cards - with reveal animation */}
      {showWinners && (
        <WinnerRevealAnimation
          winners={state.currentBatchWinners}
          isRevealing={state.status === 'revealing'}
          onRevealComplete={handleRevealComplete}  // <-- IMPORTANT
        />
      )}

      {/* Controls */}
      <DrawControls
        status={state.status}
        onStartDraw={handleStartDraw}
        onStop={handleStop}
        onConfirm={handleConfirm}
        onRedrawAll={handleRedrawAll}
      />
    </div>
  );
}
```

### DrawControls Component

```typescript
// src/components/draw/DrawControls.tsx

interface DrawControlsProps {
  status: DrawStatus;
  onStartDraw: () => void;
  onStop: () => void;
  onConfirm: () => void;
  onRedrawAll: () => void;
  hasCancelledWinners?: boolean;
}

export function DrawControls({
  status,
  onStartDraw,
  onStop,
  onConfirm,
  onRedrawAll,
  hasCancelledWinners = false
}: DrawControlsProps) {
  
  // Single source of truth for what to render
  const renderButton = () => {
    switch (status) {
      case 'idle':
        return (
          <button
            onClick={onStartDraw}
            className="px-8 py-3 bg-[#635bff] text-white font-medium rounded-full shadow-lg hover:bg-[#524acc] transition-colors"
          >
            Start Draw
          </button>
        );

      case 'spinning':
        return (
          <button
            onClick={onStop}
            className="px-8 py-3 bg-red-500 text-white font-medium rounded-full shadow-lg hover:bg-red-600 transition-colors"
          >
            Stop
          </button>
        );

      case 'drawing':
        return (
          <button
            disabled
            className="px-8 py-3 bg-gray-400 text-white font-medium rounded-full shadow-lg cursor-not-allowed"
          >
            Drawing...
          </button>
        );

      case 'revealing':
        return (
          <button
            disabled
            className="px-8 py-3 bg-gray-400 text-white font-medium rounded-full shadow-lg cursor-not-allowed"
          >
            Revealing...
          </button>
        );

      case 'reviewing':
        return (
          <div className="flex gap-4">
            {hasCancelledWinners && (
              <button
                onClick={onRedrawAll}
                className="px-6 py-3 bg-amber-500 text-white font-medium rounded-full shadow-lg hover:bg-amber-600 transition-colors"
              >
                Redraw All
              </button>
            )}
            <button
              onClick={onConfirm}
              className="px-8 py-3 bg-[#635bff] text-white font-medium rounded-full shadow-lg hover:bg-[#524acc] transition-colors"
            >
              Confirm
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      {renderButton()}
    </div>
  );
}
```

### WinnerRevealAnimation Component

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

  // Reset state when winners change
  useEffect(() => {
    setRevealedCount(0);
    animationCompleteRef.current = false;
  }, [winners]);

  // Reveal animation - sequential
  useEffect(() => {
    if (!isRevealing || winners.length === 0 || animationCompleteRef.current) return;

    const revealInterval = setInterval(() => {
      setRevealedCount(prev => {
        const next = prev + 1;
        if (next >= winners.length) {
          clearInterval(revealInterval);
          
          // Call onRevealComplete after last card animation
          setTimeout(() => {
            if (!animationCompleteRef.current) {
              animationCompleteRef.current = true;
              onRevealComplete();
            }
          }, 500); // Wait for last card animation
        }
        return next;
      });
    }, 200); // 200ms between each card

    return () => clearInterval(revealInterval);
  }, [isRevealing, winners.length, onRevealComplete]);

  const cardsPerPage = gridX * gridY;
  const visibleWinners = winners.slice(0, revealedCount);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div 
        className="grid gap-4 pointer-events-auto"
        style={{ gridTemplateColumns: `repeat(${gridX}, 1fr)` }}
      >
        {visibleWinners.map((winner, index) => (
          <WinnerCard
            key={winner.id}
            winner={winner}
            index={index}
            isNew={index === revealedCount - 1}
          />
        ))}
      </div>
    </div>
  );
}
```


---

## Summary of Changes

| # | Issue | Solution |
|---|-------|----------|
| 1 | Button stuck/glitch | Simplified state machine, event-based transitions, onRevealComplete callback |
| 2 | Sphere hilang (dev) | ✅ SOLVED - Disable React Strict Mode |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/DrawScreen.tsx` | Simplified reducer, proper async handlers, mounted ref |
| `src/components/draw/DrawControls.tsx` | Clean switch-based rendering |
| `src/components/draw/WinnerRevealAnimation.tsx` | onRevealComplete callback |

---

## Testing Checklist

### Button State Machine:
- [ ] Start Draw → status = spinning, button shows "Stop"
- [ ] Stop → status = drawing → revealing → reviewing
- [ ] Button shows correct label at each state:
  - idle: "Start Draw"
  - spinning: "Stop"
  - drawing: "Drawing..."
  - revealing: "Revealing..."
  - reviewing: "Confirm" (+ "Redraw All" if ada cancelled)
- [ ] Confirm → status = idle (atau next prize)
- [ ] Tidak ada stuck "Processing" state
- [ ] Tidak ada glitch/flicker antar states
- [ ] Confirm hanya perlu 1x klik
- [ ] Sphere berhenti berputar setelah Stop

### Sphere (Already Solved):
- [x] Sphere tidak hilang di dev mode (Strict Mode disabled)
