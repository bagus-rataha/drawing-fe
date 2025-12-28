# Raffle App - DrawScreen Animation Revision 06

## Overview

Revisi untuk fix 4 issues:
1. Teks di card terbalik/mirroring
2. Sphere menghilang di development mode
3. Font styling mengikuti reference
4. Winner tidak sesuai draw mode

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Issue 2: Sphere Menghilang di Development Mode

### Problem
- Sphere muncul normal di awal
- Setelah beberapa saat, sphere menghilang (hanya 1 card di tengah)
- **Hanya terjadi di `npm run dev`**, production build OK

### Root Cause
Kemungkinan besar disebabkan oleh:
1. **React Strict Mode** - double mounting/unmounting components
2. **Hot Module Replacement (HMR)** - re-renders saat file berubah
3. **Vite dev server** - caching/state issues

### Solution

**Fix 1: Handle React Strict Mode dengan cleanup yang proper**

```typescript
// src/components/draw/InstancedCards.tsx

export function InstancedCards(props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const isInitializedRef = useRef(false);
  const isMountedRef = useRef(true);

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reset initialization on unmount (for Strict Mode)
  useEffect(() => {
    return () => {
      isInitializedRef.current = false;
    };
  }, []);

  // Initialize - with mount check
  useEffect(() => {
    if (!atlas || !meshRef.current || isInitializedRef.current) return;
    if (!isMountedRef.current) return; // Skip if unmounted

    // ... initialization code
    
    isInitializedRef.current = true;
  }, [atlas, count, positions, geometry, dummy, atlasCoupons]);

  // ... rest
}
```

**Fix 2: Stable refs with proper dependency management (RECOMMENDED)**

```typescript
// src/components/draw/InstancedCards.tsx

export function InstancedCards(props) {
  const { count, coupons, displayMode } = props;
  
  // Use refs for data that should persist across re-renders
  const dataRef = useRef({
    opacities: new Float32Array(count),
    uvOffsets: new Float32Array(count * 2),
    initialized: false
  });

  // Only reinitialize if count actually changes
  useEffect(() => {
    if (dataRef.current.opacities.length !== count) {
      dataRef.current = {
        opacities: new Float32Array(count),
        uvOffsets: new Float32Array(count * 2),
        initialized: false
      };
    }
  }, [count]);

  // Initialize positions - runs once per mount
  useEffect(() => {
    if (!meshRef.current || !atlas || dataRef.current.initialized) return;

    // Initialize opacities and UV offsets
    for (let i = 0; i < count; i++) {
      dataRef.current.opacities[i] = 0.4 + Math.random() * 0.5;
      
      const textIndex = Math.floor(Math.random() * atlasCoupons.length);
      const col = textIndex % atlas.cols;
      const row = Math.floor(textIndex / atlas.cols);
      
      dataRef.current.uvOffsets[i * 2] = col * atlas.cellUVWidth;
      dataRef.current.uvOffsets[i * 2 + 1] = row * atlas.cellUVHeight;
    }

    // Set geometry attributes
    const geo = meshRef.current.geometry;
    geo.setAttribute('instanceOpacity', new THREE.InstancedBufferAttribute(dataRef.current.opacities, 1));
    geo.setAttribute('instanceUvOffset', new THREE.InstancedBufferAttribute(dataRef.current.uvOffsets, 2));

    // Set positions
    positions.forEach((pos, i) => {
      dummy.position.set(pos.x, pos.y, pos.z);
      dummy.lookAt(0, 0, 0);
      dummy.rotateY(Math.PI);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    dataRef.current.initialized = true;

    console.log('[InstancedCards] Initialized successfully');
  }, [atlas, count, positions, dummy, atlasCoupons]);

  // Animation loop - check for valid state
  useFrame(() => {
    if (!meshRef.current || !atlas || !dataRef.current.initialized) return;

    const opacityAttr = meshRef.current.geometry.attributes.instanceOpacity;
    const uvOffsetAttr = meshRef.current.geometry.attributes.instanceUvOffset;

    if (!opacityAttr || !uvOffsetAttr) return;

    // Update cards
    const updateCount = Math.ceil(count * 0.02);
    for (let i = 0; i < updateCount; i++) {
      const idx = Math.floor(Math.random() * count);
      
      dataRef.current.opacities[idx] = 0.4 + Math.random() * 0.5;
      
      const newTextIndex = Math.floor(Math.random() * atlasCoupons.length);
      const col = newTextIndex % atlas.cols;
      const row = Math.floor(newTextIndex / atlas.cols);
      
      dataRef.current.uvOffsets[idx * 2] = col * atlas.cellUVWidth;
      dataRef.current.uvOffsets[idx * 2 + 1] = row * atlas.cellUVHeight;
    }

    opacityAttr.needsUpdate = true;
    uvOffsetAttr.needsUpdate = true;
  });

  // ... rest
}
```

**Fix 3: Use key to force clean remount**

```typescript
// src/pages/DrawScreen.tsx

// Add unique key to force clean remount
const [sphereKey, setSphereKey] = useState(Date.now());

return (
  <Sphere3D 
    key={sphereKey}  // Force clean remount when needed
    isSpinning={isSpinning}
    // ...
  />
);
```

**Recommended approach:** Kombinasi Fix 1 + Fix 2 untuk handling yang robust di development mode.

---

## Issue 1: Teks Terbalik/Mirroring

### Problem
Card menggunakan `lookAt(0, 0, 0)` sehingga menghadap ke center sphere. Dari perspektif luar (camera), teks terlihat terbalik.

### Solution: Rotate Card 180° setelah lookAt

```typescript
// src/components/draw/InstancedCards.tsx

// Di bagian set positions
positions.forEach((pos, i) => {
  dummy.position.set(pos.x, pos.y, pos.z);
  
  // lookAt center
  dummy.lookAt(0, 0, 0);
  
  // Rotate 180° di Y axis agar teks menghadap ke luar (bukan ke center)
  dummy.rotateY(Math.PI);
  
  dummy.updateMatrix();
  meshRef.current!.setMatrixAt(i, dummy.matrix);
});
```

### Alternative: Flip UV di Shader

Jika rotate tidak bekerja, bisa flip UV horizontal di fragment shader:

```glsl
// Fragment shader
void main() {
  // Flip UV horizontally
  vec2 flippedUv = vec2(1.0 - vUv.x, vUv.y);
  vec2 atlasUv = vUvOffset + flippedUv * uCellSize;
  
  vec4 texColor = texture2D(uTexture, atlasUv);
  // ...
}
```

---

## Issue 1.5: Sphere Menghilang di Development Mode

### Problem
- Sphere muncul normal di awal
- Setelah beberapa saat, sphere menghilang (hanya 1 card di tengah)
- **Hanya terjadi di `npm run dev`**, production build OK

### Root Cause
Kemungkinan besar disebabkan oleh:
1. **React Strict Mode** - double mounting/unmounting components
2. **Hot Module Replacement (HMR)** - re-renders saat file berubah
3. **Vite dev server** - caching/state issues

### Solution

**Fix 1: Handle React Strict Mode dengan cleanup yang proper**

```typescript
// src/components/draw/InstancedCards.tsx

export function InstancedCards(props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const isInitializedRef = useRef(false);
  const isMountedRef = useRef(true);

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reset initialization on unmount (for Strict Mode)
  useEffect(() => {
    return () => {
      isInitializedRef.current = false;
    };
  }, []);

  // Initialize - with mount check
  useEffect(() => {
    if (!atlas || !meshRef.current || isInitializedRef.current) return;
    if (!isMountedRef.current) return; // Skip if unmounted

    // ... initialization code
    
    isInitializedRef.current = true;
  }, [atlas, count, positions, geometry, dummy, atlasCoupons]);

  // ... rest
}
```

**Fix 2: Disable React Strict Mode di development (temporary)**

```typescript
// src/main.tsx

// BEFORE:
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// AFTER (for debugging):
ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);
```

**Fix 3: Use key to force remount on HMR**

```typescript
// src/pages/DrawScreen.tsx

// Add unique key to force clean remount
const [sphereKey, setSphereKey] = useState(Date.now());

// Reset sphere on certain conditions
useEffect(() => {
  // Force remount if needed
  setSphereKey(Date.now());
}, [eventId]);

return (
  <Sphere3D 
    key={sphereKey}  // Force clean remount
    isSpinning={isSpinning}
    // ...
  />
);
```

**Fix 4: Stable refs with proper dependency management**

```typescript
// src/components/draw/InstancedCards.tsx

export function InstancedCards(props) {
  const { count, coupons, displayMode } = props;
  
  // Use refs for data that should persist across re-renders
  const dataRef = useRef({
    opacities: new Float32Array(count),
    uvOffsets: new Float32Array(count * 2),
    initialized: false
  });

  // Only reinitialize if count actually changes
  useEffect(() => {
    if (dataRef.current.opacities.length !== count) {
      dataRef.current = {
        opacities: new Float32Array(count),
        uvOffsets: new Float32Array(count * 2),
        initialized: false
      };
    }
  }, [count]);

  // Initialize positions - runs once per mount
  useEffect(() => {
    if (!meshRef.current || !atlas || dataRef.current.initialized) return;

    // Initialize opacities and UV offsets
    for (let i = 0; i < count; i++) {
      dataRef.current.opacities[i] = 0.4 + Math.random() * 0.5;
      
      const textIndex = Math.floor(Math.random() * atlasCoupons.length);
      const col = textIndex % atlas.cols;
      const row = Math.floor(textIndex / atlas.cols);
      
      dataRef.current.uvOffsets[i * 2] = col * atlas.cellUVWidth;
      dataRef.current.uvOffsets[i * 2 + 1] = row * atlas.cellUVHeight;
    }

    // Set geometry attributes
    const geo = meshRef.current.geometry;
    geo.setAttribute('instanceOpacity', new THREE.InstancedBufferAttribute(dataRef.current.opacities, 1));
    geo.setAttribute('instanceUvOffset', new THREE.InstancedBufferAttribute(dataRef.current.uvOffsets, 2));

    // Set positions
    positions.forEach((pos, i) => {
      dummy.position.set(pos.x, pos.y, pos.z);
      dummy.lookAt(0, 0, 0);
      dummy.rotateY(Math.PI);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    dataRef.current.initialized = true;

    console.log('[InstancedCards] Initialized successfully');
  }, [atlas, count, positions, dummy, atlasCoupons]);

  // Animation loop - check for valid state
  useFrame(() => {
    if (!meshRef.current || !atlas || !dataRef.current.initialized) return;

    const opacityAttr = meshRef.current.geometry.attributes.instanceOpacity;
    const uvOffsetAttr = meshRef.current.geometry.attributes.instanceUvOffset;

    if (!opacityAttr || !uvOffsetAttr) return;

    // Update cards
    const updateCount = Math.ceil(count * 0.02);
    for (let i = 0; i < updateCount; i++) {
      const idx = Math.floor(Math.random() * count);
      
      dataRef.current.opacities[idx] = 0.4 + Math.random() * 0.5;
      
      const newTextIndex = Math.floor(Math.random() * atlasCoupons.length);
      const col = newTextIndex % atlas.cols;
      const row = Math.floor(newTextIndex / atlas.cols);
      
      dataRef.current.uvOffsets[idx * 2] = col * atlas.cellUVWidth;
      dataRef.current.uvOffsets[idx * 2 + 1] = row * atlas.cellUVHeight;
    }

    opacityAttr.needsUpdate = true;
    uvOffsetAttr.needsUpdate = true;
  });

  // ... rest
}
```

**Recommended approach:** Kombinasi Fix 1 + Fix 4 untuk handling yang robust di development mode.

---

## Issue 2: Font Styling (Reference log-lottery)

### Reference Styling dari log-lottery:

Berdasarkan screenshot reference:

| Element | Style |
|---------|-------|
| Card background | Pink semi-transparan (#e8b4c8 @ 50-70% opacity) |
| Primary text | Dark (bisa #0a2540 atau maroon #800020) |
| Secondary text | Lighter gray atau muted red |
| Font | Sans-serif, bold untuk nama |

### Add Font Config ke SPHERE_CONFIG

```typescript
// src/utils/constants.ts

export const SPHERE_CONFIG = {
  // ... existing config
  
  /** Card background color */
  cardColor: '#e8b4c8',
  
  /** Card background opacity range [min, max] */
  cardOpacityRange: [0.4, 0.8],
  
  /** Font settings for card text */
  fontSettings: {
    /** Primary text color (name/coupon) */
    primaryColor: '#0a2540',
    
    /** Secondary text color (ID) */
    secondaryColor: '#64748b',
    
    /** Alternative: use maroon for lottery feel */
    // primaryColor: '#800020',
    // secondaryColor: '#a05050',
    
    /** Font family */
    family: 'Plus Jakarta Sans, Arial, sans-serif',
    
    /** Font size for primary text */
    primarySize: 16,
    
    /** Font size for secondary text */
    secondarySize: 12,
    
    /** Font weight for primary text */
    primaryWeight: 'bold',
  }
}
```

### Update Texture Atlas to Use Font Config

```typescript
// src/utils/textureAtlas.ts
import { SPHERE_CONFIG } from './constants';

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
}

export function createTextureAtlas(config: AtlasConfig) {
  const { coupons, displayMode, cols, cellWidth, cellHeight } = config;
  const fontSettings = SPHERE_CONFIG.fontSettings;

  const rows = Math.ceil(coupons.length / cols);
  const canvasWidth = cols * cellWidth;
  const canvasHeight = rows * cellHeight;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;

  // Fill with card background color (will be tinted by shader anyway)
  ctx.fillStyle = '#fdf4f7';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  coupons.forEach((coupon, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    const x = col * cellWidth + cellWidth / 2;
    const y = row * cellHeight + cellHeight / 2;

    // Generate display text based on mode
    let primaryText = '';
    let secondaryText = '';
    
    switch (displayMode) {
      case 'coupon':
        primaryText = coupon.id;
        break;
      case 'coupon-id':
        primaryText = coupon.participantId;
        secondaryText = coupon.id;
        break;
      case 'coupon-name':
        primaryText = coupon.participantName || coupon.participantId;
        secondaryText = coupon.id;
        break;
    }

    const lineHeight = fontSettings.primarySize + 6;

    // Draw secondary text (coupon ID) - top, smaller
    if (secondaryText) {
      ctx.font = `${fontSettings.secondarySize}px ${fontSettings.family}`;
      ctx.fillStyle = fontSettings.secondaryColor;
      
      const truncatedSecondary = truncateText(ctx, secondaryText, cellWidth - 10);
      ctx.fillText(truncatedSecondary, x, y - lineHeight / 2);
    }

    // Draw primary text (name/main) - center, bold
    ctx.font = `${fontSettings.primaryWeight} ${fontSettings.primarySize}px ${fontSettings.family}`;
    ctx.fillStyle = fontSettings.primaryColor;
    
    const truncatedPrimary = truncateText(ctx, primaryText, cellWidth - 10);
    const primaryY = secondaryText ? y + lineHeight / 2 : y;
    ctx.fillText(truncatedPrimary, x, primaryY);
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

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  
  let truncated = text;
  while (ctx.measureText(truncated + '..').width > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '..';
}
```

---

## Issue 3: Winner Tidak Sesuai Draw Mode

### Problem
Semua winners langsung keluar sebanyak quantity prize, tidak mengikuti draw mode.

### Draw Modes Reminder

| Mode | Behavior |
|------|----------|
| `one-by-one` | Draw 1 winner, reveal 1, repeat sampai qty tercapai |
| `batch` | Draw N winners per batch, reveal N, repeat sampai qty tercapai |
| `all-at-once` | Draw semua qty sekaligus, reveal semua |

### Prize Type (Review)

```typescript
interface Prize {
  id: string;
  name: string;
  quantity: number;
  drawMode: 'one-by-one' | 'batch' | 'all-at-once';
  batchSize?: number; // Only for batch mode
  // ...
}
```

### Fix: DrawScreen State Management

```typescript
// src/pages/DrawScreen.tsx

interface DrawState {
  status: 'idle' | 'spinning' | 'stopped' | 'reviewing';
  currentPrizeIndex: number;
  currentDrawIndex: number;  // Track which draw we're on within a prize
  winners: DrawResult[];
  totalDrawsForPrize: number; // Calculated based on draw mode
}

export function DrawScreen() {
  const { eventId } = useParams();
  const { data: event } = useEvent(eventId);
  const { data: prizes } = usePrizes(eventId);
  
  const [state, setState] = useState<DrawState>({
    status: 'idle',
    currentPrizeIndex: 0,
    currentDrawIndex: 0,
    winners: [],
    totalDrawsForPrize: 0
  });

  const currentPrize = prizes?.[state.currentPrizeIndex];

  // Calculate how many draws needed for current prize
  const calculateTotalDraws = (prize: Prize): number => {
    switch (prize.drawMode) {
      case 'one-by-one':
        return prize.quantity; // 1 winner per draw
      case 'batch':
        return Math.ceil(prize.quantity / (prize.batchSize || 5));
      case 'all-at-once':
        return 1; // All in one draw
    }
  };

  // Calculate how many winners to draw this round
  const getDrawQuantity = (prize: Prize, drawIndex: number): number => {
    switch (prize.drawMode) {
      case 'one-by-one':
        return 1;
      case 'batch':
        const batchSize = prize.batchSize || 5;
        const remaining = prize.quantity - (drawIndex * batchSize);
        return Math.min(batchSize, remaining);
      case 'all-at-once':
        return prize.quantity;
    }
  };

  // Handle Stop button click
  const handleStop = async () => {
    if (!currentPrize) return;

    setState(prev => ({ ...prev, status: 'stopped' }));

    // Calculate how many to draw this round
    const drawQty = getDrawQuantity(currentPrize, state.currentDrawIndex);

    // Call draw service
    const results = await drawService.draw(
      eventId!,
      currentPrize.id,
      drawQty,
      state.currentDrawIndex + 1 // batch number
    );

    setState(prev => ({
      ...prev,
      status: 'reviewing',
      winners: [...prev.winners, ...results]
    }));
  };

  // Handle Confirm button click
  const handleConfirm = async () => {
    if (!currentPrize) return;

    await drawService.confirm(currentPrize.id);

    const totalDraws = calculateTotalDraws(currentPrize);
    const nextDrawIndex = state.currentDrawIndex + 1;

    if (nextDrawIndex < totalDraws) {
      // More draws needed for this prize
      setState(prev => ({
        ...prev,
        status: 'idle',
        currentDrawIndex: nextDrawIndex
      }));
    } else {
      // This prize is complete, move to next prize
      const nextPrizeIndex = state.currentPrizeIndex + 1;
      
      if (nextPrizeIndex < (prizes?.length || 0)) {
        setState({
          status: 'idle',
          currentPrizeIndex: nextPrizeIndex,
          currentDrawIndex: 0,
          winners: [],
          totalDrawsForPrize: calculateTotalDraws(prizes![nextPrizeIndex])
        });
      } else {
        // All prizes complete
        navigate(`/event/${eventId}/results`);
      }
    }
  };

  // Initialize total draws when prize changes
  useEffect(() => {
    if (currentPrize) {
      setState(prev => ({
        ...prev,
        totalDrawsForPrize: calculateTotalDraws(currentPrize)
      }));
    }
  }, [currentPrize]);

  // Calculate progress text
  const getProgressText = () => {
    if (!currentPrize) return '';
    
    switch (currentPrize.drawMode) {
      case 'one-by-one':
        return `Draw ${state.currentDrawIndex + 1}/${currentPrize.quantity}`;
      case 'batch':
        const batchSize = currentPrize.batchSize || 5;
        const totalBatches = Math.ceil(currentPrize.quantity / batchSize);
        return `Batch ${state.currentDrawIndex + 1}/${totalBatches}`;
      case 'all-at-once':
        return `Drawing ${currentPrize.quantity} winners`;
    }
  };

  return (
    <div>
      {/* Header */}
      <DrawHeader 
        eventName={event?.name}
        prizeName={currentPrize?.name}
        prizeIndex={state.currentPrizeIndex + 1}
        totalPrizes={prizes?.length || 0}
        progressText={getProgressText()}
      />

      {/* Sphere */}
      <Sphere3D 
        isSpinning={state.status === 'spinning'}
        isIdle={state.status === 'idle'}
        coupons={coupons}
        displayMode={event?.displaySettings?.mode || 'coupon-name'}
      />

      {/* Winner Cards - only current batch */}
      <WinnerGallery 
        winners={state.winners}
        // ... other props
      />

      {/* Controls */}
      <DrawControls
        status={state.status}
        onStart={() => setState(prev => ({ ...prev, status: 'spinning' }))}
        onStop={handleStop}
        onConfirm={handleConfirm}
        onRedrawAll={handleRedrawAll}
        // ... other props
      />
    </div>
  );
}
```

### Floating Info Elements (No Header Bar)

**PENTING:** Tidak ada header bar yang blocking. Semua info sebagai floating elements.

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  [← Back]                                         [Draw 3/10]       │
│                                                                     │
│  [Prize Panel]                                                      │
│                                                                     │
│                           SPHERE                                    │
│                       (full viewport)                               │
│                                                                     │
│                                                                     │
│                        [Start Draw]              ← Floating         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// src/pages/DrawScreen.tsx

export function DrawScreen() {
  // ... state management code

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#f6f9fc'
      }}
    >
      {/* Floating Back Button - top left */}
      <button 
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 z-50 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-[#e2e8f0] hover:bg-white"
      >
        <ArrowLeft className="w-5 h-5 text-[#64748b]" />
      </button>

      {/* Floating Progress Badge - top right */}
      <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-[#e2e8f0]">
        <p className="text-sm font-medium text-[#635bff]">{progressText}</p>
      </div>

      {/* Prize Panel - floating left (existing) */}
      <PrizePanel 
        prizes={prizes}
        currentPrizeIndex={state.currentPrizeIndex}
        // ...
      />

      {/* Sphere - full viewport */}
      <div className="absolute inset-0">
        <Sphere3D 
          isSpinning={state.status === 'spinning'}
          isIdle={state.status === 'idle'}
          coupons={coupons}
          displayMode={displayMode}
        />
      </div>

      {/* Winner Cards Overlay */}
      <WinnerGallery 
        winners={state.winners}
        gridX={event?.displaySettings?.gridX || 5}
        gridY={event?.displaySettings?.gridY || 2}
        // ...
      />

      {/* Floating Controls - bottom center */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">
        {/* Pagination */}
        {showPagination && (
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-[#e2e8f0]">
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          {state.status === 'idle' && (
            <button 
              onClick={() => setState(prev => ({ ...prev, status: 'spinning' }))}
              className="px-8 py-3 bg-[#635bff] text-white font-medium rounded-full shadow-lg hover:bg-[#524acc]"
            >
              Start Draw
            </button>
          )}

          {state.status === 'spinning' && (
            <button 
              onClick={handleStop}
              className="px-8 py-3 bg-red-500 text-white font-medium rounded-full shadow-lg hover:bg-red-600"
            >
              Stop
            </button>
          )}

          {state.status === 'reviewing' && (
            <>
              {hasCancelled && (
                <button 
                  onClick={handleRedrawAll}
                  className="px-6 py-3 bg-amber-500 text-white font-medium rounded-full shadow-lg hover:bg-amber-600"
                >
                  Redraw All
                </button>
              )}
              <button 
                onClick={handleConfirm}
                className="px-8 py-3 bg-[#635bff] text-white font-medium rounded-full shadow-lg hover:bg-[#524acc]"
              >
                Confirm
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Summary of Changes

| # | Issue | Solution |
|---|-------|----------|
| 1 | Teks terbalik | Rotate card 180° (rotateY) setelah lookAt, atau flip UV di shader |
| 2 | Sphere menghilang (dev mode) | Stable refs + proper cleanup untuk React Strict Mode/HMR |
| 3 | Font styling | Add fontSettings ke SPHERE_CONFIG, update texture atlas generator |
| 4 | Draw mode | Fix DrawScreen state management untuk handle one-by-one, batch, all-at-once |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/draw/InstancedCards.tsx` | Add rotateY(Math.PI), fix refs untuk dev mode stability |
| `src/utils/constants.ts` | Add fontSettings ke SPHERE_CONFIG |
| `src/utils/textureAtlas.ts` | Use fontSettings, improve text rendering |
| `src/pages/DrawScreen.tsx` | Fix state management untuk draw modes, floating elements layout |

---

## Testing Checklist

### Issue 1 - Text Mirroring:
- [ ] Text readable dari luar sphere (tidak terbalik)
- [ ] Text terlihat benar dari berbagai sudut

### Issue 2 - Sphere Stability (Dev Mode):
- [ ] Sphere tetap muncul setelah 1 menit di npm run dev
- [ ] Sphere tetap muncul setelah HMR/hot reload
- [ ] Tidak ada console errors

### Issue 3 - Font Styling:
- [ ] Primary text menggunakan warna dari config
- [ ] Secondary text menggunakan warna dari config
- [ ] Font family correct
- [ ] Font size correct

### Issue 4 - Draw Mode:
- [ ] one-by-one: 1 winner per draw
- [ ] batch: N winners per batch
- [ ] all-at-once: semua winners sekaligus
- [ ] Progress text shows correct count
- [ ] Confirm advances to next draw/prize correctly
