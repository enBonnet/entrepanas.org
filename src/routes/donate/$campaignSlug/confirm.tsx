import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { getCampaignBySlug } from '#/server/campaigns'
import { createDonation, confirmDonation } from '#/server/donations'
import { authorizeUpload, commitUpload } from '#/server/uploads'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/donate/$campaignSlug/confirm')({
  component: ConfirmPage,
  loader: async ({ params }) => getCampaignBySlug({ data: { slug: params.campaignSlug } }),
})

function ConfirmPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [proof, setProof] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!data) return <p style={{ color: 'var(--sea-ink-soft)' }}>{m['donate.notFound']()}</p>
  const { campaign } = data

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const cents = Math.round(Number(amount) * 100)
      if (!cents) throw new Error(m['donate.enterAmount']())

      const created = await createDonation({
        data: {
          campaignId: campaign.id,
          amountCents: cents,
          currency: campaign.currency,
          message: message || undefined,
        },
      })

      let proofImageId: string | undefined
      if (proof) {
        const auth = await authorizeUpload({
          data: {
            filename: proof.name,
            contentType: proof.type as 'image/jpeg' | 'image/png' | 'image/webp',
            sizeBytes: proof.size,
            kind: 'transfer_proof',
            visibility: 'private',
            linkedEntityType: 'donation',
            linkedEntityId: created.id,
          },
        })
        const put = await fetch(auth.uploadUrl, { method: 'PUT', body: proof, headers: { 'Content-Type': proof.type } })
        if (!put.ok) throw new Error(m['donate.proofUploadFailed']())
        const committed = await commitUpload({
          data: {
            objectKey: auth.objectKey,
            mimeType: proof.type as 'image/jpeg' | 'image/png' | 'image/webp',
            sizeBytes: proof.size,
            kind: 'transfer_proof',
            visibility: 'private',
            linkedEntityType: 'donation',
            linkedEntityId: created.id,
          },
        })
        proofImageId = committed.id
      }

      await confirmDonation({
        data: {
          donationId: created.id,
          amountCents: cents,
          currency: campaign.currency,
          transferProofImageId: proofImageId,
        },
      })
      navigate({ to: '/me/donations' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg rise-in">
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>
        {m['donate.title']()}
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
        {m['donate.subtitle']({ title: campaign.title })}
      </p>

      <form onSubmit={onSubmit} className="island-shell rounded-2xl p-6 mt-6 space-y-4">
        <div className="space-y-1.5 max-w-xs">
          <Label>{m['donate.amountLabel']({ currency: campaign.currency })}</Label>
          <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>{m['donate.messageLabel']()}</Label>
          <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{m['donate.proofLabel']()}</Label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setProof(e.target.files?.[0] ?? null)}
            className="block text-sm"
          />
        </div>
        {error && <p className="text-sm" style={{ color: 'var(--destructive)' }}>{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? m['donate.submitting']() : m['donate.submit']()}</Button>
      </form>
    </div>
  )
}
