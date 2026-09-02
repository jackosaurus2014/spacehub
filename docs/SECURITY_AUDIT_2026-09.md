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
- Nonce policy (`'nonce-…' 'strict-dynamic'` + SHA-256 hashes for the three static inline scripts, with `https: 'unsafe-inline'` as the CSP2/CSP1 ladder) goes out as `Content-Security-Policy-Report-Only` on the 117 routes Next renders per request (`NONCE_ELIGIBLE_ROUTES`, re-derived from `src/app` by `csp.test.ts`, which also checks the last build's `prerender-manifest.json`). Static and ISR routes never get a nonce: Next 14 does not force dynamic rendering on a nonce, so a nonce would be missing from cached HTML or baked into the ISR cache. Next reads the nonce from the forwarded request `Content-Security-Policy[-Report-Only]` header and stamps it on its bootstrap and `next/script` tags; `x-nonce` is forwarded for server components.
- The root layout deliberately does **not** call `headers()` (that would opt all 600+ prerendered routes out of static rendering); its two inline scripts and the embed layout's one are rendered from `INLINE_SCRIPTS` and allow-listed by hash. `GoogleAnalytics` accepts an optional `nonce` prop.
- `POST /api/csp-report` accepts `application/csp-report` and `application/reports+json`; keeps directive, blocked origin, document path, disposition and coarse UA family; drops samples/source/line/cookies; dedupes `directive|origin` for 60s; logs `csp_violation` via `@/lib/logger`; always 204. Middleware: CSRF-exempt, 20/min/IP, `no-store`.
- `LessonInteractive` calculator formulas now go through `src/components/learn/safe-expression.ts` (tokenizer + recursive-descent parser) instead of `new Function` — the only `'unsafe-eval'` need in the app is gone. Every seed formula in `scripts/seed-learning*.ts` is regression-tested against the old evaluator.

**Rollout.** `CSP_MODE` (Railway env) — unset/`report-only` (default) sends the nonce policy as Report-Only on eligible routes; `enforce-nonce` makes it the enforced header there. Flip `CSP_MODE=enforce-nonce` after 7-14 days of clean `csp_violation` logs (watch for `script-src` reports whose blocked origin is `inline` or `self` — those mean an inline script or a parser-inserted tag we missed). Then prune the server-only `connect-src` hosts in `LEGACY_CONNECT_HOSTS` (spaceflightnewsapi, thespacedevs, swpc.noaa, celestrak, ssd-api/epic/eonet/images-api NASA, helioviewer, eyes.jpl, wheretheiss, sbir.gov, exoplanetarchive, asterank, spacexdata, googleapis) — they are fetched server-side only as far as recon shows and are kept for now so nothing regresses. Tests: `csp`, `csp-report-route`, `safe-expression`.
