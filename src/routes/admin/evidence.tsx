import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { listPendingEvidence, reviewEvidence } from '#/server/admin'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/admin/evidence')({
  component: EvidenceReview,
  loader: async () => listPendingEvidence(),
})

function EvidenceReview() {
  const initial = Route.useLoaderData()
  const [items, setItems] = useState(initial)

  async function decide(id: string, decision: 'approved' | 'rejected' | 'redacted') {
    await reviewEvidence({ data: { imageId: id, decision } })
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <div>
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>Evidence moderation</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((img) => (
          <div key={img.id} className="feature-card rounded-2xl overflow-hidden">
            <img src={`/api/img/${img.id}`} alt={img.kind} className="w-full h-48 object-cover" />
            <div className="p-4">
              <p className="island-kicker">{img.kind} · {img.visibility}</p>
              {img.caption && <p className="mt-1 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>{img.caption}</p>}
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => decide(img.id, 'approved')}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => decide(img.id, 'rejected')}>Reject</Button>
                <Button size="sm" variant="destructive" onClick={() => decide(img.id, 'redacted')}>Redact</Button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>Queue is clear.</p>}
      </div>
    </div>
  )
}
