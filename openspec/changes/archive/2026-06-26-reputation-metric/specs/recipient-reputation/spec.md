# Recipient Reputation Specification

## Purpose

Materializes a recipient reputation signal (score 0–100, coarse public tier, admin breakdown) derived from already-collected signals. Finally populates the stubbed `trustLevel`, hardens the leaking `riskFlagsCount`, and ranks `/explore`. Public surface is coarse words + icon only; raw score, counts, and PII stay admin-only.

## Requirements

### Requirement: Reputation Score Derivation

The system MUST recompute `reputation_score` on every reputation-affecting write path (verification change, donation confirmed, expense/evidence commit, moderation-approved evidence, abuse actioned, recipient freeze), accumulate per the table, and clamp to 0–100. It SHOULD persist `reputation_updated_at`.

| Signal | Pts | Cap |
|---|---|---|
| Identity verification reached | +15 | — |
| Payout verification reached | +15 | — |
| Location verification reached | +10 | — |
| Fulfilled campaign (goal met + approved evidence) | +8 ea | +24 |
| Moderation-approved evidence item | +4 ea | +16 |
| Unique confirmed donor (sent/received) | +3 ea | +15 |
| Longevity per 30 days active | +2 | +10 |
| Actioned abuse report | −10 ea | floor 0 |

#### Scenario: Write path triggers recompute

- GIVEN a recipient whose identity verification just reached `verified`
- WHEN the verification write path completes
- THEN `reputation_score` reflects the +15 contribution and `reputation_updated_at` is set

#### Scenario: Score clamped to 0–100

- GIVEN one recipient at maximal positive signals and one with many actioned abuse reports
- WHEN recompute runs for each
- THEN the first is capped at 100 (never above) and the second is floored at 0 (never negative)

### Requirement: Longevity Signal Cap

The system MUST award longevity at +2 per full 30 days active and MUST NOT accrue beyond +10.

#### Scenario: Longevity stops at cap

- GIVEN a recipient active 400 days
- WHEN recompute runs
- THEN longevity contributes exactly +10 (not ~+26) and further days add nothing

### Requirement: Public Tier Projection

Public endpoints MUST project only a coarse tier (`Nuevo` 0–24 / `En proceso` 25–49 / `Verificado` 50–74 / `Confiable` 75+) plus an icon. They MUST NOT return the raw `reputation_score`, raw signal counts, `riskFlagsCount`, or PII (exact address, legal name, phone, email, lat/lng). A frozen recipient MUST be hidden via existing public-endpoint exclusion; no `Suspendido` tier SHALL exist.

#### Scenario: Public profile returns tier only

- GIVEN a recipient with `reputation_score = 62` and 3 actioned abuse reports
- WHEN any caller fetches the public profile by slug
- THEN the response contains tier `Verificado` + icon only; raw score, abuse count, and all PII are absent

#### Scenario: Frozen recipient has no public tier

- GIVEN a frozen recipient with a computed tier
- WHEN any caller fetches a public recipient endpoint
- THEN the recipient is excluded (hidden) and no tier — and no `Suspendido` label — is returned

### Requirement: Trust Level Derivation

The system MUST populate the existing `recipientProfiles.trustLevel` from the verification ladder on every recompute. It MUST reconcile the schema short-name enum (`identity|payout|location|trusted`) with the AGENTS.md ladder (`basic → identity_verified → payout_verified → location_verified → trusted_recipient`); the exact mapping MUST be documented in the design artifact and applied consistently.

#### Scenario: trustLevel follows the ladder

- GIVEN a recipient who has reached identity + payout + location verification
- WHEN recompute runs
- THEN `trustLevel` advances to the highest rung attained and matches the documented mapping

### Requirement: Risk Flags Hardening

The system MUST increment `riskFlagsCount` exactly once when an abuse report transitions to `actioned`. An actioned report MUST be a permanent scar: the −10 penalty MUST NOT be refunded and `riskFlagsCount` MUST NOT be decremented if later dismissed/reversed. `riskFlagsCount` MUST NOT be returned by any public endpoint.

#### Scenario: Actioned abuse is permanent

- GIVEN a recipient with score 60 and `riskFlagsCount = 0`
- WHEN an abuse report is actioned, then later dismissed
- THEN score reflects −10 (50) and `riskFlagsCount = 1`, both persisting after dismissal, and `riskFlagsCount` is absent from any public response

### Requirement: Admin Breakdown and Risk Sort

The admin endpoint MUST return the full per-signal breakdown, `reputation_score`, `reputation_tier`, and `riskFlagsCount`. The system MUST NOT provide any manual score override. The admin recipient list MUST sort by risk — ascending `reputation_score` / descending `riskFlagsCount` (highest-risk first).

#### Scenario: Admin breakdown, no override, risk-sorted

- GIVEN recipients A (score 40) and B (score 80), and an admin-authenticated caller
- WHEN the admin requests the recipient list and A's breakdown
- THEN A precedes B (lower score first), and the breakdown shows per-signal points + score + tier + `riskFlagsCount`, with no field to set the score manually

### Requirement: Explore Ranking

`/explore` MUST rank recipients by `reputation_tier` descending, then `reputation_score` descending. Recipients without a computed score SHOULD sort last.

#### Scenario: Ranked by tier then score

- GIVEN a `Verificado` recipient (score 60) and an `En proceso` recipient (score 49)
- WHEN `/explore` lists recipients
- THEN the `Verificado` recipient precedes the other, and within a tier higher score precedes lower

### Requirement: Nightly Recompute Safety-Net

A nightly cron MUST recompute `reputation_score`, `reputation_tier`, `trustLevel`, and `riskFlagsCount` for all recipients. It SHOULD log the drift count (recipients whose recomputed tier differs from the persisted tier).

#### Scenario: Cron corrects drift

- GIVEN a recipient whose persisted score drifted from its true signals
- WHEN the nightly cron runs
- THEN persisted score/tier/trustLevel match the recomputed values and the run's drift count is recorded

### Requirement: Public Tier Feature Flag and Rollback

The public tier projection MUST be feature-flaggable. When off, public endpoints MUST revert to the current `TrustBadges` projection and MUST NOT surface the tier, while the score still computes and persists. Rollback MUST be additive-only: dropping or ignoring the three columns loses no existing data.

#### Scenario: Flag off reverts projection

- GIVEN the public-tier flag is disabled
- WHEN any caller fetches a public profile
- THEN the response surfaces `TrustBadges` as today (no tier) and the score is still computed on write paths
