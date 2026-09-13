import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { tierFromProfileScalars } from '@/lib/game/corporation-tiers';
import {
  ASSET_KIND_BUILDING, ASSET_KIND_RESEARCH, ASSET_KIND_SHIP, LIVE_SHIP_STATUSES,
  loadServerRegistry, rowsOfKind,
} from '@/lib/game/server-assets';
import { loadAssetProfile } from '@/lib/game/asset-route-shared';
import { HQ_STAGES, HQ_UPKEEP_MONTHLY, getHqBonuses, hqSeatIsAuctioned, hqStageForLocationId } from '@/lib/game/headquarters';
import { evaluateHqRequirementsFrom, quoteHqRelocation, type HqRequirementView } from '@/lib/game/hq-relocation';
import {
  completeDueHqRelocations, loadHeadquartersBlock, loadHqAuctionSummaries, loadHqSeatPools, loadHqUpkeepView,
} from '@/lib/game/hq-relocation-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/hq — the relocation ladder for the signed-in
 * corporation (CC-2): the server's headquarters block (seat + the OWNER's
 * pending project), and per stage the requirement check from persisted
 * facts, the live seat pool (total / occupied / posted price), the quote
 * from the current seat, upkeep and the bonus profile. The Relocate
 * console renders this; the client-state ladder (hq-relocation.ts
 * buildHqLadder) is the offline fallback.
 *
 * CC-3 adds: the research / hull gates the outer rungs carry (read from the
 * ServerAsset registry, never the client's claim), whether a stage's seats
 * are auctioned, the open seat auctions with the minimum qualifying bid,
 * and the seated stage's UPKEEP state (paid-through, missed months, grace
 * remaining) now that rent is charged server-side.
 */
export async function GET() {
  try {
    const loaded = await loadAssetProfile('hq');
    if (loaded.response) return loaded.response;
    const profile = loaded.profile;

    await completeDueHqRelocations(prisma, profile.id);
    const now = new Date();
    const fresh = await prisma.gameProfile.findUnique({ where: { id: profile.id }, select: { hqLocationId: true, createdAt: true } });
    const from = hqStageForLocationId(fresh?.hqLocationId);

    let buildings: HqRequirementView['buildings'] = [];
    let research: string[] = Array.isArray(profile.completedResearchList) ? [...profile.completedResearchList] : [];
    let ships: string[] = [];
    try {
      const registry = await loadServerRegistry(profile.id, profile, { mode: 'shadow' });
      buildings = rowsOfKind(registry.rows, ASSET_KIND_BUILDING).map(r => ({ definitionId: r.definitionId, locationId: r.locationId || '', isComplete: r.status === 'complete' }));
      research = rowsOfKind(registry.rows, ASSET_KIND_RESEARCH).filter(r => r.status === 'complete').map(r => r.definitionId);
      ships = rowsOfKind(registry.rows, ASSET_KIND_SHIP).filter(r => LIVE_SHIP_STATUSES.includes(r.status)).map(r => r.definitionId);
    } catch (err) {
      logger.warn('HQ ladder: registry unavailable, requirements from persisted columns only', { error: String(err) });
      const raw = Array.isArray(profile.buildingsData) ? profile.buildingsData as Array<Record<string, unknown>> : [];
      buildings = raw.filter(b => b && typeof b.definitionId === 'string').map(b => ({ definitionId: String(b.definitionId), locationId: String(b.locationId || ''), isComplete: !!b.isComplete }));
      const rawShips = Array.isArray(profile.shipsData) ? profile.shipsData as Array<Record<string, unknown>> : [];
      ships = rawShips.filter(s => s && typeof s.definitionId === 'string').map(s => String(s.definitionId));
    }
    const view: HqRequirementView = {
      tier: tierFromProfileScalars({
        totalEarned: profile.totalEarned, buildingCount: profile.buildingCount, researchCount: profile.researchCount,
        locationsUnlocked: profile.locationsUnlocked, serviceCount: profile.serviceCount,
      }),
      buildings,
      research,
      ships,
    };

    const [headquarters, pools, auctions, upkeep] = await Promise.all([
      loadHeadquartersBlock({ id: profile.id, hqLocationId: fresh?.hqLocationId, createdAt: fresh?.createdAt ?? profile.createdAt }, prisma, now),
      loadHqSeatPools(prisma),
      loadHqAuctionSummaries(profile.id, prisma),
      loadHqUpkeepView({ id: profile.id, hqLocationId: fresh?.hqLocationId }, prisma, now),
    ]);

    const ladder = HQ_STAGES.map(stage => ({
      id: stage.id,
      label: stage.label,
      shortLabel: stage.shortLabel,
      tier: stage.tier,
      comingSoon: !!stage.comingSoon,
      current: stage.id === from.id,
      check: evaluateHqRequirementsFrom(view, stage.id),
      quote: stage.id === from.id ? null : quoteHqRelocation(from.id, stage.id),
      seats: pools[stage.id],
      auctioned: hqSeatIsAuctioned(stage.id),
      auctions: auctions.filter(a => a.stage === stage.id),
      upkeepMonthly: HQ_UPKEEP_MONTHLY[stage.id],
      bonuses: getHqBonuses(stage.id),
    }));

    return NextResponse.json({ success: true, headquarters, ladder, upkeep, money: profile.money, fetchedAt: now.toISOString() });
  } catch (error) {
    logger.error('HQ ladder error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
