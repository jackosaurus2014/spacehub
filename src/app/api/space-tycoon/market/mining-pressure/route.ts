import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { calculatePriceAfterMining } from '@/lib/game/market-engine';

// Wave E1 (docs/ECONOMY_PVP_2026-08.md §E1, exploit #2): this route moves the
// SHARED market currentPrice/totalSupply for every player and was completely
// unauthenticated — anyone could curl it to crash or inflate any commodity.
// Same class of hole market/trade was already hardened against (session +
// per-call quantity cap). This route also had no caller anywhere in the
// client (GAME_SYSTEMS_AUDIT_2026-08.md §5), so there is zero legitimate
// traffic to preserve — auth + a bounded per-resource-per-call cap closes it.
const MAX_QTY_PER_RESOURCE_PER_CALL = 2_000;
const MAX_RESOURCES_PER_CALL = 50;

/**
 * POST /api/space-tycoon/market/mining-pressure
 * Called when a player's mining operations produce resources.
 * Applies gentle downward pressure on prices (supply increases).
 *
 * Body: { resources: Record<string, number> } — e.g. { iron: 200, titanium: 30 }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionProfile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!sessionProfile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }

    const body = await request.json();
    const { resources } = body;

    if (!resources || typeof resources !== 'object') {
      return NextResponse.json({ error: 'Missing resources object' }, { status: 400 });
    }

    const entries = Object.entries(resources).slice(0, MAX_RESOURCES_PER_CALL);
    const updates: { slug: string; oldPrice: number; newPrice: number }[] = [];

    for (const [slug, rawQty] of entries) {
      if (typeof rawQty !== 'number' || !Number.isFinite(rawQty) || rawQty <= 0) continue;
      // Bound the per-call price impact (defense-in-depth, same rationale as
      // market/trade's 100,000 sanity cap): a single authed request cannot
      // dump an absurd volume onto the shared price.
      const qty = Math.min(MAX_QTY_PER_RESOURCE_PER_CALL, Math.floor(rawQty));

      const resource = await prisma.marketResource.findUnique({
        where: { slug },
      });
      if (!resource) continue;

      const newPrice = calculatePriceAfterMining(
        resource.currentPrice,
        resource.basePrice,
        qty,
        resource.volatility,
        resource.minPrice,
        resource.maxPrice,
      );

      if (newPrice !== resource.currentPrice) {
        await prisma.marketResource.update({
          where: { id: resource.id },
          data: {
            currentPrice: newPrice,
            totalSupply: resource.totalSupply + qty,
          },
        });

        updates.push({ slug, oldPrice: resource.currentPrice, newPrice });
      }
    }

    logger.info('Mining pressure applied', {
      profileId: sessionProfile.id,
      resourceCount: updates.length,
    });

    return NextResponse.json({ success: true, updates });
  } catch (error) {
    logger.error('Mining pressure update error', { error: String(error) });
    return NextResponse.json({ error: 'Mining pressure update failed' }, { status: 500 });
  }
}
