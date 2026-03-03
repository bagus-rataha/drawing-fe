import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { EventList } from '@/components/event/EventList'
import { useEvents, useDeleteEvent } from '@/hooks'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function Home() {
  const { data: events = [], isLoading } = useEvents()
  const deleteEvent = useDeleteEvent()

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
    message: string
  } | null>(null)

  const handleDelete = (id: string) => {
    const event = events.find((e) => e.id === id)
    if (!event) return

    setDeleteTarget({
      id: event.id,
      name: event.name,
      message: `Are you sure you want to delete "${event.name}"?\n\nThis will permanently delete all associated data.\n\nThis action cannot be undone.`,
    })
  }

  const handleConfirmDelete = () => {
    if (!deleteTarget) return
    deleteEvent.mutate(deleteTarget.id, {
      onSettled: () => {
        setDeleteTarget(null)
      },
    })
  }

  return (
    <div className="min-h-screen bg-surface-alt">
      <Header />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mx-auto max-w-[720px]">
          <EventList
            events={events}
            isLoading={isLoading}
            onDelete={handleDelete}
          />
        </div>
      </main>

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
