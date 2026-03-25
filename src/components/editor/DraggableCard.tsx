import { useLayoutEffect } from 'react'
import { motion, useMotionValue, type PanInfo } from 'framer-motion'
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
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Sync pixel position from normalized coordinates
  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cardW = cardWidth * rect.width
    const cardH = cardHeight * rect.height
    x.set(position.x * rect.width - cardW / 2)
    y.set(position.y * rect.height - cardH / 2)
  }, [position.x, position.y, cardWidth, cardHeight, canvasRef, x, y])

  const handleDragEnd = (_: unknown, _info: PanInfo) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cardW = cardWidth * rect.width
    const cardH = cardHeight * rect.height
    // Read current pixel position of card center from motion values
    const centerX = x.get() + cardW / 2
    const centerY = y.get() + cardH / 2
    const nx = centerX / rect.width
    const ny = centerY / rect.height
    onDragEnd(index, nx, ny)
  }

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
        left: 0,
        top: 0,
        x,
        y,
        width: `${cardWidth * 100}%`,
        height: `${cardHeight * 100}%`,
        zIndex: 10,
      }}
    >
      {index + 1}
    </motion.div>
  )
}
