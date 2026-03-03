import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { login } from '@/services/api/authApi'
import { useToast } from '@/components/ui/use-toast'

export function useLogin() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const { toast } = useToast()

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth(data.access_token, data.refresh_token, data.user)
      navigate('/')
    },
    onError: (error: Error) => {
      toast({
        title: 'Login gagal',
        description: error.message || 'Email atau password salah',
        variant: 'destructive',
      })
    },
  })
}

export function useLogout() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  return () => {
    clearAuth()
    navigate('/login')
  }
}
