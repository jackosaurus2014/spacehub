# Tiered/Bracketed Leaderboards - Implementation Design

## Space Tycoon - Async Multiplayer Competitive System

**Version**: 1.0
**Date**: 2026-03-23
**Status**: Design (Pre-Implementation)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Bracket System & Promotion/Relegation](#2-bracket-system--promotionrelegation)
3. [Weekly Metric Rotation Algorithm](#3-weekly-metric-rotation-algorithm)
4. [Scoring & Ranking Algorithm](#4-scoring--ranking-algorithm)
5. [Anti-Gaming Measures](#5-anti-gaming-measures)
6. [Reward Structure](#6-reward-structure)
7. [Database Schema](#7-database-schema)
8. [API Endpoints](#8-api-endpoints)
9. [UI Components](#9-ui-components)
10. [Notification Triggers](#10-notification-triggers)
11. [Implementation Phases](#11-implementation-phases)

---

## 1. System Overview

### Problem

The current leaderboard (`/api/space-tycoon/leaderboard`) is a single flat list sorted by netWorth, totalEarned, buildingCount, or researchCount. This creates several issues:

- **New players ($100M) competing against $1T+ veterans** -- demoralizing and unwinnable.
- **No weekly engagement loop** -- nothing resets, so once you fall behind, there is no recovery path.
- **No participation incentive** -- only the absolute top matters.
- **Static metrics** -- same leaderboard forever, no variety in what is rewarded.

### Solution

A tiered bracket system where players compete against others of similar net worth on weekly rotating metrics. Everyone in every bracket earns something. The system is async-first (no real-time requirements), notification-driven, and follows the core design principle: **never take things away**.

### Design Principles (inherited from the game)

1. **Never take things away** -- rewards are additive. Relegation is gentle (see section 2.5).
2. **Percentage-based metrics** -- weekly scores use percentage growth, not absolute values, so a $200M player and a $400M player in the same bracket compete fairly.
3. **Participation rewards** -- everyone who syncs at least once during the week gets something.
4. **Rotate opponents** -- each week reshuffles sub-brackets so you see different competitors.
5. **Multiple categories** -- 5 metric categories rotate weekly, rewarding different playstyles.
6. **Notification-driven** -- push/in-game notifications at key moments.
7. **Async-first** -- no real-time races. All scoring is computed from sync data.

---

## 2. Bracket System & Promotion/Relegation

### 2.1 Bracket Definitions

Brackets are determined by **net worth at the start of each weekly period**. A player's bracket is locked for the entire week (no mid-week bracket changes).

| Bracket | Net Worth Range | Display Name | Color | Icon |
|---------|----------------|--------------|-------|------|
| 1 | < $500M | Startup | Green (#22c55e) | Rocket emoji |
| 2 | $500M -- $5B | LEO Ops | Blue (#3b82f6) | Satellite emoji |
| 3 | $5B -- $50B | Interplanetary | Purple (#a855f7) | Planet emoji |
| 4 | $50B -- $500B | Deep Space | Amber (#f59e0b) | Star emoji |
| 5 | $500B+ | Galactic | Red (#ef4444) | Galaxy emoji |

**Note**: Bracket 5 (Galactic) is added beyond the existing four brackets. Players at the $500B+ level need their own bracket to prevent the $50B-level players in Deep Space from being crushed by trillion-dollar empires.

### 2.2 Sub-Brackets (Leagues)

Within each bracket, players are divided into **sub-brackets of 20 players** for direct competition. This keeps the leaderboard intimate and competitive.

**Sub-bracket assignment algorithm**:

```
function assignSubBrackets(playersInBracket: Player[]): SubBracket[] {
  // Sort by net worth descending
  sorted = playersInBracket.sort(netWorth DESC)

  // Serpentine draft into groups of 20
  // This ensures each sub-bracket has a mix of stronger/weaker players
  subBrackets = []
  groupSize = 20
  numGroups = ceil(sorted.length / groupSize)

  for each player at index i:
    groupIndex = i % numGroups
    // Reverse direction on odd passes (serpentine)
    if floor(i / numGroups) is odd:
      groupIndex = numGroups - 1 - groupIndex
    subBrackets[groupIndex].add(player)

  return subBrackets
}
```

**Why serpentine**: If you simply chunk players sequentially, the first sub-bracket gets all the strongest players. Serpentine distribution ensures each sub-bracket has a balanced mix.

**Minimum sub-bracket size**: 5 players. If a bracket has fewer than 5 players, they compete against NPC companies (the game already has NPC companies in `npc-companies.ts`).

### 2.3 Bracket Placement for New Players

New players are placed in Bracket 1 (Startup) regardless of pioneer bonuses. Their first week is a **placement week** with the following properties:

- They compete normally in Bracket 1.
- At week end, they are promoted to the bracket matching their actual net worth.
- Placement week rewards are given at Bracket 1 rates (no penalty for fast progression).

### 2.4 Promotion Mechanics

At the end of each weekly period:

1. **Automatic promotion**: Any player whose net worth exceeds their current bracket's ceiling is promoted to the appropriate bracket. This is mandatory and cannot be declined.
2. **Merit promotion**: Top 3 in each sub-bracket earn "promotion points." Accumulating 3 promotion points within a 4-week window promotes a player to the next bracket even if their net worth hasn't crossed the threshold. This rewards consistent high performance.
3. **Promotion is celebrated**: Players receive a congratulatory notification, a one-time cash bonus (see section 6), and a 24-hour "Promoted" badge visible on the leaderboard.

### 2.5 Relegation Mechanics

Relegation follows the "never take things away" principle. It is gentle and rare.

1. **Net worth relegation**: If a player's net worth drops below 80% of their bracket's floor (e.g., below $400M for LEO Ops), they are relegated at week end. The 80% buffer prevents oscillation for players near a boundary.
2. **Inactivity protection**: Players who don't sync for 2+ consecutive weeks are marked "inactive" and removed from sub-bracket competition (they stop appearing on others' leaderboards) but retain their bracket. After 4 weeks of inactivity, they are moved to a "Returning Players" pool and placed in the appropriate bracket when they return.
3. **No demotion from performance**: Finishing last in a sub-bracket does NOT cause relegation. Only net worth decline below the buffer threshold triggers it.
4. **Relegation softening**: Relegated players receive a "Bounce Back" buff: +10% to all weekly metric scores for 1 week in their new bracket, giving them a chance to place well immediately.

### 2.6 Prestige Players

Players who have used the prestige system (`prestige.ts`) restart with lower net worth but retain prestige level. Special handling:

- Prestige level is displayed next to their name on the leaderboard.
- Prestiged players are bracketed by their current net worth (they start in Bracket 1 again).
- They receive a "Prestige" badge visible to all competitors, signaling they are experienced.
- Their metric scoring receives NO bonus from prestige -- they compete on equal weekly terms.

---

## 3. Weekly Metric Rotation Algorithm

### 3.1 Metric Categories

Five metric categories rotate on a weekly cycle. Each week features ONE primary metric and ONE secondary metric.

| ID | Category | Metric | How It Is Measured | Percentage Basis |
|----|----------|--------|-------------------|-----------------|
| `revenue` | Revenue | Weekly revenue earned | `totalEarned(end) - totalEarned(start)` | `delta / netWorth(start)` |
| `buildings` | Construction | Buildings completed this week | Count of buildings whose `startedAtMs + realDurationSeconds*1000` falls within the week | `count / (buildingCount(start) + 1)` |
| `research` | Innovation | Research projects completed this week | Count of research completed during week | `count / (researchCount(start) + 1)` |
| `mining` | Mining | Total resource units mined this week | Sum of all resource deltas (positive only) | `units / (totalResourceUnits(start) + 100)` |
| `contracts` | Contracts | Contracts + bounties completed this week | Count of contracts completed + bounties filled | `count / max(1, activeWeeks)` |

### 3.2 Rotation Schedule

The rotation is deterministic based on the week number (same as `getCurrentWeekId()` in `weekly-events.ts`):

```
PRIMARY_ROTATION = ['revenue', 'buildings', 'research', 'mining', 'contracts']
SECONDARY_ROTATION = ['mining', 'contracts', 'revenue', 'buildings', 'research']

function getWeeklyMetrics(weekId: number): { primary: string, secondary: string } {
  return {
    primary: PRIMARY_ROTATION[weekId % 5],
    secondary: SECONDARY_ROTATION[weekId % 5]
  }
}
```

This ensures the secondary metric is always different from the primary (offset by 2 positions).

**Scoring weight**: Primary metric = 70% of final score. Secondary metric = 30%.

### 3.3 Percentage-Based Scoring Formula

All metrics use percentage-based scoring to normalize across net worth levels within a bracket.

**Primary score** (example: revenue):

```
rawScore = weeklyRevenueEarned / netWorthAtWeekStart
```

For a $200M player earning $50M in a week: `50M / 200M = 0.25` (25% growth).
For a $4B player earning $800M in a week: `800M / 4B = 0.20` (20% growth).

The $200M player scores higher despite earning less in absolute terms.

**Building/Research score** (count-based metrics):

```
rawScore = completedThisWeek / (existingCount + 1)
```

The `+1` prevents division by zero and ensures a player with 0 buildings who builds 3 scores `3/1 = 3.0`, while a player with 50 buildings who builds 3 scores `3/51 = 0.059`. This rewards growth relative to size.

**Mining score**:

```
rawScore = totalUnitsMined / (totalResourceInventory + 100)
```

The `+100` constant prevents extreme scores from players with near-zero inventory.

### 3.4 Final Composite Score

```
finalScore = (primaryRawScore * 0.70) + (secondaryRawScore * 0.30)
```

Scores are normalized to a 0-1000 point scale per sub-bracket:

```
normalizedScore = (playerScore / maxScoreInSubBracket) * 1000
```

The top scorer in each sub-bracket always gets 1000 points. This prevents score inflation across weeks.

### 3.5 Activity Multiplier

To reward consistent play throughout the week (async-friendly):

```
daysSynced = count of distinct calendar days where player synced during the week (0-7)
activityMultiplier = 0.5 + (daysSynced / 7) * 0.5
// Range: 0.5 (1 day) to 1.0 (all 7 days)

adjustedScore = normalizedScore * activityMultiplier
```

A player who plays every day gets their full score. A player who plays only 1 day gets 50% -- still competitive, but rewarding consistency.

---

## 4. Scoring & Ranking Algorithm

### 4.1 Ranking Within Sub-Bracket

Players in each sub-bracket are ranked by `adjustedScore` descending.

**Tie-breaking rules** (applied in order):

1. Higher primary metric raw score wins.
2. Higher secondary metric raw score wins.
3. More days synced wins.
4. Earlier first sync timestamp in the week wins (rewards starting early).
5. If still tied, both players receive the same rank and identical rewards.

### 4.2 Handling Inactive Players

| Inactivity Duration | Effect |
|---------------------|--------|
| 0 syncs this week | Score = 0. Still listed at bottom of sub-bracket. Receives participation reward if synced at least once in the previous week. |
| 2 consecutive weeks, 0 syncs | Removed from sub-bracket. Others shift up. Player is flagged as "on hiatus." |
| 4+ consecutive weeks, 0 syncs | Moved to "Returning Players" pool. When they next sync, they are placed fresh into the appropriate bracket/sub-bracket for the next week. |

**Re-entry**: Returning players get the same "Bounce Back" buff as relegated players (+10% metric scoring for 1 week).

### 4.3 Week Boundary Processing

The weekly cycle resets every **Monday at 00:00 UTC**. Processing runs as a server-side cron job (or triggered by the first sync after the boundary).

**Processing steps** (executed in order):

1. Snapshot all GameProfile data for week-end calculations.
2. Calculate raw scores for all active players in each sub-bracket.
3. Normalize scores and apply activity multipliers.
4. Determine rankings and tie-breaks.
5. Distribute rewards (section 6).
6. Process promotions and relegations (section 2).
7. Re-assign sub-brackets for the new week (serpentine shuffle).
8. Fire notification triggers (section 10).
9. Archive the week's results to `LeaderboardWeekResult`.

### 4.4 Cross-Bracket Global Ranking

In addition to bracket-level competition, a **global prestige ranking** is maintained:

```
globalPrestigeScore = bracketNumber * 10000 + subBracketRank * 100 + adjustedScore
```

This allows a global "hall of fame" view where Bracket 5 players always outrank Bracket 4, but within each bracket the weekly rank matters. This is purely cosmetic -- no additional rewards.

---

## 5. Anti-Gaming Measures

### 5.1 Smurf Prevention

**Problem**: A veteran player creates a new account to dominate lower brackets.

**Countermeasures**:

1. **Account linkage**: One game profile per authenticated User (already enforced by `userId @unique` on GameProfile). Players cannot create multiple game profiles.
2. **Velocity detection**: If a Bracket 1 player's weekly revenue exceeds 500% of the bracket median for 2 consecutive weeks, flag the account for review and auto-promote to the bracket matching their trajectory.
   ```
   if (weeklyRevenue > bracketMedianRevenue * 5.0 && consecutiveHighWeeks >= 2) {
     forcePromote(player, estimatedBracket(player.netWorth * 4))
   }
   ```
3. **Prestige marking**: Prestiged players are always visible as such. If a prestige-level-3 player is in Bracket 1, their prestige badge makes it clear they are experienced.

### 5.2 Sandbagging Detection

**Problem**: A player intentionally keeps net worth low to stay in an easier bracket.

**Countermeasures**:

1. **Revenue/net-worth divergence**: If `totalEarned` is growing rapidly but `netWorth` stays flat (player is spending money to keep net worth low), apply an automatic bracket adjustment:
   ```
   suspicionScore = (totalEarnedThisWeek / netWorth)
   if suspicionScore > 2.0 for 3 consecutive weeks:
     // Player is earning 2x their net worth weekly but not growing
     adjustedBracket = determineBracket(totalEarned / 10)
     if adjustedBracket > currentBracket:
       forcePromote(player, adjustedBracket)
   ```
2. **Building count cross-check**: A player with 50+ buildings but $300M net worth is suspicious. If `buildingCount > bracket.expectedMaxBuildings * 2`, flag for bracket adjustment.
3. **"Effective net worth" calculation**: For bracket placement purposes, use:
   ```
   effectiveNetWorth = max(
     currentNetWorth,
     totalEarned * 0.15,  // Historically must have significant assets
     peakNetWorth * 0.60  // Cannot drop more than 40% from peak
   )
   ```
   This prevents deliberate net worth deflation.

### 5.3 Win-Trading Prevention

**Problem**: Two allied players coordinate to boost each other's scores through market trades.

**Countermeasures**:

1. **Revenue from trades excluded**: Weekly revenue metric tracks `service revenue + contract revenue` only. Market trading profit/loss is excluded from the primary revenue metric.
2. **Alliance member separation**: Players in the same alliance are placed in different sub-brackets when possible (best-effort, not guaranteed if the bracket has few players).
3. **Bounty revenue cap**: Revenue from filling bounties is capped at 20% of a player's weekly revenue score to prevent bounty-farming between cooperating accounts.

### 5.4 AFK Farming Prevention

**Problem**: A player sets up a maximally efficient AFK revenue stream and wins weekly by doing nothing.

**Countermeasures**:

1. **Activity multiplier** (section 3.5) already penalizes infrequent play.
2. **Growth-based metrics**: Percentage-based scoring rewards *change*, not absolute values. A player earning the same revenue every week scores lower over time as their denominator (net worth) grows.
3. **Metric diversity**: 5 rotating metrics mean a player optimized for revenue will underperform in building/research/mining weeks.

---

## 6. Reward Structure

### 6.1 Core Design

All rewards are **additive** -- nothing is taken away. Rewards scale with bracket level (higher brackets earn more). All rewards are one-time grants at the end of each weekly period.

### 6.2 Weekly Placement Rewards

#### Cash Rewards (per bracket, per sub-bracket)

| Placement | Startup (B1) | LEO Ops (B2) | Interplanetary (B3) | Deep Space (B4) | Galactic (B5) |
|-----------|-------------|--------------|--------------------|-----------------|--------------|
| 1st | $25M | $150M | $1B | $8B | $50B |
| 2nd | $15M | $100M | $700M | $5B | $35B |
| 3rd | $10M | $75M | $500M | $3B | $25B |
| 4th-5th | $5M | $40M | $250M | $1.5B | $12B |
| 6th-10th | $3M | $20M | $100M | $600M | $5B |
| 11th-20th | $1M | $8M | $40M | $200M | $2B |

**Design rationale**: Rewards are approximately 1-5% of the bracket midpoint net worth. Enough to matter, not enough to destabilize the economy or allow a player to buy their way up a bracket from rewards alone.

#### Speed Boost Rewards

| Placement | Boost Type | Multiplier | Duration |
|-----------|-----------|------------|----------|
| 1st | Construction + Research | 3.0x | 4 hours |
| 2nd | Construction + Research | 2.5x | 3 hours |
| 3rd | Construction OR Research (random) | 2.0x | 3 hours |
| 4th-5th | Construction OR Research (random) | 1.5x | 2 hours |
| 6th-10th | Construction OR Research (random) | 1.5x | 1 hour |
| 11th-20th | None | -- | -- |

Boosts use the existing `SpeedBoost` / `ActiveBoost` system from `speed-boosts.ts`. They are added to the player's `availableBoosts` array and activated at their discretion.

#### Title Rewards

| Placement | Title | Duration |
|-----------|-------|----------|
| 1st | "[Metric] Champion" (e.g., "Revenue Champion") | 1 week (until next winner) |
| 2nd | "[Metric] Contender" | 1 week |
| 3rd | "[Metric] Rising Star" | 1 week |

Titles are displayed next to the player's name on the leaderboard, activity feed, and alliance roster. They persist for one week and are automatically replaced by the next week's title (or removed if the player doesn't place).

**Title conflict resolution**: If a player holds a title from a competitive contract AND a leaderboard title, both are shown. The leaderboard title is displayed first.

### 6.3 Participation Rewards

Every player who syncs at least once during the week receives:

| Bracket | Cash | Resources |
|---------|------|-----------|
| Startup (B1) | $500K | 5 iron, 3 aluminum |
| LEO Ops (B2) | $3M | 10 iron, 5 titanium |
| Interplanetary (B3) | $15M | 5 titanium, 3 rare_earth |
| Deep Space (B4) | $80M | 3 platinum_group, 2 exotic_materials |
| Galactic (B5) | $500M | 2 helium3, 1 antimatter_precursors |

Resources are chosen to be useful at each bracket's typical game stage.

### 6.4 Promotion Bonus

When a player is promoted to a higher bracket:

| Promotion To | Cash Bonus | Special |
|-------------|-----------|---------|
| LEO Ops (B2) | $50M | "LEO Operator" title (permanent until next promotion) |
| Interplanetary (B3) | $500M | "Interplanetary CEO" title |
| Deep Space (B4) | $5B | "Deep Space Commander" title |
| Galactic (B5) | $30B | "Galactic Admiral" title |

Promotion bonuses are one-time per bracket per player (you can only earn the B3 promotion bonus once, even if relegated and re-promoted).

### 6.5 Streak Bonuses

Consecutive weeks of placing in the top 5 earn streak bonuses:

| Streak Length | Bonus |
|---------------|-------|
| 2 weeks | +10% cash reward |
| 3 weeks | +20% cash reward |
| 4 weeks | +30% cash reward + exclusive "On Fire" badge |
| 5+ weeks | +50% cash reward + exclusive "Dominant Force" badge |

Streaks reset on any week where the player finishes outside top 5 or does not participate.

---

## 7. Database Schema

### 7.1 New Prisma Models

```prisma
// Weekly leaderboard season tracking
model LeaderboardSeason {
  id          String   @id @default(cuid())
  weekId      Int      @unique // Unix epoch / (7*24*3600*1000) -- matches getCurrentWeekId()
  startDate   DateTime
  endDate     DateTime
  primaryMetric   String  // 'revenue' | 'buildings' | 'research' | 'mining' | 'contracts'
  secondaryMetric String
  status      String   @default("active") // 'active' | 'processing' | 'completed'
  createdAt   DateTime @default(now())

  entries     LeaderboardEntry[]
  results     LeaderboardWeekResult[]
  subBrackets LeaderboardSubBracket[]

  @@index([weekId])
  @@index([status])
}

// Individual player leaderboard entries for the current/recent week
model LeaderboardEntry {
  id          String   @id @default(cuid())
  seasonId    String
  season      LeaderboardSeason @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  profileId   String
  profile     GameProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  bracket     Int      // 1-5
  subBracketId String?
  subBracket  LeaderboardSubBracket? @relation(fields: [subBracketId], references: [id])

  // Snapshot at week start (for percentage calculations)
  netWorthStart     Float
  totalEarnedStart  Float
  buildingCountStart Int
  researchCountStart Int
  resourceUnitsStart Float  // sum of all resource quantities
  contractsCompletedStart Int @default(0)

  // Accumulated during week
  revenueThisWeek       Float   @default(0)
  buildingsThisWeek     Int     @default(0)
  researchThisWeek      Int     @default(0)
  resourcesMinedThisWeek Float  @default(0)
  contractsThisWeek     Int     @default(0)

  // Scoring
  primaryRawScore    Float   @default(0)
  secondaryRawScore  Float   @default(0)
  normalizedScore    Float   @default(0)
  activityMultiplier Float   @default(0)
  adjustedScore      Float   @default(0)
  daysSynced         Int     @default(0)
  syncDays           String  @default("") // comma-separated day numbers (1-7) for tracking distinct days

  // Result
  rank           Int?     // Final rank in sub-bracket (null until week ends)
  cashReward     Float?
  boostReward    String?  // JSON of boost data, null if none
  titleReward    String?
  participationReward Json? // JSON { cash, resources }

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([seasonId, profileId])
  @@index([seasonId, bracket])
  @@index([seasonId, subBracketId, adjustedScore])
  @@index([profileId])
}

// Sub-bracket groupings within each bracket
model LeaderboardSubBracket {
  id          String   @id @default(cuid())
  seasonId    String
  season      LeaderboardSeason @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  bracket     Int      // 1-5
  groupIndex  Int      // 0, 1, 2, ... within the bracket

  entries     LeaderboardEntry[]

  @@unique([seasonId, bracket, groupIndex])
  @@index([seasonId, bracket])
}

// Archived weekly results (historical record)
model LeaderboardWeekResult {
  id          String   @id @default(cuid())
  seasonId    String
  season      LeaderboardSeason @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  profileId   String
  profile     GameProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  bracket     Int
  rank        Int
  adjustedScore Float
  cashReward  Float
  titleReward String?
  primaryMetric    String
  secondaryMetric  String
  primaryRawScore  Float
  secondaryRawScore Float

  createdAt   DateTime @default(now())

  @@unique([seasonId, profileId])
  @@index([profileId, createdAt])
  @@index([seasonId, bracket, rank])
}

// Player bracket state (persistent across weeks)
model PlayerBracketState {
  id          String      @id @default(cuid())
  profileId   String      @unique
  profile     GameProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  currentBracket   Int      @default(1) // 1-5
  effectiveNetWorth Float   @default(0) // max(netWorth, totalEarned*0.15, peakNetWorth*0.6)
  peakNetWorth     Float    @default(0)

  // Promotion tracking
  promotionPoints  Int      @default(0)  // Accumulated from top-3 finishes
  promotionWindowStart DateTime? // When the 4-week promotion window started
  promotedBrackets String   @default("") // Comma-separated brackets already promoted to (for one-time bonus)

  // Streak tracking
  currentStreak    Int      @default(0)  // Consecutive weeks in top 5
  bestStreak       Int      @default(0)

  // Inactivity tracking
  consecutiveInactiveWeeks Int @default(0)
  isOnHiatus       Boolean  @default(false)
  lastActiveWeekId Int?

  // Relegation/promotion buffs
  bounceBackActive Boolean  @default(false) // +10% scoring for 1 week after relegation/return

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([currentBracket])
  @@index([isOnHiatus])
}
```

### 7.2 Modifications to Existing Models

Add to `GameProfile`:

```prisma
model GameProfile {
  // ... existing fields ...

  // Leaderboard relations
  leaderboardEntries    LeaderboardEntry[]
  leaderboardResults    LeaderboardWeekResult[]
  bracketState          PlayerBracketState?

  // Weekly tracking fields (updated on each sync)
  weeklyRevenueAccumulator    Float   @default(0)  // Reset each week
  weeklyBuildingsAccumulator  Int     @default(0)
  weeklyResearchAccumulator   Int     @default(0)
  weeklyMiningAccumulator     Float   @default(0)
  weeklyContractsAccumulator  Int     @default(0)
  currentTrackingWeekId       Int?    // Which weekId these accumulators belong to

  // Title display
  leaderboardTitle    String?  // Current weekly title, null if none

  @@index([netWorth]) // already exists
}
```

### 7.3 Index Strategy

The following composite indexes are critical for performance:

- `LeaderboardEntry(seasonId, bracket)` -- fetching all entries for a bracket in a week.
- `LeaderboardEntry(seasonId, subBracketId, adjustedScore)` -- ranking within sub-bracket.
- `LeaderboardWeekResult(profileId, createdAt)` -- player's historical results.
- `PlayerBracketState(currentBracket)` -- counting players per bracket.

---

## 8. API Endpoints

### 8.1 Endpoint Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/space-tycoon/leaderboard/bracketed` | Optional | Get current week's bracket leaderboard |
| GET | `/api/space-tycoon/leaderboard/my-bracket` | Required | Get player's sub-bracket with detailed scores |
| GET | `/api/space-tycoon/leaderboard/history` | Required | Get player's past week results |
| GET | `/api/space-tycoon/leaderboard/week-info` | None | Get current week's metrics, time remaining |
| POST | `/api/space-tycoon/leaderboard/process-week` | Admin/Cron | Trigger end-of-week processing |

### 8.2 Endpoint Specifications

#### GET `/api/space-tycoon/leaderboard/bracketed`

**Query params**:
- `bracket` (optional, 1-5): Filter to specific bracket. Default: all.
- `limit` (optional, max 100): Players per bracket. Default: 20.

**Response**:
```json
{
  "weekId": 2941,
  "primaryMetric": "revenue",
  "secondaryMetric": "mining",
  "timeRemainingMs": 345600000,
  "weekStartDate": "2026-03-23T00:00:00Z",
  "weekEndDate": "2026-03-30T00:00:00Z",
  "brackets": [
    {
      "bracket": 1,
      "name": "Startup",
      "playerCount": 87,
      "subBracketCount": 5,
      "topPlayers": [
        {
          "rank": 1,
          "companyName": "Nova Dynamics",
          "allianceTag": "[SOL]",
          "adjustedScore": 1000,
          "primaryScore": 0.45,
          "secondaryScore": 0.30,
          "daysSynced": 7,
          "netWorth": 350000000,
          "isYou": false,
          "prestigeLevel": 0,
          "title": "Revenue Champion",
          "streak": 3
        }
      ]
    }
  ]
}
```

#### GET `/api/space-tycoon/leaderboard/my-bracket`

**Auth**: Required (uses session to find player's profile).

**Response**:
```json
{
  "weekId": 2941,
  "bracket": 2,
  "bracketName": "LEO Ops",
  "subBracketId": "clxyz...",
  "subBracketSize": 20,
  "myRank": 5,
  "myScore": 712,
  "primaryMetric": "revenue",
  "secondaryMetric": "mining",
  "myPrimaryRaw": 0.18,
  "mySecondaryRaw": 0.22,
  "daysSynced": 4,
  "activityMultiplier": 0.786,
  "streak": 2,
  "promotionPoints": 1,
  "timeRemainingMs": 345600000,
  "projectedRewards": {
    "cash": 40000000,
    "boost": null,
    "title": null
  },
  "competitors": [
    {
      "rank": 1,
      "companyName": "Stellar Works",
      "adjustedScore": 1000,
      "daysSynced": 7,
      "isYou": false,
      "allianceTag": "[MARS]",
      "title": "Revenue Champion",
      "netWorth": 2800000000
    },
    {
      "rank": 5,
      "companyName": "My Company",
      "adjustedScore": 712,
      "daysSynced": 4,
      "isYou": true,
      "allianceTag": null,
      "title": null,
      "netWorth": 1500000000
    }
  ]
}
```

#### GET `/api/space-tycoon/leaderboard/history`

**Auth**: Required.

**Query params**:
- `weeks` (optional, max 12): Number of past weeks. Default: 4.

**Response**:
```json
{
  "history": [
    {
      "weekId": 2940,
      "bracket": 2,
      "rank": 3,
      "adjustedScore": 834,
      "primaryMetric": "buildings",
      "secondaryMetric": "research",
      "cashReward": 75000000,
      "titleReward": "Rising Star",
      "promoted": false,
      "relegated": false
    }
  ],
  "stats": {
    "totalWeeksPlayed": 12,
    "bestRank": 1,
    "bestStreak": 4,
    "totalCashEarned": 890000000,
    "currentBracket": 2,
    "highestBracket": 2
  }
}
```

#### GET `/api/space-tycoon/leaderboard/week-info`

**Auth**: None (public info).

**Response**:
```json
{
  "weekId": 2941,
  "primaryMetric": {
    "id": "revenue",
    "name": "Revenue Race",
    "description": "Earn the highest revenue relative to your net worth.",
    "icon": "chart-trending-up",
    "weight": 0.70
  },
  "secondaryMetric": {
    "id": "mining",
    "name": "Mining Output",
    "description": "Mine the most resources relative to your current inventory.",
    "icon": "pickaxe",
    "weight": 0.30
  },
  "timeRemainingMs": 345600000,
  "nextWeekMetrics": {
    "primary": "buildings",
    "secondary": "contracts"
  },
  "bracketDistribution": {
    "1": 87,
    "2": 45,
    "3": 23,
    "4": 12,
    "5": 5
  }
}
```

#### POST `/api/space-tycoon/leaderboard/process-week`

**Auth**: Admin or cron secret key.

This endpoint triggers the end-of-week processing pipeline described in section 4.3. It should be called by a scheduled task (Railway cron, Vercel cron, or similar) every Monday at 00:05 UTC (5-minute buffer for any late syncs).

**Request body**:
```json
{
  "secret": "LEADERBOARD_CRON_SECRET"
}
```

**Response**:
```json
{
  "success": true,
  "weekId": 2940,
  "processed": {
    "totalPlayers": 172,
    "byBracket": { "1": 87, "2": 45, "3": 23, "4": 12, "5": 5 },
    "promotions": 8,
    "relegations": 2,
    "totalCashDistributed": 12500000000,
    "titlesAwarded": 15
  }
}
```

### 8.3 Sync Endpoint Modifications

The existing `POST /api/space-tycoon/sync` endpoint needs to be modified to:

1. **Update weekly accumulators**: On each sync, calculate deltas from last sync and add to the weekly accumulators on GameProfile.
2. **Track sync days**: Record the day-of-week of this sync in the LeaderboardEntry's `syncDays` field.
3. **Return bracket info**: Include the player's current bracket, rank, and leaderboard metadata in the sync response.

Addition to sync response:

```json
{
  "leaderboard": {
    "bracket": 2,
    "bracketName": "LEO Ops",
    "currentRank": 5,
    "subBracketSize": 20,
    "primaryMetric": "revenue",
    "primaryScore": 0.18,
    "adjustedScore": 712,
    "timeRemainingMs": 345600000,
    "streak": 2
  }
}
```

---

## 9. UI Components

### 9.1 Component Architecture

The leaderboard UI replaces the current `LeaderboardPanel.tsx` with a multi-view component system:

```
LeaderboardPanel (container)
  |-- BracketOverviewBar (shows all 5 brackets with player counts, player's bracket highlighted)
  |-- WeekInfoHeader (current metrics, time remaining, countdown)
  |-- SubBracketTable (the main competition view -- your 20 opponents)
  |-- PlayerStatsCard (your score breakdown, projected rewards, streak)
  |-- BracketHistoryChart (sparkline of past 12 weeks' ranks)
  |-- RewardPreview (what you will earn at current rank)
  |-- PromotionTracker (progress toward next bracket)
```

### 9.2 BracketOverviewBar

A horizontal bar showing all 5 brackets as colored segments. The player's bracket is highlighted and expanded. Each segment shows:

- Bracket name and icon
- Player count
- A tiny indicator if this is the player's bracket

**Visual**: Similar to a progress bar or tier indicator in games like Apex Legends or Valorant ranked modes. Uses the bracket colors defined in section 2.1.

### 9.3 WeekInfoHeader

Displays:

- "This Week's Challenge: Revenue Race + Mining Output"
- Countdown timer: "3d 14h remaining"
- Primary and secondary metric icons with weights (70%/30%)
- "Next week: Construction + Contracts" (preview)

### 9.4 SubBracketTable

The core competitive view. A table showing all 20 players in the player's sub-bracket.

| Column | Content |
|--------|---------|
| Rank | #1-#20 with medal icons for top 3 |
| Company | Name + alliance tag + prestige badge + title |
| Score | Adjusted score (0-1000) with bar visualization |
| Primary | Raw primary metric value (e.g., "$45M earned") |
| Secondary | Raw secondary metric value |
| Activity | Dots for each day synced (7 max) |
| Status | Online indicator (green dot if synced in last 5 min) |

The player's own row is highlighted with a cyan border (matching existing game UI). Rows above the player show a subtle "beat them!" indicator. Rows below show "ahead by X points."

### 9.5 PlayerStatsCard

A card showing the player's detailed breakdown:

```
Your Score: 712 / 1000
  Primary (Revenue):   Raw 0.18 * 0.70 = 126 pts
  Secondary (Mining):  Raw 0.22 * 0.30 =  66 pts
  Activity:            5/7 days  (x0.857)
  Bounce Back:         No

Projected Reward:
  Cash: $40M  |  Boost: 1.5x Build (2hr)  |  Title: --

Streak: 2 weeks (top 5 next week for +20% bonus!)
```

### 9.6 BracketHistoryChart

A small sparkline/bar chart showing the player's rank over the past 12 weeks. Color-coded by bracket (if they were promoted, the chart shows the transition). Each bar is clickable to show that week's full results.

### 9.7 RewardPreview

Shows what the player will earn at their current rank, with "what if" projections:

- "At #5, you earn: $40M + 1.5x Build Boost (2hr)"
- "Move up to #3 for: $75M + 2.0x Build Boost (3hr) + 'Rising Star' title"

### 9.8 PromotionTracker

For players close to promotion:

- Progress bar showing net worth vs. next bracket threshold
- Merit promotion progress: "1/3 promotion points (top 3 finishes in 4-week window)"
- Estimated weeks to promotion based on current growth rate

### 9.9 View Modes

The leaderboard panel supports three view tabs:

1. **My Bracket** (default): SubBracketTable with your competitors.
2. **Global**: All brackets overview with top 5 per bracket (current `leaderboard` endpoint view, enhanced).
3. **History**: Your past results, stats, and streak history.

---

## 10. Notification Triggers

### 10.1 Notification Types

All notifications use the existing `Notification` model and are created via `prisma.notification.create()`. They set `type: 'game_leaderboard'` and include a `linkUrl` pointing to the leaderboard view.

### 10.2 Trigger Definitions

| Trigger | When | Title | Message | Priority |
|---------|------|-------|---------|----------|
| `rank_improved` | Player's rank improves by 2+ positions in a single sync | "Climbing the Ranks!" | "You moved up to #{rank} in {bracketName}!" | Normal |
| `top_3` | Player enters top 3 for the first time this week | "Podium Position!" | "You're now #{rank} in your {bracketName} bracket! Keep it up to earn the title." | High |
| `top_1` | Player reaches #1 in their sub-bracket | "You're #1!" | "You're leading your {bracketName} bracket in {metricName}!" | High |
| `overtaken` | Another player passes the user (only if user was top 5) | "Competition Heating Up!" | "{companyName} just passed you. You're now #{rank}." | Normal |
| `day_before_end` | 24 hours before week ends, player is in top 10 | "Final Push!" | "24 hours left! You're #{rank} in {bracketName}. One more sync could make the difference." | Normal |
| `week_results` | Week processing completes | "Weekly Results Are In!" | "You finished #{rank} in {bracketName}! Rewards: {cashReward}" | High |
| `promoted` | Player is promoted to a higher bracket | "Bracket Promotion!" | "You've been promoted to {newBracketName}! Promotion bonus: {bonus}" | High |
| `relegated` | Player is relegated to a lower bracket | "Bracket Change" | "You've moved to {newBracketName}. Bounce Back buff active for 1 week!" | Normal |
| `streak_milestone` | Player hits a 3 or 5 week streak | "Streak Bonus!" | "{streak}-week streak! +{bonusPct}% cash rewards this week." | Normal |
| `new_week_started` | New weekly period begins | "New Week: {metricName}!" | "This week's challenge: {primaryMetric} + {secondaryMetric}. Compete in your {bracketName} bracket!" | Normal |
| `inactivity_warning` | 1 week of inactivity | "Miss You in the Rankings!" | "You haven't synced in a week. Sync now to stay in the competition!" | Low |

### 10.3 Notification Throttling

To avoid notification spam:

- `rank_improved` fires at most once per 6 hours.
- `overtaken` fires at most once per 12 hours.
- `day_before_end` fires exactly once per week.
- `new_week_started` fires exactly once per week.
- All notifications respect the user's `NotificationPreference` settings.

### 10.4 In-Game Toast Notifications

In addition to persistent notifications, certain events trigger real-time toast notifications using the existing `toast.ts` system:

- Rank improvement: Success toast with rank change.
- Top 3 entry: Celebration toast with confetti animation.
- Week results: Summary toast on first sync after week-end processing.

---

## 11. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal**: Database schema, bracket assignment, basic API.

**Tasks**:
1. Add Prisma models: `LeaderboardSeason`, `LeaderboardEntry`, `LeaderboardSubBracket`, `LeaderboardWeekResult`, `PlayerBracketState`.
2. Add new fields to `GameProfile` (weekly accumulators, leaderboardTitle).
3. Run `prisma db push` and verify schema.
4. Implement bracket assignment logic: `determineBracket(netWorth)` and `calculateEffectiveNetWorth()`.
5. Implement sub-bracket serpentine assignment algorithm.
6. Implement `GET /api/space-tycoon/leaderboard/week-info`.
7. Write initialization script to create `PlayerBracketState` for all existing `GameProfile` records.

**Deliverables**: Players are assigned to brackets. Week info endpoint is live.

### Phase 2: Scoring Engine (Week 2-3)

**Goal**: Weekly metric tracking and scoring.

**Tasks**:
1. Modify `POST /api/space-tycoon/sync` to update weekly accumulators on each sync.
2. Implement percentage-based score calculation for all 5 metrics.
3. Implement activity multiplier tracking (syncDays).
4. Implement `POST /api/space-tycoon/leaderboard/process-week` with the full pipeline:
   - Score calculation
   - Normalization
   - Ranking with tie-breaks
5. Implement metric rotation algorithm.
6. Write unit tests for scoring edge cases (zero division, inactive players, ties).

**Deliverables**: Scores are calculated and stored weekly. Week processing runs successfully in staging.

### Phase 3: Rewards & Promotion (Week 3-4)

**Goal**: End-of-week reward distribution, promotion/relegation.

**Tasks**:
1. Implement reward calculation and distribution (cash, boosts, titles).
2. Implement promotion logic (automatic + merit-based).
3. Implement relegation logic with 80% buffer.
4. Implement streak tracking and bonus calculation.
5. Implement promotion/relegation bonus application.
6. Implement `GET /api/space-tycoon/leaderboard/history`.
7. Set up cron job for Monday 00:05 UTC week processing.

**Deliverables**: Full weekly cycle running. Rewards distributed. Promotions/relegations happening.

### Phase 4: Anti-Gaming (Week 4)

**Goal**: Smurf detection, sandbagging prevention.

**Tasks**:
1. Implement effective net worth calculation (max of current, 15% total earned, 60% peak).
2. Implement velocity detection for smurfs.
3. Implement revenue/net-worth divergence detection for sandbagging.
4. Implement alliance member sub-bracket separation.
5. Exclude market trading from revenue metric.
6. Cap bounty revenue contribution.

**Deliverables**: Anti-gaming measures active. Manual review queue for flagged accounts.

### Phase 5: UI (Week 4-6)

**Goal**: Full leaderboard UI in the game.

**Tasks**:
1. Replace `LeaderboardPanel.tsx` with new multi-view component.
2. Build `BracketOverviewBar` component.
3. Build `WeekInfoHeader` component with countdown.
4. Build `SubBracketTable` component.
5. Build `PlayerStatsCard` component.
6. Build `BracketHistoryChart` component (sparkline).
7. Build `RewardPreview` component.
8. Build `PromotionTracker` component.
9. Implement three view tabs (My Bracket, Global, History).
10. Mobile-responsive layout.

**Deliverables**: Full leaderboard UI live in the Space Tycoon game.

### Phase 6: Notifications (Week 6-7)

**Goal**: Push notifications and in-game toasts.

**Tasks**:
1. Create notification triggers in the sync endpoint (rank changes, top 3).
2. Create notification triggers in the week processing pipeline (results, promotions).
3. Implement notification throttling logic.
4. Add `game_leaderboard` to notification type handling.
5. Implement in-game toast notifications for real-time events.
6. Add "New Week" notification on weekly boundary.
7. Add leaderboard-related settings to `NotificationPreference`.

**Deliverables**: Players receive timely, non-spammy notifications about their competitive standing.

### Phase 7: Polish & Monitoring (Week 7-8)

**Goal**: Performance, edge cases, analytics.

**Tasks**:
1. Load test week processing with 1000+ simulated players.
2. Add monitoring/logging for week processing duration and errors.
3. Add admin dashboard view for bracket health (player distribution, reward totals).
4. Handle edge cases: player deletes account mid-week, prestige mid-week, alliance changes mid-week.
5. Add analytics events for leaderboard engagement (views, tab switches, notification clicks).
6. Write integration tests for full weekly cycle.
7. Document API endpoints in README or API docs.

**Deliverables**: Production-ready system with monitoring and graceful edge-case handling.

---

## Appendix A: Quick Reference Formulas

### Bracket Determination

```
function determineBracket(effectiveNetWorth: number): number {
  if (effectiveNetWorth >= 500_000_000_000) return 5; // $500B+
  if (effectiveNetWorth >=  50_000_000_000) return 4; // $50B-$500B
  if (effectiveNetWorth >=   5_000_000_000) return 3; // $5B-$50B
  if (effectiveNetWorth >=     500_000_000) return 2; // $500M-$5B
  return 1;                                           // <$500M
}
```

### Effective Net Worth (Anti-Sandbagging)

```
function calculateEffectiveNetWorth(
  currentNetWorth: number,
  totalEarned: number,
  peakNetWorth: number
): number {
  return Math.max(
    currentNetWorth,
    totalEarned * 0.15,
    peakNetWorth * 0.60
  );
}
```

### Relegation Threshold

```
BRACKET_FLOORS = [0, 0, 500_000_000, 5_000_000_000, 50_000_000_000, 500_000_000_000]

function shouldRelegate(bracket: number, effectiveNetWorth: number): boolean {
  if (bracket <= 1) return false; // Cannot relegate from Startup
  return effectiveNetWorth < BRACKET_FLOORS[bracket] * 0.80;
}
```

### Weekly Score

```
function calculateWeeklyScore(
  primaryRaw: number,
  secondaryRaw: number,
  maxPrimaryInGroup: number,
  maxSecondaryInGroup: number,
  daysSynced: number,
  hasBounceBack: boolean
): number {
  const normalizedPrimary = maxPrimaryInGroup > 0
    ? (primaryRaw / maxPrimaryInGroup) * 1000
    : 0;
  const normalizedSecondary = maxSecondaryInGroup > 0
    ? (secondaryRaw / maxSecondaryInGroup) * 1000
    : 0;

  const compositeScore = normalizedPrimary * 0.70 + normalizedSecondary * 0.30;
  const activityMultiplier = 0.5 + (daysSynced / 7) * 0.5;
  const bounceBackMultiplier = hasBounceBack ? 1.10 : 1.00;

  return Math.round(compositeScore * activityMultiplier * bounceBackMultiplier);
}
```

### Reward Cash Amount

```
BRACKET_REWARDS = {
  1: [25e6,  15e6,  10e6,  5e6,    3e6,   1e6],
  2: [150e6, 100e6, 75e6,  40e6,   20e6,  8e6],
  3: [1e9,   700e6, 500e6, 250e6,  100e6, 40e6],
  4: [8e9,   5e9,   3e9,   1.5e9,  600e6, 200e6],
  5: [50e9,  35e9,  25e9,  12e9,   5e9,   2e9]
}

function getCashReward(bracket: number, rank: number, streak: number): number {
  const tier = rank <= 3 ? rank - 1
    : rank <= 5 ? 3
    : rank <= 10 ? 4
    : 5;
  const base = BRACKET_REWARDS[bracket][tier];
  const streakBonus = streak >= 5 ? 0.50
    : streak >= 4 ? 0.30
    : streak >= 3 ? 0.20
    : streak >= 2 ? 0.10
    : 0;
  return Math.round(base * (1 + streakBonus));
}
```

---

## Appendix B: Metric Rotation Calendar (First 10 Weeks)

| Week | Primary | Secondary |
|------|---------|-----------|
| 0 | Revenue | Mining |
| 1 | Buildings | Contracts |
| 2 | Research | Revenue |
| 3 | Mining | Buildings |
| 4 | Contracts | Research |
| 5 | Revenue | Mining |
| 6 | Buildings | Contracts |
| 7 | Research | Revenue |
| 8 | Mining | Buildings |
| 9 | Contracts | Research |

The cycle repeats every 5 weeks. Primary and secondary are always different (offset by 2).

---

## Appendix C: Example Week Walkthrough

**Setup**: Week 2941. Primary = Revenue. Secondary = Mining.

**Player "Nova Dynamics"**: LEO Ops bracket (B2), sub-bracket #3 (20 players).

- Net worth at week start: $1.5B
- Revenue earned this week: $280M
- Resources mined: 450 units (started with 800)
- Days synced: 5 of 7

**Score calculation**:

1. Primary raw = $280M / $1.5B = 0.1867
2. Secondary raw = 450 / (800 + 100) = 0.5000
3. Max primary in sub-bracket: 0.25 (from #1 player)
4. Max secondary in sub-bracket: 0.60 (from #1 player)
5. Normalized primary: (0.1867 / 0.25) * 1000 = 747
6. Normalized secondary: (0.5000 / 0.60) * 1000 = 833
7. Composite: 747 * 0.70 + 833 * 0.30 = 523 + 250 = 773
8. Activity multiplier: 0.5 + (5/7) * 0.5 = 0.857
9. Adjusted score: 773 * 0.857 = 662

**Result**: Rank #6 in sub-bracket.

**Rewards**: $20M cash (LEO Ops 6th-10th tier) + 1.5x Build Speed boost (1 hour). Participation reward: $3M + 10 iron, 5 titanium.

---

## Appendix D: Compatibility Notes

### Existing System Integration Points

| Existing System | Integration |
|----------------|-------------|
| `sync/route.ts` | Modified to track weekly accumulators and return bracket info |
| `leaderboard/route.ts` | Kept as-is for backward compatibility; new endpoints added alongside |
| `speed-boosts.ts` | Leaderboard boost rewards use existing `createBoost()` API |
| `weekly-events.ts` | Leaderboard uses same `getCurrentWeekId()` for week boundaries |
| `competitive-contracts.ts` | Contract completions count toward the "contracts" leaderboard metric |
| `prestige.ts` | Prestige level displayed on leaderboard; bracket based on current net worth |
| `catchup-mechanics.ts` | Pioneer bonus and newcomer shield work independently of brackets |
| `GameProfile` model | Extended with new fields; no existing fields removed |
| `Notification` model | New `game_leaderboard` notification type added |
| `LeaderboardPanel.tsx` | Replaced with new multi-view component (Phase 5) |
| `achievements.ts` | New achievements can be added for bracket milestones (e.g., "Reach Galactic bracket") |
| `npc-companies.ts` | NPCs fill out sub-brackets with fewer than 5 players |
| `subscriber-perks.ts` | Subscribers get no competitive advantage in brackets (per fair F2P design) |
