# Plan: Donor/Receiver choice at registration

## Context

Support two kinds of users — **donors** (see the bank account, transfer money, submit the
voucher) and **receivers** (create campaigns).

Investigation showed **almost all of this already exists**:

- Roles `donor` / `recipient` / `admin` are in the schema (`src/db/schema.ts`).
- Donors already see the bank account: `getPublicProfileBySlug` (`src/server/recipients.ts:130`)
  returns payout methods **with** their `details`, and the public profile page renders them with
  copy buttons (`src/routes/r/$recipientSlug/index.tsx:83-118`) — for any *verified* payout method.
- Donors already submit the voucher ("baucher"): `confirmDonation()` uploads a transfer-proof
  image (`src/server/donations.ts:56`).
- Receivers already create campaigns: `createCampaign()` (`src/server/campaigns.ts:32`).

The **only real gap** is the registration flow. Today `register.tsx` has no role choice:
everyone is created as `donor` and sent to `/dashboard/profile` — the *receiver* onboarding
(create a recipient profile). A pure donor doesn't need that page. Users only become `recipient`
later, as a side effect of creating a profile (`recipients.ts:84`).

**Goal:** let people self-identify at signup and route them to the right next step. No schema,
auth, or server changes — the existing "create a profile → auto-promote to recipient" mechanism
already handles role assignment.

## Approach: UI choice + smart redirect

Add a donor/receiver toggle to the register form. The choice is **UI-only** and controls just the
post-signup redirect. Everyone is still stored as `donor`; choosing "receiver" sends them to
profile creation, which auto-promotes them to `recipient`.

### 1. `src/routes/register.tsx`

- Add local state `const [role, setRole] = useState<'donor' | 'receiver'>('donor')`.
- Add a segmented control / radio group above the name field, using the existing `Button`/`Label`
  primitives and the `island-shell` styling already in the form. Two options:
  - **Donor** — "I want to donate"
  - **Receiver** — "I want to receive donations / create campaigns"
- Keep `authClient.signUp.email({ name, email, password })` unchanged.
- Change the post-signup redirect (currently `navigate({ to: '/dashboard/profile' })`):
  - `receiver` → `/dashboard/profile` (existing receiver onboarding → creates profile →
    auto-promotes to recipient → can create campaigns)
  - `donor` → `/explore` (browse recipients/campaigns to donate)

### 2. i18n messages

Add keys to **both** `messages/en.json` and `messages/es.json` (paraglide source; the project uses
`m['register.*']()` everywhere — match that pattern). Suggested keys:

- `register.roleLabel` — "I want to…" / "Quiero…"
- `register.roleDonor` — "Donate" / "Donar"
- `register.roleReceiver` — "Receive help" / "Recibir ayuda"

(Optional short hints per option if the labels alone are unclear; keep it minimal.)

## Out of scope (already built — do NOT rebuild)

- Viewing bank/payout details as a donor.
- Voucher / transfer-proof submission.
- Campaign creation.
- Role persistence at signup (deliberately avoided to keep the diff small and avoid the
  "recipient with no profile yet" edge case in guards).

## Files

- `src/routes/register.tsx` — add toggle + conditional redirect (only real logic change).
- `messages/en.json`, `messages/es.json` — new `register.role*` keys.

## Verification

1. Run the app (dev script) and open `/register`.
2. Register as **Donor** → confirm redirect to `/explore`.
3. Register a second account as **Receiver** → confirm redirect to `/dashboard/profile`, create a
   profile, confirm role promotes to `recipient` (can now reach campaign creation).
4. Confirm the existing donor path still works end-to-end: open a recipient profile at `/r/$slug`,
   see verified payout/bank details, and submit a donation voucher via the confirm flow.
5. Toggle locale (ES/EN) on `/register` and confirm the new role labels render in both.
