import { useState, useCallback, useEffect } from 'react'
import type { CardLayout, CardPosition } from '@/types'

const DEFAULT_ASPECT_RATIO = 16 / 9
const DEFAULT_CARD_WIDTH = 0.12
// Match draw screen card ratio (220×100 = 2.2:1) on 16:9 canvas
// cardHeight = cardWidth × aspectRatio / cardAspectRatio
const DEFAULT_CARD_HEIGHT = DEFAULT_CARD_WIDTH * (16 / 9) / 2.2

export function generateAutoGrid(count: number): CardPosition[] {
  if (count <= 0) return []

  // Calculate grid dimensions similar to DEFAULT_GRID 5x2
  const cols = Math.min(count, 5)
  const rows = Math.ceil(count / cols)

  const positions: CardPosition[] = []
  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const totalColsInRow = row === rows - 1 ? count - row * cols : cols

    positions.push({
      x: (col + 0.5) / totalColsInRow,
      y: (row + 0.5) / rows,
    })
  }
  return positions
}

function clampPosition(
  pos: CardPosition,
  cardWidth: number,
  cardHeight: number
): CardPosition {
  const halfW = cardWidth / 2
  const halfH = cardHeight / 2
  return {
    x: Math.max(halfW, Math.min(1 - halfW, pos.x)),
    y: Math.max(halfH, Math.min(1 - halfH, pos.y)),
  }
}

export function useCardLayout(batchNumber: number, initialLayout?: CardLayout) {
  const [layout, setLayout] = useState<CardLayout>(() => {
    if (initialLayout?.positions?.length) {
      return initialLayout
    }
    return {
      aspectRatio: DEFAULT_ASPECT_RATIO,
      cardWidth: DEFAULT_CARD_WIDTH,
      cardHeight: DEFAULT_CARD_HEIGHT,
      positions: generateAutoGrid(batchNumber),
    }
  })

  const [isModified, setIsModified] = useState(false)

  // Sync when initialLayout changes (e.g., after save + re-open editor)
  useEffect(() => {
    if (initialLayout?.positions?.length) {
      setLayout(initialLayout)
      setIsModified(false)
    }
  }, [initialLayout])

  // Reconcile when batchNumber changes
  useEffect(() => {
    setLayout((prev) => {
      const currentCount = prev.positions.length
      if (currentCount === batchNumber) return prev

      let newPositions: CardPosition[]
      if (batchNumber < currentCount) {
        // Truncate
        newPositions = prev.positions.slice(0, batchNumber)
      } else {
        // Append new positions from auto-grid
        const autoGrid = generateAutoGrid(batchNumber)
        newPositions = [
          ...prev.positions,
          ...autoGrid.slice(currentCount),
        ]
      }
      return { ...prev, positions: newPositions }
    })
  }, [batchNumber])

  const updatePosition = useCallback(
    (index: number, x: number, y: number) => {
      setLayout((prev) => {
        const newPositions = [...prev.positions]
        newPositions[index] = clampPosition(
          { x, y },
          prev.cardWidth,
          prev.cardHeight
        )
        return { ...prev, positions: newPositions }
      })
      setIsModified(true)
    },
    []
  )

  const setCardSize = useCallback(
    (cardWidth: number, cardHeight: number) => {
      setLayout((prev) => {
        // Re-clamp all positions with new size
        const newPositions = prev.positions.map((pos) =>
          clampPosition(pos, cardWidth, cardHeight)
        )
        return { ...prev, cardWidth, cardHeight, positions: newPositions }
      })
      setIsModified(true)
    },
    []
  )

  const resetToGrid = useCallback(() => {
    setLayout((prev) => ({
      ...prev,
      positions: generateAutoGrid(prev.positions.length),
    }))
    setIsModified(true)
  }, [])

  return { layout, updatePosition, setCardSize, resetToGrid, isModified }
}
