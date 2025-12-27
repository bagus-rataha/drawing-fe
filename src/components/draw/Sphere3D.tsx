/**
 * @file components/draw/Sphere3D.tsx
 * @description Three.js canvas container for the lottery sphere
 */

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { SphereMesh } from './SphereMesh'
import { SPHERE_CONFIG } from '@/utils/constants'
import type { CouponForAtlas } from '@/utils/textureAtlas'
import type { WinnerDisplayMode } from '@/types'

interface Sphere3DProps {
  isSpinning: boolean
  isIdle: boolean
  coupons: CouponForAtlas[]
  displayMode: WinnerDisplayMode
}

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[6, 32, 32]} />
      <meshBasicMaterial color="#635bff" opacity={0.1} transparent />
    </mesh>
  )
}

export function Sphere3D({ isSpinning, isIdle, coupons, displayMode }: Sphere3DProps) {
  return (
    <div className="w-[700px] h-[700px]">
      <Canvas camera={{ position: [0, 0, 14], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />

        <Suspense fallback={<LoadingFallback />}>
          <SphereMesh
            isSpinning={isSpinning}
            isIdle={isIdle}
            coupons={coupons}
            displayMode={displayMode}
          />
        </Suspense>

        {/* Zoom controls - scroll to zoom in/out, no pan/rotate (sphere auto-rotates) */}
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          enableRotate={false}
          minDistance={SPHERE_CONFIG.zoomMin}
          maxDistance={SPHERE_CONFIG.zoomMax}
          zoomSpeed={SPHERE_CONFIG.zoomSpeed}
        />
      </Canvas>
    </div>
  )
}

export default Sphere3D
