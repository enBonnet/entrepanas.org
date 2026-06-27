import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { getDb } from '#/db'
import { campaigns, donationConfirmations, donations } from '#/db/schema'
import { getSession, requireRole } from '#/lib/auth'
import { newId } from '#/lib/id'
import { recomputeRecipientReputation } from '#/lib/reputation'
import { checkRateLimit } from '#/lib/validate'

const pledgeInput = z.object({
  campaignId: z.string().min(1),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3).default('USD'),
  message: z.string().max(500).optional(),
})

export const createDonation = createServerFn({ method: 'POST' })
  .validator((d) => pledgeInput.parse(d))
  .handler(async ({ data }) => {
    const db = getDb()
    const session = await getSession(db)
    const u = requireRole(session, ['donor', 'recipient', 'admin'])

    // Rate limit: max 10 pledges per hour per user.
    await checkRateLimit(`donation:pledge:${u.id}`, 10, 3600_000)

    const [c] = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(and(eq(campaigns.id, data.campaignId), eq(campaigns.status, 'active')))
      .limit(1)
    if (!c) throw new Error('CAMPAIGN_CLOSED')

    const [row] = await db
      .insert(donations)
      .values({
        id: newId(),
        campaignId: data.campaignId,
        donorUserId: u.id,
        amountCents: data.amountCents,
        currency: data.currency,
        status: 'pledged',
        message: data.message,
      })
      .returning({ id: donations.id })
    if (!row) throw new Error('INSERT_FAILED')
    return row
  })

const confirmInput = z.object({
  donationId: z.string().min(1),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3).default('USD'),
  sentAt: z.number().int().optional(),
  transferProofImageId: z.string().optional(), // private/admin-only by default
  methodNote: z.string().max(200).optional(),
})

export const confirmDonation = createServerFn({ method: 'POST' })
  .validator((d) => confirmInput.parse(d))
  .handler(async ({ data }) => {
    const db = getDb()
    const session = await getSession(db)
    const u = requireRole(session, ['donor', 'recipient', 'admin'])

    const [don] = await db
      .select()
      .from(donations)
      .where(and(eq(donations.id, data.donationId), eq(donations.donorUserId, u.id)))
      .limit(1)
    if (!don) throw new Error('NOT_FOUND')

    // Prevent duplicate confirmations.
    if (don.status !== 'pledged') throw new Error('ALREADY_CONFIRMED')

    // Enforce amount consistency: confirmed amount must match the pledge.
    if (data.amountCents !== don.amountCents) throw new Error('AMOUNT_MISMATCH')

    await db.insert(donationConfirmations).values({
      id: newId(),
      donationId: don.id,
      donorUserId: u.id,
      amountCents: data.amountCents,
      currency: data.currency,
      sentAt: data.sentAt ? new Date(data.sentAt) : undefined,
      transferProofImageId: data.transferProofImageId,
      methodNote: data.methodNote,
    })

    await db
      .update(donations)
      .set({ status: 'sent' })
      .where(eq(donations.id, don.id))

    // Reputation: a confirmed donation moves unique-donor/fulfilled signals.
    const [camp] = await db
      .select({ profileId: campaigns.recipientProfileId })
      .from(campaigns)
      .where(eq(campaigns.id, don.campaignId))
      .limit(1)
    if (camp) await recomputeRecipientReputation(camp.profileId)

    return { ok: true }
  })

export const listMyDonations = createServerFn({ method: 'GET' })
  .validator(
    z
      .object({ limit: z.number().int().min(1).max(50).default(20), offset: z.number().int().min(0).default(0) })
      .partial()
      .optional()
      .default({})
      .parse,
  )
  .handler(async ({ data }) => {
    const db = getDb()
    const session = await getSession(db)
    const u = requireRole(session, ['donor', 'recipient', 'admin'])
    return db
      .select({
        id: donations.id,
        campaignId: donations.campaignId,
        amountCents: donations.amountCents,
        currency: donations.currency,
        status: donations.status,
        message: donations.message,
        createdAt: donations.createdAt,
      })
      .from(donations)
      .where(eq(donations.donorUserId, u.id))
      .orderBy(desc(donations.createdAt))
      .limit(data.limit ?? 20)
      .offset(data.offset ?? 0)
  })

// Public timeline for a campaign: confirmed donations (donor name hidden unless recipient).
export const listCampaignDonations = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      campaignId: z.string().min(1),
      limit: z.number().int().min(1).max(50).default(20),
      offset: z.number().int().min(0).default(0),
    }),
  )
  .handler(async ({ data }) => {
    const db = getDb()
    return db
      .select({
        id: donations.id,
        amountCents: donations.amountCents,
        currency: donations.currency,
        status: donations.status,
        message: donations.message,
        createdAt: donations.createdAt,
      })
      .from(donations)
      .where(and(eq(donations.campaignId, data.campaignId), eq(donations.status, 'sent')))
      .orderBy(desc(donations.createdAt))
      .limit(data.limit)
      .offset(data.offset)
  })
