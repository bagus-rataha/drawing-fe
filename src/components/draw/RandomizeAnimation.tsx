/**
 * @file components/draw/RandomizeAnimation.tsx
 * @description Box-based randomize animation for draw screen
 */

import type { AnimationCouponResponse } from '@/types/api'
import type { DrawResultWithId } from '@/hooks/useDrawState'
import type { WinnerDisplayMode, CardLayout } from '@/types'
import { SlotBox } from './SlotBox'

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
  idleCardStyle: 'placeholder' | 'blank'
  cardLayout?: CardLayout
}

export function RandomizeAnimation({
  isSpinning,
  isIdle: _isIdle,
  slotCount,
  coupons,
  winners,
  showResults,
  displayMode,
  onCancel,
  state,
  idleCardStyle,
  cardLayout,
}: RandomizeAnimationProps) {
  const effectiveSlotCount = showResults
    ? Math.max(slotCount, winners.length)
    : slotCount

  // Custom layout: absolute positioning
  if (cardLayout?.positions?.length) {
    return (
      <div className="relative w-full h-full">
        {Array.from({ length: effectiveSlotCount }).map((_, index) => {
          const pos = cardLayout.positions[index]
          if (!pos) return null
          return (
            <div
              key={`slot-${index}`}
              className="absolute"
              style={{
                left: `${pos.x * 100}%`,
                top: `${pos.y * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <SlotBox
                index={index}
                isSpinning={isSpinning}
                showResult={showResults}
                winner={winners[index]}
                coupons={coupons}
                displayMode={displayMode}
                onCancel={onCancel}
                state={state}
                idleCardStyle={idleCardStyle}
              />
            </div>
          )
        })}
      </div>
    )
  }

  // Default: flex grid layout
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 p-4 w-full">
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
          idleCardStyle={idleCardStyle}
        />
      ))}
    </div>
  )
}

export default RandomizeAnimation
