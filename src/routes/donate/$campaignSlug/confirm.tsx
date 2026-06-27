import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'

import { getDb } from '#/db'
import { getSession } from '#/lib/auth'
import { createDonation, confirmDonation } from '#/server/donations'
import { authorizeUpload, commitUpload } from '#/server/uploads'
import { campaignQueries } from '#/lib/queries/campaigns'
import { donationQueries } from '#/lib/queries/dashboard'
import { errorMessage } from '#/lib/errors'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { m } from '#/paraglide/messages.js'

const requireSession = createServerFn({ method: 'GET' }).handler(async () => {
  const db = getDb()
  const session = await getSession(db)
  if (!session?.user) throw redirect({ to: '/' })
  return null
})

export const Route = createFileRoute('/donate/$campaignSlug/confirm')({
  component: ConfirmPage,
  beforeLoad: async () => {
    await requireSession()
  },
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(campaignQueries.publicBySlug(params.campaignSlug))
  },
})

function ConfirmPage() {
  const { campaignSlug } = Route.useParams()
  const { data: data } = useSuspenseQuery(campaignQueries.publicBySlug(campaignSlug))
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [proof, setProof] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!data) return <p style={{ color: 'var(--sea-ink-soft)' }}>{m['donate.notFound']()}</p>
  const { campaign } = data

  const mutation = useMutation({
    mutationFn: async () => {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: donationQueries.all() })
      queryClient.invalidateQueries({ queryKey: campaignQueries.all() })
      navigate({ to: '/me/donations' })
    },
    onError: (err) => {
      setError(errorMessage(err))
    },
  })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    mutation.mutate()
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
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setProof(e.target.files?.[0] ?? null)}
          />
        </div>
        {error && <p className="text-sm" style={{ color: 'var(--destructive)' }}>{error}</p>}
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? m['donate.submitting']() : m['donate.submit']()}</Button>
      </form>
    </div>
  )
}