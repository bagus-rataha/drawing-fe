import apiClient from '@/lib/apiClient'
import type {
  ApiResponse,
  EventListResponse,
  EventResponse,
  CreateEventRequest,
  UpdateEventRequest,
  ImportFileResponse,
} from '@/types/api'

export async function getEvents(): Promise<EventListResponse[]> {
  const response = await apiClient.get<ApiResponse<EventListResponse[]>>('/events')
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
  return response.data.data
}

export async function getEvent(id: string): Promise<EventResponse> {
  const response = await apiClient.get<ApiResponse<EventResponse>>(`/events/${id}`)
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
  return response.data.data
}

export async function createEvent(data: CreateEventRequest): Promise<EventResponse> {
  const response = await apiClient.post<ApiResponse<EventResponse>>('/events', data)
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
  return response.data.data
}

export async function updateEvent(id: string, data: UpdateEventRequest): Promise<EventResponse> {
  const response = await apiClient.put<ApiResponse<EventResponse>>(`/events/${id}`, data)
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
  return response.data.data
}

export async function deleteEvent(id: string): Promise<void> {
  const response = await apiClient.delete<ApiResponse<null>>(`/events/${id}`)
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
}

export async function importParticipants(id: string, file: File): Promise<ImportFileResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<ApiResponse<ImportFileResponse>>(
    `/events/${id}/import`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  if (!response.data.success) {
    throw new Error(response.data.message)
  }
  return response.data.data
}
