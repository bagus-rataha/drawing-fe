/**
 * @file pages/EventDetail.tsx
 * @description Event detail page (readonly view)
 *
 * Route: /event/:id
 * Shows event info, prizes, participant stats, display settings
 * FIX (Rev 18): New feature - dedicated event detail page
 */

import { Link, useParams, useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Play,
  History,
  Edit,
  Gift,
  Users,
  Ticket,
  Calendar,
  Trophy,
  Settings,
  ImageIcon,
} from 'lucide-react'
import { useEvent, usePrizes, useParticipantCount, useCouponCount } from '@/hooks'
import { formatDate, formatNumber } from '@/utils/helpers'
import {
  EVENT_STATUS_LABELS,
  WIN_RULE_LABELS,
  DRAW_MODE_LABELS,
  WINNER_DISPLAY_MODE_LABELS,
} from '@/utils/constants'

/**
 * Event Detail page component
 */
export function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Fetch data
  const { data: event, isLoading: isLoadingEvent } = useEvent(id)
  const { data: prizes = [], isLoading: isLoadingPrizes } = usePrizes(id)
  const { data: participantCount = 0, isLoading: isLoadingParticipants } = useParticipantCount(id)
  const { data: couponCount = 0, isLoading: isLoadingCoupons } = useCouponCount(id)

  const isLoading = isLoadingEvent || isLoadingPrizes || isLoadingParticipants || isLoadingCoupons

  // Action button logic based on status
  const canEdit = event?.status === 'draft' || event?.status === 'ready' || event?.status === 'completed'
  const canStartDraw = event?.status === 'draft' || event?.status === 'ready'
  const canContinueDraw = event?.status === 'in_progress'
  const canViewHistory = event?.status === 'in_progress' || event?.status === 'completed'

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-alt">
        <Header />
        <main className="container py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
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
        <main className="container py-8 px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-2xl font-bold text-navy mb-4">Event Not Found</h1>
            <p className="text-content-muted mb-6">The event you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/')}>Back to Home</Button>
          </div>
        </main>
      </div>
    )
  }

  const statusLabel = EVENT_STATUS_LABELS[event.status] || event.status
  const winRuleLabel = WIN_RULE_LABELS[event.winRule.type] || event.winRule.type
  const statusVariant = event.status as 'draft' | 'ready' | 'in_progress' | 'completed'

  return (
    <div className="min-h-screen bg-surface-alt">
      <Header />

      <main className="container py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Back button */}
          <Button variant="ghost" className="mb-2 -ml-2 sm:-ml-4" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Back to Events</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>

          {/* Header with title and status */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-navy">{event.name}</h1>
              {event.description && (
                <p className="mt-1 text-content-muted">{event.description}</p>
              )}
            </div>
            <Badge variant={statusVariant} className="w-fit">{statusLabel}</Badge>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            {canEdit && (
              <Button variant="outline" asChild>
                <Link to={`/event/${event.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            )}

            {canStartDraw && (
              <Button asChild>
                <Link to={`/event/${event.id}/draw`}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Draw
                </Link>
              </Button>
            )}

            {canContinueDraw && (
              <Button asChild>
                <Link to={`/event/${event.id}/draw`}>
                  <Play className="mr-2 h-4 w-4" />
                  Continue Draw
                </Link>
              </Button>
            )}

            {canViewHistory && (
              <Button variant="outline" asChild>
                <Link to={`/event/${event.id}/history`}>
                  <History className="mr-2 h-4 w-4" />
                  View History
                </Link>
              </Button>
            )}
          </div>

          {/* Event Info Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Event Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date range */}
              {(event.startDate || event.endDate) && (
                <div>
                  <span className="text-sm text-content-muted">Event Date: </span>
                  <span className="text-sm font-medium text-navy">
                    {event.startDate && formatDate(event.startDate)}
                    {event.startDate && event.endDate && ' - '}
                    {event.endDate && formatDate(event.endDate)}
                  </span>
                </div>
              )}

              {/* Win Rule */}
              <div>
                <span className="text-sm text-content-muted">Win Rule: </span>
                <span className="text-sm font-medium text-navy">{winRuleLabel}</span>
                {event.winRule.type === 'limited' && event.winRule.maxWins && (
                  <span className="text-sm text-content-muted"> (max {event.winRule.maxWins} wins)</span>
                )}
              </div>

              {/* Timestamps */}
              <div className="flex flex-wrap gap-4 pt-2 border-t border-border-custom">
                <div>
                  <span className="text-xs text-content-muted">Created: </span>
                  <span className="text-xs text-navy">{formatDate(event.createdAt)}</span>
                </div>
                <div>
                  <span className="text-xs text-content-muted">Updated: </span>
                  <span className="text-xs text-navy">{formatDate(event.updatedAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prizes Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Prizes ({prizes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prizes.length === 0 ? (
                <p className="text-content-muted text-sm">No prizes added yet.</p>
              ) : (
                <div className="space-y-3">
                  {prizes.map((prize, index) => (
                    <div
                      key={prize.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-surface-alt border border-border-custom"
                    >
                      {/* Prize Image */}
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-custom bg-white">
                        {prize.image ? (
                          <img
                            src={prize.image}
                            alt={prize.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-content-muted" />
                        )}
                      </div>
                      {/* Prize Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-navy">#{index + 1}</span>
                          <span className="font-semibold text-navy truncate">{prize.name}</span>
                        </div>
                        <div className="text-sm text-content-muted">
                          {prize.quantity} winner{prize.quantity > 1 ? 's' : ''} ·{' '}
                          {DRAW_MODE_LABELS[prize.drawConfig.mode]}
                          {prize.drawConfig.mode === 'batch' &&
                            prize.drawConfig.batches &&
                            ` (${prize.drawConfig.batches.join(', ')})`}
                        </div>
                      </div>
                      {/* Progress */}
                      <div className="text-right">
                        <div className="text-sm font-semibold text-navy">
                          {prize.drawnCount}/{prize.quantity}
                        </div>
                        <div className="text-xs text-content-muted">drawn</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Participants Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-alt border border-border-custom">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <div className="text-2xl font-bold text-navy">{formatNumber(participantCount)}</div>
                    <div className="text-sm text-content-muted">Total Participants</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-alt border border-border-custom">
                  <Ticket className="h-8 w-8 text-primary" />
                  <div>
                    <div className="text-2xl font-bold text-navy">{formatNumber(couponCount)}</div>
                    <div className="text-sm text-content-muted">Total Coupons</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-alt border border-border-custom">
                  <Trophy className="h-8 w-8 text-primary" />
                  <div>
                    <div className="text-2xl font-bold text-navy">
                      {formatNumber(prizes.reduce((sum, p) => sum + p.drawnCount, 0))}
                    </div>
                    <div className="text-sm text-content-muted">Winners Drawn</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display Settings Section */}
          {event.displaySettings && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Display Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Winner Display Mode */}
                <div>
                  <span className="text-sm text-content-muted">Winner Display: </span>
                  <span className="text-sm font-medium text-navy">
                    {WINNER_DISPLAY_MODE_LABELS[event.displaySettings.winnerDisplayMode] ||
                      event.displaySettings.winnerDisplayMode}
                  </span>
                </div>

                {/* Grid Size */}
                <div>
                  <span className="text-sm text-content-muted">Grid Size: </span>
                  <span className="text-sm font-medium text-navy">
                    {event.displaySettings.gridX || 5} x {event.displaySettings.gridY || 2}
                  </span>
                </div>

                {/* Custom Fields */}
                {event.displaySettings.customFieldsToShow &&
                  event.displaySettings.customFieldsToShow.length > 0 && (
                    <div>
                      <span className="text-sm text-content-muted">Custom Fields: </span>
                      <span className="text-sm font-medium text-navy">
                        {event.displaySettings.customFieldsToShow.join(', ')}
                      </span>
                    </div>
                  )}

                {/* Background Image Preview */}
                {event.displaySettings.backgroundImage && (
                  <div>
                    <span className="text-sm text-content-muted block mb-2">Background Image:</span>
                    <div className="w-48 h-28 rounded-lg overflow-hidden border border-border-custom">
                      <img
                        src={event.displaySettings.backgroundImage}
                        alt="Background"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

export default EventDetail
