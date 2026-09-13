import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { SHIP_MAP, type MiningOrderMode, type MiningThenAction } from '@/lib/game/ships';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import {
  ASTEROID_FIELD_MAP,
  SURVEY_PROBE_COST,
  SURVEY_PROBE_MAX_PER_PURCHASE,
  getAsteroid,
  getFieldsForShipTier,
} from '@/lib/game/asteroids';
import { planMiningOrder, MINING_PLAN_ERROR_TEXT } from '@/lib/game/mining-orders';
import { getResearchBonuses } from '@/lib/game/research-tree';
import { isLedgerAvailable } from '@/lib/game/server-ledger';
import {
  ASSET_KIND_SHIP,
  ensureAssetAdoption,
  ensureAssetAdoption2,
  loadServerRegistry,
} from '@/lib/game/server-assets';
import {
  ASSET_KIND_SURVEY_PROBE,
  MINING_ORDER_HELD,
  MINING_ORDER_PENDING,
  MINING_ORDER_RETURNED,
  PROBE_STATUS_STOCKED,
  SURVEY_PROBE_DEFINITION_ID,
  completeDueMiningOrders,
  consumeProbe,
  countProbes,
  findSurvey,
  intelFromRow,
  loadAsteroidRow,
  loadLiveOrders,
  loadSurveyedIntel,
  resolveShipLocation,
} from '@/lib/game/server-mining';
import {
  InsufficientFundsError,
  badRequest,
  debitMoney,
  fundsError,
  loadAssetProfile,
  parseInstanceId,
} from '@/lib/game/asset-route-shared';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/assets/mining — interactive asteroid mining Phase A
 * (docs/SPACE_MINING_DESIGN_2026-09-12.md §3-4). One route, three ops:
 *
 *   { op: 'order', instanceId, shipInstanceId, mode: 'mine'|'survey'|'return',
 *     asteroidId?, fillUnits?, thenAction?, originId, destinationId? }
 *       Quotes the order with the SAME pure planner the client previews
 *       (mining-orders.ts planMiningOrder) against the server's view: the
 *       hull from the asset registry, the rock from the Asteroid table, the
 *       corporation's survey (AsteroidSurvey, effective at now), and the
 *       ship's location from its own order history. Burns the fuel through
 *       the ledger (mining_order_fuel) and inserts the pending MiningOrder
 *       row. Retry-safe on instanceId. A 'survey' order also writes the
 *       AsteroidSurvey row with surveyedAt = arrival. A 'return' order
 *       consumes the ship's held order.
 *   { op: 'survey_probe', asteroidId }
 *       Consumes one stocked probe (ServerAsset kind survey_probe) and
 *       reveals the rock now. Returns the intel.
 *   { op: 'buy_probes', count }
 *       Debits count × SURVEY_PROBE_COST (survey_probe_purchase, burned) and
 *       stocks the probes.
 *
 * Completion is NOT here: the assets-complete cron and the lazy pass at the
 * top of every op (server-mining.ts completeDueMiningOrders) flip due orders
 * and ledger the ore / sale — the only path that creates ore for a synced
 * profile. GET returns the corporation's mining view for reconciliation.
 */
export async function POST(request: NextRequest) {
  try {
    const loaded = await loadAssetProfile('mining');
    if (loaded.response) return loaded.response;
    const profile = loaded.profile;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') return badRequest('Invalid body', 'invalid_body');
    const op = typeof body.op === 'string' ? body.op : '';

    // Registry availability + one-time adoption of a pre-registry save.
    let registry;
    try {
      await ensureAssetAdoption(profile, prisma);
      await ensureAssetAdoption2(profile, prisma);
      registry = await loadServerRegistry(profile.id, profile, { mode: 'shadow' });
      // Lazy completion pass for THIS profile so an order that just finished
      // credits before the next one is placed.
      await completeDueMiningOrders(prisma, profile.id);
    } catch (err) {
      logger.error('Mining registry unavailable', { error: String(err) });
      return NextResponse.json({ error: 'Mining registry unavailable', code: 'registry_unavailable' }, { status: 503 });
    }

    const ledgerOn = await isLedgerAvailable();
    const now = new Date();

    // ── buy_probes ─────────────────────────────────────────────────────────
    if (op === 'buy_probes') {
      const count = Math.floor(Number(body.count));
      if (!Number.isFinite(count) || count < 1 || count > SURVEY_PROBE_MAX_PER_PURCHASE) {
        return badRequest(`count must be 1-${SURVEY_PROBE_MAX_PER_PURCHASE}`, 'invalid_count');
      }
      const cost = count * SURVEY_PROBE_COST;
      if (!Number.isFinite(profile.money) || profile.money < cost) return fundsError(cost, profile.money, `${count} survey probe${count === 1 ? '' : 's'}`);
      try {
        await prisma.$transaction(async (tx) => {
          const rows = Array.from({ length: count }, (_, i) => ({
            profileId: profile.id,
            kind: ASSET_KIND_SURVEY_PROBE,
            definitionId: SURVEY_PROBE_DEFINITION_ID,
            instanceId: `probe:${now.getTime().toString(36)}:${i}:${Math.random().toString(36).slice(2, 8)}`,
            locationId: null,
            status: PROBE_STATUS_STOCKED,
            markLevel: 1,
            startedAt: now,
            completesAt: now,
            paidMoney: SURVEY_PROBE_COST,
            paidResources: {},
          }));
          await tx.serverAsset.createMany({ data: rows });
          await debitMoney(tx, profile.id, cost, 'survey_probe_purchase', `probes:${now.getTime()}`, ledgerOn);
        });
      } catch (err) {
        if (err instanceof InsufficientFundsError) return fundsError(cost, profile.money, 'survey probes');
        throw err;
      }
      const probes = await countProbes(profile.id);
      logger.info('Survey probes bought', { profileId: profile.id, count, cost });
      return NextResponse.json({ success: true, count, cost, probes });
    }

    // ── survey_probe ───────────────────────────────────────────────────────
    if (op === 'survey_probe') {
      const asteroidId = typeof body.asteroidId === 'string' ? body.asteroidId : '';
      const rock = getAsteroid(asteroidId);
      if (!rock) return badRequest(MINING_PLAN_ERROR_TEXT.unknown_rock, 'unknown_rock');
      const row = await loadAsteroidRow(rock.id);
      if (!row) return NextResponse.json({ error: 'The asteroid catalogue has not been seeded on this world yet.', code: 'catalogue_not_seeded' }, { status: 503 });
      const existing = await findSurvey(profile.id, rock.id);
      if (existing && existing.surveyedAt.getTime() <= now.getTime()) {
        return NextResponse.json({ success: true, idempotent: true, asteroidId: rock.id, intel: intelFromRow(row), surveyedAtMs: existing.surveyedAt.getTime(), via: existing.via, probes: await countProbes(profile.id) });
      }
      let consumed = false;
      await prisma.$transaction(async (tx) => {
        consumed = await consumeProbe(tx, profile.id);
        if (!consumed) return;
        await tx.asteroidSurvey.upsert({
          where: { profileId_asteroidId: { profileId: profile.id, asteroidId: rock.id } },
          create: { profileId: profile.id, asteroidId: rock.id, surveyedAt: now, via: 'probe' },
          update: { surveyedAt: now, via: 'probe' },
        });
      });
      if (!consumed) return badRequest('No survey probes in stock — buy probes first, or send a survey-capable ship.', 'no_probes');
      const probes = await countProbes(profile.id);
      logger.info('Rock surveyed by probe', { profileId: profile.id, asteroidId: rock.id });
      return NextResponse.json({ success: true, asteroidId: rock.id, intel: intelFromRow(row), surveyedAtMs: now.getTime(), via: 'probe', probes });
    }

    // ── order ──────────────────────────────────────────────────────────────
    if (op !== 'order') return badRequest('Unknown op', 'unknown_op');
    const instanceId = parseInstanceId(body.instanceId);
    if (!instanceId) return badRequest('instanceId is required', 'invalid_instance_id');
    const shipInstanceId = parseInstanceId(body.shipInstanceId);
    if (!shipInstanceId) return badRequest('shipInstanceId is required', 'invalid_ship');
    const mode = body.mode as MiningOrderMode;
    if (mode !== 'mine' && mode !== 'survey' && mode !== 'return') return badRequest('mode must be mine, survey or return', 'invalid_mode');
    const thenActionRaw = body.thenAction;
    const thenAction: MiningThenAction | undefined = thenActionRaw === 'return_sell' || thenActionRaw === 'return_store' || thenActionRaw === 'hold' ? thenActionRaw : undefined;
    const originId = typeof body.originId === 'string' ? body.originId : '';
    const destinationRaw = typeof body.destinationId === 'string' ? body.destinationId : undefined;
    if (destinationRaw !== undefined && !LOCATION_MAP.has(destinationRaw)) return badRequest('Unknown destination', 'unknown_location');

    // Retry-safe: the same order id already exists → return it, no charge.
    const orders = await loadLiveOrders(profile.id);
    const dup = await prisma.miningOrder.findUnique({ where: { profileId_instanceId: { profileId: profile.id, instanceId } }, select: { id: true, status: true, startedAt: true, arrivesAt: true, miningEndsAt: true, completesAt: true, fuelPaid: true, fillUnits: true, ratePerHour: true, surveyed: true, mode: true, thenAction: true, oreId: true, fieldId: true, asteroidId: true, originId: true, destinationId: true } });
    if (dup) {
      return NextResponse.json({
        success: true, idempotent: true, instanceId,
        order: {
          mode: dup.mode, asteroidId: dup.asteroidId, fieldId: dup.fieldId, oreId: dup.oreId, fillUnits: dup.fillUnits, thenAction: dup.thenAction,
          originId: dup.originId, destinationId: dup.destinationId,
          startedAtMs: dup.startedAt.getTime(), arrivesAtMs: dup.arrivesAt.getTime(), miningEndsAtMs: dup.miningEndsAt.getTime(), completesAtMs: dup.completesAt.getTime(),
          fuelCost: dup.fuelPaid, ratePerHour: dup.ratePerHour, surveyed: dup.surveyed,
        },
      });
    }

    // The hull: a live, built ship row in the registry (shadow: union with
    // the client's persisted fleet, tagged by source).
    const shipView = registry.ships.ships.find(s => s.instanceId === shipInstanceId);
    if (!shipView) return badRequest('That hull is not in the corporate registry.', 'unknown_ship');
    if (!shipView.isBuilt) return badRequest('That hull is still in the yard.', 'ship_not_built');
    const def = SHIP_MAP.get(shipView.definitionId);
    if (!def) return badRequest(MINING_PLAN_ERROR_TEXT.unknown_ship, 'unknown_ship');
    if (orders.some(o => o.shipInstanceId === shipInstanceId && o.status === MINING_ORDER_PENDING)) {
      return badRequest(`${shipView.name} already has a mining order under way.`, 'ship_busy');
    }
    const shipRow = registry.rows.find(r => r.kind === ASSET_KIND_SHIP && r.instanceId === shipInstanceId);
    const persisted = Array.isArray(profile.shipsData)
      ? (profile.shipsData as Array<{ instanceId?: string; currentLocation?: string; hullDamagePct?: number }>).find(s => s?.instanceId === shipInstanceId)
      : undefined;
    const serverLocation = resolveShipLocation(shipInstanceId, orders, persisted?.currentLocation ?? null, shipRow?.locationId ?? null);
    if (!originId || originId !== serverLocation) {
      return badRequest(`${shipView.name} is at ${LOCATION_MAP.get(serverLocation)?.name || serverLocation}, not ${LOCATION_MAP.get(originId)?.name || originId || 'there'}. Reload and try again.`, 'ship_not_there', { serverLocation });
    }
    const hullDamagePct = typeof persisted?.hullDamagePct === 'number' ? Math.max(0, Math.min(1, persisted.hullDamagePct)) : 0;
    let fuelEfficiencyMult = 1;
    try {
      fuelEfficiencyMult = Math.max(0.5, 1 - (getResearchBonuses(registry.research.completed).fuelEfficiencyBonus || 0));
    } catch { fuelEfficiencyMult = 1; }

    // Cargo capacity: hull only (module bonuses are client-owned condition;
    // the client's preview can only be LARGER, which the min() below caps).
    const cargoCapacity = def.cargoCapacity;

    let plan;
    let rockRow: Awaited<ReturnType<typeof loadAsteroidRow>> = null;
    let heldOrderId: string | null = null;
    if (mode === 'return') {
      const held = orders.find(o => o.shipInstanceId === shipInstanceId && o.status === MINING_ORDER_HELD);
      if (!held) return badRequest(MINING_PLAN_ERROR_TEXT.nothing_held, 'nothing_held');
      heldOrderId = held.id;
      plan = planMiningOrder({
        def, cargoCapacity, mode: 'return', originId,
        destinationId: destinationRaw || 'earth_surface', thenAction,
        heldOre: { oreId: held.oreId, units: held.fillUnits, asteroidId: held.asteroidId, fieldId: held.fieldId },
        hullDamagePct, fuelEfficiencyMult, nowMs: now.getTime(),
      });
    } else {
      const asteroidId = typeof body.asteroidId === 'string' ? body.asteroidId : '';
      const rock = getAsteroid(asteroidId);
      if (!rock) return badRequest(MINING_PLAN_ERROR_TEXT.unknown_rock, 'unknown_rock');
      const field = ASTEROID_FIELD_MAP.get(rock.fieldId);
      if (!field) return badRequest(MINING_PLAN_ERROR_TEXT.unknown_rock, 'unknown_rock');
      if (!getFieldsForShipTier(def.tier).some(f => f.id === field.id)) return badRequest(MINING_PLAN_ERROR_TEXT.field_out_of_reach, 'field_out_of_reach');
      // Reachability: the field's parent must be unlocked on the server,
      // except the Frontier field (§6 "Frontier shield" — reachable from LEO).
      if (!field.frontier && !registry.locations.unlocked.includes(field.parentLocationId)) {
        return badRequest(`${LOCATION_MAP.get(field.parentLocationId)?.name || field.parentLocationId} is not unlocked on the server yet.`, 'location_locked');
      }
      rockRow = await loadAsteroidRow(rock.id);
      if (!rockRow) return NextResponse.json({ error: 'The asteroid catalogue has not been seeded on this world yet.', code: 'catalogue_not_seeded' }, { status: 503 });
      if (rockRow.exhaustedAt || rockRow.reserve <= 0) return badRequest(MINING_PLAN_ERROR_TEXT.rock_exhausted, 'rock_exhausted');
      const survey = await findSurvey(profile.id, rock.id);
      const surveyed = !!survey && survey.surveyedAt.getTime() <= now.getTime();
      const intel = surveyed ? intelFromRow(rockRow) : null;
      const fillUnits = Number.isFinite(Number(body.fillUnits)) ? Math.floor(Number(body.fillUnits)) : cargoCapacity;
      plan = planMiningOrder({
        def, cargoCapacity, mode, rock, intel,
        // An unsurveyed rock is still bounded by its true reserve — clamp
        // silently (the client learns the real fill from the response).
        fillUnits: mode === 'mine' ? Math.min(fillUnits, Math.max(1, Math.floor(rockRow.reserve))) : 0,
        thenAction, originId, destinationId: destinationRaw,
        hullDamagePct, fuelEfficiencyMult, nowMs: now.getTime(),
      });
      if (mode === 'survey' && surveyed) return badRequest('That rock is already surveyed.', 'already_surveyed');
    }
    if (!plan.ok) return badRequest(MINING_PLAN_ERROR_TEXT[plan.error], plan.error);
    const order = plan.order;
    if (!Number.isFinite(profile.money) || profile.money < order.fuelCost) return fundsError(order.fuelCost, profile.money, `${shipView.name} fuel`);

    let created: { id: string };
    try {
      created = await prisma.$transaction(async (tx) => {
        const row = await tx.miningOrder.create({
          data: {
            profileId: profile.id,
            instanceId,
            shipInstanceId,
            mode: order.mode,
            asteroidId: order.asteroidId,
            fieldId: order.fieldId,
            oreId: order.oreId,
            fillUnits: order.fillUnits,
            thenAction: order.thenAction,
            originId: order.originId,
            destinationId: order.destinationId,
            startedAt: new Date(order.startedAtMs),
            arrivesAt: new Date(order.arrivesAtMs),
            miningEndsAt: new Date(order.miningEndsAtMs),
            completesAt: new Date(order.completesAtMs),
            fuelPaid: order.fuelCost,
            ratePerHour: order.ratePerHour,
            surveyed: order.surveyed,
            status: MINING_ORDER_PENDING,
          },
          select: { id: true },
        });
        await debitMoney(tx, profile.id, order.fuelCost, 'mining_order_fuel', row.id, ledgerOn);
        if (order.mode === 'survey' && order.asteroidId) {
          await tx.asteroidSurvey.upsert({
            where: { profileId_asteroidId: { profileId: profile.id, asteroidId: order.asteroidId } },
            create: { profileId: profile.id, asteroidId: order.asteroidId, surveyedAt: new Date(order.arrivesAtMs), via: 'ship' },
            update: { surveyedAt: new Date(order.arrivesAtMs), via: 'ship' },
          });
        }
        if (heldOrderId) {
          const flipped = await tx.miningOrder.updateMany({ where: { id: heldOrderId, status: MINING_ORDER_HELD }, data: { status: MINING_ORDER_RETURNED } });
          if (flipped.count !== 1) throw new Error('held order already consumed');
        }
        return row;
      });
    } catch (err) {
      if (err instanceof InsufficientFundsError) return fundsError(order.fuelCost, profile.money, `${shipView.name} fuel`);
      if (err instanceof Error && err.message === 'held order already consumed') return badRequest(MINING_PLAN_ERROR_TEXT.nothing_held, 'nothing_held');
      throw err;
    }

    logger.info('Mining order placed', { profileId: profile.id, orderId: created.id, instanceId, shipInstanceId, mode, asteroidId: order.asteroidId, fillUnits: order.fillUnits, fuel: order.fuelCost });
    return NextResponse.json({
      success: true,
      instanceId,
      order: { ...order },
      // A survey order returns the reveal now; the client applies it on
      // arrival (the survey row is stamped with the arrival time).
      intel: order.mode === 'survey' && rockRow ? intelFromRow(rockRow) : undefined,
      transitOutSeconds: plan.transitOutSeconds,
      extractionSeconds: plan.extractionSeconds,
      transitBackSeconds: plan.transitBackSeconds,
      expectedValue: plan.expectedValue,
    });
  } catch (error) {
    logger.error('Asset mining error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** GET — the corporation's mining view: live orders, effective surveys,
 *  probes in stock. Runs the lazy completion pass first. */
export async function GET() {
  try {
    const loaded = await loadAssetProfile('mining');
    if (loaded.response) return loaded.response;
    const profile = loaded.profile;
    let settled = 0;
    try { settled = await completeDueMiningOrders(prisma, profile.id); } catch { /* best-effort */ }
    const [orders, intel, probes] = await Promise.all([
      loadLiveOrders(profile.id).catch(() => []),
      loadSurveyedIntel(profile.id).catch(() => ({})),
      countProbes(profile.id).catch(() => 0),
    ]);
    return NextResponse.json({
      settled,
      probes,
      intel,
      orders: orders.map(o => ({
        instanceId: o.instanceId, shipInstanceId: o.shipInstanceId, mode: o.mode, status: o.status,
        asteroidId: o.asteroidId, fieldId: o.fieldId, oreId: o.oreId, fillUnits: o.fillUnits, thenAction: o.thenAction,
        originId: o.originId, destinationId: o.destinationId,
        startedAtMs: o.startedAt.getTime(), arrivesAtMs: o.arrivesAt.getTime(), miningEndsAtMs: o.miningEndsAt.getTime(), completesAtMs: o.completesAt.getTime(),
        fuelCost: o.fuelPaid, ratePerHour: o.ratePerHour, surveyed: o.surveyed,
      })),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    logger.error('Asset mining GET error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
