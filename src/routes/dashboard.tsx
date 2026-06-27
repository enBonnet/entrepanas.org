import { Outlet, Link, createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

import { getDb } from '#/db'
import { getSession } from '#/lib/auth'
import { authClient } from '#/lib/auth-client'
import { m } from '#/paraglide/messages.js'

// ponytail: server fn reads session from request headers via getRequest() —
// no HTTP roundtrip to the rate-limited /api/auth/* endpoint. The client-side
// authClient.getSession() in beforeLoad was firing on every link hover/touch
// (TanStack preloads) and blowing past Better Auth's 10 req/60s limit → 429.
const requireSession = createServerFn({ method: 'GET' }).handler(async () => {
  const db = getDb()
  const session = await getSession(db)
    if (!session?.user) {
      throw redirect({ to: '/' })
    }
  return null
})

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
  beforeLoad: async () => {
    // Runs on both SSR and client; the server fn resolves the session from the
    // request cookie (no /api/auth/get-session HTTP hit, no rate-limit risk).
    await requireSession()
  },
})

const allItems = [
  { to: '/dashboard', msg: 'dashboardNav.overview', recipientOnly: false },
  { to: '/dashboard/profile', msg: 'dashboardNav.profile', recipientOnly: false },
  { to: '/me/donations', msg: 'dashboardNav.myDonations', recipientOnly: false },
  { to: '/dashboard/payouts', msg: 'dashboardNav.payouts', recipientOnly: true },
  { to: '/dashboard/campaigns', msg: 'dashboardNav.campaigns', recipientOnly: true },
  { to: '/dashboard/evidence', msg: 'dashboardNav.evidence', recipientOnly: true },
  { to: '/dashboard/verifications', msg: 'dashboardNav.verifications', recipientOnly: true },
] as const

function DashboardLayout() {
  const { data: session } = authClient.useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const canSeeRecipient = role === 'recipient' || role === 'admin'
  const items = allItems.filter((i) => !i.recipientOnly || canSeeRecipient)

  return (
    <div className="rise-in flex flex-col gap-6 md:grid md:gap-8 md:grid-cols-[200px_1fr]">
      <aside className="island-shell rounded-2xl p-3 md:p-4 h-fit md:sticky md:top-20">
        <nav className="flex flex-wrap md:flex-col gap-1 text-sm">
          {items.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className="rounded-md px-3 py-2 no-underline"
              activeProps={{ style: { background: 'var(--palm)', color: 'white' } }}
              inactiveProps={{ style: { color: 'var(--sea-ink-soft)' } }}
            >
              {m[it.msg]()}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
