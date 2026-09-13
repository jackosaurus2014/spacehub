/**
 * @jest-environment jsdom
 */

/**
 * Money desync fix (2026-09-12): the client adopts the server's reconciled
 * balance after every sync. `useGameSync` computes
 * reconciledMoney − (money the payload carried) − (ledger delta it queued)
 * and queues it as a money correction; a large negative one shows a toast.
 * The delta must come from the SENT snapshot, not the state the engine has
 * ticked to by the time the response lands.
 */
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { useGameSync } from '@/hooks/useGameSync';
import type { GameState } from '@/lib/game/types';
import { queueMoneyCorrection, queueServerReconciliation } from '@/lib/game/ledger-reconcile';
import { toast } from '@/lib/toast';

jest.mock('@/lib/game/ledger-reconcile', () => ({
  ...jest.requireActual('@/lib/game/ledger-reconcile'),
  queueServerReconciliation: jest.fn(),
  queueMoneyCorrection: jest.fn(),
}));
jest.mock('@/lib/game/server-effects', () => ({ queueServerEffects: jest.fn() }));
jest.mock('@/lib/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() },
}));
jest.mock('@/lib/game/nav-bridge', () => ({ navigateTo: jest.fn() }));
import { navigateTo } from '@/lib/game/nav-bridge';
import { moneyCorrectionKey } from '@/lib/game/ledger-reconcile';
import { timedEventCreditId } from '@/lib/game/contract-credit';
const mockNavigateTo = navigateTo as jest.MockedFunction<typeof navigateTo>;

const mockQueueMoneyCorrection = queueMoneyCorrection as jest.MockedFunction<typeof queueMoneyCorrection>;
const mockQueueLedger = queueServerReconciliation as jest.MockedFunction<typeof queueServerReconciliation>;
const mockToastWarning = toast.warning as jest.MockedFunction<typeof toast.warning>;

function fakeState(money: number, extra: Partial<GameState> = {}): GameState {
  return {
    money,
    totalEarned: money,
    totalSpent: 0,
    buildings: [],
    completedResearch: [],
    activeServices: [],
    unlockedLocations: ['earth_surface'],
    resources: {},
    gameDate: { year: 2081, month: 3 },
    ships: [],
    companyName: 'QA Corp',
    completedContracts: ['c_first_launch'],
    completedDeliveries: [
      { id: 'dlv-the-dominion-2n9c-1a2b', resourceId: 'iron', quantity: 120, paymentMoney: 6_000_000, status: 'completed', completedAtMs: 1_800_000_000_000 },
      { id: 'dlv-the-dominion-2n9c-9z9z', resourceId: 'iron', quantity: 50, paymentMoney: 2_000_000, status: 'defaulted' },
    ],
    activeTimedEvents: [
      { templateId: 'evt_precious_metals', startedAtMs: 1_800_000_000_000, completedAtMs: 1_800_003_600_000, rewardAmount: 280_000_000, completed: true },
      { templateId: 'evt_iron_rush', startedAtMs: 1_800_000_000_000, rewardAmount: 20_000_000, completed: false },
    ],
    ...extra,
  } as unknown as GameState;
}

/** Drive one sync: mount, fire the 5 s initial timer (fetch is captured but
 *  NOT resolved), tick the state forward, then resolve with `response`. */
async function runSync(sentMoney: number, tickedMoney: number, response: Record<string, unknown>) {
  let resolveFetch: (v: unknown) => void = () => {};
  const fetchMock = jest.fn(() => new Promise(r => { resolveFetch = r; }));
  global.fetch = fetchMock as unknown as typeof fetch;

  const { rerender } = renderHook(({ s }: { s: GameState }) => useGameSync(s, 60_000), {
    initialProps: { s: fakeState(sentMoney) },
  });
  await act(async () => { jest.advanceTimersByTime(5_500); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const init = (fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1];
  const body = JSON.parse(init.body);
  expect(body.money).toBe(sentMoney);

  // The engine ticks while the request is in flight.
  rerender({ s: fakeState(tickedMoney) });

  await act(async () => {
    resolveFetch({ ok: true, status: 200, json: async () => ({ success: true, ...response }) });
  });
  await act(async () => { await Promise.resolve(); });
  return body;
}

describe('useGameSync adopts reconciledMoney', () => {
  const originalFetch = global.fetch;
  const originalWarn = console.warn;

  beforeEach(() => {
    jest.useFakeTimers();
    console.warn = jest.fn();
    // The real queue reports whether it accepted the correction (idempotency
    // on the server figure); the mock defaults to "accepted".
    mockQueueMoneyCorrection.mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    console.warn = originalWarn;
    jest.clearAllMocks();
  });

  it('sends completedContracts, completed deliveries and completed timed-event occurrences with the payload', async () => {
    const body = await runSync(100_000_000, 100_000_000, { reconciledMoney: 100_000_000 });
    expect(body.completedContracts).toEqual(['c_first_launch']);
    // Only status 'completed' deliveries, projected to the credit's four fields.
    expect(body.completedDeliveries).toEqual([
      { id: 'dlv-the-dominion-2n9c-1a2b', resourceId: 'iron', quantity: 120, paymentMoney: 6_000_000 },
    ]);
    // Only completed events, under the occurrence id the server credits.
    expect(body.completedTimedEvents).toEqual([{
      id: timedEventCreditId('evt_precious_metals', 1_800_000_000_000),
      templateId: 'evt_precious_metals',
      startedAtMs: 1_800_000_000_000,
      completedAtMs: 1_800_003_600_000,
      reward: 280_000_000,
    }]);
  });

  it('queues the delta against the SENT snapshot, not the ticked state, keyed on the server figure, and toasts a large removal with a Mail link', async () => {
    await runSync(100_000_000, 101_000_000, {
      reconciledMoney: 80_000_000, syncedAtMs: 1_800_000_000_000,
      ledger: { maxSeq: 0, moneyDelta: 0, resourceDeltas: {} },
      moneyClamp: { wasClamped: true, rejectedExcess: 20_000_000, ceiling: 80_000_000, headroom: 0 },
      unverifiedIncome: { contracts: [], timedEvents: ['evt:evt_precious_metals:5'], deliveries: [] },
    });
    expect(mockQueueMoneyCorrection).toHaveBeenCalledTimes(1);
    expect(mockQueueMoneyCorrection).toHaveBeenCalledWith(-20_000_000, expect.objectContaining({ // not −21M
      key: moneyCorrectionKey(80_000_000, 1_800_000_000_000),
      reconciledMoney: 80_000_000,
      syncedAtMs: 1_800_000_000_000,
      rejectedExcess: 20_000_000,
      unverified: { contracts: [], timedEvents: ['evt:evt_precious_metals:5'], deliveries: [] },
    }));
    expect(mockToastWarning).toHaveBeenCalledTimes(1);
    const [message, title, , options] = mockToastWarning.mock.calls[0];
    expect(message).toContain('−$20.0M was removed');
    expect(message).toContain("server's figure ($80.0M)");
    expect(message).toContain('could not verify 1 payout');
    expect(title).toBe('Balance reconciled');
    expect(options?.link?.label).toBe('Open the Mail record');
    options!.link!.onClick!();
    expect(mockNavigateTo).toHaveBeenCalledWith('reports:mail');
    expect(console.warn).toHaveBeenCalledWith('[space-tycoon] money correction', expect.objectContaining({ correction: -20_000_000 }));
  });

  it('a negative correction the queue refuses (same server figure already applied) shows no toast', async () => {
    mockQueueMoneyCorrection.mockReturnValue(false);
    await runSync(100_000_000, 100_000_000, { reconciledMoney: 80_000_000, syncedAtMs: 7 });
    expect(mockQueueMoneyCorrection).toHaveBeenCalledTimes(1);
    expect(mockToastWarning).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      '[space-tycoon] money correction skipped: same server figure already applied',
      expect.objectContaining({ key: moneyCorrectionKey(80_000_000, 7) }),
    );
  });

  it('subtracts the ledger delta it queues separately (no double-apply)', async () => {
    await runSync(100_000_000, 100_000_000, {
      reconciledMoney: 95_000_000,
      ledger: { maxSeq: 7, moneyDelta: 10_000_000, resourceDeltas: {}, entries: [] },
    });
    expect(mockQueueLedger).toHaveBeenCalledTimes(1);
    // 95M persisted = clamped(claim) 85M + 10M ledger → the clamp alone is −15M.
    expect(mockQueueMoneyCorrection).toHaveBeenCalledWith(-15_000_000, expect.anything());
  });

  it('small negatives are queued without a toast; positives are queued without a toast', async () => {
    await runSync(100_000_000, 100_000_000, { reconciledMoney: 99_500_000 });
    expect(mockQueueMoneyCorrection).toHaveBeenCalledWith(-500_000, expect.anything());
    expect(mockToastWarning).not.toHaveBeenCalled();
    jest.clearAllMocks();
    mockQueueMoneyCorrection.mockReturnValue(true);
    await runSync(100_000_000, 100_000_000, { reconciledMoney: 105_000_000 });
    expect(mockQueueMoneyCorrection).toHaveBeenCalledWith(5_000_000, expect.anything());
    expect(mockToastWarning).not.toHaveBeenCalled();
  });

  it('noise below $1,000 and an equal figure queue nothing', async () => {
    await runSync(100_000_000, 100_000_000, { reconciledMoney: 100_000_400 });
    await runSync(100_000_000, 100_000_000, { reconciledMoney: 100_000_000 });
    expect(mockQueueMoneyCorrection).not.toHaveBeenCalled();
  });

  it('a first sync (server kit figure, C-1) is not adopted', async () => {
    await runSync(500_000_000, 500_000_000, { reconciledMoney: 100_000_000, firstSync: true });
    expect(mockQueueMoneyCorrection).not.toHaveBeenCalled();
    expect(mockToastWarning).not.toHaveBeenCalled();
  });

  it('a response without reconciledMoney queues nothing', async () => {
    await runSync(100_000_000, 100_000_000, { data: {} });
    expect(mockQueueMoneyCorrection).not.toHaveBeenCalled();
  });
});
