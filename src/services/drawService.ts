/**
 * @file services/drawService.ts
 * @description Core draw service for raffle/lottery operations
 *
 * Handles all draw-related business logic:
 * - Pre-check validation
 * - Weighted random selection
 * - Win rule enforcement (auto-cancel)
 * - Manual cancel and redraw
 * - Winner confirmation and coupon voiding
 *
 * All business logic is in this service layer.
 * Frontend only calls these methods and renders the results.
 */

import {
  eventRepository,
  prizeRepository,
  couponRepository,
  participantRepository,
  winnerRepository,
} from '@/repositories'
import type {
  DrawResult,
  PreCheckResult,
  DrawProgress,
  CancelReason,
  WinRule,
  Coupon,
} from '@/types'

/**
 * Draw service interface
 */
export interface IDrawService {
  /**
   * Pre-check before draw starts (validates pool size)
   * Called once at the start of each prize
   */
  preCheck(prizeId: string): Promise<PreCheckResult>

  /**
   * Execute weighted random draw
   * Returns draw results with auto-cancel applied
   */
  draw(
    eventId: string,
    prizeId: string,
    quantity: number,
    batchNumber: number
  ): Promise<DrawResult[]>

  /**
   * Manual cancel a winner
   */
  cancel(winnerId: string): Promise<void>

  /**
   * Redraw all cancelled winners in current session
   */
  redrawAll(prizeId: string, batchNumber: number): Promise<DrawResult[]>

  /**
   * Confirm winners and void coupons according to win rules
   */
  confirm(prizeId: string): Promise<void>

  /**
   * Get current draw progress for an event
   */
  getProgress(eventId: string): Promise<DrawProgress>

  /**
   * Get eligible pool count for display
   */
  getEligiblePoolCount(eventId: string): Promise<number>
}

/**
 * Validate a winner against win rules
 *
 * FIXED (Rev 11): Properly considers win rules when checking duplicates
 * - Count how many times participant already appears in batch
 * - Add confirmed wins from database
 * - Check against win rule limit
 */
async function validateWinner(
  participantId: string,
  eventId: string,
  winRule: WinRule,
  currentBatchParticipantIds: string[]
): Promise<{ valid: boolean; reason?: CancelReason }> {
  // Count how many times participant already appears in this batch
  const countInBatch = currentBatchParticipantIds.filter(
    (id) => id === participantId
  ).length

  // Get existing CONFIRMED wins from database
  const confirmedWins = await winnerRepository.getConfirmedWinCount(
    eventId,
    participantId
  )

  // Total wins = confirmed + already in this batch
  const totalWins = confirmedWins + countInBatch

  switch (winRule.type) {
    case 'one-time':
      // Only allowed 1 win total
      if (totalWins >= 1) {
        return {
          valid: false,
          reason: {
            type: 'auto',
            ruleType: 'one-time',
            message: `Sudah menang ${totalWins}x (max: 1x)`,
            totalWins,
            maxAllowed: 1,
          },
        }
      }
      break

    case 'limited': {
      // Allowed up to maxWins
      const maxWins = winRule.maxWins || 1
      if (totalWins >= maxWins) {
        return {
          valid: false,
          reason: {
            type: 'auto',
            ruleType: 'limited',
            message: `Sudah menang ${totalWins}x (max: ${maxWins}x)`,
            totalWins,
            maxAllowed: maxWins,
          },
        }
      }
      break
    }

    case 'unlimited':
      // No restriction, always valid
      break
  }

  return { valid: true }
}

/**
 * Weighted random selection from coupon pool
 * Returns selected coupons in order
 */
function weightedRandomSelect(coupons: Coupon[], count: number): Coupon[] {
  if (coupons.length === 0 || count <= 0) {
    return []
  }

  // Create weighted pool
  const totalWeight = coupons.reduce((sum, c) => sum + c.weight, 0)
  const selected: Coupon[] = []
  const availableCoupons = [...coupons]

  for (let i = 0; i < count && availableCoupons.length > 0; i++) {
    // Weighted random selection
    let random = Math.random() * totalWeight
    let selectedIndex = 0

    for (let j = 0; j < availableCoupons.length; j++) {
      random -= availableCoupons[j].weight
      if (random <= 0) {
        selectedIndex = j
        break
      }
    }

    // Add to selected and remove from available
    const coupon = availableCoupons[selectedIndex]
    selected.push(coupon)
    availableCoupons.splice(selectedIndex, 1)
  }

  return selected
}

/**
 * Void additional coupons for a confirmed winner according to win rules
 * Private helper function
 *
 * NOTE: The winning coupon is already voided at draw time.
 * This function handles additional voiding for win rules (e.g., one-time voids all)
 */
async function voidCouponsForWinner(
  winnerId: string,
  eventId: string,
  winRule: WinRule
): Promise<void> {
  const winner = await winnerRepository.getById(winnerId)
  if (!winner) {
    return
  }

  switch (winRule.type) {
    case 'one-time':
      // Void ALL coupons for this participant (winning coupon already voided)
      await couponRepository.voidByParticipantId(eventId, winner.participantId)
      break

    case 'limited': {
      // Winning coupon already voided at draw time
      // Check if participant reached max wins
      const winCount = await winnerRepository.getConfirmedWinCount(
        eventId,
        winner.participantId
      )
      if (winRule.maxWins !== undefined && winCount >= winRule.maxWins) {
        // Void all remaining coupons
        await couponRepository.voidByParticipantId(eventId, winner.participantId)
      }
      break
    }

    case 'unlimited':
      // Winning coupon already voided at draw time, nothing more to do
      break
  }
}

/**
 * Draw service implementation
 */
export const drawService: IDrawService = {
  /**
   * Pre-check before draw starts
   */
  async preCheck(prizeId: string): Promise<PreCheckResult> {
    const prize = await prizeRepository.getById(prizeId)
    if (!prize) {
      throw new Error(`Prize with id ${prizeId} not found`)
    }

    const event = await eventRepository.getById(prize.eventId)
    if (!event) {
      throw new Error(`Event for prize ${prizeId} not found`)
    }

    // Get eligible pool (active coupons)
    const activeCount = await couponRepository.getActiveCount(event.id)

    // Calculate remaining quantity needed
    const drawnCount = await winnerRepository.getValidCountByPrize(prizeId)
    const remainingQuantity = prize.quantity - drawnCount

    if (remainingQuantity <= 0) {
      return {
        canProceed: true,
        prizeId: prize.id,
        prizeName: prize.name,
        requiredQuantity: 0,
        availablePool: activeCount,
        message: 'Prize already fully drawn',
      }
    }

    if (activeCount < remainingQuantity) {
      return {
        canProceed: false,
        prizeId: prize.id,
        prizeName: prize.name,
        requiredQuantity: remainingQuantity,
        availablePool: activeCount,
        message: `Pool tidak cukup. Butuh ${remainingQuantity}, tersedia ${activeCount}.`,
      }
    }

    return {
      canProceed: true,
      prizeId: prize.id,
      prizeName: prize.name,
      requiredQuantity: remainingQuantity,
      availablePool: activeCount,
    }
  },

  /**
   * Execute weighted random draw
   */
  async draw(
    eventId: string,
    prizeId: string,
    quantity: number,
    batchNumber: number
  ): Promise<DrawResult[]> {
    console.log('=== DRAW SERVICE START ===')
    console.log('[Draw] eventId:', eventId)
    console.log('[Draw] prizeId:', prizeId)
    console.log('[Draw] quantity:', quantity)
    console.log('[Draw] batchNumber:', batchNumber)

    const event = await eventRepository.getById(eventId)
    if (!event) {
      throw new Error(`Event with id ${eventId} not found`)
    }

    // Get active coupons (pool)
    const activeCoupons = await couponRepository.getActive(eventId)
    console.log('[Draw] Active coupons count:', activeCoupons.length)

    if (activeCoupons.length === 0) {
      console.warn('[Draw] NO ACTIVE COUPONS! Pool is empty.')
      return []
    }

    // Weighted random selection
    const selectedCoupons = weightedRandomSelect(activeCoupons, quantity)

    const results: DrawResult[] = []
    const currentBatchParticipantIds: string[] = []

    for (let i = 0; i < selectedCoupons.length; i++) {
      const coupon = selectedCoupons[i]
      const lineNumber = i + 1

      // Get participant info
      const participant = await participantRepository.getByEventAndParticipantId(
        eventId,
        coupon.participantId
      )

      // Validate against win rules
      const validation = await validateWinner(
        coupon.participantId,
        eventId,
        event.winRule,
        currentBatchParticipantIds
      )

      const status = validation.valid ? 'valid' : 'cancelled'

      // Create winner entry in DB (with confirmedAt: null)
      await winnerRepository.create({
        eventId,
        prizeId,
        participantId: coupon.participantId,
        participantName: participant?.name,
        couponId: coupon.id,
        customFieldsSnapshot: participant?.customFields || {},
        lineNumber,
        batchNumber,
        status,
        cancelReason: validation.reason,
      })

      // CRITICAL FIX (Rev 11): Void coupon for ALL results (valid OR invalid)
      // Once a coupon is drawn, it's out of the pool forever
      // This follows the absolute rule: once out = out forever
      await couponRepository.void(eventId, coupon.id)

      // Add to current batch tracking (for duplicate detection)
      // Only add if valid, so same participant can appear again if rule allows
      if (validation.valid) {
        currentBatchParticipantIds.push(coupon.participantId)
      }

      results.push({
        lineNumber,
        participantId: coupon.participantId,
        participantName: participant?.name,
        couponId: coupon.id,
        status,
        cancelReason: validation.reason,
      })
    }

    return results
  },

  /**
   * Manual cancel a winner
   *
   * NOTE (Rev 11): Coupon is already voided at draw time.
   * Manual cancel only updates winner.status, coupon stays 'void'.
   * This follows the absolute rule: once out of pool = out forever.
   */
  async cancel(winnerId: string): Promise<void> {
    const winner = await winnerRepository.getById(winnerId)
    if (!winner) {
      throw new Error(`Winner with id ${winnerId} not found`)
    }

    if (winner.confirmedAt !== undefined) {
      throw new Error('Cannot cancel a confirmed winner')
    }

    // Update winner status only
    // Coupon is already voided at draw time, it stays void
    await winnerRepository.update(winnerId, {
      status: 'cancelled',
      cancelReason: {
        type: 'manual',
        message: 'Dibatalkan oleh admin',
      },
    })
  },

  /**
   * Redraw all cancelled winners in current session
   *
   * FIXED (Rev 11):
   * - NO RESTORE of cancelled coupons (absolute rule: once out = out forever)
   * - Draw NEW coupons from pool
   * - Void new coupons immediately (valid OR invalid)
   */
  async redrawAll(prizeId: string, batchNumber: number): Promise<DrawResult[]> {
    console.log('=== REDRAW ALL START ===')
    console.log('[RedrawAll] prizeId:', prizeId)
    console.log('[RedrawAll] batchNumber:', batchNumber)

    // Get cancelled winners that are unconfirmed (current session)
    const cancelledWinners = await winnerRepository.getByPrizeIdAndStatus(
      prizeId,
      'cancelled',
      'null' // only unconfirmed
    )
    console.log('[RedrawAll] Cancelled winners count:', cancelledWinners.length)

    if (cancelledWinners.length === 0) {
      console.log('[RedrawAll] No cancelled winners, returning empty')
      return []
    }

    const prize = await prizeRepository.getById(prizeId)
    if (!prize) {
      throw new Error(`Prize with id ${prizeId} not found`)
    }

    const event = await eventRepository.getById(prize.eventId)
    if (!event) {
      throw new Error(`Event for prize ${prizeId} not found`)
    }

    // NOTE (Rev 11): NO RESTORE! Cancelled coupons stay voided forever.
    // We draw NEW coupons from the active pool instead.

    // Get current valid winners in this session (for duplicate detection)
    const validWinners = await winnerRepository.getByPrizeIdAndStatus(
      prizeId,
      'valid',
      'null' // only unconfirmed (current session)
    )
    const currentBatchParticipantIds = validWinners.map((w) => w.participantId)
    console.log('[RedrawAll] Valid winners in session:', validWinners.length)
    console.log('[RedrawAll] Current batch participant IDs:', currentBatchParticipantIds.length)

    // Get active coupons (pool) - these are fresh coupons not yet drawn
    const activeCoupons = await couponRepository.getActive(event.id)
    console.log('[RedrawAll] Active coupons in pool:', activeCoupons.length)

    // Use activeCoupons directly as eligible (no filtering needed since
    // coupons of valid winners are already voided)
    const eligibleCoupons = [...activeCoupons]
    console.log('[RedrawAll] Eligible coupons:', eligibleCoupons.length)

    const results: DrawResult[] = []

    for (const cancelledWinner of cancelledWinners) {
      const lineNumber = cancelledWinner.lineNumber

      // Delete old cancelled winner entry first
      console.log('[RedrawAll] Deleting old cancelled winner:', cancelledWinner.id)
      await winnerRepository.delete(cancelledWinner.id)

      // Try to find a replacement
      if (eligibleCoupons.length === 0) {
        // Pool exhausted - mark as skipped
        await winnerRepository.create({
          eventId: event.id,
          prizeId,
          participantId: '',
          participantName: undefined,
          couponId: '',
          customFieldsSnapshot: {},
          lineNumber,
          batchNumber,
          status: 'skipped',
          cancelReason: {
            type: 'auto',
            message: 'Pool habis - tidak ada participant eligible tersisa',
          },
        })

        results.push({
          lineNumber,
          participantId: '',
          couponId: '',
          status: 'skipped',
          cancelReason: {
            type: 'auto',
            message: 'Pool habis - tidak ada participant eligible tersisa',
          },
        })
        continue
      }

      // Weighted random selection for this slot
      const selected = weightedRandomSelect(eligibleCoupons, 1)
      if (selected.length === 0) {
        continue
      }

      const coupon = selected[0]

      // Get participant info
      const participant = await participantRepository.getByEventAndParticipantId(
        event.id,
        coupon.participantId
      )

      // Validate against win rules
      const validation = await validateWinner(
        coupon.participantId,
        event.id,
        event.winRule,
        currentBatchParticipantIds
      )

      const status = validation.valid ? 'valid' : 'cancelled'

      // Create new winner entry
      await winnerRepository.create({
        eventId: event.id,
        prizeId,
        participantId: coupon.participantId,
        participantName: participant?.name,
        couponId: coupon.id,
        customFieldsSnapshot: participant?.customFields || {},
        lineNumber,
        batchNumber,
        status,
        cancelReason: validation.reason,
      })

      // CRITICAL (Rev 11): Void coupon for ALL results (valid OR invalid)
      // Once drawn, it's out of the pool forever
      await couponRepository.void(event.id, coupon.id)

      // Remove from eligible pool for this redraw batch
      const couponIndex = eligibleCoupons.findIndex((c) => c.id === coupon.id)
      if (couponIndex !== -1) {
        eligibleCoupons.splice(couponIndex, 1)
      }

      // Add to current batch tracking (for duplicate detection)
      if (validation.valid) {
        currentBatchParticipantIds.push(coupon.participantId)
      }

      results.push({
        lineNumber,
        participantId: coupon.participantId,
        participantName: participant?.name,
        couponId: coupon.id,
        status,
        cancelReason: validation.reason,
      })
    }

    console.log('[RedrawAll] Results:', results.length)
    console.log('[RedrawAll] Valid results:', results.filter(r => r.status === 'valid').length)
    console.log('[RedrawAll] Cancelled results:', results.filter(r => r.status === 'cancelled').length)
    console.log('=== REDRAW ALL END ===')

    return results
  },

  /**
   * Confirm winners and void coupons according to win rules
   */
  async confirm(prizeId: string): Promise<void> {
    // Check for unhandled cancelled winners
    const cancelledWinners = await winnerRepository.getByPrizeIdAndStatus(
      prizeId,
      'cancelled',
      'null' // only unconfirmed
    )

    if (cancelledWinners.length > 0) {
      throw new Error(
        `Cannot confirm: ${cancelledWinners.length} cancelled winners need to be redrawn`
      )
    }

    const prize = await prizeRepository.getById(prizeId)
    if (!prize) {
      throw new Error(`Prize with id ${prizeId} not found`)
    }

    const event = await eventRepository.getById(prize.eventId)
    if (!event) {
      throw new Error(`Event for prize ${prizeId} not found`)
    }

    // Get valid unconfirmed winners
    const validWinners = await winnerRepository.getByPrizeIdAndStatus(
      prizeId,
      'valid',
      'null' // only unconfirmed
    )

    // Confirm winners (set confirmedAt)
    await winnerRepository.confirmByPrizeId(prizeId)

    // Void coupons according to win rules
    for (const winner of validWinners) {
      await voidCouponsForWinner(winner.id, event.id, event.winRule)
    }

    // Update prize drawnCount
    const confirmedCount = await winnerRepository.getConfirmedCountByPrize(
      prizeId
    )
    await prizeRepository.update(prizeId, { drawnCount: confirmedCount })
  },

  /**
   * Get current draw progress for an event
   */
  async getProgress(eventId: string): Promise<DrawProgress> {
    const prizes = await prizeRepository.getByEventId(eventId)
    if (prizes.length === 0) {
      throw new Error('No prizes found for event')
    }

    // Find current prize (first prize not fully drawn and confirmed)
    let currentPrizeIndex = 0
    for (let i = 0; i < prizes.length; i++) {
      const prize = prizes[i]
      const confirmedCount = await winnerRepository.getConfirmedCountByPrize(
        prize.id
      )
      if (confirmedCount < prize.quantity) {
        currentPrizeIndex = i
        break
      }
      // If this is the last prize and it's complete, stay on it
      if (i === prizes.length - 1) {
        currentPrizeIndex = i
      }
    }

    const currentPrize = prizes[currentPrizeIndex]
    const validCount = await winnerRepository.getValidCountByPrize(
      currentPrize.id
    )
    const confirmedCount = await winnerRepository.getConfirmedCountByPrize(
      currentPrize.id
    )

    // Check for unconfirmed and cancelled winners
    const unconfirmedValid = await winnerRepository.getByPrizeIdAndStatus(
      currentPrize.id,
      'valid',
      'null'
    )
    const cancelledUnconfirmed = await winnerRepository.getByPrizeIdAndStatus(
      currentPrize.id,
      'cancelled',
      'null'
    )

    return {
      eventId,
      currentPrizeIndex,
      totalPrizes: prizes.length,
      currentPrize: {
        id: currentPrize.id,
        name: currentPrize.name,
        quantity: currentPrize.quantity,
        drawnCount: validCount,
        confirmedCount,
      },
      hasUnconfirmedWinners: unconfirmedValid.length > 0,
      hasCancelledWinners: cancelledUnconfirmed.length > 0,
    }
  },

  /**
   * Get eligible pool count for display
   */
  async getEligiblePoolCount(eventId: string): Promise<number> {
    return couponRepository.getActiveCount(eventId)
  },
}

export default drawService
