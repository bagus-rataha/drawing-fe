/**
 * @file components/history/HistoryTable.tsx
 * @description History table component for displaying winners grouped by prize
 */

import { useState, useMemo } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Filter, Trophy } from 'lucide-react'
import { formatDate } from '@/utils/helpers'

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

  // Filter and group winners
  const filteredWinners = useMemo(() => {
    let filtered = [...winners]

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
  }, [winners, selectedPrize, search])

  // Group winners by prize
  const groupedWinners = useMemo(() => {
    const groups = new Map<string, Winner[]>()

    // Initialize groups in prize order
    prizes.forEach((prize) => {
      groups.set(prize.id, [])
    })

    // Add winners to groups
    filteredWinners.forEach((winner) => {
      const group = groups.get(winner.prizeId) || []
      group.push(winner)
      groups.set(winner.prizeId, group)
    })

    return groups
  }, [filteredWinners, prizes])

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
            placeholder="Search by name, coupon ID..."
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

      {/* Winner count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredWinners.length} of {winners.length} winners
      </div>

      {/* Grouped Tables */}
      {selectedPrize === 'all' ? (
        // Show grouped by prize
        prizes.map((prize) => {
          const prizeWinners = groupedWinners.get(prize.id) || []
          if (prizeWinners.length === 0 && search) return null

          return (
            <PrizeWinnersTable
              key={prize.id}
              prize={prize}
              winners={prizeWinners}
            />
          )
        })
      ) : (
        // Show single prize table
        <WinnersTable winners={filteredWinners} prizeMap={prizeMap} />
      )}
    </div>
  )
}

/**
 * Table for winners of a single prize
 */
function PrizeWinnersTable({
  prize,
  winners,
}: {
  prize: Prize
  winners: Winner[]
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>
            {prize.name}
            <Badge variant="secondary" className="ml-2">
              {prize.sequence}
            </Badge>
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {winners.length} / {prize.quantity} winner
            {prize.quantity > 1 ? 's' : ''}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {winners.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">
            No winners yet for this prize
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Coupon ID</TableHead>
                <TableHead>Participant ID</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Drawn At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {winners.map((winner, index) => (
                <TableRow key={winner.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{winner.participantName || '-'}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {winner.couponId}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {winner.participantId}
                  </TableCell>
                  <TableCell>{winner.batchNumber}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(winner.drawnAt, {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Generic winners table
 */
function WinnersTable({
  winners,
  prizeMap,
}: {
  winners: Winner[]
  prizeMap: Map<string, Prize>
}) {
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
              <TableHead>Drawn At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {winners.map((winner, index) => {
              const prize = prizeMap.get(winner.prizeId)
              return (
                <TableRow key={winner.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
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
