# Raffle App - DrawScreen Animation Revision 05

## Overview

Revisi untuk fix 3 issues:
1. Display mode tidak sesuai config event
2. Sphere menghilang setelah beberapa saat
3. Background image belum diambil dari event config

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Issue 1: Display Mode Tidak Sesuai Config

### Problem
- Event config set: `kupon + participant ID`
- Yang ditampilkan di sphere: hanya `name`

### Root Cause
Texture atlas generator tidak membaca `displaySettings.mode` dari event.

### Solution

**Display Mode Options:**
| Mode | Display |
|------|---------|
| `coupon` | Coupon ID only |
| `coupon-id` | Coupon ID + Participant ID |
| `coupon-name` | Coupon ID + Participant Name |

**Fix: Update texture atlas to respect display mode**

```typescript
// src/utils/textureAtlas.ts

interface AtlasConfig {
  coupons: Array<{
    id: string;
    participantId: string;
    participantName?: string;
  }>;
  displayMode: 'coupon' | 'coupon-id' | 'coupon-name';
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
    coupons,
    displayMode,
    cols,
    cellWidth,
    cellHeight,
    fontSize,
    fontFamily,
    textColor,
    bgColor
  } = config;

  const rows = Math.ceil(coupons.length / cols);
  const canvasWidth = cols * cellWidth;
  const canvasHeight = rows * cellHeight;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;

  // Fill background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw each coupon cell
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  coupons.forEach((coupon, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    const x = col * cellWidth + cellWidth / 2;
    const y = row * cellHeight + cellHeight / 2;

    // Generate display text based on mode
    let lines: string[] = [];
    
    switch (displayMode) {
      case 'coupon':
        lines = [coupon.id];
        break;
      case 'coupon-id':
        lines = [coupon.id, coupon.participantId];
        break;
      case 'coupon-name':
        lines = [coupon.id, coupon.participantName || coupon.participantId];
        break;
    }

    // Draw lines
    const lineHeight = fontSize + 4;
    const startY = y - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, lineIndex) => {
      // First line (coupon ID) - smaller font
      if (lineIndex === 0) {
        ctx.font = `${fontSize * 0.8}px ${fontFamily}`;
      } else {
        // Second line (ID or name) - bold, larger
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
      }

      // Truncate if too long
      const maxChars = Math.floor(cellWidth / (fontSize * 0.5));
      const displayText = line.length > maxChars 
        ? line.substring(0, maxChars - 2) + '..' 
        : line;

      ctx.fillText(displayText, x, startY + lineIndex * lineHeight);
    });
  });

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

**Update InstancedCards to receive display mode:**

```typescript
// src/components/draw/InstancedCards.tsx

interface InstancedCardsProps {
  count: number;
  radius: number;
  rows?: number;
  cardWidth?: number;
  cardHeight?: number;
  cardColor?: string;
  coupons: Array<{
    id: string;
    participantId: string;
    participantName?: string;
  }>;
  displayMode: 'coupon' | 'coupon-id' | 'coupon-name';
}

export function InstancedCards({
  // ... other props
  coupons,
  displayMode
}: InstancedCardsProps) {
  
  // Sample coupons for atlas
  const atlasCoupons = useMemo(() => {
    const maxTexts = SPHERE_CONFIG.atlasMaxTexts || 100;
    if (coupons.length <= maxTexts) return coupons;
    
    const shuffled = [...coupons].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, maxTexts);
  }, [coupons]);

  // Create texture atlas with display mode
  const atlas = useMemo(() => {
    return createTextureAtlas({
      coupons: atlasCoupons,
      displayMode: displayMode,  // Pass display mode
      cols: SPHERE_CONFIG.atlasColumns || 10,
      cellWidth: SPHERE_CONFIG.atlasCellWidth || 128,
      cellHeight: SPHERE_CONFIG.atlasCellHeight || 64,
      fontSize: 14,
      fontFamily: 'Plus Jakarta Sans, Arial, sans-serif',
      textColor: '#0a2540',
      bgColor: '#fdf4f7'
    });
  }, [atlasCoupons, displayMode]);

  // ... rest of component
}
```

**Update SphereMesh:**

```typescript
// src/components/draw/SphereMesh.tsx

interface SphereMeshProps {
  isSpinning: boolean;
  isIdle: boolean;
  coupons: Array<{
    id: string;
    participantId: string;
    participantName?: string;
  }>;
  displayMode: 'coupon' | 'coupon-id' | 'coupon-name';
}

export function SphereMesh({ isSpinning, isIdle, coupons, displayMode }: SphereMeshProps) {
  // ... existing code

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
  );
}
```

**Update Sphere3D:**

```typescript
// src/components/draw/Sphere3D.tsx

interface Sphere3DProps {
  isSpinning: boolean;
  isIdle: boolean;
  coupons: Array<{
    id: string;
    participantId: string;
    participantName?: string;
  }>;
  displayMode: 'coupon' | 'coupon-id' | 'coupon-name';
}

export function Sphere3D({ isSpinning, isIdle, coupons, displayMode }: Sphere3DProps) {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 14], fov: 60 }}>
        <ambientLight intensity={0.5} />
        
        <SphereMesh
          isSpinning={isSpinning}
          isIdle={isIdle}
          coupons={coupons}
          displayMode={displayMode}
        />

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
  );
}
```

**Update DrawScreen to pass display mode:**

```typescript
// src/pages/DrawScreen.tsx

export function DrawScreen() {
  const { eventId } = useParams();
  const { data: event } = useEvent(eventId);
  const { data: coupons } = useCoupons(eventId);

  // Get display mode from event settings
  const displayMode = event?.displaySettings?.mode || 'coupon-name';

  return (
    // ...
    <Sphere3D
      isSpinning={isSpinning}
      isIdle={isIdle}
      coupons={coupons || []}
      displayMode={displayMode}
    />
    // ...
  );
}
```

---

## Issue 2: Sphere Menghilang Setelah Beberapa Saat

### Problem
- Sphere muncul normal di awal
- Setelah beberapa saat, sphere hilang dan hanya tersisa 1 card di tengah

### Possible Root Causes

1. **Memory leak di useFrame** - opacities/uvOffsets array ter-replace
2. **State update menyebabkan re-render** - atlas/geometry recreated
3. **InstancedMesh count berubah** - count parameter berubah
4. **React re-render** - component unmount/remount

### Solution: Debug and Fix

**Add console logs untuk debug:**

```typescript
// src/components/draw/InstancedCards.tsx

export function InstancedCards(props) {
  const { count, coupons, displayMode } = props;

  // Debug: log saat component mount/unmount
  useEffect(() => {
    console.log('[InstancedCards] Mounted with count:', count);
    return () => {
      console.log('[InstancedCards] Unmounted');
    };
  }, []);

  // Debug: log saat props berubah
  useEffect(() => {
    console.log('[InstancedCards] Props changed:', { count, couponsLength: coupons?.length });
  }, [count, coupons]);

  // ... rest of component
}
```

**Fix 1: Memoize instanceData properly**

```typescript
// PROBLEM: instanceData recreated on every render
const instanceData = useMemo(() => {
  // This creates new Float32Arrays
}, [count, atlasCoupons.length, atlas]);

// FIX: Use refs for mutable data that shouldn't trigger re-renders
const opacitiesRef = useRef<Float32Array | null>(null);
const uvOffsetsRef = useRef<Float32Array | null>(null);

useEffect(() => {
  // Initialize only once or when count changes
  if (!opacitiesRef.current || opacitiesRef.current.length !== count) {
    opacitiesRef.current = new Float32Array(count);
    uvOffsetsRef.current = new Float32Array(count * 2);

    for (let i = 0; i < count; i++) {
      opacitiesRef.current[i] = 0.4 + Math.random() * 0.5;
      
      const textIndex = Math.floor(Math.random() * atlasCoupons.length);
      const col = textIndex % atlas.cols;
      const row = Math.floor(textIndex / atlas.cols);
      
      uvOffsetsRef.current[i * 2] = col * atlas.cellUVWidth;
      uvOffsetsRef.current[i * 2 + 1] = row * atlas.cellUVHeight;
    }
  }
}, [count, atlasCoupons.length, atlas]);
```

**Fix 2: Stable geometry reference**

```typescript
// PROBLEM: geometry recreated when instanceData changes
const geometry = useMemo(() => {
  const geo = new THREE.PlaneGeometry(cardWidth, cardHeight);
  geo.setAttribute('instanceOpacity', new THREE.InstancedBufferAttribute(instanceData.opacities, 1));
  // ...
}, [cardWidth, cardHeight, instanceData]); // instanceData causes recreation

// FIX: Create geometry once, update attributes separately
const geometry = useMemo(() => {
  return new THREE.PlaneGeometry(cardWidth, cardHeight);
}, [cardWidth, cardHeight]);

useEffect(() => {
  if (!opacitiesRef.current || !uvOffsetsRef.current) return;
  
  geometry.setAttribute(
    'instanceOpacity',
    new THREE.InstancedBufferAttribute(opacitiesRef.current, 1)
  );
  geometry.setAttribute(
    'instanceUvOffset',
    new THREE.InstancedBufferAttribute(uvOffsetsRef.current, 2)
  );
}, [geometry, opacitiesRef.current, uvOffsetsRef.current]);
```

**Fix 3: Guard against null/undefined coupons**

```typescript
// In DrawScreen
const safeCoupons = useMemo(() => {
  if (!coupons || coupons.length === 0) {
    // Return dummy data to prevent crash
    return Array.from({ length: 100 }, (_, i) => ({
      id: `COUPON-${i}`,
      participantId: `P${i}`,
      participantName: `Participant ${i}`
    }));
  }
  return coupons;
}, [coupons]);
```

**Complete Fixed InstancedCards:**

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
  coupons: Array<{
    id: string;
    participantId: string;
    participantName?: string;
  }>;
  displayMode: 'coupon' | 'coupon-id' | 'coupon-name';
}

export function InstancedCards({
  count = SPHERE_CONFIG.cardCount,
  radius = SPHERE_CONFIG.radius,
  rows = SPHERE_CONFIG.rows,
  cardWidth = SPHERE_CONFIG.cardWidth,
  cardHeight = SPHERE_CONFIG.cardHeight,
  cardColor = SPHERE_CONFIG.cardColor,
  coupons,
  displayMode
}: InstancedCardsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Refs for mutable data (won't cause re-renders)
  const opacitiesRef = useRef<Float32Array>(new Float32Array(count));
  const uvOffsetsRef = useRef<Float32Array>(new Float32Array(count * 2));
  const isInitializedRef = useRef(false);

  // Sample coupons for atlas (stable reference)
  const atlasCoupons = useMemo(() => {
    if (!coupons || coupons.length === 0) return [];
    
    const maxTexts = SPHERE_CONFIG.atlasMaxTexts || 100;
    if (coupons.length <= maxTexts) return coupons;
    
    const shuffled = [...coupons].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, maxTexts);
  }, [coupons]);

  // Create texture atlas
  const atlas = useMemo(() => {
    if (atlasCoupons.length === 0) return null;
    
    return createTextureAtlas({
      coupons: atlasCoupons,
      displayMode,
      cols: SPHERE_CONFIG.atlasColumns || 10,
      cellWidth: SPHERE_CONFIG.atlasCellWidth || 128,
      cellHeight: SPHERE_CONFIG.atlasCellHeight || 64,
      fontSize: 14,
      fontFamily: 'Plus Jakarta Sans, Arial, sans-serif',
      textColor: '#0a2540',
      bgColor: '#fdf4f7'
    });
  }, [atlasCoupons, displayMode]);

  // Generate positions (stable)
  const positions = useMemo(() => {
    return distributeCardsLatitudeRows(count, radius, rows);
  }, [count, radius, rows]);

  // Geometry (stable)
  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(cardWidth, cardHeight);
  }, [cardWidth, cardHeight]);

  // Material (depends on atlas)
  const material = useMemo(() => {
    if (!atlas) return null;
    
    return new THREE.ShaderMaterial({
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
          vec2 atlasUv = vUvOffset + vUv * uCellSize;
          vec4 texColor = texture2D(uTexture, atlasUv);
          vec3 finalColor = mix(texColor.rgb, uTintColor, 0.3);
          
          gl_FragColor = vec4(finalColor, vOpacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
  }, [atlas, cardColor]);

  // Initialize instance data
  useEffect(() => {
    if (!atlas || !meshRef.current || isInitializedRef.current) return;
    
    // Initialize opacities and UV offsets
    for (let i = 0; i < count; i++) {
      opacitiesRef.current[i] = 0.4 + Math.random() * 0.5;
      
      const textIndex = Math.floor(Math.random() * atlasCoupons.length);
      const col = textIndex % atlas.cols;
      const row = Math.floor(textIndex / atlas.cols);
      
      uvOffsetsRef.current[i * 2] = col * atlas.cellUVWidth;
      uvOffsetsRef.current[i * 2 + 1] = row * atlas.cellUVHeight;
    }

    // Set geometry attributes
    geometry.setAttribute(
      'instanceOpacity',
      new THREE.InstancedBufferAttribute(opacitiesRef.current, 1)
    );
    geometry.setAttribute(
      'instanceUvOffset',
      new THREE.InstancedBufferAttribute(uvOffsetsRef.current, 2)
    );

    // Set positions
    positions.forEach((pos, i) => {
      dummy.position.set(pos.x, pos.y, pos.z);
      dummy.lookAt(0, 0, 0);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    isInitializedRef.current = true;
    
    console.log('[InstancedCards] Initialized with', count, 'cards');
  }, [atlas, count, positions, geometry, dummy, atlasCoupons]);

  // Animate opacity and UV changes
  useFrame(() => {
    if (!meshRef.current || !atlas || !isInitializedRef.current) return;

    const opacityAttr = meshRef.current.geometry.attributes.instanceOpacity;
    const uvOffsetAttr = meshRef.current.geometry.attributes.instanceUvOffset;

    if (!opacityAttr || !uvOffsetAttr) return;

    // Update ~2% of cards per frame
    const updateCount = Math.ceil(count * 0.02);
    
    for (let i = 0; i < updateCount; i++) {
      const randomIndex = Math.floor(Math.random() * count);
      
      // New opacity
      opacitiesRef.current[randomIndex] = 0.4 + Math.random() * 0.5;
      
      // New UV offset (new random text)
      const newTextIndex = Math.floor(Math.random() * atlasCoupons.length);
      const col = newTextIndex % atlas.cols;
      const row = Math.floor(newTextIndex / atlas.cols);
      
      uvOffsetsRef.current[randomIndex * 2] = col * atlas.cellUVWidth;
      uvOffsetsRef.current[randomIndex * 2 + 1] = row * atlas.cellUVHeight;
    }

    opacityAttr.needsUpdate = true;
    uvOffsetAttr.needsUpdate = true;
  });

  // Don't render if atlas not ready
  if (!atlas || !material) {
    return null;
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
    />
  );
}

// Distribution function (unchanged)
function distributeCardsLatitudeRows(
  totalCards: number,
  radius: number,
  rows: number
): { x: number; y: number; z: number }[] {
  // ... same as before
}
```

---

## Issue 3: Background Image Tidak Diambil dari Event Config

### Problem
Background DrawScreen tidak menggunakan image yang di-set di event config.

### Solution

**DrawScreen should read background from event:**

```typescript
// src/pages/DrawScreen.tsx

export function DrawScreen() {
  const { eventId } = useParams();
  const { data: event } = useEvent(eventId);
  
  // Get background image from event settings
  const backgroundImage = event?.displaySettings?.backgroundImage;

  return (
    <div 
      className="min-h-screen bg-[#f6f9fc] flex relative"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Optional: overlay for readability */}
      {backgroundImage && (
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      )}
      
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* ... rest of content */}
      </div>
    </div>
  );
}
```

**Check Event type has backgroundImage:**

```typescript
// src/types/index.ts

interface DisplaySettings {
  mode: 'coupon' | 'coupon-id' | 'coupon-name';
  gridX: number;
  gridY: number;
  backgroundImage?: string; // Base64 atau URL
}

interface Event {
  // ... other fields
  displaySettings: DisplaySettings;
}
```

**If backgroundImage is stored in IndexedDB as blob:**

```typescript
// Hook to get background image
function useEventBackgroundImage(eventId: string) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadImage() {
      const event = await eventRepository.getById(eventId);
      if (event?.displaySettings?.backgroundImage) {
        // If stored as blob
        if (event.displaySettings.backgroundImage instanceof Blob) {
          const url = URL.createObjectURL(event.displaySettings.backgroundImage);
          setImageUrl(url);
          return () => URL.revokeObjectURL(url);
        }
        // If stored as base64 or URL string
        setImageUrl(event.displaySettings.backgroundImage);
      }
    }
    loadImage();
  }, [eventId]);

  return imageUrl;
}

// Usage in DrawScreen
export function DrawScreen() {
  const { eventId } = useParams();
  const backgroundImage = useEventBackgroundImage(eventId!);
  
  // ... rest
}
```

---

## Summary of Changes

| # | Issue | Solution |
|---|-------|----------|
| 1 | Display mode tidak sesuai | Pass `displayMode` ke texture atlas, format text sesuai mode |
| 2 | Sphere menghilang | Fix memory management dengan refs, guard against null data |
| 3 | Background image | Read dari event.displaySettings.backgroundImage |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils/textureAtlas.ts` | Accept coupons + displayMode, format text accordingly |
| `src/components/draw/InstancedCards.tsx` | Accept displayMode prop, fix memory leaks |
| `src/components/draw/SphereMesh.tsx` | Pass displayMode prop |
| `src/components/draw/Sphere3D.tsx` | Pass displayMode prop |
| `src/pages/DrawScreen.tsx` | Pass displayMode, add background image |
| `src/types/index.ts` | Ensure DisplaySettings has backgroundImage |

---

## Testing Checklist

### Issue 1 - Display Mode:
- [ ] Mode `coupon` → shows coupon ID only
- [ ] Mode `coupon-id` → shows coupon ID + participant ID
- [ ] Mode `coupon-name` → shows coupon ID + participant name
- [ ] Text changes when displayMode setting changes

### Issue 2 - Sphere Stability:
- [ ] Sphere stays visible after 1 minute
- [ ] Sphere stays visible after 5 minutes
- [ ] No console errors about null/undefined
- [ ] Card count remains consistent (check with console.log)

### Issue 3 - Background Image:
- [ ] Background shows if set in event config
- [ ] Default background (#f6f9fc) if no image set
- [ ] Image covers full screen
- [ ] Content still readable over background
