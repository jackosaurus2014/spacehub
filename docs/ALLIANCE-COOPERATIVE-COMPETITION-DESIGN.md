# Alliance Cooperative Competition System — Design Document

> **Status**: Design Phase (no code yet)
> **Priority**: P2 (per COMPETITIVE-MULTIPLAYER-PLAN.md, Mechanic #5)
> **Estimated Effort**: 3-4 weeks implementation
> **Last Updated**: 2026-03-23

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Existing Infrastructure](#2-existing-infrastructure)
3. [Alliance Events (Weekly/Bi-Weekly)](#3-alliance-events)
4. [Alliance Leaderboard](#4-alliance-leaderboard)
5. [Shared Projects (Mega-Projects)](#5-shared-projects)
6. [Alliance Roles & Permissions](#6-alliance-roles--permissions)
7. [Rewards System](#7-rewards-system)
8. [Engagement & Retention](#8-engagement--retention)
9. [Database Schema Additions](#9-database-schema-additions)
10. [Implementation Phases](#10-implementation-phases)
11. [Research References](#11-research-references)

---

## 1. Executive Summary

This document designs the Alliance Cooperative Competition system for Space Tycoon. The goal is to make alliance membership feel meaningful by adding:

- **Alliance Events**: Time-limited competitive events where alliances race against each other on shared goals
- **Alliance Leaderboard**: A dedicated ranking system separate from the individual leaderboard, with fairness mechanics for different-sized alliances
- **Shared Projects**: Large-scale cooperative construction projects that require pooled resources from multiple members
- **Enhanced Roles**: Expanded leader/officer powers for event coordination
- **Layered Rewards**: Alliance-wide bonuses, individual contribution rewards, and exclusive cosmetics

**Design Principles** (inherited from COMPETITIVE-MULTIPLAYER-PLAN.md):
1. Never take things away — losing means fewer bonus rewards, not lost resources
2. Percentage-based metrics — compete on growth rate, not absolute size
3. Participation rewards — everyone gets something, top players get more
4. Async-first — all mechanics work without simultaneous online play
5. Multiple paths to contribute — new players can help as much as veterans (within their scale)

---

## 2. Existing Infrastructure

### Current Alliance System

**Database Models** (from `prisma/schema.prisma`):
- `Alliance` — id, name, tag, description, leaderId, memberCount, totalNetWorth, bonusRevenue, createdAt
- `AllianceMember` — id, allianceId, profileId, role (leader/officer/member), joinedAt

**Current Features** (from `AlliancePanel.tsx` and `/api/space-tycoon/alliances/route.ts`):
- Create/join/leave alliances
- Max 20 members per alliance
- Revenue bonus: +5% per member, capped at 25%
- Mining bonus: half of revenue bonus rate
- Research bonus: 30% of revenue bonus rate
- Member roster with roles and net worth display
- Shared facilities placeholder (data structure exists, not yet populated)

**Existing Competitive Infrastructure** (from `competitive-engine.ts`):
- Shared facility types already defined: starbase, trade_hub, research_center, shipyard, defense_platform
- Contributor shares tracking (profileId to % share)
- Facility health/maintenance system
- Reputation system with alliance contribution events
- Contestable locations between alliances

**Player Range**: $100M (new) to $1T+ (endgame). The system must be fair across this 10,000x wealth gap.

---

## 3. Alliance Events

### 3.1 Event Cadence

| Event Type | Frequency | Duration | Overlap |
|-----------|-----------|----------|---------|
| Alliance Sprint | Weekly | 5 days (Mon-Fri) | None — one at a time |
| Alliance Challenge | Bi-weekly | 7 days | Can overlap with Sprint |
| Alliance Mega-Event | Monthly | 14 days | Replaces Sprint for that period |

**Rationale**: Research from GameRefinery shows casual games introduce guild events as short, focused bursts rather than always-on. Dragon City's Alliance Race uses a 5-day format. Homescapes uses 3-day Team Tournaments. A 5-day Sprint with weekends off respects casual players.

### 3.2 Event Types (10 events, rotated)

Each event measures a specific metric. Members' contributions are aggregated to the alliance total. All metrics tracked per-member and per-alliance.

#### SPRINT EVENTS (5 days, weekly rotation)

**1. Asteroid Rush**
- Metric: Total resources mined (any type) across all members
- Contribution: Each unit mined counts. Higher-tier resources count for more points (iron=1pt, titanium=3pt, platinum_group=10pt, helium3=25pt, antimatter_precursors=100pt)
- Fairness: Points weighted by resource tier, not raw volume, so endgame players mining exotic resources contribute efficiently but early players mining iron in bulk still help

**2. Launch Blitz**
- Metric: Total revenue earned from launch_payload services
- Contribution: Each dollar of launch revenue = 1 point
- Fairness: Percentage-based secondary metric (% revenue increase over baseline) shown alongside raw totals

**3. Research Sprint**
- Metric: Number of research projects completed
- Contribution: Each completed research = points based on tier (T1=1pt, T2=3pt, T3=8pt, T4=15pt, T5=25pt)
- Fairness: Research tiers naturally scale with player progression

**4. Builder's Rally**
- Metric: Total buildings constructed + upgraded
- Contribution: New building = points by tier. Upgrade = half points of next tier
- Fairness: Early players build many T1/T2 buildings; late players build fewer but higher-tier

**5. Trade Volume**
- Metric: Total value of market orders filled (buy + sell)
- Contribution: Each dollar of trade volume = 1 point
- Fairness: All players can participate regardless of progression stage

#### CHALLENGE EVENTS (7 days, bi-weekly rotation)

**6. Colony Expedition**
- Metric: Alliance members collectively unlock new locations or establish colony claims
- Contribution: Location unlock cost = points (scaled by location tier)
- Scoring: 100 points per $1B spent on location unlocks
- Fairness: Encourages expansion; benefits players at any frontier

**7. Fleet Mobilization**
- Metric: Ships built + total cargo delivered across all shipping routes
- Contribution: Ship build points by class + 1 point per unit of cargo delivered
- Fairness: Both ship-building and cargo-hauling count, so fleet-focused and trade-focused players both contribute

**8. Contract Sweep**
- Metric: Total contracts completed by alliance members
- Contribution: Each completed contract = points by difficulty/payout tier
- Fairness: Contract availability scales to player level

#### MEGA-EVENTS (14 days, monthly)

**9. Galactic Gold Rush**
- Metric: Combined net worth growth (% increase) during the event period
- Contribution: Each member's net worth growth % is averaged (not summed) so small and large alliances compete fairly
- Scoring: Average member growth rate * active participation rate
- Fairness: Pure percentage growth means a $100M player growing to $200M (+100%) is as valuable as a $100B player growing to $200B (+100%)

**10. Sector Dominance**
- Metric: Combined influence score across all solar system locations
- Contribution: Points earned for buildings, services, mining, and research activity in each zone. Alliance with most activity in a zone "claims" it for bonus points
- Scoring: 10 points per zone claimed + activity points
- Fairness: Multiple zones at different tiers mean alliances spread effort across member skill levels

### 3.3 How Individual Contributions Aggregate

```
Alliance Event Score = SUM(member contributions) * participation_multiplier

participation_multiplier:
  100% members active = 1.25x bonus
  75%+ members active = 1.10x bonus
  50%+ members active = 1.00x (baseline)
  <50% members active = 0.90x penalty

"Active" = contributed at least 1 point during the event
```

This encourages alliances to keep all members engaged, not just carry with a few whales.

### 3.4 Per-Capita Scoring (Fairness for Different Sizes)

For events where alliances of 3 compete against alliances of 20, two scores are tracked:

- **Total Score**: Raw aggregate. Used for absolute rewards tier
- **Per-Capita Score**: Total / active member count. Used for bracket ranking

Alliances are **ranked by per-capita score** but must meet a **minimum total score threshold** to qualify for top rewards. This prevents a solo-player alliance from winning by having one amazing player.

```
Minimum total thresholds (per event type):
  Sprint:      500 points minimum
  Challenge:   1,000 points minimum
  Mega-Event:  5,000 points minimum
```

---

## 4. Alliance Leaderboard

### 4.1 Separation from Individual Leaderboard

Yes — completely separate. The existing `/api/space-tycoon/leaderboard` already returns a basic `alliances` array (top 10 by totalNetWorth). The Alliance Leaderboard expands this into a full system.

### 4.2 Ranking Metrics

| Metric | Weight | Description |
|--------|--------|------------|
| Alliance Level | 25% | Cumulative XP from events, projects, activity (see Section 8) |
| Event Performance | 30% | Rolling average of last 4 event rankings (per-capita) |
| Shared Projects Completed | 20% | Number and tier of mega-projects completed |
| Member Activity Rate | 15% | % of members who synced in the last 48 hours |
| Total Net Worth | 10% | Sum of all member net worths |

**Composite Alliance Power Score** = weighted sum, normalized to 0-10,000 scale.

### 4.3 Tier/Bracket System

Alliances are grouped into tiers based on Alliance Power Score:

| Tier | Name | Score Range | Icon | Perks |
|------|------|-------------|------|-------|
| 1 | Frontier Startup | 0 - 500 | Bronze rocket | Base bonuses only |
| 2 | Orbital Enterprise | 501 - 1,500 | Silver rocket | +2% revenue bonus to all members |
| 3 | Interplanetary Corp | 1,501 - 3,500 | Gold rocket | +5% revenue, +3% mining |
| 4 | Solar Conglomerate | 3,501 - 6,000 | Platinum rocket | +8% revenue, +5% mining, +3% research |
| 5 | Galactic Dominion | 6,001 - 10,000 | Diamond rocket | +12% revenue, +8% mining, +5% research, +3% build speed |

These tier bonuses **stack on top of** the existing member-count bonuses. A 20-member alliance at Tier 5 would get: 25% (member count cap) + 12% (tier) = 37% revenue bonus.

### 4.4 Event Matchmaking

For weekly/bi-weekly events, alliances are matched against alliances in the same tier (or adjacent tiers if not enough alliances exist in a tier). This prevents a Tier 5 powerhouse from crushing Tier 1 newcomers.

**Event Bracket Assignment**:
- 8-16 alliances per event bracket
- Matched by Alliance Power Score within +/- 30%
- If fewer than 8 alliances in range, expand to adjacent tier
- Results only compared within bracket

### 4.5 Display

The Alliance Leaderboard shows:
- Top 20 alliances globally (by Alliance Power Score)
- The player's alliance rank and nearby competitors (rank -2 to +2)
- Current event standings within the player's bracket
- Historical event performance (last 4 events with rank)

---

## 5. Shared Projects (Mega-Projects)

### 5.1 What Alliances Can Build Together

These are massive cooperative construction projects that take days to weeks of collective contribution. They build on the existing `SHARED_FACILITY_TYPES` in `competitive-engine.ts` but are larger-scale and time-gated.

| Project | Cost | Duration | Min Members | Reward |
|---------|------|----------|-------------|--------|
| Orbital Mega-Station | $50B money + 5,000 titanium + 2,000 aluminum | 7 days | 5 | +10% revenue, +20% defense for all members. Permanent shared facility |
| Deep Space Relay Network | $30B + 3,000 rare_earth + 1,000 silicon | 10 days | 3 | +15% research speed for all members. Unlocks alliance-only research topics |
| Alliance Trade Hub | $40B + 4,000 iron + 2,000 carbon_fiber | 7 days | 5 | +10% market trade prices for all members. Generates $500M/month shared revenue |
| Colony Ship "Exodus" | $100B + 10,000 titanium + 5,000 exotic_materials + 2,000 helium3 | 21 days | 10 | Unlocks exclusive outer-system location for alliance members only |
| Space Elevator | $200B + 20,000 carbon_fiber + 10,000 titanium + 5,000 silicon | 30 days | 15 | -50% launch costs for all members. Permanent shared facility |
| Dyson Swarm Array | $500B + 50,000 solar_concentrate + 20,000 rare_earth | 45 days | 15 | +25% revenue for all members. Generates $5B/month shared revenue. Prestige cosmetic |

### 5.2 How Members Contribute

Members contribute by depositing **money and/or resources** into the project pool:

- Any member can contribute at any time during the project window
- Contributions are permanent (no withdrawal)
- Each contribution type (money, each resource) has a progress bar
- Progress bars fill as contributions come in, with member names shown

**Contribution Interface**:
```
[Space Elevator]  ████████████░░░░  73% funded
  Money:          $147B / $200B     ██████████████░░  73%
  Carbon Fiber:   14,200 / 20,000   ████████████████░  71%
  Titanium:       8,500 / 10,000    ████████████████░  85%
  Silicon:        3,800 / 5,000     ████████████████░  76%

  Your contribution: $12B, 1,200 carbon fiber, 800 titanium
  Top contributor: SolarCorp ($45B, 3,500 carbon fiber)
```

### 5.3 Contribution Tracking & Revenue Sharing

Each member's contribution is tracked as a **percentage share**:

```
contributionShare = memberContributionValue / totalContributionValue

where:
  contributionValue = moneyContributed + SUM(resourceContributed * resourceBasePrice)
```

Revenue from the completed project is split:
- **60%** distributed to members proportional to contribution share
- **30%** goes to the alliance treasury (for future projects, event entry, etc.)
- **10%** distributed equally among all members (participation reward)

### 5.4 Project Lifecycle

1. **Proposal** — Leader or officer proposes a project. Requires a vote or leader approval
2. **Funding** — Members contribute. Progress tracked in real-time
3. **Construction** — Once fully funded, construction timer starts (duration from table above)
4. **Completion** — Facility becomes active. Bonuses apply to all members. Revenue sharing begins
5. **Maintenance** — Monthly maintenance cost split proportional to contribution shares. If unpaid, facility degrades (uses existing health/degradation system from competitive-engine.ts)

### 5.5 Project Limits

- An alliance can have **1 active project** under construction + **up to 3 completed projects**
- Starting a 4th project requires decommissioning one (loses bonuses, refunds 20% of invested resources)
- Higher alliance tier unlocks more project slots (Tier 3: 4 slots, Tier 5: 5 slots)

---

## 6. Alliance Roles & Permissions

### 6.1 Expanded Role System

| Role | Max Per Alliance | Permissions |
|------|-----------------|-------------|
| **Leader** | 1 | All permissions. Transfer leadership. Disband alliance. Set alliance description/recruitment status |
| **Officer** | 4 (configurable by leader, max 5) | Start events, propose projects, promote/demote members, post announcements, set event focus directives |
| **Veteran** (NEW) | Unlimited (auto-assigned at 30+ days membership) | Vote on project proposals, contribute to projects, access alliance chat |
| **Member** | Unlimited | Contribute to projects, participate in events, access alliance chat |
| **Recruit** (NEW) | Unlimited (auto-assigned for first 7 days) | Participate in events, limited contributions (max 5% of project cost per contribution) |

### 6.2 Event Management Powers

Leaders and officers can:
- **Set Event Focus Directive**: A pinned message like "Focus mining this week!" shown to all members in the Alliance Panel
- **Assign Role Tags**: Tag members as "Miner", "Researcher", "Builder", "Trader" to suggest how they should contribute (cosmetic/advisory only, not enforced)
- **Set Event Goals**: Define internal milestones ("Let's hit 5,000 points by Wednesday")
- **View Contribution Dashboard**: See who has contributed what, who is active, who is idle

### 6.3 Communication

Rather than building a full chat system (which is expensive and requires moderation), use a **bulletin board** model:

| Feature | Who Can Use | Description |
|---------|------------|-------------|
| **Alliance Announcements** | Leader, Officers | Up to 3 pinned messages. 200 char max. Shown at top of Alliance Panel |
| **Event Directive** | Leader, Officers | Single pinned focus directive per active event |
| **Contribution Feed** | Auto-generated | "SolarCorp contributed $5B to Space Elevator" — last 20 entries |
| **Member Status** | Everyone | Each member can set a one-line status (50 chars): "Mining titanium all week!" |

This avoids the complexity and moderation burden of real-time chat while still enabling coordination.

---

## 7. Rewards System

### 7.1 Alliance-Wide Rewards (from Events)

Based on event bracket ranking:

| Rank (within bracket) | Reward |
|----------------------|--------|
| 1st Place | +15% revenue bonus for 7 days + 500 Alliance XP |
| 2nd Place | +10% revenue bonus for 7 days + 350 Alliance XP |
| 3rd Place | +7% revenue bonus for 7 days + 250 Alliance XP |
| 4th-8th Place | +3% revenue bonus for 5 days + 150 Alliance XP |
| 9th-16th Place | +1% revenue bonus for 3 days + 75 Alliance XP |
| Participated (any contribution) | 25 Alliance XP |

These temporary boosts apply to **all alliance members** and stack with existing alliance bonuses.

### 7.2 Individual Rewards (based on Contribution)

Within each event, individual members are ranked by their contribution:

| Rank (within alliance) | Individual Reward |
|-----------------------|-------------------|
| Top Contributor (MVP) | Exclusive speed boost (2x for 24 hrs) + "Alliance MVP" title for 1 week |
| Top 3 Contributors | Speed boost (1.5x for 12 hrs) |
| Contributed 10%+ of alliance total | 1 premium resource crate (random tier-appropriate resources) |
| Any contribution | Small cash bonus (1% of personal net worth, max $1B) |

### 7.3 Exclusive Alliance Cosmetics

Earned through Alliance Level milestones or event wins:

| Source | Cosmetic |
|--------|----------|
| Alliance Level 5 | Alliance banner color customization |
| Alliance Level 10 | Custom alliance icon (pick from 20 options) |
| Alliance Level 20 | Alliance name displayed in gold on leaderboard |
| Alliance Level 30 | Animated alliance badge on member profiles |
| Win 5 events | "Competitive" badge next to alliance tag |
| Win 10 events | "Elite" badge |
| Complete first mega-project | "Builders" badge |
| Complete all 6 mega-projects | "Architects of the Galaxy" title for all members |
| Reach Tier 5 | Diamond alliance tag border on all member profiles in leaderboard |

### 7.4 Alliance Ranking Prestige Display

On the individual leaderboard (already showing alliance tags), add:
- Alliance tier icon next to the tag: `[SOL] (Diamond)`
- Alliance rank tooltip on hover: "Solar Dominion — Rank #3, Tier 5 Galactic Dominion"
- Current event standing: small badge if alliance is top 3 in current event

---

## 8. Engagement & Retention

### 8.1 Daily Alliance Participation

**Alliance Daily Tasks** (3 per day, refreshed at midnight UTC):
- "Mine 50 units of any resource" — 5 Alliance XP
- "Complete 1 research project" — 10 Alliance XP
- "Earn $100M in revenue" — 5 Alliance XP
- "Fill a market order" — 5 Alliance XP
- "Complete a contract" — 10 Alliance XP

Tasks are drawn from a pool of ~20 possible tasks. Each day, 3 are randomly selected. Completing all 3 gives a bonus 15 Alliance XP (total 30-45 per day).

Members who complete at least 1 daily task are marked as "Active" for that day. Activity streaks give personal bonuses:
- 3-day streak: +2% personal revenue
- 7-day streak: +5% personal revenue
- 14-day streak: +5% personal revenue + 1 speed boost
- 30-day streak: "Dedicated" badge on profile

### 8.2 Handling Inactive Members

**Problem**: Inactive members dilute per-capita scores and occupy roster slots.

**Solution — Tiered Inactivity System**:

| Inactivity Duration | Status | Effect |
|--------------------|--------|--------|
| 0-48 hours | Active | Full contribution to per-capita calculations |
| 48 hours - 7 days | Idle | Excluded from per-capita event calculations. Yellow indicator on roster |
| 7-30 days | Inactive | Excluded from per-capita. No longer receive alliance bonuses. Red indicator |
| 30+ days | Dormant | Auto-removed from alliance (with notification upon return). Slot freed |

Officers and leaders can:
- Manually exclude a member from the current event's per-capita calculation
- Send a "nudge" notification (1 per member per week) — "Your alliance needs you!"
- Set minimum activity requirements for membership

### 8.3 Alliance Membership Value vs Solo

**Why join an alliance?** The value proposition must be clear:

| Benefit | Solo | In Alliance |
|---------|------|-------------|
| Revenue bonus | 0% | +5-25% (members) + 0-12% (tier) |
| Mining bonus | 0% | +2.5-12.5% (members) + 0-8% (tier) |
| Research speed | 0% | +1.5-7.5% (members) + 0-5% (tier) |
| Shared facility bonuses | None | +10-25% additional depending on projects |
| Event rewards | Solo events only | Alliance events + solo events |
| Exclusive content | None | Alliance-only locations, cosmetics, titles |
| Speed boosts | Earn from contracts only | Earn from contracts + events + daily tasks |
| Social features | None | Announcements, contribution feed, status |

**Total potential bonus for a maxed alliance**: ~65-80% across various multipliers. This is a massive advantage, making alliance membership essentially mandatory for competitive play — which is the goal.

### 8.4 Alliance Level (Alliance Power)

Alliances earn XP and level up. XP sources:

| Source | XP Earned |
|--------|-----------|
| Event participation (per event) | 25-500 XP (based on rank) |
| Daily tasks completed by members (per task) | 5-10 XP |
| Shared project completed | 500-5,000 XP (based on project tier) |
| Member reaches a personal milestone | 10-50 XP |
| Alliance has 7-day 100% activity rate | 200 XP bonus |

**Leveling curve**: Each level requires `level * 100` XP. Level 1 = 100 XP. Level 30 = 3,000 XP. Total XP to reach level 30 = 46,500 XP.

With moderate activity, an alliance earns roughly 300-800 XP per week, so reaching level 30 takes 2-3 months of consistent play. This provides a long-term progression goal.

**Alliance Level unlocks** (in addition to tier bonuses):
- Level 3: Can propose shared projects
- Level 5: Officer slots increase from 2 to 3
- Level 10: Can have 2 concurrent events tracked
- Level 15: Officer slots increase to 4
- Level 20: Premium project unlocked (Colony Ship)
- Level 25: Officer slots increase to 5
- Level 30: Endgame project unlocked (Dyson Swarm Array)

---

## 9. Database Schema Additions

### 9.1 New Tables

**AllianceEvent** — Tracks each event instance:
```
AllianceEvent {
  id              String    @id @default(cuid())
  type            String    // "asteroid_rush", "launch_blitz", etc.
  eventCategory   String    // "sprint", "challenge", "mega_event"
  bracketId       String    // Groups alliances competing against each other
  startAt         DateTime
  endAt           DateTime
  status          String    // "upcoming", "active", "completed"
  metadata        Json?     // Event-specific config (point multipliers, etc.)
  createdAt       DateTime  @default(now())

  scores          AllianceEventScore[]
  contributions   AllianceEventContribution[]

  @@index([status])
  @@index([bracketId])
  @@index([startAt])
}
```

**AllianceEventScore** — Tracks each alliance's score in an event:
```
AllianceEventScore {
  id              String    @id @default(cuid())
  eventId         String
  event           AllianceEvent @relation(...)
  allianceId      String
  totalScore      Float     @default(0)
  perCapitaScore  Float     @default(0)
  activeMemberCount Int     @default(0)
  bracketRank     Int?      // Computed at event end
  rewardClaimed   Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([eventId, allianceId])
  @@index([eventId])
  @@index([allianceId])
}
```

**AllianceEventContribution** — Tracks each member's contribution per event:
```
AllianceEventContribution {
  id              String    @id @default(cuid())
  eventId         String
  event           AllianceEvent @relation(...)
  allianceId      String
  profileId       String
  score           Float     @default(0)
  details         Json?     // Breakdown: { "iron_mined": 500, "titanium_mined": 200 }
  updatedAt       DateTime  @updatedAt

  @@unique([eventId, profileId])
  @@index([eventId, allianceId])
  @@index([profileId])
}
```

**AllianceProject** — Tracks shared building projects:
```
AllianceProject {
  id              String    @id @default(cuid())
  allianceId      String
  projectType     String    // "orbital_mega_station", "space_elevator", etc.
  name            String    // Player-customizable name
  status          String    // "funding", "building", "completed", "decommissioned"
  moneyCost       Float
  moneyFunded     Float     @default(0)
  resourceCosts   Json      // { "titanium": 10000, "carbon_fiber": 20000 }
  resourceFunded  Json      @default("{}") // Same shape, tracking progress
  fundingDeadline DateTime? // Optional deadline
  buildStartAt    DateTime?
  buildEndAt      DateTime?
  completedAt     DateTime?
  bonuses         Json      // The bonuses this project grants when complete
  createdAt       DateTime  @default(now())

  contributions   AllianceProjectContribution[]

  @@index([allianceId])
  @@index([status])
}
```

**AllianceProjectContribution** — Tracks per-member contributions to projects:
```
AllianceProjectContribution {
  id              String    @id @default(cuid())
  projectId       String
  project         AllianceProject @relation(...)
  profileId       String
  moneyContributed Float    @default(0)
  resourcesContributed Json @default("{}") // { "titanium": 500, "carbon_fiber": 1200 }
  contributionShare Float   @default(0) // Computed: 0.0 to 1.0
  updatedAt       DateTime  @updatedAt

  @@unique([projectId, profileId])
  @@index([projectId])
  @@index([profileId])
}
```

**AllianceDailyTask** — Tracks daily task progress per member:
```
AllianceDailyTask {
  id              String    @id @default(cuid())
  allianceId      String
  date            DateTime  // Date (UTC day)
  tasks           Json      // Array of 3 task definitions for this day
  createdAt       DateTime  @default(now())

  completions     AllianceDailyTaskCompletion[]

  @@unique([allianceId, date])
}
```

**AllianceDailyTaskCompletion** — Tracks which members completed which tasks:
```
AllianceDailyTaskCompletion {
  id              String    @id @default(cuid())
  dailyTaskId     String
  dailyTask       AllianceDailyTask @relation(...)
  profileId       String
  taskIndex       Int       // 0, 1, or 2 (which of the 3 tasks)
  completedAt     DateTime  @default(now())

  @@unique([dailyTaskId, profileId, taskIndex])
  @@index([profileId])
}
```

### 9.2 Modifications to Existing Tables

**Alliance** — Add fields:
```
  level           Int       @default(1)
  xp              Int       @default(0)
  tier            Int       @default(1)    // 1-5, computed from Alliance Power Score
  powerScore      Float     @default(0)    // Composite score
  totalEventsWon  Int       @default(0)
  totalProjectsCompleted Int @default(0)
  treasury        Float     @default(0)    // Shared money pool
  announcements   Json      @default("[]") // Array of { text, authorId, createdAt }
  settings        Json      @default("{}") // { minActivityDays, autoKickDays, maxOfficers }
```

**AllianceMember** — Add fields:
```
  roleTag         String?   // "miner", "researcher", "builder", "trader" (advisory)
  status          String    @default("active") // "active", "idle", "inactive", "dormant"
  lastActiveAt    DateTime  @default(now())
  activityStreak  Int       @default(0)
  totalXPEarned   Int       @default(0)   // Lifetime XP contribution to alliance
  statusMessage   String?   // 50-char status line
```

### 9.3 Relationship Summary

```
Alliance
  ├── AllianceMember[]
  ├── AllianceProject[]
  ├── AllianceEventScore[] (via events)
  └── AllianceDailyTask[]

AllianceEvent
  ├── AllianceEventScore[] (one per participating alliance)
  └── AllianceEventContribution[] (one per participating member)

AllianceProject
  └── AllianceProjectContribution[] (one per contributing member)

AllianceDailyTask
  └── AllianceDailyTaskCompletion[] (one per member per task)
```

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1)
- Add new database tables and fields to Prisma schema
- Migrate existing Alliance/AllianceMember tables
- Add Alliance Level/XP calculation logic
- Add alliance tier computation
- Update Alliance API to return new fields
- Add alliance treasury deposit/withdraw endpoints

### Phase 2: Alliance Events (Week 2)
- Build event scheduler (cron job or scheduled API) to create weekly events
- Build bracket matching algorithm
- Build contribution tracking hooks (intercept existing game actions: mine, build, research, trade)
- Build event scoring and ranking computation
- Add event display to AlliancePanel UI
- Add event rewards distribution

### Phase 3: Shared Projects (Week 3)
- Build project proposal and voting system
- Build contribution deposit endpoints
- Build project completion logic and bonus application
- Build project UI (progress bars, contribution breakdown, leaderboard)
- Connect to existing shared facility system in competitive-engine.ts

### Phase 4: Engagement Layer (Week 4)
- Build daily task generation and completion tracking
- Build activity streak system
- Build inactivity detection and auto-status updates
- Build enhanced Alliance Leaderboard UI
- Build announcements/directives/status messages UI
- Add alliance cosmetics display

---

## 11. Research References

The following sources informed this design:

- [Casual Games are "Guilding Up" - GameRefinery](https://www.gamerefinery.com/casual-games-guilding-up/) — Analysis of guild feature adoption in top casual games. Key insight: introduce guild features in stages, starting simple and adding co-op events later.
- [Why casual games like Homescapes are adding midcore Guild community features - PocketGamer.biz](https://www.pocketgamer.biz/why-casual-games-like-homescapes-are-adding-midcore-guild-community-features/) — Details on Homescapes' Team Chest and Team Tournament events.
- [GameRefinery: 33 out of top 100 casual games on iOS use guild mechanics - Game World Observer](https://gameworldobserver.com/2019/07/31/casual-games-use-guild-mechanics) — Market data: nearly 70% of US top-grossing games use guild mechanics.
- [How To Keep Your Players Engaged With Communal Mechanics - GameRefinery](https://www.gamerefinery.com/keep-players-engaged-with-communal-mechanics/) — Co-op task mechanics and communal goal design patterns.
- [Social Features in Mobile Games: What Players Expect in 2025 - MAF](https://maf.ad/en/blog/social-features-in-mobile-games/) — Player expectations for social/guild features in modern mobile games.
- [How 2021's Biggest Mobile Game Trends Are Showing in Casual Games - GameRefinery](https://www.gamerefinery.com/2021-casual-games-trends/) — Trend data on guild competition, co-op events, and social features in casual game market.
- [Social Interaction Features in Cooperative Mobile Games - Adrian Crook](https://adriancrook.com/social-interaction-features-in-cooperative-mobile-games/) — Design patterns for cooperative social interactions in mobile games.
- [Progression Systems in Mobile Games: Ultimate Guide - Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/progression-systems) — Guild level progression as retention mechanism.
- [Idle Clicker Games: Best Practices for Idle Game Design and Monetization](https://games.themindstudios.com/post/idle-clicker-game-design-and-monetization/) — Leaderboard and competition design in idle/tycoon games.
- [Small Guilds feeling left out - Guild Wars 2 Forums](https://forum-en.gw2archive.eu/forum/game/gw2/Small-Guilds-feeling-left-out) — Player feedback on small vs large guild fairness; informed per-capita scoring design.
- [Virtonomics: Business Simulation Game](https://virtonomics.com/) — Economic strategy game with alliance competition via market control and resource domination.
