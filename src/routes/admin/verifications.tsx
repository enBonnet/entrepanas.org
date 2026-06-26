import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { listPendingVerifications, setVerificationStatus } from '#/server/admin'
import { Button } from '#/components/ui/button'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/admin/verifications')({
  component: VerificationsReview,
  loader: async () => listPendingVerifications(),
})

const KINDS = ['identity', 'payout', 'location'] as const

function VerificationsReview() {
  const items = Route.useLoaderData()
  return (
    <div>
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>{m['admin.verificationsTitle']()}</h1>
      <div className="mt-6 space-y-3">
        {items.map((p) => (
          <Row key={p.id} profileId={p.id} name={p.publicName} />
        ))}
        {items.length === 0 && <p className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>{m['admin.nothingPending']()}</p>}
      </div>
    </div>
  )
}

function Row({ profileId, name }: { profileId: string; name: string }) {
  const [busy, setBusy] = useState<string | null>(null)
  const kindLabels = {
    identity: m['verificationsPage.identityLabel'](),
    payout: m['verificationsPage.payoutLabel'](),
    location: m['verificationsPage.locationLabel'](),
  } as const
  async function decide(kind: (typeof KINDS)[number], status: 'verified' | 'rejected') {
    setBusy(`${kind}:${status}`)
    await setVerificationStatus({ data: { profileId, kind, status } })
    setBusy(null)
  }
  return (
    <div className="feature-card rounded-2xl p-4">
      <p className="font-medium" style={{ color: 'var(--sea-ink)' }}>{name}</p>
      <div className="mt-3 flex flex-wrap gap-4">
        {KINDS.map((k) => (
          <div key={k} className="flex items-center gap-2">
            <span className="island-kicker">{kindLabels[k]}</span>
            <Button size="xs" disabled={busy === `${k}:verified`} onClick={() => decide(k, 'verified')}>{m['admin.verify']()}</Button>
            <Button size="xs" variant="outline" disabled={busy === `${k}:rejected`} onClick={() => decide(k, 'rejected')}>{m['admin.reject']()}</Button>
          </div>
        ))}
      </div>
    </div>
  )
}
