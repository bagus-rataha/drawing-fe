/**
 * @file hooks/useEvents.ts
 * @description Custom hooks for Event data operations
 *
 * Uses TanStack Query for data fetching and caching.
 * Provides query and mutation hooks for Event CRUD operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventRepository } from '@/repositories'
import type { EventStatus, FilterOptions } from '@/types'
import type { CreateEventData, UpdateEventData } from '@/repositories/interfaces'
import { useToast } from '@/components/ui/use-toast'

/** Query keys for events */
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters?: FilterOptions) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
}

/**
 * Hook to get all events with optional filtering
 * @param filters - Optional filter options
 */
export function useEvents(filters?: FilterOptions) {
  return useQuery({
    queryKey: eventKeys.list(filters),
    queryFn: () => eventRepository.getAll(filters),
  })
}

/**
 * Hook to get a single event by ID
 * @param id - Event ID
 */
export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: eventKeys.detail(id!),
    queryFn: () => eventRepository.getById(id!),
    enabled: !!id,
  })
}

/**
 * Hook to create a new event
 */
export function useCreateEvent() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: CreateEventData) => eventRepository.create(data),
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      toast({
        title: 'Event Created',
        description: `"${event.name}" has been created successfully.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create event: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to update an existing event
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEventData }) =>
      eventRepository.update(id, data),
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) })
      toast({
        title: 'Event Updated',
        description: `"${event.name}" has been updated successfully.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update event: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to delete an event
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => eventRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      toast({
        title: 'Event Deleted',
        description: 'The event has been deleted successfully.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete event: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to update event status
 */
export function useUpdateEventStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EventStatus }) =>
      eventRepository.updateStatus(id, status),
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) })
    },
  })
}

/**
 * Hook to duplicate an event
 */
export function useDuplicateEvent() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => eventRepository.duplicate(id),
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      toast({
        title: 'Event Duplicated',
        description: `"${event.name}" has been created.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to duplicate event: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to update event statistics
 */
export function useUpdateEventStats() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      stats,
    }: {
      id: string
      stats: { totalParticipants: number; totalCoupons: number }
    }) => eventRepository.updateStats(id, stats),
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) })
    },
  })
}
