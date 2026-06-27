import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { listAbuseReports, updateAbuseReport } from '#/server/admin'
import { Button } from '#/components/ui/button'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/admin/reports')({
  component: ReportsAdmin,
  loader: async () => listAbuseReports(),
})

function ReportsAdmin() {
  const initial = Route.useLoaderData()
  const [reports, setReports] = useState(initial)

  async function resolve(id: string, status: 'reviewed' | 'dismissed' | 'actioned') {
    await updateAbuseReport({ data: { reportId: id, status } })
    setReports((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div>
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>{m['admin.reportsTitle']()}</h1>
      <div className="mt-6 space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="feature-card rounded-2xl p-4">
            <p className="island-kicker">{r.targetType} · {r.status}</p>
            <p className="mt-1 font-medium" style={{ color: 'var(--sea-ink)' }}>{r.reason}</p>
            {r.details && <p className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>{r.details}</p>}
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => resolve(r.id, 'actioned')}>{m['admin.action']()}</Button>
              <Button size="sm" variant="outline" onClick={() => resolve(r.id, 'reviewed')}>{m['admin.reviewed']()}</Button>
              <Button size="sm" variant="ghost" onClick={() => resolve(r.id, 'dismissed')}>{m['admin.dismiss']()}</Button>
            </div>
          </div>
        ))}
        {reports.length === 0 && <p className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>{m['admin.noReports']()}</p>}
      </div>
    </div>
  )
}
