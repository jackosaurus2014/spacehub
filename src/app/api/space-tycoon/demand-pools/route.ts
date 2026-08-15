import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { buildDemandPoolSnapshot } from '@/lib/game/service-pricing';
import { getCurrentSeasonNumber } from '@/lib/game/seasonal-events';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/demand-pools
 *
 * Wave E4 (docs/ECONOMY_PVP_2026-08.md §E4 visibility): the Market
 * Intelligence demand map. Free intel tier per the canon — pool sizes,
 * saturation, supplier counts, and ANONYMIZED top-3 capacity shares are
 * public; named per-supplier detail stays earned (espionage / paid intel,
 * Wave E6+). When the caller is logged in with a game profile, their own
 * capacity share per market is included.
 */
export async function GET() {
  try {
    const rows = await prisma.locationDemandPool.findMany({
      select: {
        locationId: true, category: true, dNpc: true, dDerived: true,
        cSupply: true, topShares: true, supplierCount: true, updatedAt: true,
      },
      orderBy: [{ locationId: 'asc' }, { category: 'asc' }],
    });

    // Own capacity share when logged in (session optional — the map itself
    // is public intel).
    let ownServices: { definitionId: string; locationId: string }[] = [];
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        const profile = await prisma.gameProfile.findUnique({
          where: { userId: session.user.id },
          select: { activeServicesData: true },
        });
        if (profile && Array.isArray(profile.activeServicesData)) {
          ownServices = (profile.activeServicesData as { definitionId?: string; locationId?: string }[])
            .filter(s => typeof s?.definitionId === 'string' && typeof s?.locationId === 'string')
            .map(s => ({ definitionId: s.definitionId as string, locationId: s.locationId as string }));
        }
      }
    } catch { /* anonymous is fine */ }

    const snapshot = buildDemandPoolSnapshot(
      rows.map(r => ({ ...r, topShares: r.topShares as unknown })),
      ownServices,
      getCurrentSeasonNumber(),
      Date.now(),
    );

    const lastUpdatedAt = rows.reduce<number>((max, r) => Math.max(max, r.updatedAt.getTime()), 0);

    return NextResponse.json({
      pools: Object.values(snapshot.pools),
      asOf: snapshot.asOf,
      lastUpdatedAt: lastUpdatedAt || null,
      loggedIn: ownServices.length > 0,
    });
  } catch (error) {
    logger.error('Demand pool read failed', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
