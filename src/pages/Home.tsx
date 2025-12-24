/**
 * @file pages/Home.tsx
 * @description Home page with event list
 *
 * Route: /
 * Shows all events with search, filter, and CRUD actions
 */

import { useState, useMemo } from 'react'
import { Header } from '@/components/layout/Header'
import { EventList } from '@/components/event/EventList'
import {
  useEvents,
  useDeleteEvent,
  useDuplicateEvent,
} from '@/hooks'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

/**
 * Home page component
 */
export function Home() {
  const { data: events = [], isLoading } = useEvents()
  const deleteEvent = useDeleteEvent()
  const duplicateEvent = useDuplicateEvent()

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
    message: string
  } | null>(null)

  // Get prize counts for all events
  const eventIds = useMemo(() => events.map((e) => e.id), [events])

  // Simple prize count tracking (in a real app, this could be optimized)
  const prizeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    // For now, we'll just show 0 - in production this would fetch prize counts
    eventIds.forEach((id) => {
      counts[id] = 0
    })
    return counts
  }, [eventIds])

  const handleDelete = (id: string) => {
    const event = events.find((e) => e.id === id)
    if (!event) return

    // Build detailed message with event data
    const deleteItems = []
    if (event.totalParticipants > 0) {
      deleteItems.push(`${event.totalParticipants} participant(s)`)
    }
    if (event.totalCoupons > 0) {
      deleteItems.push(`${event.totalCoupons} coupon(s)`)
    }

    const detailMessage = deleteItems.length > 0
      ? `\n\nThis will permanently delete:\n• ${deleteItems.join('\n• ')}\n• All prizes\n• All winner records (if any)`
      : ''

    setDeleteTarget({
      id: event.id,
      name: event.name,
      message: `Are you sure you want to delete "${event.name}"?${detailMessage}\n\nThis action cannot be undone.`,
    })
  }

  const handleConfirmDelete = () => {
    if (!deleteTarget) return
    deleteEvent.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null)
      },
      onError: () => {
        setDeleteTarget(null)
      },
    })
  }

  const handleDuplicate = (id: string) => {
    duplicateEvent.mutate(id)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your lottery and raffle events
          </p>
        </div>

        <EventList
          events={events}
          prizeCounts={prizeCounts}
          isLoading={isLoading}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      </main>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !deleteEvent.isPending && setDeleteTarget(null)}
        title="Delete Event"
        description={deleteTarget?.message || ''}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        isLoading={deleteEvent.isPending}
        requireTypedConfirmation={true}
        confirmationIdentifier={deleteTarget?.name || ''}
      />
    </div>
  )
}

export default Home
