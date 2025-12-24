/**
 * @file components/wizard/StepReview.tsx
 * @description Step 5: Review component
 */

import type { WizardState, PrizeFormData } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Save,
  Play,
  Gift,
  Users,
  Ticket,
  Settings,
  CheckCircle2,
} from 'lucide-react'
import { formatNumber } from '@/utils/helpers'
import {
  WIN_RULE_LABELS,
  DRAW_MODE_LABELS,
  WINNER_DISPLAY_MODE_LABELS,
} from '@/utils/constants'
import { format } from 'date-fns'

interface StepReviewProps {
  wizardState: WizardState
  isSaving: boolean
  onPrev: () => void
  onSaveDraft: () => void
  onSaveAndStart: () => void
}

/**
 * Step 5: Review
 * Review all settings before saving
 */
export function StepReview({
  wizardState,
  isSaving,
  onPrev,
  onSaveDraft,
  onSaveAndStart,
}: StepReviewProps) {
  const { eventInfo, prizes, displaySettings, importStats } = wizardState

  // Calculate totals
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
              <PrizeRow key={prize.id} prize={prize} index={index} />
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

      {/* Participants Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Participants
          </CardTitle>
        </CardHeader>
        <CardContent>
          {importStats ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {formatNumber(importStats.uniqueParticipants)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Unique Participants
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {formatNumber(importStats.totalCoupons)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Coupons</p>
                </div>
              </div>
              {importStats.customFields.length > 0 && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Custom Fields</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {importStats.customFields.map((field) => (
                      <Badge key={field} variant="secondary">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">No participants imported</p>
          )}
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
              <p className="text-sm text-muted-foreground">Animation Type</p>
              <p className="font-medium">
                {displaySettings.animationType === '3d-sphere'
                  ? '3D Sphere'
                  : 'Particle Effect'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Winner Display</p>
              <p className="font-medium">
                {WINNER_DISPLAY_MODE_LABELS[displaySettings.winnerDisplayMode]}
              </p>
            </div>
            {displaySettings.backgroundImage && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">
                  Background Image
                </p>
                <p className="font-medium">Custom image uploaded</p>
              </div>
            )}
            {displaySettings.customFieldsToShow.length > 0 && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">
                  Fields to Display
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {displaySettings.customFieldsToShow.map((field) => (
                    <Badge key={field} variant="outline">
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Check */}
      {importStats && importStats.totalCoupons >= totalPrizeQuantity && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          <CheckCircle2 className="h-5 w-5" />
          <span>
            Pool size ({formatNumber(importStats.totalCoupons)} coupons) is
            sufficient for {formatNumber(totalPrizeQuantity)} prizes
          </span>
        </div>
      )}

      {importStats && importStats.totalCoupons < totalPrizeQuantity && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <CheckCircle2 className="h-5 w-5" />
          <span>
            Warning: Pool size ({formatNumber(importStats.totalCoupons)} coupons)
            is less than prize quantity ({formatNumber(totalPrizeQuantity)})
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev} disabled={isSaving}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSaveDraft} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={onSaveAndStart} disabled={isSaving || !importStats}>
            <Play className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save & Ready'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Prize row component for the review list
 */
function PrizeRow({ prize, index }: { prize: PrizeFormData; index: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
          {index + 1}
        </span>
        <div>
          <p className="font-medium">{prize.name}</p>
          <p className="text-sm text-muted-foreground">
            {DRAW_MODE_LABELS[prize.drawMode]}
            {prize.drawMode === 'batch' &&
              prize.batches.length > 0 &&
              ` (${prize.batches.join(', ')})`}
          </p>
        </div>
      </div>
      <Badge variant="secondary">{prize.quantity} winner{prize.quantity > 1 ? 's' : ''}</Badge>
    </div>
  )
}

export default StepReview
