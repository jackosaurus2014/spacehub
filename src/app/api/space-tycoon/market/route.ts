import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSupplyPriceMultiplier, MINIMUM_MARKET_SUPPLY } from '@/lib/game/market-engine';
import { RESOURCE_MAP } from '@/lib/game/resources';

/**
 * GET /api/space-tycoon/market
 * Returns current market prices for all resources.
 * Prices include supply-based multiplier (scarcity = higher price).
 * Public endpoint — no auth required.
 */
export async function GET() {
  try {
    const resources = await prisma.marketResource.findMany({
      orderBy: { slug: 'asc' },
      select: {
        slug: true,
        name: true,
        category: true,
        basePrice: true,
        currentPrice: true,
        totalSupply: true,
        totalDemand: true,
        priceHistory: true,
      },
    });

    const prices: Record<string, {
      currentPrice: number;
      basePrice: number;
      effectivePrice: number;
      change: number;
      supply: number;
      available: number;
      supplyMultiplier: number;
    }> = {};

    for (const r of resources) {
      const def = RESOURCE_MAP.get(r.slug as any);
      const baselineSupply = def?.startingSupply || 1000;
      const supplyMult = getSupplyPriceMultiplier(r.totalSupply, baselineSupply);
      const effectivePrice = Math.round(r.currentPrice * supplyMult);
      const change = Math.round(((effectivePrice / r.basePrice) - 1) * 100);
      const available = Math.max(MINIMUM_MARKET_SUPPLY, r.totalSupply);

      prices[r.slug] = {
        currentPrice: r.currentPrice,
        basePrice: r.basePrice,
        effectivePrice,
        change,
        supply: r.totalSupply,
        available,
        supplyMultiplier: Math.round(supplyMult * 100) / 100,
      };
    }

    return NextResponse.json({ prices, resources });
  } catch (error) {
    logger.error('Market API error', { error: String(error) });
    return NextResponse.json({ prices: {}, resources: [] });
  }
}
