import { WinnerCard } from './WinnerCard'
import type { CardLayout, WinnerDisplayMode } from '@/types'
import type { DrawResultWithId } from '@/hooks/useDrawState'

interface AbsoluteWinnerOverlayProps {
  layout: CardLayout
  winners: DrawResultWithId[]
  displayMode: WinnerDisplayMode
  onCancel: (winnerId: string) => void
  revealedCount: number
  redrawPositions: number[]
}

export function AbsoluteWinnerOverlay({
  layout,
  winners,
  displayMode,
  onCancel,
  revealedCount,
  redrawPositions = [],
}: AbsoluteWinnerOverlayProps) {
  const redrawPositionSet = new Set(redrawPositions)
  const isRedrawMode = redrawPositions.length > 0

  return (
    <div className="absolute inset-0 pointer-events-auto">
      <div className="relative w-full h-full">
        {layout.positions.map((pos, index) => {
          const winner = winners[index]
          const shouldShow = index < revealedCount

          if (!shouldShow || !winner) {
            // Empty placeholder
            return (
              <div
                key={`placeholder-${index}`}
                className="absolute rounded-lg border-2 border-dashed border-[#e2e8f0] opacity-30"
                style={{
                  left: `${pos.x * 100}%`,
                  top: `${pos.y * 100}%`,
                  width: `${layout.cardWidth * 100}%`,
                  height: `${layout.cardHeight * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            )
          }

          let showAnimation = false
          if (isRedrawMode) {
            showAnimation = redrawPositionSet.has(winner.lineNumber)
          } else {
            showAnimation = index === revealedCount - 1
          }

          return (
            <div
              key={winner.id || `${winner.couponId}-${index}`}
              className="absolute"
              style={{
                left: `${pos.x * 100}%`,
                top: `${pos.y * 100}%`,
                width: `${layout.cardWidth * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <WinnerCard
                winner={winner}
                displayMode={displayMode}
                onCancel={winner.id ? () => onCancel(winner.id!) : undefined}
                animationDelay={0}
                showAnimation={showAnimation}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
