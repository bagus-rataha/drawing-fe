# Raffle App - DrawScreen Revision 20

## Issues & Improvements:

| # | Issue/Improvement | Type | Severity |
|---|-------------------|------|----------|
| 1 | Text sphere semakin blurry setelah fix sebelumnya | Bug | 🔴 Critical |
| 2 | Animasi redraw: hanya cancelled coupon saja, bukan semua | Fix | 🟡 Medium |
| 3 | Confetti config: pindah ke 1 file + dokumentasi | Refactor | 🟡 Medium |
| 4 | Sphere card transition: config min/max delay + opacity | Enhancement | 🟡 Medium |

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

## Issue 1: Text Sphere HARUS JELAS (PRIORITAS UTAMA!)

### ⚠️ INI ADALAH PRIORITAS TERTINGGI - HARUS DISELESAIKAN PERTAMA!

### Problem:
Text pada card di dalam sphere terlihat **blurry/pixelated/tidak jelas**. 
Text harus terlihat **tajam dan readable**.

### Current State:
- Text susah dibaca
- Terlihat pixelated/blur
- Fix sebelumnya (Rev 19) malah memperburuk

### Expected:
- Text **TAJAM** dan **JELAS**
- Readable di berbagai zoom level

### Pendekatan yang Disepakati: Perbaiki Texture Resolution

**TETAP GUNAKAN Canvas Texture Atlas** (approach saat ini), tapi tingkatkan kualitasnya.

### Langkah Fix:

1. **REVERT** perubahan Rev 19 yang memperburuk
2. **ANALYZE** current texture creation code
3. **FIX** dengan meningkatkan resolusi texture

### Implementation:

```typescript
// src/utils/textureAtlas.ts

// ❶ INCREASE TEXTURE SCALE
const TEXTURE_SCALE = 3  // Coba 3 dulu, jika masih blur naikkan ke 4

// ❷ CREATE HIGH-RES CANVAS
const canvas = document.createElement('canvas')
canvas.width = cellWidth * cols * TEXTURE_SCALE
canvas.height = cellHeight * rows * TEXTURE_SCALE

const ctx = canvas.getContext('2d')!

// ❸ SCALE CONTEXT (draw at original size, canvas handles resolution)
ctx.scale(TEXTURE_SCALE, TEXTURE_SCALE)

// ❹ ENABLE SMOOTHING
ctx.imageSmoothingEnabled = true
ctx.imageSmoothingQuality = 'high'

// ❺ USE PROPER FONT
ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif`

// ❻ DRAW TEXT
ctx.fillStyle = textColor
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillText(text, x, y)

// ❼ CREATE TEXTURE WITH PROPER SETTINGS
const texture = new THREE.CanvasTexture(canvas)
texture.minFilter = THREE.LinearFilter
texture.magFilter = THREE.LinearFilter
texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
texture.generateMipmaps = false  // Disable untuk sharp text
texture.needsUpdate = true
```

### Config untuk Quality Tuning:

```typescript
// src/utils/constants.ts - SPHERE_CONFIG

textureScale: 3,          // Multiplier resolusi (higher = sharper, heavier)
atlasCellWidth: 128,      // Cell width (pixels, before scale)
atlasCellHeight: 64,      // Cell height (pixels, before scale)
```

### ⚠️ Catatan:
Jika setelah eksekusi **masih blur**, akan di-inform untuk revisi selanjutnya.

### Testing Checklist:
- [ ] Text readable saat sphere idle
- [ ] Text tidak lebih buruk dari sebelum Rev 19
- [ ] Performance tetap smooth (60fps)

---

## Issue 2: Animasi Redraw - Hanya Cancelled Coupon

### Current (Salah):
Saat redraw, SEMUA coupon di-animasikan ulang.

### Expected:
Saat redraw, HANYA coupon yang cancelled yang di-animasikan (reveal + confetti).

### Analisa yang Diperlukan:
1. **Tampilkan** flow redraw animation saat ini
2. **Identify** bagaimana animation di-trigger
3. **Filter** untuk hanya animate cancelled positions

### Expected Flow:
```
Batch: [valid, valid, cancelled, valid, cancelled]
                      ↑                 ↑
               Posisi 3            Posisi 5
                      ↓                 ↓
Redraw → Hanya animasikan posisi 3 dan 5
       → Posisi lain (1, 2, 4) tetap static/tidak berubah
```

### Implementation Hint:
```typescript
// Saat redraw complete
const redrawResults = await drawService.redrawAll(...)

// Identify posisi yang di-redraw
const redrawPositions = redrawResults.map(r => r.lineNumber)

// Trigger animation hanya untuk posisi tersebut
animateWinners(redrawPositions)  // bukan animateAllWinners()
```

---

## Issue 3: Confetti Config - Consolidate + Dokumentasi Lengkap

### Expected Config File:

```typescript
// src/config/confettiConfig.ts

export const confettiConfig = {
  
  // ═══════════════════════════════════════════════════════════════
  // PARTICLE COUNT - Jumlah confetti
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * particleCount (number)
   * ──────────────────────
   * Jumlah partikel confetti yang di-spawn setiap kali trigger.
   * 
   * 20-30   → Subtle/minimal (ringan, tidak mencolok)
   * 50-80   → Normal celebration (balance antara meriah dan performa)
   * 100-150 → Grand celebration (meriah tapi bisa lag di device lemah)
   * 200+    → TIDAK DISARANKAN (akan menyebabkan lag)
   * 
   * Tips: Jika lag, kurangi nilai ini terlebih dahulu.
   * 
   * Default: 60
   */
  particleCount: 60,

  // ═══════════════════════════════════════════════════════════════
  // SPREAD & DIRECTION - Arah dan penyebaran
  // ═══════════════════════════════════════════════════════════════

  /**
   * spread (number, dalam derajat)
   * ──────────────────────────────
   * Sudut penyebaran confetti dari titik origin.
   * 
   * 30-60   → Narrow (seperti fountain, fokus ke satu arah)
   * 70-90   → Medium (penyebaran sedang)
   * 120-180 → Wide (menyebar ke semua arah)
   * 
   * Default: 70
   */
  spread: 70,

  /**
   * angle (number, dalam derajat)
   * ─────────────────────────────
   * Sudut arah utama peluncuran confetti.
   * 
   * 90  → Ke atas (default, seperti ledakan ke atas)
   * 0   → Ke kanan
   * 180 → Ke kiri
   * 270 → Ke bawah
   * 
   * Default: 90
   */
  angle: 90,

  // ═══════════════════════════════════════════════════════════════
  // ORIGIN - Titik awal confetti
  // ═══════════════════════════════════════════════════════════════

  /**
   * originX (number, range 0-1)
   * ───────────────────────────
   * Posisi horizontal titik awal confetti.
   * 
   * 0   → Paling kiri layar
   * 0.5 → Tengah layar (default)
   * 1   → Paling kanan layar
   * 
   * Default: 0.5
   */
  originX: 0.5,

  /**
   * originY (number, range 0-1)
   * ───────────────────────────
   * Posisi vertikal titik awal confetti.
   * 
   * 0   → Paling atas layar
   * 0.5 → Tengah layar
   * 0.7 → Bawah tengah (default, efek "meledak dari bawah")
   * 1   → Paling bawah layar
   * 
   * Default: 0.7
   */
  originY: 0.7,

  // ═══════════════════════════════════════════════════════════════
  // PHYSICS - Kecepatan dan gravitasi
  // ═══════════════════════════════════════════════════════════════

  /**
   * startVelocity (number)
   * ──────────────────────
   * Kecepatan awal peluncuran partikel.
   * 
   * 15-25 → Lambat (efek gentle/soft)
   * 30-45 → Normal (energetic)
   * 50+   → Cepat (explosive, tapi cepat hilang dari layar)
   * 
   * Default: 30
   */
  startVelocity: 30,

  /**
   * gravity (number)
   * ────────────────
   * Kekuatan gravitasi yang mempengaruhi partikel.
   * 
   * 0.3-0.5 → Light gravity (partikel melayang/floaty)
   * 0.8-1.2 → Normal gravity (realistis)
   * 1.5-2   → Heavy gravity (cepat jatuh)
   * 
   * Default: 1
   */
  gravity: 1,

  /**
   * decay (number, range 0.8-1)
   * ───────────────────────────
   * Rate pelambatan partikel setiap frame.
   * Semakin mendekati 1, semakin lambat partikel berhenti.
   * 
   * 0.85-0.90 → Cepat melambat (partikel cepat berhenti)
   * 0.91-0.95 → Normal
   * 0.96-0.99 → Lambat melambat (partikel melayang lama)
   * 
   * Default: 0.94
   */
  decay: 0.94,

  // ═══════════════════════════════════════════════════════════════
  // LIFETIME - Berapa lama confetti bertahan
  // ═══════════════════════════════════════════════════════════════

  /**
   * ticks (number)
   * ──────────────
   * Jumlah frame/tick sebelum partikel menghilang.
   * Semakin tinggi, semakin lama confetti bertahan di layar.
   * 
   * 100-150 → Short (cepat hilang, ringan di performa)
   * 200-250 → Normal
   * 300-400 → Long (confetti bertahan lama)
   * 
   * Tips: Jika lag, kurangi nilai ini.
   * 
   * Default: 200
   */
  ticks: 200,

  // ═══════════════════════════════════════════════════════════════
  // APPEARANCE - Tampilan visual
  // ═══════════════════════════════════════════════════════════════

  /**
   * colors (string[])
   * ─────────────────
   * Array warna confetti dalam format hex.
   * Partikel akan random memilih dari warna-warna ini.
   * 
   * Default: rainbow colors
   */
  colors: [
    '#ff0000',  // Red
    '#00ff00',  // Green
    '#0000ff',  // Blue
    '#ffff00',  // Yellow
    '#ff00ff',  // Magenta
    '#00ffff',  // Cyan
    '#ffa500',  // Orange
    '#ff69b4',  // Pink
  ],

  /**
   * shapes (string[])
   * ─────────────────
   * Bentuk partikel confetti.
   * 
   * Options: 'square', 'circle', 'star'
   * Bisa kombinasi: ['square', 'circle']
   * 
   * Default: ['square', 'circle']
   */
  shapes: ['square', 'circle'],

  /**
   * scalar (number)
   * ───────────────
   * Ukuran partikel (multiplier).
   * 
   * 0.5-0.8 → Kecil (subtle)
   * 1       → Normal
   * 1.2-1.5 → Besar (lebih terlihat)
   * 
   * Default: 1
   */
  scalar: 1,

  // ═══════════════════════════════════════════════════════════════
  // TECHNICAL - Pengaturan teknis
  // ═══════════════════════════════════════════════════════════════

  /**
   * zIndex (number)
   * ───────────────
   * Z-index canvas confetti.
   * Pastikan lebih tinggi dari element lain agar confetti terlihat di atas.
   * 
   * Default: 9999
   */
  zIndex: 9999,

  /**
   * disableForReducedMotion (boolean)
   * ─────────────────────────────────
   * Jika true, confetti tidak akan muncul untuk user yang enable
   * "reduced motion" di accessibility settings.
   * 
   * Default: true
   */
  disableForReducedMotion: true,
}

// ═══════════════════════════════════════════════════════════════
// PRESETS - Kombinasi siap pakai
// ═══════════════════════════════════════════════════════════════

export const confettiPresets = {
  /**
   * Subtle - Untuk celebration ringan
   */
  subtle: {
    particleCount: 30,
    spread: 50,
    startVelocity: 25,
    ticks: 150,
    scalar: 0.8,
  },

  /**
   * Normal - Default celebration
   */
  normal: {
    particleCount: 60,
    spread: 70,
    startVelocity: 30,
    ticks: 200,
    scalar: 1,
  },

  /**
   * Grand - Untuk big celebration (perhatikan performa)
   */
  grand: {
    particleCount: 100,
    spread: 90,
    startVelocity: 40,
    ticks: 250,
    scalar: 1.2,
  },

  /**
   * Winner - Gold themed untuk pemenang
   */
  winner: {
    particleCount: 80,
    spread: 80,
    startVelocity: 35,
    ticks: 200,
    colors: ['#FFD700', '#FFA500', '#FFDF00', '#F0E68C', '#DAA520'],
    scalar: 1.1,
  },
}
```

---

## Issue 4: Sphere Card Transition Config

### Current Code (InstancedCards.tsx:266-295):

```typescript
useFrame(() => {
  // Update 2% cards per frame (2-3 dari 125 cards)
  const updateCount = Math.ceil(count * SPHERE_CONFIG.updatePercentPerFrame)

  for (let i = 0; i < updateCount; i++) {
    const randomIndex = Math.floor(Math.random() * count)

    // ❶ OPACITY - hardcoded range 0.4-0.9
    opacities[randomIndex] = 0.4 + Math.random() * 0.5

    // ❷ COUPON SWITCH - sync dengan opacity (langsung ganti, tidak ada delay)
    const newCouponIndex = Math.floor(Math.random() * atlasCoupons.length)
    uvOffsets[randomIndex * 2] = col * atlas.cellUVWidth
    uvOffsets[randomIndex * 2 + 1] = row * atlas.cellUVHeight
  }
})
```

### Current Behavior:

| Aspek | Nilai | Keterangan |
|-------|-------|------------|
| Update Rate | 2% cards/frame | ~2-3 cards dari 125 setiap 16ms (60fps) |
| Opacity Range | 0.4 - 0.9 | **Hardcoded**, tidak ada config |
| Delay per Card | **Tidak ada** | Card dipilih random setiap frame |

### Problem:
1. Opacity range **hardcoded** (0.4-0.9)
2. **Tidak ada delay control** - tidak bisa atur berapa lama coupon tampil
3. Timing tidak natural - card dipilih random, bukan berdasarkan waktu tampil

### Expected Behavior:

```
Card "John" (opacity: 0.7 random)
        ↓
Tunggu 200ms (random antara minDelay-maxDelay)
        ↓
INSTANT ganti ke "Jane" (opacity: 0.2 random baru)
        ↓
Tunggu 350ms (random delay baru)
        ↓
INSTANT ganti ke "Bob" (opacity: 0.8 random baru)
        ↓
dst...
```

**Key Points:**
- **BUKAN fade/gradual transition**
- Setiap card punya **delay sendiri** (random)
- Saat delay habis → **instant switch** coupon + opacity baru (random)

### Expected Config:

```typescript
// src/utils/constants.ts - tambahkan ke SPHERE_CONFIG

export const SPHERE_CONFIG = {
  // ... existing config ...

  cardTransition: {
    /**
     * minDelay (ms)
     * Waktu MINIMUM sebuah coupon ditampilkan sebelum berganti.
     * 
     * Default: 500
     */
    minDelay: 500,

    /**
     * maxDelay (ms)  
     * Waktu MAXIMUM sebuah coupon ditampilkan sebelum berganti.
     * Delay aktual = random(minDelay, maxDelay)
     * 
     * Default: 3000
     */
    maxDelay: 3000,

    /**
     * minOpacity (0-1)
     * Batas BAWAH opacity random.
     * 
     * Default: 0.3
     */
    minOpacity: 0.3,

    /**
     * maxOpacity (0-1)
     * Batas ATAS opacity random.
     * 
     * Default: 0.9
     */
    maxOpacity: 0.9,
  },
}
```

### Implementation Approach:

```typescript
// Track timing per card
const lastUpdateTime = useRef<Float32Array>(new Float32Array(count))
const nextDelay = useRef<Float32Array>(new Float32Array(count))

// Initialize dengan random values
useEffect(() => {
  const { minDelay, maxDelay, minOpacity, maxOpacity } = SPHERE_CONFIG.cardTransition
  const now = performance.now()
  
  for (let i = 0; i < count; i++) {
    // Stagger start times agar tidak semua card ganti bersamaan
    lastUpdateTime.current[i] = now - Math.random() * maxDelay
    nextDelay.current[i] = minDelay + Math.random() * (maxDelay - minDelay)
    opacities[i] = minOpacity + Math.random() * (maxOpacity - minOpacity)
  }
}, [count])

useFrame(() => {
  const now = performance.now()
  const { minDelay, maxDelay, minOpacity, maxOpacity } = SPHERE_CONFIG.cardTransition
  let needsUpdate = false

  // Cek setiap card apakah delay-nya sudah habis
  for (let i = 0; i < count; i++) {
    const elapsed = now - lastUpdateTime.current[i]
    
    if (elapsed >= nextDelay.current[i]) {
      // INSTANT switch: coupon + opacity baru
      
      // New random opacity
      opacities[i] = minOpacity + Math.random() * (maxOpacity - minOpacity)
      
      // New random coupon
      const newIndex = Math.floor(Math.random() * atlasCoupons.length)
      const col = newIndex % atlas.cols
      const row = Math.floor(newIndex / atlas.cols)
      uvOffsets[i * 2] = col * atlas.cellUVWidth
      uvOffsets[i * 2 + 1] = row * atlas.cellUVHeight
      
      // Reset timer dengan delay baru
      lastUpdateTime.current[i] = now
      nextDelay.current[i] = minDelay + Math.random() * (maxDelay - minDelay)
      
      needsUpdate = true
    }
  }

  if (needsUpdate) {
    opacityAttr.needsUpdate = true
    uvOffsetAttr.needsUpdate = true
  }
})
```

### Visual Timeline (3 cards example):

```
Time(ms):  0    200   400   600   800   1000  1200  1400
           │     │     │     │     │     │     │     │
Card 0:    ●─────────────────●─────────────────────●────
           John (0.7)        Jane (0.3)            Bob (0.8)
           
Card 1:    ●───────●─────────────────●──────────────────
           Alice   Carol            Derek
           (0.4)   (0.6)            (0.5)
           
Card 2:    ●─────────────●─────────────────────●────────
           Eve          Frank                  Grace
           (0.9)        (0.2)                  (0.7)

● = Instant switch (coupon + opacity berubah)
─ = Card visible dengan opacity tersebut
```

### Performance Note:

⚠️ **JIKA PERFORMANCE BERAT, AKAN DI-REVERT KE APPROACH LAMA**

| Approach | Loop/frame | Estimated Load |
|----------|------------|----------------|
| Current (2% random) | 2-3 cards | Sangat ringan |
| New (check all) | 125 cards | Ringan (hanya comparison) |

Secara teori 125 simple comparisons per frame seharusnya tidak terasa.
Tapi jika ternyata berat → revert ke approach lama di revision berikutnya.

### Contoh Config Values:

| Efek | minDelay | maxDelay | minOpacity | maxOpacity |
|------|----------|----------|------------|------------|
| Cepat & dramatis | 200 | 800 | 0.2 | 1.0 |
| Normal | 500 | 2000 | 0.3 | 0.9 |
| Lambat & subtle | 1000 | 4000 | 0.5 | 0.8 |
| Sangat cepat | 50 | 200 | 0.3 | 1.0 |

---

## Execution Priority

```
🔴 PRIORITAS UTAMA - HARUS SELESAI DULU:
════════════════════════════════════════
1. Issue #1 (Text HARUS JELAS) 
   - Revert perubahan Rev 19
   - Implementasi CSS3DRenderer atau High-Res Canvas
   - Test sampai text tajam seperti web biasa
   
════════════════════════════════════════
Setelah Issue #1 selesai:

2. Issue #4 (Transition config min/max delay + opacity)
       ↓
3. Issue #3 (Confetti config + dokumentasi)
       ↓
4. Issue #2 (Redraw animation hanya cancelled)
```

---

## Testing Checklist

### Issue #1 (Text Clarity):
- [ ] Text pada sphere card tajam dan readable
- [ ] Test di berbagai device/screen
- [ ] Tidak lebih buruk dari sebelum Rev 19

### Issue #2 (Redraw Animation):
- [ ] Hanya cancelled position yang di-animasikan
- [ ] Valid winners tetap static
- [ ] Confetti hanya untuk newly drawn

### Issue #3 (Confetti Config):
- [ ] Semua config di 1 file
- [ ] Dokumentasi lengkap untuk setiap key
- [ ] Confetti amount balanced (tidak terlalu sedikit/banyak)
- [ ] Tidak lag

### Issue #4 (Transition Config):
- [ ] Min/max delay berfungsi (card tampil selama waktu random)
- [ ] Opacity random setiap ganti coupon
- [ ] Instant switch (bukan fade)
- [ ] Config dapat di-adjust dari 1 file
- [ ] Performance tidak berat (jika berat, revert)
