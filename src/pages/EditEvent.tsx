/**
 * @file pages/EditEvent.tsx
 * @description Single-page edit layout for draft events
 */

import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PrizeImageUpload } from '@/components/wizard/PrizeImageUpload'
import {
  ArrowLeft,
  Save,
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Gift,
  ImageIcon,
  AlertCircle,
  Info,
  CalendarIcon,
  Upload,
  X,
  Image,
} from 'lucide-react'
import {
  useEvent,
  usePrizes,
  useUpdateEvent,
  useBulkUpdatePrizes,
  useCreatePrizes,
  useDeletePrize,
  useUnsavedChangesWarning,
} from '@/hooks'
import type { WinRuleType } from '@/types'
import type { UpdateEventRequest, PrizeRequest, BulkUpdatePrizeRequest, PrizesListResponse } from '@/types/api'
import {
  WIN_RULE_LABELS,
  DRAW_MODE_LABELS,
  ANIMATION_TYPE_LABELS,
  WINNER_DISPLAY_MODE_LABELS,
} from '@/utils/constants'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

// Drag and drop
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

interface LocalPrize {
  id: string
  name: string
  image?: string
  quantity: number
  batchNumber: number
}

function SortablePrizeItem({
  prize,
  index,
  showBatch,
  onEdit,
  onDelete,
}: {
  prize: LocalPrize
  index: number
  showBatch: boolean
  onEdit: (prize: LocalPrize) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: prize.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <Card ref={setNodeRef} style={style} className={isDragging ? 'shadow-lg' : ''}>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-custom bg-surface-alt">
          {prize.image ? (
            <img src={prize.image} alt={prize.name} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5 text-content-muted" />
          )}
        </div>
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
        <div className="flex gap-2">
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

export default function EditEvent() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Fetch event and prizes
  const { data: event, isLoading: isLoadingEvent } = useEvent(id)
  const { data: apiPrizes, isLoading: isLoadingPrizes } = usePrizes(id)

  // Mutations
  const updateEvent = useUpdateEvent()
  const bulkUpdatePrizes = useBulkUpdatePrizes()
  const createPrizes = useCreatePrizes()
  const deletePrize = useDeletePrize()

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [winRuleType, setWinRuleType] = useState<WinRuleType>('onetime')
  const [maxWins, setMaxWins] = useState(1)
  const [drawMode, setDrawMode] = useState<'one_by_one' | 'batch'>('one_by_one')
  const [animationType, setAnimationType] = useState<'sphere' | 'rolling' | 'randomize'>('sphere')

  // Display settings (UI-only)
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>()
  const [winnerDisplayMode, setWinnerDisplayMode] = useState<'coupon_only' | 'coupon_and_participant'>('coupon_only')

  // Prize state
  const [localPrizes, setLocalPrizes] = useState<LocalPrize[]>([])

  // Prize dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPrize, setEditingPrize] = useState<LocalPrize | null>(null)
  const [prizeForm, setPrizeForm] = useState<LocalPrize>({ id: '', name: '', quantity: 1, batchNumber: 1 })
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [isCreatingPrize, setIsCreatingPrize] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<LocalPrize | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Initialized flag
  const [initialized, setInitialized] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Responsive DatePicker
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Initialize form from API data
  useEffect(() => {
    if (event && apiPrizes && !initialized) {
      setName(event.name)
      setDescription(event.description || '')
      setStartDate(event.start_date ? new Date(event.start_date) : null)
      setEndDate(event.end_date ? new Date(event.end_date) : null)
      setWinRuleType(event.win_rule)
      setDrawMode(event.draw_mode)
      setAnimationType(event.animation_type)

      setLocalPrizes(
        apiPrizes.map((p: PrizesListResponse) => ({
          id: p.id,
          name: p.name,
          quantity: p.quantity,
          batchNumber: p.batch_number,
          image: undefined,
        }))
      )
      setInitialized(true)
    }
  }, [event, apiPrizes, initialized])

  // Guard: only draft events can be edited
  useEffect(() => {
    if (event && event.status !== 'draft') {
      navigate(`/events/${id}`, { replace: true })
    }
  }, [event, id, navigate])

  // Track unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!initialized || !event) return false
    return (
      name !== event.name ||
      description !== (event.description || '') ||
      winRuleType !== event.win_rule ||
      drawMode !== event.draw_mode ||
      animationType !== event.animation_type
    )
  }, [initialized, event, name, description, winRuleType, drawMode, animationType])

  useUnsavedChangesWarning(hasUnsavedChanges)

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const prizeIds = useMemo(() => localPrizes.map((p) => p.id), [localPrizes])

  const handleDragEnd = (dragEvent: DragEndEvent) => {
    const { active, over } = dragEvent
    if (over && active.id !== over.id) {
      const oldIndex = localPrizes.findIndex((p) => p.id === active.id)
      const newIndex = localPrizes.findIndex((p) => p.id === over.id)
      setLocalPrizes(arrayMove(localPrizes, oldIndex, newIndex))
    }
  }

  // Prize CRUD
  const handleAddPrize = () => {
    setEditingPrize(null)
    setPrizeForm({ id: '', name: '', quantity: 1, batchNumber: 1 })
    setFormErrors([])
    setIsDialogOpen(true)
  }

  const handleEditPrize = (prize: LocalPrize) => {
    setEditingPrize(prize)
    setPrizeForm({ ...prize })
    setFormErrors([])
    setIsDialogOpen(true)
  }

  // Delete: show confirmation dialog
  const handleDeletePrize = (prizeId: string) => {
    const prize = localPrizes.find((p) => p.id === prizeId)
    if (prize) setDeleteTarget(prize)
  }

  // Delete: confirmed → immediate API call
  const handleConfirmDelete = async () => {
    if (!deleteTarget || !id) return
    setIsDeleting(true)
    try {
      await deletePrize.mutateAsync({ id: deleteTarget.id, eventId: id })
      setLocalPrizes((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      // Error toast handled by hook
    } finally {
      setIsDeleting(false)
    }
  }

  // Save prize from dialog: immediate CREATE for new, local update for edit
  const handleSavePrize = async () => {
    const errors: string[] = []
    if (!prizeForm.name.trim()) errors.push('Prize name is required')
    if (prizeForm.quantity < 1) errors.push('Quantity must be at least 1')
    if (drawMode === 'batch' && prizeForm.batchNumber >= 2 && prizeForm.batchNumber >= prizeForm.quantity) {
      errors.push('Batch number must be less than quantity')
    }
    if (errors.length > 0) {
      setFormErrors(errors)
      return
    }

    if (editingPrize) {
      // Edit existing prize → local update (saved on bulk update via Save)
      setLocalPrizes((prev) => prev.map((p) => (p.id === prizeForm.id ? prizeForm : p)))
      setIsDialogOpen(false)
    } else {
      // New prize → immediate POST to API
      if (!id) return
      setIsCreatingPrize(true)
      try {
        const prizeRequest: PrizeRequest[] = [{
          name: prizeForm.name,
          quantity: prizeForm.quantity,
          sequence: localPrizes.length + 1,
          batch_number: drawMode === 'batch' ? prizeForm.batchNumber : 1,
        }]
        const created = await createPrizes.mutateAsync({ eventId: id, prizes: prizeRequest })
        // Add to local state with server ID
        if (created.length > 0) {
          const newPrize: LocalPrize = {
            id: created[0].id,
            name: created[0].name,
            quantity: created[0].quantity,
            batchNumber: created[0].batch_number,
            image: prizeForm.image,
          }
          setLocalPrizes((prev) => [...prev, newPrize])
        }
        setIsDialogOpen(false)
      } catch {
        // Error toast handled by hook
      } finally {
        setIsCreatingPrize(false)
      }
    }
  }

  // Batch preview
  const batchPreview = useMemo(() => {
    if (drawMode !== 'batch' || prizeForm.batchNumber < 2) return null
    const totalBatches = Math.ceil(prizeForm.quantity / prizeForm.batchNumber)
    const remainder = prizeForm.quantity % prizeForm.batchNumber
    if (remainder === 0) {
      return `Prize ini terdiri dari <strong>${totalBatches} batch</strong>, masing-masing batch <strong>${prizeForm.batchNumber}</strong>`
    }
    return `Prize ini terdiri dari <strong>${totalBatches} batch</strong>, masing-masing batch <strong>${prizeForm.batchNumber}</strong>, dengan batch terakhir berjumlah <strong>${remainder}</strong>`
  }, [drawMode, prizeForm.quantity, prizeForm.batchNumber])

  // Background image handling
  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setBackgroundImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  // Save handler — only event update + bulk update prizes (reorder/edits)
  const handleSave = async () => {
    if (!id || !event) return
    setIsSaving(true)

    try {
      // 1. Update event
      const eventData: UpdateEventRequest = {
        name,
        description: description || undefined,
        start_date: startDate?.toISOString(),
        end_date: endDate?.toISOString(),
        win_rule: winRuleType as 'onetime' | 'limited' | 'unlimited',
        draw_mode: drawMode,
        animation_type: animationType,
      }
      await updateEvent.mutateAsync({ id, data: eventData })

      // 2. Bulk update prizes (reorder + field edits)
      if (localPrizes.length > 0) {
        const bulkData: BulkUpdatePrizeRequest[] = localPrizes.map((p, i) => ({
          id: p.id,
          name: p.name,
          quantity: p.quantity,
          sequence: i + 1,
          batch_number: drawMode === 'batch' ? p.batchNumber : 1,
        }))
        await bulkUpdatePrizes.mutateAsync({ eventId: id, prizes: bulkData })
      }

      navigate(`/events/${id}`, { replace: true })
    } catch {
      // Error toasts handled by hooks
    } finally {
      setIsSaving(false)
    }
  }

  // Loading
  if (isLoadingEvent || isLoadingPrizes) {
    return (
      <div className="min-h-screen bg-surface-alt">
        <Header />
        <main className="container py-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[832px]">
            <Skeleton className="mb-4 h-8 w-48" />
            <Skeleton className="mb-8 h-96 w-full rounded-xl" />
          </div>
        </main>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-surface-alt">
        <Header />
        <main className="container py-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[832px] text-center">
            <p className="text-muted-foreground">Event not found</p>
          </div>
        </main>
      </div>
    )
  }

  const isBatchMode = drawMode === 'batch'

  return (
    <div className="min-h-screen bg-surface-alt">
      <Header />

      {isSaving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-8 shadow-modal">
            <Spinner size="lg" />
            <p className="text-sm font-medium text-navy">Menyimpan data...</p>
          </div>
        </div>
      )}

      <main className="container py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[832px]">
          {/* Header */}
          <Button variant="ghost" className="mb-2 -ml-2 sm:-ml-4" asChild>
            <Link to={`/events/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Event
            </Link>
          </Button>
          <h1 className="mb-6 text-2xl sm:text-3xl font-bold text-navy">Edit Event</h1>

          <div className="space-y-6">
            {/* Event Info Section */}
            <Card>
              <CardHeader>
                <CardTitle>Event Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Event Name <span className="text-destructive">*</span></Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} />
                </div>

                <div className="space-y-2">
                  <Label>Event Date (Optional)</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                    <DatePicker
                      selectsRange
                      startDate={startDate}
                      endDate={endDate}
                      onChange={(dates: [Date | null, Date | null]) => {
                        setStartDate(dates[0])
                        setEndDate(dates[1])
                      }}
                      dateFormat="dd MMM yyyy"
                      placeholderText="Select date range"
                      isClearable
                      className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      calendarClassName="shadow-lg border rounded-lg"
                      monthsShown={isMobile ? 1 : 2}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Win Rule <span className="text-destructive">*</span></Label>
                  <Select value={winRuleType} onValueChange={(v: WinRuleType) => setWinRuleType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(WIN_RULE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {winRuleType === 'limited' && (
                  <div className="space-y-2">
                    <Label htmlFor="maxWins">Maximum Wins <span className="text-destructive">*</span></Label>
                    <Input id="maxWins" type="number" min={1} max={100} value={maxWins} onChange={(e) => setMaxWins(parseInt(e.target.value) || 1)} />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Draw Mode <span className="text-destructive">*</span></Label>
                  <RadioGroup value={drawMode} onValueChange={(v) => setDrawMode(v as 'one_by_one' | 'batch')} className="flex gap-4">
                    {Object.entries(DRAW_MODE_LABELS).map(([value, label]) => (
                      <div key={value} className="flex items-center space-x-2">
                        <RadioGroupItem value={value} id={`edit-drawMode-${value}`} />
                        <Label htmlFor={`edit-drawMode-${value}`} className="cursor-pointer">{label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Animation Type <span className="text-destructive">*</span></Label>
                  <RadioGroup value={animationType} onValueChange={(v) => setAnimationType(v as 'sphere' | 'rolling' | 'randomize')} className="flex gap-4">
                    {Object.entries(ANIMATION_TYPE_LABELS).map(([value, label]) => (
                      <div key={value} className="flex items-center space-x-2">
                        <RadioGroupItem value={value} id={`edit-animationType-${value}`} />
                        <Label htmlFor={`edit-animationType-${value}`} className="cursor-pointer">{label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* Prizes Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Prizes ({localPrizes.length})
                  </CardTitle>
                  <Button size="sm" onClick={handleAddPrize}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Prize
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {localPrizes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Gift className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No prizes</p>
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={prizeIds} strategy={verticalListSortingStrategy}>
                      <div className="space-y-3">
                        {localPrizes.map((prize, index) => (
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
              </CardContent>
            </Card>

            {/* Display Settings Section */}
            <Card>
              <CardHeader>
                <CardTitle>Display Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-800">
                  <Info className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">This setting will be available in a future update.</span>
                </div>

                <div className="space-y-2">
                  <Label>Background Image (Optional)</Label>
                  {backgroundImage ? (
                    <div className="relative">
                      <img src={backgroundImage} alt="Background preview" className="max-h-32 w-full rounded-lg object-cover" />
                      <Button variant="destructive" size="icon" className="absolute right-2 top-2" onClick={() => setBackgroundImage(undefined)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6">
                      <Image className="mb-2 h-6 w-6 text-muted-foreground" />
                      <Input type="file" accept="image/*" onChange={handleBackgroundUpload} className="hidden" id="edit-bg-upload" />
                      <Label htmlFor="edit-bg-upload" className="cursor-pointer">
                        <Button variant="outline" size="sm" asChild>
                          <span><Upload className="mr-2 h-4 w-4" />Upload</span>
                        </Button>
                      </Label>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Winner Display</Label>
                  <RadioGroup
                    value={winnerDisplayMode}
                    onValueChange={(v) => setWinnerDisplayMode(v as 'coupon_only' | 'coupon_and_participant')}
                    className="space-y-2"
                  >
                    {Object.entries(WINNER_DISPLAY_MODE_LABELS).map(([value, label]) => (
                      <div key={value} className="flex items-center space-x-2">
                        <RadioGroupItem value={value} id={`edit-display-${value}`} />
                        <Label htmlFor={`edit-display-${value}`} className="cursor-pointer">{label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t bg-surface-alt py-4">
            <Button variant="outline" asChild>
              <Link to={`/events/${id}`}>Cancel</Link>
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </main>

      {/* Prize Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPrize ? 'Edit Prize' : 'Add Prize'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 space-y-2">
                <Label>Image</Label>
                <PrizeImageUpload
                  value={prizeForm.image}
                  onChange={(value) => setPrizeForm({ ...prizeForm, image: value })}
                />
              </div>
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editPrizeName">Prize Name <span className="text-destructive">*</span></Label>
                  <Input id="editPrizeName" value={prizeForm.name} onChange={(e) => setPrizeForm({ ...prizeForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPrizeQty">Quantity <span className="text-destructive">*</span></Label>
                  <Input id="editPrizeQty" type="number" min={1} value={prizeForm.quantity} onChange={(e) => setPrizeForm({ ...prizeForm, quantity: parseInt(e.target.value) || 1 })} />
                </div>
              </div>
            </div>

            {isBatchMode && (
              <div className="space-y-2">
                <Label htmlFor="editBatchNumber">Batch Number <span className="text-destructive">*</span></Label>
                <Input
                  id="editBatchNumber"
                  type="number"
                  min={2}
                  max={Math.max(prizeForm.quantity - 1, 2)}
                  value={prizeForm.batchNumber}
                  onChange={(e) => setPrizeForm({ ...prizeForm, batchNumber: parseInt(e.target.value) || 2 })}
                />
                {batchPreview && (
                  <div className="rounded-md bg-muted p-3 text-sm" dangerouslySetInnerHTML={{ __html: batchPreview }} />
                )}
              </div>
            )}

            {formErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-inside list-disc">
                    {formErrors.map((error, i) => <li key={i}>{error}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isCreatingPrize}>Cancel</Button>
            <Button onClick={handleSavePrize} disabled={isCreatingPrize}>
              {isCreatingPrize ? 'Menyimpan...' : editingPrize ? 'Save Changes' : 'Add Prize'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Hapus Prize?"
        description={`Apakah Anda yakin ingin menghapus prize "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </div>
  )
}
