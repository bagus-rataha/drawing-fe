/**
 * @file repositories/dexie/prizeRepository.ts
 * @description Dexie implementation for Prize repository
 *
 * Handles:
 * - CRUD operations for Prize entity
 * - Prize ordering by sequence
 * - Draw count tracking
 */

import { db } from './db'
import type { Prize } from '@/types'
import type {
  IPrizeRepository,
  CreatePrizeData,
  UpdatePrizeData,
} from '../interfaces/prizeRepository'
import { generateId } from '@/utils/helpers'

/**
 * Dexie implementation of IPrizeRepository
 */
export const prizeRepository: IPrizeRepository = {
  /**
   * Get all prizes for an event, ordered by sequence
   */
  async getByEventId(eventId: string): Promise<Prize[]> {
    const prizes = await db.prizes.where('eventId').equals(eventId).toArray()
    return prizes.sort((a, b) => a.sequence - b.sequence)
  },

  /**
   * Get prize by ID
   */
  async getById(id: string): Promise<Prize | null> {
    const prize = await db.prizes.get(id)
    return prize ?? null
  },

  /**
   * Create a new prize
   */
  async create(data: CreatePrizeData): Promise<Prize> {
    const prize: Prize = {
      id: generateId(),
      eventId: data.eventId,
      name: data.name,
      image: data.image,
      quantity: data.quantity,
      sequence: data.sequence,
      drawConfig: data.drawConfig,
      drawnCount: 0,
    }

    await db.prizes.add(prize)
    return prize
  },

  /**
   * Create multiple prizes at once
   */
  async createMany(data: CreatePrizeData[]): Promise<Prize[]> {
    const prizes: Prize[] = data.map((d) => ({
      id: generateId(),
      eventId: d.eventId,
      name: d.name,
      image: d.image,
      quantity: d.quantity,
      sequence: d.sequence,
      drawConfig: d.drawConfig,
      drawnCount: 0,
    }))

    await db.prizes.bulkAdd(prizes)
    return prizes
  },

  /**
   * Update an existing prize
   */
  async update(id: string, data: UpdatePrizeData): Promise<Prize> {
    const existing = await db.prizes.get(id)
    if (!existing) {
      throw new Error(`Prize with id ${id} not found`)
    }

    const updated: Prize = {
      ...existing,
      ...data,
    }

    await db.prizes.put(updated)
    return updated
  },

  /**
   * Delete a prize
   */
  async delete(id: string): Promise<boolean> {
    await db.prizes.delete(id)
    return true
  },

  /**
   * Delete all prizes for an event
   */
  async deleteByEventId(eventId: string): Promise<number> {
    return db.prizes.where('eventId').equals(eventId).delete()
  },

  /**
   * Reorder prizes by updating sequence numbers
   */
  async reorder(eventId: string, prizeIds: string[]): Promise<Prize[]> {
    const prizes = await db.prizes.where('eventId').equals(eventId).toArray()
    const prizeMap = new Map(prizes.map((p) => [p.id, p]))

    const updated: Prize[] = []

    await db.transaction('rw', db.prizes, async () => {
      for (let i = 0; i < prizeIds.length; i++) {
        const prize = prizeMap.get(prizeIds[i])
        if (prize) {
          prize.sequence = i + 1
          await db.prizes.put(prize)
          updated.push(prize)
        }
      }
    })

    return updated.sort((a, b) => a.sequence - b.sequence)
  },

  /**
   * Increment drawn count for a prize
   */
  async incrementDrawnCount(id: string, count = 1): Promise<Prize> {
    const existing = await db.prizes.get(id)
    if (!existing) {
      throw new Error(`Prize with id ${id} not found`)
    }

    const updated: Prize = {
      ...existing,
      drawnCount: existing.drawnCount + count,
    }

    await db.prizes.put(updated)
    return updated
  },

  /**
   * Get total quantity of all prizes for an event
   */
  async getTotalQuantity(eventId: string): Promise<number> {
    const prizes = await db.prizes.where('eventId').equals(eventId).toArray()
    return prizes.reduce((sum, prize) => sum + prize.quantity, 0)
  },
}

export default prizeRepository
