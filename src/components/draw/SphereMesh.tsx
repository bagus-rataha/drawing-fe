/**
 * @file components/draw/SphereMesh.tsx
 * @description 3D sphere mesh with instanced cards for high performance
 * Uses InstancedCards for 1 draw call instead of 500+ individual meshes
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { InstancedCards } from './InstancedCards'
import { SPHERE_CONFIG } from '@/utils/constants'
import type { CouponForAtlas } from '@/utils/textureAtlas'
import type { WinnerDisplayMode } from '@/types'

interface SphereMeshProps {
  isSpinning: boolean
  isIdle: boolean
  coupons: CouponForAtlas[]
  displayMode: WinnerDisplayMode
}

export function SphereMesh({ isSpinning, isIdle, coupons, displayMode }: SphereMeshProps) {
  const groupRef = useRef<THREE.Group>(null)

  // Animation loop - Y-axis rotation only
  useFrame((_state, delta) => {
    if (!groupRef.current) return

    if (isSpinning) {
      // Fast horizontal rotation during draw
      groupRef.current.rotation.y += delta * SPHERE_CONFIG.spinSpeed
    } else if (isIdle) {
      // Slow horizontal rotation when idle
      groupRef.current.rotation.y += delta * SPHERE_CONFIG.idleSpeed
    }
    // When stopped (not spinning, not idle): no rotation - instant stop
  })

  return (
    <group ref={groupRef}>
      <InstancedCards
        count={SPHERE_CONFIG.cardCount}
        radius={SPHERE_CONFIG.radius}
        rows={SPHERE_CONFIG.rows}
        cardWidth={SPHERE_CONFIG.cardWidth}
        cardHeight={SPHERE_CONFIG.cardHeight}
        cardColor={SPHERE_CONFIG.cardColor}
        coupons={coupons}
        displayMode={displayMode}
      />
    </group>
  )
}

export default SphereMesh
