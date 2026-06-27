# Archive Report — reputation-metric

**Change**: reputation-metric
**Project**: entrepanas (Engram: `entrepanas.org`)
**Archived**: 2026-06-26
**Archive path**: `openspec/changes/archive/2026-06-26-reputation-metric/`
**Canonical spec**: `openspec/specs/recipient-reputation/spec.md`
**Artifact store**: openspec (archive report additionally persisted to Engram per orchestrator request — hybrid report step)
**Mode**: intentional-with-warnings (user-approved)

## What Shipped

A recipient reputation system: a derived 0–100 score with a coarse public tier
(`Nuevo` / `En proceso` / `Verificado` / `Confiable`) plus an admin-only per-signal
breakdown. Materializes the previously-stubbed `trustLevel`, hardens the leaking
`riskFlagsCount` (made monotonic / admin-only), ranks `/explore`, and adds a nightly
cron safety-net recompute. Public surface is coarse words + icon only; raw score,
counts, and all PII stay admin-only. New capability — additive, additive-only rollback.

## Files Changed

**New files**
- `src/lib/reputation.ts` — score engine: `PTS` table, `cap()`, `tierForScore`, `deriveTrustLevel`, `recomputeRecipientReputation`, `recomputeAllRecipients`, `isPublicTierEnabled`
- `src/server.ts` — custom TanStack entrypoint re-exporting `handler.fetch` + `scheduled(){ ctx.waitUntil(recomputeAllRecipients()) }`
- `src/components/reputation-badge.tsx` — tier chip + icon
- `drizzle/0002_*.sql` — 3 `ADD COLUMN` + 2 `CHECK` + idempotent `risk_flags_count` backfill

**Modified**
- `src/db/schema.ts` — `reputationScore` int(0–100), `reputationTier` enum, `reputationUpdatedAt` on `recipientProfiles` (+CHECK constraints)
- `src/server/admin.ts` — recompute hooks in `setVerificationStatus`, `reviewEvidence`, `updateAbuseReport` (monotonic increment), `freezeRecipient`; `getRecipientReputationAdmin` (read-only breakdown, no override); `listAllRecipients` risk-sorted
- `src/server/donations.ts` — `confirmDonation` → profile recompute
- `src/server/evidence.ts` — `createExpense` → profile recompute
- `src/server/uploads.ts` — `commitUpload` → profile recompute
- `src/server/recipients.ts` — `getPublicProfileBySlug` (tier+icon when flag on, `riskFlagsCount` removed); `listExploreProfiles` ordered by `desc(reputationScore)`, score-leak guard
- `routes/r/$recipientSlug/index.tsx` — ReputationBadge when tier present, else TrustBadges
- `routes/explore.tsx` — tier surfaced on cards
- `routes/admin/recipients.tsx` — breakdown rendered
- `wrangler.jsonc` — `main: src/server.ts`, `triggers.crons: ["0 3 * * *"]`, var `REPUTATION_PUBLIC_TIER: "0"` (dark launch)

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| recipient-reputation | Created (new main spec) | 9 requirements, 11 scenarios. Additive copy — no destructive deltas, no requirements removed/modified/renamed. |

## Task Completion Gate — intentional-with-warnings reasoning

- **Implementation tasks (Phase 1–6, tasks 1.1–6.4): all `[x]`** — schema, core lib, 7 server wirings, projections & flag, cron entrypoint, UI. All proven by verify-report Spec Compliance Matrix.
- **Unchecked (4): 7.1–7.4** — these are **testing/verification tasks** under `## Phase 7: Verification` (vitest unit + integration + manual cron), NOT implementation tasks.
- Deferred per `openspec/config.yaml` (`strict_tdd: false`, documented: "deferred: no vitest harness yet; flip back to true after harness is bootstrapped"). Each task is annotated inline with its deferral reason. They are the source of W1/W2 below.
- This is NOT a stale-checkbox situation: the work is honestly marked incomplete and tracked as open operational risk. The orchestrator explicitly approved archive with W1/W2 recorded. No `sdd-apply` correction is owed — the checkboxes reflect ground truth.

Per skill rule: "If the user explicitly approves a non-critical partial archive or stale-checkbox reconciliation, record the exact reason in the archive report and mark the archive as intentional-with-warnings." — reason recorded above. No CRITICAL in verify-report (C1 closed).

## Verify Verdict

**PASS WITH WARNINGS** (re-verify after CRITICAL remediation).
- The sole CRITICAL (C1: `cap()` dropped the per-item multiplier, understating tiers) is **CLOSED** — proven by hand-computation in `verify-report.md`; a deserving recipient now lands in the correct tier.
- typecheck ✅ clean; `src/lib/reputation.ts` lints clean; build ✅.
- 11/12 spec scenarios compliant via source inspection (manual-verification mode agreed by project config); 1 WARNING (cron runtime unverified).

## Open Risks (carry into PR description + future sessions)

- **W1 — Cron `env` binding unverified at runtime (OQ3).** `src/server.ts:13` declares `scheduled(_controller, _env, ctx)` but ignores `_env`; `recomputeAllRecipients → getDb()` relies on the global `import { env } from 'cloudflare:workers'` being populated during cron invocation. Expected per Cloudflare semantics but not exercised — task 7.4 (manual cron test) deferred, needs deploy. **Fallback**: thread `env` into `getDb`/recompute for the cron path only. **OPEN, non-blocking for archive; blocking for production-trust.**
- **W2 — No runtime test harness** (`strict_tdd` deferred). All 11 scenarios are static-only. The `cap`/`tierForScore`/`deriveTrustLevel`/longevity math is hand-traced in verify-report but not runtime-proven. **Follow-up**: bootstrap vitest (task 7.1) + integration tests (7.2, 7.3) before treating this as production-trusted. **OPEN, non-blocking for archive.**
- **Pre-existing lint baseline in non-reputation files** (`errors.ts`, `validate.ts`, and `d ?? {}` validators in `admin.ts`/`recipients.ts`) — maintainer's in-flight work, out of scope; typecheck passes. Tracked as verify-report S1.
- **Design L123 doc inconsistency** — header `score: 62` ≠ breakdown sum (74). Pre-existing, untouched. Tracked as verify-report S3. Worth correcting if design is re-opened.

## Rollback Plan

Additive-only, low-risk:
1. Revert the wrangler var `REPUTATION_PUBLIC_TIER` to `"0"` (already dark) — public endpoints revert to `TrustBadges`; score still computes/persists. No data loss.
2. Revert `wrangler.jsonc` `main` to the previous entrypoint and remove the cron trigger to disable nightly recompute (columns remain; safe).
3. The three new columns (`reputationScore`, `reputationTier`, `reputationUpdatedAt`) are additive with defaults — dropping or ignoring them loses no existing recipient data. A migration dropping the columns is NOT required to roll back behavior.

## PR — NOT part of archive

Creating the PR is the orchestrator's **next** step (branch-pr skill), not part of this archive phase. No commit, push, or PR was created here.

## SDD Cycle Complete

Planned → specced → designed → tasked → applied → verified → **archived**.
Source of truth: `openspec/specs/recipient-reputation/spec.md`.
