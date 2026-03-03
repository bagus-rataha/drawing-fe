import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/components/ui/spinner'

export default function ProtectedRoute() {
  const { isAuthenticated, setAuth, clearAuth } = useAuthStore()
  const [isChecking, setIsChecking] = useState(!isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) return

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      setIsChecking(false)
      return
    }

    // Attempt silent refresh
    axios
      .post(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      })
      .then((response) => {
        const { access_token, refresh_token: newRefreshToken, user } = response.data.data
        setAuth(access_token, newRefreshToken, user)
      })
      .catch(() => {
        clearAuth()
      })
      .finally(() => {
        setIsChecking(false)
      })
  }, [isAuthenticated, setAuth, clearAuth])

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
