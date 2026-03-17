/**
 * @file pages/DrawScreen.tsx
 * @description Main draw screen with animation and overlay winner cards
 *
 * Uses backend Drawing API for all state management.
 * Supports sphere and randomize animation types.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trophy } from 'lucide-react'
import { getEvent } from '@/services/api/eventApi'
import { getPrizesByEvent } from '@/services/api/prizeApi'
import { getDrawingStatus, getAnimationCoupons } from '@/services/api/drawingApi'
import type { EventResponse, PrizesListResponse, DrawingStatusResponse, AnimationCouponResponse, WinnerResponse } from '@/types/api'
import type { Prize, WinnerDisplayMode } from '@/types'
import { useDrawState } from '@/hooks/useDrawState'
import type { DrawResultWithId } from '@/hooks/useDrawState'
import { winnerKeys } from '@/hooks/useWinners'
import { PrizePanel } from '@/components/draw/PrizePanel'
import { Sphere3D } from '@/components/draw/Sphere3D'
import { RandomizeAnimation } from '@/components/draw/RandomizeAnimation'
import { WinnerGallery } from '@/components/draw/WinnerGallery'
import { DrawControls } from '@/components/draw/DrawControls'
import { PrizeWinnersModal } from '@/components/draw/PrizeWinnersModal'
import { Confetti, fireConfettiBurst } from '@/components/draw/Confetti'
import { SPHERE_CONFIG } from '@/utils/constants'
import { resolveImageUrl } from '@/utils/helpers'

// Default grid configuration
const DEFAULT_GRID = {
  gridX: 5,
  gridY: 2,
}

/**
 * Map a WinnerResponse from backend to frontend DrawResultWithId
 */
function mapWinnerResponseToDrawResult(w: WinnerResponse, slot: number): DrawResultWithId {
  return {
    id: w.id,
    lineNumber: w.line_number || slot,
    participantId: w.coupon?.participant?.id || '',
    participantName: w.coupon?.participant?.name,
    couponId: w.coupon?.id || '',
    couponIdentifier: w.coupon?.coupon_import_identifier,
    participantImportId: w.coupon?.participant?.participant_import_identifier,
    status: w.status === 'active' ? 'valid' : 'cancelled',
    cancelReason: w.cancel_reason
      ? { type: 'manual' as const, message: w.cancel_reason }
      : undefined,
  }
}

/**
 * Process current_batch_draw from backend: filter active + last void per slot
 * Per spec: current_batch_draw can have more records than slots (multiple voids per slot)
 */
function processCurrentBatchDraw(status: DrawingStatusResponse): DrawResultWithId[] {
  const { current_batch_draw, empty_slots, total_batch_winner } = status
  const totalSlots = total_batch_winner + empty_slots.length

  const activeWinners = current_batch_draw.filter((w) => w.status === 'active')
  const voidWinners = current_batch_draw.filter((w) => w.status === 'void')

  const result: DrawResultWithId[] = []
  for (let slot = 1; slot <= totalSlots; slot++) {
    const active = activeWinners.find((w) => w.line_number === slot)
    if (active) {
      result.push(mapWinnerResponseToDrawResult(active, slot))
    } else {
      // Get the LAST void for this slot (per spec: show latest void)
      const voidsInSlot = voidWinners.filter((w) => w.line_number === slot)
      const lastVoid = voidsInSlot[voidsInSlot.length - 1]
      if (lastVoid) {
        result.push(mapWinnerResponseToDrawResult(lastVoid, slot))
      }
    }
  }
  return result
}

/**
 * Map API PrizesListResponse to local Prize type for components that need it
 */
function mapApiPrizeToLocal(p: PrizesListResponse): Prize {
  return {
    id: p.id,
    eventId: '',
    name: p.name,
    image: resolveImageUrl(p.prize_image),
    backgroundImage: resolveImageUrl(p.background_image),
    quantity: p.quantity,
    sequence: p.sequence,
    drawnCount: p.winners?.filter(w => w.status === 'active' && w.confirmed_at).length || 0,
    drawConfig: {
      mode: 'batch',
      batches: [p.batch_number],
    },
  }
}

export function DrawScreen() {
  const { id: eventId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Data state
  const [event, setEvent] = useState<EventResponse | null>(null)
  const [prizes, setPrizes] = useState<PrizesListResponse[]>([])
  const [drawingStatus, setDrawingStatus] = useState<DrawingStatusResponse | null>(null)
  const [animationCoupons, setAnimationCoupons] = useState<AnimationCouponResponse[]>([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [selectedPrizeForModal, setSelectedPrizeForModal] = useState<Prize | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isEventComplete, setIsEventComplete] = useState(false)

  // Loading states to prevent double-clicks
  const [isRedrawing] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  // Reveal animation state
  const [revealedCount, setRevealedCount] = useState(0)
  const revealCompleteCalledRef = useRef(false)

  // Draw state
  const drawState = useDrawState()
  const {
    state,
    winners,
    currentPage,
    redrawPositions,
    isSpinning,
    isIdle,
    validCount,
    start,
    stop,
    revealComplete,
    cancel,
    confirm,
    resetToIdle,
    setCurrentPage,
    restoreWinners,
  } = drawState

  // Derive current prize from drawing status sequence
  const currentPrizeIndex = useMemo(() => {
    if (!drawingStatus || prizes.length === 0) return 0
    // sequence is 1-based, find prize with matching sequence
    const idx = prizes.findIndex((p) => p.sequence === drawingStatus.sequence)
    return idx >= 0 ? idx : 0
  }, [drawingStatus, prizes])

  const currentPrize = prizes[currentPrizeIndex] || null

  // Animation type from event
  const animationType = event?.animation_type || 'sphere'

  // Display mode from event settings
  const displayMode: WinnerDisplayMode = event?.winner_display || 'coupon'

  // Check if current prize is complete
  const isPrizeComplete = drawingStatus
    ? drawingStatus.total_remaining_winner === 0 && drawingStatus.empty_slots.length === 0
    : false

  // Grid config
  const gridX = DEFAULT_GRID.gridX
  const gridY = DEFAULT_GRID.gridY

  // Background image from current prize
  const currentApiPrize = prizes[currentPrizeIndex] || null
  const backgroundImage = resolveImageUrl(currentApiPrize?.background_image)

  // Calculate pagination
  const cardsPerPage = gridX * gridY
  const totalPages = Math.max(1, Math.ceil(winners.length / cardsPerPage))

  // Map animation coupons for sphere display
  const couponsForSphere = useMemo(() => {
    return animationCoupons.map((c, i) => ({
      id: c.coupon_import_identifier || `coupon-${i}`,
      participantId: c.participant_import_identifier,
      participantName: c.participant_name,
    }))
  }, [animationCoupons])

  // Local prizes for PrizePanel (needs Prize type)
  const localPrizes = useMemo(() => prizes.map(mapApiPrizeToLocal), [prizes])

  // Fetch drawing status helper
  const fetchDrawingStatus = useCallback(async () => {
    if (!eventId) return null
    try {
      const status = await getDrawingStatus(eventId)
      setDrawingStatus(status)
      return status
    } catch (error) {
      console.error('[DrawScreen] Failed to fetch drawing status:', error)
      return null
    }
  }, [eventId])

  // Load initial data
  useEffect(() => {
    if (!eventId) return

    const loadData = async () => {
      setLoading(true)
      try {
        // Always load event and prizes first
        const [eventData, prizesData] = await Promise.all([
          getEvent(eventId),
          getPrizesByEvent(eventId),
        ])
        setEvent(eventData)
        setPrizes(prizesData)

        // Show completion screen for completed events (backend may return 'complete' or 'completed')
        if (eventData.status === 'completed' || eventData.status === 'complete') {
          setIsEventComplete(true)
          setLoading(false)
          return
        }

        // Drawing status and coupons may fail for draft events (not started yet)
        try {
          const [statusData, couponsData] = await Promise.all([
            getDrawingStatus(eventId),
            getAnimationCoupons(eventId),
          ])
          setDrawingStatus(statusData)
          setAnimationCoupons(couponsData)

          // Browser refresh recovery: process current_batch_draw with proper filtering
          if (statusData.current_batch_draw && statusData.current_batch_draw.length > 0) {
            const hasUnconfirmedWinners = statusData.current_batch_draw.some(
              (w) => w.status === 'active' && !w.confirmed_at
            )
            if (hasUnconfirmedWinners) {
              const processedWinners = processCurrentBatchDraw(statusData)
              if (processedWinners.length > 0) {
                restoreWinners(processedWinners)
              }
            }
          }

          // If event is complete, show completion screen
          if (statusData.event_status === 'complete') {
            setIsEventComplete(true)
            setLoading(false)
            return
          }
        } catch (drawError) {
          console.error('[DrawScreen] Drawing status not available (event may not be started yet):', drawError)
        }
      } catch (error) {
        console.error('[DrawScreen] Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [eventId, navigate, restoreWinners])

  // Reset reveal state when entering revealing or when winners change
  useEffect(() => {
    if (state === 'revealing') {
      setRevealedCount(0)
      revealCompleteCalledRef.current = false
    }
  }, [state])

  // Reveal animation effect
  useEffect(() => {
    if (state !== 'revealing' || winners.length === 0) return

    // For randomize animation, skip reveal timer — cards swap instantly
    if (animationType === 'randomize') {
      setRevealedCount(winners.length)
      revealCompleteCalledRef.current = true
      revealComplete()
      return
    }

    const { revealInterval: interval, revealCompleteDelay } = SPHERE_CONFIG.animation
    const isRedraw = redrawPositions.length > 0

    if (isRedraw) {
      setRevealedCount(winners.length)
      revealCompleteCalledRef.current = false

      let currentIndex = 0
      const redrawCount = redrawPositions.length

      const redrawIntervalId = setInterval(() => {
        currentIndex++
        if (currentIndex >= redrawCount) {
          clearInterval(redrawIntervalId)
          setTimeout(() => {
            if (!revealCompleteCalledRef.current) {
              revealCompleteCalledRef.current = true
              revealComplete()
            }
          }, revealCompleteDelay)
        }
      }, interval)

      return () => clearInterval(redrawIntervalId)
    } else {
      const animateCount = Math.min(winners.length, cardsPerPage)
      revealCompleteCalledRef.current = false
      let currentCount = 0

      const revealIntervalId = setInterval(() => {
        currentCount++
        setRevealedCount(currentCount)

        if (currentCount >= animateCount) {
          clearInterval(revealIntervalId)
          setRevealedCount(winners.length)

          setTimeout(() => {
            if (!revealCompleteCalledRef.current) {
              revealCompleteCalledRef.current = true
              revealComplete()
            }
          }, revealCompleteDelay)
        }
      }, interval)

      return () => clearInterval(revealIntervalId)
    }
  }, [state, winners.length, cardsPerPage, revealComplete, redrawPositions])

  const effectiveRevealedCount = state === 'reviewing' ? winners.length : revealedCount

  // Progress text from drawing status
  const getProgressText = useCallback(() => {
    if (!drawingStatus || !currentPrize) return ''
    return `Batch ${drawingStatus.current_batch}/${drawingStatus.total_batch}`
  }, [drawingStatus, currentPrize])

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (eventId) {
      navigate(`/events/${eventId}`)
    } else {
      navigate('/')
    }
  }, [navigate, eventId])

  // Handle start draw
  const handleStart = useCallback(async () => {
    if (!eventId || !event) return

    // Refresh animation coupons before each draw
    try {
      const coupons = await getAnimationCoupons(eventId)
      setAnimationCoupons(coupons)
    } catch (error) {
      console.error('[DrawScreen] Failed to refresh animation coupons:', error)
    }

    start()
  }, [event, eventId, start])

  // Handle stop and draw
  const handleStop = useCallback(async () => {
    if (!eventId) return

    await stop(eventId)

    // Refetch status so empty_slots reflects the draw result
    await fetchDrawingStatus()

    setTimeout(() => {
      fireConfettiBurst()
      setShowConfetti(true)
    }, SPHERE_CONFIG.animation.confettiDelay)
  }, [eventId, stop, fetchDrawingStatus])

  // Handle cancel winner — per spec: cancel → GET /current-status → render with filter
  const handleCancel = useCallback(
    async (winnerId: string, reason?: string) => {
      if (!eventId) return
      await cancel(eventId, winnerId, reason || 'Dibatalkan oleh admin')

      // Refetch current-status after cancel (per spec)
      const newStatus = await fetchDrawingStatus()
      if (newStatus) {
        const processedWinners = processCurrentBatchDraw(newStatus)
        restoreWinners(processedWinners)
      }
    },
    [eventId, cancel, fetchDrawingStatus, restoreWinners]
  )

  // Handle redraw all — start spinning animation (same as handleStart)
  // When user clicks Stop, handleStop → stop() detects redraw and dispatches REDRAW_COMPLETE
  const handleRedrawAll = useCallback(async () => {
    if (!eventId || !event) return

    // Refresh animation coupons before redraw
    try {
      const coupons = await getAnimationCoupons(eventId)
      setAnimationCoupons(coupons)
    } catch (error) {
      console.error('[DrawScreen] Failed to refresh animation coupons:', error)
    }

    start()
  }, [event, eventId, start])

  // Handle confirm
  const handleConfirm = useCallback(async () => {
    if (isConfirming || isRedrawing || state !== 'reviewing' || !eventId) return

    setIsConfirming(true)

    try {
      await confirm(eventId)

      // Invalidate winners cache
      queryClient.invalidateQueries({ queryKey: winnerKeys.list(eventId) })
      queryClient.invalidateQueries({ queryKey: winnerKeys.grouped(eventId) })
      queryClient.invalidateQueries({ queryKey: winnerKeys.count(eventId) })

      // Refetch drawing status and event to detect completion
      const [newStatus, updatedEvent, updatedPrizes] = await Promise.all([
        fetchDrawingStatus(),
        getEvent(eventId),
        getPrizesByEvent(eventId),
      ])
      setEvent(updatedEvent)
      setPrizes(updatedPrizes)

      // Check completion from either drawing status or event status
      const isComplete =
        newStatus?.event_status === 'complete' ||
        updatedEvent.status === 'complete' ||
        updatedEvent.status === 'completed'

      if (isComplete) {
        // All prizes done — show completion screen
        setIsEventComplete(true)
      } else {
        // Reset to idle for next batch/prize
        resetToIdle()

        // Refresh animation coupons for next draw
        try {
          const coupons = await getAnimationCoupons(eventId)
          setAnimationCoupons(coupons)
        } catch {
          // non-critical
        }
      }
    } catch (error) {
      console.error('[DrawScreen] Confirm failed:', error)
    } finally {
      setIsConfirming(false)
    }
  }, [eventId, state, confirm, fetchDrawingStatus, resetToIdle, navigate, queryClient, isConfirming, isRedrawing])

  // Handle prize click in panel
  const handlePrizeClick = useCallback((prizeId: string) => {
    const prize = localPrizes.find((p) => p.id === prizeId)
    if (prize) {
      setSelectedPrizeForModal(prize)
    }
  }, [localPrizes])

  // Should show winner cards
  const showWinners = state === 'revealing' || state === 'reviewing'

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f9fc] flex items-center justify-center">
        <div className="text-[#64748b]">Loading...</div>
      </div>
    )
  }

  if (isEventComplete) {
    return (
      <div className="min-h-screen bg-[#f6f9fc] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#0a2540] mb-2">
            Drawing Complete
          </h1>
          <p className="text-[#64748b] mb-8">
            Event <span className="font-medium text-[#0a2540]">{event?.name}</span> has finished.
            All prizes have been drawn successfully.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to={`/history/${eventId}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#635bff] text-white font-medium rounded-xl hover:bg-[#524acc] transition-colors"
            >
              <Trophy className="w-4 h-4" />
              View Draw Results
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-[#64748b] font-medium rounded-xl hover:bg-[#e2e8f0] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Events
            </Link>
          </div>
        </div>
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
      {backgroundImage && <div className="absolute inset-0 bg-black/20 pointer-events-none" />}

      {/* Confetti */}
      <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Floating Back Button */}
      <button
        onClick={handleBack}
        className="fixed top-4 left-4 z-50 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-[#e2e8f0] hover:bg-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-[#64748b]" />
      </button>

      {/* Floating Drawing Progress */}
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
        prizes={localPrizes}
        currentPrizeIndex={currentPrizeIndex}
        onPrizeClick={handlePrizeClick}
      />

      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Animation Layer */}
        <div className="absolute inset-0 flex items-center justify-center">
          {animationType === 'randomize' ? (
            <RandomizeAnimation
              isSpinning={isSpinning || state === 'drawing'}
              isIdle={isIdle}
              slotCount={drawingStatus ? drawingStatus.total_batch_winner + drawingStatus.empty_slots.length : 0}
              coupons={animationCoupons}
              winners={winners}
              showResults={showWinners}
              displayMode={displayMode}
              onCancel={handleCancel}
              state={state}
            />
          ) : (
            <Sphere3D
              isSpinning={isSpinning || state === 'drawing'}
              isIdle={isIdle}
              coupons={couponsForSphere}
              displayMode={displayMode}
            />
          )}
        </div>

        {/* Winner Cards Layer - only for sphere mode */}
        {showWinners && animationType !== 'randomize' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 pointer-events-none">
            <WinnerGallery
              row="top"
              winners={winners}
              displayMode={displayMode}
              gridX={gridX}
              gridY={gridY}
              currentPage={currentPage}
              onCancel={handleCancel}
              revealedCount={effectiveRevealedCount}
              redrawPositions={redrawPositions}
            />
            <WinnerGallery
              row="bottom"
              winners={winners}
              displayMode={displayMode}
              gridX={gridX}
              gridY={gridY}
              currentPage={currentPage}
              onCancel={handleCancel}
              revealedCount={effectiveRevealedCount}
              redrawPositions={redrawPositions}
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
        hasCancelled={drawingStatus ? drawingStatus.empty_slots.length > 0 : false}
        validCount={validCount}
        totalCount={winners.length}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        isRedrawing={isRedrawing}
        isConfirming={isConfirming}
        isPrizeComplete={isPrizeComplete}
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
