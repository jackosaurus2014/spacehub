// ─── Space Tycoon: Player-Driven Marketplace — Order Book Engine ─────────────
// Price-Time FIFO matching, escrow, NPC Market Maker, candle construction.
// This is ADDITIVE to the existing market-engine.ts. Existing trade flow is preserved.

import prisma from '@/lib/db';
import { RESOURCE_MAP } from './resources';
import type { ResourceId } from './resources';

// ─── Constants ────────────────────────────────────────────────────────────────

const FEE_RATE = 0.02; // 2% transaction fee
const NPC_SPREAD_HALF = 0.10; // 10% each side = 20% total NPC spread
const PRICE_BAND_LOW = 0.30; // 30% of basePrice
const PRICE_BAND_HIGH = 3.00; // 300% of basePrice
const MAX_OPEN_ORDERS = 20; // Base max open orders per player
const NPC_PROFILE_ID = '__NPC_MARKET_MAKER__';

/** NPC daily volume caps by resource category */
const NPC_VOLUME_CAPS: Record<string, number> = {
  // Common
  iron: 200, aluminum: 200, lunar_water: 200, methane: 200, ethane: 200,
  // Mid-tier
  titanium: 50, gold: 50, rare_earth: 50, platinum_group: 50, mars_water: 50,
  // Exotic
  exotic_materials: 10, helium3: 10,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getResourceDef(slug: string) {
  return RESOURCE_MAP.get(slug as ResourceId);
}

/** Validate that a price is within allowed bands for a resource */
export function validatePriceBand(
  price: number,
  basePrice: number,
  minPrice: number,
  maxPrice: number,
): { valid: boolean; min: number; max: number } {
  const bandMin = Math.max(minPrice, Math.round(basePrice * PRICE_BAND_LOW));
  const bandMax = Math.min(maxPrice, Math.round(basePrice * PRICE_BAND_HIGH));
  return {
    valid: price >= bandMin && price <= bandMax,
    min: bandMin,
    max: bandMax,
  };
}

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

  // Create order and deduct escrow in a transaction
  const order = await prisma.$transaction(async (tx) => {
    // Deduct escrow
    if (side === 'buy') {
      await tx.gameProfile.update({
        where: { id: profileId },
        data: { money: { decrement: escrowAmount } },
      });
    } else {
      const currentResources = (profile.resources as Record<string, number>) || {};
      const updatedResources = { ...currentResources };
      updatedResources[resourceSlug] = (updatedResources[resourceSlug] || 0) - quantity;
      await tx.gameProfile.update({
        where: { id: profileId },
        data: { resources: updatedResources },
      });
    }

    // Create the order
    return tx.marketLimitOrder.create({
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
      await tx.marketFill.create({
        data: {
          orderId: bestBuy.id,
          counterOrderId: bestSell.id,
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
        }

        // Refund excess escrow to buyer if execution price < order price
        if (executionPrice < bestBuy.pricePerUnit) {
          const savedPerUnit = bestBuy.pricePerUnit - executionPrice;
          const refund = Math.round(savedPerUnit * fillQty * (1 + FEE_RATE));
          await tx.gameProfile.update({
            where: { id: bestBuy.profileId },
            data: { money: { increment: refund } },
          });
        }
      }

      // Pay seller (unless NPC)
      if (bestSell.profileId !== NPC_PROFILE_ID) {
        const sellerRevenue = totalValue - fee;
        await tx.gameProfile.update({
          where: { id: bestSell.profileId },
          data: { money: { increment: sellerRevenue } },
        });
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
    } else {
      const profile = await tx.gameProfile.findUnique({ where: { id: profileId } });
      if (profile) {
        const resources = (profile.resources as Record<string, number>) || {};
        resources[order.resourceSlug] = (resources[order.resourceSlug] || 0) + remaining;
        await tx.gameProfile.update({
          where: { id: profileId },
          data: { resources },
        });
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
 * Creates one bid and one ask with 20% total spread around the current price.
 * NPC orders are permanent backstop liquidity.
 */
export async function getNPCMarketMakerOrders(
  resourceSlug: string,
  basePrice: number,
): Promise<{ bid: { price: number; quantity: number }; ask: { price: number; quantity: number } }> {
  const npcBidPrice = Math.round(basePrice * (1 - NPC_SPREAD_HALF));
  const npcAskPrice = Math.round(basePrice * (1 + NPC_SPREAD_HALF));
  const volume = NPC_VOLUME_CAPS[resourceSlug] || 50;

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
