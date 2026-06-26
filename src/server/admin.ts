import { createServerFn } from '@tanstack/react-start'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { getDb } from '#/db'
import {
  abuseReports,
  evidenceImages,
  recipientProfiles,
  verificationReviews,
} from '#/db/schema'
import { getSession, requireRole } from '#/lib/auth'
import { newId } from '#/lib/id'

const requireAdmin = async () => {
  const db = getDb()
  const session = await getSession(db)
  return { db, user: requireRole(session, ['admin']) }
}

export const listPendingEvidence = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await requireAdmin()
  return db
    .select()
    .from(evidenceImages)
    .where(eq(evidenceImages.moderationStatus, 'pending'))
    .orderBy(desc(evidenceImages.createdAt))
})

const reviewInput = z.object({
  imageId: z.string(),
  decision: z.enum(['approved', 'rejected', 'redacted']),
  notes: z.string().max(500).optional(),
})

export const reviewEvidence = createServerFn({ method: 'POST' })
  .validator((d) => reviewInput.parse(d))
  .handler(async ({ data }) => {
    const { db, user } = await requireAdmin()
    await db
      .update(evidenceImages)
      .set({ moderationStatus: data.decision })
      .where(eq(evidenceImages.id, data.imageId))
    await db.insert(verificationReviews).values({
      id: newId(),
      targetType: 'evidence',
      targetId: data.imageId,
      reviewerId: user.id,
      decision: data.decision === 'approved' ? 'approved' : 'rejected',
      notes: data.notes,
    })
    return { ok: true }
  })

const verifyInput = z.object({
  profileId: z.string(),
  kind: z.enum(['identity', 'payout', 'location']),
  status: z.enum(['verified', 'rejected', 'pending']),
  notes: z.string().max(500).optional(),
})

export const setVerificationStatus = createServerFn({ method: 'POST' })
  .validator((d) => verifyInput.parse(d))
  .handler(async ({ data }) => {
    const { db, user } = await requireAdmin()
    const set =
      data.kind === 'identity'
        ? { identityVerificationStatus: data.status }
        : data.kind === 'payout'
          ? { payoutVerificationStatus: data.status }
          : { locationVerificationStatus: data.status }

    await db
      .update(recipientProfiles)
      .set(set)
      .where(eq(recipientProfiles.id, data.profileId))

    await db.insert(verificationReviews).values({
      id: newId(),
      targetType: data.kind,
      targetId: data.profileId,
      reviewerId: user.id,
      decision: data.status === 'verified' ? 'approved' : 'rejected',
      notes: data.notes,
    })
    return { ok: true }
  })

const freezeInput = z.object({ profileId: z.string(), frozen: z.boolean() })
export const freezeRecipient = createServerFn({ method: 'POST' })
  .validator((d) => freezeInput.parse(d))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin()
    await db
      .update(recipientProfiles)
      .set({ frozen: data.frozen })
      .where(eq(recipientProfiles.id, data.profileId))
    return { ok: true }
  })

export const listAbuseReports = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await requireAdmin()
  return db.select().from(abuseReports).where(eq(abuseReports.status, 'open')).orderBy(desc(abuseReports.createdAt))
})

export const listAllRecipients = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await requireAdmin()
  return db
    .select({
      id: recipientProfiles.id,
      publicName: recipientProfiles.publicName,
      trustLevel: recipientProfiles.trustLevel,
      frozen: recipientProfiles.frozen,
      riskFlagsCount: recipientProfiles.riskFlagsCount,
    })
    .from(recipientProfiles)
    .orderBy(desc(recipientProfiles.createdAt))
})

export const listPendingVerifications = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await requireAdmin()
  return db
    .select({
      id: recipientProfiles.id,
      publicName: recipientProfiles.publicName,
      identityVerificationStatus: recipientProfiles.identityVerificationStatus,
      payoutVerificationStatus: recipientProfiles.payoutVerificationStatus,
      locationVerificationStatus: recipientProfiles.locationVerificationStatus,
      trustLevel: recipientProfiles.trustLevel,
    })
    .from(recipientProfiles)
    .where(eq(recipientProfiles.identityVerificationStatus, 'pending'))
})

const reportInput = z.object({
  targetType: z.enum(['recipient', 'campaign', 'evidence']),
  targetId: z.string(),
  reason: z.string().min(2).max(120),
  details: z.string().max(1000).optional(),
})

// Public: any signed-in user can report abuse.
export const createAbuseReport = createServerFn({ method: 'POST' })
  .validator((d) => reportInput.parse(d))
  .handler(async ({ data }) => {
    const db = getDb()
    const session = await getSession(db)
    await db.insert(abuseReports).values({
      id: newId(),
      reporterUserId: session?.user.id ?? null,
      targetType: data.targetType,
      targetId: data.targetId,
      reason: data.reason,
      details: data.details,
      status: 'open',
    })
    return { ok: true }
  })
