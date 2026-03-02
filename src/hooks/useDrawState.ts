/**
 * @file hooks/useDrawState.ts
 * @description Simplified state machine for draw screen
 *
 * States: idle → spinning → drawing → revealing → reviewing → idle
 * No isTransitioning flag - state transitions are controlled by explicit actions
 */

import { useReducer, useCallback, useMemo } from 'react'
import { drawService } from '@/services'
import type { DrawResult, Prize } from '@/types'

/**
 * Draw state machine states
 */
export type DrawState =
  | 'idle'       // Ready to start
  | 'spinning'   // Sphere is spinning, waiting for Stop
  | 'drawing'    // Calling draw service
  | 'revealing'  // Animating winner cards
  | 'reviewing'  // User reviewing winners

/**
 * Extended DrawResult with id for tracking
 */
export interface DrawResultWithId extends DrawResult {
  id: string
}

/**
 * Internal state structure
 */
interface DrawStateType {
  status: DrawState
  currentPrizeIndex: number
  currentBatchIndex: number
  winners: DrawResultWithId[]
  currentPage: number
  // FIX (Rev 20): Track which positions are newly redrawn for partial animation
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
  | { type: 'NEXT_BATCH' }
  | { type: 'NEXT_PRIZE' }
  | { type: 'SET_PAGE'; page: number }
  | { type: 'SET_WINNERS'; winners: DrawResultWithId[] }
  | { type: 'RESET' }
  | { type: 'INIT'; prizeIndex: number; batchIndex: number }
  // FIX (Rev 19): New action for redraw with animation
  // FIX (Rev 20): Include redrawPositions for partial animation
  | { type: 'REDRAW_COMPLETE'; winners: DrawResultWithId[]; redrawPositions: number[] }

const initialState: DrawStateType = {
  status: 'idle',
  currentPrizeIndex: 0,
  currentBatchIndex: 0,
  winners: [],
  currentPage: 0,
  redrawPositions: [],
}

/**
 * Reducer function with guard conditions
 */
function drawReducer(state: DrawStateType, action: DrawAction): DrawStateType {
  console.log('[DrawReducer]', action.type, 'current:', state.status)

  switch (action.type) {
    case 'START_SPIN':
      // Guard: only allow from idle
      if (state.status !== 'idle') {
        console.warn('[DrawReducer] START_SPIN blocked, status:', state.status)
        return state
      }
      return { ...state, status: 'spinning' }

    case 'STOP_SPIN':
      // Guard: only allow from spinning
      if (state.status !== 'spinning') {
        console.warn('[DrawReducer] STOP_SPIN blocked, status:', state.status)
        return state
      }
      return { ...state, status: 'drawing' }

    case 'DRAW_COMPLETE':
      // Guard: only allow from drawing
      if (state.status !== 'drawing') {
        console.warn('[DrawReducer] DRAW_COMPLETE blocked, status:', state.status)
        return state
      }
      return {
        ...state,
        status: 'revealing',
        winners: action.winners,
        redrawPositions: [], // FIX (Rev 20): Clear - this is a fresh draw, not a redraw
      }

    case 'REVEAL_COMPLETE':
      // Guard: only allow from revealing
      if (state.status !== 'revealing') {
        console.warn('[DrawReducer] REVEAL_COMPLETE blocked, status:', state.status)
        return state
      }
      return { ...state, status: 'reviewing' }

    case 'CANCEL_WINNER':
      return {
        ...state,
        winners: state.winners.map((w) =>
          w.id === action.winnerId ? { ...w, status: 'cancelled' as const } : w
        ),
      }

    case 'NEXT_BATCH':
      // Guard: only allow from reviewing
      if (state.status !== 'reviewing') {
        console.warn('[DrawReducer] NEXT_BATCH blocked, status:', state.status)
        return state
      }
      return {
        ...state,
        status: 'idle',
        currentBatchIndex: state.currentBatchIndex + 1,
        winners: [],
        currentPage: 0,
      }

    case 'NEXT_PRIZE':
      return {
        ...state,
        status: 'idle',
        currentPrizeIndex: state.currentPrizeIndex + 1,
        currentBatchIndex: 0,
        winners: [],
        currentPage: 0,
      }

    case 'SET_PAGE':
      return { ...state, currentPage: action.page }

    case 'SET_WINNERS':
      return { ...state, winners: action.winners }

    // FIX (Rev 19): Redraw triggers revealing animation
    // FIX (Rev 20): Store redrawPositions for partial animation
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

    case 'INIT':
      // Initialize state from loaded progress (e.g., when resuming a draw)
      console.log('[DrawReducer] INIT:', action.prizeIndex, action.batchIndex)
      return {
        ...initialState,
        currentPrizeIndex: action.prizeIndex,
        currentBatchIndex: action.batchIndex,
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
  currentPrizeIndex: number
  currentBatchIndex: number
  winners: DrawResultWithId[]
  currentPage: number
  // FIX (Rev 20): Track which line numbers were just redrawn
  redrawPositions: number[]

  // Computed
  isSpinning: boolean
  isIdle: boolean
  hasCancelled: boolean
  validCount: number

  // Actions
  init: (prizeIndex: number, batchIndex: number) => void
  start: () => void
  stop: (eventId: string, prizeId: string, quantity: number) => Promise<void>
  revealComplete: () => void
  cancel: (winnerId: string) => Promise<void>
  // FIX (Rev 19): Returns true if redraw happened (for triggering confetti)
  redrawAll: (prizeId: string) => Promise<boolean>
  confirm: (prizeId: string) => Promise<void>
  nextBatch: () => void
  nextPrize: () => void
  setCurrentPage: (page: number) => void
  reset: () => void

  // Helpers for draw mode
  calculateTotalDraws: (prize: Prize) => number
  getDrawQuantity: (prize: Prize) => number
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

  /**
   * Calculate TOTAL number of draws for a prize based on draw mode
   * IMPORTANT: Uses prize.quantity (not remaining) so the display stays consistent
   * e.g., "3/100" should always show 100, not decrease as draws are confirmed
   */
  const calculateTotalDraws = useCallback((prize: Prize): number => {
    // Use total quantity for consistent display (e.g., "3/100" not "3/97")
    const totalQuantity = prize.quantity

    switch (prize.drawConfig.mode) {
      case 'one-by-one':
        // One draw per winner = quantity draws total
        return totalQuantity
      case 'batch': {
        // Count how many batches needed to cover all winners
        const batches = prize.drawConfig.batches || []
        let total = 0
        let accumulated = 0
        for (const batchSize of batches) {
          if (accumulated < totalQuantity) {
            total++
            accumulated += batchSize
          }
        }
        return Math.max(1, total)
      }
      case 'all-at-once':
        return 1
      default:
        return 1
    }
  }, [])

  /**
   * Calculate how many winners to draw this round
   */
  const getDrawQuantity = useMemo(() => {
    return (prize: Prize): number => {
      const remaining = prize.quantity - prize.drawnCount
      if (remaining <= 0) return 0

      switch (prize.drawConfig.mode) {
        case 'one-by-one':
          return 1
        case 'batch': {
          const batches = prize.drawConfig.batches || []
          if (state.currentBatchIndex < batches.length) {
            return Math.min(batches[state.currentBatchIndex], remaining)
          }
          return remaining
        }
        case 'all-at-once':
          return remaining
        default:
          return remaining
      }
    }
  }, [state.currentBatchIndex])

  // Initialize state from loaded progress
  const init = useCallback((prizeIndex: number, batchIndex: number) => {
    console.log('[useDrawState] init called:', prizeIndex, batchIndex)
    dispatch({ type: 'INIT', prizeIndex, batchIndex })
  }, [])

  // Start spinning
  const start = useCallback(() => {
    console.log('[useDrawState] start called, status:', state.status)
    dispatch({ type: 'START_SPIN' })
  }, [state.status])

  // Stop and draw
  const stop = useCallback(
    async (eventId: string, prizeId: string, quantity: number) => {
      console.log('[useDrawState] stop called, status:', state.status)
      if (state.status !== 'spinning') {
        console.warn('[useDrawState] stop blocked, not spinning')
        return
      }

      dispatch({ type: 'STOP_SPIN' })

      try {
        console.log('[useDrawState] calling drawService.draw, qty:', quantity)
        const results = await drawService.draw(
          eventId,
          prizeId,
          quantity,
          state.currentBatchIndex + 1
        )

        // Add id to each result for tracking
        const resultsWithId: DrawResultWithId[] = results.map((r, i) => ({
          ...r,
          id: `${prizeId}-${state.currentBatchIndex + 1}-${i}`,
        }))

        console.log('[useDrawState] draw complete, results:', resultsWithId.length)
        dispatch({ type: 'DRAW_COMPLETE', winners: resultsWithId })

        // Note: REVEAL_COMPLETE will be called by WinnerGallery via onRevealComplete
      } catch (error) {
        console.error('[useDrawState] Draw failed:', error)
        // Reset to idle on error
        dispatch({ type: 'RESET' })
      }
    },
    [state.status, state.currentBatchIndex]
  )

  // Called when reveal animation completes
  // NOTE: Empty dependency array - this callback must be stable to prevent
  // the reveal animation useEffect from re-running unexpectedly
  const revealComplete = useCallback(() => {
    console.log('[useDrawState] revealComplete called')
    dispatch({ type: 'REVEAL_COMPLETE' })
  }, [])

  // Cancel a winner
  const cancel = useCallback(async (winnerId: string) => {
    try {
      await drawService.cancel(winnerId)
      dispatch({ type: 'CANCEL_WINNER', winnerId })
    } catch (error) {
      console.error('[useDrawState] Cancel failed:', error)
    }
  }, [])

  // Redraw all cancelled
  // FIX (Rev 14): Add timestamp to redraw ID to ensure uniqueness across multiple redraws
  // FIX (Rev 18): Sort winners by lineNumber to maintain original position order
  // FIX (Rev 19): Use REDRAW_COMPLETE to trigger reveal animation, return true if redrawn
  // FIX (Rev 20): Track redrawPositions for partial animation
  const redrawAll = useCallback(
    async (prizeId: string): Promise<boolean> => {
      try {
        const newResults = await drawService.redrawAll(prizeId, state.currentBatchIndex + 1)

        // If no new results, nothing to redraw
        if (newResults.length === 0) {
          return false
        }

        // FIX (Rev 20): Capture the line numbers being redrawn
        const redrawPositions = newResults.map((r) => r.lineNumber)

        // Use timestamp to ensure unique IDs even after multiple redraws
        const timestamp = Date.now()
        const newResultsWithId: DrawResultWithId[] = newResults.map((r, i) => ({
          ...r,
          id: `${prizeId}-${state.currentBatchIndex + 1}-redraw-${timestamp}-${i}`,
        }))
        // FIX (Rev 21): Filter by lineNumber instead of status to prevent duplicates
        // This removes ALL winners at redrawn positions (regardless of their status)
        // Then adds new winners at those exact positions - no duplicates possible
        const winnersToKeep = state.winners.filter(
          (w) => !redrawPositions.includes(w.lineNumber)
        )
        const allWinners = [...winnersToKeep, ...newResultsWithId]
        const sortedWinners = allWinners.sort((a, b) => a.lineNumber - b.lineNumber)

        // FIX (Rev 19): Use REDRAW_COMPLETE to trigger reveal animation
        // FIX (Rev 20): Include redrawPositions for partial animation
        dispatch({ type: 'REDRAW_COMPLETE', winners: sortedWinners, redrawPositions })
        return true
      } catch (error) {
        console.error('[useDrawState] Redraw failed:', error)
        return false
      }
    },
    [state.currentBatchIndex, state.winners]
  )

  // Confirm winners
  // FIX (Rev 17): Pass batchNumber to confirm to filter by current batch only
  // Throws if confirm fails so caller can handle it
  const confirm = useCallback(
    async (prizeId: string) => {
      const batchNumber = state.currentBatchIndex + 1
      console.log('[useDrawState] confirm called, batchNumber:', batchNumber)
      try {
        await drawService.confirm(prizeId, batchNumber)
        console.log('[useDrawState] confirm succeeded')
      } catch (error) {
        console.error('[useDrawState] Confirm failed:', error)
        throw error // Re-throw so caller knows it failed
      }
    },
    [state.currentBatchIndex]
  )

  // Move to next batch
  const nextBatch = useCallback(() => {
    console.log('[useDrawState] nextBatch called')
    dispatch({ type: 'NEXT_BATCH' })
  }, [])

  // Move to next prize
  const nextPrize = useCallback(() => {
    console.log('[useDrawState] nextPrize called')
    dispatch({ type: 'NEXT_PRIZE' })
  }, [])

  // Set current page
  const setCurrentPage = useCallback((page: number) => {
    dispatch({ type: 'SET_PAGE', page })
  }, [])

  // Reset state
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  return {
    state: state.status,
    currentPrizeIndex: state.currentPrizeIndex,
    currentBatchIndex: state.currentBatchIndex,
    winners: state.winners,
    currentPage: state.currentPage,
    redrawPositions: state.redrawPositions,
    isSpinning,
    isIdle,
    hasCancelled,
    validCount,
    init,
    start,
    stop,
    revealComplete,
    cancel,
    redrawAll,
    confirm,
    nextBatch,
    nextPrize,
    setCurrentPage,
    reset,
    calculateTotalDraws,
    getDrawQuantity,
  }
}

export default useDrawState
