import { createFileRoute } from '@tanstack/react-router'

import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/trust/how-it-works')({ component: HowItWorks })

function HowItWorks() {
  const steps = [
    [m['howItWorks.step1Title'](), m['howItWorks.step1Body']()],
    [m['howItWorks.step2Title'](), m['howItWorks.step2Body']()],
    [m['howItWorks.step3Title'](), m['howItWorks.step3Body']()],
    [m['howItWorks.step4Title'](), m['howItWorks.step4Body']()],
    [m['howItWorks.step5Title'](), m['howItWorks.step5Body']()],
  ] as const
  return (
    <div className="rise-in">
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>
        {m['howItWorks.title']()}
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
