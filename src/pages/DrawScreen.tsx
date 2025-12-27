/**
 * @file pages/DrawScreen.tsx
 * @description Main draw screen with 3D sphere animation and overlay winner cards
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { eventRepository, prizeRepository, couponRepository, participantRepository } from '@/repositories'
import type { Coupon, Participant } from '@/types'
import { useDrawState } from '@/hooks/useDrawState'
import { DrawHeader } from '@/components/draw/DrawHeader'
import { PrizePanel } from '@/components/draw/PrizePanel'
import { Sphere3D } from '@/components/draw/Sphere3D'
import { WinnerGallery } from '@/components/draw/WinnerGallery'
import { DrawControls } from '@/components/draw/DrawControls'
import { PrizeWinnersModal } from '@/components/draw/PrizeWinnersModal'
import { Confetti, fireConfettiBurst } from '@/components/draw/Confetti'
import type { Event, Prize, WinnerDisplayMode } from '@/types'

// Default grid configuration
const DEFAULT_GRID = {
  gridX: 5,
  gridY: 2,
}

export function DrawScreen() {
  const { id: eventId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Data state
  const [event, setEvent] = useState<Event | null>(null)
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [selectedPrizeForModal, setSelectedPrizeForModal] = useState<Prize | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  // Draw state
  const drawState = useDrawState()
  const {
    state,
    currentPrizeIndex,
    winners,
    currentPage,
    isSpinning,
    hasCancelled,
    validCount,
    start,
    stop,
    cancel,
    redrawAll,
    confirm,
    nextPrize,
    setCurrentPage,
  } = drawState

  const currentPrize = prizes[currentPrizeIndex] || null
  const displayMode: WinnerDisplayMode = event?.displaySettings?.winnerDisplayMode || 'coupon-participant-name'

  // Derive isIdle for sphere rotation
  const isIdle = state === 'idle'

  // Grid config from event settings
  const gridX = event?.displaySettings?.gridX || DEFAULT_GRID.gridX
  const gridY = event?.displaySettings?.gridY || DEFAULT_GRID.gridY

  // Background image from event settings
  const backgroundImage = event?.displaySettings?.backgroundImage

  // Calculate pagination
  const cardsPerPage = gridX * gridY
  const totalPages = Math.max(1, Math.ceil(winners.length / cardsPerPage))

  // Map coupons with participant names for sphere display
  const couponsWithNames = useMemo(() => {
    const participantMap = new Map(participants.map((p) => [p.id, p.name]))
    return coupons.map((c) => ({
      id: c.id,
      participantId: c.participantId,
      participantName: participantMap.get(c.participantId),
    }))
  }, [coupons, participants])

  // Load event data
  useEffect(() => {
    if (!eventId) return

    const loadData = async () => {
      setLoading(true)
      try {
        const [eventData, prizesData, couponsData, participantsData] = await Promise.all([
          eventRepository.getById(eventId),
          prizeRepository.getByEventId(eventId),
          couponRepository.getByEventId(eventId),
          participantRepository.getByEventId(eventId),
        ])

        if (eventData) {
          setEvent(eventData)
        }
        setPrizes(prizesData)
        setCoupons(couponsData)
        setParticipants(participantsData)
      } catch (error) {
        console.error('[DrawScreen] Failed to load event data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [eventId])

  // Handle start draw
  const handleStart = useCallback(() => {
    start()
  }, [start])

  // Handle stop and draw
  const handleStop = useCallback(async () => {
    if (!eventId || !currentPrize) return

    // Calculate how many to draw
    const remainingQuantity = currentPrize.quantity - currentPrize.drawnCount

    await stop(eventId, currentPrize.id, remainingQuantity)

    // Trigger confetti after animation
    setTimeout(() => {
      fireConfettiBurst()
      setShowConfetti(true)
    }, 2500)
  }, [eventId, currentPrize, stop])

  // Handle cancel winner
  const handleCancel = useCallback(
    async (winnerId: string) => {
      await cancel(winnerId)
    },
    [cancel]
  )

  // Handle redraw all
  const handleRedrawAll = useCallback(async () => {
    if (!currentPrize) return
    await redrawAll(currentPrize.id)
  }, [currentPrize, redrawAll])

  // Handle confirm
  const handleConfirm = useCallback(async () => {
    if (!currentPrize || !eventId) return

    await confirm(currentPrize.id)

    // Refresh prize data
    const updatedPrizes = await prizeRepository.getByEventId(eventId)
    setPrizes(updatedPrizes)

    // Check if more prizes
    if (currentPrizeIndex < prizes.length - 1) {
      nextPrize()
    } else {
      // All done
      navigate(`/event/${eventId}/history`)
    }
  }, [currentPrize, eventId, currentPrizeIndex, prizes.length, confirm, nextPrize, navigate])

  // Handle prize click in panel
  const handlePrizeClick = useCallback((prizeId: string) => {
    const prize = prizes.find((p) => p.id === prizeId)
    if (prize) {
      setSelectedPrizeForModal(prize)
    }
  }, [prizes])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f9fc] flex items-center justify-center">
        <div className="text-[#64748b]">Loading...</div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-[#f6f9fc] flex flex-col relative"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Background overlay for readability when image is set */}
      {backgroundImage && <div className="absolute inset-0 bg-black/20 pointer-events-none" />}

      {/* Confetti */}
      <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Floating Prize Panel */}
      <PrizePanel
        isOpen={isPanelOpen}
        onToggle={() => setIsPanelOpen(!isPanelOpen)}
        prizes={prizes}
        currentPrizeIndex={currentPrizeIndex}
        onPrizeClick={handlePrizeClick}
      />

      {/* Header */}
      <DrawHeader
        event={event}
        currentPrize={currentPrize}
        currentPrizeIndex={currentPrizeIndex}
        totalPrizes={prizes.length}
      />

      {/* Main Content - Full viewport for sphere */}
      <div className="flex-1 relative">
        {/* Sphere Layer - Background */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Sphere3D
            isSpinning={isSpinning}
            isIdle={isIdle}
            coupons={couponsWithNames}
            displayMode={displayMode}
          />
        </div>

        {/* Winner Cards Layer - Overlay (centered, no gap) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 pointer-events-none">
          {/* Top Row */}
          <WinnerGallery
            row="top"
            winners={winners}
            displayMode={displayMode}
            gridX={gridX}
            gridY={gridY}
            currentPage={currentPage}
            onCancel={handleCancel}
            showAnimation={state === 'animating' || state === 'reviewing'}
          />

          {/* Bottom Row */}
          <WinnerGallery
            row="bottom"
            winners={winners}
            displayMode={displayMode}
            gridX={gridX}
            gridY={gridY}
            currentPage={currentPage}
            onCancel={handleCancel}
            showAnimation={state === 'animating' || state === 'reviewing'}
          />
        </div>
      </div>

      {/* Floating Controls */}
      <DrawControls
        state={state}
        onStart={handleStart}
        onStop={handleStop}
        onRedrawAll={handleRedrawAll}
        onConfirm={handleConfirm}
        hasCancelled={hasCancelled}
        validCount={validCount}
        totalCount={winners.length}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Prize Winners Modal */}
      <PrizeWinnersModal
        isOpen={selectedPrizeForModal !== null}
        onClose={() => setSelectedPrizeForModal(null)}
        prize={selectedPrizeForModal}
      />
    </div>
  )
}

export default DrawScreen
