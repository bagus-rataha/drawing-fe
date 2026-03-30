/**
 * @file pages/EditEvent.tsx
 * @description Single-page edit layout for draft events
 */

import { useState, useMemo, useEffect, useRef } from 'react'
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
import { BackgroundImageUpload } from '@/components/wizard/BackgroundImageUpload'
import { CardLayoutEditor } from '@/components/editor/CardLayoutEditor'
import { EditSoundSelect } from '@/components/EditSoundSelect'
import { generateAutoGrid } from '@/components/editor/useCardLayout'
import { SortablePrizeItem } from '@/components/SortablePrizeItem'
import { useEditPrizes, type LocalPrize } from '@/hooks/useEditPrizes'
import {
  ArrowLeft,
  Save,
  Plus,
  Gift,
  AlertCircle,
  Info,
  CalendarIcon,
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
import type { UpdateEventRequest, BulkUpdatePrizeRequest, PrizesListResponse } from '@/types/api'
import {
  WIN_RULE_LABELS,
  DRAW_MODE_LABELS,
  ANIMATION_TYPE_LABELS,
  WINNER_DISPLAY_MODE_LABELS,
  ROLLING_SOUND_OPTIONS,
  REVEAL_SOUND_OPTIONS,
} from '@/utils/constants'
import { resolveImageUrl } from '@/utils/helpers'
import { ImportedDataTable } from '@/components/ImportedDataTable'
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
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

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
  const [animationType, setAnimationType] = useState<'sphere' | 'rolling' | 'randomize'>('randomize')

  // Display settings
  const [winnerDisplayMode, setWinnerDisplayMode] = useState<'coupon' | 'coupon_participant'>('coupon')
  const [rollingSound, setRollingSound] = useState('')
  const [revealSound, setRevealSound] = useState('')

  // Prize management (extracted hook)
  const prizes = useEditPrizes({ eventId: id, drawMode, createPrizes, deletePrize })
  const {
    localPrizes, setLocalPrizes, prizeIds,
    isDialogOpen, setIsDialogOpen, editingPrize,
    prizeForm, setPrizeForm, formErrors, isCreatingPrize,
    layoutEditorOpen, setLayoutEditorOpen,
    deleteTarget, setDeleteTarget, isDeleting, drawPreview,
    handleDragEnd, handleAddPrize, handleEditPrize,
    handleDeletePrize, handleConfirmDelete, handleSavePrize,
  } = prizes

  // Initialized flag
  const [initialized, setInitialized] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Initial snapshots for dirty checking
  const initialEventRef = useRef<UpdateEventRequest | null>(null)
  const initialPrizesRef = useRef<LocalPrize[]>([])

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
      setMaxWins(event.max_win_count || 2)
      setDrawMode(event.draw_mode)
      setAnimationType(event.display_settings?.animation_type || 'randomize')
      setWinnerDisplayMode(event.display_settings?.winner_display || 'coupon')
      setRollingSound(event.display_settings?.rolling_sound || '')
      setRevealSound(event.display_settings?.reveal_sound || '')

      const mappedPrizes = apiPrizes.map((p: PrizesListResponse) => ({
        id: p.id,
        name: p.name,
        quantity: p.quantity,
        batchNumber: p.batch_number,
        image: resolveImageUrl(p.prize_image),
        backgroundImage: resolveImageUrl(p.background_image),
        cardLayout: p.card_layout?.positions?.length ? p.card_layout : undefined,
      }))
      setLocalPrizes(mappedPrizes)

      // Store initial snapshots for dirty checking
      initialEventRef.current = {
        name: event.name,
        description: event.description || undefined,
        start_date: event.start_date || undefined,
        end_date: event.end_date || undefined,
        win_rule: event.win_rule,
        max_win_count: event.max_win_count || 0,
        draw_mode: event.draw_mode,
        display_settings: {
          animation_type: event.display_settings?.animation_type || 'randomize',
          winner_display: event.display_settings?.winner_display || 'coupon',
          rolling_sound: event.display_settings?.rolling_sound || '',
          reveal_sound: event.display_settings?.reveal_sound || '',
        },
      }
      initialPrizesRef.current = mappedPrizes.map((p) => ({ ...p })) as LocalPrize[]

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
      maxWins !== (event.max_win_count || 2) ||
      drawMode !== event.draw_mode ||
      animationType !== (event.display_settings?.animation_type || 'randomize') ||
      winnerDisplayMode !== (event.display_settings?.winner_display || 'coupon') ||
      rollingSound !== (event.display_settings?.rolling_sound || '') ||
      revealSound !== (event.display_settings?.reveal_sound || '')
    )
  }, [initialized, event, name, description, winRuleType, maxWins, drawMode, animationType, winnerDisplayMode, rollingSound, revealSound])

  useUnsavedChangesWarning(hasUnsavedChanges)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Save handler — only event update + bulk update prizes (reorder/edits)
  const handleSave = async () => {
    if (!id || !event) return
    setIsSaving(true)

    try {
      const eventData: UpdateEventRequest = {
        name,
        description: description || undefined,
        start_date: startDate?.toISOString(),
        end_date: endDate?.toISOString(),
        win_rule: winRuleType as 'onetime' | 'limited' | 'unlimited',
        max_win_count: winRuleType === 'limited' ? maxWins : 0,
        draw_mode: drawMode,
        display_settings: {
          animation_type: animationType,
          winner_display: winnerDisplayMode,
          rolling_sound: rollingSound,
          reveal_sound: revealSound,
        },
      }

      // Dirty check: only update event if changed
      const prev = initialEventRef.current
      const eventDirty =
        !prev ||
        eventData.name !== prev.name ||
        eventData.description !== prev.description ||
        eventData.start_date !== prev.start_date ||
        eventData.end_date !== prev.end_date ||
        eventData.win_rule !== prev.win_rule ||
        eventData.max_win_count !== prev.max_win_count ||
        eventData.draw_mode !== prev.draw_mode ||
        JSON.stringify(eventData.display_settings) !== JSON.stringify(prev.display_settings)

      if (eventDirty) {
        await updateEvent.mutateAsync({ id, data: eventData })
      }

      // Dirty check: only update prizes if changed (order, name, quantity, batch_number, images)
      const prevPrizes = initialPrizesRef.current
      const prizesDirty =
        localPrizes.length !== prevPrizes.length ||
        localPrizes.some((p, i) => {
          const old = prevPrizes[i]
          return (
            p.id !== old.id ||
            p.name !== old.name ||
            p.quantity !== old.quantity ||
            p.batchNumber !== old.batchNumber ||
            p.image !== old.image ||
            p.backgroundImage !== old.backgroundImage ||
            JSON.stringify(p.cardLayout) !== JSON.stringify(old.cardLayout)
          )
        })

      if (prizesDirty && localPrizes.length > 0) {
        const bulkData: BulkUpdatePrizeRequest[] = localPrizes.map((p, i) => {
          const old = prevPrizes[i]
          const entry: BulkUpdatePrizeRequest = {
            id: p.id,
            name: p.name,
            quantity: p.quantity,
            sequence: i + 1,
            batch_number: drawMode === 'batch' ? p.batchNumber : 1,
            card_layout: p.cardLayout ?? {},
          }
          // Only send image fields if changed (avoid sending URL back to API)
          if (p.image !== old?.image) {
            entry.prize_image = p.image || ''
          }
          if (p.backgroundImage !== old?.backgroundImage) {
            entry.background_image = p.backgroundImage || ''
          }
          return entry
        })
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
                    <Input id="maxWins" type="number" min={2} max={100} value={maxWins} onChange={(e) => setMaxWins(parseInt(e.target.value) || 2)} />
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

            {/* Imported Data Section */}
            {event.import_status === 'done' && id && (
              <ImportedDataTable eventId={id} allowDelete />
            )}

            {/* Display Settings Section */}
            <Card>
              <CardHeader>
                <CardTitle>Display Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-800">
                  <Info className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">Background images are configured per-prize in the prize dialog above.</span>
                </div>

                <div className="space-y-2">
                  <Label>Animation Type</Label>
                  <RadioGroup value={animationType} onValueChange={(v) => setAnimationType(v as 'sphere' | 'rolling' | 'randomize')} className="flex gap-4">
                    {Object.entries(ANIMATION_TYPE_LABELS).map(([value, label]) => {
                      const isDisabled = value !== 'randomize'
                      return (
                        <div key={value} className={`flex items-center space-x-2 ${isDisabled ? 'opacity-50' : ''}`}>
                          <RadioGroupItem value={value} id={`edit-animationType-${value}`} disabled={isDisabled} />
                          <Label htmlFor={`edit-animationType-${value}`} className={isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}>
                            {label}{isDisabled && ' (Coming Soon)'}
                          </Label>
                        </div>
                      )
                    })}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Winner Display</Label>
                  <RadioGroup
                    value={winnerDisplayMode}
                    onValueChange={(v) => setWinnerDisplayMode(v as 'coupon' | 'coupon_participant')}
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

                {/* Sound Effects */}
                <div className="space-y-3">
                  <Label>Sound Effects</Label>
                  <div className="space-y-2">
                    <EditSoundSelect label="Rolling Sound" value={rollingSound} options={ROLLING_SOUND_OPTIONS} onChange={setRollingSound} />
                    <EditSoundSelect label="Reveal Sound" value={revealSound} options={REVEAL_SOUND_OPTIONS} onChange={setRevealSound} />
                  </div>
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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} modal={!layoutEditorOpen}>
        <DialogContent
          onInteractOutside={(e) => { if (layoutEditorOpen) e.preventDefault() }}
        >
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
                  min={1}
                  max={prizeForm.quantity}
                  value={prizeForm.batchNumber}
                  onChange={(e) => setPrizeForm({ ...prizeForm, batchNumber: parseInt(e.target.value) || 1 })}
                />
                <p className="text-sm text-muted-foreground">
                  Number of winners per batch (min 1, max {prizeForm.quantity})
                </p>
              </div>
            )}

            {/* Background Image */}
            <div className="space-y-2">
              <Label>Background Image</Label>
              <BackgroundImageUpload
                value={prizeForm.backgroundImage}
                onChange={(value) => setPrizeForm({ ...prizeForm, backgroundImage: value })}
              />
              <p className="text-sm text-muted-foreground">
                Background image for the draw screen when drawing this prize
              </p>
            </div>

            {/* Card Layout Mode */}
            <div className="space-y-2">
              <Label>Card Layout</Label>
              <RadioGroup
                value={prizeForm.cardLayout ? 'custom' : 'grid'}
                onValueChange={(mode) => {
                  if (mode === 'grid') {
                    setPrizeForm({ ...prizeForm, cardLayout: undefined })
                  } else {
                    if (!prizeForm.cardLayout) {
                      const count = prizeForm.batchNumber
                      setPrizeForm({
                        ...prizeForm,
                        cardLayout: {
                          aspectRatio: 16 / 9,
                          cardWidth: 0.12,
                          cardHeight: 0.12 * (16 / 9) / 2.2,
                          positions: generateAutoGrid(count),
                        },
                      })
                    }
                  }
                }}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="grid" id="edit-layout-grid" />
                  <Label htmlFor="edit-layout-grid" className="font-normal cursor-pointer">
                    Default Grid
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="custom" id="edit-layout-custom" />
                  <Label htmlFor="edit-layout-custom" className="font-normal cursor-pointer">
                    Custom Layout
                  </Label>
                </div>
              </RadioGroup>
              {prizeForm.cardLayout && (
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

            {drawPreview && (
              <div className="rounded-md bg-muted p-3 text-sm" dangerouslySetInnerHTML={{ __html: drawPreview }} />
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

      {/* Card Layout Editor — portaled to body, modal=false on Dialog prevents inert */}
      <CardLayoutEditor
        isOpen={layoutEditorOpen}
        onClose={() => setLayoutEditorOpen(false)}
        batchNumber={prizeForm.batchNumber}
        backgroundImage={prizeForm.backgroundImage}
        initialLayout={prizeForm.cardLayout}
        onSave={(layout) => setPrizeForm({ ...prizeForm, cardLayout: layout })}
      />

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

