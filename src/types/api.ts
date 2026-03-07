// API Response envelope
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

// Auth
export interface LoginInput {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  user: UserResponse
}

export interface UserResponse {
  id: number
  name: string
  email: string
  role: string
  created_at: string
}

// Events
export interface EventListResponse {
  id: string
  name: string
  description: string
  status: string
  win_rule: 'onetime' | 'limited' | 'unlimited'
  draw_mode: 'one_by_one' | 'batch'
  animation_type: 'sphere' | 'rolling' | 'randomize'
  total_participants: number
  total_coupons: number
  total_prizes: number
  import_status: 'draft' | 'in_progress' | 'done' | 'fail'
  created_at: string
}

export interface EventResponse extends EventListResponse {
  start_date: string
  end_date: string
  current_sequence: number
  total_winners: number
  updated_at: string
  import_file_name: string
  import_file_path: string
  import_message: string
  import_progress: number
}

export interface CreateEventRequest {
  name: string
  description?: string
  start_date?: string
  end_date?: string
  win_rule: 'onetime' | 'limited' | 'unlimited'
  draw_mode: 'one_by_one' | 'batch'
  animation_type: 'sphere' | 'rolling' | 'randomize'
  prizes: PrizeRequest[]
}

export interface UpdateEventRequest {
  name?: string
  description?: string
  start_date?: string
  end_date?: string
  win_rule?: 'onetime' | 'limited' | 'unlimited'
  draw_mode?: 'one_by_one' | 'batch'
  animation_type?: 'sphere' | 'rolling' | 'randomize'
}

// Prizes
export interface PrizeRequest {
  name: string
  quantity: number
  sequence: number
  batch_number: number
}

export interface BulkUpdatePrizeRequest {
  id: string
  name?: string
  quantity?: number
  sequence?: number
  batch_number?: number
}

export interface PrizeResponse {
  id: string
  event_id: string
  name: string
  quantity: number
  sequence: number
  batch_number: number
  current_batch: number
  created_at: string
  updated_at: string
  winners: WinnerResponse[]
}

export interface PrizesListResponse extends Omit<PrizeResponse, 'event_id'> {}

// Import
export interface ImportFileResponse {
  original_name: string
  stored_name: string
  import_status: string
  import_progress: number
  import_message: string
}

// Winners (for future drawing phase)
export interface WinnerResponse {
  id: string
  status: string
  batch_number: number
  line_number: number
  cancel_reason: string
  confirmed_at: string
  created_at: string
  updated_at: string
  coupon: CouponResponse
}

export interface CouponResponse {
  id: string
  coupon_import_identifier: string
  status: string
  participant: ParticipantResponse
}

export interface ParticipantResponse {
  id: string
  name: string
  email: string
  phone: string
  coupon_import_identifier: string
  custom_fields: Record<string, unknown>
}

// Paginated response wrapper
export interface PaginatedResponse<T> {
  items: T[]
  page: number
  limit: number
  total_items: number
  total_pages: number
}

// Participant list (from GET /participants/event/:eventId)
export interface ParticipantListResponse {
  id: string
  name: string
  email: string
  phone: string
  participant_import_identifier: string
  custom_fields: Record<string, unknown>
  coupon_count: number
  active_coupon_count: number
  win_count: number
  status: string
}

// Coupon list (from GET /coupons/event/:eventId)
export interface CouponListResponse {
  id: string
  coupon_import_identifier: string
  participant_import_identifier: string
  participant_name: string
  status: string
}
