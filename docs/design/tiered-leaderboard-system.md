# Space Tycoon: Tiered Leaderboard System — Design Document

> **Status**: Design Phase (no code yet)
> **Priority**: P1 (per COMPETITIVE-MULTIPLAYER-PLAN.md, Mechanic #1)
> **Estimated Effort**: 1-2 weeks implementation
> **Last Updated**: 2026-03-23

---

## Table of Contents
1. [Bracket Design](#1-bracket-design)
2. [Competition Metrics](#2-competition-metrics)
3. [Rewards](#3-rewards)
4. [Promotion / Demotion](#4-promotion--demotion)
5. [Anti-Manipulation](#5-anti-manipulation)
6. [Database Design](#6-database-design)
7. [UI Design](#7-ui-design)
8. [Implementation Priority](#implementation-priority)

---

## 1. Bracket Design

### Tier Structure: 8 Leagues

Based on patterns from Clash Royale (arenas gated by trophies), Chess.com (weekly divisions of 50 players), and League of Legends (tiered ranked with promotion series), the system uses 8 named leagues. Players are grouped into brackets of 50 within each league.

| League # | Name | Net Worth Floor | Thematic Basis |
|----------|------|----------------|----------------|
| 1 | **Suborbital** | $0 (new players) | Sounding rockets, barely reaching space |
| 2 | **Low Orbit** | $500M | LEO satellite companies |
| 3 | **Geostationary** | $2B | GEO commercial operations |
| 4 | **Lunar** | $10B | Moon base operators |
| 5 | **Interplanetary** | $50B | Mars/asteroid belt pioneers |
| 6 | **Deep Space** | $200B | Outer planet ventures |
| 7 | **Stellar** | $750B | Interstellar-class megacorps |
| 8 | **Galactic** | $2T+ | The endgame elite |

### Why 8 tiers?

- Fewer than 6 makes each tier feel too broad and progression too slow.
- More than 10 creates "dead" tiers with not enough players.
- 8 provides a clear sense of climbing without feeling overwhelming — roughly matching the game's existing location progression (LEO → GEO → lunar → Mars → asteroid belt → Jupiter → Saturn → deep space).

### Bracket size: 50 players

This directly mirrors the Chess.com model, which groups 50 players per weekly bracket within each league. The reasoning:
- **50 is small enough** that every player can see their name, scan the full list, and feel the competition is personal.
- **50 is large enough** that you'll always have active opponents, even with some inactive players in the bracket.
- **Promotion/demotion math works cleanly**: Top 5 promote (10%), bottom 5 demote (10%), middle 40 stay.

### Bracket assignment basis: Net Worth at season start

Net worth (already computed during sync as `money + resourceValue`) determines which league a player belongs to. The floor thresholds above are checked at the start of each weekly season. Within a league, players are randomly shuffled into brackets of 50.

**Why net worth rather than a composite score?** Net worth is already the game's core metric, is already synced every 60 seconds, already indexed in PostgreSQL (`@@index([netWorth])`), and is intuitive for players. A composite score would be more "fair" in theory but harder to understand, harder to explain in UI, and harder to debug.

### Season length: 1 real week (Monday 00:00 UTC to Sunday 23:59 UTC)

- 1 week = ~28 game months, enough for meaningful progress.
- Matches the existing `getCurrentSeason()` pattern (3-month game seasons = 18 real hours), but at a coarser "meta" level.
- Weekly resets keep engagement high — short enough that losing a week doesn't feel catastrophic, long enough to reward consistent play.

---

## 2. Competition Metrics

### Primary approach: Rotating weekly metric

Each week, the bracket competition is based on a **single rotating metric**. This prevents the meta from getting stale and rewards different play styles across weeks. The metric determines who promotes, who demotes, and who earns rewards.

**Key design decision: percentage-based growth, not absolute values.** A player going from $500M to $1B (100% growth) should outscore a player going from $500B to $600B (20% growth). This prevents top-tier players from dominating lower brackets if the matchmaking ever misaligns, and it means new players in a bracket have just as much chance as established ones. The weekly metric measures **delta from week start**, either as percentage growth or as an absolute count of actions taken during the week.

### Metric rotation pool (10 metrics)

| # | Metric | Measurement | Category |
|---|--------|-------------|----------|
| 1 | **Net Worth Growth** | % increase in net worth from week start | Wealth |
| 2 | **Revenue Generated** | Total income earned during the week | Wealth |
| 3 | **Buildings Completed** | Count of buildings finished this week | Infrastructure |
| 4 | **Research Completed** | Count of research projects finished this week | Technology |
| 5 | **Trade Volume** | Total value of market buy/sell orders this week | Market |
| 6 | **Bounties Fulfilled** | Count + value of resource bounties filled | Social |
| 7 | **Locations Unlocked** | New locations colonized this week | Exploration |
| 8 | **Ships Deployed** | New ships launched this week | Fleet |
| 9 | **Resource Stockpile Growth** | % increase in total resource value | Mining |
| 10 | **Alliance Contribution** | Net worth contributed to alliance total this week | Social |

### Rotation schedule

- Metrics rotate in a fixed, published order so players can plan ahead.
- The rotation is deterministic: `metricIndex = weekNumber % 10`.
- The upcoming metric is visible 24 hours before the new week starts ("Next week: Trade Volume").
- This prevents players from being blindsided while still keeping things fresh.

### Fairness across tiers

- Metrics 1 and 9 use **percentage growth**, which inherently normalizes across wealth levels.
- Metrics 2-8 and 10 are **absolute counts/values within the week**, but since players are already grouped by net worth into the correct league, absolute values within a bracket are fair — everyone in the bracket has roughly similar economic capacity.
- If a metric doesn't apply to a tier (e.g., "Locations Unlocked" for Galactic-tier players who have unlocked everything), the system skips that metric for that tier and uses the next one in the rotation.

---

## 3. Rewards

### Design philosophy

Matching the existing codebase philosophy from `subscriber-perks.ts`: "Speed-up, not power-up." and from `cosmetic-shop.ts`: "Pure cosmetic purchases — NO power, NO stats, NO competitive advantage." Leaderboard rewards must not be game-breaking.

### Tier 1: Weekly bracket placement rewards

| Placement | Reward |
|-----------|--------|
| **1st place** | Exclusive weekly title ("Week 12 Champion"), 500K in-game cash, 1 rare cosmetic crate |
| **2nd-3rd** | 300K in-game cash, 1 uncommon cosmetic crate |
| **4th-5th** (promotion zone) | 200K in-game cash |
| **6th-25th** (safe zone) | 100K in-game cash |
| **26th-45th** (safe zone) | 50K in-game cash |
| **46th-50th** (demotion zone) | 25K in-game cash (participation) |

### Tier 2: League milestone rewards (one-time, upon first reaching a league)

| League | One-Time Unlock |
|--------|----------------|
| Low Orbit | "Orbital" company badge (cosmetic) |
| Geostationary | Custom nameplate border (blue) |
| Lunar | "Lunar Pioneer" title card |
| Interplanetary | Ship skin: "Mars Red" |
| Deep Space | Station theme: "Nebula" |
| Stellar | Animated company badge (epic rarity) |
| Galactic | Legendary nameplate + "Galactic Mogul" title + victory animation |

### Tier 3: Participation rewards

Anyone who syncs at least once during a league week earns:
- 25K in-game cash (minimum)
- 1 "league point" toward seasonal cosmetic rewards

**Seasonal cosmetic track** (every 12 weeks = 1 "league season"):
- 4 league points: Common cosmetic
- 8 league points: Uncommon cosmetic
- 12 league points: Rare cosmetic (perfect attendance)

### Why these rewards are not game-breaking

- Cash rewards are modest relative to game economy. At Suborbital tier ($0-$500M), 500K is meaningful but not transformative (~0.1% of the tier ceiling). At Galactic tier ($2T+), 500K is negligible.
- All unique rewards are cosmetics, fitting the existing `CosmeticItem` system with categories like `company_badge`, `title_card`, `nameplate`, `ship_skin`, and `station_theme`.
- No stat boosts, no build speed increases, no exclusive content. This is consistent with the codebase's stated monetization philosophy.

---

## 4. Promotion / Demotion

### Promotion rules

- **Top 5 players** in a 50-person bracket are promoted to the next league at week's end.
- Promotion is immediate at reset — the player appears in the higher league's bracket pool for the next week.
- **First-time promotion** triggers the one-time league milestone reward and a `PlayerActivity` feed entry ("Cosmos Corp promoted to Lunar League!").

### Demotion rules

- **Bottom 5 players** who were **active during the week** (at least 1 sync) are demoted to the league below.
- Inactive players (0 syncs during the week) are **removed from the bracket entirely** and placed in an "unranked" pool. They re-enter when they next sync, placed into a bracket matching their current net worth. This prevents dead weight from occupying bracket slots.

### Safety zones (anti-yo-yo)

Inspired by League of Legends' "Demotion Shield":

- **Promotion shield**: After being promoted, a player cannot be demoted for their first week in the new league, even if they finish bottom 5. This prevents the frustrating experience of promoting on Sunday and demoting the following Sunday.
- **Demotion buffer**: Players who finished 41st-45th (just above the demotion zone) two weeks in a row get a "warning" indicator in the UI, but are NOT demoted. Only consistent bottom-5 finishes trigger demotion.
- **Floor protection**: Players in the Suborbital league (the lowest) cannot be demoted. They always have a bracket to compete in.
- **Ceiling behavior**: Players in the Galactic league who finish top 5 stay in Galactic but receive bonus rewards (a "Galactic Elite" sub-tier with additional cosmetic flair).

### Reset cadence

- **Weekly**: Brackets reshuffle within each league. Players are randomly re-assigned to new groups of 50 within their league. This prevents stale rivalries and ensures you aren't stuck with the same dominant player every week.
- **Seasonal** (every 12 weeks): A soft compression happens. Players in leagues 5-8 drop one league. Players in leagues 2-4 stay. This creates a re-climb that drives engagement at the start of each season, similar to Clash Royale's trophy reset.

---

## 5. Anti-Manipulation

### Sandbagging prevention (intentionally staying low)

**Problem**: A player with $50B net worth could theoretically dump resources to drop to Suborbital ($0-$500M) and dominate that bracket.

**Countermeasures**:

1. **Peak net worth tracking**: Store the player's all-time peak net worth. League assignment uses `max(currentNetWorth, peakNetWorth * 0.5)`. A player who once reached $50B can never drop below the league corresponding to $25B, regardless of how much they spend.

2. **Rate-of-decline detection**: If a player's net worth drops more than 50% in a single week without a prestige reset, flag the account for review. Legitimate crashes (market collapse, bad trades) rarely cause this magnitude of loss.

3. **Minimum league based on account age / game year**: Players who have reached game year 2040+ (indicating substantial playtime) cannot be in Suborbital or Low Orbit leagues regardless of net worth. This is a soft floor based on progression.

### Inactive player handling

- Players who don't sync for 7+ real days are removed from active brackets and marked "inactive."
- Inactive players don't count toward bracket size (so active brackets always have close to 50 active participants).
- When an inactive player returns and syncs, they're placed into a bracket matching their current net worth in the next weekly cycle.
- Inactive players lose no net worth or progress — they simply aren't competing during their absence.

### Prestige reset handling

- Prestige resets net worth to the starting amount, but the player's **peak net worth** record is preserved.
- Post-prestige players are placed in a bracket matching their current (reset) net worth, but with a "Prestige" badge visible to other players.
- Their minimum league floor (from peak net worth tracking) is reduced by 2 leagues per prestige, so they can re-experience the climb without being stuck in endgame brackets with starter resources.

---

## 6. Database Design

### New Prisma models needed

**LeagueSeason** — tracks the current and historical seasons:

```prisma
model LeagueSeason {
  id           String   @id @default(cuid())
  seasonNumber Int      @unique
  weekNumber   Int                          // week within the season (1-12)
  metricSlug   String                       // "net_worth_growth", "trade_volume", etc.
  startsAt     DateTime
  endsAt       DateTime
  isActive     Boolean  @default(false)
  createdAt    DateTime @default(now())

  brackets     LeagueBracket[]

  @@index([isActive])
  @@index([startsAt])
}
```

**LeagueBracket** — a group of ~50 players in a league for one week:

```prisma
model LeagueBracket {
  id           String        @id @default(cuid())
  seasonId     String
  season       LeagueSeason  @relation(fields: [seasonId], references: [id])
  league       Int                          // 1-8 (Suborbital through Galactic)
  bracketIndex Int                          // multiple brackets per league
  createdAt    DateTime      @default(now())

  entries      LeagueBracketEntry[]

  @@unique([seasonId, league, bracketIndex])
  @@index([seasonId])
  @@index([league])
}
```

**LeagueBracketEntry** — one player's participation in a weekly bracket:

```prisma
model LeagueBracketEntry {
  id              String        @id @default(cuid())
  bracketId       String
  bracket         LeagueBracket @relation(fields: [bracketId], references: [id], onDelete: Cascade)
  profileId       String
  profile         GameProfile   @relation(fields: [profileId], references: [id], onDelete: Cascade)

  startValue      Float         // metric value at week start (snapshot)
  currentValue    Float         // latest metric value
  score           Float         // computed: delta or % change
  rank            Int           @default(0)

  promoted        Boolean       @default(false)
  demoted         Boolean       @default(false)
  shielded        Boolean       @default(false) // promotion shield active

  rewardClaimed   Boolean       @default(false)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@unique([bracketId, profileId])
  @@index([bracketId, score])
  @@index([profileId])
}
```

**PlayerLeagueProfile** — persistent league data per player:

```prisma
model PlayerLeagueProfile {
  id              String      @id @default(cuid())
  profileId       String      @unique
  profile         GameProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  currentLeague   Int         @default(1)     // 1-8
  peakLeague      Int         @default(1)     // highest league ever reached
  peakNetWorth    Float       @default(0)     // all-time peak for anti-sandbagging
  promotionShield Boolean     @default(false) // immune to demotion this week
  consecutiveLow  Int         @default(0)     // weeks in bottom 10 (for demotion buffer)
  seasonPoints    Int         @default(0)     // league points this 12-week season
  totalWeeksPlayed Int        @default(0)

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([currentLeague])
  @@index([peakNetWorth])
}
```

### Efficient bracket computation

**Weekly bracket assignment job** (runs at Monday 00:00 UTC via cron or scheduled Railway job):

1. Query all active players (`lastSyncAt` within last 14 days) with their `PlayerLeagueProfile`.
2. Group players by `currentLeague` (1-8).
3. Within each league, shuffle the list randomly, then chunk into groups of 50.
4. For each chunk, create a `LeagueBracket` and 50 `LeagueBracketEntry` records.
5. Snapshot the current metric value into `startValue` for each entry.

This is a single batch operation, running once per week. With 1,000 players, it creates ~20 brackets (1000/50) with 1,000 entry records — trivial for PostgreSQL.

### PostgreSQL-first approach

Bracket standings computed on-demand:

```sql
SELECT profileId, score, RANK() OVER (ORDER BY score DESC) as rank
FROM "LeagueBracketEntry"
WHERE "bracketId" = $1
ORDER BY score DESC;
```

With only 50 rows per bracket, this is fast. The `@@index([bracketId, score])` on `LeagueBracketEntry` makes this query efficient. Add Redis sorted sets later only if needed at scale.

---

## 7. UI Design

### Where the leaderboard lives

The existing `LeaderboardPanel.tsx` component currently shows a flat ranked list with sort tabs. The tiered system should:

1. **Replace the existing LeaderboardPanel** with a new `LeaguePanel` component that becomes the primary competitive view.
2. **Access point**: The existing leaderboard tab/button in the game UI stays in the same location.
3. **Add a persistent league badge** to the game HUD (top bar), showing the player's current league icon and rank within their bracket. Tapping it opens the full LeaguePanel.

### LeaguePanel layout (mobile-first, matching existing dark theme)

**Section 1: League banner (top)**
- Full-width banner showing current league name, icon, and tier color.
- League colors: Suborbital (gray), Low Orbit (green), Geostationary (blue), Lunar (silver), Interplanetary (red/Mars), Deep Space (purple), Stellar (gold), Galactic (animated rainbow/prismatic).
- Progress bar showing distance to next league's net worth threshold.
- "Season 3, Week 7" label with countdown timer to week end.

**Section 2: This week's metric (below banner)**
- Card showing: "This Week's Challenge: Trade Volume"
- Your current score and delta from start.
- Small preview: "Next Week: Buildings Completed"

**Section 3: Your bracket (main content)**
- Scrollable list of 50 players, matching the existing table style.
- **Promotion zone** (ranks 1-5): Highlighted with green left border and upward arrow icon.
- **Safe zone** (ranks 6-45): Default styling.
- **Danger zone** (ranks 46-50): Highlighted with red left border and downward arrow icon.
- The current player's row is highlighted with cyan (matching existing `bg-cyan-500/5` style).
- Each row shows: rank, company name, alliance tag, metric score, delta indicator.
- Online indicator (green dot) using the existing `isOnline` logic from `lastSyncAt`.

**Section 4: League overview (collapsible)**
- Horizontal scrollable row of all 8 league icons.
- Current league highlighted.
- Tapping a league shows: number of players, top 3 companies, one-time unlock reward.

### Making rank changes feel exciting

1. **Live rank updates**: When a sync comes back and your rank changed, the row animates — slides up or down to new position with a smooth CSS transition.

2. **Promotion celebration**: Full-screen modal with league emblem scaling up with glow effect, "PROMOTED TO LUNAR LEAGUE" text, cosmetic reward display, and confetti/particle effect.

3. **Demotion notification**: Subtle toast notification: "Demoted to Geostationary League. Climb back next week!"

4. **Rank-up micro-animations**: "+1" floats up when you overtake someone. Subtle red flash when someone overtakes you.

5. **Weekly summary notification**: "You finished 12th in your bracket. +100K reward. Your league: Interplanetary (no change)."

---

## Implementation Priority

**Phase 1 (MVP)**: `PlayerLeagueProfile` model, league assignment based on net worth thresholds, weekly brackets of 50, single metric (net worth growth), basic standings view in existing LeaderboardPanel.

**Phase 2**: Full metric rotation, promotion/demotion logic with shields, promotion celebration UI, league milestone cosmetics.

**Phase 3**: Seasonal resets, anti-sandbagging peak tracking, alliance league standings, seasonal cosmetic track.

---

## Research References

- [How to Design Leaderboards for Your Mobile Game - Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/leaderboards)
- [Climbing the Ranks: A Guide to Leaderboards in Mobile Gaming - Ratic](https://www.linkedin.com/pulse/climbing-ranks-guide-leaderboards-mobile-gaming-ratic)
- [How Leaderboards Impact Player Retention - Adrian Crook](https://adriancrook.com/how-leaderboards-impact-player-retention/)
- [Promotion and Demotion Contests - ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0167268124000106)
- [Placements, Promotions, Demotions, and Decay - League of Legends](https://support-leagueoflegends.riotgames.com/hc/en-us/articles/4405783687443)
- [Chess.com Leagues - Compete to Advance](https://www.chess.com/leagues)
- [Clash Royale Trophies - Fandom Wiki](https://clashroyale.fandom.com/wiki/Trophies)
- [Redis Leaderboards - Redis.io](https://redis.io/solutions/leaderboards/)
- [Leaderboard System Design - SystemDesign.one](https://systemdesign.one/leaderboard-system-design/)
