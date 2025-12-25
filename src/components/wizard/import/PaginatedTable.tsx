/**
 * @file components/wizard/import/PaginatedTable.tsx
 * @description Paginated table component with search functionality
 */

import { useState, useMemo, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronLeft, ChevronRight, Search, Trash2 } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

interface PaginatedTableProps {
  headers: string[]
  rows: Record<string, string | number | undefined>[]
  pageSize?: number
  showSearch?: boolean
  /** Row key field for identifying rows (used for delete) */
  rowKey?: string
  /** Callback when delete button is clicked - receives the row key value */
  onDelete?: (id: string) => void
  /** Whether delete is currently in progress */
  isDeleting?: boolean
  /** Whether data is being loaded */
  isLoading?: boolean
  // Server-side pagination props (optional)
  /** Enable server-side pagination mode */
  serverSide?: boolean
  /** Total number of items (required for server-side pagination) */
  totalItems?: number
  /** Current page (required for server-side pagination, 1-indexed) */
  currentPage?: number
  /** Callback when page changes (server-side pagination) */
  onPageChange?: (page: number) => void
  /** Callback when page size changes (server-side pagination) */
  onPageSizeChange?: (pageSize: number) => void
  /** Callback when search query changes (server-side search) */
  onSearchChange?: (query: string) => void
  /** Controlled search value (for server-side search) */
  searchValue?: string
}

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100]

/**
 * Paginated table with search and page size selector
 */
export function PaginatedTable({
  headers,
  rows,
  pageSize = 5,
  showSearch = true,
  rowKey,
  onDelete,
  isDeleting = false,
  isLoading = false,
  // Server-side pagination props
  serverSide = false,
  totalItems,
  currentPage,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  searchValue,
}: PaginatedTableProps) {
  // Client-side pagination state (used when serverSide=false)
  const [clientPage, setClientPage] = useState(1)
  const [clientPageSize, setClientPageSize] = useState(pageSize)
  const [searchQuery, setSearchQuery] = useState('')

  // For server-side, use controlled value if provided
  const effectiveSearchQuery = serverSide ? (searchValue ?? '') : searchQuery

  // Determine effective page/pageSize based on mode
  const effectivePage = serverSide ? (currentPage ?? 1) : clientPage
  const effectivePageSize = serverSide ? pageSize : clientPageSize

  // Filter data by search query (client-side only)
  const filteredData = useMemo(() => {
    if (serverSide) return rows // Server-side: no client filtering
    if (!effectiveSearchQuery.trim()) return rows
    const query = effectiveSearchQuery.toLowerCase()
    return rows.filter((row) =>
      Object.values(row).some((v) =>
        String(v ?? '').toLowerCase().includes(query)
      )
    )
  }, [rows, effectiveSearchQuery, serverSide])

  // Reset to page 1 when search changes (client-side only)
  useEffect(() => {
    if (!serverSide) {
      setClientPage(1)
    }
  }, [effectiveSearchQuery, clientPageSize, serverSide])

  // Calculate pagination
  const totalRecords = serverSide ? (totalItems ?? rows.length) : filteredData.length
  const totalPages = Math.ceil(totalRecords / effectivePageSize)
  const startIndex = (effectivePage - 1) * effectivePageSize
  const endIndex = startIndex + effectivePageSize
  // For server-side, rows are already paginated; for client-side, slice here
  const paginatedData = serverSide ? rows : filteredData.slice(startIndex, endIndex)

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (serverSide && onPageChange) {
      onPageChange(newPage)
    } else {
      setClientPage(newPage)
    }
  }

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    if (serverSide && onPageSizeChange) {
      onPageSizeChange(newPageSize)
    } else {
      setClientPageSize(newPageSize)
    }
  }

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible + 2) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show first, last, and pages around current
      pages.push(1)

      if (effectivePage > 3) {
        pages.push('...')
      }

      const start = Math.max(2, effectivePage - 1)
      const end = Math.min(totalPages - 1, effectivePage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (effectivePage < totalPages - 2) {
        pages.push('...')
      }

      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div className="space-y-4">
      {/* Search box */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            value={effectiveSearchQuery}
            onChange={(e) => {
              const value = e.target.value
              if (serverSide && onSearchChange) {
                onSearchChange(value)
              } else {
                setSearchQuery(value)
              }
            }}
            className="pl-10"
          />
        </div>
      )}

      {/* Table */}
      <div className="relative overflow-hidden rounded-lg border">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
            <div className="flex flex-col items-center gap-2">
              <Spinner size="lg" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              {headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
              {onDelete && rowKey && (
                <TableHead className="w-20 text-right">Action</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={headers.length + (onDelete && rowKey ? 2 : 1)}
                  className="h-24 text-center text-muted-foreground"
                >
                  {effectiveSearchQuery ? 'No results found' : 'No data'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="text-muted-foreground">
                    {startIndex + index + 1}
                  </TableCell>
                  {headers.map((header) => (
                    <TableCell key={header} className="truncate max-w-xs">
                      {String(row[header] ?? '')}
                    </TableCell>
                  ))}
                  {onDelete && rowKey && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onDelete(String(row[rowKey] ?? ''))}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {totalRecords === 0 ? 0 : startIndex + 1} -{' '}
          {Math.min(endIndex, totalRecords)} of {totalRecords.toLocaleString()} rows
          {!serverSide && effectiveSearchQuery && ` (filtered from ${rows.length.toLocaleString()})`}
        </div>

        <div className="flex items-center gap-4">
          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Per page:</span>
            <Select
              value={String(effectivePageSize)}
              onValueChange={(value) => handlePageSizeChange(Number(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Page Navigation */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(Math.max(1, effectivePage - 1))}
                disabled={effectivePage === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {getPageNumbers().map((pageNum, index) =>
                pageNum === '...' ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <Button
                    key={pageNum}
                    variant={effectivePage === pageNum ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => handlePageChange(pageNum as number)}
                    disabled={isLoading}
                  >
                    {pageNum}
                  </Button>
                )
              )}

              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(Math.min(totalPages, effectivePage + 1))}
                disabled={effectivePage === totalPages || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaginatedTable
