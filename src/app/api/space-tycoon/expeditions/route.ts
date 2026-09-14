import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  ASSET_KIND_RESEARCH, ASSET_KIND_SHIP, LIVE_SHIP_STATUSES,
  ensureAssetAdoption, ensureAssetAdoption2, loadServerRegistry, rowsOfKind,
} from '@/lib/game/server-assets';
import {
  InsufficientFundsError, badRequest, debitMoney, findLedgerSeq, fundsError, loadAssetProfile,
} from '@/lib/game/asset-route-shared';
import { isLedgerAvailable } from '@/lib/game/server-ledger';
import { INTERSTELLAR_SYSTEM_MAP, getJumpPrerequisites } from '@/lib/game/interstellar';
import { SHIP_MAP, getShipDerivedStats } from '@/lib/game/ships';
import { getMegaProjectBonuses, getLaunchCostMultiplier } from '@/lib/game/mega-projects';
import {
  COLONY_CAPABLE_SHIP_IDS, EXPEDITION_CAPABLE_SHIP_IDS, quoteExpeditionCosts,
} from '@/lib/game/expeditions';
import {
  ExpeditionReportError, advanceDueExpeditions, createExpeditionRow, expeditionBlock,
  loadExpeditions, loadLiveExpeditions, reportExpeditionOutcome,
  type ReportedExpeditionOutcome,
} from '@/lib/game/server-expeditions';

export const dynamic = 'force-dynamic';

/**
 * /api/space-tycoon/expeditions — the server record for interstellar
 * expeditions (CC-4, docs/COMMAND_CENTER_DESIGN_2026-09-13.md §3).
 *
 * Expeditions used to exist only in the client save, which left the
 * interstellar HQ rung gated on a proxy and the $8-17B survey payout with
 * no server counterpart for the sync's money ceiling. This route gives them
 * the authority Mining Orders and HQ relocations already have, in the same
 * shape as /assets/mining: session → profile → validate against PERSISTED
 * facts only → one transaction that inserts the row and debits the launch
 * bill through the One-Wallet ledger. Advancement is the clock's
 * (assets-complete cron → server-expeditions.ts advanceDueExpeditions);
 * completion is never something a client can claim.
 *
 * GET  → every expedition row this corporation owns (the client adopts them
 *        with expeditions.ts adoptServerExpeditions).
 * POST { action: 'launch', targetSystemId, shipInstanceId, insured,
 *        extraShielding, clientId? }
 *      → validates the jump prerequisites from the ServerAsset research
 *        rows, the hull from the ship rows, the crew from the persisted
 *        workforce, quotes the bill with the SAME pure function the client
 *        planner uses (expeditions.ts quoteExpeditionCosts), debits it and
 *        creates the row. The SEED is issued here, so both sides roll the
 *        identical survey outcome.
 * POST { action: 'report', expeditionId, outcome: 'lost' | 'colonized' }
 *      → the two terminal facts only the client can compute, accepted
 *        downward only and never ahead of the server's clock.
 */
export async function GET() {
  try {
    const loaded = await loadAssetProfile('expeditions');
    if (loaded.response) return loaded.response;
    const profile = loaded.profile;
    await advanceDueExpeditions(prisma, profile.id);
    const rows = await loadExpeditions(profile.id, prisma);
    return NextResponse.json({ success: true, expeditions: rows.map(expeditionBlock), fetchedAt: new Date().toISOString() });
  } catch (error) {
    logger.error('Expeditions GET error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const loaded = await loadAssetProfile('expeditions');
    if (loaded.response) return loaded.response;
    const profile = loaded.profile;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') return badRequest('Invalid body', 'invalid_body');
    const action = typeof body.action === 'string' ? body.action : 'launch';

    if (action === 'report') return handleReport(profile.id, body);
    if (action !== 'launch') return badRequest('Unknown action', 'unknown_action');

    // ── Launch ────────────────────────────────────────────────────────────
    const targetSystemId = typeof body.targetSystemId === 'string' ? body.targetSystemId : '';
    const shipInstanceId = typeof body.shipInstanceId === 'string' ? body.shipInstanceId : '';
    const insured = body.insured === true;
    const extraShielding = body.extraShielding === true;
    const clientId = typeof body.clientId === 'string' && body.clientId.length > 0 && body.clientId.length <= 64 ? body.clientId : null;

    const system = INTERSTELLAR_SYSTEM_MAP.get(targetSystemId);
    if (!system) return badRequest('Unknown star system', 'unknown_system');
    if (!shipInstanceId) return badRequest('No ship named', 'ship_not_found');

    // Settle anything already due so "this hull is busy" is a live fact.
    await advanceDueExpeditions(prisma, profile.id);

    let registry;
    try {
      await ensureAssetAdoption(profile, prisma);
      await ensureAssetAdoption2(profile, prisma);
      registry = await loadServerRegistry(profile.id, profile, { mode: 'shadow' });
    } catch (err) {
      logger.error('Asset registry unavailable (expeditions)', { error: String(err) });
      return NextResponse.json({ error: 'Asset registry unavailable', code: 'registry_unavailable' }, { status: 503 });
    }

    // Jump prerequisites from the registry's COMPLETE research rows, never
    // from the client's claim.
    const research = rowsOfKind(registry.rows, ASSET_KIND_RESEARCH).filter(r => r.status === 'complete').map(r => r.definitionId);
    const missing = getJumpPrerequisites(system.id, research);
    if (missing.length > 0) {
      return NextResponse.json({ error: `Jump prerequisites incomplete: ${missing.join(', ')}.`, code: 'missing_prerequisites', missing }, { status: 400 });
    }

    // The hull: a live ship row this corporation owns, of a definition that
    // can leave the heliosphere.
    const shipRow = rowsOfKind(registry.rows, ASSET_KIND_SHIP)
      .find(r => r.instanceId === shipInstanceId && LIVE_SHIP_STATUSES.includes(r.status));
    if (!shipRow) return NextResponse.json({ error: 'That hull is not in your fleet.', code: 'ship_not_found' }, { status: 404 });
    if (shipRow.status !== 'complete') return NextResponse.json({ error: 'That hull is still being built.', code: 'ship_not_built' }, { status: 409 });
    if (!(EXPEDITION_CAPABLE_SHIP_IDS as readonly string[]).includes(shipRow.definitionId)) {
      return NextResponse.json({ error: 'That hull cannot leave the heliosphere.', code: 'ship_not_expedition_capable' }, { status: 400 });
    }
    const shipDef = SHIP_MAP.get(shipRow.definitionId);
    if (!shipDef) return NextResponse.json({ error: 'Unknown hull.', code: 'ship_not_found' }, { status: 404 });

    const live = await loadLiveExpeditions(profile.id, prisma);
    if (live.some(e => e.shipInstanceId === shipInstanceId)) {
      return NextResponse.json({ error: 'That hull is already away on an expedition.', code: 'ship_busy' }, { status: 409 });
    }

    // Crew from the PERSISTED workforce column.
    const crewRequired = getShipDerivedStats(shipDef).crewRequired;
    const wf = profile.workforceData && typeof profile.workforceData === 'object' && !Array.isArray(profile.workforceData)
      ? profile.workforceData as Record<string, unknown> : {};
    const headcount = ['pilots', 'scientists', 'engineers', 'operators', 'miners']
      .reduce((n, k) => n + (typeof wf[k] === 'number' && Number.isFinite(wf[k] as number) && (wf[k] as number) > 0 ? (wf[k] as number) : 0), 0);
    if (headcount < crewRequired) {
      return NextResponse.json({ error: `Requires ${crewRequired} crew from your workforce.`, code: 'insufficient_crew', crewRequired, headcount }, { status: 409 });
    }

    const isColonyShip = (COLONY_CAPABLE_SHIP_IDS as readonly string[]).includes(shipRow.definitionId);
    const fresh = await prisma.gameProfile.findUnique({ where: { id: profile.id }, select: { money: true, resources: true } });
    const persistedResources = fresh?.resources && typeof fresh.resources === 'object' && !Array.isArray(fresh.resources)
      ? fresh.resources as Record<string, unknown> : {};
    const fuelInInventory = typeof persistedResources.exotic_fuel === 'number' && Number.isFinite(persistedResources.exotic_fuel)
      ? Math.max(0, persistedResources.exotic_fuel as number) : 0;

    // The Space Elevator discount is WORLD-shared (one MegaProject row per
    // type — the sync reads it the same way), so the server can price it
    // itself rather than trusting a client-claimed multiplier.
    let launchCostMult = 1;
    try {
      const completed = await prisma.megaProject.findMany({ where: { status: 'completed' }, select: { projectType: true } });
      if (completed.length > 0) {
        launchCostMult = getLaunchCostMultiplier({ megaProjectBonuses: getMegaProjectBonuses(completed.map(p => p.projectType)) });
      }
    } catch { /* table may lag — no discount, matches pre-E7 */ }

    const quote = quoteExpeditionCosts({
      system, shipBaseCost: shipDef.baseCost, isColonyShip, fuelInInventory, insured, extraShielding, launchCostMult,
    });
    const money = fresh?.money ?? profile.money;
    if (!Number.isFinite(money) || money < quote.totalMoneyCost) {
      return fundsError(quote.totalMoneyCost, money, `an expedition to ${system.name}`);
    }

    // The seed is the SERVER's. Both sides roll the identical survey outcome
    // from it (expeditions.ts rollExpeditionOutcome), which is what makes
    // the payout a shared figure rather than a client claim.
    const seed = Math.floor(Math.random() * 0xffffffff) >>> 0;
    const ledgerOn = await isLedgerAvailable();
    const now = new Date();
    let created;
    try {
      created = await prisma.$transaction(async (tx) => {
        const row = await createExpeditionRow(tx, {
          profileId: profile.id,
          clientId,
          targetSystemId: system.id,
          shipInstanceId,
          shipDefinitionId: shipRow.definitionId,
          colonyShip: isColonyShip,
          seed,
          outboundMonths: quote.outboundMonths,
          exploreMonths: quote.exploreMonths,
          launchCost: quote.totalMoneyCost,
          now,
        });
        await debitMoney(tx, profile.id, quote.totalMoneyCost, 'expedition_launch', row.id, ledgerOn);
        if (ledgerOn) {
          const seq = await findLedgerSeq(tx, profile.id, 'expedition_launch', row.id);
          if (seq !== null) await tx.expedition.update({ where: { id: row.id }, data: { ledgerSeq: seq } });
        }
        return row;
      });
    } catch (err) {
      if (err instanceof InsufficientFundsError) return fundsError(quote.totalMoneyCost, money, `an expedition to ${system.name}`);
      throw err;
    }

    logger.info('Expedition launched', {
      profileId: profile.id, expeditionId: created.id, targetSystemId: system.id,
      shipDefinitionId: shipRow.definitionId, cost: quote.totalMoneyCost,
      arrivesAt: created.arrivesAt.toISOString(), returnsAt: created.returnsAt?.toISOString() ?? null,
    });
    return NextResponse.json({
      success: true,
      expedition: expeditionBlock(created),
      seed,
      costs: quote,
      // The client applies the launch locally WITHOUT its own money debit —
      // this row comes back as an ordinary pending ledger delta on the next
      // sync (expeditions.ts ServerBackedLaunchOpts).
      serverCharged: true,
    });
  } catch (error) {
    logger.error('Expeditions POST error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleReport(profileId: string, body: Record<string, unknown>): Promise<NextResponse> {
  const expeditionId = typeof body.expeditionId === 'string' ? body.expeditionId : '';
  const outcome = body.outcome;
  if (!expeditionId) return badRequest('No expedition named', 'invalid_body');
  if (outcome !== 'lost' && outcome !== 'colonized') return badRequest('Unknown outcome', 'invalid_outcome');
  try {
    const row = await reportExpeditionOutcome(prisma, profileId, expeditionId, outcome as ReportedExpeditionOutcome);
    return NextResponse.json({ success: true, expedition: expeditionBlock(row) });
  } catch (err) {
    if (err instanceof ExpeditionReportError) {
      const status = err.code === 'not_found' ? 404 : err.code === 'invalid_outcome' ? 400 : 409;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    throw err;
  }
}
