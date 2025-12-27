/**
 * @file components/draw/InstancedCards.tsx
 * @description High-performance instanced mesh for sphere cards with texture atlas
 *
 * Uses InstancedMesh for 1 draw call instead of 500+ individual meshes.
 * Text is rendered via texture atlas with UV switching for card changes.
 * Fixed memory management using refs for stable array references.
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SPHERE_CONFIG } from '@/utils/constants'
import { createTextureAtlas, type CouponForAtlas } from '@/utils/textureAtlas'
import type { WinnerDisplayMode } from '@/types'

interface InstancedCardsProps {
  count?: number
  radius?: number
  rows?: number
  cardWidth?: number
  cardHeight?: number
  cardColor?: string
  coupons: CouponForAtlas[]
  displayMode: WinnerDisplayMode
}

/**
 * Distribute cards on sphere surface using latitude rows
 * Cards are arranged in horizontal rows from south pole to north pole
 * More cards at equator, fewer at poles (based on circumference)
 */
function distributeCardsLatitudeRows(
  totalCards: number,
  radius: number,
  rows: number
): { x: number; y: number; z: number }[] {
  const positions: { x: number; y: number; z: number }[] = []

  // Calculate cards per row based on latitude (more at equator, less at poles)
  const cardsPerRow: number[] = []
  let totalCalculated = 0

  for (let row = 0; row < rows; row++) {
    // Latitude from -80 to +80 (avoid exact poles)
    const lat = -80 + (160 / (rows - 1)) * row
    const latRad = (lat * Math.PI) / 180

    // More cards at equator (cos is larger), fewer at poles (cos is smaller)
    const circumferenceRatio = Math.cos(latRad)
    const baseCards = Math.max(6, Math.round(circumferenceRatio * (totalCards / rows) * 1.5))
    cardsPerRow.push(baseCards)
    totalCalculated += baseCards
  }

  // Normalize to match totalCards
  const scaleFactor = totalCards / totalCalculated

  for (let row = 0; row < rows; row++) {
    const lat = -80 + (160 / (rows - 1)) * row
    const latRad = (lat * Math.PI) / 180
    const cardsInThisRow = Math.round(cardsPerRow[row] * scaleFactor)

    for (let col = 0; col < cardsInThisRow; col++) {
      // Distribute evenly around longitude
      const lon = (360 / cardsInThisRow) * col
      const lonRad = (lon * Math.PI) / 180

      // Spherical to Cartesian
      const x = radius * Math.cos(latRad) * Math.cos(lonRad)
      const y = radius * Math.sin(latRad)
      const z = radius * Math.cos(latRad) * Math.sin(lonRad)

      positions.push({ x, y, z })

      if (positions.length >= totalCards) return positions
    }
  }

  return positions
}

export function InstancedCards({
  count = SPHERE_CONFIG.cardCount,
  radius = SPHERE_CONFIG.radius,
  rows = SPHERE_CONFIG.rows,
  cardWidth = SPHERE_CONFIG.cardWidth,
  cardHeight = SPHERE_CONFIG.cardHeight,
  cardColor = SPHERE_CONFIG.cardColor,
  coupons,
  displayMode,
}: InstancedCardsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Refs for mutable data (stable references, won't cause re-renders)
  const opacitiesRef = useRef<Float32Array>(new Float32Array(count))
  const uvOffsetsRef = useRef<Float32Array>(new Float32Array(count * 2))
  const isInitializedRef = useRef(false)

  // Sample coupons for atlas (stable reference)
  const atlasCoupons = useMemo(() => {
    if (!coupons || coupons.length === 0) {
      // Fallback if no coupons - generate placeholder data
      return Array.from({ length: 20 }, (_, i) => ({
        id: `COUPON-${i + 1}`,
        participantId: `P${i + 1}`,
        participantName: `Participant ${i + 1}`,
      }))
    }

    const maxTexts = SPHERE_CONFIG.atlasMaxTexts
    if (coupons.length <= maxTexts) return coupons

    // Random sample if too many coupons
    const shuffled = [...coupons].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, maxTexts)
  }, [coupons])

  // Create texture atlas
  const atlas = useMemo(() => {
    if (atlasCoupons.length === 0) return null

    return createTextureAtlas({
      coupons: atlasCoupons,
      displayMode,
      cols: SPHERE_CONFIG.atlasColumns,
      cellWidth: SPHERE_CONFIG.atlasCellWidth,
      cellHeight: SPHERE_CONFIG.atlasCellHeight,
      fontSize: 14,
      fontFamily: 'Plus Jakarta Sans, Arial, sans-serif',
      textColor: '#0a2540',
      bgColor: cardColor,
    })
  }, [atlasCoupons, displayMode, cardColor])

  // Generate positions using latitude rows (stable)
  const positions = useMemo(() => {
    return distributeCardsLatitudeRows(count, radius, rows)
  }, [count, radius, rows])

  // Geometry (stable - only depends on dimensions)
  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(cardWidth, cardHeight)
  }, [cardWidth, cardHeight])

  // Shader material (depends on atlas)
  const material = useMemo(() => {
    if (!atlas) return null

    return new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: atlas.texture },
        uCellSize: { value: new THREE.Vector2(atlas.cellUVWidth, atlas.cellUVHeight) },
        uTintColor: { value: new THREE.Color(cardColor) },
      },
      vertexShader: `
        attribute float instanceOpacity;
        attribute vec2 instanceUvOffset;

        varying float vOpacity;
        varying vec2 vUvOffset;
        varying vec2 vUv;

        void main() {
          vOpacity = instanceOpacity;
          vUvOffset = instanceUvOffset;
          vUv = uv;

          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform vec2 uCellSize;
        uniform vec3 uTintColor;

        varying float vOpacity;
        varying vec2 vUvOffset;
        varying vec2 vUv;

        void main() {
          // Calculate UV within the atlas cell
          vec2 atlasUv = vUvOffset + vUv * uCellSize;

          // Sample texture
          vec4 texColor = texture2D(uTexture, atlasUv);

          // Apply slight tint blend
          vec3 finalColor = mix(texColor.rgb, uTintColor, 0.1);

          gl_FragColor = vec4(finalColor, vOpacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    })
  }, [atlas, cardColor])

  // Initialize instance data and geometry attributes
  useEffect(() => {
    if (!atlas || !meshRef.current || isInitializedRef.current) return

    // Initialize opacities and UV offsets
    for (let i = 0; i < count; i++) {
      opacitiesRef.current[i] = 0.4 + Math.random() * 0.5

      // Random UV offset pointing to a random coupon in atlas
      const couponIndex = Math.floor(Math.random() * atlasCoupons.length)
      const col = couponIndex % atlas.cols
      const row = Math.floor(couponIndex / atlas.cols)

      uvOffsetsRef.current[i * 2] = col * atlas.cellUVWidth
      uvOffsetsRef.current[i * 2 + 1] = row * atlas.cellUVHeight
    }

    // Set geometry attributes
    geometry.setAttribute('instanceOpacity', new THREE.InstancedBufferAttribute(opacitiesRef.current, 1))
    geometry.setAttribute('instanceUvOffset', new THREE.InstancedBufferAttribute(uvOffsetsRef.current, 2))

    // Set card positions - cards face outward from center
    positions.forEach((pos, i) => {
      dummy.position.set(pos.x, pos.y, pos.z)
      dummy.lookAt(0, 0, 0)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
    isInitializedRef.current = true
  }, [atlas, count, positions, geometry, dummy, atlasCoupons])

  // Animate: random opacity + UV offset changes
  useFrame(() => {
    if (!meshRef.current || !atlas || !isInitializedRef.current) return

    const opacityAttr = meshRef.current.geometry.attributes.instanceOpacity as THREE.BufferAttribute
    const uvOffsetAttr = meshRef.current.geometry.attributes.instanceUvOffset as THREE.BufferAttribute

    if (!opacityAttr || !uvOffsetAttr) return

    // Update configured percentage of cards per frame
    const updateCount = Math.ceil(count * SPHERE_CONFIG.updatePercentPerFrame)

    for (let i = 0; i < updateCount; i++) {
      const randomIndex = Math.floor(Math.random() * count)

      // New opacity
      opacitiesRef.current[randomIndex] = 0.4 + Math.random() * 0.5

      // New UV offset (new random coupon) - sync with opacity change
      const newCouponIndex = Math.floor(Math.random() * atlasCoupons.length)
      const col = newCouponIndex % atlas.cols
      const row = Math.floor(newCouponIndex / atlas.cols)

      uvOffsetsRef.current[randomIndex * 2] = col * atlas.cellUVWidth
      uvOffsetsRef.current[randomIndex * 2 + 1] = row * atlas.cellUVHeight
    }

    opacityAttr.needsUpdate = true
    uvOffsetAttr.needsUpdate = true
  })

  // Don't render if atlas not ready
  if (!atlas || !material) {
    return null
  }

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} />
}

export default InstancedCards
