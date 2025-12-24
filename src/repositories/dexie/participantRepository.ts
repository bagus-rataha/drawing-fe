/**
 * @file repositories/dexie/participantRepository.ts
 * @description Dexie implementation for Participant repository
 *
 * Handles:
 * - CRUD operations for Participant entity
 * - Win count tracking
 * - Status management (active → exhausted)
 */

import { db } from './db'
import type {
  Participant,
  ParticipantStatus,
  PaginationParams,
  PaginatedResult,
} from '@/types'
import type {
  IParticipantRepository,
  CreateParticipantData,
  UpdateParticipantData,
} from '../interfaces/participantRepository'

/**
 * Dexie implementation of IParticipantRepository
 */
export const participantRepository: IParticipantRepository = {
  /**
   * Get all participants for an event
   */
  async getByEventId(eventId: string): Promise<Participant[]> {
    return db.participants.where('eventId').equals(eventId).toArray()
  },

  /**
   * Get participants for an event with pagination
   */
  async getByEventIdPaginated(
    eventId: string,
    { offset, limit }: PaginationParams
  ): Promise<PaginatedResult<Participant>> {
    const total = await db.participants.where('eventId').equals(eventId).count()
    const data = await db.participants
      .where('eventId')
      .equals(eventId)
      .offset(offset)
      .limit(limit)
      .toArray()

    return {
      data,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    }
  },

  /**
   * Search participants by ID or name with pagination
   * couponCount is now pre-computed and stored in Participant
   */
  async searchByEventId(
    eventId: string,
    searchQuery: string,
    { offset, limit }: PaginationParams
  ): Promise<PaginatedResult<Participant>> {
    const query = searchQuery.toLowerCase()

    // Filter participants by search query
    const allFiltered = await db.participants
      .where('eventId')
      .equals(eventId)
      .filter(
        (p) =>
          p.id.toLowerCase().includes(query) ||
          (p.name?.toLowerCase().includes(query) || false)
      )
      .toArray()

    const total = allFiltered.length
    const data = allFiltered.slice(offset, offset + limit)

    // No need to fetch coupon counts - couponCount is already in Participant

    return {
      data,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    }
  },

  /**
   * Get participant by ID
   * Note: With compound key, this uses filter (less efficient than compound key lookup)
   * Prefer getByEventAndParticipantId when eventId is available
   */
  async getById(id: string): Promise<Participant | null> {
    const participant = await db.participants.filter((p) => p.id === id).first()
    return participant ?? null
  },

  /**
   * Get participant by event and participant ID
   * This is the efficient lookup using compound primary key
   */
  async getByEventAndParticipantId(
    eventId: string,
    participantId: string
  ): Promise<Participant | null> {
    // Use compound key for efficient lookup
    const participant = await db.participants
      .where('[eventId+id]')
      .equals([eventId, participantId])
      .first()
    return participant ?? null
  },

  /**
   * Create a new participant
   */
  async create(data: CreateParticipantData): Promise<Participant> {
    const participant: Participant = {
      id: data.id, // Use provided ID from Excel
      eventId: data.eventId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      customFields: data.customFields,
      couponCount: data.couponCount, // Pre-computed coupon count
      winCount: 0,
      status: 'active',
    }

    await db.participants.add(participant)
    return participant
  },

  /**
   * Create multiple participants at once
   */
  async createMany(data: CreateParticipantData[]): Promise<Participant[]> {
    const participants: Participant[] = data.map((d) => ({
      id: d.id,
      eventId: d.eventId,
      name: d.name,
      email: d.email,
      phone: d.phone,
      customFields: d.customFields,
      couponCount: d.couponCount, // Pre-computed coupon count
      winCount: 0,
      status: 'active',
    }))

    await db.participants.bulkAdd(participants)
    return participants
  },

  /**
   * Update an existing participant
   * Note: Uses filter to find, then put to update
   */
  async update(id: string, data: UpdateParticipantData): Promise<Participant> {
    const existing = await db.participants.filter((p) => p.id === id).first()
    if (!existing) {
      throw new Error(`Participant with id ${id} not found`)
    }

    const updated: Participant = {
      ...existing,
      ...data,
      customFields: data.customFields ?? existing.customFields,
    }

    await db.participants.put(updated)
    return updated
  },

  /**
   * Delete a participant using compound key
   */
  async delete(eventId: string, id: string): Promise<boolean> {
    await db.participants.where('[eventId+id]').equals([eventId, id]).delete()
    return true
  },

  /**
   * Delete all participants for an event
   */
  async deleteByEventId(eventId: string): Promise<number> {
    return db.participants.where('eventId').equals(eventId).delete()
  },

  /**
   * Increment win count for a participant
   * Note: Uses filter to find by id
   */
  async incrementWinCount(id: string, count = 1): Promise<Participant> {
    const existing = await db.participants.filter((p) => p.id === id).first()
    if (!existing) {
      throw new Error(`Participant with id ${id} not found`)
    }

    const updated: Participant = {
      ...existing,
      winCount: existing.winCount + count,
    }

    await db.participants.put(updated)
    return updated
  },

  /**
   * Update participant status
   */
  async updateStatus(id: string, status: ParticipantStatus): Promise<Participant> {
    return this.update(id, { status })
  },

  /**
   * Get count of unique participants for an event
   */
  async getCount(eventId: string): Promise<number> {
    return db.participants.where('eventId').equals(eventId).count()
  },

  /**
   * Get active participants
   */
  async getActive(eventId: string): Promise<Participant[]> {
    return db.participants
      .where('eventId')
      .equals(eventId)
      .filter((p) => p.status === 'active')
      .toArray()
  },
}

export default participantRepository
