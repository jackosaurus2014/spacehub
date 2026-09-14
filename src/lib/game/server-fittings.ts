// ─── Space Tycoon: server side of ship fittings (mining Phase D) ────────────
// docs/SPACE_MINING_DESIGN_2026-09-12.md §5 "Modules over new hulls", §8 row D.
// Server-only. The pure rules live in ship-fittings.ts (shared with the client
// preview and the tests); this module is the DB layer behind
// /api/space-tycoon/assets/fitting and the reader the mining route uses.
//
// THE RULE THIS FILE EXISTS TO ENFORCE. A fitting is worth money, so a fitting
// must be a server FACT. `ShipFitting` rows are written only by the fitting
// route inside a transaction that debits the yard bill; the mining route then
// reads those rows back and quotes the order against them
// (`loadFittingProfiles`). A client that claims a fit it never paid for gets
// the bare hull's numbers, because the quote never looks at anything the
// client sent.
//
// `activeKey` = "<profileId>:<shipInstanceId>" while the fit is live and NULL
// once stripped. The unique index is what settles a double-refit race — the
// same shape AsteroidClaim.activeKey and PropellantDepot.activeKey use.
//
// Everything degrades against a lagging schema (the table arrives with
// `prisma db push` on deploy): a failed read is "this hull has no fittings",
// which is exactly the pre-Phase-D behaviour.

import prisma from '@/lib/db';
import type { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';
import type { AsteroidClass } from './asteroids';
import { isBuildingOperational } from './mothball';
import { BUILDING_MAP } from './buildings';
import {
  NEUTRAL_FITTING_PROFILE,
  fittingProfile,
  sanitizeFittingIds,
  slotsUsedBy,
  type FittingProfile,
  type ShipFittingRecord,
} from './ship-fittings';

type Db = Prisma.TransactionClient | PrismaClient;

export const FITTING_ACTIVE = 'active';
export const FITTING_STRIPPED = 'stripped';

/** The key that makes "one live fit per hull" a database guarantee. */
export function fittingActiveKey(profileId: string, shipInstanceId: string): string {
  return `${profileId}:${shipInstanceId}`;
}

/** The key that makes a RESUBMITTED refit a no-op instead of a second bill.
 *  Built from the client's own refit instance id and never cleared, so a
 *  retry collides on the unique index even after the fit has been stripped. */
export function refitKeyFor(profileId: string, refitInstanceId: string): string {
  return `${profileId}:${refitInstanceId}`;
}

export interface FittingRowLite {
  id: string;
  profileId: string;
  shipInstanceId: string;
  shipDefinitionId: string;
  moduleIds: unknown;
  slotsUsed: number;
  upkeepPerMonth: number;
  yardLocationId: string;
  fittedAt: Date;
  readyAt: Date;
  status: string;
  paidMoney: number;
}

const FITTING_SELECT = {
  id: true, profileId: true, shipInstanceId: true, shipDefinitionId: true,
  moduleIds: true, slotsUsed: true, upkeepPerMonth: true, yardLocationId: true,
  fittedAt: true, readyAt: true, status: true, paidMoney: true,
} as const;

/** Row → the record the sync hands the client. Ids are re-sanitized on the
 *  way out: a definition retired from FITTINGS simply stops applying. */
export function fittingRecordFromRow(row: FittingRowLite): ShipFittingRecord {
  const ids = sanitizeFittingIds(row.moduleIds);
  return {
    shipInstanceId: row.shipInstanceId,
    ids,
    slotsUsed: slotsUsedBy(ids),
    readyAtMs: row.readyAt.getTime(),
    yardLocationId: row.yardLocationId,
    upkeepPerMonth: Number.isFinite(row.upkeepPerMonth) ? row.upkeepPerMonth : 0,
  };
}

/** Every live fit of one profile. Best-effort: a lagging schema reads empty. */
export async function loadMyFittings(profileId: string, db: Db = prisma): Promise<FittingRowLite[]> {
  try {
    return await db.shipFitting.findMany({
      where: { profileId, status: FITTING_ACTIVE },
      select: FITTING_SELECT,
      take: 500,
    }) as FittingRowLite[];
  } catch {
    return [];
  }
}

/** A refit already written under this client id, if any (retry safety). */
export async function findRefitByKey(profileId: string, refitInstanceId: string, db: Db = prisma): Promise<FittingRowLite | null> {
  try {
    return await db.shipFitting.findFirst({
      where: { refitKey: refitKeyFor(profileId, refitInstanceId) },
      select: FITTING_SELECT,
    }) as FittingRowLite | null;
  } catch {
    return null;
  }
}

/** The live fit of one hull, or null. */
export async function findFitting(profileId: string, shipInstanceId: string, db: Db = prisma): Promise<FittingRowLite | null> {
  try {
    return await db.shipFitting.findFirst({
      where: { profileId, shipInstanceId, status: FITTING_ACTIVE },
      select: FITTING_SELECT,
    }) as FittingRowLite | null;
  } catch {
    return null;
  }
}

/** The records the sync block carries, keyed by hull. */
export async function loadFittingBlock(profileId: string, db: Db = prisma): Promise<Record<string, ShipFittingRecord>> {
  const rows = await loadMyFittings(profileId, db);
  const out: Record<string, ShipFittingRecord> = {};
  for (const r of rows) out[r.shipInstanceId] = fittingRecordFromRow(r);
  return out;
}

/**
 * The profiles the MINING ROUTE quotes with, keyed by hull instance id. A fit
 * still in the yard (`readyAt` in the future) contributes the NEUTRAL profile
 * — the yard has not finished, so the hull is still the hull it was.
 *
 * `rockClassOf` lets the caller supply the rock a given hull is being quoted
 * against, so per-class extraction terms (ice extractor / magnetic rake) land
 * on the right rock. Omitted → only the class-agnostic terms apply, which is
 * the conservative reading.
 */
export async function loadFittingProfiles(
  profileId: string,
  now: Date = new Date(),
  db: Db = prisma,
  rockClassOf?: (shipInstanceId: string) => AsteroidClass | null,
): Promise<Map<string, FittingProfile>> {
  const out = new Map<string, FittingProfile>();
  for (const row of await loadMyFittings(profileId, db)) {
    if (row.readyAt.getTime() > now.getTime()) continue;
    const ids = sanitizeFittingIds(row.moduleIds);
    if (ids.length === 0) continue;
    out.set(row.shipInstanceId, fittingProfile(ids, { rockClass: rockClassOf?.(row.shipInstanceId) ?? null }));
  }
  return out;
}

/** The profile one hull is flying right now (neutral when it has none). */
export async function loadFittingProfileFor(
  profileId: string,
  shipInstanceId: string,
  now: Date = new Date(),
  db: Db = prisma,
  rockClass: AsteroidClass | null = null,
): Promise<{ profile: FittingProfile; row: FittingRowLite | null }> {
  const row = await findFitting(profileId, shipInstanceId, db);
  if (!row || row.readyAt.getTime() > now.getTime()) return { profile: { ...NEUTRAL_FITTING_PROFILE }, row };
  const ids = sanitizeFittingIds(row.moduleIds);
  return { profile: ids.length > 0 ? fittingProfile(ids, { rockClass }) : { ...NEUTRAL_FITTING_PROFILE }, row };
}

/** Whether a hull is IN the yard right now (fit registered, not yet ready).
 *  Such a hull refuses mining orders — which is also what guarantees a fit
 *  can never change under an order already in flight. */
export async function hullIsInYard(profileId: string, shipInstanceId: string, now: Date = new Date(), db: Db = prisma): Promise<boolean> {
  const row = await findFitting(profileId, shipInstanceId, db);
  return !!row && row.readyAt.getTime() > now.getTime();
}

/**
 * Write the new fit. Status-guarded end to end: the existing live row is
 * retired by an `updateMany` that only matches while it is still ACTIVE
 * (losing that race means somebody else already refitted this hull, and the
 * caller's transaction rolls back), then the new row is created. Creating a
 * row whose `activeKey` collides throws Prisma P2002, which the route maps to
 * a refusal rather than a double-charge.
 */
export async function replaceFittingRow(
  tx: Db,
  profileId: string,
  shipInstanceId: string,
  shipDefinitionId: string,
  previous: FittingRowLite | null,
  ids: string[],
  upkeepPerMonth: number,
  yardLocationId: string,
  readyAt: Date,
  paidMoney: number,
  now: Date,
  refitKey: string,
): Promise<{ id: string } | null> {
  if (previous) {
    const retired = await tx.shipFitting.updateMany({
      where: { id: previous.id, status: FITTING_ACTIVE },
      data: { status: FITTING_STRIPPED, activeKey: null, strippedAt: now },
    });
    if (retired.count !== 1) return null;
  }
  if (ids.length === 0) return { id: previous?.id ?? '' };
  const row = await tx.shipFitting.create({
    data: {
      profileId,
      activeKey: fittingActiveKey(profileId, shipInstanceId),
      refitKey,
      shipInstanceId,
      shipDefinitionId,
      moduleIds: ids,
      slotsUsed: slotsUsedBy(ids),
      upkeepPerMonth,
      yardLocationId,
      fittedAt: now,
      readyAt,
      status: FITTING_ACTIVE,
      paidMoney: Math.max(0, Math.round((previous?.paidMoney ?? 0) + paidMoney)),
    },
    select: { id: true },
  });
  return row;
}

// ─── Where a refit may happen ────────────────────────────────────────────────

/**
 * A REFIT YARD is a location where this corporation has a completed,
 * operational building that can turn a wrench: any `fabrication_facility`, or
 * any building the capability table gives a shipyard slot to (Heavy Launch
 * Pad, the fabrication works). Earth's surface is NOT free — you build the
 * yard, which is the point: fitting is infrastructure, and a corporation that
 * has pushed a fabrication plant out to Ceres can refit at the belt instead of
 * flying a barge home for four game-months.
 *
 * Server-verified from the asset registry's building view, never from a
 * client claim.
 */
export function isRefitYard(
  buildings: ReadonlyArray<{ definitionId?: unknown; locationId?: unknown; isComplete?: unknown; status?: unknown }>,
  locationId: string,
): boolean {
  for (const b of buildings || []) {
    if (!b || typeof b.definitionId !== 'string' || b.locationId !== locationId) continue;
    if (b.isComplete !== true) continue;
    if (!isBuildingOperational(b as Parameters<typeof isBuildingOperational>[0])) continue;
    const def = BUILDING_MAP.get(b.definitionId);
    if (!def) continue;
    if (def.category === 'fabrication_facility') return true;
    const slots = def.capabilities?.shipyardSlots;
    if (typeof slots === 'number' && slots > 0) return true;
  }
  return false;
}

/** Every location this corporation can refit at (for the console). */
export function refitYardLocations(
  buildings: ReadonlyArray<{ definitionId?: unknown; locationId?: unknown; isComplete?: unknown; status?: unknown }>,
): string[] {
  const out = new Set<string>();
  for (const b of buildings || []) {
    if (!b || typeof b.locationId !== 'string') continue;
    if (isRefitYard(buildings, b.locationId)) out.add(b.locationId);
  }
  return Array.from(out);
}

/** Best-effort audit line. Never throws. */
export function logFittingWrite(profileId: string, shipInstanceId: string, ids: string[], cost: number): void {
  try {
    logger.info('Ship refitted', { profileId, shipInstanceId, fittings: ids.join(','), cost });
  } catch { /* logging is best-effort */ }
}
