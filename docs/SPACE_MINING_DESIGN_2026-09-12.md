# Interactive space mining and the ship roster — design (2026-09-12)

Jay's ask: "add some interactive space mining to the game where players can build ships to mine asteroids … research, analyze and design other ships that make sense." This is the design; nothing here is implemented yet. Every claim about the current game is from reading the code on 2026-09-12 (files cited inline).

## 1. What exists today, and why it isn't interactive

**Ships.** Fourteen definitions in `src/lib/game/ships.ts`: two maintenance (Orbital Servicer, Fleet Tender), three transport (Cargo Shuttle, Space Freighter, Heavy Transport), one tanker, five mining (Prospector Drone, Mining Drone, Ore Harvester, Asteroid Mining Ship, Deep Space Miner), two survey (Survey Probe, Starfarer Explorer) and the Colony Ark. Roles are `maintenance | transport | tanker | mining | survey`. The mining five form a strict tier ladder (tier 1 → 4) that differs only in `miningRate`, `miningTargets` and cost.

**Mining.** A mining ship parked at any of six coarse regions (`MINING_LOCATIONS`: lunar surface, Mars surface, asteroid belt, Jupiter, Saturn, outer system) is set to `status: 'mining'` with one `resourceId`. Every engine tick (`game-engine.ts:2253`) credits `miningRate × 0.5 × modifiers` units straight into inventory at the mining location. Nothing else happens: the ship never fills, never returns, never chooses a rock. `cargoCapacity` is not read by the mining path at all. The player's only decisions are *which ship*, *which region*, *which resource*, made once in the Fleet panel (`FleetPanel.tsx:235`), then the ship is a building with an engine.

**What is already good and must be kept.** Extraction pressure (`extraction-pressure.ts`): everyone mining the same deposit thins it for everyone, server-aggregated. Price-linked revenue (`mining-pricing.ts`). Hull-damage penalty, module multipliers, workforce and prestige factors. The Frontier newcomer shield and the duty-cycle opex clamp (Jay-approved Pass 6-9). Survey probes that roll anomalies (`exploration.ts`), including `uncharted_asteroid` ("finite-resource claim") and `rich_deposit`, and a claim-stake system with expiry and a public holder. Delta-v per lane (`cargo-logistics.ts getRouteDeltaV`) and travel times per hop (`ships.ts TRAVEL_TIMES`). The belt already has a real body (`ceres_surface`) and Ceres has orbital elements.

**The gap, stated plainly.** Mining has no *place* (a region, not a rock), no *trip* (no haul, no cargo limit), no *find* (surveys and mining are unrelated systems), and no *risk that is a decision* (hazards happen to you; nothing asks you to trade safety for yield). CLAUDE.md's invariants ask for exactly those: meaningful decisions, logistics that cost money, scarcity that is real, intelligence as gameplay.

## 2. Design goals

1. **Every mining trip is a decision.** Where, with what, how full, and whether to come home or sell on site.
2. **Asteroids are discrete, finite, ownable objects.** Not a "belt multiplier".
3. **Reuse, don't rebuild.** Anomalies become the discovery path; claims become ownership; extraction pressure becomes depletion; lanes and delta-v price the haul; the existing five miners keep their identity.
4. **Corporate scale.** A solo player runs one miner by hand; a corporation runs a mining fleet on standing orders and fights over the best rocks with claims, not lasers.
5. **Parity.** Every state change is a pure reducer in `src/lib/game/` shared by the client tick, the sync route and the sim harness, the same discipline the balance passes established.

## 3. The asteroid layer

**Asteroid fields.** Five new *bodies* that hang off existing locations, each a child of a region so the map and the lane graph do not change: Near-Earth (child of `lunar_orbit`, reachable early), Inner Belt (child of `asteroid_belt`), Ceres Approaches (child of `ceres_surface`), Trojans (child of `jupiter_system`), Kuiper Fringe (child of `outer_system`). A field is a *container*; it never has a yield of its own.

**Asteroids.** Server-generated rows (`Asteroid` table, seeded per world epoch, ~40 per field, replenished slowly) with: field, a name from the real catalogue style (`2091 KX-7`, `Psyche-class`), a spectral class that decides the ore mix (C-type: water/carbon/organics; S-type: iron/nickel/silicates; M-type: iron/nickel/platinum-group/gold; rare: exotic), `grade` (0.3–1.5, hidden until surveyed), `reserve` in units (finite), `spin`/`rubble` risk (0–1, hidden until surveyed), and delta-v from the field's parent (varies ±40% per rock, so "the easy ones go first").

**Discovery.** Asteroids start *unknown*. A survey (probe, Starfarer, or the new Prospector Barge's onboard sensor) at a field reveals a number of rocks equal to the ship's `surveyRange` with their class; a *detailed* survey (a second pass, or the Prospector's) reveals grade, reserve and risk. Unsurveyed rocks can still be mined blind at a yield penalty and a risk premium; that is a legitimate rush strategy. This folds into `exploration.ts`: a revealed rock is an `uncharted_asteroid` anomaly with `rewards.asteroidId`.

**Claims.** Staking a revealed rock uses the existing `stakeClaim` path (fee scales with grade × reserve; expiry unless worked; holder public on the diplomacy feed). A claimed rock can be mined only by the holder's corporation. Unclaimed rocks are open, and open rocks under extraction pressure deplete for everyone. Corporations can transfer claims through the existing binding-contract system. **No claim-jumping by force**: the only ways to lose a claim are expiry (not worked for N months) or selling it. That is the economic-warfare shape CLAUDE.md asks for.

**Depletion.** `reserve` decrements by mined units; extraction pressure applies on top for shared rocks. At 0 the rock is *exhausted* and removed at the next epoch tick; a new rock spawns elsewhere in the field with lower average grade over time (fields age). This makes outward expansion real.

## 4. The mining loop (the interactive part)

A mining ship at a field gets a **Mining Order** instead of a resource button:

1. **Target**: a rock (surveyed or blind) or "best available by value/hour", which the game computes from grade, class, spot prices, delta-v and hold size and shows as a ranked list. Intelligence as gameplay: the ranking is only as good as your survey coverage.
2. **Extraction mode**: *careful* (yield 1.0×, risk ×0.5, slower) / *standard* / *aggressive* (yield 1.3×, risk ×2, rubble events, faster hull wear). This is the risk-for-yield decision.
3. **Fill target**: mine until the hold is `cargoCapacity` full (the number finally means something), or until a time limit.
4. **Then**: *return to base* (choose a location with storage; pays the delta-v fuel bill from the tanker/propellant economy), *sell on site* (spot price at the field, which the market-pressure system already depresses when everyone dumps there), or *transfer to a Hauler* waiting at the field (the corporate pattern: miners never leave, haulers cycle).

Each order is a state machine on `ShipInstance`: `transit → surveying? → mining → (full) → returning | selling | transferring → idle`, with real timestamps like construction so the Outliner and Order Queue show it with the same countdown rows shipped today. **Standing orders** (repeat until reserve exhausted or N cycles) are the corporate-tier unlock; solo play is one order at a time.

**Events while mining** (hazard-driven, never PvP): rubble strike (hull damage scaled by mode and the rock's risk), spin-up (aggressive mode only; lose part of the hold), solar storm (existing hazard; shielding matters), NPC pirate shakedown in unpatrolled fields (existing NPC piracy; escorts and point-defence reduce it). Every event is a small choice card with a cost, not a random tax.

**Processing.** Raw ore is a new intermediate: `ore_<class>` units. It becomes refined resources at a Refinery building (exists as a service today at some locations) or aboard the new Refinery Barge at a lower ratio. Hauling ore is bulkier than hauling refined metal, which is the reason to refine near the field. This gives the crafting and logistics systems a real input without touching their internals.

## 5. Ship roster: what to add, what to leave

Stat vocabulary is the one `docs/STATS_DESIGN.md §1` already reserves (sublight/warp, fuel, delta-v budget, crew, hull, shielding, point-defence, sensor/survey range, cargo). Each new ship exists because it changes a decision; each has a 2D/3D glyph and a Gemini build card like the current fourteen.

| Ship | Role | Why it exists (the decision it creates) | Tier / gate |
|---|---|---|---|
| **Prospector Barge** | survey + mining | Slow, cheap miner with an onboard detailed sensor: surveys the rock it sits on while mining it. The solo player's first belt ship; the choice is "one barge that does both, badly" versus "probe + miner". | T2, `resource_prospecting` |
| **Hauler** (ore tug) | transport | Enormous hold, terrible delta-v budget, no mining. Cycles between a field and a refinery. Creates the miners-stay / haulers-cycle corporate pattern and a real shipping-lane investment case. | T2, `logistics_2` |
| **Refinery Barge** | processing | Mobile refining at a lower ratio than a fixed refinery. Trades yield for not hauling ore. | T3, `regolith_processing` |
| **Propellant Depot Ship** | tanker (new class) | Parks at a field and refuels miners and haulers there; without it every trip pays the full round-trip delta-v. Depots are finite slots per field, so the first corporation to place one owns the field's economics. Chokepoint by design. | T3, `orbital_refueling` |
| **Escort Cutter** | security (new role) | Point-defence and shielding, no cargo. Cuts NPC pirate shakedown odds for ships in its field. Its cost is the decision: patrol or pay the shakedown. Never attacks players. | T3, `point_defense` |
| **Survey Cruiser** | survey (reusable) | Reusable long-range sensor ship (the current probes are single-use). Reveals a whole field's classes in one pass and sells the survey data as a paid report through the existing market intelligence layer. | T3, `deep_space_sensors` |
| **Mobile Shipyard / Salvage Tender** | maintenance | Repairs and re-fits at the field, and salvages derelicts (the `derelict_ship` anomaly already exists with no ship to use it). | T4, `orbital_assembly` |
| **Belt Mothership** | mining flagship | Carries and launches four Mining Drones, refines a little, houses crew. The corporate end-game miner; multi-month build, the "campaign loop" item. | T5, `nuclear_thermal` |

Leave as they are: the five existing miners (they slot into the loop unchanged: drones for near-Earth, Harvester for Moon/Mars, Asteroid Mining Ship for the belt, Deep Space Miner for Trojans and Kuiper), the transports (Cargo Shuttle/Freighter/Heavy Transport keep refined-goods logistics; the Hauler is for ore), the Servicer and Tender, the Colony Ark. Retire nothing.

**Modules over new hulls.** Where a variant is tempting (an "ice miner"), prefer a fit: `mining-laser` (exists), `ice-extractor` (C-type bonus), `magnetic-rake` (M-type bonus), `radiation-shielding`, `extended-hold`, `point-defence-turret`. Modules are the per-mission trade-off; hulls are the role.

## 6. Economy fit and integrity

- **Sinks.** Claim fees, survey reports, depot fuel, refinery ratios and hull repair after aggressive mining are all money sinks, which the balance reports keep asking for.
- **Supply and demand.** Ore and refined metals go through the existing market-pressure module; a corporation flooding platinum from one M-type rock depresses its own price. Depletion caps the exploit ceiling per rock.
- **No pay-to-win.** No purchasable ships, ore or survey data. Cosmetic hull liveries only.
- **Frontier shield.** Newcomers in their first month get the Near-Earth field with guaranteed low-risk C-type rocks and no NPC pirates, matching the Protected Frontier rule.
- **Time loops.** Tactical: pick a rock, choose a mode, react to an event card. Daily: haul cycles, depot refuel. Weekly: claims expire, fields spawn new rocks. Monthly: fields age, quarterly corporate mining share in the public report. Campaign: the Mothership build and the first Kuiper claim.
- **Anti-exploit.** Reserve and pressure are server-aggregated like today; the client tick only mirrors. Claims are validated server-side against the holder's corporation.

## 7. Presentation

The graphics review of the same day (`docs/GRAPHICS_REVIEW_2026-09-12.md`) already asks for instanced belt objects and per-region backdrops; asteroids are the natural payload for both. Fields render as clusters on the map; surveyed rocks get a glyph by class, claimed rocks a corporate colour ring, a mining ship a beam. On phones the 2D canvas shows the same glyphs. The Mining Order is a single panel over the map (target list, mode, fill, then-action) with the existing radial-menu affordances, keyboard reachable, no colour-only state.

## 8. Implementation plan (phased, each phase shippable)

| Phase | Scope | Effort |
|---|---|---|
| **A. Rocks and orders** | `Asteroid` table + seed; five fields as child locations; reveal via survey; Mining Order state machine on `ShipInstance` (target, mode, fill, then-action); cargo gating; return/sell/transfer; Outliner rows; the Prospector Barge and Hauler. Sim-harness scenarios: solo barge, three-ship cycle. | 30–40 h |
| **B. Ownership and depletion** | Claims on rocks through `stakeClaim`; reserve depletion + field ageing; extraction pressure on shared rocks; event cards (rubble, spin-up); Escort Cutter; NPC shakedown hook. Public claim feed. | 25–35 h |
| **C. Industry** | Ore intermediates + refinery ratios; Refinery Barge; Propellant Depot Ship with per-field slots; Survey Cruiser and survey reports as sellable intelligence; modules. | 30–40 h |
| **D. Corporate scale** | Standing orders; Mothership; claim transfer via contracts; quarterly mining share; Salvage Tender for derelicts. | 25–35 h |

Balance gate before each phase ships: the sim harness (`scripts/sim-harness.ts`) run with a mining-specialist strategy, checking that a solo barge is cash-positive by month 3 in the Frontier, that a three-ship cycle beats two parked miners only when the haul is refined near the field, and that nothing beats the existing building-based mining by more than the ~1.5× the location multipliers already grant.

## 9. Founder rulings (2026-09-12)

Jay approved the design on 2026-09-12 with these rulings. Where they differ from §3–8 above, the rulings win.

1. **Ore is a REAL intermediate resource** that must be hauled and refined. Phase C ships the refinery ratios; in Phase A mined output is ore, and ore can be sold, transferred and stored like any resource. The four ore ids are fixed now (`ore_carbonaceous`, `ore_silicate`, `ore_metallic`, `ore_exotic` — `asteroids.ts ORE_RESOURCE_BY_CLASS`) so Phase C never migrates a save.
2. **Surveying**: one-time-use **survey probes** (a purchasable consumable, `SURVEY_PROBE_COST`) OR **ships with a survey capability** (`ShipDefinition.survey`; fuel to get there, unlimited surveys). Surveyed rocks get the full mining rate; **unsurveyed rocks still mine, at about 15% of the surveyed rate** (`UNSURVEYED_YIELD_MULT = 0.15`, applied to the field's public mean grade so the quote leaks nothing).
3. **Claims expire after 3 game-months unworked** (`CLAIM_EXPIRY_GAME_MONTHS = 3`). Phase B implements claims through `exploration.ts stakeClaim` and reads the constant.
4. **Escort Cutter is a security ship** (Phase B). It only reduces NPC shakedown odds and never targets players; state that in `docs/POLICY.md` when it ships.

## 10. Phase A as built (2026-09-12)

**What exists.**
- **Rocks.** Five fields as children of existing locations (`asteroids.ts ASTEROID_FIELDS`: Near-Earth Cluster ← `lunar_orbit` (Frontier), Inner Belt ← `asteroid_belt`, Ceres Approaches ← `ceres_surface`, Jupiter Trojans ← `jupiter_system`, Kuiper Fringe ← `outer_system`), 40 rocks each, deterministic per world epoch (`generateAsteroidCatalog`). A rock's id/name/class/Δv-surcharge/position are public; grade (0.3–1.5), reserve and rubble risk are rolled with a salt (`ASTEROID_SEED_SALT`) by `scripts/seed-asteroids.ts` into the `Asteroid` table and revealed per corporation through `AsteroidSurvey` rows. The seed upserts on the stable id (idempotent). Ships travel to the field's parent; the map and lane graph are untouched.
- **Survey.** Probes are `ServerAsset` rows of kind `survey_probe` bought through `/api/space-tycoon/assets/mining {op:'buy_probes'}` ($6M each, burned) and consumed by `{op:'survey_probe'}`; survey-capable hulls (Prospector Barge, Starfarer) take a `survey` Mining Order whose `AsteroidSurvey.surveyedAt` is the ship's arrival. The client mirrors surveys in `GameState.asteroidIntel`; local-only play rolls its own (`LOCAL_INTEL_SALT`).
- **Mining Order** (`ships.ts MiningOrder` on `ShipInstance`, planner + reducer in `mining-orders.ts`): target rock, mode (`mine` / `survey` / `return`), fill-to (≤ hold, ≤ surveyed reserve), then-action (`return_store` / `return_sell` / `hold`). Schedule and fuel are fixed at creation by the pure planner (`planMiningOrder`) — transit from `TRAVEL_TIMES` + 0.1 s per m/s of the rock's surcharge, extraction = fill ÷ (`oreExtractionPerHour` × grade × surveyed-mult × hull condition), fuel = Δv × (`MINING_HULL_FUEL_RATE` 20 × tier + 5 × `ORE_LOAD_WEIGHT` 0.2 × ore units) per leg. Phases `transit_out → mining → returning → complete` are derived from the clock; the client tick (`advanceMiningOrders`, called from `processFullTick`) sets status/route/location and credits ore or sale proceeds ONLY for local-only play. For a synced profile the server route quotes the identical schedule, burns the fuel (`mining_order_fuel`), inserts a `MiningOrder` row, and `server-mining.ts completeDueMiningOrders` (assets-complete cron every 5 min + a lazy pass on every mining request) flips it and ledgers the ore (`mining_order_ore`) or the sale (`mining_order_sale`) — the only paths that create ore. `hold` parks the full ship at the field (`heldOre`); a later `return` order pays the return leg. Reserve decrements on completion.
- **Ships.** Prospector Barge (T2, `resource_prospecting`, $180M, 200 hold, 50 ore/h, survey sensor) and Hauler (T2, `modular_spacecraft` — the doc's `logistics_2` does not exist — $220M, 800 hold, poor Δv, no mining). Every existing miner has an `oreExtractionPerHour` (drone 12 / drone 30 / harvester 55 / asteroid miner 90 / deep-space miner 70) and the hull-tier ladder decides which fields it may work.
- **UI.** Build & Fleet ▸ **Mining** (`MiningPanel.tsx`, tier 2 with Fleet): probes + purchase, field picker, rock table (survey pip, grade, reserve, risk, per-rock probe survey), mining fleet with order progress and Return actions, and the order form with the live quote. Outliner/Order Queue rows per active order (`order-queue.ts`).
- **Balance gate** (`scripts/sim-mining.ts`, 2026-09-12): solo barge on a median Near-Earth C rock is cash-positive from month 2 (+$0.86M/month by month 3 after a $6M probe; a blind barge is not — surveying is the decision); a three-ship hold+Hauler cycle does NOT beat two returning barges (as the doc predicts before Phase C refining); best ship gross÷capex is 1.29× the Basic Lunar Extractor (limit ~1.5×). Tuned in the run: hull fuel rate 40→20, ore weight 0.25→0.2, ore prices (C $14k, S $7k, M $10k, X $70k), barge $150M→$180M.

**Phase B picks up.** Claims via `stakeClaim` with `CLAIM_EXPIRY_GAME_MONTHS`; exhaustion + respawn + field ageing (reserve already decrements); extraction pressure on shared rocks; event cards (rubble, spin-up — `risk` is already revealed); Escort Cutter and the NPC shakedown hook; the map affordance (field badges on parent bodies, surveyed-rock glyphs); per-location ore bookkeeping for `hold` (the server ledger is location-blind — ore lands in the global pool today); moving the client catalogue's grade behind the GET so local rolls and server rolls cannot be confused.

## 11. Phase B as built (2026-09-13)

**Claims** (`asteroid-claims.ts`, `AsteroidClaim` table, `server-mining.ts`). Staked on a SURVEYED rock through `/assets/mining {op:'stake_claim'}`: fee max($1M, grade × reserve × ore price × 3%) burned, upkeep 10% of the fee per game-month burned (unpaid → lapsed), `expiresAt = lastWorkedAt + CLAIM_EXPIRY_GAME_MONTHS` (founder ruling 3), advanced by every completed mining order of the holder. Cap by tier 1/2/4/6/8/10/12. Exclusive: an order on a rock under another corporation's claim is refused (`rock_claimed`); surveying stays open; unclaimed rocks stay open. `activeKey` (asteroidId while active, unique) is the one-claim-per-rock guarantee under a race. Loss only by expiry, lapse, exhaustion or release. The assets-complete cron runs `expireDueClaims`, `chargeClaimUpkeep`, `respawnExhaustedRocks`. **Public claim feed** `GET /api/space-tycoon/claims`: every active claim with the holder's corporation NAME, staked / last-worked / lapses-at, plus per-rock activity (corporations with pending orders). Chosen public, not anonymised (§3 "holder public on the diplomacy feed"): a claim is a filed, on-ledger right and a public register is what makes "no claim-jumping by force" enforceable; profile ids, fees and upkeep state never leave the server. Claims also post `asteroid_claim_staked` / `asteroid_claim_released` PlayerActivity rows.

**Depletion and ageing.** `reserve` ≤ 0 → `exhaustedAt`, the holder's claim closes, the planner refuses the rock, the table pips it "Exhausted". Six game-months later the slot is re-charted IN PLACE (`generation` + 1): reserve × 0.6 of a fresh roll, grade centred on the field's AGED mean (`meanGrade × (1 − 0.35 × consumedFraction)`), risk re-rolled, events cleared; every survey of it is stale by generation and the rock reads unsurveyed again (a `rock_respawned` notice drops the client's intel). **Extraction pressure** on shared unclaimed rocks (`rock-pressure.ts`): `share(n) = n^−0.5` over the corporations whose mine orders overlapped the window (1.00 / 0.71 / 0.58 / 0.50, floor 0.25), applied to the hold at completion on the server and quoted on the client from the feed's activity count; the schedule and fuel are unchanged — pressure costs units.

**Event cards** (`random-events.ts` `rubble_field`, `spin_up`; state on the `Asteroid` row: `rubbleUntil`, `spinUpUntil`). Rolled by the completion pass from the rock's risk (rubble: risk × 0.35, yield × 1.25 for 2 game-months, hull wear 5% × (1 + risk) per completed order; spin-up: risk × 0.25, rate × 0.6 for 3 game-months), deterministic in the order id, shared by everyone working the rock, read by the planner on both sides. The card offers "work it" vs "stand off" (a client-side self-restriction — `standing_off` refuses new orders on the rock until the event ends); no cash, no grants.

**Escort Cutter and NPC shakedowns** (`ships.ts` role `security`, `npc-shakedown.ts`). T3, `spacecraft_armor` + `autonomous_docking` (no `point_defense` tech exists), $260M, 0 hold, $600K/mo. On a return leg the lane's odds (belt 12%, Ceres 10%, Trojans 8%, Kuiper 15%, Near-Earth 0) roll deterministically per order; a hit hands 25% of the ore aboard to the Void Corsairs. An ASSIGNED cutter (idle security hull at the departure point or the field, `escortInstanceId` on the order, busy until it completes) multiplies the odds by 0.25; a cutter merely STATIONED idle at the field's parent by 0.5; the Protected Frontier shield stays (0). Outcomes are written on the MiningOrder row (`shakedownUnits`, `shakedownRepelled`) and reach the client as notices — a mail line and a `pirate_raid` Situation Log row. Founder ruling 4 honoured and written into `docs/POLICY.md`: the cutter has no target field, no op and no effect on any other player.

**Client.** `GameState.asteroidClaims` (mine), `miningStandOff`, `miningNoticesSeen`; `SurveyRecord` gains `rubbleUntilMs` / `spinUpUntilMs` / `exhausted`; `ShipInstance.escortingOrderId`. The sync response carries a `mining` block (claims, live intel, notices) adopted by `adoptServerMining` — server wins on claims and per-rock intel, notices post once. `MiningPanel.tsx`: Claims card, per-rock Claim / Event columns, a Claim console (stake with fee quote and cap, release, lapse countdown, other holders from the feed), escort picker, and a quote that shows pressure share, shakedown odds by cover and the units expected to land. `order-queue.ts`: a row for a claim lapsing within one game-month.

**Balance** (`docs/BALANCE.md` Pass 12, `scripts/sim-mining.ts` scenarios 4-5): Phase A gates still pass (solo barge +$859K by month 3; 0.65× the Basic Lunar Extractor); a claim costs $4.0M/6 months uncontested and is worth +$929K once one rival shares the rock; a cutter never pays for a single belt miner and always pays on the Kuiper Fringe.

**Deploy.** `prisma db push` adds `AsteroidClaim`, `MiningOrder.escortInstanceId / shakedownUnits / shakedownRepelled / pressureShare / claimId`, `Asteroid.rubbleUntil / spinUpUntil / generation`, `AsteroidSurvey.generation` — all additive with defaults; no backfill script is needed (existing surveys default to generation 0 = the seeded rocks' generation). `ASTEROID_SEED_SALT` must stay set on Railway: the respawn roll reuses it.

**Phase C picks up.** Ore intermediates + refinery ratios, the Refinery Barge, Propellant Depot Ship with per-field slots, Survey Cruiser + sellable survey reports, modules; the map affordance (field badges, claim rings, escort glyphs) is still open; respawn with NEW catalogue ids once the map can show them; claim TRANSFER via binding contracts (Phase D); server-side ship positions (stationed cover currently reads the persisted client position).

## 12. Phase C as built (2026-09-13)

**Refining** (`ore-refining.ts`, `mining-orders.ts` mode `refine`,
`server-mining.ts`). Founder ruling 1 closed: ore is hauled and refined.
Four recipes, one per spectral class, authored at full recovery and applied
at `MOBILE_REFINERY_RECOVERY` 0.82 aboard a barge (the loss factor;
`FIXED_REFINERY_RECOVERY` 0.95 is reserved for a fixed refinery nobody has
built yet). C → water ice + ammonia + organics; S → steel ingots +
aluminium alloy; M → steel + platinum-group + gold; X → exotic materials +
rare earth. Every output is a resource the market already trades, so
`resources.ts` needed no change at all. A `refine` order is the mining state
machine with one more phase — `transit_out → mining → refining → returning
→ complete` (`refineEndsAt`) — and the cargo that flies home is PRODUCT:
the manifest is the pure function `refineOutputs(oreId, fillUnits,
recovery)`, recomputed by the server at settlement, never a client claim.
The batch a hull may take is `capacity ÷ product mass per ore unit` capped
by `REFINE_MAX_BATCH_HOURS` (12): a 400-unit hold works 2,771 units of
metallic ore in one run instead of 400. A refining hull also processes a
parcel it is ALREADY holding (`mode: 'refine'` with no rock), which is the
"stationed at a field" half of the design's barge. Opex is 6% of the ore's
base price per unit processed, burned (`refining_opex`). Balance:
**+$24.2M (1.54x) and a third of the trips** against hauling the same rock
home over 12 months (docs/BALANCE.md Pass 15).

**Propellant Depot Ship** (`propellant-depots.ts`, `PropellantDepot`
rows). Deployed to a field it holds one of that field's finite slots — 2
per field, 3 in the Frontier — with `(fieldId, slotIndex)` unique, the same
database-settles-the-race shape `AsteroidClaim.activeKey` uses. A stocked
depot pays `DEPOT_COVER_SHARE` (60%) of the propellant bill of every order
its owner flies out of that field, at `DEPOT_FUEL_VALUE_PER_UNIT` ($250K of
burn displaced per unit in the 5,000-unit tank). Restock for cash at
rocket-fuel spot x the field's delivery multiplier (1.2 cislunar → 2.8
Kuiper, so cash restocking past the belt costs more than it saves) or pour
in locally refined volatiles (water ice 0.8, ammonia 0.5 propellant units
per unit) — which is precisely what C-type refining at the same field
produces. Units are drawn ATOMICALLY inside the order transaction; a lost
race just means that order pays cash. Recalling frees the slot and loses
the tank.

**Survey Cruiser and survey reports** (`survey-reports.ts`, three columns on
`AsteroidSurvey`). The cruiser (T4, `hyperspectral` — the doc's
`deep_space_sensors` does not exist in the tree) surveys without probes and
sweeps `surveySweep` = 6 rocks per pass, 5 real minutes a rock, revealing
when the PASS ENDS. Its product is intelligence: any completed survey can be
listed for sale. **Chosen shape: a direct listing, not a market instrument**
— per-rock intel is not fungible, so there is nothing for an order book to
match; a listing is one nullable price column on a row the game already
writes, which is much the smaller change. A listing publishes only the
rock's public catalogue entry, the seller's name, the price and the age of
the intel; grade, reserve and risk stay hidden until someone pays. Buying
writes the buyer their own survey row at the seller's generation (identical
intel) and moves money seller ← buyer minus an 8% broker cut that is burned.
The seller keeps their survey and may sell it again.

**Modules: deliberately NOT shipped.** §5's fit-over-hull list
(`ice-extractor`, `magnetic-rake`, …) would change extraction yield, and
module fitting is **client-owned condition today** — the assets route says
so in as many words ("module bonuses are client-owned condition") and
computes cargo capacity from the hull alone for exactly that reason. A
yield-affecting module would therefore either be a forgeable claim or a
quote the server refuses to honour. Modules wait for a server-registered
fitting table, which belongs with Phase D's other registry work.

**Server authority.** `refining_output` is the only path that creates
refined product for a synced profile; the completion pass recomputes the
manifest from the order row, settles extraction pressure and the shakedown
on the PRODUCT, decrements the rock by the ORE worked, and ledgers under
new reasons (`refining_output`, `refining_sale`, `refining_opex`,
`depot_restock`, `depot_feedstock`, `survey_report_purchase`,
`survey_report_sale`). The assets-complete cron stays the single place work
completes. A forged fill or manifest on a server-authoritative order credits
nothing (`mining-phase-c.test.ts`), and the completion pass itself is
covered against an in-memory DB (`mining-phase-c-server.test.ts`).

**UI.** `MiningPanel.tsx` gains a **Mine & refine** mode in the order form
(plant time, recovery, opex, product manifest and depot coverage in the
quote), a **Refine here** action on a hull holding raw ore, a **Refining &
Depots** console (the recipe table, per-field slot register, tank level,
cash/feedstock restocking, deploy and recall) and a **Survey Reports**
console (your surveys with their listing state; the open market with Buy).
The Phase C consoles read and write `/api/space-tycoon/assets/mining`
directly and re-read after every write — the claim-feed pattern — because a
slot, a tank level and a listing are server state with no client mirror;
mining ORDERS (refine included) still go through page.tsx server-first.

**Deploy.** `prisma db push` adds the `PropellantDepot` table,
`AsteroidSurvey.listedPrice / listedAt / soldCount`, and
`MiningOrder.refined / refineEndsAt / refineOpexPaid / depotId /
depotUnitsDrawn` — all additive with defaults, no backfill.

**Phase D picks up.** Standing orders; the Belt Mothership; TRANSFER of a
held parcel between hulls at a field (the miners-stay / haulers-cycle
pattern the Hauler was built for, and the reason scenario 2 still does not
beat two returning miners); claim transfer via binding contracts; quarterly
corporate mining share; the Salvage Tender for derelicts; ship MODULES once
fitting is server-registered; a fixed refinery consuming stored ore at
`FIXED_REFINERY_RECOVERY`; and the map affordances still open from Phase B
(field badges, claim rings, escort and depot glyphs).
