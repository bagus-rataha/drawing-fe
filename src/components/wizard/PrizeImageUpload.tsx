/**
 * @file components/wizard/PrizeImageUpload.tsx
 * @description Image upload component for prize form
 */

import { useRef } from 'react'
import { ImagePlus, Pencil, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

interface PrizeImageUploadProps {
  value?: string
  onChange: (base64: string | undefined) => void
  className?: string
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

/**
 * Prize image upload component
 * - 80x80px square preview
 * - Accepts image/* files
 * - Max 2MB file size
 * - Converts to base64
 */
export function PrizeImageUpload({ value, onChange, className }: PrizeImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (JPG, PNG, GIF, etc.)',
        variant: 'destructive',
      })
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 2MB',
        variant: 'destructive',
      })
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onload = () => {
      onChange(reader.result as string)
    }
    reader.onerror = () => {
      toast({
        title: 'Error reading file',
        description: 'Failed to read the image file',
        variant: 'destructive',
      })
    }
    reader.readAsDataURL(file)

    // Reset input so the same file can be selected again
    e.target.value = ''
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(undefined)
  }

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        // Image preview with hover actions
        <div
          className="group relative h-20 w-20 cursor-pointer overflow-hidden rounded-lg border border-border-custom"
          onClick={handleClick}
        >
          <img
            src={value}
            alt="Prize"
            className="h-full w-full object-cover"
          />
          {/* Hover overlay with actions */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-navy/60 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={handleClick}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-navy hover:bg-white"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-error hover:bg-white"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        // Upload placeholder
        <button
          type="button"
          onClick={handleClick}
          className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-dashed border-border-custom text-content-muted transition-colors hover:border-primary hover:text-primary"
        >
          <ImagePlus className="h-5 w-5" />
          <span className="mt-1 text-xs">Upload</span>
        </button>
      )}
    </div>
  )
}

export default PrizeImageUpload
