import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { calculatePriceAfterTrade } from '@/lib/game/market-engine';

/**
 * POST /api/space-tycoon/market/trade
 * Execute a buy or sell trade on the global market.
 * Updates the shared price for all players.
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

    const isBuy = type === 'buy';
    const pricePerUnit = resource.currentPrice;
    const totalCost = Math.round(pricePerUnit * quantity);

    // Calculate new price after trade
    const newPrice = calculatePriceAfterTrade(
      resource.currentPrice,
      resource.basePrice,
      quantity,
      isBuy,
      resource.volatility,
      resource.minPrice,
      resource.maxPrice,
    );

    // Update supply/demand and price atomically
    const newSupply = isBuy
      ? Math.max(0, resource.totalSupply - quantity)
      : resource.totalSupply + quantity;
    const newDemand = isBuy
      ? resource.totalDemand + quantity
      : Math.max(0, resource.totalDemand - quantity);

    // Build price history (keep last 50 entries)
    const history = Array.isArray(resource.priceHistory) ? resource.priceHistory as number[] : [];
    const updatedHistory = [...history, newPrice].slice(-50);

    // Update resource price
    await prisma.marketResource.update({
      where: { id: resource.id },
      data: {
        currentPrice: newPrice,
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

    const change = Math.round(((newPrice / resource.basePrice) - 1) * 100);

    logger.info('Market trade executed', {
      type, resource: resourceSlug, quantity,
      oldPrice: pricePerUnit, newPrice, change: `${change}%`,
    });

    return NextResponse.json({
      success: true,
      trade: {
        type,
        resource: resourceSlug,
        quantity,
        pricePerUnit,
        totalCost,
        newPrice,
        change,
      },
    });
  } catch (error) {
    logger.error('Market trade error', { error: String(error) });
    return NextResponse.json({ error: 'Trade failed' }, { status: 500 });
  }
}
