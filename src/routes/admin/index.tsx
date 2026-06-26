import { createFileRoute } from '@tanstack/react-router'

import { listPendingEvidence, listPendingVerifications , listAbuseReports  } from '#/server/admin'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/admin/')({
  component: AdminOverview,
  loader: async () => {
    const [evidence, verifications, reports] = await Promise.all([
      listPendingEvidence(),
      listPendingVerifications(),
      listAbuseReports(),
    ])
    return { evidence, verifications, reports }
  },
})

function AdminOverview() {
  const { evidence, verifications, reports } = Route.useLoaderData()
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
