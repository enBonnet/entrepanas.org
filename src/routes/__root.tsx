import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { authClient } from '#/lib/auth-client'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Entrepanas — donation traceability' },
      {
        name: 'description',
        content:
          'Verified peer-to-peer donation traceability. See where help lands.',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function Header() {
  const { data: session } = authClient.useSession()
  const role = (session?.user as { role?: string } | undefined)?.role ?? 'donor'

  return (
    <header
      className="sticky top-0 z-20 backdrop-blur"
      style={{ background: 'var(--header-bg)', borderBottom: '1px solid var(--line)' }}
    >
      <div className="page-wrap flex items-center justify-between py-3">
        <Link to="/" className="display-title text-xl font-bold no-underline" style={{ color: 'var(--sea-ink)' }}>
          entrepanas
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link to="/explore" className="nav-link" activeProps={{ className: 'is-active' }}>
            Explore
          </Link>
          <Link to="/trust/how-it-works" className="nav-link" activeProps={{ className: 'is-active' }}>
            How it works
          </Link>
          {session?.user ? (
            <>
              <Link to="/dashboard" className="nav-link" activeProps={{ className: 'is-active' }}>
                Dashboard
              </Link>
              {role === 'admin' && (
                <Link to="/admin" className="nav-link" activeProps={{ className: 'is-active' }}>
                  Admin
                </Link>
              )}
              <button
                onClick={() => void authClient.signOut()}
                className="text-sm"
                style={{ color: 'var(--sea-ink-soft)' }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-md px-3 py-1.5 text-sm font-medium no-underline"
                style={{ background: 'var(--palm)', color: 'white' }}
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Header />
        <main className="page-wrap py-8">{children}</main>
        <footer className="site-footer mt-16">
          <div className="page-wrap py-8 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
            Entrepanas — lightweight donation traceability on Cloudflare.
          </div>
        </footer>
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            { name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
