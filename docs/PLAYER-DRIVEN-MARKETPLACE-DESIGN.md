# Player-Driven Marketplace Enhancement -- Comprehensive Implementation Design

**Version:** 2.0
**Date:** 2026-03-23
**Status:** Design Phase
**Depends on:** Existing market system (`MarketResource`, `MarketOrder`, `ResourceBounty`, `market-engine.ts`)
**Target architecture:** Next.js 14 (App Router), Prisma ORM, PostgreSQL, TypeScript

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Order Book System](#2-order-book-system)
3. [Player-to-Player Trading Mechanics](#3-player-to-player-trading-mechanics)
4. [NPC Market Maker / Liquidity Floor](#4-npc-market-maker--liquidity-floor)
5. [Price History and Charting](#5-price-history-and-charting)
6. [Supply/Demand Dynamics](#6-supplydemand-dynamics)
7. [Price Alert System](#7-price-alert-system)
8. [Market Manipulation Prevention](#8-market-manipulation-prevention)
9. [Trading Fees and Tax Structure](#9-trading-fees-and-tax-structure)
10. [Market Depth Visualization](#10-market-depth-visualization)
11. [Futures/Options Contracts](#11-futuresoptions-contracts-advanced)
12. [Database Schema](#12-database-schema)
13. [API Endpoints](#13-api-endpoints)
14. [Real-Time Updates](#14-real-time-updates)
15. [UI Components](#15-ui-components)
16. [Implementation Phases](#16-implementation-phases)
17. [Appendices](#17-appendices)

---

## 1. Executive Summary

### Current State

The Space Tycoon market is a **server-set single-price system**. When a player buys or sells, the global `currentPrice` on `MarketResource` shifts via `calculatePriceAfterTrade()`. All players see the same price. There is no order book, no bid/ask spread, no way to set a target price and wait. The `ResourceBounty` system provides a primitive form of limit buy orders (post a price, wait for someone to fill it), but it is disconnected from the main market and limited to buy-side only.

### Target State

A **hybrid player-driven marketplace** with:
- A persistent order book with limit orders (buy and sell)
- Market orders that walk the book for immediate execution
- NPC Market Makers providing permanent liquidity backstop
- OHLCV price history with candlestick charting
- Configurable price alerts
- Anti-manipulation safeguards and trading fees as economic sinks
- Market depth visualization
- Optional futures contracts for endgame speculation

### Design Philosophy

| Principle | Application |
|-----------|-------------|
| Never take things away | Existing buy/sell buttons remain unchanged. New features are additive. |
| Async-first | Order matching runs in batch (on placement + 60s sync), not real-time WebSocket. |
| Percentage-based metrics | All fees, caps, and limits scale with player size or use percentages, not flat amounts. |
| Casual-accessible, veteran-deep | Default UI is identical to current. Advanced features in opt-in tabs. |
| Single global market | No regional markets. Player base is too small to split liquidity. |

### Reference Games

| Game | What we take | What we skip |
|------|-------------|--------------|
| Prosperous Universe | Commodity exchange UI, visible order book with horizontal bars, simple order entry | Multiple regional exchanges (we use one global market) |
| EVE Online | Price-time FIFO matching, broker fee + sales tax model, market history charts | Regional markets, 0.01 ISK wars, derivative contracts |
| RuneScape Grand Exchange | Transaction tax as anti-manipulation, buy limits per item, simplicity | 4-hour buy limits (too restrictive for our pace) |
| Idle MMO / Industry Idle | Async matching, batch processing, lightweight server design | Fully player-driven (we keep NPC backstop) |

---

## 2. Order Book System

### 2.1 Order Types

#### Market Orders (Enhanced Existing)

**Current:** Player buys/sells at `currentPrice`. Price shifts via `calculatePriceAfterTrade()`.

**Enhanced:**
- Market buy fills against the cheapest open sell orders in the book, walking up the ask side.
- Market sell fills against the highest open buy orders, walking down the bid side.
- If no player orders exist, fills against the NPC Market Maker (Section 4).
- Partial fills across multiple counterparties are allowed.
- Any unfilled remainder of a market order is **cancelled** (market orders never rest in the book).

**Price impact under the new system:** Because market orders walk the book, buying 100 units costs progressively more per unit. The first 50 might fill at $5,000, the next 30 at $5,200, the last 20 at $5,400. This is self-balancing and realistic.

#### Limit Orders (New)

A standing order to buy or sell at a specific price.

**Limit Buy:** "Buy 50 iron at $4,000/unit or less." Sits in the book until a sell order at or below $4,000 appears.

**Limit Sell:** "Sell 20 titanium at $30,000/unit or more." Sits in the book until a buy order at or above $30,000 appears.

**Expiration options:** 1 hour, 6 hours, 24 hours (default), 72 hours, 1 week.

**Order limits per player:**

| Player Status | Max Open Orders | Max Alerts |
|--------------|----------------|------------|
| Base | 20 | 5 |
| Alliance member | 30 | 10 |
| Reputation "Established" (500+) | 35 | 12 |
| Reputation "Legendary" (5000+) | 50 | 20 |

**Escrow system:**
- **Buy orders:** `price * quantity * (1 + feeRate)` is deducted from the player's money and held in escrow. Returned if the order is cancelled or expires.
- **Sell orders:** `quantity` of the resource is deducted from inventory and held in escrow. Returned if cancelled or expired.
- This prevents a player from placing orders they cannot fulfill.

**Price bands:** Limit order prices must fall within:
- `minPrice` to `maxPrice` of the resource (absolute bounds from `resources.ts`)
- Additionally, within `basePrice * 0.3` to `basePrice * 3.0` (30% to 300% of base). This is wider than the minPrice/maxPrice on most resources but acts as a sanity check during extreme events.

### 2.2 Order Matching Algorithm

**Algorithm: Price-Time FIFO (First In, First Out)**

This is the industry standard used by most real exchanges, EVE Online, and Prosperous Universe. It is the simplest, most fair, and most predictable algorithm.

**Rules:**
1. Orders match when the best buy price >= best sell price.
2. At the same price level, the earliest order fills first.
3. The execution price is the **resting order's price** (the order already in the book), not the incoming order's price.
4. Partial fills are allowed. An order for 50 can fill 30 now, 20 later.

**Matching trigger points:**
1. On every new order placement (immediate attempt).
2. During the 60-second sync cycle (catches edge cases).
3. After NPC Market Maker order refresh (every 5 minutes).

**Pseudocode:**

```
function matchOrdersForResource(resourceSlug: string):
  buyOrders = findAll({
    resourceSlug,
    side: 'buy',
    status: ['open', 'partial'],
    orderBy: [{ price: 'desc' }, { createdAt: 'asc' }]
  })

  sellOrders = findAll({
    resourceSlug,
    side: 'sell',
    status: ['open', 'partial'],
    orderBy: [{ price: 'asc' }, { createdAt: 'asc' }]
  })

  fills = []
  bi = 0, si = 0

  while bi < buyOrders.length AND si < sellOrders.length:
    bestBuy  = buyOrders[bi]
    bestSell = sellOrders[si]

    if bestBuy.price < bestSell.price:
      break  // No more crossable orders

    // Execution price = resting order's price
    executionPrice = bestBuy.createdAt < bestSell.createdAt
      ? bestBuy.price
      : bestSell.price

    fillQty = min(bestBuy.remainingQty, bestSell.remainingQty)

    // Create fill record
    fill = createFill(bestBuy, bestSell, fillQty, executionPrice)
    fills.push(fill)

    // Update order states
    bestBuy.filledQty += fillQty
    bestBuy.remainingQty -= fillQty
    bestSell.filledQty += fillQty
    bestSell.remainingQty -= fillQty

    if bestBuy.remainingQty == 0:
      bestBuy.status = 'filled'
      bi++
    else:
      bestBuy.status = 'partial'

    if bestSell.remainingQty == 0:
      bestSell.status = 'filled'
      si++
    else:
      bestSell.status = 'partial'

    // Transfer: seller gets (fillQty * executionPrice) - sellerFee
    // Transfer: buyer gets fillQty resources, pays fillQty * executionPrice + buyerFee
    // Excess escrow (if buy price > execution price) is refunded to buyer

  // Update MarketResource cached fields
  updateBestBidAsk(resourceSlug)
  updateLastTradePrice(resourceSlug, fills)
  updatePriceCandles(resourceSlug, fills)
  checkPriceAlerts(resourceSlug)

  return fills
```

**Performance:** With at most a few hundred orders per resource across 12 resources, matching is O(n) per resource where n = number of fills. Total matching for all resources completes in single-digit milliseconds. No binary-heap or red-black-tree optimizations needed at this scale.

**Concurrency:** Matching for each resource is wrapped in a Prisma `$transaction` with `serializable` isolation to prevent race conditions when two orders arrive simultaneously.

### 2.3 Order Lifecycle

```
                    ┌─────────┐
     Place Order───>│  OPEN   │
                    └────┬────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
              v          v          v
         ┌────────┐ ┌────────┐ ┌──────────┐
         │PARTIAL │ │ FILLED │ │CANCELLED │
         └───┬────┘ └────────┘ └──────────┘
             │                       ^
             │     ┌─────────┐       │
             └────>│ FILLED  │       │
             │     └─────────┘       │
             │                       │
             └───── (on cancel) ─────┘
                         │
                    ┌────────┐
                    │EXPIRED │  (cron job)
                    └────────┘
```

**Status transitions:**
- `open` -> `partial` (first partial fill)
- `open` -> `filled` (fully filled in one match)
- `open` -> `cancelled` (player cancels)
- `open` -> `expired` (expiration reached)
- `partial` -> `filled` (remaining qty filled)
- `partial` -> `cancelled` (player cancels remaining)
- `partial` -> `expired` (expiration reached with unfilled remainder)

**On cancellation/expiry of buy orders:** Refund `remainingQty * price * (1 + feeRate)` to player's money.
**On cancellation/expiry of sell orders:** Return `remainingQty` of resource to player's inventory.

---

## 3. Player-to-Player Trading Mechanics

### 3.1 How Orders Get Filled

When Player A places a sell order for 50 iron at $5,000 and Player B places a buy order for 30 iron at $5,200:

1. Player B's buy price ($5,200) >= Player A's sell price ($5,000).
2. Player A's order was placed first (resting), so execution price = $5,000.
3. Fill quantity = min(30, 50) = 30 units.
4. Player B pays: 30 * $5,000 = $150,000 + 2% fee = $153,000.
5. Player A receives: 30 * $5,000 = $150,000 - 2% fee = $147,000.
6. Player B's buy order is fully filled (status: `filled`).
7. Player A's sell order has 20 remaining (status: `partial`).
8. Excess escrow refunded to Player B: they escrowed at $5,200/unit but paid $5,000/unit, so (30 * $200 * 1.02) = $6,120 refunded.

### 3.2 Partial Fills

A market buy for 100 iron walks the sell book:

| Ask Price | Available | Filled | Cumulative Cost |
|-----------|-----------|--------|-----------------|
| $4,800 | 30 | 30 | $144,000 |
| $5,000 | 40 | 40 | $200,000 |
| $5,200 | 50 | 30 (only need 30 more) | $156,000 |
| **Total** | | **100** | **$500,000** |
| **Average price** | | | **$5,000/unit** |
| **Fee (2%)** | | | **$10,000** |
| **Player pays** | | | **$510,000** |

The seller at $5,200 has 20 units remaining in the book after this fill.

### 3.3 Cross-Alliance Trading

There are no restrictions on who can trade with whom. Alliance members trade freely with non-members and rival alliances. This maximizes liquidity and prevents fragmentation.

Alliance benefits for trading:
- +10 max open orders (30 vs 20 base).
- +5 max price alerts (10 vs 5 base).
- Alliance tax revenue from member trades (see Section 9).

### 3.4 Self-Trade Prevention

- A player **cannot** fill their own orders (enforced server-side; `buyerProfileId !== sellerProfileId` check in matching engine).
- One `GameProfile` per authenticated `User` (enforced by `userId @unique` on `GameProfile`).
- No direct player-to-player transfer outside the order book. All trades go through the market.

---

## 4. NPC Market Maker / Liquidity Floor

### 4.1 Purpose

Ensure every resource always has at least one buy and one sell order. A casual player logging in at 3 AM must be able to sell iron immediately, even if no other players are online.

The NPC Market Maker is **permanent**. It never goes away. Even EVE Online retains some NPC sell orders. A game without guaranteed counterparties frustrates casual players.

### 4.2 NPC Pricing Formula

```
NPC Ask (sell) price = currentPrice * (1 + NPC_SPREAD_HALF)
NPC Bid (buy) price  = currentPrice * (1 - NPC_SPREAD_HALF)

where NPC_SPREAD_HALF = 0.10 (10% each side = 20% total spread)
```

**Concrete examples:**

| Resource | Current Price | NPC Bid (buy from player) | NPC Ask (sell to player) | Spread |
|----------|--------------|--------------------------|-------------------------|--------|
| Iron | $5,000 | $4,500 | $5,500 | $1,000 (20%) |
| Titanium | $25,000 | $22,500 | $27,500 | $5,000 (20%) |
| Platinum Group | $500,000 | $450,000 | $550,000 | $100,000 (20%) |
| Exotic Materials | $2,000,000 | $1,800,000 | $2,200,000 | $400,000 (20%) |
| Helium-3 | $5,000,000 | $4,500,000 | $5,500,000 | $1,000,000 (20%) |

The 20% spread is deliberately wide. Any player offering a tighter spread beats the NPC and gets filled first. This naturally incentivizes player participation.

### 4.3 NPC Volume Limits

NPC liquidity is not infinite. Per resource, per 24 hours:

| Resource Category | Max NPC Buy Volume | Max NPC Sell Volume |
|-------------------|-------------------|-------------------|
| Common (iron, aluminum, water, methane, ethane) | 200 units | 200 units |
| Mid-tier (titanium, gold, rare_earth, platinum_group, mars_water) | 50 units | 50 units |
| Exotic (exotic_materials, helium3) | 10 units | 10 units |

Volume resets at midnight UTC. When NPC volume is exhausted, the NPC orders are removed from the book until reset. This prevents the NPC from undermining scarcity economics.

### 4.4 Interaction with Market Events

During active `MarketEvent`s from `market-events.ts`, NPC prices shift:

```
NPC Ask during event = currentPrice * (1 + NPC_SPREAD_HALF) * eventMultiplier
NPC Bid during event = currentPrice * (1 - NPC_SPREAD_HALF) * eventMultiplier
```

Example: During "Titanium Demand Surge" (multiplier 1.5x):
- Normal NPC Bid for titanium: $22,500
- Event NPC Bid: $22,500 * 1.5 = **$33,750** (NPC willing to pay much more)
- This creates real profit opportunity for players who stockpiled titanium.

### 4.5 NPC Company Integration

The 6 existing NPC companies (from `npc-companies.ts`) already produce and consume resources. Instead of invisible market pressure via `npcMarketPressure`, they now place visible limit orders in the book:

- Each NPC company places 2-4 limit orders per resource they produce/consume.
- Orders are staggered at different price levels around `currentPrice`.
- NPC company orders are labeled with the NPC company name in the UI.
- NPC company orders have 6-hour expiration and auto-refresh.
- This seeds the book with ~30-50 visible orders across all resources.

### 4.6 Idle Decay Interaction

The existing `calculateIdleDecay` function continues to run, pulling `currentPrice` toward `basePrice` when no trades occur. NPC Market Maker prices move with `currentPrice`, so during quiet periods:
1. `currentPrice` drifts toward `basePrice`.
2. NPC bid/ask drift with it.
3. This maintains a consistent spread even during low activity.

Mining pressure via `calculatePriceAfterMining` also continues to shift `currentPrice`, which shifts NPC prices accordingly.

---

## 5. Price History and Charting

### 5.1 OHLCV Candle Data Model

Store **1-hour OHLCV** candles in a dedicated table. Larger timeframes (4h, daily, weekly) are computed by aggregation on read.

**Candle fields:**
- `open`: Price of first trade in the period
- `high`: Highest trade price in the period
- `low`: Lowest trade price in the period
- `close`: Price of last trade in the period
- `volume`: Total units traded
- `tradeCount`: Number of individual fills

**Why 1-hour resolution:** The game runs on a 60-second sync cycle with 2-second ticks (30 ticks/game month). One-hour candles capture meaningful price movement without excessive data. Storage estimate:

```
12 resources * 24 candles/day * 365 days = 105,120 rows/year
Over 5 years: ~525,000 rows
Row size: ~120 bytes
Total: ~63 MB over 5 years
```

This is trivial for PostgreSQL. No need for TimescaleDB or specialized time-series databases.

### 5.2 Candle Construction

Candles are built incrementally. Each `MarketFill` updates the current hour's candle via upsert:

```
function updatePriceCandle(resourceSlug, executionPrice, fillQty, executedAt):
  periodStart = floor(executedAt to hour)  // e.g., 14:00:00

  existingCandle = findCandle(resourceSlug, '1h', periodStart)

  if existingCandle:
    update:
      highPrice = max(existingCandle.highPrice, executionPrice)
      lowPrice  = min(existingCandle.lowPrice, executionPrice)
      closePrice = executionPrice
      volume += fillQty
      tradeCount += 1
  else:
    create:
      openPrice = executionPrice
      highPrice = executionPrice
      lowPrice  = executionPrice
      closePrice = executionPrice
      volume = fillQty
      tradeCount = 1
```

### 5.3 Larger Timeframe Aggregation

Computed on the API read path, not stored:

```sql
-- 4-hour candles
SELECT
  resource_slug,
  date_trunc('hour', period_start) - (EXTRACT(HOUR FROM period_start)::int % 4) * interval '1 hour' AS period_4h,
  (array_agg(open_price ORDER BY period_start ASC))[1] AS open,
  MAX(high_price) AS high,
  MIN(low_price) AS low,
  (array_agg(close_price ORDER BY period_start DESC))[1] AS close,
  SUM(volume) AS volume,
  SUM(trade_count) AS trade_count
FROM market_price_candles
WHERE resource_slug = $1 AND period_start >= $2 AND period_start < $3
GROUP BY resource_slug, period_4h
ORDER BY period_4h;
```

**Available timeframes:**
- 1 hour (native)
- 4 hours (aggregated from 4 x 1h candles)
- 1 day (aggregated from 24 x 1h candles)
- 1 week (aggregated from 7 x 1d aggregations)

### 5.4 Chart Types

**Default: Line chart** of closing prices. Simple, non-intimidating, works on mobile.

**Advanced toggle: Candlestick chart** with volume bars. For veteran players who want full OHLCV data.

**Timeframe selector:** 24h, 7d, 30d, All Time.

### 5.5 Volume Indicators

- 24-hour rolling volume displayed on each resource card.
- Volume bar chart below the price chart (standard layout).
- Volume change indicator: "Volume +240% vs yesterday" to highlight trending resources.

### 5.6 Migration from Existing `priceHistory`

The current `MarketResource.priceHistory` field stores a JSON array of the last 50 price snapshots. Migration plan:
1. Keep `priceHistory` as-is for backward compatibility during Phase 1.
2. New candle data is authoritative once the `MarketPriceCandle` table is populated.
3. In Phase 4, deprecate `priceHistory` field (stop writing, remove from queries).

---

## 6. Supply/Demand Dynamics

### 6.1 How Player Activity Affects Prices

The new system replaces the single-price shift with multi-layered price discovery:

**Layer 1: Order Book (primary).**
Player orders in the book define the bid/ask spread. More buy orders = higher bid floor. More sell orders = lower ask ceiling. This is the primary price discovery mechanism.

**Layer 2: `currentPrice` (reference price).**
`currentPrice` on `MarketResource` is updated to the **last trade price** after each fill. This serves as the reference for:
- NPC Market Maker pricing
- Price change calculations (% change from base)
- Market event multiplier application
- Chart data (candle close)

**Layer 3: Mining Supply Pressure (existing, preserved).**
`calculatePriceAfterMining()` continues to push `currentPrice` down when players mine. This creates a natural supply-side pressure that affects NPC pricing but does not directly affect player limit orders.

**Layer 4: Market Events (existing, preserved).**
`MarketEvent`s apply multipliers to NPC Market Maker prices, creating temporary arbitrage opportunities.

**Layer 5: Economic Cycles (existing, preserved).**
`getCurrentEconomicPhase()` from `economic-systems.ts` applies `resourceDemandMultiplier` to NPC demand, affecting how aggressively NPCs place buy orders.

**Layer 6: Idle Decay (existing, preserved).**
`calculateIdleDecay()` pulls `currentPrice` toward `basePrice` during quiet periods.

### 6.2 Supply/Demand Feedback Loop

```
More players mine iron
  -> Mining pressure pushes currentPrice down
  -> NPC bid/ask prices drop
  -> Iron becomes cheap to buy
  -> Players with fabrication buy cheap iron to smelt steel
  -> Buy demand pushes currentPrice back up
  -> Equilibrium price emerges from player behavior

Fewer players mine exotic_materials
  -> Supply dries up, sell orders disappear from book
  -> Only NPC sell orders remain (expensive, limited volume)
  -> Players who need exotics must pay premium or mine themselves
  -> High prices incentivize new mining operations
  -> Supply increases, prices moderate
```

### 6.3 Resource Scarcity Integration

The `SCARCITY_LEVELS` from `economic-systems.ts` reduce mining output as deposits deplete. This affects the market:

- As scarcity increases, mining produces fewer units per month.
- Fewer units reach the market (fewer sell orders).
- Sell-side of the book thins out.
- Prices naturally rise as demand exceeds shrinking supply.
- High prices make resource decay (from `economic-sinks.ts`) more costly, incentivizing players to sell rather than hoard.

### 6.4 Production Chain Integration

Crafted products (`PRODUCTION_CHAINS` from `production-chains.ts`) consume raw resources and produce refined goods. With the marketplace:

- Raw resources have natural demand from crafters.
- Refined products can also be listed on the market (future enhancement: add crafted products as tradable items).
- This creates a value chain: mining -> raw resource market -> crafting -> refined product market -> building.

---

## 7. Price Alert System

### 7.1 Alert Configuration

Players can set alerts that fire when a resource price crosses a threshold.

**Alert types:**
- `above`: "Notify me when iron goes above $6,000"
- `below`: "Notify me when titanium goes below $20,000"

**Limits per player:** 5 base, 10 for alliance members, up to 20 for Legendary reputation (see Section 2.1 table).

**Alert lifecycle:**
1. Player creates alert via UI or API.
2. Alert is stored in `MarketAlert` table with `triggered: false`.
3. During each sync cycle (60 seconds), the system checks all untriggered alerts against current prices.
4. If condition is met: mark `triggered: true`, set `triggeredAt`, create an in-game notification.
5. **One-shot alerts:** After triggering, the alert is consumed. Player must create a new one.

### 7.2 Alert Checking Algorithm

```
function checkPriceAlerts():
  // Get all current prices in one query
  prices = SELECT slug, currentPrice FROM MarketResource

  // Get all untriggered alerts
  alerts = SELECT * FROM MarketAlert WHERE triggered = false

  for each alert in alerts:
    price = prices[alert.resourceSlug]
    if not price: continue

    shouldTrigger = false
    if alert.condition == 'above' AND price >= alert.targetPrice:
      shouldTrigger = true
    if alert.condition == 'below' AND price <= alert.targetPrice:
      shouldTrigger = true

    if shouldTrigger:
      UPDATE MarketAlert SET triggered = true, triggeredAt = now()
      createNotification(alert.profileId, {
        type: 'market_alert',
        title: `Price Alert: ${resourceName} is now ${formatMoney(price)}`,
        metadata: { resourceSlug, price, condition, targetPrice }
      })
```

### 7.3 Delivery

**V1:** In-game notification only.
- Toast notification when player is online.
- Notification badge on the Market tab.
- Listed in the notifications panel.

**V2 (future):** Push notification via existing `PushToken` system for mobile.

---

## 8. Market Manipulation Prevention

### 8.1 Wash Trading Detection

**Definition:** A player (or coordinated group) buys and sells the same resource to artificially inflate volume or move prices.

**Prevention layers:**

| Layer | Mechanism | Details |
|-------|-----------|---------|
| Self-trade block | Server-enforced | `buyerProfileId !== sellerProfileId` in matching engine. Cannot fill own orders. |
| Alt prevention | Schema-enforced | `userId @unique` on `GameProfile`. One profile per authenticated user. |
| Transaction fee | Economic deterrent | 2% fee each side = 4% round-trip cost. Wash trading loses 4% per cycle. |
| Rate limit | Throttle | Max 50 order placements per player per hour. |
| Volume cap | Daily limit | Max units tradeable per player per 24h (see table below). |

### 8.2 Per-Player Daily Volume Caps

| Resource Category | Max Buy/Day | Max Sell/Day | Rationale |
|-------------------|-------------|--------------|-----------|
| Common (iron, aluminum, lunar_water, methane, ethane) | 500 units | 500 units | ~2x typical daily mining output |
| Mid-tier (titanium, gold, rare_earth, platinum_group, mars_water) | 100 units | 100 units | ~3x typical daily mining output |
| Exotic (exotic_materials, helium3) | 20 units | 20 units | ~4x typical daily mining output |

Volume caps reset at midnight UTC. Caps scale with reputation:

```
effectiveCap = baseCap * (1 + reputationTier.tradeBonus)

Example: Legendary player (tradeBonus = 0.08):
  Iron cap = 500 * 1.08 = 540 units/day
```

### 8.3 Per-Player Open Order Volume Caps

Maximum volume of open (unfilled) orders per player per resource:

| Resource Category | Max Open Volume |
|-------------------|----------------|
| Common | 500 units |
| Mid-tier | 100 units |
| Exotic | 20 units |

This prevents a single player from placing orders that represent more than ~50% of typical daily volume for any resource.

### 8.4 Price Band Limits

Limit orders must fall within price bands:

```
minAllowedPrice = max(resource.minPrice, resource.basePrice * 0.30)
maxAllowedPrice = min(resource.maxPrice, resource.basePrice * 3.00)
```

Orders outside this range are rejected with an error message explaining the allowed range.

### 8.5 Per-Tick Price Movement Cap

The `currentPrice` (last trade price) cannot move more than **15% per sync cycle (60 seconds)** in either direction.

```
function clampPriceMovement(oldPrice, newTradePrice):
  maxMove = oldPrice * 0.15
  if newTradePrice > oldPrice + maxMove:
    return oldPrice + maxMove  // Cap upward movement
  if newTradePrice < oldPrice - maxMove:
    return oldPrice - maxMove  // Cap downward movement
  return newTradePrice
```

This prevents flash crashes from large market orders. The actual trade executes at the order book price, but the `currentPrice` reference updates gradually.

### 8.6 Automated Flagging

**Detection rules (checked every sync cycle):**

| Flag Type | Trigger Condition | Severity |
|-----------|-------------------|----------|
| `price_spike` | `currentPrice` moved > 30% from `basePrice` within 1 hour | Warning |
| `volume_anomaly` | Single player accounts for > 60% of a resource's 24h volume | Warning |
| `coordinated_trading` | 3+ players from same alliance place similar orders within same sync cycle | Info |
| `rapid_cancellation` | Player cancels > 10 orders within 5 minutes | Info |
| `price_cliff` | `currentPrice` dropped > 20% in one sync cycle | Critical |

Flagged events are logged to `MarketAuditLog`. No automated punishment -- the game operator reviews and can manually:
- Cancel suspicious orders
- Temporarily increase NPC Market Maker volume
- Adjust price band limits
- Issue warnings to players

### 8.7 Alliance Coordination Monitoring

When multiple alliance members place orders in the same resource within the same sync cycle:
1. Log an `info` severity audit entry.
2. No automatic action (alliance coordination is expected and not inherently bad).
3. Only flag as `warning` if the combined alliance volume exceeds 80% of a resource's 24h volume.

---

## 9. Trading Fees and Tax Structure

### 9.1 Transaction Fee (Market Tax)

**A 2% fee on all market transactions.** This is the single most important anti-manipulation tool.

```
buyerFee  = executionPrice * fillQty * 0.02
sellerFee = executionPrice * fillQty * 0.02
```

**Effective round-trip cost:** ~4% (buy fee + sell fee). This makes rapid buy-sell cycling unprofitable.

**Fee revenue is destroyed** (currency sink). This helps control inflation, consistent with the `economic-sinks.ts` design philosophy.

**Comparison to other games:**

| Game | Buy Fee | Sell Fee | Round-trip |
|------|---------|----------|------------|
| EVE Online | 3% broker + relist fees | 7.5% sales tax | ~10.5% |
| RuneScape GE | 0% | 1% | 1% |
| Prosperous Universe | ~1% exchange fee | ~1% exchange fee | ~2% |
| **Space Tycoon** | **2%** | **2%** | **4%** |

Our 4% round-trip is moderate -- high enough to deter wash trading, low enough to encourage real trades.

### 9.2 Fee Reduction by Reputation

Players with higher reputation (from `economic-systems.ts` `REPUTATION_TIERS`) pay reduced fees:

| Reputation Tier | Min Reputation | Fee Rate | Round-trip |
|----------------|---------------|----------|------------|
| Unknown | 0 | 2.00% | 4.00% |
| Recognized | 100 | 1.80% | 3.60% |
| Established | 500 | 1.50% | 3.00% |
| Respected | 1,000 | 1.20% | 2.40% |
| Prestigious | 2,500 | 1.00% | 2.00% |
| Legendary | 5,000 | 0.80% | 1.60% |
| Galactic Authority | 10,000 | 0.50% | 1.00% |

Formula:
```
feeRate = max(0.005, 0.02 - reputationTier.tradeBonus)
```

This uses the existing `tradeBonus` field from `REPUTATION_TIERS`, which ranges from 0 to 0.10.

### 9.3 Listing Fee (Limit Orders Only)

A small, non-refundable fee charged when placing a limit order (not market orders):

```
listingFee = max(100, orderValue * 0.001)  // 0.1% of order value, minimum $100
```

**Purpose:** Discourages spamming the order book with frivolous limit orders. The fee is tiny compared to the transaction fee but adds up for players placing dozens of orders.

**This fee IS refundable if the order fills.** If the order expires or is cancelled, the listing fee is lost.

Actually, to keep it simpler and more consistent: **listing fee is non-refundable in all cases.** This is the EVE Online model -- you pay a broker fee upfront, and it is gone whether the order fills or not.

### 9.4 Alliance Tax

When an alliance member executes a trade, a configurable percentage of the transaction fee is redirected to the alliance treasury:

```
allianceTaxRate = allianceSettings.taxRate  // Set by alliance leader, 0-50%
allianceTaxAmount = transactionFee * allianceTaxRate

// Example: Player in an alliance with 10% tax rate sells 100 iron at $5,000
// Transaction fee = 100 * $5,000 * 0.02 = $10,000
// Alliance tax = $10,000 * 0.10 = $1,000 goes to alliance treasury
// Fee destroyed = $10,000 - $1,000 = $9,000
```

**Key details:**
- The player pays the same total fee regardless of alliance tax. The tax comes out of the fee, not on top of it.
- Alliance leaders set the tax rate (0% to 50% of fees). Default: 0%.
- Alliance treasury is a new field on the `Alliance` model.
- Treasury funds can be used for: alliance starbase construction, member bounties, shared research.

### 9.5 Fee Summary

For a player selling 100 iron at $5,000/unit:

| Component | Amount | Notes |
|-----------|--------|-------|
| Gross revenue | $500,000 | 100 * $5,000 |
| Listing fee (limit only) | -$500 | 0.1% of $500K |
| Transaction fee (2%) | -$10,000 | $500K * 0.02 |
| Alliance tax (if applicable) | $0 to -$5,000 | 0-50% of transaction fee |
| **Net to player** | **$489,500** | Before alliance tax |
| **Net to player (10% alliance tax)** | **$489,500** | Same -- alliance tax comes from fee |
| **Destroyed (sink)** | **$9,000 - $10,000** | Depends on alliance tax rate |

---

## 10. Market Depth Visualization

### 10.1 Order Book Display

The order book is displayed as two columns with horizontal depth bars:

```
┌─────────────────────────────────────────────────┐
│  BID (Buy Orders)       │  ASK (Sell Orders)     │
│                         │                        │
│  $4,800 x 120 [██████] │  $5,200 x  50 [███]    │
│  $4,600 x  80 [████]   │  $5,400 x 200 [████████│
│  $4,400 x 300 [████████│  $5,500 x  30 [██]      │
│  $4,200 x  60 [███]    │  $5,800 x 150 [██████]  │
│  NPC   x 100 @ $4,500  │  NPC   x 100 @ $5,500   │
│                         │                        │
│  Spread: $400 (8.0%)    │  Last: $5,000           │
└─────────────────────────────────────────────────┘
```

**Visual encoding:**
- Bar width proportional to order volume (max bar = largest order in view).
- Bid side: green gradient (darker = higher price = better for seller).
- Ask side: red gradient (darker = lower price = better for buyer).
- NPC Market Maker orders displayed at bottom of each side, labeled "NPC".
- NPC company orders labeled with company name.
- Player's own orders highlighted with a distinct border/icon.

### 10.2 Aggregated Depth Chart

An alternative "depth chart" view showing cumulative volume at each price level:

```
Volume
  │                        ╱───
  │                    ╱──╱
  │                ╱──╱
  │    ───╲       ╱
  │        ╲──╱──╱
  │           ╲╱
  │            │
  └────────────┼────────────── Price
         Bid   │  Ask
              Spread
```

- X-axis: price (increasing left to right).
- Y-axis: cumulative volume.
- Green area: cumulative buy volume (from highest bid down).
- Red area: cumulative sell volume (from lowest ask up).
- Gap between curves = spread.

### 10.3 Display Levels

Show top 10 price levels per side (20 total). If more exist, show a "View all" link that expands to the full book.

For resources with thin books (fewer than 3 player orders per side), the NPC Market Maker fills the display so it never looks empty.

---

## 11. Futures/Options Contracts (Advanced)

### 11.1 Overview

Futures contracts allow players to agree to buy or sell a resource at a specific price on a future date. This is an **optional endgame feature** -- complex but adds significant depth for veteran traders.

**Design decision: Include futures, exclude options.** Options pricing (Black-Scholes) is too complex for a game UI. Futures are conceptually simpler: "I agree to buy 50 titanium at $28,000 in 7 days."

### 11.2 Futures Contract Specification

```
Resource:     titanium
Direction:    LONG (buyer commits to buying) or SHORT (seller commits to selling)
Quantity:     50 units
Strike price: $28,000/unit
Settlement:   7 days from creation (real-time)
Margin:       20% of contract value deposited as escrow
```

**Margin requirement:**
```
margin = contractValue * MARGIN_RATE

where:
  contractValue = quantity * strikePrice
  MARGIN_RATE = 0.20 (20%)

Example:
  50 titanium * $28,000 = $1,400,000 contract value
  Margin = $1,400,000 * 0.20 = $280,000
```

### 11.3 Settlement

At expiration, the contract settles at the **current market price** (`currentPrice` of the resource):

```
settlementPnL = (currentPrice - strikePrice) * quantity

If LONG (buyer):
  PnL = settlementPnL  (positive if price went up)

If SHORT (seller):
  PnL = -settlementPnL  (positive if price went down)
```

**Physical delivery is NOT required.** Futures are cash-settled. This avoids the complexity of forcing resource transfers.

**Example:**
- Player opens LONG 50 titanium @ $28,000.
- 7 days later, titanium `currentPrice` = $32,000.
- PnL = ($32,000 - $28,000) * 50 = +$200,000 profit.
- Player receives their $280,000 margin back + $200,000 profit.

If the price went to $24,000:
- PnL = ($24,000 - $28,000) * 50 = -$200,000 loss.
- Player receives $280,000 - $200,000 = $80,000 back.

**Maximum loss = margin deposit.** If losses exceed margin, the contract is forcibly closed (liquidated).

### 11.4 Available Contracts

| Duration | Margin Rate | Fee |
|----------|------------|-----|
| 1 day | 10% | 0.5% of contract value |
| 3 days | 15% | 1.0% |
| 7 days | 20% | 1.5% |
| 14 days | 25% | 2.0% |
| 30 days | 30% | 2.5% |

### 11.5 Limitations

- Maximum 5 open futures contracts per player.
- Only available for resources with sufficient liquidity (daily volume > 50 units).
- Only unlocked after completing research "Advanced Market Systems" (new tier 3 economy research).
- Futures fees are destroyed (currency sink).

### 11.6 Implementation Priority

**This is Phase 5+ (post-launch).** The core order book system must be stable before adding derivatives. Futures add complexity that should only be introduced when there is demonstrated player demand.

---

## 12. Database Schema

### 12.1 New Models

#### `MarketLimitOrder` -- Order Book

```prisma
model MarketLimitOrder {
  id              String         @id @default(cuid())
  profileId       String
  profile         GameProfile    @relation("limitOrders", fields: [profileId], references: [id], onDelete: Cascade)
  resourceSlug    String

  side            String         // "buy" | "sell"
  orderType       String         @default("limit") // "limit" | "market"
  price           Int            // Price per unit in whole dollars (integer, not float)
  quantity        Int            // Total quantity ordered
  filledQty       Int            @default(0)
  remainingQty    Int            // quantity - filledQty (denormalized for query speed)
  status          String         @default("open") // open, partial, filled, cancelled, expired

  feeRate         Float          @default(0.02)
  listingFee      Int            @default(0)      // Non-refundable listing fee paid
  totalEscrowed   Float          // Buy: price * qty * (1+feeRate). Sell: qty of resource.

  isNpc           Boolean        @default(false)   // True for NPC Market Maker orders
  npcCompanyId    String?                           // If placed by a named NPC company

  expiresAt       DateTime
  filledAt        DateTime?                         // When fully filled
  cancelledAt     DateTime?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  buyFills        MarketFill[]   @relation("buyFills")
  sellFills       MarketFill[]   @relation("sellFills")

  @@index([resourceSlug, side, status, price])      // Core order book query
  @@index([profileId, status])                       // Player's open orders
  @@index([expiresAt, status])                       // Expiration cleanup
  @@index([status, resourceSlug, side])              // Matching engine
  @@index([isNpc, status])                           // NPC order management
}
```

**Design notes:**
- `price` uses `Int` (whole dollars) instead of `Float` to avoid floating-point comparison issues. All resources have prices >= $1,000, so integer resolution is sufficient. (Iron at $5,000 means $5,000 per unit, stored as `5000`.)
- `remainingQty` is denormalized for query performance but can always be recomputed from `quantity - filledQty`.
- `isNpc` distinguishes NPC Market Maker orders from player orders. NPC orders have special rules (auto-refresh, volume limits).
- The composite index `[resourceSlug, side, status, price]` supports the core query: "all open sell orders for iron, sorted by price ascending."

#### `MarketFill` -- Trade Executions

```prisma
model MarketFill {
  id              String            @id @default(cuid())
  buyOrderId      String
  buyOrder        MarketLimitOrder  @relation("buyFills", fields: [buyOrderId], references: [id])
  sellOrderId     String
  sellOrder       MarketLimitOrder  @relation("sellFills", fields: [sellOrderId], references: [id])
  resourceSlug    String

  quantity        Int               // Units traded in this fill
  price           Int               // Execution price per unit (resting order's price)
  totalValue      Int               // price * quantity

  buyerFee        Int               // Fee charged to buyer
  sellerFee       Int               // Fee charged to seller
  allianceTax     Int               @default(0) // Alliance tax portion

  buyerProfileId  String
  sellerProfileId String

  executedAt      DateTime          @default(now())

  @@index([resourceSlug, executedAt])              // Trade history by resource
  @@index([buyerProfileId, executedAt])            // Player buy history
  @@index([sellerProfileId, executedAt])           // Player sell history
  @@index([executedAt])                            // Global trade feed
}
```

**Design notes:**
- Each fill records exactly one buyer-seller pair. An order that fills against 3 counterparties creates 3 `MarketFill` records.
- `price` is always the resting order's price.
- `totalValue = price * quantity` is denormalized for display convenience.
- Alliance tax is tracked per fill so the alliance treasury can be updated.

#### `MarketPriceCandle` -- OHLCV History

```prisma
model MarketPriceCandle {
  id              String    @id @default(cuid())
  resourceSlug    String
  resolution      String    @default("1h") // "1h" for V1

  openPrice       Int
  highPrice       Int
  lowPrice        Int
  closePrice      Int
  volume          Int       // Total units traded
  tradeCount      Int       // Number of fills

  periodStart     DateTime  // Start of candle period (floored to hour)

  @@unique([resourceSlug, resolution, periodStart])
  @@index([resourceSlug, periodStart])
  @@index([periodStart])
}
```

#### `MarketAlert` -- Price Alerts

```prisma
model MarketAlert {
  id              String      @id @default(cuid())
  profileId       String
  profile         GameProfile @relation("marketAlerts", fields: [profileId], references: [id], onDelete: Cascade)
  resourceSlug    String

  condition       String      // "above" | "below"
  targetPrice     Int
  triggered       Boolean     @default(false)
  triggeredAt     DateTime?

  createdAt       DateTime    @default(now())

  @@index([triggered, resourceSlug])               // Alert checking query
  @@index([profileId, triggered])                   // Player's active alerts
}
```

#### `MarketAuditLog` -- Manipulation Detection

```prisma
model MarketAuditLog {
  id              String    @id @default(cuid())
  type            String    // "price_spike" | "volume_anomaly" | "coordinated_trading" | "rapid_cancellation" | "price_cliff"
  resourceSlug    String?
  description     String
  metadata        Json      // { profileIds, prices, volumes, timestamps }
  severity        String    @default("info") // info, warning, critical

  reviewed        Boolean   @default(false)
  reviewedBy      String?   // Admin user ID
  reviewedAt      DateTime?
  resolution      String?   // "dismissed" | "warning_issued" | "orders_cancelled"

  createdAt       DateTime  @default(now())

  @@index([type, reviewed])
  @@index([severity, reviewed])
  @@index([createdAt])
}
```

#### `MarketFuturesContract` -- Futures (Phase 5+)

```prisma
model MarketFuturesContract {
  id              String      @id @default(cuid())
  profileId       String
  profile         GameProfile @relation("futuresContracts", fields: [profileId], references: [id], onDelete: Cascade)
  resourceSlug    String

  direction       String      // "long" | "short"
  quantity        Int
  strikePrice     Int         // Agreed price per unit
  contractValue   Int         // strikePrice * quantity
  marginDeposit   Int         // Escrow amount (20-30% of contractValue)
  fee             Int         // Non-refundable fee

  status          String      @default("open") // open, settled, liquidated
  settlementPrice Int?        // currentPrice at expiration
  pnl             Int?        // Profit/loss at settlement
  settledAt       DateTime?

  expiresAt       DateTime
  createdAt       DateTime    @default(now())

  @@index([profileId, status])
  @@index([expiresAt, status])
  @@index([resourceSlug, status])
}
```

### 12.2 Modifications to Existing Models

#### `MarketResource` -- Add fields

```prisma
// Add to existing MarketResource model:
  bestBid         Int?          // Highest open buy order price (cached)
  bestAsk         Int?          // Lowest open sell order price (cached)
  volume24h       Int           @default(0)    // Units traded in last 24h
  tradeCount24h   Int           @default(0)    // Fills in last 24h
  lastTradePrice  Int?          // Price of most recent fill
  lastTradeAt     DateTime?     // Timestamp of most recent fill
  npcBuyVolume24h Int           @default(0)    // NPC buy volume consumed today
  npcSellVolume24h Int          @default(0)    // NPC sell volume consumed today
  npcVolumeResetAt DateTime?                   // When NPC volume last reset
```

#### `GameProfile` -- Add relations

```prisma
// Add to existing GameProfile model:
  limitOrders       MarketLimitOrder[]  @relation("limitOrders")
  marketAlerts      MarketAlert[]       @relation("marketAlerts")
  futuresContracts  MarketFuturesContract[] @relation("futuresContracts")
```

#### `Alliance` -- Add treasury

```prisma
// Add to existing Alliance model:
  treasury          Float     @default(0)     // Accumulated alliance tax revenue
  tradeTaxRate      Float     @default(0)     // 0.00 to 0.50 (0% to 50% of trade fees)
```

#### `MarketOrder` -- Deprecation

Keep existing `MarketOrder` table for historical data. Stop writing new records after Phase 1 launch. All new trades go through `MarketLimitOrder` and `MarketFill`.

#### `ResourceBounty` -- Migration

Phase 2: New bounties created as `MarketLimitOrder` with `side: "buy"` and a `isBounty` flag (stored in a JSON metadata field or a boolean column).
Phase 3: Stop creating new `ResourceBounty` records. Existing bounties remain until filled/expired.
Phase 4: Remove bounty UI. Order book subsumes it.

---

## 13. API Endpoints

### 13.1 New Endpoints

#### Place Limit Order

```
POST /api/space-tycoon/market/orders
Auth: Required (session)
Body: {
  resourceSlug: string,      // "iron", "titanium", etc.
  side: "buy" | "sell",
  price: number,             // Price per unit (integer)
  quantity: number,           // Units to buy/sell (integer, >= 1)
  expiresIn: "1h" | "6h" | "24h" | "72h" | "1w"  // Default: "24h"
}
Response: {
  success: true,
  order: { id, resourceSlug, side, price, quantity, status, expiresAt },
  immediateFills: [ { quantity, price, counterpartyCompany } ],  // If any immediate matches
  escrowDeducted: number,
  listingFee: number
}
Errors:
  400: Invalid parameters, price outside bands, insufficient funds/resources
  400: Order limit reached (20/30/50 max)
  400: Volume cap reached for this resource
  401: Not authenticated
  404: Resource not found
```

#### Place Market Order

```
POST /api/space-tycoon/market/orders
Auth: Required (session)
Body: {
  resourceSlug: string,
  side: "buy" | "sell",
  price: null,               // null = market order
  quantity: number,
  expiresIn: null             // Not applicable for market orders
}
Response: {
  success: true,
  fills: [ { quantity, price, counterpartyCompany } ],
  totalCost: number,          // Total paid (buys) or received (sells)
  totalFees: number,
  avgPrice: number,
  unfilledQty: number         // 0 for fully filled; > 0 if book was thin
}
```

#### Cancel Order

```
DELETE /api/space-tycoon/market/orders/:orderId
Auth: Required (session, must own order)
Response: {
  success: true,
  refunded: { money: number, resource: string, quantity: number }
}
Errors:
  400: Order already filled/cancelled/expired
  401: Not authenticated
  403: Not your order
  404: Order not found
```

#### Get Order Book

```
GET /api/space-tycoon/market/order-book/:resourceSlug
Auth: Optional (unauthenticated gets public data)
Query: ?levels=10 (default 10, max 50)
Response: {
  resourceSlug: "iron",
  currentPrice: 5000,
  basePrice: 5000,
  change24h: 4,               // Percentage
  lastTradePrice: 5200,
  lastTradeAt: "2026-03-23T14:30:00Z",
  spread: { absolute: 400, percentage: 8.0 },
  volume24h: 1240,
  bids: [
    { price: 4800, totalQty: 120, orderCount: 3, isNpc: false },
    { price: 4600, totalQty: 80,  orderCount: 1, isNpc: false },
    { price: 4500, totalQty: 100, orderCount: 1, isNpc: true },
  ],
  asks: [
    { price: 5200, totalQty: 50,  orderCount: 2, isNpc: false },
    { price: 5400, totalQty: 200, orderCount: 1, isNpc: false },
    { price: 5500, totalQty: 100, orderCount: 1, isNpc: true },
  ]
}
```

Note: Individual order sizes and player identities are NOT exposed in the public order book. Only aggregated price levels with total quantity and order count. This prevents targeted manipulation.

#### Get My Orders

```
GET /api/space-tycoon/market/my-orders
Auth: Required
Query: ?status=open,partial (default: open,partial)
Response: {
  orders: [
    {
      id, resourceSlug, side, price, quantity, filledQty, remainingQty,
      status, feeRate, totalEscrowed, expiresAt, createdAt,
      fills: [ { quantity, price, executedAt } ]
    }
  ],
  summary: {
    totalOpenOrders: 4,
    maxOrders: 20,
    totalEscrowed: 523000
  }
}
```

#### Get Trade History

```
GET /api/space-tycoon/market/trades
Auth: Optional
Query:
  ?resource=iron         (filter by resource, optional)
  &scope=global|mine     (default: global)
  &limit=50              (max 200)
  &cursor=<lastId>       (for pagination)
Response: {
  trades: [
    {
      id, resourceSlug, quantity, price, totalValue,
      side: "buy"|"sell",  // From requesting player's perspective (scope=mine only)
      fee: number,
      executedAt: "2026-03-23T14:30:00Z",
      // Global trades: no player names
      // My trades: includes counterparty company name
    }
  ],
  nextCursor: "..."
}
```

#### Get Price Candles

```
GET /api/space-tycoon/market/candles/:resourceSlug
Auth: None (public)
Query:
  ?resolution=1h|4h|1d|1w   (default: 1h)
  &from=2026-03-22T00:00:00Z
  &to=2026-03-23T00:00:00Z
  &limit=168               (default: 168 = 7 days of 1h candles)
Response: {
  resourceSlug: "iron",
  resolution: "1h",
  candles: [
    { t: "2026-03-22T00:00:00Z", o: 4800, h: 5100, l: 4750, c: 5000, v: 120, n: 8 },
    { t: "2026-03-22T01:00:00Z", o: 5000, h: 5200, l: 4900, c: 5200, v: 85,  n: 5 },
    ...
  ]
}
```

Short field names (`t`, `o`, `h`, `l`, `c`, `v`, `n`) minimize payload size for charts.

#### Manage Price Alerts

```
POST /api/space-tycoon/market/alerts
Auth: Required
Body: {
  resourceSlug: string,
  condition: "above" | "below",
  targetPrice: number
}
Response: { success: true, alert: { id, resourceSlug, condition, targetPrice } }

GET /api/space-tycoon/market/alerts
Auth: Required
Response: {
  alerts: [ { id, resourceSlug, condition, targetPrice, triggered, triggeredAt, createdAt } ],
  activeCount: 3,
  maxAlerts: 5
}

DELETE /api/space-tycoon/market/alerts/:alertId
Auth: Required
Response: { success: true }
```

### 13.2 Modified Existing Endpoints

#### `POST /api/space-tycoon/market/trade` -- Rerouted

The existing trade endpoint is preserved for backward compatibility. It now creates a market order internally:

```
// Existing body format:
{ type: "buy", resourceSlug: "iron", quantity: 10, profileId: "..." }

// Internally converted to:
POST /api/space-tycoon/market/orders
{ resourceSlug: "iron", side: "buy", price: null, quantity: 10 }
```

The response format is preserved so existing client code works without changes.

#### `GET /api/space-tycoon/market` -- Enhanced

The existing market endpoint adds new fields:

```
// Existing fields preserved:
prices: { iron: { currentPrice, basePrice, change } }
resources: [ ... ]

// New fields added:
orderBookSummary: {
  iron: { bestBid: 4800, bestAsk: 5200, spread: 400, volume24h: 1240 },
  titanium: { bestBid: 22500, bestAsk: 27500, spread: 5000, volume24h: 340 },
  ...
}
activeEvents: [ { eventId, name, icon, affectedResources, expiresAtMs } ]
```

#### `POST /api/space-tycoon/market/mining-pressure` -- Preserved

No changes. Mining pressure continues to adjust `currentPrice` which affects NPC pricing.

---

## 14. Real-Time Updates

### 14.1 Approach: Enhanced Polling (Not WebSocket)

**Decision: Polling, not WebSocket.** Rationale:
- The game already runs on a 60-second sync cycle. Players expect async updates.
- WebSocket adds significant infrastructure complexity (connection management, reconnection, server-sent events).
- Next.js App Router's Server Components and `revalidate` pattern fit polling naturally.
- The game is casual/async, not a real-time trading platform.

### 14.2 Polling Strategy

| Data | Polling Interval | Method |
|------|-----------------|--------|
| Order book (current view) | 15 seconds | Client `setInterval` + `fetch` |
| Market overview (all prices) | 30 seconds | Client `setInterval` + `fetch` |
| My open orders | 30 seconds | Client `setInterval` + `fetch` |
| Price candles | 60 seconds | Client `setInterval` + `fetch` |
| Alerts | 60 seconds (via sync cycle) | Bundled with game sync |
| Trade history | 30 seconds | Client `setInterval` + `fetch` |

### 14.3 Optimistic Updates

When a player places an order:
1. Immediately update the local UI (show order in "My Orders", deduct escrow from displayed balance).
2. Send the API request.
3. On success: update with server-confirmed data (may include immediate fills).
4. On failure: revert the optimistic update and show error toast.

### 14.4 Notification System

When an order fills (partially or fully):
1. The fill is detected during the next poll of "My Orders."
2. A toast notification appears: "Your sell order for 30 iron filled at $5,200!"
3. A notification badge appears on the Market tab.
4. The fill is logged in the player's trade history.

For price alerts:
1. Alert triggers are detected during the game sync cycle.
2. In-game notification created (existing `Notification` system).
3. Toast notification appears on the market panel.

### 14.5 Future: Server-Sent Events (SSE)

If the player base grows and demand for faster updates increases, SSE is a lighter-weight alternative to WebSocket:

```
GET /api/space-tycoon/market/stream/:resourceSlug
Content-Type: text/event-stream

event: trade
data: { "resource": "iron", "price": 5200, "qty": 30, "time": 1711195800000 }

event: orderbook
data: { "bestBid": 4800, "bestAsk": 5200, "spread": 400 }
```

This is Phase 4+ and only if polling proves insufficient.

---

## 15. UI Components

### 15.1 Component Architecture

```
MarketPanel (enhanced existing)
├── MarketOverviewTab (default)
│   ├── MarketNewsTicker
│   ├── ResourceTable (enhanced with bid/ask/volume)
│   └── ResourceInventory (unchanged)
├── ResourceDetailView (new, opens on resource click)
│   ├── ResourceHeader (price, change, spread)
│   ├── PriceChart (line/candlestick toggle)
│   ├── OrderBookDisplay
│   ├── OrderEntryForm (market/limit tabs)
│   └── RecentTrades (last 10 for this resource)
├── MyOrdersTab (new)
│   ├── OpenOrdersList
│   └── OrderSummary
├── TradeHistoryTab (new)
│   ├── GlobalTradesFeed
│   ├── MyTradesFeed (toggle)
│   └── TradeSummary (P&L)
└── AlertsTab (new)
    ├── ActiveAlertsList
    └── CreateAlertForm
```

### 15.2 Market Overview Tab (Enhanced)

The existing `MarketPanel` resource table gains new columns:

| Column | Source | Notes |
|--------|--------|-------|
| Resource | Existing | Name + icon |
| Price | `currentPrice` | Last trade price |
| 24h Change | Computed | % change from 24h ago close |
| Bid | `bestBid` | Highest buy order |
| Ask | `bestAsk` | Lowest sell order |
| Spread | Computed | `(ask - bid) / ((ask + bid) / 2) * 100`% |
| Volume | `volume24h` | Units in last 24h |
| Action | Existing | Buy/Sell buttons |

The existing "Buy 1 / Buy 20" quick buttons continue to work as market orders.

### 15.3 Resource Detail View

Opened by clicking a resource row. Contains:

**Header:**
- Resource name, icon, category
- Current price (large, prominent)
- 24h change (green/red with arrow)
- 24h high, 24h low, 24h volume
- Spread (absolute and %)

**Price Chart:**
- Default: line chart of close prices
- Toggle: candlestick with volume bars
- Timeframe: 24h, 7d, 30d, All
- Implementation: lightweight SVG or `<canvas>`, NOT a heavyweight charting library like TradingView. The existing game does not use any charting library; a simple custom SVG chart matches the tech stack.

**Order Book:**
- Two columns (bid/ask) with horizontal depth bars
- Aggregated by price level (not individual orders)
- NPC orders labeled separately
- Player's own orders highlighted

**Order Entry Form:**
- Tab 1: "Quick Trade" -- Market buy/sell (existing behavior, just a quantity picker)
- Tab 2: "Limit Order" -- Price input, quantity input, expiration selector, fee preview, total preview
- "Place Order" button with confirmation
- Shows available balance and inventory

### 15.4 My Orders Tab

List of all open/partial orders with:
- Resource, side, price, quantity (filled/total)
- Fill progress bar
- Time remaining until expiration
- Estimated value (revenue for sells, cost for buys)
- Cancel button (with confirmation)
- Summary: total open orders, max orders, total escrowed

### 15.5 Trade History Tab

Two views:
- **Global:** Anonymous feed of recent trades (resource, qty, price, time). No player names.
- **My Trades:** Personal history with counterparty company name, fee paid, and P&L.

**P&L Summary:**
```
Total Bought:   $12.4M  (487 trades)
Total Sold:     $18.7M  (312 trades)
Fees Paid:      $621K
Net Trading P&L: +$5.68M
```

### 15.6 Alerts Tab

- List of active alerts: resource, condition, target price, created date
- "Create Alert" form: resource dropdown, above/below toggle, price input
- Count: "3 / 5 alerts used"
- Triggered alerts shown with timestamp and current price at trigger

### 15.7 Mobile Layout

The existing game already works on mobile. Market UI adaptations:

- Resource table becomes vertical card list (one resource per card with mini sparkline)
- Order book columns stack vertically (bids above, asks below)
- Order entry form stacks vertically (price -> quantity -> total -> button)
- Chart uses touch events (tap to see OHLCV at a point, pinch to zoom)
- Tabs become a horizontal scrollable pill bar
- "My Orders" uses swipe-to-cancel gesture

### 15.8 Accessibility

- All price changes use color AND icon (up arrow + green, down arrow + red). Never color alone.
- Order book depth bars have aria-labels: "120 units at $4,800"
- Tab navigation works with keyboard (arrow keys, Enter)
- Chart has a table-based alt view for screen readers

---

## 16. Implementation Phases

### Phase 1: Foundation (Order Book + Matching Engine)

**Estimated effort:** 2-3 weeks
**Goal:** Core order book functional. Existing market keeps working.

**Deliverables:**
- [ ] Prisma schema: `MarketLimitOrder`, `MarketFill` tables
- [ ] Add `bestBid`, `bestAsk`, `volume24h`, `lastTradePrice`, `lastTradeAt` to `MarketResource`
- [ ] `src/lib/game/market-matching.ts` -- matching engine module
- [ ] `POST /api/space-tycoon/market/orders` -- place limit/market order
- [ ] `DELETE /api/space-tycoon/market/orders/:id` -- cancel order
- [ ] `GET /api/space-tycoon/market/order-book/:resource` -- order book data
- [ ] `GET /api/space-tycoon/market/my-orders` -- player's orders
- [ ] Modify `POST /api/space-tycoon/market/trade` to route through matching engine
- [ ] NPC Market Maker: places bid/ask orders for all 12 resources
- [ ] NPC company order placement (6 companies, ~30 seed orders)
- [ ] Escrow system for buy/sell orders
- [ ] Self-trade prevention
- [ ] Expiration cron job (60-second sync cycle)
- [ ] Basic order book display in market panel (text-based, no bars yet)

**What does NOT change:**
- Current market panel layout
- Buy/Sell buttons (become market orders internally)
- NPC engine, market events, mining pressure
- Mobile layout

### Phase 2: Market Information

**Estimated effort:** 1-2 weeks
**Goal:** Price charts and trade history available.

**Deliverables:**
- [ ] Prisma schema: `MarketPriceCandle` table
- [ ] Candle construction on each fill (upsert logic)
- [ ] `GET /api/space-tycoon/market/candles/:resource` -- OHLCV data
- [ ] `GET /api/space-tycoon/market/trades` -- trade history
- [ ] SVG line chart component for price history
- [ ] Candlestick chart toggle (advanced)
- [ ] Volume bars below chart
- [ ] Trade history feed (global and personal)
- [ ] Market news ticker (surface existing MarketEvents)
- [ ] 24h volume and change indicators on resource table

### Phase 3: Price Alerts + Anti-Manipulation

**Estimated effort:** 1 week
**Goal:** Players can set alerts. Manipulation detection running.

**Deliverables:**
- [ ] Prisma schema: `MarketAlert`, `MarketAuditLog` tables
- [ ] Alert CRUD endpoints
- [ ] Alert checking in sync cycle
- [ ] In-game notifications for triggered alerts
- [ ] Volume caps enforcement (per-player, per-resource)
- [ ] Price band validation on order placement
- [ ] Rate limiting (50 orders/hour)
- [ ] Automated flagging: price spike, volume anomaly, coordinated trading
- [ ] Reputation-based fee reduction

### Phase 4: UI Polish + Trading Fees

**Estimated effort:** 2 weeks
**Goal:** Full tabbed market interface. Complete fee system.

**Deliverables:**
- [ ] Tabbed market panel: Overview, Detail, My Orders, History, Alerts
- [ ] Order book depth visualization (horizontal bars)
- [ ] Depth chart (cumulative volume)
- [ ] Order entry form with market/limit tabs
- [ ] Listing fee implementation
- [ ] Alliance tax system (treasury field, tax rate setting)
- [ ] P&L tracking in trade history
- [ ] Mobile-optimized layouts
- [ ] Bounty system migration (new bounties = buy limit orders)
- [ ] Player's own orders highlighted in book
- [ ] Polling system for real-time updates (15s/30s intervals)

### Phase 5: Advanced Features (Post-Launch)

**Estimated effort:** 2-3 weeks (if demand warrants)
**Goal:** Futures contracts, depth chart, advanced tools.

**Deliverables:**
- [ ] Prisma schema: `MarketFuturesContract` table
- [ ] Futures contract CRUD endpoints
- [ ] Settlement engine (runs on contract expiration)
- [ ] Futures UI in market panel
- [ ] "Advanced Market Systems" research unlock
- [ ] SSE endpoint for real-time price streaming (if needed)
- [ ] Full ResourceBounty deprecation (remove bounty UI)
- [ ] Market analytics dashboard (for game operator)

---

## 17. Appendices

### Appendix A: Resource Reference Table

| Resource | Base Price | Min | Max | Volatility | NPC Buy Vol | NPC Sell Vol | Category |
|----------|-----------|-----|-----|-----------|------------|-------------|----------|
| iron | $5,000 | $1,000 | $20,000 | 0.02 | 200/day | 200/day | Common |
| aluminum | $8,000 | $2,000 | $30,000 | 0.03 | 200/day | 200/day | Common |
| titanium | $25,000 | $8,000 | $80,000 | 0.05 | 50/day | 50/day | Mid-tier |
| lunar_water | $50,000 | $10,000 | $200,000 | 0.03 | 200/day | 200/day | Common |
| mars_water | $80,000 | $20,000 | $300,000 | 0.04 | 50/day | 50/day | Mid-tier |
| platinum_group | $500,000 | $100,000 | $2,000,000 | 0.08 | 50/day | 50/day | Mid-tier |
| gold | $300,000 | $80,000 | $1,000,000 | 0.06 | 50/day | 50/day | Mid-tier |
| rare_earth | $200,000 | $50,000 | $800,000 | 0.07 | 50/day | 50/day | Mid-tier |
| methane | $15,000 | $3,000 | $60,000 | 0.04 | 200/day | 200/day | Common |
| ethane | $20,000 | $5,000 | $80,000 | 0.05 | 200/day | 200/day | Common |
| exotic_materials | $2,000,000 | $500,000 | $10,000,000 | 0.15 | 10/day | 10/day | Exotic |
| helium3 | $5,000,000 | $1,000,000 | $20,000,000 | 0.12 | 10/day | 10/day | Exotic |

### Appendix B: Fee Calculation Examples

**Example 1: New player sells 50 iron at market price ($5,000)**
```
Revenue: 50 * $5,000 = $250,000
Transaction fee (2%): $250,000 * 0.02 = $5,000
Net to player: $245,000
Destroyed (sink): $5,000
```

**Example 2: Established player (1.5% fee) places limit sell for 20 titanium at $30,000**
```
Listing fee: max($100, $600,000 * 0.001) = $600 (non-refundable)
[Order fills 3 days later]
Revenue: 20 * $30,000 = $600,000
Transaction fee (1.5%): $600,000 * 0.015 = $9,000
Alliance tax (10% of fee): $9,000 * 0.10 = $900 (to alliance)
Destroyed (sink): $9,000 - $900 = $8,100
Net to player: $600,000 - $9,000 = $591,000
Total fees paid: $600 listing + $9,000 transaction = $9,600
```

**Example 3: Player buys 5 helium-3 via market order, walks the book**
```
Fill 1: 2 units @ $4,800,000 (player order) = $9,600,000
Fill 2: 3 units @ $5,500,000 (NPC ask)      = $16,500,000
Total cost: $26,100,000
Avg price: $5,220,000/unit
Transaction fee (2%): $26,100,000 * 0.02 = $522,000
Total paid: $26,622,000
```

### Appendix C: Key Design Decisions Summary

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Single vs. regional markets | **Single global** | Player base too small for multiple markets |
| 2 | NPC Market Maker permanence | **Permanent** | Casual players must always be able to buy/sell |
| 3 | NPC spread width | **20% (10% each side)** | Wide enough for players to undercut, narrow enough as backstop |
| 4 | Transaction fee rate | **2% each side** | Standard for games; 4% round-trip deters wash trading |
| 5 | Order expiration default | **24 hours** | Matches bounty system; prevents stale orders |
| 6 | Max open orders | **20 (base), 30 (alliance), up to 50** | Prevents spam while allowing strategy |
| 7 | Matching frequency | **On placement + 60s sync** | Fast enough for casual game |
| 8 | Price storage type | **Integer (whole dollars)** | Avoids float comparison bugs; all resources >= $1,000 |
| 9 | Candle resolution | **1-hour** | Good resolution, minimal storage (~63MB over 5 years) |
| 10 | Real-time method | **Polling (15-60s)** | Simpler than WebSocket; matches async game design |
| 11 | Short selling | **Not allowed** | Too complex for casual game; unbounded loss risk |
| 12 | Futures contracts | **Cash-settled, Phase 5** | Simpler than physical delivery; optional endgame feature |
| 13 | Trade anonymity | **Public book is anonymous** | Prevents targeted manipulation; individual trades visible only to participants |
| 14 | Price bands | **30%-300% of basePrice** | Prevents absurd orders while allowing event speculation |
| 15 | Alliance tax | **0-50% of fees, not additional** | Players pay same total; alliance gets portion of fee |

### Appendix D: Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Too few players for liquidity | Empty books, bad UX | High (early) | NPC Market Makers + NPC company orders seed ~50 orders |
| One player monopolizes a resource | Unfair pricing | Medium | Volume caps, NPC sells up to max daily volume, maxPrice cap |
| Complexity scares casual players | Churn | Medium | Default UI unchanged; advanced in opt-in tabs |
| Database load from matching | Slow sync | Low | O(n) matching with small n; proper indexes |
| Real-money trading (RMT) | Economy disruption | Low | All trades on-market with fees; no direct transfer |
| Bot manipulation | Unfair prices | Low | Rate limits, volume caps, one profile per user |
| Market event front-running | Unfair advantage | Medium | Events are random and announced only when active (no advance notice) |
| Escrow bugs (double-spend) | Economy-breaking | Low | Prisma transactions with serializable isolation |

---

## Sources

Research informing this design:

- [Trading 101 - Prosperous Universe Development Log](https://prosperousuniverse.com/blog/2023/02/20/trading-101-374) -- Commodity exchange design in async browser game
- [The Market Guide - Prosperous Universe Handbook](https://handbook.apex.prosperousuniverse.com/tutorials/current-tutorials/05-market-guide/index.html) -- Player-driven market UI patterns
- [Trading - EVE University Wiki](https://wiki.eveuniversity.org/Trading) -- Order book mechanics, price-time priority
- [Broker Fee and Sales Tax - EVE Online](https://support.eveonline.com/hc/en-us/articles/203218962-Broker-Fee-and-Sales-Tax) -- Fee structure reference (3% broker, 7.5% sales tax as of March 2025)
- [Station Trading Complete Guide - Brave Collective](https://wiki.bravecollective.com/public/dojo/wiki/station_trading_complete_guide) -- Trading strategies
- [Order Matching Engine: Everything You Need to Know - Devexperts](https://devexperts.com/blog/order-matching-engine-everything-you-need-to-know/) -- Matching engine architecture
- [Matching Engines - Jelle Pelgrims](https://jellepelgrims.com/posts/matching_engines) -- Price-time FIFO vs Pro-Rata algorithms
- [Understanding Matching Engines - Tecassa](https://tecassa.com/explainers/understanding-matching-engines) -- Data structure choices for order books
- [How to Build a Fast Limit Order Book - GitHub](https://gist.github.com/halfelf/db1ae032dc34278968f8bf31ee999a25) -- Implementation patterns
- [Storing Financial Time-Series Data Efficiently - Eric Draken](https://ericdraken.com/storing-stock-candle-data-efficiently/) -- OHLCV storage in PostgreSQL
- [Vonmo Trade Experiment: Stock Charts](https://www.vonmo.com/en/blog/vonmo-trade-experiment-stock-charts) -- Candle data schema design
- [Market Interventions in Large-Scale Virtual Economy - arXiv](https://arxiv.org/pdf/2210.09770) -- Academic research on virtual economy manipulation
- [Game Economy Design Essentials - Number Analytics](https://www.numberanalytics.com/blog/game-economy-design-essentials) -- Currency sinks and inflation control
- [What is Video Game Economy Design - Game Design Skills](https://gamedesignskills.com/game-design/economy-design/) -- Anti-exploitation patterns
- [Building a Thriving Virtual Economy - DEV Community](https://dev.to/okoye_ndidiamaka_5e3b7d30/building-a-thriving-virtual-economy-in-games-strategies-towards-balance-and-engagement-bn8) -- Balance strategies
- [Video Game Economy Design - Kevuru Games](https://kevurugames.com/blog/what-is-video-game-economy-design/) -- Economy fundamentals
- [19 Tips to Improve Game Economy - Machinations.io](https://machinations.io/articles/19-tips-to-successfully-improve-your-game-economy) -- Practical economy tips
- [Industry Idle - A Poor Indie's Journey to Multiplayer](https://ruoyusun.com/2022/01/10/industry-idle-netcode.html) -- Async multiplayer market implementation
