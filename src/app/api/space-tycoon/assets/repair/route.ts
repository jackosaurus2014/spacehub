import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { BUILDING_MAP } from '@/lib/game/buildings';
import { calculateRushRepairCost } from '@/lib/game/hazards';
import { isLedgerAvailable } from '@/lib/game/server-ledger';
import {
  InsufficientFundsError,
  badRequest,
  debitMoney,
  findLiveBuildingRow,
  fundsError,
  loadAssetProfile,
  parseInstanceId,
} from '@/lib/game/asset-route-shared';

export const dynamic = 'force-dynamic';

/** Hazard damage is capped at 0.85 client-side (hazards.ts); the fee can
 *  never be priced above that. */
const MAX_REPAIR_DAMAGE_PCT = 0.85;

/**
 * POST /api/space-tycoon/assets/repair — pay the rush-repair fee.
 * Body: { instanceId, damagePct }. damagePct stays CLIENT-OWNED (hazard
 * damage is client-simulated); this route only prices and charges the fee
 * (hazards.ts calculateRushRepairCost, ledgered building_rush_repair,
 * BURNED) for a live registry building. The client clears damagePct on the
 * 2xx.
 */
export async function POST(request: NextRequest) {
  try {
    const loaded = await loadAssetProfile();
    if (loaded.response) return loaded.response;
    const profile = loaded.profile;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const instanceId = parseInstanceId(body?.instanceId);
    if (!instanceId) return badRequest('instanceId is required', 'invalid_instance_id');
    const rawDamage = typeof body?.damagePct === 'number' && Number.isFinite(body.damagePct) ? body.damagePct : 0;
    const damagePct = Math.max(0, Math.min(MAX_REPAIR_DAMAGE_PCT, rawDamage));
    if (damagePct <= 0) return badRequest('Nothing to repair', 'no_damage');

    const row = await findLiveBuildingRow(profile.id, instanceId);
    if (!row) return NextResponse.json({ error: 'No such building in the registry', code: 'not_found' }, { status: 404 });
    const def = BUILDING_MAP.get(row.definitionId);
    if (!def) return badRequest('Building definition retired', 'unknown_definition');

    const cost = calculateRushRepairCost(damagePct, def.baseCost);
    if (cost <= 0) return badRequest('Nothing to repair', 'no_damage');
    if (!Number.isFinite(profile.money) || profile.money < cost) return fundsError(cost, profile.money, `${def.name} rush repair`);

    const ledgerOn = await isLedgerAvailable();
    try {
      await prisma.$transaction(async (tx) => {
        await debitMoney(tx, profile.id, cost, 'building_rush_repair', row.id, ledgerOn);
      });
    } catch (err) {
      if (err instanceof InsufficientFundsError) return fundsError(cost, profile.money, `${def.name} rush repair`);
      throw err;
    }

    logger.info('Asset rush repair paid', { profileId: profile.id, instanceId, damagePct, cost });
    return NextResponse.json({ success: true, instanceId, cost, damagePct });
  } catch (error) {
    logger.error('Asset repair error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
