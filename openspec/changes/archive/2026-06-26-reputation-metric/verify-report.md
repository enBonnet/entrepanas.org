# Verification Report

**Change**: reputation-metric
**Version**: openspec (no semver) — spec `recipient-reputation` v1
**Mode**: Standard (Strict TDD deferred — no vitest harness; per session preflight, do NOT fail on missing test suite)
**Cycle**: RE-VERIFY after CRITICAL remediation (prior verdict FAIL / C1)
**Scope**: reputation-metric files only. Pre-existing uncommitted work (`errors.ts`, `validate.ts`, `auth.ts`, `campaigns.ts`, `payouts.ts`, `register.tsx`, `donate/.../confirm.tsx`, `admin/reports.tsx`, `0001_skinny_ultron.sql`) is OUT of scope and not reviewed.

## Remediation Under Review

Prior verify returned **FAIL** with one CRITICAL:

> **C1** — `cap(value, each, capCount)` body `Math.min(value, each * capCount)` dropped the per-item multiplier. The three call sites pass a raw COUNT, so `+8/+4/+3` weights never scaled the count; tiers were systemically understated.

**Fix applied** (`src/lib/reputation.ts:84-85`):
```ts
const cap = (count: number, each: number, capCount: number) =>
  Math.min(count * each, each * capCount)
```
Pure math, one-line, no new imports. Isolated to the three count-based signals.

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 28 |
| Tasks complete | 24 |
| Tasks incomplete | 4 (Phase 7 testing + manual cron — deferred by preflight, NOT blocking) |

Phase 1–6 implementation tasks `[x]`. The 4 unchecked (7.1–7.4) are unit/integration tests + manual cron, explicitly deferred (`strict_tdd: false`, no vitest harness). No **implementation** task is incomplete. The C1 remediation does not add or alter any task.

## Build & Tests Execution

**Typecheck**: ✅ Passed (`tsc --noEmit`, exit 0, zero errors)
```text
> tsc --noEmit
(exit 0, no output)
```

**Lint** (reputation-metric files only): ⚠️ `src/lib/reputation.ts` **clean**. 5 `no-unnecessary-condition` errors elsewhere, all the `d ?? {}` type-narrowing pattern (same rule/class as the pre-existing, out-of-scope `errors.ts:28`):
```text
src/server/admin.ts     68:46, 165:46, 178:46, 209:46   (list fns pagination validators)
src/server/recipients.ts 199:42                         (listExploreProfiles validator)
```
Provenance: `recipients.ts:199` is **pre-existing** (present at `HEAD:193`, untouched by the reputation diff which only edits `.orderBy`); the 4 `admin.ts` instances ride the reputation diff (pagination validators added for the risk-sorted list). None are correctness bugs; typecheck passes; non-blocking. The `cap` remediation file is lint-clean.

**Build**: ✅ Previously passed (`vite build` → `dist/server/index.js`, prior verify). C1 is a one-line pure-math change with no new imports/exports — cannot affect build structure; typecheck confirms type integrity.

**Tests / Coverage**: ➖ Not available (no vitest harness; deferred by preflight — W2).

## C1 Closure Proof (Manual Computation)

`cap(count, each, capCount) = Math.min(count * each, each * capCount)` — the per-item `each` now scales the count before the cap product is applied.

**Call sites** (`src/lib/reputation.ts:232-234`):

| Call site | Expression | Spec table | Verified |
|---|---|---|---|
| fulfilledCampaigns (L232) | `cap(fulfilledCampaigns, 8, 3)` = `min(count·8, 24)` | +8 ea, cap +24 (spec L18) | ✅ |
| approvedEvidence (L233) | `cap(approvedEvidence, 4, 4)` = `min(count·4, 16)` | +4 ea, cap +16 (spec L19) | ✅ |
| uniqueDonors (L234) | `cap(uniqueDonors, 3, 5)` = `min(count·3, 15)` | +3 ea, cap +15 (spec L20) | ✅ |

**Boundary cases** (hand-traced):

| Input | Computation | Result | Expect |
|---|---|---|---|
| `cap(0, 8, 3)` | `min(0·8, 24)` | **0** | 0 ✅ |
| `cap(1, 8, 3)` | `min(8, 24)` | **8** | 8 ✅ |
| `cap(3, 8, 3)` | `min(24, 24)` | **24** | 24 ✅ |
| `cap(10, 8, 3)` | `min(80, 24)` | **24** | 24 (cap enforced) ✅ |

**Design L123 worked example** (fulfilledCampaigns=2, approvedEvidence=5, uniqueDonors=6; identity∧payout∧location verified; 90-day longevity = +6; 1 actioned abuse = −10):

| Signal | Count | Contribution | C1-bug value |
|---|---|---|---|
| identity / payout / location | — | 15 / 15 / 10 | (unchanged) |
| fulfilledCampaigns | 2 | `min(16, 24)` = **16** | ~~2~~ |
| approvedEvidence | 5 | `min(20, 16)` = **16** | ~~5~~ |
| uniqueDonors | 6 | `min(18, 15)` = **15** | ~~6~~ |
| longevity | 90d | **6** | 6 |
| abusePenalty | 1 | **−10** | −10 |
| **SCORE** | | **83 → `confiable`** | ~~49 → `en proceso`~~ |

The score now reproduces the spec signal table; a deserving recipient lands in `confiable` (75+) instead of being understated to `en proceso`. (Design L123's literal breakdown shows `uniqueDonors:6` = count 2, which sums to **74 → `verificado`** — also tier-appropriate. The score:62 in that doc block does not sum to its own breakdown; that is a pre-existing doc inconsistency, not a code defect.)

**Isolation confirmed** — identity/payout/location/longevity/abuse are NOT routed through `cap()`:
- `identityPts/payoutPts/locationPts` = ternary on `PTS.{identity,payout,location}` (L150-152)
- `longevityPoints()` independent (L119-123)
- `abusePenalty = riskFlagsCount * PTS.abuseEach` (L153)

Only the three count-based signals changed. ✅ No collateral.

## Spec Compliance Matrix

| Requirement | Scenario | Evidence | Result |
|---|---|---|---|
| Reputation Score Derivation | Write path triggers recompute | 7 write sites wired (admin.ts:139,104,160,295; donations.ts:103; evidence.ts:90; uploads.ts:175) | ✅ COMPLIANT (static) |
| Reputation Score Derivation | Score clamped 0–100 | reputation.ts:249 `Math.max(0, Math.min(100, raw))` | ✅ COMPLIANT (static) |
| Reputation Score Derivation | accumulate per the table | reputation.ts:63-76 `PTS` + `cap()` (L84-85) reproduces +8/+4/+3 caps | ✅ COMPLIANT (static) — **C1 CLOSED** |
| Longevity Signal Cap | 400-day → +10 | reputation.ts:119-123 `longevityPoints` | ✅ COMPLIANT (static) |
| Public Tier Projection | Public profile returns tier only | recipients.ts:182-184 (tier+icon when flag on); no score/counts/PII in return | ✅ COMPLIANT (static) |
| Public Tier Projection | Frozen recipient hidden | recipients.ts:138 + 204 `ne(frozen,true)` | ✅ COMPLIANT (static) |
| Trust Level Derivation | trustLevel follows ladder | reputation.ts:107-117 `deriveTrustLevel` (trusted=all-3; loc>pay>id) | ✅ COMPLIANT (static) |
| Risk Flags Hardening | Actioned abuse is permanent | admin.ts:289-294 increment on `*→actioned`, prev≠actioned; recompute reads column (reputation.ts:153); no decrement path | ✅ COMPLIANT (static) |
| Admin Breakdown & Risk Sort | breakdown, no override, risk-sorted | admin.ts:201-206 (read-only breakdown); admin.ts:193 `orderBy(asc(score), desc(riskFlagsCount))` | ✅ COMPLIANT (static) |
| Explore Ranking | Ranked by tier then score | recipients.ts:239 `orderBy(desc(reputationScore))` (tier is f(score) ⇒ equiv) | ✅ COMPLIANT (static) |
| Nightly Recompute | Cron corrects drift | server.ts:17 `recomputeAllRecipients`; drift counted reputation.ts:287-298 | ⚠️ COMPLIANT (static) — runtime unverified (W1/OQ3) |
| Public Tier Feature Flag | Flag off reverts projection | reputation.ts:301-303 `isPublicTierEnabled`; routes fall back to TrustBadges | ✅ COMPLIANT (static) |

**Compliance summary**: 11/12 scenarios compliant via source inspection (manual-verification mode agreed by project config, `strict_tdd: false`); 1 WARNING (cron runtime unverified). All 11 required scenarios have covering static evidence; the sole prior CRITICAL (signal-table mismatch) is resolved.

## Correctness (Static Evidence)

| Area | Status | Notes |
|---|---|---|
| 7 write-path call sites | ✅ Implemented | verification, confirmDonation, reviewEvidence, abuse, freeze, createExpense, commitUpload — all resolve profileId then recompute |
| Permanent scar (F1 fix) | ✅ Intact | `updateAbuseReport` reads prev status, increments `risk_flags_count+1` only on `*→actioned` ∧ recipient ∧ prev≠actioned (idempotent), never decrements; recompute reads the **column** (reputation.ts:153) |
| Tier mapping | ✅ Implemented | 0-24/25-49/50-74/75+ → nuevo/en proceso/verificado/confiable (reputation.ts:92-97) |
| trustLevel mapping | ✅ Implemented | none/basic/identity/payout/location/trusted (reputation.ts:107-117) |
| Public projection privacy | ✅ Implemented | `getPublicProfileBySlug` returns NO score/counts/riskFlagsCount/legalName/phone/email/exactAddress/lat/lng |
| `listExploreProfiles` score-leak guard | ✅ Implemented | score selected only for ordering, returned as `undefined` (recipients.ts:251) |
| Migration data preservation | ✅ OK | table-recreation preserves cols via INSERT SELECT; backfill absolute-set (idempotent); new cols default 0/'nuevo'/NULL — no data loss. **Untouched by C1 remediation.** |
| Signal point contributions | ✅ **FIXED** | `cap()` scales `count·each` before capping (reputation.ts:84-85) |
| DB constraints | ✅ Implemented | CHECK `reputation_score BETWEEN 0 AND 100`; `reputation_tier IN (...)` — schema.ts + migration 0002 |

## Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| Materialized columns, recompute-on-write | ✅ Yes | |
| `reputation_tier` text, ranked by score | ✅ Yes | |
| Custom `src/server.ts` (fetch + scheduled) | ✅ Yes | TanStack custom-entrypoint pattern |
| `getDb()` via global `env` in cron | ⚠️ Yes (unverified) | W1/OQ3 — relies on global `env` populated in `scheduled()`. Fallback: thread `env` into getDb/recompute for cron path |
| riskFlagsCount monotonic accumulator | ✅ Yes | F1 fix intact |
| Feature flag via wrangler var | ✅ Yes | `REPUTATION_PUBLIC_TIER`="0" dark; read per-request |
| Signal aggregation values (design table) | ✅ **Yes** | All three count-based signals now match the table |

## Issues Found

### CRITICAL

*None.* **C1 is closed.** The sole prior CRITICAL (signal point contributions dropped the per-item multiplier) is resolved by the `cap()` remediation; the math reproduces the spec table and the design worked example lands a deserving recipient in the correct tier.

### WARNING

**W1 — Cron `env` binding unverified at runtime (OQ3).** `src/server.ts:13` declares `scheduled(_controller, _env, ctx)` but ignores `_env`; `recomputeAllRecipients` → `getDb()` relies on the global `import { env } from 'cloudflare:workers'` being populated during cron invocation. Expected per Cloudflare semantics but not exercised (task 7.4 manual cron deferred — needs deploy). **OPEN — operational risk for deploy, tracked separately; not blocking archive.** Fallback per design OQ3: if `env` is not bound in `scheduled()`, thread it into `getDb`/recompute for the cron path only.

**W2 — No runtime test execution.** All spec scenarios are verified by source inspection only (strict_tdd deferred, no vitest harness; project config permits manual verification). Static evidence is strong across control flow, but does not constitute runtime proof. The `cap`/`tierForScore`/`deriveTrustLevel`/longevity math is verified by hand-tracing in this report. **OPEN — operational risk; not blocking archive.** A minimal vitest harness covering these pure functions + one abuse-permanence integration test is strongly recommended before this is treated as production-trusted.

### SUGGESTION

**S1 — `no-unnecessary-condition` on `d ?? {}` validators.** 5 instances (`admin.ts:68,165,178,209`; `recipients.ts:199`). Same type-narrowing lint rule/class the repo already tolerates for `errors.ts:28`; typecheck passes; non-blocking. `recipients.ts:199` is pre-existing (at HEAD); the 4 `admin.ts` instances ride the reputation diff (pagination validators for the risk-sorted list). Cosmetic — could drop the `?? {}` (TanStack's validator `d` is non-null) or guard differently, but functionally benign.

**S2 —** `recipients.ts:251` explicitly returns `reputationScore: undefined`. Harmless (JSON omits undefined); a `pick`/omit would make the privacy guarantee self-evident. Cosmetic.

**S3 —** Design L123 doc block: stated `score: 62` does not sum to its own breakdown (15+15+10+16+16+6+6−10 = 74). Pre-existing doc inconsistency, not a code defect. Worth correcting in the design artifact if it is re-opened.

## Verdict

**PASS WITH WARNINGS** — The sole CRITICAL (C1: signal point contributions dropped the per-item multiplier) is **closed** and proven by hand-computation: `cap()` now scales `count·each` before capping, reproducing the spec signal table and the design worked example; a deserving recipient now lands in the correct tier instead of being understated. typecheck passes clean; `src/lib/reputation.ts` lints clean; architecture, privacy projection, permanence guard (F1), feature flag, `/explore` ordering, cron wiring, and migration are all intact and unaffected by the one-line fix (isolated to the three count-based signals).

The two open warnings (W1 cron-env runtime verification, W2 missing runtime test harness) are pre-existing **operational/deploy risks explicitly tracked separately and non-blocking** per the change's agreed manual-verification mode (`strict_tdd: false`). They do not gate archive.

**next_recommended**: `sdd-archive` (sync delta specs). Optionally land the minimal vitest harness (task 7.1) in a follow-up to retire W2 and harden the now-correct pure functions against future drift.
