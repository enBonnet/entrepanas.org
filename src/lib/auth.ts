import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { getRequest } from '@tanstack/react-start/server'

import { schema  } from '#/db'
import type {Database} from '#/db';

export type Auth = ReturnType<typeof createAuth>

// `db` is built per-request from the D1 binding (see src/db/index.ts), so the
// auth instance is constructed per request too — it's just config objects, cheap.
export function createAuth(db: Database) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: { enabled: true },
    user: {
      additionalFields: {
        role: { type: 'string', required: false, defaultValue: 'donor' },
      },
    },
    plugins: [tanstackStartCookies()],
  })
}

// Resolves the current session+user for a server function / loader.
export async function getSession(db: Database) {
  const request = getRequest()
  const session = await createAuth(db).api.getSession({ headers: request.headers })
  return session
}

export type SessionUser = {
  id: string
  name: string
  email: string
  role: 'donor' | 'recipient' | 'admin'
}

// Accepts Better Auth's session shape (role is string|null there) and any caller.
type AnySession = {
  user?: { id: string; name: string; email: string; role?: string | null } | null
} | null

export function requireRole(session: AnySession, roles: string[]) {
  const user = session?.user
  if (!user || !user.role || !roles.includes(user.role)) {
    throw new Error('FORBIDDEN')
  }
  return user as SessionUser
}
