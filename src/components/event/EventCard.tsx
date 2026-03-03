import { Link } from 'react-router-dom'
import type { EventListResponse } from '@/types/api'
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
  FileText,
  Trophy,
  Upload,
} from 'lucide-react'
import { formatNumber, formatDate } from '@/utils/helpers'
import { EVENT_STATUS_LABELS, WIN_RULE_LABELS, IMPORT_STATUS_LABELS } from '@/utils/constants'

interface EventCardProps {
  event: EventListResponse
  onDelete?: (id: string) => void
}

export function EventCard({ event, onDelete }: EventCardProps) {
  const statusLabel = EVENT_STATUS_LABELS[event.status] || event.status
  const winRuleLabel = WIN_RULE_LABELS[event.win_rule] || event.win_rule
  const importStatusLabel = IMPORT_STATUS_LABELS[event.import_status] || event.import_status

  // Action button rules per spec
  const canEdit = event.status === 'draft'
  const canDelete = event.status === 'draft'
  const canImport = event.import_status === 'draft' || event.import_status === 'fail'
  const canViewHistory = event.status === 'in_progress' || event.status === 'completed'

  // Draw button logic
  const isDrawComplete = event.status === 'completed'
  let drawButtonText = 'Start Draw'
  let DrawButtonIcon = Play
  if (isDrawComplete) {
    drawButtonText = 'Draw Result'
    DrawButtonIcon = Trophy
  } else if (event.status === 'in_progress') {
    drawButtonText = 'Resume Draw'
    DrawButtonIcon = Play
  }

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
    <div className="flex flex-col rounded-xl border border-border-custom bg-white p-6 shadow-card transition-all duration-200 hover:border-primary hover:shadow-card-hover">
      {/* Header Row */}
      <div className="flex items-start justify-between">
        <Link
          to={`/events/${event.id}`}
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/events/${event.id}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Detail
                </Link>
              </DropdownMenuItem>

              {canImport && (
                <DropdownMenuItem asChild>
                  <Link to={`/events/${event.id}/import`}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </Link>
                </DropdownMenuItem>
              )}

              {canViewHistory && (
                <DropdownMenuItem asChild>
                  <Link to={`/history/${event.id}`}>
                    <History className="mr-2 h-4 w-4" />
                    History
                  </Link>
                </DropdownMenuItem>
              )}

              {canEdit && (
                <DropdownMenuItem asChild>
                  <Link to={`/events/${event.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
              )}

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
          <span className="text-base font-semibold text-navy">{event.total_prizes}</span>
          <span className="text-sm text-content-muted">prizes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-base font-semibold text-navy">
            {formatNumber(event.total_participants)}
          </span>
          <span className="text-sm text-content-muted">participants</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Ticket className="h-4 w-4 text-primary" />
          <span className="text-base font-semibold text-navy">
            {formatNumber(event.total_coupons)}
          </span>
          <span className="text-sm text-content-muted">coupons</span>
        </div>
      </div>

      {/* Win Rule & Import Status */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div>
          <span className="text-sm text-content-muted">Win Rule: </span>
          <span className="text-sm font-semibold text-navy">{winRuleLabel}</span>
        </div>
        <Badge variant={importBadgeVariant as 'draft' | 'in_progress' | 'completed'}>
          {importStatusLabel}
        </Badge>
      </div>

      {/* Created at */}
      <div className="mt-1 text-xs text-content-muted">
        Created {formatDate(event.created_at)}
      </div>

      {/* Draw button */}
      <div className="mt-5">
        <Button size="sm" variant={isDrawComplete ? 'outline' : 'default'} asChild>
          <Link to={`/draw/${event.id}`}>
            <DrawButtonIcon className="mr-2 h-4 w-4" />
            {drawButtonText}
          </Link>
        </Button>
      </div>
    </div>
  )
}

export default EventCard
