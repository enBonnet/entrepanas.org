import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { getDb } from '#/db'
import { payoutMethods, recipientProfiles } from '#/db/schema'
import { getSession, requireRole } from '#/lib/auth'
import { newId } from '#/lib/id'
import { checkRateLimit } from '#/lib/validate'

const input = z.object({
  label: z.string().min(2).max(60), // e.g. "Pago móvil", "Cuenta bancaria"
  details: z.string().min(2).max(500), // free-text how-to-pay
})

async function myProfileId(userId: string) {
  const db = getDb()
  const [row] = await db
    .select({ id: recipientProfiles.id })
    .from(recipientProfiles)
    .where(eq(recipientProfiles.userId, userId))
    .limit(1)
  return row?.id
}

export const listMyPayouts = createServerFn({ method: 'GET' }).handler(async () => {
  const db = getDb()
  const session = await getSession(db)
  const u = requireRole(session, ['donor', 'recipient', 'admin'])
  const profileId = await myProfileId(u.id)
  if (!profileId) return []
  return db.select().from(payoutMethods).where(eq(payoutMethods.recipientProfileId, profileId))
})

export const createPayoutMethod = createServerFn({ method: 'POST' })
  .validator((d) => input.parse(d))
  .handler(async ({ data }) => {
    const db = getDb()
    const session = await getSession(db)
    const u = requireRole(session, ['recipient', 'admin'])
    const profileId = await myProfileId(u.id)
    if (!profileId) throw new Error('NO_PROFILE')

    // Rate limit: max 5 payout methods per day per profile.
    await checkRateLimit(`payout:create:${profileId}`, 5, 86400_000)

    await db.insert(payoutMethods).values({
      id: newId(),
      recipientProfileId: profileId,
      label: data.label,
      details: data.details,
      verificationStatus: 'pending',
    })
    return { ok: true }
  })
