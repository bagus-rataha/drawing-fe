/**
 * @file components/draw/SlotBox.tsx
 * @description Single slot box for randomize animation — extracted from RandomizeAnimation.tsx
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnimationCouponResponse } from '@/types/api'
import type { DrawResultWithId } from '@/hooks/useDrawState'
import type { WinnerDisplayMode } from '@/types'

interface CancelPopoverState {
  winnerId: string
  reason: string
}

interface SlotBoxProps {
  index: number
  isSpinning: boolean
  showResult: boolean
  winner?: DrawResultWithId
  coupons: AnimationCouponResponse[]
  displayMode: WinnerDisplayMode
  onCancel: (winnerId: string, reason?: string) => void
  state: string
  idleCardStyle: 'placeholder' | 'blank'
}

export function SlotBox({
  index,
  isSpinning,
  showResult,
  winner,
  coupons,
  displayMode,
  onCancel,
  state,
  idleCardStyle,
}: SlotBoxProps) {
  const [currentCoupon, setCurrentCoupon] = useState<AnimationCouponResponse | null>(null)
  const [cancelPopover, setCancelPopover] = useState<CancelPopoverState | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isSpinning && coupons.length > 0) {
      setCurrentCoupon(coupons[Math.floor(Math.random() * coupons.length)])
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

  if (!isSpinning && !showResult) {
    return idleCardStyle === 'blank' ? (
      <div className="w-[220px] h-[100px] rounded-xl shadow-lg border flex items-center justify-center bg-white/95 backdrop-blur-sm border-white/50">
        <span className="text-gray-400 text-sm font-medium">Kolom {index + 1}</span>
      </div>
    ) : (
      <div className="w-[220px] h-[100px] rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center">
        <span className="text-white/40 text-sm">Kolom {index + 1}</span>
      </div>
    )
  }

  const keepWinner = isSpinning && !showResult && winner && winner.status === 'valid'
  const shouldSpin = isSpinning && !showResult && !keepWinner
  const showWinnerContent = (showResult && !!winner) || !!keepWinner

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
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentCoupon?.coupon_import_identifier || 'empty'}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.08 }}
              className="text-center"
            >
              <p className={cn(
                'font-bold text-[#0a2540] truncate w-full',
                displayMode === 'coupon' ? 'text-lg' : 'text-sm'
              )}>
                {currentCoupon?.coupon_import_identifier || '---'}
              </p>
              {displayMode === 'coupon_participant' && (
                <p className="text-xs text-[#64748b] truncate w-full">
                  {currentCoupon?.participant_import_identifier || '---'}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        ) : showWinnerContent && winner ? (
          <>
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
            <p className={cn(
              'font-bold truncate w-full text-center',
              displayMode === 'coupon' ? 'text-lg' : 'text-sm',
              isCancelled ? 'text-gray-400 line-through' : 'text-[#0a2540]'
            )}>
              {winner.couponIdentifier || winner.couponId || '-'}
            </p>
            {displayMode === 'coupon_participant' && (
              <p className="text-xs text-[#64748b] truncate w-full text-center">
                {winner.participantImportId || winner.participantId || '-'}
              </p>
            )}
            {isValid && isReviewing && (
              <button
                onClick={() => setCancelPopover({ winnerId: winner.id, reason: '' })}
                className="absolute top-1 right-1 p-1 rounded-full hover:bg-red-100 transition-colors pointer-events-auto"
              >
                <X className="w-3.5 h-3.5 text-red-500" />
              </button>
            )}
            {isCancelled && winner.cancelReason && (
              <p className="text-[10px] text-gray-400 truncate w-full text-center mt-0.5">
                {winner.cancelReason.message}
              </p>
            )}
          </>
        ) : null}
      </div>

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
