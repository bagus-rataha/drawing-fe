import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Ticket } from 'lucide-react'
import { PaginatedTable } from '@/components/wizard/import/PaginatedTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  useParticipantList,
  useCouponList,
  useDeleteParticipant,
  useDeleteCoupon,
  useDebounce,
} from '@/hooks'

interface ImportedDataTableProps {
  eventId: string
  allowDelete?: boolean
}

const PARTICIPANT_HEADERS = [
  'Participant ID',
  'Name',
  'Coupons',
  'Active Coupon',
  'Wins',
  'Status',
]

const COUPON_HEADERS = [
  'Coupon ID',
  'Participant ID',
  'Name',
  'Status',
]

const STATUS_VARIANT_MAP: Record<string, 'draft' | 'ready' | 'in_progress' | 'completed'> = {
  active: 'completed',
  inactive: 'draft',
  voided: 'destructive' as never,
  won: 'in_progress',
  cancelled: 'draft',
}

function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANT_MAP[status] ?? 'secondary'
  return <Badge variant={variant as 'draft' | 'in_progress' | 'completed'}>{status}</Badge>
}

export function ImportedDataTable({ eventId, allowDelete = false }: ImportedDataTableProps) {
  const [viewMode, setViewMode] = useState<'participants' | 'coupons'>('participants')

  // Participant pagination state
  const [pPage, setPPage] = useState(1)
  const [pLimit, setPLimit] = useState(10)
  const [pSearch, setPSearch] = useState('')
  const pSearchDebounced = useDebounce(pSearch, 300)

  // Coupon pagination state
  const [cPage, setCPage] = useState(1)
  const [cLimit, setCLimit] = useState(10)
  const [cSearch, setCSearch] = useState('')
  const cSearchDebounced = useDebounce(cSearch, 300)

  // Queries
  const participantQuery = useParticipantList(eventId, {
    page: pPage,
    limit: pLimit,
    search: pSearchDebounced,
  })
  const couponQuery = useCouponList(eventId, {
    page: cPage,
    limit: cLimit,
    search: cSearchDebounced,
  })

  // Delete mutations
  const deleteParticipant = useDeleteParticipant()
  const deleteCoupon = useDeleteCoupon()

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'participant' | 'coupon'
    id: string
    identifier: string
  } | null>(null)
  const isDeleting = deleteParticipant.isPending || deleteCoupon.isPending

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'participant') {
      await deleteParticipant.mutateAsync({ id: deleteTarget.id, eventId })
    } else {
      await deleteCoupon.mutateAsync({ id: deleteTarget.id, eventId })
    }
    setDeleteTarget(null)
  }

  // Map API data to table rows
  const participantRows = useMemo(() => {
    return (participantQuery.data?.items ?? []).map((p) => ({
      id: p.id,
      'Participant ID': p.participant_import_identifier,
      'Name': p.name || '-',
      'Coupons': p.coupon_count,
      'Active Coupon': p.active_coupon_count,
      'Wins': p.win_count,
      'Status': p.status,
      _status_raw: p.status,
      _identifier: p.participant_import_identifier,
    }))
  }, [participantQuery.data])

  const couponRows = useMemo(() => {
    return (couponQuery.data?.items ?? []).map((c) => ({
      id: c.id,
      'Coupon ID': c.coupon_import_identifier,
      'Participant ID': c.participant_import_identifier,
      'Name': c.participant_name || '-',
      'Status': c.status,
      _status_raw: c.status,
      _identifier: c.coupon_import_identifier,
    }))
  }, [couponQuery.data])

  // Find identifier for delete target
  const handleDeleteParticipant = (id: string) => {
    const row = participantRows.find((r) => r.id === id)
    setDeleteTarget({ type: 'participant', id, identifier: row?._identifier || id })
  }
  const handleDeleteCoupon = (id: string) => {
    const row = couponRows.find((r) => r.id === id)
    setDeleteTarget({ type: 'coupon', id, identifier: row?._identifier || id })
  }

  const participantTotal = participantQuery.data?.total_items ?? 0
  const couponTotal = couponQuery.data?.total_items ?? 0

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Imported Data
            </CardTitle>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'participants' | 'coupons')}>
              <TabsList>
                <TabsTrigger value="participants" className="gap-2">
                  <Users className="h-4 w-4" />
                  Participants ({participantTotal.toLocaleString()})
                </TabsTrigger>
                <TabsTrigger value="coupons" className="gap-2">
                  <Ticket className="h-4 w-4" />
                  Coupons ({couponTotal.toLocaleString()})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'participants' ? (
            <PaginatedTable
              headers={PARTICIPANT_HEADERS}
              rows={participantRows}
              serverSide
              totalItems={participantTotal}
              currentPage={pPage}
              pageSize={pLimit}
              onPageChange={(page) => setPPage(page)}
              onPageSizeChange={(size) => { setPLimit(size); setPPage(1) }}
              onSearchChange={(q) => { setPSearch(q); setPPage(1) }}
              searchValue={pSearch}
              isLoading={participantQuery.isFetching}
              rowKey={allowDelete ? 'id' : undefined}
              onDelete={allowDelete ? handleDeleteParticipant : undefined}
              isDeleting={isDeleting}
              renderCell={(header, value) => {
                if (header === 'Status') return <StatusBadge status={String(value ?? '')} />
                return undefined
              }}
            />
          ) : (
            <PaginatedTable
              headers={COUPON_HEADERS}
              rows={couponRows}
              serverSide
              totalItems={couponTotal}
              currentPage={cPage}
              pageSize={cLimit}
              onPageChange={(page) => setCPage(page)}
              onPageSizeChange={(size) => { setCLimit(size); setCPage(1) }}
              onSearchChange={(q) => { setCSearch(q); setCPage(1) }}
              searchValue={cSearch}
              isLoading={couponQuery.isFetching}
              rowKey={allowDelete ? 'id' : undefined}
              onDelete={allowDelete ? handleDeleteCoupon : undefined}
              isDeleting={isDeleting}
              renderCell={(header, value) => {
                if (header === 'Status') return <StatusBadge status={String(value ?? '')} />
                return undefined
              }}
            />
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title={deleteTarget?.type === 'participant' ? 'Delete Participant?' : 'Delete Coupon?'}
        description={
          deleteTarget?.type === 'participant'
            ? 'This will permanently delete the participant and all associated coupons. This action cannot be undone.'
            : 'This will permanently delete this coupon. This action cannot be undone.'
        }
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        requireTypedConfirmation
        confirmationIdentifier={deleteTarget?.identifier || ''}
      />
    </>
  )
}

export default ImportedDataTable
