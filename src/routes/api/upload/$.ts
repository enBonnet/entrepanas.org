import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'

import { getDb } from '#/db'
import { getSession, requireRole } from '#/lib/auth'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024

function maxBytes() {
  const configured = Number(env.UPLOAD_MAX_BYTES)
  return configured > 0 ? configured : DEFAULT_MAX_BYTES
}

export const Route = createFileRoute('/api/upload/$')({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        const db = getDb()
        const session = await getSession(db)
        const user = requireRole(session, ['donor', 'recipient', 'admin'])

        const objectKey = params._splat as string

        // Key embeds owner: uploads/{visibility}/{kind}/{userId}/{imageId}-{filename}
        // Verify the caller owns this key (or is admin).
        if (user.role !== 'admin' && !objectKey.includes(`/${user.id}/`)) {
          return new Response('FORBIDDEN', { status: 403 })
        }

        const contentType = request.headers.get('Content-Type') ?? ''
        if (!(ALLOWED_MIME as readonly string[]).includes(contentType)) {
          return new Response('INVALID_MIME', { status: 400 })
        }

        const contentLength = Number(request.headers.get('Content-Length') ?? 0)
        if (contentLength > maxBytes()) {
          return new Response('FILE_TOO_LARGE', { status: 413 })
        }

        const body = request.body
        if (!body) return new Response('NO_BODY', { status: 400 })

        await env.EVIDENCE_BUCKET.put(objectKey, body, {
          httpMetadata: { contentType },
        })

        return new Response(null, { status: 204 })
      },
    },
  },
})