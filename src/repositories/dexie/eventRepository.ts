/**
 * @file repositories/dexie/eventRepository.ts
 * @description Dexie implementation for Event repository
 *
 * Handles:
 * - CRUD operations for Event entity
 * - Status management (draft → ready → in_progress → completed)
 * - Stats calculation (totalParticipants, totalCoupons)
 */

import { db } from './db'
import type { Event, EventStatus, FilterOptions } from '@/types'
import type {
  IEventRepository,
  CreateEventData,
  UpdateEventData,
} from '../interfaces/eventRepository'
import { generateId } from '@/utils/helpers'

/**
 * Dexie implementation of IEventRepository
 */
export const eventRepository: IEventRepository = {
  /**
   * Get all events with optional filtering
   */
  async getAll(filters?: FilterOptions): Promise<Event[]> {
    let collection = db.events.toCollection()

    if (filters?.status) {
      collection = db.events.where('status').equals(filters.status)
    }

    let events = await collection.toArray()

    // Apply search filter in memory (Dexie doesn't support full-text search)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      events = events.filter(
        (event) =>
          event.name.toLowerCase().includes(searchLower) ||
          event.description?.toLowerCase().includes(searchLower)
      )
    }

    // Sort by updatedAt descending (most recent first)
    return events.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  },

  /**
   * Get event by ID
   */
  async getById(id: string): Promise<Event | null> {
    const event = await db.events.get(id)
    return event ?? null
  },

  /**
   * Create a new event
   */
  async create(data: CreateEventData): Promise<Event> {
    const now = new Date()
    const event: Event = {
      id: generateId(),
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      winRule: data.winRule,
      displaySettings: data.displaySettings,
      status: 'draft',
      totalParticipants: 0,
      totalCoupons: 0,
      totalPrizes: 0,
      createdAt: now,
      updatedAt: now,
    }

    await db.events.add(event)
    return event
  },

  /**
   * Update an existing event
   */
  async update(id: string, data: UpdateEventData): Promise<Event> {
    const existing = await db.events.get(id)
    if (!existing) {
      throw new Error(`Event with id ${id} not found`)
    }

    const updated: Event = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    }

    await db.events.put(updated)
    return updated
  },

  /**
   * Delete an event and all related data
   */
  async delete(id: string): Promise<boolean> {
    await db.transaction(
      'rw',
      [db.events, db.prizes, db.participants, db.coupons, db.winners],
      async () => {
        // Delete related data first
        await db.winners.where('eventId').equals(id).delete()
        await db.coupons.where('eventId').equals(id).delete()
        await db.participants.where('eventId').equals(id).delete()
        await db.prizes.where('eventId').equals(id).delete()
        // Delete the event
        await db.events.delete(id)
      }
    )
    return true
  },

  /**
   * Update event status
   */
  async updateStatus(id: string, status: EventStatus): Promise<Event> {
    return this.update(id, { status })
  },

  /**
   * Duplicate an event with all prizes
   */
  async duplicate(id: string): Promise<Event> {
    const original = await db.events.get(id)
    if (!original) {
      throw new Error(`Event with id ${id} not found`)
    }

    const now = new Date()
    const newId = generateId()

    // Get original prizes to copy and count
    const originalPrizes = await db.prizes.where('eventId').equals(id).toArray()

    // Create duplicated event (copy totalPrizes from original)
    const duplicated: Event = {
      ...original,
      id: newId,
      name: `${original.name} (Copy)`,
      status: 'draft',
      totalParticipants: 0,
      totalCoupons: 0,
      totalPrizes: originalPrizes.length,
      createdAt: now,
      updatedAt: now,
    }

    await db.transaction('rw', [db.events, db.prizes], async () => {
      // Add duplicated event
      await db.events.add(duplicated)

      // Duplicate prizes
      for (const prize of originalPrizes) {
        await db.prizes.add({
          ...prize,
          id: generateId(),
          eventId: newId,
          drawnCount: 0,
        })
      }
    })

    return duplicated
  },

  /**
   * Update event statistics
   */
  async updateStats(
    id: string,
    stats: { totalParticipants?: number; totalCoupons?: number; totalPrizes?: number }
  ): Promise<Event> {
    return this.update(id, stats)
  },
}

export default eventRepository
