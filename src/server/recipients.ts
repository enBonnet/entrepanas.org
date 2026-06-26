import { createServerFn } from '@tanstack/react-start'
import { and, eq, like, ne, or } from 'drizzle-orm'
import { z } from 'zod'

import { getDb } from '#/db'
import {
  campaigns,
  payoutMethods,
  recipientProfiles,
  user,
} from '#/db/schema'
import { getSession, requireRole } from '#/lib/auth'
import { newId } from '#/lib/id'
import { uniqueSlug } from '#/lib/format'
import { STATE_NAMES, isValidStateCity } from '#/lib/locations'

const profileBase = z.object({
  publicName: z.string().min(2).max(80),
  legalName: z.string().min(2).max(120),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional(),
  // Controlled dropdown (src/lib/locations.ts). An enum over the constant
  // state list gives the same data-quality guarantee as a FK for a fixed set.
  region: z.enum(STATE_NAMES),
  city: z.string().min(2).max(80),
  neighborhood: z.string().max(80).optional(),
  exactAddress: z.string().max(200).optional(),
  approximateLat: z.number().optional(),
  approximateLng: z.number().optional(),
  bio: z.string().max(2000).optional(),
})

const profileInput = profileBase.superRefine((v, ctx) => {
  // Enforce the city -> state relationship in app code (constant list).
  if (!isValidStateCity(v.region, v.city)) {
    ctx.addIssue({
      code: 'custom',
      path: ['city'],
      message: `La ciudad no pertenece a ${v.region}`,
    })
  }
})

const profileUpdateInput = profileBase.partial().superRefine((v, ctx) => {
  // Only validate the pair when a city is actually being set.
  if (v.region !== undefined && v.city !== undefined && !isValidStateCity(v.region, v.city)) {
    ctx.addIssue({
      code: 'custom',
      path: ['city'],
      message: `La ciudad no pertenece a ${v.region}`,
    })
  }
})

export const createMyProfile = createServerFn({ method: 'POST' })
  .validator((d) => profileInput.parse(d))
  .handler(async ({ data }) => {
    const db = getDb()
    const session = await getSession(db)
    const u = requireRole(session, ['donor', 'recipient', 'admin'])

    const existing = await db
      .select({ id: recipientProfiles.id })
      .from(recipientProfiles)
      .where(eq(recipientProfiles.userId, u.id))
      .limit(1)
    if (existing.length) throw new Error('PROFILE_EXISTS')

    const id = newId()
    const slug = uniqueSlug(data.publicName, id)
    const [row] = await db
      .insert(recipientProfiles)
      .values({
        id,
        userId: u.id,
        slug,
        legalName: data.legalName,
        publicName: data.publicName,
        phone: data.phone,
        email: data.email,
        country: 'Venezuela',
        region: data.region,
        city: data.city,
        neighborhood: data.neighborhood,
        exactAddress: data.exactAddress,
        approximateLat: data.approximateLat,
        approximateLng: data.approximateLng,
        bio: data.bio,
      })
      .returning({ id: recipientProfiles.id, slug: recipientProfiles.slug })

    if (!row) throw new Error('INSERT_FAILED')

    // Promote donor -> recipient once they publish a profile.
    if (u.role === 'donor') {
      await db.update(user).set({ role: 'recipient' }).where(eq(user.id, u.id))
    }

    return row
  })

export const getMyProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const db = getDb()
  const session = await getSession(db)
  // Any signed-in user may look up their own profile (donors get null and are
  // guided to create one). Throwing here made /dashboard a dead link for donors.
  const u = requireRole(session, ['donor', 'recipient', 'admin'])
  const [row] = await db
    .select()
    .from(recipientProfiles)
    .where(eq(recipientProfiles.userId, u.id))
    .limit(1)
  return row ?? null
})

export const updateMyProfile = createServerFn({ method: 'POST' })
  .validator((d) => profileUpdateInput.parse(d))
  .handler(async ({ data }) => {
    const db = getDb()
    const session = await getSession(db)
    const u = requireRole(session, ['recipient', 'admin'])
    await db
      .update(recipientProfiles)
      .set(data)
      .where(eq(recipientProfiles.userId, u.id))
    return { ok: true }
  })

// Public view: private fields stripped, verification shown as outcomes, payout masked.
export const getPublicProfileBySlug = createServerFn({ method: 'GET' })
  .validator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const db = getDb()
    const [p] = await db
      .select()
      .from(recipientProfiles)
      .where(and(eq(recipientProfiles.slug, data.slug), ne(recipientProfiles.frozen, true)))
      .limit(1)
    if (!p) return null

    const payouts = await db
      .select({
        label: payoutMethods.label,
        details: payoutMethods.details,
        verificationStatus: payoutMethods.verificationStatus,
      })
      .from(payoutMethods)
      .where(eq(payoutMethods.recipientProfileId, p.id))

    const activeCampaigns = await db
      .select({
        id: campaigns.id,
        slug: campaigns.slug,
        title: campaigns.title,
        summary: campaigns.summary,
        goalCents: campaigns.goalCents,
        currency: campaigns.currency,
      })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.recipientProfileId, p.id),
          eq(campaigns.status, 'active'),
        ),
      )

    return {
      publicName: p.publicName,
      slug: p.slug,
      bio: p.bio,
      country: p.country,
      region: p.region,
      city: p.city,
      neighborhood: p.neighborhood,
      trustLevel: p.trustLevel,
      identityVerified: p.identityVerificationStatus === 'verified',
      payoutVerified: p.payoutVerificationStatus === 'verified',
      locationVerified: p.locationVerificationStatus === 'verified',
      riskFlagsCount: p.riskFlagsCount,
      payouts,
      campaigns: activeCampaigns,
    }
  })

const exploreFilters = z.object({
  limit: z.number().int().optional(),
  region: z.string().optional(), // state / province
  city: z.string().optional(),
  q: z.string().optional(), // free text over name + bio
})

export const listExploreProfiles = createServerFn({ method: 'GET' })
  .validator((d) => exploreFilters.parse(d ?? {}))
  .handler(async ({ data }) => {
    const db = getDb()
    const limit = Math.min(data.limit ?? 24, 48)
    // Filters operate on the discrete public location fields (country/region/city),
    // NOT on the private exact_address. region == state/province.
    const conditions = [ne(recipientProfiles.frozen, true)]
    if (data.region?.trim()) {
      conditions.push(like(recipientProfiles.region, `%${data.region.trim()}%`))
    }
    if (data.city?.trim()) {
      conditions.push(like(recipientProfiles.city, `%${data.city.trim()}%`))
    }
    if (data.q?.trim()) {
      const text = `%${data.q.trim()}%`
      const textCond = or(
        like(recipientProfiles.publicName, text),
        like(recipientProfiles.bio, text),
      )
      if (textCond) conditions.push(textCond)
    }

    const rows = await db
      .select({
        slug: recipientProfiles.slug,
        publicName: recipientProfiles.publicName,
        bio: recipientProfiles.bio,
        country: recipientProfiles.country,
        region: recipientProfiles.region,
        city: recipientProfiles.city,
        trustLevel: recipientProfiles.trustLevel,
        identityVerified: recipientProfiles.identityVerificationStatus,
        payoutVerified: recipientProfiles.payoutVerificationStatus,
        locationVerified: recipientProfiles.locationVerificationStatus,
      })
      .from(recipientProfiles)
      .where(and(...conditions))
      .limit(limit)
    return rows.map((r) => ({
      ...r,
      identityVerified: r.identityVerified === 'verified',
      payoutVerified: r.payoutVerified === 'verified',
      locationVerified: r.locationVerified === 'verified',
    }))
  })
