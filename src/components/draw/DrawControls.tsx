/**
 * @file components/draw/DrawControls.tsx
 * @description Floating control buttons for draw screen (Start/Stop/Redraw/Confirm)
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DrawState } from '@/hooks/useDrawState'

interface DrawControlsProps {
  state: DrawState
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
}

export function DrawControls({
  state,
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
}: DrawControlsProps) {
  const showPagination = state === 'reviewing' && totalPages > 1

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

      {/* Action Buttons - floating */}
      <div className="flex gap-4">
        {state === 'idle' && (
          <button
            onClick={onStart}
            className="px-8 py-3 bg-[#635bff] text-white font-medium rounded-full
                       shadow-lg hover:bg-[#524acc] transition-colors text-lg"
          >
            Start Draw
          </button>
        )}

        {(state === 'spinning' || state === 'stopping') && (
          <button
            onClick={onStop}
            disabled={state === 'stopping'}
            className="px-8 py-3 bg-red-500 text-white font-medium rounded-full
                       shadow-lg hover:bg-red-600 transition-colors text-lg
                       disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {state === 'stopping' ? 'Drawing...' : 'Stop'}
          </button>
        )}

        {state === 'animating' && (
          <div className="px-8 py-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg text-[#64748b] font-medium text-lg">
            Revealing winners...
          </div>
        )}

        {state === 'reviewing' && (
          <>
            {hasCancelled ? (
              <button
                onClick={onRedrawAll}
                className="px-8 py-3 bg-amber-500 text-white font-medium rounded-full
                           shadow-lg hover:bg-amber-600 transition-colors text-lg"
              >
                Redraw All
              </button>
            ) : (
              <button
                onClick={onConfirm}
                className="px-8 py-3 bg-[#635bff] text-white font-medium rounded-full
                           shadow-lg hover:bg-[#524acc] transition-colors text-lg"
              >
                {validCount === totalCount
                  ? 'Confirm'
                  : `Confirm ${validCount} Winners`}
              </button>
            )}
          </>
        )}

        {state === 'redrawing' && (
          <div className="px-8 py-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg text-[#64748b] font-medium text-lg">
            Redrawing...
          </div>
        )}
      </div>
    </div>
  )
}

export default DrawControls
