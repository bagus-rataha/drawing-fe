/**
 * @file components/wizard/StepPrizes.tsx
 * @description Step 2: Prize Management component with drag & drop reordering
 */

import { useState, useMemo } from 'react'
import type { PrizeFormData, DrawMode } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { DRAW_MODE_LABELS, DEFAULT_DRAW_CONFIG } from '@/utils/constants'

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
  onUpdate: (prizes: PrizeFormData[]) => void
  onNext: () => void
  onPrev: () => void
}

/**
 * Parse batch configuration from comma-separated string
 */
function parseBatchConfig(input: string): { batches: number[]; error?: string } {
  if (!input.trim()) {
    return { batches: [], error: 'Batch sizes are required' }
  }

  const parts = input.split(',').map((s) => s.trim()).filter(Boolean)
  const numbers = parts.map(Number)

  if (numbers.some(isNaN)) {
    return { batches: [], error: 'Invalid number format. Use comma-separated numbers.' }
  }

  if (numbers.some((n) => n <= 0)) {
    return { batches: [], error: 'All batch sizes must be positive numbers.' }
  }

  if (numbers.some((n) => !Number.isInteger(n))) {
    return { batches: [], error: 'All batch sizes must be whole numbers.' }
  }

  return { batches: numbers }
}

/**
 * Sortable Prize Item component for drag and drop
 */
interface SortablePrizeItemProps {
  prize: PrizeFormData
  index: number
  onEdit: (prize: PrizeFormData) => void
  onDelete: (id: string) => void
}

function SortablePrizeItem({ prize, index, onEdit, onDelete }: SortablePrizeItemProps) {
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
      {/* FIX (Rev 18): Responsive layout - stack on mobile, row on desktop */}
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(prize)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDelete(prize.id)}
            >
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
              {prize.quantity} winner{prize.quantity > 1 ? 's' : ''} ·{' '}
              {DRAW_MODE_LABELS[prize.drawMode]}
              {prize.drawMode === 'batch' &&
                prize.batches.length > 0 &&
                ` (${prize.batches.join(', ')})`}
            </div>
          </div>
        </div>
        {/* Mobile: Details below */}
        <div className="sm:hidden text-xs text-muted-foreground pl-8">
          {prize.quantity} winner{prize.quantity > 1 ? 's' : ''} · {DRAW_MODE_LABELS[prize.drawMode]}
          {prize.drawMode === 'batch' &&
            prize.batches.length > 0 &&
            ` (${prize.batches.join(', ')})`}
        </div>
        {/* Desktop: Action buttons */}
        <div className="hidden sm:flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(prize)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(prize.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Step 2: Prize Management
 * Add, edit, delete, and reorder prizes
 */
export function StepPrizes({
  prizes,
  onUpdate,
  onNext,
  onPrev,
}: StepPrizesProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPrize, setEditingPrize] = useState<PrizeFormData | null>(null)
  const [formData, setFormData] = useState<PrizeFormData>(createEmptyPrize())
  const [errors, setErrors] = useState<string[]>([])
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [batchInput, setBatchInput] = useState('')
  const [batchError, setBatchError] = useState<string | null>(null)

  // DnD sensors setup
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Prize IDs for sortable context
  const prizeIds = useMemo(() => prizes.map((p) => p.id), [prizes])

  // Handle drag end - reorder prizes
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = prizes.findIndex((p) => p.id === active.id)
      const newIndex = prizes.findIndex((p) => p.id === over.id)

      const reorderedPrizes = arrayMove(prizes, oldIndex, newIndex)
      onUpdate(reorderedPrizes)
    }
  }

  function createEmptyPrize(): PrizeFormData {
    return {
      id: generateId(),
      name: '',
      image: undefined,
      quantity: 1,
      drawMode: DEFAULT_DRAW_CONFIG.mode,
      batches: [],
    }
  }

  const handleAddPrize = () => {
    setEditingPrize(null)
    setFormData(createEmptyPrize())
    setFormErrors([])
    setBatchInput('')
    setBatchError(null)
    setIsDialogOpen(true)
  }

  const handleEditPrize = (prize: PrizeFormData) => {
    setEditingPrize(prize)
    setFormData({ ...prize })
    setFormErrors([])
    setBatchInput(prize.batches.join(', '))
    setBatchError(null)
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

    if (editingPrize) {
      // Update existing
      onUpdate(prizes.map((p) => (p.id === formData.id ? formData : p)))
    } else {
      // Add new
      onUpdate([...prizes, formData])
    }

    setIsDialogOpen(false)
    setFormErrors([])
  }

  const handleFormChange = (
    field: keyof PrizeFormData,
    value: string | number | DrawMode | number[]
  ) => {
    setFormData({ ...formData, [field]: value })
    setFormErrors([])
  }

  const handleBatchesChange = (value: string) => {
    setBatchInput(value)

    // Parse and validate batch config
    const result = parseBatchConfig(value)
    if (result.error) {
      setBatchError(result.error)
      handleFormChange('batches', [])
    } else {
      setBatchError(null)
      handleFormChange('batches', result.batches)
    }
  }

  // Calculate batch total for preview
  const batchTotal = useMemo(() => {
    return formData.batches.reduce((sum, b) => sum + b, 0)
  }, [formData.batches])

  const handleSubmit = () => {
    const validation = validatePrizes(prizes)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setErrors([])
    onNext()
  }

  // Calculate totals
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
              {/* Prize Image */}
              <div className="flex-shrink-0 space-y-2">
                <Label>Image</Label>
                <PrizeImageUpload
                  value={formData.image}
                  onChange={(value) => handleFormChange('image', value ?? '')}
                />
              </div>

              {/* Prize Name + Quantity */}
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

            {/* Draw Mode */}
            <div className="space-y-2">
              <Label htmlFor="drawMode">Draw Mode</Label>
              <Select
                value={formData.drawMode}
                onValueChange={(value: DrawMode) =>
                  handleFormChange('drawMode', value)
                }
              >
                <SelectTrigger id="drawMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DRAW_MODE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Batches (for batch mode) */}
            {formData.drawMode === 'batch' && (
              <div className="space-y-2">
                <Label htmlFor="batches">
                  Batch Sizes <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="batches"
                  value={batchInput}
                  onChange={(e) => handleBatchesChange(e.target.value)}
                  placeholder="e.g., 15, 10, 10"
                  className={batchError ? 'border-destructive' : ''}
                />
                {batchError ? (
                  <p className="text-sm text-destructive">{batchError}</p>
                ) : formData.batches.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Parsed: [{formData.batches.join(', ')}] = {batchTotal} total
                    </p>
                    {batchTotal !== formData.quantity && (
                      <p className="text-sm text-destructive">
                        Total ({batchTotal}) must equal quantity ({formData.quantity})
                      </p>
                    )}
                    {batchTotal === formData.quantity && (
                      <p className="text-sm text-green-600">
                        ✓ Batch sizes match quantity
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Enter batch sizes separated by commas. Total must equal quantity.
                  </p>
                )}
              </div>
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
