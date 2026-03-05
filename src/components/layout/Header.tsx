/**
 * @file components/layout/Header.tsx
 * @description Application header component with navigation
 */

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Plus, Trophy, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useLogout } from '@/hooks/useAuth'

/**
 * Header component for the raffle app
 * Shows app title and primary navigation
 */
export function Header() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useLogout()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

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

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isHome && (
            <Button size="sm" asChild>
              <Link to="/events/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Event
              </Link>
            </Button>
          )}
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLogoutConfirm(true)}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        title="Logout?"
        description="Apakah Anda yakin ingin keluar dari akun ini?"
        confirmText="Logout"
        cancelText="Batal"
        onConfirm={() => {
          setShowLogoutConfirm(false)
          logout()
        }}
      />
    </header>
  )
}

export default Header
