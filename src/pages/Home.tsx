/**
 * @file pages/Home.tsx
 * @description Home page with event list
 *
 * Route: /
 * Shows all events with search, filter, and CRUD actions
 */

import { useState } from 'react'
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
    <div className="min-h-screen bg-surface-alt">
      <Header />

      <main className="container py-8">
        {/* Centered event list container */}
        <div className="mx-auto max-w-[720px]">
          <EventList
            events={events}
            isLoading={isLoading}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        </div>
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
