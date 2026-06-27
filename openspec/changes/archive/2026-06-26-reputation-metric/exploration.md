# Exploration: reputation-metric

> Purpose: BOTH — an internal admin trust/risk score AND a public-facing reputation
> signal on profiles to help donors decide where to give. Covers recipients (primary)
> and donors (secondary).

## Current State

The platform already **collects** most of the raw signals a reputation metric needs, but
**derives almost nothing** from them. Concretely:

- **Verification ladder is a stub.** `recipientProfiles.trustLevel`
  (`none|basic|identity|payout|location|trusted`) is a column that defaults to `'none'` and is
  **never written by any code path**. `admin.setVerificationStatus` updates the three
  `*VerificationStatus` (`identity/payout/location`) fields but never recomputes `trustLevel`.
  The ladder described in AGENTS.md (`basic → identity_verified → payout_verified →
  location_verified → trusted_recipient`) is documented, not implemented.
- **`riskFlagsCount` is already public but never incremented.** `getPublicProfileBySlug`
  returns it to anyone, yet no path (including `updateAbuseReport` → `actioned`) bumps it. A
  reputational signal is leaking today with a value that is always 0.
- **Behavioral signals are present as raw data only** — never aggregated:
  - `donations` (`pledged|sent|received|disputed`, amount, donor, createdAt)
  - `donation_confirmations` (donor self-reports the send + transfer proof)
  - `expenses` + `expense_items` + `donation_expense_links` (recipient shows how funds were used)
  - `evidence_images` (`kind`, `visibility`, `moderation_status`, linked entity)
  - `recipient_verifications` + `verification_reviews` (admin decision audit trail)
  - `abuse_reports` (`open|reviewed|dismissed|actioned`)
  - `user.createdAt` (account age)
- **No donor reputation concept exists.** Donors are `user.role === 'donor'` with no profile,
  no verification ladder (that ladder is recipient-only), and no aggregation of their giving.
- **The only reputation UI today** is `TrustBadges` (3 chips: identity/payout/location
  verified-or-pending). There is no numeric score, no tier beyond the badge booleans, and no
  donor-side signal.
- **`/explore` does not rank by trust** — `listExploreProfiles` has **no `orderBy`**; results
  come back in rowid order.

## Affected Areas

- `src/db/schema.ts` — add materialized reputation columns (score/tier/updated_at) on
  `recipientProfiles`; likely a donor-reputation table or `user` columns for Phase 2.
- `src/lib/reputation.ts` (new) — single `recomputeRecipientReputation(profileId)` plus the
  `trustLevel` derivation that finally wires the existing stub.
- `src/server/admin.ts` — `setVerificationStatus`, `freezeRecipient`, `updateAbuseReport`
  must call recompute; add an admin-only breakdown endpoint; **fix `riskFlagsCount` increment**.
- `src/server/recipients.ts` — `getPublicProfileBySlug` (expose public tier/band, drop/hide
  raw `riskFlagsCount`), `listExploreProfiles` (rank by score).
- `src/server/donations.ts` — `confirmDonation` (pledged→sent) triggers recompute.
- `src/server/evidence.ts` — expense/evidence + moderation-approved → recompute.
- `src/components/` — extend `trust-badges.tsx` or add a `reputation-badge` for the public
  tier/score band; admin gets a breakdown view.
- `src/routes/explore.tsx`, `src/routes/r/$recipientSlug/index.tsx` — surface the signal.
- `src/routes/admin/recipients.tsx` — show breakdown + sort by risk.
- `wrangler.jsonc` — optional nightly Cron Trigger as a safety-net recompute.
- `drizzle/` — one migration.

## Approaches

1. **Materialized score on recipient, write-path recompute (recipient-first)**
   - Add `reputation_score` (0–100) + `reputation_tier` + `reputation_updated_at` on
     `recipientProfiles`. One pure `recomputeRecipientReputation(profileId)` aggregates
     verification ladder + donation volume + fulfillment evidence + abuse flags + account age,
     and writes back. Called from every relevant write path. Public surface: coarse tier/band
     only. Admin surface: full score + breakdown.
   - Pros: cheap reads (no per-request aggregates), single source of truth, fits the existing
     per-request `getDb()` pattern, enables an index for `/explore` ranking, finally derives
     the stubbed `trustLevel`.
   - Cons: write-path fan-out (must wire ~5 call sites), score can drift if a path is missed,
     one migration.
   - Effort: Medium.

2. **Computed-on-read (live aggregation per request)**
   - `getRecipientReputation(profileId)` runs COUNT/SUM aggregates across donations, expenses,
     evidence, abuse each load.
   - Pros: always fresh, no write wiring, no score column/migration.
   - Cons: N aggregate queries per profile load; `/explore` listing of 24 profiles → ~24×N
     queries per render on D1-at-the-edge; no ranking index; donor listing would be worse.
   - Effort: Medium.

3. **Hybrid: materialized + donor reputation table (covers BOTH fully)**
   - Approach 1 **plus** a donor-reputation model: confirmation rate (pledged→sent), donated
     volume, dispute count, account age → donor score/tier.
   - Pros: delivers the full "both" product decision.
   - Cons: donor signals are thin today (no donor identity verification, no chargeback/refund
     tracking, donations are self-reported pledges → high Sybil risk), so a donor score risks
     being weak/gamable early; more schema.
   - Effort: High.

4. **Minimal MVP: derive `trustLevel` tier badge only, defer numeric score**
   - Implement the ladder derivation + rank `/explore` by tier; keep public surface as the
     existing `TrustBadges`; add an admin risk view; no numeric score.
   - Pros: smallest diff, reuses existing UI, lowest privacy surface.
   - Cons: doesn't differentiate two `trusted` recipients; "reputation signal" barely exceeds
     what badges already imply.
   - Effort: Low.

## Recommendation

**Phased hybrid: Approach 1 now (recipient), Approach 3 later (donor).**

- **Phase 1 (recipient reputation):** materialized `reputation_score` + `reputation_tier` on
  `recipientProfiles`, derived by one `recomputeRecipientReputation` wired into the write
  paths (verification, donation confirmed, expense/evidence posted, abuse actioned, freeze),
  with a **nightly Cron Trigger** as a drift safety-net. Public surface exposes a **coarse
  tier/band** (not the raw 0–100, never raw abuse/dispute counts); admin gets the full score +
  breakdown and risk sorting. While here: **finally derive the stubbed `trustLevel`** and
  **fix `riskFlagsCount`** (increment on actioned abuse; stop leaking the raw count publicly).
  Rank `/explore` by score.
- **Phase 2 (donor reputation):** deferred. Donor signals are genuinely thin — there is no
  donor identity verification, no dispute/refund flow, and donations are self-reported pledges
  (Sybil-prone). Ship a **minimal** donor "reliability" hint from existing data (confirmation
  rate) once donor verification + a real dispute flow exist. Building a full donor score now
  would be a meaning-less and easily-gamed number.

This honors the ponytail/YAGNI convention (the existing `trustLevel` column and `riskFlagsCount`
are already-paid-for hooks), fits D1's edge model (materialized, cheap reads), and protects
privacy (coarse public projection).

## Risks

- **Privacy exposure:** `riskFlagsCount` is **already public today** (always 0, but still
  leaking). The new public projection must be a coarse tier/band only; raw abuse/dispute counts
  and any PII-adjacent aggregation stay admin-only.
- **Gaming / Sybil:** donations are self-reported (donor confirms the send); a recipient could
  fake donor accounts pledging/sending. Mitigate by weighting only `sent`/`received` confirmed
  donations, counting **unique** donors, and giving weight only to **moderation-approved**
  evidence. Recipients could also spam low-value expenses — dampen with a cap/decay.
- **D1 computation cost:** live aggregation per read is expensive at the edge; the
  materialized-column approach avoids it but needs disciplined write-path wiring (hence the
  nightly cron backstop).
- **Stale scores:** any write path that forgets to recompute causes drift — mitigated by the
  cron safety-net + the `reputation_updated_at` column.
- **Opaque-vs-gamable tension:** fully opaque scores frustrate users; fully transparent weights
  invite gaming. Publish *what factors matter*, not exact weights.
- **Enum mismatch:** schema uses short names (`identity|payout|location|trusted`); AGENTS.md
  uses `identity_verified|…`. Derivation logic must reconcile and document the mapping.
- **Frozen state:** a frozen recipient's score should effectively be hidden/zeroed publicly
  (their profile is already excluded from public endpoints, so this is mostly handled).
- **Thin donor signals:** a donor score built on the current data would be weak and gameable —
  the reason Phase 2 is deferred.

## Ready for Proposal

**Yes.** Before `sdd-propose`, confirm with the user:
1. **Phased scope** — recipient reputation now, donor reputation deferred until donor
   verification + a real dispute/refund flow exist (donor signals are too thin today).
2. **Public projection = coarse tier/band** (e.g., labels/0–4 band), not the raw 0–100 score,
   to protect privacy and reduce gaming. Raw score + breakdown = admin-only.
3. **Materialized score on write + nightly Cron Trigger safety-net** (not computed-on-read),
   to keep D1 edge reads cheap.
4. This work **finally wires up the stubbed `trustLevel`** and **fixes `riskFlagsCount`**
   (currently public-but-always-zero and never incremented).
