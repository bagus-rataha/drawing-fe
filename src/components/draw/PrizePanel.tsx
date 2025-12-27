/**
 * @file components/draw/PrizePanel.tsx
 * @description Floating side panel showing list of prizes with status
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Prize } from '@/types'

type PrizeStatus = 'completed' | 'in-progress' | 'pending' | 'pool-exhausted'

interface PrizePanelProps {
  isOpen: boolean
  onToggle: () => void
  prizes: Prize[]
  currentPrizeIndex: number
  onPrizeClick: (prizeId: string) => void
}

const statusColors: Record<PrizeStatus, string> = {
  completed: 'border-green-400',
  'in-progress': 'border-[#635bff] border-2',
  pending: 'border-[#e2e8f0]',
  'pool-exhausted': 'border-amber-400',
}

function getPrizeStatus(prize: Prize, currentIndex: number, prizeIndex: number): PrizeStatus {
  if (prize.drawnCount >= prize.quantity) {
    return 'completed'
  }
  if (prizeIndex === currentIndex) {
    return 'in-progress'
  }
  if (prizeIndex < currentIndex) {
    return prize.drawnCount > 0 ? 'pool-exhausted' : 'pending'
  }
  return 'pending'
}

function PrizeItem({
  prize,
  status,
  onClick,
}: {
  prize: Prize
  status: PrizeStatus
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl',
        'bg-[#f6f9fc] hover:bg-[#edf2f7] transition-colors',
        'border-2',
        statusColors[status]
      )}
    >
      {/* Prize Image/Icon */}
      {prize.image ? (
        <img
          src={prize.image}
          alt={prize.name}
          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-400 to-purple-500 flex-shrink-0" />
      )}

      {/* Prize Info */}
      <div className="flex-1 text-left min-w-0">
        <div className="text-[#0a2540] font-medium text-sm truncate">{prize.name}</div>
        <div className="mt-1">
          {/* Progress bar */}
          <div className="w-full bg-[#e2e8f0] rounded-full h-1.5">
            <div
              className="bg-[#635bff] h-1.5 rounded-full transition-all"
              style={{ width: `${(prize.drawnCount / prize.quantity) * 100}%` }}
            />
          </div>
          <span className="text-xs text-[#64748b] mt-1 block">
            {prize.drawnCount}/{prize.quantity}
          </span>
        </div>
      </div>
    </button>
  )
}

export function PrizePanel({
  isOpen,
  onToggle,
  prizes,
  currentPrizeIndex,
  onPrizeClick,
}: PrizePanelProps) {
  return (
    <>
      {/* Floating Panel */}
      <div
        className={cn(
          'fixed left-4 top-1/2 -translate-y-1/2 z-50',
          'bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl',
          'border border-[#e2e8f0] overflow-hidden',
          'transition-all duration-300',
          isOpen ? 'w-64 p-4 opacity-100' : 'w-0 p-0 opacity-0'
        )}
      >
        <h3 className="text-[#0a2540] font-bold mb-4">Prizes</h3>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {prizes.map((prize, index) => {
            const status = getPrizeStatus(prize, currentPrizeIndex, index)
            return (
              <PrizeItem
                key={prize.id}
                prize={prize}
                status={status}
                onClick={() => onPrizeClick(prize.id)}
              />
            )
          })}
        </div>
      </div>

      {/* Toggle Button - always visible */}
      <button
        onClick={onToggle}
        className={cn(
          'fixed top-1/2 -translate-y-1/2 z-50',
          'bg-[#635bff] text-white p-2 rounded-r-lg',
          'hover:bg-[#524acc] transition-all duration-300',
          isOpen ? 'left-[272px]' : 'left-0'
        )}
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </>
  )
}

export default PrizePanel
