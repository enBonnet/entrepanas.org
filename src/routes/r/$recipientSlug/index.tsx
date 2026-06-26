import { Link, createFileRoute } from '@tanstack/react-router'

import { getPublicProfileBySlug } from '#/server/recipients'
import { TrustBadges } from '#/components/trust-badges'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/r/$recipientSlug/')({
  component: RecipientPage,
  loader: async ({ params }) => getPublicProfileBySlug({ data: { slug: params.recipientSlug } }),
})

function RecipientPage() {
  const p = Route.useLoaderData()
  if (!p) {
    return <p style={{ color: 'var(--sea-ink-soft)' }}>{m['recipient.notFound']()}</p>
  }
  return (
    <div className="rise-in">
      <p className="island-kicker">{m['recipient.kicker']()}</p>
      <h1 className="display-title text-4xl font-bold mt-2" style={{ color: 'var(--sea-ink)' }}>
        {p.publicName}
      </h1>
      <p className="mt-1" style={{ color: 'var(--sea-ink-soft)' }}>
        {m['recipient.locatedIn']({ city: p.city, region: p.region, country: p.country })}
      </p>

      <div className="mt-4">
        <TrustBadges identity={p.identityVerified} payout={p.payoutVerified} location={p.locationVerified} />
      </div>

      {p.bio && (
        <section className="island-shell rounded-2xl p-6 mt-8">
          <h2 className="font-semibold text-lg" style={{ color: 'var(--sea-ink)' }}>{m['recipient.storyTitle']()}</h2>
          <p className="mt-2 whitespace-pre-line" style={{ color: 'var(--sea-ink-soft)' }}>{p.bio}</p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-semibold text-lg" style={{ color: 'var(--sea-ink)' }}>{m['recipient.activeCampaignsTitle']()}</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {p.campaigns.map((c) => (
            <Link
              key={c.id}
              to="/c/$campaignSlug"
              params={{ campaignSlug: c.slug }}
              className="feature-card rounded-2xl p-5 no-underline"
            >
              <h3 className="font-semibold" style={{ color: 'var(--sea-ink)' }}>{c.title}</h3>
              {c.summary && <p className="mt-1 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>{c.summary}</p>}
            </Link>
          ))}
          {p.campaigns.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>{m['recipient.noCampaigns']()}</p>
          )}
        </div>
      </section>

      {p.payouts.some((x) => x.verificationStatus === 'verified') && (
        <section className="island-shell rounded-2xl p-6 mt-8">
          <h2 className="font-semibold text-lg" style={{ color: 'var(--sea-ink)' }}>{m['recipient.howToSendTitle']()}</h2>
          <ul className="mt-2 space-y-2 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
            {p.payouts
              .filter((x) => x.verificationStatus === 'verified')
              .map((pm, i) => (
                <li key={i}>
                  <span className="font-medium" style={{ color: 'var(--sea-ink)' }}>{pm.label}</span>
                  <span className="whitespace-pre-line block">{pm.details}</span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  )
}
