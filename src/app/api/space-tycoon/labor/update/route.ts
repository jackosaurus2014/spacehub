import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
// Phase 3 slice 1: buildings come from the ServerAsset registry (server-assets.ts).
import { loadServerBuildingsForProfiles } from '@/lib/game/server-assets';
import {
  computeLaborAggregates,
  workforceDataToHeadcount,
  sumCrewQuarters,
  requiredHeadcountFor,
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
 * 'tycoon-labor-market' in src/lib/cron-scheduler.ts.
 * Auth: Bearer CRON_SECRET via requireCronSecret (fail-closed). Note the
 * middleware cronPaths list only exempts these routes from the CSRF check —
 * it does NOT authenticate them; this handler does.
 */
export async function POST(request: Request) {
  const auth = requireCronSecret(request);
  if (auth) return auth;

  try {
    const now = Date.now();
    const profiles = await prisma.gameProfile.findMany({
      where: { lastSyncAt: { gt: new Date(now - 7 * 24 * 3600_000) } },
      select: { id: true, workforceData: true, buildingsData: true, shipsData: true },
      take: 2000,
    });

    // Phase 3 slice 1 (docs/SECURITY_AUDIT_2026-09.md): one batched registry
    // read; union in shadow, server rows only in enforce.
    const registryBuildings = await loadServerBuildingsForProfiles(profiles.map(p => ({ id: p.id, buildingsData: p.buildingsData, workforceData: p.workforceData })));
    const summaries: LaborActivitySummary[] = profiles.map(p => {
      const wf = (p.workforceData || {}) as Record<string, unknown>;
      const buildings = ((registryBuildings.get(p.id)?.buildings ?? []) as { definitionId?: string; isComplete?: boolean }[])
        .filter(b => typeof b?.definitionId === 'string')
        .map(b => ({ definitionId: b.definitionId as string, isComplete: b.isComplete !== false }));
      // Row 6 (docs/GAME_DESIGN_REVIEW_2026-09.md §2 row 6): labor DEMAND is
      // what a fleet requires, not just who happens to be hired — otherwise
      // the wage index cannot respond to fleet growth (BALANCE.md H2).
      const ships = (Array.isArray(p.shipsData) ? p.shipsData : [])
        .filter((sh): sh is { definitionId: string; isBuilt?: boolean } =>
          !!sh && typeof sh === 'object' && typeof (sh as { definitionId?: unknown }).definitionId === 'string')
        .map(sh => ({ definitionId: sh.definitionId, isBuilt: sh.isBuilt !== false }));
      return {
        id: p.id,
        headcount: workforceDataToHeadcount(wf),
        trainingLevel: typeof wf.trainingLevel === 'number' ? wf.trainingLevel : 0.5,
        crewQuarters: sumCrewQuarters(buildings),
        requiredHeadcount: requiredHeadcountFor(buildings, ships),
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
          // Row 6: the LaborIndex row reports the demand the index was priced
          // from (max of hired and required) so the UI's "N employed" figure
          // matches the wage players are charged.
          employedRaw: Math.round(Math.max(agg.employedRaw, agg.requiredRaw)),
          supply: agg.supply,
        },
        update: {
          wageIndex: agg.index,
          employedRaw: Math.round(Math.max(agg.employedRaw, agg.requiredRaw)),
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
