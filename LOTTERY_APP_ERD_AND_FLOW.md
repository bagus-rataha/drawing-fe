# Lottery App - ERD & Application Flow Documentation

## Table of Contents
1. [Entity Relationship Diagram (ERD)](#entity-relationship-diagram-erd)
2. [Enum & Type Values](#enum--type-values)
3. [Relationship Summary](#relationship-summary)
4. [Application Flows](#application-flows)
   - [Event Lifecycle](#1-event-lifecycle-flow)
   - [Wizard Flow](#2-wizard-flow)
   - [Draw Screen State Machine](#3-draw-screen-state-machine)
   - [Draw Service Flow](#4-draw-service-flow)
   - [Cancel Flow](#5-cancel-flow)
   - [Redraw Flow](#6-redraw-flow)
   - [Confirm Flow](#7-confirm-flow)
5. [Status Transition Diagrams](#status-transition-diagrams)
6. [Known Issues & Bugs](#known-issues--bugs)

---

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         LOTTERY APP ERD                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│              EVENT                   │
├─────────────────────────────────────┤
│ PK  id: string                      │
│     name: string                    │
│     description?: string            │
│     startDate?: Date                │
│     endDate?: Date                  │
│     status: EventStatus             │◄──────────────────────────────────┐
│     ─── Embedded Objects ───        │                                   │
│     winRule: WinRule {              │                                   │
│       type: WinRuleType             │                                   │
│       maxWins?: number              │                                   │
│     }                               │                                   │
│     displaySettings: DisplaySettings│                                   │
│     ─── Computed Fields ───         │                                   │
│     totalParticipants: number       │                                   │
│     totalCoupons: number            │                                   │
│     totalPrizes: number             │                                   │
│     createdAt: Date                 │                                   │
│     updatedAt: Date                 │                                   │
└────────────────┬────────────────────┘                                   │
                 │                                                         │
                 │ 1:N                                                     │
                 ▼                                                         │
┌─────────────────────────────────────┐                                   │
│              PRIZE                   │                                   │
├─────────────────────────────────────┤                                   │
│ PK  id: string                      │                                   │
│ FK  eventId: string ────────────────┼───────────────────────────────────┘
│     name: string                    │◄──────────────────────────────────┐
│     image?: string                  │                                   │
│     quantity: number                │                                   │
│     sequence: number                │                                   │
│     drawnCount: number              │                                   │
│     ─── Embedded Object ───         │                                   │
│     drawConfig: DrawConfig {        │                                   │
│       mode: DrawMode                │                                   │
│       batches?: number[]            │                                   │
│     }                               │                                   │
└─────────────────────────────────────┘                                   │
                                                                          │
┌─────────────────────────────────────┐                                   │
│           PARTICIPANT                │                                   │
├─────────────────────────────────────┤                                   │
│ PK  [eventId + id] (compound)       │                                   │
│     id: string                      │◄──────────────────────────────────┤
│ FK  eventId: string                 │                                   │
│     name?: string                   │                                   │
│     email?: string                  │                                   │
│     phone?: string                  │                                   │
│     customFields: Record<string,    │                                   │
│                   string>           │                                   │
│     couponCount: number             │                                   │
│     winCount: number                │                                   │
│     status: ParticipantStatus       │                                   │
└────────────────┬────────────────────┘                                   │
                 │                                                         │
                 │ 1:N                                                     │
                 ▼                                                         │
┌─────────────────────────────────────┐                                   │
│              COUPON                  │                                   │
├─────────────────────────────────────┤                                   │
│ PK  [eventId + id] (compound)       │                                   │
│     id: string                      │◄──────────────────────────────────┤
│ FK  eventId: string                 │                                   │
│ FK  participantId: string           │                                   │
│     weight: number (default: 1)     │                                   │
│     status: CouponStatus            │                                   │
│       • 'active'                    │                                   │
│       • 'cancelled'                 │                                   │
│       • 'void'                      │                                   │
└─────────────────────────────────────┘                                   │
                                                                          │
┌─────────────────────────────────────┐                                   │
│              WINNER                  │                                   │
├─────────────────────────────────────┤                                   │
│ PK  id: string (auto-generated)     │                                   │
│ FK  eventId: string ────────────────┼───────────────────────────────────┘
│ FK  prizeId: string ────────────────┼───────────────────────────────────┘
│ FK  participantId: string ──────────┼───────────────────────────────────┘
│ FK  couponId: string ───────────────┼───────────────────────────────────┘
│     ─── Snapshot Fields ───         │
│     participantName?: string        │
│     customFieldsSnapshot: Record    │
│     ─── Draw Info ───               │
│     lineNumber: number              │
│     batchNumber: number             │
│     ─── Status ───                  │
│     status: WinnerStatus            │
│       • 'valid'                     │
│       • 'cancelled'                 │
│       • 'skipped'                   │
│     cancelReason?: CancelReason     │
│     ─── Timestamps ───              │
│     drawnAt: Date                   │
│     confirmedAt?: Date              │  ← undefined = pending
└─────────────────────────────────────┘
```

---

## Enum & Type Values

| Type | Values | Description |
|------|--------|-------------|
| **EventStatus** | `'draft'` → `'ready'` → `'in_progress'` → `'completed'` | Event lifecycle states |
| **CouponStatus** | `'active'` \| `'cancelled'` \| `'void'` | Coupon availability in draw pool |
| **WinnerStatus** | `'valid'` \| `'cancelled'` \| `'skipped'` | Winner draw result status |
| **ParticipantStatus** | `'active'` \| `'exhausted'` | Participant eligibility status |
| **WinRuleType** | `'one-time'` \| `'limited'` \| `'unlimited'` | How many times participant can win |
| **DrawMode** | `'all-at-once'` \| `'batch'` \| `'one-by-one'` | How winners are selected per prize |
| **CancelReason.type** | `'auto'` \| `'manual'` | Whether cancel was automatic or manual |

### CouponStatus Explanation

| Status | Description | In Pool? |
|--------|-------------|----------|
| `active` | Available for drawing | ✅ Yes |
| `cancelled` | Temporarily removed (can be restored) | ❌ No |
| `void` | Permanently removed (already won) | ❌ No |

### WinnerStatus Explanation

| Status | Description | Can Redraw? |
|--------|-------------|-------------|
| `valid` | Winner is valid, awaiting confirmation | N/A |
| `cancelled` | Winner was cancelled (auto or manual) | ✅ Yes |
| `skipped` | Pool exhausted, cannot fill slot | ❌ No |

---

## Relationship Summary

| From | To | Cardinality | FK Field | Description |
|------|-----|-------------|----------|-------------|
| Event | Prize | 1:N | `prize.eventId` | One event has many prizes |
| Event | Participant | 1:N | `participant.eventId` | One event has many participants |
| Event | Coupon | 1:N | `coupon.eventId` | One event has many coupons |
| Event | Winner | 1:N | `winner.eventId` | One event has many winners |
| Participant | Coupon | 1:N | `coupon.participantId` | One participant can have many coupons |
| Prize | Winner | 1:N | `winner.prizeId` | One prize can have many winners |
| Participant | Winner | 1:N | `winner.participantId` | One participant can win multiple times |
| Coupon | Winner | 1:1 | `winner.couponId` | One coupon can only win once |

---

## Application Flows

### 1. Event Lifecycle Flow

```
    ┌──────────┐      Create       ┌──────────┐      Import        ┌──────────┐
    │  START   │ ─────────────────►│  DRAFT   │ ─────Excel─────────►│  READY   │
    └──────────┘                   └──────────┘                     └────┬─────┘
                                        │                                │
                                        │ Edit                           │ Start Draw
                                        ▼                                ▼
                                   ┌──────────┐                    ┌─────────────┐
                                   │  DRAFT   │◄───── Back ────────│ IN_PROGRESS │
                                   └──────────┘                    └──────┬──────┘
                                                                         │
                                                                         │ All Prizes Done
                                                                         ▼
                                                                   ┌───────────┐
                                                                   │ COMPLETED │
                                                                   └───────────┘
```

---

### 2. Wizard Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   STEP 1    │───►│   STEP 2    │───►│   STEP 3    │───►│   STEP 4    │───►│   STEP 5    │
│ Event Info  │    │   Prizes    │    │ Excel Import│    │  Display    │    │   Review    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                  │                  │                  │                  │
      ▼                  ▼                  ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ • Name      │    │ • Add Prize │    │ • Upload    │    │ • Background│    │ • Summary   │
│ • Desc      │    │ • Quantity  │    │ • Map Cols  │    │ • Animation │    │ • Confirm   │
│ • Win Rule  │    │ • Draw Mode │    │ • Validate  │    │ • Grid Size │    │ • Save      │
│ • Dates     │    │ • Batches   │    │ • Preview   │    │ • Fields    │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                            │
                                            ▼
                                   ┌─────────────────┐
                                   │ Creates:        │
                                   │ • Participants  │
                                   │ • Coupons       │
                                   └─────────────────┘
```

---

### 3. Draw Screen State Machine

```
                                    ┌────────────┐
                                    │    IDLE    │◄─────────────────────────────────┐
                                    │            │                                   │
                                    │ [Start     │                                   │
                                    │  Draw]     │                                   │
                                    └─────┬──────┘                                   │
                                          │                                          │
                                          │ START_SPIN                               │
                                          ▼                                          │
                                    ┌────────────┐                                   │
                                    │  SPINNING  │                                   │
                                    │            │                                   │
                                    │ 🎱 3D Anim │                                   │
                                    │ [Stop]     │                                   │
                                    └─────┬──────┘                                   │
                                          │                                          │
                                          │ STOP_SPIN                                │
                                          ▼                                          │
                                    ┌────────────┐                                   │
                                    │  DRAWING   │                                   │
                                    │            │                                   │
                                    │ Calling    │                                   │
                                    │ drawService│                                   │
                                    └─────┬──────┘                                   │
                                          │                                          │
                                          │ DRAW_COMPLETE                            │
                                          ▼                                          │
                                    ┌────────────┐                                   │
                                    │ REVEALING  │                                   │
                                    │            │                                   │
                                    │ 🎴 Cards   │                                   │
                                    │ Animation  │                                   │
                                    └─────┬──────┘                                   │
                                          │                                          │
                                          │ REVEAL_COMPLETE                          │
                                          ▼                                          │
                                    ┌────────────┐                                   │
                                    │ REVIEWING  │                                   │
                                    │            │──── [Cancel] ──► cancel()         │
                                    │ User can:  │                                   │
                                    │ • Cancel   │──── [Redraw] ──► redrawAll()      │
                                    │ • Redraw   │                                   │
                                    │ • Confirm  │                                   │
                                    └─────┬──────┘                                   │
                                          │                                          │
                                          │ [Confirm] → confirm()                    │
                                          │                                          │
                                          ├── hasMoreBatches? ──► NEXT_BATCH ────────┤
                                          │                                          │
                                          ├── hasMorePrizes? ───► NEXT_PRIZE ────────┤
                                          │                                          │
                                          └── allComplete? ─────► Navigate to History
```

---

### 4. Draw Service Flow

```
                              ┌─────────────────────────────┐
                              │         draw()              │
                              │  drawService.draw(eventId,  │
                              │    prizeId, qty, batchNum)  │
                              └──────────────┬──────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │ 1. Get Active Coupons       │
                              │    couponRepository         │
                              │    .getActive(eventId)      │
                              │    WHERE status = 'active'  │
                              └──────────────┬──────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │ 2. Weighted Random Select   │
                              │    weightedRandomSelect()   │
                              │    - Calculate total weight │
                              │    - Random selection       │
                              └──────────────┬──────────────┘
                                             │
                                             ▼
                         ┌───────────────────┴───────────────────┐
                         │       FOR EACH selected coupon        │
                         └───────────────────┬───────────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │ 3. validateWinner()         │
                              │ Check:                      │
                              │ • Duplicate in batch?       │
                              │ • Win rule compliance?      │
                              │   - one-time: wins >= 1?    │
                              │   - limited: wins >= max?   │
                              │   - unlimited: always ok    │
                              └──────────────┬──────────────┘
                                             │
                              ┌──────────────┴──────────────┐
                              │                             │
                              ▼                             ▼
                   ┌─────────────────┐           ┌─────────────────┐
                   │     VALID       │           │    INVALID      │
                   ├─────────────────┤           ├─────────────────┤
                   │ winner.status   │           │ winner.status   │
                   │   = 'valid'     │           │   = 'cancelled' │
                   │                 │           │                 │
                   │ coupon.status   │           │ coupon.status   │
                   │   = 'active' ⚠️ │           │   = 'cancelled' │
                   │ (UNCHANGED!)    │           │                 │
                   └─────────────────┘           └─────────────────┘
                              │                             │
                              └──────────────┬──────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │ 4. Create Winner Entry      │
                              │    winnerRepository.create  │
                              │    confirmedAt = undefined  │
                              └─────────────────────────────┘
```

#### Draw Result Summary

| Validation Result | winner.status | coupon.status | Notes |
|-------------------|---------------|---------------|-------|
| VALID | `'valid'` | **`'active'`** (unchanged!) | ⚠️ Potential issue |
| INVALID | `'cancelled'` | `'cancelled'` | Removed from pool |

---

### 5. Cancel Flow

```
                    ┌────────────────────────────────────────────┐
                    │      User clicks [Cancel] on winner        │
                    └─────────────────────┬──────────────────────┘
                                          │
                                          ▼
                    ┌────────────────────────────────────────────┐
                    │         drawService.cancel(winnerId)       │
                    └─────────────────────┬──────────────────────┘
                                          │
                                          ▼
                    ┌────────────────────────────────────────────┐
                    │  Check: winner.confirmedAt !== undefined?  │
                    │         (Cannot cancel confirmed winner)   │
                    └─────────────────────┬──────────────────────┘
                                          │
                                          ▼
                    ┌────────────────────────────────────────────┐
                    │  1. winner.status = 'cancelled'            │
                    │     winner.cancelReason = {                │
                    │       type: 'manual',                      │
                    │       message: 'Dibatalkan oleh admin'     │
                    │     }                                      │
                    └─────────────────────┬──────────────────────┘
                                          │
                                          ▼
                    ┌────────────────────────────────────────────┐
                    │  2. coupon.status = 'cancelled'            │
                    │     couponRepository.cancel()              │
                    └────────────────────────────────────────────┘
```

#### Cancel Result Summary

| Entity | Before | After |
|--------|--------|-------|
| winner.status | `'valid'` | `'cancelled'` |
| winner.confirmedAt | `undefined` | `undefined` (no change) |
| coupon.status | `'active'` | `'cancelled'` |

---

### 6. Redraw Flow

```
                    ┌────────────────────────────────────────────┐
                    │     User clicks [Redraw All] button        │
                    └─────────────────────┬──────────────────────┘
                                          │
                                          ▼
                    ┌────────────────────────────────────────────┐
                    │    drawService.redrawAll(prizeId, batch)   │
                    └─────────────────────┬──────────────────────┘
                                          │
                                          ▼
                    ┌────────────────────────────────────────────┐
                    │  1. Get cancelled winners (unconfirmed)    │
                    │     winnerRepository.getByPrizeIdAndStatus │
                    │       (prizeId, 'cancelled', 'null')       │
                    └─────────────────────┬──────────────────────┘
                                          │
                                          ▼
                    ┌────────────────────────────────────────────┐
                    │  2. 🔴 RESTORE cancelled coupons to pool   │
                    │     FOR EACH cancelledWinner:              │
                    │       couponRepository.restore()           │
                    │       coupon.status = 'active'             │
                    └─────────────────────┬──────────────────────┘
                                          │
                                          ▼
                    ┌────────────────────────────────────────────┐
                    │  3. Get active coupons (includes restored) │
                    │     Filter out coupons from valid winners  │
                    └─────────────────────┬──────────────────────┘
                                          │
                                          ▼
                    ┌────────────────────────────────────────────┐
                    │  4. FOR EACH cancelled winner slot:        │
                    │     • weightedRandomSelect(1) from pool    │
                    │     • validateWinner()                     │
                    │     • Create NEW winner entry              │
                    │     • DELETE old cancelled entry           │
                    │     • if invalid: coupon = 'cancelled'     │
                    │     • if valid: coupon stays 'active' ⚠️   │
                    └────────────────────────────────────────────┘
```

#### Redraw Result Summary

| Step | Entity | Before | After |
|------|--------|--------|-------|
| 1 | Old cancelled winner | `cancelled` | **DELETED** |
| 2 | Old winner's coupon | `cancelled` | **`'active'`** 🔴 |
| 3 | New selected coupon (valid) | `active` | `active` (unchanged) ⚠️ |
| 3 | New selected coupon (invalid) | `active` | `cancelled` |
| 4 | New winner entry | - | created |

---

### 7. Confirm Flow

```
                    ┌────────────────────────────────────────────┐
                    │      User clicks [Confirm] button          │
                    └─────────────────────┬──────────────────────┘
                                          │
                                          ▼
                    ┌────────────────────────────────────────────┐
                    │       drawService.confirm(prizeId)         │
                    └─────────────────────┬──────────────────────┘
                                          │
                                          ▼
                    ┌────────────────────────────────────────────┐
                    │  1. Check: any cancelled winners exist?    │
                    │     → throw Error if yes (must redraw)     │
                    └─────────────────────┬──────────────────────┘
                                          │
                                          ▼
                    ┌────────────────────────────────────────────┐
                    │  2. Get valid unconfirmed winners          │
                    │     status='valid', confirmedAt=undefined  │
                    └─────────────────────┬──────────────────────┘
                                          │
                                          ▼
                    ┌────────────────────────────────────────────┐
                    │  3. Set confirmedAt = now                  │
                    │     winnerRepository.confirmByPrizeId()    │
                    └─────────────────────┬──────────────────────┘
                                          │
                                          ▼
                    ┌────────────────────────────────────────────┐
                    │  4. Void coupons based on Win Rule         │
                    │     voidCouponsForWinner()                 │
                    └─────────────────────┬──────────────────────┘
                                          │
                                          ▼
                    ┌────────────────────────────────────────────┐
                    │  5. Update prize.drawnCount                │
                    └────────────────────────────────────────────┘
```

#### Win Rule Void Logic

| Win Rule | Action on Confirm |
|----------|-------------------|
| `one-time` | Void **ALL** coupons of the participant |
| `limited` | Void winning coupon. If `winCount >= maxWins`, void all remaining |
| `unlimited` | Void **ONLY** the winning coupon |

---

## Status Transition Diagrams

### Coupon Status Transitions

```
                                   ┌──────────┐
                                   │  ACTIVE  │◄─────────────────────────┐
                                   └────┬─────┘                          │
                                        │                                │
              ┌─────────────────────────┼─────────────────────────┐      │
              │                         │                         │      │
              ▼                         ▼                         │      │
    ┌────────────────┐        ┌────────────────┐                  │      │
    │ Draw (invalid) │        │ Manual Cancel  │                  │      │
    │ Redraw (inv)   │        │                │                  │      │
    └───────┬────────┘        └───────┬────────┘                  │      │
            │                         │                           │      │
            └─────────────────────────┼───────────────────────────┘      │
                                      │                                  │
                                      ▼                                  │
                               ┌───────────┐                             │
                               │ CANCELLED │─── Redraw Restore ──────────┘
                               └─────┬─────┘
                                     │
                                     │ ❌ No direct path to VOID
                                     ▼
                               ┌───────────┐
            ┌─────────────────►│   VOID    │
            │                  └───────────┘
            │                       ▲
            │                       │
   ┌────────┴────────┐              │
   │    Confirm      │──────────────┘
   │ (valid winner)  │
   └─────────────────┘
```

### Winner Status Transitions

```
                    ┌────────────────────────────────────────────┐
                    │                  DRAW                      │
                    │            (creates winner)                │
                    └─────────────────────┬──────────────────────┘
                                          │
                      ┌───────────────────┼───────────────────┐
                      │                   │                   │
                      ▼                   ▼                   ▼
               ┌───────────┐       ┌───────────┐       ┌───────────┐
               │   VALID   │       │ CANCELLED │       │  SKIPPED  │
               │           │       │           │       │           │
               │ confirmedAt       │ confirmedAt       │ (pool     │
               │ = undefined       │ = undefined       │  exhausted)│
               └─────┬─────┘       └─────┬─────┘       └───────────┘
                     │                   │
                     │ Manual Cancel     │ Redraw
                     ▼                   ▼
               ┌───────────┐       ┌───────────┐
               │ CANCELLED │       │  DELETED  │ (old entry removed)
               └─────┬─────┘       └───────────┘
                     │                   │
                     │ Redraw            │ + Create new winner
                     ▼                   ▼
               ┌───────────┐       ┌───────────┐
               │  DELETED  │       │   NEW     │ (valid or cancelled)
               └───────────┘       └───────────┘
                                         │
                                         │ Confirm (if valid)
                                         ▼
                                  ┌────────────────┐
                                  │    CONFIRMED   │
                                  │                │
                                  │  confirmedAt   │
                                  │  = Date        │
                                  └────────────────┘
```

---

## Complete Status Summary Table

| Flow | winner.status | winner.confirmedAt | coupon.status |
|------|---------------|-------------------|---------------|
| **Draw (valid)** | `'valid'` | `undefined` | **`'active'`** ⚠️ |
| **Draw (invalid)** | `'cancelled'` | `undefined` | `'cancelled'` |
| **Manual Cancel** | `'cancelled'` | `undefined` | `'cancelled'` |
| **Redraw (restore)** | - | - | **`'active'`** 🔴 |
| **Redraw (new valid)** | `'valid'` | `undefined` | **`'active'`** ⚠️ |
| **Redraw (new invalid)** | `'cancelled'` | `undefined` | `'cancelled'` |
| **Confirm** | `'valid'` | **`Date`** ✅ | **`'void'`** ✅ |

---

## Known Issues & Bugs

### Bug 1: Valid Winner Coupon Remains 'active'

**Location:** `drawService.draw()` line 348-351

```typescript
if (!validation.valid) {
  await couponRepository.cancel(eventId, coupon.id)
}
// NO handling for valid winner's coupon!
```

**Impact:** Coupon could be selected again in subsequent batches before confirm.

**Severity:** Medium (mitigated by UI flow)

---

### Bug 2: Cancelled Coupon Restored During Redraw

**Location:** `drawService.redrawAll()` line 429-437

```typescript
await couponRepository.restore(event.id, cancelledWinner.couponId)
```

**Impact:** Cancelled coupons are restored to 'active' and could be selected again during redraw.

**Severity:** High (could cause same coupon to be selected again)

---

### Bug 3: Valid Winner from Redraw Also Remains 'active'

**Location:** `drawService.redrawAll()` line 540-543

```typescript
if (!validation.valid) {
  await couponRepository.cancel(event.id, coupon.id)
}
// NO handling for valid winner's coupon!
```

**Impact:** Same as Bug 1, but in redraw context.

**Severity:** Medium

---

## Recommended Fixes

### Fix for Bug 1 & 3
When a coupon is selected as a valid winner, it should be marked as 'cancelled' (temporarily out of pool) until confirm, when it becomes 'void'.

```typescript
// In draw() and redrawAll():
if (validation.valid) {
  await couponRepository.cancel(eventId, coupon.id)  // Remove from pool
}
```

### Fix for Bug 2
Do NOT restore the old cancelled coupon. Instead, only select from remaining active coupons (excluding the old cancelled one).

```typescript
// Remove this line:
// await couponRepository.restore(event.id, cancelledWinner.couponId)
```

---

## File References

| File | Purpose |
|------|---------|
| `src/types/index.ts` | All TypeScript interfaces and types |
| `src/repositories/dexie/db.ts` | Database schema definition |
| `src/services/drawService.ts` | Core draw business logic |
| `src/hooks/useDrawState.ts` | Draw screen state machine |
| `src/pages/DrawScreen.tsx` | Draw screen UI component |
| `src/repositories/dexie/couponRepository.ts` | Coupon CRUD operations |
| `src/repositories/dexie/winnerRepository.ts` | Winner CRUD operations |

---

*Document generated: December 2024*
*Version: 1.0*
