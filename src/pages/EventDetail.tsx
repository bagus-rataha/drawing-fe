/**
 * @file pages/EventDetail.tsx
 * @description Event detail page (readonly view)
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
  Upload,
  ImageIcon,
} from 'lucide-react'
import { useEvent, usePrizes } from '@/hooks'
import { formatDate, formatNumber } from '@/utils/helpers'
import {
  EVENT_STATUS_LABELS,
  WIN_RULE_LABELS,
  DRAW_MODE_LABELS,
  ANIMATION_TYPE_LABELS,
  IMPORT_STATUS_LABELS,
} from '@/utils/constants'

export function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: event, isLoading: isLoadingEvent } = useEvent(id)
  const { data: prizes = [], isLoading: isLoadingPrizes } = usePrizes(id)

  const isLoading = isLoadingEvent || isLoadingPrizes

  // Action button logic
  const canEdit = event?.status === 'draft'
  const canImport = event?.import_status === 'draft' || event?.import_status === 'fail'
  const canViewHistory = event?.status === 'in_progress' || event?.status === 'completed'

  // Draw button logic
  const isDrawComplete = event?.status === 'completed'
  let drawButtonText = 'Start Draw'
  let DrawButtonIcon = Play
  if (isDrawComplete) {
    drawButtonText = 'Draw Result'
    DrawButtonIcon = Trophy
  } else if (event?.status === 'in_progress') {
    drawButtonText = 'Resume Draw'
    DrawButtonIcon = Play
  }

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
  const winRuleLabel = WIN_RULE_LABELS[event.win_rule] || event.win_rule
  const importStatusLabel = IMPORT_STATUS_LABELS[event.import_status] || event.import_status
  const statusVariant = event.status as 'draft' | 'in_progress' | 'completed'

  const importBadgeVariant =
    event.import_status === 'done'
      ? 'completed'
      : event.import_status === 'fail'
        ? 'draft'
        : event.import_status === 'in_progress'
          ? 'in_progress'
          : 'draft'

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
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant} className="w-fit">{statusLabel}</Badge>
              <Badge variant={importBadgeVariant as 'draft' | 'in_progress' | 'completed'}>
                {importStatusLabel}
              </Badge>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            {canEdit && (
              <Button variant="outline" asChild>
                <Link to={`/events/${event.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            )}

            {canImport && (
              <Button variant="outline" asChild>
                <Link to={`/events/${event.id}/import`}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Participants
                </Link>
              </Button>
            )}

            <Button variant={isDrawComplete ? 'outline' : 'default'} asChild>
              <Link to={`/draw/${event.id}`}>
                <DrawButtonIcon className="mr-2 h-4 w-4" />
                {drawButtonText}
              </Link>
            </Button>

            {canViewHistory && (
              <Button variant="outline" asChild>
                <Link to={`/history/${event.id}`}>
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
              {(event.start_date || event.end_date) && (
                <div>
                  <span className="text-sm text-content-muted">Event Date: </span>
                  <span className="text-sm font-medium text-navy">
                    {event.start_date && formatDate(event.start_date)}
                    {event.start_date && event.end_date && ' - '}
                    {event.end_date && formatDate(event.end_date)}
                  </span>
                </div>
              )}

              {/* Win Rule */}
              <div>
                <span className="text-sm text-content-muted">Win Rule: </span>
                <span className="text-sm font-medium text-navy">{winRuleLabel}</span>
              </div>

              {/* Draw Mode */}
              <div>
                <span className="text-sm text-content-muted">Draw Mode: </span>
                <span className="text-sm font-medium text-navy">
                  {DRAW_MODE_LABELS[event.draw_mode] || event.draw_mode}
                </span>
              </div>

              {/* Animation Type */}
              <div>
                <span className="text-sm text-content-muted">Animation: </span>
                <span className="text-sm font-medium text-navy">
                  {ANIMATION_TYPE_LABELS[event.animation_type] || event.animation_type}
                </span>
              </div>

              {/* Import Status */}
              {event.import_status === 'in_progress' && (
                <div className="space-y-2">
                  <span className="text-sm text-content-muted">Import Progress: </span>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${event.import_progress || 0}%` }}
                    />
                  </div>
                  {event.import_message && (
                    <p className="text-xs text-content-muted">{event.import_message}</p>
                  )}
                </div>
              )}

              {/* Timestamps */}
              <div className="flex flex-wrap gap-4 pt-2 border-t border-border-custom">
                <div>
                  <span className="text-xs text-content-muted">Created: </span>
                  <span className="text-xs text-navy">{formatDate(event.created_at)}</span>
                </div>
                <div>
                  <span className="text-xs text-content-muted">Updated: </span>
                  <span className="text-xs text-navy">{formatDate(event.updated_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-alt border border-border-custom">
                  <Gift className="h-8 w-8 text-primary" />
                  <div>
                    <div className="text-2xl font-bold text-navy">{event.total_prizes}</div>
                    <div className="text-sm text-content-muted">Prizes</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-alt border border-border-custom">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <div className="text-2xl font-bold text-navy">{formatNumber(event.total_participants)}</div>
                    <div className="text-sm text-content-muted">Participants</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-alt border border-border-custom">
                  <Ticket className="h-8 w-8 text-primary" />
                  <div>
                    <div className="text-2xl font-bold text-navy">{formatNumber(event.total_coupons)}</div>
                    <div className="text-sm text-content-muted">Coupons</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-alt border border-border-custom">
                  <Trophy className="h-8 w-8 text-primary" />
                  <div>
                    <div className="text-2xl font-bold text-navy">{formatNumber(event.total_winners)}</div>
                    <div className="text-sm text-content-muted">Winners</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prizes Section */}
          <Card>
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
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-custom bg-white">
                        <ImageIcon className="h-5 w-5 text-content-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-navy">#{index + 1}</span>
                          <span className="font-semibold text-navy truncate">{prize.name}</span>
                        </div>
                        <div className="text-sm text-content-muted">
                          {prize.quantity} winner{prize.quantity > 1 ? 's' : ''}
                          {event.draw_mode === 'batch' && prize.batch_number >= 2 &&
                            ` · Batch size: ${prize.batch_number}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-navy">
                          {prize.current_batch}/{Math.ceil(prize.quantity / (prize.batch_number || 1))}
                        </div>
                        <div className="text-xs text-content-muted">batches</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default EventDetail
