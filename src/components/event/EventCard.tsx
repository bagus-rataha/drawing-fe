/**
 * @file components/event/EventCard.tsx
 * @description Event card component for displaying event summary
 */

import { Link } from 'react-router-dom'
import type { Event } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Gift,
  Users,
  Ticket,
  Edit,
  Play,
  History,
  MoreVertical,
  Trash2,
  Copy,
} from 'lucide-react'
import { formatNumber, formatDate } from '@/utils/helpers'
import { EVENT_STATUS_LABELS, WIN_RULE_LABELS } from '@/utils/constants'

interface EventCardProps {
  event: Event
  onDelete?: (id: string) => void
  onDuplicate?: (id: string) => void
}

/**
 * Event card component showing event summary and actions
 */
export function EventCard({
  event,
  onDelete,
  onDuplicate,
}: EventCardProps) {
  const statusLabel = EVENT_STATUS_LABELS[event.status] || event.status
  const winRuleLabel = WIN_RULE_LABELS[event.winRule.type] || event.winRule.type

  const canEdit =
    event.status === 'draft' ||
    event.status === 'ready' ||
    event.status === 'completed'
  const canStartDraw = event.status === 'draft' || event.status === 'ready'
  const canContinueDraw = event.status === 'in_progress'
  const canViewHistory =
    event.status === 'in_progress' || event.status === 'completed'
  const canDelete = event.status !== 'in_progress'
  const canDuplicate = event.status === 'completed'

  // Map status to badge variant
  const statusVariant = event.status as
    | 'draft'
    | 'ready'
    | 'in_progress'
    | 'completed'

  return (
    <div className="flex flex-col rounded-xl border border-border-custom bg-white p-6 shadow-card transition-all duration-200 hover:border-primary hover:shadow-card-hover">
      {/* Header Row */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-navy truncate">{event.name}</h3>
          {event.description && (
            <p className="mt-1 text-sm text-content-muted line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          <Badge variant={statusVariant}>{statusLabel}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canDuplicate && onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(event.id)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {canDuplicate && canDelete && <DropdownMenuSeparator />}
              {canDelete && onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(event.id)}
                  className="text-error focus:text-error"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mt-4 flex flex-wrap gap-6">
        <div className="flex items-center gap-1.5">
          <Gift className="h-4 w-4 text-primary" />
          <span className="text-base font-semibold text-navy">{event.totalPrizes}</span>
          <span className="text-sm text-content-muted">prizes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-base font-semibold text-navy">
            {formatNumber(event.totalParticipants)}
          </span>
          <span className="text-sm text-content-muted">participants</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Ticket className="h-4 w-4 text-primary" />
          <span className="text-base font-semibold text-navy">
            {formatNumber(event.totalCoupons)}
          </span>
          <span className="text-sm text-content-muted">coupons</span>
        </div>
      </div>

      {/* Win Rule */}
      <div className="mt-4">
        <span className="text-sm text-content-muted">Win Rule: </span>
        <span className="text-sm font-semibold text-navy">{winRuleLabel}</span>
        {event.winRule.type === 'limited' && event.winRule.maxWins && (
          <span className="text-sm text-content-muted">
            {' '}
            (max {event.winRule.maxWins})
          </span>
        )}
      </div>

      {/* Updated timestamp */}
      <div className="mt-1 text-xs text-content-muted">
        Updated {formatDate(event.updatedAt)}
      </div>

      {/* Action Buttons */}
      <div className="mt-5 flex flex-wrap gap-3">
        {canEdit && (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/event/${event.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        )}

        {canStartDraw && (
          <Button size="sm" asChild>
            <Link to={`/event/${event.id}/draw`}>
              <Play className="mr-2 h-4 w-4" />
              Start Draw
            </Link>
          </Button>
        )}

        {canContinueDraw && (
          <Button size="sm" asChild>
            <Link to={`/event/${event.id}/draw`}>
              <Play className="mr-2 h-4 w-4" />
              Continue Draw
            </Link>
          </Button>
        )}

        {canViewHistory && (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/event/${event.id}/history`}>
              <History className="mr-2 h-4 w-4" />
              History
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}

export default EventCard
