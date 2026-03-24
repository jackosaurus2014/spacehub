# Prestige Speed Runs -- Implementation Design Document

**Version:** 1.0
**Date:** 2026-03-23
**Status:** Design (Research Only)
**Depends On:** Prestige System (`src/lib/game/prestige.ts`), Weekly Events (`weekly-events.ts`), Leaderboard (`/api/space-tycoon/leaderboard`)

---

## 1. Overview

Prestige Speed Runs are weekly competitive challenges where players race to reach specific milestones as fast as possible after prestiging. Unlike existing weekly challenges (which measure cumulative output during a week), speed runs measure *elapsed real-time from prestige to milestone completion*, creating a distinct competitive dimension.

**Core concept:** "Who can reach [milestone] fastest after prestiging?"

**Design pillars:**
- **Never take things away** -- participation always rewards, no penalties for slow times
- **Prestige bracket fairness** -- P1 players compete with P1-P2 players, not P10 players
- **Async-first** -- players prestige and run on their own schedule within the weekly window
- **Multiple categories** -- wealth, building, exploration, research, and composite milestones
- **Server-validated** -- all times verified server-side against progression snapshots

---

## 2. Speed Run Categories and Milestones

### 2.1 Milestone Definitions (15 trackable milestones)

Each milestone has an ID, condition, expected completion range, and difficulty tier.

| # | ID | Name | Condition | Tier | Expected Range (P0) | Expected Range (P5) |
|---|-----|------|-----------|------|---------------------|---------------------|
| 1 | `sr_first_building` | First Foundation | Complete 1 building | Starter | 5-10 min | 3-5 min |
| 2 | `sr_first_service` | Revenue Online | Activate 1 service | Starter | 8-15 min | 4-8 min |
| 3 | `sr_500m_cash` | Half Billionaire | Reach $500M cash | Easy | 20-45 min | 10-20 min |
| 4 | `sr_1b_cash` | Billionaire | Reach $1B cash | Easy | 1-3 hr | 30-90 min |
| 5 | `sr_5_buildings` | Industrialist | Complete 5 buildings | Medium | 1-2 hr | 30-60 min |
| 6 | `sr_10_buildings` | Developer | Complete 10 buildings | Medium | 3-8 hr | 1.5-4 hr |
| 7 | `sr_5_research` | Researcher | Complete 5 researches | Medium | 2-5 hr | 1-2.5 hr |
| 8 | `sr_geo_unlock` | GEO Access | Unlock Geostationary Orbit | Medium | 30-60 min | 15-30 min |
| 9 | `sr_lunar_access` | Lunar Pioneer | Unlock Lunar Surface | Hard | 4-12 hr | 2-6 hr |
| 10 | `sr_10_services` | Service Empire | Run 10 active services | Hard | 6-18 hr | 3-9 hr |
| 11 | `sr_10b_cash` | Ten Billionaire | Reach $10B cash | Hard | 12-36 hr | 6-18 hr |
| 12 | `sr_mars_access` | Mars Pioneer | Unlock Mars Orbit | Expert | 24-72 hr | 12-36 hr |
| 13 | `sr_asteroid_mine` | Asteroid Miner | Complete asteroid belt mining building | Expert | 36-96 hr | 18-48 hr |
| 14 | `sr_100b_cash` | Hundred Billionaire | Reach $100B cash | Master | 72-168 hr | 36-84 hr |
| 15 | `sr_jupiter_access` | Jovian Pioneer | Unlock Jupiter System | Master | 96-168+ hr | 48-84+ hr |

### 2.2 Composite Milestones (used for weekly challenges only)

These combine multiple conditions for variety in weekly challenge rotation:

| ID | Name | Condition |
|----|------|-----------|
| `sr_combo_early` | Quick Start | First building + First service + $500M |
| `sr_combo_expansion` | Expansion Rush | 5 buildings + GEO unlock + 3 research |
| `sr_combo_midgame` | Midgame Mastery | 10 buildings + Lunar access + $10B |
| `sr_combo_lategame` | Endgame Sprint | Mars access + 10 services + $100B |

### 2.3 Milestone Check Functions

Each milestone maps directly to existing `GameState` fields:

```
sr_first_building   -> state.buildings.filter(b => b.isComplete).length >= 1
sr_first_service    -> state.activeServices.length >= 1
sr_500m_cash        -> state.money >= 500_000_000
sr_1b_cash          -> state.money >= 1_000_000_000
sr_5_buildings      -> state.buildings.filter(b => b.isComplete).length >= 5
sr_10_buildings     -> state.buildings.filter(b => b.isComplete).length >= 10
sr_5_research       -> state.completedResearch.length >= 5
sr_geo_unlock       -> state.unlockedLocations.includes('geo')
sr_lunar_access     -> state.unlockedLocations.includes('lunar_surface')
sr_10_services      -> state.activeServices.length >= 10
sr_10b_cash         -> state.money >= 10_000_000_000
sr_mars_access      -> state.unlockedLocations.includes('mars_orbit')
sr_asteroid_mine    -> state.buildings.some(b => b.isComplete && b.definitionId === 'mining_asteroid')
sr_100b_cash        -> state.money >= 100_000_000_000
sr_jupiter_access   -> state.unlockedLocations.includes('jupiter_system')
```

---

## 3. Timer Mechanics

### 3.1 Timer Start

The speed run timer starts at the exact moment a player completes a prestige reset. This is recorded server-side via the sync endpoint.

```
Timer start = GameProfile.lastPrestigeAt (set during prestige action)
```

**Key rules:**
- Timer starts on prestige completion, not on "opt-in" to a speed run
- Every prestige automatically starts a speed run timer
- Players do NOT need to select a specific milestone in advance -- all milestones are tracked simultaneously
- The timer is a Unix millisecond timestamp stored server-side

### 3.2 Timer Tracking

Elapsed time is computed as:

```
elapsed_ms = milestone_achieved_at_ms - last_prestige_at_ms
```

Both timestamps come from the server. The client displays a running clock based on `Date.now() - lastPrestigeAt`, but the official time is server-validated.

### 3.3 Timer Resolution

- Minimum recordable time: 1 second (times below 1s are rejected as suspicious)
- Display precision: seconds for times under 1 hour, minutes for times under 24 hours, hours+minutes for longer runs
- Format examples: "4m 32s", "2h 15m", "1d 6h 42m"

### 3.4 Pause Rules

**There are no pauses.** Speed runs use real wall-clock time, consistent with how construction and research timers already work in the game engine (`realBuildSeconds`, `realResearchSeconds`). The game's existing architecture is wall-clock-based, so this is a natural fit.

Rationale:
- The game is async and idle -- players don't need to be actively playing for time to pass
- Buildings complete in real time, research completes in real time, revenue accumulates
- Pausing would create an exploit surface (pause right before milestone, optimize, unpause)
- Consistent with existing timed events (`timed-events.ts`) which use `durationHours` of real time

### 3.5 First Prestige Exception

Players who have never prestiged (level 0) cannot participate in speed runs. Their first playthrough is a learning experience. Speed runs begin at Prestige 1+.

---

## 4. Weekly Challenge Rotation

### 4.1 Challenge Selection Algorithm

Each week features one primary milestone and one composite milestone as the speed run targets. The selection is deterministic based on the week number (like the existing `getCurrentWeekId()` function).

```
weekId = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))

// Primary milestone (cycles through the 15 milestones)
primaryIndex = weekId % 15
primaryMilestone = SPEED_RUN_MILESTONES[primaryIndex]

// Composite milestone (cycles through 4 composites, offset by 3 weeks)
compositeIndex = (weekId + 3) % 4
compositeMilestone = COMPOSITE_MILESTONES[compositeIndex]
```

### 4.2 Weekly Calendar

A 15-week rotation ensures each milestone is featured once, then cycles:

| Week | Primary Challenge | Composite Challenge |
|------|------------------|---------------------|
| 1 | First Foundation | Endgame Sprint |
| 2 | Revenue Online | Quick Start |
| 3 | Half Billionaire | Expansion Rush |
| 4 | Billionaire | Midgame Mastery |
| 5 | Industrialist | Endgame Sprint |
| 6 | Developer | Quick Start |
| 7 | Researcher | Expansion Rush |
| 8 | GEO Access | Midgame Mastery |
| 9 | Lunar Pioneer | Endgame Sprint |
| 10 | Service Empire | Quick Start |
| 11 | Ten Billionaire | Expansion Rush |
| 12 | Mars Pioneer | Midgame Mastery |
| 13 | Asteroid Miner | Endgame Sprint |
| 14 | Hundred Billionaire | Quick Start |
| 15 | Jovian Pioneer | Expansion Rush |

### 4.3 Challenge Timing

- **Week boundary:** Same as existing `getCurrentWeekId()` -- epoch-based 7-day periods
- **Challenge preview:** The next week's challenges are visible 24 hours before they start (shown in a "Coming Next" panel)
- **Grace period:** Players who prestige in the last 2 hours of a week and complete the milestone in the first 2 hours of the next week have their time counted toward *either* week (whichever is more favorable)
- **Perpetual tracking:** Even outside the featured weekly challenge, ALL milestone times are recorded and visible in personal records

---

## 5. Leaderboard System

### 5.1 Leaderboard Types

**Per-Challenge Weekly Leaderboard** (main competitive surface):
- Shows the fastest times for THIS week's featured challenge
- Grouped by prestige bracket (see Section 8)
- Top 100 per bracket
- Resets every week

**All-Time Records**:
- Fastest time EVER for each milestone, per bracket
- Permanent, never resets
- Shows record holder, time, and date achieved

**Personal Best History**:
- Every speed run attempt a player has made
- Shows improvement over time
- Comparison to bracket median and bracket record

**Alliance Leaderboard**:
- Best time from any member counts as the alliance's entry
- Encourages alliance members to coordinate prestige timing

### 5.2 Leaderboard Entry Schema

Each leaderboard entry contains:

```
{
  profileId: string,
  companyName: string,
  allianceTag: string | null,
  milestoneId: string,
  prestigeLevel: number,        // Level when the run started
  bracketId: string,            // e.g. "P1-P3", "P4-P6", "P7-P10", "P11+"
  elapsedMs: number,            // Official server-validated time
  prestigedAt: DateTime,        // When the prestige happened
  completedAt: DateTime,        // When milestone was achieved
  weekId: number,               // Which weekly period this belongs to
  isWeeklyChallenge: boolean,   // Was this the featured challenge that week?
}
```

### 5.3 Tie-Breaking

If two players have the same elapsed time (rounded to the nearest second):
1. Earlier completion timestamp wins (first to finish)
2. If still tied, higher prestige level wins (harder handicap)
3. If still tied, both share the rank

### 5.4 Leaderboard Display Fields

```
Rank | Company Name [Alliance] | Time | Prestige Level | Date | Improvement
#1     Stellar Corp [SOL]        4m 32s   P3              Mar 20   -12s from PB
#2     Nova Industries            4m 55s   P2              Mar 21   NEW RECORD
#3     Orbit LLC [MARS]           5m 01s   P4              Mar 19   -3s from PB
```

---

## 6. Handicap System

### 6.1 Design Philosophy

Higher prestige levels give permanent bonuses (revenue multiplier, build speed, starting cash), making milestones inherently easier to reach. The handicap system ensures that a P10 player's 5-minute time and a P1 player's 8-minute time are both impressive achievements within their bracket.

**Approach: Bracket-based competition, not time penalties.**

We do NOT apply time penalties or multipliers to raw times. Instead, players compete within brackets of similar prestige level. This is simpler to understand, avoids confusion about "adjusted times," and lets players see their actual speed.

### 6.2 Prestige Bonuses (Current System)

From `prestige.ts`:

| Prestige Level | Revenue Mult | Build Speed Mult | Research Speed Mult | Mining Mult | Starting Cash |
|----------------|-------------|-------------------|---------------------|-------------|---------------|
| P0 (never) | 1.0x | 1.0x | 1.0x | 1.0x | $100M |
| P1 | 1.1x | 1.05x | 1.05x | 1.1x | $200M |
| P2 | 1.2x | 1.10x | 1.10x | 1.2x | $300M |
| P3 | 1.3x | 1.15x | 1.15x | 1.3x | $400M |
| P5 | 1.5x | 1.25x | 1.25x | 1.5x | $600M |
| P10 | 2.0x | 1.50x | 1.50x | 2.0x | $1.1B |
| P15 | 2.5x | 1.75x | 1.75x | 2.5x | $1.6B |
| P20 | 3.0x | 2.00x | 2.00x | 3.0x | $2.1B |

### 6.3 Expected Time Compression

Based on prestige bonuses, approximate speed advantage per bracket:

| Bracket | Prestige Range | Estimated Advantage | Notes |
|---------|---------------|---------------------|-------|
| Rookie | P1-P3 | Baseline | Low starting cash, small multipliers |
| Veteran | P4-P6 | ~30-40% faster | $500M-$700M start, 1.4-1.6x multipliers |
| Elite | P7-P10 | ~50-65% faster | $800M-$1.1B start, 1.7-2.0x multipliers |
| Grandmaster | P11+ | ~65-80% faster | $1.2B+ start, 2.0x+ multipliers |

These brackets are designed so that within each bracket, skill and strategy differentiate players more than raw prestige level.

---

## 7. Reward Structure

### 7.1 Design Principles

- **Participation always rewards** -- completing a speed run milestone earns something regardless of rank
- **Top finishers earn cosmetics** -- titles, badges, nameplates (no power boosts that affect competitive balance)
- **Record-holders earn unique flair** -- special cosmetic that displays until someone beats the record
- **No pay-to-win** -- speed boost items from the cosmetic shop do NOT affect speed run timers

### 7.2 Participation Rewards

Every player who completes the weekly featured milestone (any time, any bracket):

| Condition | Reward |
|-----------|--------|
| Complete the milestone | $25M cash + 5 legacy points |
| Complete within top 50% of bracket | $50M cash + 10 legacy points |
| Personal best improvement | $75M cash + 15 legacy points + 1 speed boost token |
| Complete both weekly milestones | $100M bonus + "Dual Runner" temporary badge (1 week) |

### 7.3 Rank Rewards (Per Bracket, Per Week)

| Rank | Cash Reward | Legacy Points | Cosmetic |
|------|-------------|---------------|----------|
| 1st | $500M | 100 | "Speed Demon" title (1 week) + Unique nameplate |
| 2nd | $350M | 75 | "Velocity" title (1 week) |
| 3rd | $250M | 50 | "Swift" title (1 week) |
| Top 10 | $150M | 30 | Animated speed badge (1 week) |
| Top 25 | $100M | 20 | Speed badge (1 week) |
| Top 50% | $50M | 10 | -- |

### 7.4 All-Time Record Rewards

Setting a new all-time bracket record for any milestone:

- **"Record Holder" nameplate** -- unique gold-animated nameplate displayed on the leaderboard next to the player's name until someone beats the record
- **250 legacy points** -- permanent, equivalent to 5+ prestige cycles worth of extra points
- **"Record Breaker" achievement** -- permanent achievement added to profile
- **Announcement** -- posted to the global activity feed (`PlayerActivity` model)

### 7.5 Seasonal Record Rewards

At the end of each 90-day season (aligned with `getCurrentSeasonNumber()` from `catchup-mechanics.ts`):

- **Player with most weekly #1 finishes across all milestones:**
  - Title: "Season [N] Speed Champion" (permanent)
  - Ship skin: "Chrono" (earnable, legendary rarity, from cosmetic-shop.ts pattern)
  - 500 legacy points

- **Player with most personal-best improvements:**
  - Title: "Season [N] Most Improved" (permanent)
  - 300 legacy points

### 7.6 Speed Boost Tokens

Earned from personal-best improvements. Tokens grant a 1.5x construction or research speed boost for 30 minutes (same as `BOOST_REWARDS.contract_tier1` from `speed-boosts.ts`). These boosts apply to the NEXT run, not the current one, preventing mid-run exploitation.

---

## 8. Prestige Level Brackets

### 8.1 Bracket Definitions

| Bracket ID | Name | Prestige Range | Starting Cash Range | Rev Multiplier Range |
|-----------|------|----------------|---------------------|---------------------|
| `rookie` | Rookie | P1-P3 | $200M-$400M | 1.1x-1.3x |
| `veteran` | Veteran | P4-P6 | $500M-$700M | 1.4x-1.6x |
| `elite` | Elite | P7-P10 | $800M-$1.1B | 1.7x-2.0x |
| `grandmaster` | Grandmaster | P11+ | $1.2B+ | 2.1x+ |

### 8.2 Bracket Assignment

A player's bracket is determined by their prestige level at the moment of prestige (the level they START the run at, which is their new level after prestige). This is locked for the duration of the run.

```
function getBracketId(prestigeLevel: number): string {
  if (prestigeLevel <= 3) return 'rookie';
  if (prestigeLevel <= 6) return 'veteran';
  if (prestigeLevel <= 10) return 'elite';
  return 'grandmaster';
}
```

### 8.3 Cross-Bracket Visibility

Players can view ALL brackets on the leaderboard, not just their own. This serves two purposes:
1. Aspirational -- see how fast elite players are
2. Strategic -- understand what's possible at higher prestige levels

### 8.4 Bracket Population Handling

If a bracket has fewer than 5 active participants in a given week:
- Merge with the adjacent bracket for that week only
- Rookie + Veteran merge into "Open (P1-P6)"
- Elite + Grandmaster merge into "Open (P7+)"
- Rewards are still distributed at the normal thresholds

### 8.5 Open Category

In addition to bracketed competition, an "Open" category shows raw times across ALL prestige levels. This is purely for bragging rights -- no separate rewards. It naturally favors high-prestige players, which is fine because the bracketed leaderboards handle fairness.

---

## 9. Anti-Cheating Measures

### 9.1 Server-Side Progression Validation

Every sync payload already sends full game state to the server (buildings, research, services, locations, resources). Speed run validation piggybacks on this existing infrastructure.

**Validation rules applied at milestone claim:**

| Check | Rule | Action on Failure |
|-------|------|-------------------|
| Minimum elapsed time | `sr_first_building` cannot complete in under 60 seconds (minimum real build time for tier 1) | Reject milestone claim |
| Prestige timestamp integrity | `lastPrestigeAt` must match server record | Reject, flag account |
| Progression consistency | Building count in milestone claim must match cumulative building completions since prestige | Reject if delta is implausible |
| Cash trajectory | Money cannot increase faster than `max(startingCash + sumOfServiceRevenue * elapsed + contractRewards, 2x_theoretical_max)` | Flag for review if > 2x theoretical max |
| Building completion rate | Number of buildings completed cannot exceed `constructionSlots * (elapsed / min_build_time)` | Reject if physically impossible |
| Research completion rate | Cannot complete more than 1 research at a time, each has minimum `realResearchSeconds / researchSpeedMultiplier` | Reject if impossible |
| Sync frequency | Must have synced at least once every 15 minutes during the run | Times between unsynced gaps are suspicious |
| Time travel | `completedAt` must be after `prestigedAt`, both must be within the current week | Reject |

### 9.2 Minimum Time Floors

Based on game mechanics, these are the absolute physical minimums (with maximum prestige bonuses at P20, 3x build speed from competitive boost, and 2x prestige build speed = 6x total):

| Milestone | Physical Minimum | Suspicion Threshold |
|-----------|-----------------|---------------------|
| sr_first_building | 50 seconds (300s base / 6x speed) | < 40 seconds |
| sr_first_service | 50 seconds (same as above, auto-activates) | < 40 seconds |
| sr_500m_cash | 3 minutes (P20 starts with $2.1B, already met) | < 60 seconds for P1-P10 |
| sr_1b_cash | 5 minutes (need revenue from services) | < 3 minutes |
| sr_5_buildings | 4 minutes (5 parallel in 2 slots, 2 minutes each) | < 3 minutes |
| sr_10_buildings | 10 minutes (assuming 2-3 slots, pipelined) | < 7 minutes |

### 9.3 Suspicious Speed Detection

A "suspicion score" accumulates per player. Players are never auto-banned -- suspicious activity is flagged for review.

```
suspicion_score = 0

// Time-based checks
if (elapsed < physical_minimum * 0.8) suspicion_score += 50
if (elapsed < physical_minimum * 1.2) suspicion_score += 10
if (elapsed < bracket_record * 0.5) suspicion_score += 30

// Progression checks
if (money_gained_per_second > max_theoretical * 2) suspicion_score += 20
if (buildings_per_minute > construction_slots * 2) suspicion_score += 40

// Pattern checks
if (consecutive_records_broken > 3) suspicion_score += 15
if (improvement_over_previous_best > 50%) suspicion_score += 10

// Threshold: 50+ = flag for review, 100+ = hide from leaderboard pending review
```

### 9.4 Replay Validation (Phase 3+)

For all-time records and top-10 weekly finishes, store a progression snapshot every 60 seconds during the run. This creates a "replay" that can be validated:

```
SpeedRunSnapshot {
  runId: string,
  timestampMs: number,
  money: number,
  buildingCount: number,
  researchCount: number,
  serviceCount: number,
  locationsUnlocked: number,
}
```

Stored as JSONB array in the `SpeedRun` model. Reviewers (or automated systems) can verify that progression was smooth and consistent with game mechanics.

---

## 10. Community Records and History

### 10.1 Hall of Fame

A permanent page displaying:

- **All-Time Records** per milestone, per bracket (4 brackets x 15 milestones = 60 record slots)
- **Record History** -- when each record was set and by whom, showing the record progression over time
- **Season Champions** -- winners from each 90-day season
- **Notable Runs** -- community-highlighted exceptional performances (e.g., "First sub-5-minute Billionaire")

### 10.2 Record Progression Tracking

Every time an all-time record is broken, the previous record is archived:

```
RecordHistory {
  milestoneId: "sr_1b_cash",
  bracketId: "rookie",
  records: [
    { profileId: "abc", companyName: "Nova Corp", time: 5400000, setAt: "2026-04-01" },
    { profileId: "def", companyName: "Stellar Inc", time: 4800000, setAt: "2026-04-15" },
    { profileId: "ghi", companyName: "Orbit LLC", time: 4200000, setAt: "2026-05-02" },
  ]
}
```

This data powers a "record progression chart" -- a line graph showing how the community's best times have improved over weeks/months.

### 10.3 Community Statistics

Global aggregate stats visible on the speed run dashboard:

- Total speed runs completed this week / all time
- Average time per milestone per bracket
- Most popular milestone (most attempts this week)
- Most competitive milestone (smallest gap between #1 and #10)
- Most improved player this week (biggest cumulative PB improvement)

### 10.4 Activity Feed Integration

Speed run events are posted to the existing `PlayerActivity` model:

| Activity Type | Trigger | Title Template |
|---------------|---------|---------------|
| `speedrun_record` | New all-time record | "{company} set a new {bracket} record for {milestone}: {time}!" |
| `speedrun_weekly_win` | Weekly #1 finish | "{company} won this week's {milestone} speed run in {time}!" |
| `speedrun_pb` | Personal best | "{company} beat their personal best on {milestone} by {improvement}!" |
| `speedrun_prestige` | Player prestiges to start a run | "{company} just prestiged to P{level}! Speed run timer started." |

---

## 11. Database Schema (Prisma Models)

### 11.1 New Models

```prisma
// ─── Prestige Speed Run: Individual Run Attempt ─────────────────────────────
model SpeedRun {
  id              String      @id @default(cuid())
  profileId       String
  profile         GameProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  // Run context
  prestigeLevel   Int         // Prestige level at START of run (after prestige)
  bracketId       String      // "rookie", "veteran", "elite", "grandmaster"
  prestigedAt     DateTime    // Server-validated timestamp of prestige

  // Status
  status          String      @default("active") // "active", "completed", "abandoned"

  // Progression snapshots (anti-cheat replay data)
  snapshots       Json        @default("[]") // Array of SpeedRunSnapshot objects

  // Completed milestones during this run
  milestones      SpeedRunMilestone[]

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([profileId])
  @@index([bracketId])
  @@index([status])
  @@index([prestigedAt])
}

// ─── Prestige Speed Run: Individual Milestone Completion ────────────────────
model SpeedRunMilestone {
  id              String      @id @default(cuid())
  runId           String
  run             SpeedRun    @relation(fields: [runId], references: [id], onDelete: Cascade)
  profileId       String
  profile         GameProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  milestoneId     String      // e.g. "sr_1b_cash", "sr_lunar_access"
  bracketId       String      // Denormalized for query performance
  elapsedMs       Int         // Milliseconds from prestige to completion
  completedAt     DateTime    // Server-validated completion time

  // Weekly challenge context
  weekId          Int         // Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  isFeatured      Boolean     @default(false) // Was this the weekly featured milestone?

  // Validation
  suspicionScore  Int         @default(0)
  isValid         Boolean     @default(true) // false = hidden from leaderboard pending review

  // Denormalized display fields
  companyName     String
  allianceTag     String?
  prestigeLevel   Int

  createdAt       DateTime    @default(now())

  @@unique([runId, milestoneId]) // One completion per milestone per run
  @@index([milestoneId, bracketId, elapsedMs]) // Leaderboard query
  @@index([milestoneId, bracketId, weekId])    // Weekly leaderboard
  @@index([profileId, milestoneId])            // Personal best lookup
  @@index([weekId, isFeatured])                // Featured challenge results
  @@index([isValid])
}

// ─── Prestige Speed Run: All-Time Records ──────────────────────────────────
model SpeedRunRecord {
  id              String      @id @default(cuid())
  milestoneId     String
  bracketId       String
  profileId       String
  profile         GameProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  companyName     String
  elapsedMs       Int
  prestigeLevel   Int
  setAt           DateTime    @default(now())

  // Previous record (for history chain)
  previousRecordId String?
  previousRecord   SpeedRunRecord? @relation("RecordChain", fields: [previousRecordId], references: [id])
  supersededBy     SpeedRunRecord? @relation("RecordChain")

  @@unique([milestoneId, bracketId]) // One record per milestone per bracket
  @@index([profileId])
}

// ─── Prestige Speed Run: Weekly Challenge Definition ────────────────────────
model SpeedRunWeeklyChallenge {
  id                  String      @id @default(cuid())
  weekId              Int         @unique
  primaryMilestoneId  String      // Main featured milestone
  compositeMilestoneId String?    // Secondary composite milestone
  startsAt            DateTime
  endsAt              DateTime
  participantCount    Int         @default(0)

  // Results (populated at week end)
  resultsComputed     Boolean     @default(false)

  @@index([weekId])
  @@index([startsAt])
}

// ─── Speed Run Rewards Claimed ─────────────────────────────────────────────
model SpeedRunReward {
  id              String      @id @default(cuid())
  profileId       String
  profile         GameProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  weekId          Int
  milestoneId     String
  bracketId       String
  rank            Int
  cashReward      Float
  legacyPoints    Int
  titleReward     String?     // Temporary title earned
  badgeReward     String?     // Temporary badge earned
  claimedAt       DateTime    @default(now())

  @@unique([profileId, weekId, milestoneId]) // One reward per player per milestone per week
  @@index([profileId])
  @@index([weekId])
}
```

### 11.2 GameProfile Additions

Add to the existing `GameProfile` model:

```prisma
model GameProfile {
  // ... existing fields ...

  // Prestige Speed Run fields
  lastPrestigeAt       DateTime?  // Server-validated prestige timestamp
  prestigeLevel        Int        @default(0)
  currentSpeedRunId    String?    // Active speed run (null if not running)
  speedRunTotalRuns    Int        @default(0)
  speedRunTotalPBs     Int        @default(0) // Total personal bests set

  // Relations
  speedRuns            SpeedRun[]
  speedRunMilestones   SpeedRunMilestone[]
  speedRunRecords      SpeedRunRecord[]
  speedRunRewards      SpeedRunReward[]

  @@index([prestigeLevel])
  @@index([lastPrestigeAt])
}
```

### 11.3 Data Volume Estimates

Assuming 1,000 active players, 20% prestige per week:
- SpeedRun rows: ~200/week = ~10,400/year
- SpeedRunMilestone rows: ~200 runs x 8 avg milestones = ~1,600/week = ~83,200/year
- SpeedRunRecord rows: 60 total (15 milestones x 4 brackets), updated infrequently
- SpeedRunSnapshot (JSONB): ~200 runs x 50 snapshots avg = ~10,000 snapshot entries/week embedded in SpeedRun.snapshots

Manageable for PostgreSQL. The key indexes on `[milestoneId, bracketId, elapsedMs]` and `[milestoneId, bracketId, weekId]` ensure leaderboard queries stay fast.

---

## 12. API Endpoints

### 12.1 Speed Run Lifecycle

#### `POST /api/space-tycoon/speed-runs/prestige`

Triggered when a player prestiges. Creates a new SpeedRun record and updates the GameProfile.

**Request:**
```json
{
  "previousPrestigeLevel": 2,
  "newPrestigeLevel": 3,
  "gameStateSnapshot": {
    "money": 100000000,
    "buildings": [],
    "completedResearch": [],
    "activeServices": [],
    "unlockedLocations": ["earth_surface", "leo"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "speedRunId": "clxyz...",
  "bracketId": "rookie",
  "prestigeLevel": 3,
  "prestigedAt": "2026-03-23T14:30:00.000Z",
  "featuredMilestones": {
    "primary": { "id": "sr_1b_cash", "name": "Billionaire" },
    "composite": { "id": "sr_combo_early", "name": "Quick Start" }
  },
  "personalBests": {
    "sr_1b_cash": 3600000,
    "sr_10_buildings": 14400000
  }
}
```

**Server-side validation:**
- Verify the player meets prestige requirements (`canPrestige()`)
- Verify previous game state was synced within the last 5 minutes
- Set `lastPrestigeAt = new Date()` on the GameProfile
- Create SpeedRun record with status "active"
- Mark any previous active SpeedRun as "abandoned"

#### `POST /api/space-tycoon/speed-runs/milestone`

Triggered when the client detects a milestone completion during an active speed run. Client sends the current game state for validation.

**Request:**
```json
{
  "speedRunId": "clxyz...",
  "milestoneId": "sr_1b_cash",
  "gameState": {
    "money": 1050000000,
    "buildings": [...],
    "completedResearch": [...],
    "activeServices": [...],
    "unlockedLocations": [...]
  }
}
```

**Response:**
```json
{
  "success": true,
  "milestoneId": "sr_1b_cash",
  "elapsedMs": 3542000,
  "elapsedFormatted": "59m 2s",
  "isPersonalBest": true,
  "previousBest": 4200000,
  "improvement": 658000,
  "bracketRank": 7,
  "bracketTotal": 34,
  "isNewRecord": false,
  "currentRecord": 2100000,
  "rewards": {
    "cash": 75000000,
    "legacyPoints": 15,
    "boostToken": true
  }
}
```

**Server-side validation:**
1. Verify SpeedRun exists, is "active", belongs to this player
2. Verify milestone hasn't already been completed in this run
3. Compute `elapsedMs = now - run.prestigedAt`
4. Run anti-cheat checks from Section 9.1
5. Validate game state matches milestone condition
6. Create SpeedRunMilestone record
7. Check if this is a personal best, bracket record, or all-time record
8. Compute and store suspicion score
9. If `suspicionScore >= 100`, set `isValid = false`
10. Return results + immediate participation reward

#### `POST /api/space-tycoon/speed-runs/snapshot`

Called every 60 seconds during an active speed run. Appends to the run's snapshot array.

**Request:**
```json
{
  "speedRunId": "clxyz...",
  "snapshot": {
    "timestampMs": 1711200000000,
    "money": 450000000,
    "buildingCount": 3,
    "researchCount": 1,
    "serviceCount": 2,
    "locationsUnlocked": 2
  }
}
```

**Response:**
```json
{ "success": true, "snapshotCount": 15 }
```

### 12.2 Leaderboard Endpoints

#### `GET /api/space-tycoon/speed-runs/leaderboard`

**Query Parameters:**
- `milestoneId` (required): Which milestone leaderboard to show
- `bracketId` (optional): Filter by bracket, default "all"
- `weekId` (optional): Specific week, default current week
- `scope` (optional): "weekly" | "alltime" | "personal", default "weekly"
- `limit` (optional): Max results, default 50, max 100

**Response:**
```json
{
  "milestone": { "id": "sr_1b_cash", "name": "Billionaire", "isFeatured": true },
  "bracket": { "id": "rookie", "name": "Rookie (P1-P3)" },
  "weekId": 2934,
  "entries": [
    {
      "rank": 1,
      "companyName": "Stellar Corp",
      "allianceTag": "SOL",
      "elapsedMs": 2100000,
      "elapsedFormatted": "35m 0s",
      "prestigeLevel": 3,
      "completedAt": "2026-03-21T08:15:00Z",
      "isCurrentPlayer": false
    }
  ],
  "currentPlayer": {
    "rank": 12,
    "elapsedMs": 3542000,
    "personalBest": 3542000,
    "bracketRecord": 2100000
  },
  "stats": {
    "totalParticipants": 47,
    "medianTime": 5400000,
    "averageTime": 6200000
  }
}
```

#### `GET /api/space-tycoon/speed-runs/records`

Returns all-time records for all milestones.

**Query Parameters:**
- `bracketId` (optional): Filter by bracket, default "all"

**Response:**
```json
{
  "records": [
    {
      "milestoneId": "sr_1b_cash",
      "milestoneName": "Billionaire",
      "brackets": {
        "rookie": { "elapsedMs": 2100000, "companyName": "Stellar Corp", "prestigeLevel": 3, "setAt": "2026-03-21" },
        "veteran": { "elapsedMs": 1200000, "companyName": "Nova Industries", "prestigeLevel": 5, "setAt": "2026-03-19" },
        "elite": { "elapsedMs": 600000, "companyName": "Orbit LLC", "prestigeLevel": 8, "setAt": "2026-03-20" },
        "grandmaster": { "elapsedMs": 180000, "companyName": "Apex Corp", "prestigeLevel": 15, "setAt": "2026-03-18" }
      }
    }
  ]
}
```

#### `GET /api/space-tycoon/speed-runs/personal`

Returns a player's speed run history and personal bests.

**Response:**
```json
{
  "totalRuns": 12,
  "totalPBs": 8,
  "currentRun": {
    "id": "clxyz...",
    "prestigeLevel": 3,
    "bracketId": "rookie",
    "elapsedSoFar": 1800000,
    "milestonesCompleted": ["sr_first_building", "sr_first_service", "sr_500m_cash"]
  },
  "personalBests": {
    "sr_1b_cash": { "elapsedMs": 3542000, "runDate": "2026-03-20", "bracketId": "rookie" },
    "sr_10_buildings": { "elapsedMs": 14400000, "runDate": "2026-03-15", "bracketId": "rookie" }
  },
  "recentRuns": [
    {
      "id": "clabc...",
      "prestigeLevel": 2,
      "prestigedAt": "2026-03-15",
      "milestonesCompleted": 8,
      "furthestMilestone": "sr_lunar_access"
    }
  ]
}
```

### 12.3 Weekly Challenge Endpoints

#### `GET /api/space-tycoon/speed-runs/weekly`

Returns current week's challenge info and next week preview.

**Response:**
```json
{
  "currentWeek": {
    "weekId": 2934,
    "primaryMilestone": { "id": "sr_1b_cash", "name": "Billionaire", "tier": "Easy" },
    "compositeMilestone": { "id": "sr_combo_early", "name": "Quick Start" },
    "timeRemaining": 302400000,
    "participantCount": 47,
    "playerStatus": {
      "hasCompletedPrimary": true,
      "hasCompletedComposite": false,
      "primaryRank": 12,
      "primaryTime": 3542000
    }
  },
  "nextWeek": {
    "primaryMilestone": { "id": "sr_5_buildings", "name": "Industrialist", "tier": "Medium" },
    "compositeMilestone": { "id": "sr_combo_expansion", "name": "Expansion Rush" },
    "startsIn": 302400000
  }
}
```

#### `POST /api/space-tycoon/speed-runs/weekly/claim-rewards`

Called at week end to claim weekly challenge rewards.

**Request:**
```json
{ "weekId": 2934 }
```

**Response:**
```json
{
  "rewards": [
    { "type": "participation", "cash": 25000000, "legacyPoints": 5 },
    { "type": "personal_best", "cash": 75000000, "legacyPoints": 15, "boostToken": true },
    { "type": "rank", "rank": 12, "cash": 100000000, "legacyPoints": 20 }
  ],
  "totalCash": 200000000,
  "totalLegacyPoints": 40
}
```

### 12.4 Admin / Review Endpoints

#### `GET /api/space-tycoon/speed-runs/admin/flagged`

Returns runs with high suspicion scores for review. Requires admin session.

#### `POST /api/space-tycoon/speed-runs/admin/validate`

Admin approves or rejects a flagged run. Sets `isValid` on the SpeedRunMilestone.

---

## 13. UI Design

### 13.1 Speed Run Dashboard (`/space-tycoon` -- new tab "Speed Runs")

Added as a new tab in the existing `GameTab` type (alongside 'dashboard', 'build', 'research', etc.).

**Layout:**

```
+------------------------------------------------------------------+
| SPEED RUNS                                          [?] Help      |
+------------------------------------------------------------------+
|                                                                    |
| ACTIVE RUN                                    WEEKLY CHALLENGE     |
| +----------------------------+    +--------------------------+     |
| | Prestige Level: P3         |    | This Week: Billionaire   |     |
| | Bracket: Rookie (P1-P3)   |    | Reach $1B cash fastest   |     |
| | Elapsed: 47m 22s  [LIVE]  |    |                          |     |
| |                            |    | Your Time: 59m 2s        |     |
| | Milestones:                |    | Bracket Rank: #12 / 47   |     |
| | [x] First Foundation  2m  |    | Record: 35m 0s           |     |
| | [x] Revenue Online    4m  |    |                          |     |
| | [x] Half Billionaire 12m  |    | Time Remaining: 3d 14h   |     |
| | [ ] Billionaire      ---  |    +--------------------------+     |
| | [ ] Industrialist    ---  |                                      |
| | ...                       |    NEXT WEEK (preview)               |
| +----------------------------+    +--------------------------+     |
|                                   | Industrialist (5 bldgs)  |     |
|                                   | + Expansion Rush combo   |     |
|                                   | Starts in: 3d 14h        |     |
|                                   +--------------------------+     |
+------------------------------------------------------------------+
|                                                                    |
| LEADERBOARD               [Weekly] [All-Time] [Personal]          |
| Milestone: [Billionaire v]  Bracket: [Rookie v]                   |
| +----------------------------------------------------------------+|
| | # | Company          | Time     | P.Lvl | Date    | vs PB     ||
| | 1 | Stellar Corp [SOL]| 35m 0s  | P3    | Mar 21  | RECORD    ||
| | 2 | Nova Industries   | 38m 12s | P2    | Mar 22  | -4m 30s   ||
| | 3 | Orbit LLC [MARS]  | 41m 55s | P3    | Mar 20  | -1m 12s   ||
| | ..................................................             ||
| |12 | [YOU] My Corp     | 59m 2s  | P3    | Mar 23  | NEW PB    ||
| +----------------------------------------------------------------+|
|                                                                    |
| PERSONAL BESTS                                                     |
| +----------------------------------------------------------------+|
| | Milestone        | Best Time | Bracket | Date    | vs Record  ||
| | First Foundation | 1m 42s    | Rookie  | Mar 23  | +32s       ||
| | Billionaire      | 59m 2s    | Rookie  | Mar 23  | +24m 2s    ||
| | Lunar Pioneer    | 5h 12m    | Rookie  | Mar 15  | +1h 45m    ||
| +----------------------------------------------------------------+|
+------------------------------------------------------------------+
```

### 13.2 Live Timer Component

A persistent timer widget displayed in the top resource bar (next to money, date, income) when a speed run is active:

```
[clock icon] Speed Run: 47m 22s  |  Next: Billionaire ($1B)  [67% there]
```

- Updates every second
- Shows the next uncompleted milestone and progress toward it
- Pulses/glows when a milestone is about to be completed
- Brief celebration animation when a milestone is achieved (confetti burst, similar to existing milestone events)

### 13.3 Milestone Completion Toast

When a speed run milestone is completed, a toast notification appears (using existing `src/lib/toast.ts`):

```
+------------------------------------------+
| MILESTONE: Billionaire          59m 2s   |
| Personal Best! (Previous: 1h 10m)        |
| Bracket Rank: #12 / 47                   |
| +$75M  +15 Legacy Points                 |
+------------------------------------------+
```

### 13.4 Prestige Screen Integration

The existing prestige confirmation dialog gets a new section showing speed run context:

```
+------------------------------------------+
| PRESTIGE TO LEVEL 4                      |
|                                          |
| Bonuses:                                 |
| Revenue: 1.3x -> 1.4x                   |
| Build Speed: 1.15x -> 1.20x             |
| Starting Cash: $400M -> $500M            |
|                                          |
| SPEED RUN                                |
| New Bracket: Veteran (P4-P6)             |
| This Week's Challenge: Billionaire       |
| Your Rookie Record: 59m 2s              |
| Veteran Bracket Record: 28m 15s         |
|                                          |
| [Prestige & Start Speed Run]             |
+------------------------------------------+
```

### 13.5 Hall of Fame Page

A dedicated page at `/space-tycoon/hall-of-fame` (or within the Speed Runs tab):

- **Records Table**: Grid of 15 milestones x 4 brackets, each cell showing record holder and time
- **Record Progression Chart**: Line chart showing how records have improved over time (per milestone)
- **Season Champions**: Previous season winners with their titles
- **Community Stats**: Aggregate participation numbers, most popular milestones

### 13.6 Color Palette and Visual Treatment

Consistent with existing game UI (`SPACE-TYCOON-DESIGN-DOC.md`):

| Element | Color | Usage |
|---------|-------|-------|
| Active timer | Cyan (#06b6d4) | Running clock, progress indicators |
| Personal best | Green (#22c55e) | New PB achieved, improvement numbers |
| Record | Amber (#f59e0b) | Record holder indicator, record-breaking celebration |
| Bracket colors | Slate/Green/Blue/Purple | Rookie/Veteran/Elite/Grandmaster |
| Milestone incomplete | White/40% opacity | Pending milestones |
| Milestone complete | Full white | Completed milestones with checkmark |

---

## 14. Notification System

### 14.1 In-Game Notifications (Event Log)

Speed run events are added to the existing `GameEvent` event log:

```typescript
// New GameEventType additions:
'speedrun_milestone' | 'speedrun_record' | 'speedrun_weekly_result'
```

Events appear in the game's event feed:

| Event | Example |
|-------|---------|
| Milestone completed | "Speed Run: Billionaire reached in 59m 2s (Personal Best!)" |
| Record broken | "NEW RECORD! You set the Rookie Billionaire record: 35m 0s" |
| Weekly results | "Weekly Speed Run Results: #12 in Billionaire, earned $200M + 40 LP" |
| Someone beat your record | "Alert: Stellar Corp broke your Rookie Billionaire record (34m 12s)" |

### 14.2 Push Notifications

Using the existing `PushToken` model and `NotificationPreference` system:

| Trigger | Push Notification | Opt-Out Category |
|---------|------------------|-----------------|
| New weekly challenge starts | "New Speed Run Challenge: Billionaire! Can you beat 35m 0s?" | `speedRunAlerts` (new preference) |
| Your record is broken | "Record Alert: {company} beat your {milestone} record by {delta}!" | `speedRunAlerts` |
| Weekly rewards ready | "Your Speed Run rewards are ready! Claim $200M + 40 LP" | `speedRunAlerts` |
| 2 hours left in week | "Last chance! Speed Run week ends in 2 hours" | `speedRunAlerts` |

### 14.3 Activity Feed Posts

Using the existing `PlayerActivity` model (types defined in Section 10.4):

```typescript
// New PlayerActivity types:
'speedrun_record'     // Posted when a player sets a new all-time record
'speedrun_weekly_win' // Posted when weekly winners are determined
'speedrun_pb'         // Posted when a player beats their PB (opt-in)
'speedrun_prestige'   // Posted when a player prestiges (opt-in)
```

### 14.4 NotificationPreference Addition

Add to the existing `NotificationPreference` model:

```prisma
model NotificationPreference {
  // ... existing fields ...
  speedRunAlerts      Boolean @default(true)
  speedRunActivityFeed Boolean @default(true) // Post PB/prestige to public feed
}
```

---

## 15. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Core speed run tracking, basic leaderboard, prestige integration.

**Tasks:**
1. Add Prisma models: `SpeedRun`, `SpeedRunMilestone`, `SpeedRunRecord`, `SpeedRunWeeklyChallenge`, `SpeedRunReward`
2. Add `lastPrestigeAt`, `prestigeLevel`, `currentSpeedRunId` to `GameProfile`
3. Create speed run milestone definitions in `src/lib/game/speed-run-milestones.ts`
4. Create bracket calculation in `src/lib/game/speed-run-brackets.ts`
5. Implement `POST /api/space-tycoon/speed-runs/prestige` endpoint
6. Implement `POST /api/space-tycoon/speed-runs/milestone` endpoint
7. Implement `GET /api/space-tycoon/speed-runs/leaderboard` endpoint
8. Modify existing prestige flow to call speed run prestige endpoint
9. Add milestone detection to the game engine tick (check milestones after each sync)
10. Basic anti-cheat: minimum time floors and progression consistency checks

**Deliverables:**
- Speed runs are recorded when players prestige
- Milestones are tracked and times recorded
- Basic leaderboard shows weekly results by bracket

### Phase 2: UI and Weekly Challenges (Week 3-4)

**Goal:** Full speed run dashboard, weekly challenge rotation, live timer.

**Tasks:**
1. Add "Speed Runs" tab to game UI
2. Implement live timer component in resource bar
3. Build speed run dashboard layout (active run, milestones, weekly challenge)
4. Build leaderboard component with bracket/scope filters
5. Build personal bests panel
6. Implement weekly challenge selection algorithm
7. Create `GET /api/space-tycoon/speed-runs/weekly` endpoint
8. Implement `POST /api/space-tycoon/speed-runs/weekly/claim-rewards` endpoint
9. Add milestone completion toast notifications
10. Integrate speed run context into prestige confirmation dialog
11. Add weekly challenge preview ("Coming Next" panel)

**Deliverables:**
- Full speed run UI experience
- Weekly challenges rotate automatically
- Players can see their progress, rank, and personal bests

### Phase 3: Rewards and Records (Week 5-6)

**Goal:** Reward distribution, Hall of Fame, activity feed integration.

**Tasks:**
1. Implement weekly reward calculation and distribution (end-of-week job)
2. Implement participation rewards (immediate on milestone completion)
3. Create Hall of Fame page
4. Build record progression chart (line chart of record improvements)
5. Implement all-time record tracking (`SpeedRunRecord` chain)
6. Add activity feed integration for records and weekly wins
7. Add push notification triggers for record alerts and weekly reminders
8. Add `speedRunAlerts` to `NotificationPreference`
9. Implement season champion tracking (end-of-season aggregation)
10. Create "Speed Run" cosmetics (new entries in `cosmetic-shop.ts` -- earnable titles and badges)

**Deliverables:**
- Full reward system operational
- Hall of Fame with historical records
- Notifications for records and weekly events
- Speed run titles and badges visible on leaderboard

### Phase 4: Anti-Cheat and Polish (Week 7-8)

**Goal:** Robust validation, snapshot replays, admin tools, edge cases.

**Tasks:**
1. Implement 60-second snapshot recording during active runs
2. Build suspicion score calculator
3. Create admin review dashboard (`/admin/speed-runs/flagged`)
4. Implement admin validate/reject endpoint
5. Handle edge cases: bracket merging for low populations, grace periods at week boundaries
6. Add composite milestone tracking
7. Performance optimization: ensure leaderboard queries use proper indexes
8. Load testing: verify leaderboard endpoint handles 1000+ entries per bracket
9. Add alliance leaderboard for speed runs
10. Community stats aggregation (weekly cron job)

**Deliverables:**
- Anti-cheat system operational
- Admin can review and adjudicate flagged runs
- All edge cases handled
- Performance validated under load

### Phase 5: Season System (Week 9-10)

**Goal:** Seasonal competition, long-term engagement hooks.

**Tasks:**
1. Implement season tracking (aligned with existing `getCurrentSeasonNumber()`)
2. Create season champion calculation (most #1 finishes, most PB improvements)
3. Create season-specific cosmetic rewards (earnable ship skin, permanent titles)
4. Build season summary page showing all winners
5. Implement cross-season statistics (career records, total participation)
6. Add "Season Pass" style progress bar for speed run participation
7. Create seasonal leaderboard reset while preserving all-time records
8. Post-season retrospective: auto-generate "Season Highlights" activity feed post

**Deliverables:**
- Full seasonal competition cycle
- Seasonal rewards and champions
- Long-term engagement through season progression

---

## 16. Technical Considerations

### 16.1 Sync Frequency

The existing sync endpoint (`POST /api/space-tycoon/sync`) runs every 30 seconds. During an active speed run, milestone detection should piggyback on each sync rather than requiring a separate API call for each milestone check. The sync response can include a `milestoneResults` field:

```json
{
  "success": true,
  "speedRun": {
    "newMilestones": [
      { "milestoneId": "sr_1b_cash", "elapsedMs": 3542000, "isPersonalBest": true }
    ]
  }
}
```

This reduces API calls and leverages the existing sync infrastructure.

### 16.2 Clock Skew

All times are server-side (`Date.now()` on the server). The client timer is cosmetic only. The 30-second sync interval means milestone completion times have up to 30 seconds of imprecision -- acceptable for this feature since competitive differences are typically measured in minutes.

### 16.3 Offline Handling

If a player goes offline during a speed run:
- The timer continues (wall-clock time)
- Milestones that complete during offline time (e.g., building completes) are credited at the next sync
- The credited time is `next_sync_time - prestige_time`, not the actual completion time
- This slightly disadvantages players who go offline, which is acceptable -- speed runs reward active play

### 16.4 Data Retention

- `SpeedRun` records: Retain forever (relatively small)
- `SpeedRunMilestone` records: Retain forever (primary competitive data)
- `SpeedRunSnapshot` JSONB: Retain for 90 days, then purge (only needed for dispute resolution)
- `SpeedRunWeeklyChallenge`: Retain forever (historical reference)
- `SpeedRunReward`: Retain forever (audit trail)

### 16.5 Cron Jobs

| Job | Frequency | Purpose |
|-----|-----------|---------|
| Weekly challenge creation | Every Monday 00:00 UTC | Create `SpeedRunWeeklyChallenge` for the new week |
| Weekly reward computation | Every Monday 00:05 UTC | Calculate ranks, distribute rewards, update `resultsComputed` |
| Snapshot cleanup | Daily 03:00 UTC | Purge snapshot data older than 90 days |
| Community stats | Daily 04:00 UTC | Aggregate participation counts, median times, etc. |
| Season finalization | Every 90 days | Calculate season champions, distribute season rewards |
| Abandoned run cleanup | Daily 05:00 UTC | Mark runs as "abandoned" if no sync in 7 days |

---

## 17. Formulas Reference

### 17.1 Bracket Determination

```
getBracketId(level):
  if level <= 3: return "rookie"
  if level <= 6: return "veteran"
  if level <= 10: return "elite"
  return "grandmaster"
```

### 17.2 Weekly Challenge Selection

```
weekId = floor(now_ms / 604_800_000)
primaryIndex = weekId % 15
compositeIndex = (weekId + 3) % 4
```

### 17.3 Suspicion Score

```
score = 0
if elapsed < floor_time * 0.8:        score += 50
if elapsed < floor_time * 1.2:        score += 10
if elapsed < bracket_record * 0.5:    score += 30
if money_rate > 2x_theoretical_max:   score += 20
if buildings_rate > slots * 2:        score += 40
if consecutive_records > 3:           score += 15
if improvement > 50% of previous:     score += 10

flag_threshold = 50
hide_threshold = 100
```

### 17.4 Reward Scaling

```
participation_cash = 25_000_000
top_50pct_cash = 50_000_000
personal_best_cash = 75_000_000
dual_runner_bonus = 100_000_000

rank_1_cash = 500_000_000
rank_2_cash = 350_000_000
rank_3_cash = 250_000_000
top_10_cash = 150_000_000
top_25_cash = 100_000_000

record_legacy_points = 250
```

### 17.5 Minimum Time Floors (per prestige level)

```
base_build_time_seconds = 300  // Tier 1 building
prestige_build_mult = 1.0 + (level * 0.05)
boost_mult = 3.0  // Maximum from competitive boost
effective_min_build = base_build_time / (prestige_build_mult * boost_mult)

// Example: P10 with 3x boost
// 300 / (1.5 * 3.0) = 66.7 seconds minimum first building
```
