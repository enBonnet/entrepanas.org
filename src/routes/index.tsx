import { Link, createFileRoute } from '@tanstack/react-router'

import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const features = [
    [m['home.feature1Title'](), m['home.feature1Body']()],
    [m['home.feature2Title'](), m['home.feature2Body']()],
    [m['home.feature3Title'](), m['home.feature3Body']()],
  ] as const

  return (
    <div className="rise-in">
      <section className="island-shell rounded-2xl p-10 md:p-14">
        <p className="island-kicker">{m['home.kicker']()}</p>
        <h1 className="display-title mt-3 text-4xl md:text-5xl font-bold leading-tight" style={{ color: 'var(--sea-ink)' }}>
          {m['home.title']()}
        </h1>
        <p className="mt-4 max-w-xl text-lg" style={{ color: 'var(--sea-ink-soft)' }}>
          {m['home.subtitle']()}
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            to="/explore"
            className="rounded-md px-5 py-2.5 font-medium no-underline"
            style={{ background: 'var(--palm)', color: 'white' }}
          >
            {m['home.ctaExplore']()}
          </Link>
          <Link
            to="/register"
            className="rounded-md px-5 py-2.5 font-medium no-underline border"
            style={{ borderColor: 'var(--line)' }}
          >
            {m['home.ctaBecomeRecipient']()}
          </Link>
        </div>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-3">
        {features.map(([title, body]) => (
          <div key={title} className="feature-card rounded-2xl p-6">
            <h3 className="font-semibold text-lg" style={{ color: 'var(--sea-ink)' }}>{title}</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>{body}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
