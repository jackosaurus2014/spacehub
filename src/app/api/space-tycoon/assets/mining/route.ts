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
import { hqMiningLogisticsForLocationId } from '@/lib/game/headquarters';
import { getResearchBonuses } from '@/lib/game/research-tree';
import { isLedgerAvailable } from '@/lib/game/server-ledger';
// Mining Phase B (2026-09-13): claims, shared-rock pressure, escorts.
import { STAKE_CLAIM_ERROR_TEXT, checkStakeClaim, claimStakeFee } from '@/lib/game/asteroid-claims';
// Mining Phase C (2026-09-13): refining, propellant depots, survey reports.
import { MOBILE_REFINERY_RECOVERY } from '@/lib/game/ore-refining';
import {
  DEPOT_ERROR_TEXT,
  DEPOT_FEEDSTOCK_YIELD,
  DEPOT_MAX_RESTOCK_UNITS,
  checkDeployDepot,
  depotSlotsForFieldId,
  feedstockForPropellant,
  feedstockPropellant,
} from '@/lib/game/propellant-depots';
import {
  REPORT_ERROR_TEXT,
  checkBuyReport,
  checkListReport,
  reportPriceBounds,
  reportSellerProceeds,
} from '@/lib/game/survey-reports';
import { resolveSellableQuantity } from '@/lib/game/server-inventory';
import { tierFromProfileScalars } from '@/lib/game/corporation-tiers';
import { FRONTIER_DURATION_MS } from '@/lib/game/frontier';
import type { EscortCover } from '@/lib/game/npc-shakedown';
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
  surveyIsEffective,
  CLAIM_RELEASED,
  CLAIM_RELEASED_ACTIVITY,
  CLAIM_STAKED_ACTIVITY,
  claimRecordFromRow,
  createClaimRow,
  hasStationedEscortAt,
  loadActiveClaim,
  loadMiningBlock,
  loadMyClaims,
  postClaimActivity,
  releaseClaimRow,
  resetClaimFeedCache,
  addDepotStock,
  createDepotRow,
  depotRecordFromRow,
  depotRestockCost,
  drawDepotFuel,
  findMyDepot,
  findReportById,
  listReportRow,
  loadFieldDepotSlots,
  loadMyDepots,
  loadMyReports,
  loadPublicDepots,
  loadReportMarket,
  pickSweepTargets,
  recallDepotRow,
  unlistReportRow,
} from '@/lib/game/server-mining';
import {
  InsufficientFundsError,
  badRequest,
  creditMoney,
  debitMoney,
  fundsError,
  ledgerResources,
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
    let registry: Awaited<ReturnType<typeof loadServerRegistry>>;
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
      if (existing && surveyIsEffective(existing, row.generation, now)) {
        return NextResponse.json({ success: true, idempotent: true, asteroidId: rock.id, intel: intelFromRow(row), surveyedAtMs: existing.surveyedAt.getTime(), via: existing.via, probes: await countProbes(profile.id) });
      }
      let consumed = false;
      await prisma.$transaction(async (tx) => {
        consumed = await consumeProbe(tx, profile.id);
        if (!consumed) return;
        await tx.asteroidSurvey.upsert({
          where: { profileId_asteroidId: { profileId: profile.id, asteroidId: rock.id } },
          create: { profileId: profile.id, asteroidId: rock.id, surveyedAt: now, via: 'probe', generation: row.generation },
          update: { surveyedAt: now, via: 'probe', generation: row.generation },
        });
      });
      if (!consumed) return badRequest('No survey probes in stock — buy probes first, or send a survey-capable ship.', 'no_probes');
      const probes = await countProbes(profile.id);
      logger.info('Rock surveyed by probe', { profileId: profile.id, asteroidId: rock.id });
      return NextResponse.json({ success: true, asteroidId: rock.id, intel: intelFromRow(row), surveyedAtMs: now.getTime(), via: 'probe', probes });
    }

    // ── stake_claim / release_claim (Phase B) ──────────────────────────────
    if (op === 'stake_claim' || op === 'release_claim') {
      const asteroidId = typeof body.asteroidId === 'string' ? body.asteroidId : '';
      const rock = getAsteroid(asteroidId);
      if (!rock) return badRequest(STAKE_CLAIM_ERROR_TEXT.unknown_rock, 'unknown_rock');
      const existing = await loadActiveClaim(rock.id);
      if (op === 'release_claim') {
        if (!existing || existing.profileId !== profile.id) return badRequest('You hold no claim on that rock.', 'no_claim');
        const ok = await releaseClaimRow(prisma, existing.id, CLAIM_RELEASED, 'released', now);
        if (ok) {
          resetClaimFeedCache();
          void postClaimActivity(prisma, profile.id, CLAIM_RELEASED_ACTIVITY, rock.id, 'was released');
          logger.info('Asteroid claim released', { profileId: profile.id, asteroidId: rock.id });
        }
        return NextResponse.json({ success: true, released: ok, asteroidId: rock.id, claims: (await loadMyClaims(profile.id)).map(claimRecordFromRow) });
      }
      const row = await loadAsteroidRow(rock.id);
      if (!row) return NextResponse.json({ error: 'The asteroid catalogue has not been seeded on this world yet.', code: 'catalogue_not_seeded' }, { status: 503 });
      const survey = await findSurvey(profile.id, rock.id);
      const surveyed = !!survey && surveyIsEffective(survey, row.generation, now);
      const myClaims = await loadMyClaims(profile.id);
      if (existing && existing.profileId === profile.id) {
        return NextResponse.json({ success: true, idempotent: true, claim: claimRecordFromRow(existing), claims: myClaims.map(claimRecordFromRow) });
      }
      const tier = tierFromProfileScalars({ totalEarned: profile.totalEarned, buildingCount: profile.buildingCount, researchCount: profile.researchCount, locationsUnlocked: profile.locationsUnlocked, serviceCount: profile.serviceCount });
      const check = checkStakeClaim({
        rock, intel: surveyed ? intelFromRow(row) : null, claimedByOther: !!existing, mine: false,
        tier, myClaimCount: myClaims.length, money: profile.money,
      });
      if (!check.ok) {
        if (check.error === 'insufficient_funds') return fundsError(claimStakeFee(rock, intelFromRow(row)), profile.money, `the claim on ${rock.name}`);
        return badRequest(STAKE_CLAIM_ERROR_TEXT[check.error], check.error, { cap: check.error === 'claim_cap' ? tier : undefined });
      }
      let created;
      try {
        created = await prisma.$transaction(async (tx) => {
          const c = await createClaimRow(tx, profile.id, rock.id, rock.fieldId, rock.class, intelFromRow(row), now);
          await debitMoney(tx, profile.id, c.fee, 'claim_stake_fee', c.id, ledgerOn);
          return c;
        });
      } catch (err) {
        if (err instanceof InsufficientFundsError) return fundsError(check.fee, profile.money, `the claim on ${rock.name}`);
        const code = (err as { code?: string })?.code;
        if (code === 'P2002') return badRequest(STAKE_CLAIM_ERROR_TEXT.claimed_by_other, 'claimed_by_other');
        throw err;
      }
      resetClaimFeedCache();
      void postClaimActivity(prisma, profile.id, CLAIM_STAKED_ACTIVITY, rock.id, 'staked');
      logger.info('Asteroid claim staked', { profileId: profile.id, asteroidId: rock.id, fee: created.fee, claimId: created.id });
      return NextResponse.json({ success: true, claim: claimRecordFromRow(created), fee: created.fee, upkeepPerMonth: created.upkeepPerMonth, cap: check.cap, claims: [...myClaims, created].map(claimRecordFromRow) });
    }

    // ── Phase C: propellant depots ─────────────────────────────────────────
    // deploy_depot: a depot hull at the field's parent takes one of the
    // field's finite slots (the unique activeKey settles the race).
    if (op === 'deploy_depot' || op === 'recall_depot' || op === 'stock_depot') {
      const fieldId = typeof body.fieldId === 'string' ? body.fieldId : '';
      const field = ASTEROID_FIELD_MAP.get(fieldId);
      if (!field) return badRequest(DEPOT_ERROR_TEXT.unknown_field, 'unknown_field');
      const existing = await findMyDepot(profile.id, fieldId);

      if (op === 'recall_depot') {
        if (!existing) return badRequest(DEPOT_ERROR_TEXT.no_depot, 'no_depot');
        const ok = await recallDepotRow(prisma, existing.id, now);
        logger.info('Propellant depot recalled', { profileId: profile.id, fieldId, ok });
        return NextResponse.json({ success: true, recalled: ok, fieldId, depots: (await loadMyDepots(profile.id)).map(depotRecordFromRow) });
      }

      if (op === 'deploy_depot') {
        const shipInstanceId = parseInstanceId(body.shipInstanceId);
        if (!shipInstanceId) return badRequest('shipInstanceId is required', 'invalid_ship');
        const shipView = registry.ships.ships.find(sh => sh.instanceId === shipInstanceId);
        if (!shipView || !shipView.isBuilt) return badRequest('That hull is not a built ship in the corporate registry.', 'unknown_ship');
        const shipDef = SHIP_MAP.get(shipView.definitionId);
        const liveOrders = await loadLiveOrders(profile.id);
        const persistedShip = Array.isArray(profile.shipsData)
          ? (profile.shipsData as Array<{ instanceId?: string; currentLocation?: string }>).find(sh => sh?.instanceId === shipInstanceId)
          : undefined;
        const at = resolveShipLocation(shipInstanceId, liveOrders, persistedShip?.currentLocation ?? null, registry.rows.find(r => r.kind === ASSET_KIND_SHIP && r.instanceId === shipInstanceId)?.locationId ?? null);
        const check = checkDeployDepot({
          fieldId,
          depotCapacity: shipDef?.depotCapacity ?? 0,
          shipLocationId: at,
          shipBusy: liveOrders.some(o => o.shipInstanceId === shipInstanceId && o.status === MINING_ORDER_PENDING),
          shipAlreadyDeployed: (await loadMyDepots(profile.id)).some(d => d.shipInstanceId === shipInstanceId),
          takenSlots: await loadFieldDepotSlots(fieldId),
        });
        if (!check.ok) return badRequest(DEPOT_ERROR_TEXT[check.error], check.error, { slots: depotSlotsForFieldId(fieldId) });
        let created;
        try {
          created = await createDepotRow(prisma, profile.id, fieldId, check.slotIndex, shipInstanceId, check.capacity, now);
        } catch (err) {
          if ((err as { code?: string })?.code === 'P2002') return badRequest(DEPOT_ERROR_TEXT.field_full, 'field_full');
          throw err;
        }
        logger.info('Propellant depot deployed', { profileId: profile.id, fieldId, slot: check.slotIndex });
        return NextResponse.json({ success: true, depot: depotRecordFromRow(created), depots: (await loadMyDepots(profile.id)).map(depotRecordFromRow) });
      }

      // stock_depot — cash delivery or locally refined feedstock.
      if (!existing) return badRequest(DEPOT_ERROR_TEXT.no_depot, 'no_depot');
      const source = body.source === 'feedstock' ? 'feedstock' : 'cash';
      const units = Math.floor(Number(body.units));
      if (!Number.isFinite(units) || units < 1 || units > DEPOT_MAX_RESTOCK_UNITS) return badRequest(DEPOT_ERROR_TEXT.invalid_units, 'invalid_units');
      const room = Math.max(0, existing.capacity - existing.stockUnits);
      if (room <= 0) return badRequest(DEPOT_ERROR_TEXT.depot_full, 'depot_full');
      const want = Math.min(units, Math.floor(room));
      if (source === 'cash') {
        const cost = await depotRestockCost(fieldId, want);
        if (!Number.isFinite(profile.money) || profile.money < cost.total) return fundsError(cost.total, profile.money, `${want} units of propellant delivered to ${field.name}`);
        let loaded = 0;
        try {
          loaded = await prisma.$transaction(async (tx) => {
            const n = await addDepotStock(tx, existing, want);
            if (n > 0) await debitMoney(tx, profile.id, Math.round(cost.perUnit * n), 'depot_restock', `${existing.id}:${now.getTime()}`, ledgerOn);
            return n;
          });
        } catch (err) {
          if (err instanceof InsufficientFundsError) return fundsError(cost.total, profile.money, 'the propellant delivery');
          throw err;
        }
        logger.info('Depot restocked for cash', { profileId: profile.id, fieldId, loaded, perUnit: cost.perUnit });
        return NextResponse.json({ success: true, loaded, perUnit: cost.perUnit, cost: Math.round(cost.perUnit * loaded), depots: (await loadMyDepots(profile.id)).map(depotRecordFromRow) });
      }
      // feedstock: consume a refinable volatile the corporation actually holds.
      const slug = typeof body.resourceSlug === 'string' ? body.resourceSlug : '';
      if (!DEPOT_FEEDSTOCK_YIELD[slug]) return badRequest('That resource is not depot feedstock.', 'invalid_feedstock');
      const needed = feedstockForPropellant(slug, want);
      const held = await resolveSellableQuantity(profile, slug);
      if (held.held < needed) return badRequest(`${DEPOT_ERROR_TEXT.insufficient_feedstock} ${needed} units of ${slug} needed, ${Math.floor(held.held)} held.`, 'insufficient_feedstock', { needed, held: Math.floor(held.held) });
      const gained = feedstockPropellant(slug, needed);
      const loadedUnits = await prisma.$transaction(async (tx) => {
        const n = await addDepotStock(tx, existing, gained);
        if (n > 0) await ledgerResources(tx, profile.id, { [slug]: -feedstockForPropellant(slug, n) }, 'depot_feedstock', `${existing.id}:${now.getTime()}`, ledgerOn);
        return n;
      });
      logger.info('Depot restocked with feedstock', { profileId: profile.id, fieldId, slug, loadedUnits });
      return NextResponse.json({ success: true, loaded: loadedUnits, feedstock: slug, consumed: feedstockForPropellant(slug, loadedUnits), depots: (await loadMyDepots(profile.id)).map(depotRecordFromRow) });
    }

    // ── Phase C: survey reports ────────────────────────────────────────────
    if (op === 'list_report' || op === 'unlist_report') {
      const asteroidId = typeof body.asteroidId === 'string' ? body.asteroidId : '';
      const rock = getAsteroid(asteroidId);
      if (!rock) return badRequest(REPORT_ERROR_TEXT.unknown_rock, 'unknown_rock');
      if (op === 'unlist_report') {
        const ok = await unlistReportRow(prisma, profile.id, rock.id);
        return NextResponse.json({ success: true, unlisted: ok, reports: await loadMyReports(profile.id) });
      }
      const row = await loadAsteroidRow(rock.id);
      if (!row) return NextResponse.json({ error: 'The asteroid catalogue has not been seeded on this world yet.', code: 'catalogue_not_seeded' }, { status: 503 });
      const survey = await findSurvey(profile.id, rock.id);
      const check = checkListReport({
        rock,
        intel: survey ? intelFromRow(row) : null,
        surveyEffective: !!survey && surveyIsEffective(survey, row.generation, now),
        exhausted: !!row.exhaustedAt || row.reserve <= 0,
        price: Math.floor(Number(body.price)),
      });
      if (!check.ok) return badRequest(REPORT_ERROR_TEXT[check.error], check.error, { bounds: check.bounds ?? reportPriceBounds(rock, intelFromRow(row)) });
      const ok = await listReportRow(prisma, profile.id, rock.id, check.price, now);
      logger.info('Survey report listed', { profileId: profile.id, asteroidId: rock.id, price: check.price });
      return NextResponse.json({ success: true, listed: ok, price: check.price, bounds: check.bounds, reports: await loadMyReports(profile.id) });
    }

    if (op === 'buy_report') {
      const reportId = typeof body.reportId === 'string' ? body.reportId : '';
      const report = reportId ? await findReportById(reportId) : null;
      if (!report) return badRequest(REPORT_ERROR_TEXT.not_listed, 'not_listed');
      const rock = getAsteroid(report.asteroidId);
      const row = rock ? await loadAsteroidRow(rock.id) : null;
      if (!rock || !row) return badRequest(REPORT_ERROR_TEXT.unknown_rock, 'unknown_rock');
      const sellerEffective = surveyIsEffective({ surveyedAt: report.surveyedAt, generation: report.generation }, row.generation, now);
      if (!sellerEffective || row.exhaustedAt) return badRequest(REPORT_ERROR_TEXT.stale_survey, 'stale_survey');
      const mySurvey = await findSurvey(profile.id, rock.id);
      const check = checkBuyReport({
        rock,
        listed: report.listedPrice != null,
        price: report.listedPrice ?? 0,
        sellerIsMe: report.profileId === profile.id,
        buyerAlreadySurveyed: !!mySurvey && surveyIsEffective(mySurvey, row.generation, now),
        money: profile.money,
      });
      if (!check.ok) {
        if (check.error === 'insufficient_funds') return fundsError(report.listedPrice ?? 0, profile.money, `the survey report on ${rock.name}`);
        return badRequest(REPORT_ERROR_TEXT[check.error], check.error);
      }
      try {
        await prisma.$transaction(async (tx) => {
          // The buyer pays the asking price; the seller banks it minus the
          // broker's cut, which is burned (the gap between the two rows).
          await debitMoney(tx, profile.id, check.price, 'survey_report_purchase', report.id, ledgerOn);
          await creditMoney(tx, report.profileId, reportSellerProceeds(check.price), 'survey_report_sale', `${report.id}:${profile.id}`, ledgerOn);
          await tx.asteroidSurvey.upsert({
            where: { profileId_asteroidId: { profileId: profile.id, asteroidId: rock.id } },
            create: { profileId: profile.id, asteroidId: rock.id, surveyedAt: now, via: 'report', generation: report.generation },
            update: { surveyedAt: now, via: 'report', generation: report.generation },
          });
          await tx.asteroidSurvey.updateMany({ where: { id: report.id }, data: { soldCount: { increment: 1 } } });
        });
      } catch (err) {
        if (err instanceof InsufficientFundsError) return fundsError(check.price, profile.money, `the survey report on ${rock.name}`);
        throw err;
      }
      logger.info('Survey report bought', { profileId: profile.id, reportId: report.id, price: check.price });
      return NextResponse.json({
        success: true, asteroidId: rock.id, price: check.price, intel: intelFromRow(row),
        surveyedAtMs: now.getTime(), via: 'report',
        market: await loadReportMarket(prisma, now, profile.id),
      });
    }

    // ── order ──────────────────────────────────────────────────────────────
    if (op !== 'order') return badRequest('Unknown op', 'unknown_op');
    const instanceId = parseInstanceId(body.instanceId);
    if (!instanceId) return badRequest('instanceId is required', 'invalid_instance_id');
    const shipInstanceId = parseInstanceId(body.shipInstanceId);
    if (!shipInstanceId) return badRequest('shipInstanceId is required', 'invalid_ship');
    const mode = body.mode as MiningOrderMode;
    if (mode !== 'mine' && mode !== 'survey' && mode !== 'return' && mode !== 'refine') return badRequest('mode must be mine, survey, refine or return', 'invalid_mode');
    const thenActionRaw = body.thenAction;
    const thenAction: MiningThenAction | undefined = thenActionRaw === 'return_sell' || thenActionRaw === 'return_store' || thenActionRaw === 'hold' ? thenActionRaw : undefined;
    const originId = typeof body.originId === 'string' ? body.originId : '';
    const destinationRaw = typeof body.destinationId === 'string' ? body.destinationId : undefined;
    if (destinationRaw !== undefined && !LOCATION_MAP.has(destinationRaw)) return badRequest('Unknown destination', 'unknown_location');
    const escortRaw = typeof body.escortInstanceId === 'string' && body.escortInstanceId ? parseInstanceId(body.escortInstanceId) : null;

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
    // CC-2: the seated HQ's logistics terms from the PERSISTED seat column
    // (never the client's claim) — the same pure planner the preview ran.
    const hqLogistics = hqMiningLogisticsForLocationId(profile.hqLocationId);

    // Phase B: escort cover. An ASSIGNED escort must be a built security
    // hull in the registry, not on an order or escorting one, persisted at
    // the departure point or the field's parent. Otherwise STATIONED cover
    // from an idle unassigned cutter at the field's parent (checked again at
    // completion), or the Frontier shield.
    const frontier = now.getTime() - profile.createdAt.getTime() < FRONTIER_DURATION_MS;
    const resolveCover = async (parentLocationId: string): Promise<{ cover: EscortCover; escortInstanceId?: string } | NextResponse> => {
      if (escortRaw) {
        const esc = registry.ships.ships.find(s => s.instanceId === escortRaw);
        const escDef = esc ? SHIP_MAP.get(esc.definitionId) : undefined;
        const escPersisted = Array.isArray(profile.shipsData)
          ? (profile.shipsData as Array<{ instanceId?: string; currentLocation?: string; status?: string; escortingOrderId?: string }>).find(s => s?.instanceId === escortRaw)
          : undefined;
        const busy = orders.some(o => o.status === MINING_ORDER_PENDING && (o.escortInstanceId === escortRaw || o.shipInstanceId === escortRaw));
        const at = escPersisted?.currentLocation ?? null;
        if (!esc || !esc.isBuilt || !escDef?.security || busy || escPersisted?.escortingOrderId || (at !== originId && at !== parentLocationId)) {
          return badRequest(MINING_PLAN_ERROR_TEXT.escort_invalid, 'escort_invalid');
        }
        return { cover: 'assigned', escortInstanceId: escortRaw };
      }
      if (!frontier && await hasStationedEscortAt(prisma, profile.id, parentLocationId, orders)) return { cover: 'stationed' };
      return { cover: 'none' };
    };

    let plan;
    let rockRow: Awaited<ReturnType<typeof loadAsteroidRow>> = null;
    let heldOrderId: string | null = null;
    let escortInstanceId: string | undefined;
    // Phase C: the corporation's own depot at the order's field pays part of
    // the propellant bill. The units are DRAWN inside the transaction below;
    // this is only the quote input.
    let depot: Awaited<ReturnType<typeof findMyDepot>> = null;
    let sweepTargets: string[] = [];
    if (mode === 'refine' && !body.asteroidId) {
      // Refine what the hull is already holding, in place at the field.
      const held = orders.find(o => o.shipInstanceId === shipInstanceId && o.status === MINING_ORDER_HELD);
      if (!held) return badRequest(MINING_PLAN_ERROR_TEXT.nothing_to_refine, 'nothing_to_refine');
      if (held.refined) return badRequest(MINING_PLAN_ERROR_TEXT.nothing_to_refine, 'nothing_to_refine');
      heldOrderId = held.id;
      const parentId = ASTEROID_FIELD_MAP.get(held.fieldId)?.parentLocationId || originId;
      depot = await findMyDepot(profile.id, held.fieldId);
      const cover = thenAction && thenAction !== 'hold' ? await resolveCover(parentId) : { cover: 'none' as EscortCover };
      if (cover instanceof NextResponse) return cover;
      escortInstanceId = cover.escortInstanceId;
      plan = planMiningOrder({
        def, cargoCapacity, mode: 'refine', originId,
        destinationId: destinationRaw, thenAction,
        heldOre: { oreId: held.oreId, units: held.fillUnits, asteroidId: held.asteroidId, fieldId: held.fieldId },
        hullDamagePct, fuelEfficiencyMult, hqLogistics, nowMs: now.getTime(),
        depotStockUnits: depot?.stockUnits ?? 0, refineRecovery: MOBILE_REFINERY_RECOVERY,
        escortCover: cover.cover, escortInstanceId: cover.escortInstanceId, frontier,
      });
    } else if (mode === 'return') {
      const held = orders.find(o => o.shipInstanceId === shipInstanceId && o.status === MINING_ORDER_HELD);
      if (!held) return badRequest(MINING_PLAN_ERROR_TEXT.nothing_held, 'nothing_held');
      heldOrderId = held.id;
      const parentId = ASTEROID_FIELD_MAP.get(held.fieldId)?.parentLocationId || originId;
      const cover = await resolveCover(parentId);
      if (cover instanceof NextResponse) return cover;
      escortInstanceId = cover.escortInstanceId;
      depot = await findMyDepot(profile.id, held.fieldId);
      plan = planMiningOrder({
        def, cargoCapacity, mode: 'return', originId,
        destinationId: destinationRaw || 'earth_surface', thenAction,
        heldOre: { oreId: held.oreId, units: held.fillUnits, asteroidId: held.asteroidId, fieldId: held.fieldId, ...(held.refined ? { refined: true } : {}) },
        hullDamagePct, fuelEfficiencyMult, hqLogistics, nowMs: now.getTime(),
        depotStockUnits: depot?.stockUnits ?? 0, refineRecovery: MOBILE_REFINERY_RECOVERY,
        escortCover: cover.cover, escortInstanceId: cover.escortInstanceId, frontier,
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
      if ((mode === 'mine' || mode === 'refine') && (rockRow.exhaustedAt || rockRow.reserve <= 0)) return badRequest(MINING_PLAN_ERROR_TEXT.rock_exhausted, 'rock_exhausted');
      const survey = await findSurvey(profile.id, rock.id);
      const surveyed = !!survey && surveyIsEffective(survey, rockRow.generation, now);
      const intel = surveyed ? intelFromRow(rockRow) : null;
      const fillUnits = Number.isFinite(Number(body.fillUnits)) ? Math.floor(Number(body.fillUnits)) : cargoCapacity;
      // Phase B: exclusivity (the holder mines it alone; anyone else is
      // refused) and the public activity count for the pressure quote.
      const claim = (mode === 'mine' || mode === 'refine') ? await loadActiveClaim(rock.id) : null;
      const claimedByOther = !!claim && claim.profileId !== profile.id;
      const claimed = !!claim && claim.profileId === profile.id;
      if ((mode === 'mine' || mode === 'refine') && claimedByOther) return badRequest(MINING_PLAN_ERROR_TEXT.rock_claimed, 'rock_claimed');
      let sharedMiners = 1;
      if ((mode === 'mine' || mode === 'refine') && !claimed) {
        try {
          const others = await prisma.miningOrder.findMany({ where: { asteroidId: rock.id, mode: 'mine', status: MINING_ORDER_PENDING, profileId: { not: profile.id } }, select: { profileId: true }, distinct: ['profileId'], take: 200 });
          sharedMiners = 1 + others.length;
        } catch { sharedMiners = 1; }
      }
      depot = await findMyDepot(profile.id, field.id);
      // A sweep hull (Survey Cruiser) reveals several rocks per pass; the
      // SERVER picks which, from its own view of what is unsurveyed.
      if (mode === 'survey' && (def.surveySweep ?? 1) > 1) {
        sweepTargets = await pickSweepTargets(profile.id, field.id, rock.id, (def.surveySweep ?? 1) - 1, prisma, now);
      }
      let cover: { cover: EscortCover; escortInstanceId?: string } = { cover: 'none' };
      if ((mode === 'mine' || mode === 'refine') && thenAction !== 'hold') {
        const resolved = await resolveCover(field.parentLocationId);
        if (resolved instanceof NextResponse) return resolved;
        cover = resolved;
        escortInstanceId = resolved.escortInstanceId;
      }
      plan = planMiningOrder({
        def, cargoCapacity, mode, rock, intel,
        // An unsurveyed rock is still bounded by its true reserve — clamp
        // silently (the client learns the real fill from the response).
        fillUnits: (mode === 'mine' || mode === 'refine') ? Math.min(fillUnits, Math.max(1, Math.floor(rockRow.reserve))) : 0,
        thenAction, originId, destinationId: destinationRaw,
        hullDamagePct, fuelEfficiencyMult, hqLogistics, nowMs: now.getTime(),
        depotStockUnits: depot?.stockUnits ?? 0, refineRecovery: MOBILE_REFINERY_RECOVERY, sweepTargets,
        claimed, claimedByOther, sharedMiners, escortCover: cover.cover, escortInstanceId: cover.escortInstanceId, frontier,
      });
      if (mode === 'survey' && surveyed) return badRequest('That rock is already surveyed.', 'already_surveyed');
    }
    if (!plan.ok) return badRequest(MINING_PLAN_ERROR_TEXT[plan.error], plan.error);
    const order = plan.order;
    // The cash bill is the fuel the depot did NOT cover, plus the refining
    // opex. Quoted with the depot's stock; if the draw loses a race below the
    // full fuel price is charged instead.
    const fuelFull = plan.fuelBeforeDepot;
    const opexDue = plan.refineOpex;
    const quotedDepotUnits = plan.depotUnitsDrawn;
    const quotedDepotCovered = plan.depotCovered;
    const planOutputs = plan.outputs;
    const planSummary = { transitOutSeconds: plan.transitOutSeconds, extractionSeconds: plan.extractionSeconds, refiningSeconds: plan.refiningSeconds, transitBackSeconds: plan.transitBackSeconds, expectedValue: plan.expectedValue };
    if (!Number.isFinite(profile.money) || profile.money < order.fuelCost + opexDue) return fundsError(order.fuelCost + opexDue, profile.money, `${shipView.name} fuel`);

    let created: { id: string };
    let depotDrawn = 0;
    try {
      created = await prisma.$transaction(async (tx) => {
        // Phase C: draw the depot's propellant FIRST. A lost race (someone
        // else's order emptied the tank) just means this order pays cash.
        const wantDraw = depot ? quotedDepotUnits : 0;
        const drew = wantDraw > 0 && depot ? await drawDepotFuel(tx, depot.id, wantDraw) : false;
        depotDrawn = drew ? wantDraw : 0;
        const fuelCharged = drew ? order.fuelCost : fuelFull;
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
            fuelPaid: fuelCharged,
            ratePerHour: order.ratePerHour,
            surveyed: order.surveyed,
            status: MINING_ORDER_PENDING,
            escortInstanceId: escortInstanceId ?? null,
            pressureShare: order.pressureShare ?? 1,
            refined: !!order.refined,
            refineEndsAt: order.refineEndsAtMs ? new Date(order.refineEndsAtMs) : null,
            refineOpexPaid: opexDue,
            depotId: drew && depot ? depot.id : null,
            depotUnitsDrawn: depotDrawn,
          },
          select: { id: true },
        });
        await debitMoney(tx, profile.id, fuelCharged, 'mining_order_fuel', row.id, ledgerOn);
        // Refining opex: power, reagents and slag handling. Burned.
        if (opexDue > 0) await debitMoney(tx, profile.id, opexDue, 'refining_opex', row.id, ledgerOn);
        if (order.mode === 'survey' && order.asteroidId) {
          const gen = rockRow?.generation ?? 0;
          // A single-rock survey reveals on ARRIVAL (Phase A); a sweep works
          // the field and reveals when the PASS ENDS — either way the reveal
          // cannot be claimed before the hull has done the work.
          const sweep = (order.sweepAsteroidIds || []).length > 1;
          const stamp = new Date(sweep ? order.completesAtMs : order.arrivesAtMs);
          await tx.asteroidSurvey.upsert({
            where: { profileId_asteroidId: { profileId: profile.id, asteroidId: order.asteroidId } },
            create: { profileId: profile.id, asteroidId: order.asteroidId, surveyedAt: stamp, via: 'ship', generation: gen },
            update: { surveyedAt: stamp, via: 'ship', generation: gen },
          });
          const extra = (order.sweepAsteroidIds || []).filter(id => id !== order.asteroidId);
          if (extra.length > 0) {
            const gens = await tx.asteroid.findMany({ where: { id: { in: extra } }, select: { id: true, generation: true } });
            for (const g of gens) {
              await tx.asteroidSurvey.upsert({
                where: { profileId_asteroidId: { profileId: profile.id, asteroidId: g.id } },
                create: { profileId: profile.id, asteroidId: g.id, surveyedAt: stamp, via: 'ship', generation: g.generation },
                update: { surveyedAt: stamp, via: 'ship', generation: g.generation },
              });
            }
          }
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

    logger.info('Mining order placed', { profileId: profile.id, orderId: created.id, instanceId, shipInstanceId, mode, asteroidId: order.asteroidId, fillUnits: order.fillUnits, fuel: order.fuelCost, refined: !!order.refined, depotDrawn });
    return NextResponse.json({
      success: true,
      instanceId,
      order: { ...order },
      // A survey order returns the reveal now; the client applies it on
      // arrival (the survey row is stamped with the arrival time).
      intel: order.mode === 'survey' && rockRow ? intelFromRow(rockRow) : undefined,
      transitOutSeconds: planSummary.transitOutSeconds,
      extractionSeconds: planSummary.extractionSeconds,
      refiningSeconds: planSummary.refiningSeconds,
      transitBackSeconds: planSummary.transitBackSeconds,
      expectedValue: planSummary.expectedValue,
      outputs: planOutputs,
      refineOpex: opexDue,
      depotCovered: depotDrawn > 0 ? quotedDepotCovered : 0,
      depotUnitsDrawn: depotDrawn,
      depots: (await loadMyDepots(profile.id)).map(depotRecordFromRow),
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
    const [orders, intel, probes, block, depots, publicDepots, reports, reportMarket] = await Promise.all([
      loadLiveOrders(profile.id).catch(() => []),
      loadSurveyedIntel(profile.id).catch(() => ({})),
      countProbes(profile.id).catch(() => 0),
      loadMiningBlock(profile.id).catch(() => null),
      // Phase C: the corporation's depots + reports, and the public register.
      loadMyDepots(profile.id).catch(() => []),
      loadPublicDepots().catch(() => []),
      loadMyReports(profile.id).catch(() => []),
      loadReportMarket(prisma, new Date(), profile.id).catch(() => []),
    ]);
    return NextResponse.json({
      settled,
      probes,
      intel,
      depots: depots.map(depotRecordFromRow),
      publicDepots,
      reports,
      reportMarket,
      // Phase B: claims + notices (the same block the sync delivers).
      claims: block?.claims ?? [],
      notices: block?.notices ?? [],
      orders: orders.map(o => ({
        instanceId: o.instanceId, shipInstanceId: o.shipInstanceId, mode: o.mode, status: o.status,
        asteroidId: o.asteroidId, fieldId: o.fieldId, oreId: o.oreId, fillUnits: o.fillUnits, thenAction: o.thenAction,
        originId: o.originId, destinationId: o.destinationId,
        startedAtMs: o.startedAt.getTime(), arrivesAtMs: o.arrivesAt.getTime(), miningEndsAtMs: o.miningEndsAt.getTime(), completesAtMs: o.completesAt.getTime(),
        fuelCost: o.fuelPaid, ratePerHour: o.ratePerHour, surveyed: o.surveyed,
        escortInstanceId: o.escortInstanceId, pressureShare: o.pressureShare,
        refined: o.refined, refineEndsAtMs: o.refineEndsAt ? o.refineEndsAt.getTime() : undefined,
      })),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    logger.error('Asset mining GET error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
