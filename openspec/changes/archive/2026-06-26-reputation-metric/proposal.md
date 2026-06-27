# Proposal: Recipient Reputation Metric

## Intent

`recipientProfiles.trustLevel` is a stub column **never written**; `riskFlagsCount` **leaks publicly** but is always 0; no reputation is derived from signals we already collect. Donors can't tell where to give — `/explore` ranks by rowid. Phase 1 ships a recipient reputation signal: a coarse public tier plus an admin breakdown, computed from existing data.

## Scope

### In Scope
- Materialized `reputation_score` + `reputation_tier` + `reputation_updated_at` on `recipientProfiles`
- One `recomputeRecipientReputation()` wired into write paths + nightly cron safety-net
- Derive the stubbed `trustLevel`; fix `riskFlagsCount` (increment on actioned abuse; stop leaking the raw count publicly)
- Public coarse tier; admin full breakdown + risk sort; rank `/explore`

### Out of Scope
- Donor reputation (Phase 2 — donor signals too thin / Sybil-prone today)
- Manual score override (score is always computed from signals)
- Raw score / counts / PII on public endpoints
- Decay mechanics (named as a signal; tuning deferred to design)
- Abuse penalty refund on dismissal — an actioned report is a permanent scar (no -10 refund if later dismissed/reversed)
- Longevity accrual past the +10 cap (capped at ~5 months; does not keep accruing)
- Distinct public "Suspendido" tier — frozen recipients are hidden via existing public-endpoint exclusion, no new tier label

## Capabilities

### New Capabilities
- `recipient-reputation`: score derivation, public tier projection (incl. `trustLevel` derivation + `riskFlagsCount` hardening), admin breakdown + risk sort, `/explore` ranking.

### Modified Capabilities
- None (no specs exist yet — `openspec/specs/` is empty).

## Approach

Points accumulate per signal, clamped 0–100; `reputation_tier` = threshold band (not a weighted sum). Materialized on write for cheap D1 edge reads; cron backstops drift. Public = words + icon tier only; admin = full breakdown.

**Signals (points design-tunable; exact thresholds to design phase):**

| Signal | Pts | Cap |
|---|---|---|
| Identity verification reached | +15 | — |
| Payout verification reached | +15 | — |
| Location verification reached | +10 | — |
| Fulfilled campaign (goal met + approved evidence) | +8 ea | +24 |
| Moderation-approved evidence item | +4 ea | +16 |
| Unique confirmed donor (sent/received) | +3 ea | +15 |
| Longevity per 30 days active | +2 | +10 |
| Actioned abuse report (inactivity signal) | -10 ea | floor 0 (permanent — no refund on dismissal) |

**Tiers (design-tunable):** 0–24 *Nuevo* · 25–49 *En proceso* · 50–74 *Verificado* · 75+ *Confiable*. Anti-Sybil: count unique confirmed donors + moderation-approved evidence only; caps dampen spam.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/db/schema.ts`, `drizzle/` | New | reputation cols + one migration |
| `src/lib/reputation.ts` | New | `recomputeRecipientReputation` + `trustLevel` derivation |
| `src/server/{admin,recipients,donations,evidence}.ts` | Modified | recompute on write; public projection; explore ranking; `riskFlagsCount` |
| `src/components/trust-badges.tsx` (+ reputation-badge) | Mod/New | public tier UI + admin breakdown |
| `src/routes/{explore,r/$recipientSlug,admin/recipients}.tsx` | Modified | surface tier; sort by risk |
| `wrangler.jsonc` | Modified | nightly cron trigger |

## Risks

| Risk | L/M/H | Mitigation |
|---|---|---|
| Privacy leak (`riskFlagsCount` already public) | High | coarse tier only; raw counts/PII admin-only |
| Gaming/Sybil on self-reported donations | Med | weight sent/received + unique donors + approved evidence; caps |
| Stale drift (missed write path) | Med | nightly cron + `reputation_updated_at` |
| Enum mismatch (schema vs AGENTS.md) | Low | reconcile + document mapping in design |
| D1 read cost | Low | materialized reads — no per-request aggregates |

## Rollback Plan

Single additive migration; no destructive changes. Feature-flag the public tier so it can be hidden while the score still computes. Rollback = drop the three columns (or leave unused) + revert projection to current `TrustBadges`; existing rows lose nothing.

## Dependencies

- Existing verification / donation / expense / evidence / abuse tables (read-only aggregation).
- Cloudflare Cron Trigger in `wrangler.jsonc`.

## Success Criteria

- [ ] Public profile shows tier words + icon; never raw score, counts, or PII.
- [ ] Admin sees full breakdown + risk sort; no manual override.
- [ ] `/explore` ranked by tier/score; `riskFlagsCount` no longer public; `trustLevel` populated.
- [ ] Write-path recomputes confirmed; cron shows negligible drift.
