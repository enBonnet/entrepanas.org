import { Outlet, Link, createFileRoute, redirect } from '@tanstack/react-router'

import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
  beforeLoad: async () => {
    // ponytail: client-only session check; server fns re-enforce roles server-side.
    const { data } = await authClient.getSession()
    if (!data?.user) {
      throw redirect({ to: '/login' })
    }
  },
})

const allItems = [
  { to: '/dashboard', label: 'Overview', recipientOnly: false },
  { to: '/dashboard/profile', label: 'Profile', recipientOnly: false },
  { to: '/me/donations', label: 'My donations', recipientOnly: false },
  { to: '/dashboard/payouts', label: 'Payouts', recipientOnly: true },
  { to: '/dashboard/campaigns', label: 'Campaigns', recipientOnly: true },
  { to: '/dashboard/evidence', label: 'Evidence', recipientOnly: true },
  { to: '/dashboard/verifications', label: 'Verifications', recipientOnly: true },
] as const

function DashboardLayout() {
  const { data: session } = authClient.useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const canSeeRecipient = role === 'recipient' || role === 'admin'
  const items = allItems.filter((i) => !i.recipientOnly || canSeeRecipient)

  return (
    <div className="rise-in grid gap-8 md:grid-cols-[200px_1fr]">
      <aside className="island-shell rounded-2xl p-4 h-fit">
        <nav className="flex flex-col gap-1 text-sm">
          {items.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className="rounded-md px-3 py-2 no-underline"
              activeProps={{ style: { background: 'var(--palm)', color: 'white' } }}
              inactiveProps={{ style: { color: 'var(--sea-ink-soft)' } }}
            >
              {it.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div>
        <Outlet />
      </div>
    </div>
  )
}
