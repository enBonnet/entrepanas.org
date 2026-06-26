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
import { setLocale } from '#/paraglide/runtime.js'

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
  // ponytail: SEO always indexed in Spanish — Venezuelan, es-first site
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: m['root.docTitle']({}, { locale: 'es' }) },
      {
        name: 'description',
        content: m['root.metaDescription']({}, { locale: 'es' }),
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'es_VE' },
      { property: 'og:site_name', content: 'entrepanas' },
      { property: 'og:title', content: m['root.docTitle']({}, { locale: 'es' }) },
      {
        property: 'og:description',
        content: m['root.metaDescription']({}, { locale: 'es' }),
      },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: m['root.docTitle']({}, { locale: 'es' }) },
      {
        name: 'twitter:description',
        content: m['root.metaDescription']({}, { locale: 'es' }),
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
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        <Header />
        <main className="page-wrap py-8">{children}</main>
        <footer className="site-footer mt-16">
          <div className="page-wrap py-8 text-sm space-y-1" style={{ color: 'var(--sea-ink-soft)' }}>
            <p>{m['root.footerNote']()}</p>
            <p>
              {m['root.footerEffort']()}{' '}
              <a
                href="https://build4venezuela.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:opacity-80"
              >
                build4venezuela.com
              </a>
            </p>
            <p>
              <a
                href="https://github.com/enBonnet/entrepanas.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:opacity-80"
              >
                GitHub
              </a>
            </p>
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
