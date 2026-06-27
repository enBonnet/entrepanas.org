import { useState } from 'react'
import {
  Link,
  createFileRoute,
  useNavigate,
  useSearch,
} from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { recipientQueries } from '#/lib/queries/recipients'
import { TrustBadges } from '#/components/trust-badges'
import { ReputationBadge } from '#/components/reputation-badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { STATE_GROUPS, citiesForState } from '#/lib/locations'
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
  loader: async ({ deps, context }) => {
    await context.queryClient.ensureQueryData(recipientQueries.explore(deps))
  },
})

function Explore() {
  const search = useSearch({ from: '/explore' })
  const navigate = useNavigate({ from: '/explore' })
  const { data: rows } = useSuspenseQuery(recipientQueries.explore(search))
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
        className="island-shell rounded-2xl p-4 mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:items-end"
      >
        <div className="space-y-1.5">
          <Label htmlFor="q">{m['explore.searchLabel']()}</Label>
          <Input id="q" placeholder={m['explore.searchPlaceholder']()} value={form.q} onChange={(e) => setForm((f) => ({ ...f, q: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="region">{m['explore.regionLabel']()}</Label>
          <Select
            value={form.region || undefined}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                region: v,
                city: v === f.region ? f.city : '',
              }))
            }
          >
            <SelectTrigger id="region" className="w-full">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              {STATE_GROUPS.map((g, i) => (
                <SelectGroup key={g.label}>
                  <SelectLabel>{g.label}</SelectLabel>
                  {g.states.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                  {i < STATE_GROUPS.length - 1 && <SelectSeparator />}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">{m['explore.cityLabel']()}</Label>
          <Select
            value={form.city || undefined}
            onValueChange={(v) => setForm((f) => ({ ...f, city: v }))}
            disabled={!form.region}
          >
            <SelectTrigger id="city" className="w-full">
              <SelectValue
                placeholder={form.region ? 'Todas las ciudades' : 'Elige un estado primero'}
              />
            </SelectTrigger>
            <SelectContent>
              {(citiesForState(form.region) ?? []).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-2">
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
              {r.reputationTier ? (
                <ReputationBadge tier={r.reputationTier} icon={r.reputationIcon} />
              ) : (
                <TrustBadges
                  identity={r.identityVerified}
                  payout={r.payoutVerified}
                  location={r.locationVerified}
                />
              )}
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