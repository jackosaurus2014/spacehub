import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { tierFromProfileScalars } from '@/lib/game/corporation-tiers';
import { ASSET_KIND_BUILDING, loadServerRegistry, rowsOfKind } from '@/lib/game/server-assets';
import { loadAssetProfile } from '@/lib/game/asset-route-shared';
import { HQ_STAGES, HQ_UPKEEP_MONTHLY, getHqBonuses, hqStageForLocationId } from '@/lib/game/headquarters';
import { evaluateHqRequirementsFrom, quoteHqRelocation, type HqRequirementView } from '@/lib/game/hq-relocation';
import { completeDueHqRelocations, loadHeadquartersBlock, loadHqSeatPools } from '@/lib/game/hq-relocation-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/hq — the relocation ladder for the signed-in
 * corporation (CC-2): the server's headquarters block (seat + the OWNER's
 * pending project), and per stage the requirement check from persisted
 * facts, the live seat pool (total / occupied / posted price), the quote
 * from the current seat, upkeep and the bonus profile. The Relocate
 * console renders this; the client-state ladder (hq-relocation.ts
 * buildHqLadder) is the offline fallback.
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
    try {
      const registry = await loadServerRegistry(profile.id, profile, { mode: 'shadow' });
      buildings = rowsOfKind(registry.rows, ASSET_KIND_BUILDING).map(r => ({ definitionId: r.definitionId, locationId: r.locationId || '', isComplete: r.status === 'complete' }));
    } catch (err) {
      logger.warn('HQ ladder: registry unavailable, requirements from persisted buildingsData only', { error: String(err) });
      const raw = Array.isArray(profile.buildingsData) ? profile.buildingsData as Array<Record<string, unknown>> : [];
      buildings = raw.filter(b => b && typeof b.definitionId === 'string').map(b => ({ definitionId: String(b.definitionId), locationId: String(b.locationId || ''), isComplete: !!b.isComplete }));
    }
    const view: HqRequirementView = {
      tier: tierFromProfileScalars({
        totalEarned: profile.totalEarned, buildingCount: profile.buildingCount, researchCount: profile.researchCount,
        locationsUnlocked: profile.locationsUnlocked, serviceCount: profile.serviceCount,
      }),
      buildings,
    };

    const [headquarters, pools] = await Promise.all([
      loadHeadquartersBlock({ id: profile.id, hqLocationId: fresh?.hqLocationId, createdAt: fresh?.createdAt ?? profile.createdAt }, prisma, now),
      loadHqSeatPools(prisma),
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
      upkeepMonthly: HQ_UPKEEP_MONTHLY[stage.id],
      bonuses: getHqBonuses(stage.id),
    }));

    return NextResponse.json({ success: true, headquarters, ladder, money: profile.money, fetchedAt: now.toISOString() });
  } catch (error) {
    logger.error('HQ ladder error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
