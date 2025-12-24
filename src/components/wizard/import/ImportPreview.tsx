/**
 * @file components/wizard/import/ImportPreview.tsx
 * @description Preview phase component with paginated table
 */

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileSpreadsheet, Users, List, Upload } from 'lucide-react'
import { PaginatedTable } from './PaginatedTable'
import { ImportAnalytics } from './ImportAnalytics'
import { formatFileSize } from '@/utils/helpers'
import type { ImportStats, Participant, Coupon } from '@/types'

interface ImportPreviewProps {
  file: File
  stats: ImportStats
  participants: Participant[]
  coupons: Coupon[]
  headers: string[]
  onConfirm: () => void
  onCancel: () => void
  isConfirming?: boolean
}

/**
 * Preview phase component showing parsed data with analytics
 */
export function ImportPreview({
  file,
  stats,
  participants,
  coupons,
  headers,
  onConfirm,
  onCancel,
  isConfirming,
}: ImportPreviewProps) {
  const [viewMode, setViewMode] = useState<'grouped' | 'detail'>('grouped')

  // Prepare data for grouped view (by participant)
  const groupedData = useMemo(() => {
    return participants.map((p) => {
      const participantCoupons = coupons.filter((c) => c.participantId === p.id)
      return {
        participant_id: p.id,
        participant_name: p.name || '-',
        coupon_count: participantCoupons.length,
        ...p.customFields,
      }
    })
  }, [participants, coupons])

  // Prepare data for detail view (all coupons)
  const detailData = useMemo(() => {
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
  }, [participants, coupons])

  // Headers for each view
  const groupedHeaders = useMemo(() => {
    const base = ['participant_id', 'participant_name', 'coupon_count']
    return [...base, ...stats.customFields]
  }, [stats.customFields])

  const detailHeaders = useMemo(() => {
    const base = ['coupon_id', 'participant_id', 'participant_name', 'weight']
    return [...base, ...stats.customFields]
  }, [stats.customFields])

  return (
    <div className="space-y-4">
      {/* File info */}
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(file.size)} • {headers.length} columns
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onCancel}>
            <Upload className="mr-2 h-4 w-4" />
            Change File
          </Button>
        </CardContent>
      </Card>

      {/* Analytics */}
      <ImportAnalytics stats={stats} />

      {/* Preview Table */}
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
              pageSize={15}
            />
          ) : (
            <PaginatedTable
              headers={detailHeaders}
              rows={detailData}
              pageSize={15}
            />
          )}
        </CardContent>
      </Card>

      {/* Import Errors Warning */}
      {stats.errors.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <h4 className="mb-2 font-medium text-amber-800">Validation Warnings</h4>
            <p className="mb-2 text-sm text-amber-700">
              {stats.invalidRows} rows were skipped due to validation errors:
            </p>
            <ul className="space-y-1 text-sm text-amber-700">
              {stats.errors.slice(0, 5).map((err, index) => (
                <li key={index}>
                  Row {err.row}: {err.message}
                  {err.value && (
                    <Badge variant="outline" className="ml-2">
                      {err.value}
                    </Badge>
                  )}
                </li>
              ))}
              {stats.errors.length > 5 && (
                <li className="text-amber-600">
                  ... and {stats.errors.length - 5} more errors
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isConfirming}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={isConfirming}>
          {isConfirming ? 'Importing...' : 'Confirm Import'}
        </Button>
      </div>
    </div>
  )
}

export default ImportPreview
