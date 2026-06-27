import { queryOptions } from '@tanstack/react-query'

import {
  listAbuseReports,
  listAllRecipients,
  listPendingEvidence,
  listPendingVerifications,
} from '#/server/admin'

// ponytail: admin queries — separate key namespace so admin invalidation
// never touches public/donor queries.
export const adminQueries = {
  all: () => ['admin'] as const,
  pendingEvidence: () =>
    queryOptions({
      queryKey: ['admin', 'evidence', 'pending'] as const,
      queryFn: () => listPendingEvidence(),
    }),
  pendingVerifications: () =>
    queryOptions({
      queryKey: ['admin', 'verifications', 'pending'] as const,
      queryFn: () => listPendingVerifications(),
    }),
  abuseReports: () =>
    queryOptions({
      queryKey: ['admin', 'reports'] as const,
      queryFn: () => listAbuseReports(),
    }),
  recipients: () =>
    queryOptions({
      queryKey: ['admin', 'recipients'] as const,
      queryFn: () => listAllRecipients(),
    }),
}