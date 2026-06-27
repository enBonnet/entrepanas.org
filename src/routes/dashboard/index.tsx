import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'

import { campaignQueries } from '#/lib/queries/campaigns'
import { donationQueries } from '#/lib/queries/dashboard'
import { recipientQueries } from '#/lib/queries/recipients'
import { authClient } from '#/lib/auth-client'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/dashboard/')({
  component: Overview,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(recipientQueries.mine()),
      context.queryClient.ensureQueryData(campaignQueries.mine()),
      context.queryClient.ensureQueryData(donationQueries.mine()),
    ])
  },
})

function Overview() {
  const { data: profile } = useSuspenseQuery(recipientQueries.mine())
  const { data: campaigns } = useSuspenseQuery(campaignQueries.mine())
  const { data: donations } = useSuspenseQuery(donationQueries.mine())
  const { data: session } = authClient.useSession()
  const role = (session?.user as { role?: string } | undefined)?.role ?? 'donor'

  return (
    <div>
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>
        {m['dashboard.welcome']()}
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
        {m['common.role']({ role })}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label={m['dashboard.statProfile']()} value={profile ? m['dashboard.profilePublished']() : m['dashboard.profileNotCreated']()} />
        <Stat label={m['dashboard.statCampaigns']()} value={String(campaigns.length)} />
        <Stat label={m['dashboard.statMyDonations']()} value={String(donations.length)} />
      </div>

      {!profile && (
        <div className="island-shell rounded-2xl p-6 mt-6">
          <p className="font-medium" style={{ color: 'var(--sea-ink)' }}>
            {m['dashboard.becomeRecipientBody']()}
          </p>
          <Link
            to="/dashboard/profile"
            className="inline-block mt-3 rounded-md px-4 py-2 text-sm font-medium no-underline"
            style={{ background: 'var(--palm)', color: 'white' }}
          >
            {m['dashboard.createProfileCta']()}
          </Link>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="feature-card rounded-2xl p-5">
      <p className="island-kicker">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--sea-ink)' }}>{value}</p>
    </div>
  )
}