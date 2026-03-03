import { create } from 'zustand'
import type { UserResponse } from '@/types/api'

interface AuthState {
  accessToken: string | null
  user: UserResponse | null
  isAuthenticated: boolean
  setAuth: (accessToken: string, refreshToken: string, user: UserResponse) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,

  setAuth: (accessToken, refreshToken, user) => {
    localStorage.setItem('refresh_token', refreshToken)
    set({ accessToken, user, isAuthenticated: true })
  },

  clearAuth: () => {
    localStorage.removeItem('refresh_token')
    set({ accessToken: null, user: null, isAuthenticated: false })
  },
}))
