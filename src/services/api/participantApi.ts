import apiClient from '@/lib/apiClient'
import type {
  ApiResponse,
  PaginatedResponse,
  ParticipantListResponse,
} from '@/types/api'

export interface ParticipantListParams {
  page?: number
  limit?: number
  search?: string
}

export async function getParticipants(
  eventId: string,
  params: ParticipantListParams = {}
): Promise<PaginatedResponse<ParticipantListResponse>> {
  const response = await apiClient.get<ApiResponse<PaginatedResponse<ParticipantListResponse>>>(
    `/participants/event/${eventId}`,
    { params }
  )
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
  return response.data.data
}

export async function deleteParticipant(id: string): Promise<void> {
  const response = await apiClient.delete<ApiResponse<null>>(`/participants/${id}`)
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
}
