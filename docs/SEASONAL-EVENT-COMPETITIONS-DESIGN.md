# Seasonal Event Competitions -- Implementation Design

**Version:** 1.0
**Date:** 2026-03-23
**Status:** Design Complete -- Pending Implementation
**Author:** Game Design Research

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Event Calendar System](#2-event-calendar-system)
3. [Fresh-Start Mechanics](#3-fresh-start-mechanics)
4. [Season Type Designs (5 Seasons)](#4-season-type-designs)
5. [Bracket/Tier System](#5-brackettier-system)
6. [Intra-Event Progression](#6-intra-event-progression)
7. [Reward Structure](#7-reward-structure)
8. [Event Economy](#8-event-economy)
9. [Main Game Integration](#9-main-game-integration)
10. [Anti-Gaming Measures](#10-anti-gaming-measures)
11. [Database Schema (Prisma)](#11-database-schema-prisma)
12. [API Endpoints & Scheduling](#12-api-endpoints--scheduling)
13. [UI Design](#13-ui-design)
14. [Notification System](#14-notification-system)
15. [Implementation Phases](#15-implementation-phases)

---

## 1. Executive Summary

Seasonal Event Competitions are 2-4 week asynchronous competitive events that run alongside the main Space Tycoon game. Each event creates a **separate, fresh-start sandbox** where all players begin from zero with event-specific mechanics, objectives, and scoring. Events rotate through five themed seasons on a fixed calendar.

### Design Pillars

- **Never Take Away:** Main game progress is never touched. Events are additive.
- **Participation Rewards:** Every player who joins earns something. Only the magnitude scales with performance.
- **Multiple Categories:** Each event has 4-6 scoring categories so different playstyles can win.
- **Async-First:** No real-time coordination required. Players progress on their own schedule.
- **Fresh Start Equality:** Event progress is isolated. A day-1 player competes fairly with a $1T veteran.

### Why Events Matter

Events solve three critical problems:
1. **Engagement decay** -- Endgame players with $1T+ have nothing new to chase.
2. **New player intimidation** -- Fresh-start mechanics give newcomers a fair competitive arena.
3. **Content novelty** -- Each season introduces unique mechanics not in the base game.

---

## 2. Event Calendar System

### 2.1 Annual Calendar

The event calendar follows a **fixed rotation** with predictable timing. Each calendar year contains **8 events** across 5 season types, with gap weeks for rest.

```
Year Layout (52 weeks):

Week 01-03:  Asteroid Rush (3 weeks)
Week 04:     GAP (off-week, event rewards distributed)
Week 05-07:  Mars Colony Race (3 weeks)
Week 08:     GAP
Week 09-11:  Solar Storm Crisis (3 weeks)
Week 12:     GAP
Week 13-16:  Helium-3 Gold Rush (4 weeks) -- MAJOR EVENT
Week 17:     GAP
Week 18-20:  Fleet Command (3 weeks)
Week 21:     GAP
Week 22-24:  Asteroid Rush (3 weeks) -- Season variant
Week 25:     GAP
Week 26-28:  Mars Colony Race (3 weeks) -- Season variant
Week 29:     GAP
Week 30-33:  Solar Storm Crisis (4 weeks) -- MAJOR EVENT
Week 34:     GAP
Week 35-37:  Helium-3 Gold Rush (3 weeks)
Week 38:     GAP
Week 39-42:  Fleet Command (4 weeks) -- MAJOR EVENT
Week 43:     GAP
Week 44-47:  GRAND CHAMPIONSHIP (4 weeks) -- All-season mashup
Week 48:     GAP (rewards + offseason)
Week 49-52:  OFFSEASON (no events, holiday break)
```

### 2.2 Season Rotation Constants

```typescript
const EVENT_CALENDAR = {
  SEASONS_PER_YEAR: 5,
  EVENTS_PER_YEAR: 9,           // 8 regular + 1 grand championship
  STANDARD_DURATION_WEEKS: 3,   // 21 days
  MAJOR_DURATION_WEEKS: 4,      // 28 days
  GAP_BETWEEN_EVENTS_DAYS: 7,
  OFFSEASON_WEEKS: 4,           // End of year break
  REGISTRATION_OPENS_HOURS: 72, // 3 days before event starts
  LATE_JOIN_CUTOFF_DAYS: 5,     // Can join up to 5 days after start
};
```

### 2.3 Event Lifecycle

Each event passes through these phases:

| Phase | Duration | Description |
|-------|----------|-------------|
| **ANNOUNCED** | 7 days before | Event appears in UI, rules visible, no registration |
| **REGISTRATION** | 72 hours before | Players can register, see brackets |
| **ACTIVE** | 2-4 weeks | Competition is live, scores accumulate |
| **LATE_JOIN** | First 5 days of ACTIVE | Latecomers can still register (with catch-up) |
| **FINAL_SPRINT** | Last 3 days of ACTIVE | Score multiplier 1.25x, heightened urgency |
| **TALLYING** | 2 hours after end | Final scores computed, rankings locked |
| **REWARDS** | 24 hours | Players claim rewards from event results screen |
| **ARCHIVED** | Permanent | Historical record, viewable but not playable |

### 2.4 Event Phase Transition Schedule

```typescript
function getEventPhase(event: SeasonalEvent, now: Date): EventPhase {
  const msUntilStart = event.startDate.getTime() - now.getTime();
  const msUntilEnd = event.endDate.getTime() - now.getTime();
  const msSinceStart = now.getTime() - event.startDate.getTime();
  const totalDuration = event.endDate.getTime() - event.startDate.getTime();

  if (msUntilStart > 7 * DAY_MS) return 'SCHEDULED';
  if (msUntilStart > 72 * HOUR_MS) return 'ANNOUNCED';
  if (msUntilStart > 0) return 'REGISTRATION';
  if (msUntilEnd > 0) {
    if (msSinceStart < 5 * DAY_MS) return 'LATE_JOIN'; // Still accepting entries
    if (msUntilEnd < 3 * DAY_MS) return 'FINAL_SPRINT';
    return 'ACTIVE';
  }
  if (-msUntilEnd < 2 * HOUR_MS) return 'TALLYING';
  if (-msUntilEnd < 25 * HOUR_MS) return 'REWARDS';
  return 'ARCHIVED';
}
```

---

## 3. Fresh-Start Mechanics

### 3.1 Separate Event State

Events use a **completely separate game state** (`EventGameState`) that is independent from the player's main `GameState`. The main game continues running while the event is active -- players switch between them via a tab.

```typescript
interface EventGameState {
  // Mirrors GameState but scoped to the event
  eventId: string;
  profileId: string;

  // Event-specific starting conditions
  money: number;           // Event starting cash (varies by season type)
  resources: Record<string, number>;
  buildings: EventBuildingInstance[];
  completedResearch: string[];
  activeResearch: ActiveResearch | null;
  activeServices: ServiceInstance[];
  unlockedLocations: string[];
  ships: ShipInstance[];
  workforce: WorkforceState;

  // Event-specific fields
  eventScore: number;
  categoryScores: Record<string, number>; // Per-category breakdown
  milestonesReached: string[];
  lastTickAt: number;
  totalPlayTimeMs: number;  // Real time spent in event

  // Modifiers specific to this event
  eventModifiers: EventModifier[];
}
```

### 3.2 What Carries Over vs. What Resets

| Aspect | Main Game | Event |
|--------|-----------|-------|
| Money | Untouched | Fresh start (event-specific amount) |
| Buildings | Untouched | Zero, must build from scratch |
| Research | Untouched | Subset available, starts at zero |
| Resources | Untouched | Event-specific starter kit |
| Ships | Untouched | Zero |
| Workforce | Untouched | Zero |
| Locations | Untouched | Event-specific subset unlocked |
| Prestige bonuses | Active in main | **NOT active** in events |
| Cosmetics | N/A | Visible (titles/badges display in event leaderboard) |
| Alliance membership | Active | Alliance bonus applies (small, capped at 5%) |

### 3.3 Accelerated Timescale

Events compress the full game loop into 2-4 weeks. Everything is faster:

```typescript
const EVENT_TIME_MODIFIERS = {
  buildSpeedMultiplier: 4.0,      // Buildings complete 4x faster
  researchSpeedMultiplier: 4.0,   // Research completes 4x faster
  miningRateMultiplier: 3.0,      // Resources accumulate 3x faster
  revenueMultiplier: 2.0,         // Services earn 2x revenue
  locationUnlockDiscount: 0.5,    // Locations cost 50% less to unlock
  tickIntervalMs: 1000,           // Ticks every 1s instead of 2s
};
```

These multipliers mean a player can realistically reach mid-to-late game content within a 3-week event, even with casual play (30 minutes/day).

### 3.4 Event-Specific Tech Trees

Each event type has a **pruned research tree** with 12-18 technologies (versus the full 37+). This focuses decision-making on the event's theme.

```typescript
interface EventTechTree {
  seasonType: SeasonType;
  availableResearch: string[];     // IDs from the main RESEARCH array
  modifiedCosts: Record<string, { moneyCost: number; timeSec: number }>;
  eventExclusiveResearch: EventResearch[]; // 2-3 unique techs per season
}
```

---

## 4. Season Type Designs

### 4.1 Asteroid Rush (Mining Season)

**Theme:** The asteroid belt has entered a rich orbital phase. Rare metal concentrations are at an all-time high. Companies race to extract maximum value.

**Duration:** 3 weeks (21 days)

**Starting Conditions:**
- Cash: $200M
- Locations unlocked: Earth Surface, LEO, Asteroid Belt (pre-unlocked)
- Starting resources: 100 iron, 50 aluminum, 20 titanium
- Available research: 15 technologies (mining-focused subtree)

**Scoring Categories (6):**

| Category | Weight | Metric | Description |
|----------|--------|--------|-------------|
| Total Resources Mined | 30% | Sum of all resource units mined during event | Core objective |
| Rare Metals Mined | 20% | platinum_group + gold units | High-value extraction |
| Mining Infrastructure | 15% | Mining buildings completed | Investment in capacity |
| Trade Volume | 15% | Total $ value of market trades | Market participation |
| Fleet Size | 10% | Mining ships built and operational | Fleet strength |
| Speed to First Asteroid Base | 10% | Time (in hours) to first completed asteroid building | Early execution bonus |

**Composite Score Formula:**
```
eventScore = (totalResourcesMined / topResourcesMined * 300) +
             (rareMetalsMined / topRareMetals * 200) +
             (miningBuildings / topMiningBuildings * 150) +
             (tradeVolume / topTradeVolume * 150) +
             (fleetSize / topFleetSize * 100) +
             (speedBonus * 100)

where speedBonus = clamp(1.0 - (hoursToFirstBase / 72), 0, 1)
```

**Unique Event Mechanics:**
- **Asteroid Discovery System:** Mining ships have a 5% chance per hour to discover a "rich vein" that yields 3x resources for 4 hours.
- **Claim Stakes:** Players can claim up to 3 asteroid sectors. Claimed sectors yield 20% more but require a 1-hour cooldown between claims.
- **Mining Fever Events:** Every 48 hours, a random resource has a 2x mining rate for 6 hours (announced 1 hour before).

**Event-Exclusive Research (3):**
1. **Deep Core Drilling** -- +50% mining output, costs $500M, takes 30 min
2. **Ore Refinery Optimization** -- Mined resources sell for 25% more on market, costs $800M, takes 45 min
3. **Autonomous Mining Swarm** -- Mining ships operate 2x faster, costs $2B, takes 1.5 hr

---

### 4.2 Mars Colony Race (Building Season)

**Theme:** The first permanent Mars colonies are being established. Companies compete to build the most developed and efficient Mars settlement.

**Duration:** 3 weeks (21 days)

**Starting Conditions:**
- Cash: $500M
- Locations unlocked: Earth Surface, LEO, Mars Orbit, Mars Surface (pre-unlocked)
- Starting resources: 200 iron, 100 aluminum, 50 titanium, 100 mars_water
- Available research: 16 technologies (building/infrastructure-focused)

**Scoring Categories (6):**

| Category | Weight | Metric | Description |
|----------|--------|--------|-------------|
| Mars Buildings Completed | 25% | Number of Mars-location buildings built | Settlement size |
| Colony Population Score | 20% | Habitats built * workforce hired | Colony viability |
| Mars Services Active | 20% | Revenue-generating services on Mars | Economic development |
| Research Completed | 15% | Event tech tree completion % | Technological edge |
| Self-Sufficiency Score | 10% | % of resources produced locally vs imported | Colony independence |
| Speed to First Habitat | 10% | Time to first Mars habitat completion | Pioneer bonus |

**Composite Score Formula:**
```
eventScore = (marsBuildings / topMarsBuildings * 250) +
             (populationScore / topPopScore * 200) +
             (marsServices / topMarsServices * 200) +
             (researchPct * 150) +
             (selfSufficiency * 100) +
             (speedBonus * 100)

where populationScore = habitatsBuilt * (engineers + scientists + miners + operators)
      selfSufficiency = localResourceProduction / totalResourceConsumption
      speedBonus = clamp(1.0 - (hoursToFirstHabitat / 96), 0, 1)
```

**Unique Event Mechanics:**
- **Dust Storm System:** Random dust storms reduce solar farm output by 50% for 12 hours (every 3-5 days). Players with backup power systems (research unlock) are unaffected.
- **Colony Milestones:** First player to reach 5, 10, 15, 20 Mars buildings gets a permanent event score bonus (+25, +50, +75, +100).
- **Supply Chain Challenge:** Imported resources cost 2x market price. Local production is king.
- **Terraform Points:** Certain building combinations (habitat + solar + water extraction) earn bonus "terraform points" that add to total score.

**Event-Exclusive Research (3):**
1. **ISRU Processing** -- Mars buildings cost 30% fewer imported resources, $400M, 20 min
2. **Radiation Shielding** -- Habitats support 2x workforce capacity, $1B, 40 min
3. **Atmospheric Processing** -- Unlocks unique "Atmospheric Harvester" building (produces methane on Mars), $3B, 1.5 hr

---

### 4.3 Solar Storm Crisis (Energy Management Season)

**Theme:** A once-in-a-century solar storm is approaching. Companies must survive the crisis by managing energy, protecting assets, and capitalizing on the chaos.

**Duration:** 3 weeks (21 days), with escalating storm phases

**Starting Conditions:**
- Cash: $300M
- Locations unlocked: Earth Surface, LEO, GEO, Lunar Orbit (pre-unlocked)
- Starting resources: 80 iron, 40 aluminum, 30 titanium, 50 lunar_water
- Starting buildings: 2 solar farms (LEO), 1 ground station (pre-built)
- Available research: 14 technologies (energy/defense-focused)

**Storm Phase Timeline:**

| Phase | Days | Effect |
|-------|------|--------|
| Calm Before Storm | Days 1-5 | Normal operations. Build up defenses. |
| Warning Phase | Days 6-8 | Solar activity +50%. Energy output up, but risk building. |
| Storm Phase 1 | Days 9-12 | Solar farms produce 2x but satellites have 10% failure/hr |
| Storm Phase 2 | Days 13-16 | CRITICAL: Unshielded buildings lose 5% output/hr. Energy demand +100%. |
| Storm Phase 3 | Days 17-19 | PEAK: Unshielded satellites go offline. Shielded assets produce 3x energy revenue. |
| Recovery | Days 20-21 | Storm passes. Offline assets slowly recover. Bonus points for surviving fleet. |

**Scoring Categories (6):**

| Category | Weight | Metric | Description |
|----------|--------|--------|-------------|
| Assets Surviving Storm | 25% | % of buildings still operational after storm peak | Defensive success |
| Energy Revenue During Storm | 25% | Total energy service revenue during storm phases | Crisis profiteering |
| Shielded Asset Count | 15% | Buildings with storm shielding upgrades | Preparation score |
| Revenue Stability | 15% | Lowest monthly revenue / highest monthly revenue | Consistency |
| Emergency Contracts Completed | 10% | Special crisis contracts fulfilled | Responsiveness |
| Recovery Speed | 10% | Hours to full operational status after storm peak | Resilience |

**Composite Score Formula:**
```
eventScore = (survivalPct * 250) +
             (stormRevenue / topStormRevenue * 250) +
             (shieldedAssets / topShieldedAssets * 150) +
             (revenueStability * 150) +
             (emergencyContracts / topEmergencyContracts * 100) +
             (recoveryBonus * 100)

where revenueStability = minMonthlyRevenue / maxMonthlyRevenue  // 0 to 1
      recoveryBonus = clamp(1.0 - (recoveryHours / 48), 0, 1)
```

**Unique Event Mechanics:**
- **Storm Shielding Upgrades:** Each building can be individually shielded for $50M + 10 titanium. Shielded buildings are immune to storm damage and produce bonus energy.
- **Emergency Contracts:** During storm phases, special contracts appear (e.g., "Provide emergency power to Station X" -- reward $200M, expires in 4 hours).
- **Insurance System:** Players can buy insurance on unshielded assets (20% of asset value). If an asset goes offline, insurance pays 60% of repair cost.
- **Energy Trading:** Energy surplus can be sold to other event participants at dynamic prices (prices spike during storm peak).

**Event-Exclusive Research (3):**
1. **Radiation Hardening** -- All satellites survive Storm Phase 2, $600M, 25 min
2. **Emergency Power Grid** -- Revenue never drops below 50% of pre-storm levels, $1.5B, 50 min
3. **Solar Sail Array** -- Captures storm energy for 5x solar revenue during peak, $5B, 2 hr

---

### 4.4 Helium-3 Gold Rush (Outer System Season)

**Theme:** A new fusion breakthrough has made Helium-3 the most valuable substance in the solar system. Companies race to the Moon and outer system to mine and sell it.

**Duration:** 3-4 weeks (21-28 days)

**Starting Conditions:**
- Cash: $1B
- Locations unlocked: Earth Surface, LEO, Lunar Surface (pre-unlocked)
- Starting resources: 150 iron, 80 aluminum, 40 titanium, 200 lunar_water
- Available research: 18 technologies (propulsion/outer-system-focused)

**Scoring Categories (6):**

| Category | Weight | Metric | Description |
|----------|--------|--------|-------------|
| Helium-3 Mined | 30% | Total He-3 units extracted | Core objective |
| Helium-3 Sold | 20% | Total $ from He-3 market sales | Market savvy |
| Outer System Reach | 15% | Farthest location unlocked (tiered: Moon=1, Jupiter=3, Outer=5) | Exploration depth |
| Mining Infrastructure | 15% | He-3-capable mining operations active | Production capacity |
| Fleet Logistics | 10% | Cargo transported between locations | Supply chain efficiency |
| Speed to First He-3 | 10% | Hours until first He-3 unit mined | Execution speed |

**Helium-3 Dynamic Pricing:**
```
he3Price = basePrice * (1 + demandMultiplier - supplyPressure)

where:
  basePrice = $5,000,000 per unit
  demandMultiplier = 2.0 - (totalGlobalHe3Sold / demandCeiling) // Starts at 2.0, drops as supply floods
  demandCeiling = participantCount * 100  // Scale with event size
  supplyPressure = totalGlobalHe3Sold / (participantCount * 200)
```

Early miners sell at ~$15M/unit. By week 3, price drops to ~$3-5M/unit. This rewards early movers.

**Unique Event Mechanics:**
- **Fusion Demand Waves:** Every 72 hours, Earth "demand spikes" double He-3 buy price for 6 hours. Announced 2 hours before.
- **Prospecting Missions:** Survey probes sent to locations can discover He-3 "hot spots" that yield 3x output for 24 hours (one-time per location).
- **Jupiter Express:** Special event-only ship that travels to Jupiter system in 50% time but costs 3x resources to build.
- **He-3 Contracts:** NPCs post contracts to buy He-3 at fixed prices (premium over market). Limited slots, first-come-first-served.

**Event-Exclusive Research (3):**
1. **Regolith Processing v2** -- Lunar He-3 mining rate +100%, $800M, 30 min
2. **Fusion Containment** -- He-3 units never decay in storage (otherwise lose 2% per day), $2B, 1 hr
3. **Interplanetary Express** -- All ship travel times -50%, $5B, 2 hr

---

### 4.5 Fleet Command (Fleet Building Season)

**Theme:** A massive asteroid has been detected on a collision course with an outer colony. Companies must build the largest and most capable fleet to respond.

**Duration:** 3-4 weeks (21-28 days)

**Starting Conditions:**
- Cash: $800M
- Locations unlocked: Earth Surface, LEO, GEO, Lunar Orbit (pre-unlocked)
- Starting resources: 300 iron, 200 aluminum, 100 titanium, 50 rare_earth
- Available research: 16 technologies (ships/propulsion-focused)

**Scoring Categories (6):**

| Category | Weight | Metric | Description |
|----------|--------|--------|-------------|
| Fleet Power | 25% | Sum of (ship tier * ship count) for all operational ships | Military strength |
| Mission Completions | 25% | Fleet missions completed (transport, survey, mining runs) | Operational capability |
| Fleet Diversity | 15% | Number of distinct ship types built | Versatility |
| Resource Logistics | 15% | Total cargo tonnage transported | Supply chain |
| Shipyard Efficiency | 10% | Ships built per real hour of play | Production rate |
| Speed to 5 Ships | 10% | Hours until 5th operational ship | Early expansion |

**Composite Score Formula:**
```
fleetPower = SUM(shipTier * 100) for each operational ship
missionScore = missionCompletions * averageMissionDifficulty
diversityScore = uniqueShipTypes^2 * 50  // Quadratic to reward full coverage

eventScore = (fleetPower / topFleetPower * 250) +
             (missionScore / topMissionScore * 250) +
             (diversityScore / topDiversityScore * 150) +
             (cargoTonnage / topCargoTonnage * 150) +
             (shipyardEfficiency * 100) +
             (speedBonus * 100)
```

**Unique Event Mechanics:**
- **Fleet Missions:** Generated every 6 hours, missions require specific ship types/counts. Completing missions earns score + resources. Missions have difficulty tiers (1-5).
- **Ship Upgrade System:** Event-only ship upgrades (armor plating, engine boost, cargo expansion). Each ship can have 2 upgrades.
- **Collaborative Fleet Goal:** All participants contribute to a server-wide ship count goal. If reached, everyone gets a bonus reward.
- **Asteroid Interception Finale:** In the final 48 hours, players can send fleet squadrons on a "deflection mission." Score is based on fleet power committed. Top contributors earn finale bonus.

**Event-Exclusive Research (3):**
1. **Rapid Shipyard** -- Ship build time -50%, $600M, 20 min
2. **Modular Hull Design** -- Ships gain +1 upgrade slot, $1.5B, 45 min
3. **Gravitational Tractor** -- Unlocks event-only "Tractor Ship" (highest fleet power value), $4B, 1.5 hr

---

### 4.6 Grand Championship (Annual Mashup)

**Duration:** 4 weeks (28 days)

The Grand Championship combines elements from all 5 seasons into a single mega-event. Players choose a **specialization** at the start (Mining, Building, Energy, He-3, Fleet) that gives them a 25% bonus in that category but they score across all categories. Top 3 players in each specialization earn special "Champion" titles.

---

## 5. Bracket/Tier System

### 5.1 Bracket Placement

Players are placed into brackets based on their **main game net worth** at the time of event registration. This ensures competitive fairness.

| Bracket | Main Game Net Worth | Typical Player | Max Players Per Bracket |
|---------|-------------------|----------------|----------------------|
| **Rookie** | $0 - $500M | Brand new, <1 week played | 100 |
| **Contender** | $500M - $5B | Early-mid game, exploring Moon | 100 |
| **Veteran** | $5B - $50B | Mid game, asteroid operations | 75 |
| **Elite** | $50B - $500B | Late game, outer system | 50 |
| **Titan** | $500B+ | Endgame / prestige players | 50 |

### 5.2 Bracket Mechanics

- Players only see and compete against others in their bracket on the leaderboard.
- Rewards scale with bracket tier (Titan bracket rewards are ~3x Rookie bracket rewards in main-game value).
- A player in Rookie bracket can still earn the "1st Place" title for that bracket -- it carries the bracket suffix: "Asteroid Rush Champion (Rookie)".
- **Bracket overflow:** If a bracket has fewer than 10 players, they are merged upward into the next bracket. Merged players get a 10% score bonus to compensate.

### 5.3 Bracket-Specific Starting Conditions

Higher brackets start with slightly LESS relative to their main game, creating a compression effect:

```typescript
function getEventStartingMoney(baseMoney: number, bracket: Bracket): number {
  const multipliers: Record<Bracket, number> = {
    ROOKIE: 1.0,      // $200M for Asteroid Rush
    CONTENDER: 1.0,   // Same starting money -- they just have more experience
    VETERAN: 1.0,     // Same -- skill should differentiate
    ELITE: 0.9,       // 10% less starting money (slight handicap)
    TITAN: 0.8,       // 20% less (bigger handicap for most experienced)
  };
  return Math.round(baseMoney * multipliers[bracket]);
}
```

This handicap is small enough that skilled Titan players still dominate their bracket, but it prevents runaway advantages from pure game knowledge.

### 5.4 Cross-Bracket Recognition

A global "Overall" leaderboard shows ALL brackets combined (using normalized scores). This is for bragging rights only -- rewards are bracket-specific.

```
Normalized Score = rawScore * bracketDifficultyMultiplier

where bracketDifficultyMultiplier:
  ROOKIE: 1.0
  CONTENDER: 1.1
  VETERAN: 1.25
  ELITE: 1.4
  TITAN: 1.6
```

---

## 6. Intra-Event Progression

### 6.1 Milestone System

Each event has **15 milestones** that mark progression through the event. Milestones are achievable by all active participants regardless of competitive ranking.

**Universal Milestones (same across all events):**

| # | Milestone | Trigger | Reward |
|---|-----------|---------|--------|
| 1 | First Steps | Complete first building in event | 50 Event Tokens |
| 2 | Revenue Stream | Earn $10M in event | 100 Event Tokens |
| 3 | Researcher | Complete first research in event | 75 Event Tokens |
| 4 | Builder | Complete 5 buildings | 150 Event Tokens |
| 5 | Expanding | Unlock 1 new location | 200 Event Tokens |
| 6 | Scientist | Complete 5 researches | 200 Event Tokens |
| 7 | Industrialist | Run 5 active services | 250 Event Tokens |
| 8 | Fleet Admiral | Build 3 ships | 200 Event Tokens |

**Season-Specific Milestones (7 per event, examples for Asteroid Rush):**

| # | Milestone | Trigger | Reward |
|---|-----------|---------|--------|
| 9 | Prospector | Mine 100 total resources | 300 Event Tokens |
| 10 | Ore Lord | Mine 500 total resources | 500 Event Tokens |
| 11 | Rare Find | Mine 10 platinum_group | 400 Event Tokens |
| 12 | Mining Fleet | Have 3 mining ships operational | 350 Event Tokens |
| 13 | Rich Vein | Discover an asteroid rich vein | 500 Event Tokens |
| 14 | Market Mogul | Execute $500M in trades | 400 Event Tokens |
| 15 | Asteroid Baron | Reach 1,000 total resources mined | 1,000 Event Tokens + Title |

### 6.2 Checkpoint System

Events have 3 scored checkpoints that distribute partial rewards and create urgency:

```
Checkpoint 1: End of Week 1  -- 25% of placement rewards distributed
Checkpoint 2: End of Week 2  -- 25% of placement rewards distributed
Final:        End of Event   -- 50% of placement rewards distributed
```

This prevents scenarios where a player dominates early but stops playing, or where someone can ignore the first 2 weeks and catch up in the last day.

### 6.3 Escalating Difficulty Curve

As the event progresses, costs and requirements scale up, creating natural inflection points:

```typescript
function getEventCostMultiplier(dayOfEvent: number, totalDays: number): number {
  const progress = dayOfEvent / totalDays; // 0.0 to 1.0
  // Exponential cost increase: starts at 1.0x, ends at 2.5x
  return 1.0 + 1.5 * Math.pow(progress, 1.8);
}

// Day 1 of 21-day event: 1.0x costs
// Day 7:  1.12x costs
// Day 14: 1.54x costs
// Day 21: 2.5x costs
```

This rewards early-game efficiency while keeping late-game play meaningful (you earn more per hour in later stages due to compound infrastructure, even though costs are higher).

### 6.4 Daily Objectives

Each event day generates 3 optional daily objectives that award bonus Event Tokens:

```typescript
interface DailyObjective {
  id: string;
  description: string;  // "Mine 50 iron today" / "Build 2 buildings today"
  target: number;
  progress: number;
  reward: number;        // 50-200 Event Tokens
  expiresAtMs: number;   // End of calendar day (UTC)
}
```

Daily objectives scale with the player's current event progress:
- Days 1-7: Simple targets (mine 20 resources, build 1 building)
- Days 8-14: Medium targets (mine 100 resources, complete 2 researches)
- Days 15-21: Hard targets (mine 300 resources, build 3 ships)

---

## 7. Reward Structure

### 7.1 Reward Tiers

Rewards are distributed based on **bracket rank** and **milestone completion**.

**Placement Rewards (per bracket):**

| Rank | Event Tokens | Main Game Cash | Exclusive Reward |
|------|-------------|----------------|------------------|
| 1st | 10,000 | $5B * bracket_mult | Legendary cosmetic + Title |
| 2nd | 7,500 | $3B * bracket_mult | Epic cosmetic + Title |
| 3rd | 5,000 | $2B * bracket_mult | Epic cosmetic |
| 4th-5th | 3,500 | $1B * bracket_mult | Rare cosmetic |
| 6th-10th | 2,500 | $500M * bracket_mult | Rare cosmetic |
| 11th-25th | 1,500 | $200M * bracket_mult | Uncommon cosmetic |
| 26th-50th | 1,000 | $100M * bracket_mult | Common cosmetic |
| 51st-100th | 500 | $50M * bracket_mult | -- |

```typescript
const BRACKET_REWARD_MULTIPLIERS: Record<Bracket, number> = {
  ROOKIE: 0.5,
  CONTENDER: 0.75,
  VETERAN: 1.0,
  ELITE: 1.5,
  TITAN: 2.0,
};
```

So 1st place in Titan bracket receives $10B main game cash; 1st in Rookie receives $2.5B.

**Participation Rewards (everyone who joins and plays):**

| Requirement | Reward |
|------------|--------|
| Register for event | 100 Event Tokens |
| Complete 1 event milestone | 200 Event Tokens + $25M main game cash |
| Complete 5 event milestones | 500 Event Tokens + $100M + Common cosmetic |
| Complete 10 event milestones | 1,000 Event Tokens + $250M + Uncommon cosmetic |
| Complete all 15 milestones | 2,000 Event Tokens + $500M + Rare cosmetic + Title |
| Play on 10+ different days | 500 Event Tokens (engagement bonus) |

### 7.2 Event Token Shop

Event Tokens are a persistent meta-currency earned across all events. They are spent in the Event Token Shop for exclusive items.

**Shop Categories:**

| Item | Cost | Type |
|------|------|------|
| Event Ship Skin (common) | 500 tokens | Cosmetic |
| Event Station Theme (uncommon) | 1,000 tokens | Cosmetic |
| Event Badge | 750 tokens | Cosmetic |
| Event Title ("Seasonal Warrior") | 2,000 tokens | Cosmetic |
| Main Game Cash Pack ($500M) | 1,500 tokens | Economic |
| Main Game Resource Pack (200 iron + 100 aluminum + 50 titanium) | 1,000 tokens | Economic |
| Main Game Speed Boost (2x build speed, 24hr) | 2,000 tokens | Temporary boost |
| Prestige Point Pack (+5 legacy points) | 5,000 tokens | Progression |
| Legendary Event Skin (animated) | 10,000 tokens | Cosmetic |
| "Seasonal Veteran" Title (requires 5+ events) | 3,000 tokens | Cosmetic |
| "Event Legend" Title (requires 20+ events) | 15,000 tokens | Cosmetic |

### 7.3 Exclusive Cosmetics per Season

Each season type has a unique cosmetic set that is ONLY available during that season:

- **Asteroid Rush:** "Ore Miner" ship skin (orange/brown), "Asteroid Belt" station theme, "Mining Baron" nameplate
- **Mars Colony Race:** "Red Planet" ship skin (rust red), "Mars Dome" station theme, "Colony Founder" nameplate
- **Solar Storm Crisis:** "Solar Flare" ship skin (golden animated), "Storm Shelter" station theme, "Storm Survivor" nameplate
- **Helium-3 Gold Rush:** "Fusion Core" ship skin (blue glow), "He-3 Refinery" station theme, "Fusion Pioneer" nameplate
- **Fleet Command:** "Battle Fleet" ship skin (military grey), "Command Bridge" station theme, "Fleet Admiral" nameplate

These cycle annually. Missing a season means waiting a full year for those cosmetics to return.

### 7.4 Title Hierarchy

Event titles stack with main game titles. Display format: `[Event Title] CompanyName [Alliance Tag]`

```
Title priority (highest first):
1. "Grand Champion 2026" (win Grand Championship)
2. "Seasonal Legend" (win 3+ different season types)
3. "[Season] Champion" (1st place in any bracket)
4. "Seasonal Veteran" (participate in 5+ events)
5. "[Season] Top 10" (place top 10 in any bracket)
```

---

## 8. Event Economy

### 8.1 Separate Event Currency

Events use the same money and resource types as the main game, but the **quantities are isolated**. No transfer between event state and main game state during the event.

### 8.2 Event Tokens (Meta-Currency)

Event Tokens are the only currency that persists across events. They are earned in events and spent in the Event Token Shop (see Section 7.2).

```typescript
// Stored on GameProfile (main game)
interface EventTokenBalance {
  totalEarned: number;      // Lifetime tokens earned
  currentBalance: number;   // Available to spend
  totalSpent: number;       // Lifetime tokens spent
}
```

### 8.3 Event-Only Resources

Some events introduce temporary resources that exist only within the event:

| Season | Event-Only Resource | Description |
|--------|-------------------|-------------|
| Asteroid Rush | `asteroid_core_sample` | Rare drop from rich veins, sells for 10x platinum price |
| Mars Colony Race | `terraform_points` | Earned from building combos, converts to score at 100:1 |
| Solar Storm Crisis | `emergency_power_cell` | Crafted during calm phase, used to protect assets during storm |
| Helium-3 Gold Rush | `refined_he3` | Processed from raw He-3, worth 3x but requires refinery building |
| Fleet Command | `mission_commendation` | Earned from fleet missions, converts to score bonus |

### 8.4 Boosted Drops

During events, resources related to the event theme have increased mining rates:

```typescript
const EVENT_MINING_BOOSTS: Record<SeasonType, Record<string, number>> = {
  ASTEROID_RUSH: {
    iron: 2.0, titanium: 2.0, platinum_group: 3.0,
    gold: 3.0, rare_earth: 2.5,
  },
  MARS_COLONY_RACE: {
    mars_water: 3.0, iron: 1.5, aluminum: 2.0,
  },
  SOLAR_STORM_CRISIS: {
    // No mining boosts -- energy-focused
  },
  HELIUM3_GOLD_RUSH: {
    helium3: 5.0, lunar_water: 2.0,
  },
  FLEET_COMMAND: {
    iron: 1.5, aluminum: 1.5, titanium: 2.0, rare_earth: 1.5,
  },
};
```

### 8.5 Event Market

Each event has its own isolated market with event-specific pricing dynamics:

- Prices start at 80% of main game base prices (cheaper to bootstrap).
- Supply/demand is tracked only among event participants.
- Market resets every 48 hours to prevent monopolization.
- A "market maker NPC" ensures there is always someone to trade with (buys at 70% market price, sells at 130%).

---

## 9. Main Game Integration

### 9.1 How Event Rewards Enter Main Game

After an event ends and enters the REWARDS phase:

1. **Cash rewards** are added to the player's main game `money` on claim.
2. **Resource rewards** are added to the player's main game `resources` on claim.
3. **Event Tokens** are added to `eventTokenBalance` immediately (no claim needed).
4. **Cosmetics** are added to the player's cosmetic inventory permanently.
5. **Titles** are unlocked and selectable from the player profile.
6. **Speed boosts** are added to `availableBoosts` in main game state.

### 9.2 Permanent Bonuses

Participating in events can unlock permanent (but small) bonuses:

| Achievement | Requirement | Permanent Bonus |
|------------|-------------|-----------------|
| Seasonal Participant | Complete 1 event | +1% mining rate (permanent) |
| Seasonal Regular | Complete 5 events | +2% revenue (permanent) |
| Seasonal Veteran | Complete 10 events | +3% build speed (permanent) |
| Season Specialist | Win same season type 3x | +5% to that season's theme (e.g., +5% mining for Asteroid Rush specialist) |
| Grand Champion | Win Grand Championship | +5% all stats (permanent) |

These bonuses are small enough to not create P2W advantages but meaningful enough to incentivize participation.

### 9.3 Event History Display

The player's main game profile shows their event history:

```
Event History:
  Asteroid Rush S3 (2026 Q1) -- 3rd Place (Veteran bracket) -- 2,347 pts
  Mars Colony Race S3 (2026 Q1) -- 12th Place (Veteran bracket) -- 1,891 pts
  Solar Storm Crisis S3 (2026 Q2) -- 1st Place (Contender bracket) -- 3,102 pts
  Total Events: 3 | Best Finish: 1st | Event Tokens: 12,450
```

### 9.4 Alliance Events

If 3+ members of the same alliance participate in an event, they receive a 5% score bonus (capped). Alliance total event score is displayed on the Alliance leaderboard.

---

## 10. Anti-Gaming Measures

### 10.1 Alt Account Prevention

**Problem:** Players create alt accounts to place in Rookie bracket for easy wins.

**Mitigations:**
1. **Account age minimum:** Must have a main game account at least 7 days old to enter events.
2. **Activity requirement:** Must have completed at least 3 buildings and 1 research in main game.
3. **IP/device fingerprinting:** Flag accounts that share IP or device fingerprint. Flagged accounts are placed in the same bracket regardless of net worth.
4. **Behavioral analysis:** Track play patterns (session times, click patterns). Accounts with suspiciously similar patterns to an existing account are flagged for manual review.
5. **Single event per account:** One event entry per account per event. No re-entry.

### 10.2 Late-Joining Advantage Prevention

**Problem:** Players join late to see who is in their bracket and strategize, or join when a bracket is nearly empty.

**Mitigations:**
1. **Bracket assignment at registration:** You are placed in a bracket when you register, not when you start playing. Brackets close after 100 players.
2. **Late-join penalty:** Players joining after Day 5 receive NO checkpoint 1 rewards and start with a -10% score modifier (decays over 3 days).
3. **Catch-up mechanic:** Late joiners get 2x event speed for their first 48 hours of play to partially compensate for lost time. This is intentionally less than the time lost.
4. **No bracket shopping:** Players cannot see bracket composition before registering.

### 10.3 Inactivity Prevention

**Problem:** Players register, collect participation rewards, and never actually play.

**Mitigations:**
1. **Minimum play time:** Must accumulate 2+ hours of event play time to qualify for ANY placement rewards.
2. **Minimum score threshold:** Must reach milestone 3 (first research) to qualify for bracket placement.
3. **Daily check-in bonus:** Rewards consistent play across the event duration, not just burst sessions.

### 10.4 Score Manipulation Prevention

**Problem:** Players find exploits to inflate scores artificially.

**Mitigations:**
1. **Server-side score validation:** All event scores are computed server-side based on synced game state. Client-reported scores are NEVER trusted.
2. **Rate limiting:** Maximum actions per minute (10 builds, 5 market trades, 2 research starts). Prevents automation.
3. **Anomaly detection:** Scores >3 standard deviations above bracket median trigger manual review.
4. **Score audit trail:** Every score-contributing action is logged with timestamp. Reviewable by admins.

### 10.5 Collusion Prevention

**Problem:** Multiple players coordinate to manipulate market prices or trade resources to funnel score.

**Mitigations:**
1. **Trade limits:** Max 5 trades per hour in event market. Max trade value = 20% of player's current event net worth.
2. **Price caps:** Event market trades can only occur within +/- 50% of current market price.
3. **Alliance cap:** Alliance bonus is capped at 5% regardless of how many alliance members participate.

---

## 11. Database Schema (Prisma)

### 11.1 New Models

```prisma
// ─── Seasonal Event System ──────────────────────────────────────────────────

model SeasonalEvent {
  id              String   @id @default(cuid())
  slug            String   @unique  // "asteroid-rush-2026-q1"
  seasonType      String   // ASTEROID_RUSH, MARS_COLONY_RACE, SOLAR_STORM_CRISIS, HELIUM3_GOLD_RUSH, FLEET_COMMAND, GRAND_CHAMPIONSHIP
  name            String   // "Asteroid Rush -- Season 3"
  description     String
  rules           Json     // Event-specific rules and modifiers
  phase           String   @default("SCHEDULED") // SCHEDULED, ANNOUNCED, REGISTRATION, ACTIVE, LATE_JOIN, FINAL_SPRINT, TALLYING, REWARDS, ARCHIVED
  seasonNumber    Int      // Sequential season counter (1, 2, 3...)
  isMajor         Boolean  @default(false) // 4-week major events

  startDate       DateTime
  endDate         DateTime
  registrationOpen DateTime
  lateJoinCutoff  DateTime

  // Event configuration
  startingMoney       Float
  startingResources   Json    @default("{}")  // Record<string, number>
  unlockedLocations   Json    @default("[]")  // string[]
  availableResearch   Json    @default("[]")  // string[]
  preBuiltBuildings   Json    @default("[]")  // { definitionId, locationId }[]
  timeModifiers       Json    @default("{}")  // { buildSpeed, researchSpeed, miningRate, etc. }
  miningBoosts        Json    @default("{}")  // Record<string, number>
  scoringWeights      Json    @default("{}")  // Record<string, number>

  // Results
  totalParticipants   Int     @default(0)
  isFinalized         Boolean @default(false)

  // Relations
  participations     EventParticipation[]
  brackets           EventBracket[]
  milestoneDefinitions EventMilestoneDefinition[]
  checkpoints        EventCheckpoint[]

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([phase])
  @@index([seasonType])
  @@index([startDate])
  @@index([endDate])
}

model EventBracket {
  id              String   @id @default(cuid())
  eventId         String
  event           SeasonalEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  bracketTier     String   // ROOKIE, CONTENDER, VETERAN, ELITE, TITAN
  minNetWorth     Float
  maxNetWorth     Float
  maxPlayers      Int      @default(100)
  currentPlayers  Int      @default(0)
  isMerged        Boolean  @default(false) // Was this bracket merged into another?
  mergedIntoId    String?  // If merged, which bracket absorbed this one

  participations  EventParticipation[]

  @@unique([eventId, bracketTier])
  @@index([eventId])
}

model EventParticipation {
  id              String   @id @default(cuid())
  eventId         String
  event           SeasonalEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  profileId       String
  profile         GameProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  bracketId       String
  bracket         EventBracket @relation(fields: [bracketId], references: [id], onDelete: Cascade)

  // Registration
  registeredAt    DateTime @default(now())
  mainGameNetWorth Float   // Snapshot at registration time
  isLateJoin      Boolean  @default(false)

  // Event game state (JSON blob, mirrors EventGameState)
  eventState      Json     @default("{}")

  // Scoring
  totalScore      Float    @default(0)
  categoryScores  Json     @default("{}")  // Record<string, number>
  bracketRank     Int?     // Computed after event ends
  globalRank      Int?     // Across all brackets (normalized)

  // Progress
  milestonesReached  String[]  @default([])
  totalPlayTimeMs    BigInt    @default(0)
  lastPlayedAt       DateTime?
  daysPlayed         Int       @default(0)

  // Rewards
  rewardsClaimed     Boolean   @default(false)
  tokenReward        Int       @default(0)
  cashReward         Float     @default(0)
  cosmeticRewards    String[]  @default([])

  // Checkpoint scores (for partial reward distribution)
  checkpoint1Score   Float?
  checkpoint2Score   Float?
  finalScore         Float?

  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@unique([eventId, profileId])
  @@index([eventId, totalScore])
  @@index([eventId, bracketId, totalScore])
  @@index([profileId])
  @@index([bracketRank])
}

model EventMilestoneDefinition {
  id              String   @id @default(cuid())
  eventId         String
  event           SeasonalEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  milestoneId     String   // "first_building", "mine_100", etc.
  name            String
  description     String
  icon            String
  orderIndex      Int      // Display order (1-15)
  triggerType     String   // "building_count", "resource_mined", "research_count", etc.
  triggerTarget   Float    // Numeric threshold
  triggerMeta     Json?    // Additional trigger conditions (e.g., specific building type)
  tokenReward     Int      @default(100)
  isUniversal     Boolean  @default(false) // Same across all seasons?

  @@unique([eventId, milestoneId])
  @@index([eventId])
}

model EventCheckpoint {
  id              String   @id @default(cuid())
  eventId         String
  event           SeasonalEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  checkpointNumber Int     // 1, 2, or 3 (final)
  checkpointDate  DateTime
  rewardPct       Float    // 0.25 for checkpoint 1&2, 0.50 for final
  isProcessed     Boolean  @default(false)

  @@unique([eventId, checkpointNumber])
  @@index([eventId])
}

model EventTokenTransaction {
  id              String   @id @default(cuid())
  profileId       String
  profile         GameProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  amount          Int      // Positive = earned, negative = spent
  reason          String   // "event_placement", "milestone_reward", "shop_purchase", "daily_objective"
  eventId         String?  // null for shop purchases
  metadata        Json?
  createdAt       DateTime @default(now())

  @@index([profileId])
  @@index([eventId])
  @@index([createdAt])
}

model EventScoreLog {
  id              String   @id @default(cuid())
  participationId String
  category        String   // Score category (e.g., "resources_mined", "buildings_built")
  delta           Float    // Score change
  newTotal        Float    // Running total for this category
  action          String   // What triggered the score change
  timestamp       DateTime @default(now())

  @@index([participationId])
  @@index([participationId, category])
  @@index([timestamp])
}
```

### 11.2 Modifications to Existing Models

```prisma
// Add to existing GameProfile model:
model GameProfile {
  // ... existing fields ...

  // Seasonal Events
  eventTokenBalance     Int       @default(0)
  eventTokensEarned     Int       @default(0)
  eventTokensSpent      Int       @default(0)
  eventsParticipated    Int       @default(0)
  eventBestFinish       Int?      // Best placement rank ever
  eventTitles           String[]  @default([])
  eventPermanentBonuses Json      @default("{}") // { miningBonus: 0.01, revenueBonus: 0.02, ... }

  // Relations
  eventParticipations   EventParticipation[]
  eventTokenTransactions EventTokenTransaction[]
}
```

### 11.3 Indexes for Performance

The schema above includes targeted indexes for the most common queries:
- Event listing by phase and date
- Leaderboard queries (score within bracket)
- Player event history
- Score audit trail
- Token transaction history

---

## 12. API Endpoints & Scheduling

### 12.1 Event Management APIs

```
GET    /api/space-tycoon/events
       → List all events (with phase filter: ?phase=ACTIVE)
       → Returns: { events: SeasonalEvent[], activeEvent: SeasonalEvent | null }

GET    /api/space-tycoon/events/[eventId]
       → Get event details, rules, milestones, brackets
       → Returns: { event, milestones, brackets, playerParticipation? }

POST   /api/space-tycoon/events/[eventId]/register
       → Register for an event. Creates EventParticipation + assigns bracket.
       → Body: {} (uses session for profile)
       → Returns: { participation, bracket, eventState (initial) }

GET    /api/space-tycoon/events/[eventId]/leaderboard
       → Bracket and global leaderboards
       → Query: ?bracket=VETERAN&limit=50&offset=0
       → Returns: { entries: LeaderboardEntry[], bracket, playerRank }

GET    /api/space-tycoon/events/[eventId]/my-progress
       → Current player's event state, score, milestones, rank
       → Returns: { eventState, score, categoryScores, milestones, rank }
```

### 12.2 Event Gameplay APIs

```
POST   /api/space-tycoon/events/[eventId]/sync
       → Sync event game state (like main game sync but for event)
       → Body: { eventState, actions[] }
       → Returns: { updatedScore, categoryScores, newMilestones, rank }
       → Server validates all actions and computes authoritative score.

POST   /api/space-tycoon/events/[eventId]/market/trade
       → Event-specific market trade
       → Body: { resourceId, type: "buy"|"sell", quantity, pricePerUnit }
       → Returns: { trade, newBalance, marketState }

GET    /api/space-tycoon/events/[eventId]/market
       → Event market prices and order book
       → Returns: { resources: EventMarketResource[] }

GET    /api/space-tycoon/events/[eventId]/daily-objectives
       → Today's 3 daily objectives for this player
       → Returns: { objectives: DailyObjective[] }
```

### 12.3 Reward APIs

```
POST   /api/space-tycoon/events/[eventId]/claim-rewards
       → Claim earned rewards after event ends
       → Returns: { tokenReward, cashReward, cosmetics, titles, boosts }

GET    /api/space-tycoon/event-shop
       → List Event Token Shop items
       → Returns: { items: ShopItem[], balance: number }

POST   /api/space-tycoon/event-shop/purchase
       → Purchase item from Event Token Shop
       → Body: { itemId }
       → Returns: { item, newBalance }

GET    /api/space-tycoon/events/history
       → Player's event participation history
       → Returns: { events: EventHistoryEntry[] }
```

### 12.4 Scheduled Jobs (Cron)

These jobs run on a schedule using Railway's cron service or a lightweight scheduler:

```typescript
// Every 5 minutes: Phase transitions
// Checks if any event should advance to the next phase
async function processEventPhaseTransitions() {
  const events = await prisma.seasonalEvent.findMany({
    where: { phase: { not: 'ARCHIVED' } },
  });
  for (const event of events) {
    const newPhase = calculateCurrentPhase(event, new Date());
    if (newPhase !== event.phase) {
      await transitionEventPhase(event, newPhase);
    }
  }
}
// Cron: */5 * * * *

// Every hour: Checkpoint processing
// At checkpoint times, snapshot scores and distribute partial rewards
async function processCheckpoints() {
  const now = new Date();
  const dueCheckpoints = await prisma.eventCheckpoint.findMany({
    where: {
      checkpointDate: { lte: now },
      isProcessed: false,
    },
    include: { event: true },
  });
  for (const cp of dueCheckpoints) {
    await processCheckpointRewards(cp);
  }
}
// Cron: 0 * * * *

// Every 15 minutes during active events: Score recalculation
// Recompute bracket ranks for active events
async function recalculateEventRanks() {
  const activeEvents = await prisma.seasonalEvent.findMany({
    where: { phase: { in: ['ACTIVE', 'LATE_JOIN', 'FINAL_SPRINT'] } },
  });
  for (const event of activeEvents) {
    await recalculateBracketRanks(event.id);
  }
}
// Cron: */15 * * * *

// Once after event ends: Final tally
async function finalizeEvent(eventId: string) {
  // 1. Compute final scores for all participants
  // 2. Assign bracket ranks
  // 3. Compute global normalized ranks
  // 4. Calculate rewards for each participant
  // 5. Transition event to REWARDS phase
  // 6. Send notification to all participants
}

// Daily at 00:00 UTC: Generate daily objectives
async function generateDailyObjectives() {
  const activeEvents = await prisma.seasonalEvent.findMany({
    where: { phase: { in: ['ACTIVE', 'LATE_JOIN', 'FINAL_SPRINT'] } },
  });
  for (const event of activeEvents) {
    await generateObjectivesForEvent(event);
  }
}
// Cron: 0 0 * * *

// Monthly: Create next event
async function createUpcomingEvent() {
  // Based on EVENT_CALENDAR, create the next event
  // with all milestones, brackets, and checkpoints
}
// Cron: 0 0 1 * *
```

### 12.5 Event Sync Flow

The event sync is the critical path. Here is the full flow:

```
Client (every 30s during event play):
  1. Serialize current EventGameState
  2. Include list of actions since last sync
  3. POST /api/space-tycoon/events/[eventId]/sync

Server:
  1. Authenticate user, verify event participation
  2. Validate event phase (must be ACTIVE, LATE_JOIN, or FINAL_SPRINT)
  3. Replay actions against server-side state (authoritative)
  4. Compute new category scores from validated state
  5. Check milestone triggers
  6. Apply final sprint multiplier if applicable (1.25x)
  7. Update EventParticipation record
  8. Log score changes to EventScoreLog
  9. Return: { score, categoryScores, rank, newMilestones, eventState }

Client:
  1. Reconcile server state with local state (server wins on conflicts)
  2. Display new milestones / rank changes
  3. Save event state to localStorage
```

---

## 13. UI Design

### 13.1 Event Lobby (Pre-Event)

The Event Lobby replaces or overlays the main game UI during the ANNOUNCED and REGISTRATION phases.

```
┌─────────────────────────────────────────────────────────────────┐
│  UPCOMING EVENT                                                  │
│  ┌───────────────────────────────────────────────────────┐      │
│  │  ☄️ ASTEROID RUSH -- Season 4                         │      │
│  │  ─────────────────────────────────────────            │      │
│  │  Mine the richest asteroid belt in history.           │      │
│  │                                                       │      │
│  │  STARTS IN: 2d 14h 32m                               │      │
│  │  DURATION: 21 days                                    │      │
│  │  BRACKET: Veteran (based on your $8.2B net worth)     │      │
│  │                                                       │      │
│  │  ┌──────────────────────────────────────┐             │      │
│  │  │ Scoring:                             │             │      │
│  │  │  30% Resources Mined                 │             │      │
│  │  │  20% Rare Metals                     │             │      │
│  │  │  15% Mining Infrastructure           │             │      │
│  │  │  15% Trade Volume                    │             │      │
│  │  │  10% Fleet Size                      │             │      │
│  │  │  10% Speed Bonus                     │             │      │
│  │  └──────────────────────────────────────┘             │      │
│  │                                                       │      │
│  │  REWARDS:                                             │      │
│  │  1st: 10,000 Tokens + $5B + Legendary Skin            │      │
│  │  Top 10: 2,500+ Tokens + Rare Cosmetic                │      │
│  │  All Participants: 200+ Tokens + Cash                  │      │
│  │                                                       │      │
│  │  [ REGISTER NOW ]          [ VIEW RULES ]             │      │
│  └───────────────────────────────────────────────────────┘      │
│                                                                  │
│  PREVIOUS RESULTS: Mars Colony Race S3 -- You placed 12th       │
│  EVENT TOKEN BALANCE: 4,350 tokens  [ SHOP ]                    │
└─────────────────────────────────────────────────────────────────┘
```

### 13.2 Event Game View (During Event)

The event game view reuses the main game UI components but with an event-specific skin and header:

```
┌─────────────────────────────────────────────────────────────────┐
│  ☄️ ASTEROID RUSH   Day 8/21   Score: 1,247   Rank: #7/94      │
│  💰 $892M   ⛏️ 847 mined   ⏱️ 13d 4h remaining                 │
├─────────────────────────────────────────────────────────────────┤
│  📊 Dashboard │ 🏗️ Build │ 🔬 Research │ 🗺️ Map │ ⛏️ Mining    │
│  │ 📈 Market │ 🚀 Fleet │ 🏆 Leaderboard │ ← Main Game        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─── MILESTONE TRACKER ─────────────────────────────────┐      │
│  │ ✅✅✅✅✅◯◯◯ ◯◯◯◯◯◯◯  8/15                         │      │
│  │ Next: Mine 500 total resources (347/500)              │      │
│  └───────────────────────────────────────────────────────┘      │
│                                                                  │
│  ┌─── DAILY OBJECTIVES ──────────────────────────────────┐      │
│  │ ✅ Mine 80 iron (80/80)             +100 tokens       │      │
│  │ ◯  Build 1 mining ship (0/1)       +150 tokens       │      │
│  │ ◯  Execute 3 market trades (1/3)   +75 tokens        │      │
│  └───────────────────────────────────────────────────────┘      │
│                                                                  │
│  [ Main game content panels render here, using EventGameState ] │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 13.3 Event Leaderboard

```
┌─────────────────────────────────────────────────────────────────┐
│  ASTEROID RUSH -- VETERAN BRACKET                                │
│  94 participants  |  Day 8/21  |  Next checkpoint: 6d 3h        │
├─────────────────────────────────────────────────────────────────┤
│  # │ Company          │ Score │ Mined │ Rare  │ Fleet │ Trend  │
│  ──┼──────────────────┼───────┼───────┼───────┼───────┼────────│
│  1 │ ⭐ StellarCore    │ 2,105 │ 1,847 │  234  │  8    │  ▲ +2 │
│  2 │ [SOL] NebulaX     │ 1,998 │ 1,623 │  287  │  6    │  ▼ -1 │
│  3 │ AstroMine Corp    │ 1,876 │ 1,752 │  198  │  7    │  ▲ +1 │
│  4 │ DeepSpace Ltd     │ 1,743 │ 1,401 │  256  │  5    │  ──   │
│  ...                                                             │
│  7 │ ★ YOUR COMPANY    │ 1,247 │   847 │  123  │  4    │  ▲ +3 │
│  ...                                                             │
├─────────────────────────────────────────────────────────────────┤
│  CATEGORY LEADERS:                                               │
│  Most Mined: StellarCore (1,847)                                │
│  Most Rare: [SOL] NebulaX (287)                                 │
│  Largest Fleet: AstroMine Corp (8 ships)                        │
│  Fastest Start: YOUR COMPANY (4.2 hrs to first base!)           │
└─────────────────────────────────────────────────────────────────┘
```

### 13.4 Results Screen (Post-Event)

```
┌─────────────────────────────────────────────────────────────────┐
│  ☄️ ASTEROID RUSH -- SEASON 4 RESULTS                            │
│                                                                  │
│  ┌───────────────────────────────────────────────────────┐      │
│  │              ★ YOUR RESULT ★                          │      │
│  │                                                       │      │
│  │     #7 out of 94 (Veteran Bracket)                    │      │
│  │     Final Score: 2,891 points                         │      │
│  │                                                       │      │
│  │     REWARDS EARNED:                                   │      │
│  │     ✦ 2,500 Event Tokens                              │      │
│  │     ✦ $500M Main Game Cash                            │      │
│  │     ✦ "Asteroid Rush Top 10" Title                    │      │
│  │     ✦ Rare Ship Skin: "Ore Miner"                    │      │
│  │     ✦ Milestone Tokens: 3,200                         │      │
│  │                                                       │      │
│  │     [ CLAIM ALL REWARDS ]                             │      │
│  └───────────────────────────────────────────────────────┘      │
│                                                                  │
│  CATEGORY BREAKDOWN:                                             │
│  Resources Mined:  ████████████░░  2,341 (#5)                   │
│  Rare Metals:      ██████████░░░░    287 (#8)                   │
│  Infrastructure:   ████████░░░░░░     12 (#12)                  │
│  Trade Volume:     ██████████████  $2.1B (#3)                   │
│  Fleet Size:       ██████░░░░░░░░      5 (#15)                  │
│  Speed Bonus:      ████████████████  4.2h (#1!)                 │
│                                                                  │
│  MILESTONES: 13/15 completed (2,850 bonus tokens)               │
│  DAILY OBJECTIVES: 18/21 days completed (1,350 bonus tokens)    │
│                                                                  │
│  NEXT EVENT: Mars Colony Race starts in 6 days  [ PRE-REGISTER ]│
└─────────────────────────────────────────────────────────────────┘
```

### 13.5 Event Tab in Main Game

During an active event, a persistent tab appears in the main game navigation:

```
📊 Dashboard │ 🏗️ Build │ 🔬 Research │ 🗺️ Map │ ••• More ▼ │ ☄️ EVENT ← Pulsing/animated
```

The EVENT tab, when clicked, switches the entire game view to the event state. A "Return to Main Game" button is always visible.

### 13.6 Countdown Widget

On the main game dashboard, an event countdown widget shows:

```
┌─── UPCOMING EVENT ────────────────────┐
│  ☄️ Asteroid Rush starts in 2d 14h    │
│  ████████████████░░░░ 73% registered  │
│  Your bracket: Veteran (68/100)       │
│  [ REGISTER ]    [ DETAILS ]          │
└───────────────────────────────────────┘
```

During an active event:

```
┌─── ACTIVE EVENT ──────────────────────┐
│  ☄️ Asteroid Rush  Day 8/21           │
│  Your rank: #7 (Veteran)  Score: 1,247│
│  Next milestone: Mine 500 res (70%)   │
│  [ PLAY EVENT ]                       │
└───────────────────────────────────────┘
```

---

## 14. Notification System

### 14.1 Event Lifecycle Notifications

| Trigger | Channel | Message |
|---------|---------|---------|
| Event ANNOUNCED | In-app + Push | "New event: Asteroid Rush starts in 7 days! View details." |
| REGISTRATION opens | In-app + Push + Email | "Registration is open for Asteroid Rush. Secure your spot!" |
| Event STARTS | In-app + Push | "Asteroid Rush has begun! Join now to compete." |
| LATE_JOIN ending (12h before) | In-app + Push | "Last chance to join Asteroid Rush -- late registration closes in 12 hours." |
| Checkpoint scored | In-app | "Checkpoint 1 complete! You are ranked #7. Partial rewards distributed." |
| FINAL_SPRINT begins | In-app + Push | "Final Sprint! 3 days left. Scores earn 1.25x bonus." |
| Event ENDS | In-app + Push + Email | "Asteroid Rush is over! View your results and claim rewards." |
| Rewards claimable | In-app + Push | "Your event rewards are ready to claim!" |
| Rewards expiring (3 days before) | In-app + Push | "Claim your Asteroid Rush rewards before they expire in 3 days." |

### 14.2 Competitive Notifications (During Event)

| Trigger | Channel | Message |
|---------|---------|---------|
| Rank improved by 3+ | In-app | "You jumped to #7! Keep pushing." |
| Rank dropped by 3+ | In-app | "You dropped to #12. Someone is catching up." |
| Milestone reached | In-app | "Milestone reached: Ore Lord! +500 Event Tokens" |
| Daily objective completed | In-app | "Daily objective complete! +100 tokens" |
| New daily objectives available | In-app | "3 new daily objectives are available." |
| Category leader achieved | In-app + Push | "You are the #1 rare metals miner in your bracket!" |
| Someone passed you for 1st | In-app + Push | "StellarCore just passed you for #1. Fight back!" |

### 14.3 Notification Frequency Controls

To prevent notification fatigue:

```typescript
const EVENT_NOTIFICATION_LIMITS = {
  maxPushPerDay: 3,              // Max 3 push notifications per day
  minTimeBetweenPush: 4 * HOUR,  // At least 4 hours between pushes
  rankChangeThreshold: 3,        // Only notify on 3+ rank changes
  batchCompetitiveUpdates: true, // Group competitive updates into hourly digest
  respectQuietHours: true,       // Honor user's quiet hours setting
};
```

### 14.4 Integration with Existing Notification System

Event notifications use the existing `Notification` model with new type values:

```typescript
const EVENT_NOTIFICATION_TYPES = [
  'event_announced',
  'event_registration_open',
  'event_started',
  'event_late_join_closing',
  'event_checkpoint',
  'event_final_sprint',
  'event_ended',
  'event_rewards_ready',
  'event_rewards_expiring',
  'event_rank_change',
  'event_milestone',
  'event_daily_objective',
  'event_category_leader',
] as const;
```

These integrate with the existing `NotificationPreference` model. A new preference field should be added:

```prisma
model NotificationPreference {
  // ... existing fields ...
  eventNotifications  Boolean @default(true) // Master toggle for event notifications
}
```

---

## 15. Implementation Phases

### Phase 1: Foundation (4-5 weeks)

**Goal:** Core infrastructure for running a single event type.

**Deliverables:**
1. Prisma schema additions (SeasonalEvent, EventBracket, EventParticipation, EventMilestoneDefinition, EventCheckpoint, EventTokenTransaction, EventScoreLog)
2. Migrate GameProfile with new event fields (eventTokenBalance, etc.)
3. Event management APIs: list events, get event details, register
4. Event sync API (POST /events/[id]/sync) with server-side score validation
5. Event phase transition cron job
6. Bracket assignment logic
7. Event leaderboard API
8. Basic Event Lobby UI (registration, rules, countdown)
9. Event game view (reuse existing game components with EventGameState)
10. Event tab in main game navigation
11. **First playable event:** Asteroid Rush (simplest scoring model)

**Estimated effort:** 120-160 developer hours

### Phase 2: Full Season Roster (3-4 weeks)

**Goal:** All 5 season types playable with unique mechanics.

**Deliverables:**
1. Mars Colony Race mechanics (dust storms, terraform points, supply chain challenge)
2. Solar Storm Crisis mechanics (storm phase system, shielding upgrades, emergency contracts)
3. Helium-3 Gold Rush mechanics (dynamic He-3 pricing, demand waves, prospecting)
4. Fleet Command mechanics (fleet missions, ship upgrades, collaborative goal)
5. Event-exclusive research system (3 techs per season)
6. Season-specific milestone definitions
7. Event-only resource types per season
8. Event market system (isolated from main game market)

**Estimated effort:** 100-140 developer hours

### Phase 3: Rewards & Economy (2-3 weeks)

**Goal:** Full reward pipeline and Event Token economy.

**Deliverables:**
1. Reward calculation engine (placement + milestone + participation)
2. Reward claim flow (API + UI)
3. Event Token Shop (UI + API + item definitions)
4. Checkpoint partial reward distribution
5. Cosmetic reward integration (ship skins, station themes, badges, titles)
6. Permanent bonus system (small bonuses for event participation milestones)
7. Event history display on player profile
8. Post-event results screen

**Estimated effort:** 60-80 developer hours

### Phase 4: Polish & Anti-Gaming (2 weeks)

**Goal:** Fair, exploit-resistant, polished experience.

**Deliverables:**
1. Alt account detection (IP/device fingerprinting, behavioral analysis)
2. Score anomaly detection system
3. Rate limiting on event actions
4. Trade manipulation prevention (price caps, trade limits)
5. Late-join mechanics (penalty + catch-up)
6. Minimum play time / score requirements
7. Final Sprint score multiplier (1.25x)
8. Escalating cost curve within events
9. Daily objectives system
10. Score audit logging

**Estimated effort:** 50-70 developer hours

### Phase 5: Notifications & Grand Championship (2 weeks)

**Goal:** Complete notification system and annual mega-event.

**Deliverables:**
1. Event notification types integrated with existing system
2. Push notification triggers for event lifecycle
3. Competitive notification batching and frequency limits
4. Grand Championship design (all-season mashup with specialization choice)
5. Event calendar generation for a full year
6. Offseason handling
7. Alliance event bonuses
8. Cross-bracket global leaderboard (normalized scores)

**Estimated effort:** 40-60 developer hours

### Total Estimated Effort

| Phase | Weeks | Hours |
|-------|-------|-------|
| Phase 1: Foundation | 4-5 | 120-160 |
| Phase 2: Season Roster | 3-4 | 100-140 |
| Phase 3: Rewards | 2-3 | 60-80 |
| Phase 4: Anti-Gaming | 2 | 50-70 |
| Phase 5: Polish | 2 | 40-60 |
| **Total** | **13-16** | **370-510** |

### Recommended Launch Strategy

1. **Soft launch** Phase 1 with Asteroid Rush only. Run 1 test event (1 week duration, reduced rewards).
2. Collect player feedback, fix issues.
3. Launch Phase 2 with full season rotation.
4. Phase 3 and 4 can overlap with live events.
5. Grand Championship targets end of first full calendar year.

---

## Appendix A: Score Normalization Formula

For cross-bracket global rankings:

```
normalizedScore = rawScore * bracketMultiplier * participantCountFactor

where:
  bracketMultiplier = { ROOKIE: 1.0, CONTENDER: 1.1, VETERAN: 1.25, ELITE: 1.4, TITAN: 1.6 }
  participantCountFactor = log2(bracketParticipantCount) / log2(100)
  // Larger brackets get a slight boost (more competition = higher difficulty)
```

## Appendix B: Event Configuration Template

```typescript
const ASTEROID_RUSH_CONFIG: EventConfig = {
  seasonType: 'ASTEROID_RUSH',
  name: 'Asteroid Rush',
  description: 'The asteroid belt has entered a rich orbital phase...',
  durationWeeks: 3,
  startingMoney: 200_000_000,
  startingResources: { iron: 100, aluminum: 50, titanium: 20 },
  unlockedLocations: ['earth_surface', 'leo', 'asteroid_belt'],
  availableResearch: [
    'reusable_boosters', 'resource_prospecting', 'modular_spacecraft',
    'high_res_optical', 'ion_drives', 'triple_junction',
    'improved_cooling', 'orbital_assembly', 'deep_space_mining',
    'super_heavy_lift', 'rad_hard_processors', 'regolith_processing',
    // Event-exclusive:
    'evt_deep_core_drilling', 'evt_ore_refinery_optimization', 'evt_autonomous_mining_swarm',
  ],
  timeModifiers: {
    buildSpeedMultiplier: 4.0,
    researchSpeedMultiplier: 4.0,
    miningRateMultiplier: 3.0,
    revenueMultiplier: 2.0,
    locationUnlockDiscount: 0.5,
  },
  miningBoosts: {
    iron: 2.0, titanium: 2.0, platinum_group: 3.0,
    gold: 3.0, rare_earth: 2.5,
  },
  scoringWeights: {
    total_resources_mined: 0.30,
    rare_metals_mined: 0.20,
    mining_infrastructure: 0.15,
    trade_volume: 0.15,
    fleet_size: 0.10,
    speed_bonus: 0.10,
  },
};
```

## Appendix C: Event Token Earning Rates

Expected token earnings per event for an average player:

| Source | Tokens |
|--------|--------|
| Registration | 100 |
| Participation (milestones 1-5) | 575 |
| Milestones 6-10 | 1,250 |
| Milestones 11-15 | 2,200 |
| Daily objectives (15 days) | 1,500 |
| Placement (median bracket rank) | 1,000 |
| Checkpoint bonuses | 500 |
| **Total (average player)** | **~4,500** |
| **Total (top player, all milestones)** | **~12,000** |

At these rates, it takes ~2-3 events for an average player to afford a rare cosmetic, and ~8-10 events for a legendary. This pacing keeps the token shop aspirational without feeling impossible.
