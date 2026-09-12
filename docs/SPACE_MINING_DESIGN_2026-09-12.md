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

## 9. Open decisions for Jay

1. **Ore as a new intermediate (Phase C)** adds a real supply chain but also a new thing to learn. Alternative: refine on the fly at a fixed ratio with no ore item. Recommendation: ore, because hauling bulk is what makes haulers and depots matter.
2. **Blind mining of unsurveyed rocks** at a penalty (recommended: keeps the rush option) versus surveyed-only.
3. **Claim expiry** if not worked: 3 game-months (recommended) or 6.
4. **Escort Cutter** as a new `security` role, given the no-combat rule: it only reduces NPC shakedown odds and never targets players. Recommendation: yes, with that stated in `docs/POLICY.md`.
