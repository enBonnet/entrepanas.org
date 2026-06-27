import { createFileRoute, notFound  } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { env } from 'cloudflare:workers'

import { getDb } from '#/db'
import { evidenceImages } from '#/db/schema'
import { getSession } from '#/lib/auth'

export const Route = createFileRoute('/api/img/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const db = getDb()
        const [img] = await db
          .select()
          .from(evidenceImages)
          .where(eq(evidenceImages.id, params.id))
          .limit(1)
        if (!img) throw notFound()

        const session = await getSession(db)
        const isOwner = session?.user.id === img.ownerUserId
        const isAdmin = session?.user.role === 'admin'

        // ponytail: assume-good-intent — public images are visible unless
        // explicitly rejected/redacted (admin takedown). Owner/admin see their
        // private/admin_only uploads regardless.
        const isPublic =
          img.visibility === 'public' &&
          img.moderationStatus !== 'rejected' &&
          img.moderationStatus !== 'redacted'
        const canSeePrivate = img.visibility === 'private' && (isOwner || isAdmin)
        const canSeeAdmin = img.visibility === 'admin_only' && isAdmin

        if (!isPublic && !canSeePrivate && !canSeeAdmin) throw notFound()

        const object = await env.EVIDENCE_BUCKET.get(img.objectKey)
        if (!object) throw notFound()

        const headers = new Headers()
        object.writeHttpMetadata(headers)
        headers.set('Content-Type', img.mimeType)
        headers.set(
          'Cache-Control',
          isPublic ? 'public, max-age=86400' : 'private, no-store',
        )
        return new Response(object.body, { headers })
      },
    },
  },
})
