# SpaceNexus Security Audit Delta — September 2026

**Date:** 2026-09-01
**Scope:** Everything the August audit (`docs/SECURITY_AUDIT_2026-08.md`) did not enumerate, plus verification of its deferred items. Same surface: `src/app/api/**`, `src/middleware.ts`, `src/lib/auth.ts`, token flows, game economy routes.
**Method:** One read-only sweep agent against the August findings list, every Critical/High claim re-verified by hand in the source before work started, then five parallel implementation agents with disjoint file ownership and regression tests, followed by full `tsc`, full Jest, and a production build.

All items below are **fixed in this pass** unless marked otherwise.

---

## Fixed — Critical

### C1 — Unauthenticated click fraud drained advertiser prepaid budgets
`POST /api/ads/impression` accepted any `{campaignId, placementId, type:'click'}` anonymously and `recordImpression` added `cpcRate` to `AdCampaign.spent` with no dedup and no binding to a served ad. Campaign ids ship in the served ad markup, so anyone could burn every campaign to zero in minutes.

**Fix.** `src/lib/ads/impression-token.ts`: the serve route mints an HMAC-SHA256 token `{campaignId, placementId, exp (6h), nonce, ip}` per served ad; the impression route verifies it (timing-safe), refuses reuse of the nonce, and `recordImpression` charges at most one click per `(campaign, placement, ip)` per 24 h and one impression per 10 min. Duplicate events are still written for analytics with `revenue: 0`. The route now reads the **rightmost** `x-forwarded-for` entry (was leftmost, spoofable). Middleware bucket: 30/min. Key: `AD_TOKEN_SECRET`, falling back to `CRON_SECRET`.

### C2 — Stored SSRF via podcast submissions
`POST /api/podcasts` had no auth; `feedUrl` was regex-checked only; the hourly `podcasts-sync` cron then fetched it from inside the container (rss-parser follows redirects) and published the response at a public URL. `http://169.254.169.254/…` and loopback targets were reachable.

**Fix.** `POST /api/podcasts` requires an admin session or the cron secret. New `src/lib/security/safe-url.ts` (+ `safe-url-core.ts` for client-safe schema use): rejects non-http(s), credentials, non-default ports, `localhost`/`.local`/`.internal`, private/link-local/loopback/multicast IPv4 and IPv6 (incl. v4-mapped), and resolves DNS, refusing if **any** answer is private (rebinding). `safeFetchText` follows redirects manually, re-validating each hop, with a body-size cap and a single deadline. `podcast-sync.ts` uses it and parses the fetched text. Zod schema rejects private literals at submit time.

## Fixed — High

### H1 — Seven ingestion routes had no authentication
`news/fetch`, `blogs/fetch`, `events/fetch`, `solar-flares/fetch`, `launch-windows/fetch`, `debris-monitor/fetch` (`POST()` with no request argument) and `compliance/fetch` (took the request, never checked). Same class as August G1, in directories that audit never enumerated. Any forged same-origin POST triggered third-party API pulls and DB write storms.

**Fix.** All seven gate on `requireCronSecret` as their first statement. `news/fetch` and `blogs/fetch` accept an admin session too (`src/lib/api-auth.ts` → `requireCronSecretOrAdmin`) because the industry-voices page has a refresh button; that button now renders for admins only. `src/components/DataInitializer.tsx` no longer fires `/api/news/fetch` for every visitor (news is already refreshed every 5 min by the scheduler through `/api/refresh`). The four paths were added to middleware `cronPaths`.

### H2 — No brute-force protection on sign-in
`/api/auth/callback/credentials` fell into the generic 200/min bucket; `authorize()` had no lockout.

**Fix.** Middleware bucket 10 per 15 min per IP on the credentials callback, plus `src/lib/login-throttle.ts`: per-account lockout after 8 failures in 15 min (15-min lock, unknown emails counted too so cost is uniform). In-memory, per instance — same trade-off as the middleware limiter.

### H3 — Stored XSS through launch-alert scope
The rocket/site strings from `POST /api/launch-watch` were interpolated raw into the verify page's HTML (served on the app origin, where CSP permits inline scripts) and the email subject.

**Fix.** Both verify pages (`launch-watch/verify`, `company-brief/verify`) escape every interpolation. The schema restricts rocket/site to letters, digits, spaces and basic punctuation and pins `eventId` to `[A-Za-z0-9_-]`.

### H4 — Nine fail-open game crons and a spoofable localhost escape (August P2/P3)
`market/restock`, `market/mean-revert`, `demand-pools/update`, `labor/update`, `zones/update`, `bidding/resolve`, `orbital-slots/resolve` used `if (secret && mismatch)` (skips the check when the env var is unset); `leagues/process-week` and `market/share/rollup` read the secret from the JSON body. `requireCronSecret` trusted `Host: localhost` whenever no secret was configured.

**Fix.** All nine use `requireCronSecret` (Bearer, timing-safe, fail-closed); `market/init` too. The localhost allowance now only exists outside production. **Side effect worth knowing:** the scheduler always sent a Bearer header and an empty body, so `leagues/process-week` had been returning 401 to its own cron in production; it works now.

## Fixed — Medium

- **M2 Registration granted `emailVerified: true` without proof**, which made the public `domain` badge claimable by registering `ceo@<company>` and claiming the company. Now `false` until the emailed link is clicked; login is not blocked; badge recompute moved to `verify-email` only.
- **M3 Registration timing oracle.** bcrypt now runs before the existence check so new and existing emails cost the same.
- **M4 Email bomb via double-opt-in resends.** Per-address 10-minute confirmation cooldown shared by launch-watch and company-brief (reported as success, no send), plus an 8/hour IP bucket on both POSTs.
- **M5 `market/init` unauthenticated** — gated.
- **M6 Order book accepted unbounded price/quantity.** Quantity ≤ 100 000; price within 0.1×–10× of the resource's current price.
- **M7 `/api/og` unbounded parameters.** Title ≤ 120, subtitle ≤ 200, control characters stripped, `type` validated against the palette.
- **August P4** `seasons/progress` trusted `body.progress` and `speed-runs/check` trusted `body.gameState`. Progress is now derived server-side per metric (`src/lib/game/season-metrics-server.ts`; delta metrics baseline on first touch so veterans don't auto-complete). Metrics that cannot be derived are clamped non-decreasing and ≤ a server ceiling — listed in that file. Speed-run state is built from the profile.
- **August P5** Expired Pro trials could be restarted forever → one trial per account.
- **August P6** Any alliance member could spend the treasury → leader/officer only.
- **August P7** Deal-room `accessCode` shipped to viewers; documents bypassed the NDA gate → explicit select, code only for owner/admin, NDA gate applied on the detail and list GETs.
- **August P8** Public channel and study-group rosters leaked member emails → `PUBLIC_USER_SELECT` (`src/lib/public-user-select.ts`); private study groups require membership.
- **August P9** Unauthenticated write-on-GET (`company-profiles/recalculate`) gated by cron secret; sponsor analytics deduped per IP/hour; session-question upvotes deduped per user (in-memory — a `SessionQuestionVote` table is the durable fix if AMAs are ever relisted).
- **August P10** Company-name spoofing in chat/colonies/milestones/competitive-contracts → the session profile's name is written; milestone `reward` derived from the definition. `sync` remains the single legitimate rename path, now sanitised.
- **Colony claims were free** (the live half of the $50B `cc_pluto_expedition` payout): now a burned one-time fee per location ($100M LEO … $5B Pluto, table in `src/lib/game/colonies.ts`) with a presence prerequisite, debited atomically through the server ledger.

## Fixed — Low

- **L1** `sn_ref` referral cookie now `httpOnly` + `secure`.
- **L2** Password reset/change did not revoke sessions. New `User.passwordChangedAt` (column added in prod 2026-09-01); the JWT callback re-checks it every 5 minutes and refuses to hydrate a session whose token predates it.
- **L5** Zod schemas for `poach`, `espionage/execute`, `espionage/upgrade`, `alliance-treasury`, `colonies`, `seasons/progress`.
- Rate limits added: Stripe/ads checkout and `/api/subscription` 10/min; `POST /api/compliance/questions` 5/hour.

## Not changed, by decision

- **L3** One launch-watch unsubscribe token can unsubscribe every watch on that address. This is the RFC 8058 "unsubscribe from all" behaviour and the token proves receipt at that mailbox; left as designed.
- **L4** CSP still ships `script-src 'unsafe-inline'`. Nonce migration is scheduled as its own change; H3 is closed by escaping regardless.
- `compliance-fetcher.ts` still uses `parseURL` on a DB column that only admin seeding writes. Switch to `safeFetchText` if legal sources become user-editable.

## Still open — structural

- **August P1 — game inventory remains client-authoritative** for buildings, ships and research (`sync/route.ts`); money is clamped and reconciled, **resources have an upward-only plausibility ceiling** (phase 1, shadow since 2026-09-01) and, since phase 2 (2026-09-02, below), **the escrow-backed paths verify a server-owned inventory** (`GameProfile.serverResources`) — the contract/order-book payout class is closed for phantom stock; mining/consumption growth is still ceiling-bounded, not measured. Tracked as the top game-engineering item.
- **Next.js 14 is out of support.** `npm audit` lists nine advisories (request smuggling in rewrites, RSC cache poisoning, several DoS) with no fix inside 14.x. Upgrade planned as its own project.
- `sanitize-html`, `nodemailer` (via resend), `postcss` bumps ride with that upgrade.

## Regression tests added

`cron-auth-regressions` (129), `ad-impression-security` (22), `safe-url` + `podcasts-ssrf-regressions`, `game-authz-regressions` (18), `data-exposure-regressions` (10), `login-throttle` (4). Existing suites updated where behaviour intentionally changed (compliance fetch now needs the Bearer; change-password writes `passwordChangedAt`; deal-room GET checks membership first).

## Server-authoritative inventory — phase 1 (2026-09-01)

Closes the first slice of August P1. Money already had `clampPlausibleMoney`
(ledger-reconcile.ts, Wave E1); resources had nothing — the sync persisted
`applyResourceDeltas(clientResources, ledgerDeltas)` verbatim, so a forged
`{"resources":{"antimatter_precursors":10}}` was believed and every "verify
holdings server-side" check (contract claims, order-book sells, bounty fills)
verified a client-authored number.

### What shipped

**Per-resource plausibility ceiling** — `src/lib/game/resource-plausibility.ts`
(pure, unit-tested). For every resource the RECONCILED client claim is bounded by

```
ceiling_r = prev_r                                        (last server row)
          + max(0, ledgerDelta_r)                         (server-granted since ack)
          + RESOURCE_SLACK(3) x prodMax_r x elapsedMonths (client-simulated production)
          + max(100, 0.25 x prev_r)                       (flat per-sync allowance)
```

- `prodMax_r` is the engine's own per-month INFLOW for this profile
  (`computeResourceFlows` over a partial GameState built from the persisted
  buildings / ships / services / research columns — the speed-runs/check
  pattern) with every client-only multiplier at its documented maximum.
  Consumption, decay and boil-off are ignored on purpose (subtracting them
  could clip an honest player whose client had not run those sinks yet).
- `elapsedMonths` = wall-clock since `lastSyncAt`, clamped to the money
  clamp's 5 s floor / 30-day cap, divided by `TICKS_PER_GAME_MONTH x
  TICK_INTERVALS[1]` (60 s per game month at 1x) — derived, not hardcoded.
- The clamp is **upward-only**: decreases (spending, deliveries, hazards) are
  never questioned. A slug with no ceiling (a resource the client "found")
  is bounded at the flat floor for prev = 0, i.e. 100 units per sync.

**Client-only multiplier caps** (the terms the server cannot evaluate from
persisted columns; each cites its source cap; the product is what the
ceiling multiplies base production by):

| Term | Cap | Source |
|---|---|---|
| workforce `miningOutput` | 2.0 | workforce.ts / programs.ts (+100%) |
| research `miningOutputBonus` | 2.0 | research-tree.ts (+100%) |
| legacy `miningOutput` | 4.0 | legacy-system.ts ("max 300% -> 4x") |
| corporate era | 1.15 | corporate-eras.ts (largest mining term) |
| corporation tier | 1.25 | corporation-tiers.ts (top tier) |
| reputation standing | 1.30 | reputation.ts (top standing) |
| commanders (class + traits) | 2.0 | **assumed** — no single documented cap; a full logistician roster at max level is well under it |
| wave-B sub-product (spec / victory / alliance / mentorship / coop-mega / boost) | 2.0 | resource-flow.ts caps it itself |
| survey probe | 1.35 | exploration.ts (largest `bonusPct`) |
| personal megastructures (multiplicative across owned) | 10.97 | derived from `MEGASTRUCTURES` definitions at load |
| ship specialization `mining_output` | 1.55 | specializations.ts (tiers sum +55%) |
| ship victory reward | 1.05 | victory-conditions.ts |
| alliance mining bonus | 1.5 | server-effects.ts `ALLIANCE_MINING_BONUS_CAP` |
| fitted mining lasers | 3.4 | modules.ts +30% x largest `moduleSlots` (8, from `getShipDerivedStats`) |
| industry (refineries, fabs) | 1.0 | `base x phaseIn x efficiency`, both <= 1 — no client term |

Products: **building mining ~1 771x**, **ship mining ~83x** base. Megastructure
passive output (client-only state) is a per-resource additive allowance
(`MEGASTRUCTURE_PASSIVE_CEILING`, e.g. iron 3 000/mo, mars_water 1 500/mo).
These are deliberately generous — the ceiling must never clip an honest
player — and they are the phase-1.5 tightening target (below).

**Sync wiring** (`sync/route.ts`, after ledger reconciliation, before net worth):

- `RESOURCE_CLAMP_MODE` env: `off` | `shadow` (**default**) | `enforce`.
  - `shadow` — compute, `logger.warn`, MarketAuditLog
    `client_resources_implausible_shadow` (warning), persist the client
    values unchanged.
  - `enforce` — take a `'pre-clamp'` EconomicSnapshot of the row as it
    stands, persist the clamped map, MarketAuditLog
    `client_resources_implausible_rejected` (critical).
  - `off` — nothing computed, nothing stashed (pre-phase-1 behaviour).
- **First-sync baseline ratchet.** `_resourceBaselineAt` in `workforceData`
  (same stash pattern as `_commanders`). The first sync that runs the block
  only sets the marker and never clamps, so a save that predates the
  feature is adopted as the baseline; from the next sync on the marker
  predates the request and the clamp applies. Rows without the marker are
  never clamped.
- `_resourceCeilings` (<= 35 keys, the client's largest holdings first) is
  stashed every sync for the escrow-backed paths.
- The response carries `resourceClamp: { mode, baselined, rejected[], enforced }`.
- The money path (`clampPlausibleMoney`) is untouched.

**Escrow-backed paths (Phase B slice).** `serverSellableQuantity(profile, slug)`
in market-orderbook.ts sell gating and bounties/route.ts filler check: once
the profile carries `_resourceBaselineAt`, the deliverable quantity is
`min(profile.resources[r], _resourceCeilings[r])` — in shadow mode too, so a
forged inventory cannot be pushed into real buy orders / bounties even before
enforce is on. Gating writes MarketAuditLog `sell_gated_by_resource_ceiling`
(warning). **Limitation:** `profile.resources` is still the client's figure
(raw in shadow); un-baselined profiles and slugs outside the 35-key map fall
back to the raw figure; ceilings are as of the last sync (~30 s stale), so
production since then is not sellable until the next sync.

**EconomicSnapshot** (rollback prerequisite, SIMULATION_INTEGRITY_TOOLING S3,
simplified: columns instead of a full GameState blob, no RollbackAction yet):

- Prisma model `EconomicSnapshot` (profileId FK cascade, takenAt, reason
  `'daily' | 'pre-clamp' | 'manual'`, money, netWorth, resources,
  buildingsData, shipsData, completedResearchList, activeServicesData?,
  workforceData?; indexes `[profileId, takenAt]`, `[takenAt]`). DDL applied
  by hand in prod (the Railway build has no DB access); every writer is
  try/catch so a lagging table never blocks a sync.
- Cron `POST /api/cron/economic-snapshot` (`requireCronSecret`), scheduler
  row `20 3 * * *`: snapshots every profile with `lastSyncAt` in 30 days in
  id-cursor batches of 200, then prunes — daily rows > 14 d except the
  Monday (UTC) row, kept 90 d as the weekly keeper; pre-clamp > 90 d;
  manual > 365 d.
- `restoreEconomicSnapshot(snapshotId, { actor, note })` in
  `src/lib/game/economic-snapshot.ts` writes the columns back, re-baselines
  `_resourceBaselineAt` / `_resourceCeilings` to the restored stock, and
  writes MarketAuditLog `economic_snapshot_restored` (critical). **Not
  exposed as a route** — the S3 dual-control + public-notice workflow is
  phase 2. A restore holds for money and (in enforce) resources; buildings /
  ships / research are re-synced by the client until phase 2.

Tests: `resource-plausibility.test.ts` (2 mines + refinery fixture, ceiling
math, clamp, stash, sellable quantity), `sync-resource-clamp.test.ts`
(first-sync baseline, shadow / enforce / off, honest claim, decreases,
new profile, money path untouched), `economic-snapshot-cron.test.ts`
(401s, batching, prune query shape, restore).

### Shadow-week plan

1. Ship with `RESOURCE_CLAMP_MODE` unset (= shadow). Every profile is
   baselined on its first sync after deploy.
2. Daily, for >= 7 days: `SELECT "profileId", details FROM "MarketAuditLog"
   WHERE "eventType" = 'client_resources_implausible_shadow'`. For each hit
   read `details.rejected[].client / ceiling` and check the profile by hand
   (buildings, ships, research, recent contract deliveries, refining jobs,
   freight arrivals — the OMITTED_CONTRIBUTIONS list in resource-flow.ts).
3. A hit on an honest profile is a **false positive**: fix the ceiling
   (raise `RESOURCE_SLACK`, model the missing inflow, or stash the missing
   client state) — never ship enforce over it.
4. After >= 7 consecutive days with **zero false positives**, set
   `RESOURCE_CLAMP_MODE=enforce` in Railway. Keep watching
   `client_resources_implausible_rejected`; every enforced clamp has a
   `'pre-clamp'` snapshot, so a late false positive is reversed with
   `restoreEconomicSnapshot`.
5. `sell_gated_by_resource_ceiling` rows are live from day one (shadow
   included) and are the same false-positive signal for the escrow paths.

### Still open after phase 1

- **Caps are loose** (~1 771x building mining). Phase 1.5: evaluate
  research (`completedResearchList` is persisted), workforce (`workforceData`
  is persisted) and commanders (`_commanders` is stashed) for real instead of
  capping them — cuts the product by ~8x — and stash the owned-megastructure
  list to replace the 10.97x term.
- Buildings, ships, research, services remain client-reported (phase 2:
  server-side construction / research ledger).
- The ceiling models the inflows the flow lens knows; contract deliveries,
  refining jobs, survey discoveries and freight arrivals ride on the flat
  floor + slack. Any of these that legitimately exceeds it will show up in
  the shadow week.
- No RollbackAction / dual-control / public-notice workflow (S3 phase 2).

## Server-authoritative inventory — phase 2 (2026-09-02)

Phase 1 bounded what the client may CLAIM; the escrow-backed paths still
verified `GameProfile.resources`, a client-authored figure capped at a
ceiling. Phase 2 gives the server its own inventory and makes the paths
backed by real money verify against THAT, so phantom client stock can no
longer be sold into real buy orders or delivered against real bounties, bids
and project contributions.

### What is authoritative now

**`GameProfile.serverResources Json?`** (null = not yet baselined) is the
server-owned per-resource stock. `GameProfile.resources` keeps exactly its
phase-1 meaning — the client view: claim + pending ledger rows, clamped in
enforce. Every rule below is in `src/lib/game/resource-plausibility.ts`
(pure, "Phase 2" section) with the DB layer in
`src/lib/game/server-inventory.ts`.

**Adoption (one-time).** On the first sync where the profile's phase-1
`_resourceBaselineAt` marker predates the request and `serverResources` is
null, `serverResources` = the client view written that sync (reconciled;
clamped in enforce), and every ledger row with `seq <= max(ack, maxSeq)` is
stamped `foldedAt` (the view already contains them). Requires the ledger
(`ledgerInfo`); without it nothing is adopted.

**Advance (every later sync), per resource r:**

```
truth_r      = max(0, min(clientView_r,  prevServer_r + folded_r + accepted_r))
folded_r     = Σ resourceDelta of the profile's GameLedgerEntry rows with
               foldedAt IS NULL (every server-side move: escrow, fill, refund,
               delivery, contribution). Stamped foldedAt after the row is
               written.
clientΔ_r    = clientView_r − prevClientRow_r − folded_r
               (the client's OWN movement since the last sync)
accepted_r   = clientΔ_r                                   if clientΔ_r <= 0
             = min(clientΔ_r, growthCap_r + craft_r)       if clientΔ_r >  0
growthCap_r  = RESOURCE_SLACK(3) x prodMax_r x elapsedMonths
             + max(100, 0.25 x prevServer_r)
               (the phase-1 ceiling's growth terms — ceilingFor(prevServer,
               0, prodMax, months) − prevServer — evaluated on the SERVER
               stock, with the same 5 s / 30 d elapsed clamp)
craft_r      = the client's craftedThisTick attestation, capped (below)
```

A decrease is accepted as-is (spending your own stock is never an exploit;
an unexplained drop — crafting inputs, building spend, consumption, hazards
— simply lowers server truth). An increase is accepted only up to what the
engine math allows for this profile. Ledger credits are NOT re-added as
growth headroom (phase 1 did that; here they are in `folded_r` already).
`truth_r <= clientView_r` always: the server never believes it holds more
than the client says, so a hostile client can only ever make server truth
LOWER than honest truth.

**Gates read `stored + Σ unfolded rows`.** `resolveSellableQuantity` /
`loadAuthoritativeInventory` (server-inventory.ts) add the unfolded ledger
tail (`foldedAt IS NULL`, one indexed query) to the stored map, which is
exactly the figure the next sync will store. An escrow written a millisecond
ago is a ledger row already, so it is debited from what the next gate sees
without the gate and the sync ever writing the same JSON column (the ledger
row is the single atomic record; the stored map is a fold cursor over it).
This is why the escrow paths debit the CLIENT VIEW (`resources`) directly,
as before, and let the ledger row carry the debit to server truth — debiting
`serverResources` directly as well would double-count at the next fold and
would re-introduce the upsert-vs-escrow clobber race `resources` has.

Wired: `market-orderbook.ts` sell gating (`placeLimitOrder`, escrow debit now
floored at 0), `bounties/route.ts` filler check + delivery,
`bidding/fulfill/route.ts` (`checkContractFulfillment` gets the
authoritative map), `mega-projects/contribute` and
`alliance-projects/contribute` availability checks. Every gate that refuses
on server truth while the client view would have allowed it writes
MarketAuditLog `sell_gated_by_server_inventory` (warning; `path`,
`quantity`, `raw`, `serverHeld`). Fallback: a profile without
`serverResources` uses the phase-1 rule (client figure capped at the stashed
ceiling); `RESOURCE_CLAMP_MODE=off` returns the raw client figure and the
server map stops advancing (so it must not gate).

**Divergence telemetry.** Client view vs server truth differing by > 5 % of
the server figure (`SERVER_RESOURCE_DIVERGENCE_TOLERANCE`) writes
MarketAuditLog `client_server_resource_divergence` (warning) with the
per-resource pairs, the capped growth, and the corrections that enforce
would send — throttled to one row per profile per hour via the
`_resourceDivergenceLoggedAt` stash key in `workforceData`.

**Reconciliation to the client (enforce only).** For every resource where
client − server > 5 %, the sync writes a `server_resource_correction`
GameLedgerEntry (negative `resourceDelta`), applies it to the persisted
client view, and appends it to the response `ledger` (entries,
resourceDeltas, maxSeq) — the ordinary One-Wallet channel
(`applyReconciliationToState`), so the client converges without a hard
reset and retries stay idempotent (the row has a real seq). Never upward.
Shadow computes and logs the same corrections and sends nothing.

**Attested sub-payloads.** The client now sends `craftedThisTick` (recipe
outputs credited by the engine's refining completion) and `builtThisTick`
(building / ship / research `resourceCost` spend from the page handlers),
accumulated in `GameState.pendingInventoryAttestations`
(`inventory-attestations.ts`, client caps 10 000/resource) and drained after
each 200 like `minedThisTick`. Server caps:

| Payload | Cap (per resource per sync) | Source |
|---|---|---|
| `craftedThisTick[out]` | max over recipes producing `out` that this profile can run (completed fabrication facility of `facilityTierFor(recipe)` in `buildingsData` AND every `requiredResearch` in `completedResearchList`) of `outputQuantity x (floor(window_s x speedMult / timeSeconds) + 1)`; window = elapsed clamped 5 s..30 d; `speedMult = getCraftingSpeedMultiplier(buildingsData)` (1 + 0.15 per extra fab, evaluated for real — the roster is server-known); one recipe runs at a time (`activeRefining` is a single slot), the +1 is the in-flight completion | production-chains.ts `PRODUCTION_CHAINS` / `canFabricate`; buildings.ts `getCraftingSpeedMultiplier` |
| `builtThisTick[r]` | `MAX_DEFINITION_RESOURCE_COST[r] x 25` — the largest `resourceCost[r]` of any building, ship or research definition times `BUILD_ATTEST_MAX_ORDERS_PER_SYNC` | buildings.ts / ships.ts / research-tree.ts definitions, derived at load |

Accepted amounts are ledgered one row per resource per sync as
`client_craft_output` (+) / `client_build_spend` (−). These rows are
stamped `foldedAt` AND `appliedAt` at birth (`recordSyncAuthoredLedger`) and
are excluded by reason from the client's pending query
(`CLIENT_ATTESTED_LEDGER_REASONS`, ledger-reconcile.ts): the client's map
already holds these movements, so they must never come back as deltas, and
the sync applied them when it wrote the row, so they must never be folded.
Craft output feeds server truth as `craft_r` in the advance rule; build
spend is already captured by the accepted-decrease rule (the row is the
audit trail — a client cannot lower server truth twice with it).

### What still is not authoritative

- **Mining and consumption** still flow through the phase-1 ceilings:
  `growthCap_r` accepts up to 3x the engine's theoretical-max production for
  the window plus the flat floor. The flat floor's 25 %-of-stock term
  compounds per sync (~30 s), so a client that walks its claim up 25 % every
  sync is still accepted — the phase-1.5 tightening target, now visible as
  a long-lived `client_server_resource_divergence` stream for that profile.
- **Inflows the flow lens does not model** (contract deliveries, survey
  discoveries, freight arrivals — resource-flow.ts OMITTED_CONTRIBUTIONS)
  ride only on the flat floor. Under the delta rule a one-off inflow larger
  than the floor is PERMANENTLY under-counted in server truth (the client's
  later movement is 0, so nothing catches up). This is the phase-2 false
  positive to watch for; remedy = attest it (a `discoveredThisTick` /
  `deliveredThisTick` sub-payload on the same channel) or, per profile,
  `UPDATE "GameProfile" SET "serverResources" = NULL WHERE id = …` →
  re-adopted from the client view on the next sync.
- **Buildings, ships, research, services** remain client-reported (phase 3:
  server-side construction / research ledger). `builtThisTick` attests the
  resource side of a build, not the asset.
- **Un-baselined profiles** (no `serverResources`) keep the phase-1 rule on
  every gate until their next sync after the marker exists.
- Two concurrent escrows for the same profile can both pass a gate on the
  same truth (TOCTOU, pre-existing on `resources`); the second one then
  over-sells. Fold marking runs after the profile upsert; a lambda crash in
  that window double-folds once (debits: conservative; credits: a one-off
  free credit). Both are rare and reversible with `restoreEconomicSnapshot`,
  which now re-adopts `serverResources` from the restored stock and stamps
  every row folded.
- Ledger unavailable (`isLedgerAvailable() === false`, deploy lag): no rows,
  nothing folds, gates read the stale stored map. Same posture as One Wallet.

### Flip plan

Everything runs under the phase-1 `RESOURCE_CLAMP_MODE` (default `shadow`):

1. Deploy with the DDL applied (`serverResources`, `foldedAt` + index). Every
   baselined profile adopts its server map on its next sync; gates switch to
   server truth from that moment — in shadow too, exactly as phase 1's
   ceiling gating already did.
2. Daily, alongside the phase-1 checks: `SELECT "profileId", details FROM
   "MarketAuditLog" WHERE "eventType" IN ('client_server_resource_divergence',
   'sell_gated_by_server_inventory')`. A divergence on an honest profile
   whose `details.capped[]` names a resource with a legitimate unmodeled
   inflow is a false positive: model it (attestation or flow lens), then
   null that profile's `serverResources` to re-adopt. `details.corrections`
   is exactly what enforce would have sent.
3. After >= 7 days with zero false positives, `RESOURCE_CLAMP_MODE=enforce`:
   corrections start flowing to clients (`server_resource_correction` rows,
   `details.corrected = true`). Every enforced phase-1 clamp still takes a
   `'pre-clamp'` snapshot; a restore re-adopts the server map.
4. Phase 1.5 / 3 tighten the growth allowance (evaluate research, workforce,
   commanders for real; replace the compounding flat floor with a
   time-based one) and move construction / research server-side.

Tests: `inventory-phase2.test.ts` (adoption, fold + capped growth, unexplained
decrease, phantom sell rejected on server truth, escrow debits the client
view + ledgers, shadow vs enforce corrections, craft / build attestation caps
and rows).

## CSP: report-only nonce rollout (2026-09-01)

**What was wrong.** `next.config.js` applied one static `Content-Security-Policy` (`frame-ancestors 'none'`) plus `X-Frame-Options: DENY` to `/:path*`, while `src/middleware.ts` added a second CSP header (`frame-ancestors *`) on `/embed/*` and `/widgets/*`. Browsers intersect multiple CSP headers, so `'none'` won and the embeds were unframeable. The static policy also lacked the GA4 regional collectors (`region1.google-analytics.com`, `analytics.google.com`, `stats.g.doubleclick.net`) and the AdSense runtime hosts, and still listed dead sources (Google Fonts — `next/font` self-hosts; `platform.twitter.com`; `www.google.com`).

**What changed.**
- `src/lib/csp.ts` is the single source of truth (edge-safe, Web Crypto only). `next.config.js` no longer sets CSP or X-Frame-Options; `src/middleware.ts` sets both per document via `documentCspHeaders()`, including on its hand-rolled 404 page (which previously shipped no security headers at all). XFO `DENY` is set only when `frame-ancestors` is `'none'`.
- Enforced policy = the previous shape (`script-src 'self' 'unsafe-inline' + hosts`) with fixed `connect-src`/`frame-src`, `object-src 'none'`, `worker-src 'self' blob:`, `manifest-src 'self'`, `upgrade-insecure-requests`, and `report-uri /api/csp-report` + `report-to`. Nothing regresses.
- Nonce policy (`'nonce-…' 'strict-dynamic'` + SHA-256 hashes for the three static inline scripts, with `https: 'unsafe-inline'` as the CSP2/CSP1 ladder) goes out as `Content-Security-Policy-Report-Only` on the 117 routes Next renders per request (`NONCE_ELIGIBLE_ROUTES`, re-derived from `src/app` by `csp.test.ts`, which also checks the last build's `prerender-manifest.json`). Static and ISR routes never get a nonce: Next 14 does not force dynamic rendering on a nonce, so a nonce would be missing from cached HTML or baked into the ISR cache. Next reads the nonce from the forwarded request CSP header and stamps it on its bootstrap and `next/script` tags; `x-nonce` is forwarded for server components. **Correction (2026-09-03, verified — see "CSP: nonce diagnosis" below): this only actually happens when the nonce is on the *enforced* `Content-Security-Policy` header. On `Content-Security-Policy-Report-Only`, Next stamps no nonce on anything.** Do not treat this bullet's original claim as still accurate for the report-only path.
- The root layout deliberately does **not** call `headers()` (that would opt all 600+ prerendered routes out of static rendering); its two inline scripts and the embed layout's one are rendered from `INLINE_SCRIPTS` and allow-listed by hash. `GoogleAnalytics` accepts an optional `nonce` prop.
- `POST /api/csp-report` accepts `application/csp-report` and `application/reports+json`; keeps directive, blocked origin, document path, disposition and coarse UA family; drops samples/source/line/cookies; dedupes `directive|origin` for 60s; logs `csp_violation` via `@/lib/logger`; always 204. Middleware: CSRF-exempt, 20/min/IP, `no-store`.
- `LessonInteractive` calculator formulas now go through `src/components/learn/safe-expression.ts` (tokenizer + recursive-descent parser) instead of `new Function` — the only `'unsafe-eval'` need in the app is gone. Every seed formula in `scripts/seed-learning*.ts` is regression-tested against the old evaluator.

**Rollout.** `CSP_MODE` (Railway env) — unset/`report-only` (default) sends the nonce policy as Report-Only on eligible routes; `enforce-nonce` makes it the enforced header there. ~~Flip `CSP_MODE=enforce-nonce` after 7-14 days of clean `csp_violation` logs~~ **SUPERSEDED 2026-09-03 — do not use this gate, it cannot fire correctly. See "CSP: nonce diagnosis (2026-09-03)" below for why and what to do instead.** Once nonce enforcement is eventually viable, still prune the server-only `connect-src` hosts in `LEGACY_CONNECT_HOSTS` (spaceflightnewsapi, thespacedevs, swpc.noaa, celestrak, ssd-api/epic/eonet/images-api NASA, helioviewer, eyes.jpl, wheretheiss, sbir.gov, exoplanetarchive, asterank, spacexdata, googleapis) — they are fetched server-side only as far as recon shows and are kept for now so nothing regresses. Tests: `csp`, `csp-report-route`, `safe-expression`.

## CSP: enforced-policy fixes + nonce diagnosis (2026-09-03)

**Trigger.** A full day of real production `csp_violation` reports (`POST /api/csp-report` → `logger.warn`) surfaced two separate problems: the *enforced* policy was blocking live third-party resources on ad-bearing pages, and the *report-only* nonce policy was blocking our own scripts everywhere — which, if `CSP_MODE=enforce-nonce` had been flipped per the "clean logs" gate above, would have taken the site down.

### A. Enforced-policy host fixes

Prod reports showed `frame-src` blocking `pagead2.googlesyndication.com`, `ep2.adtrafficquality.google` and `www.google.com`; `style-src-elem` blocking `fonts.googleapis.com`; and `script-src` blocking `eval`, on `/guide/space-launch-cost-comparison`, `/space-stocks`, `/space-talent/job/*`, `/blog/*`, `/launches/cape-canaveral/2026-09`.

A real-browser repro (headless Chrome, 1440×2400, scrolled + 12s settle) against `/guide/space-launch-cost-comparison` and `/space-stocks` narrowed the actual impact (script at `scratchpad/ad-impact.js` from that session):
- `window.adsbygoogle` is defined and the ad `<ins>` slot gets an iframe on both pages — **the AdSense tag itself is not broken.** Slot status `unfilled` is a headless-bot no-bid, not a CSP effect.
- The two frames that reproducibly, consistently blocked on both pages: `ep2.adtrafficquality.google` and `www.google.com` (Google's invalid-traffic-detection / auxiliary frames). Blocking these plausibly degrades Google's invalid-traffic signal and ad serving quality without stopping delivery. **Added to `frame-src`**, along with `ep1.adtrafficquality.google` (its sibling, seen in `connect-src` already) and `fundingchoicesmessages.google.com` (consent-mode iframe, not reproduced blocked but same origin family). `pagead2.googlesyndication.com` did not reproduce blocked in this run but is in the prod report log — kept in `frame-src` as intermittent.
- `fonts.googleapis.com`: zero `link[href*="fonts.googleapis"]` tags exist in our own DOM on either page — `next/font` genuinely still self-hosts, so the 2026-09-01 rewrite was right to call it unused *from our own code*. The request is a stylesheet some third party (most likely Google's ad/consent tooling) injects at runtime. **Restored to `style-src`** with that framing (not "our pages need it"), plus `fonts.gstatic.com` added to `font-src` for the font files the stylesheet would `@import`.
- `eval`: predates the 2026-09-01 rewrite (the old policy blocked it too — not a regression). The real-browser repro showed the AdSense tag works correctly **without** `'unsafe-eval'`. Decision: **left blocked** (option ii of the three considered — leave blocked / global `'unsafe-eval'` / scope `'unsafe-eval'` to an ad-route allowlist). Scoping was rejected because the AdSense loader (`pagead2.googlesyndication.com/pagead/js/adsbygoogle.js`) is mounted in the root layout (`src/app/layout.tsx`) behind only an env-var check, i.e. the "ad-bearing route set" is effectively the whole site, not a small stable list — scoping would mean widening globally anyway. Global `'unsafe-eval'` was rejected because nothing observed needs it. Revisit only if a specific Google feature is shown to require it.
- Confirmed no first-party `eval`/`new Function` remains: `src/components/learn/safe-expression.ts` replaced the Learn calculator's `new Function` (2026-09-01), and a repo-wide grep for `eval(`/`new Function` outside `__tests__` is clean.

All of this is implemented in `src/lib/csp.ts` (`FRAME_SRC_HOSTS`, `style-src`, `font-src`) with inline comments recording the reasoning above; `src/lib/__tests__/csp.test.ts` updated to match.

### B. Nonce diagnosis: the report-only experiment cannot validate itself

**Question asked.** Prod reports repeatedly showed `script-src-elem` violations with `blockedOrigin: "https://spacenexus.us"` and `disposition: "report"` on `/launch/*`, `/history/*`, `/guide/watch-a-launch/*` — our own scripts, blocked under our own report-only nonce policy. Hypothesis to check: does Next only honour a nonce on the *enforced* `Content-Security-Policy` header, ignoring `Content-Security-Policy-Report-Only` — which would mean the whole "flip after clean report-only logs" plan (the superseded rollout line above) could never actually validate anything?

**Method.** Static analysis first: the installed Next 15.5.25's own source (`node_modules/next/dist/server/app-render/app-render.js:108`) reads `headers['content-security-policy'] || headers['content-security-policy-report-only']` — a fallback that, on paper, supports report-only. But Next's official CSP guide (`nextjs.org/docs/app/guides/content-security-policy`) only ever demonstrates the *enforced* header for nonce plumbing; report-only is never mentioned as a supported source. That discrepancy warranted an empirical test rather than trusting either source.

Empirical test, in two parts:
1. **Production**, `curl -D-` against `/embed/space-weather` (force-dynamic, `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` — genuinely rendered per request, not cached): the response correctly carries a fresh `Content-Security-Policy-Report-Only` header with a new nonce on every request (`nonce-89IzVyc8...`, `nonce-XGcXI4Db...`, `nonce-D2L2Nrad...` across three sequential requests — proving the middleware runs and forwards correctly). But **zero** `<script>` tags in the rendered HTML carry a `nonce` attribute — not Next's own bootstrap/chunk scripts, not our three hash-listed inline scripts.
2. **Local A/B on the exact same build** (`.next/` already built; `npx next start` — not a fresh `next build`), same route, only `CSP_MODE` changed:
   - `CSP_MODE=report-only` (today's prod default): identical to prod — nonce present and fresh in the `Content-Security-Policy-Report-Only` header, **zero** script tags nonce'd (of 58 total `<script>` tags).
   - `CSP_MODE=enforce-nonce`: nonce present in the *enforced* `Content-Security-Policy` header, and **50 of 58** script tags correctly stamped `nonce="<the header's nonce>"` — Next's bootstrap/chunk scripts all matched exactly.

**Finding.** Confirmed: in this exact production Next.js version and deployment (`next start`, no custom server, no `output: standalone`), Next stamps the nonce onto its own scripts only when it arrives on the *enforced* `Content-Security-Policy` request header. A nonce present only on `Content-Security-Policy-Report-Only` is never applied to anything, despite the fallback line existing in Next's own source. **Consequence: the report-only nonce experiment is structurally unable to validate readiness.** Every `script-src-elem` violation logged against our own origin under report-only mode is an artifact of this dead mechanism — not evidence of real or missing nonce coverage. The "flip after 7-14 days of clean report-only logs" gate in the original rollout plan could never have fired cleanly, because Next never nonces anything in that mode; the logs were never going to go clean.

**Second, independent blocker found in the same A/B.** Of the 58 script tags, the 8 left un-nonce'd under `enforce-nonce` were the 3 expected hash-covered `INLINE_SCRIPTS` (correct — they don't need a nonce) **plus 5 `<script type="application/ld+json">` SEO structured-data blocks** with neither nonce nor hash. These come from `src/components/StructuredData.tsx` (rendered globally in the root layout) and the per-page `src/components/seo/*Schema.tsx` family (`ArticleSchema`, `BreadcrumbSchema`, `EventSchema`, `FAQSchema`, `HowToSchema`, `ItemListSchema`, `JobPostingSchema`, `OrganizationProfileSchema`, `ProductSchema`, `ServiceSchema`, used across roughly 100 route files). Most carry per-page dynamic content (article titles, job postings, prices) so they cannot be hash-allow-listed the way the three static `INLINE_SCRIPTS` are. Under `strict-dynamic`, a CSP3 browser ignores the `'unsafe-inline' https:` fallback, so **these would be blocked outright by real browsers the moment `CSP_MODE=enforce-nonce` is flipped on any nonce-eligible route that renders structured data** — which is most of them.

**Recommendation for the ~2026-09-08 `CSP_MODE` decision: do NOT flip to `enforce-nonce`.** The enforced-policy hardening in section A above is the safe, working path and needs no flag flip. Resume the nonce ambition only after both: (a) threading a nonce prop through every SEO schema component listed above (a threading exercise across ~100 call sites, not attempted in this pass — out of scope for "smallest correct fix"), and (b) re-testing readiness against the *enforced* header on a couple of already-dynamic routes (since report-only telemetry cannot tell us anything, per the finding above) rather than trusting the report-only log volume.

**Files changed:** `src/lib/csp.ts` (host lists, comments, corrected nonce-mechanism documentation), `src/middleware.ts` (corrected comment on the request-header forwarding block), `src/lib/__tests__/csp.test.ts` (matching test updates). No behavior change to `CSP_MODE` handling itself — the recommendation above is about the *decision*, not the code; the report-only experiment keeps running (harmless, since it's report-only) but should not be read as evidence either way.

**Verification script:** `scratchpad/csp-verify.js` (puppeteer, real browser) — loads an ad-bearing guide page, `/space-stocks`, a `/launch/*` page, and `/embed/space-weather`, captures `console`/`pageerror`, counts CSP violations by directive, and exits non-zero on any *enforced* violation from `fonts.googleapis.com`, `www.google.com`, `pagead2`, `ep1`/`ep2.adtrafficquality`, or our own origin. Run it after deploying this change.

## Game exploit batch 2026-09-02

An adversarial audit of the Space Tycoon economy routes on the evening of
2026-09-02 produced nine verified exploits. Every one is closed below;
`src/lib/__tests__/game-exploit-regressions.test.ts` reproduces each recipe
and asserts it now fails. Companion changes to existing suites:
`ledger-reconcile.test.ts`, `resource-plausibility.test.ts`,
`sync-resource-clamp.test.ts`, `inventory-phase2.test.ts`,
`game-authz-regressions.test.ts`.

### C-1 — First sync of a new profile was unclamped (fixed)

**Was.** `sync/route.ts` gated `clampPlausibleMoney` on `if (existingProfile)`
and the upsert's `create` branch wrote money / totalEarned / totalSpent /
netWorth / resources / buildings / research / gameYear verbatim from the body.
Register + one POST with `money: 9e14` and a forged map = rank #1, and phase-2
adoption later copied the forged map into `serverResources`.

**Now.** A profile with no row is CREATED (never upserted — a transient read
failure can no longer overwrite a real row with the kit; the route throws if
the referral lookup sees a row the economic read did not) from the server-
derived **first-sync kit** (`src/lib/game/sync-validation.ts`
`buildFirstSyncKit`): `STARTING_MONEY` (or the archetype's `startingMoney`
when the body carries a `startingArchetype` id that exists in
`ARCHETYPE_MAP`), the archetype's `startingResources` / `startingBuildings` /
`startingServices` with server-generated instance ids (mirrors
`applyArchetype`), `unlockedLocations` = `['earth_surface','leo']` (+ the
kit's building locations), no research, no ships, `gameYear = STARTING_YEAR`.
`useGameSync.ts` now sends `startingArchetype`. In the same request the
phase-1 marker `_resourceBaselineAt` and `_resourceCeilings` are set from
the kit and `serverResources` is adopted from the kit, so the NEXT sync is
already clamped against server defaults and the phase-2 "adopt the client
view" path never runs for new profiles. A body money figure that differs
from the server starting money by > 1 % writes MarketAuditLog
`first_sync_body_ignored` (info). The response carries `firstSync: true`.

Trade-off: a player who played anonymously for hours and then registers
starts server-side at the kit; the money figure catches up at the
time-proportional ceiling ($120M per 60 s sync), resources through the
phase-1 growth allowance. That is the intended trust model.

### C-2 — $10M-per-request money ratchet (fixed)

**Was.** `clampPlausibleMoney` used `max(elapsedMs, 5000) × $2M/s`, every
sync wrote `lastSyncAt = now`, so a tight loop earned >= $10M per request
(~$2B/min). The phase-1 flat floor `max(100, 0.25 × prev)` compounded per
request the same way.

**Now** (`ledger-reconcile.ts`, `resource-plausibility.ts`, `sync/route.ts`):

- `plausibleIncomeHeadroom(elapsedMs)` = 0 below
  `MIN_PLAUSIBILITY_ELAPSED_MS` (5 s), linear `elapsedMs × $2M/s` up to the
  30-day cap. No floor: money may only stay <= prevMoney + ledger deltas on
  a rapid re-sync. `MIN_PLAUSIBILITY_ELAPSED_MS` is kept as the threshold
  (it also windows the craft-attestation caps).
- `elapsedGameMonths` returns 0 below the threshold; the flat floor is
  time-proportional: `flatFloor(prev, months) = max(100, 0.25 × prev) ×
  min(1, months)` (`flatFloorScale`), so one full allowance per game month
  (60 s at 1×), never more per sync. `ceilingFor` and
  `advanceServerResources` inherit it; `clampResources` takes the window
  for the unknown-slug floor.
- **Server-enforced cadence.** A sync arriving < `SYNC_MIN_INTERVAL_MS`
  (10 s) after the row's `lastSyncAt` is a 429
  `{ error: 'sync_too_frequent', retryAfterMs }`; an in-memory per-profile
  window (`route-throttle.ts`, `allow(profileId,'sync',1,10_000)`) closes
  the concurrent-request race two tabs could win. `useGameSync.ts` treats a
  429 as "another tab synced", not an error. The client interval is 60 s
  (30 s floor), so honest clients never see it.

### C-3 — Orbital-slot lease transfer debited a non-consenting buyer (fixed)

**Was.** `action:'transfer'` let the seller supply `toCompanyName` (non-
unique) and `price`, debited that buyer on the spot, and its "Buyer has
insufficient funds" 400 was a balance oracle.

**Now** (`orbital-slots/route.ts`, `src/lib/game/slot-transfer-listings.ts`):
two-phase. `action:'list'` — the holder posts an asking price within
`[0.5×, 3×]` of the lease's reference price (its last `leaseAmount`, else
`computeMinBid(locationId)`), optionally pinned to a buyer **profileId**
(existence checked, balance never read); `action:'unlist'` withdraws it;
`action:'accept'` — the BUYER's own session pays: `updateMany` on
`{ id, holderId: seller, status: 'active' }` (atomic against a concurrent
accept / expiry), buyer debit + seller credit + both ledger rows in one
transaction. Every failure a third party could probe is a generic 400
"Transfer not available"; only the buyer's OWN insufficient balance is named.
`action:'transfer'` returns 410. GET now returns `transferListings` and each
of `myLeases[].listing`.

**Storage decision.** `OrbitalSlotLease` has no Json column and schema
changes were out of scope, so listings live in a bounded in-memory registry
(24 h TTL, per instance; a redeploy drops open listings — the seller
relists). **A schema column is needed for a durable version:**
`OrbitalSlotLease.askingPrice Float?`, `listedAt DateTime?`,
`listedForProfileId String?` — then `putListing/getListing` become row
updates and the registry goes away.

### C-5 / M-8 — Non-finite and unvalidated numerics (fixed)

**Was.** `netWorth` was computed from the raw client resources map
(`{"iron":1e308}` → Infinity; NaN sorts first in Postgres → rank #1).

**Now.** `validateSyncEconomics` (`sync-validation.ts`) runs before anything
else: money / totalEarned / totalSpent finite and <= 1e15 (|money|);
gameYear within [2000, 2400] (STARTING_YEAR is 2026, so the floor is 2000
rather than the requested 2050); counts finite >= 0; every resource finite,
>= 0, <= 1e12, slug-shaped key, <= 400 keys; buildings (<= 200) need a
`definitionId` in `BUILDING_MAP` and a `locationId` in `LOCATION_MAP`, ships
(<= 50) a `definitionId` in `SHIP_MAP` and a slug-shaped `currentLocation`
(interstellar ships sit at `transit_<system>` / star-system ids that are
not in `LOCATION_MAP`, so ships are not location-checked against it),
services (<= 100) a `definitionId` in `SERVICE_MAP` and a location in
`LOCATION_MAP`; booleans / numbers coerced and clamped, unknown keys
dropped, duplicate `instanceId`s deduped. The first problem is a 400
`{ error, field }`; money is never coerced. Net worth is valued over the
**authoritative** inventory (the server map advanced this sync, else
`loadAuthoritativeInventory`, else the clamped client view) with
`Number.isFinite` guards on every quantity, price and the sum.

Note: an honest client whose save references a definition that has since
been removed from the registry will now get a 400 on every sync. The save
loader migrates retired ids as far as recon shows; if a `field:
'buildings[i].definitionId'` 400 ever appears in logs for a real player,
soften that one check to drop-and-log.

### H-3 — Global milestones claimable without achieving them (fixed)

`milestones/route.ts` now runs `verifyMilestone`
(`src/lib/game/milestone-verification.ts`) before writing the row.

| Milestone | Condition | Verification |
|---|---|---|
| `milestone_first_billion` | money >= $1B | **server** (clamped `GameProfile.money`) |
| `milestone_trillion` | money >= $1T | **server** |
| `milestone_moon` / `_mars` / `_jupiter` / `_outer_system` | presence at lunar_surface / mars_orbit / jupiter_system / outer_system | **server** when a `ColonyClaim` row exists for the location (claim fee burned + presence required), else **snapshot-aged** (completed building at the location) |
| `milestone_first_orbit` | completed building in leo | **snapshot-aged** |
| `milestone_asteroid_mine` | completed `mining_asteroid` | **snapshot-aged** |
| `milestone_ten_research` | >= 10 completed research | **snapshot-aged** |
| `milestone_ten_services` | >= 10 active services | **snapshot-aged** |

Snapshot-aged = the fact must be in the profile NOW and in an
`EconomicSnapshot` with `takenAt` >= 24 h old (`MILESTONE_SNAPSHOT_AGE_MS`;
the daily cron). Condition absent now → 400 "Milestone condition not met";
no aged snapshot, or none carrying the fact → 409 `verification pending`.
The 25 %-late rule is measured at the qualifying time (the first aged
snapshot carrying the fact, or now for server facts), so the 24 h wait never
pushes an honest player past the target window. `PlayerActivity.metadata`
and the response carry `verifiedBy`.

### H-5 — market/trade moved the world price with no holdings / funds check (fixed)

**Decision: ledgered escrow path inside the route** (not an order-book IOC
wrapper). The client applies the trade locally on the 2xx (MarketPanel and
CraftingPanel call `onSellResource/onBuyResource` with `trade.totalCost`),
so an IOC wrapper would have double-applied through the pending-delta
channel and forced a client rewrite, and the NPC curve's liquidity
semantics differ from the maker's daily volume caps. Smaller correct change:

- profile required (404 otherwise); `market-trade` 30/min per profile;
- buy: `profile.money >= totalCost`; sell: `resolveSellableQuantity`
  (server truth + unfolded ledger tail) >= quantity, with
  `sell_gated_by_server_inventory` audit when the client map alone would
  have allowed it;
- price/supply update, wallet move (`money` ± totalCost, `totalEarned` /
  `totalSpent`), client-view goods move (`resources`), `MarketOrder` record
  and ledger rows (`market_trade_buy_payment` / `market_trade_buy_goods` /
  `market_trade_sell_goods` / `market_trade_sell_proceeds`) in ONE
  transaction;
- the new reasons are `CLIENT_APPLIED_LEDGER_REASONS`
  (`ledger-reconcile.ts`) — excluded from the client's pending-delta query
  (`PENDING_EXCLUDED_LEDGER_REASONS`) because the client already applied
  them, but NOT stamped folded, so the goods leg folds into
  `serverResources` like any other server-side move.

### M-2 — Client-writable stash keys (fixed)

`stripStashKeys` drops every `_`-prefixed key from the inbound `workforce`
object before the merge, so `_resourceBaselineAt`, `_resourceCeilings`,
`_resourceDivergenceLoggedAt` can only ever be written by the server.
`_commanders` (`sanitizeCommanderIds`: ids in `COMMANDER_MAP`, deduped,
<= 30) and `_factionLicenses` (`sanitizeFactionLicenses`: ids in
`FACTION_LICENSE_MAP`, <= 12) are validated against the registries;
`_factionRep` keeps its ±100 clamp. Client workforce JSON is capped at
32 KB.

### M-6 — Three fail-open crons (fixed)

`alliance-cron`, `seasons/cron`, `rivals/snapshot` now call
`requireCronSecret` (fail-closed, timing-safe) — the hand-rolled checks
waived auth whenever `CRON_SECRET` was unset or `NODE_ENV !== 'production'`.

### M-7 — Per-profile rate limits on economic routes (added)

`src/lib/game/route-throttle.ts`: bounded in-memory sliding window,
`allow(profileId, routeKey, max, windowMs)` → `{ allowed, remaining,
retryAfterMs }` (denied hits are not recorded). Applied: market/orders
30/min, market/trade 30/min, bounties 10/min, predictions/stake 10/min,
equity 10/min, colonies 5/min, milestones 5/min, zones/challenge 5/min,
orbital-slots 10/min, sync 1 per 10 s (C-2). 429 body:
`{ error: 'rate_limited', routeKey, retryAfterMs }`. `src/middleware.ts`
adds a per-IP `tycoon-economy` bucket (60/min) over the same POST paths.

### Follow-ups

- Durable slot-transfer listings need the schema columns named under C-3.
- Phase 1.5 still owes the tighter growth allowance (research / workforce /
  commanders evaluated for real); the megastructure passive allowance alone
  lets iron grow ~9 000 units per 60 s window.
- The `buildings[i].definitionId` 400 (C-5) is the one validation that can
  hit an honest player with a retired definition — watch logs after deploy.

## Phase 3 slice 1 — buildings (2026-09-02)

Founder-approved item 5. §5 of the design review named the structural fix
for the remaining class (contracts, book value, zones, season ceilings all
reading client-written `buildingsData`): a server-side construction ledger
where an asset row exists only because a paid, ledgered server transaction
created it, with server timestamps for completion. This slice does that for
BUILDINGS; ships, research, services and locations follow.

### What is authoritative now

**`ServerAsset`** (prisma; DDL applied by hand before deploy) — `kind`
('building' now), `definitionId`, `instanceId` (the client's own id,
`@@unique([profileId, instanceId])`), `locationId`, `status`
(`pending | complete | mothballed | sold`), `markLevel`, `startedAt`,
`completesAt`, `paidMoney`, `paidResources`, `ledgerSeq`. A row is written
only by:

| Route (session + 30/min/profile, `route-throttle.ts`) | Effect | Ledger reasons |
|---|---|---|
| `POST /api/space-tycoon/assets/build` `{definitionId, locationId, instanceId}` | validates definition / `requiredLocation` / `requiredResearch` / `maxPerPlayer` (`checkBuildingCap` over live rows) / unlock / orbital-slot gate; prices with `scaledBuildingCost(baseCost, liveRowsOfThisDefAtLocation) × (1 − research buildCostReduction)` from the PERSISTED research list; verifies materials against `loadAuthoritativeInventory`; atomic `updateMany money >= cost`; inserts `pending` with `completesAt = now + serverSeconds`. Retry-safe: an existing `instanceId` returns the row, charges nothing. | `building_build` (−money, burned), `building_build_resources` (−qty per slug) |
| `POST /assets/refit` `{instanceId}` | `canStartMarkUpgrade` on the server row (damage merged from the client JSON); writes the TARGET `markLevel` + `completesAt = now + refit seconds`, status stays `complete` | `building_refit`, `building_refit_resources` |
| `POST /assets/sell` | `complete\|mothballed → sold` (status-guarded); credits `computeDecommissionRecovery` | `building_decommission_recovery` (+money, +materials) |
| `POST /assets/mothball` / `/reactivate` | status flips; reactivation charges `REACTIVATION_FEE_FRACTION × baseCost` | `building_reactivation_fee` (burned) |
| `POST /assets/repair` `{instanceId, damagePct}` | charges `calculateRushRepairCost` for the (client-owned, capped 0.85) damage; the row is untouched | `building_rush_repair` (burned) |
| `GET /assets` | the profile's rows after a lazy pending → complete pass | — |
| `POST /api/cron/assets-complete` (every 5 min, `tycoon-assets-complete`) | `pending → complete` where `completesAt <= now`; the sync and GET run the same pass lazily | — |

All seven reasons are in `CLIENT_APPLIED_LEDGER_REASONS`: the client applies
each order locally on the 2xx, so the rows are never handed back as pending
deltas, but their resource legs are NOT stamped folded — they fold into
`serverResources` on the next sync like the market/trade goods legs (H-5).

**Location unlock** is `STARTING_LOCATIONS (earth_surface, leo)` ∪ the
persisted `unlockedLocationsList` ∪ `ColonyClaim` rows. ColonyClaim alone
cannot be the gate: since the 2026-09-01 hardening a claim REQUIRES a
completed building at the location, so the first building anywhere new would
be impossible. `unlockedLocationsList` is client-synced (the unlock fee is
not yet server-ledgered) — the 'location' asset kind closes that.

**Completion time.** `serverSeconds = scaledBuildTime(realBuildSeconds,
count) / min(2, 1 + research buildSpeedBonus) / DEV_FAST_MULTIPLIER`. The
client-only multipliers the server cannot evaluate from persisted columns are
IGNORED — every one of them only makes a build faster, so the server figure
is the conservative (slower-or-equal) value: workforce `buildSpeed`,
specialization `build_speed`, victory `buildSpeed`, alliance
`buildSpeedBonus`, legacy build speed, corporate-era multiplier, megastructure
`buildSpeedMultiplier`, reputation, commander and doctrine multipliers, and
active construction boosts. The client keeps its own tick math (it receives
`realDurationSeconds` = the base scaled time, exactly what it computed
before) and stores the server's `completesAt` as `serverCompletesAtMs`, so a
structure can read "complete" locally a little before the registry flips it.
Refits use `getMarkUpgradeSeconds` on both sides — identical.

### The client is server-first

The six `page.tsx` handlers (`handleBuild`, `handleMarkUpgradeBuilding`,
`handleSellBuilding`, `handleMothballBuilding`, `handleReactivateBuilding`,
`handleRushRepairBuilding`) validate locally, call the route, and mutate
local state ONLY on a 2xx, using the server's cost and timing
(`asset-client.ts`). A 401 / `no_profile` 404 (no account, never synced) is
"local-only play" and keeps the pre-registry path; a network failure or any
other refusal mutates nothing and surfaces the reason (error sound + toast;
a request slower than 800 ms shows a "confirming with the registry" hint).
The build and refit paths no longer attest their material spend through
`builtThisTick` (the route ledgered it — attesting too would double-count);
research and ship attestation stay client-side for later slices.
`applyMarkUpgradeStart` gained `{ attestMaterials, startedAtMs,
durationSeconds }` for this.

### Sync reconciliation — `ASSET_LEDGER_MODE=off|shadow|enforce` (default shadow)

Server-side in `server-assets.ts`; wired into the sync before the book-value
line. Per sync:

- **Adoption ratchet (`_assetBaselineAt`, server stash, `stripStashKeys`-
  protected).** The first sync of a profile without the marker inserts a row
  for every complete / pending / mothballed client building (`paidMoney 0`,
  `ledgerSeq null`; pending keeps `startedAtMs + realDurationSeconds` from
  the raw body; 'decommissioning' skipped) and stamps the marker — exactly
  once. The `createMany` is issued even for zero rows so it doubles as the
  availability probe: no marker is ever stamped while the table is missing.
  A brand-new profile's starter-kit buildings become its first rows in the
  same request. The asset routes run the same adoption when an order arrives
  before the first post-deploy sync.
- **shadow:** `diffClientAssets` → client buildings with no live row are
  audited `client_asset_not_in_ledger` (warning, 1/hour/profile via
  `_assetAuditLoggedAt`) and persisted as today; server rows the client no
  longer lists are `server_asset_not_in_client` (info) and left alone.
- **enforce:** those buildings are DROPPED from the persisted
  `buildingsData` (`client_asset_rejected`, critical) and returned as
  `assetLedger.rejectedInstanceIds`; `useGameSync` queues them and
  `processFullTick` applies `applyAssetReconciliationToState`
  (asset-reconcile.ts): removes the buildings and any service linked solely
  to them, refunds nothing (never paid server-side), idempotent by
  instanceId. Unlisted server rows stay logged-only; the reader helper simply
  never counts a row the client stopped listing — a client can only ever
  REDUCE its own asset set.

### Readers switched — `loadServerBuildings(profileId, buildingsData)`

Returns BuildingInstance-shaped objects (`source: 'server' | 'client'`):
identity, location, completion, mark level, mothball status and timing are
server-owned; `damagePct`, `supplyPolicy`, `upgradeLevel`, the transitional
'reactivating' status and the game-date labels are merged from the client
JSON by instanceId, so downstream math is unchanged. A `complete` row with a
future `completesAt` is a refit in progress at `markLevel − 1`. Shadow →
the UNION (server rows + client-only rows); enforce → server rows the client
still lists; off / unavailable table → the client JSON. Batched form
`loadServerBuildingsForProfiles` for the crons.

Switched: `checkContractFulfillment`'s callers (`bidding/fulfill`,
`competitive-contracts`), the sync's book net worth (same line as
`frontier.ts computeBookNetWorth`), `zones/update`, `demand-pools/update`,
`labor/update`, `seasons/progress` (→ `season-metrics-server`),
`speed-runs/check`, and `milestones` (live facts; the aged
`EconomicSnapshot` columns stay JSON). Espionage target reads stay on the
JSON for now — intel, not money.

### Rollout

1. Apply the DDL (`ServerAsset` + indexes), deploy. Default shadow: every
   active profile adopts on its next sync; the routes start writing rows.
2. Watch `MarketAuditLog WHERE eventType IN ('client_asset_not_in_ledger',
   'server_asset_not_in_client')` for ~7 days. A `client_asset_not_in_ledger`
   on an honest profile means a client path still creates buildings without
   the route — fix the path, then null the profile's `_assetBaselineAt` to
   re-adopt.
3. `ASSET_LEDGER_MODE=enforce`. Profiles without the marker still read as
   union (no rows could exist yet), so a late returner is adopted, never
   wiped.

### What remains (later slices)

Ships (`shipsData`, `ships_at_location`, book value), research
(`completedResearchList` — the research gate above trusts it), services
(`activeServicesData`, `services_count`, season ceilings), locations (the
unlock fee), the espionage reads, and the phase-1.5 growth allowance.

Tests: `server-assets.test.ts` (pricing / duration / row projection /
merge / diff / adoption; build route 401 / 429 / every validation / atomic
debit + ledger rows + pending row / retry-safety / adoption / 503; refit,
sell, mothball, reactivate, repair ledger effects; cron fail-closed + flip),
`asset-reconcile.test.ts` (adoption once + table-missing guard; shadow audit
+ throttle + unlisted rows; enforce drop + rejected ids + book value; off;
client removal idempotent + queue merge).

## Phase 3 slices 2-5 — research, ships, services, locations (2026-09-02)

Slice 1 made buildings server-created. This extends the same design — the
same `ServerAsset` table, the same `ASSET_LEDGER_MODE` ladder, the same
adoption ratchet, the same reader switch — to the four remaining
client-written columns: `completedResearchList`, `shipsData`,
`activeServicesData`, `unlockedLocationsList`. No schema change: `kind` is
now `'building' | 'research' | 'ship' | 'location'`; services are never
rows (below). No DDL for this deploy.

### What is authoritative now

| Route (session + 30/min/profile) | Effect | Ledger reasons |
|---|---|---|
| `POST /assets/research` `{definitionId, instanceId}` | validates prerequisites against the registry's research view, not-complete / not-in-progress, the repeatable level cap (= count of complete rows of that definition), and the **two-queue rule** (pending research rows vs `1 + parallel_research` — `page.tsx handleStartResearch`'s rule mirrored); prices with `research-tree.ts getResearchDisplayState` on the server view (`baseCostMoney`, the 2× doctrine override, the ×2.5/level repeatable escalation — `computeServerResearchQuote`); verifies `def.resourceCost` against `loadAuthoritativeInventory`; atomic debit; inserts `pending` with `completesAt = now + effectiveSeconds / min(1.5, 1 + research speed bonus) / DEV_FAST`. Retry-safe by instanceId. | `research_start` (burned), `research_start_resources` |
| `POST /assets/ship` `{definitionId, locationId, instanceId}` | validates `requiredResearch` (registry view), the build location (registry location projection) and a hard shipyard cap (pending hulls < `MAX_SHIPYARD_SLOTS`); prices with `applyLaunchCostReduction(def.baseCost, worldMegaProjectBonuses)` + `def.resourceCost`; inserts `pending` with `completesAt = now + def.buildTimeSeconds` (identical on both sides — the engine applies no multiplier to ship builds). | `ship_build` (burned), `ship_build_resources` |
| `POST /assets/scrap` `{instanceId}` | `pending\|complete → scrapped` (terminal, status-guarded); credits `30 % × baseCost`. Idle rule: the PERSISTED `shipsData` status must be idle in every mode. Shadow + no row → accepted with `ledgered: false` (no credit; the client applies its local salvage as before). Enforce + no row → 404; a missing persisted entry is audited `ship_scrap_status_unverified` before the credit. | `ship_scrap_recovery` (+money) |
| `POST /assets/unlock` `{locationId}` | validates the location (`LOCATION_MAP` — base bodies and the colony bodies merged from `colonies.ts`) and its `requiredResearch` (registry view); charges `loc.unlockCost`; inserts a `complete` `'location'` row (`instanceId location:<id>`). Starting locations, an existing row and a `ColonyClaim` on the body are all free + idempotent. Replaces the free client unlock. | `location_unlock` (burned) |
| `GET /assets` | now lists every kind | — |
| `POST /api/cron/assets-complete` | flips `pending → complete` for every kind; a completed **research** row is also appended to the profile's persisted `completedResearchList` (+`researchCount`) exactly once (non-repeatable definitions only), so readers still on that column stay correct during shadow. | — |

All six new reasons are in `CLIENT_APPLIED_LEDGER_REASONS` (the client
applies each order locally on the 2xx; resource legs fold into
`serverResources` on the next sync).

**Services** have no purchase route. `deriveServicesFromAssets(buildings,
research)` is `game-engine.ts §5` evaluated server-side: one service per
(complete building, `enabledServices` entry whose `requiredResearch` is
complete), `revenueMultiplier(min(researchCount, 10))`. `loadServerServices`
derives it from the MERGED buildings + MERGED research (so shadow keeps union
semantics end to end) and matches the client's list by (definition,
building) — or (definition, location) for the pre-slice payload that sent
no `linkedBuildingIds`. Parity with `processTick` is unit-tested on a
fixture.

**Locations** are a projection: `loadServerLocations = STARTING_LOCATIONS ∪
ColonyClaim ∪ complete 'location' rows` (∪ the persisted list in shadow;
rows ∩ the persisted list in enforce). A ColonyClaim is server truth on its
own and always counts.

**The unlock / colony split.** `POST /colonies` sells the COLONY SLOT
(`colonies.ts claimCost`, presence-gated, slot-capped; it is what
`colony_established` contracts read). `POST /assets/unlock` sells ACCESS
(`unlockCost` — build / dispatch there). These were already two different
fees before this slice (the client charged `unlockCost` locally, the claim
charged `claimCost` server-side); nothing is charged twice for the same
thing — a claimed body unlocks free, and an unlocked body is idempotent.
The literal "colony bodies only through /colonies" split is impossible
without loosening the 2026-09-01 hardening: a claim REQUIRES a completed
building or ship at the body, which requires the unlock first. Follow-up:
the client's claim POST at unlock time can never satisfy the presence gate;
a "Claim colony" action belongs in the map panel once the corporation is
present.

### What stays client-owned condition (documented, not enforced)

- **Ships:** `name`, `status`, `currentLocation`, `route`, cargo,
  `miningOperation`, `surveyExpedition`, hull damage. The registry records
  that a hull exists and was paid for, not where it is. `rowToShipInstance`
  merges these by instanceId; a row with no client entry sits idle at its
  build location. Readers of `currentLocation` (colony presence, demand
  pools) therefore still trust the client for the location leg.
- **Research:** rare-tech visibility (`unlockedRareTechIds` is never
  synced); the client-only speed multipliers (every one ≥ 1, so the server
  completion is slower-or-equal, like buildings); the exact per-tier
  shipyard slot count (the server enforces only the hard cap).
- **Research timing edge:** the server flips a research row and appends the
  id on its own clock; a client whose local timer has not finished yet
  re-sends its own list on the next sync. Shadow persists the UNION with
  the complete rows so the appended id is never lost; enforce counts only
  rows the client still lists (conservative, self-healing once the client
  finishes).
- **Repeatable programs:** level = count of complete rows of that
  definition; the client's `repeatableResearchLevels` is not synced.

### Sync reconciliation + adoption

Same block, same modes, same 1/hour/profile audit throttle
(`_assetAuditLoggedAt`):

- **Adoption ratchet 2 (`_assetBaselineAt2`).** A profile slice 1 already
  stamped adopts its research / ships / non-starting locations exactly once
  under the second marker (`buildAdoptionRows2`; `paidMoney 0`, `ledgerSeq
  null`; pending hulls keep `buildStartedAtMs + buildDurationSeconds` from
  the raw body). A profile with neither marker adopts everything and stamps
  both. A brand-new profile's kit adopts both in the create request. **Ship
  adoption is deferred (marker 2 not stamped) while any client ship lacks
  an instanceId** — the pre-slice sync payload sent ships without ids, and
  adopting such a save would have stamped the marker with the fleet missing
  (then enforce would strike it). The client payload now sends ship
  `instanceId / isBuilt / name / build timing` and service
  `linkedBuildingIds`.
- **shadow:** per kind, client entries with no row → `client_asset_not_in_
  ledger` (warning, `details.kind`); rows the client no longer lists →
  `server_asset_not_in_client` (info); a derived-vs-client service gap →
  `client_services_divergent` (warning: derived / client / missingFromClient
  / extraInClient). Lists persist as sent — research as the union.
- **enforce:** unledgered research / ships / locations are DROPPED from the
  persisted columns and returned as `assetLedger.rejectedResearchIds /
  rejectedShipIds / rejectedLocationIds` (`client_asset_rejected`,
  critical); `activeServicesData` is REPLACED by the derived set; the scalar
  columns `researchCount / serviceCount / locationsUnlocked` are derived
  from the registry (so `corporation-tiers.ts tierFromProfileScalars` — the
  daily bonus — and the contract `services_count` check read registry
  truth). `applyAssetReconciliationToState` removes the rejected research,
  ships and unlocks client-side (never a starting location; refunds
  nothing; idempotent). Book net worth's ship leg reads the merged view.
- `assetLedger` response: `{ mode, adopted, adoptedCount,
  rejectedInstanceIds, rejectedResearchIds, rejectedShipIds,
  rejectedLocationIds, notInLedger, unlistedServerRows, services: { derived,
  client, missingFromClient, extraInClient, source } }`.

### Readers switched

`loadServerRegistry(profileId, profile)` (one row query + one ColonyClaim
query, every kind) and the batched `loadServerRegistryForProfiles` /
`loadServerServicesForProfiles`; single-kind `loadServerResearch /
loadServerShips / loadServerLocations / loadServerServices`.

- research: `bidding/fulfill` + `competitive-contracts`
  (`research_completed_category`), `espionage` + `espionage/execute`
  (`isActionUnlocked`, tech bonus), `seasons/progress`, `speed-runs/check`,
  `zones/update`, the `assets/build` research gate + cost reductions, the
  `assets/refit` Mark III gate, `assets/ship` / `assets/unlock` gates; the
  sync's `researchCount` in enforce.
- ships: `bidding/fulfill` + `competitive-contracts` (`ships_at_location`),
  `colonies` presence, `demand-pools/update`, the sync's book net worth,
  `seasons/progress`.
- services: `competitive-contracts` (`services_count`), the sync's zone
  governor tax base, `demand-pools/update`, `zones/update`,
  `seasons/progress`, `speed-runs/check`; the sync's `serviceCount` in
  enforce.
- locations: the `assets/build` location gate (was persisted list ∪ claim),
  `bidding/fulfill` + `competitive-contracts`, `seasons/progress`,
  `speed-runs/check`; the sync's `locationsUnlocked` in enforce.

Still on the JSON: espionage TARGET reads (intel, not money), milestones
(slice 1 scope), `resource-plausibility.ts buildServerFlowState` (the
ceilings — generous by design), the client-owned ship location leg above.

### Client

`handleStartResearch`, `handleBuildShip` (was the inline `onBuildShip`),
`handleScrapShip` and `handleUnlockLocation` are server-first like the six
building handlers: validate locally, call the route, mutate on the 2xx with
the server's cost / timing / recovery, keep `'local'` play for signed-out
sessions, surface refusals. The research and ship paths no longer attest
their material spend through `builtThisTick` on the server path.
`ActiveResearch` gained `instanceId` / `serverCompletesAtMs`.

### The flip plan

1. Deploy (shadow, no DDL). Every active profile adopts research /
   locations on its next sync; ships adopt on the first sync from the new
   client bundle (deferred until then — watch `shipsDeferred: true` in the
   adoption log line).
2. Watch for ~7 days: `MarketAuditLog WHERE eventType IN
   ('client_asset_not_in_ledger', 'server_asset_not_in_client',
   'client_services_divergent')` with `details.kind`. Expected noise:
   `client_services_divergent` from the (definition, location) fallback
   match on clients that have not yet reloaded; research
   `server_asset_not_in_client` for a few minutes around each completion
   (server flips first). A `client_asset_not_in_ledger` for `kind: ship`
   on an honest profile after the client reload means a ship path still
   creates hulls without the route — fix it, then null the profile's
   `_assetBaselineAt2` to re-adopt.
3. `ASSET_LEDGER_MODE=enforce` (one switch flips all five kinds; slice 1 was
   already shadow). Profiles without a marker still read as union, so a
   late returner is adopted, never wiped.

Tests: `server-assets.test.ts` (research quote / start rule / merge modes;
ship cost / row projection / merge; location projection; derived services
parity with `processTick` + matching modes; adoption rows 2 + deferral +
diff 2; routes research / ship / scrap / unlock — validations, ledger rows,
pending rows, retry-safety, scrap idle + shadow / enforce; cron flips every
kind and appends research once), `asset-reconcile.test.ts` (adoption under
marker 2 once + ship deferral; shadow audits per kind + research union;
enforce drops + rejected ids + derived services + registry counts + ship
book value; client removal + queue merge for every kind).
