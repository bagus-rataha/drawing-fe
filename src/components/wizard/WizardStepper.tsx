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
    <div className="flex items-center justify-center">
      <div className="flex items-center">
        {WIZARD_STEP_LABELS.map((label, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep
          const isCompleted = stepNumber < currentStep
          const isClickable = onStepClick && stepNumber <= currentStep

          return (
            <div key={label} className="flex items-center">
              {/* Step Circle */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick(stepNumber)}
                disabled={!isClickable}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                  isCompleted &&
                    'border-primary bg-primary text-primary-foreground',
                  isActive &&
                    'border-primary bg-background text-primary',
                  !isActive &&
                    !isCompleted &&
                    'border-muted-foreground/30 bg-background text-muted-foreground',
                  isClickable && 'cursor-pointer hover:bg-primary/10'
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  stepNumber
                )}
              </button>

              {/* Step Label (visible on larger screens) */}
              <span
                className={cn(
                  'ml-2 hidden text-sm font-medium md:inline',
                  isActive && 'text-primary',
                  !isActive && 'text-muted-foreground'
                )}
              >
                {label}
              </span>

              {/* Connector Line */}
              {index < WIZARD_STEP_LABELS.length - 1 && (
                <div
                  className={cn(
                    'mx-4 h-0.5 w-8 md:w-12',
                    stepNumber < currentStep
                      ? 'bg-primary'
                      : 'bg-muted-foreground/30'
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
