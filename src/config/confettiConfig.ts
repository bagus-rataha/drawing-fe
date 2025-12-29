/**
 * @file config/confettiConfig.ts
 * @description Centralized confetti configuration with full documentation
 *
 * FIX (Rev 20): Moved all confetti settings to dedicated config file
 */

// ═══════════════════════════════════════════════════════════════
// MAIN CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const confettiConfig = {
  // ─────────────────────────────────────────────────────────────
  // PARTICLE COUNT - Jumlah confetti
  // ─────────────────────────────────────────────────────────────

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
  particleCount: 100,

  // ─────────────────────────────────────────────────────────────
  // SPREAD & DIRECTION - Arah dan penyebaran
  // ─────────────────────────────────────────────────────────────

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
  spread: 80,

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

  // ─────────────────────────────────────────────────────────────
  // ORIGIN - Titik awal confetti
  // ─────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────
  // PHYSICS - Kecepatan dan gravitasi
  // ─────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────
  // LIFETIME - Berapa lama confetti bertahan
  // ─────────────────────────────────────────────────────────────

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
  ticks: 250,

  // ─────────────────────────────────────────────────────────────
  // APPEARANCE - Tampilan visual
  // ─────────────────────────────────────────────────────────────

  /**
   * colors (string[])
   * ─────────────────
   * Array warna confetti dalam format hex.
   * Partikel akan random memilih dari warna-warna ini.
   *
   * Default: brand colors
   */
  colors: [
    '#635bff', // Primary purple
    '#524acc', // Dark purple
    '#ffd700', // Gold
    '#ff6b6b', // Coral red
    '#4ecdc4', // Teal
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
  shapes: ['square', 'circle'] as ('square' | 'circle')[],

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
  scalar: 1.2,

  // ─────────────────────────────────────────────────────────────
  // CONTINUOUS EFFECT - Untuk efek berkelanjutan (side bursts)
  // ─────────────────────────────────────────────────────────────

  /**
   * continuous.duration (number, ms)
   * ────────────────────────────────
   * Durasi total efek confetti berkelanjutan.
   *
   * Default: 2000
   */
  continuousDuration: 2500,

  /**
   * continuous.interval (number, ms)
   * ─────────────────────────────────
   * Interval antar burst saat mode continuous.
   * Lebih tinggi = lebih sedikit burst = lebih ringan.
   *
   * Default: 50
   */
  continuousInterval: 50,

  /**
   * continuous.particleCount (number)
   * ──────────────────────────────────
   * Jumlah partikel per burst saat mode continuous.
   * Lebih kecil dari burst biasa untuk performa.
   *
   * Default: 3
   */
  continuousParticleCount: 20,

  // ─────────────────────────────────────────────────────────────
  // BURST EFFECT - Untuk single burst (center explosion)
  // ─────────────────────────────────────────────────────────────

  /**
   * burst.particleCount (number)
   * ────────────────────────────
   * Jumlah partikel untuk single burst di tengah layar.
   *
   * Default: 50
   */
  burstParticleCount: 100,

  /**
   * burst.spread (number)
   * ─────────────────────
   * Spread untuk single burst.
   *
   * Default: 70
   */
  burstSpread: 70,

  /**
   * burst.startVelocity (number)
   * ────────────────────────────
   * Kecepatan awal untuk single burst.
   *
   * Default: 35
   */
  burstStartVelocity: 35,

  /**
   * burst.ticks (number)
   * ────────────────────
   * Lifetime untuk single burst particles.
   *
   * Default: 150
   */
  burstTicks: 180,

  // ─────────────────────────────────────────────────────────────
  // TECHNICAL - Pengaturan teknis
  // ─────────────────────────────────────────────────────────────

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

export type ConfettiPreset = keyof typeof confettiPresets
