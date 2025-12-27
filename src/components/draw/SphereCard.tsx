/**
 * @file components/draw/SphereCard.tsx
 * @description Individual card displayed on the 3D sphere surface with random text cycling
 */

import { useMemo, useState, useEffect, useRef } from 'react'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import type { Coupon, WinnerDisplayMode } from '@/types'

interface SphereCardProps {
  position: THREE.Vector3
  allCoupons: (Coupon & { participantName?: string })[]
  displayMode: WinnerDisplayMode
  cardIndex: number
}

// Card dimensions - portrait style (height > width)
// Smaller size for denser display (500 cards)
const CARD_WIDTH = 0.28
const CARD_HEIGHT = 0.42

export function SphereCard({ position, allCoupons, displayMode }: SphereCardProps) {
  // Random coupon for display - cycles through coupons
  const [currentCouponIndex, setCurrentCouponIndex] = useState(() =>
    Math.floor(Math.random() * Math.max(allCoupons.length, 1))
  )

  // Dynamic opacity - changes when coupon changes
  const [opacity, setOpacity] = useState(() => 0.3 + Math.random() * 0.5)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Random text cycling effect
  useEffect(() => {
    if (allCoupons.length <= 1) return

    // Random start delay per card (0-5 seconds)
    const startDelay = Math.random() * 5000

    const startTimer = setTimeout(() => {
      const changeText = () => {
        setCurrentCouponIndex(Math.floor(Math.random() * allCoupons.length))
        // Update opacity when text changes
        setOpacity(0.3 + Math.random() * 0.5)

        // Schedule next change with random interval (2-10 seconds)
        const nextInterval = 2000 + Math.random() * 8000
        timeoutRef.current = setTimeout(changeText, nextInterval)
      }

      changeText()
    }, startDelay)

    return () => {
      clearTimeout(startTimer)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [allCoupons.length])

  const currentCoupon = allCoupons[currentCouponIndex] || allCoupons[0]

  // Calculate rotation to face outward from sphere center
  const rotation = useMemo(() => {
    const euler = new THREE.Euler()
    const direction = position.clone().normalize()

    // Calculate rotation to make card face outward
    const up = new THREE.Vector3(0, 1, 0)
    const quaternion = new THREE.Quaternion()
    const matrix = new THREE.Matrix4()

    matrix.lookAt(new THREE.Vector3(0, 0, 0), direction, up)
    quaternion.setFromRotationMatrix(matrix)
    euler.setFromQuaternion(quaternion)

    // Flip to face outward
    euler.y += Math.PI

    return euler
  }, [position])

  const getDisplayText = () => {
    if (!currentCoupon) return ''

    switch (displayMode) {
      case 'coupon-only':
        return currentCoupon.id
      case 'coupon-participant-id':
        return `${currentCoupon.id}\n${currentCoupon.participantId}`
      case 'coupon-participant-name':
        return `${currentCoupon.id}\n${currentCoupon.participantName || currentCoupon.participantId}`
      default:
        return currentCoupon.id
    }
  }

  return (
    <group position={position} rotation={rotation}>
      {/* Card background - transparent pink with dynamic opacity */}
      <mesh>
        <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
        <meshBasicMaterial
          color="#e8b4c8"
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Card text */}
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.05}
        color="#0a2540"
        anchorX="center"
        anchorY="middle"
        maxWidth={CARD_WIDTH - 0.03}
        textAlign="center"
      >
        {getDisplayText()}
      </Text>
    </group>
  )
}

export default SphereCard
