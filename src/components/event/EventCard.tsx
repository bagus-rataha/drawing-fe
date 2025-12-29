/**
 * @file components/event/EventCard.tsx
 * @description Event card component for displaying event summary
 *
 * FIX (Rev 19):
 * - Moved Edit, History to dropdown menu
 * - Only Draw button remains in card body
 * - Button text changes: Start Draw / Resume Draw / Draw Result
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
  FileText,
  Trophy,
} from 'lucide-react'
import { formatNumber, formatDate } from '@/utils/helpers'
import { EVENT_STATUS_LABELS, WIN_RULE_LABELS } from '@/utils/constants'

interface EventCardProps {
  event: Event
  onDelete?: (id: string) => void
  onDuplicate?: (id: string) => void
  /** Optional: Whether all prizes are complete (for accurate button text) */
  allPrizesComplete?: boolean
}

/**
 * Event card component showing event summary and actions
 */
export function EventCard({
  event,
  onDelete,
  onDuplicate,
  allPrizesComplete = false,
}: EventCardProps) {
  const statusLabel = EVENT_STATUS_LABELS[event.status] || event.status
  const winRuleLabel = WIN_RULE_LABELS[event.winRule.type] || event.winRule.type

  // FIX (Rev 19): Simplified action conditions
  const canEdit =
    event.status === 'draft' ||
    event.status === 'ready' ||
    event.status === 'completed'
  const canViewHistory =
    event.status === 'in_progress' || event.status === 'completed'
  const canDelete = event.status !== 'in_progress'
  const canDuplicate = event.status === 'completed'

  // FIX (Rev 19): Draw button logic
  // - completed or (in_progress + allPrizesComplete) → Draw Result
  // - in_progress → Resume Draw
  // - draft/ready → Start Draw
  const isDrawComplete = event.status === 'completed' || (event.status === 'in_progress' && allPrizesComplete)
  const showDrawButton = true // Always show draw button

  // Determine button text and icon
  let drawButtonText = 'Start Draw'
  let DrawButtonIcon = Play
  if (isDrawComplete) {
    drawButtonText = 'Draw Result'
    DrawButtonIcon = Trophy
  } else if (event.status === 'in_progress') {
    drawButtonText = 'Resume Draw'
    DrawButtonIcon = Play
  }

  // Map status to badge variant
  const statusVariant = event.status as
    | 'draft'
    | 'ready'
    | 'in_progress'
    | 'completed'

  return (
    <div className="flex flex-col rounded-xl border border-border-custom bg-white p-6 shadow-card transition-all duration-200 hover:border-primary hover:shadow-card-hover">
      {/* Header Row - FIX (Rev 18): Card body clickable to detail page */}
      <div className="flex items-start justify-between">
        <Link
          to={`/event/${event.id}`}
          className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <h3 className="text-xl font-bold text-navy truncate">{event.name}</h3>
          {event.description && (
            <p className="mt-1 text-sm text-content-muted line-clamp-2">
              {event.description}
            </p>
          )}
        </Link>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          <Badge variant={statusVariant}>{statusLabel}</Badge>
          {/* FIX (Rev 19): All actions moved to dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Detail - always available */}
              <DropdownMenuItem asChild>
                <Link to={`/event/${event.id}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Detail
                </Link>
              </DropdownMenuItem>

              {/* History - when in_progress or completed */}
              {canViewHistory && (
                <DropdownMenuItem asChild>
                  <Link to={`/event/${event.id}/history`}>
                    <History className="mr-2 h-4 w-4" />
                    History
                  </Link>
                </DropdownMenuItem>
              )}

              {/* Edit - when draft/ready/completed */}
              {canEdit && (
                <DropdownMenuItem asChild>
                  <Link to={`/event/${event.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
              )}

              {/* Duplicate - when completed */}
              {canDuplicate && onDuplicate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDuplicate(event.id)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                </>
              )}

              {/* Delete - when not in_progress */}
              {canDelete && onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(event.id)}
                    className="text-error focus:text-error"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
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

      {/* FIX (Rev 19): Only Draw button in body, with dynamic text */}
      <div className="mt-5">
        {showDrawButton && (
          <Button size="sm" variant={isDrawComplete ? 'outline' : 'default'} asChild>
            <Link to={`/event/${event.id}/draw`}>
              <DrawButtonIcon className="mr-2 h-4 w-4" />
              {drawButtonText}
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}

export default EventCard
