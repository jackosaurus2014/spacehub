import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { BUILDING_MAP } from '@/lib/game/buildings';
import { DECOMMISSION_TEARDOWN_MIN_TIER, DECOMMISSION_TEARDOWN_MONTHS, computeDecommissionRecovery } from '@/lib/game/mothball';
import { isLedgerAvailable } from '@/lib/game/server-ledger';
import {
  AssetStateError,
  badRequest,
  creditMoney,
  findLiveBuildingRow,
  ledgerResources,
  loadAssetProfile,
  parseInstanceId,
} from '@/lib/game/asset-route-shared';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/assets/sell — decommission (scrap) a building.
 * Body: { instanceId }. The row flips complete|mothballed → 'sold'
 * (terminal, status-guarded) and the below-book recovery from mothball.ts
 * computeDecommissionRecovery (40 % of the UN-scaled baseCost, 50 % of the
 * resourceCost) is credited through the ledger
 * (building_decommission_recovery, money + resource rows). The client keeps
 * its own T3+ one-game-month teardown for display; server truth stops
 * counting the building immediately (a decommissioning structure is
 * non-operational either way).
 */
export async function POST(request: NextRequest) {
  try {
    const loaded = await loadAssetProfile();
    if (loaded.response) return loaded.response;
    const profile = loaded.profile;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const instanceId = parseInstanceId(body?.instanceId);
    if (!instanceId) return badRequest('instanceId is required', 'invalid_instance_id');

    const row = await findLiveBuildingRow(profile.id, instanceId);
    if (!row) return NextResponse.json({ error: 'No such building in the registry', code: 'not_found' }, { status: 404 });
    if (row.status === 'pending') return badRequest('Construction must finish before decommissioning', 'not_complete');
    const def = BUILDING_MAP.get(row.definitionId);
    if (!def) return badRequest('Building definition retired', 'unknown_definition');

    const recovery = computeDecommissionRecovery(def);
    const ledgerOn = await isLedgerAvailable();
    try {
      await prisma.$transaction(async (tx) => {
        const flipped = await tx.serverAsset.updateMany({
          where: { id: row.id, status: { in: ['complete', 'mothballed'] } },
          data: { status: 'sold' },
        });
        if (flipped.count !== 1) throw new AssetStateError('Building already sold');
        await creditMoney(tx, profile.id, recovery.money, 'building_decommission_recovery', row.id, ledgerOn);
        await ledgerResources(tx, profile.id, recovery.resources, 'building_decommission_recovery', row.id, ledgerOn);
      });
    } catch (err) {
      if (err instanceof AssetStateError) return NextResponse.json({ error: err.message, code: 'state_conflict' }, { status: err.status });
      throw err;
    }

    const teardownMonths = def.tier >= DECOMMISSION_TEARDOWN_MIN_TIER ? DECOMMISSION_TEARDOWN_MONTHS : 0;
    logger.info('Asset decommissioned', { profileId: profile.id, instanceId, recovery: recovery.money, teardownMonths });
    return NextResponse.json({ success: true, instanceId, recovery, teardownMonths });
  } catch (error) {
    logger.error('Asset sell error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
