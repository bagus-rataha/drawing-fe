import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import * as eventApi from '@/services/api/eventApi'
import type { CreateEventRequest, UpdateEventRequest } from '@/types/api'

export const eventKeys = {
  all: ['events'] as const,
  list: () => [...eventKeys.all, 'list'] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
}

export function useEvents() {
  return useQuery({
    queryKey: eventKeys.list(),
    queryFn: () => eventApi.getEvents(),
  })
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: eventKeys.detail(id!),
    queryFn: () => eventApi.getEvent(id!),
    enabled: !!id,
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: CreateEventRequest) => eventApi.createEvent(data),
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.list() })
      toast({
        title: 'Event Created',
        description: `"${event.name}" has been created successfully.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create event: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEventRequest }) =>
      eventApi.updateEvent(id, data),
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.list() })
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) })
      toast({
        title: 'Event Updated',
        description: `"${event.name}" has been updated successfully.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update event: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => eventApi.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.list() })
      toast({
        title: 'Event Deleted',
        description: 'The event has been deleted successfully.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete event: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

export function useImportParticipants() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      eventApi.importParticipants(id, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.id) })
      toast({
        title: 'Upload Berhasil',
        description: 'File sedang diproses oleh server.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload Gagal',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
