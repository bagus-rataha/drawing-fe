/**
 * @file components/ui/badge.tsx
 * @description Badge component for status indicators and labels
 */

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border-transparent px-3 py-1.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        secondary: 'bg-surface-alt text-content-secondary',
        destructive: 'bg-error/10 text-error',
        outline: 'border border-border-custom text-content-secondary',
        // Status variants matching spec
        draft: 'bg-slate-100 text-slate-500',
        ready: 'bg-emerald-50 text-emerald-600',
        in_progress: 'bg-blue-50 text-blue-600',
        completed: 'bg-green-50 text-green-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
