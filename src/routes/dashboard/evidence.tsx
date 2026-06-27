import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'

import { createExpense } from '#/server/evidence'
import { campaignQueries } from '#/lib/queries/campaigns'
import { errorMessage } from '#/lib/errors'
import { UploadForm } from '#/components/upload-form'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/dashboard/evidence')({
  component: EvidencePage,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(campaignQueries.mine())
  },
})

function EvidencePage() {
  const queryClient = useQueryClient()
  const { data: campaigns } = useSuspenseQuery(campaignQueries.mine())
  const [campaignId, setCampaignId] = useState<string>(campaigns[0]?.id ?? '')

  // Invalidate this campaign's evidence query so the public campaign page
  // reflects newly committed images without a manual refresh.
  const onEvidenceCommitted = () => {
    if (campaignId) {
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId, 'evidence'] })
    }
  }

  return (
    <div>
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>
        {m['evidencePage.title']()}
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
        {m['evidencePage.note']()}
      </p>

      {campaigns.length === 0 ? (
        <p className="mt-6 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
          {m['evidencePage.needCampaign']()}
        </p>
      ) : (
        <>
          <div className="mt-6 space-y-1.5 max-w-xs">
            <Label>{m['evidencePage.campaignLabel']()}</Label>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="island-shell rounded-2xl p-6 mt-6 grid gap-6 sm:grid-cols-2">
            <UploadForm kind="receipt" visibility="public" linkedEntityType="campaign" linkedEntityId={campaignId} onCommitted={onEvidenceCommitted} />
            <UploadForm kind="invoice" visibility="public" linkedEntityType="campaign" linkedEntityId={campaignId} onCommitted={onEvidenceCommitted} />
            <UploadForm kind="product_photo" visibility="public" linkedEntityType="campaign" linkedEntityId={campaignId} onCommitted={onEvidenceCommitted} />
            <UploadForm kind="delivery_photo" visibility="public" linkedEntityType="campaign" linkedEntityId={campaignId} onCommitted={onEvidenceCommitted} />
          </div>

          <ExpenseRecorder campaignId={campaignId} currency={campaigns.find((c) => c.id === campaignId)?.currency ?? 'USD'} />
        </>
      )}
    </div>
  )
}

function ExpenseRecorder({ campaignId, currency }: { campaignId: string; currency: string }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')

  const mutation = useMutation({
    mutationFn: (input: { campaignId: string; title: string; totalCents: number; currency: string }) =>
      createExpense({ data: input }),
    onSuccess: () => {
      // Invalidate campaign evidence + recipient reputation signals.
      queryClient.invalidateQueries({ queryKey: campaignQueries.all() })
      setTitle('')
      setAmount('')
    },
  })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cents = Math.round(Number(amount) * 100)
    if (!title || !cents) return
    mutation.mutate({ campaignId, title, totalCents: cents, currency })
  }

  return (
    <form onSubmit={onSubmit} className="island-shell rounded-2xl p-6 mt-6 grid gap-3 sm:grid-cols-[1fr_120px_auto] items-end">
      <div className="space-y-1.5">
        <Label>{m['evidencePage.expenseDescLabel']()}</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>{m['evidencePage.amountLabel']({ currency })}</Label>
        <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <Button type="submit" disabled={mutation.isPending}>{m['evidencePage.addExpense']()}</Button>
      {mutation.isSuccess && <p className="text-xs sm:col-span-3" style={{ color: 'var(--palm)' }}>{m['evidencePage.expenseRecorded']()}</p>}
      {mutation.isError && (
        <p className="text-xs sm:col-span-3" style={{ color: 'var(--destructive)' }}>{errorMessage(mutation.error)}</p>
      )}
    </form>
  )
}