# entrepanas

Lightweight, Cloudflare-native peer-to-peer **donation traceability**. Verified
recipients publish where they are (city/region) and how they get paid; donors
send money directly; recipients upload receipts/invoices/product photos; a
moderated public evidence timeline links money received to outcomes.

> Trust model, not payments. Entrepanas never touches funds — donors pay recipients
> directly via the recipient's own bank/wallet.

This is an effort from [build4venezuela.com](https://build4venezuela.com/).

## Stack

- **TanStack Start + React 19** on **Cloudflare Workers** (`@cloudflare/vite-plugin`)
- **Better Auth** (sessions + roles) with the Drizzle adapter
- **Drizzle ORM** over **Cloudflare D1** (SQLite-dialect — the all-Cloudflare DB)
- **Cloudflare R2** for images, via **direct browser uploads** (presigned PUT)
- Tailwind v4 + shadcn/ui

> Note: the build prompt mentioned Postgres, but Cloudflare has no hosted
> Postgres. We chose **D1** to stay 100% Cloudflare-native (your call). The
> scaffold was already SQLite, so D1 reuses it. Migrating to Postgres later is a
> bounded schema-dialect + data-export exercise.

## Prerequisites

- Node 20+
- A Cloudflare account (`wrangler login`)

## 1. Local setup

```bash
npm install
```

Create the local resources and configure secrets:

```bash
# D1 database (creates .wrangler/state for local dev)
npx wrangler d1 create entrepanas
#   -> paste the returned database_id into wrangler.jsonc for remote deploys

# R2 bucket
npx wrangler r2 bucket create entrepanas-evidence
```

Create an **R2 API token** for presigned uploads (Cloudflare dashboard →
R2 → Manage R2 API Tokens → "Edit" scope on `entrepanas-evidence`). Copy the
generated **Access Key ID** and **Secret Access Key** into `.dev.vars` (below).

Copy `.dev.vars.example` → `.dev.vars` and fill in:

```
BETTER_AUTH_SECRET=<run: npx -y @better-auth/cli secret>
R2_ACCESS_KEY_ID=<r2 access key id>
R2_SECRET_ACCESS_KEY=<r2 secret access key>
```

In `wrangler.jsonc`, set `"R2_ACCOUNT_ID"` (vars) to your Cloudflare account ID.

Generate auth/DB types and run the migration + seed on **local** D1:

```bash
npm run cf-typegen          # regenerate worker-configuration.d.ts
npm run db:generate         # drizzle-kit generate SQL (already committed)
npm run db:migrate:local    # apply migrations to local D1
npm run db:seed:local       # demo data
npm run dev                 # http://localhost:3000
```

Register at `/register`, then promote yourself to admin for review pages:

```bash
npx wrangler d1 execute entrepanas --local --command "UPDATE user SET role='admin' WHERE email='<yours>'"
```

## 2. R2 CORS (required for direct browser uploads)

Bucket → Settings → CORS policy (or `wrangler r2 bucket cors put`):

```json
[{
  "AllowedOrigins": ["http://localhost:3000", "https://<your-domain>"],
  "AllowedMethods": ["PUT"],
  "AllowedHeaders": ["Content-Type"],
  "MaxAgeSeconds": 3600
}]
```

## Environment reference

| Variable | Where | Purpose |
|---|---|---|
| `BETTER_AUTH_SECRET` | `.dev.vars` / secret | Auth signing |
| `R2_ACCESS_KEY_ID` | `.dev.vars` / secret | R2 presign |
| `R2_SECRET_ACCESS_KEY` | `.dev.vars` / secret | R2 presign |
| `R2_ACCOUNT_ID` | `wrangler.jsonc` vars | R2 endpoint host |
| `R2_BUCKET_NAME` | `wrangler.jsonc` vars | R2 bucket |
| `UPLOAD_MAX_BYTES` | `wrangler.jsonc` vars | Max upload (default 10485760) |

For production secrets: `wrangler secret put BETTER_AUTH_SECRET` (and the two R2 keys).

## Database commands

```bash
npm run db:generate         # generate migration SQL from schema
npm run db:migrate:local    # apply to local D1
npm run db:migrate:remote   # apply to remote D1 (needs CLOUDFLARE_D1_TOKEN etc.)
npm run db:seed:local       # demo seed
```

## Deploy

```bash
npm run build
npx wrangler deploy
```

Set production secrets first (`wrangler secret put …`) and put your
`database_id` in `wrangler.jsonc`.

## Architecture

**Bindings** are accessed via `import { env } from "cloudflare:workers"` — works
in dev (miniflare) and prod. `env.DB` (D1) and `env.EVIDENCE_BUCKET` (R2) are
per-request; `src/db/index.ts:getDb()` builds the Drizzle instance lazily inside
request context.

**Upload flow** (binary never touches the Worker):
1. Client → `authorizeUpload` → server returns a short-lived presigned PUT URL + object key.
2. Client `PUT`s the file **directly to R2**.
3. Client → `commitUpload` → server stores an `evidence_images` row (status `pending`).
4. Admin moderates; only `approved` + `public` images are served.

**Image reads** go through `GET /api/img/$id`, which enforces
visibility + moderation + ownership before streaming from R2. Identity docs are
`admin_only`; transfer proof is `private` by default.

**Privacy**: exact address, legal name, phone, email, and approximate lat/lng
are never returned by the public profile endpoint. Payout account numbers are
**masked** before storage (`maskAccountNumber`).

## Project structure

```
src/
  db/            schema.ts (16 entities + Better Auth tables), getDb()
  lib/           auth (Better Auth factory + session), r2 (presign), format, id
  server/        uploads, recipients, campaigns, donations, evidence, payouts, admin
  components/    ui (shadcn), upload-form, trust-badges
  routes/        public (/, /explore, /r/$, /c/$, /trust), dashboard/, admin/, /me, /donate
drizzle/         generated migrations (applied to prod by CI)
scripts/seed.sql demo seed — kept out of drizzle/ so CI never seeds prod
wrangler.jsonc   d1_databases + r2_buckets + vars
```

## Trust model (verification levels)

- **basic**: email + phone
- **identity_verified**: government ID + selfie (admin review, doc admin-only)
- **payout_verified**: payout method reviewed
- **location_verified**: city/region reviewed
- **trusted_recipient**: full cycle completed + admin approval

Public UI shows outcomes ("Identity verified", "Located in Caracas, Venezuela"),
never raw documents.
