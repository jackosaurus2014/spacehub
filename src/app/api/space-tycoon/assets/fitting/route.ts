import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { SHIP_MAP } from '@/lib/game/ships';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { isLedgerAvailable } from '@/lib/game/server-ledger';
import {
  FITTING_ERROR_TEXT,
  FITTING_MAP,
  hullSlotBudget,
  quoteRefit,
  sanitizeFittingIds,
  slotsUsedBy,
  validateFit,
} from '@/lib/game/ship-fittings';
import {
  FITTING_ACTIVE,
  findFitting,
  findRefitByKey,
  fittingRecordFromRow,
  refitKeyFor,
  isRefitYard,
  loadMyFittings,
  logFittingWrite,
  refitYardLocations,
  replaceFittingRow,
} from '@/lib/game/server-fittings';
import {
  MINING_ORDER_HELD,
  MINING_ORDER_PENDING,
  completeDueMiningOrders,
  loadLiveOrders,
  resolveShipLocation,
} from '@/lib/game/server-mining';
import {
  ASSET_KIND_SHIP,
  ensureAssetAdoption,
  ensureAssetAdoption2,
  loadServerRegistry,
} from '@/lib/game/server-assets';
import {
  InsufficientFundsError,
  badRequest,
  creditMoney,
  debitMoney,
  fundsError,
  loadAssetProfile,
  parseInstanceId,
} from '@/lib/game/asset-route-shared';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/assets/fitting — mining Phase D, the server-registered
 * fitting table (docs/SPACE_MINING_DESIGN_2026-09-12.md §5 "Modules over new
 * hulls", §8 row D).
 *
 *   { op: 'refit', instanceId, shipInstanceId, moduleIds: string[], yardLocationId }
 *       Replaces the hull's whole fit in one visit. The SERVER decides:
 *         · the hull is a built ship in the asset registry;
 *         · it is not on a mining order and holds no parcel, and its yard
 *           clock (readyAt) has run out — so a fit can never change under an
 *           order in flight;
 *         · it is physically AT `yardLocationId` (resolveShipLocation — the
 *           same reader the mining route uses, never the client's claim);
 *         · that location has a COMPLETE, OPERATIONAL fabrication facility or
 *           shipyard-capable building of this profile's (server-fittings.ts
 *           isRefitYard) — fitting is infrastructure, not a menu;
 *         · the fit is legal for the hull (ship-fittings.ts validateFit: one
 *           per group, hardpoints, roles, research, slot budget);
 *         · the bill is computed HERE (quoteRefit on the hull's own baseCost)
 *           and debited atomically beside the row write.
 *       Retry-safe on `instanceId`.
 *
 *   { op: 'strip', instanceId, shipInstanceId, yardLocationId }
 *       `refit` with an empty list — kept as its own op so a console can offer
 *       "take it all off" without composing a list.
 *
 * GET returns the profile's fittings, its refit yards, and the hulls whose
 * yard clock is still running. The client MIRRORS this (GameState.shipFittings
 * via the sync's mining block); it is never the source of truth.
 *
 * LEDGER POSTURE (ledger-reconcile.ts): `ship_fitting` and
 * `ship_fitting_salvage` are NOT in CLIENT_APPLIED_LEDGER_REASONS. The client
 * does not debit locally on the 2xx — it adopts both as ordinary pending
 * deltas, the same contract `expedition_launch` uses. Adding them to that list
 * without also making the client debit would charge every player twice, which
 * is the defect this codebase shipped on 2026-09-14 for mining_order_fuel.
 */
export async function POST(request: NextRequest) {
  try {
    const loaded = await loadAssetProfile('fitting');
    if (loaded.response) return loaded.response;
    const profile = loaded.profile;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') return badRequest('Invalid body', 'invalid_body');
    const op = typeof body.op === 'string' ? body.op : '';
    if (op !== 'refit' && op !== 'strip') return badRequest('Unknown op', 'unknown_op');

    let registry: Awaited<ReturnType<typeof loadServerRegistry>>;
    try {
      await ensureAssetAdoption(profile, prisma);
      await ensureAssetAdoption2(profile, prisma);
      registry = await loadServerRegistry(profile.id, profile, { mode: 'shadow' });
      // A hull that just finished an order must be idle before we judge it.
      await completeDueMiningOrders(prisma, profile.id);
    } catch (err) {
      logger.error('Fitting registry unavailable', { error: String(err) });
      return NextResponse.json({ error: 'Fitting registry unavailable', code: 'registry_unavailable' }, { status: 503 });
    }

    const ledgerOn = await isLedgerAvailable();
    const now = new Date();

    const instanceId = parseInstanceId(body.instanceId);
    if (!instanceId) return badRequest('instanceId is required', 'invalid_instance_id');
    const shipInstanceId = parseInstanceId(body.shipInstanceId);
    if (!shipInstanceId) return badRequest('shipInstanceId is required', 'invalid_ship');
    const yardLocationId = typeof body.yardLocationId === 'string' ? body.yardLocationId : '';
    if (!yardLocationId || !LOCATION_MAP.has(yardLocationId)) return badRequest('Unknown yard location', 'unknown_location');

    // Retry-safe: the same refit id already landed → hand back the fit, no
    // charge. Keyed on `refitKey` (the CLIENT's id), not on the row's cuid —
    // the two are different namespaces, and getting this wrong bills the yard
    // twice for one double-tapped button.
    const dup = await findRefitByKey(profile.id, instanceId);
    if (dup) {
      const existing = await findFitting(profile.id, shipInstanceId);
      return NextResponse.json({
        success: true, idempotent: true,
        fitting: existing ? fittingRecordFromRow(existing) : null,
        fittings: (await loadMyFittings(profile.id)).map(fittingRecordFromRow),
      });
    }

    // ── The hull ───────────────────────────────────────────────────────────
    const shipView = registry.ships.ships.find(s => s.instanceId === shipInstanceId);
    if (!shipView) return badRequest('That hull is not in the corporate registry.', 'unknown_ship');
    if (!shipView.isBuilt) return badRequest('That hull is still in the yard.', 'ship_not_built');
    const def = SHIP_MAP.get(shipView.definitionId);
    if (!def) return badRequest(FITTING_ERROR_TEXT.unknown_hull, 'unknown_hull');

    // ── The hull must be free ──────────────────────────────────────────────
    const orders = await loadLiveOrders(profile.id);
    if (orders.some(o => o.shipInstanceId === shipInstanceId && o.status === MINING_ORDER_PENDING)) {
      return badRequest(`${shipView.name} is on a mining order — a yard cannot touch a hull in flight.`, 'ship_busy');
    }
    if (orders.some(o => o.shipInstanceId === shipInstanceId && o.status === MINING_ORDER_HELD)) {
      return badRequest(`${shipView.name} is holding a parcel at a field. Bring it home before refitting.`, 'ship_holding');
    }
    if (orders.some(o => o.status === MINING_ORDER_PENDING && o.escortInstanceId === shipInstanceId)) {
      return badRequest(`${shipView.name} is escorting an ore run.`, 'ship_busy');
    }

    const previous = await findFitting(profile.id, shipInstanceId);
    if (previous && previous.readyAt.getTime() > now.getTime()) {
      return badRequest(`${shipView.name} is still in the yard — the current refit finishes first.`, 'ship_in_yard', { readyAtMs: previous.readyAt.getTime() });
    }

    // ── The hull must be AT the yard ───────────────────────────────────────
    const persisted = Array.isArray(profile.shipsData)
      ? (profile.shipsData as Array<{ instanceId?: string; currentLocation?: string }>).find(s => s?.instanceId === shipInstanceId)
      : undefined;
    const shipRow = registry.rows.find(r => r.kind === ASSET_KIND_SHIP && r.instanceId === shipInstanceId);
    const serverLocation = resolveShipLocation(shipInstanceId, orders, persisted?.currentLocation ?? null, shipRow?.locationId ?? null);
    if (serverLocation !== yardLocationId) {
      return badRequest(
        `${shipView.name} is at ${LOCATION_MAP.get(serverLocation)?.name || serverLocation}, not ${LOCATION_MAP.get(yardLocationId)?.name || yardLocationId}. Fly it to the yard first.`,
        'ship_not_there', { serverLocation },
      );
    }

    // ── That location must BE a yard ───────────────────────────────────────
    if (!isRefitYard(registry.buildings.buildings, yardLocationId)) {
      return badRequest(
        `${LOCATION_MAP.get(yardLocationId)?.name || yardLocationId} has no fabrication facility or shipyard of yours. Build one there, or fly the hull to a yard you own.`,
        'no_yard', { yards: refitYardLocations(registry.buildings.buildings) },
      );
    }

    // ── The fit must be legal ──────────────────────────────────────────────
    const nextIds = op === 'strip' ? [] : sanitizeFittingIds(body.moduleIds);
    if (op === 'refit' && Array.isArray(body.moduleIds) && nextIds.length !== (body.moduleIds as unknown[]).length) {
      return badRequest(FITTING_ERROR_TEXT.unknown_fitting, 'unknown_fitting');
    }
    const currentIds = previous ? sanitizeFittingIds(previous.moduleIds) : [];
    const check = validateFit(def, nextIds, registry.research.completed);
    if (!check.ok) {
      const code = check.error || 'unknown_fitting';
      const detail = check.detail && FITTING_MAP.has(check.detail) ? ` (${FITTING_MAP.get(check.detail)!.name})` : '';
      return badRequest(`${FITTING_ERROR_TEXT[code]}${detail}`, code, { slotsUsed: check.slotsUsed, slotBudget: check.slotBudget });
    }
    const same = currentIds.length === nextIds.length && currentIds.every(id => nextIds.includes(id));
    if (same) return badRequest(FITTING_ERROR_TEXT.no_change, 'no_change');

    // ── The bill, computed server-side from the hull's own price ───────────
    const quote = quoteRefit(def, currentIds, nextIds);
    if (quote.cost > 0 && (!Number.isFinite(profile.money) || profile.money < quote.cost)) {
      return fundsError(quote.cost, profile.money, `the refit of ${shipView.name}`);
    }
    const readyAt = new Date(now.getTime() + quote.seconds * 1000);

    let created: { id: string } | null = null;
    try {
      created = await prisma.$transaction(async (tx) => {
        const row = await replaceFittingRow(
          tx, profile.id, shipInstanceId, def.id, previous,
          nextIds, quote.upkeepPerMonth, yardLocationId, readyAt, quote.cost, now,
          refitKeyFor(profile.id, instanceId),
        );
        if (!row) throw new Error('refit_race');
        if (quote.cost > 0) await debitMoney(tx, profile.id, quote.cost, 'ship_fitting', row.id || shipInstanceId, ledgerOn);
        if (quote.refund > 0) await creditMoney(tx, profile.id, quote.refund, 'ship_fitting_salvage', row.id || shipInstanceId, ledgerOn);
        return row;
      });
    } catch (err) {
      if (err instanceof InsufficientFundsError) return fundsError(quote.cost, profile.money, `the refit of ${shipView.name}`);
      const code = (err as { code?: string })?.code;
      if (code === 'P2002' || (err as Error)?.message === 'refit_race') {
        return badRequest('That hull was refitted a moment ago. Reload and try again.', 'refit_race');
      }
      throw err;
    }

    logFittingWrite(profile.id, shipInstanceId, nextIds, quote.cost);
    const fittings = (await loadMyFittings(profile.id)).map(fittingRecordFromRow);
    return NextResponse.json({
      success: true,
      refitId: created?.id ?? null,
      shipInstanceId,
      fitting: fittings.find(f => f.shipInstanceId === shipInstanceId) ?? null,
      fittings,
      quote,
      readyAtMs: readyAt.getTime(),
      slotBudget: hullSlotBudget(def),
      slotsUsed: slotsUsedBy(nextIds),
    });
  } catch (error) {
    logger.error('Fitting route failed', { error: String(error) });
    return NextResponse.json({ error: 'Refit failed', code: 'internal_error' }, { status: 500 });
  }
}

/** The corporation's fitting view: every live fit, the yards it can use, and
 *  which hulls are still on the yard clock. Read-only; the console re-reads it
 *  after every write, the same pattern the Phase C consoles use. */
export async function GET() {
  try {
    const loaded = await loadAssetProfile('fitting');
    if (loaded.response) return loaded.response;
    const profile = loaded.profile;
    let registry: Awaited<ReturnType<typeof loadServerRegistry>> | null = null;
    try {
      registry = await loadServerRegistry(profile.id, profile, { mode: 'shadow' });
    } catch { registry = null; }
    const rows = await loadMyFittings(profile.id);
    const now = Date.now();
    return NextResponse.json({
      fittings: rows.map(fittingRecordFromRow),
      inYard: rows.filter(r => r.readyAt.getTime() > now).map(r => ({ shipInstanceId: r.shipInstanceId, readyAtMs: r.readyAt.getTime() })),
      yards: registry ? refitYardLocations(registry.buildings.buildings) : [],
      completedResearch: registry ? registry.research.completed : [],
      status: FITTING_ACTIVE,
    });
  } catch (error) {
    logger.error('Fitting view failed', { error: String(error) });
    return NextResponse.json({ error: 'Fitting view failed', code: 'internal_error' }, { status: 500 });
  }
}
