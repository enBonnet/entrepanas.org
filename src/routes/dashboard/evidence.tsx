import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { listMyCampaigns } from '#/server/campaigns'
import { createExpense } from '#/server/evidence'
import { UploadForm } from '#/components/upload-form'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

export const Route = createFileRoute('/dashboard/evidence')({
  component: EvidencePage,
  loader: async () => listMyCampaigns(),
})

function EvidencePage() {
  const campaigns = Route.useLoaderData()
  const [campaignId, setCampaignId] = useState<string>(campaigns[0]?.id ?? '')

  return (
    <div>
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>
        Upload evidence
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
        Link receipts, invoices and product photos to a campaign. Public images appear only after moderation.
      </p>

      {campaigns.length === 0 ? (
        <p className="mt-6 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
          Create a campaign first.
        </p>
      ) : (
        <>
          <div className="mt-6 space-y-1.5 max-w-xs">
            <Label>Campaign</Label>
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
              style={{ borderColor: 'var(--input)' }}
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div className="island-shell rounded-2xl p-6 mt-6 grid gap-6 sm:grid-cols-2">
            <UploadForm kind="receipt" visibility="public" linkedEntityType="campaign" linkedEntityId={campaignId} />
            <UploadForm kind="invoice" visibility="public" linkedEntityType="campaign" linkedEntityId={campaignId} />
            <UploadForm kind="product_photo" visibility="public" linkedEntityType="campaign" linkedEntityId={campaignId} />
            <UploadForm kind="delivery_photo" visibility="public" linkedEntityType="campaign" linkedEntityId={campaignId} />
          </div>

          <ExpenseRecorder campaignId={campaignId} currency={campaigns.find((c) => c.id === campaignId)?.currency ?? 'USD'} />
        </>
      )}
    </div>
  )
}

function ExpenseRecorder({ campaignId, currency }: { campaignId: string; currency: string }) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [ok, setOk] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cents = Math.round(Number(amount) * 100)
    if (!title || !cents) return
    await createExpense({ data: { campaignId, title, totalCents: cents, currency } })
    setTitle('')
    setAmount('')
    setOk(true)
  }

  return (
    <form onSubmit={onSubmit} className="island-shell rounded-2xl p-6 mt-6 grid gap-3 sm:grid-cols-[1fr_120px_auto] items-end">
      <div className="space-y-1.5">
        <Label>Expense description</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Amount ({currency})</Label>
        <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <Button type="submit">Add expense</Button>
      {ok && <p className="text-xs sm:col-span-3" style={{ color: 'var(--palm)' }}>Expense recorded.</p>}
    </form>
  )
}
