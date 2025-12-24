/**
 * @file components/layout/Header.tsx
 * @description Application header component with navigation
 */

import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Plus, Trophy } from 'lucide-react'

/**
 * Header component for the lottery app
 * Shows app title and primary navigation
 */
export function Header() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Lottery App</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          {isHome && (
            <Button asChild>
              <Link to="/event/new">
                <Plus className="mr-2 h-4 w-4" />
                New Event
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
