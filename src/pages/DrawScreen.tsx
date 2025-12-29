/**
 * @file pages/DrawScreen.tsx
 * @description Main draw screen with 3D sphere animation and overlay winner cards
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { eventRepository, prizeRepository, couponRepository, participantRepository } from '@/repositories'
import type { Coupon, Participant } from '@/types'
import { useDrawState } from '@/hooks/useDrawState'
import { winnerKeys } from '@/hooks/useWinners'
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
  const queryClient = useQueryClient()

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

  // FIX (Rev 13): Loading states to prevent double-clicks
  const [isRedrawing, setIsRedrawing] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  // Reveal animation state - controlled here, shared with both rows
  const [revealedCount, setRevealedCount] = useState(0)
  const revealCompleteCalledRef = useRef(false)

  // Draw state - using simplified state machine
  const drawState = useDrawState()
  const {
    state,
    currentPrizeIndex,
    currentBatchIndex,
    winners,
    currentPage,
    isSpinning,
    isIdle,
    hasCancelled,
    validCount,
    init,
    start,
    stop,
    revealComplete,
    cancel,
    redrawAll,
    confirm,
    nextPrize,
    nextBatch,
    setCurrentPage,
    calculateTotalDraws,
    getDrawQuantity,
  } = drawState

  const currentPrize = prizes[currentPrizeIndex] || null
  const displayMode: WinnerDisplayMode = event?.displaySettings?.winnerDisplayMode || 'coupon-participant-name'

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

  // Initialize draw progress from loaded data
  // This calculates the correct prize index and batch index based on existing progress
  useEffect(() => {
    if (loading || prizes.length === 0) return

    // Find current prize (first one not fully drawn)
    let prizeIndex = 0
    for (let i = 0; i < prizes.length; i++) {
      const prize = prizes[i]
      if (prize.drawnCount < prize.quantity) {
        prizeIndex = i
        break
      }
      // If all prizes complete, stay on last one
      if (i === prizes.length - 1) {
        prizeIndex = i
      }
    }

    // Calculate batch index based on drawnCount
    const currentPrize = prizes[prizeIndex]
    let batchIndex = 0

    if (currentPrize && currentPrize.drawnCount > 0) {
      switch (currentPrize.drawConfig.mode) {
        case 'one-by-one':
          // Each draw = 1 winner, so batchIndex = drawnCount
          batchIndex = currentPrize.drawnCount
          break
        case 'batch': {
          // Calculate which batch we're on based on drawnCount
          const batches = currentPrize.drawConfig.batches || []
          let accumulated = 0
          for (let i = 0; i < batches.length; i++) {
            accumulated += batches[i]
            if (accumulated > currentPrize.drawnCount) {
              batchIndex = i
              break
            }
            if (accumulated === currentPrize.drawnCount) {
              batchIndex = i + 1 // Completed this batch, move to next
              break
            }
          }
          break
        }
        case 'all-at-once':
          // Only 1 batch, if drawnCount > 0, we're done
          batchIndex = currentPrize.drawnCount > 0 ? 1 : 0
          break
      }
    }

    console.log('[DrawScreen] Initializing progress:', { prizeIndex, batchIndex, drawnCount: currentPrize?.drawnCount })
    init(prizeIndex, batchIndex)
  }, [loading, prizes, init])

  // Reset reveal state when winners change
  useEffect(() => {
    setRevealedCount(0)
    revealCompleteCalledRef.current = false
  }, [winners.length])

  /**
   * FIX (Rev 12): Optimized reveal animation
   * - Only animate cards on the FIRST PAGE (visible cards)
   * - Cards on other pages are revealed instantly
   * - This reduces 50 re-renders to just 10 (cardsPerPage)
   * - Animation completes much faster: 10 × 200ms = 2 seconds vs 50 × 200ms = 10 seconds
   */
  useEffect(() => {
    if (state !== 'revealing' || winners.length === 0) {
      return
    }

    // Only animate up to cardsPerPage (first visible page)
    const animateCount = Math.min(winners.length, cardsPerPage)
    console.log('[DrawScreen] Starting reveal animation for', animateCount, 'visible cards (total:', winners.length, ')')
    revealCompleteCalledRef.current = false
    let currentCount = 0

    const revealInterval = setInterval(() => {
      currentCount++
      setRevealedCount(currentCount)

      if (currentCount >= animateCount) {
        clearInterval(revealInterval)
        // Immediately reveal all remaining cards (for other pages)
        setRevealedCount(winners.length)

        // Quick transition to reviewing state
        setTimeout(() => {
          if (!revealCompleteCalledRef.current) {
            revealCompleteCalledRef.current = true
            console.log('[DrawScreen] Animation complete, calling revealComplete')
            revealComplete()
          }
        }, 300)
      }
    }, 150) // Faster animation: 150ms between each card

    return () => clearInterval(revealInterval)
  }, [state, winners.length, cardsPerPage, revealComplete])

  // When in reviewing state, show all cards
  const effectiveRevealedCount = state === 'reviewing' ? winners.length : revealedCount

  // Calculate progress text based on draw mode
  const getProgressText = useCallback(() => {
    if (!currentPrize) return ''

    const totalDraws = calculateTotalDraws(currentPrize)

    switch (currentPrize.drawConfig.mode) {
      case 'one-by-one':
        return `Draw ${currentBatchIndex + 1}/${totalDraws}`
      case 'batch':
        return `Batch ${currentBatchIndex + 1}/${totalDraws}`
      case 'all-at-once':
        return `Drawing ${currentPrize.quantity - currentPrize.drawnCount} winners`
      default:
        return ''
    }
  }, [currentPrize, currentBatchIndex, calculateTotalDraws])

  // Handle back navigation - go to event detail, not wizard
  const handleBack = useCallback(() => {
    if (eventId) {
      navigate(`/event/${eventId}`)
    } else {
      navigate('/')
    }
  }, [navigate, eventId])

  // Handle start draw
  const handleStart = useCallback(async () => {
    console.log('[DrawScreen] handleStart called, state:', state)
    // Update event status to 'in_progress' if still draft or ready
    if (event && (event.status === 'draft' || event.status === 'ready')) {
      try {
        await eventRepository.update(eventId!, { status: 'in_progress' })
        setEvent({ ...event, status: 'in_progress' })
      } catch (error) {
        console.error('[DrawScreen] Failed to update event status:', error)
      }
    }
    start()
  }, [event, eventId, start, state])

  // Handle stop and draw
  const handleStop = useCallback(async () => {
    console.log('[DrawScreen] handleStop called, state:', state)
    if (!eventId || !currentPrize) return

    // Calculate how many to draw based on draw mode
    const drawQuantity = getDrawQuantity(currentPrize)

    await stop(eventId, currentPrize.id, drawQuantity)

    // Trigger confetti after revealing starts
    setTimeout(() => {
      fireConfettiBurst()
      setShowConfetti(true)
    }, 1000)
  }, [eventId, currentPrize, stop, getDrawQuantity, state])

  // Handle cancel winner
  const handleCancel = useCallback(
    async (winnerId: string) => {
      await cancel(winnerId)
    },
    [cancel]
  )

  // Handle redraw all
  // FIX (Rev 13): Add loading state and guard to prevent double-clicks
  const handleRedrawAll = useCallback(async () => {
    if (!currentPrize || isRedrawing) return

    setIsRedrawing(true)
    try {
      await redrawAll(currentPrize.id)
    } finally {
      setIsRedrawing(false)
    }
  }, [currentPrize, redrawAll, isRedrawing])

  // Handle confirm
  // FIX (Rev 13): Add loading state guard and simplify flow
  const handleConfirm = useCallback(async () => {
    console.log('[DrawScreen] handleConfirm called, state:', state, 'isConfirming:', isConfirming)

    // Guard against double-clicks
    if (isConfirming || isRedrawing) {
      console.warn('[DrawScreen] handleConfirm blocked - already processing')
      return
    }

    // Only allow from reviewing state
    if (state !== 'reviewing') {
      console.warn('[DrawScreen] handleConfirm blocked - invalid state:', state)
      return
    }

    if (!currentPrize || !eventId) return

    setIsConfirming(true)

    try {
      await confirm(currentPrize.id)
      console.log('[DrawScreen] confirm succeeded')

      // FIX (Rev 12): Invalidate winners cache so History page shows updated data
      queryClient.invalidateQueries({ queryKey: winnerKeys.list(eventId) })
      queryClient.invalidateQueries({ queryKey: winnerKeys.grouped(eventId) })
      queryClient.invalidateQueries({ queryKey: winnerKeys.count(eventId) })
      console.log('[DrawScreen] Winners cache invalidated')

      // Refresh prize data to get updated drawnCount
      const updatedPrizes = await prizeRepository.getByEventId(eventId)
      setPrizes(updatedPrizes)

      // Get the updated prize
      const updatedPrize = updatedPrizes.find((p) => p.id === currentPrize.id)

      // Check if this prize needs more draws
      if (updatedPrize) {
        const totalDraws = calculateTotalDraws(updatedPrize)
        const hasMoreDraws = currentBatchIndex + 1 < totalDraws

        if (hasMoreDraws) {
          // More draws needed for this prize
          nextBatch()
          return
        }
      }

      // Prize is complete, check if more prizes
      if (currentPrizeIndex < prizes.length - 1) {
        nextPrize()
      } else {
        // All prizes complete - update event status to 'completed'
        try {
          await eventRepository.update(eventId, { status: 'completed' })
        } catch (error) {
          console.error('[DrawScreen] Failed to update event status:', error)
        }
        // Navigate to history
        navigate(`/event/${eventId}/history`)
      }
    } catch (error) {
      // Confirm failed - likely due to cancelled winners that need redraw
      console.error('[DrawScreen] Confirm failed:', error)
    } finally {
      setIsConfirming(false)
    }
  }, [currentPrize, eventId, currentPrizeIndex, currentBatchIndex, prizes.length, confirm, nextPrize, nextBatch, calculateTotalDraws, navigate, state, queryClient, isConfirming, isRedrawing])

  // Handle prize click in panel
  const handlePrizeClick = useCallback((prizeId: string) => {
    const prize = prizes.find((p) => p.id === prizeId)
    if (prize) {
      setSelectedPrizeForModal(prize)
    }
  }, [prizes])

  // Computed: should show winner cards
  const showWinners = state === 'revealing' || state === 'reviewing'

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

      {/* Floating Back Button - top left */}
      <button
        onClick={handleBack}
        className="fixed top-4 left-4 z-50 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-[#e2e8f0] hover:bg-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-[#64748b]" />
      </button>

      {/* Floating Drawing Progress - top center */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div className="px-6 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-[#e2e8f0]">
          <p className="text-sm font-medium text-[#0a2540] text-center">
            Drawing: <span className="text-[#635bff]">{currentPrize?.name || 'Loading...'}</span>
          </p>
          <p className="text-xs text-center text-[#64748b]">{getProgressText()}</p>
        </div>
      </div>

      {/* Floating Prize Panel */}
      <PrizePanel
        isOpen={isPanelOpen}
        onToggle={() => setIsPanelOpen(!isPanelOpen)}
        prizes={prizes}
        currentPrizeIndex={currentPrizeIndex}
        onPrizeClick={handlePrizeClick}
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
        {showWinners && (
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
              revealedCount={effectiveRevealedCount}
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
              revealedCount={effectiveRevealedCount}
            />
          </div>
        )}
      </div>

      {/* Floating Controls */}
      <DrawControls
        status={state}
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
        isRedrawing={isRedrawing}
        isConfirming={isConfirming}
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
