/**
 * @file hooks/index.ts
 * @description Export all custom hooks
 */

// Event hooks
export {
  useEvents,
  useEvent,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useUpdateEventStatus,
  useDuplicateEvent,
  useUpdateEventStats,
  eventKeys,
} from './useEvents'

// Prize hooks
export {
  usePrizes,
  usePrize,
  useCreatePrize,
  useCreateManyPrizes,
  useUpdatePrize,
  useDeletePrize,
  useDeletePrizesByEvent,
  useReorderPrizes,
  useTotalPrizeQuantity,
  prizeKeys,
} from './usePrizes'

// Participant hooks
export {
  useParticipants,
  useParticipantsPaginated,
  useParticipant,
  useParticipantCount,
  useActiveParticipants,
  useCreateManyParticipants,
  useDeleteParticipantsByEvent,
  useDeleteParticipant,
  useIncrementParticipantWinCount,
  participantKeys,
} from './useParticipants'

// Coupon hooks
export {
  useCoupons,
  useCouponsPaginated,
  useCoupon,
  useCouponsByParticipant,
  useActiveCoupons,
  useCouponCount,
  useActiveCouponCount,
  useCouponCountsByParticipants,
  useCreateManyCoupons,
  useDeleteCouponsByEvent,
  useDeleteCoupon,
  useDeleteCouponsByParticipant,
  useVoidCoupon,
  useVoidCouponsByParticipant,
  couponKeys,
} from './useCoupons'

// Winner hooks
export {
  useWinners,
  useWinner,
  useWinnersByPrize,
  useWinnersByParticipant,
  useWinnersGroupedByPrize,
  useWinnerCount,
  useParticipantWinCount,
  useCreateWinner,
  useCreateManyWinners,
  useDeleteWinner,
  winnerKeys,
} from './useWinners'

// Utility hooks
export { useDebounce } from './useDebounce'
