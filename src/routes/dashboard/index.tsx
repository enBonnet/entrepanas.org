import { Link, createFileRoute } from '@tanstack/react-router'

import { getMyProfile } from '#/server/recipients'
import { listMyCampaigns } from '#/server/campaigns'
import { listMyDonations } from '#/server/donations'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/dashboard/')({
  component: Overview,
  loader: async () => {
    const [profile, campaigns, donations] = await Promise.all([
      getMyProfile(),
      listMyCampaigns(),
      listMyDonations(),
    ])
    return { profile, campaigns, donations }
  },
})

function Overview() {
  const { profile, campaigns, donations } = Route.useLoaderData()
  const { data: session } = authClient.useSession()
  const role = (session?.user as { role?: string } | undefined)?.role ?? 'donor'

  return (
    <div>
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>
        Welcome back
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
        Role: {role}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Profile" value={profile ? 'Published' : 'Not created'} />
        <Stat label="Campaigns" value={String(campaigns.length)} />
        <Stat label="My donations" value={String(donations.length)} />
      </div>

      {!profile && (
        <div className="island-shell rounded-2xl p-6 mt-6">
          <p className="font-medium" style={{ color: 'var(--sea-ink)' }}>
            Become a recipient to publish campaigns and collect verifiable help.
          </p>
          <Link
            to="/dashboard/profile"
            className="inline-block mt-3 rounded-md px-4 py-2 text-sm font-medium no-underline"
            style={{ background: 'var(--palm)', color: 'white' }}
          >
            Create your profile
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
