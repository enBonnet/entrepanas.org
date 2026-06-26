import { drizzle } from 'drizzle-orm/d1'
import { env } from 'cloudflare:workers'

import * as schema from './schema'

export type Database = ReturnType<typeof getDb>

// Bindings are per-request in Workers, so we build the Drizzle instance lazily
// inside request context (server fns / route handlers / loaders). `env` from
// `cloudflare:workers` is only populated within a request — never at module load.
export function getDb() {
  return drizzle(env.DB, { schema })
}

export { schema }
