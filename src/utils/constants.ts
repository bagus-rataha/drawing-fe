/**
 * @file utils/constants.ts
 * @description Named constants for the Lottery App
 *
 * Contains all magic numbers, default values, and configuration constants.
 * Using named constants improves code readability and maintainability.
 */

// ============================================
// DATABASE CONSTANTS
// ============================================

/** Current database version for Dexie migrations */
export const DB_VERSION = 5

/** Database name */
export const DB_NAME = 'LotteryAppDB'

// ============================================
// IMPORT CONSTANTS
// ============================================

/** Required columns in Excel import */
export const REQUIRED_IMPORT_COLUMNS = ['coupon_id', 'participant_id'] as const

/** Optional standard columns in Excel import */
export const OPTIONAL_IMPORT_COLUMNS = [
  'participant_name',
  'email',
  'phone',
  'department',
  'region',
] as const

/** Maximum file size for Excel import (10MB) */
export const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024

/** Supported Excel file extensions */
export const SUPPORTED_EXCEL_EXTENSIONS = ['.xlsx', '.xls'] as const

/** Default coupon weight */
export const DEFAULT_COUPON_WEIGHT = 1

// ============================================
// DRAW CONSTANTS
// ============================================

/** Maximum batch size for drawing */
export const MAX_BATCH_SIZE = 100

/** Default animation duration in milliseconds */
export const ANIMATION_DURATION_MS = 3000

/** Minimum time between draws in milliseconds */
export const MIN_DRAW_INTERVAL_MS = 500

// ============================================
// UI CONSTANTS
// ============================================

/** Number of events per page in home list */
export const EVENTS_PER_PAGE = 10

/** Number of winners per page in history */
export const WINNERS_PER_PAGE = 50

/** Toast notification duration in milliseconds */
export const TOAST_DURATION_MS = 5000

/** Debounce delay for search input in milliseconds */
export const SEARCH_DEBOUNCE_MS = 300

// ============================================
// WIZARD CONSTANTS
// ============================================

/** Total number of steps in the event wizard */
export const WIZARD_TOTAL_STEPS = 5

/** Step labels for the wizard */
export const WIZARD_STEP_LABELS = [
  'Event Info',
  'Prizes',
  'Participants',
  'Display',
  'Review',
] as const

// ============================================
// DEFAULT VALUES
// ============================================

/** Default win rule configuration */
export const DEFAULT_WIN_RULE = {
  type: 'one-time' as const,
  maxWins: 1,
}

/** Default display settings */
export const DEFAULT_DISPLAY_SETTINGS = {
  animationType: '3d-sphere' as const,
  winnerDisplayMode: 'coupon-only' as const,
  customFieldsToShow: [] as string[],
  gridX: 5,
  gridY: 2,
}

/** Default draw configuration */
export const DEFAULT_DRAW_CONFIG = {
  mode: 'all-at-once' as const,
  batches: [] as number[],
}

/** Default event info for new events */
export const DEFAULT_EVENT_INFO = {
  name: '',
  description: '',
  startDate: null as Date | null,
  endDate: null as Date | null,
  winRuleType: 'one-time' as const,
  maxWins: 1,
}

// ============================================
// VALIDATION CONSTANTS
// ============================================

/** Maximum event name length */
export const MAX_EVENT_NAME_LENGTH = 100

/** Maximum event description length */
export const MAX_EVENT_DESCRIPTION_LENGTH = 500

/** Maximum prize name length */
export const MAX_PRIZE_NAME_LENGTH = 100

/** Minimum prize quantity */
export const MIN_PRIZE_QUANTITY = 1

/** Maximum prize quantity */
export const MAX_PRIZE_QUANTITY = 10000

/** Maximum limited wins value */
export const MAX_LIMITED_WINS = 100

// ============================================
// STATUS LABELS
// ============================================

/** Human-readable labels for event statuses */
export const EVENT_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  ready: 'Ready',
  in_progress: 'In Progress',
  completed: 'Completed',
}

/** Human-readable labels for win rule types */
export const WIN_RULE_LABELS: Record<string, string> = {
  'one-time': 'One-time Win',
  limited: 'Limited Wins',
  unlimited: 'Unlimited',
}

/** Human-readable labels for draw modes */
export const DRAW_MODE_LABELS: Record<string, string> = {
  'all-at-once': 'All at Once',
  batch: 'In Batches',
  'one-by-one': 'One by One',
}

/** Human-readable labels for winner display modes */
export const WINNER_DISPLAY_MODE_LABELS: Record<string, string> = {
  'coupon-only': 'Coupon ID only',
  'coupon-participant-id': 'Coupon ID + Participant ID',
  'coupon-participant-name': 'Coupon ID + Participant Name',
}

// ============================================
// COLOR CONSTANTS
// ============================================

/** Colors for event status badges */
export const EVENT_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  ready: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
}

// ============================================
// SPHERE 3D ANIMATION CONFIG
// ============================================

/** Configuration for the 3D sphere animation on DrawScreen */
export const SPHERE_CONFIG = {
  /** Number of cards displayed on sphere surface */
  cardCount: 125,

  /** Sphere radius in 3D units */
  radius: 6,

  /** Number of horizontal rows for card distribution */
  rows: 10,

  /** Card width in 3D units */
  cardWidth: 0.9,

  /** Card height in 3D units */
  cardHeight: 1.5,

  /** Card background color (hex) */
  cardColor: '#e8b4c8',

  /** Rotation speed when spinning (multiplier) */
  spinSpeed: 8,

  /** Rotation speed when idle (multiplier) */
  idleSpeed: 0.1,

  // ============================================
  // ZOOM CONFIG
  // ============================================

  /** Minimum camera distance (closest zoom) */
  zoomMin: 8,

  /** Maximum camera distance (farthest zoom) */
  zoomMax: 20,

  /** Zoom speed/sensitivity */
  zoomSpeed: 0.5,

  // ============================================
  // TEXTURE ATLAS CONFIG
  // ============================================

  /** Number of columns in texture atlas */
  atlasColumns: 10,

  /** Width of each cell in atlas (pixels) */
  atlasCellWidth: 128,

  /** Height of each cell in atlas (pixels) */
  atlasCellHeight: 64,

  /** Maximum number of texts to include in atlas */
  atlasMaxTexts: 100,

  /** Percentage of cards to update per frame (0.02 = 2%) */
  updatePercentPerFrame: 0.02,

  // ============================================
  // FONT SETTINGS
  // ============================================

  /** Font settings for card text */
  fontSettings: {
    /** Primary text color (name/participant ID) */
    primaryColor: '#0a2540',

    /** Secondary text color (coupon ID) */
    secondaryColor: '#64748b',

    /** Font family */
    family: 'Plus Jakarta Sans, Arial, sans-serif',

    /** Font size for primary text */
    primarySize: 16,

    /** Font size for secondary text */
    secondarySize: 12,

    /** Font weight for primary text */
    primaryWeight: 'bold' as const,
  },
}
