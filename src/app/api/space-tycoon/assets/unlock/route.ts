import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { isLedgerAvailable } from '@/lib/game/server-ledger';
import {
  ASSET_KIND_LOCATION,
  STARTING_LOCATIONS,
  ensureAssetAdoption,
  ensureAssetAdoption2,
  loadServerRegistry,
  locationInstanceId,
} from '@/lib/game/server-assets';
import {
  InsufficientFundsError,
  badRequest,
  debitMoney,
  findLedgerSeq,
  fundsError,
  loadAssetProfile,
} from '@/lib/game/asset-route-shared';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/assets/unlock — unlock a location server-side.
 * Body: { locationId }. Retry-safe: an already-unlocked location (row or
 * ColonyClaim) returns success and charges nothing.
 *
 * docs/SECURITY_AUDIT_2026-09.md "Phase 3 slices 2-5" (slice 5). Validates
 * the location (solar-system.ts LOCATION_MAP — base bodies AND the colony
 * bodies merged in from colonies.ts) and its requiredResearch against the
 * registry's research view, charges `loc.unlockCost` through the ledger
 * (location_unlock, BURNED) and inserts a complete 'location' row
 * (instanceId `location:<id>`). This replaces the free client unlock.
 *
 * The split with POST /api/space-tycoon/colonies: that route sells the
 * COLONY SLOT (colonies.ts claimCost, presence-gated, slot-capped —
 * `colony_established` contracts read it); this route sells ACCESS
 * (unlockCost — build / dispatch there). They are different fees for
 * different things, exactly as before this slice (the client charged
 * unlockCost locally and the claim charged claimCost server-side). A body
 * is never charged twice for the same thing: a ColonyClaim counts as
 * unlocked (loadServerLocations), so unlocking a body you already hold a
 * claim on is free, and the row makes a second unlock idempotent. The
 * literal "colony bodies only through /colonies" split is impossible
 * without loosening the 2026-09-01 hardening: a claim REQUIRES a completed
 * building or ship at the body, which requires the unlock first.
 */
export async function POST(request: NextRequest) {
  try {
    const loaded = await loadAssetProfile();
    if (loaded.response) return loaded.response;
    const profile = loaded.profile;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const locationId = typeof body?.locationId === 'string' ? body.locationId : '';
    const loc = LOCATION_MAP.get(locationId);
    if (!loc) return badRequest('Unknown location', 'unknown_location');
    if (STARTING_LOCATIONS.includes(locationId)) return NextResponse.json({ success: true, idempotent: true, locationId, cost: 0 });

    let registry;
    try {
      await ensureAssetAdoption(profile, prisma);
      await ensureAssetAdoption2(profile, prisma);
      registry = await loadServerRegistry(profile.id, profile, { mode: 'shadow' });
    } catch (err) {
      logger.error('Asset registry unavailable', { error: String(err) });
      return NextResponse.json({ error: 'Asset registry unavailable', code: 'registry_unavailable' }, { status: 503 });
    }

    const instanceId = locationInstanceId(locationId);
    const existingRow = registry.rows.find(r => r.kind === ASSET_KIND_LOCATION && r.instanceId === instanceId);
    if (existingRow || registry.colonyClaimLocationIds.includes(locationId)) {
      return NextResponse.json({ success: true, idempotent: true, locationId, cost: existingRow?.paidMoney ?? 0 });
    }

    const research = registry.research.completed;
    const missing = (loc.requiredResearch || []).filter(r => !research.includes(r));
    if (missing.length > 0) return badRequest(`${loc.name} requires research: ${missing.join(', ')}`, 'research_required', { missingResearch: missing });
    const cost = Math.max(0, Math.round(loc.unlockCost));
    if (!Number.isFinite(profile.money) || profile.money < cost) return fundsError(cost, profile.money, `${loc.name} unlock`);

    const ledgerOn = await isLedgerAvailable();
    const now = new Date();
    let created: { id: string };
    try {
      created = await prisma.$transaction(async (tx) => {
        const row = await tx.serverAsset.create({
          data: {
            profileId: profile.id,
            kind: ASSET_KIND_LOCATION,
            definitionId: locationId,
            instanceId,
            locationId,
            status: 'complete',
            markLevel: 1,
            startedAt: now,
            completesAt: now,
            paidMoney: cost,
            paidResources: {},
          },
          select: { id: true },
        });
        await debitMoney(tx, profile.id, cost, 'location_unlock', row.id, ledgerOn);
        if (ledgerOn) {
          const seq = await findLedgerSeq(tx, profile.id, 'location_unlock', row.id);
          if (seq !== null) await tx.serverAsset.update({ where: { id: row.id }, data: { ledgerSeq: seq } });
        }
        return row;
      });
    } catch (err) {
      if (err instanceof InsufficientFundsError) return fundsError(cost, profile.money, `${loc.name} unlock`);
      // Unique-constraint race with a concurrent unlock by the same profile.
      if ((err as { code?: string })?.code === 'P2002') return NextResponse.json({ success: true, idempotent: true, locationId, cost: 0 });
      throw err;
    }

    logger.info('Asset location unlocked', { profileId: profile.id, locationId, cost, rowId: created.id });
    return NextResponse.json({ success: true, locationId, cost, unlockedAt: now.toISOString() });
  } catch (error) {
    logger.error('Asset unlock error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
