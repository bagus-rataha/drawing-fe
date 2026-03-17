import apiClient from '@/lib/apiClient'
import type {
  ApiResponse,
  DrawingStatusResponse,
  AnimationCouponResponse,
  CancelWinnerRequest,
  WinnerResponse,
} from '@/types/api'

export async function getDrawingStatus(eventId: string): Promise<DrawingStatusResponse> {
  const response = await apiClient.get<ApiResponse<DrawingStatusResponse>>(
    `/drawing/${eventId}/current-status`
  )
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
  const data = response.data.data
  // Normalize null arrays (API returns null when event is complete)
  return {
    ...data,
    empty_slots: data.empty_slots || [],
    current_batch_draw: data.current_batch_draw || [],
  }
}

export async function getAnimationCoupons(eventId: string): Promise<AnimationCouponResponse[]> {
  const response = await apiClient.get<ApiResponse<AnimationCouponResponse[]>>(
    `/drawing/${eventId}/animation-coupons`
  )
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
  return response.data.data
}

export async function drawV2(eventId: string): Promise<(WinnerResponse | null)[]> {
  const response = await apiClient.post<ApiResponse<(WinnerResponse | null)[]>>(
    `/drawing/${eventId}/draw-v2`
  )
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
  return response.data.data
}

export async function cancelWinner(eventId: string, body: CancelWinnerRequest): Promise<void> {
  const response = await apiClient.post<ApiResponse<null>>(
    `/drawing/${eventId}/cancel`,
    body
  )
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
}

export async function confirmBatch(eventId: string): Promise<void> {
  const response = await apiClient.post<ApiResponse<null>>(
    `/drawing/${eventId}/confirm`
  )
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
}
