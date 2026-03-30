import { useState, useMemo } from 'react'
import type { CardLayout } from '@/types'
import type { PrizeRequest, PrizesListResponse } from '@/types/api'
import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { resolveImageUrl } from '@/utils/helpers'

export interface LocalPrize {
  id: string
  name: string
  image?: string
  backgroundImage?: string
  quantity: number
  batchNumber: number
  cardLayout?: CardLayout
}

interface UseEditPrizesOptions {
  eventId: string | undefined
  drawMode: 'one_by_one' | 'batch'
  createPrizes: { mutateAsync: (args: { eventId: string; prizes: PrizeRequest[] }) => Promise<PrizesListResponse[]> }
  deletePrize: { mutateAsync: (args: { id: string; eventId: string }) => Promise<unknown> }
}

export function useEditPrizes({ eventId, drawMode, createPrizes, deletePrize }: UseEditPrizesOptions) {
  // Prize state
  const [localPrizes, setLocalPrizes] = useState<LocalPrize[]>([])

  // Prize dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPrize, setEditingPrize] = useState<LocalPrize | null>(null)
  const [prizeForm, setPrizeForm] = useState<LocalPrize>({ id: '', name: '', quantity: 1, batchNumber: 1 })
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [isCreatingPrize, setIsCreatingPrize] = useState(false)

  // Layout editor
  const [layoutEditorOpen, setLayoutEditorOpen] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<LocalPrize | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const prizeIds = useMemo(() => localPrizes.map((p) => p.id), [localPrizes])

  const handleDragEnd = (dragEvent: DragEndEvent) => {
    const { active, over } = dragEvent
    if (over && active.id !== over.id) {
      const oldIndex = localPrizes.findIndex((p) => p.id === active.id)
      const newIndex = localPrizes.findIndex((p) => p.id === over.id)
      setLocalPrizes(arrayMove(localPrizes, oldIndex, newIndex))
    }
  }

  const handleAddPrize = () => {
    setEditingPrize(null)
    setPrizeForm({ id: '', name: '', quantity: 1, batchNumber: drawMode === 'batch' ? 2 : 1 })
    setFormErrors([])
    setIsDialogOpen(true)
  }

  const handleEditPrize = (prize: LocalPrize) => {
    setEditingPrize(prize)
    setPrizeForm({ ...prize })
    setFormErrors([])
    setIsDialogOpen(true)
  }

  const handleDeletePrize = (prizeId: string) => {
    const prize = localPrizes.find((p) => p.id === prizeId)
    if (prize) setDeleteTarget(prize)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !eventId) return
    setIsDeleting(true)
    try {
      await deletePrize.mutateAsync({ id: deleteTarget.id, eventId })
      setLocalPrizes((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      // Error toast handled by hook
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSavePrize = async () => {
    const errors: string[] = []
    if (!prizeForm.name.trim()) errors.push('Prize name is required')
    if (prizeForm.quantity < 1) errors.push('Quantity must be at least 1')
    if (drawMode === 'batch') {
      if (prizeForm.batchNumber < 1) errors.push('Batch number must be at least 1')
      if (prizeForm.batchNumber > prizeForm.quantity) errors.push('Batch number must not exceed quantity')
    }
    if (errors.length > 0) {
      setFormErrors(errors)
      return
    }

    if (editingPrize) {
      setLocalPrizes((prev) => prev.map((p) => (p.id === prizeForm.id ? prizeForm : p)))
      setIsDialogOpen(false)
    } else {
      if (!eventId) return
      setIsCreatingPrize(true)
      try {
        const prizeRequest: PrizeRequest[] = [{
          name: prizeForm.name,
          quantity: prizeForm.quantity,
          sequence: localPrizes.length + 1,
          batch_number: drawMode === 'batch' ? prizeForm.batchNumber : 1,
          prize_image: prizeForm.image || undefined,
          background_image: prizeForm.backgroundImage || undefined,
          card_layout: prizeForm.cardLayout ?? {},
        }]
        const created = await createPrizes.mutateAsync({ eventId, prizes: prizeRequest })
        if (created.length > 0) {
          const newPrize: LocalPrize = {
            id: created[0].id,
            name: created[0].name,
            quantity: created[0].quantity,
            batchNumber: created[0].batch_number,
            image: resolveImageUrl(created[0].prize_image) || prizeForm.image,
            backgroundImage: resolveImageUrl(created[0].background_image) || prizeForm.backgroundImage,
            cardLayout: created[0].card_layout?.positions?.length ? created[0].card_layout : undefined,
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

  const drawPreview = useMemo(() => {
    if (drawMode === 'one_by_one') {
      if (prizeForm.quantity < 1) return null
      return `Prize ini akan di-draw <strong>satu per satu</strong> sebanyak <strong>${prizeForm.quantity} kali</strong>`
    }
    if (prizeForm.batchNumber < 2 || prizeForm.batchNumber >= prizeForm.quantity) return null
    const totalBatches = Math.ceil(prizeForm.quantity / prizeForm.batchNumber)
    const remainder = prizeForm.quantity % prizeForm.batchNumber
    if (remainder === 0) {
      return `Prize ini terdiri dari <strong>${totalBatches} batch</strong>, tiap batch di-draw <strong>${prizeForm.batchNumber} kali</strong> draw`
    }
    return `Prize ini terdiri dari <strong>${totalBatches} batch</strong>, tiap batch di-draw <strong>${prizeForm.batchNumber} kali</strong>, dengan batch terakhir sebanyak <strong>${remainder} kali</strong> draw`
  }, [drawMode, prizeForm.quantity, prizeForm.batchNumber])

  return {
    localPrizes,
    setLocalPrizes,
    prizeIds,
    isDialogOpen,
    setIsDialogOpen,
    editingPrize,
    prizeForm,
    setPrizeForm,
    formErrors,
    isCreatingPrize,
    layoutEditorOpen,
    setLayoutEditorOpen,
    deleteTarget,
    setDeleteTarget,
    isDeleting,
    drawPreview,
    handleDragEnd,
    handleAddPrize,
    handleEditPrize,
    handleDeletePrize,
    handleConfirmDelete,
    handleSavePrize,
  }
}
