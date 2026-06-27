import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { getDb } from '#/db'
import {
  campaigns,
  donations,
  recipientProfiles,
} from '#/db/schema'
import { getSession, requireRole } from '#/lib/auth'
import { newId } from '#/lib/id'
import { uniqueSlug } from '#/lib/format'
import { checkRateLimit, validateCampaignTransition } from '#/lib/validate'

async function myProfileId(userId: string) {
  const db = getDb()
  const [row] = await db
    .select({ id: recipientProfiles.id })
    .from(recipientProfiles)
    .where(eq(recipientProfiles.userId, userId))
    .limit(1)
  return row?.id
}

const createInput = z.object({
  title: z.string().min(3).max(120),
  summary: z.string().max(1000).optional(),
  goalCents: z.number().int().positive().optional(),
  currency: z.string().length(3).default('USD'),
})

export const createCampaign = createServerFn({ method: 'POST' })
  .validator((d) => createInput.parse(d))
  .handler(async ({ data }) => {
    const db = getDb()
    const session = await getSession(db)
    const u = requireRole(session, ['recipient', 'admin'])

    const profileId = await myProfileId(u.id)
    if (!profileId) throw new Error('NO_PROFILE')

    // Rate limit: max 5 campaigns per day per profile.
    await checkRateLimit(`campaign:create:${profileId}`, 5, 86400_000)

    const id = newId()
    const [row] = await db
      .insert(campaigns)
      .values({
        id,
        recipientProfileId: profileId,
        slug: uniqueSlug(data.title, id),
        title: data.title,
        summary: data.summary,
        goalCents: data.goalCents,
        currency: data.currency,
        status: 'active',
      })
      .returning({ id: campaigns.id, slug: campaigns.slug })
    if (!row) throw new Error('INSERT_FAILED')
    return row
  })

const updateInput = z.object({
  campaignId: z.string().min(1),
  title: z.string().min(3).max(120).optional(),
  summary: z.string().max(1000).optional(),
  goalCents: z.number().int().positive().optional(),
  status: z.enum(['active', 'paused', 'closed']).optional(),
})

export const updateCampaign = createServerFn({ method: 'POST' })
  .validator((d) => updateInput.parse(d))
  .handler(async ({ data }) => {
    const db = getDb()
    const session = await getSession(db)
    const u = requireRole(session, ['recipient', 'admin'])
    const profileId = await myProfileId(u.id)
    if (!profileId) throw new Error('NO_PROFILE')

    const [c] = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.id, data.campaignId),
          eq(campaigns.recipientProfileId, profileId),
        ),
      )
      .limit(1)
    if (!c) throw new Error('NOT_FOUND')

    // Validate status transition if changing status.
    if (data.status && data.status !== c.status) {
      validateCampaignTransition(c.status, data.status)
    }

    const set: Record<string, unknown> = {}
    if (data.title !== undefined) set.title = data.title
    if (data.summary !== undefined) set.summary = data.summary
    if (data.goalCents !== undefined) set.goalCents = data.goalCents
    if (data.status !== undefined) set.status = data.status

    if (Object.keys(set).length === 0) return { ok: true }

    await db.update(campaigns).set(set).where(eq(campaigns.id, data.campaignId))
    return { ok: true }
  })

export const listMyCampaigns = createServerFn({ method: 'GET' })
  .validator(
    z
      .object({ limit: z.number().int().min(1).max(50).default(20), offset: z.number().int().min(0).default(0) })
      .partial()
      .parse,
  )
  .handler(async ({ data }) => {
    const db = getDb()
    const session = await getSession(db)
    const u = requireRole(session, ['donor', 'recipient', 'admin'])
    const profileId = await myProfileId(u.id)
    if (!profileId) return []
    return db
      .select()
      .from(campaigns)
      .where(eq(campaigns.recipientProfileId, profileId))
      .limit(data.limit ?? 20)
      .offset(data.offset ?? 0)
      .orderBy(desc(campaigns.createdAt))
  })

export const getCampaignBySlug = createServerFn({ method: 'GET' })
  .validator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const db = getDb()
    const [c] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.slug, data.slug), eq(campaigns.status, 'active')))
      .limit(1)
    if (!c) return null

    const [recipient] = await db
      .select({
        slug: recipientProfiles.slug,
        publicName: recipientProfiles.publicName,
        city: recipientProfiles.city,
        region: recipientProfiles.region,
        country: recipientProfiles.country,
        trustLevel: recipientProfiles.trustLevel,
      })
      .from(recipientProfiles)
      .where(eq(recipientProfiles.id, c.recipientProfileId))
      .limit(1)

    const [raised] = await db
      .select({
        total: sql<number>`coalesce(sum(${donations.amountCents}), 0)`.as('total'),
        count: sql<number>`count(*)`.as('count'),
      })
      .from(donations)
      .where(and(eq(donations.campaignId, c.id), eq(donations.status, 'sent')))

    return {
      campaign: c,
      recipient,
      raisedCents: Number(raised?.total ?? 0),
      donorsCount: Number(raised?.count ?? 0),
    }
  })
