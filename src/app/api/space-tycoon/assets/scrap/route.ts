import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { SHIP_MAP } from '@/lib/game/ships';
import { isLedgerAvailable } from '@/lib/game/server-ledger';
import {
  ASSET_KIND_SHIP,
  SHIP_SCRAP_RECOVERY_FRACTION,
  auditAsset,
  getAssetLedgerMode,
} from '@/lib/game/server-assets';
import {
  AssetStateError,
  badRequest,
  creditMoney,
  findLiveRow,
  loadAssetProfile,
  parseInstanceId,
} from '@/lib/game/asset-route-shared';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/assets/scrap — scrap a ship. Body: { instanceId }.
 *
 * docs/SECURITY_AUDIT_2026-09.md "Phase 3 slices 2-5" (slice 3). The row
 * flips complete → 'scrapped' (terminal, status-guarded) and 30 % of the
 * hull's baseCost (page.tsx handleScrapShip) is credited through the
 * ledger (ship_scrap_recovery).
 *
 * The idle rule — a ship can only be scrapped while idle — is a CLIENT-
 * OWNED condition (status is never written server-side). The route reads
 * the PERSISTED shipsData entry: a persisted status other than idle is
 * refused in every mode. Shadow: a ship with no registry row (a fleet not
 * yet adopted, or a ship this client never ordered through the route) is
 * accepted WITHOUT a credit (`ledgered: false`) — the client applies its
 * local salvage as before. Enforce: the row is required (404 otherwise) and
 * a missing persisted entry is audited (`ship_scrap_status_unverified`)
 * before the credit.
 */
export async function POST(request: NextRequest) {
  try {
    const loaded = await loadAssetProfile();
    if (loaded.response) return loaded.response;
    const profile = loaded.profile;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const instanceId = parseInstanceId(body?.instanceId);
    if (!instanceId) return badRequest('instanceId is required', 'invalid_instance_id');

    const mode = getAssetLedgerMode();
    const persisted = (Array.isArray(profile.shipsData) ? (profile.shipsData as Array<{ instanceId?: string; status?: string; isBuilt?: boolean }>) : [])
      .find(s => s && s.instanceId === instanceId);
    if (persisted && persisted.status && persisted.status !== 'idle') {
      return badRequest('A ship must be idle before it can be scrapped', 'not_idle', { status: persisted.status });
    }

    let row: Awaited<ReturnType<typeof findLiveRow>> = null;
    try {
      row = await findLiveRow(profile.id, instanceId, ASSET_KIND_SHIP);
    } catch (err) {
      logger.error('Asset registry unavailable', { error: String(err) });
      return NextResponse.json({ error: 'Asset registry unavailable', code: 'registry_unavailable' }, { status: 503 });
    }
    if (!row) {
      if (mode === 'enforce') return NextResponse.json({ error: 'No such ship in the registry', code: 'not_found' }, { status: 404 });
      // Shadow: accept the client's claim, credit nothing (the client applies its local salvage).
      return NextResponse.json({ success: true, instanceId, ledgered: false, recovery: 0 });
    }
    if (row.status === 'pending' && row.completesAt.getTime() > Date.now()) return badRequest('Construction must finish before scrapping', 'not_complete');
    const def = SHIP_MAP.get(row.definitionId);
    if (!def) return badRequest('Ship definition retired', 'unknown_definition');
    if (mode === 'enforce' && !persisted) {
      await auditAsset(prisma, {
        eventType: 'ship_scrap_status_unverified', profileId: profile.id, severity: 'warning',
        details: { instanceId, definitionId: row.definitionId },
      });
    }

    const recovery = Math.round(def.baseCost * SHIP_SCRAP_RECOVERY_FRACTION);
    const rowId = row.id;
    const ledgerOn = await isLedgerAvailable();
    try {
      await prisma.$transaction(async (tx) => {
        const flipped = await tx.serverAsset.updateMany({
          where: { id: rowId, status: { in: ['pending', 'complete'] } },
          data: { status: 'scrapped' },
        });
        if (flipped.count !== 1) throw new AssetStateError('Ship already scrapped');
        await creditMoney(tx, profile.id, recovery, 'ship_scrap_recovery', rowId, ledgerOn);
      });
    } catch (err) {
      if (err instanceof AssetStateError) return NextResponse.json({ error: err.message, code: 'state_conflict' }, { status: err.status });
      throw err;
    }

    logger.info('Asset ship scrapped', { profileId: profile.id, instanceId, recovery });
    return NextResponse.json({ success: true, instanceId, ledgered: true, recovery });
  } catch (error) {
    logger.error('Asset scrap error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
