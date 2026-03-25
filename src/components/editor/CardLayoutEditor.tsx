import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { CardLayout } from '@/types'
import { useCardLayout } from './useCardLayout'
import { EditorCanvas } from './EditorCanvas'
import { Button } from '@/components/ui/button'

interface CardLayoutEditorProps {
  isOpen: boolean
  onClose: () => void
  batchNumber: number
  initialLayout?: CardLayout
  onSave: (layout: CardLayout) => void
}

export function CardLayoutEditor({
  isOpen,
  onClose,
  batchNumber,
  initialLayout,
  onSave,
}: CardLayoutEditorProps) {
  const { layout, updatePosition, setCardSize, resetToGrid } = useCardLayout(
    batchNumber,
    initialLayout
  )

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  // ESC to close — capture phase so it fires before Radix Dialog's handler
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        e.stopImmediatePropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSave = () => {
    onSave(layout)
    onClose()
  }

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    setCardSize(value, value * layout.aspectRatio / 2.2)
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90">
      {/* Canvas area — centered, max size */}
      <div className="flex-1 flex items-center justify-center w-full p-8">
        <div className="w-full max-w-[90vw] max-h-[80vh]" style={{ aspectRatio: layout.aspectRatio }}>
          <EditorCanvas
            layout={layout}
            onUpdatePosition={updatePosition}
          />
        </div>
      </div>

      {/* Floating Toolbar */}
      <div className="flex items-center gap-6 bg-white/10 backdrop-blur-md rounded-xl px-6 py-3 mb-8 border border-white/20">
        <div className="flex items-center gap-3 text-white text-sm">
          <span className="whitespace-nowrap">Card Size:</span>
          <input
            type="range"
            min="0.06"
            max="0.25"
            step="0.005"
            value={layout.cardWidth}
            onChange={handleSizeChange}
            className="w-32 accent-white"
          />
          <span className="w-10 text-right">{Math.round(layout.cardWidth * 100)}%</span>
        </div>

        <div className="w-px h-6 bg-white/30" />

        <Button
          variant="outline"
          size="sm"
          onClick={resetToGrid}
          className="text-white border-white/40 hover:bg-white/20"
        >
          Reset Grid
        </Button>

        <div className="w-px h-6 bg-white/30" />

        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="text-white border-white/40 hover:bg-white/20"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          className="bg-white text-black hover:bg-white/90"
        >
          Save Layout
        </Button>
      </div>
    </div>,
    document.body
  )
}
