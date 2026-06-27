import handler from '@tanstack/react-start/server-entry'

import { recomputeAllRecipients } from '#/lib/reputation'

// Custom Worker entrypoint: re-exports the TanStack Start fetch handler and
// adds the scheduled() Cron Trigger handler. The virtual server-entry module
// only exports fetch, so we wrap it here to expose the Cron path.
// OQ3: relies on `import { env } from 'cloudflare:workers'` being populated
// inside scheduled (used by getDb inside recompute) — verified manually with
// the cron curl test in tasks 7.4.
export default {
  fetch: handler.fetch,
  async scheduled(_controller: ScheduledController, _env: unknown, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        try {
          const result = await recomputeAllRecipients()
          console.log(
            `[reputation] cron recompute: ${result.recomputed} recipients, ${result.drift} drifted`,
          )
        } catch (err) {
          console.error('[reputation] cron recompute failed', err)
        }
      })(),
    )
  },
}
