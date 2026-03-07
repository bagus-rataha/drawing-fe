import apiClient from '@/lib/apiClient'
import type {
  ApiResponse,
  PaginatedResponse,
  CouponListResponse,
} from '@/types/api'

export interface CouponListParams {
  page?: number
  limit?: number
  search?: string
}

export async function getCoupons(
  eventId: string,
  params: CouponListParams = {}
): Promise<PaginatedResponse<CouponListResponse>> {
  const response = await apiClient.get<ApiResponse<PaginatedResponse<CouponListResponse>>>(
    `/coupons/event/${eventId}`,
    { params }
  )
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
  return response.data.data
}

export async function deleteCoupon(id: string): Promise<void> {
  const response = await apiClient.delete<ApiResponse<null>>(`/coupons/${id}`)
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
}
