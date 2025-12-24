/**
 * @file repositories/interfaces/eventRepository.ts
 * @description Interface for Event repository operations
 *
 * Defines the contract for Event CRUD operations.
 * Implementations can be Dexie.js (Phase 1) or REST API (Phase 2).
 */

import type { Event, EventStatus, FilterOptions } from '@/types'

/**
 * Data for creating a new event
 */
export interface CreateEventData {
  name: string
  description?: string
  startDate?: Date
  endDate?: Date
  winRule: Event['winRule']
  displaySettings: Event['displaySettings']
}

/**
 * Data for updating an existing event
 */
export interface UpdateEventData {
  name?: string
  description?: string
  startDate?: Date
  endDate?: Date
  winRule?: Event['winRule']
  displaySettings?: Event['displaySettings']
  status?: EventStatus
  totalParticipants?: number
  totalCoupons?: number
}

/**
 * Event repository interface
 *
 * Abstraction layer for Event data operations.
 * Allows swapping between Dexie.js and REST API implementations.
 */
export interface IEventRepository {
  /**
   * Get all events
   * @param filters - Optional filter options
   * @returns Array of events
   */
  getAll(filters?: FilterOptions): Promise<Event[]>

  /**
   * Get event by ID
   * @param id - Event ID
   * @returns Event or null if not found
   */
  getById(id: string): Promise<Event | null>

  /**
   * Create a new event
   * @param data - Event creation data
   * @returns Created event
   */
  create(data: CreateEventData): Promise<Event>

  /**
   * Update an existing event
   * @param id - Event ID
   * @param data - Update data
   * @returns Updated event
   */
  update(id: string, data: UpdateEventData): Promise<Event>

  /**
   * Delete an event
   * @param id - Event ID
   * @returns True if deleted successfully
   */
  delete(id: string): Promise<boolean>

  /**
   * Update event status
   * @param id - Event ID
   * @param status - New status
   * @returns Updated event
   */
  updateStatus(id: string, status: EventStatus): Promise<Event>

  /**
   * Duplicate an event (creates copy with draft status)
   * @param id - Event ID to duplicate
   * @returns New duplicated event
   */
  duplicate(id: string): Promise<Event>

  /**
   * Update event statistics (totalParticipants, totalCoupons)
   * @param id - Event ID
   * @param stats - Statistics to update
   * @returns Updated event
   */
  updateStats(
    id: string,
    stats: { totalParticipants: number; totalCoupons: number }
  ): Promise<Event>
}
