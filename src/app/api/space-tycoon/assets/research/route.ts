import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { tierFromProfileScalars } from '@/lib/game/corporation-tiers';
import { RESEARCH_MAP } from '@/lib/game/research-tree';
import { isLedgerAvailable } from '@/lib/game/server-ledger';
import { loadAuthoritativeInventory } from '@/lib/game/server-inventory';
import {
  ASSET_KIND_RESEARCH,
  checkResearchStart,
  computeServerResearchQuote,
  ensureAssetAdoption,
  ensureAssetAdoption2,
  loadServerAssetRows,
  mergeServerResearch,
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
 * POST /api/space-tycoon/assets/research — start a research project
 * server-side. Body: { definitionId, instanceId } (instanceId is the
 * client's own id for this start — retry-safe: a second POST with the same
 * id returns the existing row and charges nothing).
 *
 * docs/SECURITY_AUDIT_2026-09.md "Phase 3 slices 2-5" (slice 2). Validates
 * the definition, its prerequisites against the registry's research view
 * (complete rows ∪ the persisted list in shadow), not-already-complete /
 * in-progress, the repeatable level cap, and the two-queue rule (pending
 * research rows vs 1 + parallel_research) — page.tsx handleStartResearch's
 * client rule, mirrored. Prices with research-tree.ts getResearchDisplayState
 * on the server view (doctrine override, repeatable escalation), verifies
 * `def.resourceCost` against the authoritative inventory, debits money +
 * resources through the ledger (research_start / research_start_resources)
 * and inserts a pending row with completesAt = now + the conservative
 * server duration. The assets-complete cron flips it and appends the
 * definition to the persisted completedResearchList.
 *
 * NOT checked here (client-owned condition): rare-tech visibility
 * (`unlockedRareTechIds` is never synced).
 */
export async function POST(request: NextRequest) {
  try {
    const loaded = await loadAssetProfile();
    if (loaded.response) return loaded.response;
    const profile = loaded.profile;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') return badRequest('Invalid body', 'invalid_body');
    const definitionId = typeof body.definitionId === 'string' ? body.definitionId : '';
    const instanceId = parseInstanceId(body.instanceId);
    if (!instanceId) return badRequest('instanceId is required', 'invalid_instance_id');
    const def = RESEARCH_MAP.get(definitionId);
    if (!def) return badRequest('Unknown research', 'unknown_definition');

    // Registry availability + one-time adoption of a pre-registry save.
    let rows;
    try {
      await ensureAssetAdoption(profile, prisma);
      await ensureAssetAdoption2(profile, prisma);
      rows = await loadServerAssetRows(profile.id, prisma, [ASSET_KIND_RESEARCH]);
    } catch (err) {
      logger.error('Asset registry unavailable', { error: String(err) });
      return NextResponse.json({ error: 'Asset registry unavailable', code: 'registry_unavailable' }, { status: 503 });
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

    const now = Date.now();
    // The registry's own research view (shadow = union with the persisted list).
    const view = mergeServerResearch(rows, profile.completedResearchList, 'shadow', now);
    const pendingDefs = view.pending.map(p => p.definitionId);
    const level = view.repeatableLevels[def.id] || 0;
    const check = checkResearchStart(def, view.completed, pendingDefs, level);
    if (!check.ok) return badRequest(check.reason || 'Research cannot start', check.code || 'research_blocked', { missingResearch: check.missing });

    // Row 8: quote at the profile's real (persisted-scalar) corporation tier
    // so the server's research-speed ceiling matches the client's preview.
    const quote = computeServerResearchQuote(def, view.completed, level, tierFromProfileScalars({
      totalEarned: profile.totalEarned,
      buildingCount: profile.buildingCount,
      researchCount: profile.researchCount,
      locationsUnlocked: profile.locationsUnlocked,
      serviceCount: profile.serviceCount,
    }));
    if (Object.keys(quote.resourceCost).length > 0) {
      const inventory = await loadAuthoritativeInventory(profile);
      for (const [slug, qty] of Object.entries(quote.resourceCost)) {
        if ((inventory.resources[slug] || 0) < qty) {
          return badRequest(`Not enough ${slug.replace(/_/g, ' ')} (${inventory.resources[slug] || 0}/${qty})`, 'insufficient_resources', { resource: slug, needed: qty, held: inventory.resources[slug] || 0 });
        }
      }
    }
    if (!Number.isFinite(profile.money) || profile.money < quote.cost) return fundsError(quote.cost, profile.money, def.name);

    const ledgerOn = await isLedgerAvailable();
    const startedAt = new Date(now);
    const completesAt = new Date(now + quote.serverSeconds * 1000);
    const negative: Record<string, number> = {};
    for (const [slug, qty] of Object.entries(quote.resourceCost)) negative[slug] = -qty;

    let created: { id: string };
    try {
      created = await prisma.$transaction(async (tx) => {
        const row = await tx.serverAsset.create({
          data: {
            profileId: profile.id,
            kind: ASSET_KIND_RESEARCH,
            definitionId: def.id,
            instanceId,
            locationId: null,
            status: 'pending',
            markLevel: 1,
            startedAt,
            completesAt,
            paidMoney: quote.cost,
            paidResources: quote.resourceCost,
          },
          select: { id: true },
        });
        await debitMoney(tx, profile.id, quote.cost, 'research_start', row.id, ledgerOn);
        await ledgerResources(tx, profile.id, negative, 'research_start_resources', row.id, ledgerOn);
        if (ledgerOn) {
          const seq = await findLedgerSeq(tx, profile.id, 'research_start', row.id);
          if (seq !== null) await tx.serverAsset.update({ where: { id: row.id }, data: { ledgerSeq: seq } });
        }
        return row;
      });
    } catch (err) {
      if (err instanceof InsufficientFundsError) return fundsError(quote.cost, profile.money, def.name);
      throw err;
    }

    logger.info('Asset research started', { profileId: profile.id, definitionId: def.id, instanceId, cost: quote.cost, serverSeconds: quote.serverSeconds, rowId: created.id });
    return NextResponse.json({
      success: true,
      instanceId,
      startedAtMs: now,
      realDurationSeconds: quote.effectiveSeconds,
      totalMonths: quote.totalMonths,
      completesAt: completesAt.toISOString(),
      cost: quote.cost,
      resourceCost: quote.resourceCost,
      doctrineLocked: quote.doctrineLocked,
      repeatableLevel: quote.repeatableLevel,
      queueUsed: pendingDefs.length + 1,
    });
  } catch (error) {
    logger.error('Asset research error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
