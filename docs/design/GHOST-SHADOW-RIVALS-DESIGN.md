# Ghost/Shadow Rivals — Implementation Design

**Version:** 1.0
**Date:** 2026-03-23
**Status:** Design Complete — Ready for Implementation
**Author:** Game Design Research

---

## Table of Contents

1. [Overview & Design Philosophy](#1-overview--design-philosophy)
2. [Matching Algorithm](#2-matching-algorithm)
3. [Rivalry Score Mechanic](#3-rivalry-score-mechanic)
4. [Rival Panel UI Design](#4-rival-panel-ui-design)
5. [Notification Triggers](#5-notification-triggers)
6. [Anti-Gaming Measures](#6-anti-gaming-measures)
7. [Weekly Rotation Logic](#7-weekly-rotation-logic)
8. [Database Schema](#8-database-schema)
9. [API Design](#9-api-design)
10. [Snapshot Scheduling](#10-snapshot-scheduling)
11. [Implementation Phases](#11-implementation-phases)

---

## 1. Overview & Design Philosophy

### What Are Ghost Rivals?

Ghost Rivals are asynchronous, one-directional competitive pairings. Each player is assigned 1-3 "shadow" opponents whose progress is visible as a benchmark. The rival sees a snapshot of the opponent's company — their buildings, net worth, services, research count, and growth rate — but never interacts with them directly. The rival does not know they are being watched.

This creates the feeling of head-to-head competition without any of the toxicity, griefing, or synchronization problems of direct PvP. The opponent is essentially a "ghost recording" of another real player's trajectory.

### Design Principles (from Space Tycoon core)

| Principle | Application to Rivals |
|---|---|
| **Never take things away** | Losing a rivalry score point means the opponent gained one — your buildings/money are untouched |
| **Percentage-based metrics** | All comparisons shown as % difference, never raw numbers (protects ego at all scales) |
| **Participation rewards** | Even losing a rivalry week grants a small consolation bonus |
| **Rotate opponents** | Weekly rotation ensures variety and prevents staleness |
| **Notification-driven** | 6+ notification types create "pull" to re-engage |
| **Async-first** | All rival data comes from periodic snapshots, never live queries |

### Why This Matters for Retention

Research from idle/tycoon games shows that **relative progress against a peer is 3-5x more motivating than absolute progress** once a player passes the initial discovery phase (typically week 2+). Ghost Rivals provide this without the downsides of direct competition:

- No griefing or harassment vectors
- No need for simultaneous online play
- No "I can't compete" discouragement (opponents are matched by power level)
- Creates a reason to return daily even when the core loop feels solved

---

## 2. Matching Algorithm

### 2.1 Composite Power Score

Every player receives a **Composite Power Score (CPS)** calculated from their synced `GameProfile` data. This score determines who gets matched against whom.

```
CPS = (W_nw * S_nw) + (W_age * S_age) + (W_svc * S_svc) + (W_bld * S_bld) + (W_res * S_res)
```

#### Component Scores (all normalized to 0-1000 range)

| Component | Symbol | Weight | Normalization |
|---|---|---|---|
| Net Worth | S_nw | **0.40** | `min(1000, (netWorth / topPlayerNetWorth) * 1000)` |
| Account Age | S_age | **0.20** | `min(1000, (accountAgeDays / 365) * 1000)` |
| Service Count | S_svc | **0.15** | `min(1000, (serviceCount / 50) * 1000)` |
| Building Count | S_bld | **0.15** | `min(1000, (buildingCount / 100) * 1000)` |
| Research Count | S_res | **0.10** | `min(1000, (researchCount / 500) * 1000)` |

The `topPlayerNetWorth` is the highest `netWorth` on the server, cached and refreshed every 6 hours.

#### Example CPS Calculations

**New Player (Week 1):** $500M net worth, 7 days old, 2 services, 3 buildings, 2 research
- S_nw: 500M / 5T (top) * 1000 = 100 -> 0.40 * 100 = 40
- S_age: 7/365 * 1000 = 19 -> 0.20 * 19 = 3.8
- S_svc: 2/50 * 1000 = 40 -> 0.15 * 40 = 6.0
- S_bld: 3/100 * 1000 = 30 -> 0.15 * 30 = 4.5
- S_res: 2/500 * 1000 = 4 -> 0.10 * 4 = 0.4
- **CPS = 54.7**

**Mid-Game Player (Month 3):** $50B net worth, 90 days old, 15 services, 25 buildings, 40 research
- S_nw: 50B / 5T * 1000 = 10 -> 0.40 * 10 = 4.0 (wait — this seems low)

Actually, the normalization needs a logarithmic scale because net worth spans $100M to $10T+ (5 orders of magnitude).

#### Revised Normalization (Logarithmic)

```
S_nw = min(1000, (log10(netWorth) - log10(100_000_000)) / (log10(10_000_000_000_000) - log10(100_000_000)) * 1000)
     = min(1000, (log10(netWorth) - 8) / 5 * 1000)
```

This maps:
- $100M (10^8) -> 0
- $1B (10^9) -> 200
- $10B (10^10) -> 400
- $100B (10^11) -> 600
- $1T (10^12) -> 800
- $10T (10^13) -> 1000

**Revised Example — Mid-Game Player:**
- S_nw: (log10(50B) - 8) / 5 * 1000 = (10.7 - 8) / 5 * 1000 = 540 -> 0.40 * 540 = 216
- S_age: 90/365 * 1000 = 246 -> 0.20 * 246 = 49.3
- S_svc: 15/50 * 1000 = 300 -> 0.15 * 300 = 45
- S_bld: 25/100 * 1000 = 250 -> 0.15 * 250 = 37.5
- S_res: 40/500 * 1000 = 80 -> 0.10 * 80 = 8.0
- **CPS = 355.8**

### 2.2 Matching Window

A player with CPS `X` is eligible to match with any player whose CPS falls in `[X * 0.70, X * 1.30]` — a 30% band above and below.

If fewer than 3 candidates exist within the 30% band, widen to 50%. If still insufficient (very early server or extreme outliers), allow NPC rivals as fallback (see section 2.4).

### 2.3 Match Selection Criteria

From the eligible pool, select 3 rivals using this priority:

1. **Diversity score** (40% weight): Prefer opponents the player has NOT faced in the last 4 weeks. Score = `weeksSinceLastMatch / 4`, capped at 1.0.
2. **CPS proximity** (30% weight): Prefer opponents closest in CPS. Score = `1.0 - abs(myCPS - theirCPS) / (myCPS * 0.30)`.
3. **Activity recency** (20% weight): Prefer opponents who synced within the last 48 hours. Score = `1.0` if synced < 48h ago, `0.5` if < 7 days, `0.0` otherwise.
4. **Alliance exclusion** (10% weight): Prefer opponents NOT in the same alliance. Score = `1.0` if different alliance (or no alliance), `0.0` if same.

Final match score per candidate:

```
matchScore = 0.40 * diversityScore + 0.30 * proximityScore + 0.20 * activityScore + 0.10 * allianceScore
```

Sort candidates by `matchScore` descending, take top 3.

### 2.4 NPC Fallback Rivals

If the server has fewer than 10 active players (early launch period), generate synthetic rivals from the existing NPC company system (`npc-companies.ts`). NPC rivals behave identically in the UI — the player sees a company name, stats, and growth — but the data is computed from NPC progression formulas rather than real snapshots.

NPC rivals are tagged with `isNpc: true` in the database and are excluded from real-player match history.

### 2.5 Prestige-Aware Matching

Players with prestige levels are inherently stronger per unit of account age. The CPS formula accounts for this via net worth (prestige players accumulate wealth faster), but an additional prestige penalty prevents a Prestige 5 player from being matched against a Prestige 0 player at similar net worth:

```
adjustedCPS = baseCPS + (prestigeLevel * 30)
```

This adds 30 CPS points per prestige level, pushing prestiged players toward other prestiged or late-game players.

---

## 3. Rivalry Score Mechanic

### 3.1 Tug-of-War (0-100)

Each rival assignment has a **rivalry score** that starts at 50 and moves toward whichever player is performing better that week. The score represents "who's winning this rivalry."

```
0  ──────────── 50 ──────────── 100
   Rival is         Dead          You are
   dominating       heat          dominating
```

### 3.2 Score Movement Formula

The score is updated every time a snapshot is captured (every 4 hours; see section 10). The movement is calculated from the **relative change** in each metric since the last snapshot.

#### Metrics Tracked Per Snapshot

| Metric | Weight | Direction |
|---|---|---|
| Net worth growth (%) | 0.35 | Higher % growth = winning |
| New buildings completed | 0.20 | More new buildings = winning |
| New research completed | 0.15 | More new research = winning |
| New services activated | 0.15 | More new services = winning |
| Resource portfolio growth (%) | 0.15 | Higher growth = winning |

#### Movement Calculation

```typescript
// For each metric:
myDelta    = (myCurrentValue - myPreviousValue) / max(myPreviousValue, 1)
rivalDelta = (rivalCurrentValue - rivalPreviousValue) / max(rivalPreviousValue, 1)

// Weighted advantage (-1.0 to +1.0 per metric)
advantage = clamp((myDelta - rivalDelta) / max(abs(myDelta), abs(rivalDelta), 0.001), -1.0, 1.0)

// Sum all metric advantages with weights
totalAdvantage = sum(weight_i * advantage_i)  // Range: -1.0 to +1.0

// Convert to score movement (max ±3 points per snapshot)
movement = round(totalAdvantage * 3)

// Apply with bounds
newScore = clamp(previousScore + movement, 0, 100)
```

**Key properties:**
- Maximum movement per snapshot: 3 points in either direction
- Maximum movement per day (6 snapshots): 18 points
- Maximum movement per week (42 snapshots): 126 points (but clamped to 0-100)
- A completely inactive player will drift toward 0 against an active rival at ~2-3 points per snapshot
- Two equally active players will oscillate around 50

### 3.3 Score Interpretation

| Score Range | Label | Color | Meaning |
|---|---|---|---|
| 0-15 | Rival Dominating | Red | Opponent is far ahead this week |
| 16-35 | Rival Leading | Orange | Opponent has the edge |
| 36-49 | Slight Rival Lead | Yellow | Close but opponent edges ahead |
| 50 | Dead Heat | White | Perfectly matched |
| 51-64 | Slight Player Lead | Light Cyan | Close but you edge ahead |
| 65-84 | Player Leading | Cyan | You have the edge |
| 85-100 | Player Dominating | Green | You are far ahead this week |

### 3.4 Weekly Resolution & Rewards

When a rivalry week ends (every Monday 00:00 UTC, aligned with the existing `getCurrentWeekId()` system):

1. **Winner** (score > 55): Earns a cash bonus of `netWorth * 0.002` (0.2% of net worth) and +5 reputation
2. **Loser** (score < 45): Earns a consolation bonus of `netWorth * 0.0005` (0.05% of net worth) and +1 reputation
3. **Draw** (45-55): Both earn `netWorth * 0.001` (0.1% of net worth) and +3 reputation

Rewards are capped at:
- Early game (< $1B net worth): max $2M bonus
- Mid game ($1B - $100B): max $200M bonus
- Late game ($100B - $1T): max $2B bonus
- Endgame ($1T+): max $20B bonus

These caps prevent the system from being a dominant income source — it should feel like a nice bonus, not the optimal strategy.

### 3.5 Rivalry Streak Bonuses

Consecutive weekly wins against different rivals (not the same opponent) earn streak multipliers:

| Streak | Bonus Multiplier | Title Earned |
|---|---|---|
| 2 weeks | 1.25x | — |
| 3 weeks | 1.50x | "Rising Star" |
| 5 weeks | 2.00x | "Competitive Edge" |
| 8 weeks | 2.50x | "Relentless" |
| 12 weeks | 3.00x | "Unstoppable Force" |

Streaks reset on a loss (score < 45). Draws do not break streaks but do not advance them.

---

## 4. Rival Panel UI Design

### 4.1 Panel Location

The rival panel is a new tab in the game UI. Add `'rivals'` to the `GameTab` type:

```typescript
export type GameTab = 'dashboard' | 'build' | 'research' | 'map' | 'services' | 'fleet' | 'crafting' | 'workforce' | 'market' | 'contracts' | 'alliance' | 'bounties' | 'leaderboard' | 'rivals';
```

The tab icon should be two crossed swords or a shield emblem.

Additionally, a **compact rival widget** appears on the main dashboard showing the primary rival (highest rivalry score movement) with a one-line summary.

### 4.2 Panel Layout — Full Rivals Tab

```
┌─────────────────────────────────────────────────────────────────┐
│  SHADOW RIVALS                                    Week 47 of 52 │
│  3 rivals assigned · Refreshes in 4d 12h          [History ▼]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─── RIVAL #1 ──────────────────────────────────────────────┐  │
│  │ ◆ Helios Dynamics          Net Worth: $48.2B (+12.3%)     │  │
│  │   [████████████████░░░░] 72/100  — You're Leading         │  │
│  │                                                            │  │
│  │   ┌──────────┬──────────┬──────────┬──────────┐           │  │
│  │   │ Buildings │ Services │ Research │ Locations│           │  │
│  │   │  You: 28  │  You: 14 │  You: 42 │  You: 6  │           │  │
│  │   │  Them: 22 │  Them: 11│  Them: 38│  Them: 5 │           │  │
│  │   │  +27%  ▲  │  +27%  ▲ │  +11%  ▲ │  +20%  ▲ │           │  │
│  │   └──────────┴──────────┴──────────┴──────────┘           │  │
│  │                                                            │  │
│  │   Growth this week: You +$5.2B (12.1%) vs Them +$3.8B    │  │
│  │   (8.6%)                                                   │  │
│  │   Weekly trend: ▲▲▲▼▲▲ (5W-1L last 6 snapshots)          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─── RIVAL #2 ──────────────────────────────────────────────┐  │
│  │ ◆ Proxima Industries       Net Worth: $52.1B (+9.7%)      │  │
│  │   [██████████░░░░░░░░░░] 48/100  — Dead Heat              │  │
│  │   ... (same layout)                                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─── RIVAL #3 ──────────────────────────────────────────────┐  │
│  │ ◆ Void Ventures            Net Worth: $41.0B (+15.2%)     │  │
│  │   [████░░░░░░░░░░░░░░░░] 31/100  — Rival Leading          │  │
│  │   ... (same layout)                                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─── WEEKLY SUMMARY ────────────────────────────────────────┐  │
│  │  Current Streak: 3 wins  ·  Title: "Rising Star"          │  │
│  │  Last Week: Won 2/3 rivalries  ·  Earned $180M bonus      │  │
│  │  All-Time Record: 14W - 5L - 3D                           │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Comparison Metrics Shown

For each rival, display:

| Metric | Format | Color Logic |
|---|---|---|
| Company Name | String | White (always) |
| Net Worth | `$X.XB` with `(+X.X%)` weekly growth | Green if you're higher, red if lower |
| Rivalry Score | Horizontal bar 0-100 with label | Gradient from red (0) to white (50) to green (100) |
| Building Count | `You: N / Them: N / +X% ▲` | Green arrow if ahead, red if behind |
| Service Count | Same format | Same logic |
| Research Count | Same format | Same logic |
| Locations Unlocked | Same format | Same logic |
| Weekly Growth | `$X.XB (X.X%)` for both sides | Emphasize whoever grew more |
| Snapshot Trend | 6 arrow icons (last 6 snapshots) | ▲ green = you gained, ▼ red = rival gained |

### 4.4 Metrics NOT Shown

To prevent strategy copying and maintain the "shadow" feeling:
- **Do NOT show:** specific building names, specific research names, specific service types, resource inventories, money balance, alliance name, prestige level
- **Rationale:** The rival should feel like a competitive benchmark, not a blueprint to copy. Showing counts without specifics creates curiosity ("they have 42 research — how?") that drives engagement without enabling mimicry.

### 4.5 Dashboard Widget (Compact)

On the main dashboard, a small widget shows:

```
┌─── TOP RIVAL ─────────────────────────────────┐
│ ◆ vs Helios Dynamics  [████████░░] 72/100     │
│   You're leading by +$5.2B this week          │
│   ▲ 3-win streak                               │
└────────────────────────────────────────────────┘
```

Clicking the widget navigates to the full Rivals tab.

---

## 5. Notification Triggers

### 5.1 Notification Types

| ID | Type | Trigger | Message Template | Priority |
|---|---|---|---|---|
| `rival_assigned` | New Rival | Weekly rotation assigns new rivals | "New rival assigned: {companyName} ($X.XB net worth). The race begins!" | Medium |
| `rival_overtaken` | You Passed Them | Your net worth crosses above rival's | "You overtook {companyName}! Your net worth ($X.XB) just passed theirs ($X.XB)." | High |
| `rival_passed_you` | They Passed You | Rival's net worth crosses above yours | "{companyName} just passed you! They reached $X.XB while you're at $X.XB. Time to push back." | High |
| `rival_score_critical` | Score Alert | Rivalry score drops below 25 or rises above 75 | "You're dominating {companyName}! Score: {score}/100" or "{companyName} is pulling ahead. Score: {score}/100." | Medium |
| `rival_week_won` | Weekly Win | End-of-week resolution, you won | "Victory! You beat {companyName} this week ({score}/100). Earned ${bonus}." | High |
| `rival_week_lost` | Weekly Loss | End-of-week resolution, you lost | "{companyName} edged you out this week ({score}/100). Consolation: ${bonus}. New rivals next week!" | Medium |
| `rival_week_draw` | Weekly Draw | End-of-week resolution, draw | "Dead heat with {companyName}! Score: {score}/100. Draw bonus: ${bonus}." | Low |
| `rival_streak` | Streak Milestone | Streak reaches 3, 5, 8, or 12 | "Win streak: {streak}! You've earned the '{title}' title and {multiplier}x bonus." | High |
| `rival_milestone_gap` | Milestone Alert | Rival completes a milestone you haven't | "{companyName} just reached {milestone}! You're {X}% of the way there." | Medium |
| `rival_inactive_warning` | Inactivity | Player hasn't synced in 48+ hours but has active rivalries | "Your rivals are still growing! {companyName} gained ${amount} while you were away." | Low |

### 5.2 Notification Frequency Limits

To prevent notification fatigue:

| Type | Max Frequency |
|---|---|
| `rival_overtaken` / `rival_passed_you` | Once per rival per 24 hours (prevents flip-flop spam) |
| `rival_score_critical` | Once per rival per 48 hours |
| `rival_assigned` | Once per week (batch all 3 assignments) |
| `rival_week_won/lost/draw` | Once per week |
| `rival_streak` | Once per streak milestone reached |
| `rival_inactive_warning` | Once per 72 hours |

### 5.3 Integration with Existing Notification System

Rival notifications use the existing `Notification` model with:
- `type`: One of the IDs from the table above (prefixed with `rival_`)
- `relatedContentType`: `'rival_assignment'`
- `relatedContentId`: The `RivalAssignment.id`
- `linkUrl`: `/sectors/space-tycoon?tab=rivals`

The `NotificationPreference` model should gain a new boolean field:

```
rivalAlerts Boolean @default(true)
```

### 5.4 Push Notification Support

For players with push tokens (`PushToken` model), high-priority rival notifications (`rival_overtaken`, `rival_passed_you`, `rival_week_won`, `rival_streak`) should trigger push notifications via the existing push infrastructure. Low-priority notifications are in-app only.

---

## 6. Anti-Gaming Measures

### 6.1 Peak Net Worth Tracking

**Problem:** A player could sell assets, drop their net worth, get matched against weaker rivals, then rebuild and dominate.

**Solution:** Track `peakNetWorth` on each `GameProfile`. Matching uses `max(currentNetWorth, peakNetWorth * 0.85)` — you can never drop more than 15% below your peak for matching purposes.

```
effectiveNetWorth = max(currentNetWorth, peakNetWorth * 0.85)
```

The CPS calculation uses `effectiveNetWorth` instead of `currentNetWorth`.

### 6.2 Decline Detection

**Problem:** A player intentionally tanks their account to get easy matchups.

**Solution:** If net worth drops more than 30% in a single week without a prestige event:

1. Flag the account with `declineFlagged: true`
2. For the next 2 weekly rotation cycles, use `peakNetWorth` (not current) for all matching
3. Add a `rivalNote` to the rival assignment: "Matching based on peak performance"
4. The flag clears automatically after 2 weeks of normal activity (net worth stabilizes or grows)

Detection formula:

```
declineRate = (previousWeekNetWorth - currentNetWorth) / previousWeekNetWorth
if (declineRate > 0.30 && !justPrestiged) -> flag
```

### 6.3 Smurf Prevention

**Problem:** An experienced player creates a new account to dominate beginners.

**Solution:** Multiple signals detect smurf-like behavior:

| Signal | Threshold | Action |
|---|---|---|
| Rapid early progression | > $5B net worth within 7 days of account creation | Boost CPS by +150 (match against mid-tier) |
| Research velocity | > 15 research in first 14 days | Boost CPS by +100 |
| Building efficiency | > 95th percentile buildings/day for account age bracket | Boost CPS by +75 |
| Same IP/fingerprint as existing account | Match found | Use the higher account's CPS for matching |

The CPS boosts are additive and stack. A player who triggers all three gets +325 CPS — pushing them well past the beginner pool.

Smurf detection is **silent** — no notification or UI indicator. The player simply gets matched against stronger opponents.

### 6.4 Inactive Rival Replacement

**Problem:** A rival goes inactive, making the rivalry trivially easy.

**Solution:** If a rival has not synced in 7+ days:

1. After 7 days: Mark the rivalry as `stale`. The rival's snapshot stops updating (frozen at last known state). The rivalry score stops moving.
2. After 14 days: Auto-replace the stale rival with a new match. The old rivalry resolves as a draw (both get draw bonus).
3. Notification: "Your rival {companyName} has gone dark. A new challenger approaches: {newCompanyName}."

### 6.5 Rivalry Score Manipulation Prevention

**Problem:** A player could try to game the rivalry score by timing their progression spikes.

**Solution:** Snapshots are taken on a server-controlled schedule (every 4 hours) that is NOT aligned to player sync times. The snapshot captures the latest synced state, regardless of when the player last synced. This means a player cannot "save up" progress and dump it all at the optimal moment — the 4-hour window smooths out any timing games.

Additionally, the maximum score movement per snapshot is capped at 3 points, requiring sustained outperformance over multiple snapshots to move the score significantly.

---

## 7. Weekly Rotation Logic

### 7.1 Rotation Schedule

Rivals rotate every Monday at 00:00 UTC, aligned with the existing `getCurrentWeekId()` function from `weekly-events.ts`:

```typescript
const weekId = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
```

### 7.2 Rotation Algorithm

```
1. Resolve all active rivalries (calculate winner/loser/draw, distribute rewards)
2. Archive completed RivalAssignments (set status = 'completed', record final score)
3. For each active player (synced within last 7 days):
   a. Calculate their current CPS
   b. Query eligible opponents within CPS ± 30% band
   c. Exclude: same player, same alliance, matched in last 4 weeks (from RivalHistory)
   d. Score candidates using the match formula (section 2.3)
   e. Assign top 3 candidates
   f. Create RivalAssignment records with initial score = 50
   g. Take initial snapshot for both players
   h. Send 'rival_assigned' notification
```

### 7.3 Anti-Repetition Rules

| Rule | Implementation |
|---|---|
| No repeat within 4 weeks | Query `RivalAssignment` WHERE `rivalProfileId = X AND createdAt > (now - 28 days)` |
| Max 2 rematches per quarter | Count assignments with same rivalProfileId in last 90 days, reject if >= 2 |
| Alliance diversity | At most 1 of 3 rivals can share the player's alliance (prefer 0) |
| CPS tier diversity | All 3 rivals should not be from the same 10% CPS band — spread across the 30% window |

### 7.4 Edge Cases

| Scenario | Handling |
|---|---|
| Player joins mid-week | Assign rivals immediately (don't wait for Monday). Their first rivalry week is short (ends next Monday). Score starts at 50 with proportionally reduced max movement. |
| Player prestiges mid-week | Keep current rivals. Prestige resets net worth but the rivalry score is based on *growth*, not absolute values. The prestige player will likely lose that week (net worth drops) but gets fresh rivals next week at their new CPS. |
| Fewer than 10 eligible opponents | Assign fewer rivals (minimum 1). If no eligible real players exist, assign NPC rival. |
| Player is #1 on leaderboard | Match against #2, #3, and a random top-10 player. The 30% CPS window doesn't apply to the top 5 players — they always get matched against each other. |

---

## 8. Database Schema

### 8.1 New Prisma Models

```prisma
// Ghost Rival system — async competitive pairings
model RivalAssignment {
  id              String      @id @default(cuid())
  profileId       String      // The player who sees this rival
  profile         GameProfile @relation("myRivals", fields: [profileId], references: [id], onDelete: Cascade)
  rivalProfileId  String      // The opponent (does not know they're being watched)
  rivalProfile    GameProfile @relation("rivalOf", fields: [rivalProfileId], references: [id], onDelete: Cascade)

  weekId          Int         // Week number (from getCurrentWeekId())
  status          String      @default("active") // active, completed, stale, replaced

  // Rivalry score (tug-of-war)
  score           Int         @default(50) // 0-100, 50 = dead heat
  peakScore       Int         @default(50) // Highest score reached this week
  lowestScore     Int         @default(50) // Lowest score reached this week

  // Resolution
  result          String?     // 'win', 'loss', 'draw' — set on weekly resolution
  bonusAwarded    Float?      // Cash bonus awarded at resolution

  // Rival display data (denormalized for fast reads — updated each snapshot)
  rivalCompanyName    String
  rivalNetWorth       Float       @default(0)
  rivalBuildingCount  Int         @default(0)
  rivalServiceCount   Int         @default(0)
  rivalResearchCount  Int         @default(0)
  rivalLocationsCount Int         @default(0)
  rivalGrowthPct      Float       @default(0) // Net worth growth % this week

  isNpc           Boolean     @default(false) // True if rival is an NPC company

  createdAt       DateTime    @default(now())
  resolvedAt      DateTime?

  snapshots       RivalSnapshot[]

  @@unique([profileId, rivalProfileId, weekId]) // One assignment per pair per week
  @@index([profileId, status])
  @@index([profileId, weekId])
  @@index([rivalProfileId])
  @@index([weekId])
  @@index([status])
}

// Point-in-time snapshot of both players in a rivalry
model RivalSnapshot {
  id              String          @id @default(cuid())
  assignmentId    String
  assignment      RivalAssignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)

  // Player's state at this snapshot
  playerNetWorth       Float
  playerBuildingCount  Int
  playerServiceCount   Int
  playerResearchCount  Int
  playerLocationsCount Int

  // Rival's state at this snapshot
  rivalNetWorth        Float
  rivalBuildingCount   Int
  rivalServiceCount    Int
  rivalResearchCount   Int
  rivalLocationsCount  Int

  // Computed at snapshot time
  scoreAfter           Int  // Rivalry score after this snapshot's movement
  scoreMovement        Int  // How much the score moved (+/- or 0)

  capturedAt           DateTime @default(now())

  @@index([assignmentId, capturedAt])
  @@index([capturedAt])
}

// Events in a rivalry (used for notifications and history)
model RivalEvent {
  id              String   @id @default(cuid())
  assignmentId    String   // Which rivalry this event belongs to
  profileId       String   // Which player this event is for (recipient)
  type            String   // rival_assigned, rival_overtaken, rival_passed_you, etc.
  title           String
  message         String
  metadata        Json?    // Extra data (score, amounts, etc.)
  notified        Boolean  @default(false) // Whether a Notification was created
  createdAt       DateTime @default(now())

  @@index([profileId, createdAt])
  @@index([assignmentId])
  @@index([type])
  @@index([notified])
}
```

### 8.2 GameProfile Additions

Add these fields to the existing `GameProfile` model:

```prisma
model GameProfile {
  // ... existing fields ...

  // Ghost Rival fields
  peakNetWorth        Float     @default(0)
  rivalryWins         Int       @default(0)
  rivalryLosses       Int       @default(0)
  rivalryDraws        Int       @default(0)
  rivalryStreak       Int       @default(0) // Current consecutive win streak
  rivalryBestStreak   Int       @default(0) // All-time best streak
  rivalryTitle        String?   // Earned from streaks
  declineFlagged      Boolean   @default(false)
  declineFlaggedAt    DateTime?
  smurfCpsBoost       Int       @default(0) // Additional CPS from smurf detection

  // Relations
  myRivals            RivalAssignment[] @relation("myRivals")
  rivalOf             RivalAssignment[] @relation("rivalOf")
}
```

### 8.3 NotificationPreference Addition

```prisma
model NotificationPreference {
  // ... existing fields ...
  rivalAlerts Boolean @default(true)
}
```

### 8.4 Index Strategy

The schema includes these performance-critical indexes:

- `RivalAssignment(profileId, status)`: Fast lookup of a player's active rivals
- `RivalAssignment(profileId, weekId)`: History queries scoped to a week
- `RivalAssignment(rivalProfileId)`: Find all players watching a given rival (for snapshot updates)
- `RivalSnapshot(assignmentId, capturedAt)`: Time-series queries for trend display
- `RivalEvent(profileId, createdAt)`: Player's event feed
- `GameProfile(netWorth)`: Already exists — used for CPS calculation and matching

### 8.5 Data Retention Policy

| Data | Retention | Rationale |
|---|---|---|
| `RivalAssignment` | Indefinite | Lightweight, needed for history and anti-repetition |
| `RivalSnapshot` | 90 days | ~42 snapshots/week * 3 rivals * 13 weeks = ~1,638 rows per player per quarter. Prune older snapshots via cron. |
| `RivalEvent` | 90 days | Notification history, pruned alongside snapshots |

At 500 active players, this is approximately 819,000 snapshot rows per quarter — well within PostgreSQL's comfortable range.

---

## 9. API Design

### 9.1 GET /api/space-tycoon/rivals

Returns the current player's active rival assignments with latest snapshot data.

**Authentication:** Required (session-based via `getServerSession`)

**Response:**

```json
{
  "rivals": [
    {
      "assignmentId": "cuid_123",
      "weekId": 47,
      "status": "active",
      "score": 72,
      "peakScore": 74,
      "result": null,
      "rival": {
        "companyName": "Helios Dynamics",
        "netWorth": 48200000000,
        "netWorthFormatted": "$48.2B",
        "buildingCount": 22,
        "serviceCount": 11,
        "researchCount": 38,
        "locationsCount": 5,
        "growthPct": 8.6,
        "isNpc": false
      },
      "player": {
        "netWorth": 52000000000,
        "buildingCount": 28,
        "serviceCount": 14,
        "researchCount": 42,
        "locationsCount": 6,
        "growthPct": 12.1
      },
      "comparison": {
        "netWorthDiffPct": 7.9,
        "buildingDiffPct": 27.3,
        "serviceDiffPct": 27.3,
        "researchDiffPct": 10.5,
        "locationsDiffPct": 20.0
      },
      "trend": [1, 1, 1, -1, 1, 1],
      "createdAt": "2026-03-17T00:00:00Z"
    }
  ],
  "summary": {
    "currentStreak": 3,
    "streakTitle": "Rising Star",
    "allTimeRecord": { "wins": 14, "losses": 5, "draws": 3 },
    "lastWeekBonusTotal": 180000000,
    "weekTimeRemainingMs": 389520000,
    "weekId": 47
  },
  "history": [
    {
      "weekId": 46,
      "rivals": [
        { "companyName": "Nova Corp", "finalScore": 68, "result": "win", "bonus": 95000000 },
        { "companyName": "Stellar Mining Co", "finalScore": 43, "result": "loss", "bonus": 12000000 },
        { "companyName": "Orbit Labs", "finalScore": 71, "result": "win", "bonus": 85000000 }
      ]
    }
  ]
}
```

### 9.2 GET /api/space-tycoon/rivals/history?weeks=8

Returns rivalry history for the last N weeks.

**Query Parameters:**
- `weeks` (optional, default 8, max 52): Number of past weeks to include

**Response:** Array of weekly results with rival names, scores, and bonuses.

### 9.3 POST /api/space-tycoon/rivals/dismiss-notification

Marks a rival notification as read.

**Body:**
```json
{ "eventId": "cuid_456" }
```

### 9.4 Internal: POST /api/space-tycoon/rivals/cron/snapshot

**Not player-facing.** Called by the server's cron job every 4 hours to capture snapshots and update rivalry scores.

**Authentication:** API key (internal cron secret)

**Process:**
1. Query all `RivalAssignment` WHERE `status = 'active'`
2. For each assignment, fetch latest `GameProfile` data for both players
3. Compare against previous snapshot
4. Calculate score movement
5. Insert new `RivalSnapshot`
6. Update `RivalAssignment.score`
7. Check notification triggers (overtaken, score critical, etc.)
8. Create `RivalEvent` records as needed

### 9.5 Internal: POST /api/space-tycoon/rivals/cron/rotate

**Not player-facing.** Called by the server's cron job every Monday at 00:00 UTC.

**Process:**
1. Resolve all active assignments (calculate results, distribute rewards)
2. Run the matching algorithm for all active players
3. Create new `RivalAssignment` records
4. Send `rival_assigned` notifications

### 9.6 Integration with Existing Sync Endpoint

The existing `POST /api/space-tycoon/sync` route should be extended to:

1. Update `peakNetWorth` if `netWorth > peakNetWorth`
2. Check smurf detection signals and update `smurfCpsBoost`
3. Check decline detection and update `declineFlagged`
4. Return a lightweight rival summary in the sync response:

```json
{
  "rivals": {
    "activeCount": 3,
    "topRivalScore": 72,
    "topRivalName": "Helios Dynamics",
    "hasNewNotifications": true
  }
}
```

This gives the game client enough data to show the dashboard widget without a separate API call.

---

## 10. Snapshot Scheduling

### 10.1 Snapshot Frequency

**Every 4 hours** — 6 snapshots per day, 42 per week.

Rationale:
- Frequent enough to track meaningful changes (buildings complete in hours, research completes in minutes to hours)
- Infrequent enough to avoid excessive database writes (42 * 3 rivals * 500 players = 63,000 rows/week)
- Aligned with the max score movement of ±3 per snapshot — 6 snapshots/day allows up to ±18 points/day, meaning a rivalry can swing from 50 to 0 or 100 in roughly 3 days of dominant performance

### 10.2 Snapshot Schedule (UTC)

Snapshots at: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC

These times are intentionally NOT aligned with common playing hours in any single timezone, ensuring no timezone has a systematic advantage.

### 10.3 Snapshot Data Captured

For each player in each active rivalry:

```typescript
interface SnapshotData {
  netWorth: number;         // From GameProfile
  buildingCount: number;    // From GameProfile
  serviceCount: number;     // From GameProfile
  researchCount: number;    // From GameProfile
  locationsUnlocked: number; // From GameProfile
}
```

This is a 5-field subset of the GameProfile — intentionally minimal to keep snapshot rows small.

### 10.4 Snapshot Diffing

When computing score movement, the system compares the current snapshot against the **previous** snapshot (4 hours ago). If the previous snapshot is missing (first snapshot of the week), movement is 0.

```typescript
function computeMovement(current: SnapshotData, previous: SnapshotData,
                          rivalCurrent: SnapshotData, rivalPrevious: SnapshotData): number {
  const metrics = [
    { weight: 0.35, player: growthPct(current.netWorth, previous.netWorth),
                     rival: growthPct(rivalCurrent.netWorth, rivalPrevious.netWorth) },
    { weight: 0.20, player: current.buildingCount - previous.buildingCount,
                     rival: rivalCurrent.buildingCount - rivalPrevious.buildingCount },
    { weight: 0.15, player: current.researchCount - previous.researchCount,
                     rival: rivalCurrent.researchCount - rivalPrevious.researchCount },
    { weight: 0.15, player: current.serviceCount - previous.serviceCount,
                     rival: rivalCurrent.serviceCount - rivalPrevious.serviceCount },
    { weight: 0.15, player: current.locationsUnlocked - previous.locationsUnlocked,
                     rival: rivalCurrent.locationsUnlocked - rivalPrevious.locationsUnlocked },
  ];

  let totalAdvantage = 0;
  for (const m of metrics) {
    const diff = m.player - m.rival;
    const maxDelta = Math.max(Math.abs(m.player), Math.abs(m.rival), 0.001);
    const advantage = clamp(diff / maxDelta, -1.0, 1.0);
    totalAdvantage += m.weight * advantage;
  }

  return Math.round(clamp(totalAdvantage * 3, -3, 3));
}
```

### 10.5 Cron Implementation

Use a serverless cron (Railway cron job or Vercel cron) that hits the internal snapshot endpoint:

```
# Railway cron schedule
0 */4 * * * curl -X POST https://app.spacenexus.io/api/space-tycoon/rivals/cron/snapshot -H "Authorization: Bearer $CRON_SECRET"

# Weekly rotation (Monday 00:00 UTC)
0 0 * * 1 curl -X POST https://app.spacenexus.io/api/space-tycoon/rivals/cron/rotate -H "Authorization: Bearer $CRON_SECRET"
```

### 10.6 Missed Snapshot Handling

If the cron job fails or is delayed:
- The next successful snapshot simply computes movement against the last available snapshot
- If the gap is > 8 hours, cap movement at ±2 instead of ±3 (to avoid outsized jumps from accumulated changes)
- If the gap is > 24 hours, cap movement at ±1
- Log the gap as a warning for monitoring

---

## 11. Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal:** Schema, matching algorithm, basic API

1. Add Prisma models (`RivalAssignment`, `RivalSnapshot`, `RivalEvent`) and `GameProfile` additions
2. Run `npx prisma db push`
3. Implement CPS calculation function in `src/lib/game/rival-matching.ts`
4. Implement matching algorithm (candidate scoring, selection)
5. Implement `GET /api/space-tycoon/rivals` endpoint (returns assignments)
6. Implement `POST /api/space-tycoon/rivals/cron/rotate` (manual trigger for testing)
7. Unit tests for CPS calculation and matching

**Deliverable:** Can manually trigger rotation and query assigned rivals via API.

### Phase 2: Snapshots & Scoring (Week 2)

**Goal:** Live score tracking

1. Implement snapshot capture logic in `src/lib/game/rival-snapshots.ts`
2. Implement score movement calculation
3. Implement `POST /api/space-tycoon/rivals/cron/snapshot`
4. Set up Railway cron for 4-hour snapshots
5. Implement weekly resolution logic (winner/loser/draw, bonus distribution)
6. Set up Railway cron for Monday rotation
7. Extend `POST /api/space-tycoon/sync` to update `peakNetWorth` and return lightweight rival summary
8. Unit tests for score movement and resolution

**Deliverable:** Scores update automatically every 4 hours. Weekly rotation happens on Monday.

### Phase 3: UI — Rivals Tab (Week 3)

**Goal:** Full UI experience

1. Add `'rivals'` to `GameTab` type
2. Build `RivalsPanel` component with 3 rival cards
3. Build rivalry score bar component (animated, color-coded)
4. Build comparison metrics grid (buildings, services, research, locations)
5. Build weekly summary section (streak, record, bonus)
6. Build compact dashboard widget
7. Wire up `useGameSync` hook to include rival summary data
8. Add `history` tab to show past weeks

**Deliverable:** Players can see their rivals, scores, and comparisons in the game UI.

### Phase 4: Notifications (Week 4)

**Goal:** Engagement loop

1. Implement notification trigger checks in snapshot cron
2. Create `RivalEvent` records for each trigger
3. Wire `RivalEvent` -> `Notification` creation (using existing model)
4. Add `rivalAlerts` preference to `NotificationPreference`
5. Implement frequency limiting (per-type cooldowns from section 5.2)
6. Add push notification support for high-priority rival events
7. Add notification count badge to rivals tab icon

**Deliverable:** Players receive in-app and push notifications for rival events.

### Phase 5: Anti-Gaming & Polish (Week 5)

**Goal:** Integrity and edge cases

1. Implement peak net worth tracking (update in sync endpoint)
2. Implement decline detection (flag + matching override)
3. Implement smurf detection (CPS boost based on progression velocity)
4. Implement inactive rival replacement (7-day stale, 14-day replace)
5. Implement NPC fallback rivals for low-population scenarios
6. Add data retention cron (prune snapshots > 90 days)
7. Load testing: simulate 500 players with 3 rivals each, 42 snapshots/week
8. QA edge cases: prestige mid-week, top-5 matching, mid-week joins

**Deliverable:** System is resilient to manipulation and handles all edge cases.

### Phase 6: Tuning & Analytics (Week 6)

**Goal:** Validate and adjust

1. Add analytics tracking: rival tab opens, notification click-through rates, engagement lift
2. Monitor score distribution — if > 70% of scores are near 50, increase max movement to ±4
3. Monitor match diversity — if players complain about repetitive rivals, tighten anti-repetition rules
4. Monitor reward economics — ensure rival bonuses are < 5% of typical weekly income
5. A/B test: 1 rival vs 3 rivals per player (measure retention impact)
6. Adjust CPS weights if matching quality is poor (survey top-10 and bottom-10 players)

**Deliverable:** Data-driven tuning of all parameters.

---

## Appendix A: Constants Reference

```typescript
// rival-constants.ts

export const RIVAL_CONSTANTS = {
  // Matching
  CPS_WEIGHTS: { netWorth: 0.40, accountAge: 0.20, services: 0.15, buildings: 0.15, research: 0.10 },
  CPS_MATCH_BAND: 0.30,          // ±30% CPS band
  CPS_MATCH_BAND_WIDE: 0.50,     // Fallback wider band
  PRESTIGE_CPS_BOOST: 30,        // Per prestige level
  MIN_CANDIDATES_FOR_MATCH: 3,
  RIVALS_PER_PLAYER: 3,

  // Scoring
  INITIAL_SCORE: 50,
  MAX_SCORE_MOVEMENT_PER_SNAPSHOT: 3,
  MAX_SCORE_MOVEMENT_LARGE_GAP: 2,  // Gap > 8h
  MAX_SCORE_MOVEMENT_HUGE_GAP: 1,   // Gap > 24h
  WIN_THRESHOLD: 55,
  LOSS_THRESHOLD: 45,

  // Rewards
  WIN_BONUS_PCT: 0.002,          // 0.2% of net worth
  LOSS_BONUS_PCT: 0.0005,        // 0.05% of net worth
  DRAW_BONUS_PCT: 0.001,         // 0.1% of net worth
  BONUS_CAPS: {
    early: 2_000_000,             // < $1B net worth
    mid: 200_000_000,             // $1B - $100B
    late: 2_000_000_000,          // $100B - $1T
    endgame: 20_000_000_000,      // $1T+
  },
  WIN_REPUTATION: 5,
  LOSS_REPUTATION: 1,
  DRAW_REPUTATION: 3,

  // Streaks
  STREAK_MILESTONES: [
    { weeks: 2, multiplier: 1.25, title: null },
    { weeks: 3, multiplier: 1.50, title: 'Rising Star' },
    { weeks: 5, multiplier: 2.00, title: 'Competitive Edge' },
    { weeks: 8, multiplier: 2.50, title: 'Relentless' },
    { weeks: 12, multiplier: 3.00, title: 'Unstoppable Force' },
  ],

  // Anti-gaming
  PEAK_NET_WORTH_FLOOR: 0.85,    // Can't drop more than 15% below peak for matching
  DECLINE_FLAG_THRESHOLD: 0.30,  // 30% net worth drop triggers flag
  DECLINE_FLAG_DURATION_WEEKS: 2,
  SMURF_RAPID_WEALTH_THRESHOLD: 5_000_000_000,  // $5B in 7 days
  SMURF_RAPID_WEALTH_DAYS: 7,
  SMURF_RAPID_WEALTH_CPS_BOOST: 150,
  SMURF_RAPID_RESEARCH_THRESHOLD: 15,  // 15 research in 14 days
  SMURF_RAPID_RESEARCH_DAYS: 14,
  SMURF_RAPID_RESEARCH_CPS_BOOST: 100,
  SMURF_BUILD_EFFICIENCY_CPS_BOOST: 75,

  // Rotation
  NO_REMATCH_WEEKS: 4,
  MAX_REMATCHES_PER_QUARTER: 2,
  STALE_RIVAL_DAYS: 7,
  REPLACE_RIVAL_DAYS: 14,

  // Snapshots
  SNAPSHOT_INTERVAL_HOURS: 4,
  SNAPSHOT_RETENTION_DAYS: 90,

  // Score movement weights
  SCORE_WEIGHTS: {
    netWorthGrowth: 0.35,
    buildings: 0.20,
    research: 0.15,
    services: 0.15,
    resources: 0.15,
  },

  // Notifications
  NOTIFICATION_COOLDOWNS: {
    rival_overtaken: 24 * 60 * 60 * 1000,     // 24 hours
    rival_passed_you: 24 * 60 * 60 * 1000,    // 24 hours
    rival_score_critical: 48 * 60 * 60 * 1000, // 48 hours
    rival_inactive_warning: 72 * 60 * 60 * 1000, // 72 hours
  },
};
```

---

## Appendix B: Score Movement Worked Example

**Setup:** Player "Alpha Corp" vs Rival "Beta Inc" at start of snapshot period.

**Previous snapshot (4 hours ago):**
- Alpha: $50B net worth, 25 buildings, 14 services, 40 research, 6 locations
- Beta: $48B net worth, 22 buildings, 11 services, 38 research, 5 locations
- Current score: 65 (Alpha leading)

**Current snapshot:**
- Alpha: $51.5B (+3.0%), 26 buildings (+1), 14 services (+0), 41 research (+1), 6 locations (+0)
- Beta: $50.5B (+5.2%), 24 buildings (+2), 13 services (+2), 39 research (+1), 5 locations (+0)

**Metric calculations:**

| Metric | Weight | Alpha Delta | Beta Delta | Advantage | Weighted |
|---|---|---|---|---|---|
| Net Worth Growth | 0.35 | +3.0% | +5.2% | (3.0-5.2)/5.2 = -0.42 | -0.147 |
| Buildings | 0.20 | +1 | +2 | (1-2)/2 = -0.50 | -0.100 |
| Research | 0.15 | +1 | +1 | (1-1)/1 = 0.00 | 0.000 |
| Services | 0.15 | +0 | +2 | (0-2)/2 = -1.00 | -0.150 |
| Locations | 0.15 | +0 | +0 | 0/(0.001) = 0.00 | 0.000 |

**Total advantage:** -0.397
**Movement:** round(-0.397 * 3) = round(-1.19) = **-1**
**New score:** 65 + (-1) = **64**

Beta had a stronger snapshot this period, so the score moved 1 point toward Beta.

---

## Appendix C: File Structure

```
src/
  lib/
    game/
      rival-constants.ts      // All tuning constants (Appendix A)
      rival-matching.ts        // CPS calculation, candidate scoring, match selection
      rival-scoring.ts         // Score movement, resolution, streak tracking
      rival-snapshots.ts       // Snapshot capture, diffing, movement computation
      rival-anti-gaming.ts     // Peak tracking, decline detection, smurf detection
      rival-notifications.ts   // Notification trigger checks, cooldown enforcement
  app/
    api/
      space-tycoon/
        rivals/
          route.ts             // GET /api/space-tycoon/rivals
          history/
            route.ts           // GET /api/space-tycoon/rivals/history
          dismiss-notification/
            route.ts           // POST /api/space-tycoon/rivals/dismiss-notification
          cron/
            snapshot/
              route.ts         // POST (internal) — 4-hour snapshot cron
            rotate/
              route.ts         // POST (internal) — weekly rotation cron
```

---

## Appendix D: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Snapshot cron fails silently | Medium | Scores freeze, stale data shown | Health check alert if no snapshots in 6+ hours |
| Matching produces poor pairings | Medium | Player frustration | Widen CPS band automatically if < 3 candidates found |
| Reward economics too generous | Low | Inflation, rival bonuses become dominant income | Hard caps per tier (section 3.4), monitor weekly |
| Reward economics too stingy | Medium | Players ignore the feature | A/B test reward levels, monitor tab engagement |
| Score movement feels "random" | Medium | Players don't understand why score changed | Show per-metric breakdown on hover/tap |
| Database growth | Low | Snapshot table grows large | 90-day retention with automated pruning |
| NPC rivals feel fake | Medium | Players disengage with NPC matchups | Label NPC rivals clearly, prioritize real matches |
