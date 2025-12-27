/**
 * @file components/draw/DrawHeader.tsx
 * @description Header for draw screen with back button and prize info
 */

import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Event, Prize } from '@/types'

interface DrawHeaderProps {
  event: Event | null
  currentPrize: Prize | null
  currentPrizeIndex: number
  totalPrizes: number
}

export function DrawHeader({
  event,
  currentPrize,
  currentPrizeIndex,
  totalPrizes,
}: DrawHeaderProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (event) {
      navigate(`/event/${event.id}/edit`)
    } else {
      navigate('/')
    }
  }

  return (
    <header className="bg-white border-b border-[#e2e8f0] px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="p-2 rounded-lg hover:bg-[#f6f9fc] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#64748b]" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#0a2540]">
            {event?.name || 'Loading...'}
          </h1>
          {currentPrize && (
            <p className="text-sm text-[#64748b]">
              Drawing: {currentPrize.name}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[#64748b]">Prize:</span>
        <span className="font-bold text-[#0a2540]">
          {currentPrizeIndex + 1}/{totalPrizes}
        </span>
      </div>
    </header>
  )
}

export default DrawHeader
