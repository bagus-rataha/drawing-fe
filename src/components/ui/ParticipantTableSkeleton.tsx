/**
 * @file components/ui/ParticipantTableSkeleton.tsx
 * @description Skeleton loading component for participant table
 *
 * Shows a placeholder layout while participant data is loading
 */

import { Skeleton } from '@/components/ui/skeleton'

/**
 * Skeleton loading state for participant table
 * Used during initial load when no data is available yet
 */
export function ParticipantTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Analytics skeleton - 3 stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
          <Skeleton className="h-9 w-48" />
        </div>

        {/* Table header */}
        <div className="border-b">
          <div className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>

        {/* Table rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-8" />
          </div>
        ))}

        {/* Pagination */}
        <div className="flex items-center justify-between border-t p-4">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ParticipantTableSkeleton
