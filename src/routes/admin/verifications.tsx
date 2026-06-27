import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'

import { setVerificationStatus } from '#/server/admin'
import { adminQueries } from '#/lib/queries/admin'
import { Button } from '#/components/ui/button'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/admin/verifications')({
  component: VerificationsReview,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(adminQueries.pendingVerifications())
  },
})

const KINDS = ['identity', 'payout', 'location'] as const

function VerificationsReview() {
  const { data: items } = useSuspenseQuery(adminQueries.pendingVerifications())
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
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const kindLabels = {
    identity: m['verificationsPage.identityLabel'](),
    payout: m['verificationsPage.payoutLabel'](),
    location: m['verificationsPage.locationLabel'](),
  } as const

  const mutation = useMutation({
    mutationFn: (input: { kind: (typeof KINDS)[number]; status: 'verified' | 'rejected' }) =>
      setVerificationStatus({ data: { profileId, kind: input.kind, status: input.status } }),
    onMutate: (input) => {
      setBusy(`${input.kind}:${input.status}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueries.all() })
      setBusy(null)
    },
    onError: () => {
      setBusy(null)
    },
  })

  function decide(kind: (typeof KINDS)[number], status: 'verified' | 'rejected') {
    mutation.mutate({ kind, status })
  }

  return (
    <div className="feature-card rounded-2xl p-4">
      <p className="font-medium" style={{ color: 'var(--sea-ink)' }}>{name}</p>
      <div className="mt-3 flex flex-wrap gap-4">
        {KINDS.map((k) => (
          <div key={k} className="flex items-center gap-2">
            <span className="island-kicker">{kindLabels[k]}</span>
            <Button size="xs" disabled={busy === `${k}:verified` || mutation.isPending} onClick={() => decide(k, 'verified')}>{m['admin.verify']()}</Button>
            <Button size="xs" variant="outline" disabled={busy === `${k}:rejected` || mutation.isPending} onClick={() => decide(k, 'rejected')}>{m['admin.reject']()}</Button>
          </div>
        ))}
      </div>
    </div>
  )
}