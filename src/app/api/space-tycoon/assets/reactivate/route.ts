import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { BUILDING_MAP } from '@/lib/game/buildings';
import { REACTIVATION_FEE_FRACTION, REACTIVATION_SPINUP_MONTHS } from '@/lib/game/mothball';
import { isLedgerAvailable } from '@/lib/game/server-ledger';
import {
  InsufficientFundsError,
  AssetStateError,
  badRequest,
  debitMoney,
  findLiveBuildingRow,
  fundsError,
  loadAssetProfile,
  parseInstanceId,
} from '@/lib/game/asset-route-shared';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/assets/reactivate — bring a mothballed building
 * back. Body: { instanceId }. Charges the spin-up fee (mothball.ts
 * REACTIVATION_FEE_FRACTION × baseCost, ledgered building_reactivation_fee,
 * BURNED) and flips mothballed → complete. The client keeps its own
 * one-game-month 'reactivating' spin-up for revenue; the registry counts
 * the building as an asset either way.
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
    if (row.status !== 'mothballed') return badRequest('Building is not mothballed', 'not_mothballed');
    const def = BUILDING_MAP.get(row.definitionId);
    if (!def) return badRequest('Building definition retired', 'unknown_definition');

    const fee = Math.round(def.baseCost * REACTIVATION_FEE_FRACTION);
    if (!Number.isFinite(profile.money) || profile.money < fee) return fundsError(fee, profile.money, `${def.name} spin-up`);

    const ledgerOn = await isLedgerAvailable();
    try {
      await prisma.$transaction(async (tx) => {
        const flipped = await tx.serverAsset.updateMany({
          where: { id: row.id, status: 'mothballed' },
          data: { status: 'complete' },
        });
        if (flipped.count !== 1) throw new AssetStateError('Building is no longer mothballed');
        await debitMoney(tx, profile.id, fee, 'building_reactivation_fee', row.id, ledgerOn);
      });
    } catch (err) {
      if (err instanceof InsufficientFundsError) return fundsError(fee, profile.money, `${def.name} spin-up`);
      if (err instanceof AssetStateError) return NextResponse.json({ error: err.message, code: 'state_conflict' }, { status: err.status });
      throw err;
    }

    logger.info('Asset reactivated', { profileId: profile.id, instanceId, fee });
    return NextResponse.json({ success: true, instanceId, fee, spinUpMonths: REACTIVATION_SPINUP_MONTHS });
  } catch (error) {
    logger.error('Asset reactivate error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
