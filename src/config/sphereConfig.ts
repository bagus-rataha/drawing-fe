/**
 * @file config/sphereConfig.ts
 * @description Configuration for the 3D sphere animation on DrawScreen
 * Extracted from utils/constants.ts for readability
 */

export const SPHERE_CONFIG = {
  /** Number of cards displayed on sphere surface */
  cardCount: 140,

  /** Sphere radius in 3D units */
  radius: 6,

  /** Number of horizontal rows for card distribution */
  rows: 11,

  /** Card width in 3D units */
  cardWidth: 0.9,

  /** Card height in 3D units */
  cardHeight: 1.6,

  /** Card background color (hex) */
  cardColor: '#d87da0ff',

  /** Rotation speed when spinning (multiplier) */
  spinSpeed: 8,

  /** Rotation speed when idle (multiplier) */
  idleSpeed: 0.1,

  // ZOOM CONFIG
  zoomMin: 8,
  zoomMax: 20,
  zoomSpeed: 0.5,

  // TEXTURE ATLAS CONFIG
  atlasColumns: 10,
  textureScale: 3,
  atlasCellWidth: 128,
  atlasCellHeight: 64,
  atlasMaxTexts: 100,

  // ANIMATION TIMING CONFIG
  updatePercentPerFrame: 0.02,

  animation: {
    revealInterval: 150,
    revealCompleteDelay: 300,
    confettiDelay: 1000,
    redrawConfettiDelay: 800,
  },

  // FONT SETTINGS
  fontSettings: {
    primaryColor: '#eedbdbff',
    secondaryColor: '#eedbdbff',
    family: '-apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", Arial, sans-serif',
    primarySize: 16,
    secondarySize: 12,
    primaryWeight: 'bold' as const,
  },

  // CARD TRANSITION CONFIG
  cardTransition: {
    minDelay: 500,
    maxDelay: 3000,
    minOpacity: 0.3,
    maxOpacity: 1,
  },
}
