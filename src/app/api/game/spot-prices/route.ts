import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { buildMarketSnapshot } from '@/lib/game/spot-price';
import { RESOURCE_MAP } from '@/lib/game/resources';
import { MANUFACTURED_RESOURCE_IDS } from '@/lib/game/economic-sinks';

// Public, unauthenticated: live commodity spot prices from the shared game
// market (SYNTHESIS.md graft A4 / item 32). Proof the economy is running
// before anyone registers. Cached a minute at the edge.
export const dynamic = 'force-dynamic';

const FEATURED = ['iron', 'aluminum', 'titanium', 'lunar_water', 'helium3', 'platinum_group', 'methane', 'rare_earth'];

export async function GET() {
  try {
    const rows = await prisma.marketResource.findMany({
      where: { slug: { in: FEATURED } },
      select: { slug: true, currentPrice: true, basePrice: true, minPrice: true, maxPrice: true, priceHistory: true },
    });
    const snapshot = buildMarketSnapshot(rows.map((r) => ({ slug: r.slug, currentPrice: r.currentPrice, basePrice: r.basePrice, minPrice: r.minPrice, maxPrice: r.maxPrice })));
    const prices = FEATURED.map((slug) => {
      const def = RESOURCE_MAP.get(slug as never);
      const row = rows.find((r) => r.slug === slug);
      const spot = snapshot.prices[slug] ?? row?.currentPrice ?? def?.baseMarketPrice ?? 0;
      const hist = Array.isArray(row?.priceHistory) ? (row!.priceHistory as number[]) : [];
      const prev = hist.length >= 2 ? hist[hist.length - 2] : null;
      return { slug, name: def?.name ?? slug, icon: def?.icon ?? '', spot: Math.round(spot), base: def?.baseMarketPrice ?? row?.basePrice ?? 0, changePct: prev && prev > 0 ? Math.round(((spot - prev) / prev) * 1000) / 10 : null, manufactured: MANUFACTURED_RESOURCE_IDS.includes(slug) };
    });
    // How many manufactured goods are actually listed right now — the "someone built it" count.
    const listed = await prisma.marketLimitOrder.aggregate({ where: { side: 'sell', status: { in: ['open', 'partial'] }, resourceSlug: { in: MANUFACTURED_RESOURCE_IDS } }, _sum: { quantity: true, filledQty: true } });
    const hardwareListed = (listed._sum.quantity || 0) - (listed._sum.filledQty || 0);
    return NextResponse.json({ prices, hardwareListed, asOf: new Date(snapshot.asOf).toISOString() }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch (error) {
    logger.warn('game spot-prices: failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ prices: [], hardwareListed: null, asOf: null }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
}
