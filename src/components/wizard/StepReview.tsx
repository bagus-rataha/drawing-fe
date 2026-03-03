/**
 * @file components/wizard/StepReview.tsx
 * @description Step 4: Review all settings before creating event
 */

import type { PrizeFormData, EventInfoFormData, DisplaySettingsFormData } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Send,
  Gift,
  Settings,
} from 'lucide-react'
import { formatNumber } from '@/utils/helpers'
import {
  WIN_RULE_LABELS,
  DRAW_MODE_LABELS,
  ANIMATION_TYPE_LABELS,
  WINNER_DISPLAY_MODE_LABELS,
} from '@/utils/constants'
import { format } from 'date-fns'

interface StepReviewProps {
  wizard: {
    eventInfo: EventInfoFormData
    prizes: PrizeFormData[]
    displaySettings: DisplaySettingsFormData
  }
  isSaving: boolean
  onPrev: () => void
  onCreate: () => void
}

export function StepReview({
  wizard,
  isSaving,
  onPrev,
  onCreate,
}: StepReviewProps) {
  const { eventInfo, prizes, displaySettings } = wizard
  const isBatchMode = eventInfo.drawMode === 'batch'

  const totalPrizeQuantity = prizes.reduce((sum, p) => sum + p.quantity, 0)

  return (
    <div className="space-y-6">
      {/* Event Info Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Event Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Event Name</p>
              <p className="font-medium">{eventInfo.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Win Rule</p>
              <p className="font-medium">
                {WIN_RULE_LABELS[eventInfo.winRuleType]}
                {eventInfo.winRuleType === 'limited' &&
                  ` (max ${eventInfo.maxWins})`}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Draw Mode</p>
              <p className="font-medium">{DRAW_MODE_LABELS[eventInfo.drawMode]}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Animation Type</p>
              <p className="font-medium">{ANIMATION_TYPE_LABELS[eventInfo.animationType]}</p>
            </div>
            {(eventInfo.startDate || eventInfo.endDate) && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Event Date</p>
                <p className="font-medium">
                  {eventInfo.startDate && eventInfo.endDate
                    ? `${format(eventInfo.startDate, 'dd MMM yyyy')} - ${format(eventInfo.endDate, 'dd MMM yyyy')}`
                    : eventInfo.startDate
                      ? format(eventInfo.startDate, 'dd MMM yyyy')
                      : ''}
                </p>
              </div>
            )}
          </div>
          {eventInfo.description && (
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-sm">{eventInfo.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prizes Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5" />
            Prizes ({prizes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {prizes.map((prize, index) => (
              <PrizeRow key={prize.id} prize={prize} index={index} showBatch={isBatchMode} />
            ))}
          </div>
          <div className="mt-4 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Total Winners to Draw:{' '}
              <span className="font-medium text-foreground">
                {formatNumber(totalPrizeQuantity)}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Display Settings Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Display Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Winner Display</p>
              <p className="font-medium">
                {WINNER_DISPLAY_MODE_LABELS[displaySettings.winnerDisplayMode]}
              </p>
            </div>
            {displaySettings.backgroundImage && (
              <div>
                <p className="text-sm text-muted-foreground">
                  Background Image
                </p>
                <p className="font-medium">Custom image uploaded</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev} disabled={isSaving}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button onClick={onCreate} disabled={isSaving}>
          <Send className="mr-2 h-4 w-4" />
          {isSaving ? 'Creating...' : 'Create Event'}
        </Button>
      </div>
    </div>
  )
}

/**
 * Prize row component for the review list
 */
function PrizeRow({ prize, index, showBatch }: { prize: PrizeFormData; index: number; showBatch: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
          {index + 1}
        </span>
        <div>
          <p className="font-medium">{prize.name}</p>
          {showBatch && prize.batchNumber >= 2 && (
            <p className="text-sm text-muted-foreground">
              Batch size: {prize.batchNumber}
            </p>
          )}
        </div>
      </div>
      <Badge variant="secondary">{prize.quantity} winner{prize.quantity > 1 ? 's' : ''}</Badge>
    </div>
  )
}

export default StepReview
