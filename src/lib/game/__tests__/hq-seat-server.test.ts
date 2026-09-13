/**
 * @jest-environment node
 *
 * CC-3 server passes: the monthly seat charge (and the lapse that follows
 * two unpayable months) and the sealed-bid seat auction's resolution,
 * burn and refunds. docs/COMMAND_CENTER_DESIGN_2026-09-13.md §2 /
 * docs/BALANCE.md Pass 13.
 *
 * These are prisma-shaped functions, so the suite drives them against a
 * tiny in-memory stand-in rather than a database: every function under test
 * already takes its `db` as an argument (the cron passes the real client,
 * the sync passes a transaction), so the fake needs only the handful of
 * operations the passes actually use. That keeps the test about the RULES —
 * who pays, who is refunded, when a seat lapses — instead of about prisma.
 */

// isLedgerAvailable() probes the real client at module scope; stub it so the
// ledger is "on" and every write lands on the fake below.
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { gameLedgerEntry: { count: async () => 0 } },
}));

import {
  HQ_SEAT_LAPSED_ACTIVITY, HQ_SEAT_AUCTION_ACTIVITY,
  chargeHqSeatUpkeep, resolveDueHqSeatAuctions,
} from '../hq-relocation-server';
import { HQ_UPKEEP_MONTHLY, HQ_SEAT_UPKEEP_GRACE_MONTHS } from '../headquarters';
import { REAL_MS_PER_GAME_MONTH } from '../server-time';
import { HQ_SEAT_BID_OPEN, HQ_SEAT_BID_REFUNDED, HQ_SEAT_BID_WON } from '../hq-seat-auctions';
import { WORLD_EPOCH } from '../world-reset';

// ─── A very small in-memory prisma ──────────────────────────────────────────

type Row = Record<string, unknown>;

function matches(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    if (key === 'OR') {
      const any = (cond as Row[]).some(c => matches(row, c));
      if (!any) return false;
      continue;
    }
    const value = row[key];
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      const c = cond as Row;
      if ('not' in c) {
        if (c.not === null ? value === null || value === undefined : value === c.not) return false;
      }
      if ('lte' in c && !(value !== null && value !== undefined && (value as number | Date) <= (c.lte as number | Date))) return false;
      if ('gte' in c && !(value !== null && value !== undefined && (value as number) >= (c.gte as number))) return false;
      if ('gt' in c && !(value !== null && value !== undefined && (value as number) > (c.gt as number))) return false;
      if ('in' in c && !(c.in as unknown[]).includes(value)) return false;
      if ('notIn' in c && (c.notIn as unknown[]).includes(value)) return false;
      continue;
    }
    if (value !== cond) return false;
  }
  return true;
}

function applyData(row: Row, data: Row): void {
  for (const [key, val] of Object.entries(data)) {
    if (val && typeof val === 'object' && !(val instanceof Date) && !Array.isArray(val)) {
      const v = val as Row;
      if ('decrement' in v) { row[key] = (row[key] as number) - (v.decrement as number); continue; }
      if ('increment' in v) { row[key] = (row[key] as number) + (v.increment as number); continue; }
    }
    row[key] = val;
  }
}

class Table {
  rows: Row[] = [];
  private seq = 0;
  constructor(private name: string) {}
  async findMany(args: { where?: Row; take?: number } = {}) { return this.rows.filter(r => matches(r, args.where)).slice(0, args.take ?? 1000).map(r => ({ ...r })); }
  async findFirst(args: { where?: Row } = {}) { const r = this.rows.find(x => matches(x, args.where)); return r ? { ...r } : null; }
  async findUnique(args: { where: Row }) { return this.findFirst(args); }
  async count(args: { where?: Row } = {}) { return this.rows.filter(r => matches(r, args.where)).length; }
  async create(args: { data: Row }) { const row = { id: `${this.name}-${++this.seq}`, ...args.data }; this.rows.push(row); return { ...row }; }
  async createMany(args: { data: Row[] }) { for (const d of args.data) await this.create({ data: d }); return { count: args.data.length }; }
  async update(args: { where: Row; data: Row }) { const r = this.rows.find(x => matches(x, args.where)); if (r) applyData(r, args.data); return r ? { ...r } : null; }
  async updateMany(args: { where: Row; data: Row }) {
    const hits = this.rows.filter(r => matches(r, args.where));
    for (const r of hits) applyData(r, args.data);
    return { count: hits.length };
  }
}

function fakeDb() {
  const db = {
    hqSeat: new Table('seat'),
    hqSeatAuction: new Table('auction'),
    hqSeatBid: new Table('bid'),
    gameProfile: new Table('profile'),
    playerActivity: new Table('activity'),
    marketAuditLog: new Table('audit'),
    gameLedgerEntry: new Table('ledger'),
    hqRelocation: new Table('reloc'),
    async $transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> { return fn(db); },
  };
  return db;
}
type FakeDb = ReturnType<typeof fakeDb>;
// The passes take `Db` (a prisma client or transaction client); the fake is
// structurally a subset, so it is cast at the call site only.
const asDb = (db: FakeDb) => db as unknown as Parameters<typeof chargeHqSeatUpkeep>[0];

const T0 = new Date('2026-09-13T00:00:00.000Z');
const at = (months: number) => new Date(T0.getTime() + months * REAL_MS_PER_GAME_MONTH);

function seedSeat(db: FakeDb, over: Row = {}): Row {
  const row: Row = {
    id: 'seat-mars-1', epoch: WORLD_EPOCH, stage: 'mars_hq', index: 1,
    holderProfileId: 'p1', leaseUntil: at(6), leasePrice: 250_000_000, lastPrice: 250_000_000,
    priceHistory: [], upkeepPaidThrough: T0, upkeepMissedMonths: 0, updatedAt: T0,
    ...over,
  };
  db.hqSeat.rows.push(row);
  return row;
}

function seedProfile(db: FakeDb, id: string, money: number): Row {
  const row: Row = { id, companyName: `Corp ${id}`, money, totalSpent: 0, totalEarned: 0, hqLocationId: 'mars_orbit' };
  db.gameProfile.rows.push(row);
  return row;
}

// ─── Upkeep ─────────────────────────────────────────────────────────────────

describe('chargeHqSeatUpkeep', () => {
  it('charges one game-month of rent, ledgers it and advances the cursor', async () => {
    const db = fakeDb();
    const seat = seedSeat(db);
    const prof = seedProfile(db, 'p1', 1_000_000_000);
    const out = await chargeHqSeatUpkeep(asDb(db), at(1));
    expect(out).toEqual({ charged: 1, missed: 0, lapsed: 0 });
    expect(prof.money).toBe(1_000_000_000 - HQ_UPKEEP_MONTHLY.mars_hq);
    expect(prof.totalSpent).toBe(HQ_UPKEEP_MONTHLY.mars_hq);
    expect((seat.upkeepPaidThrough as Date).getTime()).toBe(T0.getTime() + REAL_MS_PER_GAME_MONTH);
    const ledger = db.gameLedgerEntry.rows[0];
    expect(ledger.reason).toBe('hq_seat_upkeep');
    expect(ledger.moneyDelta).toBe(-HQ_UPKEEP_MONTHLY.mars_hq);
    // A seat still inside its paid-through window is not selected at all.
    const justBefore = new Date(T0.getTime() + REAL_MS_PER_GAME_MONTH - 1);
    expect(await chargeHqSeatUpkeep(asDb(db), justBefore)).toEqual({ charged: 0, missed: 0, lapsed: 0 });
    expect(prof.money).toBe(1_000_000_000 - HQ_UPKEEP_MONTHLY.mars_hq);
  });

  it('charges ONE month per pass, so a sleeping server catches up instead of billing a lump', async () => {
    const db = fakeDb();
    seedSeat(db);
    const prof = seedProfile(db, 'p1', 1_000_000_000);
    await chargeHqSeatUpkeep(asDb(db), at(5));
    expect(prof.money).toBe(1_000_000_000 - HQ_UPKEEP_MONTHLY.mars_hq);
    await chargeHqSeatUpkeep(asDb(db), at(5));
    expect(prof.money).toBe(1_000_000_000 - 2 * HQ_UPKEEP_MONTHLY.mars_hq);
  });

  it('an unpayable month counts against the grace period without touching the wallet', async () => {
    const db = fakeDb();
    const seat = seedSeat(db);
    const prof = seedProfile(db, 'p1', 1_000);
    const out = await chargeHqSeatUpkeep(asDb(db), at(1));
    expect(out.missed).toBe(1);
    expect(out.charged).toBe(0);
    expect(out.lapsed).toBe(0);
    expect(prof.money).toBe(1_000); // never overdrawn
    expect(seat.upkeepMissedMonths).toBe(1);
    expect(seat.holderProfileId).toBe('p1'); // still theirs, one month of grace left
    expect(db.gameLedgerEntry.rows).toHaveLength(0);
  });

  it('the second unpayable month lapses the seat, returns it to the pool and sends the HQ home', async () => {
    const db = fakeDb();
    const seat = seedSeat(db, { upkeepMissedMonths: HQ_SEAT_UPKEEP_GRACE_MONTHS - 1 });
    const prof = seedProfile(db, 'p1', 0);
    const out = await chargeHqSeatUpkeep(asDb(db), at(1));
    expect(out).toEqual({ charged: 0, missed: 1, lapsed: 1 });
    expect(seat.holderProfileId).toBeNull();
    expect(seat.leaseUntil).toBeNull();
    expect(seat.upkeepMissedMonths).toBe(0);
    expect(prof.hqLocationId).toBe('earth_surface');
    const feed = db.playerActivity.rows[0];
    expect(feed.type).toBe(HQ_SEAT_LAPSED_ACTIVITY);
    expect(String(feed.title)).toContain('unpaid rent');
    // The vacated seat re-lists at the pool's posted price.
    expect(seat.lastPrice).toBeGreaterThan(0);
  });

  it('a free seat (Earth-priced rent) only advances its cursor — it can never lapse', async () => {
    const db = fakeDb();
    const seat = seedSeat(db, { stage: 'earth_ops' });
    const prof = seedProfile(db, 'p1', 0);
    const out = await chargeHqSeatUpkeep(asDb(db), at(1));
    expect(out.charged).toBe(1);
    expect(out.lapsed).toBe(0);
    expect(seat.holderProfileId).toBe('p1');
    expect(prof.money).toBe(0);
  });
});

// ─── Auctions ───────────────────────────────────────────────────────────────

function seedAuction(db: FakeDb, over: Row = {}): Row {
  const row: Row = {
    id: 'auc-1', epoch: WORLD_EPOCH, stage: 'mars_hq', seatId: 'seat-mars-1',
    reserve: 250_000_000, status: 'open', openedAt: T0, closesAt: at(1),
    resolvedAt: null, winnerProfileId: null, clearingPrice: null,
    ...over,
  };
  db.hqSeatAuction.rows.push(row);
  return row;
}

function seedBid(db: FakeDb, id: string, profileId: string, amount: number, createdAt: Date): Row {
  const row: Row = { id, auctionId: 'auc-1', profileId, amount, status: HQ_SEAT_BID_OPEN, createdAt };
  db.hqSeatBid.rows.push(row);
  return row;
}

describe('resolveDueHqSeatAuctions', () => {
  it('seats the highest bidder at the clearing price, burns their escrow and refunds everyone else', async () => {
    const db = fakeDb();
    const seat = seedSeat(db, { holderProfileId: null, leaseUntil: null, leasePrice: 0, lastPrice: 0, upkeepPaidThrough: null });
    seedAuction(db);
    const winner = seedProfile(db, 'p1', 0);   // escrow already taken at bid time
    const loser = seedProfile(db, 'p2', 0);
    const bidW = seedBid(db, 'bid-w', 'p1', 400_000_000, at(0.2));
    const bidL = seedBid(db, 'bid-l', 'p2', 300_000_000, at(0.1));

    const out = await resolveDueHqSeatAuctions(asDb(db), at(2));
    expect(out.resolved).toBe(1);
    expect(out.expired).toBe(0);
    expect(out.refunded).toBe(1);

    // The seat changed hands at the clearing price and started paying rent.
    expect(seat.holderProfileId).toBe('p1');
    expect(seat.leasePrice).toBe(400_000_000);
    expect(seat.lastPrice).toBe(400_000_000);
    expect(seat.upkeepPaidThrough).not.toBeNull();
    expect((seat.priceHistory as Array<{ event: string }>).some(e => e.event === 'auction')).toBe(true);

    // The winner is NOT refunded — the absence of a refund is the burn.
    expect(winner.money).toBe(0);
    expect(bidW.status).toBe(HQ_SEAT_BID_WON);
    // Every other bid comes back in full, ledgered.
    expect(loser.money).toBe(300_000_000);
    expect(bidL.status).toBe(HQ_SEAT_BID_REFUNDED);
    expect(db.gameLedgerEntry.rows.map(r => r.reason)).toEqual(['hq_seat_bid_refund']);

    // The clearing price is published: timeline entry + audit row.
    const feed = db.playerActivity.rows[0];
    expect(feed.type).toBe(HQ_SEAT_AUCTION_ACTIVITY);
    expect((feed.metadata as Row).clearingPrice).toBe(400_000_000);
    expect(db.marketAuditLog.rows[0].eventType).toBe('hq_seat_auction_cleared');
  });

  it('is idempotent — a second pass over a resolved auction changes nothing', async () => {
    const db = fakeDb();
    seedSeat(db, { holderProfileId: null, leaseUntil: null, lastPrice: 0 });
    seedAuction(db);
    const loser = seedProfile(db, 'p2', 0);
    seedProfile(db, 'p1', 0);
    seedBid(db, 'bid-w', 'p1', 400_000_000, at(0.2));
    seedBid(db, 'bid-l', 'p2', 300_000_000, at(0.1));
    await resolveDueHqSeatAuctions(asDb(db), at(2));
    const after = loser.money;
    const second = await resolveDueHqSeatAuctions(asDb(db), at(3));
    expect(second).toEqual({ resolved: 0, expired: 0, refunded: 0 });
    expect(loser.money).toBe(after); // refunded once, never twice
  });

  it('no bid clears the reserve: the auction expires and every bid is refunded', async () => {
    const db = fakeDb();
    const seat = seedSeat(db, { holderProfileId: null, leaseUntil: null });
    seedAuction(db, { reserve: 900_000_000 });
    const bidder = seedProfile(db, 'p2', 0);
    seedBid(db, 'bid-low', 'p2', 100_000_000, at(0.1));
    const out = await resolveDueHqSeatAuctions(asDb(db), at(2));
    expect(out.resolved).toBe(0);
    expect(out.expired).toBe(1);
    expect(out.refunded).toBe(1);
    expect(bidder.money).toBe(100_000_000);
    expect(seat.holderProfileId).toBeNull();
    expect(db.playerActivity.rows).toHaveLength(0);
  });

  it('an auction still inside its window is left alone', async () => {
    const db = fakeDb();
    seedSeat(db, { holderProfileId: null });
    seedAuction(db, { closesAt: at(10) });
    seedProfile(db, 'p1', 0);
    seedBid(db, 'bid-w', 'p1', 400_000_000, at(0.2));
    expect(await resolveDueHqSeatAuctions(asDb(db), at(2))).toEqual({ resolved: 0, expired: 0, refunded: 0 });
  });

  it('the winner never ends up holding two seats — anything held elsewhere is released', async () => {
    const db = fakeDb();
    seedSeat(db, { holderProfileId: null, leaseUntil: null, lastPrice: 0 });
    // The same corporation already sits on a Jovian seat.
    const old = { id: 'seat-jovian-1', epoch: WORLD_EPOCH, stage: 'jovian_hq', index: 1,
      holderProfileId: 'p1', leaseUntil: at(6), leasePrice: 420_000_000, lastPrice: 420_000_000,
      priceHistory: [], upkeepPaidThrough: T0, upkeepMissedMonths: 0, updatedAt: T0 };
    db.hqSeat.rows.push(old);
    seedAuction(db);
    seedProfile(db, 'p1', 0);
    seedBid(db, 'bid-w', 'p1', 400_000_000, at(0.2));

    await resolveDueHqSeatAuctions(asDb(db), at(2));
    expect(db.hqSeat.rows.find(r => r.id === 'seat-mars-1')!.holderProfileId).toBe('p1');
    expect(old.holderProfileId).toBeNull(); // the old seat went back to its pool
    expect(db.hqSeat.rows.filter(r => r.holderProfileId === 'p1')).toHaveLength(1);
  });
});
