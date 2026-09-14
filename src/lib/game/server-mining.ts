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
// Mining Phase B (2026-09-13, docs/SPACE_MINING_DESIGN_2026-09-12.md §8 row
// B): AsteroidClaim rows (stake / release / work / expire / upkeep /
// exhaustion), shared-rock extraction pressure and the NPC shakedown settled
// INSIDE the completion pass, rock events (rubble / spin-up) rolled onto the
// Asteroid row, exhaustion + in-place respawn with field ageing, the mining
// block the sync hands the client (claims, live intel, notices) and the
// public claim feed. Pure rules stay in asteroid-claims.ts, rock-pressure.ts,
// npc-shakedown.ts and asteroids.ts.
//
// Everything is best-effort against a lagging schema (the tables arrive with
// `prisma db push` on deploy); callers wrap what must degrade.

import prisma from '@/lib/db';
import type { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';
import { MINING_SALE_BROKER_FEE } from './mining-orders';
import { RESOURCE_MAP, type ResourceId } from './resources';
import { isLedgerAvailable, recordLedger } from './server-ledger';
import {
  ASTEROID_FIELD_MAP,
  ROCK_RESPAWN_GAME_MONTHS,
  getAsteroid,
  rollRespawnIntel,
  rollRockEvents,
  type AsteroidIntel,
  type SurveyRecord,
} from './asteroids';
import {
  claimExpiresAt,
  claimStakeFee,
  claimUpkeepPerMonth,
  toPublicClaimView,
  type AsteroidClaimRecord,
  type MiningNotice,
  type PublicClaimView,
  type ServerMiningBlock,
} from './asteroid-claims';
import { FRONTIER_DURATION_MS } from './frontier';
import { orderHasReturnLeg, settleShakedown, type EscortCover } from './npc-shakedown';
import { applyRockPressure, rockPressureShare } from './rock-pressure';
// Mining Phase C (2026-09-13): refining, propellant depots, survey reports.
import {
  MOBILE_REFINERY_RECOVERY,
  applyProductLoss,
  refineOutputs,
  refinedUnitTotal,
} from './ore-refining';
import {
  DEPOT_FEEDSTOCK_YIELD,
  depotRestockPricePerUnit,
  feedstockPropellant,
  type DepotRecord,
  type PublicDepotView,
} from './propellant-depots';
import {
  listingFromRow,
  reportSellerProceeds,
  type OwnedSurveyReport,
  type SurveyReportListing,
} from './survey-reports';
import { REAL_MS_PER_GAME_MONTH } from './server-time';
import { SHIP_MAP } from './ships';
import { LOCATION_MAP } from './solar-system';

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
  /** Phase B: live rock events + the re-chart generation. */
  rubbleUntil: Date | null;
  spinUpUntil: Date | null;
  generation: number;
}

const ASTEROID_SELECT = { id: true, fieldId: true, class: true, deltaVExtra: true, grade: true, reserve: true, risk: true, exhaustedAt: true, rubbleUntil: true, spinUpUntil: true, generation: true } as const;

export async function loadAsteroidRow(id: string, db: Db = prisma): Promise<AsteroidRowLite | null> {
  return db.asteroid.findUnique({ where: { id }, select: ASTEROID_SELECT });
}

/** The reveal + live state a survey hands the client (asteroids.ts
 *  SurveyRecord minus the survey stamp). */
export type IntelView = AsteroidIntel & { rubbleUntilMs?: number; spinUpUntilMs?: number; exhausted?: boolean };

export function intelFromRow(row: Pick<AsteroidRowLite, 'grade' | 'reserve' | 'risk'> & Partial<Pick<AsteroidRowLite, 'rubbleUntil' | 'spinUpUntil' | 'exhaustedAt'>>): IntelView {
  const reserve = Math.max(0, Math.round(row.reserve));
  return {
    grade: row.grade, reserve, risk: row.risk,
    ...(row.rubbleUntil ? { rubbleUntilMs: row.rubbleUntil.getTime() } : {}),
    ...(row.spinUpUntil ? { spinUpUntilMs: row.spinUpUntil.getTime() } : {}),
    ...(reserve <= 0 || row.exhaustedAt ? { exhausted: true } : {}),
  };
}

/** A survey is effective when its ship has arrived AND it saw the rock's
 *  CURRENT generation (a re-charted slot reads as unsurveyed again). */
export function surveyIsEffective(survey: { surveyedAt: Date; generation?: number | null }, rockGeneration: number | null | undefined, now: Date): boolean {
  if (survey.surveyedAt.getTime() > now.getTime()) return false;
  return (survey.generation ?? 0) >= (rockGeneration ?? 0);
}

/** The corporation's effective surveys at `now` (a survey order's row only
 *  counts once its ship has arrived; a stale-generation row does not count). */
export async function loadSurveyedIntel(
  profileId: string,
  db: Db = prisma,
  now: Date = new Date(),
): Promise<Record<string, SurveyRecord>> {
  const rows = await db.asteroidSurvey.findMany({
    where: { profileId, surveyedAt: { lte: now } },
    select: { asteroidId: true, surveyedAt: true, via: true, generation: true, asteroid: { select: { grade: true, reserve: true, risk: true, rubbleUntil: true, spinUpUntil: true, exhaustedAt: true, generation: true } } },
    take: 2000,
  });
  const out: Record<string, SurveyRecord> = {};
  for (const r of rows) {
    if (!surveyIsEffective(r, r.asteroid.generation, now)) continue;
    out[r.asteroidId] = { ...intelFromRow(r.asteroid), surveyedAtMs: r.surveyedAt.getTime(), via: r.via === 'ship' ? 'ship' : 'probe' };
  }
  return out;
}

export async function findSurvey(profileId: string, asteroidId: string, db: Db = prisma): Promise<{ surveyedAt: Date; via: string; generation: number } | null> {
  return db.asteroidSurvey.findUnique({ where: { profileId_asteroidId: { profileId, asteroidId } }, select: { surveyedAt: true, via: true, generation: true } });
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
  /** Phase B. */
  escortInstanceId: string | null;
  shakedownUnits: number;
  shakedownRepelled: boolean;
  pressureShare: number;
  claimId: string | null;
  /** Phase C: the cargo is refined PRODUCT (ore-refining.ts), when the plant
   *  finished, the opex burned and the depot that paid part of the fuel. */
  refined: boolean;
  refineEndsAt: Date | null;
  refineOpexPaid: number;
  depotId: string | null;
  depotUnitsDrawn: number;
}

export const ORDER_SELECT = {
  id: true, profileId: true, instanceId: true, shipInstanceId: true, mode: true, asteroidId: true, fieldId: true,
  oreId: true, fillUnits: true, thenAction: true, originId: true, destinationId: true, startedAt: true, arrivesAt: true,
  miningEndsAt: true, completesAt: true, fuelPaid: true, ratePerHour: true, surveyed: true, status: true,
  unitsCredited: true, saleProceeds: true,
  escortInstanceId: true, shakedownUnits: true, shakedownRepelled: true, pressureShare: true, claimId: true,
  refined: true, refineEndsAt: true, refineOpexPaid: true, depotId: true, depotUnitsDrawn: true,
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

/** Corporations (other than `profileId`) whose 'mine' orders on the rock
 *  overlapped the window — the rock-pressure.ts count. Any status counts:
 *  a completed overlapping order still took its share of the face. */
async function countOtherMinersInWindow(db: Db, asteroidId: string, profileId: string, windowStart: Date, windowEnd: Date): Promise<number> {
  try {
    const rows = await db.miningOrder.findMany({
      where: { asteroidId, mode: 'mine', profileId: { not: profileId }, arrivesAt: { lt: windowEnd }, miningEndsAt: { gt: windowStart } },
      select: { profileId: true },
      distinct: ['profileId'],
      take: 200,
    });
    return rows.length;
  } catch {
    return 0;
  }
}

/** Whether the profile is inside the Protected Frontier (createdAt-based —
 *  the same test the build route uses for its first-building exemption). */
export async function profileInFrontier(db: Db, profileId: string, now: Date): Promise<boolean> {
  try {
    const p = await db.gameProfile.findUnique({ where: { id: profileId }, select: { createdAt: true } });
    return !!p && now.getTime() - p.createdAt.getTime() < FRONTIER_DURATION_MS;
  } catch {
    return false;
  }
}

/** STATIONED escort cover: the registry holds a built security hull of this
 *  profile whose persisted position is the field's parent, idle and
 *  unassigned. The hull's existence is server truth (a paid ServerAsset
 *  row); its position is the client-owned condition every route reads
 *  (shipsData) — forging it saves repositioning fuel, nothing more. */
export async function hasStationedEscortAt(db: Db, profileId: string, parentLocationId: string, liveOrders: MiningOrderRowLite[]): Promise<boolean> {
  try {
    const prof = await db.gameProfile.findUnique({ where: { id: profileId }, select: { shipsData: true } });
    const ships = Array.isArray(prof?.shipsData) ? (prof!.shipsData as Array<{ instanceId?: string; definitionId?: string; currentLocation?: string; status?: string; isBuilt?: boolean; escortingOrderId?: string }>) : [];
    const rows = await db.serverAsset.findMany({ where: { profileId, kind: 'ship', status: 'complete' }, select: { instanceId: true, definitionId: true }, take: 500 });
    const built = new Set(rows.filter(r => SHIP_MAP.get(r.definitionId)?.security).map(r => r.instanceId));
    const assigned = new Set(liveOrders.filter(o => o.status === MINING_ORDER_PENDING && o.escortInstanceId).map(o => o.escortInstanceId as string));
    return ships.some(sh => !!sh.instanceId && built.has(sh.instanceId) && sh.currentLocation === parentLocationId && (sh.status ?? 'idle') === 'idle' && !sh.escortingOrderId && !assigned.has(sh.instanceId));
  } catch {
    return false;
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
 *
 * Phase B, in order: (1) shared-rock PRESSURE — the units aboard are
 * fill × rockPressureShare(n) from the corporations whose mine orders
 * overlapped this one's extraction window (share 1 under the holder's own
 * claim); (2) the NPC SHAKEDOWN on the return leg (npc-shakedown.ts,
 * deterministic in the order id; escort cover from the assigned cutter, a
 * stationed cutter, or the Frontier shield); (3) `reserve` decrements by
 * the units EXTRACTED (before the toll — the Corsairs took them from the
 * rock too), exhaustion at 0 releases the rock's claim; (4) the holder's
 * claim is WORKED (lastWorkedAt / expiresAt advance); (5) rubble / spin-up
 * are rolled onto the rock from its risk.
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
      const works = o.mode === 'mine' || o.mode === 'refine';
      const isHold = works && o.thenAction === 'hold';
      const nextStatus = isHold ? MINING_ORDER_HELD : MINING_ORDER_COMPLETE;
      const credits = (works && !isHold) || o.mode === 'return';
      const sells = credits && o.thenAction === 'return_sell';
      const rock = o.asteroidId ? await loadAsteroidRow(o.asteroidId, db) : null;
      const claim = o.asteroidId ? await loadActiveClaim(o.asteroidId, db) : null;
      const mine = claim?.profileId === o.profileId;

      // (1) pressure
      let share = 1;
      if (works && o.asteroidId && !mine) {
        const others = await countOtherMinersInWindow(db, o.asteroidId, o.profileId, o.arrivesAt, o.miningEndsAt);
        share = rockPressureShare(1 + others, false);
      }
      const extracted = works ? applyRockPressure(o.fillUnits, share) : o.fillUnits;
      // Phase C: a refined run flies PRODUCT. The manifest is a pure function
      // of (oreId, ore units, recovery) — never a client claim — and the toll
      // and the credit are both taken on it.
      const products = o.refined ? refineOutputs(o.oreId, extracted, MOBILE_REFINERY_RECOVERY) : {};
      const cargoUnits = o.refined ? refinedUnitTotal(products) : extracted;

      // (2) shakedown on the lane home
      let toll: ReturnType<typeof settleShakedown> | null = null;
      if (credits && orderHasReturnLeg(o.mode, o.thenAction) && cargoUnits > 0) {
        const parent = rock ? (ASTEROID_FIELD_MAP.get(rock.fieldId)?.parentLocationId ?? o.originId) : (ASTEROID_FIELD_MAP.get(o.fieldId)?.parentLocationId ?? o.originId);
        const frontier = await profileInFrontier(db, o.profileId, now);
        let cover: EscortCover = o.escortInstanceId ? 'assigned' : 'none';
        if (cover === 'none' && !frontier) {
          const live = await loadLiveOrders(o.profileId, db);
          if (await hasStationedEscortAt(db, o.profileId, parent, live)) cover = 'stationed';
        }
        toll = settleShakedown(o.id, parent, cover, frontier, cargoUnits);
      }
      const landed = toll ? toll.unitsLanded : cargoUnits;
      const landedProducts = o.refined
        ? applyProductLoss(products, cargoUnits > 0 ? (cargoUnits - landed) / cargoUnits : 0).outputs
        : {};
      let proceeds = 0;
      if (sells) {
        if (o.refined) {
          for (const [slug, qty] of Object.entries(landedProducts)) {
            proceeds += qty * await loadOreSpotPrice(slug, db);
          }
          proceeds = Math.round(proceeds * (1 - MINING_SALE_BROKER_FEE));
        } else {
          proceeds = Math.round(landed * (await loadOreSpotPrice(o.oreId, db)) * (1 - MINING_SALE_BROKER_FEE));
        }
      }
      const client = db as PrismaClient;
      const run = async (tx: Db): Promise<boolean> => {
        const flipped = await tx.miningOrder.updateMany({
          where: { id: o.id, status: MINING_ORDER_PENDING },
          data: {
            status: nextStatus,
            unitsCredited: credits ? landed : 0,
            saleProceeds: proceeds,
            pressureShare: share,
            shakedownUnits: toll?.unitsLost ?? 0,
            shakedownRepelled: !!toll?.repelled,
            claimId: mine && claim ? claim.id : null,
            // A held order keeps the units it actually holds (pressure applied).
            ...(isHold ? { fillUnits: extracted } : {}),
          },
        });
        if (flipped.count !== 1) return false;
        if (credits && landed > 0) {
          if (sells) {
            await tx.gameProfile.update({ where: { id: o.profileId }, data: { money: { increment: proceeds }, totalEarned: { increment: proceeds } } });
            if (ledgerOn) await recordLedger(tx, { profileId: o.profileId, moneyDelta: proceeds, reason: o.refined ? 'refining_sale' : 'mining_order_sale', refId: o.id });
          } else if (ledgerOn) {
            if (o.refined) {
              // Phase C: refining_output is the ONLY path that creates refined
              // product from ore on a synced profile.
              for (const [slug, qty] of Object.entries(landedProducts)) {
                if (qty > 0) await recordLedger(tx, { profileId: o.profileId, resourceSlug: slug, resourceDelta: qty, reason: 'refining_output', refId: o.id });
              }
            } else {
              await recordLedger(tx, { profileId: o.profileId, resourceSlug: o.oreId, resourceDelta: landed, reason: 'mining_order_ore', refId: o.id });
            }
          }
        }
        // (3) depletion + exhaustion
        if (works && o.asteroidId && extracted > 0) {
          await tx.asteroid.updateMany({ where: { id: o.asteroidId, reserve: { gte: extracted } }, data: { reserve: { decrement: extracted } } });
          await tx.asteroid.updateMany({ where: { id: o.asteroidId, reserve: { lt: extracted } }, data: { reserve: 0 } });
          const exhausted = await tx.asteroid.updateMany({ where: { id: o.asteroidId, reserve: { lte: 0 }, exhaustedAt: null }, data: { exhaustedAt: now } });
          if (exhausted.count === 1 && claim) {
            await tx.asteroidClaim.updateMany({ where: { id: claim.id, status: CLAIM_ACTIVE }, data: { status: CLAIM_EXHAUSTED, activeKey: null, releasedAt: now, releaseReason: 'exhausted' } });
          }
        }
        // (4) the holder's claim is worked
        if (works && mine && claim && o.completesAt.getTime() > claim.lastWorkedAt.getTime()) {
          await tx.asteroidClaim.updateMany({ where: { id: claim.id, status: CLAIM_ACTIVE }, data: { lastWorkedAt: o.completesAt, expiresAt: new Date(claimExpiresAt(o.completesAt.getTime())) } });
        }
        // (5) rock events
        if (works && rock) {
          const current = { rubbleUntilMs: rock.rubbleUntil?.getTime(), spinUpUntilMs: rock.spinUpUntil?.getTime() };
          const rolled = rollRockEvents(rock.risk, o.id, o.completesAt.getTime(), current, REAL_MS_PER_GAME_MONTH);
          if (rolled.rubbleUntilMs !== current.rubbleUntilMs || rolled.spinUpUntilMs !== current.spinUpUntilMs) {
            await tx.asteroid.updateMany({ where: { id: rock.id }, data: {
              ...(rolled.rubbleUntilMs !== current.rubbleUntilMs ? { rubbleUntil: rolled.rubbleUntilMs ? new Date(rolled.rubbleUntilMs) : null } : {}),
              ...(rolled.spinUpUntilMs !== current.spinUpUntilMs ? { spinUpUntil: rolled.spinUpUntilMs ? new Date(rolled.spinUpUntilMs) : null } : {}),
            } });
          }
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

// ─── Phase B: claims ─────────────────────────────────────────────────────────

export const CLAIM_ACTIVE = 'active';
export const CLAIM_RELEASED = 'released';
export const CLAIM_EXPIRED = 'expired';
export const CLAIM_LAPSED = 'lapsed';
export const CLAIM_EXHAUSTED = 'exhausted';

/** PlayerActivity.type for the public timeline entries. */
export const CLAIM_STAKED_ACTIVITY = 'asteroid_claim_staked';
export const CLAIM_RELEASED_ACTIVITY = 'asteroid_claim_released';

export interface ClaimRowLite {
  id: string;
  profileId: string;
  asteroidId: string;
  fieldId: string;
  stakedAt: Date;
  lastWorkedAt: Date;
  expiresAt: Date;
  upkeepPaidThrough: Date;
  fee: number;
  upkeepPerMonth: number;
  status: string;
  releasedAt: Date | null;
  releaseReason: string | null;
}

const CLAIM_SELECT = {
  id: true, profileId: true, asteroidId: true, fieldId: true, stakedAt: true, lastWorkedAt: true, expiresAt: true,
  upkeepPaidThrough: true, fee: true, upkeepPerMonth: true, status: true, releasedAt: true, releaseReason: true,
} as const;

export function claimRecordFromRow(row: ClaimRowLite): AsteroidClaimRecord {
  return {
    id: row.id, asteroidId: row.asteroidId, fieldId: row.fieldId,
    stakedAtMs: row.stakedAt.getTime(), lastWorkedAtMs: row.lastWorkedAt.getTime(), expiresAtMs: row.expiresAt.getTime(),
    fee: row.fee, upkeepPerMonth: row.upkeepPerMonth,
  };
}

export async function loadActiveClaim(asteroidId: string, db: Db = prisma): Promise<ClaimRowLite | null> {
  try {
    return await db.asteroidClaim.findFirst({ where: { asteroidId, status: CLAIM_ACTIVE }, select: CLAIM_SELECT });
  } catch {
    return null;
  }
}

export async function loadMyClaims(profileId: string, db: Db = prisma): Promise<ClaimRowLite[]> {
  try {
    return await db.asteroidClaim.findMany({ where: { profileId, status: CLAIM_ACTIVE }, select: CLAIM_SELECT, take: 100 });
  } catch {
    return [];
  }
}

/** Insert the active claim row. Throws Prisma P2002 (unique activeKey) when
 *  another corporation staked first — the route maps it to claimed_by_other. */
export async function createClaimRow(tx: Db, profileId: string, asteroidId: string, fieldId: string, rockClass: string, intel: Pick<AsteroidIntel, 'grade' | 'reserve'>, now: Date): Promise<ClaimRowLite> {
  const fee = claimStakeFee({ class: rockClass as 'C' | 'S' | 'M' | 'X' }, intel);
  return tx.asteroidClaim.create({
    data: {
      profileId, asteroidId, fieldId, activeKey: asteroidId,
      stakedAt: now, lastWorkedAt: now, expiresAt: new Date(claimExpiresAt(now.getTime())),
      upkeepPaidThrough: new Date(now.getTime() + REAL_MS_PER_GAME_MONTH),
      fee, upkeepPerMonth: claimUpkeepPerMonth(fee), status: CLAIM_ACTIVE,
    },
    select: CLAIM_SELECT,
  });
}

/** Flip an active claim to a terminal status (guarded; false when it was
 *  not active any more). */
export async function releaseClaimRow(db: Db, claimId: string, status: string, reason: string, now: Date): Promise<boolean> {
  const r = await db.asteroidClaim.updateMany({ where: { id: claimId, status: CLAIM_ACTIVE }, data: { status, activeKey: null, releasedAt: now, releaseReason: reason } });
  return r.count === 1;
}

/** Public timeline row (best-effort, outside any transaction). */
export async function postClaimActivity(db: Db, profileId: string, type: string, asteroidId: string, detail: string): Promise<void> {
  try {
    const prof = await db.gameProfile.findUnique({ where: { id: profileId }, select: { companyName: true } });
    const rock = getAsteroid(asteroidId);
    const field = rock ? ASTEROID_FIELD_MAP.get(rock.fieldId) : undefined;
    const name = prof?.companyName || 'A corporation';
    await db.playerActivity.create({
      data: {
        profileId, companyName: name, type,
        title: type === CLAIM_STAKED_ACTIVITY ? `${name} staked a claim on ${rock?.name || asteroidId}` : `${name}'s claim on ${rock?.name || asteroidId} ${detail}`,
        description: field ? `${field.name} · ${LOCATION_MAP.get(field.parentLocationId)?.name || field.parentLocationId}` : '',
        metadata: { asteroidId, fieldId: rock?.fieldId ?? null, detail },
      },
    });
  } catch (err) {
    logger.warn('Claim activity row failed', { profileId, asteroidId, error: String(err) });
  }
}

/** Cron pass: active claims past expiresAt lapse (unworked). */
export async function expireDueClaims(db: Db = prisma, now: Date = new Date()): Promise<number> {
  let rows: ClaimRowLite[];
  try {
    rows = await db.asteroidClaim.findMany({ where: { status: CLAIM_ACTIVE, expiresAt: { lte: now } }, select: CLAIM_SELECT, take: 1000 });
  } catch {
    return 0;
  }
  let n = 0;
  for (const c of rows) {
    try {
      if (await releaseClaimRow(db, c.id, CLAIM_EXPIRED, 'unworked', now)) {
        n++;
        await postClaimActivity(db, c.profileId, CLAIM_RELEASED_ACTIVITY, c.asteroidId, 'lapsed unworked');
      }
    } catch (err) {
      logger.warn('Claim expiry failed', { claimId: c.id, error: String(err) });
    }
  }
  return n;
}

/** Cron pass: charge one game-month of upkeep on every active claim whose
 *  paid-through date has passed; an unpayable month lapses the claim. */
export async function chargeClaimUpkeep(db: Db = prisma, now: Date = new Date()): Promise<{ charged: number; lapsed: number }> {
  let rows: ClaimRowLite[];
  try {
    rows = await db.asteroidClaim.findMany({ where: { status: CLAIM_ACTIVE, upkeepPaidThrough: { lte: now } }, select: CLAIM_SELECT, take: 1000 });
  } catch {
    return { charged: 0, lapsed: 0 };
  }
  const ledgerOn = await isLedgerAvailable();
  let charged = 0;
  let lapsed = 0;
  for (const c of rows) {
    try {
      const amt = Math.round(c.upkeepPerMonth);
      const paidThrough = new Date(c.upkeepPaidThrough.getTime() + REAL_MS_PER_GAME_MONTH);
      if (amt <= 0) {
        await db.asteroidClaim.updateMany({ where: { id: c.id, status: CLAIM_ACTIVE }, data: { upkeepPaidThrough: paidThrough } });
        charged++;
        continue;
      }
      const debited = await db.gameProfile.updateMany({ where: { id: c.profileId, money: { gte: amt } }, data: { money: { decrement: amt }, totalSpent: { increment: amt } } });
      if (debited.count === 1) {
        if (ledgerOn) await recordLedger(db, { profileId: c.profileId, moneyDelta: -amt, reason: 'claim_upkeep', refId: `${c.id}:${c.upkeepPaidThrough.getTime()}` });
        await db.asteroidClaim.updateMany({ where: { id: c.id, status: CLAIM_ACTIVE }, data: { upkeepPaidThrough: paidThrough } });
        charged++;
      } else if (await releaseClaimRow(db, c.id, CLAIM_LAPSED, 'unpaid', now)) {
        lapsed++;
        await postClaimActivity(db, c.profileId, CLAIM_RELEASED_ACTIVITY, c.asteroidId, 'lapsed unpaid');
      }
    } catch (err) {
      logger.warn('Claim upkeep failed', { claimId: c.id, error: String(err) });
    }
  }
  return { charged, lapsed };
}

// ─── Phase B: exhaustion → in-place respawn with field ageing ───────────────

const RESPAWN_SALT = () => process.env.ASTEROID_SEED_SALT || 'dev-salt-epoch-2';

/** 1 − Σreserve / ΣinitialReserve over a field's rocks. */
export async function fieldConsumedFraction(db: Db, fieldId: string): Promise<number> {
  try {
    const agg = await db.asteroid.aggregate({ where: { fieldId }, _sum: { reserve: true, initialReserve: true } });
    const init = agg._sum.initialReserve ?? 0;
    const left = agg._sum.reserve ?? 0;
    return init > 0 ? Math.max(0, Math.min(1, 1 - left / init)) : 0;
  } catch {
    return 0;
  }
}

/** Cron pass: rocks exhausted ≥ ROCK_RESPAWN_GAME_MONTHS ago are re-charted
 *  in place — new grade at the AGED field mean, RESPAWN_RESERVE_MULT of a
 *  fresh reserve (initialReserve accumulates so the ageing curve is
 *  monotone), risk re-rolled, events cleared, generation + 1. Existing
 *  surveys go stale by generation (loadSurveyedIntel) — every corporation
 *  has to look again. */
export async function respawnExhaustedRocks(db: Db = prisma, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - ROCK_RESPAWN_GAME_MONTHS * REAL_MS_PER_GAME_MONTH);
  let rows: Array<{ id: string; fieldId: string; generation: number }>;
  try {
    rows = await db.asteroid.findMany({ where: { exhaustedAt: { lte: cutoff } }, select: { id: true, fieldId: true, generation: true }, take: 200 });
  } catch {
    return 0;
  }
  let n = 0;
  for (const r of rows) {
    try {
      const rock = getAsteroid(r.id);
      if (!rock) continue;
      const consumed = await fieldConsumedFraction(db, r.fieldId);
      const gen = r.generation + 1;
      const intel = rollRespawnIntel(rock, RESPAWN_SALT(), gen, consumed);
      const done = await db.asteroid.updateMany({
        where: { id: r.id, generation: r.generation, exhaustedAt: { not: null } },
        data: { grade: intel.grade, reserve: intel.reserve, initialReserve: { increment: intel.reserve }, risk: intel.risk, exhaustedAt: null, rubbleUntil: null, spinUpUntil: null, generation: gen },
      });
      if (done.count === 1) n++;
    } catch (err) {
      logger.warn('Rock respawn failed', { asteroidId: r.id, error: String(err) });
    }
  }
  return n;
}

// ─── Phase B: the mining block the sync hands the client ────────────────────

const NOTICE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const SHAKEDOWN_NOTICE_WINDOW_MS = 48 * 60 * 60 * 1000;

function parentOf(fieldId: string): string {
  return ASTEROID_FIELD_MAP.get(fieldId)?.parentLocationId || 'earth_surface';
}

/** Claims (mine), effective intel with live rock state, and the notices of
 *  the last window: lapsed claims, shakedowns (hit or repelled), exhausted
 *  and re-charted rocks. Notice ids are stable so the client posts each
 *  once (asteroid-claims.ts adoptServerMining). */
export async function loadMiningBlock(profileId: string, db: Db = prisma, now: Date = new Date()): Promise<ServerMiningBlock> {
  const [claimRows, intel] = await Promise.all([loadMyClaims(profileId, db), loadSurveyedIntel(profileId, db, now)]);
  const notices: MiningNotice[] = [];
  const since = new Date(now.getTime() - NOTICE_WINDOW_MS);
  try {
    const released = await db.asteroidClaim.findMany({ where: { profileId, status: { in: [CLAIM_EXPIRED, CLAIM_LAPSED, CLAIM_EXHAUSTED] }, releasedAt: { gte: since } }, select: CLAIM_SELECT, take: 100 });
    for (const c of released) {
      const rock = getAsteroid(c.asteroidId);
      const name = rock?.name || c.asteroidId;
      const kind = c.status === CLAIM_LAPSED ? 'claim_lapsed_unpaid' : c.status === CLAIM_EXHAUSTED ? 'claim_exhausted' : 'claim_expired';
      notices.push({
        id: `claim-${kind}-${c.id}`, kind, atMs: c.releasedAt?.getTime() ?? now.getTime(), asteroidId: c.asteroidId, fieldId: c.fieldId, locationId: parentOf(c.fieldId),
        title: `Claim ${kind === 'claim_exhausted' ? 'closed' : 'lapsed'} — ${name}`,
        body: kind === 'claim_lapsed_unpaid' ? 'The monthly upkeep could not be paid; the claim is void and the rock is open again.'
          : kind === 'claim_exhausted' ? 'The rock is exhausted; the claim closed with it.'
          : 'Unworked for three game-months; the rock is open to every corporation again.',
      });
    }
  } catch { /* lagging schema */ }
  try {
    const shaken = await db.miningOrder.findMany({
      where: { profileId, status: { in: [MINING_ORDER_COMPLETE] }, completesAt: { gte: new Date(now.getTime() - SHAKEDOWN_NOTICE_WINDOW_MS) }, OR: [{ shakedownUnits: { gt: 0 } }, { shakedownRepelled: true }] },
      select: { id: true, asteroidId: true, fieldId: true, completesAt: true, shakedownUnits: true, shakedownRepelled: true, oreId: true, escortInstanceId: true, shipInstanceId: true },
      take: 100,
    });
    for (const o of shaken) {
      const parent = parentOf(o.fieldId);
      const parentName = LOCATION_MAP.get(parent)?.name || parent;
      const oreName = RESOURCE_MAP.get(o.oreId as ResourceId)?.name || o.oreId;
      const hit = o.shakedownUnits > 0;
      notices.push({
        id: `shakedown-${o.id}`, kind: hit ? 'shakedown' : 'shakedown_repelled', atMs: o.completesAt.getTime(), asteroidId: o.asteroidId || '', fieldId: o.fieldId, locationId: parent,
        title: hit ? `Shakedown on the lane from ${parentName}` : `Shakedown repelled off ${parentName}`,
        body: hit ? `Void Corsairs took ${o.shakedownUnits} ${oreName} from the ore run home${o.escortInstanceId ? ' despite the escort' : ''}. An Escort Cutter on the run cuts the odds by 75%.`
          : 'Void Corsairs closed on the ore run; the escort turned them away with nothing lost.',
        ...(hit ? { unitsLost: o.shakedownUnits } : {}),
      });
    }
  } catch { /* lagging schema */ }
  try {
    const surveys = await db.asteroidSurvey.findMany({
      where: { profileId },
      select: { asteroidId: true, generation: true, asteroid: { select: { generation: true, fieldId: true, exhaustedAt: true } } },
      take: 2000,
    });
    for (const sv of surveys) {
      const rock = getAsteroid(sv.asteroidId);
      const name = rock?.name || sv.asteroidId;
      if ((sv.generation ?? 0) < (sv.asteroid.generation ?? 0)) {
        notices.push({ id: `respawn-${sv.asteroidId}-${sv.asteroid.generation}`, kind: 'rock_respawned', atMs: now.getTime(), asteroidId: sv.asteroidId, fieldId: sv.asteroid.fieldId, locationId: parentOf(sv.asteroid.fieldId), title: `Re-charted — ${name}`, body: 'The exhausted slot has been re-charted as a new rock. Your old survey no longer applies — survey it again before staking or mining.' });
      } else if (sv.asteroid.exhaustedAt && sv.asteroid.exhaustedAt.getTime() >= since.getTime()) {
        notices.push({ id: `exhausted-${sv.asteroidId}-${sv.asteroid.generation}`, kind: 'rock_exhausted', atMs: sv.asteroid.exhaustedAt.getTime(), asteroidId: sv.asteroidId, fieldId: sv.asteroid.fieldId, locationId: parentOf(sv.asteroid.fieldId), title: `Exhausted — ${name}`, body: `Nothing left to extract. The slot re-charts as a new rock ${ROCK_RESPAWN_GAME_MONTHS} game-months after exhaustion, at the field's aged grade.` });
      }
    }
  } catch { /* lagging schema */ }
  return { claims: claimRows.map(claimRecordFromRow), intel, notices };
}

// ─── Phase B: the public claim feed ─────────────────────────────────────────

export interface PublicClaimFeed {
  claims: PublicClaimView[];
  /** Corporations with PENDING mine orders per rock (public activity — the
   *  rock-pressure.ts count a quote uses). */
  activity: Record<string, number>;
  generatedAtMs: number;
}

let feedCache: { atMs: number; feed: PublicClaimFeed } | null = null;
const FEED_TTL_MS = 60_000;

/** Every active claim with the holder's corporation NAME (asteroid-claims.ts
 *  header: public by design), plus per-rock activity. Cached a minute for
 *  everyone. */
export async function loadPublicClaimFeed(db: Db = prisma, now: Date = new Date()): Promise<PublicClaimFeed> {
  if (feedCache && now.getTime() - feedCache.atMs < FEED_TTL_MS) return feedCache.feed;
  let claims: PublicClaimView[] = [];
  const activity: Record<string, number> = {};
  try {
    const rows = await db.asteroidClaim.findMany({
      where: { status: CLAIM_ACTIVE },
      select: { asteroidId: true, fieldId: true, stakedAt: true, lastWorkedAt: true, expiresAt: true, profile: { select: { companyName: true } } },
      take: 2000,
    });
    claims = rows.map(r => toPublicClaimView({ ...r, holderName: r.profile?.companyName }));
  } catch { /* lagging schema */ }
  try {
    const pending = await db.miningOrder.findMany({ where: { status: MINING_ORDER_PENDING, mode: 'mine', asteroidId: { not: null } }, select: { asteroidId: true, profileId: true }, take: 5000 });
    const seen = new Map<string, Set<string>>();
    for (const o of pending) {
      if (!o.asteroidId) continue;
      if (!seen.has(o.asteroidId)) seen.set(o.asteroidId, new Set());
      seen.get(o.asteroidId)!.add(o.profileId);
    }
    for (const [id, set] of seen) activity[id] = set.size;
  } catch { /* lagging schema */ }
  const feed = { claims, activity, generatedAtMs: now.getTime() };
  feedCache = { atMs: now.getTime(), feed };
  return feed;
}

/** Test/route hook: drop the feed cache. */
export function resetClaimFeedCache(): void { feedCache = null; }

// ─── Phase C: propellant depots (propellant-depots.ts) ──────────────────────
//
// A PropellantDepot row IS the slot: (fieldId, slotIndex) is unique, so the
// race for a field's finite slots is settled by the database, exactly the way
// AsteroidClaim.activeKey settles the race for a rock. Stock moves only here:
// the route draws units atomically when it quotes an order (a forged stock
// figure on the client buys nothing) and tops them up on a restock.

export const DEPOT_ACTIVE = 'active';
export const DEPOT_RECALLED = 'recalled';

export interface DepotRowLite {
  id: string;
  profileId: string;
  fieldId: string;
  slotIndex: number;
  shipInstanceId: string;
  stockUnits: number;
  capacity: number;
  status: string;
  deployedAt: Date;
}

const DEPOT_SELECT = {
  id: true, profileId: true, fieldId: true, slotIndex: true, shipInstanceId: true,
  stockUnits: true, capacity: true, status: true, deployedAt: true,
} as const;

export function depotRecordFromRow(row: DepotRowLite): DepotRecord {
  return {
    id: row.id, fieldId: row.fieldId, slotIndex: row.slotIndex, shipInstanceId: row.shipInstanceId,
    stockUnits: Math.max(0, Math.round(row.stockUnits * 100) / 100), capacity: row.capacity,
    deployedAtMs: row.deployedAt.getTime(),
  };
}

export async function loadMyDepots(profileId: string, db: Db = prisma): Promise<DepotRowLite[]> {
  try {
    return await db.propellantDepot.findMany({ where: { profileId, status: DEPOT_ACTIVE }, select: DEPOT_SELECT, take: 50 });
  } catch {
    return [];
  }
}

/** This corporation's active depot at one field, if any. */
export async function findMyDepot(profileId: string, fieldId: string, db: Db = prisma): Promise<DepotRowLite | null> {
  try {
    return await db.propellantDepot.findFirst({ where: { profileId, fieldId, status: DEPOT_ACTIVE }, select: DEPOT_SELECT });
  } catch {
    return null;
  }
}

/** Slot indices already held at a field (by anyone). */
export async function loadFieldDepotSlots(fieldId: string, db: Db = prisma): Promise<number[]> {
  try {
    const rows = await db.propellantDepot.findMany({ where: { fieldId, status: DEPOT_ACTIVE }, select: { slotIndex: true }, take: 50 });
    return rows.map(r => r.slotIndex);
  } catch {
    return [];
  }
}

export async function createDepotRow(tx: Db, profileId: string, fieldId: string, slotIndex: number, shipInstanceId: string, capacity: number, now: Date): Promise<DepotRowLite> {
  return tx.propellantDepot.create({
    data: {
      profileId, fieldId, slotIndex, activeKey: `${fieldId}:${slotIndex}`, shipInstanceId,
      stockUnits: 0, capacity: Math.max(0, Math.floor(capacity)), status: DEPOT_ACTIVE, deployedAt: now,
    },
    select: DEPOT_SELECT,
  });
}

/** Release the slot (status-guarded). The propellant left in the tank is lost
 *  with it — recalling a depot is not a refund. */
export async function recallDepotRow(db: Db, depotId: string, now: Date): Promise<boolean> {
  try {
    const r = await db.propellantDepot.updateMany({
      where: { id: depotId, status: DEPOT_ACTIVE },
      data: { status: DEPOT_RECALLED, activeKey: null, stockUnits: 0, recalledAt: now },
    });
    return r.count === 1;
  } catch {
    return false;
  }
}

/** Atomic draw. Returns false when the tank moved under us — the caller then
 *  quotes the order at full cash price rather than crediting a discount that
 *  was never funded. */
export async function drawDepotFuel(tx: Db, depotId: string, units: number): Promise<boolean> {
  const u = Math.max(0, Math.round(units * 1000) / 1000);
  if (u <= 0) return true;
  const r = await tx.propellantDepot.updateMany({
    where: { id: depotId, status: DEPOT_ACTIVE, stockUnits: { gte: u } },
    data: { stockUnits: { decrement: u } },
  });
  return r.count === 1;
}

/** Atomic top-up, capped at the tank. Returns the units actually loaded. */
export async function addDepotStock(tx: Db, depot: DepotRowLite, units: number): Promise<number> {
  const room = Math.max(0, depot.capacity - depot.stockUnits);
  const load = Math.min(room, Math.max(0, Math.round(units * 1000) / 1000));
  if (load <= 0) return 0;
  const r = await tx.propellantDepot.updateMany({
    where: { id: depot.id, status: DEPOT_ACTIVE, stockUnits: { lte: depot.capacity - load } },
    data: { stockUnits: { increment: load } },
  });
  return r.count === 1 ? load : 0;
}

/** The public depot register: who holds which slot at which field. Stock
 *  levels are never public (propellant-depots.ts PublicDepotView). */
export async function loadPublicDepots(db: Db = prisma): Promise<PublicDepotView[]> {
  try {
    const rows = await db.propellantDepot.findMany({
      where: { status: DEPOT_ACTIVE },
      select: { fieldId: true, slotIndex: true, deployedAt: true, profile: { select: { companyName: true } } },
      take: 200,
    });
    return rows.map(r => ({
      fieldId: r.fieldId, slotIndex: r.slotIndex,
      holderName: r.profile?.companyName || 'A corporation',
      deployedAtMs: r.deployedAt.getTime(),
    }));
  } catch {
    return [];
  }
}

/** Cash cost of `units` of propellant delivered to a field, at the live
 *  rocket-fuel spot (the market row, not the client's figure). */
export async function depotRestockCost(fieldId: string, units: number, db: Db = prisma): Promise<{ perUnit: number; total: number }> {
  const spot = await loadOreSpotPrice('rocket_fuel', db);
  const perUnit = depotRestockPricePerUnit(fieldId, spot);
  return { perUnit, total: Math.round(perUnit * Math.max(0, units)) };
}

/** Propellant units a feedstock delivery yields (server-side check that the
 *  slug is one the depot actually cracks). */
export function depotFeedstockUnits(slug: string, qty: number): number {
  return DEPOT_FEEDSTOCK_YIELD[slug] ? feedstockPropellant(slug, qty) : 0;
}

// ─── Phase C: survey reports (survey-reports.ts) ────────────────────────────
//
// A report is the corporation's own AsteroidSurvey row with a price on it.
// Listing writes three columns; buying writes the BUYER a survey row of their
// own at the seller's generation, moves the money seller <- buyer minus the
// burned broker cut, and bumps the seller's soldCount. Nothing about the rock
// is revealed by the listing itself.

export interface SurveyReportRow {
  id: string;
  profileId: string;
  asteroidId: string;
  surveyedAt: Date;
  generation: number;
  listedPrice: number | null;
  listedAt: Date | null;
  soldCount: number;
}

const REPORT_SELECT = {
  id: true, profileId: true, asteroidId: true, surveyedAt: true, generation: true,
  listedPrice: true, listedAt: true, soldCount: true,
} as const;

export async function findReportById(id: string, db: Db = prisma): Promise<SurveyReportRow | null> {
  try {
    return await db.asteroidSurvey.findUnique({ where: { id }, select: REPORT_SELECT });
  } catch {
    return null;
  }
}

/** Put a price on one of the corporation's own surveys. */
export async function listReportRow(db: Db, profileId: string, asteroidId: string, price: number, now: Date): Promise<boolean> {
  try {
    const r = await db.asteroidSurvey.updateMany({
      where: { profileId, asteroidId },
      data: { listedPrice: Math.round(price), listedAt: now },
    });
    return r.count === 1;
  } catch {
    return false;
  }
}

export async function unlistReportRow(db: Db, profileId: string, asteroidId: string): Promise<boolean> {
  try {
    const r = await db.asteroidSurvey.updateMany({ where: { profileId, asteroidId }, data: { listedPrice: null, listedAt: null } });
    return r.count === 1;
  } catch {
    return false;
  }
}

/** The corporation's own surveys with their listing state. */
export async function loadMyReports(profileId: string, db: Db = prisma, now: Date = new Date()): Promise<OwnedSurveyReport[]> {
  try {
    const rows = await db.asteroidSurvey.findMany({
      where: { profileId, surveyedAt: { lte: now } },
      select: { ...REPORT_SELECT, asteroid: { select: { fieldId: true, generation: true, exhaustedAt: true } } },
      orderBy: { surveyedAt: 'desc' },
      take: 300,
    });
    return rows
      .filter(r => surveyIsEffective(r, r.asteroid.generation, now) && !r.asteroid.exhaustedAt)
      .map(r => ({
        id: r.id,
        asteroidId: r.asteroidId,
        rockName: getAsteroid(r.asteroidId)?.name || r.asteroidId,
        fieldId: r.asteroid.fieldId,
        price: r.listedPrice ?? null,
        listedAtMs: r.listedAt ? r.listedAt.getTime() : null,
        soldCount: r.soldCount,
        surveyedAtMs: r.surveyedAt.getTime(),
        earned: reportSellerProceeds(r.listedPrice ?? 0) * r.soldCount,
      }));
  } catch {
    return [];
  }
}

/** Every live listing. Rows the viewer already holds an effective survey of
 *  are filtered out by the caller (there is nothing left to buy). */
export async function loadReportMarket(db: Db = prisma, now: Date = new Date(), viewerProfileId?: string): Promise<SurveyReportListing[]> {
  try {
    const rows = await db.asteroidSurvey.findMany({
      where: { listedPrice: { not: null }, surveyedAt: { lte: now } },
      select: {
        ...REPORT_SELECT,
        profile: { select: { companyName: true } },
        asteroid: { select: { fieldId: true, generation: true, exhaustedAt: true } },
      },
      orderBy: { listedAt: 'desc' },
      take: 200,
    });
    return rows
      .filter(r => surveyIsEffective(r, r.asteroid.generation, now) && !r.asteroid.exhaustedAt)
      .map(r => listingFromRow({
        id: r.id, asteroidId: r.asteroidId, fieldId: r.asteroid.fieldId,
        listedPrice: r.listedPrice, listedAt: r.listedAt, surveyedAt: r.surveyedAt, soldCount: r.soldCount,
        sellerName: r.profile?.companyName, mine: !!viewerProfileId && r.profileId === viewerProfileId,
      }));
  } catch {
    return [];
  }
}

// ─── Phase C: sweep surveys (Survey Cruiser) ────────────────────────────────

/**
 * The extra rocks a sweep reveals: the nearest UNSURVEYED, unexhausted rocks
 * of the same field, ordered by how close their delta-v surcharge is to the
 * target's (the cruiser works outward from where it parked). Server-picked —
 * the client only mirrors the count.
 */
export async function pickSweepTargets(
  profileId: string,
  fieldId: string,
  fromAsteroidId: string,
  count: number,
  db: Db = prisma,
  now: Date = new Date(),
): Promise<string[]> {
  const want = Math.max(0, Math.floor(count));
  if (want <= 0) return [];
  try {
    const target = getAsteroid(fromAsteroidId);
    const rows = await db.asteroid.findMany({
      where: { fieldId, exhaustedAt: null },
      select: { id: true, deltaVExtra: true, generation: true },
      take: 200,
    });
    const surveys = await db.asteroidSurvey.findMany({
      where: { profileId, asteroidId: { in: rows.map(r => r.id) } },
      select: { asteroidId: true, surveyedAt: true, generation: true },
      take: 200,
    });
    const seen = new Map(surveys.map(sv => [sv.asteroidId, sv]));
    const base = target?.deltaVExtra ?? 0;
    return rows
      .filter(r => r.id !== fromAsteroidId)
      .filter(r => {
        const sv = seen.get(r.id);
        return !sv || !surveyIsEffective(sv, r.generation, now);
      })
      .sort((a, b) => Math.abs(a.deltaVExtra - base) - Math.abs(b.deltaVExtra - base))
      .slice(0, want)
      .map(r => r.id);
  } catch {
    return [];
  }
}
