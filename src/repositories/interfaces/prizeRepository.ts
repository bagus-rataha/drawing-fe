/**
 * @file repositories/interfaces/prizeRepository.ts
 * @description Interface for Prize repository operations
 *
 * Defines the contract for Prize CRUD operations.
 * Prizes are drawn sequentially based on their sequence number.
 */

import type { Prize, DrawConfig } from '@/types'

/**
 * Data for creating a new prize
 */
export interface CreatePrizeData {
  eventId: string
  name: string
  image?: string
  quantity: number
  sequence: number
  drawConfig: DrawConfig
}

/**
 * Data for updating an existing prize
 */
export interface UpdatePrizeData {
  name?: string
  image?: string
  quantity?: number
  sequence?: number
  drawConfig?: DrawConfig
  drawnCount?: number
}

/**
 * Prize repository interface
 *
 * Abstraction layer for Prize data operations.
 */
export interface IPrizeRepository {
  /**
   * Get all prizes for an event
   * @param eventId - Event ID
   * @returns Array of prizes ordered by sequence
   */
  getByEventId(eventId: string): Promise<Prize[]>

  /**
   * Get prize by ID
   * @param id - Prize ID
   * @returns Prize or null if not found
   */
  getById(id: string): Promise<Prize | null>

  /**
   * Create a new prize
   * @param data - Prize creation data
   * @returns Created prize
   */
  create(data: CreatePrizeData): Promise<Prize>

  /**
   * Create multiple prizes at once
   * @param data - Array of prize creation data
   * @returns Array of created prizes
   */
  createMany(data: CreatePrizeData[]): Promise<Prize[]>

  /**
   * Update an existing prize
   * @param id - Prize ID
   * @param data - Update data
   * @returns Updated prize
   */
  update(id: string, data: UpdatePrizeData): Promise<Prize>

  /**
   * Delete a prize
   * @param id - Prize ID
   * @returns True if deleted successfully
   */
  delete(id: string): Promise<boolean>

  /**
   * Delete all prizes for an event
   * @param eventId - Event ID
   * @returns Number of prizes deleted
   */
  deleteByEventId(eventId: string): Promise<number>

  /**
   * Reorder prizes (update sequence numbers)
   * @param eventId - Event ID
   * @param prizeIds - Array of prize IDs in new order
   * @returns Updated prizes
   */
  reorder(eventId: string, prizeIds: string[]): Promise<Prize[]>

  /**
   * Increment drawn count for a prize
   * @param id - Prize ID
   * @param count - Number to increment (default 1)
   * @returns Updated prize
   */
  incrementDrawnCount(id: string, count?: number): Promise<Prize>

  /**
   * Get total quantity of all prizes for an event
   * @param eventId - Event ID
   * @returns Total quantity
   */
  getTotalQuantity(eventId: string): Promise<number>
}
