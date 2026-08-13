import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { calculateIdleDecay } from '@/lib/game/market-engine';

/**
 * POST /api/space-tycoon/market/mean-revert
 *
 * Audit Wave E (Change #5 / A5-ii): "there is no idle mean-reversion —
 * calculateIdleDecay has zero callers and no cron touches currentPrice.
 * A dumped price stays dumped forever." (audit §5)
 *
 * Hourly cron (cron-scheduler 'tycoon-market-mean-revert', offset :30 so it
 * interleaves with the :00 restock) that drifts every resource's
 * currentPrice back toward basePrice via calculateIdleDecay. Each call
 * moves the price ≤10% of the remaining gap → reversion half-life of ~6.6
 * real hours ≈ one game-month: crashes and squeezes stay tradeable for a
 * session, then the market heals ("prices should feel alive on an empty
 * server" — CLAUDE.md NPC backdrop).
 *
 * Recent-trade protection: rows updated in the last 5 minutes (trades touch
 * updatedAt) are skipped by calculateIdleDecay's own guard, so active price
 * discovery is not fought by the cron. No schema change: idle minutes are
 * approximated from updatedAt (restock also touches it hourly at :00, which
 * caps a single reversion step at ~30 idle minutes — still within the
 * intended ≤10% per call).
 *
 * Protected by CRON_SECRET (matches sibling restock route).
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const resources = await prisma.marketResource.findMany();
    let reverted = 0;

    for (const resource of resources) {
      if (resource.currentPrice === resource.basePrice) continue;

      const minutesSinceUpdate = (Date.now() - resource.updatedAt.getTime()) / 60_000;
      // Cap at 60 idle minutes per call — one hour of decay maximum.
      const idleMinutes = Math.min(60, Math.max(0, minutesSinceUpdate));

      const newPrice = calculateIdleDecay(
        resource.currentPrice,
        resource.basePrice,
        idleMinutes,
        resource.minPrice,
        resource.maxPrice,
      );

      if (newPrice !== resource.currentPrice) {
        await prisma.marketResource.update({
          where: { id: resource.id },
          data: { currentPrice: newPrice },
        });
        reverted++;
      }
    }

    return NextResponse.json({
      success: true,
      reverted,
      resourceCount: resources.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Mean reversion failed', details: String(error) },
      { status: 500 },
    );
  }
}
