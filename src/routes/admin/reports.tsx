import { createFileRoute } from '@tanstack/react-router'

import { listAbuseReports } from '#/server/admin'

export const Route = createFileRoute('/admin/reports')({
  component: ReportsAdmin,
  loader: async () => listAbuseReports(),
})

function ReportsAdmin() {
  const reports = Route.useLoaderData()
  return (
    <div>
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>Abuse reports</h1>
      <div className="mt-6 space-y-2">
        {reports.map((r) => (
          <div key={r.id} className="feature-card rounded-2xl p-4">
            <p className="island-kicker">{r.targetType} · {r.status}</p>
            <p className="mt-1 font-medium" style={{ color: 'var(--sea-ink)' }}>{r.reason}</p>
            {r.details && <p className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>{r.details}</p>}
          </div>
        ))}
        {reports.length === 0 && <p className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>No open reports.</p>}
      </div>
    </div>
  )
}
