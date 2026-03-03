/**
 * @file pages/EventWizard.tsx
 * @description Event creation wizard page (4 steps: Info → Prizes → Display → Review)
 */

import { useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import {
  WizardStepper,
  StepEventInfo,
  StepPrizes,
  StepDisplay,
  StepReview,
} from '@/components/wizard'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft } from 'lucide-react'
import { useEventStore } from '@/stores'
import { useCreateEvent, useUnsavedChangesWarning } from '@/hooks'
import type { CreateEventRequest, PrizeRequest } from '@/types/api'

/**
 * Event Wizard page component (create-only)
 */
export function EventWizard() {
  const navigate = useNavigate()

  // Mutations
  const createEvent = useCreateEvent()

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
  } = useEventStore()

  // Detect unsaved changes for browser refresh warning
  const hasUnsavedChanges = useMemo(() => {
    const hasEventInfo = wizard.eventInfo.name.trim() !== ''
    const hasPrizes = wizard.prizes.length > 0
    return hasEventInfo || hasPrizes
  }, [wizard.eventInfo.name, wizard.prizes.length])

  // Warn user before leaving page with unsaved changes
  useUnsavedChangesWarning(hasUnsavedChanges)

  // Reset wizard on mount
  useEffect(() => {
    resetWizard()
  }, [resetWizard])

  // Handle create event submission
  const handleCreate = async () => {
    const { eventInfo, prizes } = wizard

    // Build prizes payload
    const prizeRequests: PrizeRequest[] = prizes.map((p, index) => ({
      name: p.name,
      quantity: p.quantity,
      sequence: index + 1,
      batch_number: eventInfo.drawMode === 'batch' ? p.batchNumber : 1,
    }))

    // Build request
    const request: CreateEventRequest = {
      name: eventInfo.name,
      description: eventInfo.description || undefined,
      start_date: eventInfo.startDate?.toISOString(),
      end_date: eventInfo.endDate?.toISOString(),
      win_rule: eventInfo.winRuleType as 'onetime' | 'limited' | 'unlimited',
      draw_mode: eventInfo.drawMode as 'one_by_one' | 'batch',
      animation_type: eventInfo.animationType as 'sphere' | 'rolling' | 'randomize',
      prizes: prizeRequests,
    }

    try {
      const newEvent = await createEvent.mutateAsync(request)
      navigate(`/events/${newEvent.id}`, { replace: true })
    } catch {
      // Error toast is handled by the hook
    }
  }

  return (
    <div className="min-h-screen bg-surface-alt">
      <Header />

      {/* Full-screen save loading overlay */}
      {createEvent.isPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-8 shadow-modal">
            <Spinner size="lg" />
            <p className="text-sm font-medium text-navy">Menyimpan data...</p>
          </div>
        </div>
      )}

      <main className="container py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb & Title */}
        <div className="mx-auto max-w-[832px]">
          <Button variant="ghost" className="mb-2 -ml-2 sm:-ml-4" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Back to Events</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>
          <h1 className="mb-4 sm:mb-6 text-2xl sm:text-3xl font-bold text-navy">
            Create New Event
          </h1>
        </div>

        {/* Stepper */}
        <div className="mb-6 sm:mb-8 overflow-x-auto">
          <WizardStepper
            currentStep={wizard.currentStep}
            onStepClick={setWizardStep}
          />
        </div>

        {/* Step Content */}
        <div className="mx-auto max-w-[832px] rounded-xl bg-white p-4 sm:p-6 lg:p-8 shadow-card">
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
              drawMode={wizard.eventInfo.drawMode}
              onUpdate={setPrizes}
              onNext={nextStep}
              onPrev={prevStep}
            />
          )}

          {wizard.currentStep === 3 && (
            <StepDisplay
              data={wizard.displaySettings}
              onUpdate={setDisplaySettings}
              onNext={nextStep}
              onPrev={prevStep}
            />
          )}

          {wizard.currentStep === 4 && (
            <StepReview
              wizard={wizard}
              isSaving={createEvent.isPending}
              onPrev={prevStep}
              onCreate={handleCreate}
            />
          )}
        </div>
      </main>
    </div>
  )
}

export default EventWizard
