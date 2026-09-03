import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { BUILDING_MAP } from '@/lib/game/buildings';
import {
  canStartMarkUpgrade,
  getMarkUpgradeCost,
  getMarkUpgradeResourceCost,
  getMarkUpgradeSeconds,
} from '@/lib/game/mark-upgrades';
import { isLedgerAvailable } from '@/lib/game/server-ledger';
import { loadAuthoritativeInventory } from '@/lib/game/server-inventory';
import { loadServerResearch, rowToBuildingInstance } from '@/lib/game/server-assets';
import {
  InsufficientFundsError,
  AssetStateError,
  badRequest,
  debitMoney,
  findLiveBuildingRow,
  fundsError,
  ledgerResources,
  loadAssetProfile,
  parseInstanceId,
} from '@/lib/game/asset-route-shared';
import type { BuildingInstance } from '@/lib/game/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/assets/refit — start a Mark refit (D4) server-side.
 * Body: { instanceId }. Re-runs mark-upgrades.ts canStartMarkUpgrade on the
 * server row (damage is the one client-owned input — merged from the synced
 * JSON), charges the Mark cost + materials through the ledger
 * (building_refit / building_refit_resources), and writes the TARGET
 * markLevel with completesAt = now + the refit seconds. The row stays
 * 'complete' (it operates at its current mark meanwhile); readers treat a
 * complete row with a future completesAt as refit-in-progress at
 * markLevel − 1 (server-assets.ts isRowRefitting).
 */
export async function POST(request: NextRequest) {
  try {
    const loaded = await loadAssetProfile();
    if (loaded.response) return loaded.response;
    const profile = loaded.profile;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const instanceId = parseInstanceId(body?.instanceId);
    if (!instanceId) return badRequest('instanceId is required', 'invalid_instance_id');

    const row = await findLiveBuildingRow(profile.id, instanceId);
    if (!row) return NextResponse.json({ error: 'No such building in the registry', code: 'not_found' }, { status: 404 });
    const def = BUILDING_MAP.get(row.definitionId);
    if (!def) return badRequest('Building definition retired', 'unknown_definition');

    const clientBuilding = (Array.isArray(profile.buildingsData) ? (profile.buildingsData as BuildingInstance[]) : [])
      .find(b => b && b.instanceId === instanceId);
    const now = Date.now();
    const inst = rowToBuildingInstance(row, clientBuilding, now);
    // Slice 2: the Mark III research gate reads the registry's research view.
    const research = (await loadServerResearch(profile.id, profile.completedResearchList, { workforceData: profile.workforceData })).completed;
    const check = canStartMarkUpgrade(inst, def, research);
    if (!check.allowed || !check.target) {
      return badRequest(check.reason || 'Refit not available', 'refit_blocked', { missingResearch: check.missingResearch });
    }
    const target = check.target;
    const cost = getMarkUpgradeCost(def, target);
    const materials = getMarkUpgradeResourceCost(def, target);
    const seconds = getMarkUpgradeSeconds(def, target);

    if (Object.keys(materials).length > 0) {
      const inventory = await loadAuthoritativeInventory(profile);
      for (const [slug, qty] of Object.entries(materials)) {
        if ((inventory.resources[slug] || 0) < qty) {
          return badRequest(`Not enough ${slug.replace(/_/g, ' ')} (${inventory.resources[slug] || 0}/${qty})`, 'insufficient_resources', { resource: slug, needed: qty, held: inventory.resources[slug] || 0 });
        }
      }
    }
    if (!Number.isFinite(profile.money) || profile.money < cost) return fundsError(cost, profile.money, `${def.name} refit`);

    const ledgerOn = await isLedgerAvailable();
    const startedAt = new Date(now);
    const completesAt = new Date(now + seconds * 1000);
    const negative: Record<string, number> = {};
    for (const [slug, qty] of Object.entries(materials)) negative[slug] = -qty;

    try {
      await prisma.$transaction(async (tx) => {
        // Status-guarded: still complete, not mid-refit, still the mark we priced.
        const flipped = await tx.serverAsset.updateMany({
          where: { id: row.id, status: 'complete', markLevel: row.markLevel, completesAt: { lte: startedAt } },
          data: { markLevel: target, startedAt, completesAt, paidMoney: { increment: cost } },
        });
        if (flipped.count !== 1) throw new AssetStateError('Refit already in progress or building changed');
        await debitMoney(tx, profile.id, cost, 'building_refit', row.id, ledgerOn);
        await ledgerResources(tx, profile.id, negative, 'building_refit_resources', row.id, ledgerOn);
      });
    } catch (err) {
      if (err instanceof InsufficientFundsError) return fundsError(cost, profile.money, `${def.name} refit`);
      if (err instanceof AssetStateError) return NextResponse.json({ error: err.message, code: 'state_conflict' }, { status: err.status });
      throw err;
    }

    logger.info('Asset refit started', { profileId: profile.id, instanceId, target, cost, seconds });
    return NextResponse.json({
      success: true, instanceId, target,
      startedAtMs: now, durationSeconds: seconds, completesAt: completesAt.toISOString(),
      cost, resourceCost: materials,
    });
  } catch (error) {
    logger.error('Asset refit error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
