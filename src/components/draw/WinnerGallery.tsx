/**
 * @file components/draw/WinnerGallery.tsx
 * @description Overlay gallery showing winners in top/bottom rows above the sphere
 */

import { WinnerCard } from './WinnerCard'
import type { DrawResult, WinnerDisplayMode } from '@/types'

interface WinnerGalleryProps {
  row: 'top' | 'bottom'
  winners: (DrawResult & { id?: string })[]
  displayMode: WinnerDisplayMode
  gridX: number  // columns
  gridY: number  // rows (total rows, split between top and bottom)
  currentPage: number
  onCancel: (winnerId: string) => void
  showAnimation: boolean
}

export function WinnerGallery({
  row,
  winners,
  displayMode,
  gridX,
  gridY,
  currentPage,
  onCancel,
  showAnimation,
}: WinnerGalleryProps) {
  // Cards per page = gridX * gridY
  const cardsPerPage = gridX * gridY
  // Cards per row section = gridX (one row at a time for top/bottom)
  const cardsPerRow = gridX

  // Calculate which winners to show
  // Top row gets first half, bottom row gets second half
  const halfPerPage = Math.ceil(cardsPerPage / 2)
  const startIndex =
    row === 'top'
      ? currentPage * cardsPerPage
      : currentPage * cardsPerPage + halfPerPage

  const maxCards = row === 'top' ? halfPerPage : cardsPerPage - halfPerPage
  const endIndex = startIndex + maxCards
  const visibleWinners = winners.slice(startIndex, endIndex)

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
      {visibleWinners.map((winner, index) => (
        <WinnerCard
          key={winner.id || `${winner.couponId}-${index}`}
          winner={winner}
          displayMode={displayMode}
          onCancel={winner.id ? () => onCancel(winner.id!) : undefined}
          animationDelay={showAnimation ? index * 0.1 : 0}
          showAnimation={showAnimation}
        />
      ))}
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
