/**
 * @file services/winnerService.ts
 * @description Service layer for winner-related operations
 *
 * Provides business logic for querying and managing winners.
 * All winner queries used by the draw service go through this service.
 */

import { winnerRepository } from '@/repositories'
import type { Winner, WinnerStatus } from '@/types'

/**
 * Winner service interface
 */
export interface IWinnerService {
  /**
   * Get all winners for an event (for audit trail)
   */
  getByEventId(eventId: string): Promise<Winner[]>

  /**
   * Get confirmed winners for a prize (for display in prize panel)
   */
  getConfirmedByPrizeId(prizeId: string): Promise<Winner[]>

  /**
   * Get winners by prize with status filter
   */
  getByPrizeIdAndStatus(
    prizeId: string,
    status: WinnerStatus,
    confirmedAt?: 'null' | 'not-null'
  ): Promise<Winner[]>

  /**
   * Get confirmed win count for a participant (for win rule enforcement)
   */
  getConfirmedWinCount(eventId: string, participantId: string): Promise<number>

  /**
   * Check if participant can still win based on win rules and current wins
   */
  canParticipantWin(
    eventId: string,
    participantId: string,
    winRuleType: 'one-time' | 'limited' | 'unlimited',
    maxWins?: number
  ): Promise<{ canWin: boolean; currentWins: number }>
}

/**
 * Winner service implementation
 */
export const winnerService: IWinnerService = {
  /**
   * Get all winners for an event (for audit trail)
   */
  async getByEventId(eventId: string): Promise<Winner[]> {
    return winnerRepository.getByEventId(eventId)
  },

  /**
   * Get confirmed winners for a prize (for display in prize panel)
   */
  async getConfirmedByPrizeId(prizeId: string): Promise<Winner[]> {
    return winnerRepository.getConfirmedByPrizeId(prizeId)
  },

  /**
   * Get winners by prize with status filter
   */
  async getByPrizeIdAndStatus(
    prizeId: string,
    status: WinnerStatus,
    confirmedAt?: 'null' | 'not-null'
  ): Promise<Winner[]> {
    return winnerRepository.getByPrizeIdAndStatus(prizeId, status, confirmedAt)
  },

  /**
   * Get confirmed win count for a participant (for win rule enforcement)
   */
  async getConfirmedWinCount(
    eventId: string,
    participantId: string
  ): Promise<number> {
    return winnerRepository.getConfirmedWinCount(eventId, participantId)
  },

  /**
   * Check if participant can still win based on win rules and current wins
   */
  async canParticipantWin(
    eventId: string,
    participantId: string,
    winRuleType: 'one-time' | 'limited' | 'unlimited',
    maxWins?: number
  ): Promise<{ canWin: boolean; currentWins: number }> {
    // Unlimited: always can win
    if (winRuleType === 'unlimited') {
      return { canWin: true, currentWins: 0 }
    }

    // Get confirmed wins (only confirmed wins count for eligibility)
    const currentWins = await winnerRepository.getConfirmedWinCount(
      eventId,
      participantId
    )

    // One-time: can win if has 0 confirmed wins
    if (winRuleType === 'one-time') {
      return {
        canWin: currentWins < 1,
        currentWins,
      }
    }

    // Limited: can win if under max wins
    if (winRuleType === 'limited' && maxWins !== undefined) {
      return {
        canWin: currentWins < maxWins,
        currentWins,
      }
    }

    // Default: can win
    return { canWin: true, currentWins }
  },
}

export default winnerService
