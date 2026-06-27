import { queryOptions } from '@tanstack/react-query'

import { getCampaignBySlug, listMyCampaigns } from '#/server/campaigns'
import { listCampaignDonations } from '#/server/donations'
import { listPublicEvidenceForCampaign } from '#/server/evidence'

// ponytail: hierarchical keys — ['campaigns'] invalidates all campaign queries,
// ['campaigns','mine'] the recipient's own list, ['campaigns','public',slug] one public page.
export const campaignQueries = {
  all: () => ['campaigns'] as const,
  mine: () =>
    queryOptions({
      queryKey: ['campaigns', 'mine'] as const,
      queryFn: () => listMyCampaigns(),
    }),
  publicBySlug: (slug: string) =>
    queryOptions({
      queryKey: ['campaigns', 'public', slug] as const,
      queryFn: () => getCampaignBySlug({ data: { slug } }),
    }),
  donations: (campaignId: string) =>
    queryOptions({
      queryKey: ['campaigns', campaignId, 'donations'] as const,
      queryFn: () => listCampaignDonations({ data: { campaignId } }),
    }),
  evidence: (campaignId: string) =>
    queryOptions({
      queryKey: ['campaigns', campaignId, 'evidence'] as const,
      queryFn: () => listPublicEvidenceForCampaign({ data: { campaignId } }),
    }),
}

export type MyCampaign = Awaited<ReturnType<typeof listMyCampaigns>>[number]