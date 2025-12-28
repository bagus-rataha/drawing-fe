/**
 * @file repositories/dexie/couponRepository.ts
 * @description Dexie implementation for Coupon repository
 *
 * Handles:
 * - CRUD operations for Coupon entity
 * - Coupon voiding for win rule enforcement
 * - Active coupon pool management
 */

import { db } from './db'
import type { Coupon, CouponStatus, PaginationParams, PaginatedResult } from '@/types'
import type {
  ICouponRepository,
  CreateCouponData,
  UpdateCouponData,
} from '../interfaces/couponRepository'
import { DEFAULT_COUPON_WEIGHT } from '@/utils/constants'

/**
 * Dexie implementation of ICouponRepository
 */
export const couponRepository: ICouponRepository = {
  /**
   * Get all coupons for an event
   */
  async getByEventId(eventId: string): Promise<Coupon[]> {
    return db.coupons.where('eventId').equals(eventId).toArray()
  },

  /**
   * Get coupons for an event with pagination
   * Optimized: Uses Event.totalCoupons instead of count() query
   */
  async getByEventIdPaginated(
    eventId: string,
    { offset, limit }: PaginationParams
  ): Promise<PaginatedResult<Coupon>> {
    // Fetch paginated data
    const data = await db.coupons
      .where('eventId')
      .equals(eventId)
      .offset(offset)
      .limit(limit)
      .toArray()

    // Use pre-computed total from Event (faster than count())
    const event = await db.events.get(eventId)
    const total = event?.totalCoupons || 0

    return {
      data,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    }
  },

  /**
   * Search coupons by ID or participant ID with pagination
   */
  async searchByEventId(
    eventId: string,
    searchQuery: string,
    { offset, limit }: PaginationParams
  ): Promise<PaginatedResult<Coupon>> {
    const query = searchQuery.toLowerCase()

    // Filter coupons by search query
    const allFiltered = await db.coupons
      .where('eventId')
      .equals(eventId)
      .filter(
        (c) =>
          c.id.toLowerCase().includes(query) ||
          c.participantId.toLowerCase().includes(query)
      )
      .toArray()

    const total = allFiltered.length
    const data = allFiltered.slice(offset, offset + limit)

    return {
      data,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    }
  },

  /**
   * Get coupon by ID
   * Note: With compound key, this uses filter (less efficient than compound key lookup)
   */
  async getById(id: string): Promise<Coupon | null> {
    const coupon = await db.coupons.filter((c) => c.id === id).first()
    return coupon ?? null
  },

  /**
   * Get all coupons for a participant within an event
   */
  async getByParticipantId(eventId: string, participantId: string): Promise<Coupon[]> {
    return db.coupons
      .where('eventId')
      .equals(eventId)
      .filter((c) => c.participantId === participantId)
      .toArray()
  },

  /**
   * Get active coupons for an event
   */
  async getActive(eventId: string): Promise<Coupon[]> {
    return db.coupons
      .where('[eventId+status]')
      .equals([eventId, 'active'])
      .toArray()
  },

  /**
   * Create a new coupon
   */
  async create(data: CreateCouponData): Promise<Coupon> {
    const coupon: Coupon = {
      id: data.id, // Use provided ID from Excel
      eventId: data.eventId,
      participantId: data.participantId,
      weight: data.weight ?? DEFAULT_COUPON_WEIGHT,
      status: 'active',
    }

    await db.coupons.add(coupon)
    return coupon
  },

  /**
   * Create multiple coupons at once
   */
  async createMany(data: CreateCouponData[]): Promise<Coupon[]> {
    const coupons: Coupon[] = data.map((d) => ({
      id: d.id,
      eventId: d.eventId,
      participantId: d.participantId,
      weight: d.weight ?? DEFAULT_COUPON_WEIGHT,
      status: 'active' as CouponStatus,
    }))

    await db.coupons.bulkAdd(coupons)
    return coupons
  },

  /**
   * Update an existing coupon
   * Note: Uses filter to find, then put to update
   */
  async update(id: string, data: UpdateCouponData): Promise<Coupon> {
    const existing = await db.coupons.filter((c) => c.id === id).first()
    if (!existing) {
      throw new Error(`Coupon with id ${id} not found`)
    }

    const updated: Coupon = {
      ...existing,
      ...data,
    }

    await db.coupons.put(updated)
    return updated
  },

  /**
   * Delete a coupon using compound key
   * Also updates event.totalCoupons and participant.couponCount
   */
  async delete(eventId: string, id: string): Promise<boolean> {
    // Get coupon first to know participantId
    const coupon = await db.coupons
      .where('[eventId+id]')
      .equals([eventId, id])
      .first()

    if (!coupon) {
      return false
    }

    // Delete coupon
    await db.coupons.where('[eventId+id]').equals([eventId, id]).delete()

    // Update event totalCoupons
    await db.events.where('id').equals(eventId).modify((event) => {
      event.totalCoupons = Math.max(0, (event.totalCoupons || 0) - 1)
    })

    // Update participant couponCount
    await db.participants
      .where('[eventId+id]')
      .equals([eventId, coupon.participantId])
      .modify((participant) => {
        participant.couponCount = Math.max(0, (participant.couponCount || 0) - 1)
      })

    return true
  },

  /**
   * Delete all coupons for an event
   */
  async deleteByEventId(eventId: string): Promise<number> {
    return db.coupons.where('eventId').equals(eventId).delete()
  },

  /**
   * Delete all coupons for a participant within an event
   */
  async deleteByParticipantId(eventId: string, participantId: string): Promise<number> {
    return db.coupons
      .where('eventId')
      .equals(eventId)
      .filter((c) => c.participantId === participantId)
      .delete()
  },

  /**
   * Void a coupon (permanently remove from pool)
   *
   * ATURAN ABSOLUT:
   * - Coupon yang sudah 'void' TIDAK BOLEH kembali ke 'active'
   * - Sekali keluar dari pool = keluar selamanya
   */
  async void(eventId: string, id: string): Promise<Coupon> {
    const existing = await db.coupons
      .where('[eventId+id]')
      .equals([eventId, id])
      .first()

    if (!existing) {
      throw new Error(`Coupon with id ${id} not found in event ${eventId}`)
    }

    const updated: Coupon = {
      ...existing,
      status: 'void',
    }

    await db.coupons.put(updated)
    console.log('[CouponRepo] Voided coupon:', id)
    return updated
  },

  /**
   * Void all coupons for a participant within an event
   */
  async voidByParticipantId(eventId: string, participantId: string): Promise<number> {
    const coupons = await db.coupons
      .where('eventId')
      .equals(eventId)
      .filter((c) => c.participantId === participantId)
      .toArray()

    await db.transaction('rw', db.coupons, async () => {
      for (const coupon of coupons) {
        await db.coupons.put({
          ...coupon,
          status: 'void',
        })
      }
    })

    return coupons.length
  },

  /**
   * Get total count of coupons for an event
   */
  async getCount(eventId: string): Promise<number> {
    return db.coupons.where('eventId').equals(eventId).count()
  },

  /**
   * Get count of active coupons for an event
   */
  async getActiveCount(eventId: string): Promise<number> {
    return db.coupons
      .where('[eventId+status]')
      .equals([eventId, 'active'])
      .count()
  },

  /**
   * Check if coupon_id exists for an event
   * Uses compound key for efficient lookup
   */
  async exists(eventId: string, couponId: string): Promise<boolean> {
    const coupon = await db.coupons
      .where('[eventId+id]')
      .equals([eventId, couponId])
      .first()
    return coupon !== undefined
  },

  /**
   * Get coupon counts grouped by participant IDs
   */
  async getCountsByParticipantIds(
    eventId: string,
    participantIds: string[]
  ): Promise<Map<string, number>> {
    const countMap = new Map<string, number>()

    // Initialize all participants with 0
    participantIds.forEach((id) => countMap.set(id, 0))

    // Fetch coupons for the event and filter by participant IDs
    const coupons = await db.coupons
      .where('eventId')
      .equals(eventId)
      .filter((c) => participantIds.includes(c.participantId))
      .toArray()

    // Count coupons per participant
    coupons.forEach((c) => {
      countMap.set(c.participantId, (countMap.get(c.participantId) || 0) + 1)
    })

    return countMap
  },
}

export default couponRepository
