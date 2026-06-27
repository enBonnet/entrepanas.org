import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, ne } from 'drizzle-orm'
import { z } from 'zod'

import { getDb } from '#/db'
import {
  donationExpenseLinks,
  evidenceImages,
  expenseItems,
  expenses,
  recipientProfiles,
} from '#/db/schema'
import { getSession, requireRole } from '#/lib/auth'
import { newId } from '#/lib/id'
import { recomputeRecipientReputation } from '#/lib/reputation'
import { verifyCampaignOwnership } from '#/lib/validate'

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

    // Verify campaign ownership — recipient can only add expenses to their own campaigns.
    await verifyCampaignOwnership(db, data.campaignId, profileId)

    // Validate totalCents matches the sum of items (with 1% tolerance for rounding).
    if (data.items.length > 0) {
      const itemsSum = data.items.reduce(
        (sum, it) => sum + it.amountCents * it.quantity,
        0,
      )
      const diff = Math.abs(data.totalCents - itemsSum)
      if (diff > data.totalCents * 0.01 && diff > 1) {
        throw new Error('TOTAL_MISMATCH')
      }
    }

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
    await recomputeRecipientReputation(profileId)
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
          // ponytail: assume-good-intent — show everything except explicitly
          // rejected/redacted (admin takedown). Pending is treated as live.
          ne(evidenceImages.moderationStatus, 'rejected'),
          ne(evidenceImages.moderationStatus, 'redacted'),
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
