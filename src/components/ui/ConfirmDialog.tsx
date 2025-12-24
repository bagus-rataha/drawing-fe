/**
 * @file components/ui/ConfirmDialog.tsx
 * @description Reusable confirmation dialog component
 *
 * Used for delete confirmations and other destructive actions
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'
import { Button } from './button'
import { Input } from './input'
import { Loader2 } from 'lucide-react'
import { generateDeleteConfirmation } from '@/utils/helpers'

interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** Dialog title */
  title: string
  /** Dialog description/message */
  description: string
  /** Text for confirm button */
  confirmText?: string
  /** Text for cancel button */
  cancelText?: string
  /** Button variant - destructive for delete actions */
  variant?: 'default' | 'destructive'
  /** Callback when user confirms */
  onConfirm: () => void
  /** Whether the action is in progress (shows loading spinner) */
  isLoading?: boolean
  /** Whether to require typed confirmation code */
  requireTypedConfirmation?: boolean
  /** Identifier for the confirmation code (e.g., event name, participant ID) */
  confirmationIdentifier?: string
}

/**
 * Reusable confirmation dialog component
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   open={showDeleteDialog}
 *   onOpenChange={setShowDeleteDialog}
 *   title="Delete Participant?"
 *   description="This will also delete 5 coupon(s)."
 *   confirmText="Delete"
 *   variant="destructive"
 *   onConfirm={handleDelete}
 *   isLoading={isDeleting}
 * />
 * ```
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
  isLoading = false,
  requireTypedConfirmation = false,
  confirmationIdentifier = '',
}: ConfirmDialogProps) {
  // State for typed confirmation
  const [confirmationCode, setConfirmationCode] = useState('')
  const [typedValue, setTypedValue] = useState('')

  // Generate new confirmation code when dialog opens, reset when closed
  useEffect(() => {
    if (open && requireTypedConfirmation && confirmationIdentifier) {
      setConfirmationCode(generateDeleteConfirmation(confirmationIdentifier))
      setTypedValue('')
    } else if (!open) {
      // Reset state when dialog closes
      setConfirmationCode('')
      setTypedValue('')
    }
  }, [open, requireTypedConfirmation, confirmationIdentifier])

  // Check if confirmation matches (case sensitive)
  const isConfirmationValid = !requireTypedConfirmation || typedValue === confirmationCode

  const handleConfirm = () => {
    if (!isConfirmationValid) return
    onConfirm()
    // Don't close here - let the parent control when to close
    // This allows showing loading state during async operations
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      onOpenChange(newOpen)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="whitespace-pre-line">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Typed confirmation input */}
        {requireTypedConfirmation && confirmationCode && (
          <div className="space-y-3 py-2">
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                To confirm, type this code exactly (case sensitive):
              </p>
              <code className="mt-1 block font-mono text-sm font-semibold text-foreground">
                {confirmationCode}
              </code>
            </div>
            <Input
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder="Type confirmation code here..."
              disabled={isLoading}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            disabled={isLoading || !isConfirmationValid}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmDialog
