import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  computeLaborAggregates,
  workforceDataToHeadcount,
  sumCrewQuarters,
  type LaborActivitySummary,
} from '@/lib/game/labor-market';

/**
 * POST /api/space-tycoon/labor/update
 *
 * Economic PvP Wave E5 "Depletion, Labor & Lanes" (docs/ECONOMY_PVP_2026-08.md
 * §2.6/§E5) — the WEEKLY server job that maintains the shared labor market.
 * For every crew type:
 *
 *   wageIndex(type) = clamp(0.8, 1.6, effectiveEmployed(type) / laborSupply(type))
 *
 * employed  — total headcount of that crew type across every profile synced
 *             in the last 7 days (same recency window demand-pools.ts uses),
 *             training-mitigated per profile (a well-trained crew leans less
 *             on the shared labor pool — BALANCE.md's required counterplay).
 * supply    — a base per-type headcount pool that grows with total
 *             crewQuarters built server-wide (housing literally grows the
 *             labor force — §2.6 "a cooperative-competitive infrastructure
 *             play").
 *
 * Deliberately a WEEKLY cadence (SESSION_DESIGN.md: "wage index... = weekly
 * loop", not the oversubscribed daily loop) — registered as
 * 'tycoon-labor-market' in src/lib/cron-scheduler.ts. Protected by
 * CRON_SECRET (matches sibling demand-pools/update route).
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
    const now = Date.now();
    const profiles = await prisma.gameProfile.findMany({
      where: { lastSyncAt: { gt: new Date(now - 7 * 24 * 3600_000) } },
      select: { id: true, workforceData: true, buildingsData: true },
      take: 2000,
    });

    const summaries: LaborActivitySummary[] = profiles.map(p => {
      const wf = (p.workforceData || {}) as Record<string, unknown>;
      const buildings = Array.isArray(p.buildingsData)
        ? (p.buildingsData as { definitionId?: string; isComplete?: boolean }[])
            .filter(b => typeof b?.definitionId === 'string')
            .map(b => ({ definitionId: b.definitionId as string, isComplete: b.isComplete !== false }))
        : [];
      return {
        id: p.id,
        headcount: workforceDataToHeadcount(wf),
        trainingLevel: typeof wf.trainingLevel === 'number' ? wf.trainingLevel : 0.5,
        crewQuarters: sumCrewQuarters(buildings),
      };
    });

    const aggregates = computeLaborAggregates(summaries);

    let upserted = 0;
    for (const agg of Array.from(aggregates.values())) {
      await prisma.laborIndex.upsert({
        where: { crewType: agg.type },
        create: {
          crewType: agg.type,
          wageIndex: agg.index,
          employedRaw: agg.employedRaw,
          supply: agg.supply,
        },
        update: {
          wageIndex: agg.index,
          employedRaw: agg.employedRaw,
          supply: agg.supply,
        },
      });
      upserted++;
    }

    return NextResponse.json({
      success: true,
      crewTypes: upserted,
      profilesAggregated: summaries.length,
    });
  } catch (error) {
    logger.error('Labor market update failed', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
