import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { createPayoutMethod, listMyPayouts } from '#/server/payouts'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/dashboard/payouts')({
  component: PayoutsPage,
  loader: async () => listMyPayouts(),
})

function PayoutsPage() {
  const payouts = Route.useLoaderData()
  const [label, setLabel] = useState('')
  const [details, setDetails] = useState('')
  const [ok, setOk] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await createPayoutMethod({ data: { label, details } })
    setLabel('')
    setDetails('')
    setOk(true)
  }

  return (
    <div>
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>{m['payoutsPage.title']()}</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
        {m['payoutsPage.note']()}
      </p>

      <div className="mt-6 space-y-2">
        {payouts.map((p) => (
          <div key={p.id} className="feature-card rounded-2xl p-4 flex justify-between gap-4">
            <div>
              <p className="font-medium" style={{ color: 'var(--sea-ink)' }}>{p.label}</p>
              <p className="text-sm whitespace-pre-line" style={{ color: 'var(--sea-ink-soft)' }}>{p.details}</p>
            </div>
            <span className="island-kicker whitespace-nowrap">{p.verificationStatus}</span>
          </div>
        ))}
        {payouts.length === 0 && <p className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>{m['payoutsPage.empty']()}</p>}
      </div>

      <form onSubmit={onSubmit} className="island-shell rounded-2xl p-6 mt-8 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="label">{m['payoutsPage.typeLabel']()}</Label>
          <Input
            id="label"
            placeholder={m['payoutsPage.typePlaceholder']()}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="details">{m['payoutsPage.howToSendLabel']()}</Label>
          <Textarea
            id="details"
            rows={3}
            placeholder={m['payoutsPage.detailsPlaceholder']()}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            required
          />
        </div>
        <Button type="submit">{m['payoutsPage.submit']()}</Button>
        {ok && <p className="text-sm" style={{ color: 'var(--palm)' }}>{m['payoutsPage.added']()}</p>}
      </form>
    </div>
  )
}
