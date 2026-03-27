/**
 * @file components/wizard/StepDisplay.tsx
 * @description Step 3: Display Settings
 */

import { useState } from 'react'
import type { DisplaySettingsFormData } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, ArrowRight, Info, Play, Square } from 'lucide-react'
import { ANIMATION_TYPE_LABELS, WINNER_DISPLAY_MODE_LABELS, ROLLING_SOUND_OPTIONS, REVEAL_SOUND_OPTIONS } from '@/utils/constants'
import { useSound } from '@/hooks'

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

      {/* Animation Type */}
      <Card>
        <CardContent className="p-4">
          <Label className="mb-4 block text-base font-medium">Animation Type</Label>
          <RadioGroup
            value={data.animationType}
            onValueChange={(value: 'sphere' | 'rolling' | 'randomize') =>
              onUpdate({ ...data, animationType: value })
            }
            className="flex gap-4"
          >
            {Object.entries(ANIMATION_TYPE_LABELS).map(([value, label]) => {
              const isDisabled = value !== 'randomize'
              return (
                <div key={value} className={`flex items-center space-x-2 ${isDisabled ? 'opacity-50' : ''}`}>
                  <RadioGroupItem value={value} id={`animationType-${value}`} disabled={isDisabled} />
                  <Label htmlFor={`animationType-${value}`} className={isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}>
                    {label}{isDisabled && ' (Coming Soon)'}
                  </Label>
                </div>
              )
            })}
          </RadioGroup>
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

      {/* Sound Effects */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <Label className="block text-base font-medium">Sound Effects</Label>
          <p className="text-sm text-muted-foreground">Sound played during draw animation</p>

          <SoundSelect
            label="Rolling Sound"
            value={data.rollingSound}
            options={ROLLING_SOUND_OPTIONS}
            onChange={(v) => onUpdate({ ...data, rollingSound: v })}
          />
          <SoundSelect
            label="Reveal Sound"
            value={data.revealSound}
            options={REVEAL_SOUND_OPTIONS}
            onChange={(v) => onUpdate({ ...data, revealSound: v })}
          />
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

function SoundSelect({ label, value, options, onChange }: { label: string; value: string; options: Record<string, { label: string; file: string | null }>; onChange: (v: string) => void }) {
  const { preview, stopPreview } = useSound()
  const [playing, setPlaying] = useState(false)

  const handleToggle = () => {
    if (playing) {
      stopPreview()
      setPlaying(false)
    } else {
      const file = options[value]?.file
      if (file) {
        preview(file)
        setPlaying(true)
      }
    }
  }

  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <Select value={value || '_none_'} onValueChange={(v) => { stopPreview(); setPlaying(false); onChange(v === '_none_' ? '' : v) }}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(options).map(([key, opt]) => (
              <SelectItem key={key || '_none_'} value={key || '_none_'}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {value && options[value]?.file && (
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={handleToggle}>
            {playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  )
}

export default StepDisplay
