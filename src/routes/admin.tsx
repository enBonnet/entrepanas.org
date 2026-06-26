import { Outlet, Link, createFileRoute, redirect } from '@tanstack/react-router'

import { authClient } from '#/lib/auth-client'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
  beforeLoad: async () => {
    const { data } = await authClient.getSession()
    if (!data?.user) throw redirect({ to: '/login' })
    if ((data.user as { role?: string }).role !== 'admin') throw redirect({ to: '/dashboard' })
  },
})

const items = [
  { to: '/admin', msg: 'admin.navOverview' },
  { to: '/admin/recipients', msg: 'admin.navRecipients' },
  { to: '/admin/verifications', msg: 'admin.navVerifications' },
  { to: '/admin/evidence', msg: 'admin.navEvidence' },
  { to: '/admin/reports', msg: 'admin.navReports' },
] as const

function AdminLayout() {
  return (
    <div className="rise-in grid gap-8 md:grid-cols-[200px_1fr]">
      <aside className="island-shell rounded-2xl p-4 h-fit">
        <p className="island-kicker px-3 pb-2">{m['admin.navKicker']()}</p>
        <nav className="flex flex-col gap-1 text-sm">
          {items.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className="rounded-md px-3 py-2 no-underline"
              activeProps={{ style: { background: 'var(--sea-ink)', color: 'white' } }}
              inactiveProps={{ style: { color: 'var(--sea-ink-soft)' } }}
            >
              {m[it.msg]()}
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
