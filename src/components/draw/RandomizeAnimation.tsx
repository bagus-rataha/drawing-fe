/**
 * @file components/draw/RandomizeAnimation.tsx
 * @description Box-based randomize animation for draw screen
 *
 * Shows rectangular boxes that shuffle through coupon names during spinning,
 * then display actual draw results when stopped.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnimationCouponResponse } from '@/types/api'
import type { DrawResultWithId } from '@/hooks/useDrawState'
import type { WinnerDisplayMode } from '@/types'

interface RandomizeAnimationProps {
  isSpinning: boolean
  isIdle: boolean
  slotCount: number
  coupons: AnimationCouponResponse[]
  winners: DrawResultWithId[]
  showResults: boolean
  displayMode: WinnerDisplayMode
  onCancel: (winnerId: string, reason?: string) => void
  state: string
}

interface CancelPopoverState {
  winnerId: string
  reason: string
}

/**
 * Single slot box component
 * Card container stays mounted across spinning → result transitions (no unmount/remount).
 * Only the content inside swaps instantly.
 */
function SlotBox({
  index,
  isSpinning,
  showResult,
  winner,
  coupons,
  displayMode,
  onCancel,
  state,
}: {
  index: number
  isSpinning: boolean
  showResult: boolean
  winner?: DrawResultWithId
  coupons: AnimationCouponResponse[]
  displayMode: WinnerDisplayMode
  onCancel: (winnerId: string, reason?: string) => void
  state: string
}) {
  const [currentCoupon, setCurrentCoupon] = useState<AnimationCouponResponse | null>(null)
  const [cancelPopover, setCancelPopover] = useState<CancelPopoverState | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Shuffle animation during spinning
  useEffect(() => {
    if (isSpinning && coupons.length > 0) {
      // Start with a random coupon
      setCurrentCoupon(coupons[Math.floor(Math.random() * coupons.length)])

      // Random interval 75-95ms per slot (all fast, no ascending/descending pattern)
      intervalRef.current = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * coupons.length)
        setCurrentCoupon(coupons[randomIndex])
      }, 75 + Math.floor(Math.random() * 20))

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isSpinning, coupons])

  const handleCancelConfirm = useCallback(() => {
    if (cancelPopover && winner?.id) {
      onCancel(winner.id, cancelPopover.reason || 'Dibatalkan oleh admin')
      setCancelPopover(null)
    }
  }, [cancelPopover, winner, onCancel])

  const isReviewing = state === 'reviewing'
  const isValid = winner?.status === 'valid'
  const isCancelled = winner?.status === 'cancelled'
  const isSkipped = winner?.status === 'skipped'

  // Idle state - empty placeholder
  if (!isSpinning && !showResult) {
    return (
      <div className="w-[220px] h-[100px] rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center">
        <span className="text-white/40 text-sm">Slot {index + 1}</span>
      </div>
    )
  }

  // During redraw: valid winners stay visible, only cancelled/empty slots spin
  const keepWinner = isSpinning && !showResult && winner && winner.status === 'valid'
  const shouldSpin = isSpinning && !showResult && !keepWinner
  const showWinnerContent = (showResult && !!winner) || !!keepWinner

  // Active state — same card container for both spinning and result
  // Card stays mounted, only content inside swaps instantly
  return (
    <div className="relative">
      <div
        className={cn(
          'w-[220px] h-[100px] rounded-xl shadow-lg border flex flex-col items-center justify-center px-3 relative overflow-hidden',
          'bg-white/95 backdrop-blur-sm border-white/50',
          showWinnerContent && isCancelled && 'bg-gray-100 border-gray-300 opacity-60',
          showWinnerContent && isSkipped && 'bg-amber-50 border-amber-300 opacity-60'
        )}
      >
        {shouldSpin ? (
          // Shuffling content
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentCoupon?.coupon_import_identifier || 'empty'}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.08 }}
              className="text-center"
            >
              <p className="text-sm font-bold text-[#0a2540] truncate w-full">
                {currentCoupon?.participant_name || '---'}
              </p>
              <p className="text-xs text-[#64748b] truncate w-full">
                {currentCoupon?.coupon_import_identifier || '---'}
              </p>
            </motion.div>
          </AnimatePresence>
        ) : showWinnerContent && winner ? (
          <>
            {/* Status badge */}
            {isCancelled && (
              <div className="absolute top-1 left-2">
                <span className="text-[10px] font-medium text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                  Cancelled
                </span>
              </div>
            )}
            {isSkipped && (
              <div className="absolute top-1 left-2">
                <span className="text-[10px] font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                  Skipped
                </span>
              </div>
            )}

            {/* Winner info */}
            <p className={cn(
              'text-sm font-bold truncate w-full text-center',
              isCancelled ? 'text-gray-400 line-through' : 'text-[#0a2540]'
            )}>
              {winner.participantName || '-'}
            </p>
            <p className="text-xs text-[#64748b] truncate w-full text-center">
              {winner.couponIdentifier || winner.couponId || '-'}
            </p>

            {/* Cancel button - only for valid winners in reviewing state */}
            {isValid && isReviewing && (
              <button
                onClick={() => setCancelPopover({ winnerId: winner.id, reason: '' })}
                className="absolute top-1 right-1 p-1 rounded-full hover:bg-red-100 transition-colors pointer-events-auto"
              >
                <X className="w-3.5 h-3.5 text-red-500" />
              </button>
            )}

            {/* Cancel reason display */}
            {isCancelled && winner.cancelReason && (
              <p className="text-[10px] text-gray-400 truncate w-full text-center mt-0.5">
                {winner.cancelReason.message}
              </p>
            )}
          </>
        ) : null}
      </div>

      {/* Cancel popover */}
      {cancelPopover && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-xl border border-[#e2e8f0] p-3 w-[250px]"
          >
            <p className="text-xs font-medium text-[#0a2540] mb-2">Cancel Reason</p>
            <input
              type="text"
              value={cancelPopover.reason}
              onChange={(e) => setCancelPopover({ ...cancelPopover, reason: e.target.value })}
              placeholder="Enter reason..."
              className="w-full px-2 py-1.5 text-sm border border-[#e2e8f0] rounded-md focus:outline-none focus:ring-1 focus:ring-red-400 mb-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCancelConfirm()
                if (e.key === 'Escape') setCancelPopover(null)
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setCancelPopover(null)}
                className="flex-1 px-2 py-1 text-xs text-[#64748b] hover:bg-[#f6f9fc] rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCancelConfirm}
                className="flex-1 px-2 py-1 text-xs text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export function RandomizeAnimation({
  isSpinning,
  isIdle,
  slotCount,
  coupons,
  winners,
  showResults,
  displayMode,
  onCancel,
  state,
}: RandomizeAnimationProps) {
  const effectiveSlotCount = showResults ? winners.length : slotCount

  if (effectiveSlotCount === 0 && isIdle) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white/60 text-lg">Press Start to begin drawing</p>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-full px-8">
      <div className="flex flex-wrap justify-center gap-4 max-w-[1200px]">
        {Array.from({ length: effectiveSlotCount }).map((_, index) => (
          <SlotBox
            key={`slot-${index}`}
            index={index}
            isSpinning={isSpinning}
            showResult={showResults}
            winner={winners[index]}
            coupons={coupons}
            displayMode={displayMode}
            onCancel={onCancel}
            state={state}
          />
        ))}
      </div>
    </div>
  )
}

export default RandomizeAnimation
