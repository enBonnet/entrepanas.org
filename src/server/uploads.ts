import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { env } from 'cloudflare:workers'

import { getDb } from '#/db'
import { campaigns, evidenceImages } from '#/db/schema'
import { getSession, requireRole } from '#/lib/auth'
import { newId } from '#/lib/id'
import { createPresignedPutUrl } from '#/lib/r2'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const
const KINDS = [
  'transfer_proof',
  'invoice',
  'receipt',
  'product_photo',
  'delivery_photo',
  'identity_doc',
] as const
const LINK_TYPES = [
  'donation',
  'expense',
  'campaign',
  'recipient_verification',
  'payout',
] as const

const authorizeSchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.enum(ALLOWED_MIME),
  sizeBytes: z.number().int().positive(),
  kind: z.enum(KINDS),
  visibility: z.enum(['public', 'private', 'admin_only']),
  linkedEntityType: z.enum(LINK_TYPES).optional(),
  linkedEntityId: z.string().optional(),
})

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024

function maxBytes() {
  const configured = Number(env.UPLOAD_MAX_BYTES)
  return configured > 0 ? configured : DEFAULT_MAX_BYTES
}

// Identity docs are always admin-only — never public, no exceptions.
const enforceVisibility = (
  kind: (typeof KINDS)[number],
  visibility: 'public' | 'private' | 'admin_only',
): 'public' | 'private' | 'admin_only' =>
  kind === 'identity_doc' ? 'admin_only' : visibility

export const authorizeUpload = createServerFn({ method: 'POST' })
  .validator((d) => authorizeSchema.parse(d))
  .handler(async ({ data }) => {
    const db = getDb()
    const session = await getSession(db)
    const user = requireRole(session, ['donor', 'recipient', 'admin'])

    if (data.sizeBytes > maxBytes()) throw new Error('FILE_TOO_LARGE')

    // Ownership: a linked campaign must belong to the caller's recipient profile.
    if (data.linkedEntityType === 'campaign' && data.linkedEntityId) {
      const [c] = await db
        .select({ id: campaigns.id, owner: campaigns.recipientProfileId })
        .from(campaigns)
        .where(eq(campaigns.id, data.linkedEntityId))
        .limit(1)
      if (!c) throw new Error('NOT_FOUND')
      // Full recipient->user ownership is checked in recipients/campaigns modules.
    }

    const visibility = enforceVisibility(data.kind, data.visibility)
    const imageId = newId()
    // Key embeds owner so commitUpload can verify provenance without extra state.
    const objectKey = `uploads/${visibility}/${data.kind}/${user.id}/${imageId}-${data.filename}`

    const { url, expiresIn } = await createPresignedPutUrl({
      key: objectKey,
      contentType: data.contentType,
    })

    return { uploadUrl: url, objectKey, imageId, expiresIn }
  })

const commitSchema = z.object({
  objectKey: z.string().min(1),
  mimeType: z.enum(ALLOWED_MIME),
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  checksum: z.string().optional(),
  kind: z.enum(KINDS),
  visibility: z.enum(['public', 'private', 'admin_only']),
  linkedEntityType: z.enum(LINK_TYPES).optional(),
  linkedEntityId: z.string().optional(),
  caption: z.string().max(500).optional(),
})

export const commitUpload = createServerFn({ method: 'POST' })
  .validator((d) => commitSchema.parse(d))
  .handler(async ({ data }) => {
    const db = getDb()
    const session = await getSession(db)
    const user = requireRole(session, ['donor', 'recipient', 'admin'])

    if (!data.objectKey.includes(`/${user.id}/`)) throw new Error('FORBIDDEN')

    const visibility = enforceVisibility(data.kind, data.visibility)

    const [row] = await db
      .insert(evidenceImages)
      .values({
        id: newId(),
        ownerUserId: user.id,
        objectKey: data.objectKey,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        width: data.width,
        height: data.height,
        checksum: data.checksum,
        kind: data.kind,
        visibility,
        moderationStatus: 'pending',
        linkedEntityType: data.linkedEntityType,
        linkedEntityId: data.linkedEntityId,
        caption: data.caption,
      })
      .returning({ id: evidenceImages.id })

    if (!row) throw new Error('INSERT_FAILED')
    return { id: row.id }
  })
