/**
 * @file hooks/usePrizes.ts
 * @description Custom hooks for Prize data operations
 *
 * Uses TanStack Query for data fetching and caching.
 * Provides query and mutation hooks for Prize CRUD operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { prizeRepository } from '@/repositories'
import type { CreatePrizeData, UpdatePrizeData } from '@/repositories/interfaces'
import { useToast } from '@/components/ui/use-toast'

/** Query keys for prizes */
export const prizeKeys = {
  all: ['prizes'] as const,
  lists: () => [...prizeKeys.all, 'list'] as const,
  list: (eventId: string) => [...prizeKeys.lists(), eventId] as const,
  details: () => [...prizeKeys.all, 'detail'] as const,
  detail: (id: string) => [...prizeKeys.details(), id] as const,
}

/**
 * Hook to get all prizes for an event
 * @param eventId - Event ID
 */
export function usePrizes(eventId: string | undefined) {
  return useQuery({
    queryKey: prizeKeys.list(eventId!),
    queryFn: () => prizeRepository.getByEventId(eventId!),
    enabled: !!eventId,
  })
}

/**
 * Hook to get a single prize by ID
 * @param id - Prize ID
 */
export function usePrize(id: string | undefined) {
  return useQuery({
    queryKey: prizeKeys.detail(id!),
    queryFn: () => prizeRepository.getById(id!),
    enabled: !!id,
  })
}

/**
 * Hook to create a new prize
 */
export function useCreatePrize() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: CreatePrizeData) => prizeRepository.create(data),
    onSuccess: (prize) => {
      queryClient.invalidateQueries({ queryKey: prizeKeys.list(prize.eventId) })
      toast({
        title: 'Prize Added',
        description: `"${prize.name}" has been added.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to add prize: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to create multiple prizes at once
 */
export function useCreateManyPrizes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreatePrizeData[]) => prizeRepository.createMany(data),
    onSuccess: (prizes) => {
      if (prizes.length > 0) {
        queryClient.invalidateQueries({
          queryKey: prizeKeys.list(prizes[0].eventId),
        })
      }
    },
  })
}

/**
 * Hook to update an existing prize
 */
export function useUpdatePrize() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePrizeData }) =>
      prizeRepository.update(id, data),
    onSuccess: (prize) => {
      queryClient.invalidateQueries({ queryKey: prizeKeys.list(prize.eventId) })
      queryClient.invalidateQueries({ queryKey: prizeKeys.detail(prize.id) })
      toast({
        title: 'Prize Updated',
        description: `"${prize.name}" has been updated.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update prize: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to delete a prize
 */
export function useDeletePrize() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, eventId }: { id: string; eventId: string }) =>
      prizeRepository.delete(id).then(() => eventId),
    onSuccess: (eventId) => {
      queryClient.invalidateQueries({ queryKey: prizeKeys.list(eventId) })
      toast({
        title: 'Prize Deleted',
        description: 'The prize has been deleted.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete prize: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to delete all prizes for an event
 */
export function useDeletePrizesByEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) =>
      prizeRepository.deleteByEventId(eventId).then(() => eventId),
    onSuccess: (eventId) => {
      queryClient.invalidateQueries({ queryKey: prizeKeys.list(eventId) })
    },
  })
}

/**
 * Hook to reorder prizes
 */
export function useReorderPrizes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      eventId,
      prizeIds,
    }: {
      eventId: string
      prizeIds: string[]
    }) => prizeRepository.reorder(eventId, prizeIds),
    onSuccess: (prizes) => {
      if (prizes.length > 0) {
        queryClient.invalidateQueries({
          queryKey: prizeKeys.list(prizes[0].eventId),
        })
      }
    },
  })
}

/**
 * Hook to get total prize quantity for an event
 * @param eventId - Event ID
 */
export function useTotalPrizeQuantity(eventId: string | undefined) {
  return useQuery({
    queryKey: [...prizeKeys.list(eventId!), 'totalQuantity'],
    queryFn: () => prizeRepository.getTotalQuantity(eventId!),
    enabled: !!eventId,
  })
}
