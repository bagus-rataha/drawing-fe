/**
 * @file hooks/useCoupons.ts
 * @description Custom hooks for Coupon data operations
 *
 * Uses TanStack Query for data fetching and caching.
 * Provides query and mutation hooks for Coupon CRUD operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { couponRepository, participantRepository, eventRepository } from '@/repositories'
import type { CreateCouponData } from '@/repositories/interfaces'
import { eventKeys } from './useEvents'
import { participantKeys } from './useParticipants'

/** Query keys for coupons */
export const couponKeys = {
  all: ['coupons'] as const,
  lists: () => [...couponKeys.all, 'list'] as const,
  list: (eventId: string) => [...couponKeys.lists(), eventId] as const,
  paginated: (eventId: string, page: number, pageSize: number) =>
    [...couponKeys.list(eventId), 'paginated', page, pageSize] as const,
  paginatedWithSearch: (eventId: string, page: number, pageSize: number, search?: string) =>
    [...couponKeys.list(eventId), 'paginatedWithSearch', page, pageSize, search || ''] as const,
  details: () => [...couponKeys.all, 'detail'] as const,
  detail: (id: string) => [...couponKeys.details(), id] as const,
  byParticipant: (participantId: string) =>
    [...couponKeys.all, 'participant', participantId] as const,
  active: (eventId: string) => [...couponKeys.list(eventId), 'active'] as const,
  count: (eventId: string) => [...couponKeys.list(eventId), 'count'] as const,
  activeCount: (eventId: string) =>
    [...couponKeys.list(eventId), 'activeCount'] as const,
}

/**
 * Hook to get all coupons for an event
 * @param eventId - Event ID
 */
export function useCoupons(eventId: string | undefined) {
  return useQuery({
    queryKey: couponKeys.list(eventId!),
    queryFn: () => couponRepository.getByEventId(eventId!),
    enabled: !!eventId,
  })
}

/**
 * Hook to get coupons for an event with pagination
 * @param eventId - Event ID
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @param searchQuery - Optional search query to filter by coupon ID or participant ID
 */
export function useCouponsPaginated(
  eventId: string | undefined,
  page: number,
  pageSize: number,
  searchQuery?: string
) {
  const offset = (page - 1) * pageSize
  const search = searchQuery?.trim() || ''

  return useQuery({
    queryKey: couponKeys.paginatedWithSearch(eventId!, page, pageSize, search),
    queryFn: () => {
      if (search) {
        // Use search method when query is provided
        return couponRepository.searchByEventId(eventId!, search, {
          offset,
          limit: pageSize,
        })
      }
      // Use standard pagination when no search
      return couponRepository.getByEventIdPaginated(eventId!, {
        offset,
        limit: pageSize,
      })
    },
    enabled: !!eventId,
  })
}

/**
 * Hook to get coupon by ID
 * @param id - Coupon ID
 */
export function useCoupon(id: string | undefined) {
  return useQuery({
    queryKey: couponKeys.detail(id!),
    queryFn: () => couponRepository.getById(id!),
    enabled: !!id,
  })
}

/**
 * Hook to get coupons by participant within an event
 * @param eventId - Event ID
 * @param participantId - Participant ID
 */
export function useCouponsByParticipant(eventId: string | undefined, participantId: string | undefined) {
  return useQuery({
    queryKey: couponKeys.byParticipant(participantId!),
    queryFn: () => couponRepository.getByParticipantId(eventId!, participantId!),
    enabled: !!eventId && !!participantId,
  })
}

/**
 * Hook to get active coupons for an event
 * @param eventId - Event ID
 */
export function useActiveCoupons(eventId: string | undefined) {
  return useQuery({
    queryKey: couponKeys.active(eventId!),
    queryFn: () => couponRepository.getActive(eventId!),
    enabled: !!eventId,
  })
}

/**
 * Hook to get coupon count for an event
 * @param eventId - Event ID
 */
export function useCouponCount(eventId: string | undefined) {
  return useQuery({
    queryKey: couponKeys.count(eventId!),
    queryFn: () => couponRepository.getCount(eventId!),
    enabled: !!eventId,
  })
}

/**
 * Hook to get active coupon count for an event
 * @param eventId - Event ID
 */
export function useActiveCouponCount(eventId: string | undefined) {
  return useQuery({
    queryKey: couponKeys.activeCount(eventId!),
    queryFn: () => couponRepository.getActiveCount(eventId!),
    enabled: !!eventId,
  })
}

/**
 * Hook to get coupon counts for specific participants
 * @param eventId - Event ID
 * @param participantIds - Array of participant IDs
 */
export function useCouponCountsByParticipants(
  eventId: string | undefined,
  participantIds: string[]
) {
  return useQuery({
    queryKey: [...couponKeys.list(eventId!), 'countsByParticipants', participantIds],
    queryFn: () => couponRepository.getCountsByParticipantIds(eventId!, participantIds),
    enabled: !!eventId && participantIds.length > 0,
  })
}

/**
 * Hook to create multiple coupons at once
 * Used during Excel import
 */
export function useCreateManyCoupons() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCouponData[]) => couponRepository.createMany(data),
    onSuccess: (coupons) => {
      if (coupons.length > 0) {
        const eventId = coupons[0].eventId
        queryClient.invalidateQueries({
          queryKey: couponKeys.list(eventId),
        })
        queryClient.invalidateQueries({
          queryKey: couponKeys.count(eventId),
        })
        queryClient.invalidateQueries({
          queryKey: couponKeys.activeCount(eventId),
        })
        queryClient.invalidateQueries({
          queryKey: eventKeys.detail(eventId),
        })
      }
    },
  })
}

/**
 * Hook to delete all coupons for an event
 */
export function useDeleteCouponsByEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) =>
      couponRepository.deleteByEventId(eventId).then(() => eventId),
    onSuccess: (eventId) => {
      queryClient.invalidateQueries({
        queryKey: couponKeys.list(eventId),
      })
      queryClient.invalidateQueries({
        queryKey: couponKeys.count(eventId),
      })
      queryClient.invalidateQueries({
        queryKey: couponKeys.activeCount(eventId),
      })
    },
  })
}

/**
 * Hook to void a coupon
 */
export function useVoidCoupon() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => couponRepository.void(id),
    onSuccess: (coupon) => {
      queryClient.invalidateQueries({
        queryKey: couponKeys.list(coupon.eventId),
      })
      queryClient.invalidateQueries({
        queryKey: couponKeys.active(coupon.eventId),
      })
      queryClient.invalidateQueries({
        queryKey: couponKeys.activeCount(coupon.eventId),
      })
    },
  })
}

/**
 * Hook to void all coupons for a participant
 */
export function useVoidCouponsByParticipant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      participantId,
      eventId,
    }: {
      participantId: string
      eventId: string
    }) =>
      couponRepository
        .voidByParticipantId(eventId, participantId)
        .then(() => eventId),
    onSuccess: (eventId) => {
      queryClient.invalidateQueries({
        queryKey: couponKeys.list(eventId),
      })
      queryClient.invalidateQueries({
        queryKey: couponKeys.active(eventId),
      })
      queryClient.invalidateQueries({
        queryKey: couponKeys.activeCount(eventId),
      })
    },
  })
}

/**
 * Hook to delete a single coupon
 * Cascade updates participant.couponCount and event.totalCoupons
 */
export function useDeleteCoupon() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, eventId }: { id: string; eventId: string }) => {
      // Get coupon to know the participantId
      const coupon = await couponRepository.getById(id)
      if (!coupon) {
        throw new Error(`Coupon with id ${id} not found`)
      }

      const participantId = coupon.participantId

      // Delete coupon
      await couponRepository.delete(eventId, id)

      // Decrement participant couponCount
      const participant = await participantRepository.getByEventAndParticipantId(eventId, participantId)
      if (participant) {
        await participantRepository.update(participantId, {
          couponCount: Math.max(0, participant.couponCount - 1),
        })
      }

      // Decrement event totalCoupons
      const event = await eventRepository.getById(eventId)
      if (event) {
        await eventRepository.update(eventId, {
          totalCoupons: Math.max(0, event.totalCoupons - 1),
        })
      }

      return eventId
    },
    onSuccess: (eventId) => {
      queryClient.invalidateQueries({
        queryKey: couponKeys.list(eventId),
      })
      queryClient.invalidateQueries({
        queryKey: couponKeys.count(eventId),
      })
      queryClient.invalidateQueries({
        queryKey: couponKeys.activeCount(eventId),
      })
      queryClient.invalidateQueries({
        queryKey: participantKeys.list(eventId),
      })
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(eventId),
      })
    },
  })
}

/**
 * Hook to delete all coupons for a participant
 * Used when deleting a participant (cascade delete)
 */
export function useDeleteCouponsByParticipant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      participantId,
      eventId,
    }: {
      participantId: string
      eventId: string
    }) => {
      // Get all coupons for this participant and delete them
      const coupons = await couponRepository.getByParticipantId(eventId, participantId)
      for (const coupon of coupons) {
        await couponRepository.delete(eventId, coupon.id)
      }
      return eventId
    },
    onSuccess: (eventId) => {
      queryClient.invalidateQueries({
        queryKey: couponKeys.list(eventId),
      })
      queryClient.invalidateQueries({
        queryKey: couponKeys.count(eventId),
      })
      queryClient.invalidateQueries({
        queryKey: couponKeys.activeCount(eventId),
      })
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(eventId),
      })
    },
  })
}
