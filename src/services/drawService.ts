/**
 * @file services/drawService.ts
 * @description Draw service - thin wrapper over backend Drawing API
 *
 * All draw logic (random selection, win rules, coupon voiding, batch management)
 * is handled by the backend. This service maps API responses to frontend types.
 */

import {
  getDrawingStatus,
  getAnimationCoupons,
  drawV2,
  cancelWinner,
  confirmBatch,
} from '@/services/api/drawingApi'
import type { DrawResultWithId } from '@/hooks/useDrawState'
import type {
  DrawingStatusResponse,
  AnimationCouponResponse,
  WinnerResponse,
} from '@/types/api'

/**
 * Map a WinnerResponse from the API to the frontend DrawResult type
 */
function mapWinnerToDrawResult(winner: WinnerResponse, index: number): DrawResultWithId {
  return {
    id: winner.id,
    lineNumber: winner.line_number || index + 1,
    participantId: winner.coupon?.participant?.id || '',
    participantName: winner.coupon?.participant?.name,
    couponId: winner.coupon?.id || '',
    couponIdentifier: winner.coupon?.coupon_import_identifier,
    status: winner.status === 'active' ? 'valid' : 'cancelled',
    cancelReason: winner.cancel_reason
      ? { type: 'manual' as const, message: winner.cancel_reason }
      : undefined,
  }
}

/**
 * Map draw API response (array with nulls) to DrawResult[]
 */
function mapDrawResponse(response: (WinnerResponse | null)[]): DrawResultWithId[] {
  return response.map((item, index) => {
    if (item === null) {
      return {
        id: `void-${index + 1}`,
        lineNumber: index + 1,
        participantId: '',
        couponId: '',
        status: 'skipped' as const,
        cancelReason: {
          type: 'auto' as const,
          message: 'Slot void - tidak ada coupon eligible',
        },
      }
    }
    return mapWinnerToDrawResult(item, index)
  })
}

/**
 * Draw service interface
 */
export interface IDrawService {
  draw(eventId: string): Promise<DrawResultWithId[]>
  cancel(eventId: string, winnerId: string, reason: string): Promise<void>
  confirm(eventId: string): Promise<void>
  getStatus(eventId: string): Promise<DrawingStatusResponse>
  getAnimationCoupons(eventId: string): Promise<AnimationCouponResponse[]>
}

/**
 * Draw service implementation
 */
export const drawService: IDrawService = {
  async draw(eventId: string): Promise<DrawResultWithId[]> {
    const response = await drawV2(eventId)
    return mapDrawResponse(response)
  },

  async cancel(eventId: string, winnerId: string, reason: string): Promise<void> {
    await cancelWinner(eventId, { winner_id: winnerId, cancel_reason: reason })
  },

  async confirm(eventId: string): Promise<void> {
    await confirmBatch(eventId)
  },

  async getStatus(eventId: string): Promise<DrawingStatusResponse> {
    return getDrawingStatus(eventId)
  },

  async getAnimationCoupons(eventId: string): Promise<AnimationCouponResponse[]> {
    return getAnimationCoupons(eventId)
  },
}

export default drawService
