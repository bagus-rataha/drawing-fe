/**
 * @file components/wizard/import/ImportComplete.tsx
 * @description Completed state component showing import success
 */

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import { ImportAnalytics } from './ImportAnalytics'
import type { ImportStats } from '@/types'

interface ImportCompleteProps {
  stats: ImportStats
  onReimport: () => void
}

/**
 * Completed state component showing import success and analytics
 */
export function ImportComplete({ stats, onReimport }: ImportCompleteProps) {
  return (
    <div className="space-y-4">
      {/* Success message */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex items-center gap-4 p-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
          <div className="flex-1">
            <p className="font-medium text-green-800">Import Successful</p>
            <p className="text-sm text-green-700">
              Data has been validated and is ready for the raffle draw
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onReimport}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Re-import
          </Button>
        </CardContent>
      </Card>

      {/* Analytics */}
      <ImportAnalytics stats={stats} />
    </div>
  )
}

export default ImportComplete
