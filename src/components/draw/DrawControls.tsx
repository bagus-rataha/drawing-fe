/**
 * @file components/draw/DrawControls.tsx
 * @description Floating control buttons for draw screen with clean switch-based rendering
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DrawState } from '@/hooks/useDrawState'

interface DrawControlsProps {
  status: DrawState
  onStart: () => void
  onStop: () => void
  onRedrawAll: () => void
  onConfirm: () => void
  hasCancelled: boolean
  validCount: number
  totalCount: number
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  // FIX (Rev 13): Loading states to disable buttons during async operations
  isRedrawing?: boolean
  isConfirming?: boolean
}

export function DrawControls({
  status,
  onStart,
  onStop,
  onRedrawAll,
  onConfirm,
  hasCancelled,
  validCount,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  isRedrawing = false,
  isConfirming = false,
}: DrawControlsProps) {
  const showPagination = status === 'reviewing' && totalPages > 1

  // Single source of truth for what button to render
  const renderButton = () => {
    switch (status) {
      case 'idle':
        return (
          <button
            onClick={onStart}
            className="px-8 py-3 bg-[#635bff] text-white font-medium rounded-full
                       shadow-lg hover:bg-[#524acc] transition-colors text-lg"
          >
            Start Draw
          </button>
        )

      case 'spinning':
        return (
          <button
            onClick={onStop}
            className="px-8 py-3 bg-red-500 text-white font-medium rounded-full
                       shadow-lg hover:bg-red-600 transition-colors text-lg"
          >
            Stop
          </button>
        )

      case 'drawing':
        return (
          <div className="px-8 py-3 bg-gray-400 text-white font-medium rounded-full shadow-lg cursor-not-allowed text-lg">
            Drawing...
          </div>
        )

      case 'revealing':
        return (
          <div className="px-8 py-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg text-[#64748b] font-medium text-lg">
            Revealing...
          </div>
        )

      case 'reviewing':
        // FIX (Rev 12): Confirm button should ONLY show when ALL winners are valid
        // If there are cancelled winners, only show Redraw All button
        // FIX (Rev 13): Disable buttons during async operations
        return (
          <div className="flex gap-4">
            {hasCancelled ? (
              <button
                onClick={onRedrawAll}
                disabled={isRedrawing || isConfirming}
                className={`px-6 py-3 font-medium rounded-full shadow-lg transition-colors text-lg
                           ${isRedrawing || isConfirming
                             ? 'bg-gray-400 text-white cursor-not-allowed'
                             : 'bg-amber-500 text-white hover:bg-amber-600'}`}
              >
                {isRedrawing ? 'Redrawing...' : `Redraw All (${totalCount - validCount} cancelled)`}
              </button>
            ) : (
              <button
                onClick={onConfirm}
                disabled={isConfirming || isRedrawing}
                className={`px-8 py-3 font-medium rounded-full shadow-lg transition-colors text-lg
                           ${isConfirming || isRedrawing
                             ? 'bg-gray-400 text-white cursor-not-allowed'
                             : 'bg-[#635bff] text-white hover:bg-[#524acc]'}`}
              >
                {isConfirming ? 'Confirming...' : `Confirm ${validCount} Winners`}
              </button>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">
      {/* Pagination - floating pill */}
      {showPagination && (
        <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-[#e2e8f0] flex items-center gap-4">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className="p-1.5 rounded-full hover:bg-[#f6f9fc]
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#64748b]" />
          </button>
          <span className="text-[#0a2540] font-medium text-sm">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className="p-1.5 rounded-full hover:bg-[#f6f9fc]
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-[#64748b]" />
          </button>
        </div>
      )}

      {/* Action Button */}
      {renderButton()}
    </div>
  )
}

export default DrawControls
