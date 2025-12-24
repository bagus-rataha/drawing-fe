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
import { ArrowLeft, Trophy } from 'lucide-react'
import { useEvent, useWinners, usePrizes } from '@/hooks'
import { formatNumber } from '@/utils/helpers'

/**
 * History page component
 */
export function History() {
  const { id } = useParams<{ id: string }>()

  const { data: event, isLoading: isLoadingEvent } = useEvent(id)
  const { data: winners = [], isLoading: isLoadingWinners } = useWinners(id)
  const { data: prizes = [], isLoading: isLoadingPrizes } = usePrizes(id)

  const isLoading = isLoadingEvent || isLoadingWinners || isLoadingPrizes

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="mb-8 h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              Event not found
            </p>
            <Button asChild className="mt-4">
              <Link to="/">Go to Home</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button variant="ghost" className="mb-2 -ml-4" asChild>
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Events
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">{event.name}</h1>
            <div className="mt-2 flex items-center gap-2 text-muted-foreground">
              <Trophy className="h-4 w-4" />
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
      </main>
    </div>
  )
}

export default History
