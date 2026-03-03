import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import * as prizeApi from '@/services/api/prizeApi'
import type { PrizeRequest, BulkUpdatePrizeRequest } from '@/types/api'

export const prizeKeys = {
  all: ['prizes'] as const,
  list: (eventId: string) => [...prizeKeys.all, 'list', eventId] as const,
  detail: (id: string) => [...prizeKeys.all, 'detail', id] as const,
}

export function usePrizes(eventId: string | undefined) {
  return useQuery({
    queryKey: prizeKeys.list(eventId!),
    queryFn: () => prizeApi.getPrizesByEvent(eventId!),
    enabled: !!eventId,
  })
}

export function usePrize(id: string | undefined) {
  return useQuery({
    queryKey: prizeKeys.detail(id!),
    queryFn: () => prizeApi.getPrize(id!),
    enabled: !!id,
  })
}

export function useCreatePrizes() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ eventId, prizes }: { eventId: string; prizes: PrizeRequest[] }) =>
      prizeApi.createPrizes(eventId, prizes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: prizeKeys.list(variables.eventId) })
      toast({
        title: 'Prizes Added',
        description: 'Prizes have been added successfully.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to add prizes: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

export function useBulkUpdatePrizes() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ eventId, prizes }: { eventId: string; prizes: BulkUpdatePrizeRequest[] }) =>
      prizeApi.bulkUpdatePrizes(eventId, prizes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: prizeKeys.list(variables.eventId) })
      toast({
        title: 'Prizes Updated',
        description: 'Prizes have been updated successfully.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update prizes: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

export function useDeletePrize() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, eventId }: { id: string; eventId: string }) =>
      prizeApi.deletePrize(id).then(() => eventId),
    onSuccess: (eventId) => {
      queryClient.invalidateQueries({ queryKey: prizeKeys.list(eventId) })
      toast({
        title: 'Prize Deleted',
        description: 'The prize has been deleted.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete prize: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}
