/**
 * @file components/event/EventCard.tsx
 * @description Event card component for displaying event summary
 */

import { Link } from 'react-router-dom'
import type { Event } from '@/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Gift, Users, Ticket, Edit, Play, History, MoreVertical, Trash2, Copy } from 'lucide-react'
import { formatNumber, formatDate } from '@/utils/helpers'
import {
  EVENT_STATUS_LABELS,
  EVENT_STATUS_COLORS,
  WIN_RULE_LABELS,
} from '@/utils/constants'

interface EventCardProps {
  event: Event
  prizeCount: number
  onDelete?: (id: string) => void
  onDuplicate?: (id: string) => void
}

/**
 * Event card component showing event summary and actions
 */
export function EventCard({
  event,
  prizeCount,
  onDelete,
  onDuplicate,
}: EventCardProps) {
  const statusLabel = EVENT_STATUS_LABELS[event.status] || event.status
  const statusColor = EVENT_STATUS_COLORS[event.status] || 'bg-gray-100 text-gray-800'
  const winRuleLabel = WIN_RULE_LABELS[event.winRule.type] || event.winRule.type

  const canEdit = event.status === 'draft' || event.status === 'ready' || event.status === 'completed'
  const canStartDraw = event.status === 'draft' || event.status === 'ready'
  const canContinueDraw = event.status === 'in_progress'
  const canViewHistory = event.status === 'in_progress' || event.status === 'completed'
  const canDelete = event.status !== 'in_progress'
  const canDuplicate = event.status === 'completed'

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{event.name}</CardTitle>
            {event.description && (
              <CardDescription className="line-clamp-2">
                {event.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColor} variant="outline">
              {statusLabel}
            </Badge>
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
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Gift className="h-4 w-4" />
            <span>{prizeCount} prizes</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{formatNumber(event.totalParticipants)} participants</span>
          </div>
          <div className="flex items-center gap-1">
            <Ticket className="h-4 w-4" />
            <span>{formatNumber(event.totalCoupons)} coupons</span>
          </div>
        </div>

        <div className="mt-3 text-sm">
          <span className="text-muted-foreground">Win Rule: </span>
          <span className="font-medium">{winRuleLabel}</span>
          {event.winRule.type === 'limited' && event.winRule.maxWins && (
            <span className="text-muted-foreground">
              {' '}
              (max {event.winRule.maxWins})
            </span>
          )}
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          Updated {formatDate(event.updatedAt)}
        </div>
      </CardContent>

      <CardFooter className="gap-2 pt-3">
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
      </CardFooter>
    </Card>
  )
}

export default EventCard
