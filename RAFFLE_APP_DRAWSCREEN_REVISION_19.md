# Raffle App - DrawScreen Revision 19

## Issues & Improvements:

| # | Issue/Improvement | Type | Severity |
|---|-------------------|------|----------|
| 1 | Home card: Semua action di dropdown, kecuali Draw button | UI Change | 🟡 Medium |
| 2 | Home card: Button text ketika prize sudah complete | UI Change | 🟡 Medium |
| 3 | Sphere config: Kecepatan opacity & coupon detail dalam 1 config | Refactor | 🟢 Low |
| 4 | Redraw: Tampilkan animasi + confetti untuk kupon yang di-redraw | Enhancement | 🟡 Medium |
| 5 | Confetti: Frame rate drop saat muncul | Performance | 🔴 Critical |
| 6 | Sphere card: Text coupon blurry/pixelated | Visual Bug | 🔴 Critical |

---

## WAJIB: Analisis Dulu, Fix Kemudian

```
┌─────────────────────────────────────────────────────────────────┐
│  LANGKAH WAJIB:                                                  │
│                                                                  │
│  1. TAMPILKAN CODE YANG RELEVAN                                  │
│  2. TRACE FLOW / IDENTIFY ROOT CAUSE                             │
│  3. PROPOSE FIX                                                  │
│  4. TUNGGU APPROVAL sebelum implementasi                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Issue 1: Home Card - Action di Dropdown

### Current:
```
┌─────────────────────────────────────┐
│  Event Name                         │
│  Draft | 5 Prizes | 1000 Coupons    │
│                                     │
│  🎲 Draw   ✏️ Edit   ⋮ More         │  ← Icons di body card
└─────────────────────────────────────┘
```

### Expected:
```
┌─────────────────────────────────────┐
│  Event Name                       ⋮ │  ← Dropdown di pojok kanan atas
│  Draft | 5 Prizes | 1000 Coupons    │
│                                     │
│  Created: 2025-01-15                │
│                                     │
│  [🎲 Start Draw]                    │  ← Hanya Draw button di body
└─────────────────────────────────────┘

⋮ Dropdown menu:
├── 📄 Detail
├── 📋 History
├── ✏️ Edit
├── 🗑️ Delete
└── 📤 Export
```

### Analisa yang Diperlukan:
1. Tampilkan current EventCard component
2. Identify struktur layout saat ini
3. Refactor untuk memindahkan actions ke dropdown

---

## Issue 2: Button Text Ketika Prize Complete

### Current (Masalah):
Ketika semua prize sudah habis, button masih menampilkan "Resume Draw" atau "Start Draw"

### Expected:
| Status | Prize Status | Button |
|--------|--------------|--------|
| draft | - | [🎲 Start Draw] |
| ready | Has remaining | [🎲 Start Draw] |
| in_progress | Has remaining | [🎲 Resume Draw] |
| in_progress | All complete | [✓ Drawing Complete] (disabled/styled differently) |
| completed | All complete | Tidak ada button Draw, atau [✓ Completed] |

### Logic:
```typescript
const allPrizesComplete = prizes.every(p => p.drawnCount >= p.quantity)

if (allPrizesComplete) {
  // Show "Drawing Complete" atau hide button
} else if (status === 'in_progress') {
  // Show "Resume Draw"
} else {
  // Show "Start Draw"
}
```

---

## Issue 3: Sphere Config - Opacity & Coupon Detail Speed

### Current:
Kecepatan pergantian opacity dan coupon detail mungkin terpisah di berbagai tempat.

### Expected:
Semua timing/speed config ada dalam 1 file sphere config:

```typescript
// sphereConfig.ts
export const sphereConfig = {
  // ... existing config
  
  animation: {
    // Card opacity transition
    cardOpacityDuration: 300,      // ms
    cardOpacityInterval: 100,      // ms between changes
    
    // Coupon detail text cycling
    couponCycleSpeed: 50,          // ms per coupon change
    couponCycleDuration: 2000,     // total cycle time before stopping
    
    // Spin animation
    spinSpeed: 0.02,
    spinDeceleration: 0.98,
  }
}
```

### Analisa yang Diperlukan:
1. Cari semua tempat yang define animation timing
2. Consolidate ke sphere config
3. Update references

---

## Issue 4: Redraw - Animasi + Confetti

### Current:
Saat redraw, kupon baru muncul tanpa animasi/confetti.

### Expected:
Saat redraw:
1. Kupon yang di-redraw menampilkan animasi reveal (sama seperti draw pertama)
2. Confetti muncul untuk celebrate winner baru

### Analisa yang Diperlukan:
1. Tampilkan flow redraw saat ini
2. Identify dimana animasi di-trigger saat draw
3. Replicate untuk redraw

---

## Issue 5: Confetti Performance - Frame Rate Drop

### Problem:
- Saat confetti muncul, browser laggy
- Frame rate drop signifikan
- Normal kembali setelah confetti hampir hilang

### Kemungkinan Root Cause:
1. **Terlalu banyak particles** - jumlah confetti terlalu banyak
2. **DOM elements** - jika confetti pakai DOM bukan canvas
3. **No particle pooling** - create/destroy terus menerus
4. **Heavy physics calculation** - gravity, wind effect terlalu complex
5. **No FPS limiting** - render setiap frame tanpa throttle

### Analisa yang Diperlukan:
1. Tampilkan confetti implementation (library atau custom?)
2. Check jumlah particles
3. Check render method (canvas vs DOM)
4. Identify bottleneck

### Possible Fixes:
```typescript
// Option A: Reduce particle count
confettiConfig = {
  particleCount: 50,  // reduce dari 100+ ke 50
}

// Option B: Use canvas instead of DOM
// Library seperti canvas-confetti lebih performant

// Option C: Limit particle lifetime
confettiConfig = {
  particleCount: 30,
  ticks: 100,  // particle lifetime - shorter = less lag
}

// Option D: Disable on low-end devices
if (navigator.hardwareConcurrency <= 4) {
  confettiConfig.particleCount = 20
}
```

---

## Issue 6: Sphere Card Text Blurry/Pixelated

### Problem:
Text coupon detail pada card di dalam sphere terlihat blurry/pixelated, tidak seperti text normal.

### Kemungkinan Root Cause:

**1. Canvas resolution tidak match device pixel ratio**
```typescript
// MASALAH: Canvas size tidak account for devicePixelRatio
canvas.width = 300
canvas.height = 200

// FIX: Scale canvas untuk retina display
const dpr = window.devicePixelRatio || 1
canvas.width = 300 * dpr
canvas.height = 200 * dpr
canvas.style.width = '300px'
canvas.style.height = '200px'
context.scale(dpr, dpr)
```

**2. Three.js texture resolution terlalu rendah**
```typescript
// MASALAH: Texture size kecil
const texture = new THREE.CanvasTexture(canvas)

// FIX: Increase texture size
canvas.width = 512  // atau 1024 untuk sharper text
canvas.height = 256
```

**3. Texture filtering**
```typescript
// FIX: Use appropriate texture filtering
texture.minFilter = THREE.LinearFilter
texture.magFilter = THREE.LinearFilter
texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
```

**4. Font rendering pada canvas**
```typescript
// FIX: Better font rendering
context.imageSmoothingEnabled = true
context.imageSmoothingQuality = 'high'
context.font = '600 24px -apple-system, BlinkMacSystemFont, sans-serif'
```

### Analisa yang Diperlukan:
1. Tampilkan bagaimana card/text di-render di sphere
2. Check canvas resolution
3. Check texture settings
4. Identify render pipeline

---

## Execution Priority

```
1. Issue #6 (Text blurry) - Visual quality, user-facing
       ↓
2. Issue #5 (Confetti performance) - Performance critical
       ↓
3. Issue #1 (Dropdown layout) - UI consistency
       ↓
4. Issue #2 (Button text) - UI polish
       ↓
5. Issue #4 (Redraw animation) - Enhancement
       ↓
6. Issue #3 (Sphere config) - Refactor/cleanup
```

---

## Testing Checklist

### Issue #1 & #2 (Home Card):
- [ ] Dropdown di pojok kanan atas card
- [ ] Hanya Draw button di body card
- [ ] Detail, History, Edit, Delete, Export di dropdown
- [ ] Button text sesuai status (Start Draw / Resume Draw / Drawing Complete)
- [ ] Ketika all prizes complete, tidak show "Resume Draw"

### Issue #3 (Sphere Config):
- [ ] Semua animation timing di 1 file config
- [ ] Perubahan config reflected di animation

### Issue #4 (Redraw Animation):
- [ ] Redraw trigger animation reveal
- [ ] Confetti muncul setelah redraw

### Issue #5 (Confetti Performance):
- [ ] No frame rate drop saat confetti
- [ ] Smooth animation throughout

### Issue #6 (Text Clarity):
- [ ] Text pada sphere card sharp/clear
- [ ] Readable seperti text normal
- [ ] Test di retina dan non-retina display
