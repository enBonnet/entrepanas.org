import { createFileRoute } from '@tanstack/react-router'

import { createAuth } from '#/lib/auth'
import { getDb } from '#/db'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => createAuth(getDb()).handler(request),
      POST: ({ request }) => createAuth(getDb()).handler(request),
    },
  },
})
