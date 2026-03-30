import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Edit, Trash2, GripVertical, ImageIcon } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export interface SortablePrize {
  id: string
  name: string
  image?: string
  quantity: number
  batchNumber: number
}

interface SortablePrizeItemProps<T extends SortablePrize> {
  prize: T
  index: number
  showBatch: boolean
  onEdit: (prize: T) => void
  onDelete: (id: string) => void
}

export function SortablePrizeItem<T extends SortablePrize>({
  prize,
  index,
  showBatch,
  onEdit,
  onDelete,
}: SortablePrizeItemProps<T>) {
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
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-custom bg-surface-alt">
            {prize.image ? (
              <img src={prize.image} alt={prize.name} className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-content-muted" />
            )}
          </div>
          <div className="flex-1 min-w-0 sm:hidden">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">#{index + 1}</span>
              <span className="truncate font-semibold text-sm">{prize.name}</span>
            </div>
          </div>
          <div className="flex gap-1 sm:hidden">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(prize)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(prize.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
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
        <div className="sm:hidden text-xs text-muted-foreground pl-8">
          {prize.quantity} winner{prize.quantity > 1 ? 's' : ''}
          {showBatch && prize.batchNumber >= 2 && ` · Batch: ${prize.batchNumber}`}
        </div>
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
