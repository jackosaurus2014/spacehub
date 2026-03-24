# Contract Bidding / Auction System -- Comprehensive Implementation Design

**SpaceNexus Tycoon -- Multiplayer Competitive Contracts Phase 3**
**Date:** 2026-03-23
**Status:** Design (not yet implemented)
**Revision:** 2.0

---

## Table of Contents

1. [Context and Motivation](#1-context-and-motivation)
2. [Contract Generation Algorithm](#2-contract-generation-algorithm)
3. [Bidding Mechanics](#3-bidding-mechanics)
4. [Contract Types with Detailed Specifications](#4-contract-types-with-detailed-specifications)
5. [Bid Evaluation Algorithm](#5-bid-evaluation-algorithm)
6. [Anti-Gaming Measures](#6-anti-gaming-measures)
7. [Contract Fulfillment Tracking](#7-contract-fulfillment-tracking)
8. [Penalty System for Failed Contracts](#8-penalty-system-for-failed-contracts)
9. [Reputation and Reliability Score](#9-reputation-and-reliability-score)
10. [Database Schema (Prisma Models)](#10-database-schema-prisma-models)
11. [API Endpoints](#11-api-endpoints)
12. [UI Components](#12-ui-components)
13. [Notification System](#13-notification-system)
14. [Implementation Phases](#14-implementation-phases)

---

## 1. Context and Motivation

### 1.1 Existing Contract Systems

The game currently has three layers of contracts:

| Layer | Source File | Mechanic | Scope |
|-------|------------|----------|-------|
| **Static contracts** | `src/lib/game/contracts.ts` | Per-player, auto-generated from a pool of 16 definitions across 3 tiers. Player accepts, fulfills requirements (money_earned, buildings_completed, resources_mined, etc.), earns reward. No player interaction. | Solo |
| **Competitive contracts** | `src/lib/game/competitive-contracts.ts` | Shared across all players, slot-limited (first N companies to fulfill requirements claim the reward). First-come-first-served. Stored as `PlayerActivity` entries with type `competitive_contract_claimed`. | Multiplayer race |
| **Resource bounties** | Prisma `ResourceBounty` model | Player-to-player: one player posts a buy order with escrowed funds, another fills it. Simple ask/fill. | P2P trade |

### 1.2 What Is Missing

None of these systems involve **bidding**. The competitive contracts reward speed (who finishes first), not strategic pricing. There is no mechanism where players compete on *price* or *value proposition* for a shared opportunity.

### 1.3 Design Goal

Add a **Contract Bidding Board** -- a shared marketplace of high-value contracts issued by in-game NPC clients (governments, corporations, agencies) where players submit sealed bids and the most competitive bid wins. This introduces:

- **Price discovery**: Players determine what a contract is worth.
- **Strategic tension**: Bid too low and you lose; bid too high and you destroy your margin.
- **Economic interaction**: Players compete for the same limited opportunities.
- **Reputation stakes**: Your track record determines which contracts you can even bid on.

### 1.4 Design Principles

Per the game's core philosophy:

- **Never take things away**: Losing a bid returns collateral in full. Failed contracts lose collateral (which was explicitly risked) but never existing buildings, ships, or research. Reputation loss is bounded and recoverable.
- **Async-first**: Sealed bids. No real-time bidding wars. Submit and log off. Resolution is server-driven.
- **Participation rewards**: Every bid placed (win or lose) earns a small participation XP toward a "Seasoned Bidder" achievement track. Losing bids still contribute to "Bids Placed" stats.

### 1.5 Key Game Constants Referenced

From `server-time.ts`:
- 1 game month = 6 real hours (`REAL_SECONDS_PER_GAME_MONTH = 21,600`)
- 1 game year = 3 real days
- Server epoch: `2026-03-22T00:00:00Z`

From `economic-systems.ts`:
- Economic cycle phases: boom (1.30x revenue), growth (1.15x), stable (1.00x), contraction (0.85x), recession (0.70x)
- Total cycle length: 74 game months (~18.5 real days)

From `competitive-engine.ts`:
- Revenue targets: $10M/mo early, $200M/mo mid, $1B/mo late, $5B/mo endgame
- Players range from ~$100M (new) to $1T+ (endgame)

---

## 2. Contract Generation Algorithm

### 2.1 Generation Method: Hybrid (Scheduled + Event-Driven)

Contracts appear through two channels:

**Scheduled (Primary -- ~70% of contracts):**
- The server generates new bidding contracts every game month (6 real hours).
- Each cycle produces 2-4 new contracts, drawn from weighted random pools.
- Contract type, tier, and requirements reflect the current game month.

**Event-Driven (Secondary -- ~30% of contracts):**
- Triggered by game events: economic cycle shifts, milestone claims, resource scarcity thresholds.
- Higher urgency (shorter bid windows), often higher rewards.
- Bypass the normal active-contract cap but expire quickly.

### 2.2 Generation Formula

```
function generateBiddingContracts(gameMonth: number, activePlayerCount: number):

  // --- Step 1: Count existing open contracts ---
  activeCount = COUNT(BiddingContract WHERE status = 'open')
  maxActive = BASE_MAX + floor(activePlayerCount / 50)
  // BASE_MAX = 12. +1 slot per 50 active players, capped at 20.
  maxActive = min(maxActive, 20)

  if activeCount >= maxActive: return

  // --- Step 2: Determine how many to generate ---
  baseSlots = randomInt(2, 4)
  // During recession: +1 emergency contract
  if currentEconomicPhase == 'recession': baseSlots += 1
  // During boom: +1 high-value contract
  if currentEconomicPhase == 'boom': baseSlots += 1

  slotsToFill = min(baseSlots, maxActive - activeCount)
  // Ensure minimum floor
  if activeCount < 6: slotsToFill = max(slotsToFill, 6 - activeCount)

  // --- Step 3: For each slot, generate a contract ---
  for i in range(slotsToFill):

    // --- Step 3a: Select tier ---
    tier = weightedRandom({
      month 0-6:    { 1: 0.75, 2: 0.25 },
      month 7-18:   { 1: 0.35, 2: 0.50, 3: 0.15 },
      month 19-36:  { 1: 0.15, 2: 0.35, 3: 0.40, 4: 0.10 },
      month 37-60:  { 1: 0.10, 2: 0.25, 3: 0.35, 4: 0.25, 5: 0.05 },
      month 61+:    { 1: 0.05, 2: 0.15, 3: 0.30, 4: 0.30, 5: 0.20 },
    }[gameMonth bracket])

    // --- Step 3b: Select contract type ---
    // Filter to types available at this tier (see Section 4)
    contractType = randomFromAvailable(tier)

    // --- Step 3c: Calculate estimated value ---
    baseValue = CONTRACT_BASE_VALUES[contractType]
    tierMultiplier = TIER_VALUE_MULTIPLIERS[tier]
    econMultiplier = currentEconomicPhase.revenueMultiplier
    scarcityMultiplier = 1.0  // Increases for scarce-resource contracts
    if contractType == 'resource_delivery':
      scarcityMultiplier = 1.0 + (1.0 - getScarcityMultiplier(resourceTotalMined)) * 0.5

    estimatedValue = baseValue * tierMultiplier * econMultiplier * scarcityMultiplier
    // Apply +-15% jitter for variety
    estimatedValue *= (0.85 + random() * 0.30)
    estimatedValue = round(estimatedValue)

    // --- Step 3d: Set bid bounds ---
    minBid = round(estimatedValue * 0.10)
    maxBid = round(estimatedValue * 2.00)

    // --- Step 3e: Set bid window ---
    if tier <= 2:   bidWindowHours = randomFloat(6, 12)
    if tier == 3:   bidWindowHours = randomFloat(12, 24)
    if tier >= 4:   bidWindowHours = randomFloat(24, 48)

    bidOpenAt = now()
    bidCloseAt = now() + bidWindowHours * 3600 * 1000

    // --- Step 3f: Set delivery window ---
    deliveryMonths = CONTRACT_DELIVERY_WINDOWS[contractType][tier]

    // --- Step 3g: Generate requirements ---
    requirements = generateRequirements(contractType, tier)
    // (Details in Section 4 per contract type)

    // --- Step 3h: Insert ---
    INSERT BiddingContract(...)
```

### 2.3 Base Values and Multipliers

```
CONTRACT_BASE_VALUES = {
  satellite_deployment:  150_000_000,   // $150M
  resource_delivery:     200_000_000,   // $200M
  station_construction:  500_000_000,   // $500M
  fleet_transport:       100_000_000,   // $100M
  research_partnership:  250_000_000,   // $250M
  emergency_supply:      300_000_000,   // $300M
  mining_rights_lease:   400_000_000,   // $400M
}

TIER_VALUE_MULTIPLIERS = {
  1: 1.0,
  2: 3.0,
  3: 10.0,
  4: 30.0,
  5: 100.0,
}

// Example: Tier 3 station_construction during boom = $500M * 10 * 1.30 = $6.5B
```

### 2.4 Active Contract Limits

| Metric | Value | Scaling |
|--------|-------|---------|
| Base max active contracts | 12 | +1 per 50 active players, capped at 20 |
| New contracts per game month | 2-4 (base) | +1 during recession/boom |
| Minimum active at any time | 6 | Generator tops up if below |
| Emergency event contracts | +1-2 on top of cap | Expire within 1-2 hours |
| Max of same type active | 3 | No more than 3 satellite_deployment at once |

### 2.5 Event-Driven Contract Triggers

| Trigger Condition | Contract Generated | Urgency |
|---|---|---|
| Economic phase shifts to `recession` | "Emergency Supply" contracts for high-demand resources | 2h window |
| Economic phase shifts to `boom` | "Government Procurement" contracts at 1.3x value | Standard |
| Global resource stock below 20% of peak | "Emergency [Resource] Procurement" | 1-2h window |
| First player reaches new location tier | "[Location] Supply Route Establishment" | 24h window |
| Alliance reaches 15+ members | "Mega-Project: Alliance Infrastructure" (alliance-only) | 48h window |
| 10+ players complete same research | "Industry Standardization" contract | Standard |
| No bids on 3+ contracts in a row | "Guaranteed Floor" contracts with lower requirements | Standard |

### 2.6 Player Count Scaling

The algorithm adapts to server population:

| Active Players (last 24h) | Max Active Contracts | Contracts per Month | Tier Distribution Adjustment |
|---|---|---|---|
| 1-25 | 12 | 2-3 | +20% weight to tier 1 |
| 26-100 | 13 | 2-4 | Normal |
| 101-250 | 15 | 3-4 | Normal |
| 251-500 | 17 | 3-5 | +10% weight to tier 3-4 |
| 500+ | 20 | 4-6 | +15% weight to tier 3-5 |

"Active players" = players whose GameProfile.lastSyncAt is within the last 24 real hours.

---

## 3. Bidding Mechanics

### 3.1 Auction Format: Sealed-Bid, First-Price

**Format**: Sealed-bid, first-price reverse auction (for procurement contracts) and sealed-bid, first-price forward auction (for mining rights/exclusive access).

**Why sealed bid (not open/English auction):**
- The game syncs every 60 seconds. Open auctions with live bidding would feel sluggish and frustrating with that latency.
- Sealed bids eliminate "sniping" -- a major complaint in EVE Online's auction system.
- Sealed bids force genuine price estimation rather than incremental one-upping.
- They work perfectly asynchronously -- players can submit a bid and log off.

**Why not Dutch auction:**
- Dutch auctions (descending price, first to accept wins) favor always-online players. The game is designed for casual async sessions.
- Dutch auctions require real-time price ticking, which conflicts with the 60-second sync interval.

**Why first-price (not second-price/Vickrey):**
- The thrill comes from risk: you bid what you think it is worth, and if you win, you pay exactly that.
- First-price auctions are intuitive -- "you bid it, you pay it."
- They encourage conservative bidding (avoiding the winner's curse), creating strategic depth.

### 3.2 What Players Bid

**Reverse auction (procurement, supply, construction, transport, emergency):**
Players bid the price they will accept for completing the work. Lowest valid bid wins. The NPC client wants the cheapest provider.

**Forward auction (mining_rights_lease):**
Players bid the price they will pay for the privilege. Highest bid wins. The NPC client wants the most money.

### 3.3 Bid Composition

A bid consists of:

```typescript
interface BidSubmission {
  contractId: string;         // Which contract
  priceOffer: number;         // Money amount (primary bid component)
  promisedDeliveryMonths: number;  // Game months to fulfill (for tiebreaking)
  // collateralAmount is server-calculated, not player-chosen
}
```

### 3.4 Collateral Deposit

When submitting a bid, the player must escrow a percentage of their bid amount. This money is deducted from balance and locked.

| Contract Tier | Base Collateral % |
|---|---|
| Tier 1 | 5% |
| Tier 2 | 8% |
| Tier 3 | 10% |
| Tier 4 | 12% |
| Tier 5 | 15% |

**Collateral escalation** (anti-whale, see Section 6):
- 1st win in last 24 real hours: base %
- 2nd win: base % + 5%
- 3rd win: base % + 10%

**Collateral lifecycle:**
- Bid placed: collateral deducted from player money, stored in `ContractBid.collateralAmount`
- Bid lost: collateral returned immediately to player money
- Bid won + contract fulfilled: collateral returned
- Bid won + contract failed: collateral partially or fully forfeited (see Section 8)
- Bid withdrawn (before lock): collateral returned

### 3.5 Bid Window Timing

- Bids can be submitted any time during the bid window.
- Players can **modify** their bid until the **lock deadline** (1 game month = 6 real hours before `bidCloseAt`). After the lock deadline, bids cannot be changed.
- Players can **withdraw** their bid any time before the lock deadline (collateral returned).
- After the lock deadline, bids are frozen. No modifications, no withdrawals.
- For emergency contracts (1-2h windows), the lock deadline is 30 minutes before close.

### 3.6 Bid Constraints

| Constraint | Value | Rationale |
|---|---|---|
| Minimum bid | `BiddingContract.minBid` (10% of estimated value) | Prevents troll bids of $1 |
| Maximum bid | `BiddingContract.maxBid` (200% of estimated value) | Prevents absurd overpayment |
| Collateral requirement | 5-15% of bid, locked in escrow | Skin in the game |
| Max concurrent active bids per player | 3 | Prevents one player locking up all contracts |
| Max concurrent won contracts per player | 2 | Cannot hold more than 2 unfulfilled contracts |
| One bid per player per contract | Yes | Enforced by `@@unique([contractId, profileId])` |
| Min player balance after collateral | $1M | Cannot bid yourself into bankruptcy |

### 3.7 Bid Visibility

- **Before resolution:** Players CANNOT see other bids (sealed-bid property).
- **Reputation perk (1000+ rep):** Can see the *number* of bids on a contract.
- **Reputation perk (10000+ rep):** Can see number of bids + bucket (low/medium/high average).
- **After resolution:** Winning bid amount is published. Losing bid amounts are NOT revealed. Total bid count is shown.

---

## 4. Contract Types with Detailed Specifications

### 4.1 Satellite Deployment

**Client wants:** Deploy N satellites at a specified orbital location.

| Attribute | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---|---|---|---|
| Satellites required | 3-5 | 8-12 | 15-20 | 30+ |
| Location | LEO | GEO, Lunar Orbit | Mars Orbit | Jupiter/Saturn system |
| Estimated value | $100M-$200M | $400M-$800M | $1.5B-$3B | $5B-$15B |
| Delivery window | 3 game months | 4 game months | 6 game months | 10 game months |
| Required research | None | geo_satellites | mars_comm_relay | jupiter_operations |
| Partial fulfillment? | No (binary) | No | No | No |

**How fulfillment is checked:** Server queries `GameProfile.buildingsData` (JSON) and counts buildings with `definitionId` matching satellite types at the specified `locationId`. Must have N or more completed satellites at the required location.

**Penalty for failure:** See Section 8. Collateral forfeited. Satellites already built are NOT removed (never take things away).

### 4.2 Resource Delivery

**Client wants:** Deliver N units of resource X.

| Attribute | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---|---|---|---|
| Resource examples | iron, aluminum | titanium, rare_earth | helium3, platinum_group | exotic_materials, antimatter_precursors |
| Quantity | 200-500 | 500-2000 | 100-500 (rare) | 10-50 (exotic) |
| Estimated value | $80M-$250M | $300M-$1B | $2B-$8B | $10B-$50B |
| Delivery window | 2 game months | 3 game months | 4 game months | 6 game months |
| Required research | None | mining_tech_2 | helium3_extraction | antimatter_research |
| Partial fulfillment? | Yes (pro-rated) | Yes | Yes | Yes |

**How fulfillment is checked:** Server checks `GameProfile.resources` JSON. The player must have consumed/transferred the required quantity. On fulfillment, the resource amount is deducted from the player's inventory.

**Partial fulfillment formula:**
```
deliveredPct = deliveredQuantity / requiredQuantity
if deliveredPct >= 1.0: full payment + bonuses
if deliveredPct >= 0.75: 50% payment, no collateral loss, rep -5
if deliveredPct >= 0.50: 25% payment, 25% collateral loss, rep -10
if deliveredPct < 0.50: 0% payment, 75% collateral loss, rep -15
```

### 4.3 Station Construction

**Client wants:** Build a station/facility at location X.

| Attribute | Tier 2 | Tier 3 | Tier 4 | Tier 5 |
|---|---|---|---|---|
| Building type | Space station | Research station | Deep space outpost | Colony hub |
| Location | Lunar orbit | Mars surface | Jupiter moons | Titan, Pluto |
| Estimated value | $500M-$1B | $3B-$8B | $15B-$40B | $50B-$200B |
| Delivery window | 6 game months | 8 game months | 12 game months | 18 game months |
| Required research | space_stations | mars_habitats | outer_system_ops | frontier_colonies |
| Partial fulfillment? | No (binary) | No | No | No |

**How fulfillment is checked:** Server queries `GameProfile.buildingsData` for a completed building of the required type at the required location.

### 4.4 Fleet Transport

**Client wants:** Have N ships operational and positioned at specified locations.

| Attribute | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Ships required | 2-3 | 5-8 | 10-15 |
| From/To | Earth-Moon corridor | Earth-Mars | Inner to Outer system |
| Estimated value | $50M-$150M | $200M-$600M | $1B-$5B |
| Delivery window | 1 game month | 2 game months | 3 game months |
| Required research | basic_ships | cargo_ships | interplanetary_cruisers |
| Partial fulfillment? | Yes (ship count) | Yes | Yes |

**How fulfillment is checked:** Server queries `GameProfile.shipsData` JSON for ships with `isBuilt == true` at the specified locations.

### 4.5 Research Partnership

**Client wants:** Complete N research projects in a specific category.

| Attribute | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Researches required | 2-3 | 5-8 | 10-15 |
| Categories | Any single category | Specific category | Multiple categories |
| Estimated value | $100M-$200M | $400M-$1B | $2B-$8B |
| Delivery window | 4 game months | 6 game months | 10 game months |
| Partial fulfillment? | No (binary) | No | No |

**How fulfillment is checked:** Server queries `GameProfile.completedResearchList` and counts entries matching the required research category from the `RESEARCH_MAP`.

### 4.6 Emergency Supply

**Client wants:** Urgent resource delivery. Short timeline.

| Attribute | Any Tier |
|---|---|
| Resource | Determined by current global scarcity (resource with lowest supply) |
| Quantity | 50-200 units |
| Estimated value | 2x normal resource delivery value |
| Delivery window | 1 game month (6 real hours) |
| Bid window | 1-2 real hours |
| Partial fulfillment? | No (must deliver 100% for payment) |
| Extendable? | No |

**Generation trigger:** Spawned when global resource stock (sum of all players' inventories of a given resource) drops below 20% of its historical peak.

### 4.7 Mining Rights Lease

**Client wants:** Player pays for exclusive mining bonus at a location for N months.

| Attribute | Tier 2 | Tier 3 | Tier 4 |
|---|---|---|---|
| Location | Asteroid belt | Ceres, Mercury | Jupiter moons, Titan |
| Lease duration | 6 game months | 12 game months | 18 game months |
| Estimated value | $500M-$1B | $2B-$5B | $10B-$30B |
| Mining bonus | +25% output | +35% output | +50% output |
| Bid direction | **Forward** (highest bid wins) | Forward | Forward |

**How fulfillment works:** This is a forward auction. The winner pays the NPC client their bid amount. In return, they receive a mining output multiplier at the specified location for the lease duration. The multiplier is stored in the player's `activeEffects` on their GameState.

**No failure possible:** Once the lease is purchased, it is guaranteed. The player already paid upfront.

---

## 5. Bid Evaluation Algorithm

### 5.1 Resolution Trigger

Resolution runs via a server-side cron job every 5 minutes. It queries:

```sql
SELECT * FROM BiddingContract
WHERE status = 'open' AND bidCloseAt <= NOW()
ORDER BY bidCloseAt ASC;
```

### 5.2 Winner Selection: Quality-Weighted Score

Pure lowest-bid-wins leads to a race to the bottom. Instead, bids are ranked by a **composite score** that weights price (70%), reputation (15%), and delivery speed (15%).

```
For reverse auctions (procurement, supply, construction, transport, emergency):

  // Normalize price: lower is better, score 0-100
  priceScore = 100 * (1 - (bid.priceOffer - contract.minBid) / (contract.maxBid - contract.minBid))
  // Clamp to 0-100
  priceScore = clamp(priceScore, 0, 100)

  // Normalize reputation: higher is better, score 0-100
  maxRepInPool = max(allBids.map(b => b.reputationAtBid))
  if maxRepInPool == 0: repScore = 50  // All unknown reputation, neutral
  else: repScore = 100 * (bid.reputationAtBid / maxRepInPool)

  // Normalize delivery promise: shorter is better, score 0-100
  deliveryScore = 100 * (1 - bid.deliveryPromise / contract.deliveryMonths)
  deliveryScore = clamp(deliveryScore, 0, 100)

  // Composite score
  compositeScore = (priceScore * 0.70) + (repScore * 0.15) + (deliveryScore * 0.15)

  // Apply reputation-tier discount bonus (from REPUTATION_TIERS.contractDiscount)
  // This effectively makes high-rep players' bids look better
  tierDiscount = getReputationTier(bid.reputationAtBid).contractDiscount
  compositeScore *= (1 + tierDiscount)

Sort bids by compositeScore DESC. Highest score wins.

For forward auctions (mining_rights_lease):

  compositeScore = (priceScore_highest_is_better * 0.85) + (repScore * 0.15)
  Sort DESC.
```

### 5.3 Tiebreaking

If two bids have identical composite scores (after rounding to 4 decimal places):

1. **Reputation**: Higher reputation wins.
2. **Delivery promise**: Faster promised delivery wins.
3. **Timestamp**: Earlier bid submission wins (server timestamp on `ContractBid.createdAt`).

### 5.4 Worked Example

Contract: "Deliver 500 iron to Mars orbit" -- estimatedValue $600M, minBid $60M, maxBid $1.2B, deliveryMonths 3.

| Player | Bid | Rep | Delivery Promise | Price Score | Rep Score | Delivery Score | Composite |
|---|---|---|---|---|---|---|---|
| AlphaCorp | $400M | 2000 | 2 months | 70.2 | 100.0 | 33.3 | **64.1** |
| BetaLaunch | $350M | 500 | 3 months | 74.6 | 25.0 | 0.0 | **55.9** |
| GammaSpace | $300M | 800 | 2 months | 78.9 | 40.0 | 33.3 | **66.3** |

Winner: **GammaSpace** (66.3) despite not having the highest reputation. Their low price and fast delivery beat AlphaCorp's reputation advantage.

This prevents pure price-war dynamics while still rewarding competitive pricing.

---

## 6. Anti-Gaming Measures

### 6.1 Threat Model

| Threat | Description |
|---|---|
| **Whale domination** | $1T player bids on everything at cost, crowding out smaller players |
| **Market cornering** | Player wins all contracts of one type to monopolize rewards |
| **Alt-account bidding** | Player uses multiple accounts to place bids, increasing odds |
| **Collusion** | Alliance members coordinate bids to guarantee one member wins |
| **Bid manipulation** | Player bids to waste others' collateral with no intent to fulfill |
| **Information warfare** | High-rep player uses bid count visibility to manipulate others |

### 6.2 Anti-Whale Mechanisms

**A. Concurrent Bid Limit: 3 max**
Every player can have at most 3 active (status = 'active') bids. This forces prioritization. A whale must choose which 3 of 12+ active contracts to pursue.

**B. Concurrent Won Contract Limit: 2 max**
A player cannot hold more than 2 unfulfilled won contracts. They must complete (or fail/abandon) before winning more.

**C. Tier-Restricted Pools with Mentor Penalty**
Players who are overqualified for lower tiers receive a payout penalty:
- Player's "effective tier" = floor(completedResearchList.length / 10) + 1, capped at 5
- If `effective tier > contract tier + 1`: player receives 70% of bid price on fulfillment (30% mentor tax)
- This is shown in the bid UI so the player knows before bidding

**D. Per-Tier Cool-down After Winning**
After winning a contract at tier T, the player cannot bid on another tier-T contract for 1 game month (6 real hours). They can still bid on contracts at other tiers.

**E. Collateral Escalation**
Collateral % increases with recent wins (see Section 3.4). This makes serial winning progressively more expensive.

**F. Alliance Cap: 40%**
Members of the same alliance cannot collectively hold more than 40% of all currently awarded (won, in-fulfillment) contracts. Checked at bid submission time.

```
allianceWonCount = COUNT(BiddingContract WHERE status = 'awarded'
  AND winnerId IN (SELECT profileId FROM AllianceMember WHERE allianceId = bidder.allianceId))
totalAwarded = COUNT(BiddingContract WHERE status = 'awarded')
if totalAwarded > 0 AND allianceWonCount / totalAwarded >= 0.40: REJECT BID
```

**G. New Player Protected Pool**
Players whose `GameProfile.createdAt` is within 48 real hours AND whose `gameYear` is within 8 game months of the server epoch have access to 2-3 "Newcomer" contracts. These are:
- Only visible to/biddable by newcomer players
- Lower requirements (3 satellites, 100 resources)
- Smaller but guaranteed margins (estimated value is close to actual cost)
- Separate from the main bidding board

### 6.3 Anti-Alt-Account Measures

**A. IP Rate Limiting**
A single IP address can only submit bids from 2 different accounts per 24h period. Tracked via the existing rate limiter in `src/middleware.ts`.

**B. Account Age Gate**
GameProfile must be at least 24 real hours old AND have at least 3 completed buildings to place any bid. This prevents throwaway accounts.

**C. Bid Pattern Detection (Phase 3+)**
Flag accounts where:
- Two accounts always bid on the same contracts
- Two accounts have correlated bid prices (within 5% of each other consistently)
- Two accounts share IP patterns

Flagged accounts are reviewed; if confirmed, both are banned from bidding for 7 real days.

### 6.4 Anti-Collusion

**A. Alliance Bid Secrecy**
Alliance members can see THAT their allies have bid on a contract, but NOT the bid amount. This prevents price coordination while still allowing strategic discussion.

**B. Random Noise on Bid Count**
For non-top-rep players, the "number of bids" display adds +/- 1 random noise. Only 10000+ rep players see the exact count.

### 6.5 Anti-Bid-Manipulation

**A. Collateral is Real**
Every bid requires real money locked as collateral. You cannot "scare bid" without economic risk.

**B. Fulfillment Obligation**
Winning a bid and failing to fulfill costs reputation AND collateral. Repeated failures trigger a cooling-off period (see Section 8).

**C. Minimum Bid Floor**
The 10% minimum bid floor prevents "bid $1 to waste a contract slot" attacks.

### 6.6 Fairness Summary Matrix

| Threat | Mitigation | How Enforced |
|---|---|---|
| Whale bids on everything | 3 concurrent bid limit | DB constraint on activeBidCount |
| Whale always wins | Quality-weighted scoring (not pure price) | Bid eval algorithm |
| Whale chains consecutive wins | Per-tier cool-down + collateral escalation | Server-side checks |
| Alliance cartel | 40% alliance cap + bid secrecy | Transaction check |
| Alt accounts | IP rate limit + account age gate + pattern detection | Middleware + cron |
| Troll bids | Collateral + minimum bid floor + fulfillment penalties | DB constraints |
| New players shut out | Protected newcomer pool | Separate contract generation |

---

## 7. Contract Fulfillment Tracking

### 7.1 Post-Win Flow

1. Bid resolution runs (server cron, every 5 minutes).
2. Winner is selected (see Section 5).
3. Winner's `ContractBid.status` set to `'won'`.
4. `BiddingContract.status` set to `'awarded'`, `winnerId`, `winnerCompany`, `winningBid` populated.
5. `deliveryDeadline` calculated: `now() + (deliveryMonths * REAL_SECONDS_PER_GAME_MONTH * 1000)`.
6. All losing bids: `status = 'lost'`, collateral returned to player money.
7. Winner's collateral remains locked.
8. `BidHistory` entries created for all participants.
9. `PlayerActivity` entry created for winner announcement (visible in global activity feed).
10. Notifications dispatched (see Section 13).

### 7.2 Fulfillment Check Mechanism

Fulfillment is checked in two ways:

**A. On-demand (player claims fulfillment):**
The player hits the "Claim Fulfillment" button in their Active Bids panel. The server:
1. Loads the player's current `GameProfile` (including `buildingsData`, `resources`, `completedResearchList`, `shipsData`)
2. Evaluates the contract's requirements against the player's state
3. If all requirements met: marks fulfilled, pays out, returns collateral
4. If not: returns a progress report (e.g., "4/5 satellites deployed")

**B. Automatic (deadline check):**
The resolution cron (every 5 minutes) also checks awarded contracts approaching deadline:

```
SELECT * FROM BiddingContract
WHERE status = 'awarded' AND deliveryDeadline <= NOW();
```

For each expired contract:
1. Load winner's GameProfile
2. Check fulfillment progress
3. Apply partial delivery rules (if applicable to contract type)
4. Apply failure penalties if not fulfilled

### 7.3 Progress Tracking

Each contract type has a progress calculator:

```typescript
function calculateFulfillmentProgress(
  contract: BiddingContract,
  profile: GameProfile,
): { percentage: number; details: string } {
  const reqs = contract.requirements as ContractRequirements;

  switch (contract.contractType) {
    case 'satellite_deployment': {
      const count = countSatellitesAtLocation(profile.buildingsData, reqs.locationId);
      return {
        percentage: Math.min(100, (count / reqs.target) * 100),
        details: `${count}/${reqs.target} satellites at ${reqs.locationId}`,
      };
    }
    case 'resource_delivery': {
      const available = (profile.resources as Record<string, number>)[reqs.resourceId] || 0;
      return {
        percentage: Math.min(100, (available / reqs.target) * 100),
        details: `${available}/${reqs.target} ${reqs.resourceId} available`,
      };
    }
    // ... similar for other types
  }
}
```

Progress is displayed as a percentage bar in the "My Active Bids" panel.

### 7.4 Extension Requests

Players can request a deadline extension for certain contract types:

| Contract Type | Extension Available? | Extension Cost |
|---|---|---|
| Satellite Deployment | +1 game month | 10% of bid price deducted from payout |
| Resource Delivery | +1 game month | 15% of bid price deducted |
| Station Construction | +2 game months | 10% of bid price deducted |
| Fleet Transport | No | -- |
| Emergency Supply | No | -- |
| Research Partnership | +2 game months | 10% of bid price deducted |

Extensions can be requested once per contract, before the original deadline. The extension cost is deducted from the eventual payout, not from current balance.

---

## 8. Penalty System for Failed Contracts

### 8.1 Failure Modes

| Failure Mode | How It Happens |
|---|---|
| **Timeout** | Delivery deadline expires, requirements not met |
| **Voluntary Abandonment** | Player clicks "Abandon Contract" before deadline |
| **Partial Delivery** | Deadline expires, some but not all requirements met (resource/fleet contracts only) |

### 8.2 Penalty Table

| Failure Type | Payment | Collateral | Reputation | Cooling-Off |
|---|---|---|---|---|
| **Full timeout (0% progress)** | $0 | Forfeit 100% | -20 | 2 game months no bidding |
| **Partial delivery >= 75%** | 50% of bid price | Returned in full | -5 | None |
| **Partial delivery 50-74%** | 25% of bid price | Forfeit 25% | -10 | None |
| **Partial delivery 25-49%** | 0% | Forfeit 50% | -15 | 1 game month no bidding |
| **Partial delivery < 25%** | 0% | Forfeit 75% | -20 | 1 game month no bidding |
| **Voluntary abandonment** | 0% | Forfeit 50% | -10 | 1 game month no bidding |

### 8.3 Cooling-Off Period

When a player enters a cooling-off period, they cannot submit new bids on any contract. Their existing active bids remain valid (they can still win those). The cooling-off is tracked on `GameProfile.biddingCooldownUntil` (DateTime).

### 8.4 Repeated Failure Escalation

Failures within a rolling 30-day window stack penalties:

| Failures in 30 Days | Additional Penalty |
|---|---|
| 1st failure | Standard penalties only |
| 2nd failure | Collateral requirement permanently +5% for 30 days |
| 3rd failure | Bidding suspended for 3 game months (18 real hours) |
| 4th+ failure | Bidding suspended for 6 game months (36 real hours) + all existing bids auto-withdrawn |

### 8.5 Contract Re-listing

When a contract fails (timeout or abandonment):
- The contract's `status` changes to `'relisted'`
- It goes back on the bidding board with a fresh bid window (75% of original window length)
- The failed player's company name is shown as "Previous contractor failed" (public shame as deterrent)
- The relisted contract's estimated value is increased by 10% (client is willing to pay more after being burned)

### 8.6 Design Principle: Never Take Things Away

Critical: Failure penalties NEVER remove:
- Buildings the player constructed
- Research the player completed
- Ships the player built
- Resources beyond what was committed to the specific contract

Penalties are limited to: money (collateral), reputation (a number that recovers), and temporary bidding restrictions. The player's permanent game state is never rolled back.

---

## 9. Reputation and Reliability Score

### 9.1 Integration with Existing Reputation

The game already has a reputation system in `economic-systems.ts` with `REPUTATION_TIERS` and `getReputationTier()`. The bidding system extends this with a **reliability sub-score** that specifically tracks bidding behavior.

### 9.2 Bidding Reliability Score

In addition to the existing `reputation` integer on GameProfile, add a `biddingReliability` float (0.00 to 1.00):

```
Initial value: 0.50 (neutral for new bidders)

After each bidding contract outcome:
  if fulfilled on time:      reliability = reliability * 0.9 + 1.0 * 0.1
  if fulfilled with bonus:   reliability = reliability * 0.85 + 1.0 * 0.15
  if partial >= 75%:         reliability = reliability * 0.9 + 0.7 * 0.1
  if partial 50-74%:         reliability = reliability * 0.9 + 0.4 * 0.1
  if partial < 50%:          reliability = reliability * 0.9 + 0.1 * 0.1
  if timeout/fail:           reliability = reliability * 0.9 + 0.0 * 0.1
  if abandon:                reliability = reliability * 0.85 + 0.0 * 0.15
```

This is an exponential moving average. It takes about 10 successful contracts to go from 0.50 to 0.95. One failure drops you from 0.95 to ~0.86.

### 9.3 Reliability Effects on Bidding

| Reliability Range | Label | Effect |
|---|---|---|
| 0.90 - 1.00 | Excellent | +5% bonus on composite score; "Trusted Contractor" badge |
| 0.70 - 0.89 | Good | Normal bidding |
| 0.50 - 0.69 | Average | Normal bidding, but shown as "New" to clients |
| 0.30 - 0.49 | Poor | -10% penalty on composite score; warning shown to player |
| 0.00 - 0.29 | Unreliable | Cannot bid on Tier 3+ contracts; -20% composite penalty |

### 9.4 Reputation Events for Bidding

Extend the existing `REPUTATION_EVENTS` in `competitive-engine.ts`:

```typescript
// Add to REPUTATION_EVENTS:
bid_contract_fulfilled: 15,
bid_contract_fulfilled_fast: 25,    // Speed bonus
bid_contract_fulfilled_streak: 35,  // 3rd consecutive success
bid_contract_partial_delivery: -5,  // to -15 scaled
bid_contract_failed: -20,
bid_contract_abandoned: -10,
bid_placed_participation: 1,        // Small reward just for participating
bid_won_underdog: 50,               // Won contract 2+ tiers above player tier
```

### 9.5 Reputation Unlocks for Bidding

| Reputation | Perk |
|---|---|
| 0 (Unknown) | Cannot bid on any contracts. Must earn 100 rep from other activities first. |
| 100 (Recognized) | Can bid on Tier 1 contracts |
| 500 (Established) | Can bid on Tier 1-2; see estimated value range (e.g., "$200M-$400M") |
| 1000 (Respected) | Tier 1-3; see number of bidders per contract; 2% composite score bonus |
| 2500 (Prestigious) | All tiers; 5% composite score bonus; collateral reduced by 2% |
| 5000 (Legendary) | All tiers; 8% composite score bonus; see historical winning bids for similar contracts |
| 10000 (Galactic Authority) | All tiers; 12% composite score bonus; see exact bid count + range bucket; exclusive T5 contracts |

### 9.6 Bidding Statistics Tracked

On the player's profile (visible to others):

```
totalBidsPlaced: number
totalBidsWon: number
totalBidsLost: number
totalContractsFulfilled: number
totalContractsFailed: number
averageBidAccuracy: number    // How close winning bids were to estimated value
totalBiddingRevenue: number   // Lifetime earnings from bidding
currentWinStreak: number
bestWinStreak: number
biddingReliability: number    // 0.00-1.00
```

---

## 10. Database Schema (Prisma Models)

### 10.1 New Model: BiddingContract

```prisma
model BiddingContract {
  id                String    @id @default(cuid())

  // Contract definition
  contractType      String    // satellite_deployment, resource_delivery, station_construction,
                              // fleet_transport, research_partnership, emergency_supply, mining_rights_lease
  title             String
  client            String
  icon              String
  description       String    @db.Text
  tier              Int
  category          String    // procurement, supply, construction, transport, emergency, rights

  // Requirements (JSON array matching CompetitiveRequirement shape)
  // Example: [{ "type": "satellites_at_location", "target": 5, "locationId": "leo", "label": "5 LEO satellites" }]
  requirements      Json

  // Value bounds
  estimatedValue    Float     // Server-side estimate, hidden from most players
  minBid            Float     // 10% of estimatedValue
  maxBid            Float     // 200% of estimatedValue

  // Timing
  bidOpenAt         DateTime  // When bids open
  bidCloseAt        DateTime  // When bids close (resolution happens after this)
  bidLockAt         DateTime  // After this, no bid modifications (bidCloseAt - 6h, or -30m for emergency)
  deliveryMonths    Int       // Max game months to fulfill after winning
  gameMonthCreated  Int       // Game month when this was generated

  // State
  status            String    @default("open")
  // Possible values: open, closed, awarded, fulfilled, partially_fulfilled, failed, expired, relisted
  winnerId          String?   // GameProfile ID of winner
  winnerCompany     String?
  winningBid        Float?
  winningScore      Float?    // The composite score of the winning bid
  totalBids         Int       @default(0)

  // Fulfillment tracking
  awardedAt         DateTime?
  fulfilledAt       DateTime?
  fulfillmentPct    Float?    // 0.0-100.0, for partial delivery tracking
  deliveryDeadline  DateTime? // Calculated: awardedAt + deliveryMonths * 21600 * 1000

  // Extension
  extensionGranted  Boolean   @default(false)
  extensionMonths   Int?      // How many extra months granted
  extensionPenalty  Float?    // % of bid price deducted from payout

  // Source/generation
  generationType    String    @default("scheduled") // scheduled, event_driven, emergency
  triggerEventId    String?   // If event-driven, what triggered it
  isNewcomerPool    Boolean   @default(false)        // Only visible to new players

  // Relisting
  previousWinnerId  String?   // If relisted, who failed
  previousWinnerCompany String?
  relistCount       Int       @default(0)

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  bids              ContractBid[]

  @@index([status])
  @@index([tier])
  @@index([bidCloseAt])
  @@index([gameMonthCreated])
  @@index([contractType])
  @@index([status, bidCloseAt])
  @@index([isNewcomerPool])
}
```

### 10.2 New Model: ContractBid

```prisma
model ContractBid {
  id                String          @id @default(cuid())

  contractId        String
  contract          BiddingContract @relation(fields: [contractId], references: [id], onDelete: Cascade)

  profileId         String
  profile           GameProfile     @relation(fields: [profileId], references: [id], onDelete: Cascade)
  companyName       String

  // Bid details
  priceOffer        Float           // The amount the player bids
  deliveryPromise   Int             // Game months promised for delivery
  collateralAmount  Float           // Locked escrow amount (absolute $)
  collateralPct     Float           // Percentage used (5-25%)

  // Computed score (filled at resolution time)
  compositeScore    Float?          // The evaluation score

  // State
  status            String          @default("active")
  // Possible values: active, locked, won, lost, withdrawn
  isLocked          Boolean         @default(false)   // True after bidLockAt

  // Snapshot at time of bid (for evaluation)
  reputationAtBid   Int             @default(0)
  reliabilityAtBid  Float           @default(0.5)

  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@unique([contractId, profileId])  // One bid per player per contract
  @@index([contractId])
  @@index([profileId])
  @@index([status])
  @@index([profileId, status])
}
```

### 10.3 New Model: BidHistory

```prisma
model BidHistory {
  id                 String    @id @default(cuid())

  contractId         String
  contractTitle      String
  contractTier       Int
  contractType       String

  profileId          String
  companyName        String

  bidAmount          Float
  compositeScore     Float?    // Score at evaluation time
  outcome            String    // won, lost, withdrawn, expired

  // If won: fulfillment outcome
  paymentReceived    Float?
  bonusReceived      Float?
  collateralReturned Float?
  collateralLost     Float?
  fulfillmentResult  String?   // fulfilled, partial_75, partial_50, partial_25, failed, abandoned
  reputationChange   Int?
  reliabilityAfter   Float?    // Reliability score after this outcome

  resolvedAt         DateTime  @default(now())

  @@index([profileId])
  @@index([resolvedAt])
  @@index([contractType])
  @@index([profileId, resolvedAt])
  @@index([outcome])
}
```

### 10.4 Modifications to Existing GameProfile Model

Add the following fields to the existing `GameProfile` model in `prisma/schema.prisma`:

```prisma
// Add to existing GameProfile model:

// Bidding system fields
biddingReputation      Int       @default(0)     // Separate from existing reputation (or use same field)
biddingReliability     Float     @default(0.5)   // 0.00-1.00 reliability score
activeBidCount         Int       @default(0)     // Denormalized: active bids (for limit checks)
activeWonCount         Int       @default(0)     // Denormalized: awarded but unfulfilled contracts
wonContractsLast24h    Int       @default(0)     // For collateral escalation
lastBidWinAt           DateTime?                 // For per-tier cool-down tracking
lastBidWinTier         Int?                      // Tier of last won contract
bidWinStreak           Int       @default(0)     // Consecutive wins without failure
biddingCooldownUntil   DateTime?                 // If set, cannot bid until this time
failuresLast30Days     Int       @default(0)     // For escalating penalties

// Bidding statistics
totalBidsPlaced        Int       @default(0)
totalBidsWon           Int       @default(0)
totalContractsFulfilled Int      @default(0)
totalContractsFailed   Int       @default(0)
totalBiddingRevenue    Float     @default(0)
bestWinStreak          Int       @default(0)

// Relation
bids                   ContractBid[]
```

### 10.5 Handling Concurrent Bids (Transaction Design)

The critical race condition: two players submit bids at the same time on a contract about to close.

**Strategy: Optimistic locking with database constraints and Prisma transactions.**

```typescript
// Bid submission transaction (pseudocode):
await prisma.$transaction(async (tx) => {
  // 1. Lock the profile row for update
  const profile = await tx.gameProfile.findUnique({
    where: { id: profileId },
  });

  // 2. Validate constraints
  if (profile.activeBidCount >= 3) throw new Error('Max 3 active bids');
  if (profile.activeWonCount >= 2) throw new Error('Max 2 active won contracts');
  if (profile.biddingCooldownUntil && profile.biddingCooldownUntil > new Date())
    throw new Error('Cooling off period active');

  // Check per-tier cooldown
  if (profile.lastBidWinTier === contractTier) {
    const cooldownExpiry = new Date(profile.lastBidWinAt.getTime() + 6 * 3600 * 1000);
    if (cooldownExpiry > new Date()) throw new Error('Tier cooldown active');
  }

  // 3. Validate contract is still open and accepting bids
  const contract = await tx.biddingContract.findUnique({
    where: { id: contractId },
  });
  if (contract.status !== 'open') throw new Error('Contract not open');
  if (contract.bidCloseAt <= new Date()) throw new Error('Bid window closed');

  // 4. Validate bid amount
  if (priceOffer < contract.minBid || priceOffer > contract.maxBid)
    throw new Error('Bid out of range');

  // 5. Calculate collateral
  const baseCollateralPct = COLLATERAL_BY_TIER[contract.tier];
  const escalation = profile.wonContractsLast24h * 0.05;
  const collateralPct = Math.min(0.25, baseCollateralPct + escalation);
  const collateralAmount = priceOffer * collateralPct;

  // 6. Check player can afford collateral
  if (profile.money - collateralAmount < 1_000_000)
    throw new Error('Insufficient funds after collateral');

  // 7. Create bid + update profile atomically
  await tx.contractBid.create({
    data: {
      contractId, profileId, companyName: profile.companyName,
      priceOffer, deliveryPromise, collateralAmount, collateralPct,
      reputationAtBid: profile.biddingReputation || profile.reputation || 0,
      reliabilityAtBid: profile.biddingReliability,
    },
  });

  await tx.gameProfile.update({
    where: { id: profileId },
    data: {
      money: { decrement: collateralAmount },
      activeBidCount: { increment: 1 },
      totalBidsPlaced: { increment: 1 },
    },
  });

  // 8. Increment contract bid count
  await tx.biddingContract.update({
    where: { id: contractId },
    data: { totalBids: { increment: 1 } },
  });
});
```

The `@@unique([contractId, profileId])` constraint on ContractBid prevents duplicate bids at the database level even if the application check is bypassed.

No Redis required for MVP. PostgreSQL's row-level locking within `$transaction` is sufficient for the expected player count.

---

## 11. API Endpoints

### 11.1 List Active Contracts

```
GET /api/space-tycoon/bidding/contracts

Query params:
  tier?: number          // Filter by tier
  type?: string          // Filter by contractType
  status?: string        // Filter by status (default: 'open')

Response 200:
{
  contracts: [
    {
      id: string,
      contractType: string,
      title: string,
      client: string,
      icon: string,
      description: string,
      tier: number,
      category: string,
      requirements: ContractRequirements,
      minBid: number,
      maxBid: number,
      estimatedValueRange: string | null,   // Only if player rep >= 500
      bidOpenAt: string,
      bidCloseAt: string,
      bidLockAt: string,
      deliveryMonths: number,
      status: string,
      totalBids: number | null,             // Only if player rep >= 1000
      winnerCompany: string | null,         // Only if status is awarded/fulfilled
      winningBid: number | null,            // Only if resolved
      generationType: string,
      isNewcomerPool: boolean,
      myBid: {                              // Only if player has bid
        priceOffer: number,
        deliveryPromise: number,
        collateralAmount: number,
        status: string,
        isLocked: boolean,
      } | null,
    }
  ],
  meta: {
    total: number,
    gameMonth: number,
    nextGenerationAt: string,               // When next batch of contracts will be generated
  }
}
```

### 11.2 Place Bid

```
POST /api/space-tycoon/bidding/bids

Body:
{
  contractId: string,
  priceOffer: number,
  deliveryPromise: number,     // Game months (1 to contract.deliveryMonths)
}

Response 201 (success):
{
  success: true,
  bid: {
    id: string,
    contractId: string,
    priceOffer: number,
    deliveryPromise: number,
    collateralAmount: number,
    collateralPct: number,
    status: "active",
  },
  profile: {
    money: number,              // Updated balance
    activeBidCount: number,
  }
}

Response 400 (validation error):
{
  success: false,
  error: string,
  code: "MAX_BIDS_REACHED" | "INSUFFICIENT_FUNDS" | "BID_OUT_OF_RANGE"
       | "CONTRACT_CLOSED" | "COOLDOWN_ACTIVE" | "ALREADY_BID"
       | "ACCOUNT_TOO_NEW" | "ALLIANCE_CAP_REACHED" | "MAX_WON_REACHED"
}
```

### 11.3 Modify Bid

```
PUT /api/space-tycoon/bidding/bids/:bidId

Body:
{
  priceOffer: number,          // New price (optional)
  deliveryPromise: number,     // New delivery promise (optional)
}

Response 200:
{
  success: true,
  bid: { /* updated bid */ },
  collateralDelta: number,     // Positive = more locked, negative = some returned
}

Response 400:
{
  success: false,
  error: string,
  code: "BID_LOCKED" | "BID_NOT_FOUND" | "BID_OUT_OF_RANGE" | "INSUFFICIENT_FUNDS"
}
```

### 11.4 Withdraw Bid

```
DELETE /api/space-tycoon/bidding/bids/:bidId

Response 200:
{
  success: true,
  collateralReturned: number,
  profile: {
    money: number,
    activeBidCount: number,
  }
}

Response 400:
{
  success: false,
  error: string,
  code: "BID_LOCKED" | "BID_NOT_FOUND" | "ALREADY_WON"
}
```

### 11.5 View My Bids

```
GET /api/space-tycoon/bidding/my-bids

Query params:
  status?: string           // active, won, lost, withdrawn (default: all)

Response 200:
{
  bids: [
    {
      id: string,
      contract: {
        id: string,
        title: string,
        client: string,
        tier: number,
        status: string,
        bidCloseAt: string,
        deliveryDeadline: string | null,
      },
      priceOffer: number,
      deliveryPromise: number,
      collateralAmount: number,
      status: string,
      isLocked: boolean,
      compositeScore: number | null,
      fulfillmentProgress: {        // Only for won contracts
        percentage: number,
        details: string,
        deadline: string,
        extensionAvailable: boolean,
      } | null,
      createdAt: string,
    }
  ],
  stats: {
    activeBids: number,
    wonActive: number,
    totalPlaced: number,
    totalWon: number,
    winRate: number,
    reliability: number,
    winStreak: number,
  }
}
```

### 11.6 Claim Fulfillment

```
POST /api/space-tycoon/bidding/bids/:bidId/fulfill

Response 200 (fulfilled):
{
  success: true,
  result: "fulfilled",
  payment: number,
  bonuses: {
    speedBonus: number | null,
    perfectBonus: number | null,
    streakBonus: number | null,
    underdogBonus: number | null,
  },
  collateralReturned: number,
  reputationChange: number,
  newReliability: number,
}

Response 200 (not yet fulfilled):
{
  success: false,
  result: "incomplete",
  progress: {
    percentage: number,
    details: string,
    remainingTime: string,
  }
}
```

### 11.7 Abandon Contract

```
POST /api/space-tycoon/bidding/bids/:bidId/abandon

Response 200:
{
  success: true,
  collateralLost: number,
  collateralReturned: number,
  reputationChange: number,
  cooldownUntil: string | null,
}
```

### 11.8 Request Extension

```
POST /api/space-tycoon/bidding/bids/:bidId/extend

Response 200:
{
  success: true,
  newDeadline: string,
  payoutPenalty: number,       // % deducted from eventual payout
}

Response 400:
{
  success: false,
  error: string,
  code: "EXTENSION_NOT_AVAILABLE" | "ALREADY_EXTENDED" | "DEADLINE_PASSED"
}
```

### 11.9 Bid History

```
GET /api/space-tycoon/bidding/history

Query params:
  limit?: number (default 20, max 100)
  offset?: number (default 0)
  outcome?: string (won, lost, withdrawn)

Response 200:
{
  history: BidHistory[],
  total: number,
}
```

### 11.10 Contract Resolution (Server-Side Cron)

```
POST /api/space-tycoon/bidding/resolve
(Protected: server-only, called by cron job every 5 minutes)

Response 200:
{
  contractsResolved: number,
  contractsGenerated: number,
  deadlinesExpired: number,
}
```

---

## 12. UI Components

### 12.1 Where the Bidding Board Lives

The bidding board is a **sub-tab within the existing "contracts" tab** (`GameTab = 'contracts'`). The contracts tab gets internal sub-navigation:

```
Contracts Tab (existing)
  |-- Personal Contracts (existing static contracts from contracts.ts)
  |-- Competitive Contracts (existing FCFS contracts from competitive-contracts.ts)
  |-- Bidding Board (NEW)
  |-- My Active Bids (NEW)
  |-- Bid History (NEW)
```

The `GameTab` type in `types.ts` does not change. The sub-tabs are internal to the contracts panel component.

### 12.2 Component: BiddingBoard

The main listing of all open bidding contracts.

```
+------------------------------------------------------------------+
| BIDDING BOARD                                                     |
| [Filter: All Tiers v] [Type: All v] [Sort: Closing Soon v]       |
+------------------------------------------------------------------+
|                                                                    |
| EMERGENCY CONTRACTS                                    [red badge] |
| +--------------------------------------------------------------+ |
| | [!] URGENT: Helium-3 to Titan           Tier 3   Emergency   | |
| |     Client: Fusion Authority                                  | |
| |     Deliver 50 He-3 units                                     | |
| |     Estimated value: $40M-$60M/unit                           | |
| |     Bids: 2       Closes in: 0h 45m          [PLACE BID]     | |
| +--------------------------------------------------------------+ |
|                                                                    |
| STANDARD CONTRACTS                                                 |
| +--------------------------------------------------------------+ |
| | [satellite] LEO Satellite Deployment     Tier 1   Procurement | |
| |     Client: NASA                                              | |
| |     Deploy 5 satellites in LEO                                | |
| |     Bid range: $15M - $300M                                   | |
| |     Your bid: $220M [MODIFY] [WITHDRAW]                       | |
| |     Bids: 4       Closes in: 3h 22m       Locked in: 0h 22m  | |
| +--------------------------------------------------------------+ |
| +--------------------------------------------------------------+ |
| | [mining] Iron Delivery to Mars           Tier 2   Supply      | |
| |     Client: Mars Colony Authority                             | |
| |     Deliver 1000 iron                                         | |
| |     Estimated value: (need 500 rep to see)                    | |
| |     Bids: --       Closes in: 8h 15m          [PLACE BID]    | |
| +--------------------------------------------------------------+ |
| +--------------------------------------------------------------+ |
| | [station] Lunar Station Build            Tier 2   Construction| |
| |     Client: Artemis Program Office                            | |
| |     Build 1 station at lunar_orbit                            | |
| |     Bid range: $50M - $1B                                     | |
| |     Bids: --       Closes in: 18h 30m         [PLACE BID]    | |
| +--------------------------------------------------------------+ |
|                                                                    |
| RECENTLY COMPLETED                                                 |
| [sat] LEO Constellation -- Won by Nova Corp for $185M (6 bids)   |
| [mine] Titanium Supply  -- Won by StarForge for $2.1B (3 bids)   |
+------------------------------------------------------------------+
```

**Key UI behaviors:**
- Contracts sorted by `bidCloseAt` ascending (closing soon at top) by default
- Emergency contracts pinned to top with red/orange highlight
- Contracts the player has already bid on show their bid amount and modify/withdraw buttons
- Tier badges color-coded (green=1, blue=2, purple=3, gold=4, red=5)
- "Closes in" shows real-time countdown
- "Locked in" shows countdown until bids lock (only for contracts player has bid on)
- Bid count shown only to players with 1000+ reputation; "--" otherwise

### 12.3 Component: BidSubmissionModal

```
+--------------------------------------------------+
| PLACE BID                                         |
| Contract: LEO Satellite Deployment                |
| Client: NASA                     Tier 1           |
+--------------------------------------------------+
| Requirement: Deploy 5 LEO satellites              |
| Your progress: 3/5 (60%)         [progress bar]   |
+--------------------------------------------------+
|                                                    |
| Your bid price:  $[___________]                   |
|   Allowed range: $15M - $300M                     |
|   Suggestion: ~$150M (based on your costs)        |
|                                                    |
| Delivery promise: [___] game months               |
|   Maximum allowed: 3 months                       |
|   Your current capacity: ~2 months                |
|                                                    |
| ------------------------------------------------- |
| Collateral (8%):         $17.6M                   |
|   Will be locked from your balance                |
|                                                    |
| Your current balance:    $1,234M                  |
| After collateral lock:   $1,216.4M                |
|                                                    |
| Estimated profit:        ~$70M                    |
|   (bid price - estimated fulfillment cost)        |
|                                                    |
| Mentor penalty:          None                     |
|   (Your tier matches contract tier)               |
|                                                    |
| [CANCEL]                      [SUBMIT BID]        |
+--------------------------------------------------+
```

**Key UI behaviors:**
- Shows current progress toward the contract's requirements
- Shows "Suggestion" based on the player's estimated cost to fulfill (calculated from building/resource costs)
- Shows estimated profit (bid price minus estimated cost)
- Shows mentor penalty warning if applicable
- Grayed-out SUBMIT button until all validations pass
- After submission: brief success toast, modal closes, contract card updates to show bid

### 12.4 Component: MyActiveBids

```
+--------------------------------------------------+
| MY ACTIVE BIDS (2/3 slots used)                   |
+--------------------------------------------------+
|                                                    |
| [PENDING] LEO Satellite Deployment    Tier 1      |
|   Your bid: $220M   Collateral: $11M              |
|   Closes in: 3h 22m    Status: Awaiting result    |
|                                                    |
| [WON] Iron Delivery to Mars           Tier 2      |
|   Your bid: $800M   Payment on fulfillment        |
|   Progress: 350/500 iron (70%)    [=======   ]    |
|   Deadline: 14h 20m remaining                     |
|   [CLAIM FULFILLMENT] [REQUEST EXTENSION] [ABANDON]|
|                                                    |
| [LOST] Lunar Station Build             Tier 2     |
|   Your bid: $750M (lost to $680M by AlphaCorp)    |
|   Collateral: $75M returned                       |
+--------------------------------------------------+
|                                                    |
| Win Rate: 42% (5/12)    Streak: 2                |
| Reliability: 0.92 (Excellent)                     |
+--------------------------------------------------+
```

**Key UI behaviors:**
- Shows all bids (active, won, recently lost/withdrawn)
- Won contracts show fulfillment progress bar with live updates
- Countdown timer to deadline for won contracts
- Action buttons: Claim Fulfillment (checks requirements), Request Extension, Abandon
- Stats summary at bottom

### 12.5 Component: BidHistoryTable

```
+----------------------------------------------------------------------+
| BID HISTORY                     [Filter: All v] [Date: Last 7 days v] |
+----------------------------------------------------------------------+
| Date        | Contract                | Bid     | Outcome | Payout   |
|-------------|-------------------------|---------|---------|----------|
| Mar 23 2026 | LEO Constellation       | $185M   | WON     | $195M    |
| Mar 22 2026 | Iron Supply             | $400M   | LOST    | --       |
| Mar 21 2026 | Mars Station Build      | $2.1B   | WON     | $2.3B    |
| Mar 20 2026 | Emergency He-3          | $45M/u  | WON     | $38M/u   |
| Mar 19 2026 | Satellite Deployment    | $120M   | WITHDRAWN | --     |
+----------------------------------------------------------------------+
| Totals: 12 bids, 7 won, 3 lost, 2 withdrawn                         |
| Revenue: $4.8B     Avg profit margin: 18%                            |
+----------------------------------------------------------------------+
```

### 12.6 Component: ContractDetailPanel

Shown when clicking on a contract card. Full details:

- Contract description and client lore
- Detailed requirements with player's current progress on each
- Estimated cost to fulfill (calculated from player's current state)
- Bid range and value estimate (if reputation allows)
- Historical data: how many times this contract type has been posted, average winning bid (if reputation allows)
- List of recent winners for this contract type (public info)
- Place Bid / Modify Bid button

---

## 13. Notification System

### 13.1 Integration with Existing Systems

The game has two notification channels:
1. **In-game toast** (`src/lib/toast.ts` + `src/components/ui/Toast.tsx`) -- ephemeral, shown during active play
2. **Notification model** (`Notification` in Prisma) -- persistent, linked to `User`, shown in notification center
3. **PlayerActivity model** -- global activity feed visible to all players

Bidding notifications use all three.

### 13.2 Notification Events

| Event | Toast? | Persistent Notification? | Activity Feed? | Sound? |
|---|---|---|---|---|
| New contract available (matching your tier) | Yes (info) | Yes | No | Subtle chime |
| Emergency contract appears | Yes (warning, red) | Yes | Yes ("Emergency contract posted") | Alert tone |
| Your bid is submitted | Yes (success) | No | No | Click |
| Your bid is modified | Yes (info) | No | No | Click |
| Your bid wins | Yes (celebration, gold) | Yes | Yes ("[Company] won [Contract]") | Victory fanfare |
| Your bid loses | Yes (subtle, gray) | Yes | No | None |
| Fulfillment deadline in 1 real hour | Yes (warning, orange) | Yes | No | Warning tone |
| Fulfillment deadline in 15 minutes | Yes (critical, red) | Yes | No | Urgent alert |
| Contract fulfilled successfully | Yes (celebration, gold) | Yes | Yes ("[Company] completed [Contract]") | Cash register |
| Speed bonus earned | Yes (celebration) | Yes | Yes | Bonus chime |
| Streak bonus earned | Yes (celebration) | Yes | Yes | Streak fanfare |
| Contract failed (timeout) | Yes (error, red) | Yes | Yes ("[Company] failed [Contract]") | Failure tone |
| Contract abandoned | Yes (warning) | Yes | No | None |
| Collateral returned (bid lost) | Yes (info) | No | No | None |
| Collateral forfeited (failure) | Yes (error) | Yes | No | None |
| Cooling-off period started | Yes (warning) | Yes | No | None |
| Cooling-off period ended | Yes (info) | Yes | No | Subtle chime |
| Newcomer pool contract available | Yes (info, blue) | Yes (for new players only) | No | Welcome chime |

### 13.3 Notification Content Templates

```typescript
const BIDDING_NOTIFICATIONS = {
  bid_won: {
    title: 'Contract Won!',
    message: 'Your bid of ${amount} for "${contractTitle}" was selected! You have ${deliveryMonths} game months to fulfill.',
    type: 'bid_won',
  },
  bid_lost: {
    title: 'Bid Not Selected',
    message: 'Your bid for "${contractTitle}" was not selected. Collateral of ${collateral} has been returned.',
    type: 'bid_lost',
  },
  deadline_warning_1h: {
    title: 'Deadline Approaching',
    message: '"${contractTitle}" fulfillment deadline is in 1 hour. Progress: ${progress}%.',
    type: 'bid_deadline_warning',
  },
  contract_fulfilled: {
    title: 'Contract Complete!',
    message: 'You fulfilled "${contractTitle}"! Payment: ${payment}. Collateral returned: ${collateral}. Reputation: +${rep}.',
    type: 'bid_fulfilled',
  },
  contract_failed: {
    title: 'Contract Failed',
    message: 'Deadline for "${contractTitle}" has passed. ${collateralLost} collateral forfeited. Reputation: ${repChange}.',
    type: 'bid_failed',
  },
  emergency_contract: {
    title: 'EMERGENCY CONTRACT',
    message: 'Urgent: "${contractTitle}" posted. Bid window closes in ${timeRemaining}.',
    type: 'bid_emergency',
  },
};
```

### 13.4 Activity Feed Entries

Winner announcements are posted to the global `PlayerActivity` feed (visible to all players on the leaderboard/activity tab):

```typescript
// On bid win:
await prisma.playerActivity.create({
  data: {
    profileId: winnerId,
    companyName: winnerCompany,
    type: 'bidding_contract_won',
    title: `${winnerCompany} won "${contractTitle}"`,
    description: `Winning bid: $${formatMoney(winningBid)} (${totalBids} bids)`,
    metadata: {
      contractId, contractType, contractTier,
      winningBid, totalBids,
    },
  },
});

// On contract fulfilled:
await prisma.playerActivity.create({
  data: {
    profileId: winnerId,
    companyName: winnerCompany,
    type: 'bidding_contract_fulfilled',
    title: `${winnerCompany} completed "${contractTitle}"`,
    description: bonuses.length > 0
      ? `Earned ${bonuses.join(', ')} bonuses!`
      : `Contract fulfilled on time.`,
    metadata: {
      contractId, paymentReceived, bonusReceived, fulfillmentTimeMonths,
    },
  },
});
```

---

## 14. Implementation Phases

### Phase 1: Core Bidding (MVP) -- ~8 days

**Goal:** Players can see contracts, place sealed bids, and get results.

| Task | Effort | Files |
|---|---|---|
| Prisma schema: 3 new models + GameProfile changes | 1 day | `prisma/schema.prisma` |
| Contract generation engine (scheduled only, no event-driven) | 1.5 days | New: `src/lib/game/bidding-contracts.ts` |
| Bid submission API (POST + PUT + DELETE) | 1 day | New: `src/app/api/space-tycoon/bidding/bids/route.ts` |
| Contract listing API (GET) | 0.5 day | New: `src/app/api/space-tycoon/bidding/contracts/route.ts` |
| Bid resolution cron (resolve + generate) | 1 day | New: `src/app/api/space-tycoon/bidding/resolve/route.ts` |
| Bidding Board UI (sub-tab in contracts) | 2 days | New component in game UI |
| Toast notifications for bid results | 0.5 day | Extend existing toast system |
| Basic tests | 0.5 day | New test file |

**What is included:**
- 3 contract types: satellite_deployment, resource_delivery, station_construction
- Sealed-bid, first-price reverse auction
- Collateral system
- Basic winner selection (composite score)
- BiddingBoard, BidSubmissionModal, MyActiveBids components
- Toast notifications for win/loss

**What is NOT included:**
- Event-driven contracts
- Fleet transport, research partnership, emergency supply, mining rights types
- Fulfillment tracking (manual claim only)
- Anti-whale protections beyond bid limit
- Bid history
- Reliability score

### Phase 2: Fulfillment + Penalties -- ~5 days

**Goal:** Won contracts must be fulfilled within deadlines, with real consequences.

| Task | Effort | Files |
|---|---|---|
| Fulfillment checker (progress calculation) | 1 day | Extend `bidding-contracts.ts` |
| Claim fulfillment API | 0.5 day | New route |
| Deadline enforcement (cron extension) | 1 day | Extend resolve route |
| Penalty system (collateral forfeiture, rep loss, cooldown) | 1 day | Extend bidding-contracts.ts |
| Extension request API + UI | 0.5 day | New route + modal |
| MyActiveBids progress bars + deadline countdown | 0.5 day | Update component |
| Persistent notifications (Notification model entries) | 0.5 day | Extend notification logic |

### Phase 3: Anti-Gaming + Fairness -- ~4 days

**Goal:** Prevent whales, alt accounts, and cartels from ruining the economy.

| Task | Effort | Files |
|---|---|---|
| Per-tier cool-down enforcement | 0.5 day | Extend bid submission |
| Collateral escalation | 0.5 day | Extend bid submission |
| Mentor penalty (overqualified bidders) | 0.5 day | Extend bid evaluation |
| Alliance 40% cap | 0.5 day | Extend bid submission |
| Newcomer protected pool | 1 day | Contract generation + separate UI section |
| IP rate limiting for bids | 0.5 day | Extend middleware |
| Account age gate | 0.25 day | Extend bid submission |
| Repeated failure escalation | 0.25 day | Extend penalty logic |

### Phase 4: Full Contract Types + Events -- ~5 days

**Goal:** All 7 contract types live, plus event-driven generation.

| Task | Effort | Files |
|---|---|---|
| Fleet transport contract type | 0.5 day | Extend bidding-contracts.ts |
| Research partnership contract type | 0.5 day | Extend bidding-contracts.ts |
| Emergency supply contract type | 0.5 day | Extend bidding-contracts.ts |
| Mining rights lease (forward auction) | 1 day | Extend evaluation + new lease mechanic |
| Event-driven contract triggers | 1 day | Extend generation engine |
| Scarcity-based emergency spawning | 0.5 day | Integration with economic-systems.ts |
| Economic cycle modifiers on values | 0.5 day | Integration with competitive-engine.ts |
| Player count scaling | 0.5 day | Extend generation |

### Phase 5: Reputation + History + Polish -- ~4 days

**Goal:** Full reliability system, bid history, analytics, and polish.

| Task | Effort | Files |
|---|---|---|
| Bidding reliability score (EMA) | 0.5 day | Extend bidding-contracts.ts |
| Reliability effects on composite score | 0.5 day | Extend evaluation |
| Reputation unlock gates (value range, bid count, historical) | 0.5 day | Extend contract listing API |
| Bid history table + API | 1 day | New route + component |
| Contract detail panel | 0.5 day | New component |
| Activity feed integration | 0.5 day | Extend PlayerActivity creation |
| Achievement track for bidding ("Seasoned Bidder", etc.) | 0.5 day | Extend achievements.ts |

### Phase 6: Testing + Load Testing -- ~3 days

| Task | Effort |
|---|---|
| Unit tests: generation algorithm, evaluation algorithm, penalty calculation | 1 day |
| Integration tests: bid submission flow, resolution flow, fulfillment flow | 1 day |
| Load testing: simulate 100 concurrent bids, verify no race conditions | 0.5 day |
| Edge case testing: alliance cap, cooldowns, collateral math | 0.5 day |

### Total Estimated Effort

| Phase | Days | Cumulative |
|---|---|---|
| Phase 1: Core Bidding (MVP) | 8 | 8 |
| Phase 2: Fulfillment + Penalties | 5 | 13 |
| Phase 3: Anti-Gaming + Fairness | 4 | 17 |
| Phase 4: Full Contract Types + Events | 5 | 22 |
| Phase 5: Reputation + History + Polish | 4 | 26 |
| Phase 6: Testing | 3 | 29 |

**Minimum viable release: Phases 1+2 = 13 days.** Players can bid, win, fulfill, and face consequences. All other phases are incremental enhancements.

---

## Appendix A: Value Calibration Table

These values are calibrated against the game's revenue targets from `competitive-engine.ts`:

| Game Month | Player Revenue | Affordable Contracts | Typical Profit Margin |
|---|---|---|---|
| 1-6 | $10M-$50M/mo | Tier 1 ($100M-$200M contracts) | 20-30% |
| 6-12 | $50M-$200M/mo | Tier 1-2 ($200M-$1B) | 15-25% |
| 12-24 | $200M-$1B/mo | Tier 2-3 ($500M-$10B) | 15-25% |
| 24-48 | $1B-$5B/mo | Tier 3-4 ($5B-$50B) | 10-20% |
| 48+ | $5B+/mo | Tier 4-5 ($20B-$200B) | 10-15% |

Target profit margins decrease at higher tiers to maintain challenge. The estimated values are set so that a player bidding at the actual cost would win (lowest bid) but earn zero profit. Realistic winning bids will be 10-30% above cost.

## Appendix B: Contract Client Pool

NPC clients give the contracts thematic flavor:

| Client | Category | Tiers | Flavor |
|---|---|---|---|
| NASA | Government procurement | 1-3 | Traditional, well-funded |
| ESA | Scientific research | 1-3 | Collaborative, moderate budgets |
| DARPA | Military/defense | 2-4 | Cutting-edge, demanding |
| Artemis Program Office | Lunar operations | 2-3 | Flagship program, prestigious |
| Mars Colony Authority | Mars settlement | 3-4 | Frontier, high stakes |
| World Telecommunications Union | Satellite services | 1-2 | Volume contracts |
| Interplanetary Mining Consortium | Resource extraction | 2-4 | Profit-driven |
| United Nations Space Command | Deep space | 3-5 | Humanity's ambition |
| Fusion Authority | Energy | 3-4 | Science-driven |
| Board of Directors | Corporate | 1-2 | Internal company growth |
| Outer Planets Foundation | Exploration | 4-5 | Frontier science |

## Appendix C: References and Prior Art

### Games Researched
- **EVE Online**: Auction contracts, regional markets, sniping problems. Lessons: sealed bids avoid sniping; server-driven resolution fits async play.
- **Prosperous Universe**: Player-driven contracts with deadlines, graduated penalties for breach. Lessons: partial delivery is better than binary success/fail.
- **Power Grid / Ra / Modern Art**: Board game auction mechanics. Lessons: imperfect information about value is what makes auctions interesting.

### Academic Auction Theory
- **Winner's Curse**: In first-price sealed-bid auctions, winners tend to overpay. Our reverse-auction format creates an inverted winner's curse (winner may underestimate costs). Collateral and partial delivery mitigate this.
- **Strategic equivalence**: Dutch auctions and first-price sealed-bid are strategically equivalent. We chose sealed-bid for UX (async play).
- **Risk aversion and revenue**: First-price auctions generate more revenue when bidders are risk-averse. In our reverse format, risk-averse players bid higher prices (safer margins), which is a healthy outcome.

### Database Design References
- Red Gate: "An Online Auction Data Model"
- GeeksforGeeks: "How to Design a Database for Online Auction and Bidding Platforms"
- Codemia: "System Design for an Online Bidding System"
