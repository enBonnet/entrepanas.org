import { useState } from 'react'
import {
  Link,
  createFileRoute,
  useNavigate,
  useSearch,
} from '@tanstack/react-router'
import { z } from 'zod'

import { listExploreProfiles } from '#/server/recipients'
import { TrustBadges } from '#/components/trust-badges'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { m } from '#/paraglide/messages.js'

const searchSchema = z.object({
  region: z.string().optional(), // state / province
  city: z.string().optional(),
  q: z.string().optional(),
})

export const Route = createFileRoute('/explore')({
  component: Explore,
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ ...search }),
  loader: async ({ deps }) => listExploreProfiles({ data: { ...deps, limit: 24 } }),
})

function Explore() {
  const rows = Route.useLoaderData()
  const search = useSearch({ from: '/explore' })
  const navigate = useNavigate({ from: '/explore' })
  const [form, setForm] = useState({
    q: search.q ?? '',
    region: search.region ?? '',
    city: search.city ?? '',
  })

  function applyFilters(e: React.FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    for (const [k, v] of Object.entries(form)) {
      if (v.trim()) next[k] = v.trim()
    }
    navigate({ to: '/explore', search: next })
  }

  return (
    <div className="rise-in">
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>
        {m['explore.title']()}
      </h1>
      <p className="mt-1" style={{ color: 'var(--sea-ink-soft)' }}>
        {m['explore.subtitle']()}
      </p>

      <form
        onSubmit={applyFilters}
        className="island-shell rounded-2xl p-4 mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg-items-end"
      >
        <div className="space-y-1.5">
          <Label htmlFor="q">{m['explore.searchLabel']()}</Label>
          <Input id="q" placeholder={m['explore.searchPlaceholder']()} value={form.q} onChange={(e) => setForm((f) => ({ ...f, q: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="region">{m['explore.regionLabel']()}</Label>
          <Input id="region" placeholder={m['explore.regionPlaceholder']()} value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">{m['explore.cityLabel']()}</Label>
          <Input id="city" placeholder={m['explore.cityPlaceholder']()} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
        </div>
        <div className="lg:col-span-3 flex gap-2">
          <Button type="submit" size="sm">{m['explore.applyFilters']()}</Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setForm({ q: '', region: '', city: '' })
              navigate({ to: '/explore', search: {} })
            }}
          >
            {m['explore.clear']()}
          </Button>
        </div>
      </form>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <Link
            key={r.slug}
            to="/r/$recipientSlug"
            params={{ recipientSlug: r.slug }}
            className="feature-card rounded-2xl p-6 no-underline"
          >
            <h3 className="font-semibold text-lg" style={{ color: 'var(--sea-ink)' }}>
              {r.publicName}
            </h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
              {r.city}, {r.region}, {r.country}
            </p>
            <p className="mt-3 text-sm line-clamp-3" style={{ color: 'var(--sea-ink-soft)' }}>
              {r.bio}
            </p>
            <div className="mt-4">
              <TrustBadges
                identity={r.identityVerified}
                payout={r.payoutVerified}
                location={r.locationVerified}
              />
            </div>
          </Link>
        ))}
        {rows.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
            {m['explore.empty']()}
          </p>
        )}
      </div>
    </div>
  )
}
