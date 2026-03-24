# Seasonal Event Competition System -- Design Document

**Game:** Space Tycoon (browser-based multiplayer space company builder)
**Date:** 2026-03-23
**Status:** Design / Pre-Implementation

---

## Table of Contents

1. [Design Goals & Principles](#1-design-goals--principles)
2. [Season Structure](#2-season-structure)
3. [Event Mechanics -- How Players Earn Points](#3-event-mechanics----how-players-earn-points)
4. [Progression Track (Season Pass)](#4-progression-track-season-pass)
5. [Leaderboard System](#5-leaderboard-system)
6. [Themed Content -- 10 Season Themes](#6-themed-content----10-season-themes)
7. [Database & Backend Design](#7-database--backend-design)
8. [UI Design](#8-ui-design)
9. [Season Lifecycle & Transitions](#9-season-lifecycle--transitions)
10. [Fairness & Anti-Abuse](#10-fairness--anti-abuse)
11. [Monetization Integration](#11-monetization-integration)
12. [Success Metrics](#12-success-metrics)

---

## 1. Design Goals & Principles

### Primary Goals
- **Retention:** Give players a reason to return every day for weeks, not just hours.
- **Fresh Content Cadence:** Each season introduces a new theme, new challenges, and limited-time rewards that make the game feel alive.
- **Level-Agnostic Competition:** A player with $50M net worth and a player with $500B net worth should both find meaningful participation and achievable goals.
- **Social Engagement:** Drive alliance cooperation and inter-player competition through shared season goals and leaderboards.

### Design Principles (Aligned with Existing Game Philosophy)
- **No Pay-to-Win:** Season rewards are cosmetic, convenience, or modest in-game currency. Pro/Enterprise subscribers get quality-of-life benefits on the Season Pass (extra cosmetic track), never exclusive power.
- **Fresh-Start Scoring:** Season points are earned from scratch each season. A veteran's $1T empire does not translate into automatic season dominance. Tasks scale to player level.
- **Participation Rewarded:** Every active player should unlock at least half the free track. The system rewards consistency over grinding marathons.
- **Variety Between Seasons:** Each season introduces a temporary mechanic or resource that changes how the game plays for its duration, preventing staleness.

### Research-Informed Decisions
- Industry data shows that games offering both recurring and non-recurring limited-time events are 2x more likely to be in the top 100 grossing (GameRefinery).
- Idle Miner Tycoon's "Season Points earned from event mines" model validates the approach of running short events within a longer season, feeding into a season-long progression track.
- Battle pass systems with 30-60 day durations and tiered free/premium tracks are the industry standard for sustained engagement (Deconstructor of Fun, GameMakers).
- Reward pacing research shows a "growing curve with relief moments" is optimal: small frequent rewards with larger milestone spikes.

---

## 2. Season Structure

### Duration & Cadence

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Season length | **28 real days (4 weeks)** | Long enough for meaningful progression; short enough to feel urgent. Matches 1 real month roughly. At 6h/game-month, this is ~112 game months per season. |
| Seasons per year | **12 (monthly)** | Every calendar month gets a season. Two "off weeks" per year (Jan 1 week, mid-year break) for maintenance. |
| Off-season gap | **2-3 days** between seasons | Time for results compilation, reward distribution, and new season setup. Builds anticipation. |
| Season start | **First Monday** of each month, 00:00 UTC | Predictable schedule. Players can plan. |

### Why 28 Days?

- **Too short (7 days):** Players feel rushed. Casual players miss most content. Indistinguishable from the existing weekly challenges.
- **Too long (56 days):** Mid-season fatigue. Players who fall behind in week 2 disengage entirely.
- **28 days is the sweet spot:** 4 weekly reset cycles within the season. Players who miss a few days can catch up. Matches the cadence that Idle Factory Tycoon and similar idle games use for their monthly battle passes.

### Fresh-Start Scoring

Every season, all players begin at **0 Season Points (SP)**. The season score is entirely earned through season-specific actions during the 28-day window. A player's existing empire (buildings, money, research) determines which *difficulty tier* of challenges they receive, but does not grant automatic SP.

**Why fresh-start?** Cumulative scoring would mean endgame players dominate every leaderboard permanently. Fresh-start means a dedicated mid-game player can out-rank a passive endgame player.

### Season Calendar Example (Year 1)

| Month | Season Name | Theme |
|-------|-------------|-------|
| Jan | Galactic Gold Rush | Asteroid Mining Boom |
| Feb | Stellar Shipyard | Fleet Construction |
| Mar | Deep Space Expedition | Exploration & Surveys |
| Apr | Cosmic Commerce | Trading & Market |
| May | Quantum Frontier | Research & Technology |
| Jun | Stellar Harvest | Resource Extraction |
| Jul | Orbital Architects | Construction & Stations |
| Aug | Void Voyagers | Fleet Missions & Transit |
| Sep | Nebula Nexus | Alliance Cooperation |
| Oct | Dark Matter Discovery | Risk & Exploration |
| Nov | Solar Supremacy | Energy & Production |
| Dec | Galactic Gala | Holiday Celebration (mixed) |

---

## 3. Event Mechanics -- How Players Earn Points

### Season Points (SP)

SP is the universal progression currency for each season. It is earned through three channels:

1. **Daily Challenges** (short-cycle engagement)
2. **Weekly Milestones** (medium-cycle goals)
3. **Season-Long Objectives** (big aspirational targets)
4. **Bonus SP Events** (time-limited bursts within the season)

### 3.1 Daily Challenges

**3 challenges per day**, refreshing at 00:00 UTC. Players can hold up to 6 uncompleted dailies (2-day buffer for missed days).

Daily challenges are drawn from a pool of ~40 templates, filtered to match the season theme and the player's current game stage.

| Player Tier | Criteria | Example Daily Challenge | SP Reward |
|-------------|----------|------------------------|-----------|
| Beginner | < $500M net worth, < 5 buildings | "Complete 1 building" | 30 SP |
| Early-Mid | $500M - $10B, 5-15 buildings | "Mine 50 iron this session" | 30 SP |
| Mid | $10B - $100B, 15-30 buildings | "Earn $500M revenue today" | 30 SP |
| Late | $100B - $1T, 30+ buildings | "Complete 2 research projects" | 30 SP |
| Endgame | $1T+, 40+ buildings, 8+ locations | "Fill a resource bounty" | 30 SP |

**Key design:** All tiers award the same SP (30 per daily). The *difficulty* scales, not the reward. This is the core fairness mechanism.

**Daily challenge categories (themed to current season):**
- Build/upgrade a building (scaled count)
- Mine X resources (scaled quantity)
- Earn X revenue (scaled to income)
- Complete a research project
- Send a ship on a mission
- Complete a contract
- Trade on the market (buy or sell)
- Hire workforce members

**Maximum daily SP:** 90 SP (3 dailies x 30 SP). Over 28 days: **2,520 SP from dailies alone**.

### 3.2 Weekly Milestones

**5 milestones per week**, resetting every Monday. These are larger goals that take several days of play.

| Milestone Type | Example (Mining Season) | SP Reward |
|----------------|------------------------|-----------|
| Cumulative Resource | Mine 500 total iron this week | 100 SP |
| Construction | Complete 3 buildings this week | 100 SP |
| Revenue | Earn 5x your daily income this week | 120 SP |
| Themed Special | Mine a rare resource for the first time | 150 SP |
| Stretch Goal | Complete ALL other weekly milestones | 200 SP |

**Maximum weekly SP:** 670 SP. Over 4 weeks: **2,680 SP from weeklies**.

Weekly milestones also scale by player tier using the same bracket system as dailies.

### 3.3 Season-Long Objectives

**8 objectives** that span the entire 28-day season. These are aspirational goals that encourage sustained play.

| Objective | SP Reward | Description |
|-----------|-----------|-------------|
| Season Dedication | 200 SP | Log in on 20+ different days |
| Theme Mastery | 300 SP | Complete 60+ daily challenges |
| Weekly Champion | 250 SP | Complete all weekly milestones in any single week |
| Empire Growth | 300 SP | Increase net worth by 50% during the season |
| Explorer | 200 SP | Unlock a new solar system location during the season |
| Fleet Commander | 250 SP | Build 3+ ships during the season |
| Social Player | 150 SP | Complete 5 bounties or market trades |
| Season Completionist | 500 SP | Complete all other season-long objectives |

**Maximum season objective SP:** 2,150 SP.

### 3.4 Bonus SP Events (Mini-Events Within the Season)

2-3 times per season, a **48-hour Bonus SP Event** activates. These are themed "blitzes" that overlap with the existing timed events system (`timed-events.ts`) but award bonus SP on top of normal rewards.

Example: During a Mining-themed season, a "Platinum Rush Weekend" awards 2x SP for all mining-related dailies and weeklies.

**Estimated bonus SP per season:** 200-400 SP.

### Total SP Budget

| Source | Max SP | % of Total |
|--------|--------|------------|
| Daily Challenges (28 days) | 2,520 | 34% |
| Weekly Milestones (4 weeks) | 2,680 | 36% |
| Season-Long Objectives | 2,150 | 29% |
| Bonus Events | ~400 | 5% |
| **Total Available** | **~7,750** | 100% |

This budget is calibrated against the progression track (Section 4).

---

## 4. Progression Track (Season Pass)

### Structure: 50 Tiers

The Season Pass has **50 tiers** with two tracks:

- **Free Track:** Available to all players. Contains in-game cash, resources, speed boosts, and a season title.
- **Pro Track:** Unlocked for Pro and Enterprise subscribers automatically (no additional purchase). Contains exclusive cosmetics, extra cash, and the season's premium rewards.

**Why 50 tiers?** 100 is too many for a 28-day season (rewards feel trivial). 30 is too few (players finish too fast). 50 provides a reward roughly every 12-14 hours of passive play, or every day with light engagement.

### SP Required Per Tier

Tiers use a **graduated curve with relief moments**:

| Tier Range | SP Per Tier | Cumulative SP at End |
|------------|-------------|----------------------|
| 1-10 | 50 SP each | 500 SP |
| 11-20 | 80 SP each | 1,300 SP |
| 21-30 | 110 SP each | 2,400 SP |
| 31-40 | 140 SP each | 3,800 SP |
| 41-49 | 170 SP each | 5,330 SP |
| 50 (Final) | 250 SP | 5,580 SP |

**Total SP to complete all 50 tiers: 5,580 SP** (out of ~7,750 available).

This means:
- A player completing **72% of available challenges** finishes the pass.
- A player doing only dailies (2,520 SP) reaches tier ~27 (just past halfway).
- A player doing dailies + weeklies (5,200 SP) reaches tier ~46.
- Completionists who do everything finish with ~2,000 SP to spare.

### Reward Table

Rewards alternate between immediate gratification (cash, boosts) and aspirational items (cosmetics, titles).

**Free Track Highlights:**

| Tier | Reward | Type |
|------|--------|------|
| 1 | $50M cash | Currency |
| 5 | 2-hour Construction Speed Boost (2x) | Boost |
| 10 | $200M cash + 50 Iron | Currency + Resource |
| 15 | Season Title: "[Theme] Recruit" | Cosmetic |
| 20 | $500M cash + 2-hour Research Boost (2x) | Currency + Boost |
| 25 | Common Ship Skin (season-themed) | Cosmetic |
| 30 | $1B cash + 100 mixed resources | Currency + Resource |
| 35 | 4-hour Construction Speed Boost (3x) | Boost |
| 40 | Season Title: "[Theme] Veteran" | Cosmetic |
| 45 | $2B cash + Rare resources | Currency + Resource |
| 50 | Season Badge + Exclusive Title: "[Theme] Champion" | Cosmetic |

**Pro Track Highlights (in addition to free track):**

| Tier | Reward | Type |
|------|--------|------|
| 1 | Uncommon Company Badge (season-themed) | Cosmetic |
| 10 | $500M bonus cash | Currency |
| 15 | Uncommon Ship Skin (season-exclusive) | Cosmetic |
| 20 | Season Chat Emote | Cosmetic |
| 25 | Rare Station Theme (season-themed) | Cosmetic |
| 30 | $2B bonus cash | Currency |
| 35 | Rare Ship Skin (animated, season-exclusive) | Cosmetic |
| 40 | Season Trail Effect | Cosmetic |
| 45 | Epic Nameplate (season-exclusive) | Cosmetic |
| 50 | Epic Ship Skin + "Season [X] Elite" Title | Cosmetic |

### Pacing Philosophy

Following industry best practices:
- **Front-loaded excitement:** Tiers 1-10 unlock quickly (1-2 days), giving new participants an immediate sense of progress.
- **Mid-pass engagement:** Tiers 11-30 require steady daily play. This is where most players spend their season.
- **Aspirational tail:** Tiers 40-50 require dedication. The rewards here are the most exclusive.
- **Relief moments:** Every 5th tier has a notably better reward, creating "spike and relief" pacing.

---

## 5. Leaderboard System

### Season-Specific Leaderboard

A dedicated **Season Leaderboard** runs alongside the existing global leaderboard (net worth). The season leaderboard ranks players by **total SP earned** during the current season.

### Tier Brackets (Fair Competition Across Levels)

To prevent endgame players from dominating every leaderboard, the season leaderboard is divided into **5 brackets** based on net worth at season start:

| Bracket | Net Worth Range | Typical Player |
|---------|----------------|----------------|
| Frontier | < $1B | New players, first week |
| Startup | $1B - $50B | Early-mid game |
| Corporation | $50B - $500B | Mid game |
| Conglomerate | $500B - $5T | Late game |
| Megacorp | $5T+ | Endgame veterans |

Each bracket has its own top-10 ranking, rewards, and leaderboard display. Players cannot change brackets mid-season (locked at season start based on net worth snapshot).

### Leaderboard Rewards

| Placement | Reward |
|-----------|--------|
| 1st in bracket | Legendary season cosmetic + 10B cash + Exclusive animated badge |
| 2nd-3rd | Epic season cosmetic + 5B cash |
| 4th-10th | Rare season cosmetic + 2B cash |
| Top 25% | Season participation badge (unique per bracket) |
| Top 50% | 500M cash bonus |
| Completed Pass | "Season [X] Graduate" title |

### Alliance Season Rankings

Alliances also receive a season score: the **sum of all members' SP**. The top 3 alliances each season earn:

| Placement | Reward |
|-----------|--------|
| 1st Alliance | Alliance badge for the season + 50B shared treasury + "Dominant Alliance" tag |
| 2nd Alliance | Alliance badge + 25B shared treasury |
| 3rd Alliance | Alliance badge + 10B shared treasury |

Alliance leaders can distribute treasury funds to members. This incentivizes alliance recruitment and coordination during seasons.

### Leaderboard Update Frequency

- Leaderboard updates every **60 seconds** (aligned with the existing game sync interval).
- A "Last Updated" timestamp is displayed.
- Historical season results are preserved permanently in the database.

---

## 6. Themed Content -- 10 Season Themes

Each season introduces a **temporary mechanic** that only exists for that season's duration. This makes each season feel different and prevents the formula from becoming stale.

### Theme 1: Galactic Gold Rush (Asteroid Mining Boom)

**Temporary Mechanic: Bonus Ore Veins**
- Random asteroid locations spawn "Rich Veins" that yield 3x mining output for 4 hours.
- Ships assigned to mining discover veins randomly. More ships = more discoveries.
- Season challenges focus on mining quantity, rare resource discovery, and resource trading.
- **Season Resource:** "Iridium Dust" -- only obtainable this season, used for season-exclusive crafting.

### Theme 2: Stellar Shipyard (Fleet Construction)

**Temporary Mechanic: Blueprint Fragments**
- Completing ship builds drops "Blueprint Fragments." Collect 10 to unlock a temporary ship class: the "Season Corvette" (fast, cheap, great for surveys).
- Challenges focus on ship building, fleet deployment, and transit missions.
- **Season Resource:** "Nano-Alloy" -- special building material that reduces ship build time by 20% when used.

### Theme 3: Deep Space Expedition (Exploration & Surveys)

**Temporary Mechanic: Expedition Map**
- A season-exclusive map shows 6 "Uncharted Sectors." Players send survey probes to explore them.
- Each sector takes 24-48 real hours to survey and yields random rewards (resources, cash, SP, cosmetics).
- Challenges focus on exploration, location unlocking, and survey missions.
- **Season Resource:** "Star Charts" -- earned from surveys, exchangeable for SP or unique cosmetics.

### Theme 4: Cosmic Commerce (Trading & Market)

**Temporary Mechanic: Trade Routes**
- Players establish "Trade Routes" between two of their locations. Routes generate passive income and SP every hour.
- More locations unlocked = more potential routes.
- Challenges focus on market buy/sell volume, trade profit, bounty completion.
- **Season Resource:** "Trade Tokens" -- earned from market activity, redeemable for rare resources.

### Theme 5: Quantum Frontier (Research & Technology)

**Temporary Mechanic: Collaborative Research**
- Alliance members can pool research speed. When 3+ alliance members research simultaneously, all get a 25% speed bonus.
- A season-exclusive "Quantum Research" branch appears with 5 temporary techs that grant season bonuses.
- Challenges focus on research completion, tech diversity, and alliance collaboration.
- **Season Resource:** "Quantum Cores" -- dropped from completing research, used for temporary tech.

### Theme 6: Stellar Harvest (Resource Extraction)

**Temporary Mechanic: Resource Multiplier Waves**
- Every 6 hours, a random resource type gets a 2x extraction bonus for 2 hours.
- Players who are mining that resource during the wave earn bonus SP.
- Challenges focus on raw resource accumulation, refining, and production chains.
- **Season Resource:** "Enriched Ore" -- rare drop during waves, tradeable or usable for crafting.

### Theme 7: Orbital Architects (Construction & Stations)

**Temporary Mechanic: Modular Station Expansion**
- Players can build temporary "Season Modules" that attach to existing stations. Each module adds a small revenue or research bonus for the season's duration.
- Building modules costs resources but no cash, encouraging resource gathering.
- Challenges focus on building completion, upgrade counts, and multi-location construction.
- **Season Resource:** "Construction Permits" -- earned from building, used to unlock premium module slots.

### Theme 8: Void Voyagers (Fleet Missions & Transit)

**Temporary Mechanic: Convoy System**
- Players can form "Convoys" with alliance members -- linking ships on the same route gives all convoy ships a speed bonus and bonus SP.
- Solo ship missions also earn SP, but convoys earn 50% more.
- Challenges focus on total distance traveled, cargo delivered, and mining expeditions completed.
- **Season Resource:** "Navigation Data" -- earned from ship missions, tradeable for SP or boosts.

### Theme 9: Nebula Nexus (Alliance Cooperation)

**Temporary Mechanic: Alliance Projects**
- Each alliance can start a "Mega-Project" (e.g., build a shared Dyson Ring, colonize a new fictional moon). Mega-Projects require pooled resources from all members.
- Completing the project grants all contributors massive SP and an alliance cosmetic.
- Challenges focus on alliance contributions, group milestones, and cooperative goals.
- **Season Resource:** "Unity Tokens" -- earned from contributions, spent on alliance-wide buffs.

### Theme 10: Dark Matter Discovery (Risk & Exploration)

**Temporary Mechanic: Anomaly Scanner**
- A new UI element shows "Dark Matter Anomalies" appearing randomly across the solar system.
- Players send ships to investigate. Each anomaly has a risk/reward outcome (like the existing RiskDecision system but season-themed).
- High-risk anomalies can yield massive SP payouts or result in ship damage.
- Challenges focus on anomalies investigated, risk decisions taken, and discovery milestones.
- **Season Resource:** "Dark Matter Samples" -- rare, valuable, and season-exclusive.

---

## 7. Database & Backend Design

### New Prisma Models

```
model Season {
  id            String    @id @default(cuid())
  seasonNumber  Int       @unique        // Sequential: 1, 2, 3...
  name          String                   // "Galactic Gold Rush"
  theme         String                   // "asteroid_mining"
  description   String
  startsAt      DateTime
  endsAt        DateTime
  status        String    @default("upcoming") // upcoming, active, ended, archived
  config        Json                     // Theme-specific config (bonus mechanics, resources, etc.)

  // Relations
  challenges    SeasonChallenge[]
  playerSeasons PlayerSeason[]
  leaderboard   SeasonLeaderboardEntry[]
  allianceScores SeasonAllianceScore[]
  passRewards   SeasonPassReward[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([status])
  @@index([startsAt])
}

model SeasonChallenge {
  id            String    @id @default(cuid())
  seasonId      String
  season        Season    @relation(fields: [seasonId], references: [id], onDelete: Cascade)

  type          String    // "daily", "weekly", "season_long"
  category      String    // "mining", "building", "revenue", "fleet", "research", "trading"
  name          String
  description   String
  icon          String

  // Scaling config -- target is computed per player tier
  tierTargets   Json      // { "frontier": 10, "startup": 50, "corporation": 200, ... }
  metric        String    // "resources_mined", "buildings_completed", "revenue_earned", etc.
  spReward      Int

  // Scheduling
  weekNumber    Int?      // null for season-long, 1-4 for weekly, null for daily (pool)
  isDaily       Boolean   @default(false)
  isActive      Boolean   @default(true)

  // Relations
  playerProgress SeasonChallengeProgress[]

  @@index([seasonId, type])
  @@index([seasonId, weekNumber])
}

model PlayerSeason {
  id            String    @id @default(cuid())
  profileId     String
  profile       GameProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  seasonId      String
  season        Season    @relation(fields: [seasonId], references: [id], onDelete: Cascade)

  // Bracket (locked at season start)
  bracket       String    // "frontier", "startup", "corporation", "conglomerate", "megacorp"
  netWorthAtStart Float

  // Progression
  totalSp       Int       @default(0)
  currentTier   Int       @default(0) // Season Pass tier reached
  daysActive    Int       @default(0)

  // Daily challenge tracking
  dailyChallengeIds   String[]  @default([]) // IDs of today's assigned dailies
  dailyLastRefresh    DateTime?
  heldDailyCount      Int       @default(0)  // Uncompleted dailies (max 6)

  // Season resource
  seasonResource      Int       @default(0)  // Theme-specific resource count

  // Timestamps
  joinedAt      DateTime  @default(now())
  lastActivityAt DateTime @default(now())

  // Pro track
  hasProTrack   Boolean   @default(false) // Set based on subscription at join time

  @@unique([profileId, seasonId])
  @@index([seasonId, bracket, totalSp])
  @@index([seasonId, totalSp])
}

model SeasonChallengeProgress {
  id            String    @id @default(cuid())
  playerSeasonId String
  playerSeason  PlayerSeason @relation(fields: [playerSeasonId], references: [id], onDelete: Cascade) // (add relation to PlayerSeason)
  challengeId   String
  challenge     SeasonChallenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)

  currentValue  Float     @default(0)
  targetValue   Float                  // Computed from player's tier
  isCompleted   Boolean   @default(false)
  completedAt   DateTime?
  spAwarded     Int       @default(0)

  @@unique([playerSeasonId, challengeId])
  @@index([playerSeasonId, isCompleted])
}

model SeasonLeaderboardEntry {
  id            String    @id @default(cuid())
  seasonId      String
  season        Season    @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  profileId     String
  profile       GameProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  companyName   String
  bracket       String
  totalSp       Int
  rank          Int?      // Computed periodically
  tier          Int       // Current pass tier

  updatedAt     DateTime  @updatedAt

  @@unique([seasonId, profileId])
  @@index([seasonId, bracket, totalSp(sort: Desc)])
}

model SeasonAllianceScore {
  id            String    @id @default(cuid())
  seasonId      String
  season        Season    @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  allianceId    String
  alliance      Alliance  @relation(fields: [allianceId], references: [id], onDelete: Cascade)

  totalSp       Int       @default(0)
  memberCount   Int       @default(0)
  rank          Int?

  updatedAt     DateTime  @updatedAt

  @@unique([seasonId, allianceId])
  @@index([seasonId, totalSp(sort: Desc)])
}

model SeasonPassReward {
  id            String    @id @default(cuid())
  seasonId      String
  season        Season    @relation(fields: [seasonId], references: [id], onDelete: Cascade)

  tier          Int       // 1-50
  track         String    // "free" or "pro"
  rewardType    String    // "cash", "resource", "boost", "cosmetic", "title", "badge"
  rewardData    Json      // { amount: 50000000 } or { cosmeticId: "skin_season1_rare" } etc.
  description   String

  @@unique([seasonId, tier, track])
  @@index([seasonId])
}

model SeasonRewardClaim {
  id            String    @id @default(cuid())
  playerSeasonId String
  tier          Int
  track         String    // "free" or "pro"
  claimedAt     DateTime  @default(now())

  @@unique([playerSeasonId, tier, track])
}
```

### Backend Architecture

#### Season Configuration: Admin Tool

Seasons are configured via a dedicated admin panel at `/admin/seasons`, not hardcoded. The admin tool allows:

- Creating new seasons with name, theme, dates, description
- Configuring the challenge pool (daily/weekly/season-long)
- Setting tier targets for each challenge per bracket
- Configuring pass rewards for each tier
- Setting theme-specific config (bonus mechanics, season resources)
- Previewing the season before activation
- Emergency controls: extend season, pause challenges, adjust SP values

The `Season.config` JSON field stores theme-specific parameters:

```json
{
  "themeId": "asteroid_mining",
  "seasonResource": { "id": "iridium_dust", "name": "Iridium Dust", "icon": "sparkles" },
  "bonusMechanic": {
    "type": "rich_veins",
    "spawnIntervalHours": 4,
    "durationHours": 4,
    "miningMultiplier": 3.0,
    "discoveryChance": 0.15
  },
  "bonusSpEvents": [
    { "name": "Platinum Rush Weekend", "startsAtDay": 10, "durationHours": 48, "spMultiplier": 2.0, "categories": ["mining"] }
  ]
}
```

#### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/space-tycoon/season/current` | GET | Get active season info, player's progress, challenges |
| `/api/space-tycoon/season/challenges` | GET | Get player's current daily/weekly/season challenges with progress |
| `/api/space-tycoon/season/claim-reward` | POST | Claim a pass tier reward |
| `/api/space-tycoon/season/leaderboard` | GET | Get season leaderboard (filterable by bracket) |
| `/api/space-tycoon/season/alliance-scores` | GET | Get alliance season rankings |
| `/api/space-tycoon/season/history` | GET | Get past season results for a player |
| `/api/space-tycoon/season/recap` | GET | Get end-of-season summary |
| `/api/admin/seasons` | CRUD | Admin season management |
| `/api/admin/seasons/[id]/challenges` | CRUD | Admin challenge configuration |
| `/api/admin/seasons/[id]/rewards` | CRUD | Admin reward configuration |

#### SP Calculation: Server-Side Only

SP is calculated and awarded **server-side** during the existing 60-second sync cycle. When a player syncs their game state:

1. Server compares current game state vs. the player's last synced state.
2. Server checks each active challenge: has the metric increased? Has the target been met?
3. If a challenge is completed, SP is awarded and recorded in `SeasonChallengeProgress`.
4. `PlayerSeason.totalSp` and `PlayerSeason.currentTier` are updated.
5. `SeasonLeaderboardEntry` is updated.

This ensures SP cannot be manipulated client-side.

#### Daily Challenge Refresh Logic

```
On each sync, check if dailyChallengeIds need refresh:
1. If dailyLastRefresh is before today's 00:00 UTC:
   a. Move uncompleted dailies to "held" pool (max 6 held)
   b. Draw 3 new dailies from the pool, filtered by:
      - Current season theme categories
      - Player's bracket tier
      - Not duplicating any held dailies
   c. Set dailyLastRefresh to now
   d. Assign scaled targets based on player bracket
```

### Season Transition Logic

When a season ends (checked by a scheduled job running every 5 minutes):

1. **Freeze:** Mark season status as `ended`. No more SP can be earned.
2. **Rank:** Calculate final rankings for all brackets and alliances.
3. **Distribute:** Award leaderboard placement rewards (cash, cosmetics) to qualifying players.
4. **Archive:** Move season to `archived` status after 7 days.
5. **Announce:** Generate end-of-season recap data for each player.
6. **Activate:** Mark the next season as `active` and initialize `PlayerSeason` records for active players on their next sync.

Transition is handled by a cron endpoint (`/api/cron/season-transition`) callable by Railway's cron scheduler.

---

## 8. UI Design

### 8.1 Season Banner / Announcement

**Location:** Top of the game dashboard, replacing the current date/time header area during active seasons.

**Elements:**
- Season name and theme icon (e.g., "Galactic Gold Rush" with a golden asteroid icon)
- Countdown timer: "14 days, 6 hours remaining"
- Current tier progress bar: "Tier 23 / 50" with a visual track
- Quick SP counter: "2,340 SP"
- "View Season" button to open the full season panel

**Between seasons (off-season):**
- "Next Season: [Name] starts in 2 days" with a preview of the theme
- Recap button: "View Season [X] Results"

### 8.2 Season Tab (New Game Tab)

Add a new tab to the existing `GameTab` type: `'season'`.

The season panel has 4 sub-sections:

#### Sub-Section A: Progress Track

A horizontal scrollable track showing all 50 tiers. Visual design similar to a train track or pathway:

```
[1]-[2]-[3]-[4]-[5]-...-[25]-...-[50]
 v   v   v   v   v       v        v
$50M boost $200M ...  Skin ...  Badge+Title
```

- Completed tiers: filled in with theme color, checkmark
- Current tier: glowing, animated
- Upcoming tiers: dimmed but visible
- Pro track rewards: shown as a second row below the free track (gold border)
- Locked Pro rewards: shown with a lock icon and "Pro" label for free players
- Claim button: appears on completed but unclaimed tiers

#### Sub-Section B: Challenges

A card-based list organized by type:

**Daily Challenges (3 cards)**
- Each card shows: icon, name, progress bar, SP reward
- Completed cards: green checkmark, "Claimed" state
- Held dailies (from missed days): shown in a collapsed "Catch-Up" section

**Weekly Milestones (5 cards)**
- Week number indicator: "Week 2 of 4"
- Progress bar per milestone
- Stretch goal highlighted at the bottom

**Season Objectives (8 cards)**
- Always visible, showing long-term progress
- Completed objectives glow with theme color

#### Sub-Section C: Season Leaderboard

- Bracket selector: tabs for each bracket
- Player's own bracket auto-selected
- Top 10 display with: rank, company name, alliance tag, SP, current tier
- Player's own position highlighted (even if not in top 10)
- Alliance leaderboard toggle

#### Sub-Section D: Theme Info

- Current season theme description and lore
- Season resource info: what it is, how to earn it, what it does
- Bonus mechanic explanation with visual
- Bonus SP event schedule (upcoming blitzes)

### 8.3 Season-Specific Challenges List

Integrated into the existing **Contracts tab** as a new section at the top:

```
[Season Challenges]              [Contracts]
 3 Daily | 5 Weekly | 8 Season   Available | Active | Completed
```

This leverages the existing UI pattern players are familiar with.

### 8.4 End-of-Season Recap Screen

A full-screen overlay that appears on first login after a season ends:

**Season [X] Results**
- Final tier reached: "Tier 38 / 50"
- Total SP earned: "4,210 SP"
- Bracket placement: "3rd in Corporation bracket"
- Days active: "22 / 28"
- Challenges completed: "57 / 84 daily, 16 / 20 weekly, 5 / 8 season"
- Alliance placement: "Alliance ranked #2"
- Rewards earned: visual grid of all rewards
- Season resource remaining: "43 Iridium Dust" (auto-converted to regular resources)
- "Share Results" button (copies a text summary)
- "View Next Season" button

### 8.5 Notification Integration

Season events trigger toast notifications using the existing `src/lib/toast.ts` system:

- "Daily challenges refreshed!" (daily at 00:00 UTC)
- "Challenge completed: [name] -- +30 SP!" (on challenge completion)
- "Season Pass Tier 15 unlocked!" (on tier advancement)
- "Bonus SP Event active! 2x Mining SP for 48 hours" (on bonus event start)
- "Season ending in 24 hours!" (urgency notification)

---

## 9. Season Lifecycle & Transitions

### Phase 1: Pre-Season (3 days before)

- Admin activates the season in the admin panel
- "Coming Soon" banner appears in-game with theme preview
- Challenge pool and rewards are finalized
- Players can preview the reward track

### Phase 2: Season Active (28 days)

- `PlayerSeason` records created on first sync after season start
- Bracket assignment based on `GameProfile.netWorth` snapshot
- Daily/weekly/season challenges become active
- Leaderboard starts tracking
- Bonus SP events trigger on schedule

### Phase 3: Season Ending (Final 48 hours)

- "Season ending soon!" warning banners
- Final bonus SP event (optional "Last Chance" blitz)
- Players reminded of unclaimed pass rewards

### Phase 4: Season Ended + Results (3 days)

- SP earning frozen
- Rankings finalized
- Rewards distributed (leaderboard placement rewards)
- Recap screen prepared
- Season resource converted: remaining season resource auto-converts to a common resource (e.g., 1 Iridium Dust = 5 iron)
- Temporary mechanics deactivated

### Phase 5: Off-Season (2-3 days)

- No active season
- Players can view results and claim any unclaimed pass rewards
- Next season preview available
- Maintenance window for backend updates

---

## 10. Fairness & Anti-Abuse

### Level-Scaled Challenges

The bracket system and tier-scaled targets are the primary fairness mechanisms. A new player in the "Frontier" bracket competes only against other new players, and their challenges have targets calibrated for their game stage.

### Anti-Farming Protections

- **SP is server-calculated:** Client cannot self-award SP.
- **Daily caps:** Max 90 SP from dailies per day. No "binge and be done" strategy.
- **Diminishing returns on repeated actions:** If a challenge is "mine 50 iron," mining 500 iron does not give 10x SP. Each challenge awards SP once.
- **Bracket lock:** Players cannot deliberately lose net worth to drop into a lower bracket mid-season.
- **Alt account detection:** If a player's GameProfile was created in the last 7 days and immediately ranks in the top 10, flag for manual review.

### Catch-Up Mechanics

- **Held dailies (max 6):** Missing a day does not permanently lose SP. Players can complete yesterday's and today's dailies.
- **Weekly milestones reset independently:** Missing week 1 does not affect week 2 goals.
- **Late joiners:** Players who join mid-season can participate. Their bracket is assigned on join. They miss earlier dailies but can still progress through weeklies and season objectives.
- **Bonus SP events:** Designed to help players who fell behind catch up in concentrated bursts.

### Subscriber Fairness

Following the existing game's "pay for convenience, not power" principle:

- Pro subscribers get **cosmetic rewards** on the Pro track, not extra SP.
- Pro subscribers do NOT earn SP faster than free players.
- Pro subscribers do NOT get easier challenge targets.
- The only subscriber advantage: access to the Pro reward track (which contains cosmetics that free players cannot earn that season, but these are purely visual).

---

## 11. Monetization Integration

### Revenue Channels

1. **Pro/Enterprise subscriptions** include the Pro track automatically. This adds value to existing subscriptions without a separate purchase.
2. **Season-exclusive cosmetics** that are NOT on the pass can be sold in the cosmetic shop during the season (1-2 premium items per season, $4.99-$14.99).
3. **No SP purchases.** Players cannot buy Season Points. This is a deliberate choice to keep the leaderboard fair and the progression meaningful.

### Why No Separate Battle Pass Purchase?

The game already has a subscription model (Free / Pro / Enterprise). Adding a separate $10 battle pass would:
- Fragment the monetization (confusing for players)
- Undermine the subscription value proposition
- Create pressure to make the free track feel bad (which hurts retention)

Instead, the Pro track being included in Pro subscriptions makes the subscription more valuable. Players think: "I get the Pro track every month as part of my sub."

### Projected Revenue Impact

- **Subscription conversion lift:** Seasons give players a new reason to subscribe. Estimated 10-15% lift in Pro conversions during first 3 months.
- **Retention improvement:** Industry data shows seasonal events boost DAU by 20-40% and retention by 15-25%.
- **Cosmetic shop lift:** Season-themed limited cosmetics create urgency. Estimated 20% lift in cosmetic purchases during active seasons.

---

## 12. Success Metrics

### Key Performance Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| Season participation rate | 60%+ of active players join | PlayerSeason count / active GameProfile count |
| Pass completion rate | 30%+ reach tier 50 | PlayerSeason.currentTier = 50 count |
| Average tier reached | Tier 25+ | AVG(PlayerSeason.currentTier) |
| Daily active during season | +25% vs non-season baseline | DAU during season / baseline DAU |
| Day 7 retention during season | +15% vs baseline | Standard D7 retention metric |
| Day 28 retention during season | +20% vs baseline | Standard D28 retention metric |
| Pro subscription conversions | +10% during first season month | New Pro subs / total free players |
| Alliance participation | +30% of season players in an alliance | PlayerSeason with alliance / total PlayerSeason |
| Challenge completion rate | 50%+ of dailies completed | Completed challenges / assigned challenges |
| Leaderboard engagement | 40%+ check leaderboard weekly | API hits to leaderboard endpoint |

### Monitoring & Iteration

After each season, the team reviews:
- Which challenge types had the highest/lowest completion rates?
- Which bracket had the best/worst engagement?
- Did any bracket feel too easy or too hard? (Survey + data)
- Which pass rewards drove the most excitement? (Social mentions, claim rates)
- Did the themed mechanic add meaningful gameplay? (Session time during mechanic vs. not)
- Were there any exploits or unfairness reports?

Findings feed into the next season's design, creating a continuous improvement loop.

---

## Appendix A: Integration Points with Existing Systems

| Existing System | Integration |
|-----------------|-------------|
| `timed-events.ts` | Bonus SP events during seasons wrap the existing timed event system, adding SP rewards on top |
| `weekly-events.ts` | Weekly challenges replace the standalone weekly system during active seasons (or run alongside) |
| `milestones.ts` | Season-long objectives are conceptually similar but season-scoped; no conflict |
| `achievements.ts` | New season-specific achievements can be added (e.g., "Complete 3 seasons") |
| `contracts.ts` | Season challenges appear in the Contracts tab UI alongside contracts |
| `cosmetic-shop.ts` | Season cosmetics added to catalog with `earnableVia: 'season_X_tier_Y'` |
| `subscriber-perks.ts` | Pro track gated by `subscriptionTier` check |
| `competitive-engine.ts` | Bracket assignment uses existing `netWorth` field |
| `catchup-mechanics.ts` | Late joiners to a season receive the same pioneer bonus for the main game; season catch-up is handled by held dailies |
| `save-load.ts` | Add season fields to GameState for client-side display; SP remains server-authoritative |
| `game-engine.ts` | Sync cycle extended to include season progress check |
| Game sync (60s) | Season progress piggybacked on existing sync POST |

## Appendix B: GameState Additions (Client-Side)

```typescript
// Added to GameState interface in types.ts
seasonData?: {
  seasonId: string;
  seasonName: string;
  theme: string;
  bracket: string;
  totalSp: number;
  currentTier: number;
  seasonResource: number;
  dailyChallenges: { id: string; name: string; icon: string; progress: number; target: number; spReward: number; completed: boolean }[];
  weeklyChallenges: { id: string; name: string; icon: string; progress: number; target: number; spReward: number; completed: boolean; weekNumber: number }[];
  seasonObjectives: { id: string; name: string; icon: string; progress: number; target: number; spReward: number; completed: boolean }[];
  bonusEventActive: boolean;
  bonusEventName?: string;
  bonusEventEndsAt?: number;
  seasonEndsAt: number;
};
```

This data is populated server-side during sync and sent to the client for display. The client never modifies SP values directly.

## Appendix C: Migration Checklist

1. Add Prisma models and run `npx prisma db push`
2. Add `seasonData` to `GameState` type and `save-load.ts` migration
3. Add `'season'` to `GameTab` type
4. Create admin panel pages under `/admin/seasons`
5. Create API routes under `/api/space-tycoon/season/`
6. Create cron endpoint `/api/cron/season-transition`
7. Add season sync logic to game-state sync POST handler
8. Build Season UI components (banner, pass track, challenge cards, leaderboard, recap)
9. Add season cosmetics to cosmetic-shop.ts catalog
10. Add GameProfile relations for new models
11. Test with a 1-day "test season" before the first real season launch
