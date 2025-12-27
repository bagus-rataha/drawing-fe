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
 */
async function validateWinner(
  participantId: string,
  eventId: string,
  winRule: WinRule,
  currentBatchParticipantIds: string[]
): Promise<{ valid: boolean; reason?: CancelReason }> {
  // Check duplicate in same batch
  const duplicateIndex = currentBatchParticipantIds.indexOf(participantId)
  if (duplicateIndex !== -1) {
    return {
      valid: false,
      reason: {
        type: 'auto',
        ruleType: winRule.type,
        message: 'Sudah muncul di line sebelumnya dalam batch ini',
        conflictingLines: [duplicateIndex + 1],
      },
    }
  }

  // Unlimited: always valid (no need to check existing wins)
  if (winRule.type === 'unlimited') {
    return { valid: true }
  }

  // Check existing CONFIRMED wins
  const existingWins = await winnerRepository.getConfirmedWinCount(
    eventId,
    participantId
  )

  if (winRule.type === 'one-time' && existingWins >= 1) {
    return {
      valid: false,
      reason: {
        type: 'auto',
        ruleType: 'one-time',
        message: `Sudah menang ${existingWins}x sebelumnya`,
        totalWins: existingWins,
        maxAllowed: 1,
      },
    }
  }

  if (
    winRule.type === 'limited' &&
    winRule.maxWins !== undefined &&
    existingWins >= winRule.maxWins
  ) {
    return {
      valid: false,
      reason: {
        type: 'auto',
        ruleType: 'limited',
        message: `Sudah menang ${existingWins}/${winRule.maxWins} kali (max tercapai)`,
        totalWins: existingWins,
        maxAllowed: winRule.maxWins,
      },
    }
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
 * Void coupons for a confirmed winner according to win rules
 * Private helper function
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
      // Void ALL coupons for this participant
      await couponRepository.voidByParticipantId(eventId, winner.participantId)
      break

    case 'limited':
      // Void the winning coupon
      await couponRepository.void(winner.couponId)
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

    case 'unlimited':
      // Void ONLY the winning coupon
      await couponRepository.void(winner.couponId)
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
    const event = await eventRepository.getById(eventId)
    if (!event) {
      throw new Error(`Event with id ${eventId} not found`)
    }

    // Get active coupons (pool)
    const activeCoupons = await couponRepository.getActive(eventId)
    if (activeCoupons.length === 0) {
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

      // Cancel coupon if auto-cancelled
      if (!validation.valid) {
        await couponRepository.cancel(eventId, coupon.id)
      }

      // Add to current batch tracking (for duplicate detection)
      currentBatchParticipantIds.push(coupon.participantId)

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
   */
  async cancel(winnerId: string): Promise<void> {
    const winner = await winnerRepository.getById(winnerId)
    if (!winner) {
      throw new Error(`Winner with id ${winnerId} not found`)
    }

    if (winner.confirmedAt !== undefined) {
      throw new Error('Cannot cancel a confirmed winner')
    }

    // Update winner status
    await winnerRepository.update(winnerId, {
      status: 'cancelled',
      cancelReason: {
        type: 'manual',
        message: 'Dibatalkan oleh admin',
      },
    })

    // Cancel the coupon
    const event = await eventRepository.getById(winner.eventId)
    if (event) {
      await couponRepository.cancel(event.id, winner.couponId)
    }
  },

  /**
   * Redraw all cancelled winners in current session
   */
  async redrawAll(prizeId: string, batchNumber: number): Promise<DrawResult[]> {
    // Get cancelled winners that are unconfirmed (current session)
    const cancelledWinners = await winnerRepository.getByPrizeIdAndStatus(
      prizeId,
      'cancelled',
      'null' // only unconfirmed
    )

    if (cancelledWinners.length === 0) {
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

    // Get current valid winners in this session (for duplicate detection)
    const validWinners = await winnerRepository.getByPrizeIdAndStatus(
      prizeId,
      'valid',
      'null' // only unconfirmed (current session)
    )
    const currentBatchParticipantIds = validWinners.map((w) => w.participantId)

    // Get active coupons (pool) - excluding coupons from valid winners
    const activeCoupons = await couponRepository.getActive(event.id)
    const validCouponIds = new Set(validWinners.map((w) => w.couponId))
    const eligibleCoupons = activeCoupons.filter(
      (c) => !validCouponIds.has(c.id)
    )

    const results: DrawResult[] = []

    for (const cancelledWinner of cancelledWinners) {
      const lineNumber = cancelledWinner.lineNumber

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
        // Should not happen, but handle gracefully
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

      // Create new winner entry (old entry stays for audit)
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

      // Cancel coupon if auto-cancelled
      if (!validation.valid) {
        await couponRepository.cancel(event.id, coupon.id)
      }

      // Remove from eligible pool
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
