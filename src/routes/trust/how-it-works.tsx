import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/trust/how-it-works')({ component: HowItWorks })

function HowItWorks() {
  const steps = [
    ['Verify', 'Recipient confirms email + phone, submits ID and payout method for private admin review. Raw documents are admin-only — never public.'],
    ['Publish', 'Recipient posts a campaign with approximate location (city/region) and masked payout instructions.'],
    ['Donate', 'A donor sends money directly to the recipient\u2019s bank or wallet and marks it sent.'],
    ['Prove', 'Recipient uploads receipts, invoices and product photos, linked back to the donation.'],
    ['Trust', 'A moderated public evidence timeline closes the loop: money in → proof out.'],
  ]
  return (
    <div className="rise-in">
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>
        How trust works
      </h1>
      <ol className="mt-8 space-y-4">
        {steps.map(([title, body], i) => (
          <li key={title} className="feature-card rounded-2xl p-6 flex gap-4">
            <span className="display-title text-2xl font-bold" style={{ color: 'var(--lagoon-deep)' }}>
              {i + 1}
            </span>
            <div>
              <h3 className="font-semibold text-lg" style={{ color: 'var(--sea-ink)' }}>{title}</h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
