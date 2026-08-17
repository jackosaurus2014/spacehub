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
