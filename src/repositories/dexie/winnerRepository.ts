/**
 * @file repositories/dexie/winnerRepository.ts
 * @description Dexie implementation for Winner repository
 *
 * Handles:
 * - CRUD operations for Winner entity
 * - Winner grouping by prize
 * - Win count tracking per participant
 * - Status-based queries for draw service
 */

import { db } from './db'
import type { Winner, WinnerStatus } from '@/types'
import type {
  IWinnerRepository,
  CreateWinnerData,
  UpdateWinnerData,
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
      lineNumber: data.lineNumber,
      batchNumber: data.batchNumber,
      status: data.status,
      cancelReason: data.cancelReason,
      drawnAt: new Date(),
      confirmedAt: undefined,
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
      lineNumber: d.lineNumber,
      batchNumber: d.batchNumber,
      status: d.status,
      cancelReason: d.cancelReason,
      drawnAt: now,
      confirmedAt: undefined,
    }))

    await db.winners.bulkAdd(winners)
    return winners
  },

  /**
   * Update a winner
   */
  async update(id: string, data: UpdateWinnerData): Promise<Winner> {
    const existing = await db.winners.get(id)
    if (!existing) {
      throw new Error(`Winner with id ${id} not found`)
    }

    const updated: Winner = {
      ...existing,
      ...data,
    }

    await db.winners.put(updated)
    return updated
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
   * Get total win count for a participant in an event (all statuses)
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

  /**
   * Get CONFIRMED win count for a participant (only status=valid AND confirmedAt IS NOT NULL)
   * Used for win rule enforcement during draw
   */
  async getConfirmedWinCount(
    eventId: string,
    participantId: string
  ): Promise<number> {
    const winners = await db.winners
      .where('eventId')
      .equals(eventId)
      .filter(
        (w) =>
          w.participantId === participantId &&
          w.status === 'valid' &&
          w.confirmedAt !== undefined
      )
      .toArray()
    return winners.length
  },

  /**
   * Get confirmed winners for a prize (status=valid AND confirmedAt IS NOT NULL)
   */
  async getConfirmedByPrizeId(prizeId: string): Promise<Winner[]> {
    const winners = await db.winners
      .where('[prizeId+status]')
      .equals([prizeId, 'valid'])
      .filter((w) => w.confirmedAt !== undefined)
      .toArray()
    return winners.sort(
      (a, b) => new Date(a.drawnAt).getTime() - new Date(b.drawnAt).getTime()
    )
  },

  /**
   * Get winners by prize with status and confirmedAt filter
   */
  async getByPrizeIdAndStatus(
    prizeId: string,
    status: WinnerStatus,
    confirmedAt?: 'null' | 'not-null'
  ): Promise<Winner[]> {
    let winners = await db.winners
      .where('[prizeId+status]')
      .equals([prizeId, status])
      .toArray()

    if (confirmedAt === 'null') {
      winners = winners.filter((w) => w.confirmedAt === undefined)
    } else if (confirmedAt === 'not-null') {
      winners = winners.filter((w) => w.confirmedAt !== undefined)
    }

    return winners.sort(
      (a, b) => new Date(a.drawnAt).getTime() - new Date(b.drawnAt).getTime()
    )
  },

  /**
   * Get count of valid winners for a prize (only status=valid)
   */
  async getValidCountByPrize(prizeId: string): Promise<number> {
    return db.winners
      .where('[prizeId+status]')
      .equals([prizeId, 'valid'])
      .count()
  },

  /**
   * Get count of confirmed winners for a prize
   */
  async getConfirmedCountByPrize(prizeId: string): Promise<number> {
    const winners = await db.winners
      .where('[prizeId+status]')
      .equals([prizeId, 'valid'])
      .filter((w) => w.confirmedAt !== undefined)
      .toArray()
    return winners.length
  },

  /**
   * Confirm all valid winners for a prize (set confirmedAt)
   * FIX (Rev 14): Added detailed logging to debug stuck issue
   */
  async confirmByPrizeId(prizeId: string): Promise<number> {
    console.log('[WinnerRepo.confirmByPrizeId] Starting for prizeId:', prizeId)
    const now = new Date()

    console.log('[WinnerRepo.confirmByPrizeId] Querying winners...')
    const winners = await db.winners
      .where('[prizeId+status]')
      .equals([prizeId, 'valid'])
      .filter((w) => w.confirmedAt === undefined)
      .toArray()
    console.log('[WinnerRepo.confirmByPrizeId] Found', winners.length, 'winners to confirm')

    if (winners.length === 0) {
      console.log('[WinnerRepo.confirmByPrizeId] No winners to confirm, returning 0')
      return 0
    }

    console.log('[WinnerRepo.confirmByPrizeId] Starting transaction...')
    await db.transaction('rw', db.winners, async () => {
      console.log('[WinnerRepo.confirmByPrizeId] Inside transaction, updating', winners.length, 'winners')
      for (let i = 0; i < winners.length; i++) {
        const winner = winners[i]
        await db.winners.put({
          ...winner,
          confirmedAt: now,
        })
        if ((i + 1) % 10 === 0 || i === winners.length - 1) {
          console.log('[WinnerRepo.confirmByPrizeId] Updated', i + 1, '/', winners.length)
        }
      }
    })
    console.log('[WinnerRepo.confirmByPrizeId] Transaction complete, returning', winners.length)

    return winners.length
  },
}

export default winnerRepository
