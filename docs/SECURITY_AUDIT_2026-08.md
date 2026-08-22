# SpaceNexus Application Security Audit — August 2026

**Date:** 2026-08-22
**Scope:** Application layer (authorization, money paths, injection, data exposure, validation, rate limiting, cron/internal endpoints, secrets, headers, XSS)
**Out of scope:** Dependency scanning (handled separately — criticals cleared; 9 moderate/high remain behind deliberate post-relaunch semver-major bumps)
**Context:** Public relaunch on 2026-08-24 will bring new traffic and new adversarial attention.
**Surface audited:** 587 `route.ts` files under `src/app/api/`, `src/middleware.ts`, `next.config.js`, `prisma/schema.prisma`, and every `dangerouslySetInnerHTML` site in `src/`.

---

## Executive summary

The application's security fundamentals are **good**, and materially better than the codebase's size would predict. Specifically:

- **No SQL injection anywhere.** Zero `$queryRawUnsafe`/`$executeRawUnsafe` in `src/`; all raw SQL is tagged-template parameterised with value-only interpolation.
- **No XSS.** All ~120 `dangerouslySetInnerHTML` sites are JSON-LD (`JSON.stringify` + `<`-escaping), hardcoded constants, or `sanitize-html`-processed with a non-permissive config. User-submitted content never reaches an HTML sink.
- **No IDOR in the user-owned-resource surface.** All 150+ mutation sites across marketplace, teams, deal rooms, cap tables, messaging and account carry an ownership or membership predicate. Cap tables and deal rooms are among the best-written code in the repo.
- **No body-`profileId` IDOR in the game.** Every mutating Space Tycoon route resolves the actor from the session.
- **Stripe webhook handling is correct.** Signature verified against the raw body, fails closed when the secret is absent, and every handler is idempotent via a status guard.
- **Secrets are clean.** `.env` has never been committed; no hardcoded credentials in tracked source; all 8 `NEXT_PUBLIC_*` vars are legitimately public.
- **Headers are strong.** HSTS w/ preload, CSP with `frame-ancestors 'none'`, COOP, nosniff, referrer policy.
- **The compliance Q&A asker email is safe** — verified on two independent layers; it is never loaded by the public query.

The findings that matter are concentrated in three places: **three unauthenticated economic-resolution crons**, **four unauthenticated PII-disclosing GETs**, and **two client-controlled money/value inputs**. Six issues were fixed in this pass. The most serious remaining issue — client-authoritative game inventory — is a design-level problem that must not be rushed days before relaunch.

| Severity | Found | Fixed now | Proposed |
|---|---|---|---|
| Critical | 4 | 3 | 1 |
| High | 6 | 3 | 3 |
| Medium | 7 | 0 | 7 |
| Low | 5 | 0 | 5 |

---

## FIXED IN THIS PASS

### G1 — CRITICAL: Three economic-resolution crons had no authentication at all

**Files:**
- `src/app/api/space-tycoon/equity/resolve/route.ts:60`
- `src/app/api/space-tycoon/chair/resolve/route.ts:58`
- `src/app/api/space-tycoon/crisis/resolve/route.ts:34`

Each declared `export async function POST()` — **taking no `request` argument**, so it could not have inspected a header even in principle. The only mention of `CRON_SECRET` in all three files was a doc comment asserting they were "CRON_SECRET-authenticated via middleware.ts's cronPaths".

**That claim was false, and it had been copy-pasted across three waves.** `src/middleware.ts:263-328` uses `cronPaths` to *skip the CSRF check* when a valid secret is presented. It never *requires* one. With no Bearer token, control falls through to the Origin/Referer comparison at `src/middleware.ts:330-360`, which only checks `originUrl.host === host`.

**Exploit path (no account, no token):**
```bash
curl -X POST https://<host>/api/space-tycoon/equity/resolve \
     -H "Origin: https://<host>" -H "Content-Length: 0"
```
The forged same-origin `Origin` satisfies CSRF and the route executes. `equity/resolve` settles expired tender offers, transfers shares between holders, refunds escrow, pays dividends, opens distress tranches at a 15% discount, and records control changes. An attacker could drive settlement timing at will — e.g. firing it during a contested tender window to force resolution at a chosen moment. `chair/resolve` certifies Accord Chair elections and seats or vacates the Chair; `crisis/resolve` seals crisis cycles and publishes the world index.

**Fix applied:** all three now take `request` and call the existing fail-closed, timing-safe `requireCronSecret()` (`src/lib/errors.ts:305`) as their first statement. The false comments were replaced with an explanation of why middleware is not authentication, so the mistake is not copied a fourth time.

**Regression test:** `src/lib/__tests__/api-routes-security-regressions.test.ts` — for each of the three routes: anonymous POST with a forged same-origin header → 401; wrong bearer token → 401; correct token → not 401. **Mutation-verified**: reverting the check turns the two rejection tests red.

---

### D1-D4 — CRITICAL/HIGH: Unauthenticated bulk disclosure of user email addresses

Four public GETs selected `email: true` on a `User` join purely to render a display name. `src/middleware.ts` performs no auth gating, so any handler without its own session check is anonymously reachable. **Two independent audit agents converged on this same finding set.**

| # | File | Line | Exploit |
|---|---|---|---|
| D1 | `src/app/api/community/profiles/route.ts` | 57 | `GET /api/community/profiles?limit=50&page=N` — walk `page` to dump the email of every public professional profile. `?search=`/`?expertise=` allow targeting named individuals. GET had **no** `getServerSession` (the one in the file is inside POST). |
| D2 | `src/app/api/community/forums/[slug]/[threadId]/route.ts` | 50, 55 | `GET /api/community/forums/<slug>/<threadId>` returns `thread.author.email` **and** `posts[].author.email` — the email of the thread author and every replier, plus `isAdmin` (staff-account identification). `getServerSession` is called but only to decorate vote state; anonymous callers proceed. Chain: list categories → list threads → dump participants. |
| D3 | `src/app/api/mentors/route.ts` | 97 | `GET /api/mentors?limit=50` → `data[].user.email` for every mentor. |
| D4 | `src/app/api/mentors/[userId]/route.ts` | 34 | `GET /api/mentors/<userId>` → that user's email. No session check anywhere in the file. User ids come free from D1-D3. |

**D1 and D2 together enumerate essentially the entire registered user base's email addresses without a session** — a bulk-harvest primitive for phishing and credential stuffing, and a privacy exposure that gets materially worse the moment relaunch traffic arrives. Note that `src/middleware.ts:530` already classifies `/api/community/profiles` as "private" for cache-control purposes: the privacy intent existed, but nothing enforced it.

**Fix applied:** `email` removed from all eight `User`-join selects in these files (including the three on authenticated POST/PATCH paths, which returned it redundantly and were one careless refactor away from becoming the same bug). Each site carries a comment stating why the field must not return. Verified no UI consumes these fields.

**Regression test:** same file — walks the actual Prisma query argument tree for each route and fails if `email: true` reappears at any depth, plus an assertion that no `@` reaches the mentors response body. **Mutation-verified.** The mentors test was initially vacuous (the route skips the user lookup for an empty mentor list); it now seeds a mentor fixture and asserts the call occurred.

---

### M1 — HIGH: Prepaid ad budget could be inflated after payment

**File:** `src/app/api/ads/campaigns/[id]/route.ts:198-205` (pre-fix)

The self-serve ad model charges the campaign's declared budget **in full and upfront** while it is a draft (`/api/ads/checkout` → `checkSelfServeBudget`, clamped to $100–$5,000), and there is **no top-up flow**. But the PUT handler let the owner change `budget` in any status, validated only against `adCampaignUpdateSchema`, which permits up to **$1,000,000** (`src/lib/validations.ts:799-803`) — and against `campaign.spent`.

Ad delivery is gated purely on `spent < budget` (`src/lib/ads/ad-server.ts:104`).

**Exploit path:**
1. Create a draft campaign with the $100 minimum budget.
2. Pay $100 via `/api/ads/checkout`; webhook moves it to `pending_review`.
3. Admin approves → `active`. (Review happens *before* this step, so it does not catch what follows.)
4. `PUT /api/ads/campaigns/<id>` with `{"budget": 1000000}`.
5. The ad server now serves until `spent` reaches $1,000,000 — up to **$1M of ad delivery purchased for $100**.

**Fix applied:** the budget is now locked for non-admins once the campaign leaves `draft`, with a message pointing at `/contact` for larger campaigns. Admins can still adjust it, preserving the manual/invoiced path.

**Regression test:** `src/lib/__tests__/api-routes-ads-billing.test.ts` — owner raising budget on `pending_review` → 403 and no DB write; same on `active` → 403; owner editing an unpaid `draft` → 200 (not over-tightened); admin adjusting a paid campaign → 200.

---

### M2 — HIGH: Event ticket price was taken from the request body

**File:** `src/app/api/events/rsvp/route.ts:52-62, 120, 132` (pre-fix)

`paidTier` was pulled out of the **raw body**, bypassing the zod schema entirely (`validateBody(eventRsvpSchema, body)` ran, but `paidTier` was extracted separately with hand-rolled `typeof` checks). Its `amount` was passed straight to Stripe as `unit_amount`:

```ts
const amount = Math.round(tierData.amount);   // :120  — from the client
// ...
unit_amount: amount,                           // :132  — charged
```

**Exploit path:** any logged-in user POSTs `{"eventId":"...","status":"going","paidTier":{"tier":"vip","amount":50}}` and receives a Stripe Checkout for **$0.50** for any ticket. On completion the webhook marks the RSVP `paid: true, status: 'going'` — it records the underpayment and grants the ticket anyway.

There is **no server-side price to validate against**: `SpaceEvent` carries no ticket-pricing fields (`prisma/schema.prisma:616`), so this was a design flaw rather than a missing check.

**Fix applied:** the route now refuses any request carrying `paidTier` and the client-priced Stripe call was removed entirely. This breaks nothing live — `RSVPButton.tsx` is the only component that sends `paidTier`, and it is **not rendered anywhere** (`paidTiers` is never passed). An explicit `null` is still treated as "no paid tier".

**Follow-up required to re-enable paid tickets:** add ticket tiers and prices to the event model, look the price up server-side by tier name, and pass *that* to Stripe.

**Regression test:** `src/lib/__tests__/api-routes-events-rsvp.test.ts` (new) — a self-priced $0.50 ticket → 400 and **no Stripe session created**; a large self-chosen amount → 400; free RSVP still works; unauthenticated → 401.

---

## PROPOSED — NOT APPLIED (require a judgement call or carry relaunch risk)

### P1 — CRITICAL: Game inventory is client-authoritative, re-opening the $50B payout class

**Root cause:** `src/app/api/space-tycoon/sync/route.ts:138-141, 210, 340` writes `GameProfile.resources` **verbatim from the request body**. `clampPlausibleMoney` (`src/lib/game/ledger-reconcile.ts:132`) is applied to `money` only — there is no equivalent for `resources`, `buildingsData`, `shipsData`, `completedResearchList`, or `serviceCount`.

Consequently every route that "verifies holdings server-side" is verifying a client-authored number:

- **$20B contract:** sync `{"resources":{"antimatter_precursors":10}}`, then claim `cc_antimatter_race` — `checkContractFulfillment` (`src/lib/game/contract-bidding.ts:783-791`) reads `profile.resources` and pays, writing a ledger row that survives reconciliation as real money.
- **$50B contract:** `cc_pluto_expedition` uses `colony_established`, which correctly reads server-side `ColonyClaim` rows — but `src/app/api/space-tycoon/colonies/route.ts:68-121` creates one for **free**, with no cost or prerequisite.
- **Order-book money pump:** `src/lib/game/market-orderbook.ts:123-127` gates sells on `profile.resources`, so phantom goods can be sold into real buy orders backed by real escrow. Same shape in `bounties/route.ts:236-292`.
- `netWorth` is computed from the same client values, so leaderboard rank, league bracket, Frontier graduation and takeover valuation are all forgeable.

**Why not fixed here:** the fix belongs in `src/lib/game/**` economy internals, which this audit was explicitly scoped out of and which a parallel agent is actively editing. It is a server-authoritative-inventory migration, not a check — too large to land safely two days before relaunch.

**Recommendation:** treat as the top post-relaunch engineering item. Interim mitigations available cheaply: gate the two mega-payout contracts behind a flag, and put a cost/prerequisite on `colonies` POST.

### P2 — HIGH: Nine cron routes fail OPEN when `CRON_SECRET` is unset

All use `if (secret && mismatch) → 401`, so an **unset** env var skips the check entirely: `market/restock:15`, `market/mean-revert:43`, `demand-pools/update:44`, `labor/update:37`, `bidding/resolve:41`, `orbital-slots/resolve:30`, `zones/update:34`. Two additionally accept the secret **in the JSON body**, where it lands in request logs: `leagues/process-week:36-40`, `market/share/rollup:25-29`.

By contrast `alliance-cron:49`, `seasons/cron:105` and `rivals/snapshot:20` invert the logic and *do* fail closed in production. **The inconsistency is itself the hazard.**

**Not applied because:** converting these to `requireCronSecret` is correct, but it is a 9-file change to live scheduled jobs, and `src/lib/cron-scheduler.ts:275-278` only attaches the Bearer header *if* `CRON_SECRET` is set. If the variable is not actually set in Railway, tightening these would silently break nine crons. **Verify `CRON_SECRET` is set in Railway first, then convert all nine in one pass.**

### P3 — HIGH: `requireCronSecret`'s localhost escape hatch trusts a spoofable header

`src/lib/errors.ts:309-315` — when `CRON_SECRET` is unset, the helper allows any request whose `Host` header starts with `localhost`/`127.0.0.1`. `Host` is attacker-controlled. If the secret were ever unset or rotated to empty in production, every cron and `/init` endpoint becomes reachable by sending `Host: localhost`.

**Proposed:** gate that branch on `process.env.NODE_ENV !== 'production'`. **Not applied** for the same reason as P2 — it depends on deployment config I cannot verify from here, and it shares the "did the scheduler ever rely on this path" risk.

### P4 — HIGH: Client-reported progress on two reward-granting game routes

- `speed-runs/check/route.ts:38-105` builds the milestone-check `GameState` from `body.gameState`; the real profile is loaded but used only for `id`/`companyName`. Rewards are then credited authoritatively at `:243-260`.
- `seasons/progress/route.ts:32, 122-128` takes `progress` from the body — `{"progress": 999999999}` instantly completes any challenge and pays 50-150 `eventTokens` per tier crossed.

Both are one-function changes (read the profile, derive progress server-side) but they touch game reward logic mid-edit by another agent. Recommend immediately post-relaunch.

### P5 — MEDIUM: Pro trial can be restarted indefinitely

`src/app/api/subscription/route.ts:183` blocks a new trial only if one is *currently active* (`isTrialActive(user.trialEndDate)`). Once a 14-day trial expires, the user is back to `free` and can immediately start another — **free Pro forever**.

One-line fix (block if `trialStartDate` is non-null). **Not applied because it is a product-policy call, not an unambiguous bug**: it revokes re-trial eligibility from anyone who trialed previously, and the stated strategy is userbase-first with monetisation paused until ~November. Tradeoff is Jay's to make. Revenue impact today is near-zero (1 subscriber); it matters when monetisation resumes.

### P6 — MEDIUM: Alliance treasury perks have no rank check

`alliance-treasury/route.ts:118-157` selects `membership.role` and then never uses it for `action: 'activate_perk'` — **any member, including a `recruit`, can spend the alliance treasury.** Inconsistent with all three sibling routes (`alliance-research:124`, `alliance-projects:229` require leader/officer; `alliance-projects/contribute:82` caps recruits at 5%). Small fix; deferred only because it is a game route under concurrent edit.

### P7 — MEDIUM: Deal-room invite code leaked to viewer-role members; NDA gate bypassable

`deal-rooms/[id]/route.ts:24-41` and `deal-rooms/route.ts:21-38` use `include` with no `select` on `DealRoom`, shipping all scalars including `accessCode` (`prisma/schema.prisma:4400`). Anyone who self-joins as a `viewer` receives the room's master invite code and can re-issue access to third parties, bypassing the owner/admin-only invite path.

Separately, `deal-rooms/[id]/route.ts:30-32` returns the full `documents` array with **no NDA check**, while `deal-rooms/[id]/documents/route.ts:43-45` blocks the same data behind `ndaRequired && !ndaAcceptedAt`.

Deferred rather than applied because narrowing a `DealRoom` select could drop a field the deal-room UI reads; needs a UI pass to do safely. **Recommend early post-relaunch — this is confidential financial data.**

### P8 — MEDIUM: Other public-channel and roster exposures

- `teams/channels/[id]/route.ts:72` and `.../messages/route.ts:66` — a non-member reading a `visibility: 'public'` channel receives the hydrated `members` array **including every member's email**.
- `study-groups/[slug]/members/route.ts:12-27` — no session check; `isPrivate` is selected at `:20` and **never read**. Private group rosters are public.

### P9 — MEDIUM: Unauthenticated writes and metric inflation

- `company-profiles/recalculate/route.ts:50` — unauthenticated **GET that writes** to the DB (deliberate per the comment at `:19`). Value is deterministically recomputed so impact is bounded, but a write on GET is CSRF-reachable and cache-poisoning-adjacent.
- `company-profiles/[slug]/analytics/route.ts:125-129` — anonymous `POST {"event":"view"}` increments sponsor view/click counts with no dedup or rate limit; sponsor-facing metrics are arbitrarily inflatable.
- `sessions/[id]/questions/[qid]/upvote/route.ts:36-40` — `increment: 1` with no vote record; loop to pin any question. (The forum vote routes do this correctly with `ThreadVote`/`PostVote` rows.)
- `space-tycoon/market/init/route.ts:11` — POST with no auth; only upserts static resource definitions and preserves `currentPrice`, so no economic impact could be constructed. Worth closing on principle.

### P10 — LOW: Display-name spoofing is systemic in the game

`sync:350`, `chat:136`, `colonies:76`, `milestones:41`, `competitive-contracts:89` all accept `companyName` from the body and write it to public feeds without comparing it to the session profile's own name — a player can post activity under a rival's company name. `milestones/route.ts:41,76-89` additionally stores a client-supplied `reward` value that is rendered publicly (no money is credited, so this is cosmetic/reputational).

---

## Rate limiting and abuse (item 5)

`src/middleware.ts:24-86` implements a sliding window with sensible tight buckets for auth, newsletter, contact, feedback, forums, messages and AI endpoints. Gaps worth noting:

**Sensitive routes currently in the generic 200/min bucket:**
- `/api/stripe/checkout`, `/api/ads/checkout`, `/api/subscription` — 200 Stripe session creations per minute per IP. Stripe-side cost and rate-limit exposure. **Recommend 10/min.**
- `/api/compliance/questions` — a public submission form that stores an optional asker email. **Recommend aligning with `/api/contact` at 5/hour.**
- `/api/company-profiles/[slug]/analytics` — see P9.

**Per-instance store:** the comment at `src/middleware.ts:9-11` is accurate — on Railway's single instance this is genuinely sufficient today, and I would not add Redis before relaunch. Two caveats worth knowing: the counters reset on every deploy/restart (so a deploy briefly clears all limits), and this becomes ineffective the moment a second instance is added.

**IP extraction:** `getClientIp` (`:91-105`) takes the **rightmost** `x-forwarded-for` entry, which is correct anti-spoofing behaviour *if exactly one trusted proxy appends the real client IP*. Worth confirming against Railway's actual hop count — if there are two hops, the rightmost value is an internal address and all users would share a single bucket.

**Not tightened in this pass** per the brief: rate-limit changes risk throttling real users during a traffic spike. These are one-line additions to `getRateLimitConfig` and its `routeKey` switch whenever you want them.

---

## Cron, CSRF exemptions and headers (items 6-7)

**Cron coverage:** all 17 routes under `/api/cron/` reference `CRON_SECRET`, and all 21 under `/api/admin/` check `session.user.isAdmin` — no route in either directory is missing its gate. The problems are the *three* resolve routes outside those directories (G1, fixed) and the *nine* fail-open patterns (P2, proposed).

**CSRF exemptions — each verified justified:**
- `/api/auth/*` — NextAuth's own CSRF handling.
- `/api/v1/*` — **verified**: all 16 routes authenticate via API key, not cookies.
- `/api/stripe/webhooks` — signature-verified against the raw body.
- `/api/regulatory-alerts/unsubscribe`, `/api/newsletter/unsubscribe` — RFC 8058 one-click POSTs arrive from mail providers with no `Origin`; auth is the per-user token in the URL.
- Bearer-token cron paths — correctly requires a *valid* `CRON_SECRET` **and** a known internal path, so it is not an arbitrary CSRF bypass.

**Secrets — systematically verified clean:** `.env` has never been committed (`git log --all --diff-filter=A` empty); no `sk_live`/`whsec`/`AIza`/`ghp_`/private-key patterns in tracked source outside test fixtures; all 8 `NEXT_PUBLIC_*` vars are legitimately public (VAPID *public* key, site-verification tokens, AdSense client id, URLs).

**Headers (`next.config.js:53-79`)** — strong: HSTS `max-age=63072000; includeSubDomains; preload`, CSP with `frame-ancestors 'none'`/`base-uri 'self'`/`form-action 'self'`, COOP `same-origin`, nosniff, `strict-origin-when-cross-origin`, Permissions-Policy.

Two observations, neither applied:
1. **CSP `script-src` includes `'unsafe-inline'`** in production. Real but common for GTM/AdSense; removing it requires a nonce-based CSP and is a genuine relaunch risk. Deferred deliberately.
2. **Possible CSP conflict on embeds.** `next.config.js` sets `frame-ancestors 'none'` for `/:path*`, while `src/middleware.ts:552` sets `frame-ancestors *` for `/embed/*` and `/widgets/*`. When two CSP headers are present the **most restrictive wins**, so third-party embedding may be broken. This is a *functionality* bug rather than a security hole (it fails closed), but worth testing an embed before relaunch.

---

## Status of the two older audit documents

Both predate this audit by ~6 months and their findings have been **substantially remediated**. I verified the specific claims:

**`security-audit-report.md`** (root, 2026-02-07) — 16 findings, 15 fixed at the time. Spot-checked and still holding: `requireCronSecret()` exists with timing-safe comparison and fails closed (`src/lib/errors.ts:305`); init endpoints are gated; registration anti-enumeration is in place. Its one deferred item (vulnerable Next.js) is now owned by the dependency workstream. **Stale — retire.**

**`docs/technical/SECURITY-AUDIT-REPORT.md`** (2026-02-12) — 28 findings. Its open High/Critical items are all now resolved: `/api/webhooks/subscribe` requires `isAdmin` (`:29`, `:92`); `/api/export/route.ts` and `/api/cache/route.ts` **no longer exist**. Its "`.env` present in repo root" informational is confirmed harmless — never committed. **Stale — retire.**

**What the old docs got wrong / missed:** both reported "no raw SQL" — that is no longer true (`src/lib/full-text-search.ts` now uses `$queryRaw`), though the current usage is safe. More importantly, **neither found any of this audit's real issues**: neither examined authorization *separately from* authentication, so the four unauthenticated PII leaks and the three unauthenticated resolve crons went unreported, as did both money-path bugs. That is the gap worth remembering — a route-by-route "is there a session check" sweep would have passed all seven.

**Recommendation:** delete both and let this document supersede them. Keeping three overlapping audit files invites acting on stale findings. If you prefer an archive trail, move them to `docs/archive/` with a header pointing here.

---

## Coverage — what was and was not examined

**Examined thoroughly:**
- All 587 API routes enumerated. All 21 `/api/admin/*` and all 17 `/api/cron/*` verified for their gate. All 90 `space-tycoon` + `orbital-slots` routes reviewed for authz, IDOR, reward idempotency and cron auth. 178 route files across the 31 user-owned-resource directories read at every mutation site and every `[id]` handler.
- All money paths: Stripe webhooks (signature, replay, idempotency), `stripe/checkout`, `ads/checkout`, `ads/campaigns/[id]`, `subscription`, `promo/founding`, `company-profiles/sponsor/checkout`, `ticket-resale/[id]/buy`, `events/rsvp`.
- Every `$queryRaw*`/`$executeRaw*` in the repo; every `dangerouslySetInnerHTML` in `src/`; `sanitize-html` configs; pagination clamps and `orderBy` allowlists across ~60 routes.
- `src/middleware.ts` in full; `next.config.js` headers; `prisma/schema.prisma` sensitive-field inventory; git history for secret leaks.

**Not examined / explicitly out of scope:**
- **Dependency vulnerabilities** — separate workstream.
- **`src/lib/game/**` economy internals** — out of scope by instruction and under concurrent edit. This is where P1's real fix lives, so *the game economy's server-authority model has not been validated*, only the routes in front of it.
- **NextAuth session/cookie configuration** and password-reset token entropy/expiry — I verified the *routes* but did not audit the auth provider config itself.
- **File upload handling** — the old audit covered it; I did not re-verify.
- **Client-side authorization** in React components — server routes were the focus; a component that renders admin UI on a non-admin client is not covered here (though the API behind it is).
- **Live infrastructure**: Railway env-var state (`CRON_SECRET` presence — load-bearing for P2/P3), database-level permissions, network config.
- **`npx next build`** was NOT run — a parallel agent holds that lock. **This still needs running before deploy.**

**Validation coverage measured:** 244 routes parse a JSON body; **175 (72%) validate with zod/`validateBody`, 69 (28%) do not.** The unvalidated set clusters in `space-tycoon` (~35 routes) plus `admin`, `community`, `messages`, `notifications`, and `modules`. Most are not independently exploitable — the ones that were are reported above (M2's `paidTier` was the clearest case of a field slipping past a schema that ran on the same request). Closing the remaining gap is hygiene, not an emergency.

---

## Recommended order of work

**Before relaunch (2026-08-24):**
1. ✅ Done — G1, D1-D4, M1, M2 (all fixed and test-guarded).
2. Run `npx next build` once the parallel agent releases the lock.
3. Confirm `CRON_SECRET` is set in Railway → then land P2 and P3 together.
4. Test one `/embed/*` page for the CSP conflict noted above.

**Immediately after relaunch:**
5. P7 (deal-room access codes + NDA gate) — confidential financial data.
6. P6, P4 (game authz/reward fixes) once the parallel agent's edits land.
7. P8, P9 exposures; rate-limit tightening on checkout and compliance submissions.

**Post-relaunch engineering block:**
8. **P1 — server-authoritative game inventory.** The largest remaining risk and the one most likely to be found by a motivated player once the game has a competitive population.
9. Introduce a shared `PUBLIC_USER_SELECT = { id, name, verifiedBadge }` constant so the D1-D4 class cannot recur.
10. Close the 28% zod-validation gap, starting with the game routes.
