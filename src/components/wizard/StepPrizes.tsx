/**
 * @file components/wizard/StepPrizes.tsx
 * @description Step 2: Prize Management with drag & drop reordering and batch_number
 */

import { useState, useMemo } from 'react'
import type { PrizeFormData, CardLayout } from '@/types'
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
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Gift,
} from 'lucide-react'
import { generateId } from '@/utils/helpers'
import { PrizeImageUpload } from './PrizeImageUpload'
import { BackgroundImageUpload } from './BackgroundImageUpload'
import { CardLayoutEditor } from '@/components/editor/CardLayoutEditor'
import { generateAutoGrid } from '@/components/editor/useCardLayout'
import { SortablePrizeItem } from '@/components/SortablePrizeItem'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

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
  const [layoutEditorOpen, setLayoutEditorOpen] = useState(false)

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
      backgroundImage: undefined,
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
      if (formData.batchNumber < 1) {
        setFormErrors(['Batch number must be at least 1'])
        return
      }
      if (formData.batchNumber > formData.quantity) {
        setFormErrors(['Batch number must not exceed quantity'])
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

  const handleLayoutModeChange = (mode: string) => {
    if (mode === 'grid') {
      setFormData({ ...formData, cardLayout: undefined })
    } else {
      if (!formData.cardLayout) {
        const count = formData.batchNumber
        setFormData({
          ...formData,
          cardLayout: {
            aspectRatio: 16 / 9,
            cardWidth: 0.12,
            cardHeight: 0.12 * (16 / 9) / 2.2,
            positions: generateAutoGrid(count),
          },
        })
      }
    }
  }

  const handleLayoutSave = (layout: CardLayout) => {
    setFormData({ ...formData, cardLayout: layout })
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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} modal={!layoutEditorOpen}>
        <DialogContent
          onInteractOutside={(e) => { if (layoutEditorOpen) e.preventDefault() }}
        >
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
                  min={1}
                  max={formData.quantity}
                  value={formData.batchNumber}
                  onChange={(e) =>
                    handleFormChange('batchNumber', parseInt(e.target.value) || 1)
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Number of winners per batch (min 1, max {formData.quantity})
                </p>
              </div>
            )}

            {/* Background Image */}
            <div className="space-y-2">
              <Label>Background Image</Label>
              <BackgroundImageUpload
                value={formData.backgroundImage}
                onChange={(value) => handleFormChange('backgroundImage', value ?? '')}
              />
              <p className="text-sm text-muted-foreground">
                Background image for the draw screen when drawing this prize
              </p>
            </div>

            {/* Card Layout Mode */}
            <div className="space-y-2">
              <Label>Card Layout</Label>
              <RadioGroup
                value={formData.cardLayout ? 'custom' : 'grid'}
                onValueChange={handleLayoutModeChange}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="grid" id="layout-grid" />
                  <Label htmlFor="layout-grid" className="font-normal cursor-pointer">
                    Default Grid
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="custom" id="layout-custom" />
                  <Label htmlFor="layout-custom" className="font-normal cursor-pointer">
                    Custom Layout
                  </Label>
                </div>
              </RadioGroup>
              {formData.cardLayout && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLayoutEditorOpen(true)}
                >
                  Edit Layout
                </Button>
              )}
            </div>

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

      {/* Card Layout Editor — portaled to body, modal=false on Dialog prevents inert */}
      <CardLayoutEditor
        isOpen={layoutEditorOpen}
        onClose={() => setLayoutEditorOpen(false)}
        batchNumber={formData.batchNumber}
        backgroundImage={formData.backgroundImage}
        initialLayout={formData.cardLayout}
        onSave={handleLayoutSave}
      />
    </div>
  )
}

export default StepPrizes
