/**
 * @file pages/EventWizard.tsx
 * @description Event creation/editing wizard page
 *
 * Routes:
 * - /event/new : Create new event
 * - /event/:id/edit : Edit existing event
 */

import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import {
  WizardStepper,
  StepEventInfo,
  StepPrizes,
  StepParticipants,
  StepDisplay,
  StepReview,
} from '@/components/wizard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft } from 'lucide-react'
import { useEventStore } from '@/stores'
import {
  useEvent,
  usePrizes,
  useParticipantCount,
  useCouponCount,
  useCreateEvent,
  useUpdateEvent,
  useCreateManyPrizes,
  useDeletePrizesByEvent,
  useCreateManyParticipants,
  useCreateManyCoupons,
  useDeleteParticipantsByEvent,
  useDeleteCouponsByEvent,
  useUpdateEventStats,
} from '@/hooks'
import type { PrizeFormData, ImportStats, Participant, Coupon } from '@/types'
import { generateId } from '@/utils/helpers'

/**
 * Event Wizard page component
 */
export function EventWizard() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = !!id

  // Fetch existing event data if editing
  const { data: existingEvent, isLoading: isLoadingEvent } = useEvent(id)
  const { data: existingPrizes = [], isLoading: isLoadingPrizes } = usePrizes(id)
  // Use count queries instead of fetching all data (for performance)
  const { data: participantCount = 0, isLoading: isLoadingParticipantCount } = useParticipantCount(id)
  const { data: couponCount = 0, isLoading: isLoadingCouponCount } = useCouponCount(id)
  const hasExistingData = participantCount > 0 || couponCount > 0

  // Mutations
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const createManyPrizes = useCreateManyPrizes()
  const deletePrizesByEvent = useDeletePrizesByEvent()
  const createManyParticipants = useCreateManyParticipants()
  const createManyCoupons = useCreateManyCoupons()
  const deleteParticipantsByEvent = useDeleteParticipantsByEvent()
  const deleteCouponsByEvent = useDeleteCouponsByEvent()
  const updateEventStats = useUpdateEventStats()

  // Store
  const {
    wizard,
    setWizardStep,
    nextStep,
    prevStep,
    resetWizard,
    setEventInfo,
    setPrizes,
    setDisplaySettings,
    setImportStats,
    initWizardForEdit,
  } = useEventStore()

  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [tempEventId, setTempEventId] = useState<string | null>(null)
  const [importedParticipants, setImportedParticipants] = useState<Participant[]>([])
  const [importedCoupons, setImportedCoupons] = useState<Coupon[]>([])

  // Track whether wizard has been initialized for the current event (prevents infinite loop)
  const initializedEventIdRef = useRef<string | null>(null)

  // Initialize wizard for editing (with guard to prevent infinite loop)
  useEffect(() => {
    if (
      isEditing &&
      existingEvent &&
      existingPrizes &&
      initializedEventIdRef.current !== existingEvent.id
    ) {
      const prizeFormData: PrizeFormData[] = existingPrizes.map((p) => ({
        id: p.id,
        name: p.name,
        image: p.image,
        quantity: p.quantity,
        drawMode: p.drawConfig.mode,
        batches: p.drawConfig.batches || [],
      }))
      initWizardForEdit(existingEvent, prizeFormData)
      initializedEventIdRef.current = existingEvent.id
    }
  }, [isEditing, existingEvent, existingPrizes, initWizardForEdit])

  // Reset wizard on unmount or when creating new
  useEffect(() => {
    if (!isEditing) {
      resetWizard()
      setTempEventId(generateId())
      initializedEventIdRef.current = null
    }
    return () => {
      // Cleanup if needed
    }
  }, [isEditing, resetWizard])

  // Get the effective event ID (existing or temporary)
  const eventId = id || tempEventId || ''

  // Handle import
  const handleImport = (
    participants: { id: string; eventId: string; name?: string; customFields: Record<string, string>; couponCount: number }[],
    coupons: { id: string; eventId: string; participantId: string; weight: number }[],
    stats: ImportStats
  ) => {
    // Convert to full Participant type with defaults
    const fullParticipants: Participant[] = participants.map((p) => ({
      ...p,
      winCount: 0,
      status: 'active' as const,
    }))
    // Convert to full Coupon type with defaults
    const fullCoupons: Coupon[] = coupons.map((c) => ({
      ...c,
      status: 'active' as const,
    }))
    setImportedParticipants(fullParticipants)
    setImportedCoupons(fullCoupons)
    setImportStats(stats)
  }

  // Save as draft
  const handleSaveDraft = async () => {
    if (isSaving) return // Prevent double-click

    setIsSaving(true)
    try {
      await saveEvent('draft')
      toast({
        title: 'Draft Saved',
        description: 'Event has been saved as draft.',
      })
      navigate('/', { replace: true })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save event. Please try again.',
        variant: 'destructive',
      })
      setIsSaving(false) // Only reset on error
    }
  }

  // Save and mark as ready
  const handleSaveAndStart = async () => {
    if (isSaving) return // Prevent double-click

    setIsSaving(true)
    try {
      await saveEvent('ready')
      toast({
        title: 'Event Ready',
        description: 'Event has been saved and is ready to start.',
      })
      navigate('/', { replace: true })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save event. Please try again.',
        variant: 'destructive',
      })
      setIsSaving(false) // Only reset on error
    }
  }

  // Core save logic
  const saveEvent = async (status: 'draft' | 'ready') => {
    const { eventInfo, prizes, displaySettings, importStats } = wizard

    if (isEditing && id) {
      // Update existing event
      await updateEvent.mutateAsync({
        id,
        data: {
          name: eventInfo.name,
          description: eventInfo.description || undefined,
          startDate: eventInfo.startDate || undefined,
          endDate: eventInfo.endDate || undefined,
          winRule: {
            type: eventInfo.winRuleType,
            maxWins:
              eventInfo.winRuleType === 'limited' ? eventInfo.maxWins : undefined,
          },
          displaySettings: {
            backgroundImage: displaySettings.backgroundImage,
            animationType: displaySettings.animationType,
            winnerDisplayMode: displaySettings.winnerDisplayMode,
            customFieldsToShow: displaySettings.customFieldsToShow,
          },
          status,
        },
      })

      // Update prizes (delete old, create new)
      await deletePrizesByEvent.mutateAsync(id)
      if (prizes.length > 0) {
        await createManyPrizes.mutateAsync(
          prizes.map((p, index) => ({
            eventId: id,
            name: p.name,
            image: p.image,
            quantity: p.quantity,
            sequence: index + 1,
            drawConfig: {
              mode: p.drawMode,
              batches: p.drawMode === 'batch' ? p.batches : undefined,
            },
          }))
        )
      }

      // Handle participants/coupons if re-imported
      if (importedParticipants.length > 0) {
        await deleteParticipantsByEvent.mutateAsync(id)
        await deleteCouponsByEvent.mutateAsync(id)

        await createManyParticipants.mutateAsync(
          importedParticipants.map((p) => ({
            id: p.id,
            eventId: id,
            name: p.name,
            email: p.email,
            phone: p.phone,
            customFields: p.customFields,
            couponCount: p.couponCount,
          }))
        )

        await createManyCoupons.mutateAsync(
          importedCoupons.map((c) => ({
            id: c.id,
            eventId: id,
            participantId: c.participantId,
            weight: c.weight,
          }))
        )

        await updateEventStats.mutateAsync({
          id,
          stats: {
            totalParticipants: importStats?.uniqueParticipants || 0,
            totalCoupons: importStats?.totalCoupons || 0,
          },
        })
      }
    } else {
      // Create new event
      const newEvent = await createEvent.mutateAsync({
        name: eventInfo.name,
        description: eventInfo.description || undefined,
        startDate: eventInfo.startDate || undefined,
        endDate: eventInfo.endDate || undefined,
        winRule: {
          type: eventInfo.winRuleType,
          maxWins:
            eventInfo.winRuleType === 'limited' ? eventInfo.maxWins : undefined,
        },
        displaySettings: {
          backgroundImage: displaySettings.backgroundImage,
          animationType: displaySettings.animationType,
          winnerDisplayMode: displaySettings.winnerDisplayMode,
          customFieldsToShow: displaySettings.customFieldsToShow,
        },
      })

      // Create prizes
      if (prizes.length > 0) {
        await createManyPrizes.mutateAsync(
          prizes.map((p, index) => ({
            eventId: newEvent.id,
            name: p.name,
            image: p.image,
            quantity: p.quantity,
            sequence: index + 1,
            drawConfig: {
              mode: p.drawMode,
              batches: p.drawMode === 'batch' ? p.batches : undefined,
            },
          }))
        )
      }

      // Create participants and coupons
      if (importedParticipants.length > 0) {
        await createManyParticipants.mutateAsync(
          importedParticipants.map((p) => ({
            id: p.id,
            eventId: newEvent.id,
            name: p.name,
            email: p.email,
            phone: p.phone,
            customFields: p.customFields,
            couponCount: p.couponCount,
          }))
        )

        await createManyCoupons.mutateAsync(
          importedCoupons.map((c) => ({
            id: c.id,
            eventId: newEvent.id,
            participantId: c.participantId,
            weight: c.weight,
          }))
        )

        await updateEventStats.mutateAsync({
          id: newEvent.id,
          stats: {
            totalParticipants: importStats?.uniqueParticipants || 0,
            totalCoupons: importStats?.totalCoupons || 0,
          },
        })
      }

      // Update status if ready
      if (status === 'ready') {
        await updateEvent.mutateAsync({
          id: newEvent.id,
          data: { status: 'ready' },
        })
      }
    }
  }

  // Loading state
  if (isEditing && (isLoadingEvent || isLoadingPrizes || isLoadingParticipantCount || isLoadingCouponCount)) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="mb-8 h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    )
  }

  // Get available custom fields from import stats
  const availableCustomFields = wizard.importStats?.customFields || []

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Full-screen save loading overlay */}
      {isSaving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-3 rounded-lg bg-white p-6 shadow-lg">
            <Spinner size="lg" />
            <p className="text-sm font-medium">Menyimpan data...</p>
          </div>
        </div>
      )}

      <main className="container py-8">
        {/* Back Button */}
        <Button variant="ghost" className="mb-4" asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Link>
        </Button>

        {/* Title */}
        <h1 className="mb-8 text-3xl font-bold">
          {isEditing ? 'Edit Event' : 'Create New Event'}
        </h1>

        {/* Stepper */}
        <div className="mb-8">
          <WizardStepper
            currentStep={wizard.currentStep}
            onStepClick={setWizardStep}
          />
        </div>

        {/* Step Content */}
        <div className="mx-auto max-w-3xl">
          {wizard.currentStep === 1 && (
            <StepEventInfo
              data={wizard.eventInfo}
              onUpdate={setEventInfo}
              onNext={nextStep}
            />
          )}

          {wizard.currentStep === 2 && (
            <StepPrizes
              prizes={wizard.prizes}
              onUpdate={setPrizes}
              onNext={nextStep}
              onPrev={prevStep}
            />
          )}

          {wizard.currentStep === 3 && (
            <StepParticipants
              eventId={eventId}
              importStats={wizard.importStats}
              hasExistingData={isEditing && hasExistingData}
              onImport={handleImport}
              onNext={nextStep}
              onPrev={prevStep}
            />
          )}

          {wizard.currentStep === 4 && (
            <StepDisplay
              data={wizard.displaySettings}
              availableCustomFields={availableCustomFields}
              onUpdate={setDisplaySettings}
              onNext={nextStep}
              onPrev={prevStep}
            />
          )}

          {wizard.currentStep === 5 && (
            <StepReview
              wizardState={wizard}
              isSaving={isSaving}
              onPrev={prevStep}
              onSaveDraft={handleSaveDraft}
              onSaveAndStart={handleSaveAndStart}
            />
          )}
        </div>
      </main>
    </div>
  )
}

export default EventWizard
