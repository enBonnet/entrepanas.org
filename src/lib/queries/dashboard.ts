import { queryOptions } from '@tanstack/react-query'

import { listMyDonations } from '#/server/donations'
import { listMyPayouts } from '#/server/payouts'

export const donationQueries = {
  all: () => ['donations'] as const,
  mine: () =>
    queryOptions({
      queryKey: ['donations', 'mine'] as const,
      queryFn: () => listMyDonations(),
    }),
}

export const payoutQueries = {
  all: () => ['payouts'] as const,
  mine: () =>
    queryOptions({
      queryKey: ['payouts', 'mine'] as const,
      queryFn: () => listMyPayouts(),
    }),
}