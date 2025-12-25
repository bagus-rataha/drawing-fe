/**
 * @file components/ui/skeleton.tsx
 * @description Skeleton loading placeholder component
 */

import { cn } from '@/lib/utils'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-md animate-shimmer', className)}
      {...props}
    />
  )
}

export { Skeleton }
