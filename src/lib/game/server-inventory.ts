// ─── Space Tycoon: server-owned inventory — DB helpers ───────────────────────
// docs/SECURITY_AUDIT_2026-09.md "Server-authoritative inventory — phase 2".
//
// The pure rules live in resource-plausibility.ts (advanceServerResources,
// serverSellableQuantity, …). This module is the thin server-only layer the
// escrow-backed paths call: it reads the "unfolded" ledger tail (rows the
// sync has not yet absorbed into GameProfile.serverResources) and hands it
// to the pure functions, so every gate sees
//
//   truth_r = serverResources_r (stored at last sync) + Σ unfolded rows_r
//
// — the same figure the next sync will store. An escrow written a moment
// ago is a ledger row already, so it is debited from what the next gate
// sees without the gate and the sync ever writing the same JSON column.
//
// Fallbacks (documented on serverSellableQuantity): a profile without a
// `serverResources` map falls back to the phase-1 ceiling rule; mode 'off'
// returns the raw client figure.

import prisma from '@/lib/db';
import type { Prisma, PrismaClient } from '@prisma/client';
import {
  applyUnfoldedDeltas,
  getResourceClampMode,
  readServerResources,
  serverSellableQuantity,
  type ResourceClampMode,
  type SellableSource,
} from './resource-plausibility';

type Db = Prisma.TransactionClient | PrismaClient;

/** Ledger rows the sync has not folded into serverResources yet, summed by
 *  slug. Sync-authored rows are stamped folded at birth, so they never show
 *  up here. Best-effort: a lagging schema (no foldedAt column yet) reads as
 *  "nothing unfolded" — the stored map alone is then the gate's answer. */
export async function readUnfoldedResourceDeltas(
  profileId: string,
  db: Db = prisma,
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  try {
    const rows = await db.gameLedgerEntry.findMany({
      where: { profileId, foldedAt: null, resourceSlug: { not: null } },
      select: { resourceSlug: true, resourceDelta: true },
      take: 1000,
    });
    for (const r of rows) {
      if (!r.resourceSlug || typeof r.resourceDelta !== 'number' || !Number.isFinite(r.resourceDelta) || r.resourceDelta === 0) continue;
      out[r.resourceSlug] = (out[r.resourceSlug] || 0) + r.resourceDelta;
    }
  } catch {
    /* schema may lag deploy — stored map only */
  }
  return out;
}

export interface ProfileInventoryRow {
  id: string;
  resources: unknown;
  serverResources?: unknown;
  workforceData?: unknown;
}

/**
 * The quantity of `slug` the server treats as held, with the unfolded ledger
 * tail applied when the profile has a server map. Drop-in for the sync-free
 * `serverSellableQuantity` in the escrow paths.
 */
export async function resolveSellableQuantity(
  profile: ProfileInventoryRow,
  slug: string,
  opts: { mode?: ResourceClampMode; db?: Db } = {},
): Promise<{ held: number; raw: number; cappedByCeiling: boolean; ceiling: number | null; source: SellableSource }> {
  const mode = opts.mode ?? getResourceClampMode();
  if (mode === 'off' || !readServerResources(profile.serverResources)) {
    return serverSellableQuantity(profile, slug, mode);
  }
  const unfolded = await readUnfoldedResourceDeltas(profile.id, opts.db);
  return serverSellableQuantity(profile, slug, mode, unfolded);
}

/**
 * The whole inventory map a multi-resource check (project contributions,
 * bid fulfilment) should verify against: server truth when the profile has
 * a server map (and the mode is not 'off'), else the client view. The
 * `source` tells the caller which it got, for the audit trail.
 */
export async function loadAuthoritativeInventory(
  profile: ProfileInventoryRow,
  opts: { mode?: ResourceClampMode; db?: Db } = {},
): Promise<{ resources: Record<string, number>; source: 'server' | 'client' }> {
  const mode = opts.mode ?? getResourceClampMode();
  const client = (profile.resources && typeof profile.resources === 'object')
    ? (profile.resources as Record<string, number>)
    : {};
  const server = mode === 'off' ? null : readServerResources(profile.serverResources);
  if (!server) return { resources: client, source: 'client' };
  const unfolded = await readUnfoldedResourceDeltas(profile.id, opts.db);
  return { resources: applyUnfoldedDeltas(server, unfolded), source: 'server' };
}

/** Audit-log helper for a gate that refused an outbound transfer on server
 *  truth while the client view would have allowed it. Best-effort. */
export async function auditServerInventoryGate(
  db: Db,
  args: { profileId: string; resourceSlug: string; path: string; quantity: number; raw: number; held: number; refId?: string },
): Promise<void> {
  try {
    await db.marketAuditLog.create({
      data: {
        eventType: 'sell_gated_by_server_inventory',
        profileId: args.profileId,
        resourceSlug: args.resourceSlug,
        severity: 'warning',
        details: { path: args.path, quantity: args.quantity, raw: args.raw, serverHeld: args.held, refId: args.refId ?? null },
      },
    });
  } catch { /* audit log is best-effort */ }
}
