# Tasks: Recipient Reputation Metric

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~420–520 (incl tests); ~330–400 w/o |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | single PR w/ size:exception **OR** PR1 (schema+reputation.ts+cron) → PR2 (wiring+UI+tests) |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

> `single-pr` + >400 ⇒ get maintainer `size:exception` before apply, OR chain: PR1 (schema+`reputation.ts`+cron) → PR2 (wiring+projections+flag+UI+tests).

## Phase 1: Schema & Migration

- [x] 1.1 `src/db/schema.ts`: add `reputationScore` int(0–100), `reputationTier` enum, `reputationUpdatedAt` to `recipientProfiles` + 2 `check()` (see design §Interfaces). Leave `riskFlagsCount`/`trustLevel`.
- [x] 1.2 `npm run db:generate` → `drizzle/0002_*.sql`; verify 3 `ADD COLUMN` + 2 `CHECK` + backfill `risk_flags_count` from actioned recipient abuse (design §Migration).
- [x] 1.3 `npm run db:migrate:local && npm run db:seed:local && npm run typecheck`; confirm backfill idempotent. _(migrated + seeded locally OK; typecheck ✓; backfill is absolute-set COUNT → idempotent)_

## Phase 2: Core — `src/lib/reputation.ts`

- [x] 2.1 Create `reputation.ts`: `ReputationTier`, `tierForScore`, `deriveTrustLevel` per design §Decision (mapping table).
- [x] 2.2 `recomputeRecipientReputation(profileId)`: 5 `getDb()` aggregates + verification rungs + clamp 0–100 per design §Signal aggregation.
- [x] 2.3 recompute writes back `score,tier,trustLevel,reputationUpdatedAt` (one UPDATE); reads `riskFlagsCount` column, never `COUNT` abuse.

## Phase 3: Server Wiring (7 sites)

- [x] 3.1 `admin.ts` `setVerificationStatus`: resolve profileId, recompute.
- [x] 3.2 `donations.ts` `confirmDonation`: join→campaign→profile, recompute.
- [x] 3.3 `admin.ts` `reviewEvidence`: owner→profile, recompute.
- [x] 3.4 `admin.ts` `updateAbuseReport`: read prev; if recipient ∧ `*→actioned` ∧ prev≠actioned → `risk_flags_count+1`; then recompute(targetId). Idempotent.
- [x] 3.5 `admin.ts` `freezeRecipient`: recompute.
- [x] 3.6 `evidence.ts` `createExpense`: campaign→profile, recompute.
- [x] 3.7 `uploads.ts` `commitUpload`: evidence→profile, recompute.

## Phase 4: Projections & Flag

- [x] 4.1 `recipients.ts` `getPublicProfileBySlug`: flag on ⇒ `{reputationTier,reputationIcon}`; **remove `riskFlagsCount`** (L179).
- [x] 4.2 `listExploreProfiles`: `.orderBy(desc(reputationScore))`; tier when flag on.
- [x] 4.3 `admin.ts`: add `getRecipientReputationAdmin(profileId)` (breakdown+score+tier+riskFlagsCount, no override); `listAllRecipients` `.orderBy(asc(score),desc(riskFlagsCount))`.
- [x] 4.4 `wrangler.jsonc`: var `"REPUTATION_PUBLIC_TIER":"0"` (dark).

## Phase 5: Cron Entrypoint

- [x] 5.1 Create `src/server.ts`: re-export `handler.fetch` + `scheduled(){ctx.waitUntil(recomputeAllRecipients())}` (select ids→recompute→log drift) per design §Interfaces.
- [x] 5.2 `wrangler.jsonc`: `"main":"src/server.ts"`; `triggers.crons:["0 3 * * *"]`.

## Phase 6: UI

- [x] 6.1 Create `src/components/reputation-badge.tsx` (tier chip + icon).
- [x] 6.2 `routes/r/$recipientSlug/index.tsx`: ReputationBadge when tier present, else `TrustBadges`.
- [x] 6.3 `routes/explore.tsx`: surface tier on cards.
- [x] 6.4 `routes/admin/recipients.tsx`: render breakdown.

## Phase 7: Verification

- [ ] 7.1 Unit (vitest): `tierForScore`, `deriveTrustLevel`, clamp 0/100, longevity cap (400-day→+10). _(deferred: no vitest harness yet; pure math verified ad-hoc 15/15 + TODO in reputation.ts)_
- [ ] 7.2 Integration: verification/confirmDonation/reviewEvidence; **abuse permanence** (actioned→dismissed keeps count+penalty); idempotent actioned→actioned. _(deferred to verify — needs harness)_
- [ ] 7.3 Integration: flag ON ⇒ tier only; flag OFF ⇒ TrustBadges revert. _(deferred to verify)_
- [ ] 7.4 Manual cron `curl "…/cdn-cgi/handler/scheduled?cron=0+3+*+*+*"`; verify drift log + `env` bound (OQ3); else thread env into recompute. _(deferred to verify — needs deploy; **OQ3 OPEN**)_
- [x] 7.5 `npm run typecheck && npm run lint && npm run build`. _(typecheck ✓, build ✓; lint: 7 PRE-EXISTING baseline errors in untracked `errors.ts` + inherited `(d ?? {})` validators — NOT from this change; reputation files lint-clean)_

## Open Items

- **Spec↔design tension:** spec "Nightly Recompute" lists recomputing `riskFlagsCount`; design makes it monotonic — tasks follow design, confirm. OQ1 trustLevel non-cumulative; OQ3 `env` in `scheduled` (7.4).
