/**
 * @file components/layout/Header.tsx
 * @description Application header component with navigation
 */

import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Plus, Trophy } from 'lucide-react'

/**
 * Header component for the raffle app
 * Shows app title and primary navigation
 */
export function Header() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-white border-b border-border-custom">
      <div className="container flex h-full items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-navy">RaffleApp</span>
        </Link>

        {/* Create Button */}
        {isHome && (
          <Button size="sm" asChild>
            <Link to="/event/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Link>
          </Button>
        )}
      </div>
    </header>
  )
}

export default Header
