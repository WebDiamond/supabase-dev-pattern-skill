// src/features/payments/paymentsHooks.ts
import { useQuery } from '@tanstack/react-query'
import { paymentsService } from './paymentsService'

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn:  paymentsService.getSubscription,
    staleTime: 1000 * 60 * 5,
  })
}
