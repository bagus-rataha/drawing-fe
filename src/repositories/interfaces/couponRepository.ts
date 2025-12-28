/**
 * @file repositories/interfaces/couponRepository.ts
 * @description Interface for Coupon repository operations
 *
 * Defines the contract for Coupon CRUD operations.
 * Coupons are the actual entries in the draw pool.
 */

import type { Coupon, CouponStatus, PaginationParams, PaginatedResult } from '@/types'

/**
 * Data for creating a new coupon
 */
export interface CreateCouponData {
  id: string // coupon_id from Excel (UNIQUE)
  eventId: string
  participantId: string
  weight?: number // default 1
}

/**
 * Data for updating an existing coupon
 */
export interface UpdateCouponData {
  weight?: number
  status?: CouponStatus
}

/**
 * Coupon repository interface
 *
 * Abstraction layer for Coupon data operations.
 */
export interface ICouponRepository {
  /**
   * Get all coupons for an event
   * @param eventId - Event ID
   * @returns Array of coupons
   */
  getByEventId(eventId: string): Promise<Coupon[]>

  /**
   * Get coupons for an event with pagination
   * @param eventId - Event ID
   * @param params - Pagination parameters (offset, limit)
   * @returns Paginated result with coupons
   */
  getByEventIdPaginated(
    eventId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<Coupon>>

  /**
   * Search coupons by ID or participant ID with pagination
   * @param eventId - Event ID
   * @param searchQuery - Search query string
   * @param params - Pagination parameters (offset, limit)
   * @returns Paginated result with matching coupons
   */
  searchByEventId(
    eventId: string,
    searchQuery: string,
    params: PaginationParams
  ): Promise<PaginatedResult<Coupon>>

  /**
   * Get coupon by ID
   * @param id - Coupon ID
   * @returns Coupon or null if not found
   */
  getById(id: string): Promise<Coupon | null>

  /**
   * Get all coupons for a participant within an event
   * @param eventId - Event ID
   * @param participantId - Participant ID
   * @returns Array of coupons
   */
  getByParticipantId(eventId: string, participantId: string): Promise<Coupon[]>

  /**
   * Get active coupons for an event (status = 'active')
   * @param eventId - Event ID
   * @returns Array of active coupons
   */
  getActive(eventId: string): Promise<Coupon[]>

  /**
   * Create a new coupon
   * @param data - Coupon creation data
   * @returns Created coupon
   */
  create(data: CreateCouponData): Promise<Coupon>

  /**
   * Create multiple coupons at once
   * @param data - Array of coupon creation data
   * @returns Array of created coupons
   */
  createMany(data: CreateCouponData[]): Promise<Coupon[]>

  /**
   * Update an existing coupon
   * @param id - Coupon ID
   * @param data - Update data
   * @returns Updated coupon
   */
  update(id: string, data: UpdateCouponData): Promise<Coupon>

  /**
   * Delete a coupon
   * @param eventId - Event ID (required for compound key lookup)
   * @param id - Coupon ID
   * @returns True if deleted successfully
   */
  delete(eventId: string, id: string): Promise<boolean>

  /**
   * Delete all coupons for an event
   * @param eventId - Event ID
   * @returns Number of coupons deleted
   */
  deleteByEventId(eventId: string): Promise<number>

  /**
   * Delete all coupons for a participant within an event
   * @param eventId - Event ID
   * @param participantId - Participant ID
   * @returns Number of coupons deleted
   */
  deleteByParticipantId(eventId: string, participantId: string): Promise<number>

  /**
   * Void a coupon (set status to 'void')
   * PERMANENTLY removes coupon from pool - cannot be undone
   *
   * ATURAN ABSOLUT:
   * - Coupon yang sudah 'void' TIDAK BOLEH kembali ke 'active'
   * - Sekali keluar dari pool = keluar selamanya
   *
   * @param eventId - Event ID
   * @param id - Coupon ID
   * @returns Updated coupon
   */
  void(eventId: string, id: string): Promise<Coupon>

  /**
   * Void all coupons for a participant within an event
   * @param eventId - Event ID
   * @param participantId - Participant ID
   * @returns Number of coupons voided
   */
  voidByParticipantId(eventId: string, participantId: string): Promise<number>

  /**
   * Get count of coupons for an event
   * @param eventId - Event ID
   * @returns Total count
   */
  getCount(eventId: string): Promise<number>

  /**
   * Get count of active coupons for an event
   * @param eventId - Event ID
   * @returns Count of active coupons
   */
  getActiveCount(eventId: string): Promise<number>

  /**
   * Check if coupon_id already exists for an event
   * @param eventId - Event ID
   * @param couponId - Coupon ID to check
   * @returns True if exists
   */
  exists(eventId: string, couponId: string): Promise<boolean>

  /**
   * Get coupon counts grouped by participant IDs
   * @param eventId - Event ID
   * @param participantIds - Array of participant IDs to count coupons for
   * @returns Map of participantId -> coupon count
   */
  getCountsByParticipantIds(
    eventId: string,
    participantIds: string[]
  ): Promise<Map<string, number>>
}
