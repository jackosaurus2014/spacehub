// ─── Space Tycoon: HQ relocation — the SERVER half (CC-2) ───────────────────
// docs/COMMAND_CENTER_DESIGN_2026-09-13.md §2-3, §8. Prisma I/O for the
// world-scoped seat pool (HqSeat) and the relocation project (HqRelocation).
// Server-authoritative like the assets routes: GameProfile.hqLocationId is
// written ONLY by completeDueHqRelocations below (the sync READS it and
// hands the client the block; it never mirrors the client's claim any more).
//
// Seats reuse the orbital-slot LEASE idea (finite pool, term, released to
// market) but not the OrbitalSlotAuction tables: those are keyed by
// locationId with a per-location occupancy bucket and building-tied idle
// fees, and an HQ seat is a different asset kind (one per corporation, held
// by the HQ itself, no building to idle against). A minimal first-come
// lease at a posted occupancy-indexed price (hq-relocation.ts
// postedSeatPrice) is the CC-2 shape; CC-3's Mars+ seats go to auction.
//
// Every writer is best-effort against a lagging schema (the models are
// additive; `prisma db push` runs in the Railway build): a missing table
// degrades to "no seats / no project", never to a thrown sync.

import prisma from '@/lib/db';
import type { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';
import { WORLD_EPOCH } from './world-reset';
import {
  DEFAULT_HQ_STAGE,
  HQ_SEAT_COUNTS,
  HQ_STAGES,
  getHqStage,
  hqStageForLocationId,
  isHqStageId,
  type HqStageId,
} from './headquarters';
import { HQ_SEAT_TERM_MS, postedSeatPrice, type ServerHeadquartersBlock } from './hq-relocation';

type Db = Prisma.TransactionClient | PrismaClient;

export const HQ_RELOCATION_PENDING = 'pending';
export const HQ_RELOCATION_COMPLETE = 'complete';

/** PlayerActivity.type for the public timeline entry on completion. */
export const HQ_RELOCATED_ACTIVITY = 'hq_relocated';

export interface HqSeatRow {
  id: string;
  epoch: number;
  stage: string;
  index: number;
  holderProfileId: string | null;
  leaseUntil: Date | null;
  leasePrice: number;
  lastPrice: number;
}

export interface HqRelocationRow {
  id: string;
  profileId: string;
  fromStage: string;
  toStage: string;
  seatId: string | null;
  cost: number;
  seatPrice: number;
  status: string;
  startedAt: Date;
  completesAt: Date;
  completedAt: Date | null;
}

const SEAT_SELECT = { id: true, epoch: true, stage: true, index: true, holderProfileId: true, leaseUntil: true, leasePrice: true, lastPrice: true } as const;
const RELOCATION_SELECT = { id: true, profileId: true, fromStage: true, toStage: true, seatId: true, cost: true, seatPrice: true, status: true, startedAt: true, completesAt: true, completedAt: true } as const;

// ─── Seat pool ───────────────────────────────────────────────────────────────

/** Make sure every seat row for this epoch + stage exists (idempotent; the
 *  unique (epoch, stage, index) key makes a concurrent double-create a
 *  no-op via skipDuplicates). */
export async function ensureHqSeatPool(stage: HqStageId, db: Db = prisma, epoch: number = WORLD_EPOCH): Promise<number> {
  const total = HQ_SEAT_COUNTS[stage] || 0;
  if (total <= 0) return 0;
  const existing = await db.hqSeat.count({ where: { epoch, stage } });
  if (existing >= total) return total;
  const have = new Set((await db.hqSeat.findMany({ where: { epoch, stage }, select: { index: true } })).map(r => r.index));
  const data: Prisma.HqSeatCreateManyInput[] = [];
  for (let i = 1; i <= total; i++) if (!have.has(i)) data.push({ epoch, stage, index: i });
  if (data.length > 0) await db.hqSeat.createMany({ data, skipDuplicates: true });
  return total;
}

export interface HqSeatPoolSummary {
  stage: HqStageId;
  total: number;
  occupied: number;
  free: number;
  /** Posted price for the NEXT seat at the current occupancy. */
  postedPrice: number;
  /** Last clearing price across the pool (0 until a seat has changed hands). */
  lastClearingPrice: number;
}

export async function loadHqSeatPoolSummary(stage: HqStageId, db: Db = prisma, epoch: number = WORLD_EPOCH): Promise<HqSeatPoolSummary> {
  const total = HQ_SEAT_COUNTS[stage] || 0;
  if (total <= 0) return { stage, total: 0, occupied: 0, free: 0, postedPrice: 0, lastClearingPrice: 0 };
  let occupied = 0;
  let lastClearingPrice = 0;
  try {
    await ensureHqSeatPool(stage, db, epoch);
    occupied = await db.hqSeat.count({ where: { epoch, stage, holderProfileId: { not: null } } });
    const last = await db.hqSeat.findFirst({ where: { epoch, stage, lastPrice: { gt: 0 } }, orderBy: { updatedAt: 'desc' }, select: { lastPrice: true } });
    lastClearingPrice = last?.lastPrice ?? 0;
  } catch { /* table may lag */ }
  return { stage, total, occupied, free: Math.max(0, total - occupied), postedPrice: postedSeatPrice(stage, occupied, total), lastClearingPrice };
}

/** The seat this profile holds at a stage (lease still live), if any. */
export async function findHeldHqSeat(profileId: string, stage: HqStageId, db: Db = prisma, epoch: number = WORLD_EPOCH): Promise<HqSeatRow | null> {
  try {
    return await db.hqSeat.findFirst({ where: { epoch, stage, holderProfileId: profileId }, select: SEAT_SELECT });
  } catch { return null; }
}

/** All seats a profile holds (any stage) — the public label reader. */
export async function findHqSeatsHeld(profileIds: readonly string[], db: Db = prisma, epoch: number = WORLD_EPOCH): Promise<Map<string, HqSeatRow>> {
  const out = new Map<string, HqSeatRow>();
  if (profileIds.length === 0) return out;
  try {
    const rows = await db.hqSeat.findMany({ where: { epoch, holderProfileId: { in: [...profileIds] } }, select: SEAT_SELECT, orderBy: { updatedAt: 'desc' } });
    for (const r of rows) if (r.holderProfileId && !out.has(r.holderProfileId)) out.set(r.holderProfileId, r);
  } catch { /* table may lag */ }
  return out;
}

export class HqSeatUnavailableError extends Error {}

/** Claim the lowest-index free seat at `stage` for `profileId` at the
 *  posted price. Runs INSIDE the relocation transaction; the updateMany
 *  guard (`holderProfileId: null`) makes two corporations racing for the
 *  last seat lose cleanly — the loser throws HqSeatUnavailableError and the
 *  transaction rolls back its debit. */
export async function claimHqSeat(tx: Db, profileId: string, stage: HqStageId, now: Date, epoch: number = WORLD_EPOCH): Promise<{ seat: HqSeatRow; price: number }> {
  await ensureHqSeatPool(stage, tx, epoch);
  const total = HQ_SEAT_COUNTS[stage] || 0;
  const occupied = await tx.hqSeat.count({ where: { epoch, stage, holderProfileId: { not: null } } });
  const price = postedSeatPrice(stage, occupied, total);
  const free = await tx.hqSeat.findFirst({ where: { epoch, stage, holderProfileId: null }, orderBy: { index: 'asc' }, select: SEAT_SELECT });
  if (!free) throw new HqSeatUnavailableError('no seat available');
  const claimed = await tx.hqSeat.updateMany({
    where: { id: free.id, holderProfileId: null },
    data: {
      holderProfileId: profileId,
      leaseUntil: new Date(now.getTime() + HQ_SEAT_TERM_MS),
      leasePrice: price,
      lastPrice: price,
      priceHistory: tape(await readPriceHistory(tx, free.id), { at: now.toISOString(), price, event: 'claimed' }),
    },
  });
  if (claimed.count !== 1) throw new HqSeatUnavailableError('seat taken');
  return { seat: { ...free, holderProfileId: profileId, leaseUntil: new Date(now.getTime() + HQ_SEAT_TERM_MS), leasePrice: price, lastPrice: price }, price };
}

/** One entry on a seat's clearing-price tape. */
interface PriceTapeEntry { at: string; price: number; event: 'claimed' | 'released' | 'renewed' }

async function readPriceHistory(db: Db, seatId: string): Promise<PriceTapeEntry[]> {
  try {
    const row = await db.hqSeat.findUnique({ where: { id: seatId }, select: { priceHistory: true } });
    const h = row?.priceHistory;
    return Array.isArray(h) ? (h as unknown as PriceTapeEntry[]).slice(-48) : [];
  } catch { return []; }
}

function tape(history: PriceTapeEntry[], entry: PriceTapeEntry): Prisma.InputJsonValue {
  return [...history, entry] as unknown as Prisma.InputJsonValue;
}

/** Release every seat `profileId` holds EXCEPT at `keepStage` (the seat it
 *  is moving into). The vacated seat re-lists at the pool's posted price
 *  (design §2 "sells it at market") and records the release on its tape. */
export async function releaseHqSeats(tx: Db, profileId: string, keepStage: HqStageId | null, now: Date, epoch: number = WORLD_EPOCH): Promise<number> {
  const held = await tx.hqSeat.findMany({ where: { epoch, holderProfileId: profileId }, select: SEAT_SELECT });
  let released = 0;
  for (const seat of held) {
    if (keepStage && seat.stage === keepStage) continue;
    const stage = isHqStageId(seat.stage) ? seat.stage : null;
    const occupied = stage ? await tx.hqSeat.count({ where: { epoch, stage, holderProfileId: { not: null } } }) : 0;
    const relist = stage ? postedSeatPrice(stage, Math.max(0, occupied - 1)) : 0;
    const r = await tx.hqSeat.updateMany({
      where: { id: seat.id, holderProfileId: profileId },
      data: {
        holderProfileId: null, leaseUntil: null, leasePrice: 0, lastPrice: relist,
        priceHistory: tape(await readPriceHistory(tx, seat.id), { at: now.toISOString(), price: relist, event: 'released' }),
      },
    });
    released += r.count;
  }
  return released;
}

// ─── Relocation projects ─────────────────────────────────────────────────────

export async function loadPendingHqRelocation(profileId: string, db: Db = prisma): Promise<HqRelocationRow | null> {
  try {
    return await db.hqRelocation.findFirst({ where: { profileId, status: HQ_RELOCATION_PENDING }, orderBy: { startedAt: 'desc' }, select: RELOCATION_SELECT });
  } catch { return null; }
}

export async function loadLatestCompleteHqRelocation(profileId: string, db: Db = prisma): Promise<HqRelocationRow | null> {
  try {
    return await db.hqRelocation.findFirst({ where: { profileId, status: HQ_RELOCATION_COMPLETE }, orderBy: { completesAt: 'desc' }, select: RELOCATION_SELECT });
  } catch { return null; }
}

/**
 * Flip due projects (completesAt <= now): status → complete, the profile's
 * hqLocationId → the target seat, seats held elsewhere released, and the
 * public 'hq_relocated' PlayerActivity posted (the world feed / diplomacy
 * timeline entry). Run by the assets-complete cron every 5 minutes and
 * lazily by the sync for the syncing profile BEFORE its monthly-gross
 * ceiling is computed, so the server bonus and the persisted seat can
 * never disagree within one sync. Idempotent: the status-guarded
 * updateMany makes a double run a no-op. Best-effort per row.
 */
export async function completeDueHqRelocations(db: Db = prisma, profileId?: string, now: Date = new Date()): Promise<number> {
  let due: Array<HqRelocationRow & { profile?: { companyName: string } | null }>;
  try {
    due = await db.hqRelocation.findMany({
      where: { status: HQ_RELOCATION_PENDING, completesAt: { lte: now }, ...(profileId ? { profileId } : {}) },
      select: RELOCATION_SELECT,
      take: 500,
    });
  } catch { return 0; }
  let completed = 0;
  for (const row of due) {
    if (!isHqStageId(row.toStage)) continue;
    const stage = getHqStage(row.toStage);
    try {
      const done = await (db as PrismaClient).$transaction(async (tx) => {
        const flipped = await tx.hqRelocation.updateMany({
          where: { id: row.id, status: HQ_RELOCATION_PENDING },
          data: { status: HQ_RELOCATION_COMPLETE, completedAt: now },
        });
        if (flipped.count !== 1) return false;
        await tx.gameProfile.update({ where: { id: row.profileId }, data: { hqLocationId: stage.locationId } });
        await releaseHqSeats(tx, row.profileId, stage.id, now);
        return true;
      });
      if (!done) continue;
      completed++;
      // Public timeline entry (design §8 call 4: the MOVE is public; the
      // project was hidden until this moment). Outside the transaction —
      // a failed feed row must not undo a completed move.
      try {
        const prof = await db.gameProfile.findUnique({ where: { id: row.profileId }, select: { companyName: true } });
        const seat = await findHeldHqSeat(row.profileId, stage.id, db);
        await db.playerActivity.create({
          data: {
            profileId: row.profileId,
            companyName: prof?.companyName || 'A corporation',
            type: HQ_RELOCATED_ACTIVITY,
            title: `${prof?.companyName || 'A corporation'} relocated its headquarters to the ${stage.label}`,
            description: seat ? `Seated at ${stage.shortLabel} seat ${seat.index}.` : stage.lore,
            metadata: { stage: stage.id, fromStage: row.fromStage, seatIndex: seat?.index ?? null, relocationId: row.id },
          },
        });
      } catch (err) {
        logger.warn('HQ relocation feed row failed', { relocationId: row.id, error: String(err) });
      }
    } catch (err) {
      logger.error('HQ relocation completion failed', { relocationId: row.id, error: String(err) });
    }
  }
  return completed;
}

/**
 * Seat leases auto-renew while the HQ stays (the corporation is seated at
 * the stage, or its pending project targets it); otherwise the seat is
 * released to the pool. Cron pass; best-effort.
 */
export async function renewHqSeatLeases(db: Db = prisma, now: Date = new Date(), epoch: number = WORLD_EPOCH): Promise<{ renewed: number; released: number }> {
  let renewed = 0;
  let released = 0;
  let expiring: HqSeatRow[];
  try {
    expiring = await db.hqSeat.findMany({ where: { epoch, holderProfileId: { not: null }, leaseUntil: { lte: now } }, select: SEAT_SELECT, take: 500 });
  } catch { return { renewed, released }; }
  for (const seat of expiring) {
    if (!seat.holderProfileId || !isHqStageId(seat.stage)) continue;
    try {
      const prof = await db.gameProfile.findUnique({ where: { id: seat.holderProfileId }, select: { hqLocationId: true } });
      const seated = !!prof && hqStageForLocationId(prof.hqLocationId).id === seat.stage;
      const inbound = !!(await db.hqRelocation.findFirst({ where: { profileId: seat.holderProfileId, status: HQ_RELOCATION_PENDING, toStage: seat.stage }, select: { id: true } }));
      if (prof && (seated || inbound)) {
        const r = await db.hqSeat.updateMany({
          where: { id: seat.id, holderProfileId: seat.holderProfileId },
          data: {
            leaseUntil: new Date(Math.max(now.getTime(), seat.leaseUntil?.getTime() ?? now.getTime()) + HQ_SEAT_TERM_MS),
            priceHistory: tape(await readPriceHistory(db, seat.id), { at: now.toISOString(), price: seat.leasePrice, event: 'renewed' }),
          },
        });
        renewed += r.count;
      } else {
        released += await releaseHqSeats(db, seat.holderProfileId, null, now, epoch);
      }
    } catch (err) {
      logger.warn('HQ seat renewal failed', { seatId: seat.id, error: String(err) });
    }
  }
  return { renewed, released };
}

// ─── The block the sync hands the client ─────────────────────────────────────

/** Server truth for one profile: seated stage (from GameProfile.hqLocationId),
 *  its seat, and the pending project (visible to the OWNER only — public
 *  readers never call this). `movedAtMs` is the last completed project's
 *  scheduled completesAt (so the client's locally flipped move carries the
 *  same mail id), or the founding date. */
export async function loadHeadquartersBlock(
  profile: { id: string; hqLocationId: string | null | undefined; createdAt: Date },
  db: Db = prisma,
  now: Date = new Date(),
): Promise<ServerHeadquartersBlock> {
  const stage = hqStageForLocationId(profile.hqLocationId);
  const [seat, pending, latest] = await Promise.all([
    HQ_SEAT_COUNTS[stage.id] > 0 ? findHeldHqSeat(profile.id, stage.id, db) : Promise.resolve(null),
    loadPendingHqRelocation(profile.id, db),
    loadLatestCompleteHqRelocation(profile.id, db),
  ]);
  let project: ServerHeadquartersBlock['project'] = null;
  if (pending && isHqStageId(pending.toStage) && pending.completesAt.getTime() > now.getTime()) {
    let seatIndex: number | null = null;
    if (pending.seatId) {
      try {
        const s = await db.hqSeat.findUnique({ where: { id: pending.seatId }, select: { index: true, holderProfileId: true } });
        if (s && s.holderProfileId === profile.id) seatIndex = s.index;
      } catch { /* ignore */ }
    }
    project = { targetStage: pending.toStage, startedAtMs: pending.startedAt.getTime(), completesAtMs: pending.completesAt.getTime(), seatIndex, relocationId: pending.id };
  }
  return {
    stage: stage.id,
    locationId: stage.locationId,
    seatIndex: seat?.index ?? null,
    movedAtMs: latest && isHqStageId(latest.toStage) && latest.toStage === stage.id ? latest.completesAt.getTime() : profile.createdAt.getTime(),
    project,
  };
}

/** Public seat labels for a set of profiles ("LEO seat 7"), keyed by
 *  profile id. Only seats at the profile's CURRENT stage count — a seat
 *  reserved by a pending relocation stays hidden (design §8 call 4). */
export async function loadPublicHqSeatIndex(
  profiles: ReadonlyArray<{ id: string; hqLocationId: string | null | undefined }>,
  db: Db = prisma,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const held = await findHqSeatsHeld(profiles.map(p => p.id), db);
  for (const p of profiles) {
    const stage = hqStageForLocationId(p.hqLocationId);
    if (stage.id === DEFAULT_HQ_STAGE) continue;
    // findHqSeatsHeld keeps one seat per holder (newest); a corporation
    // holds at most its current seat plus an inbound reservation, so check
    // the stage explicitly.
    const seat = held.get(p.id);
    if (seat && seat.stage === stage.id) out.set(p.id, seat.index);
  }
  if (out.size < profiles.length) {
    // Holders whose newest seat is an inbound reservation: look up the
    // current-stage seat directly (rare — only mid-relocation).
    for (const p of profiles) {
      if (out.has(p.id)) continue;
      const stage = hqStageForLocationId(p.hqLocationId);
      if (stage.id === DEFAULT_HQ_STAGE) continue;
      const seat = await findHeldHqSeat(p.id, stage.id, db);
      if (seat) out.set(p.id, seat.index);
    }
  }
  return out;
}

/** The ladder's live seat facts for GET /hq, one row per stage. */
export async function loadHqSeatPools(db: Db = prisma): Promise<Record<HqStageId, HqSeatPoolSummary>> {
  const out = {} as Record<HqStageId, HqSeatPoolSummary>;
  for (const s of HQ_STAGES) out[s.id] = await loadHqSeatPoolSummary(s.id, db);
  return out;
}
