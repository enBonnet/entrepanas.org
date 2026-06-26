import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { createMyProfile, getMyProfile, updateMyProfile } from '#/server/recipients'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/dashboard/profile')({
  component: ProfilePage,
  loader: async () => getMyProfile(),
})

type Profile = Awaited<ReturnType<typeof getMyProfile>>

function ProfilePage() {
  const existing = Route.useLoaderData()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    publicName: existing?.publicName ?? '',
    legalName: existing?.legalName ?? '',
    phone: existing?.phone ?? '',
    email: existing?.email ?? '',
    region: existing?.region ?? '',
    city: existing?.city ?? '',
    neighborhood: existing?.neighborhood ?? '',
    exactAddress: existing?.exactAddress ?? '',
    bio: existing?.bio ?? '',
  })

  function set<TKey extends keyof typeof form>(key: TKey, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (existing) {
      await updateMyProfile({ data: form })
    } else {
      await createMyProfile({ data: form })
    }
    setSaved(true)
  }

  return (
    <div>
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>
        {existing ? m['profilePage.titleEdit']() : m['profilePage.titleCreate']()}
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
        {m['profilePage.note']()}
      </p>

      <form onSubmit={onSubmit} className="island-shell rounded-2xl p-6 mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={m['profilePage.publicNameLabel']()}>
            <Input value={form.publicName} onChange={(e) => set('publicName', e.target.value)} required />
          </Field>
          <Field label={m['profilePage.legalNameLabel']()}>
            <Input value={form.legalName} onChange={(e) => set('legalName', e.target.value)} required />
          </Field>
          <Field label={m['profilePage.regionLabel']()}>
            <Input value={form.region} onChange={(e) => set('region', e.target.value)} required />
          </Field>
          <Field label={m['profilePage.cityLabel']()}>
            <Input value={form.city} onChange={(e) => set('city', e.target.value)} required />
          </Field>
          <Field label={m['profilePage.neighborhoodLabel']()}>
            <Input value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} />
          </Field>
          <Field label={m['profilePage.phoneLabel']()}>
            <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label={m['profilePage.emailLabel']()}>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
        </div>
        <Field label={m['profilePage.exactAddressLabel']()}>
          <Input value={form.exactAddress} onChange={(e) => set('exactAddress', e.target.value)} />
        </Field>
        <Field label={m['profilePage.bioLabel']()}>
          <Textarea rows={4} value={form.bio} onChange={(e) => set('bio', e.target.value)} />
        </Field>
        {saved && <p className="text-sm" style={{ color: 'var(--palm)' }}>{m['profilePage.saved']()}</p>}
        <Button type="submit">{existing ? m['profilePage.submitEdit']() : m['profilePage.submitCreate']()}</Button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export type { Profile }
