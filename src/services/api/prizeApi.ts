import apiClient from '@/lib/apiClient'
import type {
  ApiResponse,
  PrizeRequest,
  PrizeResponse,
  PrizesListResponse,
  BulkUpdatePrizeRequest,
} from '@/types/api'

export async function getPrizesByEvent(eventId: string): Promise<PrizesListResponse[]> {
  const response = await apiClient.get<ApiResponse<PrizesListResponse[]>>(
    `/prizes/event/${eventId}`
  )
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
  return response.data.data
}

export async function getPrize(id: string): Promise<PrizeResponse> {
  const response = await apiClient.get<ApiResponse<PrizeResponse>>(`/prizes/${id}`)
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
  return response.data.data
}

export async function createPrizes(
  eventId: string,
  prizes: PrizeRequest[]
): Promise<PrizeResponse[]> {
  const response = await apiClient.post<ApiResponse<PrizeResponse[]>>(
    `/prizes/event/${eventId}`,
    prizes
  )
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
  return response.data.data
}

export async function bulkUpdatePrizes(
  eventId: string,
  prizes: BulkUpdatePrizeRequest[]
): Promise<PrizesListResponse[]> {
  const response = await apiClient.put<ApiResponse<PrizesListResponse[]>>(
    `/prizes/event/${eventId}`,
    prizes
  )
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
  return response.data.data
}

export async function deletePrize(id: string): Promise<void> {
  const response = await apiClient.delete<ApiResponse<null>>(`/prizes/${id}`)
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
}
