import { useState, useMemo } from 'react'
import type { EventListResponse } from '@/types/api'
import { EventCard } from './EventCard'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Search, Filter, Calendar } from 'lucide-react'
import { EVENT_STATUS_LABELS } from '@/utils/constants'
import { debounce } from '@/utils/helpers'

interface EventListProps {
  events: EventListResponse[]
  isLoading?: boolean
  onDelete?: (id: string) => void
}

export function EventList({
  events,
  isLoading = false,
  onDelete,
}: EventListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const handleSearchChange = useMemo(
    () =>
      debounce((value: unknown) => {
        setSearch(String(value))
      }, 300),
    []
  )

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (statusFilter !== 'all' && event.status !== statusFilter) {
        return false
      }
      if (search) {
        const searchLower = search.toLowerCase()
        return (
          event.name.toLowerCase().includes(searchLower) ||
          event.description?.toLowerCase().includes(searchLower)
        )
      }
      return true
    })
  }, [events, search, statusFilter])

  if (isLoading) {
    return <EventListSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            className="pl-9"
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={events.length === 0 ? 'No events yet' : 'No events found'}
          description={
            events.length === 0
              ? 'Create your first raffle event to get started'
              : 'Try adjusting your search or filter'
          }
          action={
            events.length === 0
              ? { label: '+ Create Event', href: '/events/new' }
              : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EventListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 w-[150px]" />
      </div>
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-56 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export default EventList
