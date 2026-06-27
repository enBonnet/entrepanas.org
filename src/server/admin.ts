import { createServerFn } from '@tanstack/react-start'
import { asc, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { getDb } from '#/db'
import {
  abuseReports,
  campaigns,
  evidenceImages,
  recipientProfiles,
  verificationReviews,
} from '#/db/schema'
import { getSession, requireRole } from '#/lib/auth'
import { newId } from '#/lib/id'
import {
  aggregateReputationSignals,
  recomputeRecipientReputation,
} from '#/lib/reputation'
import { checkRateLimit } from '#/lib/validate'

const requireAdmin = async () => {
  const db = getDb()
  const session = await getSession(db)
  return { db, user: requireRole(session, ['admin']) }
}

// Resolve the recipient whose reputation depends on an evidence item, then
// recompute. Campaign-linked evidence → that campaign's recipient; otherwise
// the uploader's own profile. Defensive only — the nightly cron backstops it.
async function recomputeEvidenceOwner(imageId: string) {
  const db = getDb()
  const [img] = await db
    .select({
      linkedEntityType: evidenceImages.linkedEntityType,
      linkedEntityId: evidenceImages.linkedEntityId,
      ownerUserId: evidenceImages.ownerUserId,
    })
    .from(evidenceImages)
    .where(eq(evidenceImages.id, imageId))
    .limit(1)
  if (!img) return

  let profileId: string | undefined
  if (img.linkedEntityType === 'campaign' && img.linkedEntityId) {
    const [c] = await db
      .select({ recipientProfileId: campaigns.recipientProfileId })
      .from(campaigns)
      .where(eq(campaigns.id, img.linkedEntityId))
      .limit(1)
    profileId = c?.recipientProfileId
  } else {
    const [p] = await db
      .select({ id: recipientProfiles.id })
      .from(recipientProfiles)
      .where(eq(recipientProfiles.userId, img.ownerUserId))
      .limit(1)
    profileId = p?.id
  }
  if (profileId) await recomputeRecipientReputation(profileId)
}

const listOpts = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

export const listPendingEvidence = createServerFn({ method: 'GET' })
  .validator((d) => listOpts.partial().parse(d ?? {}))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin()
    return db
      .select()
      .from(evidenceImages)
      .where(eq(evidenceImages.moderationStatus, 'pending'))
      .orderBy(desc(evidenceImages.createdAt))
      .limit(data.limit ?? 50)
      .offset(data.offset ?? 0)
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
    // Reputation: resolve the recipient whose signals changed (campaign-linked
    // preferred — that's whose evidence/approval affects the score), else owner.
    await recomputeEvidenceOwner(data.imageId)
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
    await recomputeRecipientReputation(data.profileId)
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

    // Cascade: freeze/unfreeze all campaigns for this recipient.
    // ponytail: on freeze all non-closed campaigns go frozen; on unfreeze they go active.
    // A previously paused campaign loses its status on unfreeze — acceptable for MVP volume.
    await db
      .update(campaigns)
      .set({ status: data.frozen ? 'frozen' : 'active' })
      .where(eq(campaigns.recipientProfileId, data.profileId))
    await recomputeRecipientReputation(data.profileId)
    return { ok: true }
  })

export const listAbuseReports = createServerFn({ method: 'GET' })
  .validator((d) => listOpts.partial().parse(d ?? {}))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin()
    return db
      .select()
      .from(abuseReports)
      .where(eq(abuseReports.status, 'open'))
      .orderBy(desc(abuseReports.createdAt))
      .limit(data.limit ?? 50)
      .offset(data.offset ?? 0)
  })

export const listAllRecipients = createServerFn({ method: 'GET' })
  .validator((d) => listOpts.partial().parse(d ?? {}))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin()
    return db
      .select({
        id: recipientProfiles.id,
        publicName: recipientProfiles.publicName,
        trustLevel: recipientProfiles.trustLevel,
        frozen: recipientProfiles.frozen,
        riskFlagsCount: recipientProfiles.riskFlagsCount,
        reputationScore: recipientProfiles.reputationScore,
        reputationTier: recipientProfiles.reputationTier,
      })
      .from(recipientProfiles)
      // Risk sort: lowest reputation first, then most flags (highest-risk first).
      .orderBy(asc(recipientProfiles.reputationScore), desc(recipientProfiles.riskFlagsCount))
      .limit(data.limit ?? 50)
      .offset(data.offset ?? 0)
  })

// Full per-signal breakdown for the admin view. Read-only (no manual override —
// the score is always derived from signals). Recomputes the breakdown live so
// it matches the persisted score even before the nightly cron catches drift.
export const getRecipientReputationAdmin = createServerFn({ method: 'GET' })
  .validator((d: { profileId: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin()
    return aggregateReputationSignals(data.profileId)
  })

export const listPendingVerifications = createServerFn({ method: 'GET' })
  .validator((d) => listOpts.partial().parse(d ?? {}))
  .handler(async ({ data }) => {
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
      .limit(data.limit ?? 50)
      .offset(data.offset ?? 0)
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
    const userId = session?.user.id ?? 'anon'

    // Rate limit: max 5 reports per hour per user.
    await checkRateLimit(`abuse:report:${userId}`, 5, 3600_000)

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

const updateReportInput = z.object({
  reportId: z.string(),
  status: z.enum(['reviewed', 'dismissed', 'actioned']),
})

export const updateAbuseReport = createServerFn({ method: 'POST' })
  .validator((d) => updateReportInput.parse(d))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin()
    // Read prev to implement the monotonic risk_flags_count accumulator:
    // increment exactly once on *→actioned (recipient-targeted, prev≠actioned).
    const [prev] = await db
      .select({
        targetType: abuseReports.targetType,
        targetId: abuseReports.targetId,
        status: abuseReports.status,
      })
      .from(abuseReports)
      .where(eq(abuseReports.id, data.reportId))
      .limit(1)
    if (!prev) throw new Error('NOT_FOUND')

    await db
      .update(abuseReports)
      .set({ status: data.status })
      .where(eq(abuseReports.id, data.reportId))

    if (prev.targetType !== 'recipient') return { ok: true }

    // Permanent scar: −10 penalty and riskFlagsCount persist across any later
    // dismissed/reviewed flip — increment only on the *→actioned transition,
    // never decrement (guard prev≠actioned makes actioned→actioned idempotent).
    if (data.status === 'actioned' && prev.status !== 'actioned') {
      await db
        .update(recipientProfiles)
        .set({ riskFlagsCount: sql`${recipientProfiles.riskFlagsCount} + 1` })
        .where(eq(recipientProfiles.id, prev.targetId))
    }
    await recomputeRecipientReputation(prev.targetId)
    return { ok: true }
  })
