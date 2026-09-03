# Resource clamp false-positive audit (2026-09-03)

**Question.** `RESOURCE_CLAMP_MODE` is `shadow`, scheduled to flip to `enforce`
around 2026-09-08 "after a clean week of logs" (docs/SECURITY_AUDIT_2026-09.md
§"Shadow-week plan"). `MarketAuditLog` has zero rows in the last 24h because
nobody played, not because zero clamp trips happened — a quiet log on a dead
week is not evidence the clamp is safe. This audit answers the question the
logs can't: **can a legitimate, non-cheating player's `resources` map exceed
`computeResourceCeilings`'s ceiling?** Static analysis, code-verified, no
runtime traffic involved.

**Answer: yes, in at least ten distinct ways, three of them (market
purchases, standing-directive auto-restock, and survey-discovery rewards)
severe enough to trip on ordinary play within minutes to hours of shipping
enforce. Do not flip yet.**

## Scope: what `RESOURCE_CLAMP_MODE=enforce` actually gates

Two mechanisms share the flag, and both need to be gap-free for the flip to
be safe:

1. **Phase 1** (`src/app/api/space-tycoon/sync/route.ts` ~L452-544): clamps
   `GameProfile.resources` (the "client view") to `computeResourceCeilings`'s
   ceiling. A rejection **deletes** the excess from what gets persisted.
2. **Phase 2 correction** (same file, ~L700-712): when the profile has a
   `serverResources` baseline, `advanceServerResources` computes server
   truth using *the same growth formula* (`ceilingFor(prevServer, 0, prod,
   months) − prevServer`, `resource-plausibility.ts` "Phase 2" header), and
   in enforce mode `computeClientCorrections` walks the persisted client
   view **down** to server truth whenever they diverge >5%. Any gap in the
   growth formula corrupts both mechanisms identically — phase 2 is not a
   safety net for phase 1's gaps, it shares them.

The formula under test, restated:

```
ceiling_r = prev_r
          + max(0, ledgerDelta_r)                            // server-granted, pending
          + RESOURCE_SLACK(3) × prodMax_r × elapsedMonths     // client-simulated rate
          + max(FLAT_FLOOR_MIN(100), 0.25 × prev_r) × flatFloorScale(elapsedMonths)
```

`prodMax_r` (`computeMaxProductionPerMonth`) only ever sums the four
`FlowKind`s `computeResourceFlows` models: `mining`, `ship_mining`,
`production` (building `producesPerMonth`), and `megastructure` (passive
income, via `MEGASTRUCTURE_PASSIVE_CEILING`). `resource-flow.ts`'s own
`OMITTED_CONTRIBUTIONS` list says outright what it does **not** model:
"Contract deliveries, freight transfers and market orders", "Refining and
crafting jobs", "Survey discoveries and hazard losses", "Interstellar
trade-route shipments". Every gap below is one of those four categories, or
a fifth the comment doesn't name (a recurring rate the flow lens never
learned about at all).

`ledgerDelta_r` comes from `GameLedgerEntry` rows with `seq > ack` **and**
`reason NOT IN PENDING_EXCLUDED_LEDGER_REASONS` (`ledger-reconcile.ts:100`,
consumed at `sync/route.ts:343-344`, fed to the ceiling unchanged at
`sync/route.ts:498`). That exclusion list matters more than its one-line
comment suggests — see Root cause 1.

### Checked and ruled out: the "near-zero elapsed" case

The prompt's specific worry — a player who just synced seconds ago,
collapsing `elapsedMonths` to ~0 — does not reach `clampResources` in
practice. `SYNC_MIN_INTERVAL_MS = 10_000` (`ledger-reconcile.ts:205`) is
enforced with a 429 **before** the phase-1 block runs (`sync/route.ts:382`),
and it is stricter than `MIN_ELAPSED_MS = 5_000`
(`ledger-reconcile.ts:199`/`resource-plausibility.ts:76`) — so any sync that
reaches the clamp has `elapsedMs ≥ 10,000`, never the literal zero that
collapses the slack term to nothing. `MIN_ELAPSED_MS`'s 5s floor is
currently unreachable dead code for this purpose.

It is not, however, harmless: `flatFloorScale(elapsedMonths) =
min(1, elapsedMs / 60_000)`. At the 10s floor, scale ≈ 0.167, so the flat
floor for a fresh resource is only ~17 units, not 100, until 60s have
elapsed. **A rapid back-to-back resync (10-59s apart) shrinks every
class-C item's headroom by up to 6×**, which is enough to push
class-C-in-the-typical-case items (narrative-events' 80/20 windfall,
mini-activity finds) into class D too. This is a magnitude amplifier on the
findings below, not a standalone gap — noted per-item where it matters.

## Inflow inventory

| # | Mechanism | File:line | Class | Ledgered? |
|---|---|---|---|---|
| A1 | Building mining output | `game-engine.ts` §6a (~L920-963); `resource-flow.ts` `mining` FlowKind | **A** | n/a — modeled |
| A2 | Ship mining output | `resource-flow.ts` `ship_mining` FlowKind (~L385-396) | **A** | n/a — modeled |
| A3 | Building industry output (`producesPerMonth`) | `consumption.ts:346-360` (`creditToPool`); `resource-flow.ts:420-426` `production` FlowKind | **A** | n/a — modeled |
| A4 | Megastructure recurring passive resources | `game-engine.ts:965-981`; `resource-plausibility.ts` `MEGASTRUCTURE_PASSIVE_CEILING` | **A** | n/a — modeled via allowance |
| A5 | Away-mode mining/production earnings | `away-operations.ts:396-397` | **A** | No, but mirrors A1-A3's math against an already-inflated `prodMax` |
| B1 | Order-book buy fill / sell refund | `market-orderbook.ts:410,426,539` (`order_resource_credit`, `order_fill_refund`, `order_resource_refund`) | **B** | Yes — not in the exclusion list |
| B2 | Corp-to-corp contract settlement | `corp-contracts-server.ts:335-361` (`contract_resources_received`) | **B** | Yes |
| B3 | Bounty fulfillment | `bounties/route.ts:314,334` (`bounty_resources_delivered`/`_received`) | **B** | Yes |
| B4 | Delivery-contract / bid fulfillment | `bidding/fulfill/route.ts:299` (`bid_delivery_resources`) | **B** | Yes |
| C1 | Mini-activity `resource_find` bonus | `mini-activities.ts:49-53` | **C** | No — but capped at +1 iron, cooldown-gated |
| C2 | Narrative-events "Repair Materials Windfall" | `narrative-events.ts:351` | **C** (→D under rapid resync, see above) | No |
| C3 | Expedition-completion `resourceSamples` | `expeditions.ts:518-526,979` | **C** for one expedition (20-60/resource); **D-adjacent** if 2+ expeditions to the same target complete in one sync window | No |
| **D1** | **Market purchase (buy fill, instant trade)** | `market/trade/route.ts:403` (`market_trade_buy_goods`) | **D** | Yes, but excluded from the ceiling — see Root cause 1 |
| **D2** | **Building decommission recovery** | `mothball.ts:138-148` (`computeDecommissionRecovery`), applied `assets/sell/route.ts` (`building_decommission_recovery`) | **D** | Yes, but excluded — Root cause 1 |
| **D3** | **Freight/cargo arrival at home** | `cargo-logistics.ts:157-166` (`creditArrivalCargo`), called `game-engine.ts` ~L2360-2368 | **D** | No |
| **D4** | **Interstellar colony trade-route shipment** | `expeditions.ts:1077-1139` | **D** | No |
| **D5** | **Static contract completion reward (goods)** | `contracts.ts:337-345` (`applyContractReward`), called `page.tsx:1656` | **D** | No |
| **D6** | **Real-time crafting/refining output** | `game-engine.ts:2026-2098` (`activeRefining`), `production-chains.ts` | **D** | Attested (`client_craft_output`) but explicitly excluded by design — Root cause 1 variant |
| **D7** | **Faction-license recurring delivery (Hive biomaterial)** | `game-engine.ts:997-1000`; `factions.ts` `getFactionLicenseBonuses` | **D** | No |
| **D8** | **Random/anomaly event resource grant** | `random-events.ts:175-202` (`applyEventEffect`) | **D** | No |
| **D9** | **Standing-directive `auto_restock` (automated, unattended market buy)** | `standing-directives.ts:144-162` (`processDirectivesForMonth`), called from **both** the live monthly tick (`game-engine.ts:1520`) and away catch-up (`away-operations.ts:449`) | **D** | No — see Root cause 3 |
| **D10** | **Guaranteed survey-discovery reward on survey completion** | `exploration.ts` `SURVEY_DISCOVERIES` table + `rollDiscovery` (:285-301), the `survey:` half of the result **is applied** at `game-engine.ts:2404-2413` via `routeProductionCredit` — see correction below | **D** | No |

**Correction to an earlier read of this file:** exploration.ts has *two*
separate reward tables, and only one of them is dead. `rollDiscovery()`
(exploration.ts:285-301) returns `{ survey, anomaly }` from two independent
rolls: `survey` is a guaranteed pick from `SURVEY_DISCOVERIES[locationId]`
(100% hit rate — every surveyed location has a non-empty table, one pick per
completed survey), and `anomaly` is a separate kind-weighted roll from
`ANOMALY_TABLE`/`buildRewards()` that requires the player to later claim-stake
it via `stakeClaim()` (exploration.ts:330-386). It is **only the `anomaly`
half** that never delivers resources — `buildRewards()` (exploration.ts:182-207)
never populates a `.resources` field for any anomaly kind, and `stakeClaim()`
correspondingly has no branch for one. The `survey` half is a completely
different table (entries like "Iron Oxide Megadeposit" → `{ iron: 500 }`,
"Titan Methane Lake" → `{ methane: 500, ethane: 200 }`, "Subsurface Aquifer"
→ `{ mars_water: 200 }`) and **is** delivered, unconditionally, client-side,
on every survey completion: `game-engine.ts:2390-2413` destructures
`{ survey: discovery, anomaly }` from `rollDiscovery(...)` and, for
`discovery.rewards.resources`, calls `routeProductionCredit(resources,
shipLocationInventories, ship.surveyExpedition.targetLocation, resId, qty,
...)` for each entry — the same crediting helper D3's freight arrivals use,
with the same lack of ledger or `resource-flow.ts` coverage
(`OMITTED_CONTRIBUTIONS` names "survey discoveries" explicitly). This is D10
below, not dead code — it is one of the largest single-event overshoots in
this audit.

**Genuinely not inflows — dead reward data, flagged for content follow-up,
not a clamp risk (nothing is ever delivered, so nothing can overshoot):**
- `competitive-contracts.ts`'s reward tables include a `resources` field
  (e.g. `exotic_materials: 20, helium3: 10`); the claim route
  (`competitive-contracts/route.ts:237-251`) only credits and ledgers
  `reward.money`. The client (`CompetitiveRacesPanel.tsx`) never applies
  `reward.resources` either. Players are never shown or given this reward.
- `exploration.ts`'s **anomaly** `rewards.resources` field does not exist —
  `buildRewards()` (exploration.ts:182-207) never sets it for any of the
  seven anomaly kinds, and `stakeClaim()` (exploration.ts:330-386) has no
  branch for `.resources` to begin with. Do not confuse this table with
  `SURVEY_DISCOVERIES` (D10) — they share a `rewards.resources` field name
  but only one of the two tables ever populates it.

## Root causes

### Root cause 1 — `PENDING_EXCLUDED_LEDGER_REASONS` conflates two different jobs

`ledger-reconcile.ts:61-103` excludes `CLIENT_ATTESTED_LEDGER_REASONS`
(`client_craft_output`, `client_build_spend`) and
`CLIENT_APPLIED_LEDGER_REASONS` (`market_trade_buy_goods`,
`market_trade_sell_goods`, `building_decommission_recovery`,
`building_build_resources`, `ship_build_resources`,
`research_start_resources`, etc.) from the sync route's `pendingRows` query
(`sync/route.ts:340-348`). The stated reason is correct and necessary: these
rows describe movements the client **already applied locally** on the 2xx
response, so replaying them via `applyResourceDeltas` on top of the client's
own claim would double-count.

But the exact same filtered set (`ledgerInfo.resourceDeltas`) is *also* fed
straight into `computeResourceCeilings({ ledgerDeltas: ... })`
(`sync/route.ts:498`) — the ceiling's `max(0, ledgerDelta)` term. There is no
second, ceiling-only query that includes these rows. So a resource inflow
that is (a) real, (b) server-validated, (c) money-backed in one case, and
(d) already ledgered with a proper `resourceSlug`/`resourceDelta` — gets
**zero** credit toward the ceiling that is about to judge whether the
resulting claim is plausible. This is not a "client-only simulation" gap;
D1, D2, and D6 are server-authored and already have the exact ledger row the
ceiling needs, one query filter away.

(For completeness: `building_build_resources`, `ship_build_resources`,
`research_start_resources`, and `ship_scrap_recovery` are also in the
exclusion list, but their resource legs are spends or money-only, so the
upward-only ceiling never needed them.)

### Root cause 2 — one-off, event-driven, and cyclical inflows have no allowance beyond the flat floor

`resource-flow.ts` deliberately does not model contract deliveries, freight
transfers, market orders, refining jobs, survey discoveries, or interstellar
shipments, because "amortizing them into a per-month figure would be exactly
the guess the brief forbids" (`resource-flow.ts` header). That's the right
call for the *display* lens the ResourceBar uses. But `resource-plausibility.ts`
reuses that same lens for `prodMax`, and the only other allowance in the
ceiling formula is the flat floor — `max(100, 0.25×prev)` — which was sized
as "an absolute per-resource allowance per sync ... so one-off transfers ...
do not false-positive" (`resource-plausibility.ts:59-63`). D3-D5, D7 and D8
are exactly the categories that comment names, and every one of them has a
realistic single-event size well above 100 units for a resource the player
hasn't stockpiled yet. D7 is additionally invisible because
`xenogenic_biomatter`'s licence delivery is a genuine `/month` **rate** —
unlike the others it isn't even a one-off — but it lives entirely outside
`resource-flow.ts`'s four `FlowKind`s, so it never reaches `prodMax` at all
(unlike megastructure passives, which got a dedicated allowance for exactly
this reason).

### Root cause 3 — some inflows are driven by client config the server never receives at all

D1-D8 all share one saving grace: the server at least *knows the event
happened* — either via a ledger row (D1, D2, D6, just filtered out by Root
cause 1) or a static, server-known content table it could derive an
allowance from (D3-D5, D7, D8, per Root cause 2's fix path). D9 has neither.
`state.standingDirectives` (the `auto_restock`/`auto_sell`/
`auto_renew_contract`/`maintenance_reserve` config a player sets in
`StandingOrdersPanel.tsx`) is **never synced to the server**: absent from
`prisma/schema.prisma`, absent from `sync-validation.ts`, absent from the
sync route's request body handling (grepped all three — zero hits). The
directive's `targetStock`/`maxUnitsPerMonth` number inputs
(`StandingOrdersPanel.tsx:317-343`) carry no `min`/`max` attribute either. So
unlike every other gap here, there is currently no server-known fact this
fix could hang an allowance off of without first adding persistence for the
directive config itself — see recommendation 8.

## Worked scenarios (class C-under-pressure and class D)

All scenarios: brand-new or resource-poor player, `prev_r = 0` for the
named resource (the worrying case the audit brief calls out — a flat floor
of 100 regardless of how the resource legitimately arrived), a normal ≥60s
sync interval so `flatFloorScale = 1` unless noted, `prodMax_r = 0` (no
active production the flow lens can see for that specific resource).
Ceiling in every case: `0 + 0 + 3×0×months + max(100, 0)×1 = 100`.

**D1 — Market purchase.** Player has $50M and no titanium. They buy
30,000 titanium on the open market (well under the route's 100,000-unit cap,
`market/trade/route.ts:214`) to stock a build queue — a completely ordinary,
money-paid, server-priced transaction, ledgered as `market_trade_buy_goods`.
Ceiling: 100. Claim: 30,000. **Overshoot: 29,900 units (300×)**, and the
theoretical max (a single 100,000-unit order) overshoots by **99,900 (~1000×)**.
This is core, constant gameplay — not an edge case — and will fire on the
very first meaningful purchase after enforce ships.

**D2 — Building decommission.** Player decommissions a T5 orbital colony
facility (`resourceCost: { titanium: 700, ... }`, e.g. `buildings.ts` ~L770)
after a market downturn, per the game's own "Exit Decision" design
(`mothball.ts` header). Recovery: 50% of resource cost =
**350 titanium** (`DECOMMISSION_RESOURCE_RECOVERY_FRACTION`). Ceiling: 100.
**Overshoot: 250 units (3.5×)**.

**D3 — Freight arrival.** Player strip-mines a remote asteroid-belt deposit
for weeks (stockpile grows in `locationInventories`, invisible to
`buildServerFlowState`, which hardcodes `locationInventories: {}`), then the
deposit depletes and they decommission the rig. They dispatch a 4-ship Heavy
Transport convoy (500 cargo each, `ships.ts:238`) to haul the accumulated
stock home — a single `creditArrivalCargo` call delivers **2,000 units** in
one tick, and it scales further with a Colony Ark (cargoCapacity 2,000,
`ships.ts:342`) or Extended Cargo Bay modules. Ceiling: 100 (the producing
service is gone, so `prodMax = 0` too). **Overshoot: 1,900 units (20×)**.

**D4 — Interstellar colony shipment.** A level-5 `exotic_fuel` colony
(`COLONY_OUTPUT_PER_LEVEL.exotic_fuel = 20`, `infrastructureLevel = 5`,
suitability and staffing both ≈1.0 at end-game) accumulates 100 units/month
in its local stockpile for the minimum 12-month shipping cycle
(`TRADE_MIN_CYCLE_MONTHS = 12`) before departing — `expeditions.ts:1089`
ships the colony's **entire** stockpile, uncapped. Single shipment:
**1,200 units**. Ceiling: 100 (neither colonies nor
`interstellarTradeRoutes` exist in `buildServerFlowState`).
**Overshoot: 1,100 units (12×)**. This is exactly the long-horizon,
committed-player content CLAUDE.md's Game Design Principles ask for
("compounding bonuses ... deep research trees give committed players
visible growth over weeks and months") — the players most likely to trip
this are the ones the design wants to reward most.

**D5 — Contract reward.** Player completes a mid-tier static contract
rewarding `{ iron: 200, aluminum: 100 }` (`contracts.ts:144`).
`applyContractReward` (`contracts.ts:337-345`) applies it client-side only.
Ceiling (iron): 100. **Overshoot: 100 units (2×)**; aluminum lands exactly
at its ceiling (borderline — any prior aluminum spend pushes it over too).

**D6 — Crafting/refining.** Player has 3 fabrication buildings
(`getCraftingSpeedMultiplier = 1 + 0.15×(n−1) = 1.30`) actively refining
`rocket_fuel` (10 units/90s → 69.2s effective). A network hiccup or
`SYNC_MIN_INTERVAL_MS` backpressure delays the next sync 15 minutes (900s)
while the player keeps the 6-slot queue (1 active + 5 queued,
`CraftingPanel.tsx`) full: ⌊900/69.2⌋ = 13 completions ×10 = **130 units**.
Ceiling: 100 (crafting is in `OMITTED_CONTRIBUTIONS`; `client_craft_output`
is excluded from `ledgerDelta` by Root cause 1). **Overshoot: 30 units
(30%)**. Narrower than the others — it needs an extended sync gap coinciding
with sustained active crafting — but it recurs for every recipe given a
long-enough gap, and stacks with any other item on this list landing in the
same delayed sync. No offline cascade exists (confirmed: the tick loop
completes at most one job per invocation; offline catch-up
(`away-operations.ts`) never touches `activeRefining`).

**D7 — Faction-license delivery.** Player buys the $400M Hive Biomaterial
Supply Agreement (requires Friendly+ Hive standing) and invests in
away-automation research. `biomaterialPerMonth` (capped at 4,
`factions.ts:474`) accrues both live and during a 30-real-day absence — the
plausibility clamp's own `MAX_ELAPSED_MS`. Weighted-tier away-ops calc at
max automation investment: **≈205 units**. Ceiling: 100 (`xenogenic_biomatter`
is never one of `resource-flow.ts`'s four `FlowKind`s, so `prodMax = 0`
regardless of the licence). **Overshoot: 105 units (~2×)**. Without
automation investment it stays at ≈56, under the floor — the gap bites
specifically for the legitimate, earned, invested-in case.

**D8 — Random event.** A random event resolves with `resourceGrant: {
platinum_group: 50, gold: 30, iron: 500 }` (`random-events.ts:120`, the
"$200M acquisition" choice — genuinely paid for). Ceiling (iron): 100.
**Overshoot: 400 units (5×)**.

**D9 — Standing-directive auto-restock.** Player opens Standing Orders and
sets an `auto_restock` directive on `iron` (`baseMarketPrice: $5,000`,
`resources.ts:88-90`) with `targetStock: 100_000`, `maxUnitsPerMonth:
50_000` — both fields accept any number, no client or server bound. With
≥$500M liquid, `processDirectivesForMonth` buys `min(maxUnitsPerMonth,
target − have, affordable)` toward the target once per elapsed game-month:
50,000 in month 1, the remaining 50,000 in month 2 (game-engine.ts:1520
fires this every 6 real hours the tab stays open — **no offline/away trick
needed**, just two live ticks, i.e. 12 real hours of ordinary play). Total:
**100,000 iron for $500M, fully paid for.** At the next sync: `prev = 0`
(this player never mines iron), `prodMax = 0` (no iron-producing service),
`ledgerDelta = 0` (nothing ledgers a client-reducer-only purchase). Ceiling:
100. **Overshoot: 99,900 units (~1000×)** — even a single month's 50,000-unit
fill overshoots by 499×. This is the largest single overshoot in the whole
audit, and — like D1 — needs nothing but the game's own UI to reach.

**D10 — Survey discovery.** A player's survey ship completes a routine
survey at Mars and rolls the guaranteed "Iron Oxide Megadeposit" entry
(`SURVEY_DISCOVERIES.mars_surface`, `exploration.ts:89`): `{ iron: 500 }`,
100% delivered, no claim-staking required (unlike the separate anomaly
system). `game-engine.ts:2404-2413` credits it via `routeProductionCredit`
the moment the survey timer completes. For a player who hasn't mined iron
elsewhere (`prev = 0`, `prodMax = 0`): Ceiling: 100. **Overshoot: 400 units
(5×)**. Every location's table has entries at this scale or larger (Ceres'
"Iron Oxide" analog, Titan's `{ methane: 500, ethane: 200 }`, Europa's
`{ mars_water: 200 }`-class deposits) — this fires on **any** survey
completion at the wrong location, not a rare roll.

## Recommendation

**`enforce` is not safe today.** The gaps above are not exotic — D1 (market
purchases) is core, constant gameplay that will trip on the first
substantial trade after the flip, deleting real, money-paid inventory. Per
the brief: do not close this by raising `RESOURCE_SLACK` globally (it
weakens the defense against the actual forged-inventory attack this whole
system exists to catch) or by inflating the flat floor (same problem,
broader). Make each legitimate inflow ledger-visible or lens-visible
instead — smallest fix per gap:

1. **D1/D2 (Root cause 1).** Add a second, ceiling-only ledger query (or a
   ceiling-only accumulator built alongside `pendingRows`) that sums
   *positive* `resourceDelta` from `CLIENT_APPLIED_LEDGER_REASONS` rows in
   the sync window and feeds *that* into `computeResourceCeilings`'s
   `ledgerDeltas` argument — without changing what gets replayed into
   `reconciledResources` (which must stay excluded, for the reason the
   comment already gives). This one change closes D1 and D2 and is the
   highest-priority fix: D1 is certain to fire on ordinary play.
2. **D6 (crafting).** Phase 2 already solved this correctly
   (`computeCraftAttestationCaps`/`capCraftAttestation`, `craft_r` in the
   phase-2 formula) — it just isn't reused by phase 1. Feed the same capped
   `craft.accepted` map into phase 1's `ceilingFor` as an additional
   allowance term (parallel to `ledgerDelta`), computed from the *previous*
   sync's persisted buildings/research (server-known, same inputs phase 2
   already uses) so it can't be inflated by a forged buildings row.
3. **D3 (freight).** Ledger it: write a `GameLedgerEntry`
   (`resourceSlug`/`resourceDelta`, e.g. reason `cargo_arrival`) at
   `game-engine.ts`'s cargo-arrival call site is not possible today (the
   client can't write its own ledger rows) — so instead widen
   `buildServerFlowState` to read `state.locationInventories` production
   the way it already reads `state.resources`, OR add a
   `cargoArrivedThisTick`-style attestation to the sync payload (same shape
   as `craftedThisTick`), capped server-side by ship `cargoCapacity` × fleet
   size from the persisted `shipsData` (server-known), and fold it into
   `ceilingFor` the same way the D6 fix does.
4. **D4 (interstellar shipments).** Same attestation pattern as D3, capped
   by `COLONY_OUTPUT_PER_LEVEL[resource] × infrastructureLevel ×
   cycleMonths` computed from persisted colony state (add colonies to the
   server-known inputs `buildServerFlowState` builds from).
5. **D5 (contract rewards).** Cap by the reward table itself
   (`MAX_DEFINITION_RESOURCE_COST`-style derivation over `contracts.ts`'s
   reward definitions, mirroring how ship/building spend is capped today)
   and add a `contractedResourcesThisTick` attestation, same pattern.
6. **D7 (faction license).** Smallest fix of the set: add a `license`
   `FlowKind` (or fold it into the existing megastructure-passive pattern)
   so `computeMaxProductionPerMonth` credits the capped 4/month allowance
   the same way it already credits `MEGASTRUCTURE_PASSIVE_CEILING`. This
   makes it class A outright — no attestation needed, since the licence
   grant itself is a persisted, server-visible fact once faction licences
   are stashed server-side.
7. **D8 (random events).** Cap by the event table's largest single-resource
   grant per resource (same `MAX_DEFINITION_*`-style derivation) and add it
   as a fixed allowance term, since events are deterministic content (not
   player-scaled), or attest them the same way as D5.
8. **D9 (standing directives) — highest raw magnitude, needs new
   persistence.** Sync `standingDirectives` (validated, bounded: cap the
   array length and clamp `targetStock`/`maxUnitsPerMonth` server-side to
   sane maxima the way `sync-validation.ts` already bounds buildings/ships).
   Once persisted, compute a bounded allowance server-side with the exact
   same math `processDirectivesForMonth`'s `auto_restock` branch already
   runs — `min(maxUnitsPerMonth × monthsElapsed, targetStock − prev,
   moneyCeiling / price)` — and fold it into `ceilingFor` the same way the D3
   fix does. Until this ships, the UI's target-stock/units-per-month inputs
   should get a sane `max` attribute as a stopgap (doesn't fix the ceiling,
   but shrinks the blast radius of the gap it's already carrying).
9. **D10 (survey discoveries).** Same content-derived-floor pattern as D5/D8:
   derive a `MAX_SURVEY_DISCOVERY_GRANT: Record<string, number>` from
   `SURVEY_DISCOVERIES` (largest per-resource entry across every location's
   table — a static, load-time derivation exactly like
   `MAX_DEFINITION_RESOURCE_COST` already does for build costs) and add it as
   a fixed one-off allowance, or extend the same
   `surveyRewardThisSync`-style attestation as D5, capped by the table.

**Process note.** Even with all of the above closed, the shadow-week plan
(`docs/SECURITY_AUDIT_2026-09.md` §"Shadow-week plan") explicitly requires
"≥7 consecutive days with zero false positives" from **real traffic** before
flipping. A week of silence from an empty server does not satisfy that
criterion — it just means the untested code paths (D1-D10 above) never ran.
Ship the fixes, then either wait for a week of real trading/crafting/
decommissioning/contract/surveying activity to clear the logs, or add a
scripted smoke-test that exercises D1-D10 against a shadow-mode profile and
confirms zero `client_resources_implausible_shadow` rows before flipping.

## Tests

`src/lib/game/__tests__/resource-plausibility-false-positives.test.ts`
encodes eight of the ten class-D scenarios above (D1, D2, D3, D5, D6, D7,
D9, D10) as regression tests against `clampResources`/`computeResourceCeilings`,
each building an honest post-inflow state and asserting the CURRENT (wrong)
clamp behavior with a `TODO_ENFORCE` comment naming the gap and the fix
above that closes it, so the tests start failing (in the "now it passes
honest play" sense) the moment each fix lands — that's the point. (D4 and D8
are not separately encoded: D4 needs colony/trade-route state the shared
fixture doesn't model and D8 is arithmetically identical to D5/D1/D10 once
`prev`/`prodMax` are both 0 — the pattern is already covered.)

Verified 2026-09-03: `npx jest resource-plausibility.test.ts
resource-plausibility-false-positives.test.ts` → 2 suites, 38 tests, all
passing (the `TODO_ENFORCE` tests pass *because* they assert today's wrong
behavior). `npx tsc --noEmit -p tsconfig.json` → clean, no output.
