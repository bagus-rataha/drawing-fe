# Raffle App - DrawScreen Animation Revision 02

## Overview

Revisi lanjutan animasi DrawScreen berdasarkan feedback.

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Revisions Required

### 1. Sphere Rotation - Horizontal Only

**Current:** Sphere berputar kesana kemari tidak beraturan (rotasi di semua axis)

**Expected:**
- Berputar **horizontal saja** (rotasi Y-axis only)
- Saat spinning: putaran cepat
- Saat klik Stop: **berhenti instant** (tidak slowdown)
- Saat idle (tidak drawing/reveal): **putaran lambat horizontal**

```tsx
// SphereMesh.tsx
useFrame((state, delta) => {
  if (!groupRef.current) return;
  
  if (isSpinning) {
    // Fast horizontal rotation saat drawing
    groupRef.current.rotation.y += delta * 5; // Kecepatan tinggi
  } else if (isIdle) {
    // Slow horizontal rotation saat idle
    groupRef.current.rotation.y += delta * 0.3; // Kecepatan lambat
  }
  // Saat stopped: tidak ada rotasi (instant stop)
  
  // HAPUS rotasi X dan Z - hanya Y axis
  // groupRef.current.rotation.x += ... // HAPUS
});
```

---

### 2. Card Shape - Portrait (Height > Width)

**Current:** Card berbentuk landscape (width > height)

**Expected:** Card berbentuk portrait (height > width), seperti reference

```tsx
// SphereCard.tsx
// BEFORE:
<planeGeometry args={[0.4, 0.25]} />  // width: 0.4, height: 0.25 (landscape)

// AFTER:
<planeGeometry args={[0.25, 0.4]} />  // width: 0.25, height: 0.4 (portrait)
```

---

### 3. Card Density - More Cards on Sphere

**Current:** Terlalu sedikit cards, sphere terlihat kosong

**Expected:** Lebih banyak cards, padat seperti reference

```tsx
// Tingkatkan jumlah cards yang ditampilkan di sphere
// Jangan tampilkan semua coupon, tapi sample yang cukup padat

const MAX_CARDS_ON_SPHERE = 200; // atau lebih, sesuaikan dengan performance

// Jika total coupons > MAX_CARDS_ON_SPHERE, ambil sample random
const displayedCoupons = useMemo(() => {
  if (coupons.length <= MAX_CARDS_ON_SPHERE) {
    return coupons;
  }
  // Random sample
  const shuffled = [...coupons].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, MAX_CARDS_ON_SPHERE);
}, [coupons]);
```

---

### 4. Card Size - Follow Reference

**Current:** Card terlalu kecil

**Expected:** Ukuran card seperti reference, proporsional dengan sphere size

```tsx
// Sesuaikan ukuran card dengan sphere radius
const SPHERE_RADIUS = 5;
const CARD_WIDTH = 0.35;   // Lebih kecil dari height (portrait)
const CARD_HEIGHT = 0.55;  // Lebih besar dari width
```

---

### 5. Card Color - Transparent with Dynamic Opacity

**Current:** Card tanpa warna/efek

**Expected:** 
- Card memiliki warna dengan transparansi
- Intensitas transparansi berubah setiap kali nama coupon berubah

```tsx
// SphereCard.tsx
const [opacity, setOpacity] = useState(() => 0.3 + Math.random() * 0.5);

useEffect(() => {
  // Setiap kali currentCoupon berubah, ubah opacity
  setOpacity(0.3 + Math.random() * 0.5); // Random antara 0.3 - 0.8
}, [currentCoupon]);

return (
  <group position={position} lookAt={[0, 0, 0]}>
    {/* Card background dengan dynamic opacity */}
    <mesh>
      <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
      <meshBasicMaterial 
        color="#e8b4c8"  // Pink/magenta seperti reference
        transparent 
        opacity={opacity}
        side={THREE.DoubleSide} 
      />
    </mesh>
    
    {/* Card text */}
    <Text ...>
      {getDisplayText()}
    </Text>
  </group>
);
```

---

### 6. Winner Cards Position - Centered (No Gap)

**Current:** Cards di atas dan bawah dengan rongga di tengah (`justify-between`)

**Expected:** Cards centered, tidak ada rongga di tengah

```tsx
// BEFORE:
<div className="absolute inset-0 flex flex-col items-center justify-between py-8 px-8 pointer-events-none">

// AFTER:
<div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 pointer-events-none">
```

**Visual:**
```
BEFORE (justify-between):              AFTER (justify-center):
┌────────────────────────┐            ┌────────────────────────┐
│ [Card] [Card] [Card]   │            │                        │
│                        │            │ [Card] [Card] [Card]   │
│       SPHERE           │            │       SPHERE           │
│                        │            │ [Card] [Card] [Card]   │
│ [Card] [Card] [Card]   │            │                        │
└────────────────────────┘            └────────────────────────┘
```

---

### 7. Winner Card Styling - Clear Distinction Valid vs Cancelled

**Current:** 
- Card valid berwarna merah/pink → terlihat seperti cancelled
- Tombol Cancel di dalam card body

**Expected:**
- Card valid: warna netral/clean (white/light)
- Card cancelled: jelas berbeda (grayed out, dengan marker)
- Tombol Cancel: **di luar card body** (floating di bawah/samping card)

```tsx
// WinnerCard.tsx
interface WinnerCardProps {
  winner: DrawResult;
  onCancel: () => void;
}

export function WinnerCard({ winner, onCancel }: WinnerCardProps) {
  const isValid = winner.status === 'valid';
  const isCancelled = winner.status === 'cancelled';
  const isSkipped = winner.status === 'skipped';
  
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Card Body */}
      <div className={cn(
        "relative rounded-lg p-4 min-w-[140px] text-center",
        "border shadow-sm",
        // Valid: clean white
        isValid && "bg-white border-[#e2e8f0]",
        // Cancelled: grayed out dengan overlay
        isCancelled && "bg-gray-100 border-gray-300 opacity-60",
        // Skipped: warning style
        isSkipped && "bg-amber-50 border-amber-300 opacity-60"
      )}>
        {/* Status marker untuk cancelled/skipped */}
        {isCancelled && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
            Cancelled
          </div>
        )}
        {isSkipped && (
          <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
            Skipped
          </div>
        )}
        
        {/* Coupon ID */}
        <div className="text-xs text-[#64748b] mb-1">{winner.couponId}</div>
        
        {/* Name */}
        <div className="text-lg font-bold text-[#0a2540]">{winner.participantName}</div>
        
        {/* ID */}
        <div className="text-sm text-[#64748b]">{winner.participantId}</div>
      </div>
      
      {/* Cancel Button - OUTSIDE card body, only for valid */}
      {isValid && (
        <button
          onClick={onCancel}
          className="text-xs text-red-500 hover:text-red-700 hover:underline"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
```

---

### 8. Auto-Cancel Reason - Show Info

**Current:** Card cancelled tapi tidak tahu alasannya

**Expected:** Tampilkan alasan cancel

```tsx
// WinnerCard.tsx - tambahkan cancel reason
{isCancelled && winner.cancelReason && (
  <div className="mt-1 text-xs text-red-500 max-w-[140px]">
    {winner.cancelReason.message}
  </div>
)}

// Contoh message:
// - "Sudah muncul di line sebelumnya"
// - "Sudah menang 1x sebelumnya"
// - "Sudah menang 3/3 kali (max tercapai)"
// - "Dibatalkan oleh admin"
```

**Full component dengan cancel reason:**

```tsx
export function WinnerCard({ winner, onCancel }: WinnerCardProps) {
  const isValid = winner.status === 'valid';
  const isCancelled = winner.status === 'cancelled';
  const isSkipped = winner.status === 'skipped';
  
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Card Body */}
      <div className={cn(
        "relative rounded-lg p-4 min-w-[140px] text-center",
        "border shadow-sm",
        isValid && "bg-white border-[#e2e8f0]",
        isCancelled && "bg-gray-100 border-gray-300 opacity-60",
        isSkipped && "bg-amber-50 border-amber-300 opacity-60"
      )}>
        {/* Status marker */}
        {isCancelled && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
            Cancelled
          </div>
        )}
        {isSkipped && (
          <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
            Skipped
          </div>
        )}
        
        {/* Coupon ID */}
        <div className="text-xs text-[#64748b] mb-1">{winner.couponId}</div>
        
        {/* Name */}
        <div className="text-lg font-bold text-[#0a2540]">{winner.participantName}</div>
        
        {/* ID */}
        <div className="text-sm text-[#64748b]">{winner.participantId}</div>
      </div>
      
      {/* Cancel Reason - untuk cancelled cards */}
      {isCancelled && winner.cancelReason && (
        <div className="text-xs text-red-500 text-center max-w-[140px]">
          {winner.cancelReason.message}
        </div>
      )}
      
      {/* Cancel Button - OUTSIDE card body, only for valid */}
      {isValid && (
        <button
          onClick={onCancel}
          className="text-xs text-red-500 hover:text-red-700 hover:underline"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
```

---

### 9. Sphere Size - Bigger

**Current:** Sphere masih kurang besar

**Expected:** Sphere lebih besar tapi tetap padat dengan cards

```tsx
// Sphere3D.tsx
const SPHERE_RADIUS = 6; // Perbesar dari sebelumnya

// Camera juga perlu disesuaikan
<Canvas camera={{ position: [0, 0, 12], fov: 60 }}>
```

---

### 10. Footer Controls - Floating (Remove Wrapper)

**Current:** 
```html
<div class="flex flex-col items-center gap-4 py-6 bg-white border-t border-[#e2e8f0]">
  <!-- pagination, buttons -->
</div>
```
Ini membuat area sphere menjadi sempit.

**Expected:** Floating buttons tanpa wrapper, lebih banyak ruang untuk animasi

```tsx
// DrawScreen.tsx - Remove footer wrapper

// BEFORE:
<div className="flex flex-col items-center gap-4 py-6 bg-white border-t border-[#e2e8f0]">
  <Pagination />
  <DrawControls />
</div>

// AFTER:
{/* Floating controls di bagian bawah */}
<div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">
  {/* Pagination - floating */}
  {showPagination && (
    <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-[#e2e8f0]">
      <Pagination />
    </div>
  )}
  
  {/* Action Buttons - floating */}
  <div className="flex gap-4">
    {state === 'idle' && (
      <button className="px-8 py-3 bg-[#635bff] text-white font-medium rounded-full shadow-lg hover:bg-[#524acc]">
        Start Draw
      </button>
    )}
    
    {state === 'spinning' && (
      <button className="px-8 py-3 bg-red-500 text-white font-medium rounded-full shadow-lg hover:bg-red-600">
        Stop
      </button>
    )}
    
    {state === 'reviewing' && hasCancelled && (
      <button className="px-8 py-3 bg-amber-500 text-white font-medium rounded-full shadow-lg hover:bg-amber-600">
        Redraw All
      </button>
    )}
    
    {state === 'reviewing' && !hasCancelled && (
      <button className="px-8 py-3 bg-[#635bff] text-white font-medium rounded-full shadow-lg hover:bg-[#524acc]">
        Confirm
      </button>
    )}
  </div>
</div>
```

**Layout Visual:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  [Prize Panel]                                                  │
│                                                                 │
│                                                                 │
│                      ┌───────────────────┐                      │
│                      │                   │                      │
│                      │                   │                      │
│                      │     SPHERE        │                      │
│                      │  (full viewport)  │                      │
│                      │                   │                      │
│                      │                   │                      │
│                      └───────────────────┘                      │
│                                                                 │
│                                                                 │
│                        [< 1/3 >]              ← Floating        │
│                     [Start Draw]              ← Floating        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary of Changes

| # | Aspect | Change |
|---|--------|--------|
| 1 | Sphere rotation | Horizontal only (Y-axis), instant stop |
| 2 | Card shape | Portrait (height > width) |
| 3 | Card density | More cards (200+) |
| 4 | Card size | Follow reference, proportional |
| 5 | Card color | Transparent with dynamic opacity |
| 6 | Winner position | Centered (justify-center) |
| 7 | Winner styling | Valid=white, Cancelled=gray, Cancel button outside |
| 8 | Cancel reason | Show message why cancelled |
| 9 | Sphere size | Bigger (radius 6) |
| 10 | Controls | Floating, no wrapper |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/draw/SphereMesh.tsx` | Rotation (Y-axis only), instant stop, idle rotation |
| `src/components/draw/SphereCard.tsx` | Card shape (portrait), size, color with dynamic opacity |
| `src/components/draw/Sphere3D.tsx` | Increase radius, camera position |
| `src/components/draw/WinnerCard.tsx` | Styling (valid vs cancelled), cancel button outside, show cancel reason |
| `src/components/draw/WinnerGallery.tsx` | Position centered (justify-center) |
| `src/pages/DrawScreen.tsx` | Remove footer wrapper, floating controls |

---

## Testing Checklist

- [ ] Sphere rotates horizontally only (Y-axis)
- [ ] Sphere instant stop when Stop clicked
- [ ] Sphere slow rotation saat idle
- [ ] Cards on sphere berbentuk portrait
- [ ] Cards on sphere padat (200+)
- [ ] Cards on sphere punya warna transparent dengan dynamic opacity
- [ ] Winner cards centered (no gap in middle)
- [ ] Valid cards: white/clean
- [ ] Cancelled cards: gray dengan badge "Cancelled"
- [ ] Cancel reason ditampilkan
- [ ] Cancel button di luar card body
- [ ] Sphere lebih besar
- [ ] Controls floating tanpa wrapper
