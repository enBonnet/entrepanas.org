# Design: Recipient Reputation Metric

## Technical Approach

Materialize `reputation_score` + `reputation_tier` + `reputation_updated_at` on `recipient_profile`. One pure `recomputeRecipientReputation(profileId)` in a new `src/lib/reputation.ts` aggregates the six signal families, clamps 0–100, and derives `trustLevel`. `riskFlagsCount` is NOT derived by recompute — it is a **monotonic accumulator** on the existing `recipient_profile.risk_flags_count` column, incremented exactly once inside `updateAbuseReport` on the `* → actioned` transition and never decremented (see decision below). recompute reads that column for the −10 abuse term. It is called from every reputation-affecting write path; a nightly Cron Trigger recomputes all recipients as a drift safety-net. Public endpoints project a coarse tier word + icon only (feature-flagged); admin gets the full per-signal breakdown + risk sort. `/explore` ranks by score. Maps to proposal Approach 1 and every spec requirement.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Read model | Materialized columns, recompute-on-write | Computed-on-read aggregates | D1 edge reads stay cheap; enables ranking; matches existing per-request `getDb()` |
| Tier storage | `reputation_tier` **text** (Spanish word), ranked by `reputation_score` | numeric band column | Tier is a pure monotonic function of score, so `ORDER BY score DESC` ≡ `tier DESC, score DESC` (spec) — one column, correct ordering |
| Cron entrypoint | Custom `src/server.ts` re-exporting `handler.fetch` + `scheduled` | inline scheduled in virtual entry | Official CF TanStack-Start "Custom Entrypoints" pattern; virtual `@tanstack/react-start/server-entry` can't export `scheduled` |
| `getDb()` in cron | Reuse global `env` from `cloudflare:workers` (no env-threaded overload) | pass `env` param through recompute | Same fn works in request + cron paths; `env` is bound per-invocation incl. `scheduled`. Keeps the lazy one-path shape |
| riskFlagsCount | **Monotonic accumulator** on existing `risk_flags_count`; increment on `* → actioned` only | `COUNT(status='actioned')` re-derive; forbid `actioned→dismissed`; append-only table | See dedicated decision below — this was a gate-failure (F1) fix |
| Feature flag | wrangler var `REPUTATION_PUBLIC_TIER` (`"1"`/`"0"`), read per-request via `env` | DB column / config table | Vars already used for flags; flip without deploy of code; score still computes when off |
| DB constraints | CHECK on `reputation_score BETWEEN 0 AND 100` + `reputation_tier IN (...)` | app-only clamping | Design rule: prefer DB constraints; recompute is sole writer but constraints are cheap insurance |

### Decision: Exact enum mapping (`trustLevel`)

Schema uses **short names**: `['none','basic','identity','payout','location','trusted']`. AGENTS.md ladder uses `_verified`/`_recipient` suffixes. Canonical mapping applied in recompute:

| Schema value | AGENTS.md rung | Reached when |
|---|---|---|
| `none` | — | no verification reached |
| `basic` | basic | **reserved** — not auto-set in Phase 1 (YAGNI; recipients start `none`) |
| `identity` | identity_verified | `identityVerificationStatus='verified'` |
| `payout` | payout_verified | `payoutVerificationStatus='verified'` |
| `location` | location_verified | `locationVerificationStatus='verified'` |
| `trusted` | trusted_recipient | all three `verified` |

Rule: `trusted` if identity∧payout∧location; else highest verified rung in priority `location > payout > identity`; else `none`. Deterministic, uses every enum value, matches "highest rung attained."

### Decision: `riskFlagsCount` as a monotonic accumulator (gate-failure F1 fix)

**Choice**: Increment the existing `recipient_profile.risk_flags_count` (schema.ts L142, present since migration `0000`, currently always 0) exactly once inside `updateAbuseReport` when `targetType='recipient'` ∧ `newStatus='actioned'` ∧ `prevStatus≠'actioned'`. **Never decrement.** recompute reads `recipientProfiles.riskFlagsCount` directly for the −10 abuse term — it does **not** `COUNT` abuse rows.

**Alternatives rejected**:
- **Re-derive `COUNT(status='actioned')`** (prior design): REJECTED. `updateAbuseReport` (admin.ts L205-214) has **no state guard** — the validator accepts `['reviewed','dismissed','actioned']` and blindly `UPDATE`s. So `actioned → dismissed` is allowed and would drop the count to 0, refunding −10 — violating spec.md L74 ("permanent scar — MUST NOT be decremented if later dismissed") and failing the design's own integration test (L132).
- **Option B — CHECK/guard forbidding `actioned → dismissed`**: REJECTED. Over-constrains beyond the spec. The spec does NOT forbid the transition; it forbids the *penalty refund*. B would block an admin from correcting an abuse report's status after a mistaken actioning.
- **Option C — append-only `risk_events` table**: REJECTED. A whole table to hold one monotonic integer is YAGNI; the column already exists.

**Rationale**: The spec literally says "increment `riskFlagsCount` exactly once when ... transitions to `actioned`" — that *is* the accumulator semantics, so this aligns design with spec. Smallest diff (no new column, no new table). Matches the design's materialized-on-write philosophy. The −10 penalty and the count both persist across any later `dismissed`/`reviewed` flip. Guard uses `prevStatus≠'actioned'` so `actioned → actioned` is idempotent (no double-increment) and `dismissed → actioned` on a never-actioned report still counts once.

## Data Flow

```
  update path (verification/donation/evidence/freeze)
    │
    ▼
  recomputeRecipientReputation(profileId)        src/lib/reputation.ts
    │  5 aggregate COUNT/SUM reads + read risk_flags_count (getDb())
    │  clamp 0–100 → tier → trustLevel
    ▼
  UPDATE recipient_profile (score, tier, trustLevel, updated_at)
    │
    ├── public projection (recipients.ts): tier word + icon ONLY, no raw score/counts
    └── admin projection (admin.ts): full breakdown + risk sort

  updateAbuseReport  (*→actioned, targetType='recipient', prev≠actioned)
    │
    ├─► UPDATE recipient_profile SET risk_flags_count = risk_flags_count + 1
    └─► recomputeRecipientReputation(targetId)   ← reads new count → applies −10

  nightly Cron Trigger ──scheduled()──► for each profileId: recompute(); count drift
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/db/schema.ts` | Modify | add `reputationScore`, `reputationTier`, `reputationUpdatedAt` + 2 CHECKs on `recipientProfiles` (`risk_flags_count` already exists — unchanged) |
| `drizzle/0002_<codename>.sql` | Create | `npm run db:generate` → additive `ALTER TABLE … ADD COLUMN` (3 cols) + one-shot backfill: `UPDATE recipient_profile SET risk_flags_count = (SELECT COUNT(*) FROM abuse_report WHERE target_type='recipient' AND target_id=recipient_profile.id AND status='actioned')` (absolute set, idempotent, populates the dormant column for pre-existing actioned abuse) |
| `src/lib/reputation.ts` | Create | `recomputeRecipientReputation(profileId)`, `tierForScore()`, `deriveTrustLevel()`, aggregation queries |
| `src/server.ts` | Create | custom entrypoint: `fetch: handler.fetch` + `scheduled()` recompute-all |
| `wrangler.jsonc` | Modify | `main: "src/server.ts"`; add `triggers.crons: ["0 3 * * *"]`, var `REPUTATION_PUBLIC_TIER` |
| `src/server/{admin,donations,evidence,uploads}.ts` | Modify | call `recomputeRecipientReputation` at the 7 write-path sites (table below) |
| `src/server/recipients.ts` | Modify | public projection (tier when flag on, drop `riskFlagsCount`); `listExploreProfiles` `orderBy(desc(score))` |
| `src/server/admin.ts` | Modify | `updateAbuseReport`: read prev status; on `targetType='recipient'` ∧ `*→actioned` ∧ prev≠actioned → `risk_flags_count = risk_flags_count + 1`; then call `recomputeRecipientReputation(targetId)`. Also add admin breakdown fn + `listAllRecipients` risk sort (`asc(score)`, `desc(riskFlagsCount)`) |
| `src/components/reputation-badge.tsx` | Create | public tier chip + icon (rendered when tier present, else existing `TrustBadges`) |
| `src/routes/{r/$recipientSlug/index,explore,admin/recipients}.tsx` | Modify | surface tier/breakdown |

### Write-path call sites

| Site | File | Why | Type |
|---|---|---|---|
| `setVerificationStatus` | admin.ts | verification rungs + trustLevel | signal-changing |
| `confirmDonation` | donations.ts | unique confirmed donors + fulfilled | signal-changing |
| `reviewEvidence` | admin.ts | approved-evidence + fulfilled | signal-changing |
| `updateAbuseReport` | admin.ts | increments `risk_flags_count` on `*→actioned` (recipient-targeted, prev≠actioned), then recompute applies −10 | signal-changing |
| `freezeRecipient` | admin.ts | keep tier current on unfreeze | defensive |
| `createExpense` | evidence.ts | per spec "expense commit" | defensive |
| `commitUpload` | uploads.ts | per spec "evidence commit" | defensive |

Each resolves `recipientProfileId` (join donation→campaign, evidence owner→profile, abuse target→profile) before calling `recompute`. The nightly cron backstops the defensive ones.

## Interfaces / Contracts

```ts
// src/lib/reputation.ts
export type ReputationTier = 'nuevo' | 'en proceso' | 'verificado' | 'confiable'
export function tierForScore(s: number): ReputationTier   // 0-24/25-49/50-74/75+
export function deriveTrustLevel(v: { identity:boolean; payout:boolean; location:boolean }): RecipientTrustLevel
export async function recomputeRecipientReputation(profileId: string): Promise<void>
```

Signal aggregation (inside recompute, all via `getDb()`):
- **fulfilled campaign** = campaign with `goalCents` set ∧ `SUM(sent donations) ≥ goalCents` ∧ ≥1 `approved` public evidence → +8 ea, cap 3 (+24)
- **approved evidence** = `COUNT(approved evidence_images linked to recipient's campaigns)` → +4 ea, cap 4 (+16)
- **unique confirmed donor** = `COUNT(DISTINCT donorUserId) WHERE status IN ('sent','received')` over recipient's campaigns → +3 ea, cap 5 (+15)
- **longevity** = `min(10, floor(daysSince(createdAt)/30) * 2)` → +2/30d, cap +10
- **abuse** = `recipientProfiles.riskFlagsCount * -10` (reads the accumulator column, NOT a `COUNT` of abuse rows), floored at 0 overall

Public projection (`getPublicProfileBySlug` / `listExploreProfiles`) — flag ON:
```ts
{ reputationTier: 'verificado', reputationIcon: '…' }   // NO score, NO counts, NO riskFlagsCount
```
Flag OFF: response identical to today (no `reputationTier`); UI falls back to `TrustBadges`.

Admin breakdown (`getRecipientReputationAdmin(profileId)`):
```ts
{ score: 62, tier: 'verificado', riskFlagsCount: 1,
  breakdown: { identity:15, payout:15, location:10, fulfilledCampaigns:16, approvedEvidence:16, uniqueDonors:6, longevity:6, abusePenalty:-10 } }
```

`/explore` ranking (recipients.ts):
```ts
.orderBy(desc(recipientProfiles.reputationScore))   // ≡ tier DESC, score DESC (tier is f(score))
```

`src/server.ts`:
```ts
import handler from '@tanstack/react-start/server-entry'
export default {
  fetch: handler.fetch,
  async scheduled(_event, _env, ctx) {
    ctx.waitUntil(recomputeAllRecipients()) // select all ids → recompute each → console.log drift count
  },
}
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | `tierForScore`, `deriveTrustLevel`, score clamping/caps, longevity cap | vitest, table-driven incl. 400-day→+10 boundary |
| Unit | recompute end-to-end on an in-memory D1 fixture | vitest + better-sqlite3 seed; assert score/tier/trustLevel/riskFlags |
| Integration | write-path triggers recompute (verification, confirmDonation, reviewEvidence, abuse accumulator) | seed → mutate → assert persisted score. **Abuse permanence (gate F1)**: `open→actioned` ⇒ count 0→1, score −10; then `actioned→dismissed` ⇒ count STILL 1, score STILL −10 (no refund). **Idempotency**: `actioned→actioned` ⇒ count unchanged (guard `prev≠actioned`) |
| Integration | public projection hides score/counts; flag-off reverts | call server fns with flag on/off |
| Manual | cron | `curl "http://localhost:3000/cdn-cgi/handler/scheduled?cron=0+3+*+*+*"`; assert drift logged |

## Migration / Rollout

Additive only: 3 new reputation columns with defaults on `recipient_profile`; existing rows get `score=0, tier='nuevo'`, no data loss. (`risk_flags_count` needs **no new column** — it has existed since migration `0000`; the migration only backfills its value.) The backfill `UPDATE` (absolute set from existing actioned recipient abuse) runs once in `0002`; nightly cron later re-derives scores for all recipients and surfaces drift. Feature-flag the public tier so it ships dark. Rollback = flip flag off (score keeps computing) or drop the 3 reputation columns (leave `risk_flags_count`; it reverts to the pre-change dormant-but-backfilled state). CI applies the migration before deploy (existing `wrangler d1 migrations apply … --remote`).

## Open Questions

- [ ] **trustLevel cumulative vs independent**: design picks "highest verified rung, trusted=all-three" (non-cumulative). If maintainers want strict ladder (payout requires identity), it is a one-line change in `deriveTrustLevel` — confirm before apply.
- [ ] **fulfilled-campaign evidence scope**: approved evidence "linked to recipient's campaigns" — confirm whether identity/payout verification evidence should count (currently excluded; only campaign-linked).
- [ ] **`env` binding in `scheduled`**: design assumes global `import { env } from 'cloudflare:workers'` is populated during cron invocation (per CF semantics). Verify in the manual cron test; if not, thread `env` into `getDb`/recompute for the cron path only.
