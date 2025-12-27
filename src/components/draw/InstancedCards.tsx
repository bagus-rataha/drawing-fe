/**
 * @file components/draw/InstancedCards.tsx
 * @description High-performance instanced mesh for sphere cards
 * Uses InstancedMesh for 1 draw call instead of 500+ individual meshes
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SPHERE_CONFIG } from '@/utils/constants'

interface InstancedCardsProps {
  count?: number
  radius?: number
  rows?: number
  cardWidth?: number
  cardHeight?: number
  color?: string
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
    // Latitude from -80° to +80° (avoid exact poles)
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
  color = SPHERE_CONFIG.cardColor,
}: InstancedCardsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Generate positions using latitude rows
  const positions = useMemo(() => {
    return distributeCardsLatitudeRows(count, radius, rows)
  }, [count, radius, rows])

  // Opacity array for per-instance opacity
  const opacities = useMemo(() => {
    const arr = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      arr[i] = 0.3 + Math.random() * 0.5
    }
    return arr
  }, [count])

  // Geometry with instance opacity attribute
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(cardWidth, cardHeight)
    geo.setAttribute('instanceOpacity', new THREE.InstancedBufferAttribute(opacities, 1))
    return geo
  }, [cardWidth, cardHeight, opacities])

  // Shader material for per-instance opacity
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(color) },
        },
        vertexShader: `
        attribute float instanceOpacity;
        varying float vOpacity;

        void main() {
          vOpacity = instanceOpacity;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }
      `,
        fragmentShader: `
        uniform vec3 uColor;
        varying float vOpacity;

        void main() {
          gl_FragColor = vec4(uColor, vOpacity);
        }
      `,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    [color]
  )

  // Set initial positions - cards face outward from center
  useEffect(() => {
    if (!meshRef.current) return

    positions.forEach((pos, i) => {
      dummy.position.set(pos.x, pos.y, pos.z)
      // Look at center so card faces outward
      dummy.lookAt(0, 0, 0)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
  }, [positions, dummy])

  // Animate opacity changes randomly
  useFrame(() => {
    if (!meshRef.current) return

    // Random opacity change for ~2% of cards per frame
    const changesToMake = Math.ceil(count * 0.02)
    for (let i = 0; i < changesToMake; i++) {
      const randomIndex = Math.floor(Math.random() * count)
      opacities[randomIndex] = 0.3 + Math.random() * 0.5
    }

    const opacityAttr = meshRef.current.geometry.attributes.instanceOpacity as THREE.BufferAttribute
    if (opacityAttr) {
      opacityAttr.needsUpdate = true
    }
  })

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} />
}

export default InstancedCards
