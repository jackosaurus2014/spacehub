/**
 * @jest-environment node
 *
 * GAME_DESIGN_REVIEW_2026-09 row 14 — Monday's league cron settles rivalry
 * stakes: designated pairs are compared on week-over-week net-worth growth,
 * the winner gets a 'rivalry_win' PlayerActivity (+1 rep, capped +3/week),
 * the loser gets nothing, every finished-week assignment is closed and the
 * all-time W/L/D record is posted. Undesignated pairs settle nothing.
 */
import { NextRequest } from 'next/server';
import { getCurrentWeekId } from '@/lib/game/weekly-events';

const store = {
  assignments: [] as Record<string, unknown>[],
  activities: [] as Record<string, unknown>[],
  rivalEvents: [] as Record<string, unknown>[],
  profileUpdates: [] as Record<string, unknown>[],
  assignmentUpdates: [] as Record<string, unknown>[],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaMock: Record<string, any> = {
  leagueSeason: { findFirst: jest.fn(async () => null), create: jest.fn(async () => ({ id: 'season-1' })), update: jest.fn() },
  rivalAssignment: {
    findMany: jest.fn(async () => store.assignments),
    update: jest.fn(async (args: Record<string, unknown>) => { store.assignmentUpdates.push(args); return {}; }),
  },
  playerActivity: { create: jest.fn(async (args: { data: Record<string, unknown> }) => { store.activities.push(args.data); return { id: `act-${store.activities.length}` }; }) },
  rivalEvent: { create: jest.fn(async (args: { data: Record<string, unknown> }) => { store.rivalEvents.push(args.data); return {}; }) },
  gameProfile: {
    update: jest.fn(async (args: Record<string, unknown>) => { store.profileUpdates.push(args); return {}; }),
    findMany: jest.fn(async () => []),
  },
  playerLeagueProfile: { findMany: jest.fn(async () => []), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  leagueBracket: { create: jest.fn() },
  leagueBracketEntry: { create: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prismaMock)),
};

jest.mock('@/lib/db', () => ({ __esModule: true, default: prismaMock }));
jest.mock('@/lib/game/server-ledger', () => ({ isLedgerAvailable: jest.fn().mockResolvedValue(false), recordLedger: jest.fn() }));
jest.mock('@/lib/game/market-share', () => ({ resolveMetricCurrentValue: jest.fn(async () => 0) }));

const SECRET = 'test-cron-secret';
const ORIGINAL_ENV = process.env;

function assignment(id: string, opts: { designated?: boolean; settled?: boolean; snapshots: [number, number][]; score?: number; weekOffset?: number }) {
  const events: { type: string }[] = [];
  if (opts.designated) events.push({ type: 'rival_designated' });
  if (opts.settled) events.push({ type: 'rivalry_settled' });
  return {
    id,
    weekId: getCurrentWeekId() - (opts.weekOffset ?? 1),
    rivalryScore: opts.score ?? 50,
    isActive: true,
    player: { id: `${id}-player`, companyName: `${id} Player Co` },
    rival: { id: `${id}-rival`, companyName: `${id} Rival Co` },
    snapshots: opts.snapshots.map(([p, r]) => ({ playerNetWorth: p, rivalNetWorth: r })),
    events,
  };
}

async function run() {
  const { POST } = await import('@/app/api/space-tycoon/leagues/process-week/route');
  const req = new NextRequest('http://localhost/api/space-tycoon/leagues/process-week', {
    method: 'POST',
    headers: { authorization: `Bearer ${SECRET}`, 'content-type': 'application/json' },
    body: '{}',
  });
  const res = await POST(req);
  return { res, json: await res.json() };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ORIGINAL_ENV, CRON_SECRET: SECRET };
  store.assignments = [];
  store.activities = [];
  store.rivalEvents = [];
  store.profileUpdates = [];
  store.assignmentUpdates = [];
});
afterAll(() => { process.env = ORIGINAL_ENV; });

describe('process-week rivalry stake settlement', () => {
  it('designated pair: the faster grower gets +1 rep via a rivalry_win activity, the loser nothing', async () => {
    store.assignments = [assignment('a', { designated: true, snapshots: [[100e6, 1e9], [130e6, 1.05e9]], score: 60 })];
    const { res, json } = await run();
    expect(res.status).toBe(200);
    expect(json.processed.rivalries).toMatchObject({ assignmentsClosed: 1, stakesSettled: 1, wins: 1, draws: 0, repAwarded: 1 });
    expect(store.activities).toHaveLength(1);
    expect(store.activities[0]).toMatchObject({ profileId: 'a-player', type: 'rivalry_win', metadata: expect.objectContaining({ rep: 1, opponent: 'a Rival Co' }) });
    // Loser (rival) gets no activity, no money anywhere.
    expect(store.activities.some(a => a.profileId === 'a-rival')).toBe(false);
    expect(JSON.stringify(store.profileUpdates)).not.toContain('money');
    // Settled marker written once, assignment closed, W/L/D posted from the score.
    expect(store.rivalEvents.filter(e => e.type === 'rivalry_settled')).toHaveLength(1);
    expect(store.assignmentUpdates).toEqual([{ where: { id: 'a' }, data: { isActive: false } }]);
    expect(store.profileUpdates[0]).toMatchObject({ where: { id: 'a-player' }, data: { rivalWins: { increment: 1 } } });
  });

  it('the rival can win the stake too (they out-grew the designator)', async () => {
    store.assignments = [assignment('b', { designated: true, snapshots: [[100e6, 100e6], [101e6, 150e6]] })];
    const { json } = await run();
    expect(json.processed.rivalries.wins).toBe(1);
    expect(store.activities[0]).toMatchObject({ profileId: 'b-rival', type: 'rivalry_win' });
  });

  it('undesignated pairs are closed but never settle a stake', async () => {
    store.assignments = [assignment('c', { snapshots: [[100e6, 100e6], [200e6, 100e6]], score: 40 })];
    const { json } = await run();
    expect(json.processed.rivalries).toMatchObject({ assignmentsClosed: 1, stakesSettled: 0, wins: 0, repAwarded: 0 });
    expect(store.activities).toHaveLength(0);
    expect(store.profileUpdates[0]).toMatchObject({ data: { rivalLosses: { increment: 1 } } });
  });

  it('caps reputation at +3 per profile per week across many designated wins', async () => {
    store.assignments = ['w1', 'w2', 'w3', 'w4'].map(id => ({
      ...assignment(id, { designated: true, snapshots: [[100e6, 100e6], [150e6, 100e6]] }),
      player: { id: 'same-player', companyName: 'Same Player Co' },
    }));
    const { json } = await run();
    expect(json.processed.rivalries).toMatchObject({ stakesSettled: 4, wins: 4, repAwarded: 3 });
    const reps = store.activities.map(a => (a.metadata as { rep: number }).rep);
    expect(reps).toEqual([1, 1, 1, 0]);
  });

  it('is idempotent: an already-settled assignment is closed without a second grant', async () => {
    store.assignments = [assignment('d', { designated: true, settled: true, snapshots: [[100e6, 100e6], [150e6, 100e6]] })];
    const { json } = await run();
    expect(json.processed.rivalries).toMatchObject({ assignmentsClosed: 1, stakesSettled: 0, repAwarded: 0 });
    expect(store.activities).toHaveLength(0);
  });

  it('a draw inside the band grants nothing but still records the settlement', async () => {
    store.assignments = [assignment('e', { designated: true, snapshots: [[100e6, 100e6], [110e6, 110.02e6]] })];
    const { json } = await run();
    expect(json.processed.rivalries).toMatchObject({ stakesSettled: 1, wins: 0, draws: 1, repAwarded: 0 });
    expect(store.rivalEvents[0]).toMatchObject({ type: 'rivalry_settled', metadata: expect.objectContaining({ outcome: 'draw' }) });
  });

  it('rejects an unauthenticated caller before touching anything', async () => {
    const { POST } = await import('@/app/api/space-tycoon/leagues/process-week/route');
    const res = await POST(new NextRequest('http://localhost/api/space-tycoon/leagues/process-week', { method: 'POST', body: '{}' }));
    expect(res.status).toBe(401);
    expect(prismaMock.rivalAssignment.findMany).not.toHaveBeenCalled();
  });
});
