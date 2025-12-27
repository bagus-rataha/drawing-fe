# Raffle App - DrawScreen Animation Revision 03

## Overview

Revisi sphere untuk:
1. Distribusi cards dalam horizontal rows (bukan diagonal)
2. Performance optimization menggunakan InstancedMesh
3. Target 500-800 cards tanpa lag

Reference: https://threejs-journey.com/lessons/particles-morphing-shader#setup

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Problem Analysis

### Current Issues:

| Issue | Cause |
|-------|-------|
| Laggy dengan 500 cards | Setiap card = 1 mesh = 1 draw call |
| Cards diagonal/scattered | Fibonacci spiral distribution |
| Tidak rapih | Tidak tersusun dalam rows |

### Solution:

| Solution | Benefit |
|----------|---------|
| InstancedMesh | 1 draw call untuk semua cards |
| Latitude rows distribution | Cards tersusun rapih horizontal |
| Shader-based text | Optional, untuk extra performance |

---

## Revision 1: Horizontal Latitude Distribution

**Current (Fibonacci Spiral):**
```
Cards tersebar diagonal, tidak beraturan
```

**Expected (Latitude Rows):**
```
        ○ ○ ○ ○ ○           ← Row 8 (top, fewer cards)
      ○ ○ ○ ○ ○ ○ ○         ← Row 7
    ○ ○ ○ ○ ○ ○ ○ ○ ○       ← Row 6
  ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○     ← Row 5 (equator, most cards)
  ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○     ← Row 4
    ○ ○ ○ ○ ○ ○ ○ ○ ○       ← Row 3
      ○ ○ ○ ○ ○ ○ ○         ← Row 2
        ○ ○ ○ ○ ○           ← Row 1 (bottom, fewer cards)
```

**Algorithm:**

```typescript
function distributeCardsLatitudeRows(totalCards: number, radius: number, rows: number = 12) {
  const positions: { x: number; y: number; z: number }[] = [];
  
  // Calculate cards per row based on latitude (more at equator, less at poles)
  const cardsPerRow: number[] = [];
  let totalCalculated = 0;
  
  for (let row = 0; row < rows; row++) {
    // Latitude from -80° to +80° (avoid exact poles)
    const lat = -80 + (160 / (rows - 1)) * row;
    const latRad = (lat * Math.PI) / 180;
    
    // More cards at equator (cos is larger), fewer at poles (cos is smaller)
    const circumferenceRatio = Math.cos(latRad);
    const baseCardsInRow = Math.max(4, Math.round(circumferenceRatio * (totalCards / rows) * 1.5));
    cardsPerRow.push(baseCardsInRow);
    totalCalculated += baseCardsInRow;
  }
  
  // Normalize to match totalCards
  const scaleFactor = totalCards / totalCalculated;
  
  for (let row = 0; row < rows; row++) {
    const lat = -80 + (160 / (rows - 1)) * row;
    const latRad = (lat * Math.PI) / 180;
    
    const cardsInThisRow = Math.round(cardsPerRow[row] * scaleFactor);
    
    for (let col = 0; col < cardsInThisRow; col++) {
      // Distribute evenly around longitude
      const lon = (360 / cardsInThisRow) * col;
      const lonRad = (lon * Math.PI) / 180;
      
      // Spherical to Cartesian
      const x = radius * Math.cos(latRad) * Math.cos(lonRad);
      const y = radius * Math.sin(latRad);
      const z = radius * Math.cos(latRad) * Math.sin(lonRad);
      
      positions.push({ x, y, z });
      
      if (positions.length >= totalCards) break;
    }
    
    if (positions.length >= totalCards) break;
  }
  
  return positions;
}
```

---

## Revision 2: InstancedMesh for Performance

**Current Approach (Slow):**
```tsx
// 500 individual meshes = 500 draw calls
{coupons.map((coupon, i) => (
  <SphereCard key={i} position={positions[i]} coupon={coupon} />
))}
```

**New Approach (Fast):**
```tsx
// 1 InstancedMesh = 1 draw call for ALL cards
<InstancedCards 
  count={500} 
  positions={positions} 
  coupons={displayedCoupons}
/>
```

**Implementation:**

```typescript
// src/components/draw/InstancedCards.tsx
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface InstancedCardsProps {
  count: number;
  positions: { x: number; y: number; z: number }[];
  radius: number;
  cardWidth?: number;
  cardHeight?: number;
}

export function InstancedCards({ 
  count, 
  positions, 
  radius,
  cardWidth = 0.3,
  cardHeight = 0.45
}: InstancedCardsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Create geometry and material once
  const geometry = useMemo(() => new THREE.PlaneGeometry(cardWidth, cardHeight), [cardWidth, cardHeight]);
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#e8b4c8',
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide
  }), []);
  
  // Set initial positions
  useEffect(() => {
    if (!meshRef.current) return;
    
    positions.forEach((pos, i) => {
      if (i >= count) return;
      
      // Position
      dummy.position.set(pos.x, pos.y, pos.z);
      
      // Look at center (card faces outward)
      dummy.lookAt(0, 0, 0);
      
      // Update matrix
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions, count, dummy]);
  
  return (
    <instancedMesh 
      ref={meshRef} 
      args={[geometry, material, count]}
    />
  );
}
```

---

## Revision 3: Text on Instanced Cards

Untuk text pada InstancedMesh, ada beberapa opsi:

### Option A: Canvas Texture (Recommended)

Render text ke canvas texture, lalu apply ke semua instances.

```typescript
// Create texture with random coupon texts
function createCardTexture(texts: string[], width = 128, height = 192): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  // Background
  ctx.fillStyle = '#fdf4f7';
  ctx.fillRect(0, 0, width, height);
  
  // Border
  ctx.strokeStyle = '#e8b4c8';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, width - 4, height - 4);
  
  // Text (random from pool)
  const randomText = texts[Math.floor(Math.random() * texts.length)];
  ctx.fillStyle = '#0a2540';
  ctx.font = 'bold 14px Plus Jakarta Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Word wrap
  const lines = wrapText(ctx, randomText, width - 20);
  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, height / 2 + (i - lines.length / 2) * 18);
  });
  
  return new THREE.CanvasTexture(canvas);
}

// Helper: wrap text
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  words.forEach(word => {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  
  if (currentLine) lines.push(currentLine);
  return lines;
}
```

### Option B: Texture Atlas

Pre-render semua unique texts ke satu large texture, lalu use UV coordinates per instance.

### Option C: No Text (Colored Cards Only)

Untuk maximum performance, hanya tampilkan colored cards tanpa text saat spinning.
Text hanya muncul di winner cards.

**Rekomendasi:** Option C untuk spinning state, Option A untuk idle state.

---

## Revision 4: Dynamic Opacity per Instance

Untuk varying opacity per card:

```typescript
// Add instance attributes for opacity
const opacities = useMemo(() => {
  const arr = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    arr[i] = 0.3 + Math.random() * 0.5; // 0.3 - 0.8
  }
  return arr;
}, [count]);

// Custom shader material untuk per-instance opacity
const material = useMemo(() => new THREE.ShaderMaterial({
  uniforms: {
    color: { value: new THREE.Color('#e8b4c8') }
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
    uniform vec3 color;
    varying float vOpacity;
    
    void main() {
      gl_FragColor = vec4(color, vOpacity);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide
}), []);

// Set opacity attribute
useEffect(() => {
  if (!meshRef.current) return;
  
  meshRef.current.geometry.setAttribute(
    'instanceOpacity',
    new THREE.InstancedBufferAttribute(opacities, 1)
  );
}, [opacities]);
```

---

## Revision 5: Animated Opacity Changes

Untuk opacity berubah saat "text berubah" (simulated):

```typescript
// Animate opacity changes randomly
useFrame((state) => {
  if (!meshRef.current) return;
  
  const time = state.clock.elapsedTime;
  
  // Update some random cards' opacity every few frames
  if (Math.random() < 0.05) { // 5% chance per frame
    const randomIndex = Math.floor(Math.random() * count);
    opacities[randomIndex] = 0.3 + Math.random() * 0.5;
    
    meshRef.current.geometry.attributes.instanceOpacity.needsUpdate = true;
  }
});
```

---

## Complete InstancedCards Component

```typescript
// src/components/draw/InstancedCards.tsx
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface InstancedCardsProps {
  count: number;
  radius: number;
  rows?: number;
  cardWidth?: number;
  cardHeight?: number;
  color?: string;
}

export function InstancedCards({ 
  count = 500,
  radius = 6,
  rows = 14,
  cardWidth = 0.3,
  cardHeight = 0.45,
  color = '#e8b4c8'
}: InstancedCardsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Generate positions using latitude rows
  const positions = useMemo(() => {
    return distributeCardsLatitudeRows(count, radius, rows);
  }, [count, radius, rows]);
  
  // Opacity array for per-instance opacity
  const opacities = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = 0.3 + Math.random() * 0.5;
    }
    return arr;
  }, [count]);
  
  // Geometry
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(cardWidth, cardHeight);
    geo.setAttribute('instanceOpacity', new THREE.InstancedBufferAttribute(opacities, 1));
    return geo;
  }, [cardWidth, cardHeight, opacities]);
  
  // Shader material for per-instance opacity
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) }
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
    side: THREE.DoubleSide
  }), [color]);
  
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
  
  // Animate opacity changes
  useFrame(() => {
    if (!meshRef.current) return;
    
    // Random opacity change for ~5% of cards per frame
    for (let i = 0; i < count * 0.02; i++) {
      const randomIndex = Math.floor(Math.random() * count);
      opacities[randomIndex] = 0.3 + Math.random() * 0.5;
    }
    
    (meshRef.current.geometry.attributes.instanceOpacity as THREE.BufferAttribute).needsUpdate = true;
  });
  
  return (
    <instancedMesh 
      ref={meshRef} 
      args={[geometry, material, count]}
    />
  );
}

// Latitude rows distribution
function distributeCardsLatitudeRows(
  totalCards: number, 
  radius: number, 
  rows: number
): { x: number; y: number; z: number }[] {
  const positions: { x: number; y: number; z: number }[] = [];
  
  // Calculate cards per row
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
  
  // Normalize
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

---

## Update SphereMesh

```typescript
// src/components/draw/SphereMesh.tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { InstancedCards } from './InstancedCards';

interface SphereMeshProps {
  isSpinning: boolean;
  isIdle: boolean;
  radius?: number;
  cardCount?: number;
}

export function SphereMesh({ 
  isSpinning, 
  isIdle,
  radius = 6,
  cardCount = 500
}: SphereMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Rotation animation
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    if (isSpinning) {
      // Fast horizontal rotation
      groupRef.current.rotation.y += delta * 5;
    } else if (isIdle) {
      // Slow horizontal rotation
      groupRef.current.rotation.y += delta * 0.3;
    }
    // Stopped: no rotation
  });
  
  return (
    <group ref={groupRef}>
      <InstancedCards 
        count={cardCount}
        radius={radius}
        rows={14}
        cardWidth={0.3}
        cardHeight={0.45}
        color="#e8b4c8"
      />
    </group>
  );
}
```

---

## Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/components/draw/InstancedCards.tsx` | CREATE | New component with InstancedMesh |
| `src/components/draw/SphereMesh.tsx` | MODIFY | Use InstancedCards instead of individual SphereCards |
| `src/components/draw/SphereCard.tsx` | DELETE or KEEP | May delete if not used elsewhere |

---

## Performance Comparison

| Approach | Cards | Draw Calls | Expected FPS |
|----------|-------|------------|--------------|
| Individual meshes | 500 | 500 | ~15-20 (laggy) |
| InstancedMesh | 500 | 1 | ~60 (smooth) |
| InstancedMesh | 800 | 1 | ~55-60 (smooth) |
| InstancedMesh | 1000 | 1 | ~50-55 (acceptable) |

---

## Testing Checklist

- [ ] Cards distributed in horizontal latitude rows (not diagonal)
- [ ] 500+ cards render without lag
- [ ] Cards face outward from sphere center
- [ ] Sphere rotates horizontally (Y-axis only)
- [ ] Fast rotation saat spinning
- [ ] Slow rotation saat idle
- [ ] Instant stop saat Stop clicked
- [ ] Cards have varying opacity
- [ ] Opacity changes randomly over time

---

## Optional Enhancements (Future)

1. **Text on cards** - Use texture atlas or canvas textures
2. **Card color variation** - Per-instance color attribute
3. **Hover effects** - Raycasting on instanced mesh
4. **LOD (Level of Detail)** - Reduce card count when far away
