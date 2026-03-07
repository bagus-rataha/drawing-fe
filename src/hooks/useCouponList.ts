import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import * as couponApi from '@/services/api/couponApi'
import { eventKeys } from './useEvents'

export const couponKeys = {
  all: ['coupons'] as const,
  list: (eventId: string) => [...couponKeys.all, 'list', eventId] as const,
  listFiltered: (eventId: string, page: number, limit: number, search: string) =>
    [...couponKeys.list(eventId), { page, limit, search }] as const,
}

export function useCouponList(
  eventId: string | undefined,
  params: { page: number; limit: number; search: string }
) {
  return useQuery({
    queryKey: couponKeys.listFiltered(eventId!, params.page, params.limit, params.search),
    queryFn: () => couponApi.getCoupons(eventId!, params),
    enabled: !!eventId,
    staleTime: 0,
    gcTime: 0,
  })
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id }: { id: string; eventId: string }) =>
      couponApi.deleteCoupon(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: couponKeys.list(variables.eventId) })
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.eventId) })
      toast({
        title: 'Coupon Deleted',
        description: 'Coupon has been deleted.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete coupon: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}
