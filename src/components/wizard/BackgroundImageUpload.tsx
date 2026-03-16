/**
 * @file components/wizard/BackgroundImageUpload.tsx
 * @description Background image upload with landscape preview
 */

import { useRef } from 'react'
import { Upload, Pencil, Trash2, Image } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

interface BackgroundImageUploadProps {
  value?: string
  onChange: (base64: string | undefined) => void
  className?: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export function BackgroundImageUpload({ value, onChange, className }: BackgroundImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (JPG, PNG, GIF, etc.)',
        variant: 'destructive',
      })
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Background image must be less than 5MB',
        variant: 'destructive',
      })
      return
    }

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
        <div
          className="group relative w-full cursor-pointer overflow-hidden rounded-lg border border-border-custom"
          onClick={handleClick}
        >
          <img
            src={value}
            alt="Background preview"
            className="h-28 w-full object-cover"
          />
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
        <button
          type="button"
          onClick={handleClick}
          className="flex h-28 w-full flex-col items-center justify-center rounded-lg border border-dashed border-border-custom text-content-muted transition-colors hover:border-primary hover:text-primary"
        >
          <Image className="h-6 w-6" />
          <span className="mt-1 flex items-center gap-1 text-xs">
            <Upload className="h-3 w-3" />
            Upload Background
          </span>
        </button>
      )}
    </div>
  )
}

export default BackgroundImageUpload
