# Space Tycoon: Competitive Multiplayer Implementation Plan

> **Goal**: Add meaningful competition between players without frustrating losers or requiring real-time play. All mechanics are async-compatible and scale across progression levels.

---

## Implementation Status

| # | Mechanic | Priority | Status | Design Doc | Est. Effort |
|---|---------|----------|--------|-----------|-------------|
| 1 | Tiered/Bracketed Leaderboards | P1 | 🟢 Designed | [tiered-leaderboards.md](design/tiered-leaderboards.md) | 8 weeks (7 phases) |
| 2 | Ghost/Shadow Rivals | P1 | 🟢 Designed | [GHOST-SHADOW-RIVALS-DESIGN.md](design/GHOST-SHADOW-RIVALS-DESIGN.md) | 6 weeks (6 phases) |
| 3 | Contract Bidding System | P1 | 🟢 Designed | [contract-bidding-system.md](design/contract-bidding-system.md) | 4-5 weeks (6 phases) |
| 4 | Seasonal Event Competitions | P2 | 🟢 Designed | [SEASONAL-EVENT-COMPETITIONS-DESIGN.md](SEASONAL-EVENT-COMPETITIONS-DESIGN.md) | 13-16 weeks (5 phases) |
| 5 | Alliance Cooperative Competition | P2 | 🟢 Designed | [ALLIANCE-COOPERATIVE-COMPETITION-DESIGN.md](ALLIANCE-COOPERATIVE-COMPETITION-DESIGN.md) | 4 weeks (4 phases) |
| 6 | Player-Driven Marketplace | P2 | 🟢 Designed | [PLAYER-DRIVEN-MARKETPLACE-DESIGN.md](PLAYER-DRIVEN-MARKETPLACE-DESIGN.md) | 4 phases |
| 7 | Territory/Zone Influence | P3 | 🟢 Designed | [TERRITORY-ZONE-INFLUENCE-DESIGN.md](TERRITORY-ZONE-INFLUENCE-DESIGN.md) | 4 weeks (4 phases) |
| 8 | Prestige Speed Runs | P3 | 🟢 Designed | [PRESTIGE-SPEED-RUNS-DESIGN.md](PRESTIGE-SPEED-RUNS-DESIGN.md) | 10 weeks (5 phases) |
| 9 | Economic Espionage (Soft PvP) | P3 | 🟢 Designed | [economic-espionage.md](designs/economic-espionage.md) | 8 weeks (4 phases) |
| 10 | Cooperative Mega-Projects | P3 | 🟢 Designed | [cooperative-mega-projects.md](design/cooperative-mega-projects.md) | 4-5 weeks (7 phases) |

---

## Design Principles (Apply to ALL Mechanics)

1. **Never take things away** — Losing = fewer bonus rewards, not lost resources
2. **Percentage-based metrics** — Compete on growth rate, not absolute size
3. **Participation rewards** — Everyone gets something, top players get more
4. **Rotate opponents** — Prevent the same player dominating repeatedly
5. **Multiple categories** — New players can win "fastest growing" while veterans win "largest empire"
6. **Notification-driven** — "Your rival just passed you!" drives re-engagement
7. **Async-first** — All mechanics work without simultaneous online play

---

## Recommended Implementation Order

### Wave 1 — Core Competition (P1)

**Mechanic 1: Tiered/Bracketed Leaderboards** — Start here. Foundation for all competitive systems.
- 8 named leagues (Suborbital through Galactic) with brackets of 50 players
- 10 rotating weekly metrics (net worth growth, revenue, buildings, research, trade volume, etc.)
- Promotion/demotion with shields, anti-sandbagging (peak net worth tracking)
- 4 new Prisma models: LeagueSeason, LeagueBracket, LeagueBracketEntry, PlayerLeagueProfile
- Cosmetic rewards + modest cash, no stat boosts

**Mechanic 2: Ghost/Shadow Rivals** — Builds on leaderboard infrastructure.
- 3-5 rival companies matched by composite power score (CPS)
- Rivalry score tug-of-war (0-100) with 4-hour snapshots
- 10 notification types with frequency limits
- Weekly rotation with no-rematch-within-4-weeks rule
- 3 new Prisma models: RivalAssignment, RivalSnapshot, RivalEvent

### Wave 2 — Competitive Depth (P1-P2)

**Mechanic 3: Contract Bidding System** — Adds competitive economy.
- Sealed-bid reverse auction format (async-friendly)
- 7 contract types across 4 tiers with collateral system
- Quality-weighted evaluation (70% price, 15% reputation, 15% speed)
- 6 anti-whale mechanisms including escalating collateral
- 3 new Prisma models: BiddingContract, ContractBid, BidHistory

**Mechanic 5: Alliance Cooperative Competition** — Makes alliances meaningful.
- 10 alliance event types (sprints, challenges, mega-events)
- Per-capita scoring for fairness across alliance sizes
- 6 shared mega-projects ($50B-$500B each)
- 5-tier Alliance Power bracket system
- 6 new tables + 2 table modifications

### Wave 3 — Engagement Systems (P2)

**Mechanic 6: Player-Driven Marketplace** — Deepens economic gameplay.
- Hybrid NPC + player order book with batch matching
- Limit orders, price history, candlestick charts, alerts
- 2% transaction fee as anti-manipulation + currency sink
- Progressive disclosure (simple default, "Advanced" tab)
- 5 new tables: MarketLimitOrder, MarketFill, MarketPriceCandle, MarketAlert, MarketAuditLog

**Mechanic 4: Seasonal Event Competitions** — Major content driver.
- 28-day seasons with fresh-start EventGameState (isolated from main game)
- 5 themed seasons with unique mechanics (Asteroid Rush, Mars Colony Race, etc.)
- 50-tier Season Pass (free + Pro tracks)
- Level-scaled brackets (5 tiers by net worth)
- 6+ new Prisma models

### Wave 4 — Advanced Systems (P3)

**Mechanic 7: Territory/Zone Influence** — Adds strategic layer.
- Soft percentage-based influence (not lockouts)
- 8 major zones with 3-4 sub-zones, 72-hour governance challenges
- Governor benefits: 2% tax, +5% service bonus, naming rights
- Anti-monopoly: diminishing returns, multi-zone penalty, 60% cap
- 5 new Prisma models

**Mechanic 8: Prestige Speed Runs** — Extends prestige system.
- 15 trackable milestones from first building to Jupiter access
- 4 prestige brackets (Rookie P1-3 through Grandmaster P11+)
- Wall-clock timers with server-side validation
- Weekly challenge rotation with hall of fame
- 6 new Prisma models

### Wave 5 — Endgame & PvP (P3)

**Mechanic 9: Economic Espionage** — Soft PvP layer.
- 11 espionage actions with costs, success rates, cooldowns
- 10-level corporate security system ($15M-$577M upgrade path)
- Workforce loyalty (0-100) with poaching resistance
- 8 hard-coded prohibitions ensuring targets never lose anything
- 18 espionage research items across 5 tiers
- 6 new Prisma models

**Mechanic 10: Cooperative Mega-Projects** — Galaxy-scale endgame.
- One project active for all players/alliances simultaneously
- 4 projects: Space Elevator, Generation Ship, Dyson Sphere, Interstellar Probe
- Multi-phase with escalating resource rarity
- Permanent game-world bonuses upon completion
- Alliance + individual contribution leaderboards
- 6 new Prisma models

---

## Mechanic 1: Tiered/Bracketed Leaderboards

**Concept**: Players grouped by progression level, competing weekly on specific metrics within their bracket.

**Leagues**: Suborbital ($0) → Low Orbit ($500M) → Geostationary ($2B) → Lunar ($10B) → Interplanetary ($50B) → Deep Space ($200B) → Stellar ($750B) → Galactic ($2T+)

**Weekly Metrics (rotate)**: Net worth growth %, revenue, buildings completed, research completed, trade volume, bounties fulfilled, locations unlocked, ships deployed, resource stockpile growth %, alliance contribution.

**Rewards**: Cosmetic-only unique rewards (badges, titles, ship skins). Modest cash (500K 1st place). Participation = 25K + 1 league point. No stat boosts.

**Key Mechanics**: 50-player brackets, top 5 promote, bottom 5 demote, promotion shield, peak net worth anti-sandbagging, 12-week seasonal resets.

**Full Design**: See [design/tiered-leaderboards.md](design/tiered-leaderboards.md)

---

## Mechanic 2: Ghost/Shadow Rivals

**Concept**: Match each player with 3-5 "rival" companies at similar size. Show their stats. Try to outpace them.

**Matching**: Composite Power Score (CPS) with logarithmic net worth normalization, 30% CPS band, diversity scoring.

**Rivalry Score**: Tug-of-war 0-100, max ±3 movement per 4-hour snapshot, 5 weighted metrics (net worth growth, buildings, research, services, locations).

**Anti-Gaming**: Peak net worth tracking (15% floor), decline detection (30% drop flag), smurf detection with additive CPS boosts.

**Full Design**: See [design/GHOST-SHADOW-RIVALS-DESIGN.md](design/GHOST-SHADOW-RIVALS-DESIGN.md)

---

## Mechanic 3: Contract Bidding System

**Concept**: Shared contracts appear on a market board. Players submit sealed bids. Quality-weighted evaluation determines winner.

**Format**: Sealed-bid, first-price reverse auction. 7 contract types (Satellite Deployment, Resource Delivery, Station Construction, Fleet Transport, Research Partnership, Emergency Supply, Mining Rights Lease).

**Anti-Gaming**: 3 concurrent bid limit, tier restrictions, per-tier cooldown, escalating collateral (5-15%), 40% alliance cap, newcomer protected pool.

**Reputation**: Exponential moving average reliability (0.00-1.00) feeding into composite bid evaluation.

**Full Design**: See [design/contract-bidding-system.md](design/contract-bidding-system.md)

---

## Mechanic 4: Seasonal Event Competitions

**Concept**: 28-day themed events with separate EventGameState. All players start from zero.

**5 Seasons**: Asteroid Rush (mining), Mars Colony Race (building), Solar Storm Crisis (energy), Helium-3 Gold Rush (outer system), Fleet Command (fleet building). Each with unique temporary mechanic.

**Structure**: 50-tier Season Pass (free + Pro tracks), 5 player brackets by net worth, 3 SP channels (daily challenges, weekly milestones, season objectives).

**Economy**: Event Tokens as persistent meta-currency. Average 4,500/event, top players ~12,000. Shop with cosmetics, boosts, prestige points.

**Full Design**: See [SEASONAL-EVENT-COMPETITIONS-DESIGN.md](SEASONAL-EVENT-COMPETITIONS-DESIGN.md)

---

## Mechanic 5: Alliance Cooperative Competition

**Concept**: Alliances compete collectively against other alliances on shared goals.

**Existing Infrastructure**: Alliance system already built (create/join/leave, bonuses, member roster).

**Events**: 10 types — 5 sprints (weekly), 3 challenges (bi-weekly), 2 mega-events (monthly). Per-capita scoring with minimum total thresholds.

**Shared Projects**: 6 mega-projects from $50B to $500B. Revenue split: 60% contributors, 30% treasury, 10% equal.

**Alliance Power**: 5-tier bracket system with stacking bonuses up to +12% revenue, +8% mining, +5% research, +3% build speed.

**Full Design**: See [ALLIANCE-COOPERATIVE-COMPETITION-DESIGN.md](ALLIANCE-COOPERATIVE-COMPETITION-DESIGN.md)

---

## Mechanic 6: Player-Driven Marketplace Enhancement

**Concept**: Expand market with player-set prices, supply/demand dynamics, order books.

**Model**: Hybrid NPC + player order book. NPC Market Makers with 20% spread as liquidity floor. Batch matching on 60-second sync cycle.

**Features**: Limit orders, market orders, price history with OHLCV candlesticks, configurable price alerts, order book depth visualization.

**Anti-Manipulation**: 2% transaction fee (wash trading prevention + currency sink), order size caps, rate limiting.

**Full Design**: See [PLAYER-DRIVEN-MARKETPLACE-DESIGN.md](PLAYER-DRIVEN-MARKETPLACE-DESIGN.md)

---

## Mechanic 7: Territory/Zone Influence

**Concept**: Players earn soft, percentage-based influence in solar system zones through economic activity.

**Zones**: 8 major zones (LEO through Outer System) with 3-4 sub-zones each.

**Influence Sources**: Building (30%), Services (30%), Mining (20%), Research (10%), Contracts (10%).

**Governance**: Governor earns 2% zone tax, +5% service bonus, naming rights, exclusive contracts. 72-hour challenge period with defender advantage.

**Anti-Monopoly**: Logarithmic diminishing returns above 500 IP, 60% max share, multi-zone penalty (up to -50%), challenger bonus (+25%).

**Full Design**: See [TERRITORY-ZONE-INFLUENCE-DESIGN.md](TERRITORY-ZONE-INFLUENCE-DESIGN.md)

---

## Mechanic 8: Prestige Speed Runs

**Concept**: Timed competitions for fastest progression after a prestige reset.

**Milestones**: 15 trackable milestones from first building (~5 min) to Jupiter access (~days).

**Brackets**: Rookie (P1-3), Veteran (P4-6), Elite (P7-10), Grandmaster (P11+).

**Tracking**: Wall-clock timers, server-side validation via existing 30-second sync, anti-cheat suspicion scoring.

**Rewards**: Cash, legacy points, temporary titles, earnable cosmetics, speed boost tokens. Weekly challenge rotation with hall of fame.

**Full Design**: See [PRESTIGE-SPEED-RUNS-DESIGN.md](PRESTIGE-SPEED-RUNS-DESIGN.md)

---

## Mechanic 9: Economic Espionage (Soft PvP)

**Concept**: Intelligence-gathering and economic maneuvering. **Strictly soft PvP** — 8 hard-coded prohibitions ensure targets never lose money, resources, buildings, workers, or anything material.

**Actions**: 11 espionage actions (scout, market spy, tech probe, workforce intel, contract snipe, disinformation, etc.). 3/day cap.

**Defense**: 10-level corporate security system ($15M-$577M). Workforce loyalty (0-100). Counter-espionage detection, tracing, false intel feeding.

**Tech Tree**: 18 espionage-specific research items (10 offense, 8 defense) across 5 tiers.

**Alliance Ops**: 3 alliance-level operations against rival alliances.

**Full Design**: See [designs/economic-espionage.md](designs/economic-espionage.md)

---

## Mechanic 10: Cooperative Mega-Projects

**Concept**: Galaxy-wide projects where all players/alliances contribute simultaneously. One project active at a time.

**Projects**: Space Elevator (30d, -15% launch costs), Generation Ship (60d, +10% revenue), Dyson Sphere (90d, +25% mining), Interstellar Probe (45d, +20% research speed).

**Contributions**: Resources + cash converted to Mega-Project Points (MPP). Small contributor bonus (2x for players under 0.01%). Multi-phase with escalating rarity.

**Competition**: Alliance leaderboard (total + per-capita MPP) + individual leaderboard. 7 individual contribution tiers (Supporter through Galactic Founder).

**Failure**: Soft failure — auto 14-day extension if 50%+ complete. Tier rewards kept regardless.

**Full Design**: See [design/cooperative-mega-projects.md](design/cooperative-mega-projects.md)

---

## Database Impact Summary

| Mechanic | New Tables | Modified Tables |
|----------|-----------|----------------|
| 1. Leaderboards | 4 (LeagueSeason, LeagueBracket, LeagueBracketEntry, PlayerLeagueProfile) | GameProfile |
| 2. Rivals | 3 (RivalAssignment, RivalSnapshot, RivalEvent) | GameProfile |
| 3. Contract Bidding | 3 (BiddingContract, ContractBid, BidHistory) | GameProfile |
| 4. Seasonal Events | 6+ (Season, SeasonChallenge, PlayerSeason, etc.) | GameProfile |
| 5. Alliance Competition | 6 (AllianceEvent, AllianceEventScore, AllianceProject, etc.) | Alliance, AllianceMember |
| 6. Marketplace | 5 (MarketLimitOrder, MarketFill, MarketPriceCandle, MarketAlert, MarketAuditLog) | — |
| 7. Territory | 5 (Zone, ZoneInfluence, GovernanceChallenge, etc.) | — |
| 8. Prestige Runs | 6 (SpeedRunChallenge, SpeedRunAttempt, etc.) | GameProfile |
| 9. Espionage | 6 (EspionageProfile, EspionageMission, IntelReport, etc.) | GameProfile |
| 10. Mega-Projects | 6 (MegaProject, MegaProjectContribution, etc.) | GameProfile, Alliance |
| **Total** | **~50 new tables** | **GameProfile (all), Alliance (3), AllianceMember (1)** |

---

*Last updated: 2026-03-23*
