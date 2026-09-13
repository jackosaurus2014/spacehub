import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireCronSecret } from '@/lib/errors';
import { RESOURCES } from '@/lib/game/resources';
import { getFundamentalPrice } from '@/lib/game/market-engine';
import { logger } from '@/lib/logger';

/**
 * POST /api/space-tycoon/market/init
 * Seeds the MarketResource table from resource definitions.
 * Safe to call multiple times (upserts by slug).
 *
 * Balance Pass 14 (opening scarcity): a NEW row is seeded with the
 * resource's OPENING stock (`startingSupply` — a small fraction of the
 * pricing baseline for anything off-world and unharvested) and with its
 * currentPrice set to the supply-implied fundamental rather than the flat
 * base price, so a fresh world opens hungry: the first corporation to land
 * and mine sells at the top of the band from unit one instead of waiting
 * hours for the mean-revert cron to discover the scarcity. Existing rows are
 * never repriced here — moving a live world is the operator script's job
 * (scripts/tycoon-opening-scarcity.ts).
 * Auth: Bearer CRON_SECRET via requireCronSecret (fail-closed). Note the
 * middleware cronPaths list only exempts these routes from the CSRF check —
 * it does NOT authenticate them; this handler does.
 */
export async function POST(request: NextRequest) {
  const auth = requireCronSecret(request);
  if (auth) return auth;

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
        const openingPrice = getFundamentalPrice(
          r.baseMarketPrice, r.startingSupply, r.baselineSupply, r.minPrice, r.maxPrice,
        );
        await prisma.marketResource.create({
          data: {
            slug: r.id,
            name: r.name,
            category: r.category,
            description: r.description,
            basePrice: r.baseMarketPrice,
            currentPrice: openingPrice,
            volatility: r.volatility,
            minPrice: r.minPrice,
            maxPrice: r.maxPrice,
            totalSupply: r.startingSupply,
            totalDemand: 0,
            priceHistory: [openingPrice],
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
