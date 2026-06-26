# entrepanas — agent instructions

## Stack

TanStack Start + React 19 on **Cloudflare Workers** (`@cloudflare/vite-plugin`). D1 (SQLite) via Drizzle ORM. R2 for images (direct browser uploads, never touches Worker). Better Auth (sessions + roles). Paraglide JS i18n (base: es, cookie strategy). Tailwind v4 + shadcn/ui.

## Commands

```bash
npm run dev              # :3000
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run build            # vite build + cp instrument.server.mjs
npm run db:generate      # drizzle-kit generate
npm run db:migrate:local # wrangler d1 migrations apply entrepanas --local
npm run db:seed:local    # wrangler d1 execute entrepanas --local --file=./scripts/seed.sql
npm run cf-typegen       # regenerate worker-configuration.d.ts
npm run deploy           # build + wrangler deploy
```

## DB

- Schema: `src/db/schema.ts` (16 domain entities + Better Auth tables)
- Migrations: `drizzle/` (applied by CI before deploy)
- Seed: `scripts/seed.sql` — **kept out of `drizzle/`** so CI never seeds prod. Idempotent (deletes `seed-` prefixed rows first).
- Bindings: `import { env } from 'cloudflare:workers'` — `env.DB` (D1) and `env.EVIDENCE_BUCKET` (R2) are per-request. `getDb()` in `src/db/index.ts` builds Drizzle lazily inside request context.

## Auth

Better Auth with Drizzle adapter. Roles: `donor | recipient | admin`. `requireRole(session, roles)` in `src/lib/auth.ts`. Auth client in `src/lib/auth-client.ts`. Auth instance created per-request.

## i18n

Paraglide JS. Base locale: **es** (Spanish). Cookie strategy (no URL prefixes). Messages in `messages/{locale}.json`. Import: `import { m } from '#/paraglide/messages.js'`. SSR locale detection: `src/server/i18n.ts`. SEO always indexed in Spanish.

## Location

Venezuela-only. States/cities as compile-time constant in `src/lib/locations.ts` — no DB tables (24 fixed divisions, YAGNI). Server validates `region` as zod enum + city∈state via superRefine. Caracas metro area and central region at top of dropdowns.

## Upload flow

1. Client → `authorizeUpload` → server returns presigned PUT URL
2. Client PUTs directly to R2
3. Client → `commitUpload` → stores `evidence_images` row (status `pending`)
4. Reads gated through `/api/img/$id` (enforces visibility + moderation)

## Privacy

Exact address, legal name, phone, email, approximate lat/lng never returned by public profile endpoint. Payout account numbers masked before storage.

## Verification levels

`basic → identity_verified → payout_verified → location_verified → trusted_recipient`

## Project structure

```
src/
  db/            schema.ts, getDb()
  lib/           auth, r2, format, id, locations, utils, auth-client
  server/        recipients, campaigns, donations, evidence, payouts, admin, uploads, i18n
  components/    ui (shadcn), upload-form, trust-badges, language-switcher
  routes/        public (/, /explore, /r/$, /c/$, /trust), dashboard/, admin/, /me, /donate
```

## Conventions

- Path aliases: `#/*` and `@/*` → `./src/*`
- TypeScript strict: `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`
- shadcn: `npx shadcn@latest add <component>` (npm, not pnpm)
- Sentry optional (needs `VITE_SENTRY_DSN`), configured in `instrument.server.mjs`
- `.dev.vars` for local secrets; `wrangler secret put` for prod
- CI: push to main → `npm ci` → `npm run build` → `wrangler d1 migrations apply entrepanas --remote` → `wrangler deploy` (Node 24)
- `ponytail:` comments mark deliberate YAGNI simplifications — respect them
