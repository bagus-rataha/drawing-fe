/**
 * @file components/wizard/StepDisplay.tsx
 * @description Step 4: Display Settings component with winner display mode options
 */

import type { DisplaySettingsFormData, AnimationType, WinnerDisplayMode } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ArrowLeft, ArrowRight, Upload, X, Image } from 'lucide-react'
import { WINNER_DISPLAY_MODE_LABELS } from '@/utils/constants'

interface StepDisplayProps {
  data: DisplaySettingsFormData
  availableCustomFields: string[]
  hasParticipantName?: boolean
  onUpdate: (data: DisplaySettingsFormData) => void
  onNext: () => void
  onPrev: () => void
}

/**
 * Step 4: Display Settings
 * Configure visual settings for the draw screen
 */
export function StepDisplay({
  data,
  availableCustomFields,
  hasParticipantName = false,
  onUpdate,
  onNext,
  onPrev,
}: StepDisplayProps) {
  const handleChange = (
    field: keyof DisplaySettingsFormData,
    value: string | string[]
  ) => {
    onUpdate({ ...data, [field]: value })
  }

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      handleChange('backgroundImage', base64)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveBackground = () => {
    handleChange('backgroundImage', undefined as unknown as string)
  }

  const toggleCustomField = (field: string) => {
    const current = data.customFieldsToShow || []
    if (current.includes(field)) {
      handleChange(
        'customFieldsToShow',
        current.filter((f) => f !== field)
      )
    } else {
      handleChange('customFieldsToShow', [...current, field])
    }
  }

  return (
    <div className="space-y-6">
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

      {/* Animation Type */}
      <Card>
        <CardContent className="p-4">
          <Label className="mb-4 block text-base font-medium">
            Animation Type
          </Label>
          <p className="mb-4 text-sm text-muted-foreground">
            Choose the animation style for the draw screen (Phase 2 feature)
          </p>

          <Select
            value={data.animationType}
            onValueChange={(value: AnimationType) =>
              handleChange('animationType', value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3d-sphere">3D Sphere</SelectItem>
              <SelectItem value="particle">Particle Effect</SelectItem>
            </SelectContent>
          </Select>
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
            onValueChange={(value: WinnerDisplayMode) =>
              handleChange('winnerDisplayMode', value)
            }
            className="space-y-3"
          >
            {(Object.entries(WINNER_DISPLAY_MODE_LABELS) as [WinnerDisplayMode, string][]).map(
              ([value, label]) => {
                const isDisabled = value === 'coupon-participant-name' && !hasParticipantName
                return (
                  <div key={value} className="flex items-center space-x-3">
                    <RadioGroupItem
                      value={value}
                      id={value}
                      disabled={isDisabled}
                    />
                    <Label
                      htmlFor={value}
                      className={isDisabled ? 'text-muted-foreground cursor-not-allowed' : 'cursor-pointer'}
                    >
                      {label}
                      {isDisabled && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (no name column in import)
                        </span>
                      )}
                    </Label>
                  </div>
                )
              }
            )}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Custom Fields to Display */}
      {availableCustomFields.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <Label className="mb-4 block text-base font-medium">
              Custom Fields to Display
            </Label>
            <p className="mb-4 text-sm text-muted-foreground">
              Select which custom fields to show on winner cards
            </p>

            <div className="flex flex-wrap gap-2">
              {availableCustomFields.map((field) => {
                const isSelected = (data.customFieldsToShow || []).includes(field)
                return (
                  <Badge
                    key={field}
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleCustomField(field)}
                  >
                    {field}
                    {isSelected && <X className="ml-1 h-3 w-3" />}
                  </Badge>
                )
              })}
            </div>

            {data.customFieldsToShow && data.customFieldsToShow.length > 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                Selected: {data.customFieldsToShow.join(', ')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

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
