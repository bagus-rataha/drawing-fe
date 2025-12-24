/**
 * @file repositories/dexie/winnerRepository.ts
 * @description Dexie implementation for Winner repository
 *
 * Handles:
 * - CRUD operations for Winner entity
 * - Winner grouping by prize
 * - Win count tracking per participant
 */

import { db } from './db'
import type { Winner } from '@/types'
import type {
  IWinnerRepository,
  CreateWinnerData,
} from '../interfaces/winnerRepository'
import { generateId } from '@/utils/helpers'

/**
 * Dexie implementation of IWinnerRepository
 */
export const winnerRepository: IWinnerRepository = {
  /**
   * Get all winners for an event
   */
  async getByEventId(eventId: string): Promise<Winner[]> {
    const winners = await db.winners.where('eventId').equals(eventId).toArray()
    return winners.sort(
      (a, b) => new Date(a.drawnAt).getTime() - new Date(b.drawnAt).getTime()
    )
  },

  /**
   * Get winner by ID
   */
  async getById(id: string): Promise<Winner | null> {
    const winner = await db.winners.get(id)
    return winner ?? null
  },

  /**
   * Get all winners for a prize
   */
  async getByPrizeId(prizeId: string): Promise<Winner[]> {
    const winners = await db.winners.where('prizeId').equals(prizeId).toArray()
    return winners.sort(
      (a, b) => new Date(a.drawnAt).getTime() - new Date(b.drawnAt).getTime()
    )
  },

  /**
   * Get all winners for a participant
   */
  async getByParticipantId(participantId: string): Promise<Winner[]> {
    return db.winners.where('participantId').equals(participantId).toArray()
  },

  /**
   * Get winners grouped by prize
   */
  async getGroupedByPrize(eventId: string): Promise<Map<string, Winner[]>> {
    const winners = await this.getByEventId(eventId)
    const grouped = new Map<string, Winner[]>()

    for (const winner of winners) {
      const existing = grouped.get(winner.prizeId) || []
      existing.push(winner)
      grouped.set(winner.prizeId, existing)
    }

    return grouped
  },

  /**
   * Create a new winner
   */
  async create(data: CreateWinnerData): Promise<Winner> {
    const winner: Winner = {
      id: generateId(),
      eventId: data.eventId,
      prizeId: data.prizeId,
      participantId: data.participantId,
      participantName: data.participantName,
      couponId: data.couponId,
      customFieldsSnapshot: data.customFieldsSnapshot,
      batchNumber: data.batchNumber,
      drawnAt: new Date(),
    }

    await db.winners.add(winner)
    return winner
  },

  /**
   * Create multiple winners at once
   */
  async createMany(data: CreateWinnerData[]): Promise<Winner[]> {
    const now = new Date()
    const winners: Winner[] = data.map((d) => ({
      id: generateId(),
      eventId: d.eventId,
      prizeId: d.prizeId,
      participantId: d.participantId,
      participantName: d.participantName,
      couponId: d.couponId,
      customFieldsSnapshot: d.customFieldsSnapshot,
      batchNumber: d.batchNumber,
      drawnAt: now,
    }))

    await db.winners.bulkAdd(winners)
    return winners
  },

  /**
   * Delete a winner
   */
  async delete(id: string): Promise<boolean> {
    await db.winners.delete(id)
    return true
  },

  /**
   * Delete all winners for an event
   */
  async deleteByEventId(eventId: string): Promise<number> {
    return db.winners.where('eventId').equals(eventId).delete()
  },

  /**
   * Delete all winners for a prize
   */
  async deleteByPrizeId(prizeId: string): Promise<number> {
    return db.winners.where('prizeId').equals(prizeId).delete()
  },

  /**
   * Get total count of winners for an event
   */
  async getCount(eventId: string): Promise<number> {
    return db.winners.where('eventId').equals(eventId).count()
  },

  /**
   * Get count of winners for a prize
   */
  async getCountByPrize(prizeId: string): Promise<number> {
    return db.winners.where('prizeId').equals(prizeId).count()
  },

  /**
   * Get win count for a participant in an event
   */
  async getParticipantWinCount(
    eventId: string,
    participantId: string
  ): Promise<number> {
    const winners = await db.winners
      .where('eventId')
      .equals(eventId)
      .filter((w) => w.participantId === participantId)
      .toArray()
    return winners.length
  },
}

export default winnerRepository
