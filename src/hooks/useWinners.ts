/**
 * @file hooks/useWinners.ts
 * @description Custom hooks for Winner data operations
 *
 * Uses TanStack Query for data fetching and caching.
 * Provides query and mutation hooks for Winner CRUD operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { winnerRepository } from '@/repositories'
import type { CreateWinnerData } from '@/repositories/interfaces'
import { prizeKeys } from './usePrizes'

/** Query keys for winners */
export const winnerKeys = {
  all: ['winners'] as const,
  lists: () => [...winnerKeys.all, 'list'] as const,
  list: (eventId: string) => [...winnerKeys.lists(), eventId] as const,
  details: () => [...winnerKeys.all, 'detail'] as const,
  detail: (id: string) => [...winnerKeys.details(), id] as const,
  byPrize: (prizeId: string) => [...winnerKeys.all, 'prize', prizeId] as const,
  byParticipant: (participantId: string) =>
    [...winnerKeys.all, 'participant', participantId] as const,
  grouped: (eventId: string) => [...winnerKeys.list(eventId), 'grouped'] as const,
  count: (eventId: string) => [...winnerKeys.list(eventId), 'count'] as const,
  participantWinCount: (eventId: string, participantId: string) =>
    [...winnerKeys.all, 'participantWinCount', eventId, participantId] as const,
}

/**
 * Hook to get all winners for an event
 * FIX (Rev 12): Use staleTime: 0 to ensure fresh data on navigation
 * @param eventId - Event ID
 */
export function useWinners(eventId: string | undefined) {
  return useQuery({
    queryKey: winnerKeys.list(eventId!),
    queryFn: () => winnerRepository.getByEventId(eventId!),
    enabled: !!eventId,
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always', // Refetch when component mounts
  })
}

/**
 * Hook to get winner by ID
 * @param id - Winner ID
 */
export function useWinner(id: string | undefined) {
  return useQuery({
    queryKey: winnerKeys.detail(id!),
    queryFn: () => winnerRepository.getById(id!),
    enabled: !!id,
  })
}

/**
 * Hook to get winners by prize
 * @param prizeId - Prize ID
 */
export function useWinnersByPrize(prizeId: string | undefined) {
  return useQuery({
    queryKey: winnerKeys.byPrize(prizeId!),
    queryFn: () => winnerRepository.getByPrizeId(prizeId!),
    enabled: !!prizeId,
  })
}

/**
 * Hook to get winners by participant
 * @param participantId - Participant ID
 */
export function useWinnersByParticipant(participantId: string | undefined) {
  return useQuery({
    queryKey: winnerKeys.byParticipant(participantId!),
    queryFn: () => winnerRepository.getByParticipantId(participantId!),
    enabled: !!participantId,
  })
}

/**
 * Hook to get winners grouped by prize
 * FIX (Rev 12): Use staleTime: 0 to ensure fresh data on navigation
 * @param eventId - Event ID
 */
export function useWinnersGroupedByPrize(eventId: string | undefined) {
  return useQuery({
    queryKey: winnerKeys.grouped(eventId!),
    queryFn: () => winnerRepository.getGroupedByPrize(eventId!),
    enabled: !!eventId,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

/**
 * Hook to get winner count for an event
 * @param eventId - Event ID
 */
export function useWinnerCount(eventId: string | undefined) {
  return useQuery({
    queryKey: winnerKeys.count(eventId!),
    queryFn: () => winnerRepository.getCount(eventId!),
    enabled: !!eventId,
  })
}

/**
 * Hook to get participant win count in an event
 * @param eventId - Event ID
 * @param participantId - Participant ID
 */
export function useParticipantWinCount(
  eventId: string | undefined,
  participantId: string | undefined
) {
  return useQuery({
    queryKey: winnerKeys.participantWinCount(eventId!, participantId!),
    queryFn: () =>
      winnerRepository.getParticipantWinCount(eventId!, participantId!),
    enabled: !!eventId && !!participantId,
  })
}

/**
 * Hook to create a winner
 */
export function useCreateWinner() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateWinnerData) => winnerRepository.create(data),
    onSuccess: (winner) => {
      queryClient.invalidateQueries({
        queryKey: winnerKeys.list(winner.eventId),
      })
      queryClient.invalidateQueries({
        queryKey: winnerKeys.byPrize(winner.prizeId),
      })
      queryClient.invalidateQueries({
        queryKey: winnerKeys.grouped(winner.eventId),
      })
      queryClient.invalidateQueries({
        queryKey: winnerKeys.count(winner.eventId),
      })
      queryClient.invalidateQueries({
        queryKey: prizeKeys.detail(winner.prizeId),
      })
    },
  })
}

/**
 * Hook to create multiple winners at once
 */
export function useCreateManyWinners() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateWinnerData[]) => winnerRepository.createMany(data),
    onSuccess: (winners) => {
      if (winners.length > 0) {
        const eventId = winners[0].eventId
        queryClient.invalidateQueries({
          queryKey: winnerKeys.list(eventId),
        })
        queryClient.invalidateQueries({
          queryKey: winnerKeys.grouped(eventId),
        })
        queryClient.invalidateQueries({
          queryKey: winnerKeys.count(eventId),
        })

        // Invalidate prize-specific queries
        const prizeIds = [...new Set(winners.map((w) => w.prizeId))]
        prizeIds.forEach((prizeId) => {
          queryClient.invalidateQueries({
            queryKey: winnerKeys.byPrize(prizeId),
          })
          queryClient.invalidateQueries({
            queryKey: prizeKeys.detail(prizeId),
          })
        })
      }
    },
  })
}

/**
 * Hook to delete a winner
 */
export function useDeleteWinner() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      eventId,
      prizeId,
    }: {
      id: string
      eventId: string
      prizeId: string
    }) =>
      winnerRepository.delete(id).then(() => ({ eventId, prizeId })),
    onSuccess: ({ eventId, prizeId }) => {
      queryClient.invalidateQueries({
        queryKey: winnerKeys.list(eventId),
      })
      queryClient.invalidateQueries({
        queryKey: winnerKeys.byPrize(prizeId),
      })
      queryClient.invalidateQueries({
        queryKey: winnerKeys.grouped(eventId),
      })
      queryClient.invalidateQueries({
        queryKey: winnerKeys.count(eventId),
      })
    },
  })
}
