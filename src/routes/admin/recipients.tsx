import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { getRecipientReputationAdmin, listAllRecipients, freezeRecipient } from '#/server/admin'
import { Button } from '#/components/ui/button'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/admin/recipients')({
  component: RecipientsAdmin,
  loader: async () => listAllRecipients(),
})

type Breakdown = Awaited<ReturnType<typeof getRecipientReputationAdmin>>

// Per-signal rows for the breakdown panel. Labels stay terse; admin-only.
const BREAKDOWN_ROWS: { key: keyof NonNullable<Breakdown>['breakdown']; label: string }[] = [
  { key: 'identity', label: 'Identidad' },
  { key: 'payout', label: 'Pago' },
  { key: 'location', label: 'Ubicación' },
  { key: 'fulfilledCampaigns', label: 'Campañas cumplidas' },
  { key: 'approvedEvidence', label: 'Evidencia aprobada' },
  { key: 'uniqueDonors', label: 'Donantes únicos' },
  { key: 'longevity', label: 'Antigüedad' },
  { key: 'abusePenalty', label: 'Reportes accionados' },
]

function RecipientsAdmin() {
  const initial = Route.useLoaderData()
  const [rows, setRows] = useState(initial)
  const [openId, setOpenId] = useState<string | null>(null)
  const [breakdown, setBreakdown] = useState<Breakdown>(null)
  const [loading, setLoading] = useState(false)

  async function toggle(id: string, frozen: boolean) {
    await freezeRecipient({ data: { profileId: id, frozen: !frozen } })
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, frozen: !frozen } : r)))
  }

  async function showBreakdown(id: string) {
    if (openId === id) {
      setOpenId(null)
      return
    }
    setOpenId(id)
    setLoading(true)
    try {
      const result = await getRecipientReputationAdmin({ data: { profileId: id } })
      setBreakdown(result)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>{m['admin.recipientsTitle']()}</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
        Ordenados por riesgo (menor reputación primero)
      </p>
      <div className="mt-6 space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="feature-card rounded-2xl p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium" style={{ color: 'var(--sea-ink)' }}>{r.publicName}</p>
                <p className="text-xs" style={{ color: 'var(--sea-ink-soft)' }}>
                  {m['admin.trustLabel']()}: {r.trustLevel} · {m['reputation.label']()}: {r.reputationTier} ({r.reputationScore}) · {m['admin.flagsLabel']()}: {r.riskFlagsCount}
                  {r.frozen ? ` · ${m['common.statusFrozen']()}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => showBreakdown(r.id)}>
                  {m['admin.reputationBreakdown']()}
                </Button>
                <Button size="sm" variant={r.frozen ? 'outline' : 'destructive'} onClick={() => toggle(r.id, r.frozen)}>
                  {r.frozen ? m['admin.unfreeze']() : m['admin.freeze']()}
                </Button>
              </div>
            </div>
            {openId === r.id && (
              <div className="mt-3 border-t border-black/5 pt-3">
                {loading || !breakdown ? (
                  <p className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>…</p>
                ) : (
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
                    {BREAKDOWN_ROWS.map((row) => (
                      <div key={row.key}>
                        <dt className="text-xs" style={{ color: 'var(--sea-ink-soft)' }}>{row.label}</dt>
                        <dd className="text-sm font-medium" style={{ color: 'var(--sea-ink)' }}>
                          {breakdown.breakdown[row.key] >= 0 ? '+' : ''}{breakdown.breakdown[row.key]}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>{m['admin.noRecipients']()}</p>}
      </div>
    </div>
  )
}
