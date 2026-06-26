import { Outlet, Link, createFileRoute, redirect } from '@tanstack/react-router'

import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
  beforeLoad: async () => {
    const { data } = await authClient.getSession()
    if (!data?.user) throw redirect({ to: '/login' })
    if ((data.user as { role?: string }).role !== 'admin') throw redirect({ to: '/dashboard' })
  },
})

const items = [
  { to: '/admin', label: 'Overview' },
  { to: '/admin/recipients', label: 'Recipients' },
  { to: '/admin/verifications', label: 'Verifications' },
  { to: '/admin/evidence', label: 'Evidence' },
  { to: '/admin/reports', label: 'Reports' },
] as const

function AdminLayout() {
  return (
    <div className="rise-in grid gap-8 md:grid-cols-[200px_1fr]">
      <aside className="island-shell rounded-2xl p-4 h-fit">
        <p className="island-kicker px-3 pb-2">Admin</p>
        <nav className="flex flex-col gap-1 text-sm">
          {items.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className="rounded-md px-3 py-2 no-underline"
              activeProps={{ style: { background: 'var(--sea-ink)', color: 'white' } }}
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
