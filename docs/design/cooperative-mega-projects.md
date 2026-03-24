# Cooperative Mega-Projects -- Design Document

**Game:** Space Tycoon (browser-based async multiplayer space industry tycoon)
**Date:** 2026-03-23
**Status:** Design / Pre-Implementation

---

## Table of Contents

1. [Design Goals and Principles](#1-design-goals-and-principles)
2. [Galaxy-Wide Project System](#2-galaxy-wide-project-system)
3. [Project Specifications](#3-project-specifications)
4. [Contribution Mechanics](#4-contribution-mechanics)
5. [Progress Tracking](#5-progress-tracking)
6. [Phase System](#6-phase-system)
7. [Alliance Competition Within the Project](#7-alliance-competition-within-the-project)
8. [Individual Milestones](#8-individual-milestones)
9. [Reward Tiers](#9-reward-tiers)
10. [Permanent Benefits of Completed Projects](#10-permanent-benefits-of-completed-projects)
11. [Project Rotation and Selection](#11-project-rotation-and-selection)
12. [Project Failure and Extensions](#12-project-failure-and-extensions)
13. [Historical Record](#13-historical-record)
14. [Database Schema](#14-database-schema)
15. [API Endpoints](#15-api-endpoints)
16. [UI Design](#16-ui-design)
17. [Implementation Phases](#17-implementation-phases)

---

## 1. Design Goals and Principles

### Primary Goals

- **Galaxy-Wide Unity:** Every player in the game works toward a single shared objective. This creates a sense of collective purpose that no other system provides.
- **Inter-Alliance Competition:** While everyone contributes to the same project, alliances compete for who contributed the most. This layers cooperation (finish the project) with competition (rank highest).
- **Long-Term Engagement:** Projects run 30-90 real days, creating a persistent multi-week goal that transcends daily play sessions.
- **Meaningful World Change:** Completed projects permanently alter the game world -- new bonuses, new mechanics, new locations. The galaxy before the Space Elevator is different from the galaxy after it.

### Design Principles (Aligned with Existing Game Philosophy)

- **Never Take Things Away:** Contributions are permanent. Resources donated are gone, but the player receives contribution credit that can never be lost. If a project fails, contributors still receive participation rewards.
- **Participation Rewards:** Every player who contributes anything -- even a single unit of iron -- earns something. The system rewards participation at every scale, not just whales.
- **Async-First:** Contributions happen on the player's schedule. There are no time-critical windows or "you must be online at 8pm" moments. A player who contributes once a week is welcome alongside one who contributes daily.
- **No Pay-to-Win:** Pro/Enterprise subscribers do not get bonus contribution multipliers. Their contributions count equally to free-tier players.
- **Scalable Contribution:** A new player with $100M and an endgame player with $1T+ can both contribute meaningfully. Contribution tiers are designed so that even small donations register as progress.

### Why Galaxy-Wide (Not Per-Alliance)?

The existing alliance system already supports per-alliance cooperative goals (shared bonuses, alliance net worth tracking). Per-alliance mega-projects would be redundant with the Season 9 "Nebula Nexus" alliance projects described in the seasonal events design doc. Galaxy-wide projects serve a fundamentally different purpose:

- They create a **shared narrative** across the entire player base ("We built the Space Elevator together").
- They give **unallianced players** something collective to participate in.
- They provide a **server-wide event** that transcends alliance boundaries.
- The inter-alliance leaderboard within the project provides competitive tension without fragmenting the effort.

---

## 2. Galaxy-Wide Project System

### Core Concept

At any given time, exactly **one** Mega-Project is active for the entire galaxy. All players and alliances contribute to this single project. The project has a global progress bar, a deadline, and multiple construction phases. When the project completes (or fails), a new project begins after a cooldown.

### Project Lifecycle

```
[Announcement]  -->  [Active: Phase 1]  -->  [Phase 2]  -->  ...  -->  [Phase N]  -->  [Completion]  -->  [Cooldown]  -->  [Vote/Selection]  -->  [Next Project Announcement]
    3 days             Variable per project (30-90 days total)             3 days          5 days            3 days
```

### Timing

| Stage | Duration | Description |
|-------|----------|-------------|
| Announcement | 3 real days | Project revealed. Players can preview requirements. No contributions accepted yet. Builds anticipation. |
| Active | 30-90 real days (project-dependent) | Contributions accepted. Global progress bar fills. Phases unlock sequentially. |
| Completion Celebration | 3 real days | Progress frozen. Results calculated. Rewards distributed. Lore announcement posted. |
| Cooldown | 5 real days | No active project. Players rest. Next project vote opens on day 2 of cooldown. |
| Selection/Vote | 3 real days (overlaps with cooldown) | Players vote on the next project from 2-3 candidates. |

### Active Project State

At any moment, the server maintains a single `MegaProject` record with status `active`. All contribution APIs check this record. If no project is active, contribution endpoints return a "no active project" message with the countdown to the next one.

---

## 3. Project Specifications

### 3.1 Space Elevator

**Flavor:** The first orbital tether connecting Earth's surface to geostationary orbit. Eliminates the need for rocket launches for cargo delivery.

| Attribute | Value |
|-----------|-------|
| Duration | 30 real days |
| Phases | 3 |
| Difficulty | Entry-level (designed to be the first project) |
| Minimum players to complete | ~50 active contributors |
| Permanent benefit | -15% launch costs for all players, forever |

**Phase Breakdown:**

| Phase | Name | Duration Target | Resource Requirements | Cash Requirements |
|-------|------|-----------------|-----------------------|-------------------|
| 1 | Foundation Anchoring | Days 1-10 | 50,000 iron, 20,000 aluminum, 10,000 titanium | $50B total |
| 2 | Carbon Nanotube Tether | Days 11-22 | 30,000 titanium, 15,000 rare_earth, 5,000 exotic_materials | $100B total |
| 3 | Orbital Counterweight | Days 23-30 | 10,000 platinum_group, 5,000 exotic_materials, 2,000 helium3 | $75B total |

**Total Requirements:** 50,000 iron + 50,000 titanium + 20,000 aluminum + 15,000 rare_earth + 10,000 exotic_materials + 10,000 platinum_group + 2,000 helium3 + $225B cash

### 3.2 Generation Ship

**Flavor:** A self-sustaining vessel designed to carry 10,000 colonists to a distant star system over centuries. The ultimate expression of human ambition.

| Attribute | Value |
|-----------|-------|
| Duration | 60 real days |
| Phases | 4 |
| Difficulty | Mid-level |
| Minimum players to complete | ~100 active contributors |
| Permanent benefit | +10% all revenue for all players, forever. Unlocks "Interstellar" research branch. |

**Phase Breakdown:**

| Phase | Name | Duration Target | Resource Requirements | Cash Requirements |
|-------|------|-----------------|-----------------------|-------------------|
| 1 | Hull Superstructure | Days 1-15 | 200,000 iron, 100,000 aluminum, 50,000 titanium | $200B total |
| 2 | Life Support & Biomes | Days 16-30 | 80,000 lunar_water, 40,000 mars_water, 30,000 methane, 20,000 ethane | $300B total |
| 3 | Propulsion Array | Days 31-48 | 20,000 helium3, 10,000 exotic_materials, 50,000 rare_earth | $500B total |
| 4 | Population & Launch | Days 49-60 | 30,000 platinum_group, 15,000 gold, 5,000 exotic_materials | $250B total |

**Total Requirements:** 200,000 iron + 100,000 aluminum + 50,000 titanium + 80,000 lunar_water + 40,000 mars_water + 30,000 methane + 20,000 ethane + 20,000 helium3 + 15,000 exotic_materials + 50,000 rare_earth + 30,000 platinum_group + 15,000 gold + $1.25T cash

### 3.3 Dyson Sphere

**Flavor:** A megastructure enclosing the Sun to capture its total energy output. The ultimate infrastructure project.

| Attribute | Value |
|-----------|-------|
| Duration | 90 real days |
| Phases | 5 |
| Difficulty | Endgame (designed for a mature server with many active players) |
| Minimum players to complete | ~200 active contributors |
| Permanent benefit | +25% mining output for all players, forever. Unlocks "Solar Harvesting" building at Mercury. Free energy for all locations. |

**Phase Breakdown:**

| Phase | Name | Duration Target | Resource Requirements | Cash Requirements |
|-------|------|-----------------|-----------------------|-------------------|
| 1 | Mercury Smelting Complex | Days 1-18 | 500,000 iron, 200,000 aluminum, 100,000 titanium | $500B total |
| 2 | Solar Collector Array | Days 19-36 | 300,000 aluminum, 100,000 rare_earth, 50,000 platinum_group | $750B total |
| 3 | Energy Transmission Grid | Days 37-54 | 200,000 titanium, 80,000 gold, 40,000 exotic_materials | $1T total |
| 4 | Sphere Framework | Days 55-72 | 400,000 iron, 150,000 titanium, 100,000 rare_earth, 50,000 helium3 | $1.5T total |
| 5 | Sphere Completion | Days 73-90 | 200,000 exotic_materials, 100,000 helium3, 50,000 platinum_group | $2T total |

**Total Requirements:** 900,000 iron + 500,000 aluminum + 450,000 titanium + 200,000 rare_earth + 100,000 platinum_group + 80,000 gold + 240,000 exotic_materials + 150,000 helium3 + $5.75T cash

### 3.4 Interstellar Probe

**Flavor:** A relativistic probe launched toward Alpha Centauri, carrying humanity's knowledge and ambitions across the void.

| Attribute | Value |
|-----------|-------|
| Duration | 45 real days |
| Phases | 3 |
| Difficulty | Mid-high |
| Minimum players to complete | ~80 active contributors |
| Permanent benefit | +20% research speed for all players, forever. Unlocks "Deep Space Telemetry" service. |

**Phase Breakdown:**

| Phase | Name | Duration Target | Resource Requirements | Cash Requirements |
|-------|------|-----------------|-----------------------|-------------------|
| 1 | Probe Chassis & Instruments | Days 1-15 | 100,000 titanium, 50,000 platinum_group, 30,000 rare_earth | $300B total |
| 2 | Antimatter Drive Core | Days 16-32 | 30,000 helium3, 20,000 exotic_materials, 80,000 iron | $600B total |
| 3 | Launch & Acceleration | Days 33-45 | 50,000 helium3, 10,000 exotic_materials, 40,000 methane | $400B total |

**Total Requirements:** 80,000 iron + 100,000 titanium + 50,000 platinum_group + 30,000 rare_earth + 80,000 helium3 + 30,000 exotic_materials + 40,000 methane + $1.3T cash

### Requirement Calibration Notes

These numbers are calibrated against the existing resource economy:

- **Iron** is the most abundant resource (500/month from asteroid mining, 200/month from Mars). A single active asteroid miner produces ~15,000 iron per real month.
- **Exotic materials** are the rarest (5/month from Europa mining). Only endgame players with Europa access can contribute these. The exotic material requirements are deliberately tight to make every unit precious.
- **Helium-3** is scarce (2/month from lunar mining). Projects requiring large amounts of He-3 depend on many players contributing small amounts over weeks.
- **Cash requirements** are benchmarked against the economy. A mid-game player earning ~$1B/real-day can contribute $10-30B over a project. An endgame player earning $50B+/real-day can contribute $500B+. The total cash requirements assume 30-50% comes from the top 10% of contributors and 50-70% from the broad base.

---

## 4. Contribution Mechanics

### 4.1 How Players Contribute

Players contribute through a dedicated "Mega-Project" contribution interface accessible from the project dashboard. Two contribution types:

**Resource Contribution:**
- Player selects a resource and quantity from their inventory.
- Resources are permanently consumed (removed from `GameState.resources`).
- Contribution is credited to the player, their alliance, and the global total.
- Only resources needed by the **current phase** can be contributed. Players cannot contribute Phase 3 resources during Phase 1.

**Cash Contribution:**
- Player specifies a cash amount.
- Cash is deducted from `GameState.money` (via the existing sync mechanism).
- Minimum contribution: $1M (prevents spam). Maximum per transaction: 10% of player's current cash balance (prevents accidental all-in).
- No daily cap on total cash contributions. Players can make multiple contributions.

### 4.2 Contribution Value Normalization

To fairly compare resource contributions against cash contributions and rank players/alliances, all contributions are converted to a single unit: **Mega-Project Points (MPP)**.

**Conversion Formula:**

```
MPP_resource = quantity * resource_base_market_price * MEGA_PROJECT_RESOURCE_MULTIPLIER
MPP_cash     = cash_amount * MEGA_PROJECT_CASH_MULTIPLIER
```

| Resource | Base Market Price (from resources.ts) | MPP per Unit |
|----------|--------------------------------------|-------------|
| iron | $5,000 | 7,500 |
| aluminum | $8,000 | 12,000 |
| titanium | $25,000 | 37,500 |
| platinum_group | $500,000 | 750,000 |
| gold | $300,000 | 450,000 |
| rare_earth | $200,000 | 300,000 |
| methane | $15,000 | 22,500 |
| ethane | $20,000 | 30,000 |
| lunar_water | $50,000 | 75,000 |
| mars_water | $80,000 | 120,000 |
| exotic_materials | $2,000,000 | 3,000,000 |
| helium3 | $5,000,000 | 7,500,000 |

`MEGA_PROJECT_RESOURCE_MULTIPLIER = 1.5` (resources are worth 50% more than their cash value, because players must mine/acquire them, which represents labor).

`MEGA_PROJECT_CASH_MULTIPLIER = 1.0` ($1M cash = 1,000,000 MPP).

**Why the 1.5x resource multiplier?** Players who contribute resources have invested time mining, trading, and transporting those resources. Cash can be earned passively from services. The 1.5x multiplier ensures resource contributors are not penalized for choosing the harder contribution path.

### 4.3 Contribution Scaling for New Players

To ensure new players ($100M-$1B range) feel their contributions matter:

- **Small Contributor Bonus:** Players whose total contribution is less than 0.01% of the project's total requirements receive a 2x MPP multiplier on all contributions. This means a new player donating 10 iron gets 2x the MPP. The bonus disappears once their cumulative contribution crosses the 0.01% threshold.
- **First Contribution Bonus:** A player's very first contribution to any mega-project ever gives a flat +10,000 MPP bonus. One-time, never repeats.

### 4.4 Contribution Limits

| Limit | Value | Rationale |
|-------|-------|-----------|
| Minimum resource contribution | 1 unit | Even 1 iron counts |
| Maximum resource contribution per transaction | Player's entire inventory of that resource | No artificial cap on resource generosity |
| Minimum cash contribution | $1,000,000 | Prevents micro-spam |
| Maximum cash per transaction | 10% of current cash balance | Safety valve against misclicks |
| Maximum cash per real day | 50% of current cash balance | Prevents players from zeroing themselves |
| Contribution cooldown | None | Contribute as often as you want |

### 4.5 Contribution Timing

Contributions are processed during the standard 60-second game sync cycle. When a player submits a contribution via the UI:

1. Client sends a contribution request to the API.
2. Server validates: player has the resources/cash, project is active, phase accepts this resource.
3. Server deducts resources/cash from the player's game state in a Prisma transaction.
4. Server creates a `MegaProjectContribution` record.
5. Server increments the project's global progress counters.
6. Server increments the player's personal contribution counters.
7. Server increments the alliance's contribution counters (if player is in an alliance).
8. Updated state is sent back to the client on next sync.

All of steps 3-7 happen in a single `prisma.$transaction()` to ensure atomicity.

---

## 5. Progress Tracking

### 5.1 Global Progress Bar

The primary visual element: a large progress bar showing the project's overall completion percentage.

**Calculation:**

```
phase_progress[i] = for each resource in phase[i]:
    min(1.0, contributed[resource] / required[resource])
  average of all resource fill ratios, weighted equally

  + min(1.0, contributed_cash / required_cash) as an additional term

overall_phase_progress[i] = average(all resource ratios + cash ratio)

global_progress = sum(phase_weight[i] * overall_phase_progress[i]) for all phases
```

Phase weights are proportional to their share of total requirements. Example for Space Elevator:
- Phase 1: 22% weight (lower requirements)
- Phase 2: 44% weight (mid requirements)
- Phase 3: 34% weight (high-value requirements)

A phase is **complete** when ALL resources AND cash for that phase reach 100%. The next phase then unlocks.

### 5.2 Phase-Level Detail

Each phase shows:
- Individual progress bars per resource (e.g., "Iron: 34,200 / 50,000")
- Cash progress bar (e.g., "$32B / $50B")
- Phase completion percentage
- Time remaining in the project
- Estimated completion date (extrapolated from contribution velocity)

### 5.3 Alliance Contribution Rankings

A leaderboard showing all alliances ranked by total MPP contributed to the current project.

| Rank | Alliance | Tag | Members Contributing | Total MPP | % of Project |
|------|----------|-----|---------------------|-----------|-------------|
| 1 | Solar Dominion | [SOL] | 18/20 | 2.4B MPP | 12.3% |
| 2 | Mars Collective | [MARS] | 15/20 | 1.8B MPP | 9.2% |
| ... | ... | ... | ... | ... | ... |

**Unallianced players** are aggregated under a "Independent Contributors" row at the bottom (not ranked, but their total is shown).

### 5.4 Individual Contribution Rankings

A leaderboard showing the top individual contributors.

| Rank | Company | Alliance | Total MPP | Contribution Tier |
|------|---------|----------|-----------|-------------------|
| 1 | Nova Aerospace | [SOL] | 450M MPP | Architect |
| 2 | StarForge Ltd | [MARS] | 380M MPP | Architect |
| ... | ... | ... | ... | ... |

The player's own position is always shown, even if they are rank #347.

### 5.5 Contribution Velocity Tracker

A graph showing the rate of contributions over time (contributions per real hour, averaged over 6-hour windows). This creates a sense of momentum:

- "The galaxy is contributing 2.3B MPP/day -- at this rate, we'll finish Phase 2 in 4 days!"
- If velocity drops, the UI shows a gentle nudge: "Contribution rate has slowed. Every bit helps!"

### 5.6 Real-Time-ish Updates

The global progress bar and rankings update every 60 seconds (aligned with the game sync cycle). This is frequent enough to feel responsive without requiring WebSocket infrastructure.

---

## 6. Phase System

### 6.1 How Phases Work

Each mega-project is divided into 3-5 sequential phases. Phases must be completed in order. A phase is complete when **all** of its resource requirements AND its cash requirement are met.

**Phase Gating:** During Phase 1, only Phase 1 resources/cash can be contributed. Once Phase 1 completes, Phase 2 opens and Phase 1 contributions are locked (cannot be undone). This prevents players from stockpiling resources for a later, more prestigious phase.

**Phase Transition:** When a phase completes, the following happens:
1. All players receive a toast notification: "Phase 1 Complete! Phase 2 Now Open!"
2. A `PlayerActivity` entry is created: "The galaxy completed Phase 1 of the Space Elevator!"
3. Phase 2's resource requirements become visible and contributable.
4. The progress bar jumps to reflect the completed phase.

### 6.2 Phase Escalation

Later phases require rarer, more expensive resources. This is deliberate:

- **Phase 1** uses common resources (iron, aluminum) so that all players, including new ones, can contribute immediately.
- **Middle phases** introduce mid-tier resources (titanium, rare_earth, methane) that require Mars/asteroid access.
- **Final phases** require endgame resources (exotic_materials, helium3) that only advanced players can provide.

This ensures the project cannot be completed by new players alone (they lack rare resources) or by whales alone (they cannot mine enough common resources fast enough). It takes the whole galaxy.

### 6.3 Phase Bonus Rewards

Completing a phase before its "duration target" date earns the entire galaxy a bonus:

| Early Completion | Bonus |
|------------------|-------|
| 3+ days early | +5% bonus to the project's permanent reward |
| 7+ days early | +10% bonus |
| 14+ days early | +15% bonus (cap) |

These bonuses stack across phases. If Phase 1 finishes 3 days early (+5%) and Phase 2 finishes 7 days early (+10%), the final permanent reward is boosted by 15%.

---

## 7. Alliance Competition Within the Project

### 7.1 Alliance Contribution Score

Each alliance's total MPP is the sum of all contributions from its members. The alliance leaderboard ranks alliances by total MPP.

**Per-Capita Metric:** In addition to raw total, the leaderboard shows "MPP per member" to prevent large alliances from always dominating. A 5-person alliance averaging 100M MPP/member is more impressive than a 20-person alliance with 20M MPP/member.

Both metrics are visible. The **primary ranking** uses total MPP (because total contribution is what finishes the project). The **secondary ranking** (togglable) uses per-capita MPP.

### 7.2 Alliance Milestones

Alliances earn milestones during the project:

| Milestone | Requirement | Reward |
|-----------|-------------|--------|
| First to Contribute | First alliance with a member contribution | Alliance badge + 100M MPP bonus credited |
| Phase Pioneer | First alliance to contribute to a newly opened phase | Alliance badge |
| 1% Club | Contribute 1% of total project requirements | Alliance title for duration of project |
| 5% Club | Contribute 5% of total project requirements | Alliance title + 500M cash to alliance treasury |
| 10% Club | Contribute 10% of total project requirements | Alliance title + 2B cash + exclusive alliance badge |
| Full Mobilization | Every member of the alliance has contributed at least once | 50M cash per member + alliance badge |

### 7.3 Alliance Treasury Contributions

Alliance leaders and officers can contribute directly from the **alliance treasury** (if the game adds a shared treasury in the alliance system -- currently not in schema, so this is a forward-looking feature). For now, all contributions are individual.

---

## 8. Individual Milestones

### 8.1 Contribution Tiers

Every player has a personal contribution tier based on their cumulative MPP in the current project. Tiers are designed so that a new player can reach Tier 3 with consistent play, and only the most dedicated players reach Tier 7.

| Tier | Name | MPP Required | Typical Player | Icon |
|------|------|-------------|----------------|------|
| 0 | Observer | 0 | Has not contributed | -- |
| 1 | Supporter | 100,000 | New player, 1-2 small contributions | Bronze wrench |
| 2 | Builder | 1,000,000 | Regular contributor, early game | Silver wrench |
| 3 | Engineer | 10,000,000 | Consistent contributor, mid game | Gold wrench |
| 4 | Foreman | 50,000,000 | Dedicated contributor, mid-late game | Platinum wrench |
| 5 | Architect | 250,000,000 | Heavy contributor, late game | Diamond wrench |
| 6 | Master Builder | 1,000,000,000 | Top-tier contributor, endgame | Crystal wrench |
| 7 | Galactic Founder | 5,000,000,000 | Extreme dedication, whale-level | Animated star wrench |

**Tier Scaling Rationale:**
- Tier 1 (100K MPP): Achievable by donating ~13 iron (13 * 7,500 = 97,500). Any player can reach this.
- Tier 3 (10M MPP): Achievable by donating ~1,333 iron or $10M cash. A mid-game player can reach this in a few days.
- Tier 5 (250M MPP): Requires substantial resource or cash investment. Roughly $250M cash or equivalent resources.
- Tier 7 (5B MPP): Requires $5B+ in cash/resources. Only achievable by endgame players over the full project duration.

### 8.2 Individual Milestone Rewards

Each tier grants a reward upon reaching it. Rewards are **never lost**, even if the project fails.

| Tier | Reward |
|------|--------|
| 1 - Supporter | 10M cash + "Project Supporter" badge |
| 2 - Builder | 50M cash + 50 iron |
| 3 - Engineer | 200M cash + common cosmetic (project-themed ship skin) |
| 4 - Foreman | 1B cash + uncommon cosmetic (project-themed station theme) |
| 5 - Architect | 5B cash + rare cosmetic (animated project badge) |
| 6 - Master Builder | 20B cash + epic cosmetic (project nameplate) |
| 7 - Galactic Founder | 100B cash + legendary cosmetic (animated trail effect) + permanent title: "[Project Name] Founder" |

### 8.3 Streak Tracking

Players who contribute to **consecutive** mega-projects (at least Tier 1 in each) earn a streak bonus:

| Streak | Bonus |
|--------|-------|
| 2 projects | +5% MPP on all contributions |
| 3 projects | +10% MPP on all contributions |
| 5 projects | +15% MPP + "Dedicated Builder" title |
| 10 projects | +20% MPP + legendary "Eternal Builder" badge |

The streak bonus applies as a multiplier on MPP earned, not on the underlying contribution. It does not affect the actual resources/cash deducted.

---

## 9. Reward Tiers

### 9.1 Completion Rewards (Project Succeeds)

When the project reaches 100% before its deadline, ALL contributors receive rewards based on their contribution tier. These are in addition to the tier milestone rewards from Section 8.

**Universal Completion Reward (every contributor, regardless of tier):**
- 500M cash
- "We Built [Project Name]" badge (permanent, shows project and completion date)
- 100 of a random common resource

**Tier-Scaled Completion Bonus:**

| Tier | Cash Bonus | Resource Bonus | Cosmetic |
|------|------------|----------------|----------|
| 1 | 100M | 50 iron | -- |
| 2 | 500M | 100 mixed resources | Common badge variant |
| 3 | 2B | 200 mixed resources | Uncommon badge variant |
| 4 | 10B | 500 mixed resources | Rare badge variant |
| 5 | 50B | 1,000 mixed resources + 10 rare_earth | Epic badge variant |
| 6 | 200B | 2,000 mixed resources + 50 exotic_materials | Epic animated badge |
| 7 | 1T | 5,000 mixed resources + 100 helium3 | Legendary animated badge |

### 9.2 Top Contributing Alliance Rewards

| Placement | Reward |
|-----------|--------|
| 1st Alliance (total MPP) | "Project Champion" alliance badge + 100B shared cash + naming rights (see Section 13) + exclusive alliance station theme |
| 2nd Alliance | "Project Vanguard" alliance badge + 50B shared cash |
| 3rd Alliance | "Project Pioneer" alliance badge + 25B shared cash |
| 1st Alliance (per-capita MPP) | "Most Dedicated" alliance badge + 30B shared cash |

### 9.3 Top Individual Contributor Rewards

| Placement | Reward |
|-----------|--------|
| 1st overall | "Project Visionary" legendary title + 500B cash + naming rights sub-component + animated profile effect |
| 2nd overall | "Project Luminary" epic title + 200B cash |
| 3rd overall | "Project Pioneer" epic title + 100B cash |
| Top 10 | Rare animated badge + 50B cash |
| Top 1% | Rare badge + 20B cash |
| Top 10% | Uncommon badge + 5B cash |

### 9.4 Permanent Benefit (See Section 10)

The most important reward: the completed project permanently changes the game world for all players, including those who did not contribute.

---

## 10. Permanent Benefits of Completed Projects

### Design Philosophy

Completed mega-projects provide **permanent, galaxy-wide bonuses** that benefit ALL players -- even those who never contributed. This follows the "never take things away" principle and ensures the game world evolves in a positive direction.

These bonuses are cumulative. A galaxy with 3 completed projects has all 3 bonuses active simultaneously.

### Project-Specific Permanent Benefits

**Space Elevator (Completed):**
- `-15%` to all launch-related building costs (launch pads, rockets)
- `-10%` to cargo shipping costs between Earth Surface and Earth Orbit locations
- New building unlocked: "Elevator Terminal" at Earth Surface (provides passive $50M/month revenue)
- Lore update: The in-game solar system map shows a visible tether between Earth and GEO

**Generation Ship (Completed):**
- `+10%` revenue for all players (applied as a global multiplier in the game engine)
- New research branch: "Interstellar Technologies" (5 researches focused on ultra-long-range systems)
- New location unlocked: "Generation Ship (In Transit)" -- a symbolic location where players can build a unique "Colony Preparation Module" building ($50B cost, $500M/month revenue)
- Lore update: A counter showing "Distance to Alpha Centauri: X light-years" appears on the dashboard

**Dyson Sphere (Completed):**
- `+25%` mining output for all players (applied via the mining production multiplier)
- Free energy: All building maintenance costs reduced by 10% (energy is now free)
- New building unlocked: "Solar Harvesting Station" at Mercury ($200B cost, $5B/month revenue)
- All solar farm buildings produce 3x revenue
- Lore update: The Sun on the solar system map gains a visible ring structure

**Interstellar Probe (Completed):**
- `+20%` research speed for all players (applied to real-time research duration)
- New service unlocked: "Deep Space Telemetry" (requires datacenter, provides $200M/month + bonus research data)
- All survey expeditions complete 25% faster
- Lore update: An "Alpha Centauri Signal" counter appears, ticking up every real day

### Bonus Scaling from Early Phase Completion

If phases complete early (see Section 6.3), the percentage bonuses increase:

| Base Bonus | +5% early | +10% early | +15% early |
|------------|-----------|------------|------------|
| -15% launch costs | -15.75% | -16.5% | -17.25% |
| +10% revenue | +10.5% | +11.0% | +11.5% |
| +25% mining | +26.25% | +27.5% | +28.75% |
| +20% research speed | +21.0% | +22.0% | +23.0% |

### Implementation in Game Engine

Completed project bonuses are stored in a server-side `CompletedMegaProjects` table and loaded during game state initialization. The `processTick()` function in `game-engine.ts` checks for active bonuses and applies the relevant multipliers.

```
// Pseudocode for applying mega-project bonuses in processTick()
const completedProjects = getCompletedMegaProjects(); // cached, refreshed hourly

for (const project of completedProjects) {
  if (project.type === 'space_elevator') {
    launchCostMultiplier *= (1 - project.bonusPct * 0.15);
  }
  if (project.type === 'generation_ship') {
    revenueMultiplier *= (1 + project.bonusPct * 0.10);
  }
  if (project.type === 'dyson_sphere') {
    miningMultiplier *= (1 + project.bonusPct * 0.25);
    maintenanceMultiplier *= 0.90;
  }
  if (project.type === 'interstellar_probe') {
    researchSpeedMultiplier *= (1 + project.bonusPct * 0.20);
  }
}
```

Where `project.bonusPct` is `1.0` for on-time completion, up to `1.15` for maximum early completion.

---

## 11. Project Rotation and Selection

### 11.1 First Project

The very first mega-project is **predetermined**: the Space Elevator. It is the simplest, shortest, and uses the most common resources. It introduces the mechanic to all players without requiring endgame resources.

### 11.2 Subsequent Projects: Player Vote

After the first project, subsequent projects are selected by player vote during the cooldown period.

**Vote Mechanics:**

1. During the 5-day cooldown after a project completes (or fails), the server selects 2-3 candidate projects from the pool of uncompleted projects.
2. On cooldown day 2, the vote opens. All players who contributed to the previous project (Tier 1+) get one vote. Players who did not contribute do not vote (incentivizes participation).
3. Voting is simple: pick one of the candidates. No ranked choice. Majority wins.
4. If tied, the project with fewer total resource requirements wins (to keep momentum).
5. Vote closes on cooldown day 4. Result announced on cooldown day 5. New project announcement begins.

**Vote Weight:** All votes are equal. A Tier 7 contributor does not get more votes than a Tier 1 contributor. One player, one vote.

### 11.3 Project Pool and Repetition

The four projects (Space Elevator, Generation Ship, Dyson Sphere, Interstellar Probe) form the initial pool. Once a project is completed, it is removed from the pool. If all four are completed, the system enters **Legacy Mode**:

**Legacy Mode Projects:**
After all four core projects are completed, the system generates **Legacy Variants** -- enhanced versions of completed projects that provide smaller incremental bonuses:

| Legacy Project | Duration | Permanent Bonus |
|----------------|----------|----------------|
| Space Elevator Mk. II | 30 days | Additional -5% launch costs |
| Generation Ship: Odyssey | 60 days | Additional +5% revenue |
| Dyson Sphere: Inner Ring | 90 days | Additional +10% mining output |
| Interstellar Probe: Voyager II | 45 days | Additional +10% research speed |

Legacy projects have 1.5x the resource requirements of the originals (the galaxy is richer now). Legacy projects can repeat indefinitely, with diminishing returns: each repetition provides 50% of the previous bonus (Mk. III gives +2.5%, Mk. IV gives +1.25%, etc.).

### 11.4 Candidate Selection Algorithm

When selecting candidates for the vote:

1. Remove all completed projects from the pool.
2. If pool has 2-3 projects, show all of them.
3. If pool has 4+ projects (legacy mode), select 3 based on:
   - At least one "short" project (30-45 days)
   - At least one that uses a different primary resource than the last completed project
   - Weighted random from remaining eligible projects

---

## 12. Project Failure and Extensions

### 12.1 What Happens If the Deadline Passes?

Following the "never take things away" principle, project failure is **soft**:

**Automatic Extension:**
If the project is at **50% or more** completion when the deadline arrives, the project automatically receives a **14-day extension**. This extension can happen **once** per project.

- The extension is announced to all players: "The [Project Name] has been extended by 14 days! We're at X% -- let's finish this!"
- During the extension, contribution rates receive a **1.5x MPP multiplier** (urgency bonus) to incentivize a final push.
- If the project completes during the extension, it is considered a success with reduced bonuses (see below).

**Project Shelving (Failure):**
If the project is below 50% at the deadline, OR if the extension period also expires without completion, the project is **shelved**:

- Status changes to `shelved`.
- All contributors keep their personal tier rewards and badges (never taken away).
- No completion rewards are distributed.
- No permanent game-world bonus is applied.
- The project returns to the candidate pool for future votes, with progress **reset to 0%**.
- A "Shelved Projects" section in the history shows what happened.

### 12.2 Extension Completion Penalties

Projects completed during the extension receive reduced permanent bonuses:

| Original Bonus | Extension Completion |
|----------------|---------------------|
| -15% launch costs | -10% launch costs |
| +10% revenue | +7% revenue |
| +25% mining | +17% mining |
| +20% research speed | +14% research speed |

This creates urgency to finish on time while still rewarding the effort.

### 12.3 Contribution Refund on Failure

**Resources and cash are NOT refunded.** This is deliberate:

1. Refunding would create a perverse incentive to contribute last-minute only (risk-free contribution).
2. The tier rewards players earned during the project are their compensation for the risk.
3. The contribution history is preserved and visible in the player's profile.

However, if a failed project is later re-attempted and succeeds, players who contributed to the failed attempt receive a **"Veteran Contributor"** 1.25x MPP bonus during the re-attempt. Their previous contributions do not carry over (resource requirements reset), but they are recognized.

---

## 13. Historical Record

### 13.1 Completed Projects Gallery

A permanent, publicly visible gallery showing all completed mega-projects:

| Field | Example |
|-------|---------|
| Project Name | The Shackleton Space Elevator |
| Type | Space Elevator |
| Named By | [SOL] Solar Dominion (1st place alliance) |
| Top Contributor | Nova Aerospace ([SOL]) |
| Completion Date | 2026-05-15 |
| Duration | 28 days (2 days early) |
| Total Contributors | 342 players |
| Total MPP Contributed | 48.2B |
| Permanent Bonus | -15.75% launch costs |
| Phases Completed Early | 2 of 3 |

### 13.2 Naming Rights

The **1st-place alliance** in total MPP earns the right to name the completed project. The alliance leader submits a name (up to 40 characters, profanity-filtered). If no name is submitted within 48 hours, the default name is used (e.g., "Space Elevator Alpha").

The **1st-place individual** earns the right to name a sub-component. For example:
- Space Elevator: name the orbital counterweight
- Generation Ship: name the ship itself
- Dyson Sphere: name the primary collector array
- Interstellar Probe: name the probe

### 13.3 Player Contribution History

Each player's game profile shows a "Mega-Projects" section:

```
MEGA-PROJECTS
--------------
[*] The Shackleton Space Elevator  |  Tier 5 (Architect)  |  243M MPP  |  Rank #12
[*] Generation Ship: Odyssey       |  Tier 3 (Engineer)   |  15M MPP   |  Rank #89
[ ] Dyson Sphere                   |  In Progress         |  Current Tier: Builder
```

This history is visible to other players when viewing a profile, serving as a badge of honor.

### 13.4 Alliance Contribution History

Similarly, the alliance page shows cumulative mega-project performance:

```
ALLIANCE MEGA-PROJECT RECORD
-----------------------------
Space Elevator:    1st place  |  4.2B MPP  |  12.3% of total
Generation Ship:   3rd place  |  8.1B MPP  |   6.5% of total
```

---

## 14. Database Schema

### New Prisma Models

```prisma
// ─── Cooperative Mega-Projects ────────────────────────────────────────────────

model MegaProject {
  id              String    @id @default(cuid())
  type            String    // "space_elevator", "generation_ship", "dyson_sphere", "interstellar_probe"
  variant         Int       @default(0) // 0 = original, 1 = Mk. II, 2 = Mk. III, etc.
  customName      String?   // Naming rights: set by winning alliance
  subComponentName String?  // Named by top individual contributor

  status          String    @default("announced") // announced, active, extended, completed, shelved
  currentPhase    Int       @default(1)

  // Scheduling
  announcedAt     DateTime?
  startsAt        DateTime
  endsAt          DateTime // Original deadline
  extendedEndsAt  DateTime? // If extended, the new deadline
  completedAt     DateTime?

  // Global progress (denormalized for fast reads)
  totalMppContributed   Float   @default(0)
  totalCashContributed  Float   @default(0)
  totalContributors     Int     @default(0)
  completionPct         Float   @default(0) // 0.0 - 100.0

  // Phase progress (JSON for flexibility)
  // Shape: { "1": { "iron": 34200, "aluminum": 15000, ..., "cash": 32000000000 }, "2": { ... } }
  phaseProgress   Json      @default("{}")

  // Phase completion timestamps
  // Shape: { "1": "2026-04-10T...", "2": "2026-04-22T..." }
  phaseCompletedAt Json     @default("{}")

  // Bonus from early phase completion (1.0 = no bonus, up to 1.15)
  earlyCompletionMultiplier Float @default(1.0)

  // Configuration (requirements per phase, stored as JSON)
  // Shape: { "1": { "resources": { "iron": 50000, ... }, "cash": 50000000000, "durationDays": 10 }, ... }
  phaseConfig     Json

  // Results (populated on completion)
  permanentBonusType  String?   // e.g., "launch_cost_reduction"
  permanentBonusPct   Float?    // e.g., 0.1575 for 15.75%

  // Vote info (for next project selection)
  selectedByVote  Boolean   @default(false)
  voteCount       Int?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  contributions       MegaProjectContribution[]
  allianceScores      MegaProjectAllianceScore[]
  playerProgress      MegaProjectPlayerProgress[]
  votes               MegaProjectVote[]

  @@index([status])
  @@index([type, variant])
  @@index([startsAt])
}

model MegaProjectContribution {
  id              String      @id @default(cuid())
  projectId       String
  project         MegaProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  profileId       String
  profile         GameProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  allianceId      String?     // Null if player is not in an alliance
  phase           Int         // Which phase this contribution was for

  // What was contributed
  contributionType  String    // "resource" or "cash"
  resourceSlug      String?   // e.g., "iron", "titanium" (null for cash contributions)
  quantity          Float     // Units of resource, or dollar amount for cash
  mppEarned         Float     // Mega-Project Points earned from this contribution

  createdAt       DateTime    @default(now())

  @@index([projectId, profileId])
  @@index([projectId, allianceId])
  @@index([projectId, phase])
  @@index([projectId, createdAt])
  @@index([profileId])
}

model MegaProjectPlayerProgress {
  id              String      @id @default(cuid())
  projectId       String
  project         MegaProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  profileId       String
  profile         GameProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  totalMpp        Float       @default(0)
  totalCash       Float       @default(0)
  totalResources  Json        @default("{}") // { "iron": 5000, "titanium": 200, ... }
  contributionCount Int       @default(0)

  currentTier     Int         @default(0) // 0-7 (see Section 8.1)
  rank            Int?        // Computed periodically

  // Streak tracking
  consecutiveProjects Int     @default(0)
  streakMultiplier    Float   @default(1.0)

  // Reward claim tracking
  tierRewardsClaimed  Int[]   @default([]) // List of tier numbers already claimed
  completionRewardClaimed Boolean @default(false)

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@unique([projectId, profileId])
  @@index([projectId, totalMpp(sort: Desc)])
  @@index([projectId, currentTier])
  @@index([profileId])
}

model MegaProjectAllianceScore {
  id              String      @id @default(cuid())
  projectId       String
  project         MegaProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  allianceId      String
  alliance        Alliance    @relation(fields: [allianceId], references: [id], onDelete: Cascade)

  totalMpp        Float       @default(0)
  totalCash       Float       @default(0)
  memberCount     Int         @default(0) // Members who have contributed at least once
  totalMembers    Int         @default(0) // Total alliance members at time of last update
  rank            Int?        // Computed periodically
  perCapitaMpp    Float       @default(0) // totalMpp / memberCount

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@unique([projectId, allianceId])
  @@index([projectId, totalMpp(sort: Desc)])
  @@index([projectId, perCapitaMpp(sort: Desc)])
}

model MegaProjectVote {
  id              String      @id @default(cuid())
  projectId       String      // The project being voted FOR
  project         MegaProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  profileId       String
  profile         GameProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  voteCycleId     String      // Groups votes from the same selection cycle

  createdAt       DateTime    @default(now())

  @@unique([voteCycleId, profileId]) // One vote per player per cycle
  @@index([projectId, voteCycleId])
  @@index([voteCycleId])
}

// Tracks completed project bonuses that are permanently active
model CompletedMegaProjectBonus {
  id                  String    @id @default(cuid())
  projectId           String    @unique
  projectType         String    // "space_elevator", "generation_ship", etc.
  variant             Int       @default(0)
  customName          String?
  completedAt         DateTime
  bonusType           String    // "launch_cost_reduction", "revenue_boost", "mining_boost", "research_speed"
  bonusValue          Float     // The actual multiplier value (e.g., 0.1575 for 15.75%)
  totalContributors   Int
  topAllianceId       String?
  topAllianceName     String?
  topContributorId    String?
  topContributorName  String?

  createdAt           DateTime  @default(now())

  @@index([projectType])
}
```

### Modifications to Existing Models

**GameProfile** -- Add relations:

```prisma
// Add to existing GameProfile model:
megaProjectContributions  MegaProjectContribution[]
megaProjectProgress       MegaProjectPlayerProgress[]
megaProjectVotes          MegaProjectVote[]
```

**Alliance** -- Add relation:

```prisma
// Add to existing Alliance model:
megaProjectScores         MegaProjectAllianceScore[]
```

---

## 15. API Endpoints

### 15.1 Player-Facing Endpoints

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/space-tycoon/mega-project/current` | GET | Get active project info, global progress, player's progress | Required |
| `/api/space-tycoon/mega-project/contribute` | POST | Submit a resource or cash contribution | Required |
| `/api/space-tycoon/mega-project/leaderboard` | GET | Get alliance and individual leaderboards | Required |
| `/api/space-tycoon/mega-project/claim-reward` | POST | Claim a tier milestone reward | Required |
| `/api/space-tycoon/mega-project/claim-completion` | POST | Claim completion reward (after project finishes) | Required |
| `/api/space-tycoon/mega-project/history` | GET | Get completed project gallery and player's history | Required |
| `/api/space-tycoon/mega-project/vote` | POST | Submit vote for next project | Required |
| `/api/space-tycoon/mega-project/vote/candidates` | GET | Get current vote candidates and results | Required |

### 15.2 Server/Cron Endpoints

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/cron/mega-project/tick` | POST | Process project state: check phase completion, check deadlines, update rankings | Cron secret |
| `/api/cron/mega-project/transition` | POST | Handle project lifecycle transitions (announce, activate, extend, complete, shelve) | Cron secret |
| `/api/cron/mega-project/vote-resolve` | POST | Resolve vote and create next project | Cron secret |

### 15.3 Admin Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/mega-projects` | GET | List all projects (active, completed, shelved) |
| `/api/admin/mega-projects/[id]` | GET/PATCH | View/modify project details |
| `/api/admin/mega-projects/create` | POST | Manually create a project (override normal rotation) |
| `/api/admin/mega-projects/[id]/extend` | POST | Manually extend a project deadline |
| `/api/admin/mega-projects/[id]/complete` | POST | Manually complete a project (testing/emergency) |

### 15.4 Endpoint Details

**POST `/api/space-tycoon/mega-project/contribute`**

Request body:
```json
{
  "contributionType": "resource",
  "resourceSlug": "iron",
  "quantity": 500
}
```
or:
```json
{
  "contributionType": "cash",
  "amount": 50000000000
}
```

Response:
```json
{
  "success": true,
  "contribution": {
    "id": "clx...",
    "mppEarned": 5625000,
    "newTotalMpp": 12450000,
    "newTier": 3,
    "tierUp": true,
    "tierReward": { "cash": 200000000, "cosmetic": "skin_elevator_common" }
  },
  "projectProgress": {
    "phasePct": 68.4,
    "globalPct": 34.2,
    "phaseResourceProgress": { "iron": { "contributed": 34700, "required": 50000 } }
  }
}
```

**GET `/api/space-tycoon/mega-project/current`**

Response:
```json
{
  "project": {
    "id": "clx...",
    "type": "space_elevator",
    "customName": null,
    "status": "active",
    "currentPhase": 2,
    "startsAt": "2026-04-01T00:00:00Z",
    "endsAt": "2026-05-01T00:00:00Z",
    "completionPct": 54.3,
    "totalContributors": 187,
    "totalMppContributed": 26100000000,
    "phaseProgress": {
      "1": { "iron": 50000, "aluminum": 20000, "titanium": 10000, "cash": 50000000000, "complete": true },
      "2": { "titanium": 8200, "rare_earth": 6100, "exotic_materials": 1200, "cash": 45000000000, "complete": false },
      "3": { "locked": true }
    },
    "velocity": { "mppPerDay": 870000000, "estimatedCompletionDate": "2026-04-28T00:00:00Z" }
  },
  "playerProgress": {
    "totalMpp": 12450000,
    "currentTier": 3,
    "rank": 42,
    "contributionCount": 15,
    "totalResources": { "iron": 1200, "titanium": 50 },
    "totalCash": 5000000000,
    "streakMultiplier": 1.05,
    "unclaimedTierRewards": [3]
  },
  "allianceProgress": {
    "allianceId": "clx...",
    "allianceName": "Solar Dominion",
    "totalMpp": 2400000000,
    "rank": 1,
    "memberCount": 18,
    "perCapitaMpp": 133333333
  }
}
```

**GET `/api/space-tycoon/mega-project/leaderboard`**

Query params: `?type=alliance|individual&limit=20&offset=0`

Response (alliance):
```json
{
  "type": "alliance",
  "entries": [
    { "rank": 1, "allianceId": "clx...", "name": "Solar Dominion", "tag": "[SOL]", "totalMpp": 2400000000, "memberCount": 18, "perCapitaMpp": 133333333 },
    { "rank": 2, "allianceId": "clx...", "name": "Mars Collective", "tag": "[MARS]", "totalMpp": 1800000000, "memberCount": 15, "perCapitaMpp": 120000000 }
  ],
  "playerAlliance": { "rank": 1, "totalMpp": 2400000000 },
  "totalAlliances": 24
}
```

---

## 16. UI Design

### 16.1 Where the Mega-Project Lives

Add `'mega-project'` to the `GameTab` type. This is a top-level tab, not a sub-tab, because mega-projects are a galaxy-wide event that deserves prominent placement.

Updated `GameTab`:
```typescript
export type GameTab = 'dashboard' | 'build' | 'research' | 'map' | 'services' | 'fleet' | 'crafting' | 'workforce' | 'market' | 'contracts' | 'alliance' | 'bounties' | 'leaderboard' | 'mega-project';
```

### 16.2 Dashboard Banner

When a mega-project is active, a banner appears at the top of the dashboard:

```
+------------------------------------------------------------------+
| [icon] MEGA-PROJECT: SPACE ELEVATOR           Phase 2 of 3       |
| ================================================================ |
| [=========================----------]  54.3% complete             |
| 187 contributors  |  26.1B MPP  |  12 days remaining             |
| Your rank: #42 (Engineer)          [VIEW PROJECT]                 |
+------------------------------------------------------------------+
```

During cooldown/voting:
```
+------------------------------------------------------------------+
| NEXT MEGA-PROJECT: VOTE NOW!                                      |
| Generation Ship (42%)  |  Dyson Sphere (31%)  |  Probe (27%)     |
| Vote closes in 1 day, 14 hours               [CAST VOTE]         |
+------------------------------------------------------------------+
```

### 16.3 Mega-Project Tab Layout

The tab has 4 sub-sections accessible via internal tabs:

#### Sub-Section A: Project Overview

The primary view. Shows:

**Top area:** Project name, type icon, phase indicator, deadline countdown.

**Center area:** The global progress visualization.

Phase progress displayed as connected segments:

```
Phase 1 (Complete)     Phase 2 (Active)      Phase 3 (Locked)
[===================] [============--------] [------------------]
       100%                  68.4%                  0%
```

Below each phase, resource-level detail:

```
PHASE 2: Carbon Nanotube Tether
+------------------------------------------+
| Titanium     [========--------]  8,200 / 30,000    27.3%  |
| Rare Earth   [=======---------]  6,100 / 15,000    40.7%  |
| Exotic Mat.  [===-------------]  1,200 /  5,000    24.0%  |
| Cash         [=========-------]  $45B  / $100B     45.0%  |
+------------------------------------------+
```

**Bottom area:** Contribution velocity graph (sparkline showing MPP/day over the past 7 days).

#### Sub-Section B: Contribute

The contribution interface:

```
+------------------------------------------+
| CONTRIBUTE TO PHASE 2                     |
|                                           |
| [Resources]  [Cash]                       |
|                                           |
| Select Resource:                          |
| [Titanium: 340 in inventory    ]  [v]     |
|                                           |
| Amount: [____100____]  (max: 340)         |
|                                           |
| MPP earned: 3,750,000                     |
| (includes 1.5x resource bonus)            |
| (includes 1.05x streak bonus)             |
|                                           |
| Your tier after: Engineer (Tier 3)        |
| Progress to next tier: 64%               |
|                                           |
| [CONTRIBUTE]                              |
+------------------------------------------+
```

Cash tab:
```
+------------------------------------------+
| CONTRIBUTE TO PHASE 2                     |
|                                           |
| [Resources]  [Cash]                       |
|                                           |
| Amount: $[_____5,000,000,000____]         |
| Max per transaction: $12,340,000,000      |
| (10% of your $123.4B balance)             |
|                                           |
| MPP earned: 5,000,000,000                 |
|                                           |
| [CONTRIBUTE]                              |
+------------------------------------------+
```

#### Sub-Section C: Leaderboard

Two toggles: Alliance / Individual.

**Alliance Leaderboard:**
```
+------------------------------------------------------------------+
| ALLIANCE RANKINGS          [By Total] [By Per-Capita]             |
+------------------------------------------------------------------+
| #1  [SOL] Solar Dominion       2.4B MPP   18 members   133M/cap  |
| #2  [MARS] Mars Collective     1.8B MPP   15 members   120M/cap  |
| #3  [TIT] Titan Industries     1.2B MPP   12 members   100M/cap  |
| ...                                                               |
| #8  [YOUR ALLIANCE HIGHLIGHTED]                                   |
+------------------------------------------------------------------+
```

**Individual Leaderboard:**
```
+------------------------------------------------------------------+
| INDIVIDUAL RANKINGS                                               |
+------------------------------------------------------------------+
| #1  Nova Aerospace [SOL]      450M MPP    Architect               |
| #2  StarForge Ltd [MARS]      380M MPP    Architect               |
| #3  Orbital Dynamics [TIT]    290M MPP    Foreman                 |
| ...                                                               |
| #42 YOUR COMPANY [TAG]         12.4M MPP  Engineer                |
+------------------------------------------------------------------+
```

#### Sub-Section D: Your Progress / Rewards

Personal contribution summary and reward claims:

```
+------------------------------------------------------------------+
| YOUR CONTRIBUTION                                                 |
+------------------------------------------------------------------+
| Total MPP: 12,450,000                     Rank: #42               |
| Tier: [ICON] Engineer (Tier 3)                                    |
| Progress to Foreman: [==========---------] 24.9% (12.4M / 50M)   |
|                                                                   |
| CONTRIBUTION BREAKDOWN:                                           |
| Iron: 1,200 units contributed                                     |
| Titanium: 50 units contributed                                    |
| Cash: $5B contributed                                             |
| Total contributions: 15                                           |
|                                                                   |
| TIER REWARDS:                                                     |
| [x] Tier 1: Supporter     - Claimed (10M cash + badge)           |
| [x] Tier 2: Builder       - Claimed (50M cash + 50 iron)         |
| [!] Tier 3: Engineer      - CLAIM NOW (200M cash + ship skin)    |
| [ ] Tier 4: Foreman       - Locked (need 50M MPP)                |
| [ ] Tier 5: Architect     - Locked (need 250M MPP)               |
| [ ] Tier 6: Master Builder- Locked (need 1B MPP)                 |
| [ ] Tier 7: Galactic Founder - Locked (need 5B MPP)              |
+------------------------------------------------------------------+
```

### 16.4 Notification Integration

Mega-project events trigger toast notifications (using existing `src/lib/toast.ts`):

| Event | Toast |
|-------|-------|
| New project announced | "Mega-Project Announced: Space Elevator! Starts in 3 days." |
| Project starts | "The Space Elevator project is now active! Contribute resources and cash." |
| Phase completes | "Phase 1 Complete! Phase 2 is now open for contributions." |
| Player tier up | "You reached Engineer (Tier 3)! Claim your reward." |
| Project 50% complete | "Halfway there! The Space Elevator is 50% complete." |
| Project 90% complete | "Almost done! The Space Elevator is 90% complete -- final push!" |
| Project completes | "THE SPACE ELEVATOR IS COMPLETE! The galaxy built it together." |
| Extension granted | "The Space Elevator has been extended by 14 days. Let's finish this!" |
| Vote opens | "Vote for the next Mega-Project! 3 candidates available." |
| Vote result | "The galaxy has chosen: Generation Ship! Starting in 3 days." |

### 16.5 Activity Feed Integration

Major mega-project events appear in the existing `PlayerActivity` feed:

- "[CompanyName] contributed 500 titanium to the Space Elevator (Phase 2)"
- "Phase 2 of the Space Elevator is complete!"
- "[CompanyName] reached Architect tier on the Space Elevator"
- "[AllianceName] is now #1 on the Space Elevator leaderboard"

Only significant contributions appear in the feed (threshold: top 10% of individual contributions by MPP, or tier-up events, or phase completions). This prevents the feed from being flooded with small contributions.

### 16.6 Solar System Map Integration

The solar system map (`src/lib/game/solar-system.ts`) shows completed mega-projects visually:

- **Space Elevator:** A visible tether line between Earth Surface and GEO orbit.
- **Generation Ship:** A ship icon slowly moving away from the solar system edge.
- **Dyson Sphere:** A ring around the Sun (at Mercury's orbit).
- **Interstellar Probe:** A small dot icon beyond the Outer System.

During an active project, the map shows a "construction site" icon at the relevant location with a progress percentage.

---

## 17. Implementation Phases

### Phase 1: Core Infrastructure (5-7 days)

**Goal:** Database schema, basic API, contribution processing.

| Task | Effort | Files Affected |
|------|--------|----------------|
| Add Prisma models (6 new models) | 1 day | `prisma/schema.prisma` |
| Add GameProfile and Alliance relations | 0.5 day | `prisma/schema.prisma` |
| Create mega-project configuration (project definitions as JSON/TypeScript constants) | 1 day | New: `src/lib/game/mega-projects.ts` |
| Contribution API (`/api/space-tycoon/mega-project/contribute`) | 1.5 days | New: `src/app/api/space-tycoon/mega-project/contribute/route.ts` |
| Current project API (`/api/space-tycoon/mega-project/current`) | 1 day | New: `src/app/api/space-tycoon/mega-project/current/route.ts` |
| MPP calculation and tier logic | 0.5 day | Part of `mega-projects.ts` |
| Cron tick endpoint (phase completion checks, ranking updates) | 1 day | New: `src/app/api/cron/mega-project/tick/route.ts` |

### Phase 2: Leaderboards and Progress (3-4 days)

**Goal:** Alliance/individual rankings, progress tracking.

| Task | Effort | Files Affected |
|------|--------|----------------|
| Leaderboard API | 1 day | New: `src/app/api/space-tycoon/mega-project/leaderboard/route.ts` |
| Alliance score aggregation (triggered on each contribution) | 1 day | Part of contribution API |
| Player progress tracking and tier updates | 0.5 day | Part of contribution API |
| Ranking computation (cron job, every 5 minutes) | 0.5 day | Part of cron tick endpoint |
| Velocity calculation (MPP/day rolling average) | 0.5 day | Part of current project API |

### Phase 3: UI - Project Dashboard (5-7 days)

**Goal:** Full mega-project tab with all sub-sections.

| Task | Effort | Files Affected |
|------|--------|----------------|
| Add `'mega-project'` to GameTab | 0.5 day | `src/lib/game/types.ts`, `src/app/space-tycoon/page.tsx` |
| Dashboard banner component | 1 day | New component |
| Project overview sub-section (progress bars, phase display) | 2 days | New component |
| Contribution interface (resource selector, cash input, MPP preview) | 1.5 days | New component |
| Leaderboard sub-section (alliance + individual) | 1 day | New component |
| Player progress / rewards sub-section | 1 day | New component |

### Phase 4: Lifecycle Management (3-4 days)

**Goal:** Project transitions, voting, rewards distribution.

| Task | Effort | Files Affected |
|------|--------|----------------|
| Lifecycle transition cron | 1.5 days | New: `src/app/api/cron/mega-project/transition/route.ts` |
| Vote API (submit vote, get candidates, resolve) | 1 day | New route files |
| Vote UI component | 0.5 day | New component |
| Reward distribution (tier rewards, completion rewards) | 1 day | Part of claim endpoints |
| Reward claim API | 0.5 day | New: `src/app/api/space-tycoon/mega-project/claim-reward/route.ts` |

### Phase 5: Permanent Benefits Integration (2-3 days)

**Goal:** Completed project bonuses affect the game engine.

| Task | Effort | Files Affected |
|------|--------|----------------|
| `CompletedMegaProjectBonus` loading and caching | 0.5 day | New utility in `mega-projects.ts` |
| Apply bonuses in `processTick()` | 1 day | `src/lib/game/game-engine.ts` |
| New buildings/services from completed projects | 1 day | `src/lib/game/buildings.ts`, `src/lib/game/services.ts` |
| Seed first project (Space Elevator) | 0.5 day | New script: `scripts/seed-mega-project.ts` |

### Phase 6: Polish and History (2-3 days)

**Goal:** Historical record, notifications, cosmetics.

| Task | Effort | Files Affected |
|------|--------|----------------|
| Completed projects gallery UI | 1 day | New component |
| Player profile mega-project history | 0.5 day | Modify profile component |
| Toast notifications for all mega-project events | 0.5 day | Extend existing toast integration |
| Activity feed integration | 0.5 day | Modify activity posting logic |
| Solar system map visual indicators | 0.5 day | Modify map component |
| Add mega-project cosmetics to cosmetic shop catalog | 0.5 day | `src/lib/game/cosmetic-shop.ts` |

### Phase 7: Testing and Launch (2-3 days)

| Task | Effort |
|------|--------|
| Unit tests for MPP calculation, tier logic, phase completion | 1 day |
| Integration test: full contribution flow | 0.5 day |
| Load test: simulate 200 concurrent contributions | 0.5 day |
| Run a 1-day "test project" with reduced requirements | 0.5 day |
| Bug fixes and balance adjustments | 0.5 day |

### Total Estimated Effort: **22-31 days**

---

## Appendix A: Integration Points with Existing Systems

| Existing System | Integration |
|-----------------|-------------|
| `game-engine.ts` (processTick) | Apply permanent bonus multipliers from completed projects |
| `resources.ts` | MPP conversion uses `baseMarketPrice` from resource definitions |
| `economic-systems.ts` | Resource contributions interact with scarcity tracking (contributing resources removes them from player supply, increasing scarcity) |
| `competitive-engine.ts` | Mega-project contributions could count toward reputation events |
| `save-load.ts` | Add mega-project progress to GameState for client display |
| `cosmetic-shop.ts` | Add mega-project cosmetics to catalog with `earnableVia: 'mega_project_tier_X'` |
| `achievements.ts` | Add achievements: "Contribute to first mega-project", "Reach Tier 5", "Contribute to 3 projects" |
| `buildings.ts` | Add new buildings unlocked by completed projects |
| `services.ts` | Add new services unlocked by completed projects |
| `solar-system.ts` | Add visual indicators for completed projects on the map |
| Alliance system | Alliance scores aggregated from member contributions |
| `PlayerActivity` model | Major contribution events and phase completions posted to activity feed |
| Season system | Mega-projects run independently of seasons; if both are active simultaneously, they coexist. Season challenges could include "Contribute X to the Mega-Project" as a weekly milestone. |

## Appendix B: GameState Additions (Client-Side)

```typescript
// Added to GameState interface in types.ts
megaProjectData?: {
  projectId: string;
  projectType: string;
  projectName: string;
  status: 'announced' | 'active' | 'extended' | 'completed' | 'shelved';
  currentPhase: number;
  totalPhases: number;
  completionPct: number;
  endsAt: number; // Unix ms
  // Player's personal progress
  playerMpp: number;
  playerTier: number;
  playerRank: number | null;
  unclaimedRewards: number[]; // Tier numbers with unclaimed rewards
  streakMultiplier: number;
  // Alliance progress
  allianceMpp: number | null;
  allianceRank: number | null;
  // Phase detail (current phase only, to keep payload small)
  currentPhaseResources: {
    slug: string;
    name: string;
    contributed: number;
    required: number;
  }[];
  currentPhaseCash: { contributed: number; required: number };
  // Velocity
  mppPerDay: number;
  estimatedCompletionDate: number | null; // Unix ms
  // Vote (if in voting phase)
  voteOpen: boolean;
  voteCandidates?: { projectType: string; voteCount: number; playerVoted: boolean }[];
};
```

## Appendix C: Formulae Reference

**MPP from resource contribution:**
```
mpp = quantity * baseMarketPrice * 1.5 * streakMultiplier * smallContributorBonus
```

**MPP from cash contribution:**
```
mpp = cashAmount * 1.0 * streakMultiplier * smallContributorBonus
```

**Small contributor bonus:**
```
if (playerTotalMpp < totalProjectRequirement * 0.0001) then 2.0 else 1.0
```

**Streak multiplier:**
```
consecutiveProjects: 0-1 = 1.0, 2 = 1.05, 3 = 1.10, 5+ = 1.15, 10+ = 1.20
```

**Phase completion check:**
```
phaseComplete = ALL resources at 100% AND cash at 100%
resourcePct = min(1.0, contributed / required)
cashPct = min(1.0, contributedCash / requiredCash)
```

**Global completion percentage:**
```
phaseFillPct[i] = average(all resourcePcts for phase i, cashPct for phase i)
phaseWeight[i] = (sum of phase i requirements in MPP-equivalent) / (sum of all phase requirements in MPP-equivalent)
globalPct = sum(phaseWeight[i] * phaseFillPct[i])
-- But a locked phase has fillPct = 0, and a completed phase has fillPct = 1.0
```

**Early completion bonus:**
```
for each phase:
  daysEarly = phaseDurationTarget - actualDaysToComplete
  if daysEarly >= 14: phaseBonus = 0.15
  else if daysEarly >= 7: phaseBonus = 0.10
  else if daysEarly >= 3: phaseBonus = 0.05
  else: phaseBonus = 0

earlyCompletionMultiplier = 1.0 + average(all phaseBonus values)
```

**Contribution tier thresholds:**
```
TIER_THRESHOLDS = [0, 100_000, 1_000_000, 10_000_000, 50_000_000, 250_000_000, 1_000_000_000, 5_000_000_000]
```

**Extension reduction:**
```
extensionBonusPct = baseBonusPct * 0.70
-- e.g., 15% launch cost reduction becomes 10.5% if completed during extension
```

## Appendix D: Anti-Abuse Considerations

| Threat | Mitigation |
|--------|------------|
| Bot accounts contributing tiny amounts for rewards | Minimum Tier 1 (100K MPP) to earn any rewards beyond the first contribution badge. 100K MPP requires meaningful resources or cash. |
| Alt accounts inflating alliance member counts | "Full Mobilization" milestone requires members to have contributed significant amounts. Alliance per-capita metric discourages padding with inactive alts. |
| Market manipulation via resource draining | Resource contributions remove resources from player inventory but do NOT affect market prices (contributions are not market transactions). Market prices remain driven by buy/sell orders. |
| Cash laundering (contribute then claim tier reward) | Tier rewards are modest compared to cash contributions at higher tiers. Tier 7 requires 5B MPP in contributions but only grants 100B cash -- and that 5B MPP requires roughly $5B+ in cash/resource value. Net negative for laundering. |
| Contribution timing manipulation (wait for Phase 3 to contribute rare resources) | Phase gating prevents this. Resources can only be contributed to the current phase. If a player hoards exotic_materials for Phase 3, they cannot contribute during Phases 1-2 and fall behind on the leaderboard. |
| Alliance collusion (one alliance dominates every project) | No mitigation needed -- this is the intended competitive dynamic. If an alliance consistently out-contributes others, they deserve the rewards. The per-capita metric provides a secondary ranking that smaller alliances can win. |

## Appendix E: Relationship to Seasonal Events

The Cooperative Mega-Projects system and the Seasonal Event Competition system (see `seasonal-event-competition-system.md`) are complementary but independent:

- **Seasons** run on 28-day cycles with fresh-start scoring. They focus on individual progression and breadth of gameplay (mining, building, research challenges).
- **Mega-Projects** run on 30-90 day cycles with cumulative contributions. They focus on collective galaxy-wide goals and resource sacrifice.
- Both can run simultaneously. A player may be earning Season Points through daily challenges while also contributing resources to the mega-project.
- **Cross-system integration:** During the Season 9 theme "Nebula Nexus" (Alliance Cooperation), season challenges could include mega-project contributions as valid objectives (e.g., "Contribute 100 resources to the Mega-Project" as a weekly milestone).
- Mega-project completion events would appear as season-long objectives if a season is active at the time of completion.
