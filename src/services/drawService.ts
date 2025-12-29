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
   * FIX (Rev 17): Added batchNumber parameter to only confirm current batch
   */
  confirm(prizeId: string, batchNumber: number): Promise<void>

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
   *
   * PERFORMANCE FIX (Rev 12):
   * - Collect all coupon IDs first
   * - Batch void at the end (single transaction)
   * - This reduces 50+ seconds to ~100ms
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
    const couponIdsToVoid: string[] = [] // Collect for batch void

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

      // Collect coupon ID for batch void (valid OR invalid)
      // Once a coupon is drawn, it's out of the pool forever
      couponIdsToVoid.push(coupon.id)

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

    // PERFORMANCE FIX (Rev 12): Batch void all coupons in single transaction
    // This is MUCH faster than sequential void() calls
    if (couponIdsToVoid.length > 0) {
      await couponRepository.voidMany(eventId, couponIdsToVoid)
    }

    console.log('[Draw] Complete, results:', results.length)
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
   *
   * PERFORMANCE FIX (Rev 12):
   * - Batch void at the end instead of sequential
   */
  async redrawAll(prizeId: string, batchNumber: number): Promise<DrawResult[]> {
    console.log('=== REDRAW ALL START ===')
    console.log('[RedrawAll] prizeId:', prizeId)
    console.log('[RedrawAll] batchNumber:', batchNumber)

    // Get cancelled winners that are unconfirmed IN CURRENT BATCH ONLY
    // FIX (Rev 17): Filter by batchNumber to avoid processing old cancelled from previous sessions
    const allCancelledWinners = await winnerRepository.getByPrizeIdAndStatus(
      prizeId,
      'cancelled',
      'null' // only unconfirmed
    )
    // Filter by batchNumber
    const cancelledWinners = allCancelledWinners.filter(w => w.batchNumber === batchNumber)
    console.log('[RedrawAll] Cancelled winners in batch:', cancelledWinners.length, '(total unconfirmed:', allCancelledWinners.length, ')')

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
    const couponIdsToVoid: string[] = [] // Collect for batch void

    // FIX (Rev 16): Mark old cancelled winners as "processed" by setting confirmedAt
    // This keeps them in DB for History page audit trail, but prevents them from
    // blocking confirm (which checks for cancelled winners with confirmedAt = null)
    const now = new Date()
    for (const cancelledWinner of cancelledWinners) {
      await winnerRepository.update(cancelledWinner.id, { confirmedAt: now })
      console.log('[RedrawAll] Marked old cancelled winner as processed:', cancelledWinner.id)
    }

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

      // Collect coupon ID for batch void (valid OR invalid)
      couponIdsToVoid.push(coupon.id)

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

    // PERFORMANCE FIX (Rev 12): Batch void all coupons in single transaction
    if (couponIdsToVoid.length > 0) {
      await couponRepository.voidMany(event.id, couponIdsToVoid)
    }

    console.log('[RedrawAll] Results:', results.length)
    console.log('[RedrawAll] Valid results:', results.filter(r => r.status === 'valid').length)
    console.log('[RedrawAll] Cancelled results:', results.filter(r => r.status === 'cancelled').length)
    console.log('=== REDRAW ALL END ===')

    return results
  },

  /**
   * Confirm winners and void coupons according to win rules
   * FIX (Rev 14): Added detailed logging to debug stuck issue
   * FIX (Rev 17): Filter by batchNumber to only check current batch
   */
  async confirm(prizeId: string, batchNumber: number): Promise<void> {
    console.log('[CONFIRM] Step 1: Starting confirm for prizeId:', prizeId, 'batchNumber:', batchNumber)

    // Check for unhandled cancelled winners IN CURRENT BATCH ONLY
    // FIX (Rev 17): Filter by batchNumber to avoid finding old cancelled from previous sessions
    console.log('[CONFIRM] Step 2: Checking for cancelled winners in batch', batchNumber)
    const allCancelledWinners = await winnerRepository.getByPrizeIdAndStatus(
      prizeId,
      'cancelled',
      'null' // only unconfirmed
    )
    // Filter by batchNumber
    const cancelledWinners = allCancelledWinners.filter(w => w.batchNumber === batchNumber)
    console.log('[CONFIRM] Step 2 done: cancelledWinners in batch:', cancelledWinners.length, '(total unconfirmed:', allCancelledWinners.length, ')')

    if (cancelledWinners.length > 0) {
      console.error('[CONFIRM] BLOCKED: Has cancelled winners in current batch, throwing error')
      throw new Error(
        `Cannot confirm: ${cancelledWinners.length} cancelled winners need to be redrawn`
      )
    }

    console.log('[CONFIRM] Step 3: Getting prize...')
    const prize = await prizeRepository.getById(prizeId)
    console.log('[CONFIRM] Step 3 done: prize found:', !!prize)
    if (!prize) {
      throw new Error(`Prize with id ${prizeId} not found`)
    }

    console.log('[CONFIRM] Step 4: Getting event...')
    const event = await eventRepository.getById(prize.eventId)
    console.log('[CONFIRM] Step 4 done: event found:', !!event)
    if (!event) {
      throw new Error(`Event for prize ${prizeId} not found`)
    }

    // Get valid unconfirmed winners
    console.log('[CONFIRM] Step 5: Getting valid unconfirmed winners...')
    const validWinners = await winnerRepository.getByPrizeIdAndStatus(
      prizeId,
      'valid',
      'null' // only unconfirmed
    )
    console.log('[CONFIRM] Step 5 done: validWinners count:', validWinners.length)

    // Confirm winners (set confirmedAt)
    console.log('[CONFIRM] Step 6: Confirming winners in DB...')
    await winnerRepository.confirmByPrizeId(prizeId)
    console.log('[CONFIRM] Step 6 done: confirmByPrizeId completed')

    // FIX (Rev 16): BATCH void coupons according to win rules
    // Instead of sequential voidCouponsForWinner, use batch operation
    console.log('[CONFIRM] Step 7: Batch voiding coupons based on win rule:', event.winRule.type)
    const startVoidTime = Date.now()

    // Get unique participant IDs from valid winners
    const participantIds = [...new Set(validWinners.map((w) => w.participantId))]
    console.log('[CONFIRM] Step 7: Unique participants:', participantIds.length)

    switch (event.winRule.type) {
      case 'one-time':
        // Void ALL coupons for ALL winning participants
        console.log('[CONFIRM] Step 7: one-time rule - voiding all coupons for participants')
        await couponRepository.voidByParticipantIds(event.id, participantIds)
        break

      case 'limited': {
        // Check each participant's win count and void if reached max
        const maxWins = event.winRule.maxWins || 1
        console.log('[CONFIRM] Step 7: limited rule - checking win counts, maxWins:', maxWins)

        // Count wins per participant in this batch
        const batchWinCounts = new Map<string, number>()
        for (const winner of validWinners) {
          batchWinCounts.set(winner.participantId, (batchWinCounts.get(winner.participantId) || 0) + 1)
        }

        // Find participants who reached max (previous + batch wins >= maxWins)
        const participantsAtMax: string[] = []
        for (const [participantId, batchWins] of batchWinCounts) {
          const previousWins = await winnerRepository.getConfirmedWinCount(event.id, participantId)
          if (previousWins + batchWins >= maxWins) {
            participantsAtMax.push(participantId)
          }
        }

        console.log('[CONFIRM] Step 7: Participants at max:', participantsAtMax.length)
        if (participantsAtMax.length > 0) {
          await couponRepository.voidByParticipantIds(event.id, participantsAtMax)
        }
        break
      }

      case 'unlimited':
        // Do nothing - winning coupons already voided at draw time
        console.log('[CONFIRM] Step 7: unlimited rule - no additional voiding needed')
        break
    }

    const voidElapsed = Date.now() - startVoidTime
    console.log('[CONFIRM] Step 7 complete: Batch void done in', voidElapsed, 'ms')

    // Update prize drawnCount
    console.log('[CONFIRM] Step 8: Getting confirmed count...')
    const confirmedCount = await winnerRepository.getConfirmedCountByPrize(
      prizeId
    )
    console.log('[CONFIRM] Step 8 done: confirmedCount:', confirmedCount)

    console.log('[CONFIRM] Step 9: Updating prize drawnCount...')
    await prizeRepository.update(prizeId, { drawnCount: confirmedCount })
    console.log('[CONFIRM] Step 9 done: Prize updated')

    console.log('[CONFIRM] COMPLETE: Confirm finished successfully')
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
