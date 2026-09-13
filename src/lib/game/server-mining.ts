// ─── Space Tycoon: server side of interactive asteroid mining (Phase A) ──────
// docs/SPACE_MINING_DESIGN_2026-09-12.md §3-4, §6 "Anti-exploit". Server-only.
//
// The pure rules live in mining-orders.ts / asteroids.ts (shared with the
// client tick and the sim harness). This module is the DB layer the route
// (/api/space-tycoon/assets/mining) and the assets-complete cron call:
//
//   - Asteroid rows are the world's rocks (seeded by scripts/seed-asteroids.ts
//     from the public catalogue + a salted hidden roll). `reserve` is the
//     only column that moves in Phase A (decremented on completion).
//   - AsteroidSurvey rows are a corporation's reveals. A survey ORDER writes
//     its row at creation with surveyedAt = the ship's arrival, so the full
//     rate is only quotable once the ship is actually on station.
//   - Survey probes are ServerAsset rows of kind 'survey_probe' (bought
//     'complete', flipped 'consumed' on use) — no new column on GameProfile.
//   - MiningOrder rows carry the schedule the planner quoted. The completion
//     pass below is THE ONLY PATH that creates ore (or sale proceeds) for a
//     synced profile: a status-guarded flip + ledger rows (mining_order_ore /
//     mining_order_sale) that the next sync's reconciliation delivers.
//
// Everything is best-effort against a lagging schema (the tables arrive with
// `prisma db push` on deploy); callers wrap what must degrade.

import prisma from '@/lib/db';
import type { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';
import { MINING_SALE_BROKER_FEE } from './mining-orders';
import { RESOURCE_MAP, type ResourceId } from './resources';
import { isLedgerAvailable, recordLedger } from './server-ledger';
import type { AsteroidIntel } from './asteroids';

type Db = Prisma.TransactionClient | PrismaClient;

export const ASSET_KIND_SURVEY_PROBE = 'survey_probe';
export const SURVEY_PROBE_DEFINITION_ID = 'survey_probe_kit';
export const PROBE_STATUS_STOCKED = 'complete';
export const PROBE_STATUS_CONSUMED = 'consumed';

export const MINING_ORDER_PENDING = 'pending';
export const MINING_ORDER_COMPLETE = 'complete';
export const MINING_ORDER_HELD = 'held';
export const MINING_ORDER_RETURNED = 'returned';

export interface AsteroidRowLite {
  id: string;
  fieldId: string;
  class: string;
  deltaVExtra: number;
  grade: number;
  reserve: number;
  risk: number;
  exhaustedAt: Date | null;
}

const ASTEROID_SELECT = { id: true, fieldId: true, class: true, deltaVExtra: true, grade: true, reserve: true, risk: true, exhaustedAt: true } as const;

export async function loadAsteroidRow(id: string, db: Db = prisma): Promise<AsteroidRowLite | null> {
  return db.asteroid.findUnique({ where: { id }, select: ASTEROID_SELECT });
}

export function intelFromRow(row: Pick<AsteroidRowLite, 'grade' | 'reserve' | 'risk'>): AsteroidIntel {
  return { grade: row.grade, reserve: Math.max(0, Math.round(row.reserve)), risk: row.risk };
}

/** The corporation's effective surveys at `now` (a survey order's row only
 *  counts once its ship has arrived). */
export async function loadSurveyedIntel(
  profileId: string,
  db: Db = prisma,
  now: Date = new Date(),
): Promise<Record<string, AsteroidIntel & { surveyedAtMs: number; via: string }>> {
  const rows = await db.asteroidSurvey.findMany({
    where: { profileId, surveyedAt: { lte: now } },
    select: { asteroidId: true, surveyedAt: true, via: true, asteroid: { select: { grade: true, reserve: true, risk: true } } },
    take: 2000,
  });
  const out: Record<string, AsteroidIntel & { surveyedAtMs: number; via: string }> = {};
  for (const r of rows) {
    out[r.asteroidId] = { ...intelFromRow(r.asteroid), surveyedAtMs: r.surveyedAt.getTime(), via: r.via };
  }
  return out;
}

export async function findSurvey(profileId: string, asteroidId: string, db: Db = prisma): Promise<{ surveyedAt: Date; via: string } | null> {
  return db.asteroidSurvey.findUnique({ where: { profileId_asteroidId: { profileId, asteroidId } }, select: { surveyedAt: true, via: true } });
}

/** Stocked probes = 'complete' rows of kind survey_probe. */
export async function countProbes(profileId: string, db: Db = prisma): Promise<number> {
  return db.serverAsset.count({ where: { profileId, kind: ASSET_KIND_SURVEY_PROBE, status: PROBE_STATUS_STOCKED } });
}

/** Consume one stocked probe. Returns false when none is in stock. Runs
 *  inside the caller's transaction so the survey row and the probe flip
 *  commit together. */
export async function consumeProbe(tx: Db, profileId: string): Promise<boolean> {
  const probe = await tx.serverAsset.findFirst({
    where: { profileId, kind: ASSET_KIND_SURVEY_PROBE, status: PROBE_STATUS_STOCKED },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!probe) return false;
  const flipped = await tx.serverAsset.updateMany({
    where: { id: probe.id, status: PROBE_STATUS_STOCKED },
    data: { status: PROBE_STATUS_CONSUMED },
  });
  return flipped.count === 1;
}

export interface MiningOrderRowLite {
  id: string;
  profileId: string;
  instanceId: string;
  shipInstanceId: string;
  mode: string;
  asteroidId: string | null;
  fieldId: string;
  oreId: string;
  fillUnits: number;
  thenAction: string;
  originId: string;
  destinationId: string;
  startedAt: Date;
  arrivesAt: Date;
  miningEndsAt: Date;
  completesAt: Date;
  fuelPaid: number;
  ratePerHour: number;
  surveyed: boolean;
  status: string;
  unitsCredited: number;
  saleProceeds: number;
}

export const ORDER_SELECT = {
  id: true, profileId: true, instanceId: true, shipInstanceId: true, mode: true, asteroidId: true, fieldId: true,
  oreId: true, fillUnits: true, thenAction: true, originId: true, destinationId: true, startedAt: true, arrivesAt: true,
  miningEndsAt: true, completesAt: true, fuelPaid: true, ratePerHour: true, surveyed: true, status: true,
  unitsCredited: true, saleProceeds: true,
} as const;

/** The profile's live orders (pending or held) — one per ship at most. */
export async function loadLiveOrders(profileId: string, db: Db = prisma): Promise<MiningOrderRowLite[]> {
  return db.miningOrder.findMany({
    where: { profileId, status: { in: [MINING_ORDER_PENDING, MINING_ORDER_HELD] } },
    select: ORDER_SELECT,
    take: 500,
  });
}

/**
 * Where the server believes a ship is: the end of its last order, if it ever
 * had one (a completed order ends at destinationId; a held order sits at the
 * field's parent = destinationId too), else the client's persisted
 * currentLocation, else the registry row's build location.
 */
export function resolveShipLocation(
  shipInstanceId: string,
  orders: Array<Pick<MiningOrderRowLite, 'shipInstanceId' | 'status' | 'destinationId' | 'completesAt'>>,
  persistedLocation: string | null,
  rowLocation: string | null,
): string {
  let latest: Pick<MiningOrderRowLite, 'destinationId' | 'completesAt'> | null = null;
  for (const o of orders) {
    if (o.shipInstanceId !== shipInstanceId) continue;
    if (o.status === MINING_ORDER_PENDING) continue;
    if (!latest || o.completesAt.getTime() > latest.completesAt.getTime()) latest = o;
  }
  if (latest) return latest.destinationId;
  return persistedLocation || rowLocation || 'earth_surface';
}

/** Spot price for an ore slug from the shared market row; base price when
 *  the row is missing (the market/init endpoint seeds it from RESOURCES). */
export async function loadOreSpotPrice(slug: string, db: Db = prisma): Promise<number> {
  const base = RESOURCE_MAP.get(slug as ResourceId)?.baseMarketPrice ?? 0;
  try {
    const row = await db.marketResource.findUnique({ where: { slug }, select: { currentPrice: true } });
    const p = row?.currentPrice;
    return typeof p === 'number' && Number.isFinite(p) && p > 0 ? p : base;
  } catch {
    return base;
  }
}

/**
 * Flip due orders and credit their outcome. Idempotent: the status-guarded
 * updateMany means two concurrent passes cannot both credit. Best-effort
 * per order; returns how many orders were settled.
 *
 *   mine + return_store  → status complete, ledger +units of ore
 *   mine + return_sell   → status complete, ledger +units × spot × (1 − fee)
 *   mine + hold          → status held (ore stays aboard, nothing credited)
 *   survey               → status complete (its survey row already exists)
 *   return               → status complete, credit as store/sell above
 * `reserve` on the rock decrements by the units extracted (never below 0).
 */
export async function completeDueMiningOrders(db: Db = prisma, profileId?: string, now: Date = new Date()): Promise<number> {
  let due: MiningOrderRowLite[];
  try {
    due = await db.miningOrder.findMany({
      where: { status: MINING_ORDER_PENDING, completesAt: { lte: now }, ...(profileId ? { profileId } : {}) },
      select: ORDER_SELECT,
      take: 2000,
    });
  } catch {
    return 0;
  }
  if (due.length === 0) return 0;
  const ledgerOn = await isLedgerAvailable();
  let settled = 0;
  for (const o of due) {
    try {
      const isHold = o.mode === 'mine' && o.thenAction === 'hold';
      const nextStatus = isHold ? MINING_ORDER_HELD : MINING_ORDER_COMPLETE;
      const credits = (o.mode === 'mine' && !isHold) || o.mode === 'return';
      const sells = credits && o.thenAction === 'return_sell';
      const spot = sells ? await loadOreSpotPrice(o.oreId, db) : 0;
      const proceeds = sells ? Math.round(o.fillUnits * spot * (1 - MINING_SALE_BROKER_FEE)) : 0;
      const client = db as PrismaClient;
      const run = async (tx: Db): Promise<boolean> => {
        const flipped = await tx.miningOrder.updateMany({
          where: { id: o.id, status: MINING_ORDER_PENDING },
          data: {
            status: nextStatus,
            unitsCredited: credits ? o.fillUnits : 0,
            saleProceeds: proceeds,
          },
        });
        if (flipped.count !== 1) return false;
        if (credits && o.fillUnits > 0) {
          if (sells) {
            await tx.gameProfile.update({ where: { id: o.profileId }, data: { money: { increment: proceeds }, totalEarned: { increment: proceeds } } });
            if (ledgerOn) await recordLedger(tx, { profileId: o.profileId, moneyDelta: proceeds, reason: 'mining_order_sale', refId: o.id });
          } else if (ledgerOn) {
            await recordLedger(tx, { profileId: o.profileId, resourceSlug: o.oreId, resourceDelta: o.fillUnits, reason: 'mining_order_ore', refId: o.id });
          }
        }
        // Depletion (Phase A minimum; exhaustion/respawn are Phase B): the
        // units left the rock when they were extracted.
        if (o.mode === 'mine' && o.asteroidId && o.fillUnits > 0) {
          await tx.asteroid.updateMany({ where: { id: o.asteroidId, reserve: { gte: o.fillUnits } }, data: { reserve: { decrement: o.fillUnits } } });
          await tx.asteroid.updateMany({ where: { id: o.asteroidId, reserve: { lt: o.fillUnits } }, data: { reserve: 0 } });
        }
        return true;
      };
      const ok = typeof (client as PrismaClient).$transaction === 'function'
        ? await (client as PrismaClient).$transaction(run)
        : await run(db);
      if (ok) settled++;
    } catch (err) {
      logger.error('Mining order completion failed', { orderId: o.id, error: String(err) });
    }
  }
  return settled;
}
