/**
 * @file components/draw/Confetti.tsx
 * @description Confetti effect for winner celebration
 */

import { useEffect, useCallback } from 'react'
import confetti from 'canvas-confetti'

interface ConfettiProps {
  trigger: boolean
  onComplete?: () => void
}

export function Confetti({ trigger, onComplete }: ConfettiProps) {
  const fireConfetti = useCallback(() => {
    const duration = 3000
    const end = Date.now() + duration

    const colors = ['#635bff', '#524acc', '#ffd700', '#ff6b6b', '#4ecdc4']

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
      })

      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      } else {
        onComplete?.()
      }
    }

    frame()
  }, [onComplete])

  useEffect(() => {
    if (trigger) {
      fireConfetti()
    }
  }, [trigger, fireConfetti])

  return null
}

/**
 * Fire a single burst of confetti
 */
export function fireConfettiBurst() {
  const colors = ['#635bff', '#524acc', '#ffd700', '#ff6b6b', '#4ecdc4']

  confetti({
    particleCount: 100,
    spread: 70,
    origin: { x: 0.5, y: 0.5 },
    colors,
  })
}

export default Confetti
