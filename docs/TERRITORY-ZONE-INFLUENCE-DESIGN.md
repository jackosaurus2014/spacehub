# Territory/Zone Influence System — Design Document

> **Status**: Design Phase (no code yet)
> **Priority**: P3 (per COMPETITIVE-MULTIPLAYER-PLAN.md, Mechanic #7)
> **Estimated Effort**: 3-4 weeks implementation
> **Last Updated**: 2026-03-23
> **Depends on**: GameProfile, Alliance, ColonyClaim, PlayerActivity models (all exist)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Existing Infrastructure](#2-existing-infrastructure)
3. [Zone & Sub-Zone Definitions](#3-zone--sub-zone-definitions)
4. [Influence Point System](#4-influence-point-system)
5. [Zone Control Mechanics](#5-zone-control-mechanics)
6. [Contestation Mechanics](#6-contestation-mechanics)
7. [Benefits of Zone Control](#7-benefits-of-zone-control)
8. [Decay System](#8-decay-system)
9. [Alliance Zone Influence](#9-alliance-zone-influence)
10. [Anti-Monopoly Measures](#10-anti-monopoly-measures)
11. [Database Schema](#11-database-schema)
12. [API Endpoints](#12-api-endpoints)
13. [UI Design](#13-ui-design)
14. [Notification Triggers](#14-notification-triggers)
15. [Implementation Phases](#15-implementation-phases)
16. [Research References](#16-research-references)

---

## 1. Executive Summary

Territory/Zone Influence adds a persistent, async-compatible layer of soft territorial control to Space Tycoon. Players earn **Influence Points (IP)** in each solar system zone through economic activity — building, mining, running services, completing research, and fulfilling contracts. The player (or alliance) with the highest influence share in a zone earns the **Governor** title and receives tangible benefits: naming rights, a small tax on other players' zone revenue, exclusive contract access, and a prestige title.

This system differs from hard territory control (like EVE Online's sovereignty, where you own or lose a system outright). Instead, it uses **soft, percentage-based influence** inspired by Prosperous Universe's factional influence and Stellaris's claims system. No player ever loses access to a zone — even the Governor's benefits are modest bonuses, not lockouts. A challenger can always overtake the leader through sustained economic activity, and influence decays over time to prevent permanent lock-in.

### Design Principles (Inherited)

1. **Never take things away** — Losing influence means fewer bonus rewards, not restricted access
2. **Percentage-based metrics** — Compete on influence share, not absolute numbers
3. **Participation rewards** — Everyone with >1% influence gets a minor passive bonus
4. **Async-first** — All influence calculation is server-side, batched on sync
5. **Multiple categories** — Different activity types earn influence, rewarding diverse playstyles
6. **Anti-snowball** — Diminishing returns, decay, and challenger bonuses prevent permanent dominance

---

## 2. Existing Infrastructure

### Relevant Database Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `GameProfile` | Player game state | money, netWorth, buildingsData (JSON), activeServicesData (JSON), unlockedLocationsList, completedResearchList |
| `ColonyClaim` | Location occupancy | locationId, profileId, companyName |
| `Alliance` | Player groups | name, tag, leaderId, memberCount, totalNetWorth |
| `AllianceMember` | Membership | allianceId, profileId, role |
| `PlayerActivity` | Activity feed | type, title, metadata (JSON) |
| `GlobalMilestone` | First-to achievements | milestoneId, claimedById |

### Relevant Game State (Client-Side)

From `GameState` in `src/lib/game/types.ts`:
- `buildings: BuildingInstance[]` — each has `locationId` and `definitionId`
- `activeServices: ServiceInstance[]` — each has `locationId`
- `completedResearch: string[]`
- `resources: Record<string, number>`
- `completedContracts: string[]`

### Location System

From `src/lib/game/solar-system.ts`, 11 base locations + 14 expanded colony locations:
- `earth_surface`, `leo`, `geo`, `lunar_orbit`, `lunar_surface`, `mars_orbit`, `mars_surface`, `asteroid_belt`, `jupiter_system`, `saturn_system`, `outer_system`
- Plus: `mercury_surface`, `venus_orbit`, `ceres`, `vesta`, `io_surface`, `ganymede_surface`, `callisto_surface`, `enceladus_surface`, `rhea_orbit`, `titania_surface`, `miranda_surface`, `triton_surface`, `pluto_surface`, `eris_surface`

### Sync Cycle

Game state syncs to server approximately every 60 seconds. Influence calculation must be compatible with this async model.

---

## 3. Zone & Sub-Zone Definitions

### 3.1 Major Zones (8)

Each major zone maps to one or more game locations. Influence is tracked at the **zone** level, not individual locations, to keep the system comprehensible and to aggregate enough activity for meaningful competition.

| Zone ID | Zone Name | Locations Included | Tier | Typical Player Range |
|---------|-----------|-------------------|------|---------------------|
| `zone_leo` | Low Earth Orbit | `earth_surface`, `leo` | 1 | $100M - $5B |
| `zone_geo` | Geostationary Belt | `geo` | 1 | $500M - $10B |
| `zone_lunar` | Cislunar Space | `lunar_orbit`, `lunar_surface` | 2 | $2B - $50B |
| `zone_mars` | Mars System | `mars_orbit`, `mars_surface` | 3 | $10B - $200B |
| `zone_belt` | Asteroid Belt | `asteroid_belt`, `ceres`, `vesta` | 3 | $15B - $200B |
| `zone_jupiter` | Jupiter System | `jupiter_system`, `io_surface`, `ganymede_surface`, `callisto_surface` | 4 | $100B - $1T+ |
| `zone_saturn` | Saturn System | `saturn_system`, `enceladus_surface`, `rhea_orbit` | 4 | $200B - $1T+ |
| `zone_outer` | Outer System | `outer_system`, `titania_surface`, `miranda_surface`, `triton_surface`, `pluto_surface`, `eris_surface` | 5 | $500B - $1T+ |

**Design note**: `mercury_surface` and `venus_orbit` are included in `zone_leo` for simplicity (they are inner system locations typically unlocked by LEO-stage players). If the expanded colonies are not unlocked by a player, these sub-locations simply do not generate influence.

### 3.2 Sub-Zones (3-4 per Major Zone)

Sub-zones provide finer-grained competition within major zones. A player can be Governor of a major zone while another player dominates a specific sub-zone. Sub-zone governance is cosmetic only (naming rights and title) to keep complexity manageable.

| Major Zone | Sub-Zone ID | Sub-Zone Name | Activity Focus |
|-----------|-------------|---------------|----------------|
| **LEO** | `sub_leo_comms` | Communications Belt | Telecom satellites, broadband services |
| | `sub_leo_stations` | Station Cluster | Space stations, tourism, datacenter |
| | `sub_leo_observation` | Observation Ring | Sensor satellites, Earth observation |
| | `sub_leo_launch` | Launch Corridor | Launch pads, launch services |
| **GEO** | `sub_geo_comms` | GEO Comms Arc | GEO telecom satellites |
| | `sub_geo_monitoring` | Persistent Watch | GEO sensor satellites, monitoring |
| | `sub_geo_power` | Power Belt | Solar farms, power generation |
| **Lunar** | `sub_lunar_mining` | Shackleton Basin | Lunar ice mining, propellant |
| | `sub_lunar_habitats` | Settlement Zone | Habitats, tourism, fabrication |
| | `sub_lunar_gateway` | Orbital Gateway | Lunar orbital station, relay |
| **Mars** | `sub_mars_mining` | Hellas Extraction | Mars mining, resource extraction |
| | `sub_mars_colony` | Olympus Settlement | Habitats, tourism, fabrication |
| | `sub_mars_orbital` | Deimos Station | Mars orbital station, data relay |
| **Belt** | `sub_belt_mining` | Ceres Fields | Asteroid mining operations |
| | `sub_belt_fabrication` | Belt Forge | Fabrication, manufacturing |
| | `sub_belt_station` | Belt Waystation | Stations, logistics hub |
| **Jupiter** | `sub_jupiter_europa` | Europa Abyss | Europa subsurface mining |
| | `sub_jupiter_ganymede` | Ganymede Colony | Habitats, stations |
| | `sub_jupiter_station` | Jove Station | Jupiter system station, datacenter |
| **Saturn** | `sub_saturn_titan` | Titan Lakes | Titan hydrocarbon mining |
| | `sub_saturn_enceladus` | Enceladus Geysers | Water/organic mining |
| | `sub_saturn_station` | Kronos Hub | Saturn system station |
| **Outer** | `sub_outer_kuiper` | Kuiper Mining | Deep space resource extraction |
| | `sub_outer_relay` | Deep Space Network | Relay stations, outposts |
| | `sub_outer_frontier` | The Frontier | Exploration, survey operations |

**Sub-zone mapping**: Each building/service is assigned to a sub-zone based on its `category` and `locationId`. The mapping is defined in a static lookup table:

```
Building category → Sub-zone mapping:
  satellite (telecom) at LEO → sub_leo_comms
  satellite (sensor) at LEO → sub_leo_observation
  space_station at LEO → sub_leo_stations
  datacenter at LEO → sub_leo_stations
  launch_pad at earth_surface → sub_leo_launch
  ground_station at earth_surface → sub_leo_launch
  mining_* at lunar_surface → sub_lunar_mining
  habitat_* at lunar_surface → sub_lunar_habitats
  space_station at lunar_orbit → sub_lunar_gateway
  ... (full mapping in implementation)
```

---

## 4. Influence Point System

### 4.1 Influence Sources

Influence is earned through **active economic participation** in a zone. Five categories of activity contribute, each weighted to reward different play styles.

| Category | Weight | Description | Rationale |
|----------|--------|-------------|-----------|
| **Building** | 30% | Completed buildings in the zone | Capital investment shows commitment |
| **Services** | 30% | Active services generating revenue in the zone | Ongoing operations matter most |
| **Mining** | 20% | Resources extracted from zone locations | Economic extraction |
| **Research** | 10% | Research unlocking zone-relevant buildings/services | Technology investment |
| **Contracts** | 10% | Contracts completed referencing zone locations | Commercial reputation |

### 4.2 Influence Point Formulas

All influence is calculated **server-side** during each sync (every 60 seconds). The server reads the player's current `buildingsData`, `activeServicesData`, etc. from `GameProfile` and computes influence.

#### Building Influence

```
building_ip = SUM(for each completed building in zone):
    base_ip = building_tier * BUILDING_TIER_MULTIPLIER
    upgrade_bonus = (upgradeLevel or 0) * 0.25 * base_ip
    (base_ip + upgrade_bonus)
```

| Building Tier | BUILDING_TIER_MULTIPLIER | Base IP per Building |
|--------------|-------------------------|---------------------|
| Tier 1 | 10 | 10 |
| Tier 2 | 30 | 30 |
| Tier 3 | 80 | 80 |
| Tier 4 | 200 | 200 |
| Tier 5 | 500 | 500 |

**Example**: A player with 5 LEO telecom satellites (T1, 10 IP each) + 1 orbital outpost (T1, 10 IP) + 1 orbital datacenter (T1, 10 IP) = 70 building IP in zone_leo.

**Example**: A player with 1 Mars Orbital Station (T3, 80 IP, upgraded to level 2) = 80 + (2 * 0.25 * 80) = 120 building IP in zone_mars.

#### Service Influence

```
service_ip = SUM(for each active service in zone):
    net_revenue = revenuePerMonth - operatingCostPerMonth
    ip = net_revenue / SERVICE_REVENUE_DIVISOR
```

`SERVICE_REVENUE_DIVISOR = 500,000` (every $500K/month net revenue = 1 IP)

**Example**: LEO Broadband ($3.5M - $1.2M = $2.3M net) = 4.6 IP per service instance. A player running 5 LEO Broadband services = 23 IP.

**Example**: Orbital AI Compute ($12M - $4M = $8M net) = 16 IP. Mars Station Operations ($45M - $15M = $30M net) = 60 IP.

**Rationale**: Service revenue directly measures ongoing economic impact. The divisor normalizes so that early-game services (1-5 IP each) and late-game services (50-100 IP each) both contribute meaningfully at their respective zone tiers.

#### Mining Influence

```
mining_ip = SUM(for each mining building in zone):
    monthly_output_value = estimated_monthly_units * resource_base_price
    ip = monthly_output_value / MINING_REVENUE_DIVISOR
```

`MINING_REVENUE_DIVISOR = 1,000,000` (every $1M/month of mining output = 1 IP)

Mining influence is estimated from the building type and tier rather than tracking every individual mining action. This keeps it async-compatible.

| Mining Building | Estimated Monthly Value | IP |
|----------------|------------------------|-----|
| mining_lunar_ice | ~$11M (18M rev - 7M cost) | 11 |
| mining_mars | ~$22M | 22 |
| mining_asteroid | ~$32M | 32 |
| mining_europa | ~$75M | 75 |
| mining_titan | ~$105M | 105 |

#### Research Influence

Research influence is earned by completing technologies that unlock buildings/services in the zone. This is a one-time credit, not recurring.

```
research_ip = COUNT(completed research that unlocks zone-relevant buildings) * RESEARCH_IP_PER_TECH
```

`RESEARCH_IP_PER_TECH = 5` per relevant technology completed.

**Zone-research mapping** (examples):
- `zone_leo`: reusable_boosters, modular_spacecraft, rad_hard_processors, high_res_optical, triple_junction, autonomous_docking = up to 30 IP
- `zone_mars`: super_heavy_lift, ion_drives, resource_prospecting, regolith_processing, interplanetary_cruisers, edge_ai = up to 30 IP
- `zone_jupiter`: nuclear_thermal, interplanetary_cruisers, deep_drilling = up to 15 IP
- `zone_outer`: fusion_drive, generation_ships = up to 10 IP

#### Contract Influence

```
contract_ip = COUNT(completed contracts referencing zone locations) * CONTRACT_IP_PER_COMPLETION
```

`CONTRACT_IP_PER_COMPLETION`:
- Regular contract completed in zone: 5 IP
- Competitive contract completed in zone: 15 IP
- Timed event completed in zone: 3 IP

### 4.3 Total Influence Calculation

```
total_zone_ip = (building_ip * 1.0) + (service_ip * 1.0) + (mining_ip * 1.0)
                + (research_ip * 1.0) + (contract_ip * 1.0)
```

All categories are already weighted by their natural scaling. The divisors above ensure approximate balance: a mid-game player active in a zone should earn roughly 100-300 total IP; a late-game dominant player should reach 500-1000+ IP.

### 4.4 Influence Share

```
player_share_pct = (player_total_zone_ip / sum_of_all_players_zone_ip) * 100
```

This is the number that matters for governance. It is recalculated every sync cycle for all active players in the zone.

---

## 5. Zone Control Mechanics

### 5.1 Governance Thresholds

| Status | Requirement | Badge |
|--------|------------|-------|
| **Governor** | Highest influence share in zone AND >= 15% share | Gold crown icon |
| **Major Stakeholder** | Top 3 influence AND >= 8% share | Silver star icon |
| **Stakeholder** | >= 3% share | Bronze diamond icon |
| **Contributor** | >= 1% share | Copper circle icon |
| **Present** | Any influence > 0 | Gray dot icon |

**Why 15% minimum for Governor**: Prevents a player from becoming Governor with a tiny share in a zone where nobody else participates. You must demonstrate meaningful commitment. In a zone with 20 active players, the leader would naturally have around 15-25% if influence is somewhat distributed.

### 5.2 Governance Transition

Governance does NOT change instantly. To prevent rapid flip-flopping:

1. **Challenge Period**: When a non-Governor exceeds the Governor's influence share, a 72-hour (real-time) **Challenge Period** begins.
2. **During Challenge**: Both players see a "Governance Contested" banner. The challenger's share must remain higher than the Governor's for the full 72 hours.
3. **Transition**: If the challenger maintains the lead for 72 continuous hours, governance transfers. The new Governor is announced in the global activity feed.
4. **Defense**: The current Governor can increase their influence during the challenge period to fend off the challenger.
5. **Failed Challenge**: If the Governor regains the lead at any point during the 72 hours, the challenge timer resets.

**Rationale**: This mirrors EVE Online's sovereignty reinforcement timer concept, preventing "drive-by" governance claims from brief activity spikes. It rewards sustained investment over burst activity. The 72-hour window is long enough to allow defense but short enough that a determined challenger can succeed within a week.

### 5.3 Governance History

The system tracks all governance transitions for each zone, creating a historical record:

```
Zone: Mars System
Current Governor: Stellar Industries (since 2026-03-15)
Previous Governors:
  - Nova Aerospace (2026-02-01 to 2026-03-15)
  - Pioneer Corp (2026-01-10 to 2026-02-01)
```

This history feeds into achievements and the influence map visualization.

---

## 6. Contestation Mechanics

### 6.1 How Challengers Compete

Challengers increase their influence through the same activities that earn IP. There are no special "attack" mechanics. The contest is purely economic — whoever contributes more to the zone's economy earns more influence.

### 6.2 Challenger Bonus

To prevent permanent lock-in and encourage competition, non-Governor players earn a **Challenger Bonus** to their IP earnings in zones where they are not the Governor:

```
challenger_bonus_multiplier = 1.0 + (governor_share_pct - challenger_share_pct) * 0.005
```

**Capped at 1.25x** (25% bonus maximum).

**Examples**:
- Governor has 30% share, challenger has 10% share: bonus = 1.0 + (30 - 10) * 0.005 = 1.10x (+10%)
- Governor has 40% share, challenger has 5% share: bonus = 1.0 + (40 - 5) * 0.005 = 1.175x (+17.5%)
- Governor has 50% share, challenger has 2% share: bonus = 1.25x (capped at +25%)

**Rationale**: The bigger the gap between Governor and challenger, the larger the bonus. This creates a rubber-banding effect that makes dominant positions progressively harder to maintain and gives underdogs a reasonable path to competition. Inspired by Mario Kart's item distribution (trailing players get better items).

### 6.3 Contested Zone Events

When a governance challenge is active, special time-limited contracts appear for both the Governor and challenger:

| Contract | Reward | Available To |
|----------|--------|-------------|
| "Defend [Zone] Supremacy" | +50 IP bonus (one-time) | Current Governor |
| "Challenge [Zone] Leadership" | +50 IP bonus (one-time) | Active challenger(s) |
| "Zone Infrastructure Investment" | +2x building IP for 24h | All zone stakeholders |

These contracts encourage active engagement during contested periods without being so powerful that they decide the outcome on their own.

---

## 7. Benefits of Zone Control

### 7.1 Governor Benefits

The Governor of a zone receives the following benefits. All benefits are additive bonuses, never restrictions on other players.

| Benefit | Value | Details |
|---------|-------|---------|
| **Zone Tax Revenue** | 2% of all other players' service revenue in the zone | Passive income, paid by the game (NOT deducted from other players). Capped at $50M/month per zone. |
| **Naming Rights** | Custom zone name visible to all | Governor can set a custom display name (e.g., "Stellar Industries' LEO Domain"). Profanity-filtered. Resets on governance change. |
| **Exclusive Contracts** | 1 exclusive Governor contract per zone per week | High-value contracts only available to the Governor. Worth 2-5x normal contract rewards for that zone tier. |
| **Prestige Title** | "[Zone Name] Governor" title | Displayed on leaderboard and profile. Stacks with other titles. |
| **Service Revenue Bonus** | +5% to all service revenue in governed zone | Applied as a multiplier to the Governor's own services in that zone. |
| **Cosmetic Badge** | Zone-specific Governor badge | Unique badge icon next to company name. Different for each zone. |

### 7.2 Zone Tax Revenue Details

**Important**: Tax revenue is a game-generated bonus, not a tax deducted from other players. This follows the "never take things away" principle. The Governor earns bonus revenue proportional to the zone's total economic activity.

```
governor_tax_income = MIN(
    sum_of_other_players_service_net_revenue_in_zone * 0.02,
    ZONE_TAX_CAP
)
```

| Zone Tier | ZONE_TAX_CAP (per month) |
|-----------|-------------------------|
| Tier 1 (LEO, GEO) | $10M |
| Tier 2 (Lunar) | $25M |
| Tier 3 (Mars, Belt) | $50M |
| Tier 4 (Jupiter, Saturn) | $100M |
| Tier 5 (Outer) | $200M |

**Example**: If 10 players collectively earn $500M/month net service revenue in zone_mars, the Governor receives MIN($500M * 0.02, $50M) = $10M/month bonus income.

### 7.3 Stakeholder Benefits

Non-Governor players with significant influence still receive benefits:

| Status | Revenue Bonus | Other Benefits |
|--------|--------------|----------------|
| Major Stakeholder (top 3, >= 8%) | +3% service revenue in zone | Minor Stakeholder title, silver badge |
| Stakeholder (>= 3%) | +1.5% service revenue in zone | Stakeholder title |
| Contributor (>= 1%) | +0.5% service revenue in zone | Contributor title |
| Present (> 0%) | None | Visible on influence map |

### 7.4 Exclusive Governor Contracts

One exclusive contract spawns per zone per week, available only to the Governor. These use the existing `CompetitiveContract` format with `maxWinners: 1`.

**Examples by zone tier**:

**LEO Governor Contract** (Tier 1):
- "LEO Authority: Satellite Registration Program" — Deploy 3 additional satellites in LEO within 48 hours.
- Reward: $200M + 25 IP bonus

**Mars Governor Contract** (Tier 3):
- "Mars Authority: Surface Expansion Initiative" — Build 2 buildings on Mars Surface within 72 hours.
- Reward: $2B + 50 IP bonus + 100 titanium

**Jupiter Governor Contract** (Tier 4):
- "Jovian Authority: Europa Deep Survey" — Complete 1 survey expedition to Europa within 96 hours.
- Reward: $10B + 100 IP bonus + 20 exotic_materials

---

## 8. Decay System

Influence must decay over time to prevent permanent lock-in and to reward active players over inactive ones. The decay system is the primary anti-stagnation mechanic.

### 8.1 Base Decay Rate

```
daily_decay_rate = BASE_DECAY + INACTIVITY_DECAY
```

**BASE_DECAY**: All players lose 2% of their total zone IP per real-world day, regardless of activity. This means a player who stops playing entirely will lose half their influence in ~35 days.

```
ip_after_decay = ip_current * (1 - 0.02)  // Applied once per day
```

Half-life of influence with no activity: ~34 days (ln(0.5) / ln(0.98) = 34.3)

### 8.2 Inactivity Multiplier

Players who have not synced within the last 24 hours receive accelerated decay:

| Inactive Duration | Total Daily Decay Rate |
|------------------|----------------------|
| 0-24 hours (active) | 2% base only |
| 24-72 hours | 3% (base + 1% inactivity) |
| 3-7 days | 5% (base + 3% inactivity) |
| 7-14 days | 8% (base + 6% inactivity) |
| 14+ days | 12% (base + 10% inactivity) |

**Half-life by activity level**:
- Active player: ~34 days (but they're earning new IP constantly, so effective IP stays stable or grows)
- Inactive 1 week: ~13 days to half
- Inactive 2+ weeks: ~5.4 days to half

### 8.3 Activity Offset

Active players' new IP earnings naturally offset the 2% daily decay. A player who maintains their buildings and services in a zone will see their IP remain roughly stable or grow slightly, as long as they continue syncing regularly.

**Example**: A player with 500 IP in zone_mars loses 10 IP/day to base decay. If they are running Mars Mining ($22M value = 22 mining IP recalculated each sync), Mars Station Ops (60 service IP), and have 3 Mars buildings (80 + 80 + 30 = 190 building IP), their total recalculated IP will be well above 500, so the decay is offset by ongoing activity.

**Key insight**: IP is **recalculated from scratch each sync**, not accumulated. The "decay" applies to a **stored IP value** that blends with the recalculated value:

```
effective_ip = (recalculated_ip * 0.7) + (stored_ip_after_decay * 0.3)
```

This 70/30 blend means:
- Current activity dominates (70% weight), so removing a building immediately reduces influence
- Historical contribution has lasting effect (30% weight), so veterans retain some influence even during brief inactivity
- The stored component decays daily, so abandoning a zone eventually zeroes out the historical component

### 8.4 Governor Decay Protection

The Governor receives reduced decay as an incentive to maintain their position:

```
governor_decay_rate = base_decay * 0.5  // 1% per day instead of 2%
```

This gives the Governor a modest defensive advantage, extending the time a challenger needs to overtake them. Combined with the 72-hour challenge period, the Governor has a meaningful but not overwhelming positional advantage.

---

## 9. Alliance Zone Influence

### 9.1 Alliance Influence Aggregation

Alliance members' individual influence in a zone is aggregated to compute **Alliance Zone Influence**. This is separate from individual influence — both exist simultaneously.

```
alliance_zone_ip = SUM(member_zone_ip for all members) * ALLIANCE_SYNERGY_MULTIPLIER
```

**ALLIANCE_SYNERGY_MULTIPLIER**: Based on how many unique members have >= 1% individual influence in the zone.

| Active Members in Zone | Synergy Multiplier |
|----------------------|-------------------|
| 1 | 1.00x (no bonus) |
| 2-3 | 1.05x (+5%) |
| 4-5 | 1.10x (+10%) |
| 6-8 | 1.15x (+15%) |
| 9-12 | 1.20x (+20%) |
| 13-20 | 1.25x (+25% — max) |

**Rationale**: The synergy multiplier rewards alliances that coordinate members across zones, but is capped at 25% to prevent large alliances from being insurmountable. The bonus is modest enough that a skilled individual can still compete against a small alliance.

### 9.2 Alliance Governance

If an alliance's combined influence exceeds any individual player's influence in a zone, the alliance can claim **Alliance Governance**. This requires:

1. The alliance leader (or an officer) explicitly activates "Claim Zone Governance" for the zone.
2. The alliance's combined IP must be the highest entity (individual or alliance) in the zone for the full 72-hour challenge period.
3. The alliance leader designates one member as the **Zone Steward** who receives the naming rights and title.

**Alliance Governor Benefits** (distributed):
- Zone tax revenue is split among contributing members proportional to their individual IP share within the alliance
- Service revenue bonus (+5%) applies to ALL alliance members with influence in the zone
- Exclusive contracts are available to all alliance members (first to complete gets the reward)
- The Zone Steward receives the title and naming rights

### 9.3 Alliance vs. Individual Governance

Individual players and alliances compete on the same leaderboard. This creates interesting dynamics:

- A solo player with massive investment in a single zone can outcompete a diffuse alliance
- An alliance with coordinated members can outcompete any individual in zones where the alliance has depth
- Alliances can choose to focus on different zones, creating spheres of influence

---

## 10. Anti-Monopoly Measures

### 10.1 Multi-Zone Governance Penalty

A player (or alliance) governing multiple zones simultaneously receives diminishing influence in each zone:

```
effective_ip = raw_ip * governance_penalty_multiplier

governance_penalty_multiplier:
  1 zone governed: 1.00x (no penalty)
  2 zones governed: 0.90x (-10% to all zones)
  3 zones governed: 0.80x (-20%)
  4 zones governed: 0.65x (-35%)
  5+ zones governed: 0.50x (-50%)
```

**Rationale**: A player governing 3 zones simultaneously has their influence reduced by 20% in ALL zones, making it easier for focused challengers to overtake them in any single zone. This prevents a single mega-player from governing the entire solar system.

### 10.2 Influence Soft Cap (Diminishing Returns)

Individual influence in any zone is subject to logarithmic diminishing returns above a threshold:

```
if raw_ip <= 500:
    effective_ip = raw_ip
else:
    effective_ip = 500 + 200 * ln(raw_ip / 500)
```

**Examples**:
| Raw IP | Effective IP | Marginal Return |
|--------|-------------|----------------|
| 100 | 100 | 100% |
| 300 | 300 | 100% |
| 500 | 500 | 100% |
| 750 | 581 | 77% |
| 1000 | 639 | 64% |
| 2000 | 778 | 39% |
| 5000 | 960 | 19% |

This means doubling investment from 1000 to 2000 IP only increases effective IP from 639 to 778 (+22%). A challenger at 500 raw IP (= 500 effective) is much closer to the dominant player at 2000 raw IP (= 778 effective) than the raw numbers suggest.

### 10.3 Newcomer Boost

Players who first enter a zone (first building or service in the zone) receive a temporary influence boost:

```
newcomer_boost = 50 IP (flat bonus, decays over 14 days)
```

This ensures new entrants to a zone immediately appear on the influence map and have a foothold to build upon.

### 10.4 Maximum Influence Share Cap

No individual player or alliance can have more than **60% influence share** in any zone, regardless of their raw IP. Any excess is redistributed proportionally among other zone participants.

```
if player_share > 60%:
    excess = player_share - 60%
    player_share = 60%
    redistribute excess proportionally to all other players
```

**Rationale**: This guarantees that even in a zone dominated by one player, there is always room for competition. The remaining 40% of influence is meaningful enough to support multiple stakeholders.

---

## 11. Database Schema

### 11.1 New Prisma Models

```prisma
// ─── Zone Influence Tracking ──────────────────────────────────────────────────

// Per-player influence snapshot per zone — recalculated each sync
model ZoneInfluence {
  id                String      @id @default(cuid())
  profileId         String
  profile           GameProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  zoneId            String      // zone_leo, zone_geo, zone_lunar, etc.

  // Influence breakdown (stored for UI display)
  buildingIp        Float       @default(0)
  serviceIp         Float       @default(0)
  miningIp          Float       @default(0)
  researchIp        Float       @default(0)
  contractIp        Float       @default(0)
  totalIp           Float       @default(0)  // Sum of above (before modifiers)
  effectiveIp       Float       @default(0)  // After diminishing returns, penalties, bonuses
  influenceSharePct Float       @default(0)  // Percentage of zone total

  // Historical blend component (decays daily)
  storedIp          Float       @default(0)

  // Status
  status            String      @default("present") // present, contributor, stakeholder, major_stakeholder, governor

  updatedAt         DateTime    @updatedAt
  createdAt         DateTime    @default(now())

  @@unique([profileId, zoneId])
  @@index([zoneId, effectiveIp])
  @@index([zoneId, influenceSharePct])
  @@index([profileId])
}

// Zone governance state — one row per zone
model ZoneGovernance {
  id                  String      @id @default(cuid())
  zoneId              String      @unique  // zone_leo, zone_geo, etc.
  zoneName            String               // Display name (may be customized by Governor)
  defaultName         String               // Original name (for reset)

  // Current Governor
  governorProfileId   String?
  governorProfile     GameProfile? @relation("zoneGovernor", fields: [governorProfileId], references: [id], onDelete: SetNull)
  governorAllianceId  String?              // Set if alliance holds governance
  governorCompanyName String?
  governorSince       DateTime?
  governorSharePct    Float       @default(0)

  // Custom name set by Governor
  customName          String?

  // Tax revenue tracking
  taxRevenueThisMonth Float      @default(0)
  taxRevenueCap       Float      @default(10000000) // Set per zone tier

  // Active challenge
  challengerProfileId  String?
  challengerAllianceId String?
  challengeStartedAt   DateTime?
  challengerSharePct   Float      @default(0)

  updatedAt           DateTime    @updatedAt
  createdAt           DateTime    @default(now())

  @@index([governorProfileId])
}

// Zone governance history — log of all transitions
model ZoneGovernanceHistory {
  id                String   @id @default(cuid())
  zoneId            String
  profileId         String?  // Individual governor (null if alliance)
  allianceId        String?  // Alliance governor (null if individual)
  companyName       String
  customName        String?  // Name they set during tenure
  influenceSharePct Float
  governedFrom      DateTime
  governedUntil     DateTime?  // Null if current
  endReason         String?    // "challenged", "decayed", "voluntary", "multi_zone_penalty"

  createdAt         DateTime @default(now())

  @@index([zoneId, governedFrom])
  @@index([profileId])
  @@index([allianceId])
}

// Alliance zone influence — aggregated from members
model AllianceZoneInfluence {
  id                String   @id @default(cuid())
  allianceId        String
  alliance          Alliance @relation(fields: [allianceId], references: [id], onDelete: Cascade)
  zoneId            String

  totalIp           Float    @default(0)
  effectiveIp       Float    @default(0)
  influenceSharePct Float    @default(0)
  activeMemberCount Int      @default(0)  // Members with >= 1% individual share
  synergyMultiplier Float    @default(1.0)

  updatedAt         DateTime @updatedAt
  createdAt         DateTime @default(now())

  @@unique([allianceId, zoneId])
  @@index([zoneId, effectiveIp])
}

// Zone influence daily snapshots for history charts
model ZoneInfluenceSnapshot {
  id        String   @id @default(cuid())
  zoneId    String
  date      DateTime @db.Date  // One snapshot per day per zone
  data      Json     // Array of { profileId, companyName, effectiveIp, sharePct, status }
                     // Top 20 players stored, rest aggregated as "Others"

  @@unique([zoneId, date])
  @@index([zoneId, date])
}
```

### 11.2 Modifications to Existing Models

```prisma
// Add to GameProfile:
model GameProfile {
  // ... existing fields ...

  // Zone Influence
  zoneInfluences        ZoneInfluence[]
  governedZones         ZoneGovernance[]  @relation("zoneGovernor")
  zonesGoverned         Int               @default(0)  // Count for multi-zone penalty calc
}

// Add to Alliance:
model Alliance {
  // ... existing fields ...

  // Zone Influence
  zoneInfluences        AllianceZoneInfluence[]
}
```

### 11.3 Schema Size Estimate

| Table | Rows (500 players, 8 zones) | Growth Rate |
|-------|----------------------------|-------------|
| ZoneInfluence | ~4,000 (500 players * 8 zones max) | Steady (rewritten per sync) |
| ZoneGovernance | 8 (one per zone) | Static |
| ZoneGovernanceHistory | ~50-200 | Slow (only on transitions) |
| AllianceZoneInfluence | ~200 (25 alliances * 8 zones) | Steady (rewritten per sync) |
| ZoneInfluenceSnapshot | ~2,920/year (8 zones * 365 days) | Linear with time |

Total estimated table size after 1 year: ~10,000 rows across all tables. Very manageable.

---

## 12. API Endpoints

### 12.1 Read Endpoints

#### `GET /api/space-tycoon/zones`

Returns all zones with current governance and top influencers.

**Response**:
```json
{
  "zones": [
    {
      "zoneId": "zone_leo",
      "name": "Low Earth Orbit",
      "customName": "Stellar Industries' LEO Domain",
      "tier": 1,
      "governor": {
        "profileId": "clxyz...",
        "companyName": "Stellar Industries",
        "allianceTag": "[SOL]",
        "sharePct": 28.4,
        "since": "2026-03-15T00:00:00Z"
      },
      "challenge": null,
      "topInfluencers": [
        { "profileId": "clxyz...", "companyName": "Stellar Industries", "sharePct": 28.4, "status": "governor" },
        { "profileId": "clabc...", "companyName": "Nova Aerospace", "sharePct": 15.2, "status": "major_stakeholder" },
        { "profileId": "cldef...", "companyName": "Pioneer Corp", "sharePct": 9.1, "status": "major_stakeholder" }
      ],
      "totalParticipants": 42,
      "totalIp": 12450
    }
  ]
}
```

#### `GET /api/space-tycoon/zones/[zoneId]`

Returns detailed zone information including full influence breakdown, sub-zones, history.

**Response**:
```json
{
  "zone": {
    "zoneId": "zone_mars",
    "name": "Mars System",
    "tier": 3,
    "governor": { "..." },
    "challenge": {
      "challengerCompanyName": "Red Planet Inc",
      "startedAt": "2026-03-21T14:30:00Z",
      "challengerSharePct": 22.1,
      "governorSharePct": 21.8,
      "hoursRemaining": 48
    },
    "influencers": [
      {
        "profileId": "clxyz...",
        "companyName": "Stellar Industries",
        "allianceTag": "[SOL]",
        "sharePct": 21.8,
        "status": "governor",
        "breakdown": { "building": 190, "service": 120, "mining": 44, "research": 30, "contract": 25 }
      }
    ],
    "subZones": [
      { "subZoneId": "sub_mars_mining", "name": "Hellas Extraction", "topPlayer": "Red Planet Inc", "topSharePct": 35.2 },
      { "subZoneId": "sub_mars_colony", "name": "Olympus Settlement", "topPlayer": "Stellar Industries", "topSharePct": 28.7 },
      { "subZoneId": "sub_mars_orbital", "name": "Deimos Station", "topPlayer": "Nova Aerospace", "topSharePct": 19.4 }
    ],
    "history": [
      { "companyName": "Stellar Industries", "from": "2026-03-01", "until": null },
      { "companyName": "Red Planet Inc", "from": "2026-02-15", "until": "2026-03-01" }
    ],
    "dailySnapshots": [
      { "date": "2026-03-22", "topShares": [ { "companyName": "Stellar Industries", "pct": 21.8 }, "..." ] }
    ]
  }
}
```

#### `GET /api/space-tycoon/zones/[zoneId]/my-influence`

Returns the authenticated player's detailed influence breakdown for a zone.

**Response**:
```json
{
  "zoneId": "zone_mars",
  "myInfluence": {
    "totalIp": 409,
    "effectiveIp": 409,
    "sharePct": 21.8,
    "status": "governor",
    "breakdown": {
      "building": { "ip": 190, "details": [ { "name": "Mars Orbital Station", "ip": 120 }, { "name": "Mars Mining Rig", "ip": 70 } ] },
      "service": { "ip": 120, "details": [ { "name": "Mars Station Operations", "ip": 60 }, { "name": "Mars Resource Extraction", "ip": 22 }, "..." ] },
      "mining": { "ip": 44, "details": [ { "name": "mining_mars", "ip": 22 }, { "name": "mining_mars (2nd)", "ip": 22 } ] },
      "research": { "ip": 30, "details": [ { "name": "super_heavy_lift", "ip": 5 }, "..." ] },
      "contract": { "ip": 25, "details": [ { "name": "Mars Supply Contract", "ip": 5 }, "..." ] }
    },
    "modifiers": {
      "challengerBonus": null,
      "governorDecayProtection": true,
      "multiZonePenalty": 0.90,
      "newcomerBoost": 0
    },
    "taxRevenue": 8500000,
    "serviceBonusPct": 5
  }
}
```

### 12.2 Write Endpoints

#### `POST /api/space-tycoon/zones/[zoneId]/set-name`

Governor sets a custom zone name. Requires authentication and Governor status.

**Request**: `{ "customName": "Stellar Industries' Mars Domain" }`
**Validation**: Max 50 chars, profanity filter, no HTML.

#### `POST /api/space-tycoon/zones/[zoneId]/claim-governance`

Alliance leader/officer activates alliance governance claim for a zone.

**Request**: `{ "allianceId": "clxyz...", "stewardProfileId": "clabc..." }`
**Validation**: Caller must be alliance leader or officer. Alliance must have highest combined IP.

### 12.3 Internal/Cron Endpoints

#### `POST /api/space-tycoon/zones/recalculate` (Cron — every 5 minutes)

Server-side job that:
1. Reads all GameProfiles with recent `lastSyncAt` (within 24h)
2. Parses `buildingsData`, `activeServicesData`, `completedResearchList`, `completedContracts`
3. Calculates IP per zone per player
4. Applies decay to `storedIp`
5. Computes effective IP (blend, diminishing returns, penalties)
6. Computes influence share percentages
7. Checks for governance challenges and transitions
8. Updates `ZoneInfluence`, `ZoneGovernance`, `AllianceZoneInfluence`
9. Creates `PlayerActivity` entries for governance transitions
10. Triggers notifications for relevant events

**Performance target**: < 5 seconds for 500 players. This is a batch job reading denormalized JSON data, not complex joins.

#### `POST /api/space-tycoon/zones/daily-snapshot` (Cron — daily at 00:00 UTC)

Creates daily `ZoneInfluenceSnapshot` entries for history charts.

#### `POST /api/space-tycoon/zones/daily-decay` (Cron — daily at 00:00 UTC)

Applies daily decay to all `ZoneInfluence.storedIp` values. Accelerated decay for inactive players.

---

## 13. UI Design

### 13.1 Influence Map (Main View)

The primary interface for the zone influence system. Accessible from the game's Map tab or a dedicated "Influence" tab.

```
┌─────────────────────────────────────────────────────────────────────┐
│  SOLAR SYSTEM INFLUENCE MAP                                         │
│  Your Governance: Mars System (Governor) · LEO (Major Stakeholder)  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                           ☀ Sun                                     │
│                                                                     │
│           ○ LEO ──────── ○ GEO                                      │
│           ┌──────────┐  ┌──────────┐                                │
│           │ Gov: Nova │  │ Gov: You │                                │
│           │ You: 15%  │  │ You: 32% │                                │
│           │ [██████░░] │  │ [████████] │                              │
│           └──────────┘  └──────────┘                                │
│                                                                     │
│                    ◐ Lunar ──────── ● Mars                          │
│                    ┌──────────┐    ┌──────────┐                     │
│                    │ Gov: Sol │    │ ⚔ CONTEST│                     │
│                    │ You: 8%  │    │ Gov: You │                     │
│                    │ [████░░░░]│    │ You: 22% │                     │
│                    └──────────┘    │ Chal: 22%│                     │
│                                    │ 48h left │                     │
│          ○ Belt                     └──────────┘                     │
│          ┌──────────┐                                               │
│          │ Gov: None │     ○ Jupiter    ○ Saturn    ○ Outer         │
│          │ You: 4%   │     ┌────────┐   ┌────────┐  ┌────────┐     │
│          └──────────┘     │Gov: [DEEP]│ │Gov: --- │ │Gov: ---│     │
│                            │You: 2%  │  │You: 0%  │ │You: 0% │     │
│                            └────────┘   └────────┘  └────────┘     │
│                                                                     │
│  Legend: ████ Your influence  ░░░░ Others  ⚔ Contested              │
└─────────────────────────────────────────────────────────────────────┘
```

**Visual encoding**:
- Zone cards show Governor name, your share %, and a progress bar
- Your governed zones have a gold border
- Contested zones have an animated red/gold border with countdown
- Zones where you have no presence are grayed out
- Clicking a zone opens the Zone Detail panel

### 13.2 Zone Detail Panel

Clicking a zone opens a detailed breakdown:

```
┌─────────────────────────────────────────────────────────────────────┐
│  MARS SYSTEM                                                ⚔ CONTESTED │
│  Governor: Stellar Industries (since Mar 15)                         │
│  Challenge: Red Planet Inc — 48h remaining                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  INFLUENCE LEADERBOARD                                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  1. 👑 Stellar Industries [SOL]   21.8%  ████████████░░░░  │    │
│  │  2. ⚔  Red Planet Inc             22.1%  █████████████░░░  │    │
│  │  3. ⭐ Nova Aerospace [DEEP]       9.1%  █████░░░░░░░░░░░  │    │
│  │  4.    Pioneer Corp                6.3%  ███░░░░░░░░░░░░░  │    │
│  │  5.    Frontier Mining Co          4.8%  ██░░░░░░░░░░░░░░  │    │
│  │     ... 15 more players                                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  YOUR INFLUENCE BREAKDOWN                        Total: 409 IP      │
│  ┌───────────┬──────────────────────────────────────────────┐       │
│  │ Buildings │ ████████████████████████████░░░░░░  190 (46%) │       │
│  │ Services  │ ███████████████████░░░░░░░░░░░░░░  120 (29%) │       │
│  │ Mining    │ ██████████░░░░░░░░░░░░░░░░░░░░░░░   44 (11%) │       │
│  │ Research  │ █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░   30 ( 7%) │       │
│  │ Contracts │ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   25 ( 6%) │       │
│  └───────────┴──────────────────────────────────────────────┘       │
│                                                                     │
│  SUB-ZONES                                                          │
│  ┌─────────────────┬────────────┬──────────────┐                    │
│  │ Hellas Extract.  │ Red Planet │ 35.2%        │                    │
│  │ Olympus Settl.   │ You        │ 28.7%        │                    │
│  │ Deimos Station   │ Nova Aero  │ 19.4%        │                    │
│  └─────────────────┴────────────┴──────────────┘                    │
│                                                                     │
│  GOVERNANCE HISTORY                                                 │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │ Mar 15 ────────────── Now     Stellar Industries         │       │
│  │ Feb 15 ── Mar 15              Red Planet Inc              │       │
│  │ Jan 10 ── Feb 15              Pioneer Corp                │       │
│  └──────────────────────────────────────────────────────────┘       │
│                                                                     │
│  GOVERNOR BENEFITS (Active)                                         │
│  • Tax Revenue: $8.5M/month                                         │
│  • Service Bonus: +5% in Mars System                                │
│  • Exclusive Contract: "Mars Authority: Surface Expansion" (3d left) │
│  • Custom Name: "Stellar Industries' Mars Domain"                    │
│                                                                     │
│  [📝 Set Zone Name]  [📊 View History Chart]                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 13.3 History Chart

A line chart (using Recharts, already in the project) showing influence share over time for the top 5 players in a zone. X-axis is date (last 30 days), Y-axis is influence %. This uses `ZoneInfluenceSnapshot` data.

### 13.4 Influence Tab on Dashboard

The main Dashboard Panel should include a compact influence summary:

```
┌──────────────────────────────────────────┐
│  ZONE INFLUENCE                           │
│  Governor of: Mars System, GEO            │
│  Tax Income: +$18.5M/month                │
│                                           │
│  ⚔ Mars governance contested! (48h)      │
│  ⭐ You became a Stakeholder in Jupiter   │
│                                           │
│  [View Influence Map →]                   │
└──────────────────────────────────────────┘
```

### 13.5 Mobile Layout

For mobile (320-480px viewport), the influence map uses a vertical list layout instead of the spatial solar system view:

```
┌────────────────────────────┐
│ ZONE INFLUENCE              │
├────────────────────────────┤
│ LEO         Nova (15%)     │
│ [██████░░░░]  You: 15%  ⭐ │
├────────────────────────────┤
│ GEO         You (32%)     │
│ [████████░░]  Governor  👑 │
├────────────────────────────┤
│ Mars        ⚔ CONTESTED   │
│ [████████░░]  You: 22%  👑 │
│ Challenger: 22% — 48h      │
├────────────────────────────┤
│ ... more zones              │
└────────────────────────────┘
```

---

## 14. Notification Triggers

All notifications use the existing `Notification` model and `PlayerActivity` feed.

### 14.1 Governance Notifications

| Trigger | Recipients | Title | Message | Priority |
|---------|-----------|-------|---------|----------|
| Governance challenge started | Governor | "Your governance of [Zone] is being challenged!" | "[Challenger] has surpassed your influence in [Zone]. Maintain your lead for the next 72 hours to defend your position." | High |
| Governance challenge started | Challenger | "You are challenging for [Zone] governance!" | "Your influence in [Zone] now exceeds the Governor's. Maintain your lead for 72 hours to claim governance." | High |
| Challenge defended | Governor | "[Zone] governance defended!" | "[Challenger]'s challenge to your [Zone] governance has failed. Your position is secure." | Medium |
| Challenge failed | Challenger | "[Zone] challenge failed" | "You lost the influence lead in [Zone]. The current Governor has defended their position." | Medium |
| Governance transferred | All zone participants | "New [Zone] Governor!" | "[New Governor] has become the Governor of [Zone], replacing [Old Governor]." | Medium |
| Governance transferred | New Governor | "You are now Governor of [Zone]!" | "Congratulations! You've earned governance of [Zone]. Set your zone name and enjoy your new benefits." | High |
| Governance lost | Old Governor | "You lost governance of [Zone]" | "[New Governor] has taken governance of [Zone] from you. Increase your influence to reclaim it." | High |

### 14.2 Influence Threshold Notifications

| Trigger | Recipients | Title | Message |
|---------|-----------|-------|---------|
| Reached Contributor status (1%) | Player | "You're a Contributor in [Zone]!" | "Your economic activity in [Zone] has earned you Contributor status (+0.5% service revenue)." |
| Reached Stakeholder status (3%) | Player | "Stakeholder in [Zone]!" | "Your influence in [Zone] has grown to Stakeholder level (+1.5% service revenue)." |
| Reached Major Stakeholder (8%) | Player | "Major Stakeholder in [Zone]!" | "You are now a Major Stakeholder in [Zone] (+3% service revenue, silver badge)." |
| Dropping below threshold | Player | "Your [Zone] influence is slipping" | "Your influence in [Zone] has dropped below [X]%. Increase activity to maintain your status." |
| Influence share declined >5% in 24h | Player | "[Zone] influence declining!" | "Your influence share in [Zone] dropped from [X]% to [Y]% in the last 24 hours." |

### 14.3 Alliance Notifications

| Trigger | Recipients | Title | Message |
|---------|-----------|-------|---------|
| Alliance becomes top entity in zone | All members | "Alliance dominating [Zone]!" | "[Alliance] is now the top influence holder in [Zone]. Officers can claim governance." |
| Alliance governance claimed | All members | "[Alliance] governs [Zone]!" | "[Steward] has been appointed Zone Steward. All members get +5% service revenue in [Zone]." |
| Alliance governance lost | All members | "[Alliance] lost [Zone] governance" | "Another player/alliance has taken governance of [Zone] from [Alliance]." |

### 14.4 Weekly Digest

Every Monday, players who participate in any zone receive a weekly influence digest:

```
WEEKLY INFLUENCE REPORT
━━━━━━━━━━━━━━━━━━━━━━
Zones you govern: Mars System, GEO
Total tax income this week: $129.5M

Zone Changes:
  • Mars: Your share: 21.8% → 22.4% (+0.6%)
  • GEO: Your share: 32.1% → 31.0% (-1.1%) ⚠
  • LEO: Your share: 15.2% → 15.8% (+0.6%)
  • Jupiter: Your share: 2.1% → 2.5% (+0.4%)

Governance Events:
  • Pioneer Corp lost Mars governance to you
  • Nova Aerospace became LEO Governor

Top Growth This Week: Red Planet Inc (+4.2% in Mars)
```

### 14.5 Notification Throttling

To prevent notification spam:
- Maximum 3 zone-related notifications per player per day
- Challenge notifications are always delivered (exempt from throttle)
- Threshold notifications batch if multiple thresholds crossed simultaneously
- Weekly digest consolidates all minor changes

---

## 15. Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

**Goal**: Database schema, influence calculation engine, basic API.

- [ ] Add Prisma models: `ZoneInfluence`, `ZoneGovernance`, `ZoneGovernanceHistory`, `AllianceZoneInfluence`, `ZoneInfluenceSnapshot`
- [ ] Add relations to `GameProfile` and `Alliance`
- [ ] Define zone and sub-zone constants in `src/lib/game/zone-influence.ts`
- [ ] Build location-to-zone mapping table
- [ ] Build building/service-to-sub-zone mapping table
- [ ] Implement IP calculation functions (building, service, mining, research, contract)
- [ ] Implement diminishing returns function
- [ ] Implement influence share calculation
- [ ] Create init script: `scripts/init-zone-governance.ts` (seeds 8 ZoneGovernance rows)
- [ ] Create `POST /api/space-tycoon/zones/recalculate` cron endpoint
- [ ] Create `GET /api/space-tycoon/zones` read endpoint
- [ ] Run `npx prisma db push` and verify

### Phase 2: Governance & Decay (Week 2)

**Goal**: Challenge system, decay, Governor benefits.

- [ ] Implement 72-hour governance challenge logic in recalculate job
- [ ] Implement daily decay cron job
- [ ] Implement inactivity multiplier
- [ ] Implement Governor decay protection (0.5x)
- [ ] Implement stored IP / recalculated IP blend (70/30)
- [ ] Implement multi-zone governance penalty
- [ ] Implement influence share cap (60%)
- [ ] Implement challenger bonus calculation
- [ ] Implement zone tax revenue calculation (applied during game sync)
- [ ] Implement service revenue bonus for Governor/stakeholders
- [ ] Create `GET /api/space-tycoon/zones/[zoneId]` detail endpoint
- [ ] Create `GET /api/space-tycoon/zones/[zoneId]/my-influence` endpoint
- [ ] Create `POST /api/space-tycoon/zones/[zoneId]/set-name` endpoint
- [ ] Implement governance transition logic and history logging
- [ ] Create daily snapshot cron job

### Phase 3: Alliance Integration (Week 3)

**Goal**: Alliance influence, notifications, exclusive contracts.

- [ ] Implement alliance influence aggregation
- [ ] Implement synergy multiplier
- [ ] Create `POST /api/space-tycoon/zones/[zoneId]/claim-governance` endpoint
- [ ] Implement alliance governance distribution (tax split, shared benefits)
- [ ] Implement newcomer boost
- [ ] Generate Governor exclusive contracts (integrate with competitive-contracts.ts)
- [ ] Implement contested zone event contracts
- [ ] Implement all notification triggers from Section 14
- [ ] Implement notification throttling
- [ ] Implement weekly digest generation
- [ ] Add `PlayerActivity` entries for governance events

### Phase 4: UI & Polish (Week 4)

**Goal**: Full UI implementation, testing, balancing.

- [ ] Build Influence Map component (desktop layout — solar system spatial view)
- [ ] Build Influence Map component (mobile layout — vertical list)
- [ ] Build Zone Detail Panel (leaderboard, breakdown, sub-zones, history)
- [ ] Build History Chart (Recharts line chart using snapshot data)
- [ ] Build Dashboard Influence Summary widget
- [ ] Add "Influence" tab to game tab bar (or integrate into existing Map tab)
- [ ] Implement zone name display with custom names
- [ ] Add Governor badges to leaderboard
- [ ] Add influence-related achievements (5-10 new achievements)
- [ ] Integration testing: verify IP calculation accuracy across all building/service types
- [ ] Balance testing: simulate 100-500 player scenarios and verify anti-monopoly measures
- [ ] Performance testing: verify recalculate cron completes < 5s for 500 players
- [ ] Add zone influence data to game sync response (so client can display without extra API calls)

### Phase 5: Post-Launch Tuning (Ongoing)

- [ ] Monitor governance transitions and adjust challenge period if needed
- [ ] Monitor decay rates and adjust if zones become stale or too volatile
- [ ] Monitor tax revenue amounts and adjust caps if needed
- [ ] Add additional Governor contracts based on player feedback
- [ ] Consider sub-zone governance benefits if players request it
- [ ] Consider zone-specific cosmetics (ship skins, station themes) for Governors

---

## 16. Research References

### Game Design Precedents

**EVE Online Sovereignty** (Equinox 2024, Legion 2025):
- Territory control through infrastructure hubs requiring ongoing resource investment (power, workforce, reagents)
- Reinforcement timers prevent instant territory flips (similar to our 72-hour challenge)
- Sovereignty upgrades provide economic bonuses to the controlling alliance
- Key lesson: Hard territory control (lose everything on flip) creates too much stress for casual players. Space Tycoon uses soft influence instead.
- Sources: [EVE University Sovereignty Wiki](https://wiki.eveuniversity.org/Sovereignty), [EVE Equinox Update](https://www.eveonline.com/news/view/equinox-update-sovereignty-transition)

**Prosperous Universe Factional Influence** (Prestige Update 2022):
- Faction influence expanded through player economic activity (completing faction contracts)
- Influence is per-faction, not per-player — closer to our alliance influence model
- Contingent contracts reward players who increase faction standing
- Key lesson: Economic activity as the driver of influence (not combat) works well for simulation games.
- Sources: [Prosperous Universe Prestige Update](https://massivelyop.com/2022/12/06/prosperous-universe-adds-a-factional-influence-wrinkle-to-its-econ-pvp-with-todays-prestige-update/), [PU Dev Log #521](https://prosperousuniverse.com/blog/2026/03/09/generating-influence-521)

**Stellaris Claims System**:
- Claims cost influence (a slowly regenerating resource) proportional to distance
- Multiple claims on the same system increase claim strength
- Claims are permanent until resolved through war or diplomacy
- Key lesson: The "cost increases with distance" model maps well to zone tiers — outer zones should be harder to dominate because fewer players have access.
- Source: [Stellaris Claims Discussion](https://steamcommunity.com/app/281990/discussions/0/1640917196995400992/)

### Balancing Philosophy

**Mario Kart Rubber Banding**: Items favor trailing players. Our challenger bonus (up to +25% IP) follows this principle.

**Civilization VI Loyalty System**: Cities exert loyalty pressure on nearby cities. A city with low loyalty can flip. Our governance challenge system is analogous — sustained economic pressure can flip governance.

**Clash Royale / Brawl Stars League System**: Trophies decay over time at higher ranks to prevent stagnation. Our 2%/day base decay serves the same purpose.

### Async Multiplayer Considerations

**Critical constraint**: All influence mechanics must work without real-time player interaction. This means:
- No "attack" or "defend" actions that require immediate response
- All calculations are server-side batch jobs
- The 72-hour challenge window is long enough for async response
- Benefits accrue passively (tax revenue, service bonuses)
- Notifications are the primary engagement driver

---

*Last updated: 2026-03-23*
