import { useEffect } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import type { CardPosition } from '@/types'

interface DraggableCardProps {
  index: number
  position: CardPosition
  cardWidth: number
  cardHeight: number
  canvasRef: React.RefObject<HTMLDivElement>
  onDragEnd: (index: number, x: number, y: number) => void
}

export function DraggableCard({
  index,
  position,
  cardWidth,
  cardHeight,
  canvasRef,
  onDragEnd,
}: DraggableCardProps) {
  // Motion values for drag offset only (not initial positioning)
  const dragX = useMotionValue(0)
  const dragY = useMotionValue(0)

  // Reset drag offset when position changes (after drag end updates state)
  useEffect(() => {
    dragX.set(0)
    dragY.set(0)
  }, [position.x, position.y, dragX, dragY])

  const handleDragEnd = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()

    // New center = old center + drag offset (in normalized coords)
    const nx = position.x + dragX.get() / rect.width
    const ny = position.y + dragY.get() / rect.height

    onDragEnd(index, nx, ny)
  }

  // Position card top-left via CSS percentages (always correct, no canvas measurement needed)
  // left % is relative to parent width, top % is relative to parent height
  const leftPct = (position.x - cardWidth / 2) * 100
  const topPct = (position.y - cardHeight / 2) * 100

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragConstraints={canvasRef}
      dragElastic={0}
      onDragEnd={handleDragEnd}
      className="absolute cursor-grab active:cursor-grabbing select-none
        rounded-lg border-2 border-dashed border-white/70
        bg-white/20 backdrop-blur-sm
        flex items-center justify-center
        text-white font-bold text-lg
        hover:border-white hover:bg-white/30"
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        x: dragX,
        y: dragY,
        width: `${cardWidth * 100}%`,
        height: `${cardHeight * 100}%`,
        zIndex: 10,
      }}
    >
      {index + 1}
    </motion.div>
  )
}
