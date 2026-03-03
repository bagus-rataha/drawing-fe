/**
 * @file pages/History.tsx
 * @description Winner history page
 *
 * Route: /event/:id/history
 * Shows all winners for an event with export functionality
 */

import { useParams, Link } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { HistoryTable, ExportButton } from '@/components/history'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ArrowLeft, Trophy, AlertCircle } from 'lucide-react'
import { useEvent, useWinners, usePrizes } from '@/hooks'
import { formatNumber } from '@/utils/helpers'

/**
 * History page component
 */
export function History() {
  const { id } = useParams<{ id: string }>()

  const { data: event, isLoading: isLoadingEvent } = useEvent(id)
  const { data: winners = [], isLoading: isLoadingWinners } = useWinners(id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prizes = [], isLoading: isLoadingPrizes } = usePrizes(id) as any

  const isLoading = isLoadingEvent || isLoadingWinners || isLoadingPrizes

  // FIX (Rev 13): Responsive layout with proper padding
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-alt">
        <Header />
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="mx-auto max-w-[960px]">
            <Skeleton className="mb-4 h-8 w-48" />
            <Skeleton className="mb-8 h-12 w-full" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </main>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-surface-alt">
        <Header />
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="mx-auto max-w-[960px]">
            <EmptyState
              icon={AlertCircle}
              title="Event not found"
              description="The event you're looking for doesn't exist or has been deleted"
              action={{ label: 'Go to Home', href: '/' }}
            />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-alt">
      <Header />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mx-auto max-w-[960px]">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Button variant="ghost" className="mb-2 -ml-4" asChild>
                <Link to="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Events
                </Link>
              </Button>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-navy">{event.name}</h1>
              <div className="mt-2 flex items-center gap-2 text-content-muted">
                <Trophy className="h-4 w-4 text-primary" />
                <span>
                  {formatNumber(winners.length)} winner
                  {winners.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <ExportButton
              winners={winners}
              prizes={prizes}
              eventName={event.name}
              disabled={winners.length === 0}
            />
          </div>

          {/* Winners Table */}
          <HistoryTable
            winners={winners}
            prizes={prizes}
            isLoading={isLoading}
          />
        </div>
      </main>
    </div>
  )
}

export default History
