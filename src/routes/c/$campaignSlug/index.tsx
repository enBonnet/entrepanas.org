import { Link, createFileRoute } from '@tanstack/react-router'

import { getCampaignBySlug } from '#/server/campaigns'
import { listCampaignDonations } from '#/server/donations'
import { listPublicEvidenceForCampaign } from '#/server/evidence'
import { formatMoney } from '#/lib/format'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/c/$campaignSlug/')({
  component: CampaignPage,
  loader: async ({ params }) => {
    const campaign = await getCampaignBySlug({ data: { slug: params.campaignSlug } })
    if (!campaign) return null
    const [donations, evidence] = await Promise.all([
      listCampaignDonations({ data: { campaignId: campaign.campaign.id } }),
      listPublicEvidenceForCampaign({ data: { campaignId: campaign.campaign.id } }),
    ])
    return { campaign, donations, evidence }
  },
})

function CampaignPage() {
  const data = Route.useLoaderData()
  if (!data) return <p style={{ color: 'var(--sea-ink-soft)' }}>{m['campaign.notFound']()}</p>
  const { campaign, donations, evidence } = data
  const goal = campaign.campaign.goalCents
  const pct = goal ? Math.min(100, Math.round((campaign.raisedCents / goal) * 100)) : 0

  return (
    <div className="rise-in">
      <p className="island-kicker">{m['campaign.kicker']()}</p>
      <h1 className="display-title text-4xl font-bold mt-2" style={{ color: 'var(--sea-ink)' }}>
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
        <div className="mt-4">
          <Link
            to="/donate/$campaignSlug/confirm"
            params={{ campaignSlug: campaign.campaign.slug }}
            className="rounded-md px-4 py-2 text-sm font-medium no-underline"
            style={{ background: 'var(--palm)', color: 'white' }}
          >
            {m['campaign.iSentDonation']()}
          </Link>
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
            <li key={d.id} className="feature-card rounded-xl p-4 flex justify-between">
              <span style={{ color: 'var(--sea-ink-soft)' }}>{d.message ?? m['campaign.donationFallback']()}</span>
              <span className="font-medium" style={{ color: 'var(--sea-ink)' }}>
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
      </section>
    </div>
  )
}
