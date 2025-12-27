/**
 * @file repositories/interfaces/winnerRepository.ts
 * @description Interface for Winner repository operations
 *
 * Defines the contract for Winner CRUD operations.
 * Winners are prize recipients (confirmed or pending confirmation).
 */

import type { Winner, WinnerStatus, CancelReason } from '@/types'

/**
 * Data for creating a new winner
 */
export interface CreateWinnerData {
  eventId: string
  prizeId: string
  participantId: string
  participantName?: string
  couponId: string
  customFieldsSnapshot: Record<string, string>
  lineNumber: number
  batchNumber: number
  status: WinnerStatus
  cancelReason?: CancelReason
}

/**
 * Data for updating a winner
 */
export interface UpdateWinnerData {
  status?: WinnerStatus
  cancelReason?: CancelReason
  confirmedAt?: Date
}

/**
 * Winner repository interface
 *
 * Abstraction layer for Winner data operations.
 */
export interface IWinnerRepository {
  /**
   * Get all winners for an event
   * @param eventId - Event ID
   * @returns Array of winners
   */
  getByEventId(eventId: string): Promise<Winner[]>

  /**
   * Get winner by ID
   * @param id - Winner ID
   * @returns Winner or null if not found
   */
  getById(id: string): Promise<Winner | null>

  /**
   * Get all winners for a prize
   * @param prizeId - Prize ID
   * @returns Array of winners
   */
  getByPrizeId(prizeId: string): Promise<Winner[]>

  /**
   * Get all winners for a participant
   * @param participantId - Participant ID
   * @returns Array of winners
   */
  getByParticipantId(participantId: string): Promise<Winner[]>

  /**
   * Get winners grouped by prize
   * @param eventId - Event ID
   * @returns Map of prizeId -> winners
   */
  getGroupedByPrize(eventId: string): Promise<Map<string, Winner[]>>

  /**
   * Create a new winner
   * @param data - Winner creation data
   * @returns Created winner
   */
  create(data: CreateWinnerData): Promise<Winner>

  /**
   * Create multiple winners at once
   * @param data - Array of winner creation data
   * @returns Array of created winners
   */
  createMany(data: CreateWinnerData[]): Promise<Winner[]>

  /**
   * Update a winner
   * @param id - Winner ID
   * @param data - Update data
   * @returns Updated winner
   */
  update(id: string, data: UpdateWinnerData): Promise<Winner>

  /**
   * Delete a winner
   * @param id - Winner ID
   * @returns True if deleted successfully
   */
  delete(id: string): Promise<boolean>

  /**
   * Delete all winners for an event
   * @param eventId - Event ID
   * @returns Number of winners deleted
   */
  deleteByEventId(eventId: string): Promise<number>

  /**
   * Delete all winners for a prize
   * @param prizeId - Prize ID
   * @returns Number of winners deleted
   */
  deleteByPrizeId(prizeId: string): Promise<number>

  /**
   * Get count of winners for an event
   * @param eventId - Event ID
   * @returns Total count
   */
  getCount(eventId: string): Promise<number>

  /**
   * Get count of winners for a prize
   * @param prizeId - Prize ID
   * @returns Count of winners
   */
  getCountByPrize(prizeId: string): Promise<number>

  /**
   * Get total win count for participant (all statuses)
   * @param eventId - Event ID
   * @param participantId - Participant ID
   * @returns Number of wins
   */
  getParticipantWinCount(eventId: string, participantId: string): Promise<number>

  /**
   * Get CONFIRMED win count for participant (only status=valid AND confirmedAt IS NOT NULL)
   * Used for win rule enforcement
   * @param eventId - Event ID
   * @param participantId - Participant ID
   * @returns Number of confirmed wins
   */
  getConfirmedWinCount(eventId: string, participantId: string): Promise<number>

  /**
   * Get confirmed winners for a prize (status=valid AND confirmedAt IS NOT NULL)
   * Used for display in prize panel
   * @param prizeId - Prize ID
   * @returns Array of confirmed winners
   */
  getConfirmedByPrizeId(prizeId: string): Promise<Winner[]>

  /**
   * Get winners by prize with status filter
   * @param prizeId - Prize ID
   * @param status - Winner status to filter
   * @param confirmedAt - Filter by confirmedAt: 'null' for unconfirmed, 'not-null' for confirmed
   * @returns Array of matching winners
   */
  getByPrizeIdAndStatus(
    prizeId: string,
    status: WinnerStatus,
    confirmedAt?: 'null' | 'not-null'
  ): Promise<Winner[]>

  /**
   * Get count of valid winners for a prize (only status=valid)
   * @param prizeId - Prize ID
   * @returns Count of valid winners
   */
  getValidCountByPrize(prizeId: string): Promise<number>

  /**
   * Get count of confirmed winners for a prize
   * @param prizeId - Prize ID
   * @returns Count of confirmed winners
   */
  getConfirmedCountByPrize(prizeId: string): Promise<number>

  /**
   * Confirm all valid winners for a prize (set confirmedAt)
   * @param prizeId - Prize ID
   * @returns Number of winners confirmed
   */
  confirmByPrizeId(prizeId: string): Promise<number>
}
