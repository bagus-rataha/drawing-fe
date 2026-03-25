import { useRef } from 'react'
import type { CardLayout } from '@/types'
import { DraggableCard } from './DraggableCard'

interface EditorCanvasProps {
  layout: CardLayout
  backgroundImage?: string
  onUpdatePosition: (index: number, x: number, y: number) => void
}

export function EditorCanvas({
  layout,
  backgroundImage,
  onUpdatePosition,
}: EditorCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null!)

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden rounded-lg"
      style={{ aspectRatio: layout.aspectRatio }}
    >
      {/* Background */}
      {backgroundImage ? (
        <img
          src={backgroundImage}
          alt="Prize background"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
      )}

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
