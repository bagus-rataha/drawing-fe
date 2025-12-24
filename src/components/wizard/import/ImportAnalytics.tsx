/**
 * @file components/wizard/import/ImportAnalytics.tsx
 * @description Analytics summary card for import data
 */

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Ticket, BarChart3 } from 'lucide-react'
import { formatNumber } from '@/utils/helpers'
import type { ImportStats } from '@/types'

interface ImportAnalyticsProps {
  stats: ImportStats
}

/**
 * Analytics summary card showing import statistics
 */
export function ImportAnalytics({ stats }: ImportAnalyticsProps) {
  const avgCouponsPerParticipant =
    stats.uniqueParticipants > 0
      ? (stats.totalCoupons / stats.uniqueParticipants).toFixed(1)
      : '0'

  return (
    <Card>
      <CardContent className="p-4">
        <h4 className="mb-4 font-medium">Import Analytics</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatNumber(stats.uniqueParticipants)}
              </p>
              <p className="text-sm text-muted-foreground">Participants</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Ticket className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatNumber(stats.totalCoupons)}
              </p>
              <p className="text-sm text-muted-foreground">Coupons</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgCouponsPerParticipant}</p>
              <p className="text-sm text-muted-foreground">Avg per person</p>
            </div>
          </div>
        </div>

        {stats.customFields.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <p className="mb-2 text-sm text-muted-foreground">Custom Fields</p>
            <div className="flex flex-wrap gap-1">
              {stats.customFields.map((field) => (
                <Badge key={field} variant="secondary">
                  {field}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {stats.invalidRows > 0 && (
          <div className="mt-4 border-t pt-4">
            <p className="text-sm text-amber-600">
              {stats.invalidRows} rows skipped due to validation errors
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ImportAnalytics
