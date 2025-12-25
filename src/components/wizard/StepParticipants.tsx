/**
 * @file components/wizard/StepParticipants.tsx
 * @description Step 3: Participant Import component with state machine
 *
 * State Machine:
 * - upload: Initial file selection state
 * - parsing: File is being parsed with progress
 * - preview: Showing parsed data with analytics and paginated table
 * - complete: Import confirmed, ready to proceed
 * - existing: Showing existing data (when editing event with participants)
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import type { ImportStats, Participant, Coupon } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ArrowLeft, ArrowRight, XCircle, RefreshCw, Users, List } from 'lucide-react'
import {
  ImportUpload,
  ImportProgress,
  ImportPreview,
  ImportAnalytics,
  PaginatedTable,
} from './import'
import { ParticipantTableSkeleton } from '@/components/ui/ParticipantTableSkeleton'
import { importExcelWithProgress, parseExcelFile } from '@/services/excelService'
import {
  useParticipantsPaginated,
  useCouponsPaginated,
  useEvent,
  useDebounce,
} from '@/hooks'
import { useEventStore } from '@/stores'

interface StepParticipantsProps {
  eventId: string
  importStats: ImportStats | null
  /** Whether existing data is available (for edit mode) - triggers paginated fetch */
  hasExistingData?: boolean
  /** Previously imported participants (persisted in parent for navigation back) */
  importedParticipants?: Participant[]
  /** Previously imported coupons (persisted in parent for navigation back) */
  importedCoupons?: Coupon[]
  onImport: (
    participants: { id: string; eventId: string; name?: string; customFields: Record<string, string>; couponCount: number }[],
    coupons: { id: string; eventId: string; participantId: string; weight: number }[],
    stats: ImportStats
  ) => void
  onNext: () => void
  onPrev: () => void
}

type ImportPhase = 'upload' | 'parsing' | 'preview' | 'complete' | 'existing'

/** Delete confirmation target */
interface DeleteTarget {
  type: 'participant' | 'coupon'
  id: string
  name?: string
  couponCount?: number
}

interface ParsedData {
  stats: ImportStats
  participants: Participant[]
  coupons: Coupon[]
  headers: string[]
}

/**
 * Step 3: Participant Import with enhanced UX
 * Features state machine, progress bar, and paginated preview
 */
export function StepParticipants({
  eventId,
  importStats,
  hasExistingData = false,
  importedParticipants = [],
  importedCoupons = [],
  onImport,
  onNext,
  onPrev,
}: StepParticipantsProps) {
  // Determine initial phase
  // Priority: existing DB data > import stats > upload
  const getInitialPhase = (): ImportPhase => {
    // If data exists in DB, always use 'existing' phase (paginated DB fetch)
    if (hasExistingData) return 'existing'
    // If we have import stats but data not saved yet, show 'complete'
    if (importStats) return 'complete'
    return 'upload'
  }

  // Hooks
  const { toast } = useToast()

  // Get pending deletes and actions from store (for atomic edit)
  const {
    pendingDeletes,
    markParticipantForDelete,
    markCouponForDelete,
  } = useEventStore()

  // State machine
  const [phase, setPhase] = useState<ImportPhase>(getInitialPhase)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState<string>()
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grouped' | 'detail'>('grouped')

  // Pagination state for 'existing' phase
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Search state (for server-side search in 'existing' phase)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  // Fetch event data for analytics (totalParticipants, totalCoupons are pre-computed)
  const { data: event, isLoading: isLoadingEvent } = useEvent(
    phase === 'existing' ? eventId : undefined
  )

  // Fetch paginated data for 'existing' phase (with search for grouped view)
  const {
    data: paginatedParticipants,
    isFetching: isFetchingParticipants,
  } = useParticipantsPaginated(
    phase === 'existing' && viewMode === 'grouped' ? eventId : undefined,
    page,
    pageSize,
    debouncedSearch // Pass search query for server-side filtering
  )

  const {
    data: paginatedCoupons,
    isFetching: isFetchingCoupons,
  } = useCouponsPaginated(
    phase === 'existing' && viewMode === 'detail' ? eventId : undefined,
    page,
    pageSize,
    debouncedSearch // Pass search query for server-side filtering
  )

  // For atomic edit, isDeleting is always false (we just mark, not execute)
  const isDeleting = false

  // Initial loading state - show full skeleton ONLY when event data hasn't loaded yet
  // Analytics come from Event, so we only need to wait for event data
  const isInitialLoading = phase === 'existing' && isLoadingEvent

  // Table loading state - show overlay on table only (analytics stay visible)
  // True when fetching table data (both initial and page changes)
  const isTableLoading = phase === 'existing' && (
    (viewMode === 'grouped' && isFetchingParticipants) ||
    (viewMode === 'detail' && isFetchingCoupons)
  )

  // Update phase when hasExistingData changes (for edit mode)
  // This handles the case where counts load after initial render
  useEffect(() => {
    if (hasExistingData && (phase === 'upload' || (phase === 'complete' && !parsedData))) {
      setPhase('existing')
    }
  }, [hasExistingData, phase, parsedData])

  // Reset page when view mode or search changes
  useEffect(() => {
    setPage(1)
  }, [viewMode, debouncedSearch])

  // Calculate pending delete coupon count from participants marked for deletion
  const pendingParticipantCouponCount = useMemo(() => {
    if (!paginatedParticipants?.data) return 0
    return paginatedParticipants.data
      .filter((p) => pendingDeletes.participantIds.includes(p.id))
      .reduce((sum, p) => sum + (p.couponCount || 0), 0)
  }, [paginatedParticipants, pendingDeletes.participantIds])

  // Build stats from existing data (from Event entity - pre-computed values)
  // Adjusted to reflect pending deletes
  const existingStats: ImportStats | null = useMemo(() => {
    if (!event) return null
    if (event.totalParticipants === 0 && event.totalCoupons === 0) return null

    // Collect custom fields from first paginated participant
    const customFields: string[] = []
    if (paginatedParticipants?.data?.[0]?.customFields) {
      customFields.push(...Object.keys(paginatedParticipants.data[0].customFields))
    }

    // Adjust counts for pending deletes
    const adjustedParticipants = event.totalParticipants - pendingDeletes.participantIds.length
    const adjustedCoupons = event.totalCoupons
      - pendingDeletes.couponIds.length
      - pendingParticipantCouponCount

    return {
      totalRows: adjustedCoupons,
      validRows: adjustedCoupons,
      invalidRows: 0,
      uniqueParticipants: adjustedParticipants,
      totalCoupons: adjustedCoupons,
      customFields,
      errors: [],
    }
  }, [event, paginatedParticipants, pendingDeletes, pendingParticipantCouponCount])

  // Prepare data for grouped view (by participant) - for 'existing' phase uses paginated data
  // Filters out participants marked for pending deletion
  const groupedData = useMemo(() => {
    if (phase === 'existing' && paginatedParticipants?.data) {
      // For existing phase, filter out pending deletes and map
      return paginatedParticipants.data
        .filter((p) => !pendingDeletes.participantIds.includes(p.id))
        .map((p) => ({
          participant_id: p.id,
          participant_name: p.name || '-',
          coupon_count: p.couponCount, // Now directly available from data
          ...p.customFields,
        }))
    }
    // For complete phase (imported data) - use parsedData or fallback to props
    // IMPORTANT: Use pre-computed couponCount to avoid O(n*m) filter operation
    const participants = parsedData?.participants || importedParticipants
    if (participants.length > 0) {
      return participants.map((p) => ({
        participant_id: p.id,
        participant_name: p.name || '-',
        coupon_count: p.couponCount, // Pre-computed in excelService, avoids O(n*m) filter
        ...p.customFields,
      }))
    }
    return []
  }, [phase, paginatedParticipants, parsedData, pendingDeletes.participantIds, importedParticipants])

  // Prepare data for detail view (all coupons) - for 'existing' phase uses paginated data
  // Filters out coupons marked for deletion and coupons from participants marked for deletion
  const detailData = useMemo(() => {
    if (phase === 'existing' && paginatedCoupons?.data) {
      // For existing phase, filter out pending deletes
      return paginatedCoupons.data
        .filter((c) =>
          !pendingDeletes.couponIds.includes(c.id) &&
          !pendingDeletes.participantIds.includes(c.participantId)
        )
        .map((c) => ({
          coupon_id: c.id,
          participant_id: c.participantId,
          participant_name: '-', // Would need separate lookup
          weight: c.weight,
        }))
    }
    // For complete phase (imported data) - use parsedData or fallback to props
    const participants = parsedData?.participants || importedParticipants
    const coupons = parsedData?.coupons || importedCoupons
    if (coupons.length > 0) {
      const participantMap = new Map(participants.map((p) => [p.id, p]))
      return coupons.map((c) => {
        const participant = participantMap.get(c.participantId)
        return {
          coupon_id: c.id,
          participant_id: c.participantId,
          participant_name: participant?.name || '-',
          weight: c.weight,
          ...participant?.customFields,
        }
      })
    }
    return []
  }, [phase, paginatedCoupons, parsedData, pendingDeletes, importedParticipants, importedCoupons])

  // Headers for each view
  const currentStats = parsedData?.stats || importStats || existingStats
  const customFields = currentStats?.customFields || []

  const groupedHeaders = useMemo(() => {
    const base = ['participant_id', 'participant_name', 'coupon_count']
    return [...base, ...customFields]
  }, [customFields])

  const detailHeaders = useMemo(() => {
    const base = ['coupon_id', 'participant_id', 'participant_name', 'weight']
    return [...base, ...customFields]
  }, [customFields])

  // Handle file selection - start parsing
  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile)
      setError(null)
      setPhase('parsing')
      setProgress(0)

      try {
        // Get headers first for preview
        const { headers } = await parseExcelFile(selectedFile)

        // Import with progress
        const result = await importExcelWithProgress(
          selectedFile,
          eventId,
          (prog, message) => {
            setProgress(prog)
            setProgressMessage(message)
          }
        )

        if (!result.success) {
          const errorMessages = result.stats.errors.map((e) => e.message).join(', ')
          setError(`Import failed: ${errorMessages}`)
          setPhase('upload')
          return
        }

        setParsedData({
          stats: result.stats,
          participants: result.participants || [],
          coupons: result.coupons || [],
          headers,
        })
        setPhase('preview')
      } catch (err) {
        setError(`Failed to parse file: ${err}`)
        setPhase('upload')
      }
    },
    [eventId]
  )

  // Handle error from upload component
  const handleUploadError = useCallback((message: string) => {
    setError(message)
  }, [])

  // Confirm import - go to complete state
  const handleConfirmImport = useCallback(() => {
    if (!parsedData) return

    // Call onImport to pass data up
    onImport(
      parsedData.participants,
      parsedData.coupons,
      parsedData.stats
    )
    setPhase('complete')
  }, [parsedData, onImport])

  // Cancel/re-upload - go back to upload state
  const handleCancel = useCallback(() => {
    setFile(null)
    setParsedData(null)
    setError(null)
    setPhase('upload')
  }, [])

  // Open delete confirmation for participant
  const handleDeleteParticipant = useCallback(
    (participantId: string) => {
      // Find participant info for the dialog
      const participant = paginatedParticipants?.data?.find((p) => p.id === participantId)
      setDeleteTarget({
        type: 'participant',
        id: participantId,
        name: participant?.name,
        couponCount: participant?.couponCount,
      })
    },
    [paginatedParticipants]
  )

  // Open delete confirmation for coupon
  const handleDeleteCoupon = useCallback((couponId: string) => {
    setDeleteTarget({
      type: 'coupon',
      id: couponId,
    })
  }, [])

  // Mark for deletion (atomic edit - actual delete happens on save)
  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return

    if (deleteTarget.type === 'participant') {
      // Mark participant for deletion (will be executed on save)
      markParticipantForDelete(deleteTarget.id)
      toast({
        title: 'Marked for deletion',
        description: 'Participant will be deleted when you save.',
      })
    } else {
      // Mark coupon for deletion (will be executed on save)
      markCouponForDelete(deleteTarget.id)
      toast({
        title: 'Marked for deletion',
        description: 'Coupon will be deleted when you save.',
      })
    }
    setDeleteTarget(null)
  }, [
    deleteTarget,
    markParticipantForDelete,
    markCouponForDelete,
    toast,
  ])

  // Submit to next step
  const handleSubmit = () => {
    const hasData = phase === 'complete' || phase === 'existing' || importStats
    if (!hasData) {
      setError('Please import participants before continuing')
      return
    }
    onNext()
  }

  // Check if we can proceed
  const canProceed = phase === 'complete' || phase === 'existing' || !!importStats

  return (
    <div className="space-y-6">
      {/* Phase: Upload */}
      {phase === 'upload' && (
        <ImportUpload
          onFileSelect={handleFileSelect}
          onError={handleUploadError}
        />
      )}

      {/* Phase: Parsing */}
      {phase === 'parsing' && (
        <ImportProgress
          phase="parsing"
          progress={progress}
          message={progressMessage}
        />
      )}

      {/* Phase: Preview */}
      {phase === 'preview' && parsedData && file && (
        <ImportPreview
          file={file}
          stats={parsedData.stats}
          participants={parsedData.participants}
          coupons={parsedData.coupons}
          headers={parsedData.headers}
          onConfirm={handleConfirmImport}
          onCancel={handleCancel}
        />
      )}

      {/* Phase: Complete or Existing - Show data with table */}
      {(phase === 'complete' || phase === 'existing') && (
        <div className="space-y-4">
          {/* Header with re-import button */}
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Participant Data</h4>
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {phase === 'existing' ? 'Re-import Data' : 'Import New Data'}
            </Button>
          </div>

          {/* Initial loading skeleton */}
          {isInitialLoading ? (
            <ParticipantTableSkeleton />
          ) : currentStats ? (
            <>
              {/* Analytics */}
              <ImportAnalytics stats={currentStats} />

              {/* Data Table */}
              <Card>
                <CardContent className="p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="font-medium">Data Preview</h4>
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grouped' | 'detail')}>
                      <TabsList>
                        <TabsTrigger value="grouped" className="gap-2">
                          <Users className="h-4 w-4" />
                          By Participant
                        </TabsTrigger>
                        <TabsTrigger value="detail" className="gap-2">
                          <List className="h-4 w-4" />
                          All Coupons
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {viewMode === 'grouped' ? (
                    <PaginatedTable
                      headers={groupedHeaders}
                      rows={groupedData}
                      pageSize={pageSize}
                      rowKey={phase === 'existing' ? 'participant_id' : undefined}
                      onDelete={phase === 'existing' ? handleDeleteParticipant : undefined}
                      isDeleting={isDeleting}
                      isLoading={isTableLoading}
                      // Server-side pagination for 'existing' phase
                      serverSide={phase === 'existing'}
                      totalItems={paginatedParticipants?.total}
                      currentPage={page}
                      onPageChange={setPage}
                      onPageSizeChange={(newSize) => {
                        setPageSize(newSize)
                        setPage(1)
                      }}
                      // Server-side search
                      searchValue={searchInput}
                      onSearchChange={setSearchInput}
                    />
                  ) : (
                    <PaginatedTable
                      headers={detailHeaders}
                      rows={detailData}
                      pageSize={pageSize}
                      rowKey={phase === 'existing' ? 'coupon_id' : undefined}
                      onDelete={phase === 'existing' ? handleDeleteCoupon : undefined}
                      isDeleting={isDeleting}
                      isLoading={isTableLoading}
                      // Server-side pagination for 'existing' phase
                      serverSide={phase === 'existing'}
                      totalItems={paginatedCoupons?.total}
                      currentPage={page}
                      onPageChange={setPage}
                      onPageSizeChange={(newSize) => {
                        setPageSize(newSize)
                        setPage(1)
                      }}
                      // Search props - controlled input even if server-side search not implemented yet
                      searchValue={searchInput}
                      onSearchChange={setSearchInput}
                    />
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* Requirements (shown in upload phase only) */}
      {phase === 'upload' && (
        <Card>
          <CardContent className="p-4">
            <h4 className="mb-2 font-medium">Required Columns</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <code className="rounded bg-muted px-1">coupon_id</code> - Unique
                identifier for each coupon
              </li>
              <li>
                <code className="rounded bg-muted px-1">participant_id</code> -
                Participant identifier (one person can have multiple coupons)
              </li>
            </ul>
            <h4 className="mb-2 mt-4 font-medium">Optional Columns</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <code className="rounded bg-muted px-1">participant_name</code>,{' '}
                <code className="rounded bg-muted px-1">email</code>,{' '}
                <code className="rounded bg-muted px-1">phone</code>
              </li>
              <li>
                <code className="rounded bg-muted px-1">weight</code> - Draw
                weight (default 1)
              </li>
              <li>Any other columns will be treated as custom fields</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Navigation actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button onClick={handleSubmit} disabled={!canProceed}>
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={
          deleteTarget?.type === 'participant'
            ? 'Delete Participant?'
            : 'Delete Coupon?'
        }
        description={
          deleteTarget?.type === 'participant'
            ? `Are you sure you want to delete participant "${deleteTarget.name || deleteTarget.id}"?\n\nThis will also delete ${deleteTarget.couponCount || 0} coupon(s) belonging to this participant.`
            : `Are you sure you want to delete coupon "${deleteTarget?.id}"?`
        }
        confirmText="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        requireTypedConfirmation={true}
        confirmationIdentifier={deleteTarget?.id || ''}
      />
    </div>
  )
}

export default StepParticipants
