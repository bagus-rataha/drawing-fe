# Raffle App - DrawScreen Animation Revision 10

## Overview

Revisi lanjutan - Issue 1 sudah fixed, fokus pada 3 issues yang tersisa:
1. ~~Animasi hanya row 1~~ ✅ FIXED
2. Batch reset + total berubah saat resume (3/100 → 1/97)
3. **CRITICAL:** Draw tidak bertambah setelah redraw
4. Confirm button butuh 2x klik

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Issue 2: Batch Reset + Total Berubah (3/100 → 1/97)

### Problem
- Sebelum keluar: batch **3/100**
- Setelah masuk lagi: batch **1/97**

Ada 2 masalah:
1. **Batch reset ke 1** - Progress tidak ter-load dari DB
2. **Total berubah dari 100 ke 97** - Calculation error

### Root Cause Analysis

**Masalah 1: Batch reset**
- DrawProgress mungkin tidak tersimpan
- Atau tidak ter-load dengan benar saat resume

**Masalah 2: Total 100 → 97**
- Kemungkinan `totalBatches` dihitung ulang dari **remaining quantity** bukan **total quantity**
- Jika sudah ada 3 winner (dari batch 1-3), remaining = 97
- Bug: `totalBatches = Math.ceil(remainingQty / batchSize)` ❌
- Correct: `totalBatches = Math.ceil(prize.quantity / batchSize)` ✅

### Debug Step 1: Check Calculation

```typescript
// FIND THIS CODE AND CHECK:
const getTotalBatches = (prize: Prize): number => {
  const batchSize = prize.batchSize || 10;
  
  // BUG: Mungkin menggunakan remaining quantity
  // const remaining = prize.quantity - alreadyDrawnCount; // ❌ WRONG
  // return Math.ceil(remaining / batchSize);
  
  // CORRECT: Selalu gunakan total quantity
  return Math.ceil(prize.quantity / batchSize); // ✅ CORRECT
};
```

### Debug Step 2: Check DrawProgress Loading

```typescript
// src/pages/DrawScreen.tsx

useEffect(() => {
  async function loadProgress() {
    console.log('=== LOADING PROGRESS ===');
    
    const progress = await drawProgressRepository.getCurrentProgress(eventId!);
    console.log('[LoadProgress] From DB:', progress);
    
    if (progress) {
      console.log('[LoadProgress] Resuming from:', {
        prizeIndex: progress.prizeIndex,
        batchIndex: progress.batchIndex,
        totalBatches: progress.totalBatches
      });
      
      // IMPORTANT: Use saved totalBatches, NOT recalculate
      dispatch({
        type: 'INIT_FROM_PROGRESS',
        prizeIndex: progress.prizeIndex,
        batchIndex: progress.batchIndex,
        totalBatches: progress.totalBatches, // ← Use saved value!
        progressId: progress.id
      });
    } else {
      console.log('[LoadProgress] No existing progress, starting fresh');
      // ... create new
    }
  }
  
  loadProgress();
}, [eventId, prizes]);
```

### Fix: Store Total in Progress, Don't Recalculate

```typescript
// src/repositories/drawProgressRepository.ts

interface DrawProgress {
  id: string;
  eventId: string;
  prizeId: string;
  prizeIndex: number;
  batchIndex: number;
  totalBatches: number;      // STORED, not calculated on load
  prizeQuantity: number;     // ADD THIS: Original prize quantity
  batchSize: number;         // ADD THIS: Batch size used
  status: 'in-progress' | 'completed';
  startedAt: string;
  updatedAt: string;
}

// When creating progress
async create(eventId: string, prize: Prize): Promise<DrawProgress> {
  const batchSize = prize.batchSize || 10;
  const totalBatches = Math.ceil(prize.quantity / batchSize);
  
  console.log('[Progress] Creating:', {
    prizeQuantity: prize.quantity,
    batchSize,
    totalBatches
  });
  
  const progress: DrawProgress = {
    id: generateId('progress'),
    eventId,
    prizeId: prize.id,
    prizeIndex: 0,
    batchIndex: 0,
    totalBatches,           // Store calculated value
    prizeQuantity: prize.quantity,  // Store original
    batchSize,              // Store batch size
    status: 'in-progress',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await db.drawProgress.add(progress);
  return progress;
}
```

### Fix: Load Progress Correctly

```typescript
// src/pages/DrawScreen.tsx

useEffect(() => {
  async function initializeDrawScreen() {
    if (!eventId || !prizes || prizes.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Try to load existing progress
      const existingProgress = await drawProgressRepository.getCurrentProgress(eventId);
      
      if (existingProgress) {
        // RESUME: Use ALL values from saved progress
        console.log('[Init] Resuming from saved progress:', existingProgress);
        
        dispatch({
          type: 'INIT_FROM_PROGRESS',
          prizeIndex: existingProgress.prizeIndex,
          batchIndex: existingProgress.batchIndex,
          totalBatches: existingProgress.totalBatches, // Use saved!
          progressId: existingProgress.id
        });
      } else {
        // NEW: Create fresh progress for first prize
        const firstPrize = prizes[0];
        const batchSize = firstPrize.batchSize || 10;
        const totalBatches = Math.ceil(firstPrize.quantity / batchSize);
        
        console.log('[Init] Creating new progress:', {
          prize: firstPrize.name,
          quantity: firstPrize.quantity,
          batchSize,
          totalBatches
        });
        
        const newProgress = await drawProgressRepository.create(eventId, firstPrize);
        
        dispatch({
          type: 'INIT_FROM_PROGRESS',
          prizeIndex: 0,
          batchIndex: 0,
          totalBatches: newProgress.totalBatches,
          progressId: newProgress.id
        });
      }
    } catch (error) {
      console.error('[Init] Error:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  initializeDrawScreen();
}, [eventId, prizes]);
```

---

## Issue 3: Draw Tidak Bertambah Setelah Redraw (CRITICAL)

### Problem Recap
- Draw 1 → Start → Ada auto Cancel → Redraw → Confirm (Tidak bertambah)
- Draw 2 → Start → Confirm (Tidak bertambah)
- Draw 3 → Start → Confirm (Tidak bertambah)

Pool ada 148K kupon, bukan masalah pool habis.

### HARUS DEBUG DULU

Claude CLI harus menambahkan console.log dan check IndexedDB:

```typescript
// 1. Di drawService.draw() - TAMBAHKAN:
console.log('=== DRAW START ===');
const availablePool = await couponRepository.getAvailableForDraw(eventId);
console.log('[Draw] Available pool:', availablePool.length);

// 2. Di couponRepository.getAvailableForDraw() - TAMBAHKAN:
console.log('[CouponRepo] Query filter:', { eventId, status: 'active' });
const result = await db.coupons.where(...).toArray();
console.log('[CouponRepo] Result count:', result.length);

// 3. Di winnerRepository.create() - TAMBAHKAN:
console.log('[WinnerRepo] Creating:', winner);
await db.winners.add(winner);
const verify = await db.winners.get(winner.id);
console.log('[WinnerRepo] Verified:', verify ? 'OK' : 'FAILED');
```

### Check IndexedDB Manually

1. Buka DevTools → Application → IndexedDB → RaffleAppDB
2. Check `coupons` table:
   - Filter by eventId
   - Berapa yang status = 'active'?
   - Berapa yang status lain?
3. Check `winners` table:
   - Apakah ada entries?
   - Status apa saja?

### Kemungkinan Bug Locations

```typescript
// CARI KODE SEPERTI INI (kemungkinan bug):

// Bug 1: Update semua coupons
await db.coupons.where('eventId').equals(eventId).modify({ status: 'used' }); // ❌

// Bug 2: Query terlalu ketat
const available = await db.coupons
  .where('eventId').equals(eventId)
  .filter(c => c.status === 'active' && !c.isUsed && !c.isWinner); // Terlalu banyak filter?

// Bug 3: Tidak ada return dari draw
async draw(): Promise<DrawResult[]> {
  // ... logic
  // return []; // Lupa return results?
}
```

---

## Issue 4: Confirm Button Butuh 2x Klik

### Problem
Confirm harus diklik 2 kali sebelum lanjut ke Start Draw berikutnya.

### Most Likely Cause
Status masih `'revealing'` saat user klik Confirm pertama kali. `REVEAL_COMPLETE` belum dispatch.

### Debug: Check State When Clicked

```typescript
// src/pages/DrawScreen.tsx

const handleConfirm = useCallback(async () => {
  console.log('=== CONFIRM CLICKED ===');
  console.log('[Confirm] state.status:', state.status);
  console.log('[Confirm] Expected: reviewing');
  
  if (state.status !== 'reviewing') {
    console.warn('[Confirm] BLOCKED! Status is:', state.status);
    return;
  }
  
  console.log('[Confirm] Proceeding...');
  // ... rest
}, [state.status]);
```

### Debug: Check Reveal Complete

```typescript
// src/components/draw/WinnerRevealAnimation.tsx

// Di akhir animation
console.log('[Animation] Calling onRevealComplete, time:', Date.now());
onRevealComplete();

// src/pages/DrawScreen.tsx
const handleRevealComplete = useCallback(() => {
  console.log('[RevealComplete] Called, time:', Date.now());
  console.log('[RevealComplete] Current status:', state.status);
  dispatch({ type: 'REVEAL_COMPLETE' });
  console.log('[RevealComplete] Dispatched');
}, [state.status]);
```

### Fix: Ensure Reveal Complete is Called

```typescript
// src/components/draw/WinnerRevealAnimation.tsx

useEffect(() => {
  if (!isRevealing || winners.length === 0) return;
  
  let currentIndex = 0;
  const totalToReveal = Math.min(winners.length, gridX * gridY);
  
  const interval = setInterval(() => {
    currentIndex++;
    setRevealedCount(currentIndex);
    
    if (currentIndex >= totalToReveal) {
      clearInterval(interval);
      
      // IMPORTANT: Call after small delay for animation to settle
      setTimeout(() => {
        console.log('[Animation] All revealed, calling onRevealComplete');
        onRevealComplete();
      }, 500);
    }
  }, 200);
  
  return () => clearInterval(interval);
}, [isRevealing, winners.length, gridX, gridY, onRevealComplete]);
```

### Alternative Fix: Auto-transition After Animation

Jika callback approach tidak reliable, gunakan timeout di parent:

```typescript
// src/pages/DrawScreen.tsx

// After dispatch DRAW_COMPLETE
dispatch({ type: 'DRAW_COMPLETE', winners: results });

// Auto transition to reviewing after animation duration
const animationDuration = results.length * 200 + 1000; // 200ms per card + buffer
setTimeout(() => {
  if (state.status === 'revealing') {
    console.log('[Auto] Transitioning to reviewing');
    dispatch({ type: 'REVEAL_COMPLETE' });
  }
}, animationDuration);
```

---

## Summary

| # | Issue | Status | Action |
|---|-------|--------|--------|
| 1 | Animasi hanya row 1 | ✅ FIXED | - |
| 2 | Batch reset 3/100 → 1/97 | 🔴 Bug | Fix totalBatches calculation, load from DB |
| 3 | Draw tidak bertambah | 🔴 Critical | Add debug logs, check IndexedDB, find bug |
| 4 | Confirm 2x klik | 🔴 Bug | Fix REVEAL_COMPLETE timing |

---

## Priority Order

1. **Issue 3 (CRITICAL)** - Debug dulu, cari root cause
2. **Issue 2** - Fix calculation dan loading
3. **Issue 4** - Fix timing

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/DrawScreen.tsx` | Fix init logic, add debug logs, fix timing |
| `src/repositories/drawProgressRepository.ts` | Store prizeQuantity & batchSize |
| `src/services/drawService.ts` | ADD DEBUG LOGS |
| `src/repositories/couponRepository.ts` | ADD DEBUG LOGS |
| `src/repositories/winnerRepository.ts` | ADD DEBUG LOGS |
| `src/components/draw/WinnerRevealAnimation.tsx` | Fix onRevealComplete call |

---

## Testing Checklist

### Issue 2:
- [ ] Check: totalBatches calculation uses prize.quantity (not remaining)
- [ ] Batch 3/100 → keluar → masuk → masih 3/100
- [ ] Total tidak berubah saat resume

### Issue 3 (DEBUG FIRST):
- [ ] Console shows available pool count
- [ ] Console shows winner creation
- [ ] IndexedDB shows correct coupon statuses
- [ ] IndexedDB shows winner entries
- [ ] After fix: Draw 2, 3 menambah winner

### Issue 4:
- [ ] Console shows status when Confirm clicked
- [ ] REVEAL_COMPLETE dispatched before Confirm available
- [ ] Confirm hanya butuh 1x klik
