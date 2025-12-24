/**
 * @file hooks/useParticipants.ts
 * @description Custom hooks for Participant data operations
 *
 * Uses TanStack Query for data fetching and caching.
 * Provides query and mutation hooks for Participant CRUD operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { participantRepository, couponRepository, eventRepository } from '@/repositories'
import type { CreateParticipantData } from '@/repositories/interfaces'
import { eventKeys } from './useEvents'
import { couponKeys } from './useCoupons'

/** Query keys for participants */
export const participantKeys = {
  all: ['participants'] as const,
  lists: () => [...participantKeys.all, 'list'] as const,
  list: (eventId: string) => [...participantKeys.lists(), eventId] as const,
  paginated: (eventId: string, page: number, pageSize: number) =>
    [...participantKeys.list(eventId), 'paginated', page, pageSize] as const,
  paginatedWithCount: (eventId: string, page: number, pageSize: number, search?: string) =>
    [...participantKeys.list(eventId), 'paginatedWithCount', page, pageSize, search || ''] as const,
  details: () => [...participantKeys.all, 'detail'] as const,
  detail: (id: string) => [...participantKeys.details(), id] as const,
  count: (eventId: string) => [...participantKeys.list(eventId), 'count'] as const,
  active: (eventId: string) => [...participantKeys.list(eventId), 'active'] as const,
}

/**
 * Hook to get all participants for an event
 * @param eventId - Event ID
 */
export function useParticipants(eventId: string | undefined) {
  return useQuery({
    queryKey: participantKeys.list(eventId!),
    queryFn: () => participantRepository.getByEventId(eventId!),
    enabled: !!eventId,
  })
}

/**
 * Hook to get participants for an event with pagination
 * @param eventId - Event ID
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @param searchQuery - Optional search query to filter by participant ID or name
 *
 * Returns Participant which includes pre-computed couponCount
 */
export function useParticipantsPaginated(
  eventId: string | undefined,
  page: number,
  pageSize: number,
  searchQuery?: string
) {
  const offset = (page - 1) * pageSize
  const search = searchQuery?.trim() || ''

  return useQuery({
    queryKey: participantKeys.paginatedWithCount(eventId!, page, pageSize, search),
    queryFn: () => {
      if (search) {
        // Use simplified search method (couponCount is pre-computed in Participant)
        return participantRepository.searchByEventId(eventId!, search, {
          offset,
          limit: pageSize,
        })
      }
      // Use simplified paginated method (couponCount is pre-computed in Participant)
      return participantRepository.getByEventIdPaginated(eventId!, {
        offset,
        limit: pageSize,
      })
    },
    enabled: !!eventId,
  })
}

/**
 * Hook to get participant by ID
 * @param id - Participant ID
 */
export function useParticipant(id: string | undefined) {
  return useQuery({
    queryKey: participantKeys.detail(id!),
    queryFn: () => participantRepository.getById(id!),
    enabled: !!id,
  })
}

/**
 * Hook to get participant count for an event
 * @param eventId - Event ID
 */
export function useParticipantCount(eventId: string | undefined) {
  return useQuery({
    queryKey: participantKeys.count(eventId!),
    queryFn: () => participantRepository.getCount(eventId!),
    enabled: !!eventId,
  })
}

/**
 * Hook to get active participants for an event
 * @param eventId - Event ID
 */
export function useActiveParticipants(eventId: string | undefined) {
  return useQuery({
    queryKey: participantKeys.active(eventId!),
    queryFn: () => participantRepository.getActive(eventId!),
    enabled: !!eventId,
  })
}

/**
 * Hook to create multiple participants at once
 * Used during Excel import
 */
export function useCreateManyParticipants() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateParticipantData[]) =>
      participantRepository.createMany(data),
    onSuccess: (participants) => {
      if (participants.length > 0) {
        const eventId = participants[0].eventId
        queryClient.invalidateQueries({
          queryKey: participantKeys.list(eventId),
        })
        queryClient.invalidateQueries({
          queryKey: participantKeys.count(eventId),
        })
        queryClient.invalidateQueries({
          queryKey: eventKeys.detail(eventId),
        })
      }
    },
  })
}

/**
 * Hook to delete all participants for an event
 */
export function useDeleteParticipantsByEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) =>
      participantRepository.deleteByEventId(eventId).then(() => eventId),
    onSuccess: (eventId) => {
      queryClient.invalidateQueries({
        queryKey: participantKeys.list(eventId),
      })
      queryClient.invalidateQueries({
        queryKey: participantKeys.count(eventId),
      })
    },
  })
}

/**
 * Hook to increment participant win count
 */
export function useIncrementParticipantWinCount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, count = 1 }: { id: string; count?: number }) =>
      participantRepository.incrementWinCount(id, count),
    onSuccess: (participant) => {
      queryClient.invalidateQueries({
        queryKey: participantKeys.list(participant.eventId),
      })
      queryClient.invalidateQueries({
        queryKey: participantKeys.detail(participant.id),
      })
    },
  })
}

/**
 * Hook to delete a single participant
 * Cascade deletes all coupons and updates event analytics
 */
export function useDeleteParticipant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, eventId }: { id: string; eventId: string }) => {
      // Get participant to know couponCount for event update
      const participant = await participantRepository.getByEventAndParticipantId(eventId, id)
      if (!participant) {
        throw new Error(`Participant with id ${id} not found`)
      }

      const couponCount = participant.couponCount

      // Delete all coupons for this participant
      await couponRepository.deleteByParticipantId(eventId, id)

      // Delete participant
      await participantRepository.delete(eventId, id)

      // Update event analytics (decrement totalParticipants by 1, totalCoupons by couponCount)
      const event = await eventRepository.getById(eventId)
      if (event) {
        await eventRepository.update(eventId, {
          totalParticipants: Math.max(0, event.totalParticipants - 1),
          totalCoupons: Math.max(0, event.totalCoupons - couponCount),
        })
      }

      return eventId
    },
    onSuccess: (eventId) => {
      queryClient.invalidateQueries({
        queryKey: participantKeys.list(eventId),
      })
      queryClient.invalidateQueries({
        queryKey: participantKeys.count(eventId),
      })
      queryClient.invalidateQueries({
        queryKey: couponKeys.list(eventId),
      })
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(eventId),
      })
    },
  })
}
