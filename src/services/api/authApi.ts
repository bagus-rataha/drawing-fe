import axios from 'axios'
import type { ApiResponse, LoginInput, TokenResponse } from '@/types/api'

const baseURL = import.meta.env.VITE_API_BASE_URL

export async function login(data: LoginInput): Promise<TokenResponse> {
  const response = await axios.post<ApiResponse<TokenResponse>>(
    `${baseURL}/auth/login`,
    data
  )
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
  return response.data.data
}

export async function refreshToken(token: string): Promise<TokenResponse> {
  const response = await axios.post<ApiResponse<TokenResponse>>(
    `${baseURL}/auth/refresh`,
    { refresh_token: token }
  )
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
  return response.data.data
}
