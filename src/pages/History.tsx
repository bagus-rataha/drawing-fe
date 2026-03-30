/**
 * @file pages/History.tsx
 * @description Winner history page with 2 sections: Active Winners and Void Winners
 *
 * Route: /history/:id
 * Fetches data from backend Prize API (each prize includes its winners).
 * Universal search by coupon_import_identifier or participant_import_identifier.
 */

import { useState, useMemo, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Trophy,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  XCircle,
  AlertTriangle,
  Download,
  Loader2,
} from 'lucide-react'
import { useEvent, usePrizes } from '@/hooks'
import { useToast } from '@/components/ui/use-toast'
import { formatNumber } from '@/utils/helpers'
import { exportHistoryToExcel } from '@/services/excelExportService'
import type { PrizesListResponse, WinnerResponse } from '@/types/api'

const ITEMS_PER_PAGE = 10

/** Enriched winner with prize info for display */
interface FlatWinner extends WinnerResponse {
  prizeName: string
  prizeId: string
  prizeSequence: number
}

/** Flatten all winners from prizes into a single list with prize info */
function flattenWinners(prizes: PrizesListResponse[]): FlatWinner[] {
  const result: FlatWinner[] = []
  for (const prize of prizes) {
    if (!prize.winners) continue
    for (const w of prize.winners) {
      result.push({
        ...w,
        prizeName: prize.name,
        prizeId: prize.id,
        prizeSequence: prize.sequence,
      })
    }
  }
  return result
}

/** Check if a winner matches the search query */
function matchesSearch(w: FlatWinner, query: string): boolean {
  const q = query.toLowerCase()
  return (
    (w.coupon?.coupon_import_identifier?.toLowerCase().includes(q)) ||
    (w.coupon?.participant?.participant_import_identifier?.toLowerCase().includes(q)) ||
    (w.coupon?.participant?.name?.toLowerCase().includes(q)) ||
    false
  )
}

/** Format datetime string for display */
function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export function History() {
  const { id } = useParams<{ id: string }>()

  const { data: event, isLoading: isLoadingEvent } = useEvent(id)
  const { data: prizes = [], isLoading: isLoadingPrizes } = usePrizes(id)

  const isLoading = isLoadingEvent || isLoadingPrizes

  const [search, setSearch] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  // Flatten all winners from all prizes
  const allWinners = useMemo(() => flattenWinners(prizes as PrizesListResponse[]), [prizes])

  // Split into active (confirmed) and void
  const { activeWinners, voidWinners } = useMemo(() => {
    const active: FlatWinner[] = []
    const voided: FlatWinner[] = []
    for (const w of allWinners) {
      if (w.status === 'active' && w.confirmed_at) {
        active.push(w)
      } else if (w.status === 'void') {
        voided.push(w)
      }
    }
    return { activeWinners: active, voidWinners: voided }
  }, [allWinners])

  // Filter by search
  const filteredActive = useMemo(() => {
    if (!search) return activeWinners
    return activeWinners.filter((w) => matchesSearch(w, search))
  }, [activeWinners, search])

  const filteredVoid = useMemo(() => {
    if (!search) return voidWinners
    return voidWinners.filter((w) => matchesSearch(w, search))
  }, [voidWinners, search])

  // Group active winners by prize
  const groupedActive = useMemo(() => {
    const groups = new Map<string, { prize: PrizesListResponse; winners: FlatWinner[] }>()
    for (const p of (prizes as PrizesListResponse[])) {
      groups.set(p.id, { prize: p, winners: [] })
    }
    for (const w of filteredActive) {
      const group = groups.get(w.prizeId)
      if (group) group.winners.push(w)
    }
    return Array.from(groups.values())
  }, [prizes, filteredActive])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-alt">
        <Header />
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="mx-auto max-w-[960px]">
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
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="mx-auto max-w-[960px]">
            <EmptyState
              icon={AlertCircle}
              title="Event not found"
              description="The event you're looking for doesn't exist or has been deleted"
              action={{ label: 'Go to Home', href: '/' }}
            />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-alt">
      <Header />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mx-auto max-w-[960px]">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Button variant="ghost" className="mb-2 -ml-4" asChild>
                <Link to="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Events
                </Link>
              </Button>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-navy">{event.name}</h1>
              <div className="mt-2 flex items-center gap-2 text-content-muted">
                <Trophy className="h-4 w-4 text-primary" />
                <span>
                  {formatNumber(activeWinners.length)} winner
                  {activeWinners.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <Button
              onClick={() => {
                if (allWinners.length === 0) return
                setIsExporting(true)
                try {
                  exportHistoryToExcel(prizes as PrizesListResponse[], event.name)
                  toast({ title: 'Export Successful', description: 'Winners have been exported to Excel.' })
                } catch (error) {
                  toast({ title: 'Export Failed', description: `Failed to export: ${error}`, variant: 'destructive' })
                } finally {
                  setIsExporting(false)
                }
              }}
              disabled={isExporting || allWinners.length === 0}
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export Excel
            </Button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by coupon ID or participant ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Stats Summary */}
          <div className="mb-6 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-green-600">
              <Trophy className="h-4 w-4" />
              <span>{filteredActive.length} confirmed winners</span>
            </div>
            {voidWinners.length > 0 && (
              <div className="flex items-center gap-2 text-amber-600">
                <XCircle className="h-4 w-4" />
                <span>{filteredVoid.length} cancelled/void</span>
              </div>
            )}
          </div>

          {allWinners.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Trophy className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium text-muted-foreground">No winners yet</p>
                <p className="text-sm text-muted-foreground">Winners will appear here after the draw</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Active Winners - Grouped by Prize */}
              {groupedActive.map(({ prize, winners }) => {
                if (winners.length === 0 && search) return null
                return (
                  <PrizeSection
                    key={prize.id}
                    prize={prize}
                    winners={winners}
                  />
                )
              })}

              {/* Void Winners */}
              {filteredVoid.length > 0 && (
                <VoidSection winners={filteredVoid} />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

/** Collapsible prize section with paginated active winners */
function PrizeSection({
  prize,
  winners,
}: {
  prize: PrizesListResponse
  winners: FlatWinner[]
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => { setCurrentPage(0) }, [winners.length])

  const totalPages = Math.ceil(winners.length / ITEMS_PER_PAGE)
  const paginated = winners.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  )

  const confirmedCount = prize.winners?.filter(w => w.status === 'active' && w.confirmed_at).length || 0

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
            {confirmedCount} / {prize.quantity} winner
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
                        <TableHead className="hidden sm:table-cell">Line</TableHead>
                        <TableHead className="hidden sm:table-cell">Confirmed At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((w, index) => (
                        <TableRow key={w.id}>
                          <TableCell className="font-medium">
                            {currentPage * ITEMS_PER_PAGE + index + 1}
                          </TableCell>
                          <TableCell>{w.coupon?.participant?.name || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {w.coupon?.coupon_import_identifier || '-'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {w.coupon?.participant?.participant_import_identifier || '-'}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{w.batch_number}</TableCell>
                          <TableCell className="hidden sm:table-cell">{w.line_number}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {formatDateTime(w.confirmed_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={winners.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}

/** Collapsible void/cancelled winners section */
function VoidSection({ winners }: { winners: FlatWinner[] }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => { setCurrentPage(0) }, [winners.length])

  const totalPages = Math.ceil(winners.length / ITEMS_PER_PAGE)
  const paginated = winners.slice(
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
            <span>Cancelled / Void Winners</span>
          </div>
          <Badge variant="outline" className="border-amber-300 text-amber-700">
            {winners.length}
          </Badge>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Prize</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Coupon ID</TableHead>
                    <TableHead className="hidden sm:table-cell">Participant ID</TableHead>
                    <TableHead className="hidden sm:table-cell">Batch</TableHead>
                    <TableHead className="hidden sm:table-cell">Line</TableHead>
                    <TableHead className="hidden md:table-cell">Reason</TableHead>
                    <TableHead className="hidden sm:table-cell">Drawn At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((w, index) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">
                        {currentPage * ITEMS_PER_PAGE + index + 1}
                      </TableCell>
                      <TableCell>{w.prizeName}</TableCell>
                      <TableCell>{w.coupon?.participant?.name || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {w.coupon?.coupon_import_identifier || '-'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-sm">
                        {w.coupon?.participant?.participant_import_identifier || '-'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{w.batch_number}</TableCell>
                      <TableCell className="hidden sm:table-cell">{w.line_number}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate text-sm text-muted-foreground">
                        {w.cancel_reason || '-'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {formatDateTime(w.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={winners.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          )}
        </CardContent>
      )}
    </Card>
  )
}

/** Reusable pagination component */
function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
}) {
  return (
    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <span className="text-sm text-muted-foreground text-center sm:text-left">
        Showing {currentPage * itemsPerPage + 1}-
        {Math.min((currentPage + 1) * itemsPerPage, totalItems)} of {totalItems}
      </span>
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onPageChange(Math.max(0, currentPage - 1))
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
            onPageChange(Math.min(totalPages - 1, currentPage + 1))
          }}
          disabled={currentPage >= totalPages - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default History
