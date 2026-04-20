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
