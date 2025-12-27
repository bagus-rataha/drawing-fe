# Raffle App - DrawScreen Service Contracts

## Overview

Definisi service layer untuk DrawScreen. Semua business logic ada di sini, frontend hanya panggil dan render hasil.

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Type Definitions

### Coupon Status

```typescript
type CouponStatus = 'active' | 'void' | 'cancelled';
```

### Winner

```typescript
interface Winner {
  id: string;
  eventId: string;
  prizeId: string;
  participantId: string;
  participantName?: string;
  couponId: string;
  lineNumber: number;
  status: 'valid' | 'cancelled' | 'skipped';
  cancelReason?: CancelReason;
  drawnAt: Date;
  confirmedAt?: Date;  // null = belum confirm, timestamp = final
}

interface CancelReason {
  type: 'auto' | 'manual';
  ruleType?: 'one-time' | 'limited';
  message: string;
  conflictingLines?: number[];
  totalWins?: number;
  maxAllowed?: number;
}
```

### Draw Result

```typescript
interface DrawResult {
  lineNumber: number;
  participantId: string;
  participantName?: string;
  couponId: string;
  status: 'valid' | 'cancelled';
  cancelReason?: CancelReason;
}
```

### Pre-Check Result

```typescript
interface PreCheckResult {
  canProceed: boolean;
  prizeId: string;
  prizeName: string;
  requiredQuantity: number;
  availablePool: number;
  message?: string;  // jika canProceed = false
}
```

### Draw Progress

```typescript
interface DrawProgress {
  eventId: string;
  currentPrizeIndex: number;
  totalPrizes: number;
  currentPrize: {
    id: string;
    name: string;
    quantity: number;
    drawnCount: number;        // total valid entries
    confirmedCount: number;    // total confirmed entries
  };
  hasUnconfirmedWinners: boolean;
  hasCancelledWinners: boolean;  // perlu redraw
}
```

---

## Draw Flow (Penting!)

```
1. Klik Stop
       ↓
2. Draw winners (weighted random + win rule check)
       ↓
3. Save DB: INSERT winner entries (status: valid/cancelled, confirmedAt: null)
   + UPDATE coupon status → 'cancelled' untuk yang auto-cancel
       ↓
4. Animate slowdown → cards keluar ke gallery
       ↓
5. UI tampilkan cards dengan [Cancel] button (valid) atau ❌ (cancelled)
       ↓
6. User manual cancel → UPDATE winner.status + UPDATE coupon.status
       ↓
7. [Redraw All] → INSERT entries baru (entries lama tetap di DB)
       ↓
8. Repeat 5-7 sampai semua valid (atau skipped karena pool habis)
       ↓
9. [Confirm] → UPDATE confirmedAt = timestamp untuk yang valid
       ↓
10. Lanjut ke batch/prize berikutnya
```

**Key points:**
- Save DB dilakukan SEBELUM animasi
- Cancel = UPDATE entry yang sudah ada
- Redraw = INSERT entries baru (audit trail)
- Entries cancelled tetap di DB untuk audit (tampil di detail event)
- confirmedAt: null = belum final, bisa redraw. timestamp = final.

---

## Draw Service

### Interface

```typescript
interface IDrawService {
  // Pre-check sebelum draw (hanya di awal prize)
  preCheck(prizeId: string): Promise<PreCheckResult>;
  
  // Execute draw
  draw(eventId: string, prizeId: string, quantity: number): Promise<DrawResult[]>;
  
  // Cancel winner (manual)
  cancel(winnerId: string): Promise<void>;
  
  // Redraw semua yang cancelled (current session only)
  redrawAll(prizeId: string): Promise<DrawResult[]>;
  
  // Confirm winners (void coupons sesuai win rule)
  confirm(prizeId: string): Promise<void>;
  
  // Get current progress (untuk resume)
  getProgress(eventId: string): Promise<DrawProgress>;
  
  // Get pool count (untuk UI)
  getEligiblePoolCount(eventId: string): Promise<number>;
}
```

### Method Details

#### preCheck(prizeId)

**Purpose:** Validasi sebelum draw dimulai (hanya di awal prize)

**When to call:** Sekali di awal setiap prize, BUKAN setiap batch

**Logic:**
1. Get prize by id
2. Get event dan win rule
3. Count eligible pool (coupons dengan status `active`)
4. Apply win rule exclusions
5. Compare pool vs quantity

**Returns:**
```typescript
// Success
{
  canProceed: true,
  prizeId: "prize-1",
  prizeName: "Grand Prize",
  requiredQuantity: 10,
  availablePool: 150
}

// Failed - BLOCKING, harus edit prize atau add participants
{
  canProceed: false,
  prizeId: "prize-1",
  prizeName: "Grand Prize",
  requiredQuantity: 10,
  availablePool: 5,
  message: "Pool tidak cukup. Butuh 10, tersedia 5."
}
```

---

#### draw(eventId, prizeId, quantity)

**Purpose:** Execute weighted random draw

**Logic:**
1. Get eligible pool (coupons `active`)
2. Apply win rule exclusions (exclude participants yang sudah menang sesuai rule)
3. Weighted random selection (quantity items)
4. Validate each result terhadap win rules:
   - Check duplicate dalam batch yang sama
   - Check existing wins
5. Mark cancelled jika invalid
6. **INSERT** winner entries ke DB (confirmedAt: null)
7. **UPDATE** coupon status → `cancelled` untuk yang auto-cancel
8. Return results

**Weighted Selection:**
```typescript
// Participant A: 5 coupons → 5 entries di pool
// Participant B: 2 coupons → 2 entries di pool
// Random pick dari pool → lebih banyak coupon = lebih besar chance
```

**Auto-Cancel Logic:**
```typescript
function validateWinner(
  participantId: string,
  eventId: string,
  winRule: WinRule,
  currentBatchWinners: string[]  // participantIds yang sudah menang di batch ini
): { valid: boolean; reason?: CancelReason } {
  
  // Check duplicate dalam batch sama
  if (currentBatchWinners.includes(participantId)) {
    return {
      valid: false,
      reason: {
        type: 'auto',
        ruleType: winRule.type,
        message: `Sudah muncul di line sebelumnya dalam batch ini`,
        conflictingLines: [/* line numbers */]
      }
    };
  }
  
  // Check existing wins (dari prize sebelumnya, yang sudah confirmed)
  const existingWins = await getConfirmedWinCount(eventId, participantId);
  
  if (winRule.type === 'one-time' && existingWins >= 1) {
    return {
      valid: false,
      reason: {
        type: 'auto',
        ruleType: 'one-time',
        message: `Sudah menang ${existingWins}x sebelumnya`,
        totalWins: existingWins,
        maxAllowed: 1
      }
    };
  }
  
  if (winRule.type === 'limited' && existingWins >= winRule.maxWins) {
    return {
      valid: false,
      reason: {
        type: 'auto',
        ruleType: 'limited',
        message: `Sudah menang ${existingWins}/${winRule.maxWins} kali (max tercapai)`,
        totalWins: existingWins,
        maxAllowed: winRule.maxWins
      }
    };
  }
  
  // Unlimited: selalu valid
  return { valid: true };
}
```

---

#### cancel(winnerId)

**Purpose:** Manual cancel oleh admin

**Logic:**
1. Get winner by id
2. **UPDATE** winner.status → `cancelled`
3. **UPDATE** winner.cancelReason → `{ type: 'manual', message: 'Dibatalkan oleh admin' }`
4. **UPDATE** coupon.status → `cancelled`

---

#### redrawAll(prizeId)

**Purpose:** Redraw semua yang cancelled dalam current session

**Scope:** Hanya winners dengan:
- prizeId = current prize
- status = 'cancelled'
- confirmedAt = null (belum confirmed, current session)

**Logic:**
1. Count cancelled winners (current session)
2. Get eligible pool (exclude valid winners di session ini)
3. For each cancelled slot:
   - Weighted random pick
   - Validate terhadap win rules
   - **INSERT** new winner entry ke DB
   - If invalid → status 'cancelled'
   - If pool exhausted → status 'skipped'
4. Return results

**Entries lama TIDAK dihapus** - tetap di DB untuk audit trail.

**Pool Exhausted Handling:**
```typescript
// Jika pool habis saat redraw
{
  lineNumber: 4,
  participantId: '',
  couponId: '',
  status: 'skipped',
  cancelReason: {
    type: 'auto',
    message: 'Pool habis - tidak ada participant eligible tersisa'
  }
}
```

---

#### confirm(prizeId)

**Purpose:** Confirm winners, void coupons sesuai win rule

**Pre-condition:** Tidak boleh ada status `cancelled` dengan confirmedAt = null (harus redraw dulu, kecuali skipped)

**Logic:**
1. Get all winners untuk prize dengan status `valid` dan confirmedAt = null
2. Validate: tidak boleh ada status `cancelled` yang belum di-handle
3. For each valid winner:
   - Apply void logic berdasarkan win rule
4. **UPDATE** winners.confirmedAt = timestamp
5. Transaction: semua atau tidak sama sekali

**Void Logic:**
```typescript
async function voidCouponsForWinner(
  winner: Winner,
  winRule: WinRule
): Promise<void> {
  switch (winRule.type) {
    case 'one-time':
      // Void SEMUA kupon participant
      await couponRepository.voidAllByParticipantId(winner.participantId);
      break;
      
    case 'limited':
      // Void kupon yang menang saja
      await couponRepository.void(winner.couponId);
      // Check apakah sudah max
      const winCount = await getConfirmedWinCount(winner.eventId, winner.participantId);
      if (winCount >= winRule.maxWins) {
        // Void semua kupon tersisa
        await couponRepository.voidAllByParticipantId(winner.participantId);
      }
      break;
      
    case 'unlimited':
      // Void HANYA kupon yang menang
      await couponRepository.void(winner.couponId);
      break;
  }
}
```

---

#### getProgress(eventId)

**Purpose:** Get current draw progress (untuk resume setelah crash)

**Logic:**
1. Get all prizes untuk event (ordered)
2. Get all winners untuk event
3. Calculate current state:
   - Prize mana yang sedang in progress
   - Berapa yang valid vs confirmed
   - Ada cancelled yang perlu di-redraw?

---

#### getEligiblePoolCount(eventId)

**Purpose:** Get jumlah coupon eligible untuk display di UI

**Logic:**
1. Count coupons dengan status `active`
2. Apply win rule exclusions (exclude participants yang sudah menang sesuai rule)

---

## Winner Service

### Interface

```typescript
interface IWinnerService {
  // Get winners by event (all, untuk audit)
  getByEventId(eventId: string): Promise<Winner[]>;
  
  // Get winners by prize (untuk modal - hanya valid + confirmed)
  getConfirmedByPrizeId(prizeId: string): Promise<Winner[]>;
  
  // Get winners by prize with status filter
  getByPrizeIdAndStatus(prizeId: string, status: Winner['status'], confirmedAt?: 'null' | 'not-null'): Promise<Winner[]>;
  
  // Get confirmed win count per participant (untuk win rule check)
  getConfirmedWinCount(eventId: string, participantId: string): Promise<number>;
}
```

---

## Coupon Service (Update)

### Additional Methods

```typescript
interface ICouponService {
  // ... existing methods
  
  // Void single coupon (saat confirm)
  void(couponId: string): Promise<void>;
  
  // Void all coupons for participant (saat confirm, one-time/limited max)
  voidAllByParticipantId(participantId: string): Promise<void>;
  
  // Cancel single coupon (saat draw cancel)
  cancel(couponId: string): Promise<void>;
  
  // Get active coupons for event (pool)
  getActiveByEventId(eventId: string): Promise<Coupon[]>;
  
  // Count active coupons
  countActiveByEventId(eventId: string): Promise<number>;
}
```

---

## Winner Count Logic

**Untuk menampilkan di modal (prize panel):**
```typescript
// Query: status = 'valid' AND confirmedAt IS NOT NULL
const confirmedWinners = await winnerService.getConfirmedByPrizeId(prizeId);
```

**Untuk detail event (audit trail):**
```typescript
// Query: semua entries termasuk cancelled
const allWinners = await winnerService.getByEventId(eventId);
```

---

## Files to Create

| File | Description |
|------|-------------|
| `src/types/draw.ts` | Type definitions (DrawResult, PreCheckResult, etc) |
| `src/services/drawService.ts` | Draw business logic |
| `src/services/winnerService.ts` | Winner queries |
| `src/repositories/interfaces/winnerRepository.ts` | Winner repository interface |
| `src/repositories/dexie/winnerRepository.ts` | Winner repository implementation |
| `src/repositories/interfaces/couponRepository.ts` | Update dengan void/cancel methods |
| `src/repositories/dexie/couponRepository.ts` | Update implementation |

---

## Execution Order

```
1. Create type definitions (src/types/draw.ts)
       ↓
2. Update coupon repository (add void, cancel methods)
       ↓
3. Create winner repository
       ↓
4. Create winnerService
       ↓
5. Create drawService
       ↓
6. Unit tests untuk services
```

---

## Testing Checklist

**drawService.preCheck:**
- [ ] Return canProceed=true jika pool cukup
- [ ] Return canProceed=false jika pool < quantity (blocking)
- [ ] Apply win rule exclusions dengan benar
- [ ] Hanya dipanggil di awal prize, bukan setiap batch

**drawService.draw:**
- [ ] Weighted random selection works
- [ ] Auto-cancel duplicate dalam batch
- [ ] Auto-cancel sesuai win rule (one-time, limited)
- [ ] Unlimited tidak pernah auto-cancel
- [ ] INSERT winner entries ke DB (confirmedAt: null)
- [ ] UPDATE coupon status → cancelled untuk auto-cancel

**drawService.cancel:**
- [ ] UPDATE winner status → cancelled
- [ ] UPDATE coupon status → cancelled
- [ ] Set cancelReason type: manual

**drawService.redrawAll:**
- [ ] Scope: hanya cancelled dengan confirmedAt = null
- [ ] INSERT entries baru (tidak delete/update lama)
- [ ] Handle pool exhausted (skipped)
- [ ] Validate new winners terhadap win rules

**drawService.confirm:**
- [ ] Block jika masih ada cancelled (confirmedAt = null)
- [ ] Allow jika ada skipped (pool habis)
- [ ] Void coupons sesuai win rule
- [ ] UPDATE confirmedAt = timestamp
- [ ] Atomic transaction

**drawService.getProgress:**
- [ ] Return correct current prize
- [ ] Return correct valid/confirmed counts
- [ ] Detect cancelled yang perlu redraw
