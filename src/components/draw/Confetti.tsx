/**
 * @file components/draw/Confetti.tsx
 * @description Confetti effect for winner celebration
 *
 * FIX (Rev 19): Optimized for performance
 * FIX (Rev 20): Config moved to dedicated file (src/config/confettiConfig.ts)
 */

import { useEffect, useCallback, useRef } from 'react'
import confetti from 'canvas-confetti'
import { confettiConfig } from '@/config/confettiConfig'

interface ConfettiProps {
  trigger: boolean
  onComplete?: () => void
}

export function Confetti({ trigger, onComplete }: ConfettiProps) {
  const intervalRef = useRef<number | null>(null)

  const fireConfetti = useCallback(() => {
    const {
      continuousDuration,
      continuousInterval,
      continuousParticleCount,
      spread,
      startVelocity,
      decay,
      ticks,
      colors,
    } = confettiConfig

    const end = Date.now() + continuousDuration

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    intervalRef.current = window.setInterval(() => {
      if (Date.now() >= end) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        onComplete?.()
        return
      }

      // Left side burst
      confetti({
        particleCount: continuousParticleCount,
        angle: 60,
        spread,
        origin: { x: 0, y: 0.6 },
        colors,
        ticks,
        startVelocity,
        decay,
      })

      // Right side burst
      confetti({
        particleCount: continuousParticleCount,
        angle: 120,
        spread,
        origin: { x: 1, y: 0.6 },
        colors,
        ticks,
        startVelocity,
        decay,
      })
    }, continuousInterval)
  }, [onComplete])

  useEffect(() => {
    if (trigger) {
      fireConfetti()
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [trigger, fireConfetti])

  return null
}

/**
 * Fire a single burst of confetti from center
 * Uses burst-specific config values
 */
export function fireConfettiBurst() {
  const {
    burstParticleCount,
    burstSpread,
    burstStartVelocity,
    burstTicks,
    decay,
    colors,
  } = confettiConfig

  confetti({
    particleCount: burstParticleCount,
    spread: burstSpread,
    origin: { x: 0.5, y: 0.5 },
    colors,
    ticks: burstTicks,
    startVelocity: burstStartVelocity,
    decay,
  })
}

export default Confetti
