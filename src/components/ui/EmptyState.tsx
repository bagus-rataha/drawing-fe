/**
 * @file components/ui/EmptyState.tsx
 * @description Empty state component for when no data is available
 */

import { Link } from 'react-router-dom'
import { LucideIcon } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /** Icon to display */
  icon: LucideIcon
  /** Title text */
  title: string
  /** Description text */
  description?: string
  /** Action button configuration */
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  /** Additional class names */
  className?: string
}

/**
 * Empty state component for displaying when no data is available
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={Calendar}
 *   title="No events yet"
 *   description="Create your first lottery event to get started"
 *   action={{ label: "+ Create Event", href: "/event/new" }}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-alt">
        <Icon className="h-8 w-8 text-content-muted" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-navy">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-content-muted max-w-sm">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          {action.href ? (
            <Button asChild>
              <Link to={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
        </div>
      )}
    </div>
  )
}

export default EmptyState
