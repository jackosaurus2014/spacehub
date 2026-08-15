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
