/**
 * @file repositories/interfaces/participantRepository.ts
 * @description Interface for Participant repository operations
 *
 * Defines the contract for Participant CRUD operations.
 * Participants can have multiple coupons for weighted probability.
 */

import type {
  Participant,
  ParticipantStatus,
  PaginationParams,
  PaginatedResult,
} from '@/types'

/**
 * Data for creating a new participant
 */
export interface CreateParticipantData {
  id: string // participant_id from Excel
  eventId: string
  name?: string
  email?: string
  phone?: string
  customFields: Record<string, string>
  couponCount: number // Pre-computed coupon count
}

/**
 * Data for updating an existing participant
 */
export interface UpdateParticipantData {
  name?: string
  email?: string
  phone?: string
  customFields?: Record<string, string>
  couponCount?: number
  winCount?: number
  status?: ParticipantStatus
}

/**
 * Participant repository interface
 *
 * Abstraction layer for Participant data operations.
 */
export interface IParticipantRepository {
  /**
   * Get all participants for an event
   * @param eventId - Event ID
   * @returns Array of participants
   */
  getByEventId(eventId: string): Promise<Participant[]>

  /**
   * Get participants for an event with pagination
   * @param eventId - Event ID
   * @param params - Pagination parameters (offset, limit)
   * @returns Paginated result with participants
   */
  getByEventIdPaginated(
    eventId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<Participant>>

  /**
   * Search participants by ID or name with pagination
   * @param eventId - Event ID
   * @param searchQuery - Search query string
   * @param params - Pagination parameters (offset, limit)
   * @returns Paginated result with matching participants
   */
  searchByEventId(
    eventId: string,
    searchQuery: string,
    params: PaginationParams
  ): Promise<PaginatedResult<Participant>>

  /**
   * Get participant by ID
   * @param id - Participant ID
   * @returns Participant or null if not found
   */
  getById(id: string): Promise<Participant | null>

  /**
   * Get participant by ID within an event
   * @param eventId - Event ID
   * @param participantId - Participant ID
   * @returns Participant or null if not found
   */
  getByEventAndParticipantId(
    eventId: string,
    participantId: string
  ): Promise<Participant | null>

  /**
   * Create a new participant
   * @param data - Participant creation data
   * @returns Created participant
   */
  create(data: CreateParticipantData): Promise<Participant>

  /**
   * Create multiple participants at once
   * @param data - Array of participant creation data
   * @returns Array of created participants
   */
  createMany(data: CreateParticipantData[]): Promise<Participant[]>

  /**
   * Update an existing participant
   * @param id - Participant ID
   * @param data - Update data
   * @returns Updated participant
   */
  update(id: string, data: UpdateParticipantData): Promise<Participant>

  /**
   * Delete a participant
   * @param eventId - Event ID (required for compound key lookup)
   * @param id - Participant ID
   * @returns True if deleted successfully
   */
  delete(eventId: string, id: string): Promise<boolean>

  /**
   * Delete all participants for an event
   * @param eventId - Event ID
   * @returns Number of participants deleted
   */
  deleteByEventId(eventId: string): Promise<number>

  /**
   * Increment win count for a participant
   * @param id - Participant ID
   * @param count - Number to increment (default 1)
   * @returns Updated participant
   */
  incrementWinCount(id: string, count?: number): Promise<Participant>

  /**
   * Update participant status
   * @param id - Participant ID
   * @param status - New status
   * @returns Updated participant
   */
  updateStatus(id: string, status: ParticipantStatus): Promise<Participant>

  /**
   * Get count of unique participants for an event
   * @param eventId - Event ID
   * @returns Count of participants
   */
  getCount(eventId: string): Promise<number>

  /**
   * Get active participants (status = 'active')
   * @param eventId - Event ID
   * @returns Array of active participants
   */
  getActive(eventId: string): Promise<Participant[]>
}
