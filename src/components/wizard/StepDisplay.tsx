/**
 * @file components/wizard/StepDisplay.tsx
 * @description Step 3: Display Settings (simplified, with future notice badge)
 */

import type { DisplaySettingsFormData } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ArrowLeft, ArrowRight, Upload, X, Image, Info } from 'lucide-react'
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
  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      onUpdate({ ...data, backgroundImage: base64 })
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveBackground = () => {
    onUpdate({ ...data, backgroundImage: undefined })
  }

  return (
    <div className="space-y-6">
      {/* Notice Badge */}
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800">
        <Info className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">
          This setting will be available in a future update. You can configure it now but some options may not take effect yet.
        </span>
      </div>

      {/* Background Image */}
      <Card>
        <CardContent className="p-4">
          <Label className="mb-4 block text-base font-medium">
            Background Image (Optional)
          </Label>
          <p className="mb-4 text-sm text-muted-foreground">
            Upload a custom background image for the draw screen
          </p>

          {data.backgroundImage ? (
            <div className="relative">
              <img
                src={data.backgroundImage}
                alt="Background preview"
                className="max-h-48 w-full rounded-lg object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2"
                onClick={handleRemoveBackground}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8">
              <Image className="mb-2 h-8 w-8 text-muted-foreground" />
              <Input
                type="file"
                accept="image/*"
                onChange={handleBackgroundUpload}
                className="hidden"
                id="bg-upload"
              />
              <Label htmlFor="bg-upload" className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </span>
                </Button>
              </Label>
            </div>
          )}
        </CardContent>
      </Card>

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
            onValueChange={(value: 'coupon_only' | 'coupon_and_participant') =>
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
