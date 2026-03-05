import { create } from 'zustand'
import type { UserResponse } from '@/types/api'

interface AuthState {
  accessToken: string | null
  user: UserResponse | null
  isAuthenticated: boolean
  setAuth: (accessToken: string, refreshToken: string, user: UserResponse) => void
  clearAuth: () => void
}

// Hydrate from localStorage on init
const storedAccessToken = localStorage.getItem('access_token')
const storedUser = (() => {
  try {
    const raw = localStorage.getItem('user')
    return raw ? (JSON.parse(raw) as UserResponse) : null
  } catch {
    return null
  }
})()

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: storedAccessToken,
  user: storedUser,
  isAuthenticated: !!storedAccessToken,

  setAuth: (accessToken, refreshToken, user) => {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('user', JSON.stringify(user))
    set({ accessToken, user, isAuthenticated: true })
  },

  clearAuth: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    set({ accessToken: null, user: null, isAuthenticated: false })
  },
}))
