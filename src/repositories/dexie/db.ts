/**
 * @file repositories/dexie/db.ts
 * @description Dexie database instance and schema definition
 *
 * Dexie.js is a wrapper around IndexedDB that provides a
 * more developer-friendly API for client-side storage.
 *
 * Schema Design:
 * - events: Main event table with status tracking
 * - prizes: Prizes linked to events
 * - participants: People who can win
 * - coupons: Individual draw entries (can have multiple per participant)
 * - winners: Confirmed prize winners
 */

import Dexie, { type EntityTable } from 'dexie'
import type { Event, Prize, Participant, Coupon, Winner } from '@/types'
import { DB_NAME, DB_VERSION } from '@/utils/constants'

/**
 * Lottery App Database
 *
 * Tables:
 * - events: Event management
 * - prizes: Prize configuration
 * - participants: Participant data
 * - coupons: Draw pool entries
 * - winners: Winner records
 */
class LotteryDatabase extends Dexie {
  events!: EntityTable<Event, 'id'>
  prizes!: EntityTable<Prize, 'id'>
  participants!: EntityTable<Participant, 'id'>
  coupons!: EntityTable<Coupon, 'id'>
  winners!: EntityTable<Winner, 'id'>

  constructor() {
    super(DB_NAME)

    // Version 3: Base schema
    this.version(3).stores({
      events: 'id, status, createdAt, updatedAt',
      prizes: 'id, eventId, sequence',
      participants: '[eventId+id], eventId, status',
      coupons: '[eventId+id], eventId, participantId, status, [eventId+status]',
      winners: 'id, eventId, prizeId, participantId, drawnAt',
    })

    // Version 4: Add totalPrizes to events (no index change, just data migration)
    this.version(4)
      .stores({
        events: 'id, status, createdAt, updatedAt',
        prizes: 'id, eventId, sequence',
        participants: '[eventId+id], eventId, status',
        coupons: '[eventId+id], eventId, participantId, status, [eventId+status]',
        winners: 'id, eventId, prizeId, participantId, drawnAt',
      })
      .upgrade(async (tx) => {
        // Migrate existing events: set totalPrizes based on actual prize count
        const events = await tx.table('events').toArray()
        for (const event of events) {
          if (event.totalPrizes === undefined) {
            const prizeCount = await tx
              .table('prizes')
              .where('eventId')
              .equals(event.id)
              .count()
            await tx.table('events').update(event.id, { totalPrizes: prizeCount })
          }
        }
      })

    // Version 5: Add winner status and confirmedAt indexes for draw service
    this.version(DB_VERSION)
      .stores({
        // Primary key definitions:
        // - events, prizes, winners: use simple 'id' as globally unique
        // - participants, coupons: use compound key [eventId+id] for per-event uniqueness
        //   This allows same participant_id/coupon_id in different events
        events: 'id, status, createdAt, updatedAt',
        prizes: 'id, eventId, sequence',
        participants: '[eventId+id], eventId, status',
        coupons: '[eventId+id], eventId, participantId, status, [eventId+status]',
        // Added: status, [prizeId+status] for draw service queries
        winners: 'id, eventId, prizeId, participantId, drawnAt, status, [prizeId+status]',
      })
      .upgrade(async (tx) => {
        // Migrate existing winners: set default values for new fields
        const winners = await tx.table('winners').toArray()
        for (const winner of winners) {
          // Existing winners are assumed to be confirmed and valid
          if (winner.status === undefined) {
            await tx.table('winners').update(winner.id, {
              status: 'valid',
              lineNumber: winner.batchNumber || 1,
              confirmedAt: winner.drawnAt,
            })
          }
        }
      })
  }
}

/**
 * Singleton database instance
 */
export const db = new LotteryDatabase()

/**
 * Clear all data from the database
 * Useful for development/testing
 */
export async function clearDatabase(): Promise<void> {
  await db.events.clear()
  await db.prizes.clear()
  await db.participants.clear()
  await db.coupons.clear()
  await db.winners.clear()
}

/**
 * Delete the entire database
 * Use with caution!
 */
export async function deleteDatabase(): Promise<void> {
  await db.delete()
}

export default db
