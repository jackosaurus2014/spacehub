import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { BUILDING_MAP, checkBuildingCap } from '@/lib/game/buildings';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { ORBITAL_SLOT_MAP } from '@/lib/game/spatial-strategy';
import { FRONTIER_DURATION_MS, FRONTIER_HARD_CAP_NET_WORTH } from '@/lib/game/frontier';
import { isLedgerAvailable } from '@/lib/game/server-ledger';
import { loadAuthoritativeInventory } from '@/lib/game/server-inventory';
import {
  ASSET_KIND_BUILDING,
  computeServerBuildCost,
  computeServerBuildDuration,
  countLiveAt,
  ensureAssetAdoption,
  ensureAssetAdoption2,
  loadServerRegistry,
  rowsOfKind,
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
 * POST /api/space-tycoon/assets/build — start a building server-side.
 * Body: { definitionId, locationId, instanceId } (instanceId is the client's
 * own id for the instance — retry-safe: a second POST with the same id
 * returns the existing row instead of charging twice).
 *
 * docs/SECURITY_AUDIT_2026-09.md "Phase 3 slice 1 — buildings". Validates
 * definition / location (requiredLocation) / research gate / maxPerPlayer
 * cap / location unlock / orbital-slot gate, prices the build SERVER-SIDE
 * (server-assets.ts computeServerBuildCost — the client's formula with the
 * server's count and the persisted research list), debits money and
 * resources through the One-Wallet ledger (building_build /
 * building_build_resources), and inserts the ServerAsset row (pending,
 * completesAt = now + the conservative server duration).
 *
 * Slices 2 + 5 ("Phase 3 slices 2-5"): the research gate and the build-cost
 * research reductions read the registry's research view
 * (loadServerRegistry — complete research rows ∪ the persisted list in
 * shadow), and the location gate reads its location projection
 * (STARTING_LOCATIONS ∪ ColonyClaim ∪ paid 'location' rows ∪ the persisted
 * list in shadow). ColonyClaim alone cannot be the gate: since the
 * 2026-09-01 hardening a claim REQUIRES a completed building at the
 * location, so the first building anywhere new would be impossible.
 */
export async function POST(request: NextRequest) {
  try {
    const loaded = await loadAssetProfile();
    if (loaded.response) return loaded.response;
    const profile = loaded.profile;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') return badRequest('Invalid body', 'invalid_body');
    const definitionId = typeof body.definitionId === 'string' ? body.definitionId : '';
    const locationId = typeof body.locationId === 'string' ? body.locationId : '';
    const instanceId = parseInstanceId(body.instanceId);
    if (!instanceId) return badRequest('instanceId is required', 'invalid_instance_id');

    const def = BUILDING_MAP.get(definitionId);
    if (!def) return badRequest('Unknown building definition', 'unknown_definition');
    if (!LOCATION_MAP.has(locationId)) return badRequest('Unknown location', 'unknown_location');
    if (def.requiredLocation !== locationId) {
      return badRequest(`${def.name} can only be built at ${def.requiredLocation.replace(/_/g, ' ')}`, 'wrong_location');
    }
    // Registry availability + one-time adoption of a pre-registry save.
    let registry;
    try {
      await ensureAssetAdoption(profile, prisma);
      await ensureAssetAdoption2(profile, prisma);
      registry = await loadServerRegistry(profile.id, profile, { mode: 'shadow' });
    } catch (err) {
      logger.error('Asset registry unavailable', { error: String(err) });
      return NextResponse.json({ error: 'Asset registry unavailable', code: 'registry_unavailable' }, { status: 503 });
    }
    const rows = rowsOfKind(registry.rows, ASSET_KIND_BUILDING);

    // Research gate + reductions: the registry's research view (slice 2).
    const research = registry.research.completed;
    const missing = (def.requiredResearch || []).filter(r => !research.includes(r));
    if (missing.length > 0) {
      return badRequest(`${def.name} requires research: ${missing.join(', ')}`, 'research_required', { missingResearch: missing });
    }

    // Location unlock: the registry's location projection (slice 5, see header).
    if (!registry.locations.unlocked.includes(locationId)) {
      return badRequest(
        `${LOCATION_MAP.get(locationId)?.name || locationId} is not unlocked on the server yet — unlock it from the map first.`,
        'location_locked',
      );
    }

    // Retry-safe: the same instanceId already exists → return it, no charge.
    const existing = rows.find(r => r.instanceId === instanceId);
    if (existing) {
      return NextResponse.json({
        success: true, idempotent: true, instanceId,
        startedAtMs: existing.startedAt.getTime(),
        realDurationSeconds: Math.max(0, Math.round((existing.completesAt.getTime() - existing.startedAt.getTime()) / 1000)),
        completesAt: existing.completesAt.toISOString(),
        cost: existing.paidMoney,
        resourceCost: existing.paidResources,
      });
    }

    // Per-corporation cap (checkBuildingCap counts every live row).
    const cap = checkBuildingCap(rows, def);
    if (!cap.allowed) return badRequest(cap.reason || 'Building cap reached', 'cap_reached');

    // Orbital-slot gate (Balance Pass 4): a saturated pool needs a lease, or
    // the Protected-Frontier first-building exemption.
    if (ORBITAL_SLOT_MAP.has(locationId)) {
      let saturated = false;
      try {
        const occ = await prisma.orbitalSlotOccupancy.findUnique({ where: { locationId }, select: { bucket: true } });
        saturated = occ?.bucket === 'saturated';
      } catch { /* table may lag — not saturated */ }
      if (saturated) {
        let hasLease = false;
        try {
          const lease = await prisma.orbitalSlotLease.findFirst({
            where: { holderId: profile.id, locationId, status: 'active', expiresAt: { gt: new Date() } },
            select: { id: true },
          });
          hasLease = !!lease;
        } catch { /* table may lag */ }
        const frontierExempt = Date.now() - profile.createdAt.getTime() < FRONTIER_DURATION_MS
          && profile.netWorth < FRONTIER_HARD_CAP_NET_WORTH
          && !rows.some(r => r.locationId === locationId);
        if (!hasLease && !frontierExempt) {
          return badRequest(`${ORBITAL_SLOT_MAP.get(locationId)?.label || locationId} is contested — win a slot-lease auction to build here.`, 'slot_gate');
        }
      }
    }

    // Price + duration, server-side.
    const count = countLiveAt(rows, def.id, locationId);
    const priced = computeServerBuildCost(def, count, research);
    const timing = computeServerBuildDuration(def, count, research);
    const resourceCost: Record<string, number> = def.resourceCost ? { ...def.resourceCost } : {};

    // Resources: verified against server truth when the profile has a
    // server map (phase 2), the client view otherwise.
    if (Object.keys(resourceCost).length > 0) {
      const inventory = await loadAuthoritativeInventory(profile);
      for (const [slug, qty] of Object.entries(resourceCost)) {
        if ((inventory.resources[slug] || 0) < qty) {
          return badRequest(`Not enough ${slug.replace(/_/g, ' ')} (${inventory.resources[slug] || 0}/${qty})`, 'insufficient_resources', { resource: slug, needed: qty, held: inventory.resources[slug] || 0 });
        }
      }
    }
    if (!Number.isFinite(profile.money) || profile.money < priced.cost) {
      return fundsError(priced.cost, profile.money, def.name);
    }

    const ledgerOn = await isLedgerAvailable();
    const now = new Date();
    const completesAt = new Date(now.getTime() + timing.serverSeconds * 1000);
    const negative: Record<string, number> = {};
    for (const [slug, qty] of Object.entries(resourceCost)) negative[slug] = -qty;

    let created: { id: string };
    try {
      created = await prisma.$transaction(async (tx) => {
        const row = await tx.serverAsset.create({
          data: {
            profileId: profile.id,
            kind: ASSET_KIND_BUILDING,
            definitionId: def.id,
            instanceId,
            locationId,
            status: 'pending',
            markLevel: 1,
            startedAt: now,
            completesAt,
            paidMoney: priced.cost,
            paidResources: resourceCost,
          },
          select: { id: true },
        });
        await debitMoney(tx, profile.id, priced.cost, 'building_build', row.id, ledgerOn);
        await ledgerResources(tx, profile.id, negative, 'building_build_resources', row.id, ledgerOn);
        if (ledgerOn) {
          const seq = await findLedgerSeq(tx, profile.id, 'building_build', row.id);
          if (seq !== null) await tx.serverAsset.update({ where: { id: row.id }, data: { ledgerSeq: seq } });
        }
        return row;
      });
    } catch (err) {
      if (err instanceof InsufficientFundsError) return fundsError(priced.cost, profile.money, def.name);
      throw err;
    }

    logger.info('Asset build started', { profileId: profile.id, definitionId: def.id, locationId, instanceId, cost: priced.cost, serverSeconds: timing.serverSeconds, rowId: created.id });
    return NextResponse.json({
      success: true,
      instanceId,
      startedAtMs: now.getTime(),
      realDurationSeconds: timing.baseSeconds,
      completesAt: completesAt.toISOString(),
      cost: priced.cost,
      buildCostReduction: priced.buildCostReduction,
      countAtLocation: count,
      resourceCost,
    });
  } catch (error) {
    logger.error('Asset build error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
