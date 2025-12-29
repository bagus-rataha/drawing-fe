/**
 * @file components/wizard/WizardStepper.tsx
 * @description Wizard step indicator component
 */

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import { WIZARD_STEP_LABELS } from '@/utils/constants'

interface WizardStepperProps {
  currentStep: number
  onStepClick?: (step: number) => void
}

/**
 * Wizard stepper showing progress through wizard steps
 */
export function WizardStepper({ currentStep, onStepClick }: WizardStepperProps) {
  return (
    // FIX (Rev 18): Responsive stepper with min-width for horizontal scroll on mobile
    <div className="flex items-center justify-center">
      <div className="flex items-center min-w-max">
        {WIZARD_STEP_LABELS.map((label, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep
          const isCompleted = stepNumber < currentStep
          const isClickable = onStepClick && stepNumber <= currentStep

          return (
            <div key={label} className="flex items-center">
              {/* Step Circle - smaller on mobile */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick(stepNumber)}
                disabled={!isClickable}
                className={cn(
                  'flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs sm:text-sm font-medium transition-colors',
                  isCompleted && 'bg-success text-white',
                  isActive && 'bg-primary text-white',
                  !isActive && !isCompleted && 'bg-border-custom text-content-muted',
                  isClickable && 'cursor-pointer hover:opacity-80'
                )}
              >
                {isCompleted ? (
                  <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                ) : (
                  stepNumber
                )}
              </button>

              {/* Step Label (visible on larger screens) */}
              <span
                className={cn(
                  'ml-2 hidden text-sm lg:inline',
                  isCompleted && 'text-success',
                  isActive && 'font-semibold text-primary',
                  !isActive && !isCompleted && 'text-content-muted'
                )}
              >
                {label}
              </span>

              {/* Connector Line - shorter on mobile */}
              {index < WIZARD_STEP_LABELS.length - 1 && (
                <div
                  className={cn(
                    'mx-2 sm:mx-4 h-0.5 w-6 sm:w-12',
                    stepNumber < currentStep ? 'bg-success' : 'bg-border-custom'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default WizardStepper
