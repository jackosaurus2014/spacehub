import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { SHIP_MAP } from '@/lib/game/ships';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { getMegaProjectBonuses } from '@/lib/game/mega-projects';
import { MAX_SHIPYARD_SLOTS } from '@/lib/game/shipyard-slots';
import { isLedgerAvailable } from '@/lib/game/server-ledger';
import { loadAuthoritativeInventory } from '@/lib/game/server-inventory';
import {
  ASSET_KIND_SHIP,
  computeServerShipCost,
  computeServerShipDuration,
  ensureAssetAdoption,
  ensureAssetAdoption2,
  loadServerRegistry,
} from '@/lib/game/server-assets';
import {
  InsufficientFundsError,
  badRequest,
  debitMoney,
  findLedgerSeq,
  fundsError,
  ledgerResources,
  loadAssetProfile,
  parseInstanceId,
} from '@/lib/game/asset-route-shared';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/assets/ship — order a ship hull server-side.
 * Body: { definitionId, locationId, instanceId } (instanceId is the client's
 * own ship id — retry-safe).
 *
 * docs/SECURITY_AUDIT_2026-09.md "Phase 3 slices 2-5" (slice 3). Validates
 * the definition, its requiredResearch against the registry's research
 * view, the build location (unlocked per the registry's location
 * projection) and a hard shipyard cap (pending hulls < MAX_SHIPYARD_SLOTS —
 * the exact per-tier slot count stays a client-owned condition; the cap
 * bounds it). Prices with mega-projects.ts applyLaunchCostReduction on the
 * world's completed mega-projects, verifies `def.resourceCost` against the
 * authoritative inventory, debits money + resources through the ledger
 * (ship_build / ship_build_resources) and inserts a pending row with
 * completesAt = now + def.buildTimeSeconds (identical on both sides).
 *
 * Client-owned condition, never written here: the ship's name, status,
 * currentLocation after departure, route, cargo, mining / survey
 * operations and hull damage.
 */
export async function POST(request: NextRequest) {
  try {
    const loaded = await loadAssetProfile();
    if (loaded.response) return loaded.response;
    const profile = loaded.profile;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') return badRequest('Invalid body', 'invalid_body');
    const definitionId = typeof body.definitionId === 'string' ? body.definitionId : '';
    const locationId = typeof body.locationId === 'string' ? body.locationId : 'earth_surface';
    const instanceId = parseInstanceId(body.instanceId);
    if (!instanceId) return badRequest('instanceId is required', 'invalid_instance_id');
    const def = SHIP_MAP.get(definitionId);
    if (!def) return badRequest('Unknown ship definition', 'unknown_definition');
    if (!LOCATION_MAP.has(locationId)) return badRequest('Unknown location', 'unknown_location');

    let registry;
    try {
      await ensureAssetAdoption(profile, prisma);
      await ensureAssetAdoption2(profile, prisma);
      registry = await loadServerRegistry(profile.id, profile, { mode: 'shadow' });
    } catch (err) {
      logger.error('Asset registry unavailable', { error: String(err) });
      return NextResponse.json({ error: 'Asset registry unavailable', code: 'registry_unavailable' }, { status: 503 });
    }

    const existing = registry.rows.find(r => r.kind === ASSET_KIND_SHIP && r.instanceId === instanceId);
    if (existing) {
      return NextResponse.json({
        success: true, idempotent: true, instanceId,
        startedAtMs: existing.startedAt.getTime(),
        buildDurationSeconds: Math.max(0, Math.round((existing.completesAt.getTime() - existing.startedAt.getTime()) / 1000)),
        completesAt: existing.completesAt.toISOString(),
        cost: existing.paidMoney,
        resourceCost: existing.paidResources,
      });
    }

    const research = registry.research.completed;
    const missing = (def.requiredResearch || []).filter(r => !research.includes(r));
    if (missing.length > 0) return badRequest(`${def.name} requires research: ${missing.join(', ')}`, 'research_required', { missingResearch: missing });
    if (!registry.locations.unlocked.includes(locationId)) {
      return badRequest(`${LOCATION_MAP.get(locationId)?.name || locationId} is not unlocked on the server yet`, 'location_locked');
    }
    const pendingHulls = registry.rows.filter(r => r.kind === ASSET_KIND_SHIP && r.status === 'pending' && r.completesAt.getTime() > Date.now()).length;
    if (pendingHulls >= MAX_SHIPYARD_SLOTS) return badRequest('Every shipyard slot is busy', 'shipyard_full');

    // World mega-project bonuses (the sync's own lookup).
    let megaBonuses: { launchCostReduction: number } | null = null;
    try {
      const completed = await prisma.megaProject.findMany({ where: { status: 'completed' }, select: { projectType: true } });
      if (completed.length > 0) megaBonuses = getMegaProjectBonuses(completed.map(p => p.projectType));
    } catch { /* table may lag — no discount */ }

    const priced = computeServerShipCost(def, megaBonuses);
    const seconds = computeServerShipDuration(def);
    if (Object.keys(priced.resourceCost).length > 0) {
      const inventory = await loadAuthoritativeInventory(profile);
      for (const [slug, qty] of Object.entries(priced.resourceCost)) {
        if ((inventory.resources[slug] || 0) < qty) {
          return badRequest(`Not enough ${slug.replace(/_/g, ' ')} (${inventory.resources[slug] || 0}/${qty})`, 'insufficient_resources', { resource: slug, needed: qty, held: inventory.resources[slug] || 0 });
        }
      }
    }
    if (!Number.isFinite(profile.money) || profile.money < priced.cost) return fundsError(priced.cost, profile.money, def.name);

    const ledgerOn = await isLedgerAvailable();
    const now = new Date();
    const completesAt = new Date(now.getTime() + seconds * 1000);
    const negative: Record<string, number> = {};
    for (const [slug, qty] of Object.entries(priced.resourceCost)) negative[slug] = -qty;

    let created: { id: string };
    try {
      created = await prisma.$transaction(async (tx) => {
        const row = await tx.serverAsset.create({
          data: {
            profileId: profile.id,
            kind: ASSET_KIND_SHIP,
            definitionId: def.id,
            instanceId,
            locationId,
            status: 'pending',
            markLevel: 1,
            startedAt: now,
            completesAt,
            paidMoney: priced.cost,
            paidResources: priced.resourceCost,
          },
          select: { id: true },
        });
        await debitMoney(tx, profile.id, priced.cost, 'ship_build', row.id, ledgerOn);
        await ledgerResources(tx, profile.id, negative, 'ship_build_resources', row.id, ledgerOn);
        if (ledgerOn) {
          const seq = await findLedgerSeq(tx, profile.id, 'ship_build', row.id);
          if (seq !== null) await tx.serverAsset.update({ where: { id: row.id }, data: { ledgerSeq: seq } });
        }
        return row;
      });
    } catch (err) {
      if (err instanceof InsufficientFundsError) return fundsError(priced.cost, profile.money, def.name);
      throw err;
    }

    logger.info('Asset ship ordered', { profileId: profile.id, definitionId: def.id, locationId, instanceId, cost: priced.cost, seconds, rowId: created.id });
    return NextResponse.json({
      success: true,
      instanceId,
      startedAtMs: now.getTime(),
      buildDurationSeconds: seconds,
      completesAt: completesAt.toISOString(),
      cost: priced.cost,
      launchCostMultiplier: priced.launchCostMultiplier,
      resourceCost: priced.resourceCost,
    });
  } catch (error) {
    logger.error('Asset ship error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
