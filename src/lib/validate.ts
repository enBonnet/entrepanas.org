import { and, eq, gt, sql } from 'drizzle-orm'
import { env } from 'cloudflare:workers'

import { getDb } from '#/db'
import { campaigns, rateLimits } from '#/db/schema'
import { newId } from '#/lib/id'

import type { Database } from '#/db'

// ponytail: shared validation helpers — keep server fns thin.

/** Verifies the campaign belongs to the given recipient profile. */
export async function verifyCampaignOwnership(
  db: Database,
  campaignId: string,
  profileId: string,
): Promise<void> {
  const [c] = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(
      and(
        eq(campaigns.id, campaignId),
        eq(campaigns.recipientProfileId, profileId),
      ),
    )
    .limit(1)
  if (!c) throw new Error('FORBIDDEN')
}

/** Verifies the R2 object exists and returns its real metadata. */
export async function verifyR2Object(
  key: string,
): Promise<{ size: number; contentType: string }> {
  const head = await env.EVIDENCE_BUCKET.head(key)
  if (!head) throw new Error('OBJECT_NOT_FOUND')
  return {
    size: head.size,
    contentType: head.httpMetadata?.contentType ?? 'application/octet-stream',
  }
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Validates the real MIME type matches what was declared. */
export function validateMimeType(declared: string, real: string): void {
  if (!(ALLOWED_MIME as readonly string[]).includes(real)) {
    throw new Error('INVALID_MIME')
  }
  if (declared !== real) {
    throw new Error('MIME_MISMATCH')
  }
}

/** Validates the real file size matches what was declared (within 10% tolerance). */
export function validateFileSize(declared: number, real: number): void {
  if (real > declared * 1.1) {
    throw new Error('SIZE_MISMATCH')
  }
}

/** D1-based rate limiter. Throws RATE_LIMITED if the key exceeds max hits in windowMs. */
export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<void> {
  const db = getDb()
  const cutoff = new Date(Date.now() - windowMs)
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(rateLimits)
    .where(
      and(eq(rateLimits.key, key), gt(rateLimits.createdAt, cutoff)),
    )
  if (Number(row?.count ?? 0) >= max) throw new Error('RATE_LIMITED')
  await db.insert(rateLimits).values({
    id: newId(),
    key,
    createdAt: new Date(),
  })
}

/** Valid password: 8+ chars, at least one uppercase, one digit. */
export function validatePasswordStrength(password: string): void {
  if (password.length < 8) throw new Error('PASSWORD_TOO_SHORT')
  if (!/[A-Z]/.test(password)) throw new Error('PASSWORD_NO_UPPERCASE')
  if (!/[0-9]/.test(password)) throw new Error('PASSWORD_NO_DIGIT')
}

/** Valid campaign status transitions. */
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['active'],
  active: ['paused', 'closed', 'frozen'],
  paused: ['active', 'closed', 'frozen'],
  closed: [], // terminal
  frozen: [], // terminal (admin-only)
}

export function validateCampaignTransition(
  current: string,
  next: string,
): void {
  const allowed = VALID_TRANSITIONS[current]
  if (!allowed || !allowed.includes(next)) {
    throw new Error('INVALID_TRANSITION')
  }
}
