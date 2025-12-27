/**
 * @file hooks/useDrawState.ts
 * @description State management hook for the draw screen
 */

import { useState, useCallback } from 'react'
import { drawService } from '@/services'
import type { DrawResult } from '@/types'

/**
 * Draw state machine states
 */
export type DrawState =
  | 'idle' // Ready to start
  | 'spinning' // Sphere is spinning
  | 'stopping' // Slowing down, calling service
  | 'animating' // Cards exiting sphere
  | 'reviewing' // User reviewing winners
  | 'redrawing' // Redrawing cancelled winners

/**
 * Extended DrawResult with id for tracking
 */
export interface DrawResultWithId extends DrawResult {
  id: string
}

/**
 * Draw state context
 */
export interface UseDrawStateReturn {
  // State
  state: DrawState
  currentPrizeIndex: number
  currentBatch: number
  winners: DrawResultWithId[]
  currentPage: number

  // Computed
  isSpinning: boolean
  isReviewing: boolean
  hasCancelled: boolean
  validCount: number

  // Actions
  start: () => void
  stop: (eventId: string, prizeId: string, quantity: number) => Promise<void>
  cancel: (winnerId: string) => Promise<void>
  redrawAll: (prizeId: string) => Promise<void>
  confirm: (prizeId: string) => Promise<void>
  nextBatch: () => void
  nextPrize: () => void
  setCurrentPage: (page: number) => void
  reset: () => void
  setState: (state: DrawState) => void
}

/**
 * Hook for managing draw screen state
 */
export function useDrawState(): UseDrawStateReturn {
  const [state, setState] = useState<DrawState>('idle')
  const [currentPrizeIndex, setCurrentPrizeIndex] = useState(0)
  const [currentBatch, setCurrentBatch] = useState(1)
  const [winners, setWinners] = useState<DrawResultWithId[]>([])
  const [currentPage, setCurrentPage] = useState(0)

  // Computed values
  const isSpinning = state === 'spinning' || state === 'stopping'
  const isReviewing = state === 'reviewing'
  const hasCancelled = winners.some((w) => w.status === 'cancelled')
  const validCount = winners.filter((w) => w.status === 'valid').length

  // Start spinning
  const start = useCallback(() => {
    setState('spinning')
  }, [])

  // Stop and draw
  const stop = useCallback(
    async (eventId: string, prizeId: string, quantity: number) => {
      setState('stopping')

      try {
        const results = await drawService.draw(
          eventId,
          prizeId,
          quantity,
          currentBatch
        )
        // Add id to each result for tracking
        const resultsWithId: DrawResultWithId[] = results.map((r, i) => ({
          ...r,
          id: `${prizeId}-${currentBatch}-${i}`,
        }))
        setWinners(resultsWithId)
        setState('animating')

        // After animation delay, set to reviewing
        setTimeout(() => {
          setState('reviewing')
        }, 3000) // 3 seconds for animation
      } catch (error) {
        console.error('Draw failed:', error)
        setState('idle')
      }
    },
    [currentBatch]
  )

  // Cancel a winner
  const cancel = useCallback(async (winnerId: string) => {
    try {
      await drawService.cancel(winnerId)
      setWinners((prev) =>
        prev.map((w) =>
          w.id === winnerId ? { ...w, status: 'cancelled' as const } : w
        )
      )
    } catch (error) {
      console.error('Cancel failed:', error)
    }
  }, [])

  // Redraw all cancelled
  const redrawAll = useCallback(
    async (prizeId: string) => {
      setState('redrawing')

      try {
        const newResults = await drawService.redrawAll(prizeId, currentBatch)
        // Add id to each result for tracking
        const newResultsWithId: DrawResultWithId[] = newResults.map((r, i) => ({
          ...r,
          id: `${prizeId}-${currentBatch}-redraw-${i}`,
        }))
        setWinners((prev) => [...prev, ...newResultsWithId])
        setState('reviewing')
      } catch (error) {
        console.error('Redraw failed:', error)
        setState('reviewing')
      }
    },
    [currentBatch]
  )

  // Confirm winners
  const confirm = useCallback(async (prizeId: string) => {
    try {
      await drawService.confirm(prizeId)
    } catch (error) {
      console.error('Confirm failed:', error)
    }
  }, [])

  // Move to next batch
  const nextBatch = useCallback(() => {
    setCurrentBatch((prev) => prev + 1)
    setWinners([])
    setCurrentPage(0)
    setState('idle')
  }, [])

  // Move to next prize
  const nextPrize = useCallback(() => {
    setCurrentPrizeIndex((prev) => prev + 1)
    setCurrentBatch(1)
    setWinners([])
    setCurrentPage(0)
    setState('idle')
  }, [])

  // Reset state
  const reset = useCallback(() => {
    setState('idle')
    setCurrentPrizeIndex(0)
    setCurrentBatch(1)
    setWinners([])
    setCurrentPage(0)
  }, [])

  return {
    state,
    currentPrizeIndex,
    currentBatch,
    winners,
    currentPage,
    isSpinning,
    isReviewing,
    hasCancelled,
    validCount,
    start,
    stop,
    cancel,
    redrawAll,
    confirm,
    nextBatch,
    nextPrize,
    setCurrentPage,
    reset,
    setState,
  }
}

export default useDrawState
