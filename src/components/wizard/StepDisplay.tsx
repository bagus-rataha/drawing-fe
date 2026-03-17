/**
 * @file components/wizard/StepDisplay.tsx
 * @description Step 3: Display Settings
 */

import type { DisplaySettingsFormData } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ArrowLeft, ArrowRight, Info } from 'lucide-react'
import { WINNER_DISPLAY_MODE_LABELS } from '@/utils/constants'

interface StepDisplayProps {
  data: DisplaySettingsFormData
  onUpdate: (data: DisplaySettingsFormData) => void
  onNext: () => void
  onPrev: () => void
}

export function StepDisplay({
  data,
  onUpdate,
  onNext,
  onPrev,
}: StepDisplayProps) {
  return (
    <div className="space-y-6">
      {/* Background Image Info */}
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800">
        <Info className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">
          Background images are configured per-prize in Step 2. Each prize can have its own background for the draw screen.
        </span>
      </div>

      {/* Winner Display Options */}
      <Card>
        <CardContent className="p-4">
          <Label className="mb-4 block text-base font-medium">
            Winner Display Options
          </Label>
          <p className="mb-4 text-sm text-muted-foreground">
            What to show during drawing
          </p>

          <RadioGroup
            value={data.winnerDisplayMode}
            onValueChange={(value: 'coupon' | 'coupon_participant') =>
              onUpdate({ ...data, winnerDisplayMode: value })
            }
            className="space-y-3"
          >
            {Object.entries(WINNER_DISPLAY_MODE_LABELS).map(([value, label]) => (
              <div key={value} className="flex items-center space-x-3">
                <RadioGroupItem value={value} id={value} />
                <Label htmlFor={value} className="cursor-pointer">
                  {label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button onClick={onNext}>
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default StepDisplay
