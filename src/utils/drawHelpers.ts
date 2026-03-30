/**
 * @file utils/drawHelpers.ts
 * @description Helper functions for DrawScreen — extracted for readability
 */

import type { Prize } from '@/types'
import type { PrizesListResponse, DrawingStatusResponse, WinnerResponse } from '@/types/api'
import type { DrawResultWithId } from '@/hooks/useDrawState'
import { resolveImageUrl } from '@/utils/helpers'

export function mapWinnerResponseToDrawResult(w: WinnerResponse, slot: number): DrawResultWithId {
  return {
    id: w.id,
    lineNumber: w.line_number || slot,
    participantId: w.coupon?.participant?.id || '',
    participantName: w.coupon?.participant?.name,
    couponId: w.coupon?.id || '',
    couponIdentifier: w.coupon?.coupon_import_identifier,
    participantImportId: w.coupon?.participant?.participant_import_identifier,
    status: w.status === 'active' ? 'valid' : 'cancelled',
    cancelReason: w.cancel_reason
      ? { type: 'manual' as const, message: w.cancel_reason }
      : undefined,
  }
}

/**
 * Process current_batch_draw from backend: filter active + last void per slot
 */
export function processCurrentBatchDraw(status: DrawingStatusResponse): DrawResultWithId[] {
  const { current_batch_draw, empty_slots, total_batch_winner } = status
  const totalSlots = total_batch_winner + empty_slots.length

  const activeWinners = current_batch_draw.filter((w) => w.status === 'active')
  const voidWinners = current_batch_draw.filter((w) => w.status === 'void')

  const result: DrawResultWithId[] = []
  for (let slot = 1; slot <= totalSlots; slot++) {
    const active = activeWinners.find((w) => w.line_number === slot)
    if (active) {
      result.push(mapWinnerResponseToDrawResult(active, slot))
    } else {
      const voidsInSlot = voidWinners.filter((w) => w.line_number === slot)
      const lastVoid = voidsInSlot[voidsInSlot.length - 1]
      if (lastVoid) {
        result.push(mapWinnerResponseToDrawResult(lastVoid, slot))
      }
    }
  }
  return result
}

/**
 * Map API PrizesListResponse to local Prize type
 */
export function mapApiPrizeToLocal(p: PrizesListResponse): Prize {
  return {
    id: p.id,
    eventId: '',
    name: p.name,
    image: resolveImageUrl(p.prize_image),
    backgroundImage: resolveImageUrl(p.background_image),
    quantity: p.quantity,
    sequence: p.sequence,
    drawnCount: p.winners?.filter(w => w.status === 'active' && w.confirmed_at).length || 0,
    drawConfig: {
      mode: 'batch',
      batches: [p.batch_number],
    },
  }
}
