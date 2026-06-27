import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation, useSuspenseQuery, useQueryClient } from '@tanstack/react-query'

import { createCampaign } from '#/server/campaigns'
import { campaignQueries } from '#/lib/queries/campaigns'
import { errorMessage } from '#/lib/errors'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { formatMoney } from '#/lib/format'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/dashboard/campaigns')({
  component: CampaignsPage,
  loader: async ({ context }) => {
    // Prefetch into Query cache during navigation — component uses useSuspenseQuery.
    await context.queryClient.ensureQueryData(campaignQueries.mine())
  },
})

function CampaignsPage() {
  // Data guaranteed by loader — no loading state needed.
  const { data: campaigns } = useSuspenseQuery(campaignQueries.mine())
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [goal, setGoal] = useState('')
  const [created, setCreated] = useState<{ slug: string } | null>(null)

  // Mutation: create campaign, then invalidate the 'mine' query so the list
  // refreshes automatically — no manual reload needed.
  const mutation = useMutation({
    mutationFn: (input: {
      title: string
      summary?: string
      goalCents?: number
    }) => createCampaign({ data: input }),
    onSuccess: (res) => {
      setCreated(res)
      setTitle('')
      setSummary('')
      setGoal('')
      queryClient.invalidateQueries({ queryKey: campaignQueries.all() })
      setTimeout(() => setCreated(null), 5000)
    },
  })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate({
      title,
      summary: summary || undefined,
      goalCents: goal ? Math.round(Number(goal) * 100) : undefined,
    })
  }

  return (
    <div>
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>{m['campaignsPage.title']()}</h1>

      <div className="mt-6 space-y-3">
        {campaigns.map((c) => (
          <div key={c.id} className="feature-card rounded-2xl p-5 flex justify-between items-center gap-3">
            <div className="min-w-0">
              <Link to="/c/$campaignSlug" params={{ campaignSlug: c.slug }} className="font-semibold no-underline" >
                {c.title}
              </Link>
              <p className="text-sm break-words" style={{ color: 'var(--sea-ink-soft)' }}>
                {c.status}{c.goalCents ? m['campaignsPage.goalSuffix']({ amount: formatMoney(c.goalCents, c.currency) }) : ''}
              </p>
            </div>
            <span className="island-kicker whitespace-nowrap">{c.status}</span>
          </div>
        ))}
        {campaigns.length === 0 && <p className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>{m['campaignsPage.empty']()}</p>}
      </div>

      <form onSubmit={onSubmit} className="island-shell rounded-2xl p-6 mt-8 space-y-4">
        <h2 className="font-semibold" style={{ color: 'var(--sea-ink)' }}>{m['campaignsPage.formTitle']()}</h2>
        <div className="space-y-1.5">
          <Label>{m['campaignsPage.titleLabel']()}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>{m['campaignsPage.summaryLabel']()}</Label>
          <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
        <div className="space-y-1.5 max-w-xs">
          <Label>{m['campaignsPage.goalLabel']()}</Label>
          <Input type="number" min="0" step="0.01" value={goal} onChange={(e) => setGoal(e.target.value)} />
        </div>
        <Button type="submit" disabled={mutation.isPending}>{m['campaignsPage.submit']()}</Button>
        {mutation.isError && (
          <p className="text-sm" style={{ color: 'var(--destructive)' }}>{errorMessage(mutation.error)}</p>
        )}
        {created && (
          <p className="text-sm" style={{ color: 'var(--palm)' }}>
            {m['campaignsPage.createdPrefix']()}{' '}
            <Link to="/c/$campaignSlug" params={{ campaignSlug: created.slug }}>{m['campaignsPage.viewIt']()}</Link>.
          </p>
        )}
      </form>
    </div>
  )
}