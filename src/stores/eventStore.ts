/**
 * @file stores/eventStore.ts
 * @description Zustand store for wizard state management (create-only)
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  EventInfoFormData,
  PrizeFormData,
  DisplaySettingsFormData,
} from '@/types'
import {
  DEFAULT_EVENT_INFO,
  DEFAULT_DISPLAY_SETTINGS,
  WIZARD_TOTAL_STEPS,
} from '@/utils/constants'

/**
 * Wizard form state
 */
export interface WizardState {
  currentStep: number
  eventInfo: EventInfoFormData
  prizes: PrizeFormData[]
  displaySettings: DisplaySettingsFormData
}

/**
 * Event store state interface
 */
interface EventStoreState {
  // Wizard state
  wizard: WizardState

  // Actions - Wizard Navigation
  setWizardStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  resetWizard: () => void

  // Actions - Wizard Data
  setEventInfo: (data: EventInfoFormData) => void
  setPrizes: (prizes: PrizeFormData[]) => void
  setDisplaySettings: (settings: DisplaySettingsFormData) => void
}

/**
 * Initial wizard state
 */
const initialWizardState: WizardState = {
  currentStep: 1,
  eventInfo: DEFAULT_EVENT_INFO,
  prizes: [],
  displaySettings: DEFAULT_DISPLAY_SETTINGS,
}

/**
 * Event store for managing wizard state
 */
export const useEventStore = create<EventStoreState>()(
  devtools(
    (set) => ({
      // Initial state
      wizard: initialWizardState,

      // Wizard navigation actions
      setWizardStep: (step) =>
        set((state) => ({
          wizard: { ...state.wizard, currentStep: step },
        })),

      nextStep: () =>
        set((state) => ({
          wizard: {
            ...state.wizard,
            currentStep: Math.min(state.wizard.currentStep + 1, WIZARD_TOTAL_STEPS),
          },
        })),

      prevStep: () =>
        set((state) => ({
          wizard: {
            ...state.wizard,
            currentStep: Math.max(state.wizard.currentStep - 1, 1),
          },
        })),

      resetWizard: () =>
        set({ wizard: initialWizardState }),

      // Wizard data actions
      setEventInfo: (data) =>
        set((state) => ({
          wizard: { ...state.wizard, eventInfo: data },
        })),

      setPrizes: (prizes) =>
        set((state) => ({
          wizard: { ...state.wizard, prizes },
        })),

      setDisplaySettings: (settings) =>
        set((state) => ({
          wizard: { ...state.wizard, displaySettings: settings },
        })),
    }),
    { name: 'event-store' }
  )
)

export default useEventStore
