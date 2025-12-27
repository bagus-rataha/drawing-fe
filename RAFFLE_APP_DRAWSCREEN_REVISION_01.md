# Raffle App - DrawScreen Animation Revision 01

## Overview

Revisi animasi DrawScreen agar sesuai dengan referensi log-lottery repo.

Reference: https://github.com/LOG1997/log-lottery
Demo: https://log1997.github.io/log-lottery/

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Styling Theme (Konsisten dengan Phase 1)

| Property | Value |
|----------|-------|
| Font | Plus Jakarta Sans |
| Primary | #635bff |
| Navy | #0a2540 |
| Background | #f6f9fc |
| White | #ffffff |
| Border | #e2e8f0 |
| Text Secondary | #64748b |

---

## Revisions Required

### 1. Sphere - Remove Wireframe

**Current:** Sphere memiliki garis-garis poly (wireframe)

**Expected:** Smooth surface tanpa wireframe, hanya cards yang terlihat

```tsx
// HAPUS ini:
<mesh>
  <sphereGeometry args={[2, 32, 32]} />
  <meshBasicMaterial wireframe color="#635bff" opacity={0.3} transparent />
</mesh>

// Sphere hanya terdiri dari cards, tidak ada wireframe mesh
```

---

### 2. Sphere - Increase Size

**Current:** Sphere terlalu kecil

**Expected:** Sphere lebih besar, dominan di layar (seperti reference)

```tsx
// Perbesar radius sphere
const SPHERE_RADIUS = 4; // atau lebih besar, sesuaikan dengan viewport

// Sesuaikan camera position
<Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
```

---

### 3. Cards on Sphere - Proper Positioning

**Current:** Posisi cards berantakan

**Expected:** Cards tersusun rapi dari south pole ke north pole (seperti grid di permukaan sphere)

```tsx
// Distribusi cards dengan rows dari south ke north
function distributeCardsOnSphere(totalCards: number, radius: number) {
  const positions = [];
  
  // Hitung jumlah rows (latitude bands)
  const rows = Math.ceil(Math.sqrt(totalCards));
  let cardIndex = 0;
  
  for (let row = 0; row < rows && cardIndex < totalCards; row++) {
    // Latitude dari -90° (south) ke +90° (north)
    const lat = -90 + (180 / (rows + 1)) * (row + 1);
    const latRad = (lat * Math.PI) / 180;
    
    // Hitung cards per row (lebih sedikit di poles, lebih banyak di equator)
    const cardsInRow = Math.ceil(totalCards / rows);
    
    for (let col = 0; col < cardsInRow && cardIndex < totalCards; col++) {
      // Longitude dari 0° ke 360°
      const lon = (360 / cardsInRow) * col;
      const lonRad = (lon * Math.PI) / 180;
      
      // Convert spherical to cartesian
      const x = radius * Math.cos(latRad) * Math.cos(lonRad);
      const y = radius * Math.sin(latRad);
      const z = radius * Math.cos(latRad) * Math.sin(lonRad);
      
      positions.push({ x, y, z, lat, lon });
      cardIndex++;
    }
  }
  
  return positions;
}
```

---

### 4. Cards on Sphere - Random Text Animation

**Current:** Text di card static

**Expected:** Text berganti random ke coupon lain, interval 0-10 detik, start time berbeda per card

```tsx
// SphereCard.tsx
interface SphereCardProps {
  position: Vector3;
  allCoupons: Coupon[];  // Pool semua coupon untuk random text
  displayMode: 'coupon' | 'coupon-id' | 'coupon-name';
  cardIndex: number;     // Untuk variasi start time
}

export function SphereCard({ position, allCoupons, displayMode, cardIndex }: SphereCardProps) {
  const [currentCoupon, setCurrentCoupon] = useState(() => 
    allCoupons[Math.floor(Math.random() * allCoupons.length)]
  );
  
  useEffect(() => {
    // Random start delay per card (0-5 detik)
    const startDelay = Math.random() * 5000;
    
    const startTimer = setTimeout(() => {
      // Random interval 0-10 detik untuk setiap perubahan
      const changeText = () => {
        const randomCoupon = allCoupons[Math.floor(Math.random() * allCoupons.length)];
        setCurrentCoupon(randomCoupon);
        
        // Schedule next change dengan random interval
        const nextInterval = Math.random() * 10000; // 0-10 detik
        setTimeout(changeText, nextInterval);
      };
      
      changeText();
    }, startDelay);
    
    return () => clearTimeout(startTimer);
  }, [allCoupons]);
  
  // Render card dengan currentCoupon
  // ...
}
```

---

### 5. Winner Cards - Overlay Layer

**Current:** Winner cards berada di samping sphere (kiri-kanan)

**Expected:** Winner cards sebagai overlay layer DI ATAS sphere (z-index lebih tinggi)

```tsx
// DrawScreen layout
<div className="relative w-full h-full">
  {/* Sphere Layer - di belakang */}
  <div className="absolute inset-0 flex items-center justify-center">
    <Sphere3D />
  </div>
  
  {/* Winner Cards Layer - overlay di atas sphere */}
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="grid grid-cols-5 gap-4 pointer-events-auto">
      {/* Winner cards di sini, posisi overlay */}
      {/* Row 1 */}
      <WinnerCard />
      <WinnerCard />
      <WinnerCard />
      <WinnerCard />
      <WinnerCard />
      
      {/* Spacer untuk sphere visibility */}
      <div className="col-span-5 h-[300px]" /> {/* Biarkan area tengah untuk sphere */}
      
      {/* Row 2 */}
      <WinnerCard />
      <WinnerCard />
      <WinnerCard />
      <WinnerCard />
      <WinnerCard />
    </div>
  </div>
</div>
```

**Layout Visual:**
```
┌──────────────────────────────────────────────────────────┐
│  [Card1] [Card2] [Card3] [Card4] [Card5]                 │  ← Winner Row 1 (overlay)
│                                                          │
│              ┌─────────────────────┐                     │
│              │                     │                     │
│              │    3D SPHERE        │                     │  ← Sphere (background)
│              │    (visible through │                     │
│              │     gap)            │                     │
│              └─────────────────────┘                     │
│                                                          │
│  [Card6] [Card7] [Card8] [Card9] [Card10]                │  ← Winner Row 2 (overlay)
└──────────────────────────────────────────────────────────┘
```

---

### 6. Prize Panel - Floating Style

**Current:** Sidebar full height seperti menu biasa

**Expected:** Floating panel dengan rounded corners, tidak full height

```tsx
// PrizePanel.tsx
export function PrizePanel({ isOpen, onToggle, prizes }) {
  return (
    <>
      {/* Floating Panel */}
      <div 
        className={cn(
          "fixed left-4 top-1/2 -translate-y-1/2 z-50",
          "bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl",
          "border border-[#e2e8f0] overflow-hidden",
          "transition-all duration-300",
          isOpen ? "w-64 p-4" : "w-0 p-0 opacity-0"
        )}
      >
        <div className="space-y-3">
          {prizes.map((prize, index) => (
            <PrizeItem 
              key={prize.id}
              prize={prize}
              status={getPrizeStatus(prize)}
              onClick={() => openWinnersModal(prize.id)}
            />
          ))}
        </div>
      </div>
      
      {/* Toggle Button - always visible */}
      <button 
        onClick={onToggle}
        className={cn(
          "fixed left-0 top-1/2 -translate-y-1/2 z-50",
          "bg-[#635bff] text-white p-2 rounded-r-lg",
          "hover:bg-[#524acc] transition-colors",
          isOpen && "left-[272px]"  // 256px panel + 16px padding
        )}
      >
        {isOpen ? '<' : '>'}
      </button>
    </>
  );
}

// PrizeItem dengan image preview
function PrizeItem({ prize, status, onClick }) {
  const statusColors = {
    completed: 'border-green-400',
    'in-progress': 'border-[#635bff] border-2',
    pending: 'border-[#e2e8f0]',
    'pool-exhausted': 'border-amber-400'
  };
  
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl",
        "bg-[#f6f9fc] hover:bg-[#edf2f7] transition-colors",
        "border-2",
        statusColors[status]
      )}
    >
      {/* Prize Image/Icon */}
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-400 to-purple-500 flex-shrink-0" />
      
      {/* Prize Info */}
      <div className="flex-1 text-left">
        <div className="text-[#0a2540] font-medium text-sm">{prize.name}</div>
        <div className="text-[#64748b] text-xs mt-1">
          {/* Progress bar */}
          <div className="w-full bg-[#e2e8f0] rounded-full h-1.5 mt-1">
            <div 
              className="bg-[#635bff] h-1.5 rounded-full" 
              style={{ width: `${(prize.drawnCount / prize.quantity) * 100}%` }}
            />
          </div>
          <span className="text-xs mt-1 block">{prize.drawnCount}/{prize.quantity}</span>
        </div>
      </div>
    </button>
  );
}
```

---

### 7. Step Display - Add Grid Config

**Location:** Event Wizard → Step 4 (Display Settings)

**New Fields:**

```tsx
// DisplaySettings type
interface DisplaySettings {
  mode: 'coupon' | 'coupon-id' | 'coupon-name';
  gridX: number;  // Jumlah kolom (default: 5)
  gridY: number;  // Jumlah baris (default: 2)
}
```

**Grid Config Mempengaruhi Winner Card Overlay:**

Grid config menentukan jumlah maksimal winner cards yang ditampilkan di overlay layer per page.

| Config | Max Cards per Page | Contoh |
|--------|-------------------|--------|
| 5 × 2 | 10 cards | Draw 25 winners → 3 pages (10, 10, 5) |
| 4 × 2 | 8 cards | Draw 25 winners → 4 pages (8, 8, 8, 1) |
| 6 × 3 | 18 cards | Draw 25 winners → 2 pages (18, 7) |

**Pagination Logic:**

```typescript
const cardsPerPage = gridX * gridY;
const totalPages = Math.ceil(totalWinners / cardsPerPage);

// Page 1: animasi cards keluar dari sphere
// Page 2+: ready tanpa animasi (sudah dibahas sebelumnya)
```

**Visual:**
```
Grid Config: 5 × 2 = 10 cards per page
Draw 25 winners

Page 1 (animasi keluar):
┌──────────────────────────────────────────────────────────┐
│  [Card1] [Card2] [Card3] [Card4] [Card5]                 │  ← Row 1
│                    SPHERE                                │
│  [Card6] [Card7] [Card8] [Card9] [Card10]                │  ← Row 2
│                                                          │
│                   [<] 1/3 [>]                            │  ← Pagination
└──────────────────────────────────────────────────────────┘

Page 2 (ready, tanpa animasi):
┌──────────────────────────────────────────────────────────┐
│  [Card11] [Card12] [Card13] [Card14] [Card15]            │
│                    SPHERE                                │
│  [Card16] [Card17] [Card18] [Card19] [Card20]            │
│                                                          │
│                   [<] 2/3 [>]                            │
└──────────────────────────────────────────────────────────┘

Page 3 (ready, tanpa animasi):
┌──────────────────────────────────────────────────────────┐
│  [Card21] [Card22] [Card23] [Card24] [Card25]            │
│                    SPHERE                                │
│  [     ] [     ] [     ] [     ] [     ]                 │  ← Empty slots
│                                                          │
│                   [<] 3/3 [>]                            │
└──────────────────────────────────────────────────────────┘
```

**StepDisplay.tsx - Form Fields:**

```tsx
  {/* Existing: Display Mode */}
  <div>
    <label>Display Mode</label>
    <select value={displayMode} onChange={...}>
      <option value="coupon">Coupon Only</option>
      <option value="coupon-id">Coupon + Participant ID</option>
      <option value="coupon-name">Coupon + Name</option>
    </select>
  </div>
  
  {/* NEW: Grid Config */}
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium text-[#0a2540] mb-1">
        Grid Columns (X)
      </label>
      <input 
        type="number" 
        min="1" 
        max="10"
        value={gridX}
        onChange={(e) => setGridX(Number(e.target.value))}
        className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg"
      />
      <p className="text-xs text-[#64748b] mt-1">Jumlah card per baris</p>
    </div>
    
    <div>
      <label className="block text-sm font-medium text-[#0a2540] mb-1">
        Grid Rows (Y)
      </label>
      <input 
        type="number" 
        min="1" 
        max="10"
        value={gridY}
        onChange={(e) => setGridY(Number(e.target.value))}
        className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg"
      />
      <p className="text-xs text-[#64748b] mt-1">Jumlah baris card</p>
    </div>
  </div>
  
  {/* Preview */}
  <div className="p-4 bg-[#f6f9fc] rounded-lg">
    <p className="text-sm text-[#64748b] mb-2">Preview: {gridX} × {gridY} = {gridX * gridY} cards per page</p>
    <div 
      className="grid gap-2 border border-dashed border-[#e2e8f0] p-2 rounded"
      style={{ gridTemplateColumns: `repeat(${gridX}, 1fr)` }}
    >
      {Array.from({ length: gridX * gridY }).map((_, i) => (
        <div key={i} className="bg-white border border-[#e2e8f0] rounded h-8" />
      ))}
    </div>
  </div>
</div>
```

**Update Event Type:**

```typescript
// src/types/index.ts
interface Event {
  // ... existing fields
  displaySettings: {
    mode: 'coupon' | 'coupon-id' | 'coupon-name';
    gridX: number;
    gridY: number;
  };
}
```

**Default Values:**

```typescript
const defaultDisplaySettings = {
  mode: 'coupon-name',
  gridX: 5,
  gridY: 2
};
```

---

## Winner Card Styling (Reference)

Berdasarkan gambar reference, winner card memiliki:

```tsx
// WinnerCard.tsx
export function WinnerCard({ winner, onCancel, isValid }) {
  return (
    <div className={cn(
      "bg-[#fdf4f7] rounded-lg p-4 min-w-[140px]",
      "border border-[#f0d4dc]",
      "flex flex-col items-center text-center",
      !isValid && "opacity-60"
    )}>
      {/* Coupon ID - top */}
      <div className="text-xs text-[#64748b] mb-2">
        {winner.couponId}
      </div>
      
      {/* Name - center, large */}
      <div className="text-xl font-bold text-[#0a2540] mb-2">
        {winner.participantName}
      </div>
      
      {/* Description/Title - bottom */}
      <div className="text-sm text-[#64748b]">
        {winner.participantTitle || winner.participantId}
      </div>
      
      {/* Cancel button - only for valid */}
      {isValid && (
        <button
          onClick={onCancel}
          className="mt-3 px-4 py-1 text-xs bg-red-50 text-red-600 
                     border border-red-200 rounded-md hover:bg-red-100"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/draw/Sphere3D.tsx` | Remove wireframe, increase size |
| `src/components/draw/SphereMesh.tsx` | Fix card positioning (south to north) |
| `src/components/draw/SphereCard.tsx` | Add random text animation |
| `src/components/draw/WinnerGallery.tsx` | Change to overlay layout |
| `src/components/draw/WinnerCard.tsx` | Update styling per reference |
| `src/components/draw/PrizePanel.tsx` | Change to floating style |
| `src/pages/DrawScreen.tsx` | Update layout structure |
| `src/components/wizard/StepDisplay.tsx` | Add grid config fields |
| `src/types/index.ts` | Add displaySettings type |

---

## Execution Order

```
1. Update Event type dengan displaySettings (gridX, gridY)
       ↓
2. Add grid config fields di StepDisplay
       ↓
3. Fix Sphere3D - remove wireframe, increase size
       ↓
4. Fix SphereMesh - proper card positioning (south to north)
       ↓
5. Add random text animation ke SphereCard
       ↓
6. Update PrizePanel ke floating style
       ↓
7. Update DrawScreen layout - winner cards sebagai overlay
       ↓
8. Update WinnerCard styling
       ↓
9. Test semua changes
```

---

## Testing Checklist

- [ ] Sphere tidak ada wireframe (smooth)
- [ ] Sphere size cukup besar di layar
- [ ] Cards di sphere tersusun rapi (south to north)
- [ ] Cards di sphere text berganti random (tidak bersamaan)
- [ ] Winner cards sebagai overlay di atas sphere
- [ ] Prize panel floating (rounded, tidak full height)
- [ ] Grid config bisa di-set di Step Display
- [ ] Grid config ter-apply di DrawScreen
