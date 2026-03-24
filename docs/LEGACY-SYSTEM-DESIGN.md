# Legacy System Design Document
## Space Tycoon -- Permanent Progression Without Resets

**Status:** Design Specification (Research Complete)
**Replaces:** Prestige system (`src/lib/game/prestige.ts`)
**Date:** 2026-03-24

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Research Summary](#2-research-summary)
3. [System Overview](#3-system-overview)
4. [Legacy Milestone Definitions (40 milestones)](#4-legacy-milestone-definitions)
5. [Infinite / Stretch Legacies](#5-infinite--stretch-legacies)
6. [Bonus Stacking & Diminishing Returns](#6-bonus-stacking--diminishing-returns)
7. [GameState Field Additions](#7-gamestate-field-additions)
8. [Engine Integration](#8-engine-integration)
9. [UI Panel Design](#9-ui-panel-design)
10. [Migration Path](#10-migration-path)
11. [Balance Validation](#11-balance-validation)

---

## 1. Design Philosophy

The current prestige system requires players to **reset all progress** to gain permanent bonuses. This is a standard pattern in idle/incremental games (Cookie Clicker, Adventure Capitalist, Egg Inc.) but it conflicts with Space Tycoon's core identity: players build a persistent, growing space empire in a shared-time universe. Resetting that empire destroys the emotional investment in infrastructure, fleets, and expansion.

**The Legacy System replaces prestige with a "compounding achievement" model:**

- Progress is **never lost**. Buildings, research, fleets, and territory remain.
- Permanent bonuses are earned by **reaching milestones** within normal gameplay.
- Bonuses compound over time, creating the same "each hour is more productive than the last" feeling that prestige provides, but without the psychological cost of a reset.
- Late-game players unlock infinite stretch legacies with logarithmic scaling, giving them something to chase forever.

This approach draws from:
- **Borderlands 2's Badass Ranks:** Permanent stat bonuses from completing challenges, no reset.
- **Magic Research 2's Quest Permanents:** Permanent bonuses retained from class leveling across runs.
- **Mass Effect 1's Achievement Bonuses:** In-game mechanical rewards tied to achievements.
- **Realm Grinder's Trophies:** Permanent unlocks that persist through all reincarnations.

The key insight from these systems: the bonus must feel **earned through play mastery**, not merely through patience. Each legacy milestone should represent a real accomplishment the player can point to.

---

## 2. Research Summary

### 2.1 How Idle/Tycoon Games Handle Permanent Progression

| Game | Mechanic | Reset Required? | Currency | Bonus Type |
|------|----------|----------------|----------|------------|
| Cookie Clicker | Heavenly Chips | Yes (Ascension) | Heavenly Chips = f(total cookies) | Multiplicative CpS, permanent upgrades |
| Adventure Capitalist | Angel Investors | Yes (Reset) | Angels = f(lifetime earnings) | +2% profit per angel, multiplicative |
| Egg Inc. | Soul Eggs + Prophecy Eggs | Yes (Prestige) | SE = f(lifetime earnings), PE from contracts | SE: additive (+10% each), PE: multiplicative (x1.05 per PE on all SE) |
| Realm Grinder | Trophies + Reincarnation | Yes (Reincarnation) | Trophies (permanent), Faction Coins | Trophies: permanent additive bonuses |
| Idle Miner Tycoon | Per-Mine Prestige | Partial (single mine) | Prestige multiplier | Multiplicative income per mine |
| Borderlands 2 | Badass Ranks | **No** | Badass Tokens | Small permanent stat boosts |
| Mass Effect 1 | Achievement Bonuses | **No** | Achievements | Permanent passive boosts |

**Key takeaway:** The no-reset model (Badass Ranks, ME1 achievements) works when bonuses are individually small but collectively powerful, and when the conditions require genuine varied play.

### 2.2 Diminishing Returns Best Practices

From Kongregate's "Math of Idle Games" and game balance literature:

- **Additive bonuses within a category, multiplicative across categories.** This is the gold standard. Each legacy bonus adds to its category total (e.g., all revenue legacies sum), then the category total multiplies with other bonus sources (workforce, research, upgrades). This prevents any single source from being trivially powerful while still rewarding investment across all systems.
- **Logarithmic scaling for infinite progression:** `bonus = base * ln(1 + count * k)` provides the satisfying "always growing, never broken" curve. The natural log means doubling your count does NOT double your bonus -- each additional unit is worth less.
- **Soft caps, not hard caps.** Hard caps feel punishing. Soft caps (via diminishing returns curves) let players keep progressing while naturally limiting power.
- **Common multiplier bases:** Cookie Clicker uses 1.15x cost scaling; Clicker Heroes uses 1.07x. For bonuses, the 1.02-1.10 range per source is standard for additive stacking.

### 2.3 Endgame Scaling Patterns

Egg Inc. provides the best model for two-layer scaling:
- **Soul Eggs (additive layer):** Each adds +10% to earnings. Getting 1000 SE = +10,000% = 100x multiplier.
- **Prophecy Eggs (multiplicative layer):** Each multiplies the per-SE bonus by 1.05x. With 50 PE, each SE gives +10% * 1.05^50 = +10% * 11.47 = +114.7% per SE.

This two-layer system means:
- Early game: collecting more SE (additive) is the primary driver.
- Late game: PE (multiplicative) becomes the dominant driver, but requires SE as a base.

**Applied to Space Tycoon:** Fixed milestones are the "Soul Egg" layer (additive). Infinite stretch legacies are the "Prophecy Egg" layer (multiplicative amplifier on the fixed bonuses).

---

## 3. System Overview

### 3.1 Core Concepts

**Legacy Milestone:** A one-time achievement that permanently grants a bonus. 40 fixed milestones across 4 tiers. Once earned, never lost.

**Legacy Tier:** Milestones are grouped into 4 tiers reflecting game progression phase:
- **Tier 1 -- Pioneer (10 milestones):** Earth orbit and early expansion. Bonuses are small but immediate.
- **Tier 2 -- Colonist (10 milestones):** Moon and Mars era. Bonuses become significant.
- **Tier 3 -- Admiral (10 milestones):** Outer solar system. Bonuses unlock new multiplicative categories.
- **Tier 4 -- Architect (10 milestones):** Endgame mastery. Largest individual bonuses.

**Legacy Power (LP):** A visible score summing all earned legacy bonuses. Purely cosmetic/leaderboard. Not a currency -- bonuses apply automatically.

**Stretch Legacies:** 6 infinite-scaling milestones with logarithmic diminishing returns. These give endgame players an eternal carrot.

### 3.2 Bonus Categories

All legacy bonuses fall into one of 6 categories that map to existing game systems:

| Category | What It Affects | Stacking Method |
|----------|----------------|-----------------|
| `revenue` | Service income multiplier | Additive within category |
| `buildSpeed` | Construction time reduction | Additive within category |
| `researchSpeed` | Research time reduction | Additive within category |
| `miningOutput` | Resource extraction rate | Additive within category |
| `costReduction` | Building/research cost discount | Additive within category |
| `crewCapacity` | Extra workforce slots | Flat additive |

Each category has a **soft cap** applied via a convergent formula before being used as a multiplier in the engine (see Section 6).

---

## 4. Legacy Milestone Definitions

### Tier 1 -- Pioneer (10 milestones)

| # | ID | Name | Trigger Condition | Bonus Type | Bonus Value | Description |
|---|-----|------|-------------------|------------|-------------|-------------|
| 1 | `legacy_first_launch` | First Launch | Complete first building in LEO | `revenue` | +3% | "Your first satellite marks the dawn of an empire." |
| 2 | `legacy_orbit_trio` | Orbital Trio | 3 completed buildings in any orbit | `buildSpeed` | +3% | "Assembly lines in zero-G run faster with experience." |
| 3 | `legacy_first_research` | Knowledge Seeker | Complete 5 research projects | `researchSpeed` | +3% | "Your R&D labs develop institutional memory." |
| 4 | `legacy_first_billion` | First Billion | Accumulate $1B total earned | `revenue` | +3% | "Capital attracts capital." |
| 5 | `legacy_geo_expansion` | Geostationary Presence | Unlock GEO orbit | `revenue` | +2% | "Premium orbital slots pay premium dividends." |
| 6 | `legacy_five_services` | Service Network | 5 active services simultaneously | `revenue` | +3% | "A diversified portfolio hedges against downturns." |
| 7 | `legacy_first_mine` | Prospector | Mine 100 units of any resource | `miningOutput` | +5% | "Strike the first vein, and more will follow." |
| 8 | `legacy_first_crew` | Crew Commander | Hire 3 total workforce members | `crewCapacity` | +2 slots | "A skeleton crew is all you need to start." |
| 9 | `legacy_ten_buildings` | Builder | Complete 10 buildings total | `buildSpeed` | +3% | "Each construction teaches the next." |
| 10 | `legacy_first_contract` | Contractor | Complete 3 contracts | `costReduction` | +2% | "Government contracts offset overhead." |

### Tier 2 -- Colonist (10 milestones)

| # | ID | Name | Trigger Condition | Bonus Type | Bonus Value | Description |
|---|-----|------|-------------------|------------|-------------|-------------|
| 11 | `legacy_lunar_ops` | Lunar Operations | Complete 3 buildings on Lunar Surface | `miningOutput` | +5% | "Lunar regolith hides valuable resources." |
| 12 | `legacy_twenty_research` | Research Director | Complete 20 research projects | `researchSpeed` | +5% | "Your scientists stand on the shoulders of giants." |
| 13 | `legacy_ten_billion` | Ten Billion | Accumulate $10B total earned | `revenue` | +4% | "Your brand name alone opens doors." |
| 14 | `legacy_mars_footprint` | Martian Footprint | Unlock Mars Surface | `buildSpeed` | +4% | "Interplanetary construction expertise." |
| 15 | `legacy_fleet_commander` | Fleet Commander | Own 5 ships (built) | `costReduction` | +3% | "Bulk purchasing brings fleet discounts." |
| 16 | `legacy_resource_baron` | Resource Baron | Hold 500+ units of 3 different resources | `miningOutput` | +5% | "Diversified mining operations compound yields." |
| 17 | `legacy_twenty_buildings` | Mega Developer | Complete 25 buildings total | `buildSpeed` | +4% | "Prefab modules cut construction time." |
| 18 | `legacy_ten_services` | Service Conglomerate | 10 active services simultaneously | `revenue` | +4% | "Network effects amplify every new service." |
| 19 | `legacy_asteroid_ops` | Belt Operator | Complete a building in the Asteroid Belt | `miningOutput` | +6% | "Asteroid mining is the backbone of expansion." |
| 20 | `legacy_full_crew` | Full Complement | 10+ total workforce members | `crewCapacity` | +3 slots | "A trained crew is your greatest asset." |

### Tier 3 -- Admiral (10 milestones)

| # | ID | Name | Trigger Condition | Bonus Type | Bonus Value | Description |
|---|-----|------|-------------------|------------|-------------|-------------|
| 21 | `legacy_hundred_billion` | Hundred Billion | Accumulate $100B total earned | `revenue` | +5% | "At this scale, money generates money." |
| 22 | `legacy_jupiter_reach` | Jovian Reach | Unlock Jupiter System | `researchSpeed` | +5% | "Jupiter's radiation labs accelerate breakthroughs." |
| 23 | `legacy_forty_research` | Chief Scientist | Complete 40 research projects | `researchSpeed` | +5% | "Your research department runs itself." |
| 24 | `legacy_fifty_buildings` | Infrastructure Titan | Complete 50 buildings total | `buildSpeed` | +5% | "Autonomous construction drones online." |
| 25 | `legacy_fleet_admiral` | Fleet Admiral | Own 10 ships (built) | `costReduction` | +4% | "A massive fleet commands supplier discounts." |
| 26 | `legacy_resource_magnate` | Resource Magnate | Hold 1000+ units of 5 different resources | `miningOutput` | +7% | "Vertical integration maximizes extraction." |
| 27 | `legacy_saturn_frontier` | Saturn Frontier | Unlock Saturn System | `revenue` | +5% | "Titan's hydrocarbons fuel a new economy." |
| 28 | `legacy_twenty_services` | Service Titan | 20 active services simultaneously | `revenue` | +5% | "Your services are the solar system's backbone." |
| 29 | `legacy_trillion` | Trillionaire | Accumulate $1T total earned | `costReduction` | +5% | "At trillion-dollar scale, nothing is expensive." |
| 30 | `legacy_master_crew` | Master Crew | 20+ total workforce members | `crewCapacity` | +4 slots | "Your crew trains the next generation." |

### Tier 4 -- Architect (10 milestones)

| # | ID | Name | Trigger Condition | Bonus Type | Bonus Value | Description |
|---|-----|------|-------------------|------------|-------------|-------------|
| 31 | `legacy_outer_system` | Outer Reach | Unlock Outer System | `researchSpeed` | +6% | "The frontier pushes science forward." |
| 32 | `legacy_all_locations` | Solar Cartographer | Unlock all 11 base locations | `revenue` | +6% | "Your network spans the solar system." |
| 33 | `legacy_sixty_research` | Polymath | Complete 60 research projects | `researchSpeed` | +6% | "Cross-discipline synergies emerge." |
| 34 | `legacy_hundred_buildings` | Megastructure | Complete 100 buildings total | `buildSpeed` | +6% | "Self-replicating construction swarms." |
| 35 | `legacy_ten_trillion` | Ten Trillionaire | Accumulate $10T total earned | `revenue` | +6% | "Your empire's GDP rivals nations." |
| 36 | `legacy_resource_emperor` | Resource Emperor | Hold 5000+ units of 7 different resources | `miningOutput` | +8% | "Every asteroid is a gold mine." |
| 37 | `legacy_fleet_sovereign` | Fleet Sovereign | Own 20 ships (built) | `costReduction` | +5% | "Your armada builds its own replacements." |
| 38 | `legacy_all_base_research` | Omniscient | Complete all base research (37+) | `researchSpeed` | +8% | "There are no more unknowns -- only applications." |
| 39 | `legacy_thirty_services` | Galactic Provider | 30 active services simultaneously | `revenue` | +7% | "Your services are synonymous with civilization." |
| 40 | `legacy_endgame_crew` | Legion | 30+ total workforce members | `crewCapacity` | +5 slots | "Your workforce is a civilization unto itself." |

### Summary: Total Bonus from All 40 Fixed Milestones

| Category | Total Additive Bonus | Effective Multiplier |
|----------|---------------------|---------------------|
| `revenue` | +53% | 1.53x |
| `buildSpeed` | +25% | 1.25x (25% faster) |
| `researchSpeed` | +38% | 1.38x (38% faster) |
| `miningOutput` | +36% | 1.36x |
| `costReduction` | +19% | 0.81x costs |
| `crewCapacity` | +14 slots | 14 extra crew |

These totals are designed so that a player who has completed every fixed milestone has strong but not game-breaking advantages. Revenue at 1.53x is meaningful but sits below the 2x threshold where content becomes trivial. Combined with existing systems (workforce max +50%, research bonuses, upgrades), the stacked total stays within the 3-4x range for any single stat -- powerful but not runaway.

---

## 5. Infinite / Stretch Legacies

Six infinite milestones provide endgame players with permanent goals. Each can be completed unlimited times with escalating requirements and logarithmic bonus scaling.

### 5.1 Definitions

| ID | Name | Trigger (Level N) | Bonus Type | Formula | Description |
|----|------|--------------------|------------|---------|-------------|
| `stretch_revenue` | Revenue Dynasty | Earn $(10B * 5^N) total | `revenue` | `5% * ln(1 + N * 0.5)` | "Each era of earnings compounds your legacy." |
| `stretch_buildings` | Construction Dynasty | Complete (25 * N) additional buildings | `buildSpeed` | `4% * ln(1 + N * 0.5)` | "Your methods become industry standards." |
| `stretch_research` | Knowledge Dynasty | Complete (15 * N) additional research | `researchSpeed` | `4% * ln(1 + N * 0.5)` | "Institutional knowledge accelerates discovery." |
| `stretch_mining` | Mining Dynasty | Mine (5000 * N) total resource units | `miningOutput` | `5% * ln(1 + N * 0.5)` | "Every mine teaches the next." |
| `stretch_contracts` | Contract Dynasty | Complete (10 * N) additional contracts | `costReduction` | `3% * ln(1 + N * 0.5)` | "Your negotiators get better with practice." |
| `stretch_fleet` | Fleet Dynasty | Accumulate (10 * N) total ship-build completions | `crewCapacity` | `floor(2 * ln(1 + N * 0.5))` slots | "Fleet expansion demands more crew." |

### 5.2 Scaling Curve Analysis

The formula `base% * ln(1 + N * 0.5)` produces these values:

| Level (N) | ln(1 + N*0.5) | Revenue Bonus (5% * ...) | Cumulative Revenue |
|-----------|---------------|--------------------------|-------------------|
| 1 | 0.405 | +2.0% | +2.0% |
| 2 | 0.693 | +3.5% | +5.5% |
| 3 | 0.916 | +4.6% | +10.1% |
| 5 | 1.253 | +6.3% | +22.3% |
| 10 | 1.792 | +9.0% | +58.4% |
| 20 | 2.398 | +12.0% | +133.9% |
| 50 | 3.258 | +16.3% | +441.9% |
| 100 | 3.932 | +19.7% | ~+1050% |

At stretch level 100 (an extreme endgame), the stretch revenue bonus adds roughly +1050% total. Combined with the fixed milestone 53%, total legacy revenue bonus would be roughly +1103%, or an 12x multiplier. This is significant but:
- Reaching stretch level 100 in revenue requires earning $10B * 5^100 -- an astronomically large number.
- The requirements scale exponentially while the bonuses scale logarithmically.
- In practice, most active players will reach stretch level 10-20, contributing +58-134% additional bonus.

### 5.3 Requirements Growth

Revenue Dynasty example (trigger = $10B * 5^N total earned):

| Level | Total Earned Required | Jump From Previous |
|-------|----------------------|-------------------|
| 1 | $50B | -- |
| 2 | $250B | 5x |
| 3 | $1.25T | 5x |
| 5 | $31.25T | -- |
| 10 | $97.7 Quadrillion | -- |

The 5x geometric growth in requirements versus logarithmic bonus growth ensures the system never becomes "grindable to broken."

---

## 6. Bonus Stacking & Diminishing Returns

### 6.1 Stacking Architecture

The game currently applies bonuses from multiple sources multiplicatively in the engine tick:

```
finalRevenue = baseRevenue
  * eventMultiplier           // random events (temporary)
  * upgradeBoost              // building upgrade level
  * (1 + workforceRevenue)    // workforce operators/engineers
  * (1 + researchBonus)       // completed research
  * prestigeRevMult           // CURRENTLY: prestige level
  * supplyMult                // server-side supply/demand
```

**Legacy replaces `prestigeRevMult` with `legacyRevenueMult`.**

The new stacking order:

```
finalRevenue = baseRevenue
  * eventMultiplier
  * upgradeBoost
  * (1 + workforceRevenue)
  * (1 + researchBonus)
  * legacyRevenueMult          // NEW: replaces prestige
  * supplyMult
```

### 6.2 Computing Legacy Multipliers

For each bonus category, the legacy multiplier is computed as:

```typescript
function getLegacyMultiplier(category: LegacyBonusCategory, legacyState: LegacyState): number {
  // 1. Sum all fixed milestone bonuses for this category
  let additiveTotal = 0;
  for (const milestoneId of legacyState.completedMilestones) {
    const def = LEGACY_MILESTONE_MAP.get(milestoneId);
    if (def && def.bonusCategory === category) {
      additiveTotal += def.bonusValue;
    }
  }

  // 2. Sum all stretch legacy bonuses for this category
  const stretchDef = STRETCH_LEGACIES.find(s => s.bonusCategory === category);
  if (stretchDef) {
    const level = legacyState.stretchLevels[stretchDef.id] || 0;
    for (let n = 1; n <= level; n++) {
      additiveTotal += stretchDef.basePercent * Math.log(1 + n * 0.5);
    }
  }

  // 3. Apply soft cap via convergent function
  // Raw bonus is in percentage points (e.g., 53 means +53%)
  // Soft cap formula: effective = cap * (1 - e^(-raw / cap))
  // This converges to `cap` as raw grows, with no hard cutoff.
  const CAP = getCategoryCap(category);
  const rawFraction = additiveTotal / 100; // Convert percentage to fraction
  const effective = CAP * (1 - Math.exp(-rawFraction / CAP));

  // 4. Return as multiplier
  if (category === 'costReduction') {
    return 1 - effective; // Cost reduction: 0.19 effective -> 0.81x costs
  }
  return 1 + effective; // Revenue: 0.53 effective -> 1.53x revenue
}
```

### 6.3 Soft Cap Values Per Category

| Category | Soft Cap (asymptote) | Rationale |
|----------|---------------------|-----------|
| `revenue` | 5.0 (500%) | Revenue can scale high because costs also scale. Prevents >6x from legacy alone. |
| `buildSpeed` | 2.0 (200%) | Buildings 3x faster at cap. Beyond this, construction becomes instant and meaningless. |
| `researchSpeed` | 2.0 (200%) | Same logic as buildSpeed. |
| `miningOutput` | 3.0 (300%) | Mining is capped by what you can sell/use; higher ceiling is fine. |
| `costReduction` | 0.6 (60% off) | Never more than 60% cost reduction; preserves economic decisions. |
| `crewCapacity` | 30 slots | Hard cap on extra slots; building capacity still limits actual hiring. |

**Soft cap behavior example (revenue, cap=5.0):**

| Raw Legacy Bonus | Effective Multiplier | % of Cap Used |
|-----------------|---------------------|---------------|
| +53% (all fixed) | 1.48x | 10% |
| +100% | 1.91x | 18% |
| +200% | 2.66x | 33% |
| +500% | 3.94x | 59% |
| +1000% | 4.77x | 75% |
| +2000% | 4.98x | 99% |

This exponential decay soft cap means:
- Fixed milestones deliver most of their stated value (53% raw -> 48% effective, minimal loss).
- Early stretch levels feel rewarding (each adds meaningful %).
- Deep endgame stretch levels still add something, but cannot break the game.

### 6.4 Interaction with Existing Systems

Full revenue multiplier chain at theoretical maximum:

| Source | Max Multiplier | Type |
|--------|---------------|------|
| Building upgrades (Elite) | 1.75x | Per-building |
| Workforce (operators) | 1.50x | Additive, capped |
| Research bonuses | 1.50x (est.) | Additive, capped |
| Legacy (all fixed + stretch 20) | ~2.5x | Soft-capped |
| Random events | 1.30x (temporary) | Multiplicative |
| Supply multiplier | 0.5x - 2.0x | Server-driven |

Worst-case stacked maximum (no supply penalty, favorable event):
`1.75 * 1.5 * 1.5 * 2.5 * 1.3 = ~12.8x`

This is high but achievable only at extreme endgame with full optimization across all systems. A typical mid-game player might see 1.3 * 1.2 * 1.2 * 1.3 * 1.0 = ~2.4x, which is healthy.

---

## 7. GameState Field Additions

### 7.1 New Interface: LegacyState

```typescript
export interface LegacyState {
  /** IDs of completed fixed legacy milestones */
  completedMilestones: string[];

  /** Stretch legacy levels: stretchId -> current level (0 = not started) */
  stretchLevels: Record<string, number>;

  /** Cached cumulative resource/stat counters for stretch tracking */
  trackers: {
    totalResourcesMined: number;       // Sum of all resources ever mined
    totalContractsCompleted: number;   // Lifetime contracts completed
    totalShipsBuilt: number;           // Lifetime ships built to completion
    totalBuildingsCompleted: number;   // Lifetime buildings completed
  };

  /** Legacy Power score (cosmetic, sum of all milestone values) */
  legacyPower: number;

  /** Display tier name derived from highest earned tier */
  displayTier: 'Pioneer' | 'Colonist' | 'Admiral' | 'Architect' | 'Legend';
}
```

### 7.2 GameState Changes

In `types.ts`, replace the `prestige` field:

```typescript
// REMOVE:
prestige?: { level: number; legacyPoints: number; permanentBonuses: { ... } };

// ADD:
legacy?: LegacyState;
```

Default value in `save-load.ts`:

```typescript
legacy: {
  completedMilestones: [],
  stretchLevels: {},
  trackers: {
    totalResourcesMined: 0,
    totalContractsCompleted: 0,
    totalShipsBuilt: 0,
    totalBuildingsCompleted: 0,
  },
  legacyPower: 0,
  displayTier: 'Pioneer',
},
```

### 7.3 Lifetime Trackers

The stretch legacies require tracking cumulative statistics that the current GameState does not fully capture. New fields in `trackers`:

- **`totalResourcesMined`**: Incremented every time a resource is produced (mining services + ship mining). Currently, `resources` only tracks current inventory, not lifetime production.
- **`totalContractsCompleted`**: Already tracked as `completedContracts.length`, but we need a counter that persists even if the array is trimmed.
- **`totalShipsBuilt`**: Count of ships that have completed construction, lifetime.
- **`totalBuildingsCompleted`**: Count of buildings that have reached `isComplete: true`, lifetime. Existing `stats.satellitesDeployed + stats.stationsBuilt` only counts two categories. Need a universal count.

These trackers are incremented in the engine tick alongside existing stat tracking. They are never decremented.

---

## 8. Engine Integration

### 8.1 New File: `src/lib/game/legacy.ts`

This file will contain:

1. **`LEGACY_MILESTONES`**: Array of 40 fixed milestone definitions (id, name, tier, bonusCategory, bonusValue, check function, description, icon).
2. **`STRETCH_LEGACIES`**: Array of 6 infinite milestone definitions (id, name, bonusCategory, basePercent, requirementFormula, bonusFormula).
3. **`checkLegacyMilestones(state: GameState): string[]`**: Returns IDs of newly completed milestones.
4. **`checkStretchLegacies(state: GameState): Record<string, number>`**: Returns updated stretch levels.
5. **`getLegacyBonuses(legacy: LegacyState)`**: Computes all 6 category bonuses with soft caps applied. Returns object with `revenueMultiplier`, `buildSpeedMultiplier`, `researchSpeedMultiplier`, `miningMultiplier`, `costMultiplier`, `bonusCrewCapacity`.
6. **`getLegacyPower(legacy: LegacyState): number`**: Computes display score.
7. **`getLegacyDisplayTier(legacy: LegacyState): string`**: Returns tier name.

### 8.2 Changes to `game-engine.ts`

In `processTick()`:

**Replace prestige bonus extraction (line ~58):**

```typescript
// BEFORE:
const prestige = state.prestige || { ... };
const prestigeRevMult = prestige.permanentBonuses?.revenueMultiplier || 1;
const prestigeMiningMult = prestige.permanentBonuses?.miningMultiplier || 1;

// AFTER:
const legacy = state.legacy || DEFAULT_LEGACY;
const legacyBonuses = getLegacyBonuses(legacy);
const legacyRevMult = legacyBonuses.revenueMultiplier;
const legacyMiningMult = legacyBonuses.miningMultiplier;
const legacyBuildSpeedMult = legacyBonuses.buildSpeedMultiplier;
const legacyResearchSpeedMult = legacyBonuses.researchSpeedMultiplier;
const legacyCostMult = legacyBonuses.costMultiplier;
```

**Apply legacy build speed (construction completion, ~line 118):**

```typescript
const effectiveDuration = (bld.realDurationSeconds || 0) / (buildBoostMult * legacyBuildSpeedMult);
```

**Apply legacy research speed (research progress, ~line 140):**

```typescript
const researchSpeedMult = (1 + wfBonuses.researchSpeed)
  * (1 + resBonuses.researchSpeedBonus)
  * legacyResearchSpeedMult
  * researchBoostMult;
```

**Apply legacy mining multiplier (resource production, ~line 197):**

```typescript
const miningMult = (1 + wfBonuses.miningOutput) * (1 + resBonuses.miningOutputBonus) * legacyMiningMult;
```

**Apply legacy revenue multiplier (service revenue, ~line 87):**

Replace `prestigeRevMult` with `legacyRevMult` in the revenue calculation.

**Apply legacy cost reduction (maintenance/building costs):**

Multiply maintenance and operating costs by `legacyCostMult`.

**Update trackers (after resource production and building completion):**

```typescript
// After resource production loop:
let newResourcesMined = 0;
// ... (count resources added this tick)
legacy.trackers.totalResourcesMined += newResourcesMined;

// After building completion:
const newCompletions = buildings.filter((b, i) => b.isComplete && !state.buildings[i]?.isComplete).length;
legacy.trackers.totalBuildingsCompleted += newCompletions;
```

### 8.3 Changes to `processFullTick()`

Add a new step (after achievements check, before timed events):

```typescript
// 7b. Check legacy milestones (every 5 ticks, same cadence as achievements)
try {
  if (tickCount === 0) {
    const legacy = { ...(newState.legacy || DEFAULT_LEGACY) };
    const newMilestones = checkLegacyMilestones(newState);
    const newStretchLevels = checkStretchLegacies(newState);

    if (newMilestones.length > 0 || Object.keys(newStretchLevels).length > 0) {
      const legacyEvents: typeof newState.eventLog = [];

      for (const milestoneId of newMilestones) {
        const def = LEGACY_MILESTONE_MAP.get(milestoneId);
        if (def) {
          legacy.completedMilestones.push(milestoneId);
          legacyEvents.push({
            id: generateId(),
            date: newState.gameDate,
            type: 'milestone',
            title: `Legacy Milestone: ${def.name}`,
            description: `${def.description} (+${def.bonusValue}% ${def.bonusCategory})`,
          });
        }
      }

      for (const [stretchId, newLevel] of Object.entries(newStretchLevels)) {
        legacy.stretchLevels[stretchId] = newLevel;
        // Event only for major levels (5, 10, 25, 50, 100...)
        if (newLevel % 5 === 0 || newLevel <= 3) {
          legacyEvents.push({
            id: generateId(),
            date: newState.gameDate,
            type: 'milestone',
            title: `Stretch Legacy Level ${newLevel}!`,
            description: `Your dynasty grows stronger.`,
          });
        }
      }

      legacy.legacyPower = getLegacyPower(legacy);
      legacy.displayTier = getLegacyDisplayTier(legacy);

      newState = {
        ...newState,
        legacy,
        eventLog: [...legacyEvents, ...newState.eventLog].slice(0, MAX_EVENT_LOG),
      };
    }
  }
} catch (err) {
  console.error('Legacy check error (non-fatal):', err);
}
```

### 8.4 Changes to `workforce.ts`

In `getCrewCapacity()`, add legacy bonus crew slots:

```typescript
export function getCrewCapacity(
  completedBuildingCount: number,
  unlockedLocationCount: number,
  completedResearchCount: number,
  legacyBonusCrew: number = 0,  // NEW PARAMETER
): { total: number; perType: number; breakdown: ... } {
  // ... existing logic ...

  // Add legacy bonus crew capacity
  if (legacyBonusCrew > 0) {
    breakdown.push({ source: 'Legacy milestones', amount: legacyBonusCrew });
  }

  const total = base + buildingCap + locationCap + researchCap + legacyBonusCrew;
  // ...
}
```

---

## 9. UI Panel Design

### 9.1 Panel Location

Add a **"Legacy"** tab to the `GameTab` type (between `contracts` and `alliance`). Icon: a shield with a star. The tab becomes visible once the player completes their first legacy milestone.

### 9.2 Panel Layout

```
+------------------------------------------------------------------+
|  LEGACY                                           Power: 847 LP  |
|  Tier: Admiral                                                    |
+------------------------------------------------------------------+
|                                                                   |
|  [=== BONUS SUMMARY BAR ===]                                     |
|  Revenue: +48%  |  Build: +22%  |  Research: +31%                |
|  Mining: +29%   |  Cost: -16%   |  Crew: +9 slots               |
|                                                                   |
+------------------------------------------------------------------+
|  MILESTONE TREE                                        [Filter v] |
|                                                                   |
|  --- TIER 1: PIONEER (7/10) ---                                  |
|                                                                   |
|  [*] First Launch        [*] Orbital Trio      [*] Knowledge...  |
|   +3% Revenue             +3% Build Speed       +3% Research     |
|                                                                   |
|  [*] First Billion       [*] GEO Presence      [*] Service Net  |
|   +3% Revenue             +2% Revenue           +3% Revenue     |
|                                                                   |
|  [*] Prospector          [ ] Crew Commander     [ ] Builder      |
|   +5% Mining              +2 Crew Slots          +3% Build Speed |
|                                                                   |
|  [ ] Contractor                                                   |
|   +2% Cost Reduction     Need: 3 contracts                       |
|                                                                   |
|  --- TIER 2: COLONIST (3/10) ---                                 |
|  ...                                                              |
|                                                                   |
|  --- STRETCH LEGACIES ---                                        |
|                                                                   |
|  Revenue Dynasty     Lv.4   [====------] 67% to Lv.5            |
|   +8.2% bonus               Need: $31.25T earned ($19T / $31T)  |
|                                                                   |
|  Construction Dyn.   Lv.2   [==--------] 24% to Lv.3            |
|   +4.8% bonus               Need: 75 buildings (42/75)          |
|                                                                   |
+------------------------------------------------------------------+
```

### 9.3 Visual Design Details

**Milestone Cards:**
- Completed: Gold border, filled star icon, faded slightly to show "done."
- In-progress: White border, empty star, progress indicator showing % toward trigger.
- Locked (tier not yet reachable): Gray border, lock icon, requirement shown on hover.

**Tier Headers:**
- Show completion fraction (7/10).
- Completing all 10 in a tier triggers a special "Tier Complete" animation and awards a bonus title.
- Tier title colors: Pioneer=Bronze, Colonist=Silver, Admiral=Gold, Architect=Platinum, Legend=Diamond (for stretch mastery).

**Stretch Legacy Bars:**
- Horizontal progress bars with current level prominently displayed.
- Shows exact progress toward next level (e.g., "$19T / $31T earned").
- Each level-up triggers a brief celebration animation.

**Bonus Summary Bar:**
- Always visible at top of panel.
- Each stat shows the effective (post-soft-cap) value, color-coded:
  - Green: Bonus active and growing.
  - Gold: Near soft cap region (>60% of cap consumed).
  - Dimmed: No bonus yet in this category.

### 9.4 Tooltip System

Hovering over any milestone shows:
- Full description text.
- Exact trigger condition with current progress.
- Bonus amount and category.
- Which other milestones are in the same bonus category (helps player plan).

Hovering over a bonus category in the summary bar shows:
- Breakdown: list of all contributing milestones + stretch levels.
- Raw vs. effective (soft-capped) value.
- Current multiplier this produces in the engine.

---

## 10. Migration Path

### 10.1 Data Migration (in `save-load.ts` `loadGame()`)

```typescript
// Migrate prestige -> legacy
if (state.prestige && !state.legacy) {
  const prestigeLevel = state.prestige.level || 0;

  // Convert prestige level into pre-completed legacy milestones.
  // Each prestige level = unlock the next N milestones in order.
  // This ensures prestige veterans don't lose their permanent bonuses.
  const milestonesPerPrestige = 4; // 4 milestones per prestige level
  const totalToGrant = Math.min(prestigeLevel * milestonesPerPrestige, 40);

  const milestonesToGrant: string[] = [];
  for (let i = 0; i < totalToGrant && i < LEGACY_MILESTONES.length; i++) {
    milestonesToGrant.push(LEGACY_MILESTONES[i].id);
  }

  // Convert legacy points into stretch legacy levels
  // Each 15 legacy points = 1 stretch level distributed round-robin
  const legacyPoints = state.prestige.legacyPoints || 0;
  const totalStretchLevels = Math.floor(legacyPoints / 15);
  const stretchLevels: Record<string, number> = {};
  const stretchIds = STRETCH_LEGACIES.map(s => s.id);
  for (let i = 0; i < totalStretchLevels; i++) {
    const id = stretchIds[i % stretchIds.length];
    stretchLevels[id] = (stretchLevels[id] || 0) + 1;
  }

  state.legacy = {
    completedMilestones: milestonesToGrant,
    stretchLevels,
    trackers: {
      totalResourcesMined: Object.values(state.resources || {}).reduce((a, b) => a + b, 0),
      totalContractsCompleted: (state.completedContracts || []).length,
      totalShipsBuilt: (state.ships || []).filter(s => s.isBuilt).length,
      totalBuildingsCompleted: state.buildings.filter(b => b.isComplete).length,
    },
    legacyPower: 0, // Will be recalculated
    displayTier: 'Pioneer',
  };

  // Recalculate power and tier
  state.legacy.legacyPower = getLegacyPower(state.legacy);
  state.legacy.displayTier = getLegacyDisplayTier(state.legacy);

  // Remove old prestige field (keep for one version as backup)
  // state.prestige = undefined; // Uncomment after one release cycle
}
```

### 10.2 Bonus Equivalence Check

A prestige level 5 player currently has:
- Revenue: 1.0 + 5*0.1 = 1.5x
- Build speed: 1.0 + 5*0.05 = 1.25x
- Research speed: 1.0 + 5*0.05 = 1.25x
- Mining: 1.0 + 5*0.1 = 1.5x
- Starting money: $500M + 5*$100M = $1B

Migration grants them 20 milestones (5 * 4). Looking at the first 20 milestones:
- Revenue: 3+3+2+3+4+4 = +19% = 1.19x
- Build speed: 3+4+3+4 = +14% = 1.14x
- Research speed: 3+5 = +8% = 1.08x
- Mining: 5+5+5+6 = +21% = 1.21x
- Cost reduction: 2+3 = +5%
- Crew capacity: +5 slots

The migration gives **slightly less** than the prestige bonuses for revenue and research speed. This is intentional -- the old prestige required a painful reset; the new system grants these bonuses permanently with no further resets, AND the player can immediately begin earning more milestones through normal play. The net result over a few days of play will exceed their old prestige bonuses.

### 10.3 Removing Prestige UI

1. Remove the prestige button/panel from the UI.
2. Remove `canPrestige()` and `calculatePrestigeRewards()` from `prestige.ts` (or deprecate the file).
3. Keep the `prestige.ts` file for one release cycle as a reference.
4. Add a one-time in-game notification: "Your prestige bonuses have been converted to the new Legacy system. Your progress is now permanent -- no more resets needed."

### 10.4 Starting Money Handling

The old prestige system increased starting money ($500M + level * $100M). Since the new system has no resets, starting money is irrelevant for existing players. For new players, the starting money remains at `STARTING_MONEY` ($100M). The legacy cost reduction bonus serves a similar economic purpose (reducing costs = effectively having more money).

---

## 11. Balance Validation

### 11.1 Progression Pacing Targets

| Player Phase | Days Played | Expected Milestones | Legacy Revenue Mult |
|-------------|-------------|--------------------|--------------------|
| Brand new | 0-1 | 1-3 (Tier 1) | 1.03-1.09x |
| Early game | 1-5 | 4-8 (Tier 1) | 1.09-1.15x |
| Mid game | 5-14 | 9-16 (Tier 1+2) | 1.15-1.25x |
| Late game | 14-30 | 17-28 (Tier 2+3) | 1.25-1.40x |
| Endgame | 30-60 | 29-40 (Tier 3+4) | 1.40-1.53x |
| Post-endgame | 60+ | 40 + stretch 1-10 | 1.53-2.0x |

These targets ensure:
- New players get their first legacy bonus within the first play session (First Launch).
- A milestone is earned approximately every 1-2 days for the first month.
- There is always something to work toward.
- The bonus ramp is gentle enough to not invalidate earlier content.

### 11.2 Anti-Trivialization Guards

1. **Additive within category, multiplicative across:** Prevents any single system from dominating.
2. **Soft caps (exponential decay):** Even with infinite stretch levels, no category can exceed its cap.
3. **Exponential requirement growth:** Stretch requirements grow at 5x per level, making deep levels extremely time-intensive.
4. **Cost reduction capped at 60%:** Players always pay at least 40% of base costs, preserving economic tension.
5. **Crew capacity hard capped at +30:** Building infrastructure still limits actual hiring.
6. **No revenue multiplier exceeds 5x from legacy alone:** Even at extreme endgame, legacy revenue multiplier converges to 5x.

### 11.3 Comparison to Old Prestige

| Metric | Old Prestige (Level 10) | New Legacy (All 40 + Stretch 10) |
|--------|------------------------|----------------------------------|
| Revenue mult | 2.0x | ~2.5x (soft-capped) |
| Build speed | 1.5x | ~1.5x |
| Research speed | 1.5x | ~1.5x |
| Mining mult | 2.0x | ~2.3x |
| Resets required | 10 | 0 |
| Time to achieve | ~40+ hours of repeated resets | ~30-45 days of natural play |

The new system is comparable in power to a prestige-10 player but requires zero resets and rewards varied play instead of repetitive reset grinding.

---

## Appendix A: Full Milestone Check Functions (Pseudocode)

```typescript
// Tier 1
legacy_first_launch:     s.buildings.some(b => b.isComplete && b.locationId === 'leo')
legacy_orbit_trio:        s.buildings.filter(b => b.isComplete && ['leo','geo','lunar_orbit','mars_orbit'].includes(b.locationId)).length >= 3
legacy_first_research:   s.completedResearch.length >= 5
legacy_first_billion:    s.totalEarned >= 1_000_000_000
legacy_geo_expansion:    s.unlockedLocations.includes('geo')
legacy_five_services:    s.activeServices.length >= 5
legacy_first_mine:       s.legacy.trackers.totalResourcesMined >= 100
legacy_first_crew:       totalWorkforce(s.workforce) >= 3
legacy_ten_buildings:    s.buildings.filter(b => b.isComplete).length >= 10
legacy_first_contract:   (s.completedContracts?.length || 0) >= 3

// Tier 2
legacy_lunar_ops:        s.buildings.filter(b => b.isComplete && b.locationId === 'lunar_surface').length >= 3
legacy_twenty_research:  s.completedResearch.length >= 20
legacy_ten_billion:      s.totalEarned >= 10_000_000_000
legacy_mars_footprint:   s.unlockedLocations.includes('mars_surface')
legacy_fleet_commander:  (s.ships?.filter(sh => sh.isBuilt).length || 0) >= 5
legacy_resource_baron:   Object.values(s.resources || {}).filter(q => q >= 500).length >= 3
legacy_twenty_buildings: s.buildings.filter(b => b.isComplete).length >= 25
legacy_ten_services:     s.activeServices.length >= 10
legacy_asteroid_ops:     s.buildings.some(b => b.isComplete && b.locationId === 'asteroid_belt')
legacy_full_crew:        totalWorkforce(s.workforce) >= 10

// Tier 3
legacy_hundred_billion:  s.totalEarned >= 100_000_000_000
legacy_jupiter_reach:    s.unlockedLocations.includes('jupiter_system')
legacy_forty_research:   s.completedResearch.length >= 40
legacy_fifty_buildings:  s.buildings.filter(b => b.isComplete).length >= 50
legacy_fleet_admiral:    (s.ships?.filter(sh => sh.isBuilt).length || 0) >= 10
legacy_resource_magnate: Object.values(s.resources || {}).filter(q => q >= 1000).length >= 5
legacy_saturn_frontier:  s.unlockedLocations.includes('saturn_system')
legacy_twenty_services:  s.activeServices.length >= 20
legacy_trillion:         s.totalEarned >= 1_000_000_000_000
legacy_master_crew:      totalWorkforce(s.workforce) >= 20

// Tier 4
legacy_outer_system:     s.unlockedLocations.includes('outer_system')
legacy_all_locations:    s.unlockedLocations.length >= 11
legacy_sixty_research:   s.completedResearch.length >= 60
legacy_hundred_buildings: s.buildings.filter(b => b.isComplete).length >= 100
legacy_ten_trillion:     s.totalEarned >= 10_000_000_000_000
legacy_resource_emperor: Object.values(s.resources || {}).filter(q => q >= 5000).length >= 7
legacy_fleet_sovereign:  (s.ships?.filter(sh => sh.isBuilt).length || 0) >= 20
legacy_all_base_research: s.completedResearch.length >= 37
legacy_thirty_services:  s.activeServices.length >= 30
legacy_endgame_crew:     totalWorkforce(s.workforce) >= 30
```

## Appendix B: Legacy Power Score Calculation

```typescript
function getLegacyPower(legacy: LegacyState): number {
  let power = 0;

  // Fixed milestones: 10 LP per Tier 1, 25 per Tier 2, 50 per Tier 3, 100 per Tier 4
  const tierPoints: Record<number, number> = { 1: 10, 2: 25, 3: 50, 4: 100 };
  for (const id of legacy.completedMilestones) {
    const def = LEGACY_MILESTONE_MAP.get(id);
    if (def) power += tierPoints[def.tier] || 10;
  }

  // Stretch legacies: 15 LP per level
  for (const level of Object.values(legacy.stretchLevels)) {
    power += level * 15;
  }

  return power;
}

function getLegacyDisplayTier(legacy: LegacyState): string {
  const completed = legacy.completedMilestones;
  const t4Count = completed.filter(id => LEGACY_MILESTONE_MAP.get(id)?.tier === 4).length;
  const t3Count = completed.filter(id => LEGACY_MILESTONE_MAP.get(id)?.tier === 3).length;
  const t2Count = completed.filter(id => LEGACY_MILESTONE_MAP.get(id)?.tier === 2).length;
  const totalStretch = Object.values(legacy.stretchLevels).reduce((a, b) => a + b, 0);

  if (totalStretch >= 50 && t4Count >= 10) return 'Legend';
  if (t4Count >= 5) return 'Architect';
  if (t3Count >= 5) return 'Admiral';
  if (t2Count >= 5) return 'Colonist';
  return 'Pioneer';
}
```

---

## Research Sources

- [Heavenly Chips -- Cookie Clicker Wiki](https://cookieclicker.fandom.com/wiki/Heavenly_Chips)
- [Angel Investors -- AdVenture Capitalist Wiki](https://adventure-capitalist.fandom.com/wiki/Angel_Investors)
- [Prestige -- Egg Inc Wiki](https://egg-inc.fandom.com/wiki/Prestige)
- [Soul Eggs -- Egg Inc Wiki](https://egg-inc.fandom.com/wiki/Earnings_Bonus/Soul_Eggs)
- [Eggs of Prophecy -- Egg Inc Wiki](https://egg-inc.fandom.com/wiki/Egg_of_Prophecy)
- [Reincarnation -- Realm Grinder Wiki](https://realm-grinder.fandom.com/wiki/Reincarnation)
- [Prestige -- Idle Miner Tycoon Wiki](https://idleminertycoon.fandom.com/wiki/Prestige)
- [The Math of Idle Games, Part I -- Kongregate](https://blog.kongregate.com/the-math-of-idle-games-part-i/)
- [The Math of Idle Games, Part III -- Gamedeveloper](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii)
- [Diminishing Returns: The Logarithm -- Filler](https://blog.nerdbucket.com/diminishing-returns-in-game-design-the-logarithm/article)
- [Diminishing Returns: Exponential Decay -- Filler](https://blog.nerdbucket.com/diminishing-returns-in-game-design-exponential-decay-and-convergent-series/article)
- [Persistent Systems in Game Design -- Game Wisdom](https://game-wisdom.com/critical/persistent-game-design)
- [7 Progression Systems Every Developer Should Study -- Gamedeveloper](https://www.gamedeveloper.com/design/7-progression-and-event-systems-that-every-developer-should-study)
- [Balancing Tips: Idle Idol -- Gamedeveloper](https://www.gamedeveloper.com/design/balancing-tips-how-we-managed-math-on-idle-idol)
- [Additive vs Multiplicative Bonuses -- Paradox Forums](https://forum.paradoxplaza.com/forum/threads/additive-bonuses-vs-multiplicative-bonuses.1144836/)
- [Super Managers -- Idle Miner Tycoon Wiki](https://idleminertycoon.fandom.com/wiki/Super_Managers)
- [Idle Games With Prestige -- Popcorn Games](https://popcorngames.io/en/blogs/idle-games-with-prestige)
- [Crafting Compelling Idle Games -- DesignTheGame](https://www.designthegame.com/learning/tutorial/crafting-compelling-idle-games)
