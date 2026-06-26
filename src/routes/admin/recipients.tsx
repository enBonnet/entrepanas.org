import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { listAllRecipients, freezeRecipient } from '#/server/admin'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/admin/recipients')({
  component: RecipientsAdmin,
  loader: async () => listAllRecipients(),
})

function RecipientsAdmin() {
  const initial = Route.useLoaderData()
  const [rows, setRows] = useState(initial)

  async function toggle(id: string, frozen: boolean) {
    await freezeRecipient({ data: { profileId: id, frozen: !frozen } })
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, frozen: !frozen } : r)))
  }

  return (
    <div>
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>Recipients</h1>
      <div className="mt-6 space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="feature-card rounded-2xl p-4 flex justify-between items-center">
            <div>
              <p className="font-medium" style={{ color: 'var(--sea-ink)' }}>{r.publicName}</p>
              <p className="text-xs" style={{ color: 'var(--sea-ink-soft)' }}>
                trust: {r.trustLevel} · flags: {r.riskFlagsCount}{r.frozen ? ' · FROZEN' : ''}
              </p>
            </div>
            <Button size="sm" variant={r.frozen ? 'outline' : 'destructive'} onClick={() => toggle(r.id, r.frozen)}>
              {r.frozen ? 'Unfreeze' : 'Freeze'}
            </Button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>No recipients.</p>}
      </div>
    </div>
  )
}
