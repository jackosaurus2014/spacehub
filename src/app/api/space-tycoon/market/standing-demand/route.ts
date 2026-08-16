import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  aggregateStandingDemand, detectCorneringAlerts,
  STANDING_DEMAND_REPORT_FEE, MARKET_MICROSTRUCTURE_TECH_ID, CORNERING_WINDOW_DAYS,
  type OpenBuyOrderLite,
} from '@/lib/game/cornering-intel';
import { recordLedger, isLedgerAvailable } from '@/lib/game/server-ledger';

export const dynamic = 'force-dynamic';

/**
 * Standing-order demand report (Wave M5, docs/MEANINGFUL_2026-08.md §3.2
 * O3): aggregate rival buy-order demand per resource — the offensive read
 * that lets a corner be AIMED at what rivals' buildings actually need.
 * Gated behind the `market_microstructure` research + a burned per-report
 * fee ("never free"); aggregates only, no per-corp attribution ("never
 * perfect" — that's espionage's job). POST-only: pulling a report is a
 * priced action, not a free page load.
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const profile = await prisma.gameProfile.findUnique({ where: { userId: session.user.id } });
    if (!profile) return NextResponse.json({ error: 'No game profile' }, { status: 404 });

    if (!profile.completedResearchList.includes(MARKET_MICROSTRUCTURE_TECH_ID)) {
      return NextResponse.json({
        error: 'Requires the Market Microstructure Analysis research.',
      }, { status: 400 });
    }
    if (profile.money < STANDING_DEMAND_REPORT_FEE) {
      return NextResponse.json({
        error: `Report fee: $${(STANDING_DEMAND_REPORT_FEE / 1_000_000).toFixed(0)}M (burned).`,
      }, { status: 400 });
    }

    const ledgerOn = await isLedgerAvailable();
    await prisma.$transaction(async (tx) => {
      await tx.gameProfile.update({
        where: { id: profile.id },
        data: { money: { decrement: STANDING_DEMAND_REPORT_FEE }, totalSpent: { increment: STANDING_DEMAND_REPORT_FEE } },
      });
      if (ledgerOn) {
        await recordLedger(tx, {
          profileId: profile.id, moneyDelta: -STANDING_DEMAND_REPORT_FEE,
          reason: 'standing_demand_report_fee', refId: profile.id,
        });
      }
    });

    const openBuys = await prisma.marketLimitOrder.findMany({
      where: { side: 'buy', status: { in: ['open', 'partial'] } },
      select: { profileId: true, resourceSlug: true, quantity: true, filledQty: true, pricePerUnit: true, source: true },
      take: 2000,
    });
    const since = new Date(Date.now() - CORNERING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const fills = await prisma.marketFill.groupBy({
      by: ['resourceSlug'],
      where: { createdAt: { gte: since } },
      _sum: { quantity: true },
    });
    const volumeBySlug: Record<string, number> = {};
    for (const f of fills) volumeBySlug[f.resourceSlug] = f._sum.quantity || 0;

    return NextResponse.json({
      success: true,
      feePaid: STANDING_DEMAND_REPORT_FEE,
      asOf: new Date().toISOString(),
      // Rival demand only — the requester's own orders are excluded.
      demand: aggregateStandingDemand(openBuys as OpenBuyOrderLite[], profile.id),
      // The same anonymous squeeze detection victims get for free — the
      // paid report shows the attacker their own footprint too.
      corneringAlerts: detectCorneringAlerts(openBuys as OpenBuyOrderLite[], volumeBySlug),
    });
  } catch (error) {
    logger.error('Standing-demand report error', { error: String(error) });
    return NextResponse.json({ error: 'Report failed' }, { status: 500 });
  }
}
