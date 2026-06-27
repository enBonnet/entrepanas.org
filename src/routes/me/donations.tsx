import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useSuspenseQuery } from '@tanstack/react-query'

import { getDb } from '#/db'
import { getSession } from '#/lib/auth'
import { donationQueries } from '#/lib/queries/dashboard'
import { formatMoney } from '#/lib/format'
import { m } from '#/paraglide/messages.js'

const requireSession = createServerFn({ method: 'GET' }).handler(async () => {
  const db = getDb()
  const session = await getSession(db)
  if (!session?.user) throw redirect({ to: '/' })
  return null
})

export const Route = createFileRoute('/me/donations')({
  component: MyDonations,
  beforeLoad: async () => {
    await requireSession()
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(donationQueries.mine())
  },
})

function MyDonations() {
  const { data: donations } = useSuspenseQuery(donationQueries.mine())
  return (
    <div className="rise-in">
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>{m['myDonations.title']()}</h1>
      <div className="mt-6 space-y-2">
        {donations.map((d) => (
          <div key={d.id} className="feature-card rounded-2xl p-4 flex justify-between items-center gap-3">
            <div className="min-w-0">
              <p className="font-medium" style={{ color: 'var(--sea-ink)' }}>{formatMoney(d.amountCents, d.currency)}</p>
              <p className="text-xs break-words" style={{ color: 'var(--sea-ink-soft)' }}>{d.message ?? m['myDonations.noMessage']()}</p>
            </div>
            <span className="island-kicker whitespace-nowrap">{d.status}</span>
          </div>
        ))}
        {donations.length === 0 && <p className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>{m['myDonations.empty']()}</p>}
      </div>
    </div>
  )
}