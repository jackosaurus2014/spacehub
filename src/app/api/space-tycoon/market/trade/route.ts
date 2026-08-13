import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { calculatePriceAfterTrade, getSupplyPriceMultiplier, MINIMUM_MARKET_SUPPLY, MARKET_BROKER_FEE_RATE } from '@/lib/game/market-engine';
import { RESOURCE_MAP } from '@/lib/game/resources';

/**
 * POST /api/space-tycoon/market/trade
 * Execute a buy or sell trade on the global market.
 * Updates the shared price for all players.
 *
 * Supply-demand pricing:
 * - Buying removes from market supply → price goes up
 * - Selling adds to market supply → price goes down
 * - Always at least MINIMUM_MARKET_SUPPLY available, but at scarcity premium
 * - Supply below baseline → prices spike (scarcity)
 * - Supply above baseline → prices drop (abundance)
 *
 * Body: { type: "buy"|"sell", resourceSlug: string, quantity: number, profileId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY (audit hotlist #1): this route moves the SHARED global price
    // for every player. It was unauthenticated — anyone could curl prices
    // up/down. Session required, matching sibling routes (orders, bounties).
    // Anonymous solo players are unaffected: MarketPanel falls back to
    // client-side local pricing when this returns 401.
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, resourceSlug, quantity } = body;

    // Never trust a client-supplied profileId — attribute trades to the
    // session's own profile.
    const sessionProfile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    const profileId = sessionProfile?.id;

    if (!type || !resourceSlug || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Invalid trade parameters' }, { status: 400 });
    }
    if (type !== 'buy' && type !== 'sell') {
      return NextResponse.json({ error: 'Type must be "buy" or "sell"' }, { status: 400 });
    }
    // Sanity cap: one call cannot dump an absurd volume onto the shared
    // price. (Price impact is already clamped to min/max band; this is
    // defense-in-depth against manipulation via a single authed request.)
    if (quantity > 100_000) {
      return NextResponse.json({ error: 'Quantity exceeds per-trade limit (100,000)' }, { status: 400 });
    }

    // Get current resource state
    const resource = await prisma.marketResource.findUnique({
      where: { slug: resourceSlug },
    });

    if (!resource) {
      return NextResponse.json({ error: `Resource "${resourceSlug}" not found` }, { status: 404 });
    }

    const resDef = RESOURCE_MAP.get(resourceSlug);
    const baselineSupply = resDef?.startingSupply || 1000;
    const isBuy = type === 'buy';

    // For buys: calculate supply-adjusted price (scarcity premium)
    const supplyMult = getSupplyPriceMultiplier(resource.totalSupply, baselineSupply);
    const effectivePrice = Math.round(resource.currentPrice * supplyMult);
    const pricePerUnit = isBuy ? effectivePrice : resource.currentPrice;
    const grossTotal = Math.round(pricePerUnit * quantity);

    // Sell-side broker commission (Wave 4 balance: sink that prevents
    // frictionless mine-and-sell loops). Buy-side is unaffected — scarcity
    // premium is already baked into the supply multiplier.
    const brokerFee = isBuy ? 0 : Math.round(grossTotal * MARKET_BROKER_FEE_RATE);
    const totalCost = isBuy ? grossTotal : grossTotal - brokerFee;

    // For buys: check available supply (always at least MINIMUM_MARKET_SUPPLY)
    if (isBuy) {
      const available = Math.max(MINIMUM_MARKET_SUPPLY, resource.totalSupply);
      if (quantity > available) {
        return NextResponse.json({
          error: `Only ${available} ${resourceSlug} available on the market`,
          available,
        }, { status: 400 });
      }
    }

    // Calculate new price after trade (trade impact on base price)
    const newBasePrice = calculatePriceAfterTrade(
      resource.currentPrice,
      resource.basePrice,
      quantity,
      isBuy,
      resource.volatility,
      resource.minPrice,
      resource.maxPrice,
    );

    // Update supply: buys decrease, sells increase
    const newSupply = isBuy
      ? Math.max(0, resource.totalSupply - quantity)
      : resource.totalSupply + quantity;
    const newDemand = isBuy
      ? resource.totalDemand + quantity
      : Math.max(0, resource.totalDemand - quantity);

    // The new effective price factors in updated supply
    const newSupplyMult = getSupplyPriceMultiplier(newSupply, baselineSupply);
    const newEffectivePrice = Math.round(newBasePrice * newSupplyMult);

    // Build price history (keep last 50 entries)
    const history = Array.isArray(resource.priceHistory) ? resource.priceHistory as number[] : [];
    const updatedHistory = [...history, newEffectivePrice].slice(-50);

    // Update resource state atomically
    await prisma.marketResource.update({
      where: { id: resource.id },
      data: {
        currentPrice: newBasePrice, // Store base price (supply mult applied at read time)
        totalSupply: newSupply,
        totalDemand: newDemand,
        priceHistory: updatedHistory,
      },
    });

    // Record the order (if profileId provided)
    if (profileId) {
      try {
        await prisma.marketOrder.create({
          data: {
            profileId,
            resourceId: resource.id,
            type,
            quantity,
            pricePerUnit,
            totalCost,
            status: 'completed',
          },
        });
      } catch {
        // Order logging is non-critical
      }
    }

    const change = Math.round(((newEffectivePrice / resource.basePrice) - 1) * 100);

    logger.info('Market trade executed', {
      type, resource: resourceSlug, quantity,
      pricePerUnit, newBasePrice, newEffectivePrice,
      supply: `${resource.totalSupply} → ${newSupply}`,
      supplyMultiplier: newSupplyMult.toFixed(2),
      change: `${change}%`,
    });

    return NextResponse.json({
      success: true,
      trade: {
        type,
        resource: resourceSlug,
        quantity,
        pricePerUnit,
        grossTotal,
        brokerFee,
        brokerFeeRate: isBuy ? 0 : MARKET_BROKER_FEE_RATE,
        totalCost,
        newPrice: newEffectivePrice,
        supply: newSupply,
        supplyMultiplier: Math.round(newSupplyMult * 100) / 100,
        change,
      },
    });
  } catch (error) {
    logger.error('Market trade error', { error: String(error) });
    return NextResponse.json({ error: 'Trade failed' }, { status: 500 });
  }
}
