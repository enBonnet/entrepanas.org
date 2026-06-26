import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { getDb } from '#/db'
import {
  campaigns,
  donationExpenseLinks,
  evidenceImages,
  expenseItems,
  expenses,
  recipientProfiles,
} from '#/db/schema'
import { getSession, requireRole } from '#/lib/auth'
import { newId } from '#/lib/id'

async function myProfileId(userId: string) {
  const db = getDb()
  const [row] = await db
    .select({ id: recipientProfiles.id })
    .from(recipientProfiles)
    .where(eq(recipientProfiles.userId, userId))
    .limit(1)
  return row?.id
}

const expenseInput = z.object({
  campaignId: z.string().min(1),
  title: z.string().min(2).max(120),
  totalCents: z.number().int().positive(),
  currency: z.string().length(3).default('USD'),
  incurredAt: z.number().int().optional(),
  items: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        amountCents: z.number().int().positive(),
        quantity: z.number().int().positive().default(1),
      }),
    )
    .default([]),
})

export const createExpense = createServerFn({ method: 'POST' })
  .validator((d) => expenseInput.parse(d))
  .handler(async ({ data }) => {
    const db = getDb()
    const session = await getSession(db)
    const u = requireRole(session, ['recipient', 'admin'])
    const profileId = await myProfileId(u.id)
    if (!profileId) throw new Error('NO_PROFILE')

    const [c] = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(eq(campaigns.id, data.campaignId))
      .limit(1)
    if (!c) throw new Error('NOT_FOUND')

    const id = newId()
    await db.insert(expenses).values({
      id,
      campaignId: data.campaignId,
      recipientProfileId: profileId,
      title: data.title,
      totalCents: data.totalCents,
      currency: data.currency,
      incurredAt: data.incurredAt ? new Date(data.incurredAt) : undefined,
    })
    if (data.items.length) {
      await db.insert(expenseItems).values(
        data.items.map((it) => ({
          id: newId(),
          expenseId: id,
          title: it.title,
          amountCents: it.amountCents,
          quantity: it.quantity,
        })),
      )
    }
    return { id }
  })

export const linkExpenseToDonation = createServerFn({ method: 'POST' })
  .validator(
    z
      .object({ donationId: z.string(), expenseId: z.string() })
      .parse,
  )
  .handler(async ({ data }) => {
    const db = getDb()
    const session = await getSession(db)
    requireRole(session, ['recipient', 'admin'])
    await db.insert(donationExpenseLinks).values({
      id: newId(),
      donationId: data.donationId,
      expenseId: data.expenseId,
    })
    return { ok: true }
  })

// Public evidence timeline: only approved, public images + expenses for a campaign.
export const listPublicEvidenceForCampaign = createServerFn({ method: 'GET' })
  .validator((d: { campaignId: string }) => d)
  .handler(async ({ data }) => {
    const db = getDb()
    const images = await db
      .select({
        id: evidenceImages.id,
        caption: evidenceImages.caption,
        kind: evidenceImages.kind,
        createdAt: evidenceImages.createdAt,
      })
      .from(evidenceImages)
      .where(
        and(
          eq(evidenceImages.linkedEntityType, 'campaign'),
          eq(evidenceImages.linkedEntityId, data.campaignId),
          eq(evidenceImages.visibility, 'public'),
          eq(evidenceImages.moderationStatus, 'approved'),
        ),
      )
      .orderBy(desc(evidenceImages.createdAt))

    const exps = await db
      .select()
      .from(expenses)
      .where(eq(expenses.campaignId, data.campaignId))
      .orderBy(desc(expenses.createdAt))

    return { images, expenses: exps }
  })
