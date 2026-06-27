import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'

import { adminQueries } from '#/lib/queries/admin'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/admin/')({
  component: AdminOverview,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(adminQueries.pendingEvidence()),
      context.queryClient.ensureQueryData(adminQueries.pendingVerifications()),
      context.queryClient.ensureQueryData(adminQueries.abuseReports()),
    ])
  },
})

function AdminOverview() {
  const { data: evidence } = useSuspenseQuery(adminQueries.pendingEvidence())
  const { data: verifications } = useSuspenseQuery(adminQueries.pendingVerifications())
  const { data: reports } = useSuspenseQuery(adminQueries.abuseReports())
  return (
    <div>
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>{m['admin.reviewQueueTitle']()}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label={m['admin.statEvidencePending']()} value={evidence.length} />
        <Stat label={m['admin.statVerificationsPending']()} value={verifications.length} />
        <Stat label={m['admin.statAbuseReportsOpen']()} value={reports.length} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="feature-card rounded-2xl p-5">
      <p className="island-kicker">{label}</p>
      <p className="mt-1 text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>{value}</p>
    </div>
  )
}