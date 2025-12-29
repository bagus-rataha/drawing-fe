/**
 * @file components/history/HistoryTable.tsx
 * @description History table component for displaying winners grouped by prize
 *
 * ENHANCED (Rev 12):
 * - Per-prize pagination
 * - Separate cancelled/invalid winners section
 * - Collapsible prize sections
 */

import { useState, useMemo, useEffect } from 'react'
import type { Winner, Prize } from '@/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  Filter,
  Trophy,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import { formatDate } from '@/utils/helpers'

const ITEMS_PER_PAGE = 10

interface HistoryTableProps {
  winners: Winner[]
  prizes: Prize[]
  isLoading?: boolean
}

/**
 * History table showing winners grouped by prize
 */
export function HistoryTable({
  winners,
  prizes,
  isLoading = false,
}: HistoryTableProps) {
  const [selectedPrize, setSelectedPrize] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Create prize lookup
  const prizeMap = useMemo(
    () => new Map(prizes.map((p) => [p.id, p])),
    [prizes]
  )

  // Separate confirmed valid winners from cancelled/invalid
  const { validWinners, cancelledWinners } = useMemo(() => {
    const valid: Winner[] = []
    const cancelled: Winner[] = []

    winners.forEach((w) => {
      // Only show confirmed winners in valid section
      if (w.status === 'valid' && w.confirmedAt) {
        valid.push(w)
      } else if (w.status === 'cancelled' || w.status === 'skipped') {
        cancelled.push(w)
      }
    })

    return { validWinners: valid, cancelledWinners: cancelled }
  }, [winners])

  // Filter winners by search and prize
  const filteredValidWinners = useMemo(() => {
    let filtered = [...validWinners]

    // Filter by prize
    if (selectedPrize !== 'all') {
      filtered = filtered.filter((w) => w.prizeId === selectedPrize)
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (w) =>
          w.participantName?.toLowerCase().includes(searchLower) ||
          w.couponId.toLowerCase().includes(searchLower) ||
          w.participantId.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [validWinners, selectedPrize, search])

  // Filter cancelled winners by search
  const filteredCancelledWinners = useMemo(() => {
    if (!search) return cancelledWinners

    const searchLower = search.toLowerCase()
    return cancelledWinners.filter(
      (w) =>
        w.participantName?.toLowerCase().includes(searchLower) ||
        w.couponId.toLowerCase().includes(searchLower) ||
        w.participantId.toLowerCase().includes(searchLower)
    )
  }, [cancelledWinners, search])

  // Group valid winners by prize
  const groupedWinners = useMemo(() => {
    const groups = new Map<string, Winner[]>()

    // Initialize groups in prize order
    prizes.forEach((prize) => {
      groups.set(prize.id, [])
    })

    // Add winners to groups
    filteredValidWinners.forEach((winner) => {
      const group = groups.get(winner.prizeId) || []
      group.push(winner)
      groups.set(winner.prizeId, group)
    })

    return groups
  }, [filteredValidWinners, prizes])

  if (isLoading) {
    return <HistoryTableSkeleton />
  }

  if (winners.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Trophy className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-muted-foreground">
            No winners yet
          </p>
          <p className="text-sm text-muted-foreground">
            Winners will appear here after the draw
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, coupon ID, participant ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedPrize} onValueChange={setSelectedPrize}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Prizes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prizes</SelectItem>
              {prizes.map((prize) => (
                <SelectItem key={prize.id} value={prize.id}>
                  {prize.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2 text-green-600">
          <Trophy className="h-4 w-4" />
          <span>{filteredValidWinners.length} confirmed winners</span>
        </div>
        {cancelledWinners.length > 0 && (
          <div className="flex items-center gap-2 text-amber-600">
            <XCircle className="h-4 w-4" />
            <span>{cancelledWinners.length} cancelled/invalid</span>
          </div>
        )}
      </div>

      {/* Grouped Tables by Prize */}
      {selectedPrize === 'all' ? (
        // Show grouped by prize
        prizes.map((prize) => {
          const prizeWinners = groupedWinners.get(prize.id) || []
          if (prizeWinners.length === 0 && search) return null

          return (
            <PrizeWinnersSection
              key={prize.id}
              prize={prize}
              winners={prizeWinners}
            />
          )
        })
      ) : (
        // Show single prize table
        <WinnersTable winners={filteredValidWinners} prizeMap={prizeMap} />
      )}

      {/* Cancelled/Invalid Winners Section */}
      {filteredCancelledWinners.length > 0 && (
        <CancelledWinnersSection
          winners={filteredCancelledWinners}
          prizeMap={prizeMap}
        />
      )}
    </div>
  )
}

/**
 * Collapsible section for winners of a single prize with pagination
 */
function PrizeWinnersSection({
  prize,
  winners,
}: {
  prize: Prize
  winners: Winner[]
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)

  const totalPages = Math.ceil(winners.length / ITEMS_PER_PAGE)
  const paginatedWinners = winners.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  )

  return (
    <Card>
      <CardHeader
        className="cursor-pointer pb-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
            <span>{prize.name}</span>
            <Badge variant="secondary">{prize.sequence}</Badge>
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            {winners.length} / {prize.quantity} winner
            {prize.quantity > 1 ? 's' : ''}
          </span>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {winners.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">
              No winners yet for this prize
            </p>
          ) : (
            <>
              {/* FIX (Rev 13): Responsive table wrapper for horizontal scroll on mobile */}
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Coupon ID</TableHead>
                        <TableHead>Participant ID</TableHead>
                        <TableHead className="hidden sm:table-cell">Batch</TableHead>
                        <TableHead className="hidden sm:table-cell">Confirmed At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedWinners.map((winner, index) => (
                        <TableRow key={winner.id}>
                          <TableCell className="font-medium">
                            {currentPage * ITEMS_PER_PAGE + index + 1}
                          </TableCell>
                          <TableCell>{winner.participantName || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {winner.couponId}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {winner.participantId}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{winner.batchNumber}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {winner.confirmedAt
                              ? formatDate(winner.confirmedAt, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pagination - FIX (Rev 13): Responsive layout */}
              {totalPages > 1 && (
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span className="text-sm text-muted-foreground text-center sm:text-left">
                    Showing {currentPage * ITEMS_PER_PAGE + 1}-
                    {Math.min((currentPage + 1) * ITEMS_PER_PAGE, winners.length)}{' '}
                    of {winners.length}
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentPage((p) => Math.max(0, p - 1))
                      }}
                      disabled={currentPage === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      {currentPage + 1} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                      }}
                      disabled={currentPage >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}

/**
 * Section for cancelled/invalid winners
 * FIX (Rev 13): Reset pagination when winners list changes (e.g., after search)
 */
function CancelledWinnersSection({
  winners,
  prizeMap,
}: {
  winners: Winner[]
  prizeMap: Map<string, Prize>
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)

  // FIX (Rev 13): Reset pagination when winners change (e.g., search filter)
  useEffect(() => {
    setCurrentPage(0)
  }, [winners.length])

  const totalPages = Math.ceil(winners.length / ITEMS_PER_PAGE)
  const paginatedWinners = winners.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  )

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader
        className="cursor-pointer pb-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between text-lg text-amber-800">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
            <AlertTriangle className="h-5 w-5" />
            <span>Cancelled / Invalid Winners</span>
          </div>
          <Badge variant="outline" className="border-amber-300 text-amber-700">
            {winners.length}
          </Badge>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {/* FIX (Rev 13): Responsive table wrapper */}
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Prize</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Participant ID</TableHead>
                    <TableHead>Coupon ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Reason</TableHead>
                    <TableHead className="hidden sm:table-cell">Drawn At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedWinners.map((winner, index) => {
                    const prize = prizeMap.get(winner.prizeId)
                    return (
                      <TableRow key={winner.id}>
                        <TableCell className="font-medium">
                          {currentPage * ITEMS_PER_PAGE + index + 1}
                        </TableCell>
                        <TableCell>{prize?.name || '-'}</TableCell>
                        <TableCell>{winner.participantName || '-'}</TableCell>
                        <TableCell className="hidden sm:table-cell font-mono text-sm">
                          {winner.participantId || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {winner.couponId || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              winner.status === 'cancelled'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {winner.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[200px] truncate text-sm text-muted-foreground">
                          {winner.cancelReason?.message || '-'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {formatDate(winner.drawnAt, {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination - FIX (Rev 13): Responsive layout */}
          {totalPages > 1 && (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="text-sm text-muted-foreground text-center sm:text-left">
                Showing {currentPage * ITEMS_PER_PAGE + 1}-
                {Math.min((currentPage + 1) * ITEMS_PER_PAGE, winners.length)} of{' '}
                {winners.length}
              </span>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentPage((p) => Math.max(0, p - 1))
                  }}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {currentPage + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                  }}
                  disabled={currentPage >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

/**
 * Generic winners table (used when single prize selected)
 */
function WinnersTable({
  winners,
  prizeMap,
}: {
  winners: Winner[]
  prizeMap: Map<string, Prize>
}) {
  const [currentPage, setCurrentPage] = useState(0)

  const totalPages = Math.ceil(winners.length / ITEMS_PER_PAGE)
  const paginatedWinners = winners.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  )

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Prize</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Coupon ID</TableHead>
              <TableHead>Participant ID</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Confirmed At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedWinners.map((winner, index) => {
              const prize = prizeMap.get(winner.prizeId)
              return (
                <TableRow key={winner.id}>
                  <TableCell className="font-medium">
                    {currentPage * ITEMS_PER_PAGE + index + 1}
                  </TableCell>
                  <TableCell>{prize?.name || '-'}</TableCell>
                  <TableCell>{winner.participantName || '-'}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {winner.couponId}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {winner.participantId}
                  </TableCell>
                  <TableCell>{winner.batchNumber}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {winner.confirmedAt
                      ? formatDate(winner.confirmedAt, {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : '-'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {currentPage * ITEMS_PER_PAGE + 1}-
              {Math.min((currentPage + 1) * ITEMS_PER_PAGE, winners.length)} of{' '}
              {winners.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                {currentPage + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for history table
 */
function HistoryTableSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-[200px]" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default HistoryTable
