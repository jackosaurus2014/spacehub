// ─── Ship transit — the SERVER half (ship traffic Phase 2, 2026-09-14) ──────
// The prisma I/O for the ShipTransit model, modelled line for line on
// server-mining.ts (completeDueMiningOrders) and server-expeditions.ts
// (advanceDueExpeditions): every writer takes its `db` as an argument so the
// cron passes the client and a route can pass a transaction, every writer is
// status-guarded so a double pass is a no-op, and every reader degrades to
// "no transits" against a lagging schema rather than throwing a sync.
//
// What this closes. `GET /api/space-tycoon/traffic` used to derive every
// other corporation's ship position from `GameProfile.shipsData` — the blob
// the client last synced — so a contact lagged whoever had not synced, a
// ship that had arrived showed as "holding at its destination" until its
// owner came back, and nothing the server said about another player's fleet
// was authoritative. Positions now come from rows whose clock the server
// stamped.
//
// WHICH MOVEMENTS WERE ALREADY COVERED. Mining legs were: a Mining Order is
// a server row with originId / destinationId / startedAt / arrivesAt /
// miningEndsAt / completesAt, and mining-orders.ts synthesises the client's
// route blob from it. So this module does not duplicate them — it PROJECTS
// them into the same traffic shape (`miningOrderTransits`). Everything else
// — freight dispatch (cargo-logistics.ts dispatchShipWithCargo), the Fleet
// Tender's auto-rove, and any manual map dispatch — had no server record at
// all, and is what ShipTransit newly covers.
//
// Time loop: TACTICAL. The 5-minute assets-complete pass closes legs whose
// arrival has passed, beside the Mining-Order settlement and the expedition
// advance.

import prisma from '@/lib/db';
import type { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';
import { getTravelTime } from './ships';
import { laneKey } from './trade-lanes';
import { ASTEROID_FIELD_MAP } from './asteroids';
import {
  TRANSIT_ARRIVED,
  TRANSIT_CANCELLED,
  TRANSIT_IN_FLIGHT,
  clampTravelMs,
  type ServerTransitBlock,
  type TrafficTransitRow,
} from './ship-transit';

type Db = Prisma.TransactionClient | PrismaClient;

// ─── Bounds ─────────────────────────────────────────────────────────────────

/** Rows the traffic pool will pull in one build. The per-requester feed is
 *  capped at 2,000 contacts regardless (ship-traffic.ts TRAFFIC_FEED_CAP);
 *  this bounds the scan. */
export const MAX_TRAFFIC_TRANSIT_ROWS = 5000;
/** How long a LANDED leg keeps standing in for its hull in the traffic pool.
 *  Without it, a ship that arrived while its owner was away would vanish
 *  from the map entirely (the blob still says "in transit", and a blob
 *  in-transit ship is no longer trusted for a position). */
export const TRANSIT_ARRIVED_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
/** Legs one sync may back-fill. A player does not plausibly dispatch more
 *  than this between syncs; the rest are picked up on the next one. */
export const MAX_TRANSIT_BACKFILL_PER_SYNC = 60;

// ─── Row shape ──────────────────────────────────────────────────────────────

export interface ShipTransitRow {
  id: string;
  profileId: string;
  shipInstanceId: string;
  shipDefinitionId: string;
  originId: string;
  destinationId: string;
  laneKey: string;
  departedAt: Date;
  arrivesAt: Date;
  arrivedAt: Date | null;
  cargo: unknown;
  cargoUnits: number;
  status: string;
  source: string;
}

export const SHIP_TRANSIT_SELECT = {
  id: true, profileId: true, shipInstanceId: true, shipDefinitionId: true,
  originId: true, destinationId: true, laneKey: true,
  departedAt: true, arrivesAt: true, arrivedAt: true,
  cargo: true, cargoUnits: true, status: true, source: true,
} as const;

/** "<profileId>:<shipInstanceId>" — the unique key that makes "one live leg
 *  per hull" a database guarantee rather than a hope (AsteroidClaim idiom). */
export function transitActiveKey(profileId: string, shipInstanceId: string): string {
  return `${profileId}:${shipInstanceId}`;
}

function cargoRecord(raw: unknown): Record<string, number> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function transitBlock(row: ShipTransitRow): ServerTransitBlock {
  return {
    id: row.id,
    shipInstanceId: row.shipInstanceId,
    shipDefinitionId: row.shipDefinitionId,
    originId: row.originId,
    destinationId: row.destinationId,
    departedAtMs: row.departedAt.getTime(),
    arrivesAtMs: row.arrivesAt.getTime(),
    arrivedAtMs: row.arrivedAt ? row.arrivedAt.getTime() : null,
    status: row.status,
    cargo: cargoRecord(row.cargo),
  };
}

// ─── Reads ──────────────────────────────────────────────────────────────────

/** The owner's own live legs plus anything that landed recently — the block
 *  the sync hands back for `adoptServerTransits`. Degrades to [] on a
 *  lagging schema. */
export async function loadOwnTransits(profileId: string, db: Db = prisma, now: Date = new Date(), take = 200): Promise<ShipTransitRow[]> {
  try {
    return await db.shipTransit.findMany({
      where: {
        profileId,
        OR: [
          { status: TRANSIT_IN_FLIGHT },
          { status: TRANSIT_ARRIVED, arrivedAt: { gte: new Date(now.getTime() - TRANSIT_ARRIVED_GRACE_MS) } },
        ],
      },
      select: SHIP_TRANSIT_SELECT,
      orderBy: { departedAt: 'desc' },
      take,
    });
  } catch { return []; }
}

export async function findLiveTransit(profileId: string, shipInstanceId: string, db: Db = prisma): Promise<ShipTransitRow | null> {
  try {
    return await db.shipTransit.findFirst({
      where: { profileId, shipInstanceId, status: TRANSIT_IN_FLIGHT },
      select: SHIP_TRANSIT_SELECT,
    });
  } catch { return null; }
}

// ─── Creation (the dispatch path) ───────────────────────────────────────────

export interface CreateTransitInput {
  profileId: string;
  shipInstanceId: string;
  shipDefinitionId: string;
  originId: string;
  destinationId: string;
  /** What the client says the journey takes. CLAMPED against the catalogue
   *  travel time for the leg — the server decides the arrival, always. */
  claimedTravelMs?: number | null;
  cargo?: Record<string, number> | null;
  now: Date;
  source?: 'dispatch' | 'adopted';
}

/**
 * Stamp a leg. The schedule is written here and never moves again: a later
 * sync cannot bring the arrival forward, and a client that never syncs again
 * still has a ship that arrives.
 *
 * Any leg still open for the same hull is CANCELLED first — a hull flies one
 * leg at a time, and `activeKey`'s unique index is what makes that true under
 * a race (two tabs dispatching the same ship land one row, not two).
 */
export async function createTransitRow(db: Db, input: CreateTransitInput): Promise<ShipTransitRow> {
  const key = transitActiveKey(input.profileId, input.shipInstanceId);
  await db.shipTransit.updateMany({
    where: { activeKey: key },
    data: { status: TRANSIT_CANCELLED, activeKey: null },
  });
  const travelMs = clampTravelMs(
    typeof input.claimedTravelMs === 'number' ? input.claimedTravelMs : 0,
    getTravelTime(input.originId, input.destinationId),
  );
  const cargo = cargoRecord(input.cargo ?? null);
  const cargoUnits = cargo ? Object.values(cargo).reduce((a, b) => a + b, 0) : 0;
  return db.shipTransit.create({
    data: {
      profileId: input.profileId,
      activeKey: key,
      shipInstanceId: input.shipInstanceId,
      shipDefinitionId: input.shipDefinitionId,
      originId: input.originId,
      destinationId: input.destinationId,
      laneKey: laneKey(input.originId, input.destinationId),
      departedAt: input.now,
      arrivesAt: new Date(input.now.getTime() + travelMs),
      cargo: cargo ?? undefined,
      cargoUnits,
      status: TRANSIT_IN_FLIGHT,
      source: input.source ?? 'dispatch',
    },
    select: SHIP_TRANSIT_SELECT,
  });
}

/** Close a leg the owner abandoned (a recall, a scrapped hull). Only ever
 *  costs the reporter visibility, so it is safe to accept from a sync. */
export async function cancelLiveTransit(db: Db, profileId: string, shipInstanceId: string): Promise<boolean> {
  try {
    const done = await db.shipTransit.updateMany({
      where: { profileId, shipInstanceId, status: TRANSIT_IN_FLIGHT },
      data: { status: TRANSIT_CANCELLED, activeKey: null },
    });
    return done.count > 0;
  } catch { return false; }
}

// ─── The cron pass ──────────────────────────────────────────────────────────

/**
 * Land every leg whose clock has run out, in the assets-complete pass beside
 * the Mining-Order settlement and the expedition advance. Idempotent: the
 * flip is a status-guarded updateMany, and clearing `activeKey` frees the
 * hull for its next dispatch.
 *
 * Nothing is credited here. The manifest is credited exactly once by the
 * client engine's transit-arrival branch (cargo-logistics.ts debits it at
 * departure); this pass owns the CLOCK, not the goods.
 */
export async function advanceDueTransits(db: Db = prisma, profileId?: string, now: Date = new Date()): Promise<number> {
  let due: Array<Pick<ShipTransitRow, 'id'>>;
  try {
    due = await db.shipTransit.findMany({
      where: { status: TRANSIT_IN_FLIGHT, arrivesAt: { lte: now }, ...(profileId ? { profileId } : {}) },
      select: { id: true },
      take: 1000,
    });
  } catch { return 0; }
  let landed = 0;
  for (const row of due) {
    try {
      const flipped = await db.shipTransit.updateMany({
        where: { id: row.id, status: TRANSIT_IN_FLIGHT },
        data: { status: TRANSIT_ARRIVED, arrivedAt: now, activeKey: null },
      });
      if (flipped.count === 1) landed++;
    } catch (err) {
      logger.error('Ship transit advance failed', { transitId: row.id, error: String(err) });
    }
  }
  return landed;
}

// ─── Back-fill from a synced fleet ──────────────────────────────────────────

interface BlobShip {
  instanceId?: string;
  definitionId?: string;
  status?: string;
  isBuilt?: boolean;
  route?: { from?: string; to?: string; departedAtMs?: number; arrivalAtMs?: number; cargo?: Record<string, number> };
}

export interface TransitReconcileResult {
  created: number;
  cancelled: number;
}

/**
 * MIGRATION + on-ramp in one. Existing saves hold routes with timestamps but
 * no server row, and the freight/auto-rove dispatch paths are client-side
 * mutators that no route sees. So every sync reconciles the fleet it just
 * persisted against the transit table:
 *
 *   a ship in flight with no live row  → a row is stamped, `source:
 *     'adopted'`, with the arrival CLAMPED against the catalogue travel time
 *     for the leg (ship-transit.ts clampTravelMs). A save claiming "Earth →
 *     Pluto, arriving in one second" gets the floor, not the claim;
 *   a live row whose hull is no longer flying that leg → cancelled (only
 *     ever costs the owner visibility, so it is safe to take their word);
 *   a live row whose hull IS flying that leg → left exactly as stamped. The
 *     client cannot re-time a leg by re-syncing it.
 *
 * This is deliberately the migration path rather than a one-off script: a
 * script would fix the rows that exist today and leave every legacy client
 * that never calls the dispatch route uncovered forever. Reconciling on sync
 * back-fills both, is idempotent, and needs no deploy-day coordination.
 */
export async function reconcileShipTransits(
  db: Db,
  profileId: string,
  shipsData: unknown,
  now: Date = new Date(),
): Promise<TransitReconcileResult> {
  const out: TransitReconcileResult = { created: 0, cancelled: 0 };
  const ships: BlobShip[] = Array.isArray(shipsData) ? (shipsData as BlobShip[]) : [];
  let live: ShipTransitRow[];
  try {
    live = await db.shipTransit.findMany({ where: { profileId, status: TRANSIT_IN_FLIGHT }, select: SHIP_TRANSIT_SELECT, take: 500 });
  } catch { return out; }

  const liveByShip = new Map<string, ShipTransitRow>();
  for (const row of live) liveByShip.set(row.shipInstanceId, row);

  const seen = new Set<string>();
  for (const s of ships) {
    if (out.created >= MAX_TRANSIT_BACKFILL_PER_SYNC) break;
    if (!s || typeof s.instanceId !== 'string' || typeof s.definitionId !== 'string') continue;
    if (s.isBuilt === false || s.status !== 'in_transit') continue;
    const r = s.route;
    if (!r || typeof r.from !== 'string' || typeof r.to !== 'string' || r.from === r.to) continue;
    if (typeof r.departedAtMs !== 'number' || typeof r.arrivalAtMs !== 'number') continue;
    if (!Number.isFinite(r.departedAtMs) || !Number.isFinite(r.arrivalAtMs)) continue;
    if (r.arrivalAtMs <= r.departedAtMs) continue;
    // A leg already landed by the client's own clock is not worth a row.
    if (r.arrivalAtMs <= now.getTime()) continue;

    const existing = liveByShip.get(s.instanceId);
    if (existing) {
      // Same leg: the server's stamp stands, untouched. A different leg means
      // the hull was re-dispatched locally — supersede the old row.
      if (existing.originId === r.from && existing.destinationId === r.to) { seen.add(s.instanceId); continue; }
    }
    try {
      // The departure the client reports is trusted only as far as "not in
      // the future and not older than the leg it claims"; the DURATION is
      // clamped, so the arrival is the server's figure either way.
      const departedAt = new Date(Math.min(now.getTime(), Math.max(r.departedAtMs, now.getTime() - 400 * 24 * 60 * 60 * 1000)));
      await createTransitRow(db, {
        profileId,
        shipInstanceId: s.instanceId,
        shipDefinitionId: s.definitionId,
        originId: r.from,
        destinationId: r.to,
        claimedTravelMs: r.arrivalAtMs - r.departedAtMs,
        cargo: r.cargo ?? null,
        now: departedAt,
        source: 'adopted',
      });
      out.created++;
      seen.add(s.instanceId);
    } catch (err) {
      logger.warn('Ship transit back-fill failed', { profileId, shipInstanceId: s.instanceId, error: String(err) });
    }
  }

  // Legs the fleet no longer claims. Only reached when the owner's own sync
  // says the hull is not on that leg any more.
  for (const [shipInstanceId, row] of liveByShip) {
    if (seen.has(shipInstanceId)) continue;
    const s = ships.find(x => x?.instanceId === shipInstanceId);
    if (!s) continue; // hull not in this payload at all — leave the leg alone
    const flyingSameLeg = s.status === 'in_transit' && s.route?.from === row.originId && s.route?.to === row.destinationId;
    if (flyingSameLeg) continue;
    if (await cancelLiveTransit(db, profileId, shipInstanceId)) out.cancelled++;
  }
  return out;
}

// ─── The traffic pool's source ──────────────────────────────────────────────

function toTrafficRow(row: ShipTransitRow): TrafficTransitRow {
  return {
    profileId: row.profileId,
    shipInstanceId: row.shipInstanceId,
    shipDefinitionId: row.shipDefinitionId,
    originId: row.originId,
    destinationId: row.destinationId,
    departedAtMs: row.departedAt.getTime(),
    arrivesAtMs: row.arrivesAt.getTime(),
    status: row.status,
    cargo: cargoRecord(row.cargo),
  };
}

interface MiningLegRow {
  profileId: string;
  shipInstanceId: string;
  fieldId: string;
  originId: string;
  destinationId: string;
  status: string;
  startedAt: Date;
  arrivesAt: Date;
  miningEndsAt: Date;
  completesAt: Date;
  oreId: string;
  fillUnits: number;
}

/**
 * Mining legs were ALREADY server-authoritative — the Mining Order is the
 * row, and mining-orders.ts builds the client's route blob from it. So they
 * are projected into the same traffic shape rather than duplicated into
 * ShipTransit: whichever leg of the order is current at `now` becomes one
 * transit row.
 *
 *   before miningEndsAt → outbound: origin → the field's parent body;
 *   after               → inbound:  parent body → the order's destination.
 *
 * A leg whose arrival has already passed reads as a HOLD at that end, which
 * is exactly right: the hull is working the rock, or it is home.
 */
export function miningOrderTransits(rows: readonly MiningLegRow[], nowMs: number = Date.now()): TrafficTransitRow[] {
  const out: TrafficTransitRow[] = [];
  for (const o of rows) {
    const parent = ASTEROID_FIELD_MAP.get(o.fieldId)?.parentLocationId;
    if (!parent) continue;
    const inbound = nowMs >= o.miningEndsAt.getTime();
    const originId = inbound ? parent : o.originId;
    const destinationId = inbound ? o.destinationId : parent;
    if (originId === destinationId) continue;
    const departedAtMs = (inbound ? o.miningEndsAt : o.startedAt).getTime();
    const arrivesAtMs = (inbound ? o.completesAt : o.arrivesAt).getTime();
    if (!(arrivesAtMs > departedAtMs)) continue;
    out.push({
      profileId: o.profileId,
      shipInstanceId: o.shipInstanceId,
      shipDefinitionId: '',
      originId,
      destinationId,
      departedAtMs,
      arrivesAtMs,
      status: TRANSIT_IN_FLIGHT,
      // The hold only ever carries ore on the way home.
      cargo: inbound && o.fillUnits > 0 ? { [o.oreId]: o.fillUnits } : null,
    });
  }
  return out;
}

/**
 * Every hull the world can see moving, newest leg first: the ShipTransit
 * rows (live, plus recently landed so an absent owner's ship still reads as
 * arrived rather than vanishing) merged with the Mining-Order projection.
 * Degrades to [] on a lagging schema — the feed then shows only its NPC
 * backdrop and holding contacts, never a stale position.
 */
export async function loadTrafficTransits(db: Db = prisma, nowMs: number = Date.now()): Promise<TrafficTransitRow[]> {
  let transits: ShipTransitRow[] = [];
  try {
    transits = await db.shipTransit.findMany({
      where: {
        OR: [
          { status: TRANSIT_IN_FLIGHT },
          { status: TRANSIT_ARRIVED, arrivedAt: { gte: new Date(nowMs - TRANSIT_ARRIVED_GRACE_MS) } },
        ],
      },
      select: SHIP_TRANSIT_SELECT,
      orderBy: { departedAt: 'desc' },
      take: MAX_TRAFFIC_TRANSIT_ROWS,
    });
  } catch { transits = []; }

  let mining: MiningLegRow[] = [];
  try {
    mining = await db.miningOrder.findMany({
      where: { status: { in: ['pending', 'held'] } },
      select: {
        profileId: true, shipInstanceId: true, fieldId: true, originId: true, destinationId: true,
        status: true, startedAt: true, arrivesAt: true, miningEndsAt: true, completesAt: true,
        oreId: true, fillUnits: true,
      },
      orderBy: { startedAt: 'desc' },
      take: MAX_TRAFFIC_TRANSIT_ROWS,
    });
  } catch { mining = []; }

  const merged = [...transits.map(toTrafficRow), ...miningOrderTransits(mining, nowMs)];
  merged.sort((a, b) => b.departedAtMs - a.departedAtMs);
  return merged;
}
