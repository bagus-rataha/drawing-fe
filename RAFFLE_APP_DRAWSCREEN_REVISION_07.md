# Raffle App - DrawScreen Animation Revision 07

## Overview

Revisi untuk fix 5 issues:
1. Sphere masih hilang di development mode
2. Button glitch (berganti-ganti tanpa action)
3. Header masih ada + Prize counter masih muncul
4. Prize Winners Modal table terlalu besar
5. Event status tidak berubah saat draw dimulai

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Issue 1: Sphere Masih Hilang di Dev Mode

### Problem
Fix sebelumnya belum mengatasi masalah. Sphere tetap hilang setelah beberapa saat di `npm run dev`.

### Root Cause Analysis
Kemungkinan penyebab yang belum di-address:
1. **useFrame callback** - mungkin ada stale closure
2. **Geometry/Material disposal** - tidak di-cleanup dengan benar
3. **Multiple Canvas instances** - React Strict Mode membuat 2 Canvas

### Solution: Complete Rewrite with Stable Pattern

```typescript
// src/components/draw/InstancedCards.tsx
import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createTextureAtlas } from '../../utils/textureAtlas';
import { SPHERE_CONFIG } from '../../utils/constants';

interface InstancedCardsProps {
  count: number;
  radius: number;
  rows?: number;
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
  coupons,
  displayMode
}: InstancedCardsProps) {
  // Single ref object for all mutable state
  const stateRef = useRef({
    initialized: false,
    opacities: null as Float32Array | null,
    uvOffsets: null as Float32Array | null,
    mesh: null as THREE.InstancedMesh | null,
  });

  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Stable dummy object
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Sample coupons for atlas
  const atlasCoupons = useMemo(() => {
    if (!coupons || coupons.length === 0) {
      // Fallback dummy data
      return Array.from({ length: 50 }, (_, i) => ({
        id: `CP-${i}`,
        participantId: `P-${i}`,
        participantName: `Name ${i}`
      }));
    }
    const maxTexts = SPHERE_CONFIG.atlasMaxTexts || 100;
    if (coupons.length <= maxTexts) return coupons;
    return [...coupons].sort(() => Math.random() - 0.5).slice(0, maxTexts);
  }, [coupons]);

  // Create texture atlas - stable
  const atlas = useMemo(() => {
    if (atlasCoupons.length === 0) return null;
    return createTextureAtlas({
      coupons: atlasCoupons,
      displayMode,
      cols: SPHERE_CONFIG.atlasColumns || 10,
      cellWidth: SPHERE_CONFIG.atlasCellWidth || 128,
      cellHeight: SPHERE_CONFIG.atlasCellHeight || 64,
    });
  }, [atlasCoupons, displayMode]);

  // Generate positions - stable
  const positions = useMemo(() => {
    return distributeCardsLatitudeRows(count, radius, rows);
  }, [count, radius, rows]);

  // Geometry - stable, no dependencies on mutable data
  const geometry = useMemo(() => {
    const cardWidth = SPHERE_CONFIG.cardWidth || 1.2;
    const cardHeight = SPHERE_CONFIG.cardHeight || 1.8;
    return new THREE.PlaneGeometry(cardWidth, cardHeight);
  }, []);

  // Material - depends only on atlas
  const material = useMemo(() => {
    if (!atlas) return null;
    
    const cardColor = SPHERE_CONFIG.cardColor || '#e8b4c8';
    
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
          vec2 flippedUv = vec2(1.0 - vUv.x, vUv.y);
          vec2 atlasUv = vUvOffset + flippedUv * uCellSize;
          vec4 texColor = texture2D(uTexture, atlasUv);
          vec3 finalColor = mix(texColor.rgb, uTintColor, 0.3);
          gl_FragColor = vec4(finalColor, vOpacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
  }, [atlas]);

  // Initialize mesh - only runs when mesh is available and not initialized
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !atlas || stateRef.current.initialized) return;

    // Create arrays
    const opacities = new Float32Array(count);
    const uvOffsets = new Float32Array(count * 2);

    for (let i = 0; i < count; i++) {
      opacities[i] = 0.4 + Math.random() * 0.5;
      
      const textIndex = Math.floor(Math.random() * atlasCoupons.length);
      const col = textIndex % atlas.cols;
      const row = Math.floor(textIndex / atlas.cols);
      
      uvOffsets[i * 2] = col * atlas.cellUVWidth;
      uvOffsets[i * 2 + 1] = row * atlas.cellUVHeight;
    }

    // Store in ref
    stateRef.current.opacities = opacities;
    stateRef.current.uvOffsets = uvOffsets;
    stateRef.current.mesh = mesh;

    // Set geometry attributes
    geometry.setAttribute('instanceOpacity', new THREE.InstancedBufferAttribute(opacities, 1));
    geometry.setAttribute('instanceUvOffset', new THREE.InstancedBufferAttribute(uvOffsets, 2));

    // Set positions
    positions.forEach((pos, i) => {
      dummy.position.set(pos.x, pos.y, pos.z);
      dummy.lookAt(0, 0, 0);
      dummy.rotateY(Math.PI);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    stateRef.current.initialized = true;

    // Cleanup function
    return () => {
      stateRef.current.initialized = false;
      stateRef.current.opacities = null;
      stateRef.current.uvOffsets = null;
      stateRef.current.mesh = null;
    };
  }, [atlas, count, positions, geometry, dummy, atlasCoupons]);

  // Animation frame - stable callback
  useFrame(() => {
    const { initialized, opacities, uvOffsets, mesh } = stateRef.current;
    if (!initialized || !opacities || !uvOffsets || !mesh || !atlas) return;

    const opacityAttr = mesh.geometry.attributes.instanceOpacity;
    const uvOffsetAttr = mesh.geometry.attributes.instanceUvOffset;
    if (!opacityAttr || !uvOffsetAttr) return;

    // Update ~2% of cards per frame
    const updateCount = Math.ceil(count * 0.02);
    for (let i = 0; i < updateCount; i++) {
      const idx = Math.floor(Math.random() * count);
      
      opacities[idx] = 0.4 + Math.random() * 0.5;
      
      const newTextIndex = Math.floor(Math.random() * atlasCoupons.length);
      const col = newTextIndex % atlas.cols;
      const row = Math.floor(newTextIndex / atlas.cols);
      
      uvOffsets[idx * 2] = col * atlas.cellUVWidth;
      uvOffsets[idx * 2 + 1] = row * atlas.cellUVHeight;
    }

    opacityAttr.needsUpdate = true;
    uvOffsetAttr.needsUpdate = true;
  });

  if (!atlas || !material) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      frustumCulled={false}
    />
  );
}

function distributeCardsLatitudeRows(totalCards: number, radius: number, rows: number) {
  // ... same implementation
}
```

**Key Changes:**
- Single `stateRef` object untuk semua mutable state
- Cleanup function yang proper di useEffect
- `frustumCulled={false}` untuk prevent culling issues
- Guard checks yang lebih robust di useFrame

---

## Issue 2: Button Glitch (Berganti-ganti Tanpa Action)

### Problem
Button Start Draw / Stop / Reveal Winner berganti-ganti tanpa ada klik dari user.

### Root Cause Analysis

Kemungkinan penyebab:
1. **State race condition** - multiple state updates yang conflicting
2. **Async operations** - state berubah saat async operation ongoing
3. **Effect dependencies** - useEffect yang trigger state change
4. **Re-render cascade** - parent re-render menyebabkan child state reset

### Debug: Add Console Logs

```typescript
// Tambahkan di DrawScreen.tsx untuk debug
useEffect(() => {
  console.log('[DrawScreen] State changed:', {
    status: state.status,
    currentPrizeIndex: state.currentPrizeIndex,
    currentDrawIndex: state.currentDrawIndex,
    winnersCount: state.winners.length
  });
}, [state]);
```

### Solution: Stabilize State Machine

```typescript
// src/pages/DrawScreen.tsx

type DrawStatus = 'idle' | 'spinning' | 'stopped' | 'revealing' | 'reviewing';

interface DrawState {
  status: DrawStatus;
  currentPrizeIndex: number;
  currentDrawIndex: number;
  winners: DrawResult[];
  isTransitioning: boolean; // NEW: prevent state changes during transition
}

// Use reducer for more predictable state updates
type DrawAction =
  | { type: 'START_SPIN' }
  | { type: 'STOP_SPIN' }
  | { type: 'SET_WINNERS'; winners: DrawResult[] }
  | { type: 'START_REVEAL' }
  | { type: 'FINISH_REVEAL' }
  | { type: 'CONFIRM' }
  | { type: 'NEXT_DRAW' }
  | { type: 'NEXT_PRIZE' }
  | { type: 'RESET' };

function drawReducer(state: DrawState, action: DrawAction): DrawState {
  // Prevent state changes during transition
  if (state.isTransitioning && action.type !== 'FINISH_REVEAL') {
    console.log('[DrawReducer] Blocked action during transition:', action.type);
    return state;
  }

  switch (action.type) {
    case 'START_SPIN':
      if (state.status !== 'idle') return state; // Guard
      return { ...state, status: 'spinning' };

    case 'STOP_SPIN':
      if (state.status !== 'spinning') return state; // Guard
      return { ...state, status: 'stopped', isTransitioning: true };

    case 'SET_WINNERS':
      return { ...state, winners: [...state.winners, ...action.winners] };

    case 'START_REVEAL':
      if (state.status !== 'stopped') return state; // Guard
      return { ...state, status: 'revealing' };

    case 'FINISH_REVEAL':
      return { ...state, status: 'reviewing', isTransitioning: false };

    case 'CONFIRM':
      if (state.status !== 'reviewing') return state; // Guard
      return { ...state, status: 'idle', currentDrawIndex: state.currentDrawIndex + 1 };

    case 'NEXT_PRIZE':
      return {
        ...state,
        status: 'idle',
        currentPrizeIndex: state.currentPrizeIndex + 1,
        currentDrawIndex: 0,
        winners: []
      };

    case 'RESET':
      return {
        status: 'idle',
        currentPrizeIndex: 0,
        currentDrawIndex: 0,
        winners: [],
        isTransitioning: false
      };

    default:
      return state;
  }
}

export function DrawScreen() {
  const [state, dispatch] = useReducer(drawReducer, {
    status: 'idle',
    currentPrizeIndex: 0,
    currentDrawIndex: 0,
    winners: [],
    isTransitioning: false
  });

  // Handler functions with guards
  const handleStartDraw = useCallback(() => {
    if (state.status !== 'idle') return;
    dispatch({ type: 'START_SPIN' });
  }, [state.status]);

  const handleStop = useCallback(async () => {
    if (state.status !== 'spinning') return;
    dispatch({ type: 'STOP_SPIN' });

    // Draw winners
    const results = await drawService.draw(/* params */);
    dispatch({ type: 'SET_WINNERS', winners: results });
    dispatch({ type: 'START_REVEAL' });

    // Wait for animation then finish
    setTimeout(() => {
      dispatch({ type: 'FINISH_REVEAL' });
    }, 3000); // Animation duration
  }, [state.status]);

  const handleConfirm = useCallback(async () => {
    if (state.status !== 'reviewing') return;
    await drawService.confirm(/* params */);
    dispatch({ type: 'CONFIRM' });
  }, [state.status]);

  // Render buttons based on state
  const renderControls = () => {
    // Disable all buttons during transition
    if (state.isTransitioning) {
      return (
        <button disabled className="...opacity-50 cursor-not-allowed">
          Processing...
        </button>
      );
    }

    switch (state.status) {
      case 'idle':
        return (
          <button onClick={handleStartDraw} className="...">
            Start Draw
          </button>
        );
      case 'spinning':
        return (
          <button onClick={handleStop} className="...">
            Stop
          </button>
        );
      case 'stopped':
      case 'revealing':
        return (
          <button disabled className="...opacity-50">
            Revealing...
          </button>
        );
      case 'reviewing':
        return (
          <>
            <button onClick={handleRedrawAll} className="...">
              Redraw All
            </button>
            <button onClick={handleConfirm} className="...">
              Confirm
            </button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    // ...
    {renderControls()}
    // ...
  );
}
```

**Key Changes:**
- Gunakan `useReducer` untuk predictable state updates
- Add `isTransitioning` flag untuk prevent race conditions
- Guard conditions di setiap action
- `useCallback` untuk stable handler references

---

## Issue 3: Header Masih Ada + Prize Counter

### Problem
- Header bar masih muncul (blocking viewport)
- Prize counter masih ada (1/4)
- Yang dibutuhkan: drawing position (Draw 3/10)

### Solution: Remove Header, Use Only Floating Elements

```typescript
// src/pages/DrawScreen.tsx

export function DrawScreen() {
  // ...

  // Calculate progress text
  const getProgressText = () => {
    if (!currentPrize) return '';
    
    switch (currentPrize.drawMode) {
      case 'one-by-one':
        return `Draw ${state.currentDrawIndex + 1}/${currentPrize.quantity}`;
      case 'batch': {
        const batchSize = currentPrize.batchSize || 5;
        const totalBatches = Math.ceil(currentPrize.quantity / batchSize);
        return `Batch ${state.currentDrawIndex + 1}/${totalBatches}`;
      }
      case 'all-at-once':
        return `Drawing ${currentPrize.quantity} winners`;
      default:
        return '';
    }
  };

  return (
    <div 
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#f6f9fc'
      }}
    >
      {/* NO HEADER BAR - only floating elements */}

      {/* Floating Back Button - top left */}
      <button 
        onClick={handleBack}
        className="fixed top-4 left-4 z-50 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-[#e2e8f0] hover:bg-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-[#64748b]" />
      </button>

      {/* Floating Drawing Progress - top center */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div className="px-6 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-[#e2e8f0]">
          <p className="text-sm font-medium text-[#0a2540]">
            Drawing: <span className="text-[#635bff]">{currentPrize?.name}</span>
          </p>
          <p className="text-xs text-center text-[#64748b]">{getProgressText()}</p>
        </div>
      </div>

      {/* Prize Panel - floating left */}
      <PrizePanel 
        prizes={prizes}
        currentPrizeIndex={state.currentPrizeIndex}
        onPrizeClick={handlePrizeClick}
      />

      {/* Sphere - full viewport */}
      <div className="absolute inset-0">
        <Sphere3D {...sphereProps} />
      </div>

      {/* Winner Cards Overlay */}
      {state.status === 'reviewing' && (
        <WinnerGallery winners={state.winners} {...galleryProps} />
      )}

      {/* Floating Controls - bottom center */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        {renderControls()}
      </div>
    </div>
  );
}
```

**Pastikan HAPUS komponen header yang ada:**

```typescript
// HAPUS atau COMMENT OUT:
// <DrawHeader ... />
// atau
// <header className="...">...</header>
```

---

## Issue 4: Prize Winners Modal - Table Terlalu Besar

### Problem
Ketika klik prize di side panel, table winners menutupi seluruh page.

### Solution: Add Pagination to Winners Modal

```typescript
// src/components/draw/PrizeWinnersModal.tsx

interface PrizeWinnersModalProps {
  isOpen: boolean;
  onClose: () => void;
  prize: Prize;
  winners: DrawResult[];
}

const ITEMS_PER_PAGE = 10;

export function PrizeWinnersModal({ isOpen, onClose, prize, winners }: PrizeWinnersModalProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when modal opens
  useEffect(() => {
    if (isOpen) setCurrentPage(1);
  }, [isOpen]);

  const totalPages = Math.ceil(winners.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedWinners = winners.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0a2540]">{prize.name}</h2>
            <p className="text-sm text-[#64748b]">
              {winners.length} / {prize.quantity} winners
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#f6f9fc] rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-[#64748b]" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto max-h-[50vh]">
          <table className="w-full">
            <thead className="bg-[#f6f9fc] sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#64748b] uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#64748b] uppercase">Coupon</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#64748b] uppercase">Participant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#64748b] uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {paginatedWinners.map((winner, index) => (
                <tr key={winner.id} className="hover:bg-[#f6f9fc]">
                  <td className="px-4 py-3 text-sm text-[#64748b]">
                    {startIndex + index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-[#0a2540]">
                    {winner.couponId}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#0a2540]">
                    <div>{winner.participantName}</div>
                    <div className="text-xs text-[#64748b]">{winner.participantId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={winner.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[#e2e8f0] flex items-center justify-between">
            <p className="text-sm text-[#64748b]">
              Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, winners.length)} of {winners.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-[#f6f9fc] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-[#0a2540] min-w-[80px] text-center">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-[#f6f9fc] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    valid: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    skipped: 'bg-amber-100 text-amber-700'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.valid}`}>
      {status}
    </span>
  );
}
```

---

## Issue 5: Event Status Tidak Berubah Saat Draw

### Problem
- Event status tidak berubah ke 'in-progress' saat draw dimulai
- Event masih bisa di-edit setelah draw dimulai
- Back dari DrawScreen menuju wizard form

### Solution: Update Event Status + Navigation Guard

**Step 1: Update Event Status saat mulai draw**

```typescript
// src/pages/DrawScreen.tsx

export function DrawScreen() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { data: event, refetch: refetchEvent } = useEvent(eventId);

  // Update event status to 'in-progress' when first draw starts
  const handleStartDraw = useCallback(async () => {
    if (state.status !== 'idle') return;

    // If event status is still 'draft', update to 'in-progress'
    if (event?.status === 'draft') {
      await eventRepository.update(eventId!, {
        status: 'in-progress',
        startedAt: new Date().toISOString()
      });
      refetchEvent();
    }

    dispatch({ type: 'START_SPIN' });
  }, [state.status, event?.status, eventId, refetchEvent]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    // Go to event detail, NOT wizard
    navigate(`/event/${eventId}`);
  }, [navigate, eventId]);

  // ...
}
```

**Step 2: Add Event Status Type**

```typescript
// src/types/index.ts

type EventStatus = 'draft' | 'in-progress' | 'completed' | 'cancelled';

interface Event {
  id: string;
  name: string;
  status: EventStatus;
  startedAt?: string;  // When draw started
  completedAt?: string; // When all prizes drawn
  // ... other fields
}
```

**Step 3: Prevent Edit for Non-Draft Events**

```typescript
// src/pages/EventDetail.tsx

export function EventDetail() {
  const { eventId } = useParams();
  const { data: event } = useEvent(eventId);

  const canEdit = event?.status === 'draft';

  return (
    <div>
      {/* Event Info */}
      <div>
        <h1>{event?.name}</h1>
        <StatusBadge status={event?.status} />
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        {canEdit ? (
          <button onClick={() => navigate(`/event/${eventId}/edit`)}>
            Edit Event
          </button>
        ) : (
          <button disabled className="opacity-50 cursor-not-allowed" title="Cannot edit event in progress">
            Edit Event
          </button>
        )}

        <button onClick={() => navigate(`/event/${eventId}/draw`)}>
          {event?.status === 'draft' ? 'Start Draw' : 'Continue Draw'}
        </button>
      </div>
    </div>
  );
}
```

**Step 4: Guard Edit Route**

```typescript
// src/pages/EventEdit.tsx (or EventWizard.tsx)

export function EventEdit() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { data: event, isLoading } = useEvent(eventId);

  // Redirect if event is not draft
  useEffect(() => {
    if (!isLoading && event && event.status !== 'draft') {
      // Redirect to event detail with message
      navigate(`/event/${eventId}`, { 
        replace: true,
        state: { message: 'Cannot edit event that has already started' }
      });
    }
  }, [event, isLoading, eventId, navigate]);

  if (isLoading) return <Loading />;
  if (event?.status !== 'draft') return null;

  return (
    // ... wizard form
  );
}
```

**Step 5: Update Event Status to 'completed' when all prizes done**

```typescript
// src/pages/DrawScreen.tsx

const handleConfirm = useCallback(async () => {
  if (state.status !== 'reviewing') return;

  await drawService.confirm(currentPrize!.id);

  // Check if this was the last draw for this prize
  const totalDraws = calculateTotalDraws(currentPrize!);
  const nextDrawIndex = state.currentDrawIndex + 1;

  if (nextDrawIndex >= totalDraws) {
    // Prize complete, check if all prizes done
    const nextPrizeIndex = state.currentPrizeIndex + 1;

    if (nextPrizeIndex >= prizes!.length) {
      // ALL PRIZES COMPLETE - update event status
      await eventRepository.update(eventId!, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });

      // Navigate to results page
      navigate(`/event/${eventId}/results`);
      return;
    }

    // Move to next prize
    dispatch({ type: 'NEXT_PRIZE' });
  } else {
    // More draws for this prize
    dispatch({ type: 'CONFIRM' });
  }
}, [state, currentPrize, prizes, eventId, navigate]);
```

---

## Summary of Changes

| # | Issue | Solution |
|---|-------|----------|
| 1 | Sphere hilang (dev) | Rewrite dengan stable refs, proper cleanup, frustumCulled={false} |
| 2 | Button glitch | useReducer, isTransitioning flag, guard conditions |
| 3 | Header + Prize counter | Remove header, floating progress di center |
| 4 | Winners table besar | Pagination di modal (10 per page) |
| 5 | Event status | Update status ke 'in-progress', guard edit route, back to detail |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/draw/InstancedCards.tsx` | Rewrite dengan stable pattern |
| `src/pages/DrawScreen.tsx` | useReducer, remove header, update event status |
| `src/components/draw/PrizeWinnersModal.tsx` | Add pagination |
| `src/pages/EventDetail.tsx` | Conditional edit button |
| `src/pages/EventEdit.tsx` | Guard redirect for non-draft |
| `src/types/index.ts` | Add EventStatus type, startedAt, completedAt |
| `src/repositories/eventRepository.ts` | Ensure update supports new fields |

---

## Testing Checklist

### Issue 1 - Sphere Stability:
- [ ] Sphere tetap muncul setelah 5 menit di npm run dev
- [ ] Sphere tetap setelah HMR/file change
- [ ] No console errors

### Issue 2 - Button Stability:
- [ ] Button tidak berubah tanpa klik
- [ ] Start Draw → Spinning → Stop → Revealing → Reviewing flow smooth
- [ ] No rapid state changes

### Issue 3 - Header Removed:
- [ ] Tidak ada header bar
- [ ] Floating back button di top-left
- [ ] Floating progress di top-center (Draw 3/10)
- [ ] Full viewport untuk sphere

### Issue 4 - Winners Modal:
- [ ] Table tidak fullscreen
- [ ] Pagination muncul jika > 10 winners
- [ ] Navigation between pages works
- [ ] Modal scrollable

### Issue 5 - Event Status:
- [ ] Status berubah ke 'in-progress' saat Start Draw pertama
- [ ] Edit button disabled untuk non-draft events
- [ ] Back dari DrawScreen ke EventDetail (bukan wizard)
- [ ] Status berubah ke 'completed' saat semua prize done
