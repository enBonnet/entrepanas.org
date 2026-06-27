import { and, countDistinct, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { env } from 'cloudflare:workers'

import { getDb } from '#/db'
import {
  campaigns,
  donations,
  evidenceImages,
  recipientProfiles,
} from '#/db/schema'

// Recipient reputation is materialized on write. This module is the single
// source of truth for how the six signal families compose into a 0–100 score,
// a coarse public tier, and the trustLevel rung. Public = tier word + icon
// only; raw score/counts are admin-only (see server projections).

export type ReputationTier = 'nuevo' | 'en proceso' | 'verificado' | 'confiable'

export const TIER_ICON: Record<ReputationTier, string> = {
  nuevo: 'sprout',
  'en proceso': 'leaf',
  verificado: 'badge-check',
  confiable: 'shield-check',
}

export type RecipientTrustLevel =
  | 'none'
  | 'basic'
  | 'identity'
  | 'payout'
  | 'location'
  | 'trusted'

export type ReputationBreakdown = {
  identity: number
  payout: number
  location: number
  fulfilledCampaigns: number
  approvedEvidence: number
  uniqueDonors: number
  longevity: number
  abusePenalty: number
}

export type ReputationSignals = {
  score: number
  tier: ReputationTier
  trustLevel: RecipientTrustLevel
  riskFlagsCount: number
  breakdown: ReputationBreakdown
}

// Signal weights — single place to tune (matches spec.md signal table).
//
// TODO(self-check, verify phase 7.1): once the vitest harness is bootstrapped
// (strict_tdd currently deferred per openspec/config.yaml), table-drive these:
//   - tierForScore boundaries (0/24/25/49/50/74/75/100)
//   - deriveTrustLevel ladder (trusted=all-three; location>payout>identity; none)
//   - longevity cap (400-day → exactly +10, 30-day → +2, 29-day → 0)
//   - score clamp (max-positive→100, heavy-abuse→0)
//   - abuse permanence: riskFlagsCount read from column (never COUNT) * -10
// Pure math verified ad-hoc during apply (15/15 cases); commit as real tests.
const PTS = {
  identity: 15,
  payout: 15,
  location: 10,
  fulfilledCampaignEach: 8,
  fulfilledCampaignCap: 3, // → +24 max
  approvedEvidenceEach: 4,
  approvedEvidenceCap: 4, // → +16 max
  uniqueDonorEach: 3,
  uniqueDonorCap: 5, // → +15 max
  longevityPer30Days: 2,
  longevityCap: 10, // → +10 max (~5 months)
  abuseEach: -10,
} as const

// count is a raw signal COUNT (fulfilled campaigns / approved evidence /
// unique donors); `each` is the +pts per item; `capCount` the max items scored.
// The per-item multiplier MUST scale the count before capping — otherwise the
// +8/+4/+3 weight is dropped and the score is just the raw count (C1 bug).
// TODO(self-check, task 7.1): cap(2,8,3)===16; cap(5,8,3)===24 (cap enforced);
// cap(4,4,4)===16; cap(2,3,5)===6.
const cap = (count: number, each: number, capCount: number) =>
  Math.min(count * each, each * capCount)

/**
 * Tier is a pure monotonic function of score (0–24/25–49/50–74/75+).
 * TODO(self-check, task 7.1): tierForScore(0)==='nuevo'; (24)==='nuevo';
 * (25)==='en proceso'; (50)==='verificado'; (74)==='verificado'; (75)==='confiable'.
 */
export function tierForScore(s: number): ReputationTier {
  if (s >= 75) return 'confiable'
  if (s >= 50) return 'verificado'
  if (s >= 25) return 'en proceso'
  return 'nuevo'
}

/**
 * Highest verified rung attained; `trusted` requires identity∧payout∧location.
 * Priority on partial: location > payout > identity. `basic` is reserved
 * (recipients start at `none` — see design §Decision trustLevel mapping).
 */
// TODO(self-check, task 7.1): deriveTrustLevel({identity:true,payout:true,location:true})==='trusted';
// ({identity:true,payout:false,location:false})==='identity'; ({payout:true})==='payout';
// ({location:true})==='location'; ({identity:false,payout:false,location:false})==='none'.
export function deriveTrustLevel(v: {
  identity: boolean
  payout: boolean
  location: boolean
}): RecipientTrustLevel {
  if (v.identity && v.payout && v.location) return 'trusted'
  if (v.location) return 'location'
  if (v.payout) return 'payout'
  if (v.identity) return 'identity'
  return 'none'
}

function longevityPoints(createdAtMs: number, now = Date.now()): number {
  const days = Math.floor((now - createdAtMs) / 86_400_000)
  const steps = Math.floor(days / 30)
  return Math.min(PTS.longevityCap, steps * PTS.longevityPer30Days)
}

/**
 * Read-only signal aggregation for one recipient. Used by recompute (writes)
 * and the admin breakdown (read). All reads go through the per-request getDb().
 */
export async function aggregateReputationSignals(
  profileId: string,
): Promise<ReputationSignals | null> {
  const db = getDb()
  const [p] = await db
    .select({
      identityVerificationStatus: recipientProfiles.identityVerificationStatus,
      payoutVerificationStatus: recipientProfiles.payoutVerificationStatus,
      locationVerificationStatus: recipientProfiles.locationVerificationStatus,
      riskFlagsCount: recipientProfiles.riskFlagsCount,
      createdAt: recipientProfiles.createdAt,
    })
    .from(recipientProfiles)
    .where(eq(recipientProfiles.id, profileId))
    .limit(1)
  if (!p) return null

  const identity = p.identityVerificationStatus === 'verified'
  const payout = p.payoutVerificationStatus === 'verified'
  const location = p.locationVerificationStatus === 'verified'

  const identityPts = identity ? PTS.identity : 0
  const payoutPts = payout ? PTS.payout : 0
  const locationPts = location ? PTS.location : 0
  const abusePenalty = p.riskFlagsCount * PTS.abuseEach

  // Recipient's campaigns drive the remaining signals.
  const myCampaigns = await db
    .select({ id: campaigns.id, goalCents: campaigns.goalCents })
    .from(campaigns)
    .where(eq(campaigns.recipientProfileId, profileId))

  const campaignIds = myCampaigns.map((c) => c.id)
  // ponytail: an empty IN () is a no-op but SQLite/D1 dislike it; guard instead.
  let fulfilledCampaigns = 0
  let approvedEvidence = 0
  let uniqueDonors = 0

  if (campaignIds.length > 0) {
    // Fulfilled = goal set ∧ SUM(sent) ≥ goal ∧ ≥1 approved PUBLIC evidence.
    const sums = await db
      .select({
        campaignId: donations.campaignId,
        raised: sql<number>`coalesce(sum(${donations.amountCents}), 0)`.as('raised'),
      })
      .from(donations)
      .where(and(inArray(donations.campaignId, campaignIds), eq(donations.status, 'sent')))
      .groupBy(donations.campaignId)
    const raisedByCampaign = new Map(sums.map((s) => [s.campaignId, Number(s.raised)]))

    const goalsMet = myCampaigns.filter(
      (c) => c.goalCents && c.goalCents > 0 && (raisedByCampaign.get(c.id) ?? 0) >= c.goalCents,
    )
    const goalMetIds = new Set(goalsMet.map((c) => c.id))

    if (goalMetIds.size > 0) {
      const withProof = await db
        .select({ id: evidenceImages.linkedEntityId })
        .from(evidenceImages)
        .where(
          and(
            eq(evidenceImages.linkedEntityType, 'campaign'),
            inArray(evidenceImages.linkedEntityId, [...goalMetIds]),
            eq(evidenceImages.moderationStatus, 'approved'),
            eq(evidenceImages.visibility, 'public'),
          ),
        )
        .groupBy(evidenceImages.linkedEntityId)
      // Only campaigns that are goal-met AND have ≥1 approved public proof count.
      fulfilledCampaigns = withProof.length
    }

    // Moderation-approved evidence linked to the recipient's campaigns (any visibility).
    const [evCount] = await db
      .select({ n: sql<number>`count(*)`.as('n') })
      .from(evidenceImages)
      .where(
        and(
          eq(evidenceImages.linkedEntityType, 'campaign'),
          inArray(evidenceImages.linkedEntityId, campaignIds),
          eq(evidenceImages.moderationStatus, 'approved'),
        ),
      )
    approvedEvidence = Number(evCount?.n ?? 0)

    // Unique confirmed donors across the recipient's campaigns (sent or received).
    const [donorCount] = await db
      .select({ n: countDistinct(donations.donorUserId).as('n') })
      .from(donations)
      .where(
        and(
          inArray(donations.campaignId, campaignIds),
          inArray(donations.status, ['sent', 'received']),
          isNotNull(donations.donorUserId),
        ),
      )
    uniqueDonors = Number(donorCount?.n ?? 0)
  }

  const breakdown: ReputationBreakdown = {
    identity: identityPts,
    payout: payoutPts,
    location: locationPts,
    fulfilledCampaigns: cap(fulfilledCampaigns, PTS.fulfilledCampaignEach, PTS.fulfilledCampaignCap),
    approvedEvidence: cap(approvedEvidence, PTS.approvedEvidenceEach, PTS.approvedEvidenceCap),
    uniqueDonors: cap(uniqueDonors, PTS.uniqueDonorEach, PTS.uniqueDonorCap),
    longevity: longevityPoints(p.createdAt.getTime()),
    abusePenalty,
  }

  const raw =
    breakdown.identity +
    breakdown.payout +
    breakdown.location +
    breakdown.fulfilledCampaigns +
    breakdown.approvedEvidence +
    breakdown.uniqueDonors +
    breakdown.longevity +
    breakdown.abusePenalty

  const score = Math.max(0, Math.min(100, raw))

  return {
    score,
    tier: tierForScore(score),
    trustLevel: deriveTrustLevel({ identity, payout, location }),
    riskFlagsCount: p.riskFlagsCount,
    breakdown,
  }
}

/**
 * Recompute and persist score/tier/trustLevel for one recipient (the sole
 * writer to the reputation columns). Returns the recomputed signals so the
 * nightly cron can compare against the previously-persisted tier for drift.
 */
export async function recomputeRecipientReputation(
  profileId: string,
): Promise<ReputationSignals | null> {
  const signals = await aggregateReputationSignals(profileId)
  if (!signals) return null
  const db = getDb()
  await db
    .update(recipientProfiles)
    .set({
      reputationScore: signals.score,
      reputationTier: signals.tier,
      trustLevel: signals.trustLevel,
      reputationUpdatedAt: new Date(),
    })
    .where(eq(recipientProfiles.id, profileId))
  return signals
}

/**
 * Nightly drift safety-net: recompute every recipient, return how many had a
 * persisted tier that differed from the freshly-computed one.
 */
export async function recomputeAllRecipients(): Promise<{ recomputed: number; drift: number }> {
  const db = getDb()
  const rows = await db
    .select({ id: recipientProfiles.id, tier: recipientProfiles.reputationTier })
    .from(recipientProfiles)
  let drift = 0
  for (const r of rows) {
    const signals = await recomputeRecipientReputation(r.id)
    if (signals && signals.tier !== r.tier) drift += 1
  }
  return { recomputed: rows.length, drift }
}

/** Feature flag for the public tier projection (var, "1" = on). Dark by default. */
export function isPublicTierEnabled(): boolean {
  // wrangler types the var as its literal value, so coerce to widen the comparison.
  return String(env.REPUTATION_PUBLIC_TIER) === '1'
}
