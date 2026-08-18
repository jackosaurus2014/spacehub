# Space Tycoon — Economic Balance

This document captures the balance decisions made across the five balance
waves and the economic design goals they serve. Companion to
[CLAUDE.md § Realistic economics](../CLAUDE.md).

**Core balance thesis:** players should be able to build wealth, but not
frictionlessly. The game must avoid "build 100 telecom sats and print
money forever." Revenue should scale sublinearly; ongoing costs should
grow with empire size; accumulated wealth should face continuous drag.

---

## The five money sinks / dampers

| Wave | Mechanism | Target behavior |
|---|---|---|
| 1 | **Service saturation** (revenue-side diminishing returns per service type per location) | Prevents "spam N identical satellites for N× revenue" |
| 2 | **Corporate overhead** (superlinear tax on building count) | Makes fleet sprawl expensive — encourages efficiency |
| 3 | **Executive compensation** (wealth-scaled ongoing tax) | Prevents passive wealth-hoarding |
| 4 | **Market broker fee** (3% sell-side friction) | Closes frictionless mine→sell loops |
| 5 | **Commander stacking cap** (same-class diminishing contribution) | Prevents +180% revenue from 9 legendaries |

---

## Wave 1 — Service saturation

**File:** `src/lib/game/formulas.ts::serviceSaturationMultiplier`

Each additional service of the same type at the same location earns a
diminishing fraction of full revenue:

- Curve: `0.35 + 0.65 × 0.92^position`
- 1st instance: 100% revenue
- 10th instance: 70%
- 50th: 42%
- Asymptote: ~35%

**Design rationale:** the first telecom satellite over LEO captures a
unique market niche; the 20th competes for the same clients. Per-location
(not global) because the LEO telecom market and the GEO telecom market are
genuinely separate customer populations.

**Exploits closed:** "build 100 sat_telecom at LEO for $350M/mo."
**Exploits preserved (by design):** spreading services across locations.
You can still run effective operations at LEO, GEO, Lunar Orbit, Mars — each
location's first few services earn near-full revenue. This is strategic,
not exploit-y.

---

## Wave 2 — Corporate overhead

**File:** `src/lib/game/formulas.ts::corporateOverheadMonthly`

Monthly admin/HR/compliance cost scaling with building count:

- Formula: `100K × count^1.4`
- Exponent 1.4 means doubling your fleet more than doubles your overhead
- 1 building: $100K/mo (trivial)
- 10: ~$2.5M/mo (notable)
- 50: ~$23M/mo (significant)
- 100: ~$63M/mo (meaningful — ~10-15% of mid-game gross revenue)
- 200: ~$173M/mo

**Mitigations:** corporation-tier maintenance reductions apply, so
Tier 6-7 megacorps get efficiency gains. Legacy, megastructures, and
reputation bonuses also reduce overhead.

**Why superlinear:** real corporations experience administrative
diseconomies of scale — more management layers, more compliance
overhead, more regulatory surface area. An exponent of 1.4 models this
cleanly without being crushing.

---

## Wave 3 — Executive compensation

**File:** `src/lib/game/formulas.ts::executiveCompensationMonthly`

Wealth-scaled monthly tax on net worth:

- Formula: `max(0, netWorth - $100M) × 0.03%` monthly (~0.36% annual drag)
- Below $100M net worth: $0 (new-player exemption)
- $1B: $270K/mo
- $10B: $2.97M/mo
- $100B: $30M/mo
- $1T: $300M/mo

**Design rationale:** prevents the "build empire, earn steadily,
accumulate cash forever" endgame. Tax is continuous — wealth erodes if
not actively redeployed into research, construction, mergers, or
megastructures.

**Interaction with Waves 1-3 combined:** a late-game player with 100
buildings, $1B net worth, and 100 duplicate services at one location now
faces:
- Saturation averaging ~50% on duplicate services (Wave 1)
- $63M/mo overhead (Wave 2)
- $270K/mo exec comp (Wave 3)
- Payable via $175M-ish saturated gross revenue

Still very profitable — but not infinite scaling. More importantly,
every marginal decision now has a cost-benefit calculation. A 101st
duplicate building earns less than the 100th **and** raises overhead.

---

## Wave 4 — Market broker fee

**Files:** `src/lib/game/market-engine.ts::MARKET_BROKER_FEE_RATE`, trade endpoint

Sell-side 3% commission on commodity trades:

- Buy-side unaffected (scarcity premium is already in the supply multiplier)
- Sell-side: `netProceeds = gross × (1 - 0.03)`
- Realistic commodities-broker rate
- Small sales: barely noticeable ($30 on $1,000)
- Large sales: meaningful ($3M on $100M)

**Strategic implication:** players comparing "sell on market" vs "deliver
to NPC contract" now have a clear incentive to pursue contracts when
available — contracts pay full payment with no broker cut, while market
sells lose 3% to the broker. This is intentional: contracts are the
preferred channel for purposeful economic engagement, markets are for
liquidity.

**Magnate commander bonus:** magnates already contribute a
`marketPriceMultiplier` bonus in `computeCommanderBonuses`. UI surfacing
of this bonus (client-side reduction of the effective broker fee for
players with magnates hired) is deferred but plumbing exists.

---

## Wave 5 — Commander stacking soft-cap

**File:** `src/lib/game/commanders.ts::stackingContribution`

Each additional commander in the same class contributes at 88% of the
previous commander's effective contribution:

- 1st commander of class: 100% of rarity's magnitude
- 2nd: 88%
- 3rd: 77%
- 5th: 60%
- 9th (max roster size at Tier 7): 36%

**Sorted by rarity descending** so the highest-rarity commander of a
class always gets the full bonus and lower-rarity commanders get the
diminished contribution. Hiring a legendary after commons doesn't waste
its full magnitude.

**Exploits closed:** 9 legendary "commander" class = theoretical +180%
revenue. New cap: +20% + 20%×(0.88 + 0.88² + ... 0.88⁸) = +20% + +100% ≈
+120%. Still strong but not game-breaking.

**Design rationale:** adding more commanders of the same specialty hits
diminishing returns. One master diplomat can negotiate every deal; a
second helps in parallel negotiations; a ninth is overhead arguing
amongst themselves.

**Cross-class stacking is preserved:** hiring a diplomat + engineer + scientist
gives full independent bonuses to revenue, build speed, and research
speed. Diversity is rewarded.

---

## NPC involvement (audit findings, not changes)

The existing NPC engine (`src/lib/game/npc-engine.ts`) is intentionally
throttled — NPCs progress at 1/10th player speed, never claim rare
locations or unique milestones, and only trade in common resources.
This is the right design for MMO insurance (see
[NPC_BACKDROP.md](NPC_BACKDROP.md)).

**Relevant to balance:** NPC buy/sell activity provides baseline market
liquidity. A single-player corporation can still experience meaningful
price movement because NPCs continuously mine, consume, and trade
without the player's intervention. Wave 4's broker fee doesn't apply to
NPC trades — they operate through their own channels — so NPC activity
is unaffected.

---

## Delivery contract payouts (verification, not changes)

Faction payment multipliers in `delivery-contracts.ts`:
- Dominion: 1.0x (official, law-abiding)
- Syndicate: 1.3x (gray-market premium)
- Void Corsairs: 0.9x (low rep-gate)
- Hive Collective: 1.5x (rare-exotic premium, smallest quantities)
- Nebula Reavers: 1.1x (nomadic logistics)
- Echo Remnants: 1.4x (precursor preservation premium)

**Verified against the broker fee (Wave 4):** contracts pay full; market
sells lose 3%. So even a Dominion contract (1.0x base) is ~3% more
profitable than an equivalent market sell. Faction contracts are the
**intended preferred channel** for most of a player's late-game output.

**Hive Collective:** pays the most (1.5x), demands smallest quantities
(0.5x modifier), longest deadlines (24-168h). High-value niche contracts
are the intended Hive experience.

---

## Delivery contract daily completion cap

**Files:** `src/lib/game/delivery-contracts.ts::getDailyDeliveryCap` /
`getDeliveryCapStatus` / `deliverContract`; UI in
`src/components/game/DiplomacyPanel.tsx`.

**Founder directive (2026-08):** *"whenever I finish the open market
contracts it immediately refreshes the contracts. We should only allow X
number of contracts to be completed every 24 hours (x being whatever you
think is well balanced against the income you generate in the game)."*

This is a rate-limiter on an income stream, not a cost sink like Waves
1-5 above — it belongs in this document because it closes the same class
of problem: an unbounded repeatable action that, left uncapped, would
dominate the income model.

### Why contracts need a cap now (and didn't before)

Two prior waves compound here. Wave 4 (above) made contracts the
no-broker-fee channel — full payout, no 3% cut. The E2 "One Price Truth"
wave then made contract payouts **spot-linked**: `paymentMoney` is
rescaled to the live market spot at acceptance and locked as a genuine
forward. Together, a contract is now a full-value, frictionless payout
tied to real market prices — exactly the kind of action a player would
grind indefinitely if nothing bounded the rate. The pool auto-refreshing
every 4 hours (`POOL_REFRESH_MS`) means the supply of contracts was never
the limiting factor; only the player's clicking stamina was.

### Deriving X from the actual payout math

`generateContract()`'s formula: `payment = basePrice × quantity ×
faction.paymentMultiplier × postureMultiplier(~1, ±20%) × noise(0.9-1.1)`,
where `quantity ≈ (20 + rng×180) × faction.quantityMultiplier` (mean
`baseQty ≈ 110`). Plugging in each faction's preferred-resource average
price (`resources.ts`) and its quantity/payment multipliers gives a
representative payout per faction contract:

| Faction | Preferred avg. price | Avg. qty | Pay ×mult | ≈ Avg. payout |
|---|---:|---:|---:|---:|
| Dominion | $59.5K (iron/aluminum/titanium/rare_earth) | 132 | 1.0x | ~$7.9M |
| Void Corsairs | $12K (methane/ethane/aluminum/iron) | 110 | 0.9x | ~$1.1M |
| Echo Remnants | $681K (exotic/rare_earth/titanium/platinum) | 77 | 1.4x | ~$73M |
| Syndicate | $750K (platinum/gold/rare_earth/exotic) | 88 | 1.3x | ~$86M |
| Hive Collective | $1.78M (exotic/helium3/lunar+mars water) | 55 | 1.5x | ~$147M |
| Nebula Reavers | $1.76M (methane/helium3/ethane/exotic) | 99 | 1.1x | ~$192M |

Mean across factions ≈$84M/contract; median ≈$41M. The spread is
**intentional and self-limiting**: Hive/Nebula/Echo's high averages come
from exotic_materials/helium3/platinum_group — resources with tiny
`startingSupply` (20-500 units) and near-zero `npcRestockPerHour`
(0.1-3/hr) in `resources.ts`. A player can't casually stockpile 55-180
units of helium-3; producing that quantity requires exactly the kind of
mid/late-tier mining infrastructure that also unlocks higher diversified
income (Corporation Tiers, per `corporation-tiers.ts`, gate at
`totalEarned` thresholds of $500M / $5B / $50B / $500B / $5T). So the
**median completable contract for a given tier** tracks that tier's
production capability, not the raw mean above — the low end
(Dominion/Void Corsairs, ~$1-8M using common metals) is what's actually
repeatable at any tier; the high end is throttled by resource scarcity
that a flat completion-count cap doesn't need to separately re-solve.

**Diversified daily income reference points.** Rather than re-derive real
per-day income from the game-month/tick-rate formulas (which blow up
unrealistically if extrapolated to 24 continuous hours — see
`TICK_INTERVALS`/`TICKS_PER_GAME_MONTH` in `constants.ts`, a ~$1M/mo
service alone would imply $1.4B/day at nonstop 1x-speed ticking, which no
real session looks like), this analysis uses the game's own **already-
tuned real-daily benchmarks**: the `revenue_earned` daily-task targets in
`alliance-events.ts`/`seasonal-events.ts` — $50M ("Profit Goal", easy),
$100M-$200M ("Big Earnings"/daily task, solid early-mid), $500M (mid daily
task), $1B (late daily task). These are calibrated by prior design passes
as realistic-but-meaningful real-24h income for a diversified player
(services + market + megaprojects + research bonuses) at each rough tier,
so they're a better anchor than re-deriving from raw tick math.

**Target:** contracts ≤30-40% of diversified daily income.

- Early tier (~$100M/day diversified): X × (Dominion/Void-Corsairs-range
  payout, ~$5-8M) → **4 contracts ≈ $20-32M/day ≈ 20-32%** of $100M. Comfortably
  under the ceiling even before accounting for the fact that an early
  player mostly *can't* complete the $70M+ exotic-resource contracts yet.
- Mid tier (~$500M/day diversified, Tier 3-4, has rare-earth/platinum
  production online): 4-5 contracts blending Dominion/Echo/Syndicate-range
  payouts (~$8-85M) lands in the **$50-250M/day range ≈ 10-50%**, centered
  well inside the 30-40% band for a player actually mixing contract types
  rather than cherry-picking only the priciest.
- Late tier (~$1B+/day diversified, Tier 5+, Hive/Nebula-capable): the max
  cap of 6 at even the richest average payout (~$190M) is $1.14B — this is
  the one regime where a single maximal roll can spike above the 30-40%
  guideline for that one contract. This is accepted as a bounded, rare
  edge case (see "Residual risk" below) rather than solved by shrinking
  the cap for everyone — a flat count cap can't perfectly track payout
  variance without also being unfair to players running cheap, frequent
  contracts.

**Chosen X:**
- **Base: 4** completions per rolling 24h window — squarely in the
  founder's suggested 3-6 range, and the number that keeps the *common*
  case (players grinding the metal/hydrocarbon contracts they can
  actually resupply quickly) inside 20-35% of early/mid diversified
  income.
- **+1 for completing `space_logistics`** ("Space Logistics Network" —
  tier 2, "-25% transport costs", `research-tree.ts`). This is the one
  existing tech whose flavor ("Regular cargo delivery routes") and
  category (`services`) directly match delivery-contract logistics.
  Reused by direct `completedResearch.includes()` check (see
  `DELIVERY_CAP_RESEARCH_BONUS_ID` in `delivery-contracts.ts`) rather than
  routed through the generic `ResearchEffectType` system — that system
  sums fractional (0-1, capped at 0.30) magnitudes onto continuous
  multipliers, and a flat +1 integer contract slot doesn't fit that
  shape. `COMMAND_QUEUE_AUTOMATION_RESEARCH_ID` in `constants.ts` already
  established this exact pattern (a flat command-queue-slot bonus from a
  direct tech-id check) for the identical shape mismatch, so this reuses
  that idiom instead of inventing a new effect type for one consumer.
- **+1 at Corporation Tier 5 ("Conglomerate")** — mirrors
  `COMMAND_QUEUE_TIER5_BONUS`'s threshold/shape exactly. At Tier 5 a
  corporation runs parallel operations across enough locations that
  servicing one more simultaneous delivery is a real, earned capability,
  not a freebie — and it's also the tier bracket where diversified daily
  income is large enough that a 6th completion stays proportionate.
- **Max: 6**, never purchasable — both bonus paths are earned (research
  completion, sustained economic growth to Tier 5), matching
  CLAUDE.md's no-pay-to-win invariant for game-relevant progression.

### Implementation notes

- **Rolling 24h window, not a fixed daily reset.** A fixed UTC-midnight
  counter lets a player complete X contracts at 23:59 and X more at
  00:01 — a 2X burst in two minutes. A rolling window (every completion
  timestamp must be ≥24h old before it stops counting) closes that
  exploit and was chosen over a fixed reset for that reason.
- **No new persisted field / save migration.** `completedDeliveries`
  already stores `completedAtMs` per entry (and is capped to the most
  recent 100 — comfortably more than 24h of history at these magnitudes),
  so the rolling window is computed directly from data already on the
  save. Adding a parallel `completionTimestampsMs` array would duplicate
  that data for no benefit, so `save-load.ts`/`types.ts` are unchanged —
  the next free migration slot (V31) remains free for a future wave.
- **Completing is gated; the board still refreshes visually.** The Open
  Market pool keeps refreshing on its normal 4h cadence and contracts
  remain acceptable — only `deliverContract()` (the actual payout/
  completion step) is capped. This was the cleaner UX call: blocking
  *acceptance* would strand a player's already-produced resources with
  nowhere to deliver them, whereas blocking *completion* lets them keep
  queuing up deliveries (visible in the Active tab) that pay out as soon
  as the window frees a slot — no wasted production, no dead pool.
- **Tamper-resistant in spirit, not server-authoritative.** Delivery
  contracts remain 100% client-simulated (E2 wave note). The cap check in
  `deliverContract()` reads directly off `state.completedDeliveries`
  (server-synced history, not a client-only counter) and is
  unconditional — even a hand-crafted client dispatch cannot exceed it
  without also fabricating fake completion history, and real money
  movement from any such tamper attempt is still bounded by the existing
  sync-route plausibility clamp (E1, §5). This mirrors the precedent set
  for delivery contracts generally: client-authoritative gameplay, with
  the server-side clamp as the backstop against real economic damage.

### Residual risk (not solved here, flagged for a future wave)

A single maximal Hive/Nebula-Reavers roll (~$1.1-1.3B) can still exceed
the 30-40%-of-daily-income guideline in one shot at the tier where
those contracts become completable. The completion-count cap bounds
*repetition*, not *magnitude* — a per-resource-category value cap or a
rolling $-value cap (in addition to the count cap) would close this fully,
but that touches the spot-linked payout formula itself (out of scope for
this pass, which was scoped to the count-based cap only) and would need
its own balance pass against E2's forward-hedging design intent.

---

## Design invariants for future balance work

When proposing new revenue sources or cost structures:

- [ ] Does it introduce or extend an ongoing sink, or is it pure income?
      (The game needs far more sinks than sources to keep costs real.)
- [ ] Does it scale sublinearly with quantity? (Linear or superlinear
      revenue sources create runaway economies.)
- [ ] Does it cost scale with the player's wealth or empire size? (Flat
      costs become trivial at scale.)
- [ ] Is it transparent to the player? (Hidden taxes feel unfair.)
- [ ] Does it have a mitigation path (research, tier, commander,
      legacy)? (Pure taxes without counterplay feel oppressive.)
- [ ] Does it preserve meaningful decision-making? (A tax so heavy it
      makes the action unviable just removes the choice.)

---

## What's deliberately unchanged

- **Building cost scaling via `scaledBuildingCost`** — already provides
  cost-side diminishing returns on duplicates (1.3x per duplicate at
  same location). Wave 1 adds revenue-side complement.
- **Existing maintenance costs** — these are per-building flat costs.
  Wave 2 overhead adds the superlinear *sprawl* tax on top.
- **Research costs** — already scale with tier.
- **Supply/demand engine** — the sqrt-curve supply multiplier, mining
  pressure at 1/3, and idle decay were audited in Wave 4 and found
  sound.
- **NPC tuning** — auditable, left alone. See NPC_BACKDROP.md.

---

## Verification

All five waves land with unit tests:

- `__tests__/saturation.test.ts` — Wave 1 curve
- `__tests__/overhead.test.ts` — Wave 2 scaling
- `__tests__/exec-comp.test.ts` — Wave 3 threshold/rate
- `__tests__/market-broker-fee.test.ts` — Wave 4 commission
- `__tests__/commanders.test.ts` — Wave 5 stacking (original tests plus 3 new)

Existing `game-features.test.ts` (49 integration tests against processTick)
still passes at every wave.

The delivery contract daily cap (above) is covered in
`__tests__/delivery-contracts.test.ts`: cap derivation (base/research/tier/
stacking), rolling-24h-window boundary math, and enforcement inside
`deliverContract` (blocks at cap, frees up as the window rolls, research/
tier bonus slots, and confirms accept/deadline-processing stay unaffected).

---

## Meaningful Decisions Wave M3 — demand grows with the economy, mining is
## price-linked (docs/MEANINGFUL_2026-08.md §M3, findings F3/F6)

- **F6 — derived demand is now gross-share, not flat-per-building.**
  `demand-pools.ts`'s `DERIVED_DEMAND_RATES.perBuilding` (a flat $/mo
  constant identical for a $3.5M satellite and a $160M mining rig) is
  replaced by `addGrossSpreadDemand`: `DERIVED_DEMAND_GROSS_SHARE` (30%,
  spec range 25-35%) of a building's own service gross, spread across
  every demand-pool category it does NOT itself supply
  (`GENERIC_SPREAD_WEIGHTS`, renormalized over the eligible categories).
  A building can never feed its own category — the pre-M3 flat constant
  did (a datacenter's $250K generic "compute" contribution counted toward
  its OWN pool). Crewed-building demand (`perCrewedBuilding`) now scales by
  building tier as a headcount proxy (the save has no per-location crew
  occupancy to read). Verified by `__tests__/demand-pools-population-
  scaling.test.ts`'s "gross-share scaling" block — direct, deterministic
  unit tests on `deriveActivityDemand` that fail against the pre-M3 flat
  constants (checked by hand) and pass post-fix. The spec's own acceptance
  wording ("50-profile world at active30d=500, median pool mult >= 0.7")
  is also covered there, honestly labeled as a floor/sanity check — every
  diversified synthetic population tried already cleared 0.7 on a
  per-market median basis even pre-M3 (most of the ~88 (location,
  category) markets never accumulate enough capacity to saturate); the
  "slides toward 0.35" dynamic F6 describes is real but shows up in
  supplier-weighted terms for the small set of buildings every player
  converges on, which is the demand-pool floor mechanic working as
  designed (competitors take your customers), not something a derived-
  demand coefficient should or can erase.
- **F3 — mining_output revenue is price-linked.** `mining-pricing.ts` (new)
  replaces the flat `revenuePerMonth` cash figure for `mining_output`
  services with `Σ(units mined this tick × live spot) × scale`, where
  `scale = revenuePerMonth / Σ(amountPerMonth × basePrice)` — a constant
  derived from existing authored data (no MINING_PRODUCTION/revenue re-
  tuning), chosen so the new formula reproduces the OLD flat number
  exactly at neutral conditions (spot = base, extraction pressure = 1.0,
  no mining bonuses). From there it's fully reactive: extraction pressure,
  spot-price moves, and mining-output bonuses (previously ignored by the
  flat cash figure) now move revenue directly. Wired into `game-engine.ts`
  §1 (live tick, hoisted `miningMult`/freighter/location-bonus helpers so
  the price-linked base can be computed in the SAME loop that used to read
  the flat rate) and `away-operations.ts` (away-parity, using that
  module's pre-existing simpler mining-production formula — no freighter/
  location/consumption terms, matching its own established approximation
  posture). Grandfathered: existing saves blend 50/50 old/new for 3
  game-months from a V37 migration anchor (`miningPriceLinkPhaseInStart
  Month`), then switch fully — new games get full weight immediately.
  `mining-pricing.test.ts` + `mining-price-linking-integration.test.ts`
  cover the scale-factor derivation, spot/pressure sensitivity, the
  grandfather blend, determinism, and away-parity. `scripts/sim-harness.ts`
  was updated to match (mining_output no longer double-counts a flat
  service-revenue line AND a separate resale-of-leftover-inventory line —
  see that file's M3 comments); `mining_asteroid`'s first-copy marginal ROI
  softened from a 354-month to a 497-month payback as a result (still
  solidly positive — `tier-ladder-first-copy-roi.test.ts`'s "every
  first-copy is profitable" guard still passes 5/5) because the harness's
  pre-M3 combo was itself slightly over-generous to mining (a full flat
  rate PLUS a separate 100%-of-leftover auto-sale, something the real
  engine never did); the unified price-linked figure is the more accurate
  read of the real post-M3 engine.

---

## Pass 1 — Resource generation vs sinks (2026-08 resource audit)

**Founder directive:** *"Make sure that players aren't generating so many
of the resources/materials in the game that it makes the game trivial."*
The M-waves sim-proved the MONEY curves; this pass is the first audit of
the RESOURCE curves — hunting material post-scarcity (mining + recipes
outrunning consumption/construction/market absorption ⇒ unbounded
stockpiles, floor-pinned prices, decorative supply decisions).

### Tooling (additive; legacy tables unchanged)

- `scripts/sim-harness.ts` now tracks per-month resource **flows**
  (mined / produced / consumed / construction / sold / unsold / decayed /
  bought), stockpile snapshots by bucket (raw/refined/component/product),
  and a `sinkCoverage()` analyzer (monthly drains ÷ monthly generation).
  Two opt-in world realism switches — `npcSaleCaps` (leftover sales
  bounded by what the NPC maker can actually absorb per game-month:
  per-REAL-day cap × 0.25, since a game-month is 6 real hours) and
  `constructionMaterials` (builds settle their real `resourceCost`, as
  command-queue.ts does) — both **default off** so the historical M-wave
  tables don't shift.
- `scripts/sim-resources.ts` (new runner): integrator / belt-baron /
  **resource-hoarder** (max mining + production, sells NOTHING — the
  worst case) over 24 game-months in the audit world, plus floor-dump
  scenarios.
- `src/lib/game/npc-volume-caps.ts` (new): the NPC maker's daily volume
  caps extracted from prisma-backed `market-orderbook.ts` into a pure
  module (market-orderbook re-exports; numbers byte-identical) so the
  harness and client surfaces can read them.

### Findings (pre-tuning, audit world, month 24)

- **Diversified play is healthy.** The integrator's coverage is ≥ 1.0 on
  every resource — E3's consumption engine is a real sink when you build
  the consumers. No pileup, no change needed.
- **Mining specialists pile up unboundedly.** Belt baron (6 rigs +
  refinery): iron coverage **0.31**, steel_ingots **0.06** (the orbital
  refinery's 100/mo passive output has almost no recurring sink),
  aluminum_alloy 0.16, titanium 0.26 — ~17K units/mo of surplus the NPC
  caps can't absorb, stock growing linearly forever. Hoarder: 39.6K raw
  units by month 24, +~2K/mo, with methane/ethane/steel/gold/platinum/
  exotics at **zero** recurring drains.
- **Extraction pressure binds but is not a dam.** Every hot deposit sits
  at the 0.4 floor by month ~3 — yet 0.4 × N rigs is still a firehose
  (hoarder: 2,300 iron/mo at month 24).
- **Floor-dumping is NOT a money printer** (good news): with NPC caps
  honored, dumping at the anti-cornering band floor (base × 0.3) yields
  the belt baron ~$4M/game-month (vs ~$13.5M at neutral spot). Analytic
  ceiling if a 24/7 player saturates EVERY minable resource's NPC cap at
  the floor: **~$42M/real-day** — 4-8% of the late-tier $500M-1B/day
  diversified benchmarks, and reaching it requires Europa+Titan+Kuiper
  infrastructure that itself out-earns it. The M4 event-spread widening
  and per-resource caps already did this job. **No cap tightening needed.**
- Colony output is a non-issue: `COLONY_MINING_PRODUCTION` is not wired
  into the tick (audited — comments only), so colonies generate nothing.

### Levers chosen (sinks-first, per this doc's thesis)

**1. Volatile boiloff** (`consumption.ts::VOLATILE_BOILOFF_PER_MONTH`) —
stored volatiles lose a fraction of TOTAL stock each game-month:
rocket_fuel 5%, helium3 5%, methane/ethane 4%, ammonia 3%, water ices
2%, deuterium 2%. Physically honest (real-world cryo boiloff is 1-5%/mo;
LH2 is worse) and it hits hoarders hardest while a working 1-month input
buffer loses pennies (integrator's net moved $27.5M → $27.4M/mo).

**2. Warehouse-overflow decay** (`consumption.ts`) — every resource has a
soft storage cap by rarity tier (`baseStorageCapUnits`: bulk raw 1,500 u;
precious/rare-earth/exotic 300; refined 400; component 150; product 60).
Stock ABOVE the cap decays **15%/game-month** (degradation, drift,
pilferage). Buildings with the `inventoryProtection` capability
(refineries, belt stations — the game's warehousing) extend capacity up
to ×2.2 (`storageCapacityUnits`), so storage investment is now a real
decision. Below the cap, non-volatiles never decay — working stockpiles
stay free. **This bounds every stockpile:** the worst-case asymptote is
`cap + monthly-generation / 0.15` (≈ cap + 6.7 months of output), so
hoarding converges instead of growing linearly, and the marginal hoarded
unit above that is pure loss — sell it, consume it, or lose it.

Both effects ramp 0 → 100% over 6 game-months (36 real hours) from a
**lazily stamped anchor** (`consumptionState.storageDecayStartMonth`,
optional field — no save migration), are Frontier-exempt via
`advanceConsumptionToMonth`'s existing shield, and surface a monthly
Situation-Log event when losses exceed 25 units (transparency invariant).

**Deliberately unchanged, with rationale:**
- **Extraction pressure curve** — it already floors at 0.4 on every
  contested deposit; steepening it is a generation nerf and sinks-first
  says drain the surplus instead. *Pass-2 seam:* if the tuned numbers
  still under-drain, lower `EXTRACTION_PRESSURE_MIN` toward 0.25 for
  over-saturated deposits (M3/F7's floor-decay pattern).
- **NPC volume caps** — floor-dumping quantified as non-viable (above).
- **No new `consumesPerMonth` inputs on existing buildings** — adding
  recipe lines to live buildings would brown-out existing saves with no
  grandfather grace; maintenance-consumes-materials remains a candidate
  for a future wave WITH its own grace credit.

### Before/after sink coverage (audit world, month 24)

| resource | belt baron before | after | hoarder before | after |
|---|---:|---:|---:|---:|
| iron | 0.31 | **0.96** | 0.09 | **0.82** |
| steel_ingots | 0.06 | **0.94** | 0 | **0.92** |
| aluminum_alloy | 0.16 | **0.77** | 0 | **0.68** |
| rare_earth | 0.39 | **0.78** | 0 | **0.54** |
| platinum_group | 0.78 | 0.78 | 0 | **0.68** |
| gold | 0.52 | **0.55** | 0 | **0.76** |
| methane | — | — | 0 | **0.59** |
| ethane | — | — | 0 | **0.63** |
| lunar_water | — | — | 0.31 | **0.62** |
| helium3 | — | — | 0.10 | **0.72** |
| titanium | 0.26 | 0.26† | 0 | 0† |

† Still under its storage cap at month 24 — decay hasn't engaged yet, but
the asymptote is finite (≈ 3,300-4,200 u for the hoarder). Slow-filling
resources are *allowed* a working stockpile before the cap bites; that is
the design, not a leak.

*Pass-2 footnotes (2026-08, see "Pass 2" section below):* (i) the month-36
re-audit reproduces this table's month-24 values exactly (the audit runs are
deterministic) and confirms convergence continues past month 24 — total-stock
drift falls geometrically (belt baron 265 → 53 u/mo, hoarder 1,196 → 275
u/mo between the mo-11→17 and mo-29→35 windows). (ii) The steel/refined
coverage in this table was understated for players who CRAFT — the harness
couldn't see the crafting queue. With crafting modeled (Pass 2), a belt
specialist who invests in fabrication reaches iron ≈ 1.0 and
steel_ingots ≈ 1.0 coverage, but the crafting sink is **output-bound** at
steady state: components pile to their own (tighter) caps unless they exit
via contracts. The numbers above — the no-crafting case — remain the honest
floor.

**Healthy-band statement:** target is 0.6-1.2 coverage for the majority
of actively-generated resources as stocks approach equilibrium.
Post-tuning at month 24, 10 of the hoarder's 16 generated resources sit
in 0.54-0.92 (converging on 1.0 at equilibrium by construction — the
decay drain grows with stock), and hoarder raw stock fell 39.6K → 22.9K
units with a flattening curve; belt-baron raw stock 14.7K → 7.7K and
visibly asymptoting (7.06K at mo17 → 7.73K at mo23, vs linear before).

### Verification

- `__tests__/storage-integrity.test.ts` (new): boiloff rates, cap tiers,
  overflow decay, warehouse capacity extension + its sum cap, lazy-anchor
  zero-loss first pass, linear ramp, proportional location-pool decay,
  and the finite-asymptote boundedness proof.
- M1 guards green: `tier-ladder-first-copy-roi.test.ts` (marginal-ROI
  probe never runs the monthly pass, so first-copy ROI is untouched) and
  the demand-pool floor sweeps. Full game suite green.
- Legacy `sim-strategies.ts` money tables essentially unchanged (boiloff
  on 1-month buffers only); no strategy's net income degraded below the
  M1 viability bars.

### Seams left for Pass 2

- Re-run `npx tsx scripts/sim-resources.ts` — it prints the same tables
  fresh against whatever constants are live.
- Candidate follow-ups, in preference order: (a) storage-cap UI (show
  capacity + overflow warning in the inventory panel — the mechanic is
  live but only surfaced via the Situation-Log event) — **DONE in Pass 2**;
  (b) recurring refined/component sinks via maintenance-consumes-materials
  WITH a grandfather grace credit; (c) extraction-pressure floor decay for
  over-saturated deposits; (d) crafting-queue modeling in the harness
  (steel→beams is a real player sink the sim can't see yet) — **DONE in
  Pass 2**.

## Pass 2 — asymptote verification, crafting/contract sinks, storage UI (2026-08)

Second pass on the same founder directive. Pass 1 bounded stockpiles; Pass 2
(a) closed the two harness blind spots that under-measured player sinks
(crafting queue, delivery contracts), (b) re-audited the tuned world to
month 36 to verify true asymptotes and hunt NEW dominant strategies the
Pass-1 levers might have created, and (c) shipped the storage-visibility UI
so decay never feels like silent theft.

### Tooling (additive; defaults off; legacy tables diffed byte-identical)

- **Crafting-queue sink** (`sim-harness.ts` `SimPlayer.craftPlan`) — mirrors
  the live engine's single `activeRefining` slot run continuously (the same
  24/7 assumption `npcAbsorptionPerMonth` already makes): a priority list of
  `PRODUCTION_CHAINS` recipe ids; each month's budget is the game-month's
  real seconds ÷ each recipe's `timeSeconds`/`getCraftingSpeedMultiplier`
  (real fab-count bonus). `requiredBuilding` is enforced against the fleet;
  `requiredResearch` is assumed complete (the harness's standing neutrality
  stance). Inputs come from EXISTING stock only — never market-bought, never
  below the next month's recipe keep-back — so the model measures crafting
  as a **surplus sink**, not manufactured demand. **Informed-player guard:**
  a recipe never runs its output past `storageCapacityUnits` — without this
  the model "crafts into decay" and overstates the sink by pure churn (first
  modeling attempt did exactly that: 2,708 steel piled at a 480-unit cap
  with 15%/mo bleeding disguised as "coverage").
- **Delivery-contract outlet** (`SimWorldOpts.contractOutlet`) — the live
  game's no-fee channel the Pass-1 audit world couldn't see: up to
  `capPerDay` completions per rolling 24h (delivery-contracts.ts: 4 base,
  +1 `space_logistics`, +1 tier 5), modeled as capPerDay × ¼ contracts per
  game-month × `CONTRACT_OUTLET_TYPICAL_QTY` (94 u — derivation in the
  constant's doc comment) units of post-NPC-cap surplus sold at spot ×1.0,
  highest-value first. Faction payment multipliers (0.9–1.5, mean ≈1.2) are
  conservatively held at 1.0, so the real-game outlet is slightly BETTER
  than modeled.
- `sinkCoverage` now counts `craftedIn`/`contractSold` as drains and
  `craftedOut` as generation; `sim-resources.ts` runs to month 36, prints an
  asymptote-drift table per strategy, and adds two new runs
  (belt-industrialist; contract-outlet comparisons).
- Guards: `src/lib/game/__tests__/sim-crafting-contracts.test.ts` (8 tests:
  recipe gating, stock-only inputs, output-cap guard, time-budget bound,
  outlet budget/pricing/ordering, defaults-off invariance, determinism).
  Legacy `sim-strategies.ts` output was additionally diffed against the
  HEAD harness: **byte-identical**. M1 first-copy-ROI CI guard untouched
  and green.

### Re-audit: stocks truly asymptote (month 36)

Total-stock drift (units/game-month, averaged over each 6-month window):

| strategy | mo 11→17 | mo 17→23 | mo 23→29 | mo 29→35 | verdict |
|---|---:|---:|---:|---:|---|
| integrator | −0.2 | −0.1 | −0.1 | −0.1 | equilibrium (≈33 u total — caps never bind) |
| belt baron | 265 | 135 | 76 | 53 | converging geometrically |
| hoarder | 1,196 | 1,054 | 546 | 275 | converging geometrically |
| belt industrialist | 335 | 178 | 105 | 77 | converging geometrically |

The residual drift is entirely resources still UNDER their storage caps
(belt baron: titanium at 1,634 u vs a 2,250-u warehoused cap) — the same
"allowed working stockpile" § Pass 1's † footnote documents. Every
over-cap resource sits at its finite equilibrium (`cap + net-gen/0.15`);
hoarder iron is the clearest: 16,042 u at month 36 against a ~2,550-u cap,
with decay drain (≈2,020 u/mo) nearly matching generation (2,310 u/mo) —
coverage 0.98 and closing on 1.0 by construction. **No unbounded curve
remains in any run.**

### New-dominant-strategy checks (Pass-1 levers)

- **Is warehousing now mandatory-dominant?** No. The integrator's total
  stock (≈33 u) never approaches any base cap — a diversified player pays
  zero decay with zero warehousing investment. `inventoryProtection` only
  matters to specialists running deep stockpiles, where it is a real but
  bounded choice (×2.2 max capacity, and the buildings that carry it are
  bought for their PRIMARY function — refining, station services). It is a
  specialist's tool, not a universal tax.
- **Month-end dump-and-rebuy dodge?** Not durable. Decay reads end-of-month
  holdings, so "dump before the tick" is just… selling — the intended
  response — and both legs are bounded: the sale leg by NPC volume caps +
  the contract cap, the rebuy leg by the same caps plus the ~11% round-trip
  spread (buy ×1.08 / sell ×0.97). The spread is paid on the FULL churned
  quantity while decay only taxes the overflow fraction, the caps prevent
  bulk churn at scale, and the rebuilt pile decays again next month anyway.
- **Crafting-shelter dodge?** A craft-in-progress does hold one recipe's
  inputs outside the decay base, but the single refining slot bounds the
  shelter to one recipe's input stack (~20–50 u) — noise.
- **Crafting-into-decay churn** — found in the MODEL and guarded (see
  Tooling); in the live game it destroys player value rather than creating
  it (no money is minted), and the new storage UI warns exactly when an
  output is over cap. Not an exploit; a player error the UI now prevents.

### Crafting sink — measured effect

Belt industrialist (belt baron + Orbital Fab Lab + Lunar Manufacturing
Plant, continuous rotation beams → electronics → refine-rare-earth →
smelt-steel), no contract outlet. While the queue has cap headroom (month
12) the sink is dramatic vs the plain baron: iron coverage 0.74 → **1.00**
(stock 4,482 → **200** — the smelter eats the entire iron surplus),
aluminum_alloy 0.16 → **1.00**, rare_earth 0.39 → **1.00**. But at steady
state the queue is **output-bound**: beams/electronics fill their component
caps (~208 u warehoused) within months and the guard idles the queue, iron
piles again toward its own cap equilibrium, and component NPC caps are tiny
by design (2–8/real-day) — so crafting alone converts a raw pileup into a
smaller, denser component equilibrium; it does not exit matter from the
economy unless the products SELL. With the contract outlet the products do
sell, and that combination is the first genuinely profitable specialist
(next section).

### Belt-baron viability (Pass-1 open question) — answered

Month-35 steady state, audit world, contract outlet at mid-tier cap 5/day:

| player | net/mo (no outlet) | net/mo (outlet) | contract $/mo |
|---|---:|---:|---:|
| belt baron (4 rigs + 2 reactors + refinery, one deposit) | **−$61.6M** | **−$47.4M** | $14.3M |
| distributed miner (6 deposits, lunar→Titan) | −$11.2M | **−$2.6M** | $9.2M |
| belt industrialist (baron + fabs + crafting) | −$42.7M | **+$7.0M** | $52.9M |

Verdict: **a PURE mining specialist is not viable at mid-tier steady
state**, even with the contract channel modeled. The structural cause is
cost-side, not demand-side: shared-deposit extraction pressure floors at
0.4 after ~3 months of continuous extraction, so a rig earns ~40% of
nameplate while paying **100% of nameplate operating cost** ($18M/mo for a
belt rig that grosses ~$18.5M at the floor). The belt baron's month-35 P&L:
$74M mining revenue + $28M sales/contracts vs $72M operating + $55M
maintenance + $17M exec comp. Mining→fabrication→contracts IS viable
(+$7M/mo and improving with scale), which is the designed pull toward
vertical integration — but the pure-extraction rung of the ladder is a
trap plateau.

**Proposed lever (NOT implemented) — extraction duty-cycle opex scaling.**
When a deposit's extraction pressure is below 1.0, the mining building
throttles its duty cycle and its *service operating cost* scales with it,
floored so fixed costs never vanish:

```
opexMult = clamp(pressure, 0.55, 1.0)   // applies to mining_output
                                        // operatingCostPerMonth only;
                                        // maintenance unchanged
```

Numbers at the 0.4 floor: belt rig opex $18M → $9.9M (−$8.1M/rig/mo).
Belt baron: −$47.4M → **≈ −$15M/mo** (single-deposit stacking stays
punished — correct). Distributed miner: −$2.6M → **≈ +$13–18M/mo**
(mining-opex share ≈ $35–40M across six deposit services) — the
geographically-diversified specialist becomes viable, which is exactly the
gradient the game wants (spread out, don't strip-mine one rock). The
integrator gains <$4M/mo (mining is a small share) — no dominant-strategy
risk. It is cost-side (sinks-first compatible: adds zero generation and
zero NPC money), uses telemetry that already exists per-deposit, and needs
no save migration (pure formula change in the tick + harness §4/§5).
Secondary option if more is needed after that lands: contract
`quantityMultiplier` ×1.5 when a faction's preferred resource is raw bulk
(raises the outlet's raw-unit throughput ~$7M/mo for the baron) — weaker,
and it injects NPC contract money, so try the cost-side lever first.
Implementation should re-run `sim-resources.ts` and hold the M1 first-copy
guard green (first-copy probes price at pressure 1.0, where opexMult = 1.0,
so the guard is structurally unaffected).

### Storage visibility UI (shipped)

Decay must never feel like silent theft (Pass-1 invariant; founder
directive). Shipped in `MarketPanel.tsx` ("Your Resources" + sell modal),
reading the SAME pure functions the tick bills through
(`storageCapacityUnits`, `VOLATILE_BOILOFF_PER_MONTH`,
`STORAGE_OVERFLOW_DECAY_PER_MONTH` — consumption.ts):

- Every inventory card: `Storage <total> / <cap>` across ALL pools (the
  integrity pass taxes total holdings, not just Earth stock), a thin fill
  bar (decorative, aria-hidden), a "near cap" note at ≥85%, and an explicit
  **"Over cap — N u decaying 15%/mo"** state with a GameIcon `warning`
  glyph + amber border — text-first, never color-alone.
- Volatiles additionally show **"Volatile — boils off N%/mo"** with the
  per-resource rate.
- The sell modal repeats the warning where the fix happens: "N units above
  your X-unit storage capacity — surplus decays 15% per game-month.
  Selling it stops the loss."
- Two new glossary concepts (`concepts.ts`): **storage-cap** and
  **boiloff**, cross-linked to each other and reachable from the panel
  header's HoloTip `<Concept>` chips (keyboard/screen-reader accessible via
  the existing HoloTip contract; the per-card text is plain content inside
  the existing card buttons — no nested interactive controls). Cards are
  2-per-row at 375px and the new line is one short text row — no layout
  change.

### Invariants held

- No save migration, no `types.ts` changes — the UI reads existing state;
  the harness fields are sim-only.
- Deterministic: no `Date.now`/`Math.random` in any new harness path
  (asserted by the determinism test).
- Sinks-first: nothing in this pass buffs generation; the proposed miner
  lever is cost-side.
- Frontier exemption untouched (storage integrity still runs behind
  `advanceConsumptionToMonth`'s existing shield).
- M1 `tier-ladder-first-copy-roi.test.ts` green; legacy `sim-strategies.ts`
  tables byte-identical (diffed against the HEAD harness).

## Pass 3 — the player-vs-player economy (2026-08)

**Founder directive:** *"Make sure the competitive aspect against other
players makes sense with the way our game is currently designed."* Passes
1–2 audited the single-player-vs-world resource flows; Pass 3 audits the
PLAYER-VS-PLAYER surfaces: shared demand pools, shared deposits, the shared
labor market, the one shared price, the M5 offense toolkit, newcomer
protection, and the dormant M6 takeover system.

### Current population reality (prod telemetry, 2026-08-17)

Alliance count 1; PriceCampaign / PoachOffer / OrbitalSlotAuction all-time
**0**; EspionageMission, MarketFill, MarketLimitOrder last-7d **0**. Every
PvP lever is empirically unused — the population is pre-contact. Two
consequences for this pass: (1) the multi-player sim below is currently the
ONLY way these levers can be balance-tested — there is no live data; (2)
every verdict distinguishes "balanced once contact exists" from
"discoverability problem." Zero all-time usage of levers that the sim shows
are reasonably priced is at least partly a **surfacing** problem, not a
pricing one (follow-ups at the end).

### Tooling (additive; defaults off; legacy tables diffed byte-identical)

`scripts/sim-harness.ts` gains three opt-in world switches, all importing
the real engine modules (never reimplementing):

- **`contendedNpcCaps`** — with `npcSaleCaps`, ONE monthly NPC absorption
  budget per resource for the whole world, consumed first-come in player
  array order. This matches the real order book: `matchOrders`
  (market-orderbook.ts) is price-time FIFO with **no fair-split mechanism**
  — whoever rests their ask first eats the NPC bid. The delivery-contract
  outlet is deliberately NOT contended (the real daily cap is per-save).
- **`laborMarket`** — each player carries an optional `headcount`; monthly
  payroll is charged at the real shared wage index
  (`computeLaborAggregates` over every player in the world, the weekly
  cron's pure core).
- **`dynamicSpot`** (+ `campaignSlugs`) — the world spot snapshot evolves
  from the players' COMBINED flows each month through the real
  market-engine functions: mined units → `calculatePriceAfterMining`, sold
  units → `calculatePriceAfterTrade` (sell side), then the mean-reversion
  cron's `calculateIdleDecay` once per real hour of the game-month —
  skipping campaigned resources, exactly as the mean-revert route does.

`scripts/sim-pvp.ts` (new runner, deterministic — no Date.now/Math.random)
prints every table below: `npx tsx scripts/sim-pvp.ts`.

Guards: `src/lib/game/__tests__/sim-pvp-harness.test.ts` (10 tests:
defaults-off invariance, FIFO budget conservation/reset, payroll = real
aggregate index math, dynamic-spot determinism/pressure/campaign-pin).
Legacy `sim-strategies.ts` and `sim-resources.ts` outputs re-run and diffed
against pre-change captures: **byte-identical**.

### B. Crowding & fairness — the numbers

**N identical players, 6 GEO telecom sats each (18 mo):**

| players in pool | geo:telecom mult | each: net/mo |
|---|---:|---:|
| 1 | 0.497 | −$8.1M |
| 2 | 0.350 (floor) | −$14.2M |
| 3 | 0.350 | −$14.2M |
| 5 | 0.350 | −$14.2M |

The pool floor is reached with just TWO over-built players; further
entrants change nothing (damage saturates — bounded, by design). Note even
the solo 6-sat player is negative: GEO telecom carries ~2–3 copies.

**Whale (12 LEO sats) vs small efficient player (3 sats), same pool:**

| player | rev/sat | net/mo |
|---|---:|---:|
| whale contested | $1.4M | −$19.4M |
| whale alone | $1.7M | −$15.9M |
| small vs whale | $1.7M | −$2.0M |
| small alone | $3.6M/sat eff. | +$3.6M |

**Verdicts:** (1) The capacity-share split pays the same per-$ rate to
everyone; the whale's extra copies then eat within-player saturation and
superlinear overhead — **efficiency wins per dollar, scale loses more in
absolute terms**. (2) But a small efficient player still **cannot carve
out profit inside a whale-crowded pool** (−$2.0M/mo vs +$3.6M alone) —
the winning answer is to move, which is the intended geography gradient:
same capex postured as "contest the whale's pool" nets **−$6.7M/mo** vs
"spread across three markets" **+$1.7M/mo** (S3). (3) Shared deposits
thin smoothly: 1/2/3/5 co-located belt miners keep 100/74/67/66% of solo
output — crowding pressure also saturates (the 0.4 pressure floor).

**Labor (S5):** a whale hiring 900 engineers moves the engineer index
0.80 → 1.45; a 25-engineer small corp's payroll rises $13.2M → $21.4M/mo
(+62%) — the wage tax is real and untargeted. But the whale pays the index
it created on all 1,500 heads: **$845M/mo** — massively self-limiting.
Counterplay is adequately priced and cooperative: restoring the pre-whale
index needs ~245 crew-quarters server-wide at ~$1.4M capex per quarters
slot (launch_pad_small is the cheapest carrier) ≈ $350M across the whole
server. Verdict: **healthy**.

**One shared price (S6, dynamicSpot):** with three lunar miners the spot
falls only mildly (base $50K → $46K vs $47K solo) because NPC volume caps
bound sale volume long before price impact compounds — the REAL contention
is the FIFO NPC absorption budget: the third player in book order grosses
$17.5M/mo vs the first's $36.0M. First-come liquidation priority is a real
(and currently invisible) PvP surface — see follow-ups.

### C. Offense toolkit ROI (cost / damage / counterplay)

**Price campaign (S7, lunar_water, all real constants):**

| ledger line | value |
|---|---:|
| victim (2 lunar mines) net/mo: neutral → crashed | $21.2M → $16.8M (−21%) |
| victim gross delta per game-month | −$4.4M |
| victim damage per 7-real-day campaign (= 28 game-months) | −$123M |
| victim mothball bound (0 revenue, 25% maint) | −$950K/mo — mothballing does NOT pay here; ride it out |
| attacker burned fee (lunar_water) | $250M |
| attacker margin sacrifice on the crash ammunition (~2,085 u, real impact math) | ~$37M |
| NPC bid absorption during campaign (halved) | 100 u/real-day |
| cooldown before re-declaring | 14 days |

Verdict: **rational only as market-wide warfare** — attacker all-in
≈$287M vs $123M damage to ONE two-mine victim; it pays only when several
rivals share the resource and the attacker's own exposure is small. It
cannot be aimed at one corporation, the band floor bounds it, and the fee
scales with the market's base price. Not dead, not a griefing engine —
**correctly priced, awaiting population**.

**Talent poaching (S8):**

| target | attacker all-in | sunk if countered | defender: retention | defender: REHIRE instead | victim rev value |
|---|---:|---:|---:|---:|---:|
| 40 eng @ idx 1.0 | $28.0M | $10.0M | $13.5M | $12.0M | $12M/mo |
| 40 eng @ idx 1.6 | $38.8M | $10.0M | $21.6M | $12.0M | $12M/mo |
| 250 eng @ idx 1.6 | $190.0M | $10.0M | $135.0M | $75.0M | $30M/mo |

**Defect (design-level, proposed not implemented):** `getHireCost` charges
6 months' BASE salary with **no wage index**, and open-market hiring is
supply-unlimited. A rational defender therefore never retains (rehire is
cheaper at every index level) and the attacker pays 1.5×index× premium for
crew the victim replaces at base price — poaching is strictly dominated
both as acquisition and as damage. **As shipped, O4 is dead content.**
Cheapest coherent fix: `getHireCost = 6 × salary × wageIndex` (one line in
workforce.ts + snapshot plumbing) — at idx 1.6 rehire becomes $19.2M vs
retention $21.6M and the counteroffer becomes a real decision; it also
closes the "hiring ignores the labor market E5 built" inconsistency.
Flagged as proposed because it repurchases a PvE-facing price everywhere,
not just in the poach flow.

**Other levers:** governor freight toll (≤2%, $2M/dispatch cap,
$10M/sync credit cap) — mild governor perk, adequate counterplay, verdict
fine-but-weak. Slot-lease denial — burned bid + 10%/30d idle fee + 90-day
auto-release: bounded, correctly taxed. Cornering intel ($5M/pull + tech)
and espionage products — info-only per POLICY.md, priced, fine. NOTE the
E7 follow-up still stands: `requiresLeaseAuction` is **display-only** —
the build flow does not actually enforce auctions at saturated pools, so
slot denial currently denies nothing.

### D. Newcomer-crush check (S9)

Whale ($100B cash) camps a fresh graduate's GEO market (graduate: book NW
$134M, 2 GEO sats + ground station):

| row | value |
|---|---:|
| graduate net/mo alone → with whale | $6.4M → $0.1M |
| income suppressed | $6.3M/game-month |
| whale running cost of the camp (vs holding cash) | $9.9M/game-month |
| cost : damage | **1.6 : 1** |
| whale capex to enter | $1.31B |

Suppression is loss-making for the attacker (per real-month of camping:
~$1.2B whale bleed vs ~$760M graduate income destroyed) and the victim has
a positive-EV escape (spread out — S3; decommission recovers 40%). Poach
is blocked below 4 heads/type; campaigns are market-wide and fee-gated;
tolls are capped; tenders are impossible (Frontier shield + zero float).
Pool undercutting is the only aimable channel and it is expensive.
**No critical defect** — but note the whale can trivially AFFORD the
bleed, so the deterrent is opportunity cost, not capability. Watch-item
once real whales exist. One asymmetry window: a $100–200M graduate can be
hit by (market-wide) campaigns but cannot declare their own until the
$200M offense floor — half a tier of one-way exposure; acceptable, noted.

### E. Takeover sanity (dormant, report only)

| target | book NW | control cost (51 shares at min tender) | vs book |
|---|---:|---:|---:|
| fresh graduate | $150M | $91.8M + $1.8M burned arb fee | 61% |
| mid corp (+30%/q published) | $5B | $3.52B + $70M | 70% |
| late corp (+10%/q published) | $100B | $64.3B + $1.3B | 64% |

Control costs 61–70% of the target's book **in escrowed cash**, plus the
burned arbitration fee, the −10%/2-month integration malus, and the
mandatory-bid obligation. Structurally, float exists only via voluntary
raises, distress auctions, or accepted tenders — **a healthy corporation
that never raises capital is mathematically untakeable**, and Frontier
corps cannot be tendered. A tender is never cheaper than out-competing
unless the target already leaked float — takeovers are late-game drama as
designed. No changes; system stays dormant behind the 25-active-corp gate.

### F. Fix implemented — Frontier shield on price-linked mining

**The one critical gap found:** the M3 price-linked mining channel read
the synced spot with NO Frontier shield. A rival's price campaign (or any
organic crash) at band floor cut a Protected-Frontier miner's mining cash
revenue to ~30% of neutral — the only offense-reachable revenue path that
bypassed the on-ramp shield (pools, hazards, espionage, poaching, tolls,
and tenders were all already shielded).

**Fix:** `priceLinkedMiningRevenue` accepts opt-in
`{ frontierSpotFloor: true }` — each resource's spot floors at its base
price. Passed by both engines (`game-engine.ts` §1 live tick,
`away-operations.ts` catch-up — parity) when `isInFrontier(state)`.
Exactly mirrors the demand-pool shield's posture: crashes can't bite,
spikes still pay, and the shield ends at graduation. Default off — every
other caller (harness, tests) byte-identical; no save migration, no
GameState changes. Guard: `mining-frontier-shield.test.ts` (6 tests, unit
+ live-tick integration incl. the graduated-still-takes-the-crash case).

### Proposed, NOT implemented (worked numbers above)

1. **Wage-index the hire cost** (`getHireCost × wageIndex`) — the O4 fix;
   see the poaching table. Without it, poaching stays dead content.
2. **Enforce the slot-auction build gate** — `requiresLeaseAuction` is
   display-only; O5's denial lever denies nothing until the build/purchase
   path checks it (pre-existing E7 follow-up, re-confirmed). When it lands,
   exempt Frontier players' FIRST building at a location or the newcomer
   wall returns at 85%-saturated GEO.
3. **Offense-floor alignment** — consider raising the campaign/poach
   attacker floor from $200M to scale with the victim band, or simply
   documenting the $100–200M one-way window as accepted.

### Follow-ups

- **Discoverability (per the population telemetry):** zero all-time usage
  of every lever means the Market/Diplomacy panels under-expose them.
  Candidates: campaign declaration + poach actions surfaced from the rival/
  market screens they target (not only their own tabs); Situation-Log
  nudges when a player's own market position makes a lever relevant. Not
  built in this pass.
- **FIFO liquidation priority** (S6) is a real ordering advantage the game
  never surfaces — either document it as intended ("be first on the book")
  or consider per-refresh maker-quote rationing later.
- The S1 finding that a SOLO 6-copy GEO telecom fleet is already negative
  is Pass-M1-adjacent (pool sizing), not a PvP defect — left alone.

## Pass 4 — closing Pass 3's two verified defects (2026-08)

**Founder directive (standing):** keep making economic balance passes; the
competitive aspect must make sense. Pass 3 verified two design-level
defects and proposed their fixes with worked numbers; Pass 4 implements
both, re-runs the full sim battery, and surfaces the S6 FIFO finding to
players. Runner: `npx tsx scripts/sim-pvp.ts` (S8 now prints the
before/after; new S12 prints the slot-gate verdicts).

### Fix 1 — wage-indexed hiring (O4 "poaching is dead content")

**What shipped.** The Pass 3 proposal verbatim: the REAL charged hire price
is now `getHireCost × wageIndex` — implemented as
`getHireCostWithWageIndex` / `getHireWageIndex` in `labor-market.ts` (it
cannot live in workforce.ts: labor-market already imports workforce, the
reverse import would cycle). `getHireCost` itself is unchanged
(6-month base signing bonus, A8 headhunt voucher applied) so every
legacy caller is opt-safe; the three surfaces that CHARGE or DISPLAY a
hire price all moved to the wrapper: page.tsx's hire handler,
WorkforcePanel's hire buttons (which now show the exact charged number,
with the `×idx` factor and a tooltip — no silent divergence), and
sim-pvp S8. Voucher composes multiplicatively before the index
(commutative; guarded by test).

**Frontier shield (premiums-pay-penalties-wait).** Frontier corps hire at
`min(index, 1.0)` — an overheated market can't bite them, a slack one
(<1.0) still discounts. This is the COST-side mirror of the existing
revenue-side shields (service-pricing floors the pool mult at 1;
mining's `frontierSpotFloor` floors spot at base). The shield ends at
graduation. Guard: `hire-cost-wage-index.test.ts` (11 tests).

**Before/after (S8, engineers, real constants):**

| target | retention (burn) | rehire PRE-Pass-4 | rehire NOW | verdict |
|---|---:|---:|---:|---|
| 40 eng @ idx 1.0 | $13.5M | $12.0M | $12.0M | unchanged at neutral |
| 40 eng @ idx 1.6 | $21.6M | $12.0M | $19.2M | spread 80% → 12.5% |
| 250 eng @ idx 1.6 | $135.0M | $75.0M | $120.0M | spread 80% → 12.5% |

Retention (`1.125 × idx × 6-mo salary`) and rehire (`1.0 × idx × 6-mo
salary`) now scale with the SAME index — a fixed 12.5% paper spread in
rehire's favor, against which retention keeps trained crew instantly,
avoids the +0.02/head post-poach global index bump the rehirer would eat,
and skips crew-capacity re-checks. **Retention-vs-rehire is a real
decision, and in a tight market the attacker's 1.5× premium buys crew the
victim can only replace at the same hot index — poaching is no longer
strictly dominated.** Deliberate side effect (per the proposal): PvE
hiring now tracks the labor market salaries already paid — the E5
inconsistency (hire cost lagging the index) is closed.

**Newcomer-during-a-whale-spree check (fresh audit):** a just-graduated
corp hiring 10 engineers at a pinned 1.6 index pays $48M vs $30M base —
+$18M one-time on a ≥$100M-NW corp. The ONGOING payroll at 1.6× (which
they were already paying pre-Pass-4) dwarfs the one-time bonus premium
within ~4 game-months, and the Frontier month is fully shielded, so the
fix does not create a punishing cliff. Counterplay unchanged and
cooperative: crew quarters grow server-wide labor supply (S5: ~$350M
server-wide restores a whale-spree index). No dominant strategy found:
pre-hiring cheap crew before an anticipated boom is now mildly rewarded —
that is the labor market working, bounded by the 0.8 floor and per-type
crew caps.

### Fix 2 — the orbital-slot gate is now ENFORCED (O5 "denial denies nothing")

**What shipped.** `checkOrbitalSlotGate(state, locationId)` in
`spatial-strategy.ts`, called by all three build entrances: page.tsx
`handleBuild` (defense in depth), command-queue `attemptBuildStart`
(reason `slot_pool_saturated` — the order stays queued and retries), and
BuildPanel (button replaced by "Slots Saturated — Lease Required" with
the full reason + a location-level banner; lease/Frontier passes get an
explanatory chip). Rules, exactly as directed:

- Gate applies only at the four `ORBITAL_SLOT_POOLS` locations and only
  when the SYNC-DELIVERED occupancy bucket is `saturated` (≥85%).
- An active slot lease at the location opens the gate. Leases now sync
  down: **NEW OPTIONAL GameState FIELD `orbitalSlotLeases`**
  (`{ locationId, expiresAtMs }[] | null`, types.ts next to
  `orbitalSlotOccupancy`; sync/route.ts reads the player's active
  `OrbitalSlotLease` rows; save-load defaults it to null — NO save
  migration, absent = pre-Pass-4 behavior).
- A Protected-Frontier corp's FIRST building at the location always
  passes (counting under-construction and mothballed buildings, so the
  exemption can't be chained); the second is gated like anyone else.
- Existing buildings are never retro-blocked or evicted (gate guards
  build STARTS only; lease expiry never removes a building — unchanged
  resolve-cron Step 3 behavior).
- **Mothball/decommission frees the slot:** new shared predicate
  `isSlotOccupant` (complete AND not mothballed/decommissioning) used by
  BOTH the occupancy cron (orbital-slots/resolve Step 1) and the
  client-side `countPlayerBuildingsAt`, so server and client count
  identically.

**S12 verdicts (real gate function + real constants):** graduated
entrant at 160/180 GEO → BLOCKED with the auction hint; lease holder →
allowed; Frontier first build → allowed; Frontier second → blocked;
never-synced save → allowed (fail-open, see residual). Entry economics:
min GEO lease bid $25M burned = +17% on the first sat's $150M capex —
scarcity now has a price at the margin. Squatting (O5 denial) burns
$30M/slot/90d ($25M bid + 2×$2.5M idle fees) for zero yield before
auto-release — **the idle fee's design purpose (make squatting
unprofitable) now actually binds, because the gate it taxes is real.**
Whale first-mover lock: saturating GEO unilaterally needs 153 occupying
buildings; ×1.15/copy same-def cost scaling prices that at ~$1.9e18 —
impossible. Saturation is a multi-corp phenomenon; the gate prices
entry, it cannot be engineered as a lock.

**Residual gaps (documented, deliberate — no server round-trips invented
in the deterministic tick):**

1. **Fail-open when never-synced / snapshot lag.** The gate reads only
   the sync-delivered `orbitalSlotOccupancy`/`orbitalSlotLeases` stash;
   a save that never synced (solo/offline — can't be contending anyway)
   or whose snapshot lags by up to one sync interval (~60s) is not
   gated. The server occupancy cron remains the truth; a burst of builds
   racing the snapshot can overshoot 85% briefly — bounded by build
   costs and construction slots, and self-corrects at the next cron.
2. **One lease opens the whole location for its term.** The client
   cannot attribute a specific building to a specific lease row, so an
   active lease permits builds at that location for its 90-day term
   (N builds on one lease is possible). Same-def cost scaling and the
   S1 pool floor make bulk exploitation uneconomic; a per-lease
   one-build ledger would need server-side build settlement — noted as
   a possible E7 follow-up, not built.
3. Lease-table read failure on sync degrades to "no leases" — at worst
   over-blocks a real leaseholder until the next successful sync; never
   under-blocks.

### Fresh re-audit (all three runners re-run, deterministic — diff-clean on double-run)

- **sim-pvp S1–S7, S9–S11: unchanged** from Pass 3 (the two fixes touch
  no revenue/cost formula those scenarios exercise) — crowding still
  saturates at the floor with 2 players, geography gradient intact
  (contest −$6.7M vs spread +$1.7M), labor tax self-limiting, campaign
  ROI unchanged, newcomer-crush cost:damage still 1.6:1, takeover desk
  unchanged (dormant).
- **sim-strategies / sim-resources: byte-identical concerns** — neither
  imports the changed surfaces (harness untouched; `countPlayerBuildingsAt`
  is not a harness input), and the M1 first-copy-ROI CI guard
  (`tier-ladder-first-copy-roi.test.ts`) stays green: no building's
  first-copy economics moved.
- **New dominant strategies checked:** (a) early hiring at high-index
  moments — see the newcomer check above, no cliff; (b) whale GEO lock —
  S12c, impossible; (c) lease-then-spam under one lease — residual #2,
  bounded by per-copy cost scaling + pool floors; (d) mothball-to-free-
  slot cycling — mothball already costs 25% maintenance + a reactivation
  fee + a game-month spin-up, and freeing a slot only ever HELPS rivals,
  so there is no offensive use; it is the intended exit valve.
- **Wage-index UI/handler parity:** WorkforcePanel button, tooltip, and
  the hire handler all read the same wrapper — guarded by tests; the S8
  poach inbox retention flow is unchanged (retention numbers already
  carried the index server-side).

### Surfaced (no mechanic change)

- **NPC-liquidation FIFO priority** (Pass 3 S6 follow-up): the
  `order-book-depth` glossary concept now states price-time priority
  explicitly — same price, earlier order fills first, including against
  the NPC maker's absorption budget ("being early on the book is a real
  advantage"). `orbital-slot` and `wage-index-concept` bodies updated in
  the same PR per the concepts.ts invariant (they describe the newly
  enforced gate and the newly indexed hire cost).

### Proposed, NOT implemented

1. **Per-lease one-build accounting** (residual #2) — needs server-side
   build settlement; revisit if lease-spam is ever observed in telemetry.
2. **Auction cadence at saturation** — one open auction per location ×
   7-day window caps lease supply at ~1/week/location: an entry queue,
   not a wall (weekly loop; leases are P2P transferable). If real
   populations queue up, consider batching K slots per auction.
3. **Frontier payroll cap parity** — SALARIES still pay the live index
   inside Frontier (only the demand pools, hazards, spot floor, hire
   cost, etc. are shielded). Asymmetric but mild (small crews, 0.8–1.6×
   band); flagging for a future pass rather than widening this one's
   blast radius.
4. Pass 3's offense-floor alignment item ($100–200M one-way campaign
   window) — still open, unchanged by these fixes.

### Files

`labor-market.ts` (+`getHireWageIndex`/`getHireCostWithWageIndex`),
`workforce.ts` (doc), `page.tsx` (hire handler, handleBuild gate, lease
stash), `WorkforcePanel.tsx` (real price display),
`spatial-strategy.ts` (`isSlotOccupant`, `hasActiveSlotLease`,
`checkOrbitalSlotGate`; `countPlayerBuildingsAt` mothball-aware),
`command-queue.ts` (gate), `BuildPanel.tsx` (gate UI),
`types.ts`/`save-load.ts` (**`orbitalSlotLeases` — new optional field, no
migration**), `sync/route.ts` (lease read + payload),
`useGameSync.ts` ([] preserved as "synced, none"),
`orbital-slots/resolve/route.ts` (occupancy via `isSlotOccupant`),
`concepts.ts` (3 bodies), `sim-pvp.ts` (S8 before/after, S12),
tests: `hire-cost-wage-index.test.ts` (new), `spatial-strategy.test.ts`
(+13 gate/occupancy tests).

## Pass 5 — 50-year playtest (2026-08, pre-relaunch economy gate)

**Founder directive:** *"Play test through the first 50 years of our game
using NPC characters and try to identify potential issues with the
competitive economy that need to be corrected before we do the server
relaunch."* The shared world restarts fresh 2026-08-24; this pass is the
economy gate for that relaunch.

**Runner:** `npx tsx scripts/sim-50yr.ts` — 600 game-months (50 game-years
= 150 real days at 6h/game-month), **8 scripted archetype players in ONE
shared world with every realism switch on** (npcSaleCaps + contendedNpcCaps
FIFO, laborMarket, dynamicSpot, constructionMaterials, contractOutlet
5/day). Deterministic (double-run diff-identical). Archetypes: aggressive
mono-expander (LEO/GEO telecom spam + reactive decommission), diversified
integrator (41-step ladder to the outer system), vertical industrialist
(belt + fabs + crafting queue), market-warfare aggressor (price campaigns
on the real 28-active/56-cooldown game-month cadence), passive turtle
(8 first-copy buildings then nothing), resource hoarder (max extraction,
sells nothing), and two late joiners entering at month 120 and month 360
with $200M (S9 fresh-graduate scale). Founders start with the harness's
standing $2B mid-game convention.

### Coverage (honest statement of what the playtest can and cannot see)

| system | status |
|---|---|
| Service revenue stack (saturation × shared pools × power × supply eff) | REAL engine modules |
| Price-linked mining, shared extraction pressure, E3 consumption + storage integrity | REAL |
| NPC absorption caps (contended FIFO), delivery-contract outlet, crafting queue | REAL |
| Overhead, bracketed exec comp on book NW, labor-market payroll at the live index | REAL |
| Dynamic spot from combined flows; price campaigns (fee burn, mean-revert skip, sell impact, band floor) | REAL |
| Serial research: real `baseCostMoney`/`realResearchSeconds`/`resourceCost`, prereq-resolved beelines, stall-until-affordable | REAL data, scripted scheduling |
| Decommission (real 40%/50% recovery constants, mono archetype exercised 6 teardowns) | REAL constants, runner-driven |
| Research revenue multiplier (engine 2.0 cap) + workforce serviceRevenue bonus (real 0.5 cap) via harness opt-in `revenueMult` | APPROXIMATED (levels shift, shapes don't) |
| Corp tier (totalEarned thresholds only; T6/7 legacy-power gate not modeled, reported tier caps at 5) | APPROXIMATED |
| Contract cap fixed 5/day for all (real: 4 base +1 research +1 T5); headcounts formulaic so poaching audited analytically, not in-world; doctrine locks/repeatables ignored (≤7 techs) | APPROXIMATED |
| Megastructures, interstellar expeditions, story chapters, senate/factions, ships/lanes, hazards+insurance, espionage, takeovers, seasonal events, mentorship, Frontier shields, P2P order-book trades, mothball | **NOT MODELED** — the sim says nothing about them |

Frontier shields are deliberately absent: the late joiners enter at $200M,
i.e. already past the $100M graduation bar — the run measures the
POST-shield newcomer, which is exactly the relaunch question.

### Headline per-decade numbers (full tables printed by the runner)

Book NW / trailing-12-month net at decade ends:

| archetype | y10 | y20 | y30 | y40 | y50 |
|---|---:|---:|---:|---:|---:|
| integrator | $16.1B / $451M | $40.5B / $528M | $70.1B / $681M | $128.3B / $967M | $136.2B / $986M |
| turtle (8 buildings, passive) | $1.1B / $64M | $1.5B / $61M | $1.2B / $61M | $1.3B / $61M | $5.2B / $55M |
| industrialist | $5.2B / $48M | $3.2B / $47M | $5.8B / $47M | $5.0B / $46M | $4.1B / $48M |
| aggressor | $1.3B / $33M | $1.1B / $32M | $1.0B / $32M | $1.1B / $30M | $1.2B / $31M |
| hoarder | $1.2B / $9M | $1.3B / $9M | $1.9B / $9M | $3.6B / $22M | $6.5B / $36M |
| mono-expander | $270M / $6M | $186M / $0.1M | $198M / $0.1M | $213M / $1M | $165M / $0.8M |
| joiner-y10 (mo 120, $200M) | — | **−$108M / −$1.5M** | −$286M / −$1.5M | −$480M / −$1.6M | **−$676M / −$1.6M** |
| joiner-y30 (mo 360, $200M) | — | — | — | −$129M / −$1.6M | **−$325M / −$1.6M** |

Gini (negatives clamped) 0.61 → 0.77 → 0.79 → 0.84 → 0.82; top-1 share of
positive NW 64% → 89%. Money supply: sink coverage 95–103% every decade;
cumulative net minted +$15.0B over 50 years (≈6% of decade-5 gross flow) —
**no unbounded inflation**, but note it is research spend ($237B destroyed
world-wide) doing much of that work. Labor index: **0.80 (the floor) in
every decade for all types.** Spot prices: organic excursion never exceeded
−12% from base in 50 years; only campaigns move price meaningfully (to the
0.3 band floor, where the clamp holds). Stockpiles: max book value $335M
(hoarder), all bounded — **Pass-1 caps hold at 50-year scale.**

### Findings — CRITICAL (fix before relaunch)

**C1. The graduation cliff: a post-Frontier newcomer cannot survive a
crowded world.** Both late joiners: first profitable month **never**
(0/60 profitable months), tier 3 never reached, insolvent by ~+40 months,
−$1.5M/mo forever. The controlled counterfactual (§6b of the runner) is
decisive — the SAME portfolio, budget, and scripted decisions alone in an
empty world: **+$13.7M/mo at +12 months, $1.67B NW at +60 months**
(vs −$19.6M in the shared world). The delta is entirely pool crowding
(leo:telecom mult 1.136 empty vs 0.380 crowded) plus FIFO NPC-book
position. Mechanism: everything a $100–200M graduate can AFFORD sits in
exactly the pools week-1 players crowd first (LEO telecom/compute, GEO,
Earth launch/ops — all floored at 0.35 within the first weeks per Pass 3
S1, which showed TWO over-built players suffice), so the entire
reachable build menu is net-negative at position N. M1's "every first
copy is profitable" guard holds solo but not at the pool floor. This
bites at week 2 of the new world, not year 10.
*Proposed fix (worked):* **post-graduation pool-mult glide** — for
`GRADUATION_GLIDE_MS` (recommend 6 real days = 24 game-months) after
graduation, a corp's demand-pool multiplier floors at a value decaying
linearly 1.0 → market rate. Revenue-side, bounded, no new state beyond a
graduation timestamp (already stored), and it reuses the exact
service-pricing floor mechanic the Frontier shield already has. At the
sim's year-10 pool state this converts the joiner's −$1.4M/mo into
≈ +$8M/mo during the glide — enough to bank toward a genuinely
uncrowded niche instead of dying inside the starter menu. Alternatives
considered: income-gated graduation (gameable — sandbag your net), and
rotating newcomer demand bonuses (more moving parts). The glide is the
smallest honest fix.

**C2. The deep-tier ladder is unreachable-by-design — the interstellar
era cannot begin.** Full research tree costs **$5.62T** ($4.88T of it
tier 5, avg $143B/tech) against a 50-year cumulative gross of ~$611B for
the BEST archetype (the integrator's totalEarned). Money, not time, gates the tree (serial time is only
~124 game-months). Result: nobody touched a T5 flagship in 50 years —
`deep_space_relay` ($50B) and `mining_kuiper` ($150B) were built by
NOBODY; `outpost_outer` ($200B + T5 techs) is pure fiction. First-copy
self-paybacks: mining_titan 618 mo (52 y), mining_europa 737 mo (61 y),
fabrication_titan 1,372 mo (114 y), mining_kuiper 1,558 mo (130 y),
datacenter_jupiter **3,393 mo (283 y)** — confirming and extending the
M-wave "1,300–3,400 month" flag with the research bill now honestly
attached. Even the integrator, whose $986M/mo at y50 matches the game's
own late-tier daily benchmarks, needs 152 income-months for kuiper capex
alone. **Decide the intended pace BEFORE the fresh world** — repricing
research after players have paid old prices is a rollback problem.
*Proposed fix (worked):* target = first T5 flagship lands year ~25–35 of
a world for a committed player ($500M–1B/mo era), i.e. a total
chain budget (prereq techs + capex) of $30–80B. That means ÷15–÷20 on
T5 research money (avg $143B → $7–10B), ÷3–÷4 on T4 ($11.6B avg →
~$3B), AND raising deep-tier first-copy net so self-payback lands in
the 120–240-month band (e.g. datacenter_jupiter $5.9M/mo on $20B must
become ~$100M/mo, or its price must fall to ~$1.5B). Sinks-first note:
cutting the tree's cost removes ~$150–200B of 50-year money
destruction — pair with a flagship-scale maintenance/logistics sink
(the T5 buildings' maintenance is currently only $6–60M/mo on $50–200B
assets, 0.01–0.03%/mo — realistic upkeep of 0.3–0.5%/mo would both
sink cash and make mothball/decommission live decisions at the top).

### Findings — HIGH (first month of the new world)

**H1. Offense constants are mis-scaled at BOTH ends.** Measured against
achieved incomes: campaign fee cap $500M = **10–16× median monthly net in
every decade** (the aggressor burned 8 months of income per declaration —
it is never locally rational below whale tier), while for the y50
integrator the same cap is 0.4% of NW (trivial). Poach action fee
(0.28×), freight toll cap ($2M = 0.06×), and intel report ($5M = 0.14×
median monthly net) are rounding errors from y30 on. The $200M offense NW
floor falls from 0.16× median NW (y10) to 0.05× (y50). And the campaign's
50-unit "real shells" inventory floor costs **$2.7M to buy outright** —
cosmetic next to the $250M fee. *Proposal:* index the offense schedule to
world wealth: fee = max(resource-keyed fee, 0.5% of attacker book NW)
with the cap raised to $5B; min inventory = the fee's own
`FEE_REFERENCE_UNITS` (5,000 u) so ammunition is real; toll cap and
report fees × the published world median-income factor each quarter (the
quarterly telemetry already exists). No constant changed in this pass —
each re-anchors a shipped PvP price and needs the founder's call.

**H2. The labor market is a dead signal at any realistic population.**
Index pinned at the 0.80 floor for all 50 years. Root cause is structural:
workforce bonus caps (`serviceRevenue` +50% caps at 10 engineers,
`miningOutput` +100% at 5 miners, `researchSpeed` at ~4 scientists) bound
RATIONAL per-corp demand at ~19 heads, while `LABOR_SUPPLY_BASE` is
500–700 per type (+2 per crew-quarters, which grow passively with
stations). The index cannot leave the floor until ~30–50 corps mass-hire
simultaneously; Pass 3's S5 whale spree (900 engineers) is economically
irrational (heads past the cap buy nothing), so Pass 4's wage-indexed
hiring and the poach damage model all price off a signal that never
moves. *Proposal (pick one):* per-building crew REQUIREMENTS (efficiency
droops without staff — STATS_DESIGN already specs this) so labor demand
scales with fleets; or divide `LABOR_SUPPLY_BASE` by ~5 so a small-world
population can move the index. Either makes E5 live at relaunch scale.

**H3. Dead decades are real for every archetype except the deepest
ladder-climber.** Decision cadence (months/decade with any build,
research completion, decommission, or campaign): mono 13→1→0→3→2,
industrialist 7→2→1→1→2, hoarder 3→3→0→2→2, joiners ~2 then 0 forever;
even the integrator falls 25→8→9→3→3. Measured causes: (i) pool floors
make copy N+1 worthless (mono plateaus at ~20 sats by y10 and has
nothing rational to do for 40 years — its cost-scaled next sat is
$185M+ into a 0.35-floored pool); (ii) the next ladder rung costs
10–100× current cash (industrialist stalls on $8B deep_drilling for
literal decades); (iii) C2's research wall. The catalog jumps from ~$2B
buildings straight to $8–80B with nothing between. The non-economic
loops (chapters, seasons, expeditions, megaprojects — not modeled) must
carry those decades; the economic core alone goes static by year ~12.
*Proposal:* a mid-band construction rung ($2–8B capex, real ROI, new
locations/deposits rather than more copies) + C2's repricing.

**H4. The mining/vertical specialist stays capped for five decades.**
Industrialist: $47M/mo, 9–12 buildings, flat from y10 to y50 (vs
integrator ×20). Every touched deposit sits at the 0.4 extraction floor
permanently from ~y10 (by y50 the Jovian/Saturnian deposits too). This
is the 50-year confirmation of Pass 2's verdict; the proposed
**extraction duty-cycle opex scaling** (`opexMult = clamp(pressure,
0.55, 1.0)`, worked numbers in Pass 2) remains the recommended fix and
is now upgraded to "ship with the relaunch" priority — it is the only
lever on the table that makes geographic mining diversification viable.

### Findings — WATCH (telemetry after relaunch)

- **Money supply:** healthy (95–103% sink coverage per decade, +$15B
  cumulative minted over 50 y). CAVEAT: research spend does ~30% of the
  destruction ($237B of $782B); if C2's repricing ships, re-run `sim-50yr` and keep
  coverage ≥90% — the flagship-maintenance sink above is the offset.
- **Compounding:** no exponential runaway anywhere — the integrator's
  net/mo grew 2.2× over 40 years (sublinear); concentration (Gini 0.82,
  top-1 89%) is strategy-driven, not interest-on-wealth. Exec-comp
  brackets only bind above ~$100B book NW; below that (turtle at $5B,
  0.36%/yr drag vs ~65%/yr income) "wealth erodes if idle" is FALSE —
  acceptable, but stop claiming it in copy for sub-$10B scales.
- **Price texture:** organic flows moved no spot more than −12% in 50
  years (NPC caps bound volume before impact compounds; hourly mean
  reversion heals). Alive-feeling prices depend wholly on the NPC
  event layer, not player flow. Fine — but the market-intelligence
  features should expect campaign/event signals, not organic drift.
- **Storage:** Pass-1 caps hold at year-50 fleets (max stockpile $335M
  book, all asymptotes finite). PASS — no action.
- **Campaign band floor:** campaigns pinned lunar_water at exactly the
  0.3 band floor for their 28-game-month windows; the paying surfaces
  (MarketSnapshot) clamp there even though the raw DB price can drift
  to the resource's hard `minPrice` (0.2× for lunar_water). Verified
  consistent — no exploit; documented here because the two floors
  differ and future code must always read through the snapshot.

### Implemented in this pass (tooling only — no game-engine changes)

Nothing in the engine met the Pass-1-4 "unambiguous constant-level
defect" bar; every finding above re-anchors a design-scale decision and
is left to the founder pre-relaunch. Tooling shipped:

1. `scripts/sim-harness.ts`: opt-in `SimPlayer.revenueMult` (private
   multiplier stack; absent = 1.0) applied to service + price-linked
   mining revenue exactly where `marginalCurve`'s `revenueMult` opt
   applies; **dynamic-spot snapshot now band-clamped** through the real
   `clampSpotToBand` (fidelity: the economy pays the band-clamped
   MarketSnapshot, never the raw DB price). Legacy outputs verified
   **byte-identical** (sim-strategies, sim-resources, sim-pvp diffed
   against pre-change captures).
2. `scripts/sim-50yr.ts` (new runner): the 600-month shared world,
   money-gated serial research on the real tree, corp-tier tracking,
   campaign scheduling, decade ledgers (money supply), Gini,
   late-joiner probes + empty-world counterfactual, offense-constant
   era audit, flagship economics. Deterministic; double-run
   diff-identical.
3. Model iterations are documented in the runner header — two honest
   corrections mid-pass: (a) research spending needed a cash-reserve
   rule (the first iteration let archetypes research themselves into
   death spirals); (b) payroll without the workforce bonus side was a
   phantom tax (now paired with the real capped `getWorkforceBonuses`
   revenue term).

Verification: full jest suite **4,387/194 green** (M1 first-copy-ROI
guard included), `tsc --noEmit` clean (covers scripts/), determinism
double-run diff-identical, defaults-off invariance byte-diffed.

### Follow-ups

- Simulate the C1 glide (add a harness `poolMultFloor(month)` per-player
  opt) before shipping it, to pick the glide length with numbers.
- Mothball never became rational in any run (no revenue collapse deep
  enough outside campaign windows) — exercise it in the C2 re-run once
  flagship upkeep exists.
- In-world poach duel (headcounts as real state, not formula) if H2's
  crew-requirements route is chosen.
- Per-player contract caps (4/5/6 by tier+research) instead of the
  world-level 5/day approximation.
- The 41-step integrator order and the research cash-reserve heuristics
  are scripted, not optimal — treat absolute levels as lower bounds on
  skilled play; the SHAPES (floors, walls, cliffs) are the findings.

## Pass 6 — the pre-relaunch fix wave: graduation glide + duty-cycle opex (2026-08)

**Scope:** implement the two Pass-5 findings flagged *ship-with-relaunch*
before the 2026-08-24 fresh world: **C1** (the graduation cliff — CRITICAL)
and **H4** (mining specialist capped for five decades — HIGH, spec'd in
Pass 2). Nothing else touched: C2 research-tree repricing, H1 offense-fee
indexing, and H2 labor supply remain founder decisions.

### Fix 1 — C1: post-graduation demand-pool glide

**Mechanic.** The Frontier demand-pool shield no longer vanishes at
graduation — it GLIDES. For `GRADUATION_GLIDE_MS` after
`frontierGraduatedAtMs`, a below-neutral pool multiplier blends linearly
from 1.0 (neutral — the Frontier shield's own value) down to the true
market rate:

```
fraction  = 1 − elapsed / GRADUATION_GLIDE_MS        // clamped [0, 1]
effective = mult + (1 − mult) × fraction             // only when mult < 1
```

Equivalently: the multiplier floors at a value decaying linearly
1.0 → market over the window — the exact extension of the Frontier floor
mechanic in `getServiceDemandMultiplier` (service-pricing.ts), NOT a new
system. Premiums (mult > 1) pass through untouched; the blend can never
exceed 1.0; Frontier-active saves take the original shield branch
unchanged. Away catch-up, every P&L surface (economy-report, dashboard),
and the live tick all read the one shared multiplier source, so parity is
by construction (and guarded by tests at both engine levels).

**State.** Reuses `frontierGraduatedAtMs`, which `graduateFrontier` has
always stamped — **no new fields, no save migration**. Saves that
graduated long ago (or predate the Frontier) read fraction 0.

**Glide length — chosen by simulation, and the honest surprise.** The
sweep (`sim-50yr.ts` §6c: the full 8-archetype shared world re-run per
candidate to month 300, month-120 joiner measured to age 179):

| variant | first net>0 (age) | profitable in glide | avg net ages 0-23 | avg net 12mo post-glide | avg net ages 156-179 | bldgs @179 | NW @179 | research @179 |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| no glide (Pass-5 baseline) | never | — | −$1.4M | — | −$1.5M | 3 | −$196.9M | 3 done, stalled |
| 4 days (16 game-mo) | 0 | 14/16 | $1.2M | −$1.4M | −$1.5M | 3 | −$134.3M | 3 done, stalled |
| 6 days (24 game-mo) | 0 | 22/24 | $3.2M | −$1.3M | −$1.4M | 4 | −$106.7M | 3 done, stalled |
| 8 days (32 game-mo) | 0 | 29/32 | $4.7M | −$1.3M | −$1.4M | 4 | −$56.9M | 3 done, stalled |
| 12 days (48 game-mo) | 0 | 48/48 | $6.3M | $48K | −$43K | 4 | $156.6M | 5 done |
| 13 days (52 game-mo) | 0 | 52/52 | $6.5M | $39K | −$52K | 4 | $187.0M | 5 done |
| **14 days (56 game-mo) — SHIPPED** | 0 | 56/56 | $6.7M | $740K | **+$2.1M** | 4 | $147.9M | **9 done** |
| 15 days (60 game-mo) | 0 | 60/60 | $6.9M | $1.4M | +$11.8M | 8 | $370.9M | 9 done |
| 16 days (64 game-mo) | 0 | 64/64 | $7.1M | $1.8M | +$47.2M | 12 | $1.04B | 11 done |

Every candidate gives first-profit inside the glide, but **all four
Pass-5 candidates {4, 6, 8, 12 days} fail the durability criterion** —
the joiner collects the subsidy, stays research-stalled (the $50M
`orbital_advertising` gate needs 2× cash under the harness's standing
cash-reserve rule), never escapes the floored starter pools, and slides
back to −$1.3M/mo the month the glide ends (12 days ends at breakeven).
Day-granular probes locate a sharp phase transition: at **14 days** the
graduate banks enough to un-stall its research ladder (9 techs vs 3) and
holds +$2.1M/mo a full decade after the glide ends; 13 days fails.
**Shipped: `GRADUATION_GLIDE_MS` = 14 real days = 56 game-months** — the
shortest durable length, and at half the 30-day Frontier window still
proportionate to the on-ramp it extends. Pass 5's worked recommendation
(6 days) was measurably insufficient; this is exactly why the pass bar
says sim first.

**FIFO NPC-book component — measured, then deliberately NOT implemented.**
Pass 5 attributed the cliff to pool crowding PLUS FIFO book position. The
sweep's diagnosis columns settle the split: the binding constraint is
pool position + the research gate. The acceptance joiner has **no
NPC-book flow at all** during the glide (its 3-4 buildings are all
services; it mines nothing), so an absorption-priority glide would have
been unmeasurable dead weight on this archetype. For mining graduates the
exposure is second-order anyway: M3 price-linked mining pays CASH revenue
regardless of absorption (only the ~15% leftover-inventory stream is
FIFO-contended), and the delivery-contract outlet — a graduate's main
liquidation channel — is already per-save, never contended. Revisit only
if post-relaunch telemetry shows mining-heavy graduates failing where
service graduates succeed.

**600-month world, before → after (the Pass-5 headline table re-run):**

| joiner | first net>0 | profitable of first 60 | tier 3 | NW y50 | vs founder median |
|---|---:|---:|---:|---:|---:|
| joiner-y10 (before) | never | 0/60 | never | **−$676M** | −14.8% |
| joiner-y10 (after) | 0 | **60/60** | mo 253 | **+$18.70B** | 597% |
| joiner-y30 (before) | never | 0/60 | never | −$325M | −7.6% |
| joiner-y30 (after) | 0 | 54/60 | never | +$80.9M | 2.6% |

The y50 world now has **8/8 solvent players** (was 6/8), Gini 0.787 (was
0.818), top-1 share 80% (was 89%). joiner-y10's $18.7B is ladder-climb,
not subsidy — the glide's entire revenue effect is bounded by ~56
game-months × single-digit $M/mo; the growth comes from the integrator
ladder it can now actually climb (22 buildings by +240). Residual,
honestly: **joiner-y30 survives but stagnates** (−$0.7M/mo, $81M NW at
y50) — a year-30 world prices its next rungs beyond a $200M start even
with the glide. That is C2/H3 territory (the missing mid-band rungs and
the research wall), not a glide-length problem — a longer glide flatters
the sim but the graduate still has nowhere affordable to build.

### Fix 2 — H4: extraction duty-cycle opex scaling

**Mechanic — exactly the Pass-2 spec.** `mining_output` services'
OPERATING cost now scales with deposit pressure; maintenance unchanged:

```
opexMult = clamp(pressure, 0.55, 1.0)   // mining-pricing.ts
                                        // miningDutyCycleOpexMult
```

Multi-resource rigs weight each deposit's pressure by that resource's
authored base-value share (`amountPerMonth × basePrice` — the same
weights `getMiningRevenueScale` already uses), reducing to the exact
Pass-2 clamp when all deposits sit at one pressure. Applied in the live
tick (game-engine.ts §1 cost line), away catch-up (parity), and the P&L
report (economy-report.ts — the dashboard shows the same discounted opex
the tick charges). `build-preview.ts` deliberately unchanged: it prices
mining REVENUE at neutral pressure too, so both sides of its "day 1,
fresh deposit" estimate stay consistent (the marginalCurve posture).

**Acceptance (sim-resources, month-35 steady state, audit world):**

| player | net/mo before | net/mo after | Δ |
|---|---:|---:|---:|
| distributed miner, 6 deposits lunar→Titan (no outlet) | −$11.2M | **+$23.0M** | +$34.2M |
| distributed miner (outlet 5/day) | −$2.6M | **+$31.6M** | +$34.2M |
| belt baron, single-deposit stacking (outlet) | −$47.4M | **−$15.6M** | +$31.8M |
| belt industrialist (outlet) | +$7.0M | +$38.8M | +$31.8M |
| integrator (diversified reference) | $27.3M | $27.5M | **+$0.2M** |

- **The geographically-diversified pure miner is finally viable** — and
  the gradient points the right way: spread across six deposits beats
  stacking one (the baron stays negative at −$15.6M, matching Pass 2's
  ≈−$15M projection to the dollar).
- The realized distributed-miner delta (+$34.2M) EXCEEDS Pass 2's worked
  estimate (+$13–18M): the estimate undercounted the opex share of the
  bigger outer-system rigs (Europa/reactor fleet at $86.2M/mo nameplate
  opex, $34.7M/mo of it rebated at the measured pressures). Direction and
  ordering are exactly as designed; the level is a viable-specialist
  income (~+$23–32M/mo on ~$50B deployed), far below the integrator's
  $450M+/mo — no dominant-strategy risk.
- **Integrator splash +$0.2M/mo** — an order of magnitude under the
  <+$4M bound.
- **M1 first-copy-ROI guard: structurally unaffected and green.**
  First-copy probes price at pressure 1.0 where the clamp is exactly 1
  (unit-tested); the sim-strategies build-menu sweep is byte-identical
  through this change.
- New permanent probe: `sim-resources.ts` §5 "Distributed miner (6
  deposits, lunar→Titan) — H4 duty-cycle opex acceptance" prints the
  table above plus the deposit-pressure readout every run.
- 50-year world: the vertical industrialist barely moves ($47.8M →
  $43.6M/mo at y50 — its opex relief is offset by the now-thriving
  joiner-y10 crowding shared pools and the FIFO book). H4's beneficiary
  is the DISTRIBUTED archetype the 50-year roster doesn't script;
  the focused sim-resources acceptance above is the honest measure.

**Sinks-first check:** the rebate reduces a sink, but the after-world's
money supply stays healthy — sink coverage 95–102% every decade,
cumulative net minted +$7.3B over 50 years (before: +$15.0B; the
glide-enabled joiner's research spend, $263B world-wide vs $237B, more
than absorbs the opex relief). No NPC money injected by either fix: the
glide is revenue-side against authored NPC demand floors already priced
into every pool, bounded and expiring; the opex change is pure cost
relief tied to lost output.

### Files

- `src/lib/game/frontier.ts` — `GRADUATION_GLIDE_MS`,
  `getGraduationGlideFraction`, `applyGraduationGlide` (pure, shared).
- `src/lib/game/service-pricing.ts` — glide branch in
  `getServiceDemandMultiplier` (the one multiplier source).
- `src/lib/game/mining-pricing.ts` — `MINING_OPEX_PRESSURE_FLOOR`,
  `miningDutyCycleOpexMult`.
- `src/lib/game/game-engine.ts` §1, `src/lib/game/away-operations.ts`,
  `src/lib/game/economy-report.ts` — opex mult applied (tick / away / P&L).
- `scripts/sim-harness.ts` — `SimPlayer.graduationGlide` opt (+
  `GRADUATION_GLIDE_GAME_MONTHS`, `glideFractionAtMonth`), H4 opex rebate
  in §5 via the real helper. Defaults absent → legacy tables unchanged
  except where H4 legitimately moves mining numbers (below).
- `scripts/sim-50yr.ts` — world loop refactored into `runScenario(months,
  joinerGlideMonths)`; main run models the shipped glide; §6c sweep.
- `scripts/sim-resources.ts` — §5 distributed-miner acceptance probe.
- Tests: `graduation-glide.test.ts` (13),
  `mining-opex-duty-cycle.test.ts` (11).

### Legacy sim outputs that legitimately moved (all H4, all explained)

- `sim-strategies.ts`: integrator 24-month rows ±$0.2M/mo (lunar/belt rig
  opex rebate); campaign-victim mothball table — victim lunar miner nets
  $21.2M → $23.8M neutral / $16.8M → $19.4M crashed (same −$4.4M campaign
  damage), making "ride it out" even more clearly dominant over mothball.
  Build-menu first-copy sweep byte-identical.
- `sim-pvp.ts`: S6 FIFO rows −$0.1M rounding; S7 victim ledger same
  +$2.6M opex-rebate shift on both sides of the crash (damage unchanged).
- `sim-resources.ts`: baron/industrialist/hoarder mining tables improve
  by the rebate; every Pass-1/2 storage-cap and asymptote verdict
  unchanged (stock flows are units, not dollars).
- No CI guard expectations required changes: the M1 first-copy guard
  (`tier-ladder-first-copy-roi.test.ts`) is pressure-1.0 by construction;
  the harness invariance tests pass untouched because both new behaviors
  are opt-in/absent by default.

### Verification

- `npx tsc --noEmit` clean; full jest **4,411/196 green** (24 new guard
  tests); `next build` passes.
- All four runners deterministic — double-run diff-identical
  (sim-50yr, sim-resources, sim-strategies, sim-pvp).
- Frontier posture held everywhere: premiums pay, penalties wait, the
  active-Frontier branch is untouched, veterans get nothing, and the
  glide can never push any multiplier above 1.0.

### Follow-ups

- **joiner-y30 stagnation** (survives, doesn't thrive) — reconfirms C2 +
  H3: the mid-band construction rung and research repricing are what a
  late-world graduate needs; no glide length fixes that.
- Watch post-relaunch telemetry for mining-heavy graduates (the FIFO
  decision above); and for real players gaming graduation timing (the
  glide starts at graduation, which auto-triggers at $100M book NW —
  sandbagging under the bar now delays a benefit, which is self-limiting,
  but verify).
- The Pass-5 follow-up list otherwise stands (flagship upkeep + mothball
  exercise, in-world poach duel, per-player contract caps).

---

## Pass 7 — C2 ruled intended design (founder decision, 2026-08-17)

Pass 5's CRITICAL C2 ("deep-tier ladder unreachable-by-design": full tree
$5.62T vs $611B best 50-year gross; zero T5 flagships in the 50-year sim;
proposal was ÷15–20 T5 / ÷3–4 T4 repricing + upkeep sink) was presented to
the founder ahead of the 2026-08-24 relaunch. **Founder ruling: "Deep-tier
research taking more than 50 years of in-game time seems reasonable" — the
horizon is INTENTIONAL generational-legacy content.** The repricing was NOT
implemented (a Pass-7 agent was launched and stopped before making changes).

Standing consequences of the ruling:
- C2 is closed as intended design. Do not re-flag slow T4/T5 research
  reachability as a defect in future passes; measure it, but the >50-year
  horizon is canon (CLAUDE.md "generational corporate legacies").
- **Residual WATCH item — flagship self-paybacks.** Distinct from research
  pacing: the T4/T5 flagship BUILDINGS' own capex-vs-income paybacks
  (618–3,393 game-months at neutral) mean that even a corporation that
  eventually unlocks them buys a strictly money-losing asset. That violates
  "every decision meaningful" *whenever it becomes reachable*, regardless of
  when that is. Revisit pricing (income up / capex down / prestige framing)
  when live-world telemetry shows the first corporations entering T4
  flagship range — no urgency at relaunch population.
- Pass-5 H1 (wealth-indexed offense fees), H2 (labor supply at small pop),
  H3 (dead decades) remain HIGH / first-month-of-new-world items, per their
  original ranking. H3's research-wall component is now partially canon by
  this ruling; its rung-gap component ($2B → $8–80B catalog jump) stands.

## Pass 8 — dynamic competitive-tools campaign (2026-08, pre-relaunch)

**Founder directive:** *"Run a simulated game where you test out the
competitive tools and balance test them."* Passes 3–5 priced every offense
lever in ISOLATION (static duels, analytic ledgers). Pass 8 is the missing
integration test: one shared world where rule-based archetypes actively USE
the tools against each other over time, with counterplay — an AGGRESSOR
(fires campaigns/poaches when rational per a documented model), a DEFENDER
(ride-out / mothball / spread; retain / rehire), an OPPORTUNIST (buys the
crash, sells the reversion), two bystanders (one with collateral exposure),
and a fresh $300M GRADUATE carrying the shipped Pass-6 glide. Mid-pass, the
founder approved implementing H1 + H2 before the 2026-08-24 relaunch —
**§"Prescriptions" below is the tuning authority for that implementation
wave**, with sim-validated constants and passing bands.

**Runner:** `npx tsx scripts/sim-tools.ts` — deterministic (double-run
diff-identical), 96 game-months (24 real days) per era, all realism switches
on plus a background population (era A: 26 corps total; era B: 36 — the
labor market sees a realistic employed base). Two eras: **A** = relaunch
scale ($200M–2B), **B** = mid-game ($10–50B). Campaign market: lunar_water
(the S7/Pass-5 reference). Every attack's ROI is measured by
**twin-scenario differencing** (same world run with and without the attack,
per-player deltas diffed, out-of-band fees ledgered separately from
in-world P&L, end-of-run book NW as the cross-check).

**Tempo note (a finding in itself):** the offense clocks are REAL-time —
one campaign window is 7 real days = 28 game-months and its cooldown 14
days = 56 more, so a "24-game-month" era (6 real days) cannot contain even
one complete campaign cycle. Economic offense lives on the weekly/monthly
loop by construction; tables are cut at month 23 and month 95.

### Coverage (honest statement)

| tool / mechanic | status |
|---|---|
| Campaign fee/gates/window/cooldown, mean-revert skip, band floor, crash dynamics via combined-flow price impact + NPC caps | REAL modules |
| Poach bonus/retention/fee/cooldowns/min-headcount + Pass-4 wage-indexed rehire; workforce bonus transmission (headcounts are STATE, poach-mutable) | REAL modules |
| Labor index (computeLaborAggregates monthly over live headcounts), payroll, hire cost | REAL modules |
| Mothball/reactivation counterplay (25% / 5% / 1-month constants; pools + deposits react to the exit) | REAL constants, runner-driven |
| Campaign NPC bid-halving during the pin; poach wage-bump transient | APPROXIMATED (both attacker-favorable ⇒ attacker ROI here is an upper bound) |
| Poach detection/reputation roll | OUT OF COVERAGE (more attacker risk ⇒ again upper bound) |
| Slot auctions/denial | OUT OF DYNAMIC COVERAGE — world GEO occupancy peaked at 2–3 of 180 slots (trigger: 153); population-gated, not price-gated, at BOTH eras |
| Freight tolls, takeovers, cornering/espionage products | OUT OF COVERAGE / ANALYTIC ONLY (no lanes/governors in harness; takeovers dormant; campaigns are PUBLIC so the crash-trade needs no intel fee) |

### Q1 — Does the toolkit ever fire? (policy runs, current constants)

| era | median net/mo | campaign fee ÷ median | campaign fires / 96 mo | best model ratio (fires ≥1) | poach fires |
|---|---:|---:|---:|---:|---:|
| A (relaunch) | $27.3M | **9.2×** | **0** | 0.18 | 1 (mo 21, ratio 1.21) |
| B (mid-game) | $111.5M | 2.2× | **0** | 0.59 | 1 (mo 1, ratio 5.84) |

**Pass-5 H1 CONFIRMED dynamically — and extended:** the campaign never
fires at relaunch scale, and (new) it never fires at mid-game either. Even
zeroing the fee doesn't fully fix era A: total rival lunar_water exposure
(~$65–125M/window at pressure-scaled volumes) is small against the $250M
fee **plus** the attacker's own self-damage (the campaign is market-wide
and the natural aggressor produces the resource it crashes). Poaching is
alive post-Pass-4 (fires once per era) but at trivially small stakes —
see Q2. **H2 CONFIRMED:** engineer index pinned at 0.80 for all 96 months
in both eras with 26/36 corps employing 244/353 engineers.

### Q2 — When tools fire, are they balanced? (forced fire at mo 20, twin-diff, total Δ incl. out-of-band fees)

Campaign (defender rides out; window = mo 20–47):

| era | attacker total Δ | defender | bystander-2 (collateral) | graduate | opportunist | rival damage ÷ attacker cost |
|---|---:|---:|---:|---:|---:|---:|
| A | **−$264.7M** | −$85.7M | −$14.6M | −$18.7M | +$24.8M (crash trade) | **0.45** |
| B | **−$402.2M** | −$307.3M | −$148.6M | −$26.2M | +$30.4M | **1.20** |

At era A the campaign is a pure own-goal (attacker burns $2.2 for every $1
of rival damage). At era B measured damage finally exceeds cost (1.2×) —
but only because the whale-defender's exposure is huge; the aggressor's
own model (which can't see post-window trailing effects) still reads 0.59
and correctly declines. The opportunist's crash-buy → reversion-sell trade
is real but NPC-cap-bounded (+$25–30M per campaign) — warfare leaks value
to third parties, which is the healthy direction. Poach (forced, n=1 @
idx 0.80): attacker all-in $13.6M (fee + bonus burned) vs defender rehire
$2.5M, or attacker $10M sunk vs $2.7M retention burn if countered —
**fee-for-burn griefing costs the attacker 3.7× what it costs the
victim; no dominant tool exists at either era.** New structural finding:
a capped attacker (10 engineers = the serviceRevenue cap) gains ZERO
acquisition value from poached heads — poaching is pure damage unless the
attacker is below its bonus caps (ties to Pass-5 H2's crew-requirements
route).

### Q3 — Are counterplay decisions real? (campaign forced mo 20; defender book NW @ mo 95)

| response | era A NW | era B NW |
|---|---:|---:|
| ride out | $3.21B | $21.82B |
| mothball | **$2.59B (trap: −19%)** | $21.73B (≈ neutral — deposit-pressure recovery pays back the pause) |
| spread (build 1 uncrowded service) | **$3.34B (best)** | **$22.29B (best)** |
| (no attack) | $3.30B | $22.14B |

Real, era-dependent choices: mothball is a trap for an early lunar miner
(its whole income is the mines) but ≈ break-even at mid-game where pausing
lets shared extraction pressure recover; diversifying out is best
everywhere (and its capex is +EV regardless — the campaign mostly punishes
under-diversification). Glossary/counterplay copy should stop implying
mothball is the default answer for small miners.

### Q5 — Escalation (attack mo 20; defender retaliates with counter-campaign + counter-poach)

Era A full-run total Δ: aggressor −$265.5M, retaliating defender
**−$1.35B** (counter-campaigning in its own primary market extends the pin
against itself), bystanders +$5.6M/+$25.9M, graduate +$13.5M, opportunist
+$23.5M. Era B: aggressor −$449M, defender −$609M, third parties flat-to-
positive. **Tit-for-tat with the same tools is strictly value-destroying
for the victim; the best response is defensive + diversification. Sustained
warfare bankrupts both sides while bystanders collect the leak — deterrence
by cost-asymmetry, no reward for the aggressor.** (Model wrinkle,
documented: concurrent campaigns on one resource collapse to a single pin
window in the sim.)

### Q4/Q6 — Override validation (era A; sim-only world switches, zero engine changes)

**H2 corp-count thresholds** (real `computeLaborAggregates`; rational-cap
corp = 10 engineers, 8.5 effective):

| divisor | supply base | leaves 0.80 floor at | reaches 1.00 at | pins 1.60 at | in-world max idx (26 corps) |
|---|---:|---:|---:|---:|---:|
| ÷1 (today) | 600 | 57 corps | 71 | 113 | 0.800 (dead) |
| ÷2 | 300 | 29 | 36 | 57 | 0.800 (dead) |
| ÷3 | 200 | 19 | 24 | 38 | 1.033 |
| **÷4** | **150** | **15** | **18** | **29** | **1.377** |
| ÷5 | 120 | 12 | 15 | 23 | 1.600 (pinned hot) |
| ÷8 | 75 | 8 | 9 | 15 | 1.600 (pinned hot) |

**H1 campaign-fee sweep** (policy runs; H2 ÷4 + income-indexed poach fee
active; crush ratio = measured attacker all-in ÷ graduate window damage
with best counterplay, requirement ≥1.5):

| schedule | fee paid | fires | attacker all-in | defender dmg | graduate dmg | crush |
|---|---:|---:|---:|---:|---:|---:|
| current constants | — | 0 | — | — | — | — |
| Pass-5 wealth 5% NW buying proportional depth | — | 0 (ratio 0.18) | — | — | — | — |
| market-keyed 10–25% | $25M (min-fee floor binds) | 1 @ mo 24 | $41.8M | $87.2M | $19.0M | 2.2 : 1 ✓ |
| market-keyed 40% | — | 0 (ratio 0.83) | — | — | — | — |
| **market 15% + graduate mining-spot glide** | $25M | 1 @ mo 24 | $43.2M | $88.5M | **$12.7M** | **3.4 : 1 ✓** |

**Pass-5's wealth-indexed-depth shape is REFUTED with data:** when the fee
buys proportional crash depth, expected damage scales with the fee and the
damage/cost ratio is fee-invariant (~0.2 at era A) — no percentage ever
brings the tool alive. The variable that matters is the **fee relative to
the market's window turnover**. Market-keyed fees at 10–25% of window
turnover fire organically at era A (in practice the $25M min-fee floor
binds at relaunch volumes) with crush 2.2:1, and at era B (**§7**: fee
$74.4M, fired 2×, attacker all-in $232M vs defender damage $310M, crush
19:1). Shields verified intact under the full override stack: graduate
net/mo unchanged ($10.5M → $10.6M; the demand-pool glide untouched),
graduate NW @ mo 95 unchanged, poach reach still 1 head vs a 4-engineer
graduate, Frontier immunity structural.

### PRESCRIPTIONS (the tuning authority for the approved H1/H2 wave)

1. **H2 — labor supply.** `LABOR_SUPPLY_BASE` ÷4 (engineer 600→**150**,
   scientist 500→**125**, miner 700→**175**, operator 550→**138**, pilot
   400→**100**, negotiator 300→**75**, security 400→**100**, medic
   350→**88**). `LABOR_SUPPLY_PER_QUARTERS` stays 2 — housing counterplay
   gets relatively 4× stronger, which is the intended cooperative loop.
   **Passing band ÷3–÷5**, keyed to expected relaunch population: ÷3 if
   25–40 active corps expected, **÷4 for 15–30 (recommended center)**, ÷5
   only if ≤20; ÷2 stays dead below 29 corps, ÷8 pins 1.6 at 15. **Required
   pairing:** extend the Frontier hire-cost shield to PAYROLL
   (`min(index, 1.0)` while `isInFrontier` — Pass-4 follow-up #3): with ÷4
   a relaunch-week hiring boom can genuinely reach 1.3–1.6, and Frontier
   corps must not pay it.
2. **H1 — campaign fee.** Replace the 5,000-unit reference with a
   market-keyed fee: `fee = clamp(0.15 × windowTurnover, $25M, $5B)`,
   where `windowTurnover` = trailing-7-real-day server-wide production
   value of the resource (units × spot — LocationExtraction/TradeStatDaily
   telemetry already exists; fall back to the old `basePrice × 5,000` when
   telemetry is empty). **Passing band 0.10–0.25** (0.40 kills the tool
   again). Depth stays FULL (band floor 0.3×) — do NOT ship fee-scaled
   depth (refuted above). Raise `PRICE_CAMPAIGN_MAX_FEE` $500M → $5B
   (Pass-5 H1's whale-end fix, unchanged).
3. **Graduate mining-spot glide (ships WITH #2, non-negotiable).** Extend
   `applyGraduationGlide` to the mining spot floor: while the Pass-6 glide
   is active, a below-base spot is priced for that save at
   `spot + (base − spot) × glideFraction` (the decaying mirror of
   Frontier's `frontierSpotFloor`; live tick + away-operations parity,
   same as Pass 6). Cheapening campaigns without this exposes fresh
   graduates; with it, crush moves 2.2:1 → 3.4:1 at glide-age 24 months
   and a week-one graduate is near-fully shielded. Sim-validated via the
   harness `glideSpotFloor` opt (guarded by
   `sim-tools-overrides.test.ts`).
4. **Poach action fee.** `POACH_ACTION_FEE × clamp(worldMedianMonthlyNet
   / $30M, 1, 50)`, republished with the quarterly balance telemetry
   (Pass-5's median-income factor, now sim-validated: factor 1 at relaunch
   — the $10M fee is correctly sized there — rising to ~×3.7 at era B
   where poaching still fired at ratio 1.41). Apply the same factor to the
   freight-toll cap and intel/report fees (era-anchored: toll cap is 7.3%
   of median monthly net at era A — fine; 1.8% at era B — rounding error).
5. **Campaign min inventory.** Raise `PRICE_CAMPAIGN_MIN_INVENTORY` from
   50 to `max(50, 10% of trailing-window server production units)` —
   analytic, not simmed: today's "real shells" gate costs $2.6M next to a
   $250M fee (cosmetic); at era A volumes this makes it ~300–450 units
   (~$15–22M) of genuine production presence.

### Ranked findings

- **HIGH (relaunch): H1 confirmed + remedy corrected.** Campaign fee 9.2×
  median monthly net at era A, 0 fires in 96 months at BOTH eras; the
  approved fix must be the market-keyed fee family above — the
  wealth-×-depth shape does not work (fee-invariant ratio).
- **HIGH (relaunch): H2 confirmed + prescribed.** Index pinned 0.80 with
  26–36 corps; ÷4 with the Frontier payroll pairing brings it alive at
  15+ corps without crushing newcomers (graduate delta +$0.1M/mo — the
  4-engineer payroll term is noise).
- **HIGH: campaign self-exposure is a design feature to keep.** The
  natural campaigner produces what it crashes (era B self-damage $34M/mo
  scale); this — not the fee — is the deep griefing brake. The market-
  keyed fee preserves it.
- **WATCH: poach acquisition value is zero for capped attackers** (bonus
  caps) — poaching is pure damage at 1–2 heads/offer at relaunch
  headcounts. Becomes content when Pass-5 H2's crew-requirements route
  lands; until then it is correctly priced but small.
- **WATCH: counterplay copy.** Mothball is a trap at relaunch scale
  (−19% NW vs ride-out) and only neutral at mid-game; spread is best
  everywhere. Update HoloTip/glossary counterplay text accordingly.
- **WATCH: escalation is defensively healthy** — retaliation-in-kind is
  self-destructive, bystanders profit from wars, aggressors always pay
  more than they destroy at relaunch scale. Re-verify after the fee wave
  with `sim-tools.ts` (§5 prints it every run).
- **Structural: slot auctions cannot fire at either era** (GEO occupancy
  2–3 of 180 after 96 months; trigger 153) — population-gated. No pricing
  change can revive them; nothing to do before relaunch.

### Tooling shipped (audit-only — zero engine changes)

`scripts/sim-tools.ts` (new runner, all tables above);
`scripts/sim-harness.ts` + two opt-in switches (`SimWorldOpts.
laborSupplyDivisor`, `SimPlayer.glideSpotFloor`), both absent-by-default;
`src/lib/game/__tests__/sim-tools-overrides.test.ts` (7 guards:
defaults-off invariance for both switches, divisor payroll math vs
`computeWageIndex`, spot-floor blend/expiry/premium-passthrough).
Verification: `tsc --noEmit` clean; full jest **4,589/208 green**;
sim-tools double-run diff-identical; all four legacy runners
(sim-strategies, sim-resources, sim-pvp, sim-50yr) re-run and diffed
against pre-change captures — **byte-identical**.

## Pass 9 — competitive-tools implementation wave (2026-08-17, pre-relaunch)

**The founder-approved implementation of Pass 8's Prescriptions §1-5,
shipped before the 2026-08-24 world restart.** Pass 8's sim-validated
constants and passing bands are the tuning authority; this pass implements
them AS VALIDATED (no re-derivation) and re-runs the acceptance sim against
the now-shipped engine constants.

### What shipped (per prescription)

1. **H2 — labor supply ÷4** (`labor-market.ts LABOR_SUPPLY_BASE`):
   engineer 600→**150**, scientist 500→**125**, miner 700→**175**,
   operator 550→**138**, pilot 400→**100**, negotiator 300→**75**,
   security 400→**100**, medic 350→**88** (current values verified as
   exactly 4× the prescription before dividing).
   `LABOR_SUPPLY_PER_QUARTERS` stays 2 — housing counterplay is relatively
   4× stronger. Single source of truth: the constant feeds `laborSupply()`
   → `computeLaborAggregates` (the weekly labor cron at
   `/api/space-tycoon/labor/update`) — server-computed index and every
   client display read the same LaborIndex rows via the sync snapshot;
   parity holds by construction.
2. **H2 required pairing — Frontier PAYROLL shield** (closes Pass-4
   follow-up #3): `getPayrollWageIndex` = min(live index, 1.0) while
   `isInFrontier`, mirroring `getHireWageIndex` exactly. New state-aware
   `getMonthlyPayrollForState` / `getPayrollAdjustedSalary` now used by:
   live tick (game-engine.ts §0 **and** commander upkeep §0a — commander
   salaries ride the same payroll index), away catch-up
   (away-operations.ts, tick parity at `now`), economy-report (payroll +
   the per-type `wageIndexByType` P&L display), WorkforcePanel (payroll
   header + per-worker salary line; the wage-index *badge* still shows the
   raw market index), DashboardPanel, ResourceBar. The espionage
   `labor_roster_report` payroll *estimate of a target* stays unshielded
   (espionage cannot target Frontier corps). Slack markets (<1.0) still
   discount; the shield ends at graduation.
3. **H1 — market-keyed campaign fee** (`price-campaigns.ts`):
   `computeMarketKeyedCampaignFee(turnover) = clamp(0.15 × trailing-7d
   window turnover, $25M, $5B)`; `PRICE_CAMPAIGN_MAX_FEE` $500M → **$5B**.
   Depth stays FULL (band floor 0.3× — fee-scaled depth remains refuted).
   Turnover source (`offense-server.ts getCampaignMarketTelemetry`):
   max(LocationExtraction production value, TradeStatDaily 7-day traded
   value) — production units recovered from the decaying E5 accumulator
   (÷ rarity sensitivity × 7 × (1 − 0.9/day) = the 7-day-equivalent of the
   10-day steady-state window), valued at the band-clamped server spot;
   TradeStatDaily covers crafted/colony resources with no mining
   accumulator. **Fail-soft (documented in code): empty telemetry ⇒ the
   $25M floor** — correct at relaunch day one, where Pass 8 measured the
   floor binding anyway. UI: the declare form fetches the SERVER quote
   (`GET /api/space-tycoon/market/campaign?quote=<slug>` → fee +
   min-inventory) — never a client-side guess; `computeCampaignFee`
   (base-price formula) is retained as reference math only.
4. **Graduate mining-spot glide (ships with #3, non-negotiable)**:
   `MiningRevenueOpts.graduationGlideFraction` — below-base spot floors at
   `spot + (base − spot) × glideFraction`, implemented as
   `applyGraduationGlide(spot/base, frac) × base` so the blend math lives
   in exactly one place (frontier.ts). Wired where `frontierSpotFloor`
   already passes: game-engine.ts §1 + away-operations.ts (tick/away
   parity). Frontier-active saves keep the full floor; the two shields are
   mutually exclusive by construction (glide fraction is 0 while
   frontierStatus is 'active'); premiums always pass through; veterans
   byte-identical.
5. **Poach/toll/intel fee indexing (mechanism now, factor 1 at relaunch by
   design)**: new `fee-index.ts` — `factor = clamp(worldMedianMonthlyNet /
   $30M, 1, 50)`, recomputed per real-world UTC calendar quarter (the LS9
   Realignment boundary) by `fee-index-server.ts` (median over
   recently-synced, ≥7-day-old profiles of server-reconciled
   (totalEarned − totalSpent) ÷ elapsed 6h-game-months; per-quarter
   module cache; every failure path degrades to factor 1). Delivered as
   the optional `GameState.feeIndex` sync snapshot (laborMarket pattern —
   [SAVE] optional field, **no migration, no version bump**; stale ⇒ 1).
   Applied at charge time, server-recomputed at every server charge site
   and never trusted from the client: poach action fee
   (`computePoachActionFee`, poach route), freight-toll per-dispatch cap
   (client `computeFreightTolls` reads `state.feeIndex`) + the per-sync
   server credit cap (sync route), cornering standing-demand report fee,
   and the three M5 espionage intel products ONLY
   (`FEE_INDEXED_ESPIONAGE_PRODUCTS` — classic espionage actions already
   scale via the net-worth bracket term). UI displays show the multiplied
   number (EspionagePanel passes `getFeeIndexFactor(state)`; route
   error/response strings carry the charged figure).
6. **Campaign min-inventory scaling**: `computeCampaignMinInventory` =
   max(50, 10% of the trailing-window production units) — same telemetry
   as #3, fail-soft to the 50-unit floor, shown in the declare quote.
7. **Counterplay copy** (Pass 8 Q3: mothball is a −19% NW trap at relaunch
   scale, ≈neutral mid-game, spread best everywhere): concepts.ts
   (`mothball`, `price-campaign`, `wage-index-concept`), the Situation Log
   campaign victim alert, and the MarketIntelligencePanel campaign
   subtitles now say riding it out or spreading to other markets usually
   beats mothballing for smaller corporations (mothball suits larger,
   diversified operations).

### Acceptance (sim-tools.ts re-run on the SHIPPED constants)

The Pass-8 override switches are now redundant with engine defaults —
`sim-tools.ts` default runs read the real constants
(`computeMarketKeyedCampaignFee`, `computeCampaignMinInventory`,
`computePoachActionFee × computeFeeIndexFactor`, shipped
`LABOR_SUPPLY_BASE`, spot glide default-ON for glide players). One
model-fidelity correction was required (documented in code): the runner's
campaign decision model expensed the ammunition purchase at FULL price
while the measured twin-diff world recovers the units through the normal
leftover-sale channel — noise at the old 50-unit gate, but a
double-count that silenced the tool at the Pass-9 scaled gate. The model
now charges the ammunition ROUND-TRIP loss (buy at spot×1.02, worst-case
recovery at the average pin price); the affordability gate still requires
the full cash outlay. The crush ratios below are MEASURED twin-diffs,
unaffected by the model change.

| acceptance check | requirement | result |
|---|---|---:|
| era A campaign fires organically (policy run) | ≥1 | **1× @ mo 24** (best model ratio 1.04) ✓ |
| era A crush ratio (attacker all-in ÷ graduate window damage) | ≥1.5:1 | **3.5:1** (Pass-8 center 3.4:1); without spot glide **2.2:1** (Pass 8: 2.2:1) ✓ |
| era A attacker all-in / defender damage | — | $44.1M / $88.4M (Pass 8: $43.2M / $88.5M) |
| era A labor index alive (26 corps, in-world) | off the 0.80 floor | max **1.377** (Pass-8 ÷4 table: 1.377 exactly) ✓ |
| era A poach fee factor | 1 by design | **1.00** ($10.0M) ✓ |
| era B (shipped defaults) | griefing check | fee $74.4M (Pass 8: $74.4M), fired 2×, all-in $264.6M vs defender $309.9M, crush **21.8:1**; poach factor 3.72 (Pass 8: ~3.7) ✓ |
| band edge | 0.40 kills the tool | market 40% ⇒ 0 fires (ratio 0.81) ✓ |
| graduate shields | unchanged | net/mo @ mo 23 $10.6M, book NW @ mo 95 $1.05B, poach reach 1 head — all match baseline ✓ |
| counterplay matrix | era-dependence holds | era A: rideout $3.18B / mothball $2.59B (trap) / spread $3.33B (best) |
| determinism | double-run identical | ✓ |

### Legacy-runner movements (before/after captures, full diffs)

| runner | movement | attribution |
|---|---|---|
| sim-strategies | analytic wage-scenario table only: supply 600→150 etc., indexes reach 1.6 at lower populations | labor supply ÷4 (no P&L row moved) |
| sim-resources | **byte-identical** | — |
| sim-pvp | whale-hiring analytic table: post-whale engineer index 1.45→1.60, miner 0.80→1.60; small-corp payroll $21.4M→$26.4M; quarters counterplay 245→470 | labor supply ÷4 |
| sim-50yr | one sink-severity display line: campaign fee cap $500M→$5B (10.2×→102× median net/mo — the CAP, not a typical fee; typical relaunch fees sit at the $25M floor) | PRICE_CAMPAIGN_MAX_FEE raise |

No payroll-shield movement appears in any runner — every sim corp is
post-Frontier (the honest relaunch case); the shield is guarded by unit +
live-tick tests instead.

### Guard tests (extended, none weakened)

- `sim-tools-overrides.test.ts`: + exact-value guard on the shipped
  LABOR_SUPPLY_BASE; divisor math rewritten against the new base (÷5 of
  150 = 30); + Pass-9 alive-signal test (200-engineer boom leaves the
  floor at the shipped base — the old base kept it dead) and a
  small-world floor test (no newcomer wage squeeze). glideSpotFloor
  harness guards unchanged (now mirror the shipped engine mechanic).
- `mining-frontier-shield.test.ts`: + 4 unit tests for
  `graduationGlideFraction` (fraction 1 ≡ Frontier floor, 0.5 = exact
  midpoint blend, 0/absent byte-identical, premiums never reduced) and
  + 3 live-tick tests (fresh graduate near-fully shielded, mid-glide
  partial and between fresh/veteran, premiums still pay mid-glide).
  The "graduated save takes the crash" guard now pins
  `frontierGraduatedAtMs` 100 days back (glide expired) — extended, not
  weakened.
- `hire-cost-wage-index.test.ts`: + 3 payroll-shield tests
  (getPayrollWageIndex mirrors getHireWageIndex; Frontier payroll caps
  hot types while slack types keep discounting; graduated payroll equals
  the unshielded Wave-E5 figure; salary display parity).
- `price-campaigns.test.ts`: + market-keyed fee tests (0.15 fraction,
  $25M/$5B clamps, fail-soft floor) + min-inventory scaling tests.
- new `fee-index.test.ts` (16 tests): factor formula/clamps, stale/absent
  fail-soft reads, applyFeeIndex, computePoachActionFee identity at
  factor 1, espionage products-only wiring (classic actions untouched at
  any factor), fee-index-server pure core (median math, empty-world
  factor 1, UTC quarter key).

### Schema / sync-field additions (flagged)

- **No Prisma schema changes, no db push needed** — telemetry reuses
  LocationExtraction, TradeStatDaily, MarketResource, GameProfile.
- New sync response field `feeIndex` (+ optional `GameState.feeIndex`,
  default null, no save migration) delivered through the standard
  server-effects hop with a defensive clamp.
- `GET /api/space-tycoon/market/campaign` gains the optional
  `?quote=<slug>` server quote; POST declare now charges the
  market-keyed fee + scaled inventory gate.

### Deviations from the Pass-8 text (all within the prescriptions)

- Fee fail-soft: the prompt-approved **$25M-floor fallback** on empty
  telemetry (documented in code) rather than Pass 8's "fall back to the
  old basePrice × 5,000" wording — at relaunch volumes the floor binds
  either way; the floor version can never resurrect the dead 9.2×-median
  fee on an empty market.
- Window turnover takes max(production value, traded value) so
  crafted/colony markets (no mining accumulator) key off their real
  traded flow instead of always sitting at the floor.
- Commander upkeep joined the payroll shield (it explicitly rides "the
  same wage index crew payroll uses").
- sim-tools ammunition round-trip model correction (see Acceptance).

Verification: `tsc --noEmit` clean; full jest **4,620/209 green**;
sim-tools double-run diff-identical; `next build` passes.
