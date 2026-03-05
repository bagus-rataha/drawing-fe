/**
 * @file components/wizard/StepEventInfo.tsx
 * @description Step 1: Event Info form with draw mode and animation type
 */

import { useState, useEffect } from 'react'
import type { EventInfoFormData, PrizeFormData, WinRuleType } from '@/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { validateEventInfo } from '@/services/validationService'
import { WIN_RULE_LABELS, DRAW_MODE_LABELS, ANIMATION_TYPE_LABELS } from '@/utils/constants'
import { AlertCircle, ArrowRight, CalendarIcon } from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

interface StepEventInfoProps {
  data: EventInfoFormData
  prizes: PrizeFormData[]
  onUpdate: (data: EventInfoFormData) => void
  onPrizesUpdate: (prizes: PrizeFormData[]) => void
  onNext: () => void
}

export function StepEventInfo({ data, prizes, onUpdate, onPrizesUpdate, onNext }: StepEventInfoProps) {
  const [errors, setErrors] = useState<string[]>([])
  const [showDrawModeConfirm, setShowDrawModeConfirm] = useState(false)
  const [pendingDrawMode, setPendingDrawMode] = useState<string | null>(null)

  // Responsive DatePicker
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const validation = validateEventInfo(data)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setErrors([])
    onNext()
  }

  const handleChange = (field: keyof EventInfoFormData, value: string | number | Date | null) => {
    // Intercept drawMode change when prizes already exist
    if (field === 'drawMode' && value !== data.drawMode && prizes.length > 0) {
      setPendingDrawMode(value as string)
      setShowDrawModeConfirm(true)
      return
    }
    onUpdate({ ...data, [field]: value })
    setErrors([])
  }

  const handleDrawModeConfirm = () => {
    if (!pendingDrawMode) return
    const newBatchNumber = pendingDrawMode === 'batch' ? 2 : 1
    onPrizesUpdate(prizes.map((p) => ({ ...p, batchNumber: newBatchNumber })))
    onUpdate({ ...data, drawMode: pendingDrawMode as 'one_by_one' | 'batch' })
    setShowDrawModeConfirm(false)
    setPendingDrawMode(null)
    setErrors([])
  }


  const handleDateRangeChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    onUpdate({
      ...data,
      startDate: start,
      endDate: end,
    })
    setErrors([])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Event Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Event Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., Grand Launching 2025"
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={data.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Optional description for this event"
            rows={3}
            maxLength={500}
          />
        </div>

        {/* Event Date Range */}
        <div className="space-y-2">
          <Label>Event Date (Optional)</Label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
            <DatePicker
              selectsRange
              startDate={data.startDate}
              endDate={data.endDate}
              onChange={handleDateRangeChange}
              dateFormat="dd MMM yyyy"
              placeholderText="Select date range"
              isClearable
              className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              calendarClassName="shadow-lg border rounded-lg"
              monthsShown={isMobile ? 1 : 2}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            When the event will take place
          </p>
        </div>

        {/* Win Rule Type */}
        <div className="space-y-2">
          <Label htmlFor="winRuleType">
            Win Rule <span className="text-destructive">*</span>
          </Label>
          <Select
            value={data.winRuleType}
            onValueChange={(value: WinRuleType) =>
              handleChange('winRuleType', value)
            }
          >
            <SelectTrigger id="winRuleType">
              <SelectValue placeholder="Select win rule" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(WIN_RULE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {data.winRuleType === 'onetime' &&
              'Each participant can only win once across all prizes'}
            {data.winRuleType === 'limited' &&
              'Each participant can win up to N times'}
            {data.winRuleType === 'unlimited' &&
              'No restriction on number of wins per participant'}
          </p>
        </div>

        {/* Max Wins (for limited rule) */}
        {data.winRuleType === 'limited' && (
          <div className="space-y-2">
            <Label htmlFor="maxWins">
              Maximum Wins <span className="text-destructive">*</span>
            </Label>
            <Input
              id="maxWins"
              type="number"
              min={1}
              max={100}
              value={data.maxWins}
              onChange={(e) =>
                handleChange('maxWins', parseInt(e.target.value) || 1)
              }
            />
            <p className="text-sm text-muted-foreground">
              Maximum number of times a participant can win
            </p>
          </div>
        )}

        {/* Draw Mode */}
        <div className="space-y-2">
          <Label>
            Draw Mode <span className="text-destructive">*</span>
          </Label>
          <RadioGroup
            value={data.drawMode}
            onValueChange={(value) => handleChange('drawMode', value)}
            className="flex gap-4"
          >
            {Object.entries(DRAW_MODE_LABELS).map(([value, label]) => (
              <div key={value} className="flex items-center space-x-2">
                <RadioGroupItem value={value} id={`drawMode-${value}`} />
                <Label htmlFor={`drawMode-${value}`} className="cursor-pointer">
                  {label}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <p className="text-sm text-muted-foreground">
            {data.drawMode === 'one_by_one'
              ? 'Draw winners one at a time'
              : 'Draw winners in batches per prize'}
          </p>
        </div>

        {/* Animation Type */}
        <div className="space-y-2">
          <Label>
            Animation Type <span className="text-destructive">*</span>
          </Label>
          <RadioGroup
            value={data.animationType}
            onValueChange={(value) => handleChange('animationType', value)}
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
          <p className="text-sm text-muted-foreground">
            Animation style for the draw screen
          </p>
        </div>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-inside list-disc">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <Button type="submit">
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Draw Mode Change Confirmation */}
      <ConfirmDialog
        open={showDrawModeConfirm}
        onOpenChange={setShowDrawModeConfirm}
        title="Ubah Draw Mode?"
        description={`Anda sudah memiliki ${prizes.length} prize. Mengubah draw mode akan menyesuaikan batch number semua prize ke ${pendingDrawMode === 'batch' ? '2 (default batch)' : '1 (one by one)'}.\n\nLanjutkan?`}
        confirmText="Ya, Ubah"
        cancelText="Batal"
        onConfirm={handleDrawModeConfirm}
      />
    </form>
  )
}

export default StepEventInfo
