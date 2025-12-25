/**
 * @file stores/eventStore.ts
 * @description Zustand store for event and wizard state management
 *
 * Handles:
 * - Current event being viewed/edited
 * - Wizard step navigation
 * - Wizard form data across all steps
 * - Import statistics
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  Event,
  WizardState,
  EventInfoFormData,
  PrizeFormData,
  DisplaySettingsFormData,
  ImportStats,
} from '@/types'
import {
  DEFAULT_EVENT_INFO,
  DEFAULT_DISPLAY_SETTINGS,
  WIZARD_TOTAL_STEPS,
} from '@/utils/constants'

/**
 * Pending deletes for atomic edit mode
 * Deletes are queued and only executed on save
 */
interface PendingDeletes {
  participantIds: string[]
  couponIds: string[]
}

/**
 * Event store state interface
 */
interface EventStoreState {
  // Current event being viewed/edited
  currentEvent: Event | null

  // Wizard state
  wizard: WizardState

  // Pending deletes for atomic edit (only execute on save)
  pendingDeletes: PendingDeletes

  // Flag to track if wizard is fully initialized (for edit mode)
  isWizardInitialized: boolean

  // Actions - Event
  setCurrentEvent: (event: Event | null) => void
  clearCurrentEvent: () => void

  // Actions - Wizard Navigation
  setWizardStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  resetWizard: () => void

  // Actions - Wizard Data
  setEventInfo: (data: EventInfoFormData) => void
  setPrizes: (prizes: PrizeFormData[]) => void
  addPrize: (prize: PrizeFormData) => void
  updatePrize: (id: string, data: Partial<PrizeFormData>) => void
  removePrize: (id: string) => void
  reorderPrizes: (prizeIds: string[]) => void
  setDisplaySettings: (settings: DisplaySettingsFormData) => void
  setImportStats: (stats: ImportStats | null) => void

  // Actions - Pending deletes (atomic edit)
  markParticipantForDelete: (participantId: string) => void
  markCouponForDelete: (couponId: string) => void
  unmarkParticipantForDelete: (participantId: string) => void
  unmarkCouponForDelete: (couponId: string) => void
  clearPendingDeletes: () => void
  getPendingDeleteCounts: () => { participants: number; coupons: number }

  // Actions - Initialize wizard for editing
  initWizardForEdit: (event: Event, prizes: PrizeFormData[]) => void
}

/**
 * Initial wizard state
 */
const initialWizardState: WizardState = {
  currentStep: 1,
  eventInfo: DEFAULT_EVENT_INFO,
  prizes: [],
  displaySettings: DEFAULT_DISPLAY_SETTINGS,
  importStats: null,
}

/**
 * Initial pending deletes state
 */
const initialPendingDeletes: PendingDeletes = {
  participantIds: [],
  couponIds: [],
}

/**
 * Event store for managing event and wizard state
 */
export const useEventStore = create<EventStoreState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentEvent: null,
      wizard: initialWizardState,
      pendingDeletes: initialPendingDeletes,
      isWizardInitialized: false,

      // Event actions
      setCurrentEvent: (event) => set({ currentEvent: event }),
      clearCurrentEvent: () => set({ currentEvent: null }),

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
        set({
          wizard: initialWizardState,
          currentEvent: null,
          pendingDeletes: initialPendingDeletes,
          isWizardInitialized: false,
        }),

      // Wizard data actions
      setEventInfo: (data) =>
        set((state) => ({
          wizard: { ...state.wizard, eventInfo: data },
        })),

      setPrizes: (prizes) =>
        set((state) => ({
          wizard: { ...state.wizard, prizes },
        })),

      addPrize: (prize) =>
        set((state) => ({
          wizard: {
            ...state.wizard,
            prizes: [...state.wizard.prizes, prize],
          },
        })),

      updatePrize: (id, data) =>
        set((state) => ({
          wizard: {
            ...state.wizard,
            prizes: state.wizard.prizes.map((p) =>
              p.id === id ? { ...p, ...data } : p
            ),
          },
        })),

      removePrize: (id) =>
        set((state) => ({
          wizard: {
            ...state.wizard,
            prizes: state.wizard.prizes.filter((p) => p.id !== id),
          },
        })),

      reorderPrizes: (prizeIds) =>
        set((state) => {
          const prizeMap = new Map(state.wizard.prizes.map((p) => [p.id, p]))
          const reordered = prizeIds
            .map((id) => prizeMap.get(id))
            .filter((p): p is PrizeFormData => p !== undefined)

          return {
            wizard: { ...state.wizard, prizes: reordered },
          }
        }),

      setDisplaySettings: (settings) =>
        set((state) => ({
          wizard: { ...state.wizard, displaySettings: settings },
        })),

      setImportStats: (stats) =>
        set((state) => ({
          wizard: { ...state.wizard, importStats: stats },
        })),

      // Pending delete actions (atomic edit)
      markParticipantForDelete: (participantId) =>
        set((state) => ({
          pendingDeletes: {
            ...state.pendingDeletes,
            participantIds: state.pendingDeletes.participantIds.includes(participantId)
              ? state.pendingDeletes.participantIds
              : [...state.pendingDeletes.participantIds, participantId],
          },
        })),

      markCouponForDelete: (couponId) =>
        set((state) => ({
          pendingDeletes: {
            ...state.pendingDeletes,
            couponIds: state.pendingDeletes.couponIds.includes(couponId)
              ? state.pendingDeletes.couponIds
              : [...state.pendingDeletes.couponIds, couponId],
          },
        })),

      unmarkParticipantForDelete: (participantId) =>
        set((state) => ({
          pendingDeletes: {
            ...state.pendingDeletes,
            participantIds: state.pendingDeletes.participantIds.filter(
              (id) => id !== participantId
            ),
          },
        })),

      unmarkCouponForDelete: (couponId) =>
        set((state) => ({
          pendingDeletes: {
            ...state.pendingDeletes,
            couponIds: state.pendingDeletes.couponIds.filter((id) => id !== couponId),
          },
        })),

      clearPendingDeletes: () =>
        set({ pendingDeletes: initialPendingDeletes }),

      getPendingDeleteCounts: () => {
        const { pendingDeletes } = get()
        return {
          participants: pendingDeletes.participantIds.length,
          coupons: pendingDeletes.couponIds.length,
        }
      },

      // Initialize wizard for editing existing event
      initWizardForEdit: (event, prizes) => {
        const { wizard } = get()

        set({
          currentEvent: event,
          pendingDeletes: initialPendingDeletes, // Clear pending deletes on init
          isWizardInitialized: true, // Mark as initialized after all data is set
          wizard: {
            ...wizard,
            currentStep: 1,
            eventInfo: {
              name: event.name,
              description: event.description || '',
              startDate: event.startDate || null,
              endDate: event.endDate || null,
              winRuleType: event.winRule.type,
              maxWins: event.winRule.maxWins || 1,
            },
            prizes: prizes,
            displaySettings: {
              backgroundImage: event.displaySettings.backgroundImage,
              animationType: event.displaySettings.animationType,
              winnerDisplayMode: event.displaySettings.winnerDisplayMode,
              customFieldsToShow: event.displaySettings.customFieldsToShow,
            },
            importStats: event.totalParticipants > 0
              ? {
                  totalRows: event.totalCoupons,
                  validRows: event.totalCoupons,
                  invalidRows: 0,
                  uniqueParticipants: event.totalParticipants,
                  totalCoupons: event.totalCoupons,
                  customFields: event.displaySettings.customFieldsToShow,
                  errors: [],
                }
              : null,
          },
        })
      },
    }),
    { name: 'event-store' }
  )
)

export default useEventStore
