import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSupplyPriceMultiplier, MINIMUM_MARKET_SUPPLY } from '@/lib/game/market-engine';
import { getGlobalActiveMarketEvents, getMarketEventMultiplier, getGlobalMarketEventForecast } from '@/lib/game/market-events';
import { RESOURCE_MAP } from '@/lib/game/resources';

/**
 * GET /api/space-tycoon/market
 * Returns current market prices for all resources.
 * Prices include supply-based multiplier (scarcity = higher price) and the
 * world-shared market event multiplier (audit Wave E / A5-iii: events were
 * flavor text — "'Helium-3 ×2.0' never touches a price"; the deterministic
 * global schedule now prices in here AND at trade execution).
 *
 * `forecastMarketEvents` (Wave M4, docs/MEANINGFUL_2026-08.md §M4, F8): the
 * same deterministic schedule, run forward 48h, returned to EVERY caller —
 * this is the fix for the client-computable-oracle finding. Foreknowledge
 * that used to require reading source is now first-class, honest, in-game
 * intel. [P2W] invariant: this field is on the PUBLIC unauthenticated
 * endpoint, unconditionally — never gate it behind Pro/subscription tier.
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

    const nowMs = Date.now();
    const activeEvents = getGlobalActiveMarketEvents(nowMs);

    const prices: Record<string, {
      currentPrice: number;
      basePrice: number;
      effectivePrice: number;
      change: number;
      supply: number;
      available: number;
      supplyMultiplier: number;
      eventMultiplier: number;
    }> = {};

    for (const r of resources) {
      const def = RESOURCE_MAP.get(r.slug as any);
      const baselineSupply = def?.startingSupply || 1000;
      const supplyMult = getSupplyPriceMultiplier(r.totalSupply, baselineSupply);
      const eventMult = getMarketEventMultiplier(r.slug, activeEvents, nowMs);
      const effectivePrice = Math.round(r.currentPrice * supplyMult * eventMult);
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
        eventMultiplier: Math.round(eventMult * 100) / 100,
      };
    }

    const forecastEvents = getGlobalMarketEventForecast(nowMs);

    return NextResponse.json({
      prices,
      resources,
      activeMarketEvents: activeEvents,
      // Wave M4 (F8): public, unauthenticated, same for every player.
      forecastMarketEvents: forecastEvents,
    });
  } catch (error) {
    logger.error('Market API error', { error: String(error) });
    return NextResponse.json({ prices: {}, resources: [] });
  }
}
