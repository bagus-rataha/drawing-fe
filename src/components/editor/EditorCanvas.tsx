import { useRef } from 'react'
import type { CardLayout } from '@/types'
import { DraggableCard } from './DraggableCard'

interface EditorCanvasProps {
  layout: CardLayout
  onUpdatePosition: (index: number, x: number, y: number) => void
}

export function EditorCanvas({
  layout,
  onUpdatePosition,
}: EditorCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null!)

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden rounded-lg bg-gradient-to-br from-gray-800 to-gray-900"
      style={{ aspectRatio: layout.aspectRatio }}
    >
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Draggable cards */}
      {layout.positions.map((pos, i) => (
        <DraggableCard
          key={i}
          index={i}
          position={pos}
          cardWidth={layout.cardWidth}
          cardHeight={layout.cardHeight}
          canvasRef={canvasRef}
          onDragEnd={onUpdatePosition}
        />
      ))}
    </div>
  )
}
