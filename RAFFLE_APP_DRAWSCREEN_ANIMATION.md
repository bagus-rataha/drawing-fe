# Raffle App - DrawScreen Animation Implementation

## Overview

Implementasi UI dan animasi untuk DrawScreen menggunakan Three.js.

Reference: https://github.com/LOG1997/log-lottery

---

## PENTING: Styling Theme

**Gunakan styling yang konsisten dengan Phase 1 (Stripe inspired, clean, professional):**

| Property | Value | Usage |
|----------|-------|-------|
| Primary | `#635bff` | Buttons, links, sphere wireframe |
| Navy | `#0a2540` | Text headings, important text |
| Background | `#f6f9fc` | Page background |
| White | `#ffffff` | Cards, panels, modals |
| Border | `#e2e8f0` | Card borders, dividers |
| Text Secondary | `#64748b` | Secondary text, labels |
| Font | Plus Jakarta Sans | All text |
| No gradients | - | Hindari gradient |

**Button styles:**
- Primary: `bg-[#635bff] hover:bg-[#524acc] text-white`
- Danger: `bg-red-500 hover:bg-red-600 text-white`
- Warning: `bg-amber-500 hover:bg-amber-600 text-white`

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Dependencies

```bash
npm install three @types/three @react-three/fiber @react-three/drei
```

---

## Route

```typescript
// src/App.tsx atau router config
<Route path="/event/:eventId/draw" element={<DrawScreen />} />
```

---

## Styling Theme (Konsisten dengan Phase 1)

| Property | Value |
|----------|-------|
| Font | Plus Jakarta Sans |
| Primary | #635bff |
| Navy | #0a2540 |
| Background | #f6f9fc |
| White | #ffffff |
| Border | #e2e8f0 |
| No gradients | ✓ |
| Design | Clean, professional (Stripe inspired) |

---

## Page Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Header: [← Back]  Event Name                           Prize: 2/5          │
├───────────┬─────────────────────────────────────────────────────────────────┤
│ [<]       │                                                                 │
│           │    ┌────────┐                           ┌────────┐              │
│ Prizes    │    │ Card 1 │    ┌─────────────────┐    │ Card 6 │              │
│           │    │        │    │                 │    │        │              │
│ ✅ Prize 1│    └────────┘    │                 │    └────────┘              │
│   5/5     │    ┌────────┐    │   3D SPHERE     │    ┌────────┐              │
│           │    │ Card 2 │    │                 │    │ Card 7 │              │
│ 🔄 Prize 2│    │        │    │                 │    │        │              │
│   3/10    │    └────────┘    │                 │    └────────┘              │
│           │    ┌────────┐    └─────────────────┘    ┌────────┐              │
│ ⏳ Prize 3│    │ Card 3 │                           │ Card 8 │              │
│   0/3     │    │  ❌    │    [ START / STOP ]       │        │              │
│           │    └────────┘                           └────────┘              │
│ ⚠️ Prize 4│    ┌────────┐                           ┌────────┐              │
│  2/5 pool │    │ Card 4 │                           │ Card 9 │              │
│   habis   │    │        │                           │        │              │
│           │    └────────┘                           └────────┘              │
│           │    ┌────────┐                           ┌────────┐              │
│           │    │ Card 5 │                           │ Card 10│              │
│           │    │        │                           │        │              │
│           │    └────────┘                           └────────┘              │
│           │                                                                 │
│           │                   [<] Page 1/5 [>]                              │
│           │                                                                 │
│           │                [Redraw All]  [Confirm]                          │
└───────────┴─────────────────────────────────────────────────────────────────┘
```

---

## Component Structure

```
src/pages/DrawScreen.tsx              ← Main page
src/components/draw/
├── Sphere3D.tsx                      ← Three.js sphere dengan cards
├── SphereCard.tsx                    ← Individual card di sphere surface
├── WinnerGallery.tsx                 ← Gallery kiri-kanan sphere
├── WinnerCard.tsx                    ← Card di gallery (dengan Cancel button)
├── PrizePanel.tsx                    ← Side floating panel (kiri)
├── PrizeWinnersModal.tsx             ← Modal tabel winners
├── DrawControls.tsx                  ← Start/Stop/Redraw/Confirm buttons
├── DrawHeader.tsx                    ← Header dengan back button + prize info
└── Confetti.tsx                      ← Confetti effect
```

---

## Phase 1: Basic Setup

### 1.1 DrawScreen Page Shell

```tsx
// src/pages/DrawScreen.tsx
import { useParams } from 'react-router-dom';
import { useState } from 'react';

export function DrawScreen() {
  const { eventId } = useParams<{ eventId: string }>();
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  
  return (
    <div className="min-h-screen bg-[#f6f9fc] flex">
      {/* Side Panel */}
      <PrizePanel 
        isOpen={isPanelOpen} 
        onToggle={() => setIsPanelOpen(!isPanelOpen)} 
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <DrawHeader />
        
        <div className="flex-1 flex items-center justify-center relative">
          {/* Left Gallery */}
          <WinnerGallery side="left" />
          
          {/* Sphere */}
          <Sphere3D />
          
          {/* Right Gallery */}
          <WinnerGallery side="right" />
        </div>
        
        {/* Controls */}
        <DrawControls />
      </div>
    </div>
  );
}
```

### 1.2 Prize Panel (Side)

```tsx
// src/components/draw/PrizePanel.tsx
interface PrizePanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function PrizePanel({ isOpen, onToggle }: PrizePanelProps) {
  return (
    <div className={cn(
      "bg-white border-r border-[#e2e8f0] transition-all duration-300 relative",
      isOpen ? "w-64" : "w-0"
    )}>
      {/* Toggle Button */}
      <button 
        onClick={onToggle}
        className="absolute top-1/2 -right-6 transform -translate-y-1/2 
                   bg-[#635bff] text-white p-2 rounded-r-lg hover:bg-[#524acc]
                   transition-colors"
      >
        {isOpen ? '<' : '>'}
      </button>
      
      {isOpen && (
        <div className="p-4">
          <h3 className="text-[#0a2540] font-bold mb-4">Prizes</h3>
          
          {/* Prize List */}
          <div className="space-y-2">
            {prizes.map((prize, index) => (
              <PrizeItem 
                key={prize.id}
                prize={prize}
                status={getPrizeStatus(prize)}
                onClick={() => openWinnersModal(prize.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Prize Item
function PrizeItem({ prize, status, onClick }) {
  const statusIcons = {
    completed: '✅',
    'in-progress': '🔄',
    pending: '⏳',
    'pool-exhausted': '⚠️'
  };
  
  return (
    <button 
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg bg-[#f6f9fc] hover:bg-[#edf2f7]
                 border border-[#e2e8f0] transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="text-[#0a2540]">
          {statusIcons[status]} {prize.name}
        </span>
        <span className="text-[#64748b] text-sm">
          {prize.drawnCount}/{prize.quantity}
        </span>
      </div>
    </button>
  );
}
```

### 1.3 Prize Winners Modal

```tsx
// src/components/draw/PrizeWinnersModal.tsx
interface PrizeWinnersModalProps {
  isOpen: boolean;
  onClose: () => void;
  prizeId: string;
}

export function PrizeWinnersModal({ isOpen, onClose, prizeId }: PrizeWinnersModalProps) {
  const { data: winners } = useConfirmedWinnersByPrize(prizeId);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#0a2540]">{prize.name} - Winners</DialogTitle>
        </DialogHeader>
        
        <Table>
          <TableHeader>
            <TableRow className="bg-[#f6f9fc]">
              <TableHead className="text-[#0a2540]">No</TableHead>
              <TableHead className="text-[#0a2540]">Participant ID</TableHead>
              <TableHead className="text-[#0a2540]">Name</TableHead>
              <TableHead className="text-[#0a2540]">Coupon ID</TableHead>
              <TableHead className="text-[#0a2540]">Confirmed At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {winners?.map((winner, index) => (
              <TableRow key={winner.id} className="hover:bg-[#f6f9fc]">
                <TableCell className="text-[#64748b]">{index + 1}</TableCell>
                <TableCell className="text-[#0a2540]">{winner.participantId}</TableCell>
                <TableCell className="text-[#0a2540] font-medium">{winner.participantName}</TableCell>
                <TableCell className="text-[#64748b]">{winner.couponId}</TableCell>
                <TableCell className="text-[#64748b]">
                  {format(winner.confirmedAt, 'dd MMM HH:mm:ss')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Phase 2: Three.js Sphere

### 2.1 Basic Sphere Setup

```tsx
// src/components/draw/Sphere3D.tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export function Sphere3D() {
  return (
    <div className="w-[500px] h-[500px]">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        
        <SphereMesh />
        
        {/* Disable orbit controls during spin */}
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
}
```

### 2.2 Sphere with Cards

```tsx
// src/components/draw/SphereMesh.tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SphereMeshProps {
  isSpinning: boolean;
  coupons: Coupon[];
  displayMode: 'coupon' | 'coupon-id' | 'coupon-name';
}

export function SphereMesh({ isSpinning, coupons, displayMode }: SphereMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const speedRef = useRef(0);
  
  // Animation loop
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    if (isSpinning) {
      // Accelerate
      speedRef.current = Math.min(speedRef.current + delta * 2, 3);
    } else {
      // Decelerate
      speedRef.current = Math.max(speedRef.current - delta * 0.5, 0);
    }
    
    // Rotate sphere
    groupRef.current.rotation.y += speedRef.current * delta;
    groupRef.current.rotation.x += speedRef.current * delta * 0.3;
  });
  
  // Distribute cards on sphere surface
  const cardPositions = useMemo(() => {
    return distributePointsOnSphere(coupons.length, 2); // radius = 2
  }, [coupons.length]);
  
  return (
    <group ref={groupRef}>
      {/* Wireframe sphere for visual */}
      <mesh>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial wireframe color="#635bff" opacity={0.3} transparent />
      </mesh>
      
      {/* Cards on sphere surface */}
      {coupons.map((coupon, index) => (
        <SphereCard
          key={coupon.id}
          position={cardPositions[index]}
          coupon={coupon}
          displayMode={displayMode}
        />
      ))}
    </group>
  );
}

// Helper: distribute points evenly on sphere
function distributePointsOnSphere(count: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle
  
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = phi * i;
    
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    
    points.push(new THREE.Vector3(x * radius, y * radius, z * radius));
  }
  
  return points;
}
```

### 2.3 Individual Card on Sphere

```tsx
// src/components/draw/SphereCard.tsx
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface SphereCardProps {
  position: THREE.Vector3;
  coupon: Coupon;
  displayMode: 'coupon' | 'coupon-id' | 'coupon-name';
}

export function SphereCard({ position, coupon, displayMode }: SphereCardProps) {
  // Make card face outward from sphere center
  const lookAtCenter = useMemo(() => {
    const direction = position.clone().normalize();
    return direction;
  }, [position]);
  
  const getDisplayText = () => {
    switch (displayMode) {
      case 'coupon':
        return coupon.id;
      case 'coupon-id':
        return `${coupon.id}\n${coupon.participantId}`;
      case 'coupon-name':
        return `${coupon.id}\n${coupon.participantName}`;
    }
  };
  
  return (
    <group position={position} lookAt={[0, 0, 0]}>
      {/* Card background - white with subtle pink tint like reference */}
      <mesh>
        <planeGeometry args={[0.4, 0.25]} />
        <meshBasicMaterial color="#fdf4f7" side={THREE.DoubleSide} />
      </mesh>
      
      {/* Card border */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(0.4, 0.25)]} />
        <lineBasicMaterial color="#635bff" />
      </lineSegments>
      
      {/* Card text */}
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.06}
        color="#0a2540"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.35}
      >
        {getDisplayText()}
      </Text>
    </group>
  );
}
```

---

## Phase 3: Winner Gallery

### 3.1 Gallery Layout

```tsx
// src/components/draw/WinnerGallery.tsx
interface WinnerGalleryProps {
  side: 'left' | 'right';
  winners: DrawResult[];
  gridConfig: { x: number; y: number };
  currentPage: number;
  onCancel: (winnerId: string) => void;
}

export function WinnerGallery({ 
  side, 
  winners, 
  gridConfig, 
  currentPage,
  onCancel 
}: WinnerGalleryProps) {
  // Calculate which winners to show based on side and page
  const cardsPerPage = gridConfig.x * gridConfig.y;
  const cardsPerSide = cardsPerPage / 2;
  
  const startIndex = side === 'left' 
    ? currentPage * cardsPerPage 
    : currentPage * cardsPerPage + cardsPerSide;
  
  const endIndex = startIndex + cardsPerSide;
  const visibleWinners = winners.slice(startIndex, endIndex);
  
  return (
    <div 
      className={cn(
        "flex flex-col gap-3 p-4",
        side === 'left' ? 'items-end' : 'items-start'
      )}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridConfig.x / 2}, 1fr)`,
        gridTemplateRows: `repeat(${gridConfig.y}, 1fr)`,
        gap: '12px'
      }}
    >
      {visibleWinners.map((winner, index) => (
        <WinnerCard
          key={winner.id || index}
          winner={winner}
          onCancel={() => onCancel(winner.id)}
          animationDelay={currentPage === 0 ? index * 0.1 : 0}
        />
      ))}
    </div>
  );
}
```

### 3.2 Winner Card

```tsx
// src/components/draw/WinnerCard.tsx
import { motion } from 'framer-motion';

interface WinnerCardProps {
  winner: DrawResult;
  onCancel: () => void;
  animationDelay: number;
}

export function WinnerCard({ winner, onCancel, animationDelay }: WinnerCardProps) {
  const isValid = winner.status === 'valid';
  const isCancelled = winner.status === 'cancelled';
  const isSkipped = winner.status === 'skipped';
  
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: animationDelay, type: 'spring' }}
      className={cn(
        "relative bg-white rounded-lg p-4 shadow-sm border border-[#e2e8f0] min-w-[140px]",
        isCancelled && "opacity-60 bg-red-50 border-red-200",
        isSkipped && "opacity-40 bg-gray-50 border-gray-200"
      )}
    >
      {/* Cancel/Status marker */}
      {isCancelled && (
        <div className="absolute top-2 right-2 text-red-500">❌</div>
      )}
      {isSkipped && (
        <div className="absolute top-2 right-2 text-amber-500">⚠️</div>
      )}
      
      {/* Coupon ID */}
      <div className="text-xs text-[#64748b] mb-1">{winner.couponId}</div>
      
      {/* Participant Name */}
      <div className="font-bold text-[#0a2540] text-lg">{winner.participantName}</div>
      
      {/* Participant ID */}
      <div className="text-sm text-[#64748b]">{winner.participantId}</div>
      
      {/* Cancel Button - only for valid */}
      {isValid && (
        <button
          onClick={onCancel}
          className="mt-3 w-full py-1.5 text-sm bg-red-50 text-red-600 
                     border border-red-200 rounded-md hover:bg-red-100 
                     transition-colors"
        >
          Cancel
        </button>
      )}
    </motion.div>
  );
}
```

---

## Phase 4: Draw Controls

### 4.1 Control Buttons

```tsx
// src/components/draw/DrawControls.tsx
interface DrawControlsProps {
  state: 'idle' | 'spinning' | 'stopped' | 'reviewing';
  onStart: () => void;
  onStop: () => void;
  onRedrawAll: () => void;
  onConfirm: () => void;
  hasCancelled: boolean;
  validCount: number;
  totalCount: number;
}

export function DrawControls({
  state,
  onStart,
  onStop,
  onRedrawAll,
  onConfirm,
  hasCancelled,
  validCount,
  totalCount
}: DrawControlsProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 bg-white border-t border-[#e2e8f0]">
      {/* Pagination */}
      {state === 'reviewing' && totalCount > 10 && (
        <Pagination 
          currentPage={currentPage}
          totalPages={Math.ceil(totalCount / 10)}
          onPageChange={setCurrentPage}
        />
      )}
      
      {/* Action Buttons */}
      <div className="flex gap-4">
        {state === 'idle' && (
          <button 
            onClick={onStart}
            className="px-8 py-3 bg-[#635bff] text-white font-medium rounded-lg
                       hover:bg-[#524acc] transition-colors text-lg"
          >
            Start Draw
          </button>
        )}
        
        {state === 'spinning' && (
          <button 
            onClick={onStop}
            className="px-8 py-3 bg-red-500 text-white font-medium rounded-lg
                       hover:bg-red-600 transition-colors text-lg"
          >
            Stop
          </button>
        )}
        
        {state === 'reviewing' && (
          <>
            {hasCancelled ? (
              <button 
                onClick={onRedrawAll}
                className="px-8 py-3 bg-amber-500 text-white font-medium rounded-lg
                           hover:bg-amber-600 transition-colors text-lg"
              >
                Redraw All
              </button>
            ) : (
              <button 
                onClick={onConfirm}
                className="px-8 py-3 bg-[#635bff] text-white font-medium rounded-lg
                           hover:bg-[#524acc] transition-colors text-lg"
              >
                {validCount === totalCount 
                  ? 'Confirm' 
                  : `Confirm ${validCount} Winners`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

---

## Phase 5: Animation Flow

### 5.1 Draw State Machine

```typescript
// src/hooks/useDrawState.ts
type DrawState = 
  | 'idle'           // Belum mulai
  | 'spinning'       // Sphere berputar
  | 'stopping'       // Sedang slowdown
  | 'animating'      // Cards keluar dari sphere
  | 'reviewing'      // User review winners
  | 'redrawing';     // Sedang redraw

interface DrawStateContext {
  state: DrawState;
  currentPrize: Prize | null;
  currentBatch: number;
  winners: DrawResult[];
  
  // Actions
  start: () => void;
  stop: () => Promise<void>;
  cancel: (winnerId: string) => Promise<void>;
  redrawAll: () => Promise<void>;
  confirm: () => Promise<void>;
  nextBatch: () => void;
  nextPrize: () => void;
}
```

### 5.2 Animation Sequence

```typescript
// Flow saat Stop diklik
async function handleStop() {
  // 1. Set state ke 'stopping'
  setState('stopping');
  
  // 2. Call drawService untuk get results + save DB
  const results = await drawService.draw(eventId, prizeId, quantity, batchNumber);
  setWinners(results);
  
  // 3. Animate sphere slowdown (2-3 detik)
  await animateSphereSlowdown();
  
  // 4. Set state ke 'animating'
  setState('animating');
  
  // 5. Animate cards keluar ke gallery (page 1 only)
  await animateCardsExit(results.slice(0, gridConfig.x * gridConfig.y));
  
  // 6. Show confetti
  triggerConfetti();
  
  // 7. Set state ke 'reviewing'
  setState('reviewing');
}
```

### 5.3 Card Exit Animation

```tsx
// Animation: card exits sphere and moves to gallery position
// Using framer-motion or custom Three.js animation

const cardExitAnimation = {
  initial: { 
    // Position on sphere
    x: spherePosition.x,
    y: spherePosition.y,
    scale: 0.5,
    opacity: 0.8
  },
  animate: {
    // Position in gallery
    x: galleryPosition.x,
    y: galleryPosition.y,
    scale: 1,
    opacity: 1
  },
  transition: {
    duration: 0.8,
    delay: index * 0.1, // Staggered
    type: 'spring'
  }
};
```

### 5.4 Card Return Animation (Cancel)

```tsx
// Animation: card returns to sphere after cancel
const cardReturnAnimation = {
  animate: {
    x: spherePosition.x,
    y: spherePosition.y,
    scale: 0.5,
    opacity: 0,
  },
  transition: {
    duration: 0.5
  }
};
```

---

## Phase 6: Integration

### 6.1 Main DrawScreen with State

```tsx
// src/pages/DrawScreen.tsx
export function DrawScreen() {
  const { eventId } = useParams();
  const { data: event } = useEvent(eventId);
  const { data: prizes } = usePrizes(eventId);
  
  // Draw state
  const [state, setState] = useState<DrawState>('idle');
  const [currentPrizeIndex, setCurrentPrizeIndex] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(1);
  const [winners, setWinners] = useState<DrawResult[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  
  const currentPrize = prizes?.[currentPrizeIndex];
  const gridConfig = event?.displaySettings?.grid || { x: 5, y: 2 };
  
  // Calculate batch size
  const batchSize = getBatchSize(currentPrize);
  
  // Handlers
  const handleStart = () => setState('spinning');
  
  const handleStop = async () => {
    setState('stopping');
    
    const results = await drawService.draw(
      eventId!, 
      currentPrize!.id, 
      batchSize, 
      currentBatch
    );
    setWinners(results);
    
    // Animation sequence...
    setState('reviewing');
  };
  
  const handleCancel = async (winnerId: string) => {
    await drawService.cancel(winnerId);
    // Update local state
    setWinners(prev => 
      prev.map(w => w.id === winnerId 
        ? { ...w, status: 'cancelled' } 
        : w
      )
    );
  };
  
  const handleRedrawAll = async () => {
    setState('redrawing');
    const newResults = await drawService.redrawAll(currentPrize!.id, currentBatch);
    setWinners(prev => [...prev, ...newResults]);
    setState('reviewing');
  };
  
  const handleConfirm = async () => {
    await drawService.confirm(currentPrize!.id);
    
    // Check if more batches or next prize
    if (hasMoreBatches) {
      setCurrentBatch(prev => prev + 1);
      setWinners([]);
      setState('idle');
    } else if (hasMorePrizes) {
      setCurrentPrizeIndex(prev => prev + 1);
      setCurrentBatch(1);
      setWinners([]);
      setState('idle');
    } else {
      // All done
      navigate(`/event/${eventId}/history`);
    }
  };
  
  // ... render
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/DrawScreen.tsx` | Main page |
| `src/components/draw/Sphere3D.tsx` | Three.js canvas |
| `src/components/draw/SphereMesh.tsx` | Sphere with cards |
| `src/components/draw/SphereCard.tsx` | Individual card on sphere |
| `src/components/draw/WinnerGallery.tsx` | Gallery layout |
| `src/components/draw/WinnerCard.tsx` | Winner card with cancel |
| `src/components/draw/PrizePanel.tsx` | Side panel |
| `src/components/draw/PrizeWinnersModal.tsx` | Winners modal |
| `src/components/draw/DrawControls.tsx` | Buttons |
| `src/components/draw/DrawHeader.tsx` | Header |
| `src/components/draw/Confetti.tsx` | Confetti effect |
| `src/hooks/useDrawState.ts` | State management |

---

## Execution Order

```
1. Install dependencies (three, @react-three/fiber, @react-three/drei)
       ↓
2. Create DrawScreen page shell + route
       ↓
3. Create PrizePanel (side panel)
       ↓
4. Create basic Sphere3D (static)
       ↓
5. Add sphere spin animation
       ↓
6. Create WinnerGallery + WinnerCard
       ↓
7. Add card exit animation (sphere → gallery)
       ↓
8. Create DrawControls
       ↓
9. Integrate dengan drawService
       ↓
10. Add Confetti
       ↓
11. Add PrizeWinnersModal
       ↓
12. Test semua scenario
```

---

## Testing Checklist

**Basic:**
- [ ] Route `/event/:id/draw` works
- [ ] Side panel toggle works
- [ ] Sphere renders

**Animation:**
- [ ] Sphere spins saat Start
- [ ] Sphere slowdown saat Stop
- [ ] Cards exit dari sphere ke gallery (page 1)
- [ ] Page 2+ ready tanpa animasi exit
- [ ] Confetti triggers

**Interaction:**
- [ ] Cancel card → card kembali ke sphere visual
- [ ] Redraw All → sphere spin → new cards exit
- [ ] Confirm → next batch/prize

**Integration:**
- [ ] drawService.draw called saat Stop
- [ ] drawService.cancel called saat Cancel
- [ ] drawService.redrawAll called saat Redraw
- [ ] drawService.confirm called saat Confirm
