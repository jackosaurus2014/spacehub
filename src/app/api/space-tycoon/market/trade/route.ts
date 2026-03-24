import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { calculatePriceAfterTrade, getSupplyPriceMultiplier, MINIMUM_MARKET_SUPPLY } from '@/lib/game/market-engine';
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
    const body = await request.json();
    const { type, resourceSlug, quantity, profileId } = body;

    if (!type || !resourceSlug || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Invalid trade parameters' }, { status: 400 });
    }
    if (type !== 'buy' && type !== 'sell') {
      return NextResponse.json({ error: 'Type must be "buy" or "sell"' }, { status: 400 });
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
    const totalCost = Math.round(pricePerUnit * quantity);

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
