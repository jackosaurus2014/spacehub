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
// CC-3 adds three passes to the same cron family:
//   chargeHqSeatUpkeep()      — monthly rent through the ledger; two
//                               unpayable months lapse the seat and send the
//                               headquarters home to Earth.
//   resolveDueHqSeatAuctions()— sealed-bid seat auctions for Mars and
//                               outward (hq-seat-auctions.ts is the pure
//                               half; the resolution math is the orbital-slot
//                               auction's, imported rather than copied).
//   awardHqSeat()             — the one place a seat changes hands at an
//                               auction's clearing price, and the one place
//                               that enforces "never two seats".
//
// Every writer is best-effort against a lagging schema (the models are
// additive; `prisma db push` runs in the Railway build): a missing table
// degrades to "no seats / no project", never to a thrown sync.

import prisma from '@/lib/db';
import type { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';
import { recordLedger, isLedgerAvailable } from './server-ledger';
import { REAL_MS_PER_GAME_MONTH } from './server-time';
import { WORLD_EPOCH } from './world-reset';
import {
  DEFAULT_HQ_STAGE,
  HQ_SEAT_COUNTS,
  HQ_STAGES,
  HQ_UPKEEP_MONTHLY,
  getHqStage,
  hqSeatIsAuctioned,
  hqStageForLocationId,
  isHqStageId,
  type HqStageId,
} from './headquarters';
import {
  HQ_SEAT_TERM_MS, hqUpkeepAfterMissedMonth, hqUpkeepStatus, postedSeatPrice,
  type HqUpkeepStatus, type ServerHeadquartersBlock,
} from './hq-relocation';
import {
  HQ_SEAT_AUCTION_EXPIRED, HQ_SEAT_AUCTION_OPEN, HQ_SEAT_AUCTION_RESOLVED,
  HQ_SEAT_AUCTION_WINDOW_MS, HQ_SEAT_BID_OPEN, HQ_SEAT_BID_REFUNDED, HQ_SEAT_BID_WON,
  hqAuctionReserve, hqMinimumBid, hqSeatConflict, resolveHqSeatAuction,
} from './hq-seat-auctions';

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
  /** CC-3 upkeep cursor. */
  upkeepPaidThrough?: Date | null;
  upkeepMissedMonths?: number;
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

const SEAT_SELECT = {
  id: true, epoch: true, stage: true, index: true, holderProfileId: true,
  leaseUntil: true, leasePrice: true, lastPrice: true,
  upkeepPaidThrough: true, upkeepMissedMonths: true,
} as const;

/** PlayerActivity.type when a seat lapses for unpaid rent — public, like the
 *  move itself (design §8 call 4: where a rival sits is intelligence). */
export const HQ_SEAT_LAPSED_ACTIVITY = 'hq_seat_lapsed';
/** PlayerActivity.type when a seat clears at auction. The clearing price is
 *  published: "ownership transfers at market-clearing prices" is only true
 *  if the price is legible. */
export const HQ_SEAT_AUCTION_ACTIVITY = 'hq_seat_auction';
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
      // CC-3: rent starts running from the moment the seat is held.
      upkeepPaidThrough: now,
      upkeepMissedMonths: 0,
      priceHistory: tape(await readPriceHistory(tx, free.id), { at: now.toISOString(), price, event: 'claimed' }),
    },
  });
  if (claimed.count !== 1) throw new HqSeatUnavailableError('seat taken');
  return { seat: { ...free, holderProfileId: profileId, leaseUntil: new Date(now.getTime() + HQ_SEAT_TERM_MS), leasePrice: price, lastPrice: price }, price };
}

/** One entry on a seat's clearing-price tape. */
interface PriceTapeEntry { at: string; price: number; event: 'claimed' | 'released' | 'renewed' | 'auction' }

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
        upkeepPaidThrough: null, upkeepMissedMonths: 0,
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

// ─── CC-3: seat upkeep, charged server-side ─────────────────────────────────

/** The upkeep facts the Headquarters console renders for the seated stage. */
export interface HqSeatUpkeepView extends HqUpkeepStatus {
  seatIndex: number | null;
  stage: HqStageId;
}

/** The seated stage's upkeep state for one profile (GET /hq). Earth — or a
 *  profile whose seat row has not been created yet — reads as "nothing due". */
export async function loadHqUpkeepView(
  profile: { id: string; hqLocationId: string | null | undefined },
  db: Db = prisma,
  now: Date = new Date(),
  epoch: number = WORLD_EPOCH,
): Promise<HqSeatUpkeepView> {
  const stage = hqStageForLocationId(profile.hqLocationId);
  const neutral: HqSeatUpkeepView = {
    stage: stage.id, seatIndex: null,
    ...hqUpkeepStatus({ stage: stage.id, upkeepPaidThroughMs: now.getTime(), missedMonths: 0, seatSinceMs: now.getTime() }, now.getTime()),
  };
  if (HQ_SEAT_COUNTS[stage.id] <= 0) return { ...neutral, monthly: HQ_UPKEEP_MONTHLY[stage.id] };
  const seat = await findHeldHqSeat(profile.id, stage.id, db, epoch);
  if (!seat) return { ...neutral, monthly: HQ_UPKEEP_MONTHLY[stage.id] };
  return {
    stage: stage.id,
    seatIndex: seat.index,
    ...hqUpkeepStatus({
      stage: seat.stage,
      upkeepPaidThroughMs: seat.upkeepPaidThrough ? seat.upkeepPaidThrough.getTime() : null,
      missedMonths: seat.upkeepMissedMonths || 0,
      seatSinceMs: seat.leaseUntil ? seat.leaseUntil.getTime() - HQ_SEAT_TERM_MS : now.getTime(),
    }, now.getTime()),
  };
}

/**
 * Lapse a seat for unpaid rent: the anchorage returns to the pool at the
 * posted price and the headquarters goes home to Earth (a corporation
 * cannot sit at a station it is not paying for). Public on the timeline —
 * where a rival sits is intelligence, and so is losing the seat. Best
 * effort; a failed feed row never undoes the lapse.
 */
export async function lapseHqSeat(db: Db, seat: HqSeatRow, now: Date, epoch: number = WORLD_EPOCH): Promise<boolean> {
  const holder = seat.holderProfileId;
  if (!holder || !isHqStageId(seat.stage)) return false;
  const stage = getHqStage(seat.stage);
  try {
    await (db as PrismaClient).$transaction(async (tx) => {
      await releaseHqSeats(tx, holder, null, now, epoch);
      const prof = await tx.gameProfile.findUnique({ where: { id: holder }, select: { hqLocationId: true } });
      if (prof && hqStageForLocationId(prof.hqLocationId).id === stage.id) {
        await tx.gameProfile.update({ where: { id: holder }, data: { hqLocationId: getHqStage(DEFAULT_HQ_STAGE).locationId } });
      }
    });
  } catch (err) {
    logger.error('HQ seat lapse failed', { seatId: seat.id, error: String(err) });
    return false;
  }
  try {
    const prof = await db.gameProfile.findUnique({ where: { id: holder }, select: { companyName: true } });
    const name = prof?.companyName || 'A corporation';
    await db.playerActivity.create({
      data: {
        profileId: holder,
        companyName: name,
        type: HQ_SEAT_LAPSED_ACTIVITY,
        title: `${name} lost its ${stage.shortLabel} seat to unpaid rent`,
        description: `The ${stage.label} anchorage returns to the pool. The headquarters is back at the Earth Operations Center.`,
        metadata: { stage: stage.id, seatIndex: seat.index, reason: 'upkeep_unpaid' },
      },
    });
  } catch (err) {
    logger.warn('HQ seat lapse feed row failed', { seatId: seat.id, error: String(err) });
  }
  return true;
}

/**
 * Cron pass: charge ONE game-month of seat rent on every held seat whose
 * paid-through cursor has passed. A charge the wallet cannot cover counts a
 * missed month; HQ_SEAT_UPKEEP_GRACE_MONTHS consecutive misses lapse the
 * seat. The rent is BURNED ('hq_seat_upkeep') — it is not paid to anyone.
 *
 * Charging one month per pass (the AsteroidClaim precedent) means a server
 * that was asleep catches up over successive 5-minute passes instead of
 * presenting a lump bill nobody budgeted for. Best-effort per row.
 */
export async function chargeHqSeatUpkeep(db: Db = prisma, now: Date = new Date(), epoch: number = WORLD_EPOCH): Promise<{ charged: number; missed: number; lapsed: number }> {
  let seats: HqSeatRow[];
  try {
    seats = await db.hqSeat.findMany({
      where: { epoch, holderProfileId: { not: null }, OR: [{ upkeepPaidThrough: null }, { upkeepPaidThrough: { lte: now } }] },
      select: SEAT_SELECT,
      take: 500,
    });
  } catch { return { charged: 0, missed: 0, lapsed: 0 }; }
  const ledgerOn = await isLedgerAvailable();
  let charged = 0;
  let missed = 0;
  let lapsed = 0;
  for (const seat of seats) {
    if (!seat.holderProfileId || !isHqStageId(seat.stage)) continue;
    const amount = Math.round(HQ_UPKEEP_MONTHLY[seat.stage] || 0);
    const cursor = seat.upkeepPaidThrough ?? now;
    const nextCursor = new Date(cursor.getTime() + REAL_MS_PER_GAME_MONTH);
    try {
      if (amount <= 0) {
        // Earth-priced seat (or a stage with the rent switched off): advance
        // the cursor so the row stops being selected every pass.
        await db.hqSeat.updateMany({ where: { id: seat.id, holderProfileId: seat.holderProfileId }, data: { upkeepPaidThrough: nextCursor, upkeepMissedMonths: 0 } });
        charged++;
        continue;
      }
      const paid = await db.gameProfile.updateMany({
        where: { id: seat.holderProfileId, money: { gte: amount } },
        data: { money: { decrement: amount }, totalSpent: { increment: amount } },
      });
      if (paid.count === 1) {
        if (ledgerOn) {
          await recordLedger(db, {
            profileId: seat.holderProfileId, moneyDelta: -amount,
            reason: 'hq_seat_upkeep', refId: `${seat.id}:${cursor.getTime()}`,
          });
        }
        await db.hqSeat.updateMany({ where: { id: seat.id, holderProfileId: seat.holderProfileId }, data: { upkeepPaidThrough: nextCursor, upkeepMissedMonths: 0 } });
        charged++;
        continue;
      }
      // Unpayable month.
      const after = hqUpkeepAfterMissedMonth(seat.upkeepMissedMonths || 0);
      await db.hqSeat.updateMany({
        where: { id: seat.id, holderProfileId: seat.holderProfileId },
        data: { upkeepPaidThrough: nextCursor, upkeepMissedMonths: after.missedMonths },
      });
      missed++;
      if (after.lapsed && await lapseHqSeat(db, seat, now, epoch)) lapsed++;
    } catch (err) {
      logger.warn('HQ seat upkeep charge failed', { seatId: seat.id, error: String(err) });
    }
  }
  return { charged, missed, lapsed };
}

// ─── CC-3: sealed-bid seat auctions (Mars and outward) ──────────────────────

export interface HqSeatAuctionRow {
  id: string;
  epoch: number;
  stage: string;
  seatId: string;
  reserve: number;
  status: string;
  openedAt: Date;
  closesAt: Date;
  resolvedAt: Date | null;
  winnerProfileId: string | null;
  clearingPrice: number | null;
}

const AUCTION_SELECT = {
  id: true, epoch: true, stage: true, seatId: true, reserve: true, status: true,
  openedAt: true, closesAt: true, resolvedAt: true, winnerProfileId: true, clearingPrice: true,
} as const;

export class HqAuctionError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

/** Open auctions at a stage (or every stage when `stage` is omitted). */
export async function loadOpenHqSeatAuctions(stage?: HqStageId, db: Db = prisma, epoch: number = WORLD_EPOCH): Promise<HqSeatAuctionRow[]> {
  try {
    return await db.hqSeatAuction.findMany({
      where: { epoch, status: HQ_SEAT_AUCTION_OPEN, ...(stage ? { stage } : {}) },
      select: AUCTION_SELECT,
      orderBy: { closesAt: 'asc' },
      take: 100,
    });
  } catch { return []; }
}

export interface HqAuctionSummary {
  id: string;
  stage: HqStageId;
  seatIndex: number | null;
  reserve: number;
  bidCount: number;
  minimumBid: number;
  closesAtMs: number;
  /** This profile's standing bid, if it has one. */
  myBid: number | null;
}

/** The auction rows the ladder publishes for one viewer. Bids are SEALED:
 *  the count and the viewer's OWN amount are visible, no rival's amount ever
 *  is — what is published is the MINIMUM a new bid must clear, which is all
 *  a bidder needs and reveals nothing about who bid it. */
export async function loadHqAuctionSummaries(profileId: string | null, db: Db = prisma, epoch: number = WORLD_EPOCH): Promise<HqAuctionSummary[]> {
  const auctions = await loadOpenHqSeatAuctions(undefined, db, epoch);
  if (auctions.length === 0) return [];
  const out: HqAuctionSummary[] = [];
  for (const a of auctions) {
    if (!isHqStageId(a.stage)) continue;
    let highBid = 0;
    let bidCount = 0;
    let myBid: number | null = null;
    let seatIndex: number | null = null;
    try {
      const bids = await db.hqSeatBid.findMany({ where: { auctionId: a.id, status: HQ_SEAT_BID_OPEN }, select: { profileId: true, amount: true } });
      bidCount = bids.length;
      for (const b of bids) {
        if (b.amount > highBid) highBid = b.amount;
        if (profileId && b.profileId === profileId) myBid = b.amount;
      }
      const seat = await db.hqSeat.findUnique({ where: { id: a.seatId }, select: { index: true } });
      seatIndex = seat?.index ?? null;
    } catch { /* tables may lag */ }
    out.push({
      id: a.id, stage: a.stage, seatIndex, reserve: a.reserve,
      bidCount, minimumBid: hqMinimumBid(a.reserve, highBid), closesAtMs: a.closesAt.getTime(), myBid,
    });
  }
  return out;
}

/**
 * Open an auction for the lowest-index vacant seat at `stage`. Auctions are
 * demand-driven, not scheduled: a pool of 4 seats with nobody qualified to
 * bid would otherwise cycle through empty auctions forever. The caller (the
 * seat-auction route) posts an opening bid in the same transaction, so an
 * open auction always has at least one bidder.
 *
 * Refuses when the stage is not an auction stage, when every seat is taken,
 * or when that seat already has an auction running.
 */
export async function openHqSeatAuction(tx: Db, stage: HqStageId, now: Date, epoch: number = WORLD_EPOCH): Promise<{ auction: HqSeatAuctionRow; seatIndex: number }> {
  if (!hqSeatIsAuctioned(stage)) throw new HqAuctionError('not_auctioned', 'Seats at this stage are leased first-come, not auctioned.');
  await ensureHqSeatPool(stage, tx, epoch);
  const total = HQ_SEAT_COUNTS[stage] || 0;
  const occupied = await tx.hqSeat.count({ where: { epoch, stage, holderProfileId: { not: null } } });
  const openIds = (await tx.hqSeatAuction.findMany({ where: { epoch, stage, status: HQ_SEAT_AUCTION_OPEN }, select: { seatId: true } })).map(r => r.seatId);
  const free = await tx.hqSeat.findFirst({
    where: { epoch, stage, holderProfileId: null, ...(openIds.length > 0 ? { id: { notIn: openIds } } : {}) },
    orderBy: { index: 'asc' },
    select: { id: true, index: true },
  });
  if (!free) throw new HqAuctionError('no_seat', 'Every seat at this stage is taken or already under auction.');
  const reserve = hqAuctionReserve(stage, occupied, total);
  const auction = await tx.hqSeatAuction.create({
    data: {
      epoch, stage, seatId: free.id, reserve, status: HQ_SEAT_AUCTION_OPEN,
      openedAt: now, closesAt: new Date(now.getTime() + HQ_SEAT_AUCTION_WINDOW_MS),
    },
    select: AUCTION_SELECT,
  });
  return { auction, seatIndex: free.index };
}

/**
 * Hand a seat to an auction winner at the clearing price. The ONE place a
 * seat changes hands at auction, and the one place the "never two seats"
 * invariant is enforced: everything the winner holds elsewhere is released
 * in the same transaction before the new seat is stamped.
 */
export async function awardHqSeat(tx: Db, seatId: string, profileId: string, clearingPrice: number, now: Date, epoch: number = WORLD_EPOCH): Promise<boolean> {
  const claimed = await tx.hqSeat.updateMany({
    where: { id: seatId, holderProfileId: null },
    data: {
      holderProfileId: profileId,
      leaseUntil: new Date(now.getTime() + HQ_SEAT_TERM_MS),
      leasePrice: clearingPrice,
      lastPrice: clearingPrice,
      upkeepPaidThrough: now,
      upkeepMissedMonths: 0,
      priceHistory: tape(await readPriceHistory(tx, seatId), { at: now.toISOString(), price: clearingPrice, event: 'auction' }),
    },
  });
  if (claimed.count !== 1) return false;
  const seat = await tx.hqSeat.findUnique({ where: { id: seatId }, select: { stage: true } });
  if (seat && isHqStageId(seat.stage)) {
    // "One headquarters per corporation" (design §8 call 2): whatever this
    // corporation held anywhere else goes back to its pool in the same
    // transaction, so there is no instant in which it holds two.
    const held = (await tx.hqSeat.findMany({ where: { epoch, holderProfileId: profileId }, select: { stage: true } })).map(r => r.stage);
    const conflict = hqSeatConflict(held, seat.stage);
    if (conflict.conflict) logger.info('HQ seat award clearing a held seat', { profileId, from: conflict.heldAt, to: seat.stage });
    await releaseHqSeats(tx, profileId, seat.stage, now, epoch);
  }
  return true;
}

/**
 * Cron pass: resolve every auction whose window has closed. Highest bid at
 * or above the reserve wins and is BURNED ('hq_seat_auction_burn' — the
 * escrow simply stays gone, exactly like a slot-auction win); every other
 * bid is refunded in full ('hq_seat_bid_refund'). No qualifying bid expires
 * the auction and refunds everyone. The clearing price lands on the seat's
 * own price tape and on a public timeline entry.
 *
 * Idempotent: the status-guarded updateMany makes a double run a no-op.
 */
export async function resolveDueHqSeatAuctions(db: Db = prisma, now: Date = new Date()): Promise<{ resolved: number; expired: number; refunded: number }> {
  let due: HqSeatAuctionRow[];
  try {
    due = await db.hqSeatAuction.findMany({ where: { status: HQ_SEAT_AUCTION_OPEN, closesAt: { lte: now } }, select: AUCTION_SELECT, take: 200 });
  } catch { return { resolved: 0, expired: 0, refunded: 0 }; }
  const ledgerOn = await isLedgerAvailable();
  let resolved = 0;
  let expired = 0;
  let refunded = 0;
  for (const auction of due) {
    if (!isHqStageId(auction.stage)) continue;
    const stage = getHqStage(auction.stage);
    try {
      const bids = await db.hqSeatBid.findMany({
        where: { auctionId: auction.id, status: HQ_SEAT_BID_OPEN },
        select: { id: true, profileId: true, amount: true, createdAt: true },
      });
      const outcome = resolveHqSeatAuction(
        bids.map(b => ({ bidId: b.id, profileId: b.profileId, amount: b.amount, createdAt: b.createdAt.getTime() })),
        auction.reserve,
      );
      const won = await (db as PrismaClient).$transaction(async (tx) => {
        const flipped = await tx.hqSeatAuction.updateMany({
          where: { id: auction.id, status: HQ_SEAT_AUCTION_OPEN },
          data: {
            status: outcome.winnerProfileId ? HQ_SEAT_AUCTION_RESOLVED : HQ_SEAT_AUCTION_EXPIRED,
            resolvedAt: now,
            winnerProfileId: outcome.winnerProfileId,
            clearingPrice: outcome.winnerProfileId ? outcome.winningAmount : null,
          },
        });
        if (flipped.count !== 1) return false;
        let seated = false;
        if (outcome.winnerBidId && outcome.winnerProfileId) {
          seated = await awardHqSeat(tx, auction.seatId, outcome.winnerProfileId, outcome.winningAmount, now, auction.epoch);
          await tx.hqSeatBid.updateMany({
            where: { id: outcome.winnerBidId },
            // A winner whose seat was taken between close and award (only
            // possible if a lease raced in) is refunded like a loser.
            data: { status: seated ? HQ_SEAT_BID_WON : HQ_SEAT_BID_REFUNDED },
          });
          if (!seated) {
            await tx.gameProfile.update({ where: { id: outcome.winnerProfileId }, data: { money: { increment: Math.round(outcome.winningAmount) } } });
            if (ledgerOn) await recordLedger(tx, { profileId: outcome.winnerProfileId, moneyDelta: Math.round(outcome.winningAmount), reason: 'hq_seat_bid_refund', refId: auction.id });
          }
          // A seated winner is NOT refunded: the escrow it paid at bid time
          // simply stays gone. That absence is the burn (BALANCE.md money
          // sink); the audit trail is the MarketAuditLog row below.
        }
        for (const bid of bids) {
          if (bid.id === outcome.winnerBidId && seated) continue;
          if (bid.id === outcome.winnerBidId) continue; // already handled above
          await tx.hqSeatBid.updateMany({ where: { id: bid.id }, data: { status: HQ_SEAT_BID_REFUNDED } });
          await tx.gameProfile.update({ where: { id: bid.profileId }, data: { money: { increment: Math.round(bid.amount) } } });
          if (ledgerOn) await recordLedger(tx, { profileId: bid.profileId, moneyDelta: Math.round(bid.amount), reason: 'hq_seat_bid_refund', refId: auction.id });
          refunded++;
        }
        return seated;
      });
      if (won) {
        resolved++;
        try {
          const prof = await db.gameProfile.findUnique({ where: { id: outcome.winnerProfileId! }, select: { companyName: true } });
          const seat = await db.hqSeat.findUnique({ where: { id: auction.seatId }, select: { index: true } });
          const name = prof?.companyName || 'A corporation';
          await db.playerActivity.create({
            data: {
              profileId: outcome.winnerProfileId!,
              companyName: name,
              type: HQ_SEAT_AUCTION_ACTIVITY,
              title: `${name} won ${stage.shortLabel} seat ${seat?.index ?? '?'} at auction`,
              description: `Cleared at $${Math.round(outcome.winningAmount / 1_000_000).toLocaleString()}M against a reserve of $${Math.round(auction.reserve / 1_000_000).toLocaleString()}M, ${bids.length} sealed bid${bids.length === 1 ? '' : 's'}.`,
              metadata: { stage: stage.id, seatIndex: seat?.index ?? null, clearingPrice: outcome.winningAmount, reserve: auction.reserve, bidCount: bids.length, auctionId: auction.id },
            },
          });
        } catch (err) {
          logger.warn('HQ seat auction feed row failed', { auctionId: auction.id, error: String(err) });
        }
        try {
          await db.marketAuditLog.create({
            data: {
              eventType: 'hq_seat_auction_cleared',
              profileId: outcome.winnerProfileId,
              details: {
                stage: stage.id, auctionId: auction.id, seatId: auction.seatId,
                reserve: auction.reserve, clearingPrice: outcome.winningAmount,
                bidCount: bids.length, burned: Math.round(outcome.winningAmount),
              },
              severity: 'info',
            },
          });
        } catch { /* audit log is best-effort */ }
      } else {
        expired++;
      }
    } catch (err) {
      logger.error('HQ seat auction resolution failed', { auctionId: auction.id, error: String(err) });
    }
  }
  return { resolved, expired, refunded };
}
