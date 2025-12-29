/**
 * @file components/draw/WinnerGallery.tsx
 * @description Overlay gallery showing winners in top/bottom rows above the sphere
 * Animation controlled by parent via revealedCount prop
 */

import { WinnerCard } from './WinnerCard'
import type { DrawResult, WinnerDisplayMode } from '@/types'

interface WinnerGalleryProps {
  row: 'top' | 'bottom'
  winners: (DrawResult & { id?: string })[]
  displayMode: WinnerDisplayMode
  gridX: number
  gridY: number
  currentPage: number
  onCancel: (winnerId: string) => void
  revealedCount: number // Controlled by parent
  // FIX (Rev 20): Track which positions are being redrawn for targeted animation
  redrawPositions?: number[]
}

export function WinnerGallery({
  row,
  winners,
  displayMode,
  gridX,
  gridY,
  currentPage,
  onCancel,
  revealedCount,
  redrawPositions = [],
}: WinnerGalleryProps) {
  // FIX (Rev 20): Create a Set for O(1) lookup of redraw positions
  const redrawPositionSet = new Set(redrawPositions)
  const isRedrawMode = redrawPositions.length > 0
  // Cards per page = gridX * gridY
  const cardsPerPage = gridX * gridY
  const cardsPerRow = gridX

  // Calculate which winners to show
  const halfPerPage = Math.ceil(cardsPerPage / 2)
  const startIndex =
    row === 'top'
      ? currentPage * cardsPerPage
      : currentPage * cardsPerPage + halfPerPage

  const maxCards = row === 'top' ? halfPerPage : cardsPerPage - halfPerPage
  const visibleWinners = winners.slice(startIndex, startIndex + maxCards)

  // Calculate how many rows for this section
  const rowsForSection = Math.ceil(gridY / 2)

  if (visibleWinners.length === 0 && winners.length === 0) {
    // Show empty placeholders
    return (
      <div
        className="grid gap-4 pointer-events-auto"
        style={{
          gridTemplateColumns: `repeat(${gridX}, minmax(140px, 1fr))`,
        }}
      >
        {Array.from({ length: cardsPerRow }).map((_, i) => (
          <div
            key={`empty-${row}-${i}`}
            className="h-24 rounded-lg border-2 border-dashed border-[#e2e8f0] opacity-30"
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className="grid gap-4 pointer-events-auto"
      style={{
        gridTemplateColumns: `repeat(${gridX}, minmax(140px, 1fr))`,
        gridTemplateRows: `repeat(${rowsForSection}, auto)`,
      }}
    >
      {visibleWinners.map((winner, index) => {
        const absoluteIndex = startIndex + index
        const shouldShow = absoluteIndex < revealedCount

        // FIX (Rev 20): Determine animation based on whether it's a redraw
        let showAnimation = false
        if (isRedrawMode) {
          // In redraw mode: only animate cards at redrawn positions
          showAnimation = redrawPositionSet.has(winner.lineNumber)
        } else {
          // Normal draw: animate newly revealed cards
          showAnimation = absoluteIndex === revealedCount - 1
        }

        if (!shouldShow) {
          // Empty placeholder while not yet revealed
          return (
            <div
              key={`placeholder-${row}-${index}`}
              className="h-24 rounded-lg border-2 border-dashed border-[#e2e8f0] opacity-30"
            />
          )
        }

        return (
          <WinnerCard
            key={winner.id || `${winner.couponId}-${index}`}
            winner={winner}
            displayMode={displayMode}
            onCancel={winner.id ? () => onCancel(winner.id!) : undefined}
            animationDelay={0}
            showAnimation={showAnimation}
          />
        )
      })}
      {/* Fill empty slots if needed */}
      {Array.from({ length: Math.max(0, cardsPerRow - visibleWinners.length) }).map((_, i) => (
        <div
          key={`empty-${row}-${i}`}
          className="h-24 rounded-lg border-2 border-dashed border-[#e2e8f0] opacity-30"
        />
      ))}
    </div>
  )
}

export default WinnerGallery
