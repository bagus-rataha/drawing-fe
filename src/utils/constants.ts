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
export const WIZARD_TOTAL_STEPS = 4

/** Step labels for the wizard */
export const WIZARD_STEP_LABELS = [
  'Event Info',
  'Prizes',
  'Display',
  'Review',
] as const

// ============================================
// DEFAULT VALUES
// ============================================

/** Default win rule configuration */
export const DEFAULT_WIN_RULE = {
  type: 'onetime' as const,
  maxWins: 2,
}

/** Default display settings (UI-only, not sent to API) */
export const DEFAULT_DISPLAY_SETTINGS = {
  backgroundImage: '' as string,
  animationType: 'randomize' as const,
  winnerDisplayMode: 'coupon' as const,
  rollingSound: '' as string,
  revealSound: '' as string,
}

/** Default event info for new events */
export const DEFAULT_EVENT_INFO = {
  name: '',
  description: '',
  startDate: null as Date | null,
  endDate: null as Date | null,
  winRuleType: 'onetime' as const,
  maxWins: 2,
  drawMode: 'one_by_one' as const,
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
  in_progress: 'In Progress',
  completed: 'Completed',
  complete: 'Completed',
}

/** Human-readable labels for win rule types */
export const WIN_RULE_LABELS: Record<string, string> = {
  onetime: 'One-time Win',
  limited: 'Limited Wins',
  unlimited: 'Unlimited',
}

/** Human-readable labels for draw modes */
export const DRAW_MODE_LABELS: Record<string, string> = {
  one_by_one: 'One by One',
  batch: 'Batch',
}

/** Human-readable labels for animation types */
export const ANIMATION_TYPE_LABELS: Record<string, string> = {
  randomize: 'Randomize',
  rolling: 'Rolling',
  sphere: 'Sphere',
}

/** Human-readable labels for import statuses */
export const IMPORT_STATUS_LABELS: Record<string, string> = {
  draft: 'Not Imported',
  in_progress: 'Importing...',
  done: 'Imported',
  fail: 'Import Failed',
}

/** Human-readable labels for winner display modes */
export const WINNER_DISPLAY_MODE_LABELS: Record<string, string> = {
  coupon: 'Coupon ID',
  coupon_participant: 'Coupon ID + Participant ID',
}

/** Rolling sound options — key is value sent to backend */
export const ROLLING_SOUND_OPTIONS: Record<string, { label: string; file: string | null }> = {
  '': { label: 'No Sound', file: null },
  '1': { label: 'Rolling 1', file: '/sounds/rolling/1.mp3' },
  '2': { label: 'Rolling 2', file: '/sounds/rolling/2.mp3' },
  '5': { label: 'Rolling 5', file: '/sounds/rolling/5.mp3' },
  '7': { label: 'Rolling 7', file: '/sounds/rolling/7.mp3' },
  '8': { label: 'Rolling 8', file: '/sounds/rolling/8.mp3' },
  '9': { label: 'Rolling 9', file: '/sounds/rolling/9.mp3' },
  '10': { label: 'Rolling 10', file: '/sounds/rolling/10.mp3' },
}

/** Reveal sound options — key is value sent to backend */
export const REVEAL_SOUND_OPTIONS: Record<string, { label: string; file: string | null }> = {
  '': { label: 'No Sound', file: null },
  '1': { label: 'Reveal 1', file: '/sounds/revealing/1.mp3' },
  '2': { label: 'Reveal 2', file: '/sounds/revealing/2.mp3' },
  '3': { label: 'Reveal 3', file: '/sounds/revealing/3.mp3' },
  '4': { label: 'Reveal 4', file: '/sounds/revealing/4.mp3' },
  '5': { label: 'Reveal 5', file: '/sounds/revealing/5.mp3' },
  '6': { label: 'Reveal 6', file: '/sounds/revealing/6.mp3' },
  '7': { label: 'Reveal 7', file: '/sounds/revealing/7.mp3' },
  '8': { label: 'Reveal 8', file: '/sounds/revealing/8.mp3' },
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

