/**
 * @file components/draw/WinnerCard.tsx
 * @description Card showing a winner with cancel button outside card body
 */

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { DrawResult, WinnerDisplayMode } from '@/types'

interface WinnerCardProps {
  winner: DrawResult & { id?: string }
  displayMode: WinnerDisplayMode
  onCancel?: () => void
  animationDelay?: number
  showAnimation?: boolean
}

export function WinnerCard({
  winner,
  displayMode,
  onCancel,
  animationDelay = 0,
  showAnimation = true,
}: WinnerCardProps) {
  const isValid = winner.status === 'valid'
  const isCancelled = winner.status === 'cancelled'
  const isSkipped = winner.status === 'skipped'

  const cardWrapper = (
    <div className="flex flex-col items-center gap-2">
      {/* Card Body */}
      <div
        className={cn(
          'relative rounded-lg p-4 min-w-[140px]',
          'flex flex-col items-center text-center',
          'border shadow-sm',
          // Valid: clean white
          isValid && 'bg-white border-[#e2e8f0]',
          // Cancelled: grayed out
          isCancelled && 'bg-gray-100 border-gray-300 opacity-60',
          // Skipped: warning style
          isSkipped && 'bg-amber-50 border-amber-300 opacity-60'
        )}
      >
        {/* Status badge for cancelled */}
        {isCancelled && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
            Cancelled
          </div>
        )}
        {/* Status badge for skipped */}
        {isSkipped && (
          <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
            Skipped
          </div>
        )}

        {/* Coupon ID - top */}
        <div className="text-xs text-[#64748b] mb-1 truncate w-full">
          {winner.couponId}
        </div>

        {/* Participant Name - center, large */}
        {(displayMode === 'coupon-participant-name' ||
          displayMode === 'coupon-participant-id') && (
          <div className="text-lg font-bold text-[#0a2540] truncate w-full">
            {displayMode === 'coupon-participant-name'
              ? winner.participantName || 'Unknown'
              : winner.participantId}
          </div>
        )}

        {/* Participant ID - bottom (only if showing name) */}
        {displayMode === 'coupon-participant-name' && (
          <div className="text-sm text-[#64748b] truncate w-full">
            {winner.participantId}
          </div>
        )}
      </div>

      {/* Cancel Reason - for cancelled cards */}
      {isCancelled && winner.cancelReason && (
        <div className="text-xs text-red-500 text-center max-w-[140px]">
          {winner.cancelReason.message}
        </div>
      )}

      {/* Cancel Button - OUTSIDE card body, only for valid */}
      {isValid && onCancel && (
        <button
          onClick={onCancel}
          className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  )

  if (!showAnimation) {
    return cardWrapper
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: animationDelay, type: 'spring', stiffness: 200 }}
    >
      {cardWrapper}
    </motion.div>
  )
}

export default WinnerCard
