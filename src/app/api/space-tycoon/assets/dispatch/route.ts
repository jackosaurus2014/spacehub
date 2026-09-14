import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { getTravelTime } from '@/lib/game/ships';
import {
  ASSET_KIND_SHIP,
  ensureAssetAdoption,
  ensureAssetAdoption2,
  loadServerRegistry,
} from '@/lib/game/server-assets';
import { loadLiveOrders, MINING_ORDER_PENDING } from '@/lib/game/server-mining';
import { TRANSIT_IN_FLIGHT } from '@/lib/game/ship-transit';
import {
  createTransitRow,
  findLiveTransit,
  transitBlock,
} from '@/lib/game/server-ship-transit';
import { badRequest, loadAssetProfile, parseInstanceId } from '@/lib/game/asset-route-shared';

export const dynamic = 'force-dynamic';

const MAX_CARGO_LINES = 40;

function parseCargo(raw: unknown): Record<string, number> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_CARGO_LINES) break;
    if (typeof k !== 'string' || k.length > 64) continue;
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) continue;
    out[k] = Math.round(v);
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * POST /api/space-tycoon/assets/dispatch — put a hull on a lane, server-side.
 *
 * Ship traffic Phase 2 (2026-09-14). Until now no route saw a ship move:
 * freight dispatch (cargo-logistics.ts dispatchShipWithCargo) and the Fleet
 * Tender's auto-rove are client-side state mutators, and the traffic feed
 * therefore derived every other corporation's position from the synced
 * `shipsData` blob. This is the path that gives movement the same authority
 * Mining Orders, HQ relocations and expeditions already have: it stamps a
 * ShipTransit row whose departure and arrival instants the server owns.
 *
 * Body: { shipInstanceId, fromLocationId, toLocationId, travelSeconds?,
 *         cargo? }.
 *
 * What is validated: the hull belongs to the caller and is built (the asset
 * registry's ship view), both endpoints exist and differ, the hull is not
 * already committed to a Mining Order (that table owns its movement), and
 * the journey DURATION is clamped against the catalogue travel time for the
 * leg (ship-transit.ts clampTravelMs) — a client asking to cross the belt in
 * one second gets the floor, not the claim.
 *
 * What is NOT done here: no money or resources move. The manifest was
 * debited at departure by the client's own freight mutator and is credited
 * on arrival by the engine's transit-arrival branch; this row records the
 * CLOCK, not the goods. Re-posting the same leg for the same hull is
 * idempotent.
 */
export async function POST(request: NextRequest) {
  try {
    const loaded = await loadAssetProfile('dispatch');
    if (loaded.response) return loaded.response;
    const profile = loaded.profile;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') return badRequest('Invalid body', 'invalid_body');
    const shipInstanceId = parseInstanceId(body.shipInstanceId);
    if (!shipInstanceId) return badRequest('shipInstanceId is required', 'invalid_ship');
    const fromLocationId = typeof body.fromLocationId === 'string' ? body.fromLocationId : '';
    const toLocationId = typeof body.toLocationId === 'string' ? body.toLocationId : '';
    if (!LOCATION_MAP.has(fromLocationId)) return badRequest('Unknown origin', 'unknown_location');
    if (!LOCATION_MAP.has(toLocationId)) return badRequest('Unknown destination', 'unknown_location');
    if (fromLocationId === toLocationId) return badRequest('A ship cannot be dispatched to where it already is', 'same_location');

    let registry;
    try {
      await ensureAssetAdoption(profile, prisma);
      await ensureAssetAdoption2(profile, prisma);
      registry = await loadServerRegistry(profile.id, profile, { mode: 'shadow' });
    } catch (err) {
      logger.error('Asset registry unavailable', { error: String(err) });
      return NextResponse.json({ error: 'Asset registry unavailable', code: 'registry_unavailable' }, { status: 503 });
    }

    const shipView = registry.ships.ships.find(s => s.instanceId === shipInstanceId);
    if (!shipView) return badRequest('No such ship', 'unknown_ship');
    if (shipView.isBuilt === false) return badRequest('That hull is still in the yard', 'ship_not_built');
    const definitionId = shipView.definitionId
      || registry.rows.find(r => r.kind === ASSET_KIND_SHIP && r.instanceId === shipInstanceId)?.definitionId
      || '';

    // Mining legs already have a server row with its own clock. Two
    // authorities over one hull is exactly the bug this table exists to
    // prevent, so the mining order wins while it is open.
    const orders = await loadLiveOrders(profile.id, prisma);
    if (orders.some(o => o.shipInstanceId === shipInstanceId && o.status === MINING_ORDER_PENDING)) {
      return badRequest('That hull is flying a mining order', 'ship_on_mining_order');
    }

    const existing = await findLiveTransit(profile.id, shipInstanceId, prisma);
    if (existing && existing.originId === fromLocationId && existing.destinationId === toLocationId) {
      return NextResponse.json({ success: true, idempotent: true, transit: transitBlock(existing) });
    }

    const claimedSeconds = typeof body.travelSeconds === 'number' && Number.isFinite(body.travelSeconds) && body.travelSeconds > 0
      ? body.travelSeconds
      : getTravelTime(fromLocationId, toLocationId);
    const now = new Date();

    let row;
    try {
      row = await createTransitRow(prisma, {
        profileId: profile.id,
        shipInstanceId,
        shipDefinitionId: definitionId,
        originId: fromLocationId,
        destinationId: toLocationId,
        claimedTravelMs: claimedSeconds * 1000,
        cargo: parseCargo(body.cargo),
        now,
        source: 'dispatch',
      });
    } catch (err) {
      logger.error('Ship dispatch row failed', { profileId: profile.id, shipInstanceId, error: String(err) });
      return NextResponse.json({ error: 'Transit ledger unavailable', code: 'transit_unavailable' }, { status: 503 });
    }

    logger.info('Ship dispatched', {
      profileId: profile.id, shipInstanceId, definitionId,
      from: fromLocationId, to: toLocationId,
      arrivesAt: row.arrivesAt.toISOString(), status: TRANSIT_IN_FLIGHT,
    });
    return NextResponse.json({ success: true, transit: transitBlock(row) });
  } catch (error) {
    logger.error('Asset dispatch error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
