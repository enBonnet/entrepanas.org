import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="rise-in">
      <section className="island-shell rounded-2xl p-10 md:p-14">
        <p className="island-kicker">Donation traceability</p>
        <h1 className="display-title mt-3 text-4xl md:text-5xl font-bold leading-tight" style={{ color: 'var(--sea-ink)' }}>
          See where your help actually lands.
        </h1>
        <p className="mt-4 max-w-xl text-lg" style={{ color: 'var(--sea-ink-soft)' }}>
          Verified recipients publish where they are, how they get paid, and the
          receipts, invoices and product photos tied to every donation. A public
          evidence timeline closes the trust loop.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            to="/explore"
            className="rounded-md px-5 py-2.5 font-medium no-underline"
            style={{ background: 'var(--palm)', color: 'white' }}
          >
            Explore recipients
          </Link>
          <Link
            to="/register"
            className="rounded-md px-5 py-2.5 font-medium no-underline border"
            style={{ borderColor: 'var(--line)' }}
          >
            Become a recipient
          </Link>
        </div>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-3">
        {[
          ['Verified identity', 'Identity, payout method and location checked — outcomes shown, raw docs never public.'],
          ['Direct payouts', 'Donors send money to the recipient\u2019s own bank or wallet. Entrepanas never touches funds.'],
          ['Evidence timeline', 'Receipts, invoices and product photos link each donation to what it became.'],
        ].map(([title, body]) => (
          <div key={title} className="feature-card rounded-2xl p-6">
            <h3 className="font-semibold text-lg" style={{ color: 'var(--sea-ink)' }}>{title}</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>{body}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
