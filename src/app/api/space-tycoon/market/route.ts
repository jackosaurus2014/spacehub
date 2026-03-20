import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/space-tycoon/market
 * Returns current market prices for all resources.
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

    const prices: Record<string, { currentPrice: number; basePrice: number; change: number }> = {};
    for (const r of resources) {
      const change = Math.round(((r.currentPrice / r.basePrice) - 1) * 100);
      prices[r.slug] = {
        currentPrice: r.currentPrice,
        basePrice: r.basePrice,
        change,
      };
    }

    return NextResponse.json({ prices, resources });
  } catch (error) {
    logger.error('Market API error', { error: String(error) });
    // Return empty prices — client will fall back to base prices
    return NextResponse.json({ prices: {}, resources: [] });
  }
}
