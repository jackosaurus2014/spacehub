import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { RESOURCES } from '@/lib/game/resources';
import { logger } from '@/lib/logger';

/**
 * POST /api/space-tycoon/market/init
 * Seeds the MarketResource table from resource definitions.
 * Safe to call multiple times (upserts by slug).
 */
export async function POST() {
  try {
    let created = 0;
    let updated = 0;

    for (const r of RESOURCES) {
      const existing = await prisma.marketResource.findUnique({ where: { slug: r.id } });
      if (existing) {
        // Update base values but keep current price
        await prisma.marketResource.update({
          where: { slug: r.id },
          data: {
            name: r.name,
            category: r.category,
            basePrice: r.baseMarketPrice,
            volatility: r.volatility,
            minPrice: r.minPrice,
            maxPrice: r.maxPrice,
            description: r.description,
          },
        });
        updated++;
      } else {
        await prisma.marketResource.create({
          data: {
            slug: r.id,
            name: r.name,
            category: r.category,
            description: r.description,
            basePrice: r.baseMarketPrice,
            currentPrice: r.baseMarketPrice,
            volatility: r.volatility,
            minPrice: r.minPrice,
            maxPrice: r.maxPrice,
            totalSupply: 0,
            totalDemand: 0,
            priceHistory: [r.baseMarketPrice],
          },
        });
        created++;
      }
    }

    logger.info('Market resources initialized', { created, updated });
    return NextResponse.json({ success: true, created, updated, total: RESOURCES.length });
  } catch (error) {
    logger.error('Market init failed', { error: String(error) });
    return NextResponse.json({ error: 'Failed to initialize market' }, { status: 500 });
  }
}
