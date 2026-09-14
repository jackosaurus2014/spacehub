# SpaceNexus Research — the annual firm seat

Built 2026-09-14. **Not launched.** Availability sits behind one feature flag,
default OFF, so the launch date stays the founder's call.

Origin: `docs/COMPETITOR_REVIEW_2026-09-10.md` item 14 — "the intelligence briefs
+ funding DB + supply-chain map could become an annual SpaceNexus Research seat
for firms", benchmarked against Payload Pro at $999/yr, and flagged there as "a
November decision".

---

## 1. How to launch it

Two environment variables in Railway:

| Var | Value | Effect |
|---|---|---|
| `RESEARCH_TIER_ENABLED` | `true` (exactly) | Makes the tier advertisable and buyable |
| `STRIPE_PRICE_RESEARCH_YEARLY` | `price_…` | The Stripe price checkout charges |

**The founder must create the Stripe price**: a *recurring, yearly* price of
**$999 USD** on a new "SpaceNexus Research" product. It is deliberately NOT one
of the existing `STRIPE_PRICE_ENTERPRISE_*` vars — those point at the withdrawn
$49.99/month Enterprise plan, and selling an annual firm seat against a monthly
price would mischarge every buyer.

With the flag off:
- `/pricing` shows two plans. The Research band renders `null` — it asks
  `/api/research/availability` and the server says no.
- `/research` redirects to `/pricing`.
- `POST /api/stripe/checkout` with `tier: 'research'` returns a validation error.

With the flag on but the price missing, availability is still `false` and
checkout refuses with a clear message. It never falls back to another price.

Turning the flag back off stops new sales; it does not revoke an existing
subscriber's access. (There are none while it has never been on.)

Two things are deliberately left for launch day rather than done now, because
both would advertise the tier before the founder decides to:

- `/research` is **not** in `src/app/sitemap.ts`. While the flag is off the page
  307s to `/pricing`, and a sitemap entry that redirects is a soft-404. Add it
  when the flag goes on.
- It is not in the nav or `src/lib/site-directory.ts` for the same reason.

---

## 2. The tier key, and the legacy `enterprise` rows

A **new** key, `'research'`, was introduced — `'enterprise'` was *not* revived.

`'enterprise'` is the withdrawn $49.99/month plan collapsed into Pro on
2026-08-11 (`c940dce7`, one production row migrated). Reusing the key would have
been wrong in both directions:

- Mapping legacy rows to `'research'` hands a $999/yr product to someone paying
  a fifth of that, for free.
- Mapping them anywhere else strips access from a paying customer.

So `normalizeTier('enterprise')` still returns `'pro'`, and `priceIdToTier()`
still resolves the legacy enterprise price IDs to `'pro'`. `research-tier.test.ts`
pins both. **Migration required: none.** No existing row changes meaning.

Tier order is now `free < pro < research < test`, so every Pro gate also passes
for Research.

---

## 3. Capabilities, and the file that enforces each

Declared in `RESEARCH_CAPABILITIES` (`src/lib/research.ts`). `/research` and
`/pricing` render their bullets *from that array* — there is no hand-written
feature list anywhere, which is how the pricing-truth rule is kept structurally
rather than by discipline.

| Capability | Gate |
|---|---|
| Full-history exports (funding, supply chain, BOM risk, score history) | `src/app/api/research/export/[dataset]/route.ts` |
| Supply-chain exposure by portfolio | `src/app/api/research/exposure/route.ts` |
| Space Score history + methodology | `src/app/api/research/score-history/route.ts` |
| Saved screens with weekly change alerts | `src/app/api/research/screens/route.ts` |
| Quarterly sector report | `src/app/api/research/quarterly/route.ts` |
| 5 named seats | `src/app/api/research/seats/**` + `src/lib/research.ts` |

Each is backed by a `TIER_ACCESS` flag that is `true` for `research` and `false`
for both `pro` and `free`; `checkResearchCapabilitiesAreGated()` in
`src/lib/pricing-integrity.ts` fails the build's test run if that ever stops
being true.

Every gated route calls `requireResearchAccess()` (`src/lib/research-guard.ts`)
**first**, before reading a row. There is no client-side gate anywhere.

---

## 4. What was rejected

Recorded in `RESEARCH_REJECTED_CAPABILITIES` so it is not re-proposed:

- **Higher API rate limits** — Pro keys already reach the unlimited `enterprise`
  API tier (`src/lib/api-keys.ts`). Reselling volume means first taking it away.
- **Moving the supply-chain map, regulatory calendar or compliance suite up** —
  a downgrade for every current Pro member.
- **Research-only early access to news or briefs** — enthusiast content is free
  (founder principle, 2026-08-14).
- **An on-demand AI analyst** — standing rule: no user-facing AI endpoints.
- **Any Space Tycoon advantage** — no pay-to-win. `getSubscriberPerks('research')`
  returns the Pro perk table.
- **A commercial-use licence as a headline feature** — a contract term, not a
  gate; advertising it would put an unenforceable promise on `/pricing`.
- **Gating the current Space Score leaderboard, funding browsing or salary data**
  — all free today, all still free. Research sells the *history* and the *export*.

---

## 5. Seats

One payer, five named users. `ResearchAccount.seatsTotal` mirrors the Stripe
subscription item **quantity** and is the only authority on the count.

`resolveResearchAccess()` has exactly two doors:

1. **Owner** — `User.subscriptionTier` normalizes to `research` **and**
   `subscriptionStatus === 'active'` **and** the `ResearchAccount` is active.
2. **Seat** — an `active` `ResearchSeat` naming the user, whose owner is *still*
   an active Research subscriber, whose `ResearchAccount` is active, and whose
   position among that firm's active seats (ordered `acceptedAt, createdAt, id`)
   falls inside `seatsTotal - 1`.

The cap is applied **at read time**, never trusted from the seat rows. Lowering
the Stripe quantity de-authorizes the newest seats on the very next request —
no reconciliation job, no window of over-entitlement.

A seat grants the **Research capability set only**. It never writes
`User.subscriptionTier`, so it cannot leak into an unrelated Pro gate, and it
carries no billing authority: seat administration requires `via === 'owner'`.
`/research` says this in plain words rather than implying a seat is a Pro
subscription.

Invites are single-use, SHA-256-hashed, 14-day, bound to the invited address,
and only accepted by a signed-in account whose **verified** email matches.

---

## 6. Time loops

- **Daily** — `/api/cron/space-score-snapshot` (02:10 UTC). Runs regardless of
  the flag: score history cannot be backfilled, so collection has to start
  before launch or the tier ships promising a series it does not have.
- **Weekly** — `/api/cron/research-screens` (Mon 13:00 UTC). Re-checks
  authorization per screen; sends nothing when a result set is unchanged; a
  first run is a baseline, not an alert.
- **Quarterly** — the sector report, served for completed quarters only.

---

## 7. Models

Five additive, relation-free Prisma models: `ResearchAccount`, `ResearchSeat`,
`ResearchPortfolio`, `ResearchScreen`, `SpaceScoreSnapshot`. Joined in
application code by id, so nothing in the long-lived `User`/`CompanyProfile`
graph had to move, and retiring the tier is a table drop rather than a migration.
