import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'

import { recipientQueries } from '#/lib/queries/recipients'
import { TrustBadges } from '#/components/trust-badges'
import { ReputationBadge } from '#/components/reputation-badge'
import { Button } from '#/components/ui/button'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/r/$recipientSlug/')({
  component: RecipientPage,
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(recipientQueries.publicBySlug(params.recipientSlug))
  },
})

function CopyButton({ value, copyLabel }: { value: string; copyLabel: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          // ponytail: clipboard may be blocked (non-secure context); the value
          // stays selectable via the surrounding select-all span, so copy still works.
        }
      }}
    >
      {copied ? m['recipient.copied']() : copyLabel}
    </Button>
  )
}

function RecipientPage() {
  const { recipientSlug } = Route.useParams()
  const { data: p } = useSuspenseQuery(recipientQueries.publicBySlug(recipientSlug))
  if (!p) {
    return <p style={{ color: 'var(--sea-ink-soft)' }}>{m['recipient.notFound']()}</p>
  }
  return (
    <div className="rise-in">
      <p className="island-kicker">{m['recipient.kicker']()}</p>
      <h1 className="display-title text-3xl sm:text-4xl font-bold mt-2" style={{ color: 'var(--sea-ink)' }}>
        {p.publicName}
      </h1>
      <p className="mt-1" style={{ color: 'var(--sea-ink-soft)' }}>
        {m['recipient.locatedIn']({ city: p.city, region: p.region, country: p.country })}
      </p>

      <div className="mt-4">
        {p.reputationTier ? (
          <ReputationBadge tier={p.reputationTier} icon={p.reputationIcon} />
        ) : (
          <TrustBadges identity={p.identityVerified} payout={p.payoutVerified} location={p.locationVerified} />
        )}
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

      {p.payouts.length > 0 && (
        <section className="island-shell rounded-2xl p-6 mt-8">
          <h2 className="font-semibold text-lg" style={{ color: 'var(--sea-ink)' }}>{m['recipient.howToSendTitle']()}</h2>
          <div className="mt-3 space-y-4">
            {p.payouts
              .map((pm, i) => {
                const lines = pm.details.split('\n').map((l) => l.trim()).filter(Boolean)
                return (
                  <div key={i} className="feature-card rounded-2xl p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium" style={{ color: 'var(--sea-ink)' }}>{pm.label}</span>
                      {lines.length > 1 && <CopyButton value={pm.details} copyLabel={m['recipient.copyAll']()} />}
                    </div>
                    <ul className="mt-2">
                      {lines.map((line, j) => (
                        <li
                          key={j}
                          className="flex items-center justify-between gap-2 border-t border-black/5 py-1.5 first:border-t-0"
                        >
                          <span
                            className="font-mono text-sm select-all break-all"
                            style={{ color: 'var(--sea-ink-soft)' }}
                          >
                            {line}
                          </span>
                          <CopyButton value={line} copyLabel={m['recipient.copy']()} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
          </div>
        </section>
      )}
    </div>
  )
}