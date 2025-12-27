# Raffle App - DrawScreen Animation Revision 04

## Overview

Revisi untuk:
1. Menampilkan nama kupon di cards menggunakan Texture Atlas + UV Switching
2. Zoom in/out functionality pada sphere

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Issue 1: Nama Kupon Hilang

### Problem
Setelah migrasi ke InstancedMesh, text/nama kupon tidak ditampilkan.

### Solution: Texture Atlas + UV Switching

**Concept:**
1. Pre-render 50-100 nama kupon ke 1 texture atlas (grid of names)
2. Setiap card instance punya UV offset pointing ke salah satu nama
3. Saat opacity berubah → update UV offset ke nama lain
4. Sync: opacity change = nama change

**Visual Texture Atlas:**
```
┌─────────┬─────────┬─────────┬─────────┐
│  John   │  Jane   │  Bob    │  Alice  │  ← Row 0
├─────────┼─────────┼─────────┼─────────┤
│  Carol  │  Derek  │  Emily  │  Frank  │  ← Row 1
├─────────┼─────────┼─────────┼─────────┤
│  Gina   │  Harold │  Ivy    │  Jack   │  ← Row 2
├─────────┼─────────┼─────────┼─────────┤
│   ...   │   ...   │   ...   │   ...   │  ← Row N
└─────────┴─────────┴─────────┴─────────┘
     Col 0    Col 1    Col 2    Col 3

UV offset (0,0) → John
UV offset (0.25, 0) → Jane
UV offset (0, 0.25) → Carol
etc.
```

---

### Implementation

#### Step 1: Create Texture Atlas Generator

```typescript
// src/utils/textureAtlas.ts
import * as THREE from 'three';

interface AtlasConfig {
  texts: string[];
  cols: number;
  cellWidth: number;
  cellHeight: number;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  bgColor: string;
}

export function createTextureAtlas(config: AtlasConfig): {
  texture: THREE.CanvasTexture;
  cols: number;
  rows: number;
  cellUVWidth: number;
  cellUVHeight: number;
} {
  const {
    texts,
    cols,
    cellWidth,
    cellHeight,
    fontSize,
    fontFamily,
    textColor,
    bgColor
  } = config;

  const rows = Math.ceil(texts.length / cols);
  const canvasWidth = cols * cellWidth;
  const canvasHeight = rows * cellHeight;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;

  // Fill background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw each text cell
  ctx.fillStyle = textColor;
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  texts.forEach((text, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    const x = col * cellWidth + cellWidth / 2;
    const y = row * cellHeight + cellHeight / 2;

    // Truncate text if too long
    const maxChars = Math.floor(cellWidth / (fontSize * 0.6));
    const displayText = text.length > maxChars 
      ? text.substring(0, maxChars - 2) + '..' 
      : text;

    ctx.fillText(displayText, x, y);
  });

  // Create texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return {
    texture,
    cols,
    rows,
    cellUVWidth: 1 / cols,
    cellUVHeight: 1 / rows
  };
}
```

#### Step 2: Update InstancedCards with Texture Atlas

```typescript
// src/components/draw/InstancedCards.tsx
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createTextureAtlas } from '../../utils/textureAtlas';
import { SPHERE_CONFIG } from '../../utils/constants';

interface InstancedCardsProps {
  count: number;
  radius: number;
  rows?: number;
  cardWidth?: number;
  cardHeight?: number;
  cardColor?: string;
  couponNames: string[]; // Pool of coupon names for display
}

export function InstancedCards({
  count = SPHERE_CONFIG.cardCount,
  radius = SPHERE_CONFIG.radius,
  rows = SPHERE_CONFIG.rows,
  cardWidth = SPHERE_CONFIG.cardWidth,
  cardHeight = SPHERE_CONFIG.cardHeight,
  cardColor = SPHERE_CONFIG.cardColor,
  couponNames
}: InstancedCardsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Atlas config
  const ATLAS_COLS = 10;
  const ATLAS_CELL_WIDTH = 128;
  const ATLAS_CELL_HEIGHT = 64;

  // Sample random names for atlas (max 100)
  const atlasTexts = useMemo(() => {
    const maxTexts = 100;
    if (couponNames.length <= maxTexts) return couponNames;
    
    // Random sample
    const shuffled = [...couponNames].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, maxTexts);
  }, [couponNames]);

  // Create texture atlas
  const atlas = useMemo(() => {
    return createTextureAtlas({
      texts: atlasTexts,
      cols: ATLAS_COLS,
      cellWidth: ATLAS_CELL_WIDTH,
      cellHeight: ATLAS_CELL_HEIGHT,
      fontSize: 14,
      fontFamily: 'Plus Jakarta Sans, Arial, sans-serif',
      textColor: '#0a2540',
      bgColor: '#fdf4f7'
    });
  }, [atlasTexts]);

  // Generate positions
  const positions = useMemo(() => {
    return distributeCardsLatitudeRows(count, radius, rows);
  }, [count, radius, rows]);

  // Instance attributes: opacity and UV offset
  const instanceData = useMemo(() => {
    const opacities = new Float32Array(count);
    const uvOffsets = new Float32Array(count * 2); // x, y per instance

    for (let i = 0; i < count; i++) {
      opacities[i] = 0.4 + Math.random() * 0.5;
      
      // Random UV offset pointing to a random text in atlas
      const textIndex = Math.floor(Math.random() * atlasTexts.length);
      const col = textIndex % atlas.cols;
      const row = Math.floor(textIndex / atlas.cols);
      
      uvOffsets[i * 2] = col * atlas.cellUVWidth;
      uvOffsets[i * 2 + 1] = row * atlas.cellUVHeight;
    }

    return { opacities, uvOffsets };
  }, [count, atlasTexts.length, atlas]);

  // Geometry with instance attributes
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(cardWidth, cardHeight);
    
    geo.setAttribute(
      'instanceOpacity',
      new THREE.InstancedBufferAttribute(instanceData.opacities, 1)
    );
    geo.setAttribute(
      'instanceUvOffset',
      new THREE.InstancedBufferAttribute(instanceData.uvOffsets, 2)
    );
    
    return geo;
  }, [cardWidth, cardHeight, instanceData]);

  // Shader material
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: atlas.texture },
      uCellSize: { value: new THREE.Vector2(atlas.cellUVWidth, atlas.cellUVHeight) },
      uTintColor: { value: new THREE.Color(cardColor) }
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
        
        // Apply tint and opacity
        vec3 finalColor = mix(texColor.rgb, uTintColor, 0.3);
        
        gl_FragColor = vec4(finalColor, vOpacity);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide
  }), [atlas, cardColor]);

  // Set positions
  useEffect(() => {
    if (!meshRef.current) return;

    positions.forEach((pos, i) => {
      dummy.position.set(pos.x, pos.y, pos.z);
      dummy.lookAt(0, 0, 0);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions, dummy]);

  // Animate: random opacity + UV offset changes
  useFrame(() => {
    if (!meshRef.current) return;

    const opacityAttr = meshRef.current.geometry.attributes.instanceOpacity as THREE.BufferAttribute;
    const uvOffsetAttr = meshRef.current.geometry.attributes.instanceUvOffset as THREE.BufferAttribute;

    // Update ~2% of cards per frame
    const updateCount = Math.ceil(count * 0.02);
    
    for (let i = 0; i < updateCount; i++) {
      const randomIndex = Math.floor(Math.random() * count);
      
      // New opacity
      instanceData.opacities[randomIndex] = 0.4 + Math.random() * 0.5;
      
      // New UV offset (new random text)
      const newTextIndex = Math.floor(Math.random() * atlasTexts.length);
      const col = newTextIndex % atlas.cols;
      const row = Math.floor(newTextIndex / atlas.cols);
      
      instanceData.uvOffsets[randomIndex * 2] = col * atlas.cellUVWidth;
      instanceData.uvOffsets[randomIndex * 2 + 1] = row * atlas.cellUVHeight;
    }

    opacityAttr.needsUpdate = true;
    uvOffsetAttr.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
    />
  );
}

// Latitude rows distribution (same as before)
function distributeCardsLatitudeRows(
  totalCards: number,
  radius: number,
  rows: number
): { x: number; y: number; z: number }[] {
  const positions: { x: number; y: number; z: number }[] = [];

  const cardsPerRow: number[] = [];
  let totalCalculated = 0;

  for (let row = 0; row < rows; row++) {
    const lat = -80 + (160 / (rows - 1)) * row;
    const latRad = (lat * Math.PI) / 180;
    const circumferenceRatio = Math.cos(latRad);
    const baseCards = Math.max(6, Math.round(circumferenceRatio * (totalCards / rows) * 1.5));
    cardsPerRow.push(baseCards);
    totalCalculated += baseCards;
  }

  const scaleFactor = totalCards / totalCalculated;

  for (let row = 0; row < rows; row++) {
    const lat = -80 + (160 / (rows - 1)) * row;
    const latRad = (lat * Math.PI) / 180;
    const cardsInThisRow = Math.round(cardsPerRow[row] * scaleFactor);

    for (let col = 0; col < cardsInThisRow; col++) {
      const lon = (360 / cardsInThisRow) * col;
      const lonRad = (lon * Math.PI) / 180;

      const x = radius * Math.cos(latRad) * Math.cos(lonRad);
      const y = radius * Math.sin(latRad);
      const z = radius * Math.cos(latRad) * Math.sin(lonRad);

      positions.push({ x, y, z });

      if (positions.length >= totalCards) return positions;
    }
  }

  return positions;
}
```

#### Step 3: Update SphereMesh to Pass Coupon Names

```typescript
// src/components/draw/SphereMesh.tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { InstancedCards } from './InstancedCards';
import { SPHERE_CONFIG } from '../../utils/constants';

interface SphereMeshProps {
  isSpinning: boolean;
  isIdle: boolean;
  couponNames: string[]; // Pass coupon names for display
}

export function SphereMesh({ isSpinning, isIdle, couponNames }: SphereMeshProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (isSpinning) {
      groupRef.current.rotation.y += delta * SPHERE_CONFIG.spinSpeed;
    } else if (isIdle) {
      groupRef.current.rotation.y += delta * SPHERE_CONFIG.idleSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      <InstancedCards
        count={SPHERE_CONFIG.cardCount}
        radius={SPHERE_CONFIG.radius}
        rows={SPHERE_CONFIG.rows}
        cardWidth={SPHERE_CONFIG.cardWidth}
        cardHeight={SPHERE_CONFIG.cardHeight}
        cardColor={SPHERE_CONFIG.cardColor}
        couponNames={couponNames}
      />
    </group>
  );
}
```

#### Step 4: Update Sphere3D to Fetch and Pass Coupon Names

```typescript
// src/components/draw/Sphere3D.tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { SphereMesh } from './SphereMesh';
import { useMemo } from 'react';

interface Sphere3DProps {
  isSpinning: boolean;
  isIdle: boolean;
  coupons: Array<{ participantName?: string; participantId: string; id: string }>;
}

export function Sphere3D({ isSpinning, isIdle, coupons }: Sphere3DProps) {
  // Extract names for display on sphere
  const couponNames = useMemo(() => {
    return coupons.map(c => c.participantName || c.participantId || c.id);
  }, [coupons]);

  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 14], fov: 60 }}>
        <ambientLight intensity={0.5} />
        
        <SphereMesh
          isSpinning={isSpinning}
          isIdle={isIdle}
          couponNames={couponNames}
        />

        {/* Zoom controls - Issue 2 */}
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          enableRotate={false}
          minDistance={8}
          maxDistance={20}
          zoomSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
```

---

## Issue 2: Zoom In/Out pada Sphere

### Solution: OrbitControls with Zoom Only

```typescript
// Di dalam Canvas component
<OrbitControls
  enableZoom={true}       // ✅ Enable scroll zoom
  enablePan={false}       // ❌ Disable drag to pan
  enableRotate={false}    // ❌ Disable drag to rotate (sphere auto-rotates)
  minDistance={8}         // Closest zoom (can't get closer than this)
  maxDistance={20}        // Farthest zoom (can't get further than this)
  zoomSpeed={0.5}         // Zoom sensitivity (lower = slower)
/>
```

### Add to SPHERE_CONFIG

```typescript
// src/utils/constants.ts
export const SPHERE_CONFIG = {
  // ... existing config
  
  /** Minimum camera distance (closest zoom) */
  zoomMin: 8,
  
  /** Maximum camera distance (farthest zoom) */
  zoomMax: 20,
  
  /** Zoom speed/sensitivity */
  zoomSpeed: 0.5,
}
```

### Updated OrbitControls

```typescript
<OrbitControls
  enableZoom={true}
  enablePan={false}
  enableRotate={false}
  minDistance={SPHERE_CONFIG.zoomMin}
  maxDistance={SPHERE_CONFIG.zoomMax}
  zoomSpeed={SPHERE_CONFIG.zoomSpeed}
/>
```

---

## Summary of Changes

| # | Issue | Solution |
|---|-------|----------|
| 1 | Nama kupon hilang | Texture Atlas + UV Switching |
| 2 | Zoom functionality | OrbitControls dengan enableZoom |

### Sync Behavior (Issue 1):
- Setiap ~2% cards per frame di-update
- Saat opacity berubah → UV offset juga berubah
- UV offset baru = nama kupon baru dari atlas
- **Opacity change = Nama change** ✅

---

## Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/utils/textureAtlas.ts` | CREATE | Texture atlas generator |
| `src/components/draw/InstancedCards.tsx` | MODIFY | Add texture atlas + UV switching |
| `src/components/draw/SphereMesh.tsx` | MODIFY | Pass couponNames prop |
| `src/components/draw/Sphere3D.tsx` | MODIFY | Add OrbitControls, pass coupons |
| `src/utils/constants.ts` | MODIFY | Add zoom config |

---

## Update SPHERE_CONFIG (Complete)

```typescript
// src/utils/constants.ts
export const SPHERE_CONFIG = {
  /** Number of cards displayed on sphere surface */
  cardCount: 200,

  /** Sphere radius in 3D units */
  radius: 6,

  /** Number of horizontal rows for card distribution */
  rows: 14,

  /** Card width in 3D units */
  cardWidth: 1.2,

  /** Card height in 3D units */
  cardHeight: 1.8,

  /** Card background color (hex) */
  cardColor: '#e8b4c8',

  /** Rotation speed when spinning (multiplier) */
  spinSpeed: 5,

  /** Rotation speed when idle (multiplier) */
  idleSpeed: 0.3,

  /** Minimum camera distance (closest zoom) */
  zoomMin: 8,

  /** Maximum camera distance (farthest zoom) */
  zoomMax: 20,

  /** Zoom speed/sensitivity */
  zoomSpeed: 0.5,

  /** Texture atlas columns */
  atlasColumns: 10,

  /** Texture atlas cell width (pixels) */
  atlasCellWidth: 128,

  /** Texture atlas cell height (pixels) */
  atlasCellHeight: 64,

  /** Max texts in atlas */
  atlasMaxTexts: 100,

  /** Percentage of cards to update per frame */
  updatePercentPerFrame: 0.02,
}
```

---

## Testing Checklist

### Issue 1 - Text on Cards:
- [ ] Texture atlas generated with coupon names
- [ ] Names visible on cards
- [ ] Names change when opacity changes
- [ ] Sync: opacity change = nama change
- [ ] Performance still smooth with 200+ cards

### Issue 2 - Zoom:
- [ ] Scroll up = zoom in
- [ ] Scroll down = zoom out
- [ ] Cannot zoom closer than minDistance
- [ ] Cannot zoom further than maxDistance
- [ ] Drag does not rotate sphere (sphere auto-rotates)
- [ ] Drag does not pan camera

---

## Performance Notes

| Operation | CPU | GPU | Frequency |
|-----------|-----|-----|-----------|
| Create texture atlas | Medium | - | Once on init |
| Store texture | - | Low | Once on init |
| Update UV offsets | Low | - | ~2% cards/frame |
| Update opacities | Low | - | ~2% cards/frame |
| Render instanced mesh | - | Low | Every frame |

**Expected Performance:** 60 FPS dengan 200-500 cards
