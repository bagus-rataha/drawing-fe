/**
 * @file components/draw/Confetti.tsx
 * @description Confetti effect for winner celebration
 *
 * FIX (Rev 19): Optimized for performance
 * - Use setInterval instead of requestAnimationFrame
 * - Reduced particle count and duration
 * - Added ticks limit for particle lifetime
 */

import { useEffect, useCallback, useRef } from 'react'
import confetti from 'canvas-confetti'

interface ConfettiProps {
  trigger: boolean
  onComplete?: () => void
}

// Shared colors for all confetti effects
const CONFETTI_COLORS = ['#635bff', '#524acc', '#ffd700', '#ff6b6b', '#4ecdc4']

// FIX (Rev 19): Performance-optimized config
const CONFETTI_CONFIG = {
  duration: 2000,        // Total duration in ms (reduced from 3000)
  interval: 50,         // Fire every 120ms instead of every frame (~8fps vs 60fps)
  particleCount: 3,      // Particles per burst per side (reduced from 3)
  ticks: 200,            // Particle lifetime - shorter = less lag
  spread: 100,
  startVelocity: 30,
  decay: 0.94,
}

export function Confetti({ trigger, onComplete }: ConfettiProps) {
  const intervalRef = useRef<number | null>(null)

  const fireConfetti = useCallback(() => {
    const { duration, interval, particleCount, ticks, spread, startVelocity, decay } = CONFETTI_CONFIG
    const end = Date.now() + duration

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
        particleCount,
        angle: 60,
        spread,
        origin: { x: 0, y: 0.6 },
        colors: CONFETTI_COLORS,
        ticks,
        startVelocity,
        decay,
      })

      // Right side burst
      confetti({
        particleCount,
        angle: 120,
        spread,
        origin: { x: 1, y: 0.6 },
        colors: CONFETTI_COLORS,
        ticks,
        startVelocity,
        decay,
      })
    }, interval)
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
 * Fire a single burst of confetti
 * FIX (Rev 19): Reduced particle count for better performance
 */
export function fireConfettiBurst() {
  confetti({
    particleCount: 50,  // Reduced from 100
    spread: 70,
    origin: { x: 0.5, y: 0.5 },
    colors: CONFETTI_COLORS,
    ticks: 150,
    startVelocity: 35,
    decay: 0.94,
  })
}

export default Confetti
