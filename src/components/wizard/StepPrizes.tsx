/**
 * @file components/wizard/StepPrizes.tsx
 * @description Step 2: Prize Management with drag & drop reordering and batch_number
 */

import { useState, useMemo } from 'react'
import type { PrizeFormData } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import {
  Plus,
  Edit,
  Trash2,
  GripVertical,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Gift,
  ImageIcon,
} from 'lucide-react'
import { generateId } from '@/utils/helpers'
import { PrizeImageUpload } from './PrizeImageUpload'
import { validatePrize, validatePrizes } from '@/services/validationService'

// Drag and drop imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface StepPrizesProps {
  prizes: PrizeFormData[]
  drawMode: 'one_by_one' | 'batch'
  onUpdate: (prizes: PrizeFormData[]) => void
  onNext: () => void
  onPrev: () => void
}

/**
 * Generate batch preview sentence
 */
function getDrawPreview(quantity: number, batchNumber: number, drawMode: 'one_by_one' | 'batch'): string | null {
  if (drawMode === 'one_by_one') {
    if (quantity < 1) return null
    return `Prize ini akan di-draw **satu per satu** sebanyak **${quantity} kali**`
  }

  // Batch mode: only show when valid range
  if (batchNumber < 2 || batchNumber >= quantity) return null

  const totalBatches = Math.ceil(quantity / batchNumber)
  const remainder = quantity % batchNumber

  if (remainder === 0) {
    return `Prize ini terdiri dari **${totalBatches} batch**, tiap batch di-draw **${batchNumber} kali**`
  }

  return `Prize ini terdiri dari **${totalBatches} batch**, tiap batch di-draw **${batchNumber} kali**, dengan batch terakhir sebanyak **${remainder} kali** draw`
}

/**
 * Sortable Prize Item component
 */
interface SortablePrizeItemProps {
  prize: PrizeFormData
  index: number
  showBatch: boolean
  onEdit: (prize: PrizeFormData) => void
  onDelete: (id: string) => void
}

function SortablePrizeItem({ prize, index, showBatch, onEdit, onDelete }: SortablePrizeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prize.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <Card ref={setNodeRef} style={style} className={isDragging ? 'shadow-lg' : ''}>
      <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </div>
          {/* Prize Image Thumbnail */}
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-custom bg-surface-alt">
            {prize.image ? (
              <img
                src={prize.image}
                alt={prize.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-content-muted" />
            )}
          </div>
          {/* Mobile: Name next to image */}
          <div className="flex-1 min-w-0 sm:hidden">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">#{index + 1}</span>
              <span className="truncate font-semibold text-sm">{prize.name}</span>
            </div>
          </div>
          {/* Mobile: Action buttons */}
          <div className="flex gap-1 sm:hidden">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(prize)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(prize.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Desktop: Full info */}
        <div className="hidden sm:flex flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">#{index + 1}</span>
              <span className="truncate font-semibold">{prize.name}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {prize.quantity} winner{prize.quantity > 1 ? 's' : ''}
              {showBatch && prize.batchNumber >= 2 && ` · Batch: ${prize.batchNumber}`}
            </div>
          </div>
        </div>
        {/* Mobile: Details below */}
        <div className="sm:hidden text-xs text-muted-foreground pl-8">
          {prize.quantity} winner{prize.quantity > 1 ? 's' : ''}
          {showBatch && prize.batchNumber >= 2 && ` · Batch: ${prize.batchNumber}`}
        </div>
        {/* Desktop: Action buttons */}
        <div className="hidden sm:flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(prize)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(prize.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Step 2: Prize Management
 */
export function StepPrizes({
  prizes,
  drawMode,
  onUpdate,
  onNext,
  onPrev,
}: StepPrizesProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPrize, setEditingPrize] = useState<PrizeFormData | null>(null)
  const [formData, setFormData] = useState<PrizeFormData>(createEmptyPrize())
  const [errors, setErrors] = useState<string[]>([])
  const [formErrors, setFormErrors] = useState<string[]>([])

  const isBatchMode = drawMode === 'batch'

  // DnD sensors setup
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const prizeIds = useMemo(() => prizes.map((p) => p.id), [prizes])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = prizes.findIndex((p) => p.id === active.id)
      const newIndex = prizes.findIndex((p) => p.id === over.id)
      onUpdate(arrayMove(prizes, oldIndex, newIndex))
    }
  }

  function createEmptyPrize(): PrizeFormData {
    return {
      id: generateId(),
      name: '',
      image: undefined,
      quantity: 1,
      batchNumber: 1,
    }
  }

  const handleAddPrize = () => {
    setEditingPrize(null)
    const empty = createEmptyPrize()
    if (isBatchMode) empty.batchNumber = 2
    setFormData(empty)
    setFormErrors([])
    setIsDialogOpen(true)
  }

  const handleEditPrize = (prize: PrizeFormData) => {
    setEditingPrize(prize)
    setFormData({ ...prize })
    setFormErrors([])
    setIsDialogOpen(true)
  }

  const handleDeletePrize = (id: string) => {
    onUpdate(prizes.filter((p) => p.id !== id))
  }

  const handleSavePrize = () => {
    const validation = validatePrize(formData)
    if (!validation.isValid) {
      setFormErrors(validation.errors)
      return
    }

    // Batch number validation
    if (isBatchMode) {
      if (formData.batchNumber < 2) {
        setFormErrors(['Batch number must be at least 2'])
        return
      }
      if (formData.batchNumber >= formData.quantity) {
        setFormErrors(['Batch number must be less than quantity'])
        return
      }
    }

    if (editingPrize) {
      onUpdate(prizes.map((p) => (p.id === formData.id ? formData : p)))
    } else {
      onUpdate([...prizes, formData])
    }

    setIsDialogOpen(false)
    setFormErrors([])
  }

  const handleFormChange = (field: keyof PrizeFormData, value: string | number) => {
    setFormData({ ...formData, [field]: value })
    setFormErrors([])
  }

  // Draw preview
  const drawPreview = useMemo(() => {
    return getDrawPreview(formData.quantity, formData.batchNumber, drawMode)
  }, [drawMode, formData.quantity, formData.batchNumber])

  const handleSubmit = () => {
    const validation = validatePrizes(prizes)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }
    setErrors([])
    onNext()
  }

  const totalQuantity = prizes.reduce((sum, p) => sum + p.quantity, 0)

  return (
    <div className="space-y-6">
      {/* Prize List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Prizes ({prizes.length})</h3>
          <Button onClick={handleAddPrize}>
            <Plus className="mr-2 h-4 w-4" />
            Add Prize
          </Button>
        </div>

        {prizes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Gift className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No prizes added yet</p>
              <p className="text-sm text-muted-foreground">
                Add at least one prize to continue
              </p>
            </CardContent>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={prizeIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {prizes.map((prize, index) => (
                  <SortablePrizeItem
                    key={prize.id}
                    prize={prize}
                    index={index}
                    showBatch={isBatchMode}
                    onEdit={handleEditPrize}
                    onDelete={handleDeletePrize}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {prizes.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Total winners to draw: {totalQuantity}
          </p>
        )}
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-inside list-disc">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button onClick={handleSubmit}>
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Prize Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPrize ? 'Edit Prize' : 'Add Prize'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Image + Name row */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 space-y-2">
                <Label>Image</Label>
                <PrizeImageUpload
                  value={formData.image}
                  onChange={(value) => handleFormChange('image', value ?? '')}
                />
              </div>

              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prizeName">
                    Prize Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="prizeName"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    placeholder="e.g., Grand Prize"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prizeQuantity">
                    Quantity <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="prizeQuantity"
                    type="number"
                    min={1}
                    value={formData.quantity}
                    onChange={(e) =>
                      handleFormChange('quantity', parseInt(e.target.value) || 1)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Batch Number (only shown when draw mode is batch) */}
            {isBatchMode && (
              <div className="space-y-2">
                <Label htmlFor="batchNumber">
                  Batch Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="batchNumber"
                  type="number"
                  min={2}
                  max={Math.max(formData.quantity - 1, 2)}
                  value={formData.batchNumber}
                  onChange={(e) =>
                    handleFormChange('batchNumber', parseInt(e.target.value) || 2)
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Number of winners per batch (min 2, max {Math.max(formData.quantity - 1, 2)})
                </p>
              </div>
            )}

            {/* Draw Preview */}
            {drawPreview && (
              <div
                className="rounded-md bg-muted p-3 text-sm"
                dangerouslySetInnerHTML={{
                  __html: drawPreview.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'),
                }}
              />
            )}

            {/* Form Errors */}
            {formErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-inside list-disc">
                    {formErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePrize}>
              {editingPrize ? 'Save Changes' : 'Add Prize'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default StepPrizes
