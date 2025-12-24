# React Lottery App - Complete Specification

## Project Overview

Enterprise lottery/raffle application untuk event korporat skala besar (100K-500K peserta). Mendukung weighted coupon selection, sequential prize drawing, configurable win rules, dan cancel/redraw mechanism.

## Tech Stack

- React 18 + TypeScript + Vite
- Zustand (state management)
- Dexie.js (IndexedDB untuk Phase 1)
- TanStack Query + REST API (Phase 2)
- Tailwind CSS + shadcn/ui
- react-three-fiber (animasi 3D - Phase 2)
- SheetJS (Excel import/export)

---

## Menu Structure & Hierarchy

```
LOTTERY APP
│
├── / (Home)
│   │
│   ├── [+ New Event] ─────────────────────────────────────┐
│   │                                                      │
│   └── Event Card                                         │
│       ├── [Edit] ────────────────────────────────────────┤
│       │                                                  │
│       │   ┌──────────────────────────────────────────────┴──────┐
│       │   │                                                     │
│       │   ▼                                                     │
│       │   /event/new & /event/:id/edit (Wizard)                 │
│       │   │                                                     │
│       │   ├── Step 1: Event Info                                │
│       │   │   ├── Nama Event                                    │
│       │   │   ├── Deskripsi                                     │
│       │   │   └── Win Rule (one-time / limited / unlimited)     │
│       │   │                                                     │
│       │   ├── Step 2: Prize Management                          │
│       │   │   ├── [+ Add Prize]                                 │
│       │   │   └── Prize List (drag reorder)                     │
│       │   │       ├── Nama, Gambar, Quantity                    │
│       │   │       ├── Batch Config                              │
│       │   │       └── [Edit] [Delete]                           │
│       │   │                                                     │
│       │   ├── Step 3: Participant Import                        │
│       │   │   ├── [Upload Excel]                                │
│       │   │   ├── Column Mapping Preview                        │
│       │   │   └── Validation & Stats                            │
│       │   │                                                     │
│       │   ├── Step 4: Display Settings                          │
│       │   │   ├── Background Image                              │
│       │   │   ├── Animation Type (3D Sphere / Particle)         │
│       │   │   ├── Show Coupon ID (toggle)                       │
│       │   │   └── Custom Fields to Display                      │
│       │   │                                                     │
│       │   └── Step 5: Review                                    │
│       │       ├── Summary                                       │
│       │       ├── [Save Draft] ──────────────► kembali ke /     │
│       │       └── [Save & Start] ────────────► ke /event/:id/draw
│       │                                                     │
│       ├── [Start Draw] ─────────────────────────────────────┤
│       │                                                     │
│       │   ┌─────────────────────────────────────────────────┘
│       │   │
│       │   ▼
│       │   /event/:id/draw (Draw Screen) [PHASE 2]
│       │   │
│       │   ├── Sidebar (toggle show/hide)
│       │   │   ├── Prize List + Progress [drawn/total]
│       │   │   └── Klik Prize → Modal Winner List
│       │   │
│       │   ├── Animation Canvas (fullscreen)
│       │   │
│       │   ├── Winner Cards
│       │   │   ├── ✅ Valid → [Cancel] → manual cancel
│       │   │   └── ❌ Cancelled → [Redraw] → tarik ulang
│       │   │
│       │   └── Action Button (berubah sesuai state)
│       │       ├── IDLE       → [Start]
│       │       ├── ANIMATING  → (none)
│       │       ├── REVIEWING  → [Confirm]
│       │       └── COMPLETED  → [Back to Home] ──► kembali ke /
│       │
│       ├── [History] ────────────────────────────────────────┐
│       │                                                     │
│       │   ┌─────────────────────────────────────────────────┘
│       │   │
│       │   ▼
│       │   /event/:id/history (Results)
│       │   │
│       │   ├── [← Back] ──────────────────────► kembali ke /
│       │   ├── Filter by Prize
│       │   ├── Winner Table (grouped by Prize)
│       │   │   └── #, Name, Coupon, Department, Batch, Time
│       │   └── [Export Excel]
│       │
│       └── [⋮ Menu]
│           ├── [Delete Event]
│           └── [Duplicate Event]
```

---

## Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Event list dengan card, search, filter by status |
| `/event/new` | EventWizard | Create event (5 steps wizard) |
| `/event/:id/edit` | EventWizard | Edit event (prefilled data) |
| `/event/:id/draw` | DrawScreen | Layar undian fullscreen [PHASE 2] |
| `/event/:id/history` | History | Winner list + export Excel |

---

## UI Layouts

### Home (`/`)

```
┌────────────────────────────────────────────────────────────────────────┐
│  LOTTERY APP                                           [+ New Event]   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Search: [__________________]       Filter: [All Status ▼]             │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─ Event Card ────────────────────────────────────────────────────┐   │
│  │                                                                 │   │
│  │  Grand Launching 2025                              [Draft] [⋮]  │   │
│  │  Annual company event with multiple prizes                      │   │
│  │                                                                 │   │
│  │  🎁 5 prizes    👥 50,000 participants    🎫 120,000 coupons    │   │
│  │  Win Rule: One-time                                             │   │
│  │                                                                 │   │
│  │  [Edit]    [Start Draw]    [History]                            │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**Event Card Button Behavior:**

| Status | [Edit] | [Start Draw] | [History] | [⋮] Menu |
|--------|--------|--------------|-----------|----------|
| Draft | ✅ | [Start Draw] | ❌ hidden | Delete |
| Ready | ✅ | [Start Draw] | ❌ hidden | Delete |
| In Progress | ❌ disabled | [Continue Draw] | ✅ | - |
| Completed | ✅ | ❌ hidden | ✅ | Delete, Duplicate |

### History (`/event/:id/history`)

```
┌────────────────────────────────────────────────────────────────────────┐
│  ← Back to Home                                        [Export Excel]  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  EVENT: Grand Launching 2025                                           │
│  Total Winners: 37                                                     │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Filter: [All Prizes ▼]    Search: [__________________]                │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─ Prize 1: Grand Prize (1 winner) ─────────────────────────────────┐ │
│  │                                                                   │ │
│  │  #   Name         Coupon ID    Department    Batch   Drawn At     │ │
│  │  ─────────────────────────────────────────────────────────────    │ │
│  │  1   John Doe     C-00421      Marketing     1       10:01:23     │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌─ Prize 2: Gold Prize (5 winners) ─────────────────────────────────┐ │
│  │  ...                                                              │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

```typescript
// ============================================
// ENUMS & CONSTANTS
// ============================================

type EventStatus = 'draft' | 'ready' | 'in_progress' | 'completed';
type WinRuleType = 'one-time' | 'limited' | 'unlimited';
type DrawMode = 'all-at-once' | 'batch' | 'one-by-one';
type AnimationType = '3d-sphere' | 'particle';
type CouponStatus = 'active' | 'void';
type ParticipantStatus = 'active' | 'exhausted';

// ============================================
// MAIN ENTITIES
// ============================================

interface Event {
  id: string;
  name: string;
  description?: string;
  winRule: WinRule;
  displaySettings: DisplaySettings;
  status: EventStatus;
  totalParticipants: number;
  totalCoupons: number;
  createdAt: Date;
  updatedAt: Date;
}

interface WinRule {
  type: WinRuleType;
  maxWins?: number; // hanya untuk 'limited'
}

interface DisplaySettings {
  backgroundImage?: string;
  animationType: AnimationType;
  showCouponId: boolean;
  customFieldsToShow: string[];
}

interface Prize {
  id: string;
  eventId: string;
  name: string;
  image?: string;
  quantity: number;
  sequence: number; // urutan draw (1, 2, 3, ...)
  drawConfig: DrawConfig;
  drawnCount: number;
}

interface DrawConfig {
  mode: DrawMode;
  batches?: number[]; // untuk batch mode, misal [15, 10, 10]
}

interface Participant {
  id: string;              // participant_id dari Excel (PRIMARY KEY)
  eventId: string;
  name?: string;           // optional
  email?: string;
  phone?: string;
  customFields: Record<string, string>;
  winCount: number;
  status: ParticipantStatus;
}

interface Coupon {
  id: string;              // coupon_id dari Excel (UNIQUE)
  eventId: string;
  participantId: string;
  weight: number;          // default 1, bisa lebih untuk VIP
  status: CouponStatus;
}

interface Winner {
  id: string;
  eventId: string;
  prizeId: string;
  participantId: string;
  participantName?: string;        // optional, snapshot dari participant
  couponId: string;
  customFieldsSnapshot: Record<string, string>;
  batchNumber: number;
  drawnAt: Date;
}

// ============================================
// CANCEL & REDRAW (Phase 2)
// ============================================

interface CancelReason {
  type: 'auto' | 'manual';
  ruleType?: WinRuleType;
  message: string;
  conflictingLines?: number[];
  totalWins?: number;
  maxAllowed?: number;
}

type DrawLineStatus = 'valid' | 'cancelled' | 'skipped';

interface DrawLine {
  lineNumber: number;
  participantId: string;
  participantName?: string;        // optional
  couponId: string;
  customFields: Record<string, string>;
  status: DrawLineStatus;
  cancelReason?: CancelReason;
}

interface BatchState {
  prizeId: string;
  batchNumber: number;
  lines: DrawLine[];
}
```

---

## Business Rules

### Win Rules (1 event = 1 rule)

| Rule | Behavior | Void Mechanism |
|------|----------|----------------|
| **one-time** | Menang 1x selesai | Semua kupon participant di-void |
| **limited(N)** | Max N kemenangan | Kupon menang di-void, setelah N semua void |
| **unlimited** | Tanpa batas | Hanya kupon yang menang di-void |

### Cancel Mechanism

**Dua tipe cancel:**

| Tipe | Trigger | Contoh |
|------|---------|--------|
| Auto-cancel | Sistem detect pelanggaran win rule | Participant sudah menang + muncul lagi dalam batch sama |
| Manual cancel | Admin klik [Cancel] | Pemenang tidak hadir, data invalid |

**Cancel behavior:**
- Kupon yang di-cancel → **void permanen**
- Kupon lain milik participant yang sama → **tetap aktif**
- Aktif untuk redraw dalam batch sama DAN rolling berikutnya

**Auto-cancel conditions:**

| Win Rule | Cancel Jika |
|----------|-------------|
| one-time | `existingWins >= 1` ATAU sudah menang di line sebelumnya dalam batch |
| limited | `existingWins + winsInBatch + 1 > maxWins` |
| unlimited | TIDAK PERNAH auto-cancel |

### Redraw Mechanism

```
Batch dengan cancelled lines:
┌─────────────────────────────────────────────────────┐
│ Line 1: John     ✅ Valid                           │
│ Line 2: Jane     ❌ Cancelled          [Redraw All] │
│ Line 3: Bob      ✅ Valid                           │
│ Line 4: Alice    ❌ Cancelled                       │
│ Line 5: Tom      ✅ Valid                           │
└─────────────────────────────────────────────────────┘

Klik [Redraw All]:
1. Ambil pool kupon aktif
2. Exclude: winner valid batch ini + yang masih cancelled
3. Weighted random selection
4. Validate terhadap win rules
5. Tampilkan hasil baru
```

**Pool habis saat redraw:**

```
┌─────────────────────────────────────────────────────┐
│ Line 2: Mary     ✅ Valid (redraw berhasil)         │
│ Line 4: ⚠️ Pool habis - tidak ada pengganti         │
├─────────────────────────────────────────────────────┤
│ ⚠️ 1 line tidak dapat diisi. Pool habis.            │
│                                                     │
│ [Confirm 4 Winners]    [Cancel Batch]               │
└─────────────────────────────────────────────────────┘
```

---

## Excel Import

### Required Columns
- `coupon_id` - unique identifier tiap kupon
- `participant_id` - identifier peserta (PRIMARY KEY untuk win tracking)

### Optional Columns
- `participant_name` - nama peserta
- `email`, `phone`, `department`, `region`
- Any other column → auto-detect sebagai customFields

### Validation Rules

| Check | Result |
|-------|--------|
| coupon_id unique | ⛔ Block jika duplikat |
| Same participant_id, different coupon | ✅ Valid (1 orang banyak kupon) |
| Same participant_id, different name | ✅ Valid (nama = info tambahan) |
| Missing required column | ⛔ Block |

**Probability:** `participant_coupons / total_coupons`

---

## Edge Cases & Handling

### 1. Pool Habis saat Redraw
- Status line: `skipped`
- Tidak ada [Redraw] button
- Admin pilih: confirm winners yang ada atau cancel batch
- **Di History:** Tandai bahwa pool habis / tidak ada participant eligible

### 2. Semua Cancelled
- Hanya [Redraw All] button (tidak ada [Confirm])
- Tidak bisa skip, harus redraw

### 3. Browser Crash
- Auto-save draft state ke IndexedDB
- Resume dialog saat kembali ke draw screen

### 4. Quantity > Pool (Pre-check)
- **Blocking** - tidak bisa lanjut
- Harus edit prize qty atau tambah participant

---

## Sequential Draw Flow

```
[Start] 
    ↓
Prize 1 Batch 1 → Animasi → Review → [Confirm]
    ↓
Prize 1 Batch 2 → Animasi → Review → [Confirm]
    ↓
Prize 2 Batch 1 → Animasi → Review → [Confirm]
    ↓
... (auto-sequential semua prizes)
    ↓
[Completed] → Back to Home
```

**Key points:**
- Klik [Start] SEKALI, lalu auto-sequential
- Setiap batch: draw → validate → animate → review → confirm
- TIDAK ADA pemilihan prize manual antar draw

---

## Folder Structure

```
src/
├── components/
│   ├── ui/                         # shadcn/ui components
│   │
│   ├── layout/
│   │   └── Header.tsx
│   │
│   ├── event/
│   │   ├── EventCard.tsx
│   │   └── EventList.tsx
│   │
│   ├── wizard/
│   │   ├── WizardStepper.tsx
│   │   ├── StepEventInfo.tsx
│   │   ├── StepPrizes.tsx
│   │   ├── StepParticipants.tsx
│   │   ├── StepDisplay.tsx
│   │   └── StepReview.tsx
│   │
│   ├── draw/                       # [PHASE 2]
│   │   ├── DrawScreen.tsx
│   │   ├── AnimationCanvas.tsx
│   │   ├── WinnerCard.tsx
│   │   ├── PrizeSidebar.tsx
│   │   └── WinnerModal.tsx
│   │
│   └── history/
│       ├── HistoryTable.tsx
│       └── ExportButton.tsx
│
├── pages/
│   ├── Home.tsx
│   ├── EventWizard.tsx
│   ├── DrawScreen.tsx              # [PHASE 2]
│   └── History.tsx
│
├── repositories/
│   ├── interfaces/
│   │   ├── eventRepository.ts
│   │   ├── prizeRepository.ts
│   │   ├── participantRepository.ts
│   │   ├── couponRepository.ts
│   │   └── winnerRepository.ts
│   │
│   ├── dexie/
│   │   ├── db.ts                   # Dexie instance & schema
│   │   ├── eventRepository.ts
│   │   ├── prizeRepository.ts
│   │   ├── participantRepository.ts
│   │   ├── couponRepository.ts
│   │   └── winnerRepository.ts
│   │
│   ├── api/                        # [PHASE 2]
│   │   └── .gitkeep
│   │
│   └── index.ts                    # export active implementation
│
├── services/
│   ├── excelService.ts             # Import/export Excel
│   ├── validationService.ts        # Import & win rules validation
│   └── drawService.ts              # Weighted selection [PHASE 2]
│
├── stores/
│   ├── eventStore.ts               # Current event, wizard state
│   ├── drawStore.ts                # Draw state [PHASE 2]
│   └── uiStore.ts                  # Loading, modals, toasts
│
├── hooks/
│   ├── useEvents.ts
│   ├── usePrizes.ts
│   ├── useParticipants.ts
│   ├── useCoupons.ts
│   ├── useWinners.ts
│   └── useDraw.ts                  # [PHASE 2]
│
├── types/
│   └── index.ts
│
├── utils/
│   ├── constants.ts
│   └── helpers.ts
│
└── App.tsx
```

---

## Repository Pattern

Untuk memudahkan migrasi dari Dexie.js ke REST API:

```
┌─────────────────────────────────────┐
│            Components               │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│         Hooks / Stores              │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│       Repository Interface          │  ← abstraction
└─────────────┬───────────────────────┘
              │
       ┌──────┴──────┐
       ▼             ▼
┌─────────────┐ ┌─────────────┐
│  Dexie.js   │ │ REST API    │
│  (Phase 1)  │ │ (Phase 2)   │
└─────────────┘ └─────────────┘
```

**Migrasi:** Hanya ganti export di `repositories/index.ts`

---

## Phase 1 Scope

| Task | Items |
|------|-------|
| Setup | Vite, React, TS, Tailwind, shadcn/ui, React Router, Zustand, Dexie, SheetJS |
| Types | Semua interfaces di `types/index.ts` |
| Constants | `utils/constants.ts` |
| Repository | interfaces + dexie implementation |
| Hooks | useEvents, usePrizes, useParticipants, useCoupons, useWinners |
| Stores | eventStore, uiStore |
| Services | excelService, validationService |
| Pages | Home, EventWizard (5 steps), History |

**EXCLUDED dari Phase 1:** DrawScreen, Animation, drawService, drawStore

---

## Code Quality Standards

1. **JSDoc** untuk semua functions
   ```typescript
   /**
    * Import participants dan coupons dari Excel file
    * @param file - Excel file (.xlsx, .xls)
    * @param eventId - Event ID untuk associate data
    * @returns Import result dengan stats dan errors
    */
   async function importExcel(file: File, eventId: string): Promise<ImportResult>
   ```

2. **Inline comments** - jelaskan WHY bukan WHAT
   ```typescript
   // Exclude cancelled participants dari pool untuk mencegah
   // participant yang sama muncul di redraw
   const pool = coupons.filter(c => !cancelledIds.includes(c.participantId));
   ```

3. **Named constants** - no magic numbers
   ```typescript
   const MAX_BATCH_SIZE = 100;
   const ANIMATION_DURATION_MS = 3000;
   ```

4. **Type annotations** everywhere

5. **ASCII diagrams** untuk complex logic di JSDoc

---

## Development Instructions

### WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:

1. **Buat plan** yang mencakup:
   - Files yang akan dibuat/dimodifikasi
   - Dependencies yang dibutuhkan
   - Urutan pengerjaan
   - Potensi blockers

2. **Tunggu approval** dari user

3. **Setelah approved**, baru eksekusi

### Documentation Requirements

Setiap file HARUS memiliki:

1. **File header comment**
   ```typescript
   /**
    * @file eventRepository.ts
    * @description Dexie implementation untuk Event repository
    * 
    * Handles:
    * - CRUD operations untuk Event entity
    * - Status management (draft → ready → in_progress → completed)
    * - Stats calculation (totalParticipants, totalCoupons)
    */
   ```

2. **Function documentation** dengan JSDoc lengkap

3. **Inline comments** untuk logic yang complex

4. **README.md** di setiap folder utama jika diperlukan

---

## Execution Order (Phase 1)

```
1. Project Setup
   └── Vite + dependencies + folder structure
       ↓
2. Types & Constants
   └── types/index.ts + utils/constants.ts
       ↓
3. Repository Layer
   ├── interfaces (semua)
   └── dexie implementation (semua)
       ↓
4. Hooks
   └── useEvents, usePrizes, useParticipants, useCoupons, useWinners
       ↓
5. Stores
   └── eventStore, uiStore
       ↓
6. Services
   └── excelService, validationService
       ↓
7. UI Components
   ├── ui/ (shadcn components)
   ├── layout/Header
   └── event/EventCard, EventList
       ↓
8. Pages
   ├── Home
   ├── EventWizard (5 steps)
   └── History
```
