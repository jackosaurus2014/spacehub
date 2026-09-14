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
per-day income from the game-month/tick-rate formulas (at the time of this
analysis the engine's typed `TICKS_PER_GAME_MONTH = 30` implied a 60 s
game-month, so a ~$1M/mo service alone would have implied $1.4B/day at
nonstop ticking — the two-clock defect fixed in "Clock unification
(2026-09-02)" below; on the unified 6 h calendar the same service is $4M/day),
this analysis uses the game's own **already-tuned real-daily benchmarks**: the `revenue_earned` daily-task targets in
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

## 2026-08-29 — Manufactured goods leave the NPC curve (see docs/MANUFACTURING_2026-08.md)

Founder ruling: hardware is manufactured, not mined, and the market holds none
of it until a player or NPC corporation lists what they built. Changes with
balance weight:

- `npc-volume-caps.ts`: every crafted good (refined, component, product) is
  now **0** — the NPC market maker rests no orders for hardware. The earlier
  note that component caps were "load-bearing" as a crafting outlet is
  superseded: the outlet is now the NPC industrial corps' *buy* orders
  (finite treasuries, 95 % of reference) plus delivery contracts.
- `/market/trade`: manufactured goods can no longer be sold to the curve
  (it was unbounded NPC demand) nor bought from it.
- New Earth fabrication works ($350M, T1, no research) lets a newcomer run
  T1-2 recipes before any off-world plant. Watch early-game money: it is a
  cheaper first industrial building than anything on the Moon, but its
  inputs come off the curve at spot.
- NPC corps buy raw inputs on the curve (a few recipes per hour, scaled by
  population). Expect a slight upward drift in iron/aluminum on a quiet server.

Telemetry to watch for two weeks: `NpcIndustrialCorp.unitsSold` per corp,
ask/bid depth on `structural_beams` and `electronics_package`, and whether any
player ask sits below an NPC ask for more than a day (it should clear).

## Early-fab wave (2026-08-31)

Jay's ruling: players need satellite buses and rocket fuel EARLY (tier-1
satellites consume buses from day one), via fabrication on Earth (capped) or
LEO/GEO (congested). Shipped:

- **`fabrication_earth` capped at 1 per corporation** (`maxPerPlayer`, new
  `BuildingDefinition` field + `checkBuildingCap`, enforced at handleBuild /
  attemptBuildStart / BuildPanel). Lore: Earth launch + environmental permits.
- **Shallow-but-expensive Earth recipes**, deep chain stays efficient:
  - `synthesize_rp1` T1, no research: methane 25 → 8 rocket_fuel (~$375k in →
    $960k out; water cracking 15 lunar_water → 10 stays the better route).
  - `assemble_satellite_bus_terrestrial` T2 behind `electric_propulsion_sat`
    (T1): raw metals ~$8.1M in → one $12M bus, 720s craft. The T3 component
    chain (~$5M in, 480s) remains the mid-game upgrade — no dominant strategy.
- **LEO joins ORBITAL_SLOT_POOLS** (240 slots, `BASE_SLOT_VALUE` $10M ×1.5
  chokepoint premium). Activates the occupancy cron, 85% lease gate,
  auctions and map rings for LEO with no other code.
- **Continuous congestion pricing** (`getCongestionMaintenanceMultiplier`):
  maintenance ×1.0/1.1/1.25/1.5 at low/medium/high/saturated server-wide
  occupancy, applied in the tick and mirrored in computeBuildPreview. The
  push-industry-outward pressure now starts BEFORE saturation.
- **`datacenter_geo` (GEO Data Center, T3)**: $900M, svc $22M/$7M, consumes
  0.1 satellite_bus + 2 electronics_package/mo, behind rad_hard_processors +
  edge_ai, in the contested GEO pool. Sits above `datacenter_orbital` (LEO,
  T2, $8M/mo net) as the premium-slot step up.

Watch on live telemetry: LEO bucket progression (240 slots vs early-sat spam),
NPC industrial corps now also use the cheaper T2 bus recipe for cost pricing.

### Maintenance fleet addendum (2026-08-31)
Jay: "servicers in every orbit" doesn't scale → two-tier design. `servicer_tug`
(T2, stationed, on_orbit_servicing) is the early tool; `fleet_tender` (T3,
autoRove, + self_healing_materials — both formerly-inert research nodes now
load-bearing) patrols autonomously: idle + nothing damaged locally → flies to
the location with the most total damagePct (engine ship loop, getTravelTime;
no per-trip fuel — priced into 1.8M/mo upkeep, 3× the servicer). Repairs
themselves stay in D-3: 0.25/mo, materials via calculateResourceRepairCost.

## NPC forecast — publication only (2026-09-01)

`/api/space-tycoon/npc-forecast` and the Markets → Analytics → NPC Demand
console publish what the NPC industrial tick, the open procurement drives and
the demand-pool floors already do. **No number changed.** The forecast calls
the tick's own per-tick helpers (now exported from `npc-industry.ts`; the tick
was refactored to call the same functions with identical arguments, guarded by
`npc-forecast.test.ts`), so it cannot drift from reality and cannot be tuned
independently of it. Balance levers remain where they were: `TARGET_CAP`,
`BATCHES_PER_TICK`, `LIST_CAP`, `BUY_DISCOUNT`, corp `consumes` rates and
`populationScale` in `npc-industry.ts`; `NPC_DEMAND_FLOOR` and
`npcPopulationScaler` in `demand-pools.ts`; `NPC_DRIVE_PRICE_CAP_MULTIPLIER`
in `npc-procurement-drives.ts`. Design intent (CLAUDE.md): NPC demand is a
forecastable floor players plan around — visibility is the feature, not a
new sink or source.

Same pass, lever discoverability (telemetry: zero poach offers and zero price
campaigns all-time): the price-campaign declare form moved to the order-book
header (server quote inline), the poach launcher became a shared component
opened from Rivals cards and the posture strip, and a one-time post-Frontier
"levers you haven't pulled" card was added. UI only — every fee, gate and
cooldown is still computed and enforced by the existing routes.

## Resource plausibility ceiling — not a balance lever (2026-09-01)

Server-authoritative inventory phase 1 (docs/SECURITY_AUDIT_2026-09.md,
`src/lib/game/resource-plausibility.ts`) puts an upward-only ceiling on the
per-resource figures the client syncs: `prev + server ledger grants +
3 x (engine max production/month) x elapsed months + max(100, 25% of prev)`.
**No production, cost or price number changed**, and the ceiling must never
be tuned to shape the economy — it is an anti-forgery bound, sized so that an
honest `prev + production` claim passes every time (client-only multipliers
are taken at their documented maxima; consumption, decay and boil-off are
not subtracted; decreases are never questioned).

Balance interactions to keep in mind:

- **Changing a production formula, a multiplier cap, or adding a new inflow**
  (a new building output, a contract that delivers goods, a refining job, a
  freight arrival) must be checked against the ceiling: if the engine can now
  legitimately add more than `3 x prodMax x months + floor` of a resource
  between two syncs (~30 s at 1x, up to the 30-day elapsed cap), either model
  it in `computeResourceFlows` (the ceiling picks it up automatically) or
  raise `RESOURCE_SLACK` / `FLAT_FLOOR_*`. Watch
  `client_resources_implausible_shadow` after any such change.
- **Offline progress** is bounded client-side (`MAX_OFFLINE_HOURS`) and the
  ceiling's elapsed term is capped at 30 days — a dormant profile never
  accrues unbounded headroom, and a returning player's offline haul is well
  inside the slack.
- The escrow-backed sell paths (order book, bounties) cap sellable quantity
  at the last sync's ceiling, so a burst of production is sellable one sync
  (~30 s) later — not a design change, just the existing server-holding lag
  applied to client-held stock.
- In `enforce` mode a clamp is reversible (`'pre-clamp'` EconomicSnapshot +
  `restoreEconomicSnapshot`); if a legitimate player is clipped, restore
  first, then widen the ceiling — never the other way round.
- **Phase 2 (2026-09-02, `GameProfile.serverResources`)**: the escrow-backed
  paths (order-book sells, bounty fills, bid deliveries, project
  contributions) now verify a server-owned stock that accepts client growth
  only up to the same `3 x prodMax x months + floor` allowance (plus capped
  crafting attestations) — still an anti-forgery bound, not a balance lever;
  no production, cost or price number changed. A new inflow that is not in
  `computeResourceFlows` and exceeds the floor is now permanently
  under-counted server-side (not just clipped once), so model it or attest
  it before shipping it.

## Money plausibility ceiling — not a lever, but it must scale (2026-09-13)

Sibling of the resource ceiling above, and the same rule applies: the money
clamp in `src/lib/game/ledger-reconcile.ts` is an anti-forgery bound, never a
balance lever. **No revenue, cost or price number changed.** It is recorded
here because until 2026-09-13 it silently *was* a lever at the top of the
curve.

`plausibleIncomeHeadroom` bounded a sync's income growth by
`min(serverMonthlyGross x 2 x elapsedMonths, elapsedMs x $500)`. The second
term was flat — **$30M per real minute for every corporation, whatever its
size** — so it became the binding term above a gross of
`$500/ms x 21,600,000 ms / 2 = $5.4B` per 6 h game-month (≈$10.8B of income
per game-month, ≈$1.8B per real hour). A corporation past that point had
legitimate tick income rejected on every sync and watched money vanish from
the dashboard. Nobody had reached it (the founder nets ~$13.7M/game-month),
but **Pass 5's 50-year playtest ends with integrator corporations far past
it**, so every long-horizon balance projection in this document was running
against an invisible income wall.

The rail now scales with the profile's own server-verified monthly gross:
`allowanceRate = max($500/ms, gross x MONEY_ALLOWANCE_GROSS_MULT / month)`
with `MONEY_ALLOWANCE_GROSS_MULT = 2 x MONEY_HEADROOM_MULT = 4.0`, so the
binding term is always the corporation's own earning power and the ceiling
follows the balance curve instead of capping it. `MONEY_HEADROOM_MULT` stays
2.0 and the $500/ms constant keeps its value in its new role as the rail's
floor. Full rule + attacker analysis: docs/SECURITY_AUDIT_2026-09.md "C-2
follow-up 3".

Balance interactions to keep in mind:

- **Any new recurring revenue term the server cannot see** must be modelled
  in `computeServerMonthlyGrossDetailed` (with its client-only multipliers at
  their documented caps) or it will be clamped away. That function — not the
  rail — is now the only thing that decides how much a corporation may earn
  per sync.
- **Any new one-shot cash payout** paid client-side (a contract, an event, a
  delivery, a mini-activity) needs a verifiable credit in
  `contract-credit.ts`, or it surfaces as a visible money correction.
- **Long absences**: away-operations income is rate-capped at
  `AWAY_EFFICIENCY_INVESTMENT_CAP = 0.85`, and the clamp's elapsed term is
  capped at 30 days, so absences up to ≈70 real days are covered with
  headroom to spare. Lengthening away efficiency toward 1.0 would shrink that
  margin proportionally.
- Never tune `MONEY_HEADROOM_MULT` or `MONEY_ALLOWANCE_GROSS_MULT` to shape
  the economy, and never set the latter below the former — that is the bug
  above.

## D6 population gates (2026-09-02, founder-approved)

**Source:** docs/GAME_DESIGN_REVIEW_2026-09.md D6 — *"Lower the PvP
population gates, or seed them. … Without this the top half of the design
cannot be experienced before the userbase is large, and the userbase will
not grow on a game whose competitive half is invisible."* Pass 8 measured
the three gates against a 26–36-corp sim world and found takeovers dormant,
slot auctions "population-gated, not price-gated" (GEO 2–3 of 180 vs a
153-slot trigger), and the labor index pinned at 0.80. Epoch 2 is running
well under that population. Three constants, one addendum; no fee, price,
term or shield changed.

### 1. Takeovers at 10 active corporations

`share-registry.ts TAKEOVER_MIN_ACTIVE_CORPS` **25 → 10**;
`ACTIVE_CORP_WINDOW_MS` stays 30 days. Every consumer reads the constant
(`getTakeoverGateStatus`, `/api/space-tycoon/equity` 409 body,
`server-equity.ts` snapshot, `clampEquitySnapshot` default,
`ShareRegistryPanel` dormant-state fallback — now imported instead of a
hardcoded 25); `TYCOON_TAKEOVERS_ENABLED='false'` / `TYCOON_TAKEOVERS_FORCE`
semantics unchanged. *Rationale:* the protections that actually stop a
takeover market becoming a griefing tool are population-independent — the
30-day / $500M Frontier shield, the 20% control premium over fair value, the
burned 2% arbitration fee, the 5-share minimum, the 30-day target cooldown,
and shares that only enter the float by the target's own raise, distress, or
acceptance. At 10 corps a tender has ≥9 possible targets and ≥8 possible
counterbidders, which is a market, not a duel. The Accord-chair electorate
gate (16, `accord-chair.ts`) is deliberately NOT lowered — it protects a
chamber, not a counterparty search.

### 2. Slot auctions on relative occupancy

`orbital-slot-auctions.ts computeSlotAuctionEligibility` (new, pure):

```
eligible = occupancyPct ≥ SATURATED_OCCUPANCY_PCT (85, unchanged)          — absolute
        OR ( occupied ≥ SLOT_AUCTION_MIN_OCCUPIED (8)
             AND occupancyPct ≥ max(SLOT_AUCTION_RELATIVE_THRESHOLD_PCT (40),
                                    P80 of occupancyPct across all pools) ) — relative
```

`SLOT_AUCTION_OCCUPANCY_PERCENTILE = 0.8`, linear-interpolated across the 5
pools, so with five pools only the single most-contested pool opens on
relative grounds (ties open together); the 8-slot minimum stops a 24-slot
pool auctioning on three satellites, the 40% floor stops an empty world
auctioning its emptiest pool. Worked numbers at relaunch scale:
lunar_orbit opens at **10 of 24**, jupiter_system at **16 of 40**,
mars_orbit at **24 of 60**, GEO at **72 of 180**, LEO at **96 of 240** —
each only while it is also the occupancy leader; the Pass-8 world (GEO 3
of 180) still cannot fire, which is the point: contest, not charity.

Plumbing: the resolve cron (`orbital-slots/resolve`) runs the eligibility
pass once over all pools and stores `bucket = 'saturated'` for an eligible
pool, so the client build gate (`checkOrbitalSlotGate`), the manual `open`
action, the competitive-posture S3 signal and the panel's LEASE REQUIRED
state all enforce the new trigger through the existing snapshot with no
sync-route change. The GET now carries an `auctionEligibility {occupied,
threshold, thresholdPct, eligible, reason}` line per pool and the Orbital
Slots tab shows "auction opens at N slots" for not-yet-contested pools.
**Decoupled on purpose:** `getCongestionMaintenanceMultiplier` re-derives
the *physical* bucket from the occupied count, so a pool lease-gated at
40% pays 'medium' congestion (1.1×), not the 85% crowding rate (1.5×) — no
maintenance number changed at any occupancy. Unchanged: 90-day lease term,
7-day sealed-bid window, soft-close, 10% governor cut / 90% burn, idle fees,
transfer listings, and `computeMinBid` (base × chokepoint premium — the
price still scales with the pool's chokepoint severity, not with the
threshold).

### 3. Labor supply ÷5 (of the original base)

`labor-market.ts LABOR_SUPPLY_BASE`: engineer 150→**120**, scientist
125→**100**, miner 175→**140**, operator 138→**110**, pilot 100→**80**,
negotiator 75→**60**, security 100→**80**, medic 88→**70** — i.e. the
original Pass-≤4 base ÷5 (Pass 9 had shipped ÷4; this is ÷1.25 on top).
`LABOR_SUPPLY_PER_QUARTERS` stays 2 (housing counterplay is now relatively
5× the original strength). The review's premise cited the 500–700 base; the
÷5 row of Pass 8's own sweep is what it asked for.

Engineer wage index, Pass-8 methodology (rational-cap corp = 10 engineers @
trainingLevel 0.5 → 8.5 effective, no quarters), verified by
`labor-market.test.ts` "D6":

| base | 5 corps | 10 | 15 | 20 | 25 | 50 | leaves 0.80 | reaches 1.00 | pins 1.60 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| original ÷1 (600) | 0.800 | 0.800 | 0.800 | 0.800 | 0.800 | 0.800 | 57 | 71 | 113 |
| Pass 9 ÷4 (150) — before | 0.800 | 0.800 | 0.850 | 1.133 | 1.417 | 1.600 | 15 | 18 | 29 |
| **D6 ÷5 (120) — after** | 0.800 | 0.800 | **1.063** | 1.417 | 1.600 | 1.600 | **12** | **15** | **23** |

Shields re-verified: `WAGE_INDEX_MIN/MAX` clamp holds at every population;
the Pass-9 Frontier payroll shield (`getPayrollWageIndex` = min(index, 1.0)
while `isInFrontier`) and the Pass-4 hire shield still cap a Frontier corp
at 1.0 against a pinned 1.6 index — which matters more now that 1.6 pins at
~23 corps instead of ~29.

### What to watch (first month)

- **First tender.** `TenderOffer` rows and the equity route's 409 rate;
  the Situation Log emits the "market open" line from the first non-null
  snapshot. If the gate opens and no tender appears within two weekly
  loops, the constraint is discoverability or float (no raises → nothing
  to buy), not the gate.
- **First auction.** `OrbitalSlotAuction` rows opened with the pool's
  `reason = 'relative_contest'`; expect lunar_orbit first. Watch bid counts
  ≥2 (a one-bidder auction is a tax, not a contest) and idle-fee /
  auto-release rows on the resulting lease. If the same corp keeps winning
  the leader pool, revisit `SLOT_AUCTION_OCCUPANCY_PERCENTILE` (0.8 → 0.6
  opens the top two pools).
- **Wage index leaving the floor.** `LaborIndex.engineer` > 0.80 at ~12
  active corps, > 1.0 at ~15; Frontier saves must show payroll at ≤ 1.0
  throughout. If the index pins 1.6 below ~20 corps, hiring is above the
  rational cap (a poach or wage-war signal, not a tuning error).
- Reverting any one of the three is a single-constant change; the tests
  named above pin the shipped values.

---

## Clock unification (2026-09-02)

*docs/GAME_DESIGN_REVIEW_2026-09.md D1 (option A), D2 (option A), D3 — all
founder-approved 2026-09-02. Public post-mortem: src/lib/game/devlog.ts,
per docs/POLICY.md "public post-mortem within 14 days".*

### What was wrong

The game ran on two clocks. The world calendar (`server-time.ts`,
`REAL_SECONDS_PER_GAME_MONTH = 21_600`) advances one game-month every 6 real
hours and drives years, quarters, seasons, leagues, expeditions, consumption,
directives and every hazard roll. The engine's per-tick share of monthly
revenue/costs/payroll/production, however, divided by a typed
`TICKS_PER_GAME_MONTH = 30` — 30 ticks x 2 s = a 60-second month. Income
accrued **360x** faster than the calendar it was denominated in. Two more
places (`order-queue.ts`, `ScienceMissionsPanel.tsx`) recomputed the 60 s
month locally for ETA strings, `away-operations.ts` integrated the same
per-tick share over wall-clock ticks (12 h away = 360 game-months of
revenue), and the money plausibility ceiling (`MAX_PLAUSIBLE_INCOME_PER_MS
= 2_000`) had been derived from a real-calendar month and was 33,000x looser
than its own comment.

Every playtest in this document (Pass 1-9, the 50-year runner, the PvP
audit) was run at 6 h/month. **Every number above was what the design
intended and none of it was what players experienced.** The live proof was
the top Epoch 2 corporation: $250B earned from eleven starter-tier buildings
in nine days, against a playtest expectation near $370M.

### What changed

| Site | Change |
|---|---|
| `constants.ts` | `TICKS_PER_GAME_MONTH = REAL_SECONDS_PER_GAME_MONTH / (TICK_INTERVALS[1] / 1000)` = **10,800**, derived, imported from `server-time.ts` (no cycle: server-time has no imports). Comments rewritten. |
| `server-time.ts` | new `REAL_MS_PER_GAME_MONTH` export for elapsed-time math. |
| `game-engine.ts` | `fraction = 1 / TICKS_PER_GAME_MONTH` now = 1/10,800. Sub-unit production (building mining, ship mining, megastructure passive resources, Hive biomatter deliveries) is **carried between ticks** (`state.fractionalCarry`) instead of rounded away / lumped at month-end — at 10,800 ticks/month nothing produces a whole unit per tick, and the old month-end lump lost every unit of a session that ended before the boundary. `incomeHistory` stores the monthly run-rate (per-tick net x 10,800; month-end ticks skipped) so the dashboard's "/mo" chart is honest. `dailyMetrics.revenue_earned` no longer multiplies by `fraction` twice. |
| `away-operations.ts` | Per-tick share follows the derived constant automatically (12 h = 2 game-months). Revenue/cost integral bounded by `MAX_CATCHUP_MONTHS` like the directive loop. **Corporate overhead (§1b) and executive compensation (§1c) added to `costsPerTick`** — offline can never be cheaper than online. Efficiency tiers unchanged. |
| `order-queue.ts`, `ScienceMissionsPanel.tsx` | shadow `REAL_SECONDS_PER_GAME_MONTH` recomputations deleted; import the canonical constant. |
| `resource-plausibility.ts` | `GAME_MONTH_WALL_MS = REAL_MS_PER_GAME_MONTH` (was 60,000). The resource ceiling's `elapsedMonths` is therefore 360x tighter, matching the new production rate. New `computeServerMonthlyGross` (below). |
| `ledger-reconcile.ts` + `sync/route.ts` | flat `$2M/s` ceiling replaced by the state-derived ceiling below. |
| `subscriber-perks.ts` (D3) | `startingMoney`, `buildSpeedMultiplier`, `researchSpeedMultiplier`, `offlineIncomeHours`, `surveyProbeDiscount` deleted; guard test denylists their return. |

### Money plausibility ceiling (replaces MAX_PLAUSIBLE_INCOME_PER_MS)

```
elapsedMs      = clamp(now - lastSyncAt, 0, 30 d); 0 below 5 s (no floor)
elapsedMonths  = elapsedMs / 21,600,000
headroom       = min( serverMonthlyGross x 2.0 x elapsedMonths,
                      $500 per ms x elapsedMs )            // $500K/s backstop
                 + contractCredit                          // 2026-09-12, below
ceiling        = prevMoney + headroom  (+ server-verified ledger deltas)
```

`serverMonthlyGross` is computed from the persisted row with the resource
ceiling's posture: service definitions, linked-building upgrade level,
station-bonus buildings, completed research and workforce head-counts are
evaluated for real; legacy (x6), tier (x1.2), reputation (x1.4), eras (x1.1),
doctrine (x1.03), commanders (x2 assumed), random events (x2), morale
(x1.15), wave-B stack (x2), demand scarcity (x1.25), returning-commander
boost (x1.3) and megastructure revenue terms are at their documented caps;
mining rigs are valued at nameplate units x band-max price x the mining cap
product. Megastructure passive income and subsidiary net income are
allowances gated on persisted `totalEarned`. Governor tax is not yet
allowed for (bounded by `taxCap`; a governor's persisted figure lags until
headroom absorbs it).

Honest reading of the numbers: the client-only cap product is large (~10^3),
so for any corporation grossing more than a few $M/month the **$500K/s
backstop is the binding term** (≈ $30M per 60 s sync, ≈ $10.8B per
game-month). That is still ~4,000x tighter than the old ceiling per sync and
rejects the 360x defect outright (a 60 s claim of one month's gross is
clamped). Tightening further means persisting legacy/tier/reputation on the
profile so they can be evaluated for real — a follow-up, not this pass.

**Contract credit (2026-09-12, `src/lib/game/contract-credit.ts`).** One-off
client-side credits were NOT absorbed over later syncs — each window clamps
from the already-clamped row, so a $60M starter-contract payout was rejected
permanently and every purchase route then refused against a server balance
the dashboard never showed. The sync now carries `completedContracts`; for
every CONTRACT_POOL id not yet in `GameProfile.creditedContractIds` the
server adds `reward.money x max tier mult (23.4) x max reputation contract
mult (1.6) x (1 + negotiator cap 0.5) x (1 + world-event cap 0.10)` to that
sync's headroom (`contractCredit`), then persists the id — once, ever, at
most 20 new ids per sync (audited beyond). The client also ADOPTS
`reconciledMoney` after every sync (delta against the figure it sent, minus
the ledger delta it applies separately; toast on a removal >= $1M), so any
clamp that remains is visible instead of a silent gap. Still unverified
client-side income: random-event cash (+$50M / +$100M / +$300M gross, at most
one event per 6 h game-month, no per-event record in the save) and any
megastructure passive income above the `totalEarned`-gated allowance.

### Migration (D2)

`scratchpad/clock-migration.sql` (run by the founder, one transaction):
one `EconomicSnapshot` per profile (reason `pre-clock-migration`), then
`money`, `totalEarned`, `totalSpent`, `netWorth`, `peakNetWorth` and every
numeric value in `resources` / `serverResources` divided by 360 (rounded);
buildings, ships, research, workforce, contracts and ledger rows untouched;
the phase-1 `_resourceCeilings` stash cleared so the next sync re-baselines.
Rollback = `restoreEconomicSnapshot` (money/netWorth/resources) plus x360 on
the three columns the snapshot model does not carry (before-values are
printed by the script). Compensation: none — everyone scaled equally, so
rankings and tiers are unchanged.

### What this does to the tables above

Nothing. Every figure in Pass 1-9 and the 50-year playtest was computed at
6 h/month and is now, for the first time, the rate players experience. The
50-year deep-tier horizon ruled canon on 8/17 is real (50 game-years = 150
real days). The two open concerns from the September review — decision
cadence collapsing by year 30, and T4/T5 flagship paybacks — are now
observable on live telemetry rather than masked by a 360x income surplus.

### Follow-ups

- ~~`scripts/balance-archetypes.ts` and `scripts/simulate-playthroughs.ts`
  step `TICKS_PER_GAME_MONTH` ticks per month; at 10,800 they are 360x
  slower.~~ DONE 2026-09-02 (Q3 report): `processTick` gained a
  harness-only `monthFraction` override and `balance-archetypes.ts` steps a
  30-tick month through it (byte-identical to its pre-unification grid;
  6.7 s for 300 games). `simulate-playthroughs.ts` only imported the
  constant — its own `simulateMonth` was always a month grid. `sim-50yr.ts`
  / `sim-harness.ts` never stepped ticks at all (see the correction under
  D5 below). Regression: `__tests__/sim-month-grid.test.ts`.
- Monthly run-rate widgets that used to visibly move every minute now move
  every 6 hours; watch first-week feedback for "my income is frozen".
- Persist legacy/tier/reputation server-side to tighten the gross ceiling.


## Mark-II tier (D4) — in-place upgrades (2026-09-02)

*docs/GAME_DESIGN_REVIEW_2026-09.md §1 D4 / §2 row 4, founder-approved
2026-09-02. Closes the open #30 "ladder-gap Mark-II upgrade tier" item from
the 8/17 design ledger (content over repricing). Code:
`src/lib/game/mark-upgrades.ts` (leaf), `build-preview.ts`
`computeMarkUpgradePreview`, `buildings.ts markBookValue`; engine sites
game-engine.ts §1 / §2 / §6 and the mark-completion pass next to the
Advanced/Elite completion; away-operations.ts parity; economy-report,
DashboardPanel, ResourceBar, map-modes, resource-plausibility mirrors.
Tests: `__tests__/mark-upgrades.test.ts`.*

### The gap it fills

H3 (Pass 5) measured the decision cadence collapsing to 0–3 decisions per
decade by year 30 for every archetype: copy N+1 lands in a saturation pool
floored at 0.35 (`formulas.ts serviceSaturationMultiplier`) and the catalog
jumps from ~$2B rungs straight to $8–80B. A Mark refit improves an EXISTING
building instead of adding a copy, and its price sits exactly in the void.

### The table

| level | cost (× baseCost) | revenue (own line) | maintenance | refit time | prerequisite |
|---|---|---|---|---|---|
| Mark II | 1.5× | 1.6× | 2.2× | 60% of realBuildSeconds (wall clock) | complete, operational, < 10% hazard damage, no refit running |
| Mark III | 2.5× (cumulative 4.0×) | 2.4× | 3.6× | 90% | Mark II + one T3 research node per category (below) |

- A $1.2B T3 building refits for **$1.8B** then **$3B**; ground_station $45M / $75M;
  mining_titan $60B / $100B.
- The revenue multiplier touches ONLY that building's own service revenue
  and, for mining rigs, its physical output (the priced units and the
  inventory units move together — `markOutputMult` in §6 is the same factor
  §1 applies to `baseTerm`, so nothing is double-counted).
- **Saturation still counts one unit** — a Mark III telecom sat is one
  2.4×-earning satellite, not 2.4 satellites at the 0.35 floor. That is the
  entire point of the rung versus copy N+1, and it is a CI invariant
  (`revenueLines[].avgSaturation` identical with a Mark III first copy).
- Maintenance climbs faster than revenue at every step, so the refit is a
  real P&L decision, never a free win. The Advanced/Elite `upgradeLevel`
  ladder is unchanged and stacks multiplicatively.
- Materials: Mark II `titanium 10×tier, aluminum 15×tier`; Mark III
  `titanium 15×tier, rare_earth 5×tier, platinum_group 2×tier`. Never above
  the largest authored definition bill, so the spend rides the phase-2
  `builtThisTick` attestation unchanged (`applyMarkUpgradeStart` writes
  `pendingInventoryAttestations.built`; useGameSync ships it; the sync route
  caps and ledgers it as `client_build_spend` — nothing server-side changed).
- Not available for `maxPerPlayer`-capped definitions (fabrication_earth,
  research_institute_earth — the cap IS the design) or definitions with no
  service line (pure power / research / habitat infrastructure — the refit
  would be a maintenance trap). Both refusals are in `isMarkEligibleDefinition`.
- Book value: `markBookValue(inst, BOOK_VALUE_DEPRECIATION_FACTOR)` adds the
  depreciated refit spend to `computeBookNetWorth` (frontier.ts) — so the
  wealth tax (§1c) reaches Mark capex exactly as it reaches base capex.

### Mark III research gates (all existing T3 nodes with ZERO consumers before this wave)

| category | gate | authored cost |
|---|---|---|
| launch_pad | orbital_refueling | $1.5B |
| rocket | rotating_detonation | $1.8B |
| satellite | software_defined_sat | $2.5B |
| ground_station | laser_comm_relay ($2B; deep_space_network_expansion was the thematic pick but is a repeatable program) | $2B |
| space_station | artificial_gravity | $4B |
| datacenter | optical_computing | $4B |
| solar_farm | wireless_power_transfer | $2.5B |
| mining_enterprise | autonomous_excavation | $2.5B |
| fabrication_facility | high_temp_alloys | $2.5B |

No techs were added. Repo-wide grep on 2026-09-02: none of the nine ids
appeared outside research-tree.ts (and, for two of them, a legacy
simulate-playthroughs.ts list).

### Worked paybacks (neutral multipliers, authored figures; the live card uses the real pools)

`Δnet = revenue × (m₂ − m₁) − maintenance × (k₂ − k₁)`; payback = refit cost / Δnet.

| building | base payback | Mark II cost | Δrevenue | Δmaint | Δnet | Mark II payback | Mark III cost (from II) | Δnet | Mark III payback |
|---|---|---|---|---|---|---|---|---|---|
| ground_station ($30M; $2M/$0.6M/$0.3M) | 27 mo | $45M | +$1.2M | +$0.36M | +$0.84M | **54 mo** | $75M | +$1.18M | **64 mo** |
| sat_telecom_geo ($150M; $8M/$2.5M/$0.8M) | 32 mo | $225M | +$4.8M | +$0.96M | +$3.84M | **59 mo** | $375M | +$5.28M | **71 mo** |
| launch_pad_heavy (T3, $800M; $55M/$20M/$3M) | 25 mo | $1.2B | +$33M | +$3.6M | +$29.4M | **41 mo** | $2B | +$39.8M | **51 mo** |
| datacenter_geo (T3, $900M; $22M/$7M/$4M) | 82 mo | $1.35B | +$13.2M | +$4.8M | +$8.4M | **161 mo** | $2.25B | +$12M | **188 mo** |
| mining_ganymede (T4, $10B; $40M/$13.6M/$6.25M) | 500 mo | $15B | +$24M | +$7.5M | +$16.5M | **910 mo** (355 at the 2.07 reference stack) | $25B | +$23.25M | **1,075 mo** |
| mining_titan (T4 flagship, post-D5: $40B; $265M/$55M/$160M floor) | 1,153 mo (126 at stack) | $60B | +$159M | +$192M | **−$33M** | **never at neutral** (438 mo at stack) | — | — | — |

Reading: a Mark refit is "more of a good thing" — its payback is ~2× the
base building's because the operating cost is not paid twice but the
maintenance is paid 2.2×. Where the base building is a strong buy (T1–T3
Earth/GEO lines) the refit is a strong buy; where the base building is a
long-horizon bet (T4) the refit is a longer one; on a D5 flagship the upkeep
floor makes Mark II money-losing at neutral multipliers and marginal at the
reference stack. **The preview says so before the player commits** — a
losing refit renders amber with "never pays back at the current run-rate".
That is the meaningful-decision invariant, not a defect.

### Follow-ups

- `sync/route.ts` netWorth still books `baseCost × 0.6` per completed
  building; it should add `markBookValue(b, BOOK_VALUE_DEPRECIATION_FACTOR)`.
  The sync payload's `buildings[]` also carries neither `instanceId` nor
  `markLevel` (useGameSync maps `{definitionId, locationId, isComplete,
  upgradeLevel}`), so the server-side gross ceiling cannot yet see a Mark
  tier (the `getMarkRevenueMultiplier` call in resource-plausibility.ts
  evaluates to 1.0 until the payload carries it). Phase-3 verification of
  Mark spend (cost vs `totalSpent` delta) belongs with that change.
- The map's LocationDetailConsole / RadialCommandMenu expose no per-building
  actions today (mothball and rush-repair live in the map's embedded
  BuildPanel via MapContextPanel); the Refit button therefore lives in the
  same place — the Build tab and the map's Build sub-panel.

## D5 flagship economics (2026-09-02)

*docs/GAME_DESIGN_REVIEW_2026-09.md §1 D5 / §2 row 5, founder-approved
2026-09-02. Pass 7's WATCH item ("even a corporation that eventually unlocks
a flagship buys a strictly money-losing asset") is closed. Code:
`src/lib/game/flagship-economics.ts`, `research-tree.ts` (35 nodes),
`services.ts` (8 services), `demand-pools.ts` (3 floors), every maintenance
site listed under D4. Tests: `__tests__/flagship-economics.test.ts`
(harness-measured band), `tier-ladder-first-copy-roi.test.ts` (still green).*

Both halves shipped together — research spend is ~30% of all money
destroyed (Pass 5: $237B of $782B over 50 years), so the reprice without
the sink would break the money supply.

### (a) Flagship upkeep floor

`maintenance = max(authored, baseCost × FLAGSHIP_UPKEEP_RATE)` for every
building with `baseCost ≥ FLAGSHIP_COST_FLOOR`.

- **FLAGSHIP_COST_FLOOR = $20B**, not the $5B the review sketched: $5B
  catches fourteen T3 buildings (mining_mars $5B, orbital_refinery $6B,
  space_station_mars $8B, habitat_mars $15B, space_station_belt $15B, …) and
  T1–T3 numbers are out of scope. The self-payback set starts at
  datacenter_jupiter ($20B) and nothing sits between $16.0B
  (mining_titan_deep, T5, ~500-month payback without help) and $20B.
- **FLAGSHIP_UPKEEP_RATE = 0.004** (0.4%/game-month ≈ 4.8%/game-year of
  asset value). Every downstream reduction (research maintenanceReduction,
  tier, reputation, mothball 25%, Mark multipliers) applies AFTER the floor.
- Eleven buildings qualify — eight with income (table below) and three
  pure-infrastructure stations whose return is the +15% location bonus,
  crew quarters, shielding and expedition support: space_station_jupiter
  ($30M → **$200M/mo**), space_station_saturn ($40M → **$320M/mo**),
  outpost_outer ($60M → **$800M/mo**). These are deliberately in: the floor
  is an asset-value sink, and the interstellar gateway is meant to be the
  richest corporations' campaign-loop expense. WATCH on live telemetry
  whether anyone builds them once T5 is reachable; if not, the lever is a
  station-bonus raise for T4+ stations, not a floor exemption.

### (b) T5 research reprice ÷10 (35 nodes)

Every node whose authored cost was ≥ $50B: 34 T5 nodes + mega_structures
(T4, $50B → $5B). Pre-reprice ledger in `T5_RESEARCH_REPRICED` (guard test
enforces `now = prev / 10` and that nothing outside the ledger ever cost
≥ $50B). The 35 nodes summed to **$4.925T before, $492.5B after**; the full
T5 tree is now ~$490B against the integrator's $611B 50-year gross — the
interstellar era becomes reachable inside the canon horizon without
touching a single T1–T3 number.

| node | before | after | | node | before | after |
|---|---|---|---|---|---|---|
| orbital_ring | $500B | $50B | | heavy_radiation_shielding | $120B | $12B |
| antimatter_propulsion | $500B | $50B | | self_replicating_miners | $120B | $12B |
| jump_drive | $500B | $50B | | space_elevator_cable | $100B | $10B |
| interstellar_colonization | $300B | $30B | | fusion_drive | $100B | $10B |
| fission_fragment | $300B | $30B | | interstellar_probe | $100B | $10B |
| generation_ships | $200B | $20B | | magnetic_shield | $100B | $10B |
| antimatter_reactor | $200B | $20B | | metallic_hydrogen / fusion_reactor / automated_mining_fleet / programmable_matter / exoplanet_survey / metric_engineering_refinements | $80B | $8B |
| exotic_matter_refining | $200B | $20B | | precursor_studies | $75B | $7.5B |
| ocean_seeding | $200B | $20B | | iso_materials_analysis | $70B | $7B |
| space_elevator_design | $150B | $15B | | xenobiochemistry | $65B | $6.5B |
| hive_pattern_mathematics | $62B | $6.2B | | intelligence_directorate / europan_biochemistry | $60B | $6B |
| vacuum_metallurgy_breakthrough | $58B | $5.8B | | deep_biosphere_ecology | $55B | $5.5B |
| gravitational_wave_det / swarm_intelligence / mega_structures (T4) / quantum_cryptanalysis / oort_cloud_probe | $50B | $5B | | | | |

### (b′) Flagship income raise and the payback band

Reference stack **2.07 = 1.5 (research serviceRevenueBonus cap) × 1.2 (top
corporation-tier revenueBonus) × 1.15 (one station at the location)** — the
three persistent, solo-earnable, documented caps. Transient terms (events,
returning-commander boost), prestige resets (legacy) and corporate-scale
packs (alliance / subsidiaries / victory) are excluded on purpose: the band
must be reachable by one diligent corporation.

Payback is measured with the SAME harness the M1 first-copy-ROI guard uses
(`scripts/sim-harness.ts marginalCurve`, solo, real pools / power plan /
inputs / overhead; `revenueMult` = the stack). Three of the eight are
pool-priced (telecom at Jupiter and the outer system, fabrication at
Saturn) and a sticker-price raise alone is self-defeating there — the
location's NPC floor demand caps a lone flagship's effective revenue (at
$185M the Jupiter relay's pool multiplier fell to 0.41). Those three floors
were re-authored at exactly 3.0× the retuned service per the table's own
2.5–3.5× rule (jupiter telecom $95M → $330M, saturn fabrication $130M →
$390M, outer telecom $130M → $720M).

| flagship | capex | revenue/mo before → after | maint before → after (floor) | payback before (neutral / stack) | payback after (neutral / **stack**) |
|---|---|---|---|---|---|
| datacenter_jupiter | $20B | $36M → $110M | $5M → $80M | 3,393 / 428 | 1,683 / **143** |
| fabrication_titan | $25B | $50M → $130M | $8M → $100M | 1,372 / 334 | 1,764 / **152** |
| mining_europa | $30B | $120M → $200M | $20M → $120M | 737 / 177 | 1,450 / **128** |
| mining_titan | $40B | $160M → $265M | $25M → $160M | 618 / 170 | 1,153 / **126** |
| deep_space_relay | $50B | $40M → $240M | $6M → $200M | 2,198 / 718 | 1,114 / **155** |
| mining_kuiper | $150B | $140M → $850M | $18M → $600M | 1,558 / 610 | 669 / **132** |
| mining_triton (T6) | $25.3B | $101.2M → $165M | $15.8M → $101.2M | 497 / 159 | 864 / **123** |
| mining_pluto (T6) | $27B | $108M → $175M | $16.9M → $108M | 497 / 159 | 895 / **124** |

Every after-row is inside 120–240 at the stack and still profitable on its
first copy at neutral multipliers (the M1/F1 no-trap invariant holds — the
guard test is green). The shape is intentional: at neutral a flagship is a
thin, generational asset (1,000+ months); a mature corporation that has
earned the documented caps sees it self-pay in 10–13 game-years. Operating
costs were not touched.

### 50-year research-destruction arithmetic (canon horizon kept)

Pass 5 recorded **$237B** of research spend destroyed over 50 years across
the archetypes, out of $782B total destruction. Requirement: ≥ ~70% of that
figure must still be destroyed after D5.

- The reprice only removes money from nodes that COST ≥ $50B. The 50-year
  runs never reached them ("zero T5 flagships in the 50-year sim";
  `deep_space_relay` and `mining_kuiper` built by nobody), so the measured
  $237B is T1–T4 spend and is untouched: **research destruction stays at
  ~100% of today's figure for the archetypes as played.**
- Worst case — a corporation that DOES buy the whole repriced set now
  destroys $492.5B instead of $4.925T on those nodes. Against the $237B
  baseline that is a −$213B swing only if every dollar of the baseline had
  been T5, which it was not; the honest bound is "the T5 share of research
  destruction drops by 90%", and the T5 share of a 50-year run is ≤ the
  ~$0.74T T1–T4 tree's complement, i.e. small.
- The floor puts the money back where it now gets spent. The eight income
  flagships alone add Σ(floor − authored) = 75 + 92 + 100 + 135 + 194 + 582
  + 85 + 91 = **$1.35B per game-month** of new destruction when all are
  held (≈ $16.3B/game-year); the three infrastructure flagships add another
  $1.19B/month. One corporation holding the income set for 15 game-years
  destroys ~$244B — more than the entire 50-year research baseline — and
  because T5 is now reachable inside the horizon, the sink is actually
  exercised rather than theoretical. Ratio check at the margin: a
  corporation that buys the full repriced T5 tree ($492.5B, −$4.43T vs
  before) and then holds the six original flagships for the remaining ~25
  game-years pays ~$354B of floor upkeep (6 buildings, $1.18B/mo × 300
  months) — money destruction on the deep-tier path is ~$0.85T versus the
  $4.9T that was never going to be paid because nobody got there.
- ~~`sim-50yr.ts` must be re-run to replace this arithmetic with a measured
  figure, but it steps `TICKS_PER_GAME_MONTH` ticks per month and is 360×
  slower since the clock unification.~~ CORRECTION (2026-09-02, Q3
  report): `sim-50yr.ts` and `sim-harness.ts` have always stepped one
  game-month per `stepMonth()` with research advanced by `GAME_MONTH_MS`
  (21,600 s) — they never referenced `TICKS_PER_GAME_MONTH` and run the
  600-month world in ~3 s. The re-run is in the "2026-Q3 balance report"
  section below: measured research destruction is **$337B** (standard) /
  **$513B** (refit-aware) against the $237B Pass-5 baseline; the first
  flagship's realised own-line payback is **76 game-months**.

### Files

- `src/lib/game/flagship-economics.ts` — constants, floor helper, ledger,
  income set, `flagshipPaybackMonths` (transparent back-of-envelope).
- `src/lib/game/research-tree.ts` — 35 `baseCostMoney` values ÷10, header note.
- `src/lib/game/services.ts` — 8 flagship `revenuePerMonth` values.
- `src/lib/game/demand-pools.ts` — 3 NPC floors (3.0× rule).
- `scripts/sim-harness.ts` — maintenance priced through
  `getEffectiveMaintenancePerMonth` (both fleet and marginal-curve sites) so
  the ROI guards see the floor.
- Every maintenance site (engine §2, away-ops, economy-report, Dashboard,
  ResourceBar, map-modes, build-preview, BuildPanel catalog card).


## 2026-Q3 balance report — first quarterly publication (2026-09-02)

*Public report: `docs/BALANCE_REPORT_2026-Q3.md`, rendered at
`/space-tycoon/balance-reports/2026-q3` (registry
`src/lib/game/balance-reports.ts`; body generated into
`balance-report-2026-q3.ts` by `scripts/generate-balance-report.ts`, guard
test asserts doc ↔ constant equality). Fulfils docs/POLICY.md "balance
review cadence".*

### Harness changes (tooling only — no balance constant changed)

- `game-engine.ts processTick(state, opts?)` — harness-only
  `monthFraction` override (default 1/10,800; the two run-rate sites scale
  by `1/fraction`). `balance-archetypes.ts` steps 30 ticks/month through it
  and reproduces its pre-unification numbers exactly.
- `sim-harness.ts` — D4 Mark refits: `SimBuilding.markLevel`,
  `SimPlayer.refitPlan` hook (charged in the purchase phase: money +
  materials, instant completion like builds), Mark revenue/output/maintenance
  multipliers at the engine's §1/§2/§6 sites, `markSpendToDate` in
  `bookNetWorth`; opt-in `trackBuildingLines` stamps per-building
  revenue/operating/maintenance lines. Every legacy table byte-identical
  (diffed on the full `sim-50yr.ts` output).
- `sim-50yr.ts --refit` — refit-aware archetypes (preview payback < 60 mo,
  cheapest first, ≤ construction slots per month, half-cash reserve rule;
  Mark III behind the category gate tech); §11 prints the decade grid,
  first-flagship realised payback, concentration and Mark-level tables.

### Headline measurements (both runs, 600 months, 8 archetypes)

| measure | standard | refit-aware |
|---|---:|---:|
| Gini y50 / top-1 share | 0.730 / 67% | 0.548 / 39% |
| integrator NW / net-mo y50 | $66.15B / $713M | $71.23B / $830M |
| joiner-y10 NW y50 | $18.74B (Pass 6: $18.70B) | $58.78B |
| joiner-y30 NW y50 | $80.9M (Pass 6: $80.9M) | $12.67B |
| mono-expander cadence y10-20 / y20-30 | 1 / 1 | 9 / 11 |
| first flagship (integrator, datacenter_jupiter) | mo 407, payback 76 mo | mo 314, payback 76 mo |
| sink coverage by decade | 102/95/104/98/102% | 104/98/101/95/96% |
| research destroyed | $337B | $513B |

Verdicts (full text in the report): D1 on-curve where the curve was not
deliberately moved; the integrator is −28% income / −51% NW vs the Pass-5
table with D5's now-affordable T5 tree the identified contributor (the
constant that most directly moves it is `T5_RESEARCH_REPRICE_DIVISOR`;
recommendation: leave it — the sink is exercised as designed). D5 landed
(76-month realised payback at the sim's 3.0× stack; 7 of 8 archetypes never
buy a flagship). D4 fills the H3 void for the starved archetypes but is a
one-decade burst, not a standing rung; the mining-side residual (H4,
`deep_drilling` stall) is unchanged. No runaway; watch the refit world's
+$28B cumulative minting and the passive turtle's cash pile.

### Follow-ups

- `--pre-d5` counterfactual switch in the harness so Q4 can attribute the
  founders' gap by cause.
- `market-share.ts`: flag `__NPC_CORP_*` participants as `isNpc` (only the
  market maker is recognized today); publish the 90-day per-resource share
  from the DB next quarter.
- Retention and faction-balance methods are stated in the report; both need
  the profile store and a population above n≈30 to be meaningful.

---

## Design-review batch (2026-09-02) — rows 9, 11, 14, 15 + §4 art bug

Founder-approved small batch from `docs/GAME_DESIGN_REVIEW_2026-09.md`.
Each item names its loop and the invariant it serves; none adds a
real-money edge, none adds PvP combat, none moves money between players.

### Row 9 — daily bonus indexed to corporation tier (daily loop)

Before: `daily-bonus.ts` paid a flat $10M → $200M on a 7-day cycle
regardless of tier — **$508M/week**, i.e. ~5× a $100M starting corporation
per week (the single biggest faucet in the first month, a dominant
strategy: "log in, don't play") and noise at $136B.

After: payout = authored schedule × `DAILY_BONUS_TIER_MULT[tier]`, and the
tier is derived **server-side** from the persisted profile
(`tierFromProfileScalars` — totalEarned, buildingCount, researchCount,
locationsUnlocked, serviceCount; the request body is never read).

| Tier | Multiplier | Day 1 | Day 7 | 7-day cycle | Rule |
|---|---:|---:|---:|---:|---|
| T1 Startup | ×0.25 | $2.5M | $50M | $127M | meaningful, not dominant (1.3× start/week, was 5×) |
| T2 Venture | ×0.5 | $5M | $100M | $254M | |
| T3 Enterprise | ×1.0 | $10M | $200M | $508M | authored schedule |
| T4 Corporation | ×1 | $10M | $200M | $508M | ≈1.02% of the $50B gate (exact 0.98, rounded to keep monotonic) |
| T5 Conglomerate | ×10 | $100M | $2B | $5.08B | ≈1.02% of the $500B gate (exact 9.84) |
| T6 Megacorp | ×100 | $1B | $20B | $50.8B | ≈1.02% of the $5T gate (exact 98.4) |
| T7 Transcendent | ×1000 | $10B | $200B | $508B | ≈1.02% of the $50T gate (exact 984) |

T4+ rule: cycle ≈ 1% of the tier's totalEarned gate; multipliers rounded
to the decade so the schedule stays legible. Anonymous (localStorage) play
uses the local save's tier and defaults to T1. Tests:
`daily-bonus-tier.test.ts`, `api-daily-bonus-tier.test.ts`.

### Row 9 — static contract ladder, tier-indexed cash multiplier (daily loop)

The ladder ($50M → $2B, gated on research count) is kept as authored. At
T4+ the **cash** half of a reward is scaled by `STATIC_CONTRACT_TIER_MULT`
(resources unscaled — supply, not payment):

| Tier | Multiplier | Basis |
|---|---:|---|
| T1–T3 | ×1.0 | authored |
| T4 | ×2.2 | measured: Pass 5 integrator trailing-12-month net $451M (y10, NW $16.1B, T3 band) → $986M (y50, NW $136.2B, T4 band) |
| T5 | ×4.8 | 2.2² — PROVISIONAL (no archetype reached T5 in the 50-year sim) |
| T6 | ×10.6 | 2.2³ — provisional |
| T7 | ×23.4 | 2.2⁴ — provisional |

Honest note on the "5–10% of monthly net" target: the ladder does not meet
it at T3 either — a $1.2B average T3 contract is ~30 months of the
integrator's net; the pool is a one-shot windfall (17 contracts, each once),
not an income line. Keeping the ladder (the brief) preserves that share
across tiers; meeting 5–10% would mean repricing the ladder ~15× down, a
separate founder decision. FTUE step rewards untouched. Test:
`contract-tier-mult.test.ts`.

### Row 11 — NPC density governor (monthly loop, NPC backdrop)

`activeNpcCorps = clamp(round(10 − 0.15 × activePlayers30d), 3, 10)` for
the 10 per-save market-backdrop corps; `clamp(round(5 − 0.075 × n), 2, 5)`
for the 5 server-side industrial corps. The tail of the seed order sleeps
first (deterministic). Dormant per-save NPCs are frozen (no revenue,
research, expansion, production or market nudges); dormant industrial
corps have both sides of their resting book cancelled and neither produce
nor procure. Published on `/api/space-tycoon/npc-forecast` (`npcGovernor`)
and delivered to each client via sync → server-effects (counts re-derived
from the population on apply). Full spec in `docs/NPC_BACKDROP.md`.
Tests: `npc-governor.test.ts`, `npc-industry-governor.test.ts`.

### Row 14 — rivalry stake (weekly loop, meaningful decision)

Designate ≤3 shadow rivals (same league bracket only); Monday's league cron
compares each pair's week-over-week net-worth growth from the first/last
`RivalSnapshot`; the winner earns **+1 reputation** (cap **+3/week** per
profile) via a public `rivalry_win` PlayerActivity + a Situation Log item;
the loser gets nothing. No money moves, no sink — an intel/reputation
loop. Reputation reaches the save through the server-effects hop,
idempotent by activity id, re-capped client-side. Side fix: finished-week
rival assignments are now closed (they only ever accumulated) and the
all-time W/L/D record is finally posted. Tests: `rivalry-stake.test.ts`,
`api-rivalry-settlement.test.ts`.

### Row 15 — dead code

- `src/lib/game/refining.ts` was already deleted in audit Wave F
  (`ecf5f172`); no importer remains. Row 15's first half was stale.
- Competitive contracts: **kept and wired**, not folded. Bidding is a
  sealed-bid first-price auction (win the right to fulfil, collateral,
  reliability); a race is a shared first-N-to-complete prize verified
  against the synced profile. Different mechanism, different tempo, and
  the exclusive titles only make sense as races. `CompetitiveRacesPanel`
  (Contracts hub → PVP, ungated by tier because races are game-month
  gated) lists them with the Claim verb the route always had. Test:
  `competitive-races.test.ts`. Open: `reward.reputationBonus` on races is
  still never applied — the rivalry-stake channel could carry it.

### §4 — art key mismatch (live bug)

`assets.ts` keyed on legacy `mining`/`fabrication`; `buildings.ts` emits
`mining_enterprise`/`fabrication_facility` since Wave F, so 32 of 96
buildings rendered habitat art. Canonical keys added (legacy aliases
kept); `servicer_tug`/`fleet_tender` mapped explicitly to the closest
hulls and listed in `SHIP_ART_BACKLOG` for the next art batch.
`assets-resolve.test.ts` asserts every emitted category and every hull
resolves to an existing, non-fallback file.

---

## Diplomacy sinks and transfers (2026-09-02)

docs/ECONOMY_PVP_2026-08.md "Diplomacy (2026-09-02)". Two new money movements; the decision on each
was **penalty transfers, fee burns**:

| Movement | Ledger reason | Sink or transfer | Why |
|---|---|---|---|
| Contract default / arbitration penalty | `contract_penalty_received` (issuer credit; the counterparty's loss is the un-refunded part of its earlier `contract_collateral` debit) | **Transfer** to the wronged party | A default harms a specific corporation; the remedy should make *them* whole, not the void. Burning it would make defaults cheaper for the world than for the victim and turn "sign, then default" into a pure sink with no injured party — the wrong incentive for the agreement half of economic warfare. |
| Arbitration fee (2 % of contract value, paid by the disputing party) | `arbitration_fee` | **Sink** (no matching credit) | Same posture as `tender_arbitration_burn` and the poach action fee: invoking the bureau must cost something real so disputes are not free option-taking, and no player may profit from being disputed. |

Escrow (`contract_escrow` / `contract_payment` / refunds) and collateral (`contract_collateral` /
refunds) are neutral: money changes hands only for goods delivered, at a price inside 0.3×–3× spot.
The price band bounds the player-to-player transfer that a contract with an alt could otherwise
launder; the collateral (≤ 25 % of value) bounds what a default can move.

**Expected magnitude:** at relaunch scale (contracts of $10⁵–$10⁷) the fee sink is noise against the
existing sinks (research ≈ 30 % of destruction, campaign/poach fees). It is listed here so the
quarterly balance report can add the reason to its sink table; no constant elsewhere changed.
**Watch:** ratio of arbitrated to fulfilled contracts (above 30 % would say the milestone schedule is
too tight or the fee too cheap), and the Frontier-counterparty default rate (the waived bond is the
only place a default costs the defaulter nothing but reputation).

---

## Location-aware hauling (2026-09-02)

docs/GAME_DESIGN_REVIEW_2026-09.md §2 **row 13**, founder-approved. W14 shipped the *model*
(`state.locationInventories`, `cargo-logistics.ts`, the `logisticsUnlocked` ratchet) but every
consumer of `state.resources` stayed global — docs/MANUFACTURING_2026-08.md listed it under
"Deliberately not done": *"an Earth-built beam is usable on the Moon without transport."* This pass
closes the spend side, which is what turns CLAUDE.md's "logistics cost money" from a fuel bill on
freight into a constraint on where you can build at all.

### What now resolves at the pool that holds the goods

| Consumer | Before | After |
|---|---|---|
| Building materials (`page.tsx handleBuild`, BuildPanel affordability) | global pool | the **build location's** pool |
| Crafting inputs and outputs (`activeRefining`, `craftQueue`, the engine's completion branch) | global pool | the **fabrication plant's** pool, both directions |
| Servicer material repairs (game-engine tick) | global pool | the **damaged building's** pool (no local parts ⇒ the cash repair path, exactly as an unaffordable bill always behaved) |
| Survey-discovery resource finds | global pool | the **surveyed body's** stockpile |
| Decommission / scrap recovery (`mothball.ts`, both the instant and scheduled paths) | global pool | the **torn-down building's** location |
| Recipe consumption + producer outputs (`consumption.ts`) | already local since E3 | unchanged — verified, and now covered by a cross-pool starvation test |
| Market sells (`getSellableQuantity`), delivery contracts | home pool | unchanged, and now *stated*: both clear at the near-Earth market, so remote goods must be freighted home first |
| Expedition supplies / exotic fuel | home pool | unchanged **by design**: interstellar missions stage out of Earth, so colony-refined fuel has to come home on a trade route first |

The home cluster (`earth_surface` / `leo` / `geo`) is one pool with three docks — it *is*
`state.resources` — so nothing about near-Earth play changes. **Saves with `logisticsUnlocked`
false are untouched**: every helper falls through to the global pool, and the ratchet still flips
on the first built transport/tanker hull.

### The new decision

A remote build is no longer a money question. BuildPanel says *"N units must be hauled to Mars
Surface from Earth Surface"* and offers a one-click **Dispatch hauler** that loads the biggest idle
freighter parked at the source pool with the shortfall, priced through the same `planFreight` quote
dispatch charges (Δv fuel + any zone toll) — so the button never lies about the bill. With no idle
freighter at the source it explains where to send one instead. A "Stock by location" table in the
Build panel's location header answers the prerequisite question ("where *are* my goods?") that the
game previously never asked.

Fabrication siting is deterministic: the first capable plant (home cluster first, then
alphabetical) that holds **all** the inputs locally, else the first capable plant so the panel can
name the shortfall against a concrete site. A queued craft whose plant is out of inputs **waits**
(it never raids Earth), the same way the queue already waited on an unaffordable global pool.

### Server truth is location-agnostic (for now)

The sync's `serverResources` stays a **single global map**. This slice is a **client-economy
change**: the material attestation and ledger paths (`inventory-attestations.ts`, the `/assets/*`
routes, `resource-plausibility.ts`) are unchanged, and a spend still debits the same **total** units
server-side — only the client decides which physical stockpile pays. Aggregate client holdings
(home + every local stockpile) continue to reconcile against server truth exactly as before; no
new divergence is introduced, and no exploit is opened, because the total is what the server checks.
Per-location server truth is a later slice and would need `serverResources` to become a keyed map
plus location-aware ledger reasons.

`scripts/sim-harness.ts` runs with **logistics off** (`logisticsUnlocked` never set), so every
long-horizon balance figure in this document is unaffected by this pass — the harness measures the
single-pool economy. When the harness is taught to model hauling, its numbers should be re-derived
before being compared to anything above.

### Deliberately deferred

- **Mark-II/III refits** (`mark-upgrades.ts`) still draw the global pool. `mark-upgrades.ts` is
  imported by `buildings.ts`, which `cargo-logistics.ts` imports — routing it through the shared
  helper would close an import cycle. It keeps its pre-row-13 behavior until the home-cluster
  constant lives somewhere both can reach.
- **Ship hulls** (`handleBuildShip`) still draw the global pool: shipyard-location siting is its own
  design question (which yards can build which hulls) and was not in the approved row.
- **Arrival auto-sell** was scoped as "only if `standing-directives.ts` supports it cheaply". It
  does, without a new directive type: an `auto_sell` directive already sells out of the home pool
  at the next game-month boundary, so cargo hauled home is auto-sold on arrival + ≤1 month. A
  dedicated arrival-triggered directive would need a new `StandingDirectiveType`, save handling and
  UI for a sub-month improvement — not worth it this pass.

**Watch:** the share of players who own a freighter before their first remote build (if remote
builds stall, the ratchet is landing too early), and the fraction of "Dispatch hauler" clicks that
end in `no_freighter` (a high rate means the hauler CTA is teaching the wrong lesson).

---

## Signal lag (2026-09-02)

docs/GAME_DESIGN_REVIEW_2026-09.md §2 **row 12**, founder-approved.
`PendingInterstellarCommand` had existed in `interstellar.ts` since Phase VIII with **no consumer** —
orders beyond the heliopause executed on click, exactly like a Sol-side order. They now travel.

### The constant

```
SIGNAL_LAG_GAME_MONTHS_PER_LY = 2          // interstellar.ts
LIGHT_LAG_PER_LY_MS = 2 × REAL_SECONDS_PER_GAME_MONTH × 1000 = 12 real hours per light-year
```

Derived from the ONE world-clock constant (`server-time.ts`, 6 real hours per game-month) rather
than a shadow copy — the clock-unification rule. Resulting round numbers:

| System | Distance | Lag |
|---|---|---|
| Proxima Centauri | 4.24 ly | ~2.1 days |
| Alpha Centauri | 4.37 ly | ~2.2 days |
| Barnard's Star | 5.96 ly | ~3.0 days |
| Wolf 359 | 7.86 ly | ~3.9 days |
| Sirius | 8.60 ly | ~4.3 days |

This is deliberately **not** the physical light-time (4.24 *years* to Proxima). The knob is tuned so
an order issued in one session lands in a later one — days, not decades. Two game-months per
light-year keeps it legible in the game's own units and scales with distance, so the far systems
feel farther without becoming unplayable.

### What travels, and what it costs

Colony founding, colony expansion, trade-route setup, trade-route suspend/resume, and expedition
recalls enter `state.pendingInterstellarCommands` and execute on the engine tick at
`sentAtMs + distanceLy × LIGHT_LAG_PER_LY_MS`.

- **Fees leave at issue time** through the existing money/`totalSpent` path — the mission was bought
  when the order was sent. The executors take a `prepaid` flag so arrival never charges twice.
- **Cancellation is allowed until arrival and refunds nothing.** That asymmetry *is* the decision:
  a $20B colony order is a two-day commitment, not a click.
- **Conditions can change in flight.** An order that is no longer legal on arrival (a colony already
  founded there, population fallen below the upgrade threshold) fails with an event-log line and
  still no refund.
- **Expedition recall** cuts the survey window short and prorates `surveyDataPayout` to the fraction
  of the survey actually worked — so recalling trades data revenue for a hull and crew back sooner.
  Without the proration it would be a free win (the payout is fixed at arrival), which is exactly the
  dominant strategy CLAUDE.md forbids. Colony arks cannot be recalled: they hold station permanently
  and have no return leg.

### Loop and money

Campaign loop (docs/SESSION_DESIGN.md) — it deepens the end-game's own tempo rather than adding
another daily beat. **No money was created or destroyed**: the same fees are charged, only earlier.
Delaying execution slightly *increases* the effective cost of interstellar expansion (the capital is
committed while producing nothing), which is the intended direction for an end-game sink.

**Watch:** cancellation rate (a high rate would mean the panel is not making the commitment legible
before the click), and the fraction of orders that fail on arrival (should be near zero; if not, the
UI is letting players transmit orders that were already doomed).


## Inert techs rework (2026-09-02)

*docs/GAME_DESIGN_REVIEW_2026-09.md §2 row 8, founder-approved. Files:
`src/lib/game/research-tree.ts`, `src/lib/game/types.ts`,
`src/components/game/ResearchContribution.tsx`, `src/app/space-tycoon/page.tsx`,
`src/lib/game/server-assets.ts` (+ the two asset routes),
`src/lib/game/__tests__/research-inert-rework.test.ts`.*

### The defect, measured

The aggregate buckets in `getResearchBonuses` were **flat** while `PER_EFFECT_CAP` allowed 0.30 per
tech. Two revenue techs saturated the 0.50 service-revenue bucket; the other 86 were worth exactly
**+0.00%** — several of them $15–20B. A new pure exported function,
`classifyTechEffects(corporationTier)`, makes that measurable: for each tech it reports which buckets
it feeds and what its marginal contribution is **once the cheapest saturating set of that bucket is
already owned** (greedy by money-per-point-of-bonus, stable tie-break on id).

| corporation tier | inert techs BEFORE | inert techs AFTER |
| --- | --- | --- |
| 1 | 249 / 277 | 141 |
| 4 (the review's "mid-game corp") | **236** / 277 | **86** |
| 7 | 228 / 277 | **0** |

(The review quoted "roughly 200 of 294"; 294 is the grep count of `{ id: '` in research-tree.ts,
which also matches the 17 `RESEARCH_CATEGORIES` rows. `RESEARCH.length` is 277.)

### 1. Caps stay, but grow with corporation tier

`cap(bucket, tier) = base(bucket) × (1 + 0.15 × (tier − 1))`, tier clamped to 1..7
(`getResearchBucketCap`). **Tier 1 is numerically identical to the pre-rework flat caps**, so no
existing call site regressed by adding the parameter; tier 7 is 1.9× them.

| bucket | base (= tier 1) | tier 4 | tier 7 |
| --- | --- | --- | --- |
| buildCost / buildSpeed / revenue / research / maintenance / travelSpeed / fuelEfficiency | 0.50 | 0.725 | **0.95** |
| mining | 1.00 | 1.45 | 1.90 |
| insuranceDiscount / consumptionReduction | 0.40 | 0.58 | 0.76 |
| hazardResistance / crewMorale / expeditionRisk (risk pillar) | 0.30 | 0.435 | 0.57 |

The risk pillar still tops out well under `hazards.ts` `MITIGATION_CAP` (0.90) at every tier —
CLAUDE.md's "real risk" invariant is untouched, and a test asserts it.

### 2. Per-tech magnitudes in the crowded buckets

`EFFECTS_BY_ID` is **unchanged** (authored intent is preserved and still readable). What a tech
*grants* is now `authored × RESEARCH_BUCKET_MAGNITUDE_SCALE[bucket]`, floored at
`RESEARCH_MIN_EFFECT_MAGNITUDE = 0.005` so nothing ever renders as "+0.0%". The scale is set so that
**owning every tech that feeds a bucket lands on the tier-7 cap** — the whole tree fills the bucket
once instead of two techs filling it seventeen times over.

| bucket | techs feeding it | raw total | scale | a +30% tech now grants | tier-7 cap |
| --- | --- | --- | --- | --- | --- |
| revenue | 84 | 16.51 | 0.0575 | +1.7% | 0.95 |
| maintenance | 58 | 9.25 | 0.1027 | +3.1% | 0.95 |
| mining | 51 | 8.44 | 0.2251 | +6.8% | 1.90 |
| buildSpeed | 36 | 4.30 | 0.2209 | +6.6% | 0.95 |
| buildCost | 31 | 6.33 | 0.1501 | +4.5% | 0.95 |
| hazardResistance | 16 | 4.22 | 0.1351 | +4.1% | 0.57 |
| research | 13 | 1.65 | 0.5772 | +17.3% | 0.95 |
| travelSpeed | 12 | 3.17 | 0.2997 | +9.0% | 0.95 |
| fuelEfficiency | 11 | 2.95 | 0.3220 | +9.7% | 0.95 |
| crewMorale | 6 | 1.15 | 0.4957 | +14.9% | 0.57 |
| insuranceDiscount (3) / consumptionReduction (2) / expeditionRisk (1) | — | under cap | 1 | unchanged | — |

**Why not the review's "+8–12% per tech" for every bucket.** 84 techs × 9% is 7.6 against an 0.95
cap; at that magnitude ~75 revenue techs stay inert and would all convert to quarter-cost gate-only
nodes, shaving **$849B off a $1,192B tree** — a 71% cut in research spend, far outside the ±20%
research-destruction guard. Magnitudes are the sanctioned lever ("tune magnitudes, never the caps"),
so they were tuned until the guard held. The uncrowded buckets *are* in the review's band (research
+17%, crewMorale +15%, fuelEfficiency +10%, travelSpeed +9%).

### 3. Five gate-only nodes, and one re-pointed capstone

After the rescale, six techs still could not fit their bucket at tier 7. Five became explicit
`gateOnly: true` nodes: `resolveEffects` returns `[]` for them, the Research panel labels them
**"Prerequisite — no direct bonus"**, and `RESEARCH` applies `GATE_ONLY_COST_MULTIPLIER = 0.25` once,
where the definitions are built, so every downstream consumer (panel, `getResearchDisplayState`,
command queue, server quotes, both sims) sees the same charged price. `prerequisites[]` and
`unlocks[]` are untouched; no Mark III gate tech (`mark-upgrades.ts MARK_III_GATE_BY_CATEGORY`) is in
the set, and a test asserts that.

| tech | tier | old cost | new cost | why it was inert | gates |
| --- | --- | --- | --- | --- | --- |
| `beamed_power` | 4 | $12.0B | $3.0B | revenue, worst value-per-$ in an 84-tech bucket | prerequisite of 1 |
| `nuclear_deflection` | 4 | $15.0B | $3.75B | maintenance, 58-tech bucket | — |
| `mars_warming` | 4 | $30.0B | $7.5B | revenue | prerequisite of 1 |
| `merger_acquisition` | 4 | $10.0B | $2.5B | revenue + maintenance | — |
| `antimatter_reactor` | 5 | $20.0B (post-D5) | $5.0B | revenue | — |

The sixth, **`generation_ships`** (T5, $20B, "Self-sustaining vessels for decade-long voyages"), was
**re-pointed instead of retired**: its lone `maintenance: 0.10` effect was the worst value-per-dollar
in the bucket, so it now *also* feeds `consumptionReduction` (2 techs, never saturated) at 0.10 —
closed-loop life support is literally what a generation ship is. It keeps its $20B price. That choice
is load-bearing for the balance guard: see below.

### 4. Balance guard — `scripts/sim-50yr.ts`, before vs after Row 8 alone

| metric | Q3 report / before | after Row 8 | delta | band |
| --- | --- | --- | --- | --- |
| integrator net/mo at y50 | $713.2M | $713.2M | **0.0%** | ±15% ✅ |
| research destroyed (world, 50y) | $337.07B | $337.07B | **0.0%** | ±20% ✅ |
| world book NW at y50 | $95.96B | $95.96B | 0.0% | — |
| sink coverage y40-50 | 102% | 102% | — | — |

Row 8 is **exactly sim-neutral**, and that took one deliberate decision. The sim's revenue path uses
`formulas.revenueMultiplier` (tech *count*), not the research-tree buckets, so magnitudes cannot move
it — only costs can. A first pass that made `generation_ships` gate-only (÷4 on a $20B node) let the
integrator's money-gated serial research queue advance past a long-standing stall at ~month 400,
spending the cash that had been buying its 34th building: **integrator y50 net −36%**, world research
spend −9%. Bisecting the six candidates one at a time showed `generation_ships` was the sole cause
(the other five are individually and jointly neutral). Re-pointing it into an unsaturated bucket
keeps its price, keeps the guard, and gives a $20B tier-5 capstone a real bonus at every tier —
strictly better for players than retiring it.

### 5. UI and server parity

- `getResearchContribution(def, completed, repeatables, tier)` runs the **real**
  `getResearchBonuses` twice and returns `current → after` per bucket, so the panel can never claim a
  bonus the engine will not pay. `ResearchContribution.tsx` renders it under both purchase-decision
  lists in the Research tab, amber with "capped at X" when the delta is zero, and
  "Prerequisite — no direct bonus" for gate-only nodes.
- `corporationTier` is threaded into `getResearchBonuses` at the live tick, the away path, the
  economy report, the resource-flow lens, the build-cost preview, the command queue, and the resource
  bar. The two server quote paths (`assets/build`, `assets/research`) now derive the tier from
  **persisted** scalars (`tierFromProfileScalars`) so the server price can never disagree with the
  client preview; `MAX_SERVER_RESEARCH_SPEED_MULT` rose 1.5 → 1.95 to match the tier-7 cap.
- **Deliberately left at tier 1** (another agent owns those files this session):
  `consumption.ts`, `cargo-logistics.ts`, `DashboardPanel.tsx`. Tier 1 = today's behaviour, so
  nothing regressed; threading them is a follow-up. `consumptionReduction` totals 0.20 against a 0.40
  tier-1 cap so it never binds; `fuelEfficiency` binds only for a corporation that owns all 11 fuel
  techs, which would get the tier-1 0.50 cap instead of up to 0.95.

**Watch:** whether tier-7 corporations actually reach the higher caps (if nobody does, the growth
rate is too shallow), and the gate-only count — if a future content wave pushes it into double
figures, the magnitude scale needs another pass, not a cap change.

---

## Per-building crew (2026-09-02)

*docs/GAME_DESIGN_REVIEW_2026-09.md §2 row 6, founder-approved; docs/STATS_DESIGN.md §3 "Crew".
Files: `src/lib/game/buildings.ts`, `ships.ts`, `workforce.ts`, `labor-market.ts`, `game-engine.ts`,
`away-operations.ts`, `resource-flow.ts`, `resource-plausibility.ts`,
`src/app/api/space-tycoon/labor/update/route.ts`, `src/components/game/WorkforcePanel.tsx`,
`scripts/sim-harness.ts`, `scripts/sim-50yr.ts`,
`src/lib/game/__tests__/workforce-crew.test.ts`.*

### The defect (Pass 8 "H2", restated)

Labor demand capped near **~19 heads for any corporation**: the workforce bonus caps (+50% revenue at
10 engineers, +100% mining at 5 miners, +50% research at ~4 scientists) were the only reason to hire,
so a rational player hired the same crew at 3 buildings and at 34. The wage index could therefore
only move with server *population*, never with fleet size — which is why every labor table in the
50-year playtest was flat by construction.

### The rule

Every one of the 95 building definitions carries an authored `crew:` requirement, generated from and
asserted equal to a documented profile:

```
heads(category, tier) = CREW_TIER_BASE[tier] × CREW_CATEGORY_WEIGHT[category]
                        split across CREW_ROLE_MIX[category], min 1 head per named role
```

| tier | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- |
| `CREW_TIER_BASE` | 2 | 3 | 4 | 6 | 9 | 12 |

| category | weight | role mix |
| --- | --- | --- |
| satellite | 0.5 | operators |
| solar_farm | 0.6 | engineers .6 / operators .4 |
| ground_station | 0.7 | operators .7 / engineers .3 |
| datacenter | 0.9 | scientists .55 / engineers .45 |
| launch_pad, rocket | 1.0 | engineers .5 / operators .5 |
| fabrication_facility | 1.1 | engineers .6 / operators .4 |
| mining_enterprise | 1.1 | miners .7 / engineers .3 |
| space_station | 1.3 | engineers .35 / operators .4 / scientists .25 |

So a T1 launch pad wants 1 engineer + 1 operator; a T1 orbital outpost wants 3; a T5 Mars/outer
station wants 12; a T6 colony wants 16.

**Ships** reuse the `crewRequired` derived stat every hull already has (1–40 by role and tier),
split into pilots and engineers by `SHIP_CREW_PILOT_SHARE` (survey 0.7 pilots, maintenance 0.3) —
no second headcount to keep in sync. An optional `crew:` override exists on `ShipDefinition`.

**Deviation from STATS_DESIGN's "40–120 heads at tier 5", recorded deliberately.** That range was
written for a much larger revenue scale. In this economy the median tier-5 building grosses $22M per
game-month, and 40–120 heads costs $20–60M — every tier-5 building would be an instant money-loser,
which is the trap CLAUDE.md's "no dominant strategies, no free traps" invariant forbids. The shipped
profile puts a fully-crewed building's payroll at roughly **8–15% of its own gross**, so crewing up
is always the profitable choice.

### The multiplier

`getStaffingReport(workforce, required, frontierProtected)` computes hired ÷ required per demanded
role and takes the **minimum** — one unstaffed role holds the whole corporation down, which is what
makes poaching a specific role a real attack.

```
efficiency = floor + (1 − floor) × minRatio       floor = 0.5   (0.7 while Frontier-protected)
```

capped at 1.0 — **overstaffing buys nothing but payroll**, which is the decision. Applied
multiplicatively to service revenue (`game-engine.ts` §1), to building and ship mining output
(`resource-flow.ts` `buildingMiningMultiplier` / `shipMiningMultiplier`, so the flow lens and the
tick can never drift), and to the away/offline path (`away-operations.ts`) so logging out is not a
way to dodge the crewing bill. Payroll itself is unchanged: it already charges hired heads × the
Frontier-shielded wage index, so crewing up is a real, fleet-scaling money sink.

The **plausibility ceiling** (`resource-plausibility.ts`) divides the staffing term straight back out
of its mining flows — a ceiling must assume the best case (the player can hire at any moment), so it
stays exactly as tight as it was before crew existed.

### Labor demand now scales

`LaborActivitySummary.requiredHeadcount` feeds `computeLaborAggregates`, whose index is now computed
from `demand = max(employedEffective, requiredEffective)` — **an unfilled position still bids for
labor**. The weekly cron (`labor/update`) reads `shipsData` as well as buildings and passes
`requiredHeadcountFor(...)`; the `LaborIndex` row reports the demand the index was priced from.
Omitting the field reproduces the pre-Row-6 aggregate byte-for-byte.

Measured in the 50-year world (`scripts/sim-50yr.ts`, new "Labor demand vs supply by decade" table):

| snapshot | engineer demand | operator demand | world heads hired |
| --- | --- | --- | --- |
| mo 119 | 41 | 60 | 132 |
| mo 359 | 84 | 98 | 233 |
| mo 599 | **123** | **130** | **326** |

Before: flat, ~19 heads per corporation forever. The integrator now requires **100 heads for 34
buildings** where it used to hire 19 at any size.

**Residual, flagged not fixed:** the wage index is still pinned at its 0.80 floor in this 8-player
world, because supply is `LABOR_SUPPLY_BASE + 2 × crewQuarters` and crew quarters push supply to
5,456 against 123 demand. Row 6 fixed the *demand* side, which was the stated defect; the supply side
is a D6/H2 calibration question (`LABOR_SUPPLY_PER_QUARTERS = 2` is now the dominant term) and
changing it moves payroll for every player, so it is left for a founder-visible pass.

### Balance guard — `scripts/sim-50yr.ts`, before (Q3 report) vs after

The harness had payroll but no required-vs-hired rule, so per the row's instruction one was added:
`setHeadcount` now hires to the requirement, bounded by the **real** `getCrewCapacity` and its
per-type cap (proportional scale-down when capacity binds), and the staffing efficiency is folded
into `revenueMult` alongside the existing workforce service bonus.

| metric | before | after | delta | band |
| --- | --- | --- | --- | --- |
| **integrator net/mo at y50** | $713.2M | $582.3M | **−18.3%** | ±15% ✗ |
| research destroyed (world, 50y) | $337.07B | $271.42B | −19.5% | ±20% ✅ |
| sink coverage y40-50 | 102% | 102% | — | ✅ |
| solvent archetypes at y50 | 8/8 | 8/8 | — | ✅ |
| world money created y40-50 | $249.03B | $272.95B | +9.6% | — |
| world book NW at y50 | $95.96B | $132.24B | +37.8% | — |
| **sum of all archetype net/mo at y50** | $1,170M | $1,298M | **+11%** | — |
| joiner-y10 NW at y50 | $18.74B | $46.37B | +147% | — |
| **joiner-y30 (the stagnation residual)** | $80.9M NW, **−$718K/mo** | $5.26B NW, **+$138.6M/mo** | solved | — |

**The integrator delta is redistribution, not contraction, and it is not payroll.** Cutting T4–T6
crew by 22% moved its y50 net by $0.5M — the crew bill is $37.8M/month against $582M of net. What
moves is *share*: payroll is a sink that scales with fleet size, so it lands hardest on the largest
corporation, and the demand-pool share it releases flows to the smaller ones. Total archetype income
rose 11%, world money creation rose 9.6%, sink coverage held at 102%, and the late-joiner stagnation
the Pass-5/Q3 reports both flagged as the single worst finding is gone. Reported rather than tuned
away, per the row's own instruction ("add the required-vs-hired rule with an auto-hire policy for the
archetypes and report the year-50 delta"), because tuning magnitudes cannot reach it and tuning the
sim's hiring policy toward the old flat rule would be gaming the guard rather than modelling the
game.

**Founder call needed on one thing:** the incumbent's −18% is the intended direction (a scaling sink
on the biggest player) but it is outside the stated band. If the band is the priority rather than the
redistribution, the lever is `CREW_TIER_BASE` — but it will not get you more than a couple of points.

### UI

`WorkforcePanel` gains a **Crew Requirements** block above the hire list: required vs hired per role
with a progress bar, the binding role called out, an "Output ×0.xx" badge (green/amber/red), and a
**"Hire to crew"** button on each short role that routes through the existing wage-indexed hire path.
Each row of the hire list also shows "N hired / M required". Screen readers get the shortfall as
text, not colour.

**Watch:** the fraction of live corporations sitting below 1.0 staffing (if it is high, the
requirement is not legible enough), and whether the Frontier 0.7 floor is enough to keep the first
three buildings comfortably profitable for a brand-new player.

### Adjudication — crew requirements vs the ±15% guard (2026-09-02)

Row 6 (per-building crew) moved the integrator's year-50 net income
−18.3%, outside the ±15% guard the implementation brief set. Accepted as
shipped rather than tuned back, for three reasons:

1. **It is redistribution, not a payroll tax.** The integrator's crew bill
   is $37.8M against $582M of net income; cutting T4–T6 crew by 22% moved
   the figure $0.5M. What actually changed is demand-pool share: payroll
   scales with fleet size, so the largest corporation releases share to
   smaller ones. World money creation rose 9.6% and the sum of all
   archetype income rose 11%.
2. **It fixes the review's number-one viability risk.** The year-30 joiner
   went from $80.9M net worth and −$718K/month (terminal stagnation in two
   consecutive reports) to $5.26B and +$138.6M/month.
3. **The guard was a tripwire for accidental breakage**, not a design
   target. Sink coverage held at 102%, all eight archetypes stayed solvent,
   and research destruction stayed inside its own ±20% band.

If the founder would rather hold the leader's curve flat, the lever is
`CREW_TIER_BASE` in `src/lib/game/buildings.ts`; it is worth a couple of
percentage points at most, so the redistribution would survive either way.

**Residual, needs a calibration call:** the wage index still floors at 0.80
because labour supply (`base + 2 × crewQuarters` ≈ 5,456) dwarfs the new
demand (≈123 heads). Row 6 fixed the demand side; `LABOR_SUPPLY_PER_QUARTERS`
is now the dominant term and is the natural follow-up to D6.

## Pass 10 — early-game pace (2026-09-12)

### Founder rationale

Measured live on 2026-09-12: a fresh Cape Heritage corporation starts with
$75M and nets about **+$4.9M per game-month**. A game-month is six real
hours (`server-time.ts` `REAL_SECONDS_PER_GAME_MONTH = 21_600`; income
accrues every 2 s tick as 1/10,800 of the monthly figure), so a $100M
tier-1 research was **five real days** of building income and the $150M
GEO Telecom Satellite nearly **eight**. The first evening of play had no
affordable decision in it. The founder's call, explicitly — the clock stays
as it is; the money side moves:

1. **Halve tier-1 research and tier-1 building costs.** Edited in the data
   files (`research-tree.ts`, `buildings.ts`) — they are the source of truth
   for the engine, the server starting kit (`buildFirstSyncKit`), the sims
   and these docs. No hidden runtime multiplier. Durations untouched.
2. **A ×2.0 service-revenue multiplier inside the Protected Frontier**,
   decaying along the existing 14-day graduation glide (Pass 6) so there is
   never a cliff: 2.0 while active → 1.0 at the end of the glide → exactly
   1.0 for veterans.
3. **The starter contract joins the guided flow** (first-hour chain step 2,
   before the first build), and **the starter launch pad stops running
   degraded** — it consumed 10 rocket fuel a month that a new corporation
   did not have.

The Frontier graduation rule is unchanged (`frontier.ts`: 30-day timer AND
$100M book net worth, $500M hard cap, 7-day grace).

### Constants

| constant | value | where |
| --- | --- | --- |
| tier-1 research `baseCostMoney` | ½ of pre-Pass-10 (39 nodes, $3.87B → $1.935B in total; $15M–$150M each) | `src/lib/game/research-tree.ts` |
| tier-1 building `baseCost` | ½ of pre-Pass-10 (11 buildings, table below) | `src/lib/game/buildings.ts` |
| `FRONTIER_REVENUE_MULTIPLIER` | 2.0 | `src/lib/game/frontier.ts` |
| `getFrontierRevenueMultiplier(state, now)` | 2.0 while `isInFrontier`; `1 + (2 − 1) × getGraduationGlideFraction` after graduation; 1.0 otherwise | `frontier.ts` |
| `frontierRevenueMultiplierUpperBound(createdAtMs, now)` | server bound: 2.0 until `FRONTIER_LATEST_GRADUATION_MS` (30 d + 7 d grace) after profile creation, then the same glide to 1.0 at day 51 | `frontier.ts` → `resource-plausibility.ts` |
| `STARTER_SUPPLY_MONTHS` | 6 (Cape Heritage starts with 60 rocket fuel; the pad starts on `supplyPolicy: 'market'`) | `src/lib/game/archetypes.ts`, mirrored in `sync-validation.ts buildFirstSyncKit` |
| `ONBOARDING_CHAIN_VERSION` | 3 (`first_contract` is step 2; v2 saves remapped by `migrateOnboardingStepV2ToV3`) | `src/lib/game/onboarding.ts`, `save-load.ts` |

| tier-1 building | before | after |
| --- | --- | --- |
| Small Launch Pad | $50M | $25M |
| Ground Station | $30M | $15M |
| Mission Control Center | $80M | $40M |
| LEO Telecom Satellite | $15M | $7.5M |
| LEO Sensor Satellite | $25M | $12.5M |
| GEO Telecom Satellite | $150M | $75M |
| Orbital Outpost | $500M | $250M |
| Terrestrial Research Institute | $250M | $125M |
| Orbital Solar Farm | $100M | $50M |
| Basic Lunar Extractor | $250M | $125M |
| Terrestrial Fabrication Works | $350M | $175M |

**Where the multiplier is applied.** Client: `game-engine.ts` §1 (one
`frontierRevenueMult` term in the service revenue product, next to
`staffingEfficiency`), `away-operations.ts` (away-parity), `economy-report.ts`
(`revenueMultipliers.frontier`, folded into `combined`), `ResourceBar.tsx`
(the top-bar net-income figure; a "Frontier ×2.0" chip with a HoloTip sits
next to it whenever the multiplier is above 1.0). Server:
`computeServerMonthlyGrossDetailed` multiplies its `services` term by the
createdAt bound and reports `frontierRevenueMult`; the sync route passes
`GameProfile.createdAt`. The bound is ≥ the client's real multiplier at every
instant (a voluntary early graduate is strictly lower) — the safe direction
for a plausibility ceiling. Without the mirror every new player's doubled
income would have been rejected as implausible on sync — the exact shape of
the 2026-09-12 contract-credit bug (commit 510de2a6).
`pass10-early-game.test.ts` proves server gross for a Frontier row = 2 × the
veteran row and that a live-tick month of doubled income fits under it.

### Early-game pace — engine probe (`scripts/sim-early-game.ts`)

`computeEconomyReport` on a fresh archetype save, with and without the
Frontier doubling. "Months to X" counts the gap between X and starting cash
on base income alone (0 = affordable on day one).

| archetype | cash | net/mo, no Frontier | net/mo, Frontier ×2.0 | months → $50M research | months → GEO sat + GEO unlock ($125M) |
| --- | --- | --- | --- | --- | --- |
| Cape Heritage | $75.0M | $4.7M | $13.2M | 0 (cash on hand) | 10.7 mo ≈ 2.7 d → **3.8 mo ≈ 0.9 d** |
| Meridian Signals | $60.0M | $4.6M | $12.4M | 0 (cash on hand) | 14.1 mo ≈ 3.5 d → **5.3 mo ≈ 1.3 d** |
| Tracking Consortium | $75.0M | $3.2M | $11.4M | 0 (cash on hand) | 15.5 mo ≈ 3.9 d → **4.4 mo ≈ 1.1 d** |

Before Pass 10 (founder measurement, Cape Heritage +$4.9M/mo): a $100M
tier-1 node ≈ 20 months ≈ 5 real days; the $150M GEO sat ≈ 31 months ≈ 7.7
days. After: the same node is $50M and the same corporation banks $50M of
fresh income in 3.8 months ≈ 0.9 days inside the Frontier (2.7 days after
graduation); the GEO sat is $75M ≈ 5.7 months ≈ 1.4 days of Frontier income.
Roughly a 5× faster first evening, and the effect fades with the glide.

### 50-year playtest (`scripts/sim-50yr.ts`)

Three runs: the Pass-9 baseline (before), the same runner after the cost
change, and the new `--frontier` mode, which models the live on-ramp for
every player (×2.0 service revenue for the first 120 game-months = 30 real
days after joining, then the 56-month glide starting there — revenue 2.0 →
1.0 and the pool glide, both the real engine curves). The default runner
still does NOT model the Frontier (it never did; joiners glide from day 1),
so "after (costs)" isolates lever 1 and "after (--frontier)" adds lever 2.

Research schedule, tier 1: 39 techs, **$3.87B → $1.94B**, serial real-time
7 h (unchanged). Tiers 2–5 unchanged.

Year-50 end states (book NW / cash / net per month, trailing 12 months):

| archetype | before (Pass 9) | after (costs) | after (costs + `--frontier`) |
| --- | --- | --- | --- |
| mono-expander | $236M / $92M / $1.9M · T3 | $135M / $54M / $0.2M · T3 | $116M / $35M / $2.8M · T3 |
| integrator | $65.2B / $3.7B / $582M · T4 | $68.7B / $7.6B / $536M · T4 | $64.5B / $3.4B / $404M · T5 |
| industrialist | $5.1B / $4.2B / $38.6M · T3 | $5.8B / $5.1B / $40.1M · T3 | $13.1B / $1.8B / $109M · T4 |
| aggressor | $1.0B / $461M / $23.0M · T3 | $1.2B / $764M / $23.7M · T3 | $2.9B / $669M / $62.3M · T3 |
| turtle | $977M / $527M / $31.6M · T3 | $1.35B / $1.0B / $28.6M · T3 | $11.8B / $11.4B / $24.5M · T4 |
| hoarder | $8.1B / $3.9B / $23.3M · T3 | $9.1B / $5.0B / $21.1M · T3 | $13.0B / $2.1B / $27.9M · T3 |
| joiner-y10 | $46.4B / $1.2B / $459M · T4 | $57.2B / $7.8B / $299M · T4 | $62.1B / $749M / $421M · T4 |
| joiner-y30 | $5.3B / $905M / $139M · T3 | $15.3B / $2.9B / $216M · T4 | $47.9B / $2.4B / $284M · T4 |

Wealth concentration (book NW, negatives clamped):

| decade end | Gini before | Gini after (costs) | Gini after (`--frontier`) | top-1 share before → costs → frontier |
| --- | --- | --- | --- | --- |
| y10 | 0.615 | 0.663 | 0.732 | 64% → 75% → 85% |
| y30 | 0.702 | 0.692 | 0.629 | 70% → 65% → 46% |
| y50 | 0.664 | 0.634 | **0.496** | 49% → 43% → **30%** |

Late-joiner viability (the relaunch question), joiner-y30:

| age | before | after (costs) | after (`--frontier`) |
| --- | --- | --- | --- |
| +12 mo | $135M NW, $8.6M/mo, 4 bldgs | $162M, $20.5M/mo, 5 | $98M, $12.7M/mo, 4 |
| +24 mo | $159M, $10.4M/mo, 4 | $468M, $69.6M/mo, 11 | $547M, $56.1M/mo, 11 |
| +60 mo | $179M, $4.5M/mo, 4 | $2.5B, $94.7M/mo, 16 | $5.3B, $356M/mo, 20 |
| +120 mo | $612M, $25.6M/mo, 10 | $6.1B, $149M/mo, 21 | $16.6B, $663M/mo, 28 |

Reading: the cost halving alone un-stalls the joiner's research ladder (it
was stuck at four buildings for five years); the Frontier doubling
compounds it, and by year 50 the world is markedly flatter (Gini 0.50, top
share 30%) because every archetype's first thirty days now pay for the
tier-2 ladder. The one archetype that got poorer is the mono-expander
(satellite-only, one pool) — cheaper satellites mean more of them spammed
into the same floored LEO telecom pool, the dominance-audit cautionary case
(sim-strategies (a) below) made slightly worse, not better. That is the
Pass-1 saturation math working as intended and not a regression to fix.

### `scripts/sim-strategies.ts` (24-month solo tables, month 23 row)

| strategy | before: net/mo · cash · NW | after: net/mo · cash · NW |
| --- | --- | --- |
| (a) satellite spammer | −$27.1M · −$343M · −$154M (21 sats) | −$39.1M · −$626M · −$509M (26 sats) |
| (b) datacenter spammer | −$4.9M · $41M · $941M | −$4.9M · $214M · $1.02B |
| (c) diversified integrator | $27.5M · $518M · $1.77B | $35.5M · $766M · $1.96B |
| (e) passive idler | $4.6M · $1.95B · $2.05B | $4.6M · $2.03B · $2.08B |

### Mining gate (`scripts/sim-mining.ts`)

The gate compares the best ship-mining gross÷capex against the best
building benchmark, which is the Basic Lunar Extractor whose cost this pass
halves ($250M → $125M): its gross÷capex goes 1.40% → 2.80%/month, so the
ratio moves **1.29× → 0.65×** (limit ~1.5×, OK). Buildings got relatively
better, not ships — no ship price change is needed and none was made. If a
future pass wanted ships back near parity, the smallest lever is the
Prospector Barge's $180M capex (a ~40% cut would restore ≈1.1×), but the
gate as written is comfortably inside its limit.

### Guards

`src/lib/game/__tests__/pass10-early-game.test.ts` (18 tests): exact
tier-1 cost tables and tooltip copy; multiplier active / gliding (2.0 → 1.5
→ 1.25 → 1.0) / veteran / `none` / timed-out; live tick pays exactly 2× and
`economy-report` carries the term; away-parity; the server bound is never
below the client's real multiplier across a 60-day sweep for three
graduation histories; server monthly gross for a Frontier row = 2 × the
veteran row and a doubled live-tick month fits under it; client and server
starter kits agree on resources and `supplyPolicy` for all three archetypes;
the Sourcing console shows the starter pad as "On market", not "Short";
the guide's step order and the v2→v3 step remap. Existing guards updated
for the new stickers: `mark-upgrades.test.ts`, `sim-month-grid.test.ts`,
`asset-reconcile.test.ts`, `onboarding.test.ts`.

### Risks / watch

- The sync money ceiling is 2× looser than before for a profile's first
  ~51 days. It is still bounded by the row's own gross and the $500K/s
  backstop, and the ceiling never fed exploits before; the audit log
  (`client_money_implausible_rejected`) should go quieter for new players,
  not louder.
- Cheaper LEO telecom satellites make the sat-spam floor deeper (above).
  Watch the LEO telecom pool multiplier in the first live week.
- Meridian Signals' two starting satellites consume 0.05 satellite bus a
  month each and still start with none (the founder's directive named the
  launch pad); `starterSupplyFor('sat_telecom')` is one line away if the
  Sourcing console's "Short" pip on those bothers new players.
- Saves mid-chain on v2 step 5 (the old contract step) resume at
  `first_trade` rather than re-walking the contract step — a one-time
  cohort of a few players; documented in `onboarding.ts`.

## Pass 11 — HQ relocation (2026-09-13)

### What shipped (CC-2 of `docs/COMMAND_CENTER_DESIGN_2026-09-13.md`)

The headquarters is now a **place a corporation can move**, on the
campaign loop, with the four founder calls of design §8 built in: ±10–15%
seat bonuses, ONE HQ per corporation, rivals' seat public, the relocation
project hidden until it completes. Earth → LEO (Orbital Command Deck) and
Earth/LEO → Luna (Lunar Gateway HQ) are open; Mars, Jovian/Saturnian,
deep-space and interstellar stay `comingSoon`, but every table below is
generic so CC-3/CC-4 add rows, not mechanisms.

Files: `headquarters.ts` (numbers + bonus profiles), `hq-relocation.ts`
(pure requirements / quotes / transitions / mail), `hq-relocation-server.ts`
(HqSeat / HqRelocation rows, completion + renewal passes),
`/api/space-tycoon/hq` (ladder) and `/api/space-tycoon/hq/relocate`
(server-authoritative start), `HqRelocationConsole.tsx` on the Bridge,
`BridgeStage.tsx` chip ladder, `order-queue.ts` Outliner row,
`public-leaderboard.ts` seat label, the `hq_relocated` timeline entry,
`scripts/sim-hq-relocation.ts`.

### Requirements (design §3)

| Target | Tier | Station at the destination (complete) | Seat | Project |
|---|---|---|---|---|
| Earth Operations Center | — | — | none (unlimited) | 1 game-month, 25% of the departing stage's fee |
| Orbital Command Deck (LEO) | 2 | Orbital Outpost in LEO (`space_station_small`) | LEO pool, 24 seats | 2 game-months (12 h real) |
| Lunar Gateway HQ | 3 | Lunar Gateway (`space_station_lunar`) or Lunar Habitat (`habitat_lunar`) | Lunar pool, 12 seats | 4 game-months (24 h real) |
| Mars / Jovian / Saturnian / deep space / interstellar | 4–7 | defined (`HQ_STAGE_REQUIREMENTS`) | 8 / 4 / 4 / 2 / — | 6 / 8 / 8 / 12 / 18 months — unreachable until CC-3/4 |

Server-side the tier comes from `tierFromProfileScalars` and the station
from the ServerAsset registry — never from the client's claim. QA
profiles (`notQaProfile`) are refused with `qa_profile`.

### Costs (money sinks — every dollar below is burned)

| Item | LEO deck | Lunar HQ | Notes |
|---|---|---|---|
| Relocation project | **$45M** | $220M | `HQ_RELOCATION`; debited at start (`hq_relocation` ledger reason) |
| Seat, empty pool | **$25M** | $150M | `HQ_SEAT_BASE_PRICE`; posted price = base × (1 + 2·(occupied/total)^1.5) → the last seat lists at 3× base; burned like a slot-auction win (`hq_seat_lease`) |
| Upkeep | **$1.0M / mo** | $3.5M / mo | `HQ_UPKEEP_MONTHLY`, charged flat on the corporate-overhead line (tick §1b, P&L, sim harness) — rent is rent, it does not ride the maintenance-reduction stack |
| Return to Earth | 25% of the departing fee, 1 month | | `HQ_RETURN_COST_FRACTION` |

Seat lease: 6 game-months, **auto-renews while the HQ stays** (or its
pending project targets that stage), released to the pool at the posted
price the moment the corporation is seated elsewhere. The seat's own
clearing-price tape lives on the row (`priceHistory`). Two corporations
racing for the last seat: the `updateMany … holderProfileId: null` guard
inside the relocation transaction makes the loser roll back cleanly
(`no_seat`, 409).

### Bonus profiles (design §8 call 1: ±10–15%, "where is my business")

| Seat | Terms | Wired at (client) | Wired at (server) |
|---|---|---|---|
| Earth | hiring cost −10%, contract payout +10% | `labor-market.ts getHireCostWithWageIndex`; `contracts.ts applyContractReward`, `delivery-contracts.ts completeDelivery` | `contract-credit.ts MAX_STATIC_CONTRACT_PAYOUT_MULT` (headroom bound) |
| LEO deck | launch-service revenue +12%, satellite-ops operating cost −10% | `game-engine.ts §1` (revenue product + `hqOpsCostMult`), `economy-report.ts` (same two terms), `DashboardPanel` Key Metrics | `resource-plausibility.ts computeServerMonthlyGrossDetailed({ hqStage })` — the sync settles a due relocation for the profile and passes its persisted seat, so the ceiling and the client agree within one sync (the 2026-09-12 lesson) |
| Lunar HQ | mining-order fuel −12% per leg, belt rock Δv surcharge −10% | `mining-orders.ts quoteLeg(…, logistics)` via `planMiningOrder({ hqLogistics })` from `MiningPanel` / `page.tsx` | the same pure planner in `/assets/mining` with `hqMiningLogisticsForLocationId(profile.hqLocationId)` |
| Mars … interstellar | colony throughput +12% / Martian contracts +10%; outer extraction +12% / science +10%; expedition returns +15% | defined in `HQ_BONUS_TABLE`, **unwired** until their stage opens | — |

"Satellite ops" is derived, not listed: every service a `satellite`-category
building enables (`HQ_SATELLITE_SERVICE_IDS`).

Baseline note: every corporation is seated on Earth today, so the Earth
terms are a live +10% on contract payouts and −10% on signing bonuses for
everyone — the price of leaving, expressed as the design words it ("Earth
= cheapest hiring and contract negotiation"). Six golden-number suites
were updated to read the term from `getHqBonuses('earth_ops')` rather than
hardcode it.

**Frontier interaction rule.** An HQ revenue bonus never stacks
multiplicatively with the Frontier ×2.0 on the same term beyond **×2.3**
(`hqRevenueMultUnderFrontier`): the client engine, the P&L and the server
ceiling all call it. Today 2.0 × 1.12 = 2.24, so nothing is trimmed; the
rule binds automatically if either constant grows.

### Sim delta (`scripts/sim-hq-relocation.ts`, 24 game-months, Frontier off)

Established fleets pre-built (no capex in the window), $500M cash, so the
pair differs ONLY by the move. The first run with LEO at $60M + $40M seat +
$1.2M/mo upkeep came out **−0.1% / −4.4% / −9.6%** for moves at months
1 / 6 / 12 — the +12% never paid back inside two years. Tuned the LEO
COSTS, not the bonus (the ±10–15% band is the founder's call):
relocation $60M → **$45M**, seat base $40M → **$25M**, upkeep $1.2M →
**$1.0M/mo**. After tuning:

| corp | move at | seated from | Δ cash @ 24 mo | net/mo stay → move |
|---|---|---|---|---|
| launch-heavy (2 small + 2 medium pads, 3 LEO sats, outpost) → LEO | 1 | 3 | **+$33.4M (+6.1%)** | $2.0M → $6.9M |
| same | 6 | 8 | +$8.9M (+1.6%) | |
| same | 12 | 14 | −$20.6M (−3.8%) | |
| mining (6 lunar rigs, habitat) → Luna | 1 | 5 | −$434M (−69.7%) | $2.5M → −$0.9M |
| same | 6 | 10 | −$417M (−67.0%) | |

Reads as intended: a launch-heavy corporation that moves EARLY clears the
+5–15% target; a late move does not pay within the window (the decision
has a clock); a building-mining corporation gains nothing on the service
ledger from Luna — its upside is on the Mining-Order loop, which the
building-based harness does not model. Measured there directly: a
Prospector Barge's Inner Belt round trip from Luna bills $4.4M on Earth
terms vs $3.8M seated on Luna (**−12.4%**); the $3.5M/mo upkeep pays back
at ≈ 6.4 belt round trips a month, and the $370M up-front is a tier-3
decision (a tier-3 corporation has earned ≥ $10B).

### Invariants checked

- Meaningful decision: money + time + a finite seat + upkeep against a
  ±10–15% profile that favours ONE line of business. No dominant move.
- Supply/demand: seat price rises with occupancy; vacated seats re-list at
  the pool's posted price; every seat and relocation dollar is burned.
- Time loop: relocation = campaign; lease = weekly; upkeep = daily.
- No pay-to-win: nothing here is purchasable for real money.
- Intelligence: the seated stage and seat number are public (corp page,
  leaderboard, `hq_relocated` on the diplomacy timeline); the project in
  flight is not (`loadPublicHqSeatIndex` reads the CURRENT stage's seat
  only; no public reader selects `HqRelocation`).
- Server truth: `GameProfile.hqLocationId` is written only by
  `completeDueHqRelocations` (cron every 5 min + lazily by the sync and
  the two HQ routes); the sync no longer mirrors the client's value and
  answers with a `headquarters` block the client adopts.

### Tests

`src/lib/game/__tests__/hq-relocation.test.ts` (21 tests): seat counts /
posted-price curve / lease term / seat label; cost and time constants
including the return leg; the §3 requirement table and every
`checkHqRelocationRequest` refusal; start → not due → due, the charter mail
posted exactly once across the local flip and the server block;
`adoptServerHeadquarters` authority and garbage-tolerance; the ±10–15%
band on every profile; the ×2.3 Frontier cap; tick / P&L / server-ceiling
parity for a LEO deck (+12% on the launch line, upkeep on the overhead
line, `hqStage: 'unknown'` bound); Luna neutral on the service ledger;
Earth hiring −10% and contract +10% with the headroom bound; `quoteLeg`
fuel / belt-Δv terms; the Outliner row; the CLIENT_APPLIED ledger
contract; save migration for seat-less and malformed saves.
`headquarters.test.ts` updated for the opened stages.

### Risks / watch

- The LEO deck's +12% is worth ~$5M/mo to a four-pad corporation; watch
  whether launch-heavy corporations cluster in LEO and the 24-seat pool
  fills in the first week (the posted price climbs to $75M at the last
  seat; if it fills anyway, CC-3's auction comes forward).
- Upkeep is client-charged (costs are never ceiling-restricted); a
  hand-edited save could skip it. Cheap to move server-side later — the
  amount is one table lookup on the persisted seat.
- The Lunar seat is priced for tier 3. If the Mining-Order loop's fuel
  share of a mining corporation's P&L turns out small on live telemetry,
  the Luna terms should broaden to freight legs (cargo-logistics.ts) before
  the price moves.

## Pass 12 — mining Phase B (2026-09-13)

### What shipped (row B of `docs/SPACE_MINING_DESIGN_2026-09-12.md` §8)

Ownership and depletion on the Phase A rocks: **claims** (exclusive
extraction rights, founder ruling 3 — lapse after 3 unworked game-months),
**exhaustion + in-place respawn with field ageing**, **extraction pressure
on shared unclaimed rocks**, two **rock event cards** (rubble field,
spin-up) on the existing random-event system, the **Escort Cutter**
(security role, founder ruling 4) and the **NPC shakedown** on the ore run
home, a **public claim feed**, and the sync's **mining block** (claims, live
intel, notices → mail + Situation Log).

Files: `asteroid-claims.ts` (pure claim rules + client records + block
adoption), `rock-pressure.ts`, `npc-shakedown.ts`, `asteroids.ts` (ageing /
respawn / event constants), `mining-orders.ts` (planner inputs + local
settlement), `random-events.ts` (cards), `server-mining.ts` (AsteroidClaim
rows, settlement, cron passes, block, feed), `/api/space-tycoon/assets/mining`
(`stake_claim` / `release_claim`, escort + claim checks on `order`),
`/api/space-tycoon/claims` (feed), the sync route (`mining` block), the
assets-complete cron (expiry / upkeep / respawn), `MiningPanel.tsx`,
`order-queue.ts` (claim-lapsing row), `ships.ts` (`security` role, Escort
Cutter), `scripts/sim-mining.ts` scenarios 4-5.

### Claims

| Rule | Value |
|---|---|
| Who may stake | the corporation that has SURVEYED the rock (effective survey of the current generation) |
| Exclusivity | mining a rock under another corporation's claim is refused server-side (`rock_claimed`); surveying stays open; unclaimed rocks stay open to all under pressure |
| Stake fee | max($1M, grade × reserve × ore base price × 3%) — BURNED (`claim_stake_fee`) |
| Upkeep | 10% of the fee per game-month — BURNED (`claim_upkeep`); an unpayable month lapses the claim |
| Expiry | `expiresAt = lastWorkedAt + 3 game-months` (18 real hours); every completed mining order of the holder on the rock advances `lastWorkedAt` |
| Cap per corporation | T1 1 · T2 2 · T3 4 · T4 6 · T5 8 · T6 10 · T7 12 (`CLAIM_CAP_BY_TIER`) |
| Loss | expiry (unworked), lapse (unpaid), exhaustion of the rock, release (no refund) — never another player's action |
| Feed | PUBLIC with the corporation NAME (design §3 "holder public"); never the profile id, fee or upkeep state; per-rock activity count (pending orders) rides along |
| Outliner | a row when a claim lapses within 1 game-month ("work it or lose it") |

Fees at the design's anchors: median Near-Earth C rock (0.8, 5,000, $14k)
≈ $1.7M; Inner Belt M rock (1.04, 8,108, $10k) = $2.5M (upkeep $253K/mo);
Kuiper X prize (1.3, 75,000, $70k) ≈ $205M.

### Depletion, ageing, respawn, events

| Constant | Value | Meaning |
|---|---|---|
| exhaustion | reserve ≤ 0 → `exhaustedAt`, the holder's claim closes (`exhausted`), the planner refuses the rock, the rock table pips it |
| `ROCK_RESPAWN_GAME_MONTHS` | 6 (36 real hours) | an exhausted slot is re-charted IN PLACE (same id/name, `generation` + 1); every survey of it goes stale by generation |
| `RESPAWN_RESERVE_MULT` | 0.6 | the re-charted reserve is 60% of a fresh roll; `initialReserve` accumulates so the ageing curve is monotone |
| `FIELD_AGEING_GRADE_DROP` | 0.35 | re-charted grade centres on `meanGrade × (1 − 0.35 × consumedFraction)`, `consumedFraction = 1 − Σreserve/ΣinitialReserve` over the field |
| `RUBBLE_*` | chance risk × 0.35 per completed order; yield × 1.25 for 2 game-months; hull wear 5% × (1 + risk) per completed order on it |
| `SPIN_UP_*` | chance risk × 0.25 per completed order; extraction rate × 0.6 for 3 game-months |

Rock events live on the **Asteroid row** (rolled deterministically from the
order id by the completion pass; local-only play rolls the same function
on the client) so every corporation working the rock sees the same state —
the hazards.ts "same weather for everyone" precedent. The card
(`random-events.ts` `rubble_field` / `spin_up`, `trigger: 'rock_event'`,
probability 0 on the monthly dice) offers "work it" vs "stand off" — a
client-side self-restriction, **no cash, no grant**, nothing the sync
ceiling has to verify.

### Extraction pressure on shared rocks

`share(n) = n^−0.5` over the corporations whose `mine` orders on the rock
overlapped the order's extraction window (server, at completion; the client
quote uses the public activity count): 1 → 1.00, 2 → 0.71, 3 → 0.58, 4 →
0.50, floor 0.25. Total extraction `n × share(n) = √n` — the face is the
bottleneck. A claimed rock is share 1 for its holder. Pressure costs
UNITS, never time or fuel (the schedule is unchanged), and the rock loses
what was extracted.

### NPC shakedowns and the Escort Cutter

| Lane (field parent) | Odds per return leg |
|---|---|
| lunar_orbit (Near-Earth, Frontier field) | 0 |
| jupiter_system (Trojans) | 8% |
| ceres_surface (Ceres Approaches) | 10% |
| asteroid_belt (Inner Belt) | 12% |
| outer_system (Kuiper Fringe) | 15% |

Hit → the Void Corsairs take **25%** of the ore aboard (after pressure);
hull and crew untouched. Cover: **assigned** Escort Cutter × 0.25 (−75%),
**stationed** cutter idle at the field's parent × 0.5, **Protected
Frontier** → 0 (createdAt on the server, `isInFrontier` on the client).
The roll is deterministic in the order id; the outcome is written on the
MiningOrder row and reaches the client as a notice (mail + a `pirate_raid`
Situation Log line). Never a player-vs-player effect: the cutter's odds are
a pure function of lane, cover and Frontier — no target anywhere in the
signature (docs/POLICY.md "Security ships").

Escort Cutter: T3, `spacecraft_armor` + `autonomous_docking` (the doc's
`point_defense` does not exist), $260M, 0 hold, upkeep $600K/mo, point
defence 0.45 / shielding 0.30.

### Sim (`npx tsx scripts/sim-mining.ts`, 2026-09-13)

Phase A gates re-run unchanged: solo surveyed barge month-3 net **+$859K
✓**; blind barge negative (surveying is the decision); three-ship cycle
does NOT beat two returning barges (Phase C); best ship gross÷capex
**0.65×** the Basic Lunar Extractor (limit 1.5×) ✓.

Scenario 4 — Prospector Barge on the Inner Belt M rock from Ceres, 6 months:

| Scenario | Share | Units | Revenue | Claim cost | Net |
|---|---|---|---|---|---|
| Open · alone | 1.00 | 1,746 | $16.9M | — | $6.0M |
| Open · 2 corporations | 0.71 | 1,233 | $12.0M | — | $1.0M |
| Open · 3 corporations | 0.58 | 1,008 | $9.8M | — | −$1.2M |
| Open · 4 corporations | 0.50 | 873 | $8.5M | — | −$2.5M |
| Claimed | 1.00 | 1,746 | $16.9M | $4.0M | $1.9M |

A claim costs $4.0M over 6 months against an uncontested rock and is worth
+$929K the moment ONE rival shares it → **claims pay only when contested**,
which is the shape wanted (a solo player on an empty server has no reason
to file; a corporation in a rush does).

Scenario 5 — Asteroid Mining Ship, Inner Belt M, return & sell at Ceres,
6 months: no cover 12%/leg, 3,104 units landed, net $6.9M; stationed cutter
6%, 3,152 units, net $3.8M after $3.6M cutter upkeep; assigned cutter 3%,
3,184 units, net $4.1M. Expected toll per unescorted belt trip $60K (a
Kuiper X-ore run: ~$525K). **One belt miner never justifies a cutter; a
fleet or the Kuiper Fringe does** — a fleet-scale decision, not an
auto-buy.

### Design invariants

- Meaningful decision: claim or share; escort or pay; work the rubble or
  stand off; keep a claim alive or let it lapse.
- Supply/demand: exhaustion + ageing cap every rock's exploit ceiling;
  pressure makes rushes self-limiting; ore still clears through the
  market-pressure pipe.
- Sinks: stake fee, upkeep, cutter hull + upkeep, rubble hull wear (all
  burned; nothing refunded).
- Time loops: tactical (event card, escort choice), daily (upkeep), weekly
  (claims lapse, respawn cycle 36 h), monthly (field ageing).
- No PvP: shakedowns are NPC; the only ways to lose a claim are your own or
  the rock's.
- No pay-to-win: nothing here is purchasable for real money.
- Intelligence: the claim feed and per-rock activity are public; grades and
  rates stay behind surveys and espionage.

### Risks / watch

- Stationed cover reads the cutter's persisted position (client-owned
  condition, like every ship location) — a forged position saves
  repositioning fuel, nothing more. Move to a server-side ship position when
  one exists.
- The claim fee is 3% of in-ground value: on a Kuiper X prize that is
  $205M up front + $20M/mo — intended to be a corporate decision; watch
  whether any solo player ever files one.
- Respawn is in place (same catalogue id) — Phase C/D can spawn NEW ids once
  the map affordance exists.

## Pass 13 — outer headquarters (2026-09-13)

### What shipped (CC-3 of `docs/COMMAND_CENTER_DESIGN_2026-09-13.md`)

The headquarters ladder now runs the whole way: **Mars Orbital HQ (tier 4),
Jovian *or* Saturnian HQ (tier 5), the Heliopause deep-space station (tier 6)
and the Interstellar HQ (tier 7)** are reachable. From Mars outward a vacant
seat is sold at a **sealed-bid auction** rather than leased first-come, seat
**rent moved server-side** (an unpayable month now costs the corporation its
anchorage), and the Bridge picks up a stage's window plates the moment the
art pipeline publishes them.

Files: `headquarters.ts` (the ladder's numbers, the ±10-15% profiles, the ONE
service-term helper), `hq-relocation.ts` (research/hull gates, the auction
gate, the upkeep cursor math), **`hq-seat-auctions.ts`** (new — the pure
auction half), `hq-relocation-server.ts` (`chargeHqSeatUpkeep`,
`resolveDueHqSeatAuctions`, `awardHqSeat`, `lapseHqSeat`, `loadHqUpkeepView`),
**`/api/space-tycoon/hq/seat-auction`** (new), `/api/space-tycoon/hq` (+
auctions, gates, upkeep), `/api/space-tycoon/hq/relocate` (auction gate),
`/api/cron/assets-complete` (two new passes), `HqRelocationConsole.tsx`,
`BridgeStage.tsx` + `hq-manifest.ts` (runtime plate discovery),
`game-engine.ts` / `economy-report.ts` / `resource-plausibility.ts` /
`scripts/sim-harness.ts` (all four now call one helper),
`expeditions.ts` (the survey-data term), `server-ledger.ts` +
`ledger-reconcile.ts` (three reasons), `prisma/schema.prisma`
(`HqSeatAuction`, `HqSeatBid`, two additive `HqSeat` columns).

### The ladder as implemented

| Stage | Tier | Requirements beyond the tier | Seats | Seat price | Project | Upkeep | Seat bonus |
|---|---|---|---|---|---|---|---|
| Earth Operations Center | 1 | — | ∞ | — | — (return: 25% of the departing fee, 1 mo) | — | hiring −10%, contract payout +10% |
| Orbital Command Deck | 2 | Orbital Outpost in LEO | 24 | **$25M** posted, first-come | $45M · 2 mo | $1.0M/mo | launch revenue +12%, satellite ops −10% |
| Lunar Gateway HQ | 3 | Lunar Gateway or Habitat | 12 | **$150M** posted, first-come | $220M · 4 mo | $3.5M/mo | mining fuel −12%, belt Δv −10% |
| **Mars Orbital HQ** | 4 | Mars orbital station or habitat | **8** | **$250M reserve**, auction | **$380M · 6 mo** | **$5M/mo** | colony-surface revenue +12%, Mars-orbit revenue +10% |
| **Jovian Station HQ** | 5 | Jovian station | **4** | **$420M reserve**, auction | **$650M · 8 mo** | **$8M/mo** | outer extraction +12%, science +10% |
| **Saturnian Ring HQ** | 5 | Kronos station at Saturn | **4** | **$420M reserve**, auction | **$650M · 8 mo** | **$8M/mo** | outer extraction +10%, science +12% |
| **Heliopause Station HQ** | 6 | Deep Space Outpost **+ an interstellar-capable hull** | **2** | **$2.8B reserve**, auction | **$4.4B · 12 mo** | **$50M/mo** | outer extraction +15%, expedition survey data +15% |
| **Interstellar HQ** | 7 | Deep Space Outpost + **Interstellar Colonization** charted + **a Colony Ark** | **2** | **$1.5B reserve**, auction | **$2.4B · 18 mo** | **$20M/mo** | colony-surface revenue +15%, expedition survey data +15% |

Posted/reserve prices still ride the CC-2 occupancy curve
(`base × (1 + 2·(occupied/total)^1.5)`), so the last Mars seat *opens* at
3× the first. The two tier-5 seats are a **real choice** and never both:
Jupiter leans extraction, Saturn leans science.

**Where the outer numbers come from.** Each rung's total outlay (project +
reserve) is ≈ **24 game-months** of the monthly gain a *matching*
corporation measures in `scripts/sim-hq-relocation.ts`, and each rung's rent
is ≈ **15%** of that gain — the same shape LEO's $70M / $1.0M has against
its +12% launch line. Nothing is priced off the tier ladder's
`totalEarned` gate: an auctioned seat's real price is whatever the bidders
take it to, and the reserve is only the floor below which the seat is not
worth selling.

**Two gates stand in for systems that have no server-side completion
signal yet**, and both are named in `HQ_STAGE_REQUIREMENTS`:

- Deep space, design text *"Mothership-class flagship docked"*: there is no
  mothership hull in `ships.ts`. The gate is an **interstellar-capable hull**
  (Starfarer-Class Explorer $25B or Colony Ark $80B) — the only two ships
  that can leave the heliosphere, and a `ServerAsset` `ship` row proves it.
- Interstellar, *"completed interstellar expedition + colony charter"*:
  expeditions and interstellar colonies live only in the CLIENT save
  (`types.ts ExpeditionState` / `InterstellarColonyState` — no table, no
  column), so an expedition-completion gate would be the client's word for
  it. The gate is the **charter half** of the same sentence, which *is*
  server-verifiable: `interstellar_colonization` complete (which itself
  requires `jump_drive`, $500B) plus a **Colony Ark** built. **CC-4 should
  swap this for the expedition record once one exists.**

### Seat auctions (Mars and outward)

| Rule | Value |
|---|---|
| Which stages | `HQ_AUCTION_STAGES` — Mars, Jovian, Saturnian, deep space, interstellar. LEO and Luna keep CC-2's first-come lease: their pools are 24 and 12 seats, and an auction round-trip on the tier-2/3 on-ramp would be pure friction |
| How one opens | **On demand.** The first qualifying corporation posts an opening bid (`POST /hq/seat-auction {action:'open', stage, amount}`); the auction and the bid are created in one transaction, so an open auction always has a bidder. Scheduled auctions would cycle empty forever on a four-seat pool |
| Reserve | the pool's posted price at the current occupancy (`hqAuctionReserve` → `postedSeatPrice`) |
| Minimum bid | reserve, or the standing high bid **+2%**, rounded up to $0.1M. The high bid itself is never published — bids are sealed; only the floor a new bid must clear is |
| Window | **48 h**, with the orbital-slot auctions' **10-minute soft close** (a late bid buys everyone 10 more, capped at +1 h). The slot pools use 7 days; an HQ seat blocks the corporation's whole campaign-loop move, so it resolves faster |
| Escrow | debited at bid time (`hq_seat_bid_escrow`); revising a bid settles only the difference |
| Resolution | the assets-complete cron (`resolveDueHqSeatAuctions`, every 5 min) — and lazily by the seat-auction route, so a GET never shows a closed auction as live |
| Who wins | highest bid ≥ reserve; ties to the **earliest** bid; no RNG. `resolveAuction` is imported from `orbital-slot-auctions.ts`, not re-implemented, so the two systems can never drift on "who won" |
| Winner pays | the escrow is simply never returned — **that absence is the burn** (BALANCE.md money sink). Published on the seat's price tape (`event: 'auction'`), on the public timeline (`hq_seat_auction`) and in a `MarketAuditLog` `hq_seat_auction_cleared` row |
| Losers | refunded **in full** (`hq_seat_bid_refund`), including every bid on an auction that expired below its reserve |
| One seat, ever | `awardHqSeat` releases everything the winner holds elsewhere **in the same transaction**; the relocate route refuses an auction stage outright (`seat_auction`, 409) until the seat is actually held |

**Why not the OrbitalSlotAuction tables.** `OrbitalSlotAuction` is keyed by
`locationId` against a per-location occupancy bucket, its leases carry
building-tied idle fees, and a corporation may hold several. An HQ seat is
one indivisible anchorage, at most one per corporation, held by the
headquarters itself with no building to idle against, and its pool is the
`HqSeat` table CC-2 already built. Sharing the table would have meant a
nullable `seatId` plus an "is this an HQ row?" branch in every orbital-slot
reader — more coupling than the ~60 lines of I/O it saved. The *behaviour* is
the same auction: the resolution math and the soft-close constants are
imported.

### Upkeep is server-side now

| Rule | Value |
|---|---|
| Reason | **`hq_seat_upkeep`** — BURNED, no matching credit anywhere |
| Cadence | one game-month per cron pass (`chargeHqSeatUpkeep`, assets-complete, every 5 min), advancing `HqSeat.upkeepPaidThrough`. One month per pass (the `AsteroidClaim` precedent) means a server that was asleep catches up instead of presenting a lump bill |
| Non-payment | the month is marked missed; the wallet is never overdrawn |
| **Grace period** | **2 game-months** (`HQ_SEAT_UPKEEP_GRACE_MONTHS` — 12 real hours). Long enough that one bad trading day never costs a corporation its anchorage, short enough that an abandoned seat returns to a contested pool inside a day |
| Lapse | the seat returns to the pool at its posted price and `GameProfile.hqLocationId` goes back to `earth_surface` — a corporation cannot sit at a station it is not paying for. Public on the timeline (`hq_seat_lapsed`) |
| Visible | the Headquarters console carries a rent line (amount, paid-through, months unpaid, grace remaining) from `GET /hq`'s `upkeep` block; the P&L keeps the flat overhead line |

**The one double-charge trap, and how it is closed.** The client tick has
charged this figure since CC-2 (`game-engine.ts` §1b) and still does, so the
wallet math stays smooth between syncs and the sim harness keeps modelling
the same corporation. The server charge is therefore listed in
`ledger-reconcile.ts` **`CLIENT_APPLIED_LEDGER_REASONS`**: it debits the
persisted wallet and drives the lapse, but it never comes back to the client
as a pending delta. Exactly the contract CC-2's relocation charter uses. A
row missing from that list would bill every corporation twice a month.

### Bonus wiring — one helper, four callers

CC-2's regression (a server ceiling below the client tick rejects income the
player earned — it cost the founder real money twice that week) is now
structurally impossible for service revenue: **every** HQ service term is
computed by `headquarters.ts hqServiceRevenueMult`, and the tick
(`game-engine.ts` §1), the P&L (`economy-report.ts`), the **server ceiling**
(`resource-plausibility.ts computeServerMonthlyGrossDetailed`) and the
balance harness (`scripts/sim-harness.ts`) all call it with the same
arguments. The Frontier stacking cap (×2.3) is applied inside the helper, so
no caller can forget it. `hqServiceCostMult` does the same for the one
cost term.

| Term | Fires on | Wired at |
|---|---|---|
| `launchRevenueMult` | `launch_payload` services | `hqServiceRevenueMult` |
| `colonyThroughputMult` | any service at a settled colony SURFACE (`HQ_COLONY_LOCATIONS` — every `colonies.ts` body + Luna + Mars surface) | same |
| `marsOpsMult` | any service in **Mars orbit** — deliberately disjoint from the colony set, so the Mars seat's two terms can never multiply | same |
| `outerExtractionMult` | `mining_output` at `jupiter_system` / `saturn_system` / `outer_system` and the bodies hanging off them | same |
| `scienceMult` | `sensor_service` ("science and sensing"), wherever it operates | same |
| `satelliteOpsCostMult` | operating cost of any service a `satellite`-category building enables | `hqServiceCostMult` |
| `hiringCostMult`, `contractPayoutMult` | unchanged from Pass 11 | `labor-market.ts`, `contracts.ts` / `delivery-contracts.ts` |
| `miningFuelMult`, `beltDeltaVMult` | unchanged from Pass 11 | `mining-orders.ts quoteLeg` |
| `expeditionReturnMult` | survey-data payout when an interstellar expedition returns | `expeditions.ts`, ONE site, beside `surveyPayoutMult` |

A test walks **every service definition × every location × every stage** and
asserts the product never exceeds 1.15 — the founder's band holds by
construction, not by inspection.

`expeditionReturnMult` is the one term with no server mirror, because the
server has no expedition record at all (see the interstellar gate above). It
is not tick income, so it does not enter the monthly-gross ceiling; it rides
the same one-shot path `science-missions.ts`'s existing +30%
`surveyPayoutMult` already rides. **Watch item** — see below.

### Sim delta (`scripts/sim-hq-relocation.ts`, 24 game-months, Frontier off)

Matched pairs, fleet pre-built (no capex in the window), power generation at
every location (an unpowered location runs its services at a fraction of
nameplate and would have made the comparison vacuous). The seat is charged at
the **reserve**, so every delta below is the mover's best case.

| corp | move at | seated | stage | Δ cash @ 24 mo | net/mo stay → move | outlay | payback |
|---|---|---|---|---|---|---|---|
| launch-heavy (4 pads, 3 LEO sats, outpost) | 1 | 3 | LEO deck | **+$33.4M (+6.1%)** | $2.0M → $6.9M | $70M | 14 mo |
| same | 6 / 12 | 8 / 14 | LEO deck | +$8.9M / −$20.6M | | | |
| lunar mining (6 rigs, habitat) | 1 | 5 | Lunar | −$434M (−69.7%) | $2.5M → −$0.9M | $370M | never *(its terms are on the Mining-Order loop — measured below)* |
| Mars operator (surface industry + orbital relays) | 1 | 7 | Mars | −$194M (−3.8%) | $82.9M → **$108.3M** | $630M | **25 mo** |
| same | 6 / 12 | 12 / 18 | Mars | −$322M / −$474M | | | |
| Jovian extractor (6 Europa rigs + relays + labs) | 1 | 9 | Jovian | −$270M (−2.8%) | −$528.7M → **−$479.4M** | $1.07B | **22 mo** |
| Saturnian science house (4 Titan rigs + 6 sensor labs) | 1 | 9 | Saturnian | −$429M (−5.0%) | −$483.9M → **−$442.0M** | $1.07B | **26 mo** |
| Kuiper operator (4 Kuiper rigs + 2 relays + outer rigs) | 1 | 13 | Deep space | −$3.52B (−20.1%) | −$778.1M → **−$472.7M** | $7.20B | **24 mo** |
| outer-colony conglomerate (7 settled surfaces) | 1 | 19 | Interstellar | −$3.34B (−8.1%) | $408.7M → **$506.0M** | $3.90B | **40 mo** |

Reads as intended and matches Pass 11's shape exactly: **every rung is cash-
negative inside the 24-month window and cash-positive shortly after it**, so
the move is a real bet with a clock on it, never a free win and never a trap.
A later move is strictly worse (the project's months come out of the
window), and a corporation *larger* than the matching fleet pays back
proportionally faster — the seat rewards scale, which is what a corporate
end-game asset should do. The interstellar rung's 40 months is the slowest
on the service ledger by design: its economic term is the narrowest
(colony surfaces only), and the rest of its value is the expedition term and
the campaign milestone. Its real barrier is its gate, not its rent.

Off the service ledger, measured directly:

- **Lunar HQ, Mining-Order loop:** a Prospector Barge's Inner Belt round trip
  bills $4.4M on Earth terms vs $3.8M seated on Luna (**−12.4%**); the
  $3.5M/mo rent pays back at ≈ 6.4 belt round trips a month. (Unchanged from
  Pass 11.)
- **Deep-space / interstellar, expedition loop:** a mid-band Proxima
  Centauri survey pays $8.48B; the seat adds **$1.27B (+15%)** — 25 months of
  the deep-space rent per expedition returned.

**Harness caveat, stated plainly:** the building harness models no workforce
stack, thin demand pools and no research multipliers, so the *absolute*
monthly figures for tier-5-and-up fleets are pessimistic (several scenarios
run net-negative on cash while a live corporation of that tier would not).
The **delta** between the pair is the number this pass is anchored on, and
that is unaffected: both runs carry the identical compression.

### Invariants checked

- Meaningful decision: money + a multi-week project + a contested seat +
  rent, against a ±10-15% profile that favours ONE line of business. The
  two tier-5 seats are a genuine fork.
- Supply/demand: reserves ride occupancy, contested seats clear at auction,
  vacated seats re-list, and every dollar — project, clearing price, rent —
  is burned.
- Time loop: relocation = campaign (6-18 game-months); auction = 48 h, the
  weekly loop's short end; lease = 6 game-months; rent = daily-ish.
- No PvP combat: a rival can out-bid you for a seat and can watch you lose
  one to unpaid rent. Nothing a rival does can take a seat you are paying for.
- No pay-to-win: nothing here is purchasable with real money.
- Intelligence: the seated stage, the seat number, the clearing price and a
  lapse are all public; a pending relocation and a rival's standing bid are
  not.
- Accessibility: every auction control is a real `<button>`; the rent line is
  a `role="status"` with a `StatusPip` glyph + word, never colour alone.

### Tests

`src/lib/game/__tests__/hq-cc3.test.ts` (39): the ladder's tiers,
requirements (including the hull and research gates and the refusals),
seat counts, reserves and durations; auction reserve / minimum-bid /
soft-close-and-cap / resolution / tie-break / no-qualifying-bid; upkeep
cursor, grace and lapse; the one-seat invariant and the `seat_auction`
refusal; manifest selection (bundled → runtime → labelled Earth fallback);
the ±10-15% band across every stage; the "no two terms on one service" proof
over every service × location; and **live tick vs P&L vs server-ceiling
parity for each new stage** (the real `processTick`, the real
`computeEconomyReport`, the real `computeServerMonthlyGrossDetailed`).

`src/lib/game/__tests__/hq-seat-server.test.ts` (10): the cron passes
against an in-memory prisma — the monthly charge and its ledger row, one
month per pass, the unpayable month, the lapse (seat released, HQ home,
public feed row), a free seat that can never lapse; and the auction's
seating + burn + full refunds, idempotency, expiry below reserve, an
in-window auction left alone, and "the winner never holds two seats".

`hq-relocation.test.ts` updated where CC-3 opened what CC-2 had closed.

### Risks / watch

- **`expeditionReturnMult` has no server mirror.** The +15% lands on a
  one-shot payout that the plausibility ceiling does not model (neither does
  `science-missions.ts`'s existing +30%). For a tier-6/7 corporation the
  ceiling is wide enough to absorb it, but if expedition payouts start
  showing up in clamp telemetry, the fix is a `contract-credit.ts`-style
  one-shot credit for a server-side expedition record — the same thing CC-4
  needs for the interstellar gate. Do both at once.
- **Auction liquidity.** A four-seat pool with two qualifying corporations is
  a duopoly, not a market: the reserve becomes the price. That is acceptable
  at low population (the reserve is a real sink) but worth watching — if
  Mars seats routinely clear at exactly the reserve, the 48-hour window is
  doing nothing and the pool should shrink or the reserve should rise.
- **Rent versus idle corporations.** The cron charges a seat whether or not
  its owner logs in. Two missed months is deliberately short; if returning
  players find themselves evicted, raise `HQ_SEAT_UPKEEP_GRACE_MONTHS` rather
  than lowering the rent — the rent is the sink.
- **The deep-space seat is the most valuable in the game** (+15% on Kuiper
  extraction, the biggest revenue line there is) and its pool is 2. Expect it
  to clear far above reserve. That is the intended shape of a contested
  chokepoint, but it makes the tier-6 rung the one to watch for
  concentration in the quarterly balance report.

---

## Pass 14 — opening scarcity (2026-09-14)

### Founder rationale

Verbatim, 2026-09-13:

> "We should start the games with non-abundant resources of things like
> Martian water and Lunar water ice which haven't been harvested yet. Let's
> start those with very scarce levels at the start of the game until players
> and NPCs can start mining those resources. Getting places early and mining
> should be very rewarding. We should probably start all resources at scarce
> levels to support mining."

### The bug that made the ask impossible

`ResourceDefinition.startingSupply` was **two numbers wearing one name**: the
stock a world opens with AND the yardstick `getSupplyPriceMultiplier(supply,
baseline)` measures live supply against. Every consumer read it as the
baseline (`market/route.ts`, `market/trade/route.ts`, `market/restock`,
`npc-industry.ts`, `market-depth.ts` callers). Lowering it therefore moved the
yardstick down with the stock and produced **no scarcity at all** — a world
seeded at 30 units of Martian water against a 30-unit baseline prices at
exactly 1.0×.

Two further findings from the same read, both load-bearing:

1. **The scarcity multiplier was a buyer-side tax nobody could earn.**
   `market/trade` charged buyers `currentPrice × supplyMultiplier` but paid
   sellers a flat `currentPrice`, and the hourly mean-revert cron healed
   `currentPrice` toward a supply-blind `basePrice`. So an empty market
   charged a premium that no producer ever received, and a glutted one never
   sagged. The first corporation to land on Mars had no reason to hurry.
2. **Manufactured goods showed a phantom 10× premium.** Their
   `startingSupply` is 0, every consumer fell back to `|| 1000`, and
   `getSupplyPriceMultiplier(0, 1000)` clamps at 10. `/api/space-tycoon/market`
   has been publishing refined rocket fuel at 10 × spot on a market the NPC
   curve refuses to trade in either direction.

### The model

**Two fields.** `baselineSupply` is the pricing yardstick — what a
*functioning* market holds, unchanged from the pre-Pass-14 `startingSupply`
figures so a mature market prices exactly as it did before (the four ores are
the one exception, below). `startingSupply` is now only the **opening stock**.
`getPricingBaseline(slug)` is the single accessor; reading `startingSupply` in
a pricing context is what a test now fails on.

`baselineSupply: 0` means "no NPC curve at all" — manufactured hardware and
interstellar goods — and the multiplier is a flat 1.0 for them, which fixes
finding 2.

**Origin tiers** (`resources.ts RESOURCE_ORIGINS`). Every resource is
classified by where it physically comes from; the origin sets the opening
fraction of baseline and the NPC-arrival window.

| origin | opening fraction | opening multiplier | NPC restock ramp | example |
| --- | --- | --- | --- | --- |
| terrestrial | 0.75 | ×1.15 | full rate from day 0 | iron, aluminium, titanium, rare earth, **methane** |
| cislunar | 0.25 | ×2.0 | day 0 → 14 | *(none today; where orbital-ISRU outputs will land)* |
| lunar | 0.03 | ×5.8 | day 21 → 120 | lunar water ice, helium-3 |
| inner | 0.015 | ×8.1 | day 60 → 300 | solar concentrate (Mercury arrays) |
| martian | 0.015 | ×8.2 | day 45 → 240 | **Martian water** |
| belt | 0.02 | ×7.1 | day 60 → 300 | platinum group, gold, ammonia, C/S/M ore |
| outer | 0.01 | ×10 (the clamp) | day 120 → 540 | ethane, sulfur, exotics, deuterium, X-ore |
| interstellar | 0 | — | never | exotic fuel, xenogenic biomatter |
| fabricated | 0 | — | never | all 14 manufactured goods |

**Terrestrial goods open tight but NOT scarce, and that is a constraint, not
a preference.** Balance Pass 10 put the starter launch pad on
`supplyPolicy: 'market'` for its 10 rocket fuel a month. The cheapest fuel
route in `production-chains.ts` (`synthesize_rp1`, no research, terrestrial
fabrication works) runs on market-bought **methane**. Methane is classified
terrestrial on purpose; classifying it off-world would have regressed the
on-ramp (numbers below).

**Spot follows the fundamental.** `getFundamentalPrice(basePrice, supply,
baseline, min, max)` = `basePrice × supplyMultiplier`, band-clamped to
`[base × 0.3, base × 3.0]` ∩ `[minPrice, maxPrice]`. The hourly mean-revert
cron now targets it instead of the raw base price, so spot — and therefore
mining revenue (`mining-pricing.ts`), contract valuation, NPC settlement and
curve sells, all of which already read spot — carries the scarcity premium
without inventing a second pricing path. That fixes finding 1. The band cap
means the seller-side windfall is **3× base at most**, however empty the
market; the buyer-side premium keeps the steeper 10× clamp it always had.

`/market/init` now seeds a new world at its opening stock with
`currentPrice` at the fundamental, so a fresh world opens hungry from unit one
rather than waiting for the cron to discover it.

**NPC arrival, not pre-emption.** The authored `npcRestockPerHour` is now the
**mature** rate. `effectiveNpcRestockPerHour(def, now)` multiplies it by the
origin's ramp factor (0 before `rampStartDays`, linear to 1 at
`rampFullDays`) and by `populationScale(activeProfiles)` — so the NPC floor
recedes as the player base grows, which is NPC_BACKDROP.md's "a floor, not a
ceiling", finally applied to restock. The ramp clock is
`max(epochStart, OPENING_SCARCITY_LIVE_AT)`: a world that opened before this
model shipped gets the full head start rather than weeks of ramp it never ran.

**NPC industry became cost-rational.** `npc-industry.ts` ran a product's
recipes in authored order and stopped when the inventory target was met, so
the first recipe always won regardless of feedstock price. Under opening
scarcity that would have had Helios Energy crack scarce lunar ice into fuel —
pricing NPC rocket fuel at the top of its band *and* stripping the Moon before
a player got there. `chooseRecipes()` now picks the cheapest route per output
at live supply-adjusted prices (one market read per tick, shared across the
five corps).

**Ore baselines ×4** (`ore_carbonaceous` 800→3200, `ore_silicate`
1500→6000, `ore_metallic` 400→1600, `ore_exotic` 60→240). The Phase-A figures
described a market that had never traded ore; a functioning ore market holds
several Hauler loads (800 units each), not a fraction of one. Without this a
single 200-unit barge cargo erased the belt windfall in one trip.

### Opening levels

| resource | origin | baseline | opening | mult | base | opening spot (band) | buy at open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| lunar_water | lunar | 3000 | 90 | 5.77x | $50K | $150K (3.00x) | $500K |
| mars_water | martian | 2000 | 30 | 8.16x | $80K | $240K (3.00x) | $800K |
| iron | terrestrial | 10000 | 7500 | 1.15x | $5K | $6K (1.15x) | $7K |
| aluminum | terrestrial | 5000 | 3750 | 1.15x | $8K | $9K (1.15x) | $11K |
| titanium | terrestrial | 2000 | 1500 | 1.15x | $25K | $29K (1.15x) | $33K |
| platinum_group | belt | 200 | 4 | 7.07x | $500K | $1.50M (3.00x) | $5.00M |
| gold | belt | 300 | 6 | 7.07x | $300K | $900K (3.00x) | $3.00M |
| rare_earth | terrestrial | 500 | 375 | 1.15x | $200K | $231K (1.15x) | $267K |
| methane | terrestrial | 1000 | 750 | 1.15x | $15K | $17K (1.15x) | $20K |
| ethane | outer | 800 | 8 | 10.00x | $20K | $60K (3.00x) | $200K |
| exotic_materials | outer | 50 | 1 | 7.07x | $2.00M | $6.00M (3.00x) | $20.00M |
| helium3 | lunar | 20 | 1 | 4.47x | $5.00M | $15.00M (3.00x) | $50.00M |
| exotic_fuel | interstellar | 0 | 0 | 1.00x | $5.00M | $5.00M (1.00x) | $5.00M |
| xenogenic_biomatter | interstellar | 0 | 0 | 1.00x | $8.00M | $8.00M (1.00x) | $8.00M |
| steel_ingots | fabricated | 0 | 0 | 1.00x | $50K | $50K (1.00x) | $50K |
| aluminum_alloy | fabricated | 0 | 0 | 1.00x | $80K | $80K (1.00x) | $80K |
| rocket_fuel | fabricated | 0 | 0 | 1.00x | $120K | $120K (1.00x) | $120K |
| refined_rare_earth | fabricated | 0 | 0 | 1.00x | $500K | $500K (1.00x) | $500K |
| structural_beams | fabricated | 0 | 0 | 1.00x | $800K | $800K (1.00x) | $800K |
| electronics_package | fabricated | 0 | 0 | 1.00x | $1.50M | $1.50M (1.00x) | $1.50M |
| solar_panel_array | fabricated | 0 | 0 | 1.00x | $1.20M | $1.20M (1.00x) | $1.20M |
| propulsion_unit | fabricated | 0 | 0 | 1.00x | $3.00M | $3.00M (1.00x) | $3.00M |
| life_support_pack | fabricated | 0 | 0 | 1.00x | $400K | $400K (1.00x) | $400K |
| station_module | fabricated | 0 | 0 | 1.00x | $15.00M | $15.00M (1.00x) | $15.00M |
| satellite_bus | fabricated | 0 | 0 | 1.00x | $12.00M | $12.00M (1.00x) | $12.00M |
| ai_compute_cluster | fabricated | 0 | 0 | 1.00x | $20.00M | $20.00M (1.00x) | $20.00M |
| fusion_core | fabricated | 0 | 0 | 1.00x | $80.00M | $80.00M (1.00x) | $80.00M |
| habitat_pod | fabricated | 0 | 0 | 1.00x | $50.00M | $50.00M (1.00x) | $50.00M |
| sulfur | outer | 4000 | 40 | 10.00x | $12K | $36K (3.00x) | $50K |
| ammonia | belt | 3000 | 60 | 7.07x | $18K | $54K (3.00x) | $70K |
| solar_concentrate | inner | 1500 | 23 | 8.08x | $25K | $75K (3.00x) | $100K |
| organic_compounds | belt | 250 | 5 | 7.07x | $800K | $2.40M (3.00x) | $4.00M |
| deuterium | outer | 15 | 0 | 3.87x | $8.00M | $24.00M (3.00x) | $30.00M |
| bio_samples | outer | 8 | 0 | 2.83x | $15.00M | $42.43M (2.83x) | $50.00M |
| antimatter_precursors | outer | 3 | 0 | 1.73x | $50.00M | $86.60M (1.73x) | $150.00M |
| ore_carbonaceous | belt | 3200 | 64 | 7.07x | $14K | $42K (3.00x) | $70K |
| ore_silicate | belt | 6000 | 120 | 7.07x | $7K | $21K (3.00x) | $35K |
| ore_metallic | belt | 1600 | 32 | 7.07x | $10K | $30K (3.00x) | $50K |
| ore_exotic | outer | 240 | 2 | 10.00x | $70K | $210K (3.00x) | $350K |

### The starter launch pad's fuel bill

Refined rocket fuel never touches the NPC curve; the pad's `supplyPolicy:
'market'` shortfall becomes a standing bid at `spot × 1.10`, band-limited,
filled by NPC industry asks that are cost-plus on whatever route the corp ran.
So the pad's bill is set by the fuel *recipe's feedstock*, not by the fuel
row's own supply.

| scenario | cheapest route | NPC ask | pad bill (10 units/mo) |
| --- | --- | --- | --- |
| mature market (today) | Sabatier methane | $90K (the 0.75 × base floor) | **$900K/mo** |
| opening scarcity, cost-rational NPC (**shipped**) | Sabatier methane | $90K | **$900K/mo** |
| opening scarcity, authored-order NPC (**rejected**) | crack lunar water | $360K (3 × base cap) | $3.60M/mo |

Against a $5M/month small-pad gross that is 18% either way — unchanged from
today, and the reason `chooseRecipes` is part of this pass rather than a
follow-up. (The pad is also fully consumption-exempt inside the Protected
Frontier, so a new corporation sees no fuel bill for its first 30 days.)

### How fast the windfall decays

Every unit sold on the curve or mined raises `MarketResource.totalSupply`
(`market/trade`, `market/mining-pressure`, the sync mined-flow path), so the
premium is eroded by production itself.

| resource | opens | 3.0× (leaves the band cap) | 2.0× | 1.0× (par) |
| --- | --- | --- | --- | --- |
| Martian water, one `svc_mining_mars` rig (80/mo) | 8.16× @ 30 units | 2.4 game-months (0.6 real days) | 5.9 months (1.5 days) | 24.6 months (6.2 days) |
| Lunar water ice, one `svc_mining_lunar` rig (100/mo) | 5.77× @ 90 units | 2.4 months (0.6 days) | 6.6 months (1.6 days) | 29.1 months (7.3 days) |
| Carbonaceous ore, one Prospector Barge (200/mo) | 7.07× @ 64 units | 1.5 months | 3.7 months | 15.7 months (3.9 real days) |

Nothing sits pinned at the 10× clamp: every off-world tier except `outer`
opens *below* it, so the curve is live from the first cargo. `outer`
resources do open at the clamp, which is intended — nobody has been to Triton
— and they leave it on the first few hundred units.

### Sim gates (`scripts/sim-mining.ts`)

Scenarios 1–5 (Phase A/B) are re-run unchanged and still pass at the Pass 12
numbers: solo surveyed barge month-3 net **$859K** (cash-positive ✓), blind
barge negative, three-ship cycle does not beat two returning miners, best ship
gross ÷ capex **0.65×** the Basic Lunar Extractor (limit 1.5×), a claim costs
$4.0M/6mo uncontested and is worth +$929K against one rival, one escort cutter
does not pay for a single miner.

New scenario 6 — the same Near-Earth C rock, priced at opening scarcity, with
the barge's own landed cargo pushing supply back up:

| month | trips | units | mature $/unit | mature net | opening $/unit | opening net | opening cum |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 200 | $14K | −$5.1M | $42K | $291K | $291K |
| 2 | 1 | 200 | $14K | $859K | $42K | $6.3M | $6.6M |
| 3 | 1 | 200 | $14K | $859K | $37K | $5.3M | $11.9M |
| 4 | 1 | 200 | $14K | $859K | $31K | $4.1M | $16.0M |
| 5 | 2 | 400 | $14K | $2.1M | $26K | $6.6M | $22.6M |
| 6 | 1 | 200 | $14K | $859K | $22K | $2.5M | $25.0M |

First-mover premium: **$25.0M** over six months against **$410K** in a mature
market. The realised ore price falls **$42K → $22K** (53% of the opening
price) on this one barge's own output — the windfall decays without any other
corporation showing up, which is the gate. Month-3 net at opening prices is
**+$5.3M** (cash-positive ✓).

Capital-efficiency gate re-run at opening prices: best ship gross ÷ capex is
**1.41×** the base-priced Basic Lunar Extractor and **0.47×** the same
benchmark priced at opening scarcity (its lunar water and helium-3 open scarce
too). Under the 1.5× limit on both readings.

### The live world

Epoch 2 opened 2026-08-24 and the hourly restock cron has been adding supply
to rows nobody has been near. `scripts/tycoon-opening-scarcity.ts` (dry-run by
default, `--apply` to commit, idempotent) resets `totalSupply` to the opening
level and `currentPrice` to the fundamental — but **only** for rows that are
above the opening level, have a curve baseline, and show no trading at all
(no `MarketFill`, no non-NPC `MarketLimitOrder`, no accumulated
`totalDemand`). Real price discovery is never overruled; `--force-traded`
exists for the case where the model says otherwise. It writes one
`MarketAuditLog` row and posts one public world-feed entry (`market_reprice`,
"Sol Commodities Exchange") so players read a survey revision rather than
prices that moved overnight.

### Risks / watch

- **Mean reversion now targets a moving number.** A market permanently above
  baseline will sit permanently below base price (floor 0.3× at ~11×
  baseline). That is the intended "mass extraction depresses prices", but it
  is the first time spot has sagged on a glut, and it is the change in this
  pass most likely to surprise an existing player. Watch raw-metal spot on
  the next two weekly reports.
- **The √ curve is weak at tiny baselines.** `antimatter_precursors`
  (baseline 3) opens at only 1.73× and `bio_samples` (8) at 2.83×, because
  `sqrt(baseline/1)` cannot exceed those. The absolute prices are still
  enormous ($86.6M and $42.4M a unit), so the first-mover reward is real in
  dollars, but if outer-system exotics ever need a sharper opening the fix is
  to raise those baselines to a month of NPC flow rather than to touch the
  curve.
- **`MINIMUM_MARKET_SUPPLY` still lets a buyer purchase 100 units of
  something with 4 units in stock**, at the 10× premium. It is not an
  arbitrage (curve sells pay spot, which is band-capped at 3× base, so the
  round trip loses money) but it does mean "sold out" never quite happens.
  Pre-existing; unchanged here.
- **Ore baselines moved.** Ore is one day old and barely traded, so the ×4
  regrade is cheap now and would not be in a month.

---

## Pass 16 — interstellar headquarters (2026-09-13)

CC-4, the last phase of the Command Center system
(`docs/COMMAND_CENTER_DESIGN_2026-09-13.md`). Two things were open when CC-3
shipped, and both were economic, not cosmetic.

### 1. The interstellar rung was gated on a proxy

Design §3 asks for "Completed interstellar expedition + colony charter".
CC-3 could only implement the charter half (the `interstellar_colonization`
research plus a Colony Ark hull), because expeditions lived entirely in the
client save: there was no row to count, so "completed an expedition" would
have been the client's word for it.

CC-4 gives expeditions a server record (prisma `Expedition`,
`src/lib/game/server-expeditions.ts`, created by
`POST /api/space-tycoon/expeditions` and advanced on the world clock by the
assets-complete cron). The gate is now the design's actual sentence — a
terminal-success expedition row **and** the charter — and both halves are
server facts. Balance effect: the tier-7 seat costs a real campaign
commitment (a $25B-$80B hull, ~266 game-months of mission for Proxima,
$13B of consumables) before its $2.4B project and $1.5B reserve are even
quotable. The rung stopped being reachable by anyone who merely parked a
Colony Ark in a hangar.

### 2. `expeditionReturnMult` had no server mirror

Every other HQ term is mirrored inside `computeServerMonthlyGrossDetailed`
through `headquarters.ts hqServiceRevenueMult`, because every other HQ term
lands on tick income. The expedition term does not: it lands on a one-shot
payout when a mission comes home, which the monthly-gross ceiling models not
at all. A returning Proxima explorer pays **$6.4B-$10.6B** of survey data
(×1.30 science cap, ×1.15 seat term → up to **$15.8B**) inside a single sync
window — and was being clamped away as implausible income. That is the same
failure that rejected real money twice the week CC-2 shipped.

The fix is symmetrical with the contract / timed-event / delivery credits:
`server-expeditions.ts creditDueExpeditionReturns` lifts the money ceiling
once per return, by exactly

    surveyPayout × EXPEDITION_SURVEY_SCIENCE_MULT_CAP (1.30) × hqExpeditionReturnMult(seat)

where `surveyPayout` is the figure **this server** stamped at arrival, rolled
from a seed **this server** issued at launch, and `hqExpeditionReturnMult` is
the single helper in `headquarters.ts` that the client tick also multiplies
by. The client supplies neither the ids nor the amounts, so a forged claim
gains nothing; `Expedition.creditedAt` makes each return credit exactly once;
and at most `MAX_EXPEDITION_CREDITS_PER_SYNC` (5) settle per sync.

### The interstellar rung, measured whole

`scripts/sim-hq-relocation.ts` now prices both halves. Service ledger, 24
game-months, outer-colony conglomerate (7 settled surfaces, $30B start):

| move at | seated from | cash stay | cash move | Δ cash | net/mo stay | net/mo move | outlay | payback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 19 | $41.35B | $38.01B | **−$3.34B (−8.1%)** | $408.7M | $506.0M | $3.90B | 40 mo |
| 6 | 24 | $41.35B | $37.52B | −$3.83B (−9.3%) | $408.7M | $412.6M | $3.90B | — |
| 12 | 30 | $41.35B | $37.49B | −$3.85B (−9.3%) | $408.7M | $412.6M | $3.90B | — |

Read that honestly: **the interstellar seat does not pay back inside 24
months, and it is not supposed to.** The project alone is 18 game-months, so
even the earliest mover is seated for five of the twenty-four; the +$97.3M
per month it gains once seated recovers the $3.90B outlay at month ~40. This
is the deepest rung on a campaign ladder and behaves like one — the same
shape as the deep-space rung (24 mo payback on a much larger revenue base),
one tier further out.

The expedition term is a campaign payout, so it is reported as a rate rather
than folded into a monthly table:

| seat | system | round trip | survey (seed roll) | seat adds | per game-month | rent/mo | months of rent per return |
| --- | --- | --- | --- | --- | --- | --- | --- |
| deep_space_hq | Proxima Centauri | 268 mo | $10.45B | $1.57B | $5.9M | $50.0M | 31.4 |
| deep_space_hq | Sirius A/B | 528 mo | $21.20B | $3.18B | $6.0M | $50.0M | 63.6 |
| interstellar_hq | Proxima Centauri | 268 mo | $10.45B | $1.57B | $5.9M | $20.0M | 78.4 |
| interstellar_hq | Sirius A/B | 528 mo | $21.20B | $3.18B | $6.0M | $20.0M | 159.0 |

So the expedition term is worth ~$5.9M per game-month of mission at either
seat — about 12% of the deep-space rent and 30% of the interstellar rent.
Material, never decisive: it does not rescue an unprofitable seat and it does
not make the move mandatory, which is the ±10-15% band working as intended.

### Numbers unchanged

No constant moved in this pass. `HQ_RELOCATION.interstellar_hq`
($2.4B / 18 mo), `HQ_SEAT_BASE_PRICE.interstellar_hq` ($1.5B reserve),
`HQ_UPKEEP_MONTHLY.interstellar_hq` ($20M/mo), `HQ_SEAT_COUNTS` (2) and the
`interstellar_hq` bonus profile (+15% colony-surface, +15% expedition) are
exactly as Pass 13 set them. The rung got a real gate and a real server
mirror, not a reprice.

### New money movement

- `expedition_launch` — the launch bill (procured exotic fuel at the 1.25×
  broker premium, $50M/game-month of consumables, optional hardened
  provisioning at 10% of hull, optional 8% insurance premium), now debited by
  the server and BURNED. It was always charged; CC-4 moved the payer of
  record from the client to the wallet, so it is a ledger row rather than a
  local subtraction. No change to the amount, and the Space Elevator's launch
  discount is applied server-side from the world's completed `MegaProject`
  rows rather than from a client claim.

### Watch

- **Resource samples still have no ceiling counterpart.** A return also
  delivers 20-60 units each of the destination's sample-worthy resources
  (`SAMPLE_WORTHY_RESOURCES`). `RESOURCE_CLAMP_MODE` is not `enforce`, so
  nothing rejects them today, and the audit in
  `docs/RESOURCE_CLAMP_FALSE_POSITIVE_AUDIT.md` should gain expedition
  samples as an eleventh legitimate inflow path before that flag is ever
  reconsidered.
- **Colony arks never reach a server terminal status on their own.** An ark
  holds station indefinitely by design, so its row stays `exploring` until
  the owner commits it to a colony and the client reports `colonized` (only
  accepted after the server's own arrival clock has passed). A player who
  sends an ark and never founds the colony never opens the interstellar rung
  — correct, but worth watching for confusion in the console copy.

## Pass 15 — mining Phase C (2026-09-13)

### What shipped (row C of `docs/SPACE_MINING_DESIGN_2026-09-12.md` §8)

The other half of founder ruling 1 (§9): **ore is a real intermediate that
must be hauled and refined**. Phase A made ore; Phase C turns it into
product at the field. With it: the **Refinery Barge**, the **Propellant
Depot Ship** with finite per-field slots, the **Survey Cruiser** and
**survey reports as sellable intelligence**.

Files: `ore-refining.ts`, `propellant-depots.ts`, `survey-reports.ts` (new,
pure), `mining-orders.ts` (mode `refine`, depot-covered fuel, sweep surveys),
`server-mining.ts` (refined settlement, depot rows, report rows, sweep
targets), `/api/space-tycoon/assets/mining` (ops `deploy_depot`,
`stock_depot`, `recall_depot`, `list_report`, `unlist_report`, `buy_report`,
and `order` with `mode: 'refine'`), `ships.ts` (three hulls + the
`refineOrePerHour` / `depotCapacity` / `surveySweep` fields),
`MiningPanel.tsx`, `prisma/schema.prisma`, `scripts/sim-mining.ts`
scenarios 7-9.

### Refining ratios, loss and timing

Ratios are authored at FULL recovery; a mobile plant recovers
`MOBILE_REFINERY_RECOVERY` = **0.82** of them (the loss factor: 18% slag,
boil-off and what a centrifuge in freefall cannot separate). A fixed
refinery would recover 0.95 — the constant exists so the two can never
drift, but no fixed refinery consumes ore yet.

| Ore | Process | Per 100 ore (full recovery) | Product mass per ore unit (barge) | Value ratio full | Value ratio at 0.82 |
| --- | --- | --- | --- | --- | --- |
| Carbonaceous (C) | Volatile cracking | 12 lunar water ice, 20 ammonia, 2 organic compounds | 0.279 | 1.83x | 1.71x |
| Silicate (S) | Silicate smelting | 18 steel ingots, 5 aluminium alloy | 0.189 | 1.86x | 1.53x |
| Metallic (M) | Carbonyl separation | 15 steel ingots, 1.6 platinum group, 1 gold | 0.144 | 2.05x | 1.40x |
| Exotic (X) | Exotic matrix separation | 5.5 exotic materials, 8 rare earth, 0.6 refined rare-earth oxides | 0.116 | 2.01x | 1.63x |

Every output is a resource the market **already** trades —
`resources.ts` is untouched by Phase C.

| Constant | Value | Meaning |
| --- | --- | --- |
| `MOBILE_REFINERY_RECOVERY` | 0.82 | the loss factor aboard a barge |
| `FIXED_REFINERY_RECOVERY` | 0.95 | reserved for a fixed refinery (not shipped) |
| `REFINE_OPEX_SHARE` | 0.06 | power/reagents/slag, as a share of the ORE's base price per unit processed. BURNED (`refining_opex`) — it scales with what is processed, never with what it sells for |
| `refineOrePerHour` | 1,200 (Refinery Barge) | plant throughput; extraction (140/h) is the bottleneck, not the plant |
| `REFINE_MAX_BATCH_HOURS` | 12 | no single order ties a hull up longer — refining lives on the daily loop, not the campaign loop |

**The hold is the point.** A refining hull's batch cap is `capacity ÷
product mass per ore unit` (and the 12-hour clamp): a 400-unit hold that
carries 400 units of metallic ore carries the concentrate of **2,771** ore
units instead — 6.9x the ore per trip home.

### The gate: refine at the field vs haul the rock home

One Refinery Barge, Inner Belt M rock, selling at Ceres, 12 months (a
6-month window truncates the ~12-hour refine cycle and would flatter the
short raw cycle for a reason that has nothing to do with the economics):

| Cycle | Trips home | Ore worked | Units sold | Revenue | Fuel | Refining opex | Net |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Haul raw ore home | 21 | 7,865 | 7,865 | $76.3M | $10.8M | — | $45.1M |
| **Refine at the field** | **6** | **8,108** | **1,135** | **$101.2M** | **$6.7M** | $4.9M | **$69.3M** |

**+$24.2M (1.54x) and a third of the trips.** The design's stated intent
holds: refine near the field, haul the product.

At Pass-14 **opening scarcity** the same comparison holds for C and M — both
recipes' outputs are belt-, lunar- and outer-origin goods that carry the same
3x band-capped premium their ore does (C: $241.0M refined vs $47.2M raw; M:
$152.8M vs $36.3M). **S-type is the documented exception**: silicate refines
to fabricated goods (flat 1.0x on the NPC curve), so on a fresh world raw
silicate ore is worth more than the steel it makes ($50.5M raw vs $32.7M
refined). That is a real market signal and is left in on purpose — silicate
refines to structural metal Earth already has, and the case for refining it
arrives as the ore market fills.

### Propellant depots

A depot pays the FIELD SIDE of every run its owner flies out of that field.

| Constant | Value |
| --- | --- |
| `DEPOT_SLOTS_PER_FIELD` | 2 (3 in the Frontier field, so a newcomer is never locked out of the only field they can reach) |
| `DEPOT_FUEL_VALUE_PER_UNIT` | $250K of propellant bill displaced per unit in the tank |
| `DEPOT_COVER_SHARE` | 0.60 of one order's fuel bill |
| tank | 5,000 units (Propellant Depot Ship, $340M, $700K/mo) |
| feedstock | rocket fuel 1.0, water ice 0.8, Martian water 0.8, methane 0.7, ammonia 0.5 propellant units per unit |

Cash restocking is priced at rocket-fuel spot x the field's delivery
multiplier, and that is the whole geography of the decision:

| Field | Slots | Cash $/unit | Burn displaced | Margin |
| --- | --- | --- | --- | --- |
| Near-Earth Cluster | 3 | $144K | $250K | +$106K |
| Inner Belt | 2 | $192K | $250K | +$58K |
| Ceres Approaches | 2 | $192K | $250K | +$58K |
| Jupiter Trojans | 2 | $252K | $250K | −$2K |
| Kuiper Fringe | 2 | $336K | $250K | −$86K |

Past the belt, cash restocking costs more than the burn it displaces —
**you crack local volatiles or you do without**, which is exactly the loop
C-type refining feeds (its water ice and ammonia are depot feedstock).

Twelve months, one Refinery Barge: at the Inner Belt a depot moves the cash
fuel bill $6.7M → $2.7M (covering $4.0M for $3.1M of restock) and still
loses $7.5M against $8.4M of upkeep — **a fleet-scale asset, not a
single-hull one**. On the Near-Earth Cluster, where the delivery multiplier
is lowest and the traffic heaviest, it covers $28.3M for $16.3M and clears
+$3.6M against upkeep before capex. Recalling a depot loses the tank.

### Survey reports

| Constant | Value |
| --- | --- |
| `REPORT_PRICE_MIN` | $250K |
| ceiling | min($50M, 8% of the rock's in-ground base value), never below $1M |
| suggested | 2% of in-ground base value — two thirds of the claim fee on the same rock, so knowing costs less than owning |
| `REPORT_BROKER_FEE` | 8%, BURNED (the gap between `survey_report_purchase` and `survey_report_sale`) |

A listing publishes the rock's **catalogue entry only** (name, field, class,
delta-v surcharge), the seller's corporation name, the price and how old the
intel is. Grade, reserve and risk stay hidden until someone pays. Buying
writes the buyer their own `AsteroidSurvey` row at the seller's generation —
identical intel, because you bought the survey, not a summary of it.

**Survey Cruiser payback** ($450M, $900K/mo, tier 4, `hyperspectral`): it
sweeps 6 rocks per 30-minute pass, ~40 rocks a game-month (a whole field),
for the fuel to get there. Revealing 40 rocks with probes would cost $240M a
month, so the hull repays itself in **1.9 months on survey cost alone**;
report sales are upside, not the case for the hull. At the suggested $1.7M
price for a median Inner Belt M rock, 2 sales a month clear $1.6M/month net
and 8 clear $10.9M.

### Gates

| Gate | Result |
| --- | --- |
| Solo barge cash-positive by month 3 (Phase A) | **+$859K**, unchanged |
| Blind barge still negative | unchanged |
| Best ship gross ÷ capex ≤ 1.5x the Basic Lunar Extractor | Phase A/B **0.65x**; Phase C **0.92x** at base prices, **1.35x** at opening scarcity |
| Claim pays only when contested (Pass 12) | unchanged |
| One escort does not pay for one miner (Pass 12) | unchanged |
| Refine-at-field beats haul-raw | **1.54x** over 12 months |

Scenario 2 (the three-ship hold + Hauler cycle) still does not beat two
returning miners, and Phase C does not change that: the Phase C answer to
"why would I ever haul rock" is the Refinery Barge, which replaces the raw
haul rather than feeding it. Transferring a miner's held ore to a separate
refinery or hauler hull is Phase D.

### Ledger reasons added

`refining_output` (+ resources — the ONLY path that turns ore into product
for a synced profile), `refining_sale` (+ money, kept separate from
`mining_order_sale` so raw and refined revenue are legible), `refining_opex`
(− money, burned), `depot_restock` (− money, burned), `depot_feedstock`
(− resources), `survey_report_purchase` (− money, buyer) and
`survey_report_sale` (+ money, seller). The broker's cut is the gap between
the last two.

### Risks / watch

- **The S-type inversion is intentional but unexplained in-game.** The
  Mining console shows the recipe and the prices; it does not say "do not
  bother refining silicate on a fresh world". If new players burn a
  Refinery Barge's month on S-type rocks, the fix is a console hint, not a
  ratio change.
- **Depot margins are geography, not tuning.** If `rocket_fuel` spot moves
  (it is a fabricated good with no NPC curve, so only player/NPC industry
  moves it), the Trojans and Kuiper margins move with it. Watch the first
  quarterly report for a field where cash restocking has quietly become
  free money.
- **A refine order is a 12-hour commitment.** That is the longest single
  order in the game outside construction. If telemetry shows players
  abandoning sessions mid-batch, lower `REFINE_MAX_BATCH_HOURS` rather than
  the throughput.

---

## Pass 17 — timed-event targets ask for new work (2026-09-14)

**File:** `src/lib/game/timed-events.ts`
**Guard:** `src/lib/game/__tests__/timed-events-targets.test.ts`

### The defect

`game-engine.ts` step 8 freezes `target: template.getTarget(state)` onto a
timed-event occurrence when it spawns, then compares
`template.getProgress(state)` against that frozen number on every subsequent
tick and credits `evt.rewardAmount` the moment `progress >= target`.

Seven of the 21 templates wrote a target that was a *fraction of the very
quantity `getProgress` reads* — or ignored state altogether. Those events were
already satisfied at the instant they spawned: the next tick paid the full
reward for zero player activity. The engine spawns an event every 2 hours up
to 3 concurrent, so an established corporation was collecting several free
payouts a day. The founder reported "a couple of contracts that paid out about
$500M" — `evt_precious_metals` at ×4 on a five-service income base is exactly
that number.

This was never a reward-magnitude problem. It was a target problem: the events
asked for nothing.

### What changed

Only `getTarget` (and, where the two sides measured different quantities,
`getProgress`). **No `rewardMultiplier` was touched** — reward magnitudes are
a separate decision.

| Template | × | Old target | Instant? | New target |
|---|---|---|---|---|
| `evt_iron_rush` | 2 | 50% of the **total** stockpile, vs progress reading iron alone | broken both ways — instant when iron was over half the pile, unreachable otherwise | `iron + max(150, 5%)` |
| `evt_water_collection` | 1.5 | `water × 0.4 + 30` | yes, above ~50 units | `water + max(40, 4%)` |
| `evt_precious_metals` | 4 | `(pt+au) × 0.3 + 5` | yes, from 8 units | `(pt+au) + max(25, 5%)` |
| `evt_construction_sprint` | 2.5 | `completed × 0.15 + 2` | yes, from 3 buildings | `completed + 3` |
| `evt_satellite_deploy` | 2 | `sats × 0.2 + 2` | yes, from 2 satellites | `sats + 3` |
| `evt_infrastructure_push` | 2 | `allBuildings × 0.1 + 1`, vs progress reading only the ground/solar/fab subset | yes, whenever infra exceeded a tenth of the estate | `infra + 2`, both sides on the same subset |
| `evt_research_marathon` | 3 | `completed × 0.08 + 1` | yes, from 2 techs | `completed + 2` |
| `evt_survey_expedition` | 1.5 | flat `1`, state ignored | yes, for anyone holding a built probe | `probes + 1` |

The remaining 13 templates were audited and left alone: `evt_rare_earth_hunt`
(restated through the shared helper, numerically identical), `evt_tech_diversity`,
`evt_revenue_surge`, `evt_profit_target`, `evt_earnings_streak`,
`evt_fleet_buildup`, `evt_mining_fleet`, `evt_new_frontier`,
`evt_multi_location`, `evt_hire_spree`, `evt_resource_hoarder`,
`evt_contract_completionist`, `evt_diversified_income`. Each already used a
delta (`current + n`) or a growth factor above 1.

### How the new figures were calibrated

One game-month is 6 real hours (`server-time.ts
REAL_SECONDS_PER_GAME_MONTH`), so a 4-hour window is 0.67 of any
`amountPerMonth` figure in `resources.ts MINING_PRODUCTION`. The already-sound
`evt_rare_earth_hunt` sets the house ratio: +15 rare earth over 6 hours is
~75% of one Asteroid Mining Rig's window output (20/game-month). The mining
targets follow it:

- **Iron** — an Asteroid Mining Rig yields 500/month, so 333 over the 4-hour
  window; a Mars Mining Operation yields 133. +150 is reachable on one rig and
  worth spinning up a second.
- **Water** — a Lunar Ice Mine yields 100/month, so 67 over 4 hours; +40 is
  ~60% of that. The growth term is a deliberately low 4% because water boils
  off at 2%/game-month (`consumption.ts VOLATILE_BOILOFF_PER_MONTH`) and a
  large stockpile is already shrinking ~1.3% inside the window.
- **Precious metals** — a rig yields pt 10 + au 15 = 25/month, so 33 over the
  8-hour window; +25 is the same 75%-of-one-rig ask as rare earth, over the
  longer window this ×4 payout deserves.

Build and research counts follow the wall-clock durations: tier-1/2 buildings
are 3-20 real minutes and `sat_*` are 4-15 (`buildings.ts realBuildSeconds`),
so +3 inside 4-6 hours is money-bound rather than time-bound; tier-1/2/3 techs
are 10/30/90 real minutes across two parallel slots
(`research-tree.ts TIER_RESEARCH_SECONDS`), so +2 in 8 hours is routine
mid-game. A deep-tier corporation queueing 4-hour (T4) or 12-hour (T5) techs
will sometimes let Research Marathon expire — intended, not a bug.

### The invariant, and the guard

**`getTarget(s)` must be strictly greater than `getProgress(s)` for every
reachable state.** Use `deltaTarget()` for counts and stockpiles, or a growth
factor above 1 for money-like quantities. Never a fraction of progress.

`timed-events-targets.test.ts` asserts `progress < target` for all 21
templates against three fixtures built from the real `GameState` — a fresh
corporation, an established mid-game corporation, and a late-game whale — plus
per-template checks that Iron Rush and Infrastructure Push measure the same
quantity on both sides. It also replays all eight *old* formulas against the
mid-game fixture and asserts each one would have paid instantly, so the
fixture is provably strong enough to have caught the original defect.

### Risks / watch

- **`evt_precious_metals` at ×4 is now the file's steepest ask and its richest
  payout.** With a real target it is defensible, but it is the multiplier to
  re-examine first if timed events read as the dominant income source in the
  next quarterly balance report.
- **`evt_hire_spree` (×1.5) and `evt_survey_expedition` (×1.5) are sound but
  cheap** — one hire, one $25M probe. Not instantly satisfiable, so out of
  scope for this pass, but they are the thinnest asks remaining.
- **No reward magnitude changed.** If the founder decides the payouts are too
  rich now that they must be earned, that edit is one field per template.


## Pass 18 — mining Phase D: ship fittings (2026-09-14)

Ship fittings (`ship-fittings.ts`) are the first thing in the game that changes
a hull's simulated capability for money, so the pricing has to answer three
questions at once: is a fit better value than another hull, is it better value
than doing nothing, and can a player buy their way past the design's
trade-offs.

### Pricing rule: a share of the hull, not a flat number

`fittingPrice = baseCost + hullShare x hull.baseCost`. A Focused Laser Cluster
is $20M + 28% of the hull, so $70M on a $180M Prospector Barge and $300M on a
$1B Deep Space Miner. A flat price would have been a rounding error on a
flagship and a mortgage on a barge; anchoring to the hull keeps the ROI of a
fit roughly constant across the whole roster and means the registry never needs
a per-hull price table.

The coefficients were set so a yield fitting costs about `hull x yield gain x
1.6`. On a barge: +25% rate for $70M against a hull that costs $180M for 100%
of that rate. A fit is therefore BETTER value per dollar than another hull —
which is the point of a fit — and the slot budget, not the price, is what stops
a player buying unlimited yield.

### The three brakes on "bolt everything on"

1. **Slot points.** The budget is the hull's own `moduleSlots` (mining/survey
   3 + tier, else 2 + tier). Every strong fitting costs 2 of them. A Prospector
   Barge has 5: a Bore Array (2) + Ore Hold (1) + Whipple Belt (1) + Ion Bank
   (1) is a complete, legal, opinionated build, and it is the LAST one — there
   is no room for a plant or a sensor on top.
2. **One per group.** Six exclusive groups. You pick an ice extractor OR a
   magnetic rake OR a bore array, never two, so the FIELD you intend to work is
   a fitting decision.
3. **Mass.** `FITTING_SLOT_FUEL_PENALTY` = 3% of the propellant bill per slot
   point, on every leg forever. A fully fitted barge burns 1.15x. Sized against
   the Phase A gate (a Near-Earth round trip is ~$1.5M against a ~$2.7M hold):
   3%/point costs a maxed rig roughly a sixth of a laser's gain in propellant —
   real friction, never a veto.

Ongoing: `FITTING_UPKEEP_SHARE` = 0.3% of the fit's price per game-month. The
Escort Cutter's own ratio is 0.23% ($600K on $260M); a bolted-on plant is
harder to service than a hull, so a shade higher. On a $70M laser that is
$210K/game-month against a ~$840K/game-month yield gain — a fit pays for its
own upkeep four times over, which it must, or nobody would ever fit anything.

### Yard economics

- Labour 10% of hardware, plus a flat **$5M visit fee**. The flat fee is what
  makes "one visit, fit everything" correct and slot-thrash wrong.
- **Salvage 35%** of book on anything removed — below book by design
  (a money sink, the same posture as `computeDecommissionRecovery`). A
  strip-only visit on a 2-slot head still pays OUT, because 35% of a
  $170M array clears the $5M fee comfortably; stripping is a real option, not a
  punishment.
- **900 s per slot point** plus the fitting's install hours. A 5-point refit is
  ~2-3 real hours — the DAILY loop (`docs/SESSION_DESIGN.md`): long enough to
  plan around, short enough to matter inside a session, and long enough that the
  sync mirror is always current before the fit goes live.

### Caps

Stacked effects are clamped (`FITTING_CLAMPS`): rate 0.40-2.20, hold 0.50-2.00,
plant 0.50-2.00, propellant 0.70-1.80, transit 0.75-1.30, shakedown odds
0.25-1.00, rubble wear 0.50-1.80. Mobile refinery recovery is capped at
**0.92**, deliberately below `FIXED_REFINERY_RECOVERY` (0.95) — a pod narrows
the fixed refinery's advantage, it never erases it. The shakedown floor
(`FITTING_HARDENING_FLOOR` 0.25) means no fit buys immunity from the Corsairs;
armour and an escort stack, and the escort remains the larger term.

### Measured

`server-monthly-gross.test.ts` "margin report" on a maximally favourable belt
cycle (grade 1.5 M-type, sell on return):

| Fit | rate x | hold x | propellant x | $/game-month actually sold |
|---|---|---|---|---|
| bare | 1.00 | 1.00 | 1.00 | $12.8M |
| Focused Laser Cluster | 1.25 | 1.00 | 1.03 | $15.9M |
| Deep Bore Array | 1.60 | 0.90 | 1.06 | $20.2M |
| Ore Compactor | 1.00 | 1.70 | 1.15 | $12.9M |
| Bore Array + Ore Hold | 1.52 | 1.25 | 1.09 | $19.4M |

Two things to read off it. First, **the Compactor is not a yield fitting** — a
bigger hold buys fewer trips, not more units per hour, and on this cycle it is
worth ~1% while costing 15% more propellant. That is correct and intended: the
hold matters on long lanes and hold-then-haul patterns, not on a short belt
cycle, and a player who fits it for yield has made a mistake the numbers will
teach them. Second, the best single fit is +58% over bare for ~$175M on a $180M
hull — better than a second barge (+100% for $180M plus $400K/mo upkeep and a
second crew), which is the intended ordering: fits beat hulls at the margin,
until the slots run out.

### Risks / watch

- **The Compactor and the Gravimetric Boom are the two fittings most likely to
  read as traps.** Both are 2 slots and both pay off only in patterns the
  current sim does not cover well (long-lane hauling; field-wide survey
  sweeps). Re-check them against the next quarterly report before re-pricing.
- **The per-class heads (ice extractor / magnetic rake) are the strongest
  design idea here and the least tested in play.** They make a fit a bet on a
  FIELD, and a player who works mixed fields is punished for specialising. If
  telemetry shows nobody fits them, the class spreads (±50/±12) are the dials.
- **Yield fittings raise the money ceiling's mining-fleet allowance.** That
  term is 15.5x-15.9x above the real cycle, which is loose on purpose (it bounds
  continuous extraction on the dearest reachable ore). Tightening it is only
  safe once the `hold`+`return` pattern's real duty cycle is measured.
