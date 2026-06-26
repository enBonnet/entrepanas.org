import { createFileRoute } from '@tanstack/react-router'

import { listMyDonations } from '#/server/donations'
import { formatMoney } from '#/lib/format'

export const Route = createFileRoute('/me/donations')({
  component: MyDonations,
  loader: async () => listMyDonations(),
})

function MyDonations() {
  const donations = Route.useLoaderData()
  return (
    <div className="rise-in">
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>My donations</h1>
      <div className="mt-6 space-y-2">
        {donations.map((d) => (
          <div key={d.id} className="feature-card rounded-2xl p-4 flex justify-between items-center">
            <div>
              <p className="font-medium" style={{ color: 'var(--sea-ink)' }}>{formatMoney(d.amountCents, d.currency)}</p>
              <p className="text-xs" style={{ color: 'var(--sea-ink-soft)' }}>{d.message ?? 'No message'}</p>
            </div>
            <span className="island-kicker">{d.status}</span>
          </div>
        ))}
        {donations.length === 0 && <p className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>No donations yet.</p>}
      </div>
    </div>
  )
}
