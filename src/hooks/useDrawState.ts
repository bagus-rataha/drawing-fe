/**
 * @file hooks/useDrawState.ts
 * @description Simplified state machine for draw screen
 *
 * States: idle → spinning → drawing → revealing → reviewing → idle
 *
 * All draw logic is on the backend. This hook manages UI state transitions
 * and calls the draw service (which wraps backend API).
 */

import { useReducer, useCallback } from 'react'
import { drawService } from '@/services'
import type { DrawResult } from '@/types'

/**
 * Draw state machine states
 */
export type DrawState =
  | 'idle'       // Ready to start
  | 'spinning'   // Animation playing, waiting for Stop
  | 'drawing'    // Calling draw API
  | 'revealing'  // Animating winner cards
  | 'reviewing'  // User reviewing winners

/**
 * Extended DrawResult with id for tracking
 */
export interface DrawResultWithId extends DrawResult {
  id: string
  couponIdentifier?: string
}

/**
 * Internal state structure
 */
interface DrawStateType {
  status: DrawState
  winners: DrawResultWithId[]
  currentPage: number
  redrawPositions: number[]
}

/**
 * Reducer action types
 */
type DrawAction =
  | { type: 'START_SPIN' }
  | { type: 'STOP_SPIN' }
  | { type: 'DRAW_COMPLETE'; winners: DrawResultWithId[] }
  | { type: 'REVEAL_COMPLETE' }
  | { type: 'CANCEL_WINNER'; winnerId: string }
  | { type: 'SET_PAGE'; page: number }
  | { type: 'SET_WINNERS'; winners: DrawResultWithId[] }
  | { type: 'RESET' }
  | { type: 'RESET_TO_IDLE' }
  | { type: 'RESTORE_WINNERS'; winners: DrawResultWithId[] }
  | { type: 'REDRAW_COMPLETE'; winners: DrawResultWithId[]; redrawPositions: number[] }

const initialState: DrawStateType = {
  status: 'idle',
  winners: [],
  currentPage: 0,
  redrawPositions: [],
}

/**
 * Reducer function with guard conditions
 */
function drawReducer(state: DrawStateType, action: DrawAction): DrawStateType {
  switch (action.type) {
    case 'START_SPIN':
      if (state.status !== 'idle' && state.status !== 'reviewing') return state
      return { ...state, status: 'spinning' }

    case 'STOP_SPIN':
      if (state.status !== 'spinning') return state
      return { ...state, status: 'drawing' }

    case 'DRAW_COMPLETE':
      if (state.status !== 'drawing') return state
      return {
        ...state,
        status: 'revealing',
        winners: action.winners,
        redrawPositions: [],
      }

    case 'REVEAL_COMPLETE':
      if (state.status !== 'revealing') return state
      return { ...state, status: 'reviewing' }

    case 'CANCEL_WINNER':
      return {
        ...state,
        winners: state.winners.map((w) =>
          w.id === action.winnerId ? { ...w, status: 'cancelled' as const } : w
        ),
      }

    case 'SET_PAGE':
      return { ...state, currentPage: action.page }

    case 'SET_WINNERS':
      return { ...state, winners: action.winners }

    case 'REDRAW_COMPLETE':
      return {
        ...state,
        status: 'revealing',
        winners: action.winners,
        currentPage: 0,
        redrawPositions: action.redrawPositions,
      }

    case 'RESET':
      return { ...initialState }

    case 'RESET_TO_IDLE':
      return {
        ...initialState,
      }

    case 'RESTORE_WINNERS':
      // Restore from current-status on page load/refresh
      return {
        ...state,
        status: 'reviewing',
        winners: action.winners,
        redrawPositions: [],
      }

    default:
      return state
  }
}

/**
 * Draw state context
 */
export interface UseDrawStateReturn {
  // State
  state: DrawState
  winners: DrawResultWithId[]
  currentPage: number
  redrawPositions: number[]

  // Computed
  isSpinning: boolean
  isIdle: boolean
  hasCancelled: boolean
  validCount: number

  // Actions
  start: () => void
  stop: (eventId: string) => Promise<void>
  revealComplete: () => void
  cancel: (eventId: string, winnerId: string, reason: string) => Promise<void>
  confirm: (eventId: string) => Promise<void>
  resetToIdle: () => void
  reset: () => void
  setCurrentPage: (page: number) => void
  restoreWinners: (winners: DrawResultWithId[]) => void
}

/**
 * Hook for managing draw screen state
 */
export function useDrawState(): UseDrawStateReturn {
  const [state, dispatch] = useReducer(drawReducer, initialState)

  // Computed values
  const isSpinning = state.status === 'spinning'
  const isIdle = state.status === 'idle'
  const hasCancelled = state.winners.some((w) => w.status === 'cancelled')
  const validCount = state.winners.filter((w) => w.status === 'valid').length

  // Start spinning
  const start = useCallback(() => {
    dispatch({ type: 'START_SPIN' })
  }, [])

  // Stop and draw (handles both first draw and redraw)
  const stop = useCallback(
    async (eventId: string) => {
      if (state.status !== 'spinning') return

      dispatch({ type: 'STOP_SPIN' })

      try {
        const results = await drawService.draw(eventId)

        if (state.winners.length > 0) {
          // Redraw: detect changed positions for animation
          const changedPositions = results
            .filter((newW) => {
              const oldW = state.winners.find((w) => w.lineNumber === newW.lineNumber)
              return !oldW || oldW.id !== newW.id
            })
            .map((w) => w.lineNumber)
          dispatch({ type: 'REDRAW_COMPLETE', winners: results, redrawPositions: changedPositions })
        } else {
          dispatch({ type: 'DRAW_COMPLETE', winners: results })
        }
      } catch (error) {
        console.error('[useDrawState] Draw failed:', error)
        dispatch({ type: 'RESET' })
      }
    },
    [state.status, state.winners]
  )

  // Called when reveal animation completes
  const revealComplete = useCallback(() => {
    dispatch({ type: 'REVEAL_COMPLETE' })
  }, [])

  // Cancel a winner
  const cancel = useCallback(async (eventId: string, winnerId: string, reason: string) => {
    try {
      await drawService.cancel(eventId, winnerId, reason)
      dispatch({ type: 'CANCEL_WINNER', winnerId })
    } catch (error) {
      console.error('[useDrawState] Cancel failed:', error)
    }
  }, [])

  // Confirm winners
  const confirm = useCallback(async (eventId: string) => {
    await drawService.confirm(eventId)
  }, [])

  // Reset to idle (after confirm, for next batch/prize)
  const resetToIdle = useCallback(() => {
    dispatch({ type: 'RESET_TO_IDLE' })
  }, [])

  // Set current page
  const setCurrentPage = useCallback((page: number) => {
    dispatch({ type: 'SET_PAGE', page })
  }, [])

  // Reset state
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  // Restore winners from current-status (browser refresh recovery)
  const restoreWinners = useCallback((winners: DrawResultWithId[]) => {
    if (winners.length > 0) {
      dispatch({ type: 'RESTORE_WINNERS', winners })
    }
  }, [])

  return {
    state: state.status,
    winners: state.winners,
    currentPage: state.currentPage,
    redrawPositions: state.redrawPositions,
    isSpinning,
    isIdle,
    hasCancelled,
    validCount,
    start,
    stop,
    revealComplete,
    cancel,
    confirm,
    resetToIdle,
    reset,
    setCurrentPage,
    restoreWinners,
  }
}

export default useDrawState
