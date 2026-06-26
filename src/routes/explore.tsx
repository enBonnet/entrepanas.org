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

const searchSchema = z.object({
  country: z.string().optional(),
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
    country: search.country ?? '',
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
        Recipients
      </h1>
      <p className="mt-1" style={{ color: 'var(--sea-ink-soft)' }}>
        Verified people raising help — filter by country, state or city.
      </p>

      <form
        onSubmit={applyFilters}
        className="island-shell rounded-2xl p-4 mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg-items-end"
      >
        <div className="space-y-1.5">
          <Label htmlFor="q">Search</Label>
          <Input id="q" placeholder="Name or story" value={form.q} onChange={(e) => setForm((f) => ({ ...f, q: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="country">Country</Label>
          <Input id="country" placeholder="Chile" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="region">State / Region</Label>
          <Input id="region" placeholder="Valparaíso" value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" placeholder="Valparaíso" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
        </div>
        <div className="lg:col-span-4 flex gap-2">
          <Button type="submit" size="sm">Apply filters</Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setForm({ q: '', country: '', region: '', city: '' })
              navigate({ to: '/explore', search: {} })
            }}
          >
            Clear
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
            No recipients match your filters.
          </p>
        )}
      </div>
    </div>
  )
}
