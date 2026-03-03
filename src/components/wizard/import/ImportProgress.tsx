/**
 * @file components/wizard/import/ImportProgress.tsx
 * @description Progress bar component for import phases
 */

import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface ImportProgressProps {
  phase: 'parsing' | 'importing'
  progress: number
  message?: string
}

/**
 * Progress bar component for parsing and importing phases
 */
export function ImportProgress({ phase, progress, message }: ImportProgressProps) {
  const phaseLabels = {
    parsing: 'Parsing Excel file...',
    importing: 'Saving to database...',
  }

  // Use same rounded value for both text and bar to ensure sync
  const roundedProgress = Math.round(progress)

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="mb-2 text-lg font-medium">{phaseLabels[phase]}</p>
          {message && (
            <p className="mb-4 text-sm text-muted-foreground">{message}</p>
          )}

          {/* Progress bar */}
          <div className="w-full max-w-md">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{roundedProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                style={{ width: `${roundedProgress}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ImportProgress
