/**
 * @file types/index.ts
 * @description All TypeScript interfaces and types for the Lottery App
 *
 * This file contains:
 * - Enums and type aliases for status values
 * - Main entity interfaces (Event, Prize, Participant, etc.)
 * - Configuration interfaces
 * - Cancel/Redraw related types (for Phase 2)
 */

// ============================================
// ENUMS & TYPE ALIASES
// ============================================

/**
 * Event lifecycle status
 * - draft: Event is being created/edited
 * - ready: Event is configured and ready to start drawing
 * - in_progress: Drawing is currently happening
 * - completed: All prizes have been drawn
 */
export type EventStatus = 'draft' | 'ready' | 'in_progress' | 'completed'

/**
 * Win rule types determine how many times a participant can win
 * - one-time: Participant can only win once across all prizes
 * - limited: Participant can win up to N times (configurable)
 * - unlimited: No restriction on number of wins
 */
export type WinRuleType = 'one-time' | 'limited' | 'unlimited'

/**
 * Draw mode determines how winners are selected for a prize
 * - all-at-once: Draw all winners for the prize in one batch
 * - batch: Draw winners in configured batch sizes
 * - one-by-one: Draw winners individually
 */
export type DrawMode = 'all-at-once' | 'batch' | 'one-by-one'

/**
 * Animation type for the draw screen (Phase 2)
 */
export type AnimationType = '3d-sphere' | 'particle'

/**
 * Winner display mode for the draw screen
 * - coupon-only: Show only coupon ID
 * - coupon-participant-id: Show coupon ID + participant ID
 * - coupon-participant-name: Show coupon ID + participant name
 */
export type WinnerDisplayMode = 'coupon-only' | 'coupon-participant-id' | 'coupon-participant-name'

/**
 * Coupon status
 * - active: Available for drawing
 * - void: Cannot be drawn (already won or invalidated)
 */
export type CouponStatus = 'active' | 'void'

/**
 * Participant status
 * - active: Has at least one active coupon
 * - exhausted: All coupons have been voided (due to winning or other reasons)
 */
export type ParticipantStatus = 'active' | 'exhausted'

// ============================================
// CONFIGURATION INTERFACES
// ============================================

/**
 * Win rule configuration for an event
 */
export interface WinRule {
  /** The type of win rule */
  type: WinRuleType
  /** Maximum number of wins allowed (only for 'limited' type) */
  maxWins?: number
}

/**
 * Display settings for the draw screen
 */
export interface DisplaySettings {
  /** Background image URL or base64 data */
  backgroundImage?: string
  /** Type of animation to show during drawing */
  animationType: AnimationType
  /** What to display on winner cards */
  winnerDisplayMode: WinnerDisplayMode
  /** List of custom field keys to display on winner cards */
  customFieldsToShow: string[]
}

/**
 * Draw configuration for a prize
 */
export interface DrawConfig {
  /** How winners should be drawn */
  mode: DrawMode
  /** Batch sizes when mode is 'batch', e.g., [15, 10, 10] for 35 total */
  batches?: number[]
}

// ============================================
// MAIN ENTITIES
// ============================================

/**
 * Event entity - represents a lottery/raffle event
 *
 * An event contains:
 * - Basic info (name, description)
 * - Win rules
 * - Display settings
 * - Associated prizes, participants, and coupons
 */
export interface Event {
  /** Unique identifier */
  id: string
  /** Event name */
  name: string
  /** Optional description */
  description?: string
  /** Event start date/time */
  startDate?: Date
  /** Event end date/time */
  endDate?: Date
  /** Win rule configuration */
  winRule: WinRule
  /** Display settings for draw screen */
  displaySettings: DisplaySettings
  /** Current status in the event lifecycle */
  status: EventStatus
  /** Calculated total number of unique participants */
  totalParticipants: number
  /** Calculated total number of coupons */
  totalCoupons: number
  /** Calculated total number of prizes */
  totalPrizes: number
  /** Timestamp when event was created */
  createdAt: Date
  /** Timestamp when event was last updated */
  updatedAt: Date
}

/**
 * Prize entity - represents a prize in an event
 *
 * Prizes are drawn sequentially based on their sequence number.
 * Each prize can have its own draw configuration (all-at-once, batch, one-by-one).
 */
export interface Prize {
  /** Unique identifier */
  id: string
  /** Reference to parent event */
  eventId: string
  /** Prize name */
  name: string
  /** Optional prize image URL or base64 data */
  image?: string
  /** Total quantity of this prize */
  quantity: number
  /** Order in which this prize will be drawn (1, 2, 3, ...) */
  sequence: number
  /** Configuration for how to draw winners */
  drawConfig: DrawConfig
  /** Number of winners already drawn for this prize */
  drawnCount: number
}

/**
 * Participant entity - represents a person who can win
 *
 * A participant can have multiple coupons (increasing their probability).
 * Win tracking is done at the participant level, not coupon level.
 *
 * Probability calculation: participant_coupons / total_coupons
 */
export interface Participant {
  /** Unique identifier from Excel (participant_id column) */
  id: string
  /** Reference to parent event */
  eventId: string
  /** Optional participant name */
  name?: string
  /** Optional email */
  email?: string
  /** Optional phone number */
  phone?: string
  /** Additional custom fields from Excel import */
  customFields: Record<string, string>
  /** Pre-computed coupon count for this participant (set during import, updated on delete) */
  couponCount: number
  /** Number of times this participant has won */
  winCount: number
  /** Current status */
  status: ParticipantStatus
}

/**
 * Coupon entity - represents a single entry in the draw pool
 *
 * Multiple coupons can belong to the same participant.
 * Weight determines the relative probability (default 1, higher for VIP).
 */
export interface Coupon {
  /** Unique identifier from Excel (coupon_id column) */
  id: string
  /** Reference to parent event */
  eventId: string
  /** Reference to owning participant */
  participantId: string
  /** Weight for probability calculation (default 1) */
  weight: number
  /** Current status */
  status: CouponStatus
}

/**
 * Winner entity - represents a confirmed prize winner
 *
 * Stores a snapshot of participant data at the time of winning
 * to preserve history even if participant data is later modified.
 */
export interface Winner {
  /** Unique identifier */
  id: string
  /** Reference to parent event */
  eventId: string
  /** Reference to won prize */
  prizeId: string
  /** Reference to winning participant */
  participantId: string
  /** Snapshot of participant name at time of win */
  participantName?: string
  /** Reference to winning coupon */
  couponId: string
  /** Snapshot of custom fields at time of win */
  customFieldsSnapshot: Record<string, string>
  /** Batch number in which this winner was drawn */
  batchNumber: number
  /** Timestamp when winner was drawn */
  drawnAt: Date
}

// ============================================
// CANCEL & REDRAW TYPES (Phase 2)
// ============================================

/**
 * Reason for cancelling a draw line
 */
export interface CancelReason {
  /** Whether cancel was automatic or manual */
  type: 'auto' | 'manual'
  /** Which rule triggered auto-cancel */
  ruleType?: WinRuleType
  /** Human-readable message explaining the cancel */
  message: string
  /** Line numbers that conflicted (for batch conflicts) */
  conflictingLines?: number[]
  /** Total wins for participant at time of cancel */
  totalWins?: number
  /** Maximum allowed wins */
  maxAllowed?: number
}

/**
 * Status of a draw line in a batch
 * - valid: Winner confirmed
 * - cancelled: Winner cancelled (can be redrawn)
 * - skipped: Could not fill (pool exhausted)
 */
export type DrawLineStatus = 'valid' | 'cancelled' | 'skipped'

/**
 * A single line in a draw batch
 */
export interface DrawLine {
  /** Line number in the batch (1-indexed) */
  lineNumber: number
  /** Reference to participant */
  participantId: string
  /** Snapshot of participant name */
  participantName?: string
  /** Reference to coupon */
  couponId: string
  /** Snapshot of custom fields */
  customFields: Record<string, string>
  /** Current status */
  status: DrawLineStatus
  /** Reason if cancelled */
  cancelReason?: CancelReason
}

/**
 * State of a draw batch
 */
export interface BatchState {
  /** Reference to prize being drawn */
  prizeId: string
  /** Batch number (1-indexed) */
  batchNumber: number
  /** Lines in this batch */
  lines: DrawLine[]
}

// ============================================
// FORM & WIZARD TYPES
// ============================================

/**
 * Data for Step 1: Event Info
 */
export interface EventInfoFormData {
  name: string
  description: string
  startDate: Date | null
  endDate: Date | null
  winRuleType: WinRuleType
  maxWins: number
}

/**
 * Data for a single prize in Step 2
 */
export interface PrizeFormData {
  id: string
  name: string
  image?: string
  quantity: number
  drawMode: DrawMode
  batches: number[]
}

/**
 * Data for Step 4: Display Settings
 */
export interface DisplaySettingsFormData {
  backgroundImage?: string
  animationType: AnimationType
  winnerDisplayMode: WinnerDisplayMode
  customFieldsToShow: string[]
}

/**
 * Complete wizard state
 */
export interface WizardState {
  currentStep: number
  eventInfo: EventInfoFormData
  prizes: PrizeFormData[]
  displaySettings: DisplaySettingsFormData
  importStats: ImportStats | null
}

// ============================================
// IMPORT & VALIDATION TYPES
// ============================================

/**
 * Column mapping for Excel import
 */
export interface ColumnMapping {
  /** Column header from Excel */
  excelColumn: string
  /** Target field in the system */
  targetField: string
  /** Whether this mapping is required */
  required: boolean
}

/**
 * Statistics from Excel import
 */
export interface ImportStats {
  /** Total rows in Excel file */
  totalRows: number
  /** Number of valid rows */
  validRows: number
  /** Number of invalid rows */
  invalidRows: number
  /** Number of unique participants */
  uniqueParticipants: number
  /** Total number of coupons */
  totalCoupons: number
  /** Detected custom fields */
  customFields: string[]
  /** Validation errors */
  errors: ImportError[]
}

/**
 * A single import error
 */
export interface ImportError {
  /** Row number in Excel (1-indexed, including header) */
  row: number
  /** Column name */
  column: string
  /** Error message */
  message: string
  /** The problematic value */
  value?: string
}

/**
 * Result of Excel import operation
 */
export interface ImportResult {
  /** Whether import was successful */
  success: boolean
  /** Import statistics */
  stats: ImportStats
  /** Parsed participants (if successful) */
  participants?: Participant[]
  /** Parsed coupons (if successful) */
  coupons?: Coupon[]
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Generic filter options for queries
 */
export interface FilterOptions {
  search?: string
  status?: EventStatus
}

/**
 * Pagination options (page-based)
 */
export interface PaginationOptions {
  page: number
  pageSize: number
}

/**
 * Pagination parameters for database queries (offset-based)
 */
export interface PaginationParams {
  offset: number
  limit: number
}

/**
 * Generic paginated result from database queries
 */
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Sort options
 */
export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}
