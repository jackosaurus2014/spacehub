// ─── Space Tycoon: Player-Driven Marketplace — Order Book Engine ─────────────
// Price-Time FIFO matching, escrow, NPC Market Maker, candle construction.
// This is ADDITIVE to the existing market-engine.ts. Existing trade flow is preserved.

import prisma from '@/lib/db';
import { RESOURCE_MAP } from './resources';
import type { ResourceId } from './resources';
import { validatePriceBand } from './price-band';
import { computeNpcMakerQuote } from './market-engine';
import { recordLedger, isLedgerAvailable } from './server-ledger';

// ─── Constants ────────────────────────────────────────────────────────────────

const FEE_RATE = 0.02; // 2% transaction fee
const NPC_SPREAD_HALF = 0.10; // 10% each side = 20% total NPC spread
const MAX_OPEN_ORDERS = 20; // Base max open orders per player
const NPC_PROFILE_ID = '__NPC_MARKET_MAKER__';

/**
 * NPC daily volume caps by resource. A key present with value `0` means the
 * NPC maker places NO standing orders at all for that resource (checked via
 * `Object.prototype.hasOwnProperty`, NOT `||`, below — `0 || 50` would
 * silently resurrect a "zero" cap to the 50 default, which is exactly the
 * free-money-printer bug Wave E2's [BAL] note warns about: an NPC standing
 * BUY order pays real money out of nowhere on every fill (see matchOrders —
 * the NPC counterparty has no real wallet), so a top-of-chain crafted good
 * with unlimited NPC buy liquidity would be a mint. Keys absent entirely
 * fall back to the 50-unit default below.
 */
const NPC_VOLUME_CAPS: Record<string, number> = {
  // Common
  iron: 200, aluminum: 200, lunar_water: 200, methane: 200, ethane: 200,
  // Mid-tier
  titanium: 50, gold: 50, rare_earth: 50, platinum_group: 50, mars_water: 50,
  // Exotic
  exotic_materials: 10, helium3: 10,

  // ─── Wave E2 "Goods on the Book" (docs/ECONOMY_PVP_2026-08.md §E2) ─────
  // Adopted colony orphan slugs — real NPC colony production exists
  // (colonies.ts COLONY_MINING_PRODUCTION), so these get ordinary caps
  // scaled to their rarity tier (mirrors the raw-resource tiers above).
  sulfur: 150, ammonia: 120, solar_concentrate: 80,
  organic_compounds: 15, deuterium: 8, bio_samples: 5, antimatter_precursors: 3,

  // Crafted goods — no NPC production yet (E3 lands it), so caps are tight
  // by design, tapering to zero at the top of the chain. Tier 1 (refined):
  steel_ingots: 25, aluminum_alloy: 25, rocket_fuel: 20, refined_rare_earth: 15,
  // Tier 2 (components) — "tight" per spec:
  structural_beams: 8, electronics_package: 6, solar_panel_array: 6,
  propulsion_unit: 4, life_support_pack: 0,
  // Tier 3 (products) — tighter still, real scarcity:
  station_module: 2, satellite_bus: 2, ai_compute_cluster: 2,
  // Tier 4 (top-of-chain products) — zero: player-only markets, no NPC
  // buyer/seller, per the MINED_ONLY precedent.
  fusion_core: 0, habitat_pod: 0,

  // exotic_fuel/xenogenic_biomatter are MINED_ONLY (interstellar-only
  // production) — explicit zero rather than falling through to the default.
  exotic_fuel: 0, xenogenic_biomatter: 0,
};

/** `0` is a valid, meaningful cap (see NPC_VOLUME_CAPS doc comment) — only an
 *  absent key falls back to the default. */
function getNpcVolumeCap(resourceSlug: string): number {
  return Object.prototype.hasOwnProperty.call(NPC_VOLUME_CAPS, resourceSlug)
    ? NPC_VOLUME_CAPS[resourceSlug]
    : 50;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getResourceDef(slug: string) {
  return RESOURCE_MAP.get(slug as ResourceId);
}

// validatePriceBand now lives in ./price-band (pure, client-safe) so the
// futures engine (market-depth.ts) can enforce the same band. Re-exported
// here for backward compatibility.
export { validatePriceBand } from './price-band';

/** Calculate the remaining quantity on an order */
function remainingQty(order: { quantity: number; filledQty: number }): number {
  return order.quantity - order.filledQty;
}

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Place a limit order with escrow.
 * Buy: deducts money (price * qty * (1 + feeRate)) from player.
 * Sell: deducts resource quantity from player inventory.
 * Then attempts immediate matching.
 */
export async function placeLimitOrder(
  profileId: string,
  resourceSlug: string,
  side: 'buy' | 'sell',
  quantity: number,
  pricePerUnit: number,
  expiresInHours: number = 24,
): Promise<{
  success: boolean;
  order?: { id: string; status: string; filledQty: number; remainingQty: number };
  fills?: { quantity: number; price: number }[];
  escrowDeducted?: number;
  error?: string;
}> {
  // Validate resource exists
  const resourceDef = getResourceDef(resourceSlug);
  if (!resourceDef) {
    return { success: false, error: `Resource "${resourceSlug}" not found` };
  }

  // Validate quantity
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { success: false, error: 'Quantity must be a positive integer' };
  }

  // Validate price
  if (!Number.isInteger(pricePerUnit) || pricePerUnit < 1) {
    return { success: false, error: 'Price must be a positive integer' };
  }

  // Price band check
  const band = validatePriceBand(
    pricePerUnit,
    resourceDef.baseMarketPrice,
    resourceDef.minPrice,
    resourceDef.maxPrice,
  );
  if (!band.valid) {
    return {
      success: false,
      error: `Price must be between ${band.min.toLocaleString()} and ${band.max.toLocaleString()}`,
    };
  }

  // Check open order limit
  const openCount = await prisma.marketLimitOrder.count({
    where: { profileId, status: { in: ['open', 'partial'] } },
  });
  if (openCount >= MAX_OPEN_ORDERS) {
    return { success: false, error: `Maximum ${MAX_OPEN_ORDERS} open orders allowed` };
  }

  // Calculate escrow
  const escrowAmount = side === 'buy'
    ? Math.round(pricePerUnit * quantity * (1 + FEE_RATE))
    : quantity; // For sells, escrow is the resource quantity

  // Load profile for balance/resource check
  const profile = await prisma.gameProfile.findUnique({ where: { id: profileId } });
  if (!profile) {
    return { success: false, error: 'Profile not found' };
  }

  if (side === 'buy') {
    if (profile.money < escrowAmount) {
      return { success: false, error: 'Insufficient funds for this order (including 2% fee escrow)' };
    }
  } else {
    const resources = (profile.resources as Record<string, number>) || {};
    const held = resources[resourceSlug] || 0;
    if (held < quantity) {
      return { success: false, error: `Insufficient ${resourceDef.name}. You have ${held}, need ${quantity}` };
    }
  }

  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  // One Wallet (audit A1): probe ledger availability OUTSIDE the transaction.
  const ledgerOn = await isLedgerAvailable();

  // Create order and deduct escrow in a transaction
  const order = await prisma.$transaction(async (tx) => {
    // Create the order first so ledger entries can reference it
    const created = await tx.marketLimitOrder.create({
      data: {
        profileId,
        resourceSlug,
        side,
        quantity,
        filledQty: 0,
        pricePerUnit,
        escrowAmount,
        status: 'open',
        expiresAt,
      },
    });

    // Deduct escrow (+ledger entry, atomically)
    if (side === 'buy') {
      await tx.gameProfile.update({
        where: { id: profileId },
        data: { money: { decrement: escrowAmount } },
      });
      if (ledgerOn) {
        await recordLedger(tx, {
          profileId, moneyDelta: -escrowAmount,
          reason: 'order_escrow', refId: created.id,
        });
      }
    } else {
      const currentResources = (profile.resources as Record<string, number>) || {};
      const updatedResources = { ...currentResources };
      updatedResources[resourceSlug] = (updatedResources[resourceSlug] || 0) - quantity;
      await tx.gameProfile.update({
        where: { id: profileId },
        data: { resources: updatedResources },
      });
      if (ledgerOn) {
        await recordLedger(tx, {
          profileId, resourceSlug, resourceDelta: -quantity,
          reason: 'order_resource_escrow', refId: created.id,
        });
      }
    }

    return created;
  });

  // Attempt immediate matching
  const fills = await matchOrders(resourceSlug);
  const myFills = fills.filter(
    f => (side === 'buy' && f.buyerProfileId === profileId) ||
         (side === 'sell' && f.sellerProfileId === profileId),
  );

  // Reload order to get updated status
  const updatedOrder = await prisma.marketLimitOrder.findUnique({ where: { id: order.id } });

  return {
    success: true,
    order: {
      id: order.id,
      status: updatedOrder?.status || order.status,
      filledQty: updatedOrder?.filledQty || 0,
      remainingQty: remainingQty(updatedOrder || order),
    },
    fills: myFills.map(f => ({ quantity: f.quantity, price: f.pricePerUnit })),
    escrowDeducted: escrowAmount,
  };
}

/**
 * Price-Time FIFO order matching for a single resource.
 * Returns array of fills created.
 */
export async function matchOrders(resourceSlug: string): Promise<{
  quantity: number;
  pricePerUnit: number;
  buyerProfileId: string;
  sellerProfileId: string;
}[]> {
  const fills: {
    quantity: number;
    pricePerUnit: number;
    buyerProfileId: string;
    sellerProfileId: string;
  }[] = [];

  // One Wallet (audit A1): probe ledger availability OUTSIDE the transaction.
  const ledgerOn = await isLedgerAvailable();

  // Use a transaction with serializable isolation for consistency
  await prisma.$transaction(async (tx) => {
    // Get open buy orders sorted by price DESC (best bid first), then time ASC
    const buyOrders = await tx.marketLimitOrder.findMany({
      where: {
        resourceSlug,
        side: 'buy',
        status: { in: ['open', 'partial'] },
      },
      orderBy: [{ pricePerUnit: 'desc' }, { createdAt: 'asc' }],
    });

    // Get open sell orders sorted by price ASC (best ask first), then time ASC
    const sellOrders = await tx.marketLimitOrder.findMany({
      where: {
        resourceSlug,
        side: 'sell',
        status: { in: ['open', 'partial'] },
      },
      orderBy: [{ pricePerUnit: 'asc' }, { createdAt: 'asc' }],
    });

    let bi = 0;
    let si = 0;

    while (bi < buyOrders.length && si < sellOrders.length) {
      const bestBuy = buyOrders[bi];
      const bestSell = sellOrders[si];

      // No more crossable orders
      if (bestBuy.pricePerUnit < bestSell.pricePerUnit) break;

      // Self-trade prevention
      if (bestBuy.profileId === bestSell.profileId) {
        // Log the blocked self-trade attempt
        await tx.marketAuditLog.create({
          data: {
            eventType: 'self_trade_blocked',
            profileId: bestBuy.profileId,
            resourceSlug,
            details: {
              buyOrderId: bestBuy.id,
              sellOrderId: bestSell.id,
            },
            severity: 'info',
          },
        });
        // Skip the sell order and try the next one
        si++;
        continue;
      }

      // Execution price = resting order's price (whichever was placed first)
      const executionPrice = bestBuy.createdAt < bestSell.createdAt
        ? bestBuy.pricePerUnit
        : bestSell.pricePerUnit;

      const buyRemaining = bestBuy.quantity - bestBuy.filledQty;
      const sellRemaining = bestSell.quantity - bestSell.filledQty;
      const fillQty = Math.min(buyRemaining, sellRemaining);

      if (fillQty <= 0) {
        bi++;
        continue;
      }

      const totalValue = executionPrice * fillQty;
      const fee = Math.round(totalValue * FEE_RATE);

      // Create fill record
      // Wave E6 (docs/ECONOMY_PVP_2026-08.md §E6): resourceSlug is denormalized
      // onto the fill (already in scope as this function's own parameter) so
      // market-share.ts can aggregate/group directly on MarketFill without a
      // relation join to MarketLimitOrder.
      await tx.marketFill.create({
        data: {
          orderId: bestBuy.id,
          counterOrderId: bestSell.id,
          resourceSlug,
          quantity: fillQty,
          pricePerUnit: executionPrice,
          totalValue,
          fee,
          buyerProfileId: bestBuy.profileId,
          sellerProfileId: bestSell.profileId,
        },
      });

      fills.push({
        quantity: fillQty,
        pricePerUnit: executionPrice,
        buyerProfileId: bestBuy.profileId,
        sellerProfileId: bestSell.profileId,
      });

      // Update buy order
      const newBuyFilled = bestBuy.filledQty + fillQty;
      const buyFullyFilled = newBuyFilled >= bestBuy.quantity;
      await tx.marketLimitOrder.update({
        where: { id: bestBuy.id },
        data: {
          filledQty: newBuyFilled,
          status: buyFullyFilled ? 'filled' : 'partial',
        },
      });
      bestBuy.filledQty = newBuyFilled;

      // Update sell order
      const newSellFilled = bestSell.filledQty + fillQty;
      const sellFullyFilled = newSellFilled >= bestSell.quantity;
      await tx.marketLimitOrder.update({
        where: { id: bestSell.id },
        data: {
          filledQty: newSellFilled,
          status: sellFullyFilled ? 'filled' : 'partial',
        },
      });
      bestSell.filledQty = newSellFilled;

      // Transfer resources to buyer (unless NPC)
      if (bestBuy.profileId !== NPC_PROFILE_ID) {
        const buyerProfile = await tx.gameProfile.findUnique({ where: { id: bestBuy.profileId } });
        if (buyerProfile) {
          const buyerRes = (buyerProfile.resources as Record<string, number>) || {};
          buyerRes[resourceSlug] = (buyerRes[resourceSlug] || 0) + fillQty;
          await tx.gameProfile.update({
            where: { id: bestBuy.profileId },
            data: { resources: buyerRes },
          });
          if (ledgerOn) {
            await recordLedger(tx, {
              profileId: bestBuy.profileId, resourceSlug, resourceDelta: fillQty,
              reason: 'order_resource_credit', refId: bestBuy.id,
            });
          }
        }

        // Refund excess escrow to buyer if execution price < order price
        if (executionPrice < bestBuy.pricePerUnit) {
          const savedPerUnit = bestBuy.pricePerUnit - executionPrice;
          const refund = Math.round(savedPerUnit * fillQty * (1 + FEE_RATE));
          await tx.gameProfile.update({
            where: { id: bestBuy.profileId },
            data: { money: { increment: refund } },
          });
          if (ledgerOn) {
            await recordLedger(tx, {
              profileId: bestBuy.profileId, moneyDelta: refund,
              reason: 'order_fill_refund', refId: bestBuy.id,
            });
          }
        }
      }

      // Pay seller (unless NPC)
      if (bestSell.profileId !== NPC_PROFILE_ID) {
        const sellerRevenue = totalValue - fee;
        await tx.gameProfile.update({
          where: { id: bestSell.profileId },
          data: { money: { increment: sellerRevenue } },
        });
        if (ledgerOn) {
          await recordLedger(tx, {
            profileId: bestSell.profileId, moneyDelta: sellerRevenue,
            reason: 'order_sale_revenue', refId: bestSell.id,
          });
        }
      }

      // Update candle
      await upsertPriceCandle(tx, resourceSlug, executionPrice, fillQty);

      // Update MarketResource with last trade price
      await tx.marketResource.updateMany({
        where: { slug: resourceSlug },
        data: { currentPrice: executionPrice },
      });

      if (buyFullyFilled) bi++;
      if (sellFullyFilled) si++;
    }
  });

  // Check price alerts after matching
  if (fills.length > 0) {
    const lastPrice = fills[fills.length - 1].pricePerUnit;
    await checkPriceAlerts(resourceSlug, lastPrice).catch(() => {});
  }

  return fills;
}

/**
 * Cancel an open or partial order, returning escrow.
 */
export async function cancelOrder(
  orderId: string,
  profileId: string,
): Promise<{ success: boolean; refunded?: { money?: number; resource?: string; quantity?: number }; error?: string }> {
  const order = await prisma.marketLimitOrder.findUnique({ where: { id: orderId } });

  if (!order) {
    return { success: false, error: 'Order not found' };
  }
  if (order.profileId !== profileId) {
    return { success: false, error: 'Not your order' };
  }
  if (!['open', 'partial'].includes(order.status)) {
    return { success: false, error: `Cannot cancel order with status "${order.status}"` };
  }

  const remaining = order.quantity - order.filledQty;

  // One Wallet (audit A1): probe ledger availability OUTSIDE the transaction.
  const ledgerOn = await isLedgerAvailable();

  await prisma.$transaction(async (tx) => {
    // Mark cancelled
    await tx.marketLimitOrder.update({
      where: { id: orderId },
      data: { status: 'cancelled' },
    });

    // Refund escrow
    if (order.side === 'buy') {
      const refund = Math.round(order.pricePerUnit * remaining * (1 + FEE_RATE));
      await tx.gameProfile.update({
        where: { id: profileId },
        data: { money: { increment: refund } },
      });
      if (ledgerOn) {
        await recordLedger(tx, {
          profileId, moneyDelta: refund,
          reason: 'order_escrow_refund', refId: orderId,
        });
      }
    } else {
      const profile = await tx.gameProfile.findUnique({ where: { id: profileId } });
      if (profile) {
        const resources = (profile.resources as Record<string, number>) || {};
        resources[order.resourceSlug] = (resources[order.resourceSlug] || 0) + remaining;
        await tx.gameProfile.update({
          where: { id: profileId },
          data: { resources },
        });
        if (ledgerOn) {
          await recordLedger(tx, {
            profileId, resourceSlug: order.resourceSlug, resourceDelta: remaining,
            reason: 'order_resource_refund', refId: orderId,
          });
        }
      }
    }
  });

  if (order.side === 'buy') {
    return {
      success: true,
      refunded: { money: Math.round(order.pricePerUnit * remaining * (1 + FEE_RATE)) },
    };
  } else {
    return {
      success: true,
      refunded: { resource: order.resourceSlug, quantity: remaining },
    };
  }
}

/**
 * Generate NPC Market Maker orders for a resource.
 *
 * Wave E2 (docs/ECONOMY_PVP_2026-08.md §2.5): the maker now quotes around
 * LIVE SPOT (`MarketResource.currentPrice`), not the static base, with an
 * inventory-aware half-spread `0.06 + 0.10 × capUsedFraction` that widens as
 * the maker's rolling 24h volume cap is spent — so it sells into spikes and
 * buys into crashes (the market floor) without being one-directional free
 * money after a price move. Quotes are band-clamped to base×0.3 .. base×3.0.
 *
 * `referenceSpot` may be passed (already band-clamped spot from the sync
 * snapshot); when omitted the maker reads the resource's currentPrice.
 * NPC orders are permanent backstop liquidity.
 */
export async function getNPCMarketMakerOrders(
  resourceSlug: string,
  referenceSpot?: number,
): Promise<{ bid: { price: number; quantity: number }; ask: { price: number; quantity: number }; spreadHalf: number }> {
  const resourceDef = getResourceDef(resourceSlug);
  const basePrice = resourceDef?.baseMarketPrice ?? 0;
  const minPrice = resourceDef?.minPrice ?? 1;
  const maxPrice = resourceDef?.maxPrice ?? Number.MAX_SAFE_INTEGER;
  const volume = getNpcVolumeCap(resourceSlug);

  // Wave E2 [BAL]: a zero cap (top-of-chain crafted products, MINED_ONLY
  // resources) means the NPC maker provides NO liquidity at all for this
  // resource — skip order placement entirely rather than resting a
  // quantity:0 order pair. Any pre-existing NPC orders are still cleaned up
  // (a resource can transition to zero-cap between calls).
  if (volume <= 0) {
    await prisma.marketLimitOrder.updateMany({
      where: { profileId: NPC_PROFILE_ID, resourceSlug, status: { in: ['open', 'partial'] } },
      data: { status: 'cancelled' },
    });
    return { bid: { price: 0, quantity: 0 }, ask: { price: 0, quantity: 0 }, spreadHalf: 0 };
  }

  // Live spot: prefer the caller-supplied (already-clamped) reference, else
  // the maintained shared currentPrice, else base.
  let spot = typeof referenceSpot === 'number' && Number.isFinite(referenceSpot) && referenceSpot > 0
    ? referenceSpot
    : basePrice;
  if (referenceSpot === undefined) {
    const row = await prisma.marketResource.findUnique({
      where: { slug: resourceSlug },
      select: { currentPrice: true },
    });
    if (row && row.currentPrice > 0) spot = row.currentPrice;
  }

  // Inventory awareness: how much of the maker's daily volume cap has already
  // been consumed by its fills in the trailing 24h. Fuller cap → wider spread.
  let capUsedFraction = 0;
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const npcFills = await prisma.marketFill.findMany({
      where: {
        createdAt: { gte: since },
        OR: [{ buyerProfileId: NPC_PROFILE_ID }, { sellerProfileId: NPC_PROFILE_ID }],
        order: { resourceSlug },
      },
      select: { quantity: true },
    });
    const used = npcFills.reduce((s, f) => s + (f.quantity || 0), 0);
    capUsedFraction = volume > 0 ? Math.min(1, used / volume) : 0;
  } catch { /* inventory read best-effort — default to base spread */ }

  const quote = computeNpcMakerQuote({ spotPrice: spot, basePrice, minPrice, maxPrice, capUsedFraction });
  const npcBidPrice = quote.bid;
  const npcAskPrice = quote.ask;

  // Clean up any existing NPC orders for this resource
  await prisma.marketLimitOrder.updateMany({
    where: {
      profileId: NPC_PROFILE_ID,
      resourceSlug,
      status: { in: ['open', 'partial'] },
    },
    data: { status: 'cancelled' },
  });

  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours

  // Place NPC buy order
  await prisma.marketLimitOrder.create({
    data: {
      profileId: NPC_PROFILE_ID,
      resourceSlug,
      side: 'buy',
      quantity: volume,
      filledQty: 0,
      pricePerUnit: npcBidPrice,
      escrowAmount: 0,
      status: 'open',
      expiresAt,
    },
  });

  // Place NPC sell order
  await prisma.marketLimitOrder.create({
    data: {
      profileId: NPC_PROFILE_ID,
      resourceSlug,
      side: 'sell',
      quantity: volume,
      filledQty: 0,
      pricePerUnit: npcAskPrice,
      escrowAmount: 0,
      status: 'open',
      expiresAt,
    },
  });

  return {
    bid: { price: npcBidPrice, quantity: volume },
    ask: { price: npcAskPrice, quantity: volume },
    spreadHalf: quote.spreadHalf,
  };
}

/**
 * Check and trigger price alerts for a resource.
 */
export async function checkPriceAlerts(
  resourceSlug: string,
  currentPrice: number,
): Promise<number> {
  const alerts = await prisma.marketAlert.findMany({
    where: {
      resourceSlug,
      triggered: false,
    },
  });

  let triggeredCount = 0;

  for (const alert of alerts) {
    let shouldTrigger = false;
    if (alert.direction === 'above' && currentPrice >= alert.targetPrice) {
      shouldTrigger = true;
    }
    if (alert.direction === 'below' && currentPrice <= alert.targetPrice) {
      shouldTrigger = true;
    }

    if (shouldTrigger) {
      await prisma.marketAlert.update({
        where: { id: alert.id },
        data: {
          triggered: true,
          triggeredAt: new Date(),
        },
      });
      triggeredCount++;
    }
  }

  return triggeredCount;
}

/**
 * Upsert a 1-hour OHLCV candle for the given resource and price.
 * Called within a transaction context from matchOrders.
 */
async function upsertPriceCandle(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  resourceSlug: string,
  price: number,
  volume: number,
): Promise<void> {
  const now = new Date();
  const openTime = new Date(now);
  openTime.setMinutes(0, 0, 0); // Floor to current hour

  const existing = await tx.marketPriceCandle.findUnique({
    where: {
      resourceSlug_timeframe_openTime: {
        resourceSlug,
        timeframe: '1h',
        openTime,
      },
    },
  });

  if (existing) {
    await tx.marketPriceCandle.update({
      where: { id: existing.id },
      data: {
        high: Math.max(existing.high, price),
        low: Math.min(existing.low, price),
        close: price,
        volume: existing.volume + volume,
        tradeCount: existing.tradeCount + 1,
      },
    });
  } else {
    await tx.marketPriceCandle.create({
      data: {
        resourceSlug,
        timeframe: '1h',
        openTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume,
        tradeCount: 1,
      },
    });
  }
}

/**
 * Public version of updatePriceCandle (outside transaction context).
 */
export async function updatePriceCandle(
  resourceSlug: string,
  price: number,
  volume: number,
): Promise<void> {
  const now = new Date();
  const openTime = new Date(now);
  openTime.setMinutes(0, 0, 0);

  const existing = await prisma.marketPriceCandle.findUnique({
    where: {
      resourceSlug_timeframe_openTime: {
        resourceSlug,
        timeframe: '1h',
        openTime,
      },
    },
  });

  if (existing) {
    await prisma.marketPriceCandle.update({
      where: { id: existing.id },
      data: {
        high: Math.max(existing.high, price),
        low: Math.min(existing.low, price),
        close: price,
        volume: existing.volume + volume,
        tradeCount: existing.tradeCount + 1,
      },
    });
  } else {
    await prisma.marketPriceCandle.create({
      data: {
        resourceSlug,
        timeframe: '1h',
        openTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume,
        tradeCount: 1,
      },
    });
  }
}

/**
 * Get the aggregated order book for a resource (top N levels per side).
 */
export async function getOrderBook(resourceSlug: string, levels: number = 10) {
  // Get bids aggregated by price level
  const bids = await prisma.marketLimitOrder.groupBy({
    by: ['pricePerUnit'],
    where: {
      resourceSlug,
      side: 'buy',
      status: { in: ['open', 'partial'] },
    },
    _sum: { quantity: true, filledQty: true },
    _count: true,
    orderBy: { pricePerUnit: 'desc' },
    take: levels,
  });

  // Get asks aggregated by price level
  const asks = await prisma.marketLimitOrder.groupBy({
    by: ['pricePerUnit'],
    where: {
      resourceSlug,
      side: 'sell',
      status: { in: ['open', 'partial'] },
    },
    _sum: { quantity: true, filledQty: true },
    _count: true,
    orderBy: { pricePerUnit: 'asc' },
    take: levels,
  });

  // Check which levels have NPC orders
  const npcOrders = await prisma.marketLimitOrder.findMany({
    where: {
      profileId: NPC_PROFILE_ID,
      resourceSlug,
      status: { in: ['open', 'partial'] },
    },
    select: { side: true, pricePerUnit: true },
  });
  const npcPrices = new Set(npcOrders.map(o => `${o.side}:${o.pricePerUnit}`));

  // Get last trade for this resource
  const lastResourceFill = await prisma.marketFill.findFirst({
    where: {
      order: { resourceSlug },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formattedBids = bids.map(b => ({
    price: b.pricePerUnit,
    totalQty: (b._sum.quantity || 0) - (b._sum.filledQty || 0),
    orderCount: b._count,
    isNpc: npcPrices.has(`buy:${b.pricePerUnit}`),
  }));

  const formattedAsks = asks.map(a => ({
    price: a.pricePerUnit,
    totalQty: (a._sum.quantity || 0) - (a._sum.filledQty || 0),
    orderCount: a._count,
    isNpc: npcPrices.has(`sell:${a.pricePerUnit}`),
  }));

  const bestBid = formattedBids.length > 0 ? formattedBids[0].price : null;
  const bestAsk = formattedAsks.length > 0 ? formattedAsks[0].price : null;
  const spread = bestBid && bestAsk
    ? {
        absolute: bestAsk - bestBid,
        percentage: Math.round(((bestAsk - bestBid) / ((bestAsk + bestBid) / 2)) * 1000) / 10,
      }
    : null;

  return {
    bids: formattedBids,
    asks: formattedAsks,
    bestBid,
    bestAsk,
    spread,
    lastTradePrice: lastResourceFill?.pricePerUnit || null,
    lastTradeAt: lastResourceFill?.createdAt || null,
  };
}

export { FEE_RATE, NPC_PROFILE_ID, NPC_SPREAD_HALF };
