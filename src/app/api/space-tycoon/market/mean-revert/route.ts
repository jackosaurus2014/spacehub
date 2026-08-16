import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { calculateIdleDecay } from '@/lib/game/market-engine';
import { getCurrentSeasonNumber } from '@/lib/game/seasonal-events';
import { getSeasonalMeanRevertTarget } from '@/lib/game/economic-seasons';

/**
 * POST /api/space-tycoon/market/mean-revert
 *
 * Audit Wave E (Change #5 / A5-ii): "there is no idle mean-reversion —
 * calculateIdleDecay has zero callers and no cron touches currentPrice.
 * A dumped price stays dumped forever." (audit §5)
 *
 * Hourly cron (cron-scheduler 'tycoon-market-mean-revert', offset :30 so it
 * interleaves with the :00 restock) that drifts every resource's
 * currentPrice back toward a target via calculateIdleDecay. Each call
 * moves the price ≤10% of the remaining gap → reversion half-life of ~6.6
 * real hours ≈ one game-month: crashes and squeezes stay tradeable for a
 * session, then the market heals ("prices should feel alive on an empty
 * server" — CLAUDE.md NPC backdrop).
 *
 * Live-Service Wave LS7 (docs/LIVE_SERVICE_2026-08.md §LS7): the target is
 * no longer always raw basePrice. economic-seasons.ts's
 * getSeasonalMeanRevertTarget() shifts it by the CURRENT season's announced
 * commodity super-cycle bias (bounded ±25%, world-shared, deterministic
 * from the season number alone) — so idle prices heal toward THIS season's
 * economic reality, not last season's. This is the "existing
 * demand/mean-reversion machinery" hook the spec calls for: no new pricing
 * path, just a season-aware target for the one that already existed.
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
    const seasonNumber = getCurrentSeasonNumber();
    let reverted = 0;

    // Wave M5 (docs/MEANINGFUL_2026-08.md §3.2 O2 "price campaigns"): a
    // resource under an ACTIVE declared price campaign does not mean-revert
    // — the crash the campaigner engineered with real sell volume sticks
    // until the 7-day campaign clock runs out (then healing resumes, which
    // is exactly what makes sustaining a crash expensive). Best-effort: a
    // missing PriceCampaign table (schema lag) skips nothing.
    let campaignSlugs = new Set<string>();
    try {
      const { activeCampaignSlugs } = await import('@/lib/game/price-campaigns');
      const rows = await prisma.priceCampaign.findMany({
        where: { status: 'active', endsAt: { gt: new Date() } },
        select: { resourceSlug: true, status: true, endsAt: true },
      });
      campaignSlugs = activeCampaignSlugs(
        rows.map(r => ({ resourceSlug: r.resourceSlug, status: r.status, endsAtMs: r.endsAt.getTime() })),
      );
    } catch { /* campaigns non-critical */ }

    for (const resource of resources) {
      if (campaignSlugs.has(resource.slug)) continue;
      const seasonalTarget = getSeasonalMeanRevertTarget(
        resource.basePrice,
        resource.slug,
        resource.category,
        seasonNumber,
      );

      if (resource.currentPrice === seasonalTarget) continue;

      const minutesSinceUpdate = (Date.now() - resource.updatedAt.getTime()) / 60_000;
      // Cap at 60 idle minutes per call — one hour of decay maximum.
      const idleMinutes = Math.min(60, Math.max(0, minutesSinceUpdate));

      const newPrice = calculateIdleDecay(
        resource.currentPrice,
        seasonalTarget,
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
      seasonNumber,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Mean reversion failed', details: String(error) },
      { status: 500 },
    );
  }
}
