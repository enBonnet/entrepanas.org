import { queryOptions } from '@tanstack/react-query'

import {
  getMyProfile,
  getPublicProfileBySlug,
  listExploreProfiles,
} from '#/server/recipients'

// ponytail: hierarchical keys — ['recipients'] invalidates all recipient queries,
// ['recipients','mine'] only the profile query, ['recipients','public',slug] one public page.
export const recipientQueries = {
  all: () => ['recipients'] as const,
  mine: () =>
    queryOptions({
      queryKey: ['recipients', 'mine'] as const,
      queryFn: () => getMyProfile(),
    }),
  publicBySlug: (slug: string) =>
    queryOptions({
      queryKey: ['recipients', 'public', slug] as const,
      queryFn: () => getPublicProfileBySlug({ data: { slug } }),
    }),
  explore: (filters: { region?: string; city?: string; q?: string }) =>
    queryOptions({
      queryKey: ['recipients', 'explore', filters] as const,
      queryFn: () => listExploreProfiles({ data: { ...filters, limit: 24 } }),
    }),
}