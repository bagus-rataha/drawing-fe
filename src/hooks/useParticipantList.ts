import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import * as participantApi from '@/services/api/participantApi'
import { eventKeys } from './useEvents'

export const participantKeys = {
  all: ['participants'] as const,
  list: (eventId: string) => [...participantKeys.all, 'list', eventId] as const,
  listFiltered: (eventId: string, page: number, limit: number, search: string) =>
    [...participantKeys.list(eventId), { page, limit, search }] as const,
}

export function useParticipantList(
  eventId: string | undefined,
  params: { page: number; limit: number; search: string }
) {
  return useQuery({
    queryKey: participantKeys.listFiltered(eventId!, params.page, params.limit, params.search),
    queryFn: () => participantApi.getParticipants(eventId!, params),
    enabled: !!eventId,
    staleTime: 0,
    gcTime: 0,
  })
}

export function useDeleteParticipant() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id }: { id: string; eventId: string }) =>
      participantApi.deleteParticipant(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: participantKeys.list(variables.eventId) })
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.eventId) })
      toast({
        title: 'Participant Deleted',
        description: 'Participant and associated coupons have been deleted.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete participant: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}
