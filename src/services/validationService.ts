/**
 * @file services/validationService.ts
 * @description Validation service for import data and win rules
 *
 * Handles:
 * - Excel import data validation
 * - Win rule validation
 * - Pre-draw validation (pool vs quantity check)
 */

import type {
  Event,
  WinRule,
  Participant,
  Coupon,
  Prize,
  ImportError,
  EventInfoFormData,
  PrizeFormData,
} from '@/types'
import {
  MAX_EVENT_NAME_LENGTH,
  MAX_EVENT_DESCRIPTION_LENGTH,
  MAX_PRIZE_NAME_LENGTH,
  MIN_PRIZE_QUANTITY,
  MAX_PRIZE_QUANTITY,
  MAX_LIMITED_WINS,
} from '@/utils/constants'

// ============================================
// EVENT VALIDATION
// ============================================

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Validates event info form data
 * @param data - Event info form data
 * @returns Validation result
 */
export function validateEventInfo(data: EventInfoFormData): ValidationResult {
  const errors: string[] = []

  // Name validation
  if (!data.name.trim()) {
    errors.push('Event name is required')
  } else if (data.name.length > MAX_EVENT_NAME_LENGTH) {
    errors.push(`Event name must be ${MAX_EVENT_NAME_LENGTH} characters or less`)
  }

  // Description validation (optional)
  if (data.description && data.description.length > MAX_EVENT_DESCRIPTION_LENGTH) {
    errors.push(
      `Description must be ${MAX_EVENT_DESCRIPTION_LENGTH} characters or less`
    )
  }

  // Win rule validation
  if (data.winRuleType === 'limited') {
    if (!data.maxWins || data.maxWins < 1) {
      errors.push('Maximum wins must be at least 1 for limited win rule')
    } else if (data.maxWins > MAX_LIMITED_WINS) {
      errors.push(`Maximum wins cannot exceed ${MAX_LIMITED_WINS}`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// ============================================
// PRIZE VALIDATION
// ============================================

/**
 * Validates prize form data
 * @param data - Prize form data
 * @returns Validation result
 */
export function validatePrize(data: PrizeFormData): ValidationResult {
  const errors: string[] = []

  // Name validation
  if (!data.name.trim()) {
    errors.push('Prize name is required')
  } else if (data.name.length > MAX_PRIZE_NAME_LENGTH) {
    errors.push(`Prize name must be ${MAX_PRIZE_NAME_LENGTH} characters or less`)
  }

  // Quantity validation
  if (data.quantity < MIN_PRIZE_QUANTITY) {
    errors.push(`Quantity must be at least ${MIN_PRIZE_QUANTITY}`)
  } else if (data.quantity > MAX_PRIZE_QUANTITY) {
    errors.push(`Quantity cannot exceed ${MAX_PRIZE_QUANTITY}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validates all prizes for an event
 * @param prizes - Array of prize form data
 * @returns Validation result
 */
export function validatePrizes(prizes: PrizeFormData[]): ValidationResult {
  const errors: string[] = []

  if (prizes.length === 0) {
    errors.push('At least one prize is required')
  }

  prizes.forEach((prize, index) => {
    const result = validatePrize(prize)
    if (!result.isValid) {
      errors.push(...result.errors.map((e) => `Prize ${index + 1}: ${e}`))
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// ============================================
// WIN RULE VALIDATION
// ============================================

/**
 * Checks if a participant can win based on win rules
 * @param participant - Participant to check
 * @param winRule - Event win rule
 * @param currentBatchWins - Wins in current batch (for same-batch check)
 * @returns Object with canWin flag and reason if not
 */
export function canParticipantWin(
  participant: Participant,
  winRule: WinRule,
  currentBatchWins = 0
): { canWin: boolean; reason?: string } {
  const totalWins = participant.winCount + currentBatchWins

  switch (winRule.type) {
    case 'one-time':
    case 'onetime':
      if (totalWins >= 1) {
        return {
          canWin: false,
          reason: `Participant already won (onetime rule)`,
        }
      }
      break

    case 'limited':
      const maxWins = winRule.maxWins || 1
      if (totalWins >= maxWins) {
        return {
          canWin: false,
          reason: `Participant reached max wins (${maxWins})`,
        }
      }
      break

    case 'unlimited':
      // No restriction
      break
  }

  return { canWin: true }
}

/**
 * Validates if participant should be auto-cancelled in a batch
 * Used during draw to check within-batch conflicts
 * @param participantId - Participant ID
 * @param existingWins - Number of existing wins for participant
 * @param winsInBatch - Number of wins for this participant in current batch
 * @param winRule - Event win rule
 * @returns Object with shouldCancel flag and reason
 */
export function shouldAutoCancel(
  existingWins: number,
  winsInBatch: number,
  winRule: WinRule
): { shouldCancel: boolean; reason?: string } {
  const totalWins = existingWins + winsInBatch + 1 // +1 for current win

  switch (winRule.type) {
    case 'one-time':
    case 'onetime':
      if (existingWins >= 1 || winsInBatch >= 1) {
        return {
          shouldCancel: true,
          reason: `Onetime win rule: already won ${existingWins + winsInBatch} time(s)`,
        }
      }
      break

    case 'limited':
      const maxWins = winRule.maxWins || 1
      if (totalWins > maxWins) {
        return {
          shouldCancel: true,
          reason: `Limited win rule: would exceed max ${maxWins} wins`,
        }
      }
      break

    case 'unlimited':
      // Never auto-cancel for unlimited
      break
  }

  return { shouldCancel: false }
}

// ============================================
// PRE-DRAW VALIDATION
// ============================================

/**
 * Pre-draw validation result
 */
export interface PreDrawValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validates if drawing can proceed
 * @param event - Event to validate
 * @param prizes - Prizes for the event
 * @param activeCouponCount - Count of active coupons
 * @returns Validation result with errors and warnings
 */
export function validatePreDraw(
  event: Event,
  prizes: Prize[],
  activeCouponCount: number
): PreDrawValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if event has participants
  if (event.totalParticipants === 0) {
    errors.push('No participants imported. Please import participants first.')
  }

  // Check if event has prizes
  if (prizes.length === 0) {
    errors.push('No prizes configured. Please add at least one prize.')
  }

  // Calculate total prize quantity
  const totalPrizeQuantity = prizes.reduce((sum, p) => sum + p.quantity, 0)

  // Check if pool has enough coupons
  if (activeCouponCount < totalPrizeQuantity) {
    errors.push(
      `Not enough active coupons (${activeCouponCount}) for total prizes (${totalPrizeQuantity}). ` +
        `Please reduce prize quantity or add more participants.`
    )
  }

  // Check if pool is significantly larger than needed (warning only)
  if (activeCouponCount > totalPrizeQuantity * 1000) {
    warnings.push(
      `Large participant pool (${activeCouponCount} coupons). Drawing may take longer.`
    )
  }

  // Check win rule compatibility
  if (event.winRule.type === 'onetime' || event.winRule.type === 'one-time') {
    if (event.totalParticipants < totalPrizeQuantity) {
      errors.push(
        `Not enough unique participants (${event.totalParticipants}) for total prizes (${totalPrizeQuantity}) ` +
          `with one-time win rule.`
      )
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================
// IMPORT VALIDATION HELPERS
// ============================================

/**
 * Checks for duplicate coupon IDs in import data
 * @param coupons - Array of coupons
 * @returns Array of import errors for duplicates
 */
export function checkDuplicateCoupons(coupons: Coupon[]): ImportError[] {
  const errors: ImportError[] = []
  const seen = new Map<string, number>()

  coupons.forEach((coupon, index) => {
    const firstIndex = seen.get(coupon.id)
    if (firstIndex !== undefined) {
      errors.push({
        row: index + 2, // +2 for header and 1-indexed
        column: 'coupon_id',
        message: `Duplicate coupon_id (first seen at row ${firstIndex + 2})`,
        value: coupon.id,
      })
    } else {
      seen.set(coupon.id, index)
    }
  })

  return errors
}

/**
 * Validates email format
 * @param email - Email to validate
 * @returns True if valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates phone number format (basic validation)
 * @param phone - Phone to validate
 * @returns True if valid
 */
export function isValidPhone(phone: string): boolean {
  // Allow digits, spaces, dashes, parentheses, and + sign
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 8
}
