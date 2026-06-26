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
import { LanguageSwitcher } from '#/components/language-switcher'
import { detectLocale } from '#/server/i18n'
import { m } from '#/paraglide/messages.js'
import { setLocale, getLocale } from '#/paraglide/runtime.js'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async () => {
    // On the client the cookie strategy auto-reads document.cookie, so only
    // seed the locale for SSR here (via a server fn — getRequest is server-only).
    if (typeof window !== 'undefined') return
    setLocale(await detectLocale())
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: m['root.docTitle']() },
      {
        name: 'description',
        content: m['root.metaDescription'](),
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
            {m['nav.explore']()}
          </Link>
          <Link to="/trust/how-it-works" className="nav-link" activeProps={{ className: 'is-active' }}>
            {m['nav.howItWorks']()}
          </Link>
          {session?.user ? (
            <>
              <Link to="/dashboard" className="nav-link" activeProps={{ className: 'is-active' }}>
                {m['nav.dashboard']()}
              </Link>
              {role === 'admin' && (
                <Link to="/admin" className="nav-link" activeProps={{ className: 'is-active' }}>
                  {m['nav.admin']()}
                </Link>
              )}
              <button
                onClick={() => void authClient.signOut()}
                className="text-sm"
                style={{ color: 'var(--sea-ink-soft)' }}
              >
                {m['nav.signOut']()}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                {m['nav.signIn']()}
              </Link>
              <Link
                to="/register"
                className="rounded-md px-3 py-1.5 text-sm font-medium no-underline"
                style={{ background: 'var(--palm)', color: 'white' }}
              >
                {m['nav.getStarted']()}
              </Link>
            </>
          )}
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang={getLocale()}>
      <head>
        <HeadContent />
      </head>
      <body>
        <Header />
        <main className="page-wrap py-8">{children}</main>
        <footer className="site-footer mt-16">
          <div className="page-wrap py-8 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
            {m['root.footerNote']()}
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
