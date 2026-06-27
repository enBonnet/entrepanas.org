import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'

import { campaignQueries } from '#/lib/queries/campaigns'
import { formatMoney } from '#/lib/format'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/c/$campaignSlug/')({
  component: CampaignPage,
  loader: async ({ params, context }) => {
    const campaign = await context.queryClient.ensureQueryData(
      campaignQueries.publicBySlug(params.campaignSlug),
    )
    if (!campaign) return null
    await Promise.all([
      context.queryClient.ensureQueryData(campaignQueries.donations(campaign.campaign.id)),
      context.queryClient.ensureQueryData(campaignQueries.evidence(campaign.campaign.id)),
    ])
    return campaign
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [] }
    const campaign = loaderData
    const title = campaign.campaign.title
    const description =
      campaign.campaign.summary ??
      `Campaña de ${campaign.recipient?.publicName ?? 'un recipiente'} en ${campaign.recipient?.city ?? 'Venezuela'}`
    const imageUrl = `/api/og/campaign/${campaign.campaign.slug}`
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: imageUrl },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: imageUrl },
      ],
    }
  },
})

function CampaignPage() {
  const { campaignSlug } = Route.useParams()
  const { data: campaign } = useSuspenseQuery(campaignQueries.publicBySlug(campaignSlug))
  if (!campaign) return <p style={{ color: 'var(--sea-ink-soft)' }}>{m['campaign.notFound']()}</p>

  const { data: donations } = useSuspenseQuery(campaignQueries.donations(campaign.campaign.id))
  const { data: evidence } = useSuspenseQuery(campaignQueries.evidence(campaign.campaign.id))

  const goal = campaign.campaign.goalCents
  const pct = goal ? Math.min(100, Math.round((campaign.raisedCents / goal) * 100)) : 0

  return (
    <div className="rise-in">
      <p className="island-kicker">{m['campaign.kicker']()}</p>
      <h1 className="display-title text-3xl sm:text-4xl font-bold mt-2" style={{ color: 'var(--sea-ink)' }}>
        {campaign.campaign.title}
      </h1>
      {campaign.campaign.summary && (
        <p className="mt-3 max-w-2xl" style={{ color: 'var(--sea-ink-soft)' }}>{campaign.campaign.summary}</p>
      )}

      <div className="island-shell rounded-2xl p-6 mt-8">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold" style={{ color: 'var(--sea-ink)' }}>
            {formatMoney(campaign.raisedCents, campaign.campaign.currency)}
          </span>
          {goal && (
            <span className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
              {m['common.ofGoal']({ amount: formatMoney(goal, campaign.campaign.currency) })}
            </span>
          )}
        </div>
        <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--lagoon)' }} />
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
          {campaign.donorsCount === 1
            ? m['campaign.confirmedDonationsOne']({ count: campaign.donorsCount })
            : m['campaign.confirmedDonationsOther']({ count: campaign.donorsCount })}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            to="/donate/$campaignSlug/confirm"
            params={{ campaignSlug: campaign.campaign.slug }}
            className="rounded-md px-4 py-2 text-sm font-medium no-underline"
            style={{ background: 'var(--palm)', color: 'white' }}
          >
            {m['campaign.iSentDonation']()}
          </Link>
          <ShareButton slug={campaign.campaign.slug} />
          {campaign.recipient && (
            <span className="ml-3 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
              {m['common.byAuthor']({ name: `${campaign.recipient.publicName}, ${campaign.recipient.city}` })}
            </span>
          )}
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-semibold text-lg" style={{ color: 'var(--sea-ink)' }}>{m['campaign.timelineTitle']()}</h2>
        <ul className="mt-3 space-y-2">
          {donations.map((d) => (
            <li key={d.id} className="feature-card rounded-xl p-4 flex justify-between gap-3">
              <span className="break-words" style={{ color: 'var(--sea-ink-soft)' }}>{d.message ?? m['campaign.donationFallback']()}</span>
              <span className="font-medium whitespace-nowrap" style={{ color: 'var(--sea-ink)' }}>
                {formatMoney(d.amountCents, d.currency)}
              </span>
            </li>
          ))}
          {donations.length === 0 && (
            <li className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>{m['campaign.noDonations']()}</li>
          )}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-semibold text-lg" style={{ color: 'var(--sea-ink)' }}>{m['campaign.evidenceTitle']()}</h2>
        <div className="mt-3 grid gap-4 grid-cols-2 md:grid-cols-4">
          {evidence.images.map((img) => (
            <figure key={img.id} className="feature-card rounded-xl overflow-hidden">
              <img src={`/api/img/${img.id}`} alt={img.caption ?? img.kind} className="w-full h-40 object-cover" loading="lazy" />
              {img.caption && (
                <figcaption className="p-2 text-xs" style={{ color: 'var(--sea-ink-soft)' }}>{img.caption}</figcaption>
              )}
            </figure>
          ))}
          {evidence.images.length === 0 && (
            <p className="text-sm col-span-full" style={{ color: 'var(--sea-ink-soft)' }}>{m['campaign.noEvidence']()}</p>
          )}
        </div>

        <h3 className="font-semibold mt-8" style={{ color: 'var(--sea-ink)' }}>{m['campaign.expensesTitle']()}</h3>
        <ul className="mt-3 space-y-2">
          {evidence.expenses.map((exp) => (
            <li key={exp.id} className="feature-card rounded-xl p-4 flex justify-between gap-3">
              <span className="break-words" style={{ color: 'var(--sea-ink-soft)' }}>{exp.title}</span>
              <span className="font-medium whitespace-nowrap" style={{ color: 'var(--sea-ink)' }}>
                {formatMoney(exp.totalCents, exp.currency)}
              </span>
            </li>
          ))}
          {evidence.expenses.length === 0 && (
            <li className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>{m['campaign.noExpenses']()}</li>
          )}
        </ul>
      </section>
    </div>
  )
}

function ShareButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)

  async function onCopy() {
    const url = `${location.origin}/c/${slug}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="rounded-md px-4 py-2 text-sm font-medium no-underline"
      style={{ background: copied ? 'var(--palm)' : 'var(--sea-ink)', color: 'white' }}
    >
      {copied ? m['campaign.linkCopied']() : m['campaign.shareImage']()}
    </button>
  )
}