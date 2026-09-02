// ─── One Wallet (audit A1): ledger reconciliation math ───────────────────────

import {
  sumLedgerEntries,
  reconcileBalance,
  applyResourceDeltas,
  applyReconciliationToState,
  queueServerReconciliation,
  consumeServerReconciliation,
  __clearReconciliationQueue,
  clampPlausibleMoney,
  plausibleIncomeHeadroom,
  MAX_PLAUSIBLE_INCOME_PER_MS,
  MIN_PLAUSIBILITY_ELAPSED_MS,
  MAX_PLAUSIBILITY_ELAPSED_MS,
  type LedgerEntryLite,
} from '../ledger-reconcile';
import type { GameState } from '../types';

function entry(seq: number, moneyDelta: number, resourceSlug?: string, resourceDelta?: number): LedgerEntryLite {
  return { seq, moneyDelta, resourceSlug: resourceSlug ?? null, resourceDelta: resourceDelta ?? 0 };
}

function minimalState(overrides: Partial<GameState> = {}): GameState {
  return {
    money: 1_000_000,
    totalEarned: 5_000_000,
    totalSpent: 2_000_000,
    resources: { iron: 100 },
    gameDate: { year: 2126, month: 3 },
    ...overrides,
  } as GameState;
}

describe('sumLedgerEntries', () => {
  it('returns zeros for an empty ledger', () => {
    const r = sumLedgerEntries([]);
    expect(r.moneyDelta).toBe(0);
    expect(r.resourceDeltas).toEqual({});
    expect(r.maxSeq).toBe(0);
  });

  it('nets signed money deltas and tracks max seq', () => {
    const r = sumLedgerEntries([entry(1, 500), entry(2, -200), entry(5, 100)]);
    expect(r.moneyDelta).toBe(400);
    expect(r.maxSeq).toBe(5);
  });

  it('aggregates resource deltas per slug', () => {
    const r = sumLedgerEntries([
      entry(1, 0, 'iron', 50),
      entry(2, 0, 'iron', -20),
      entry(3, 0, 'titanium', 5),
    ]);
    expect(r.resourceDeltas).toEqual({ iron: 30, titanium: 5 });
  });

  it('ignores malformed entries and non-finite deltas', () => {
    const r = sumLedgerEntries([
      entry(1, Number.NaN),
      { seq: 2, moneyDelta: 100 },
      { moneyDelta: 999 } as unknown as LedgerEntryLite,
    ]);
    expect(r.moneyDelta).toBe(100);
    expect(r.maxSeq).toBe(2);
  });
});

describe('reconcileBalance', () => {
  const entries = [entry(1, -1000), entry(2, 300), entry(3, 500)];

  it('leaves the client figure untouched with an empty ledger (solo player)', () => {
    const r = reconcileBalance(1_000_000, [], 0);
    expect(r.reconciledMoney).toBe(1_000_000);
    expect(r.moneyDelta).toBe(0);
    expect(r.maxSeq).toBe(0);
    expect(r.pending).toHaveLength(0);
  });

  it('applies all entries beyond ack 0', () => {
    const r = reconcileBalance(10_000, entries, 0);
    expect(r.moneyDelta).toBe(-200);
    expect(r.reconciledMoney).toBe(9_800);
    expect(r.maxSeq).toBe(3);
  });

  it('excludes entries at or below the ack cursor', () => {
    const r = reconcileBalance(10_000, entries, 2);
    expect(r.pending.map(e => e.seq)).toEqual([3]);
    expect(r.moneyDelta).toBe(500);
    expect(r.reconciledMoney).toBe(10_500);
  });

  it('is idempotent under retries: same ack + same entries → same figure', () => {
    const first = reconcileBalance(10_000, entries, 1);
    const retry = reconcileBalance(10_000, entries, 1);
    expect(retry.reconciledMoney).toBe(first.reconciledMoney);
    expect(retry.maxSeq).toBe(first.maxSeq);
  });

  it('after client adoption (money includes delta, ack advanced) the delta drops out', () => {
    const before = reconcileBalance(10_000, entries, 0);
    // Client applies delta and advances ack to maxSeq — next sync:
    const after = reconcileBalance(before.reconciledMoney, entries, before.maxSeq);
    expect(after.moneyDelta).toBe(0);
    expect(after.reconciledMoney).toBe(before.reconciledMoney);
  });

  it('sanitizes garbage ack cursors', () => {
    expect(reconcileBalance(100, entries, Number.NaN).moneyDelta).toBe(-200);
    expect(reconcileBalance(100, entries, -5).moneyDelta).toBe(-200);
  });

  it('keeps maxSeq at the ack cursor when nothing is pending', () => {
    const r = reconcileBalance(100, entries, 3);
    expect(r.maxSeq).toBe(3);
    expect(r.pending).toHaveLength(0);
  });
});

describe('applyResourceDeltas', () => {
  it('applies signed deltas and clamps at zero', () => {
    const out = applyResourceDeltas({ iron: 100 }, { iron: -150, titanium: 10 });
    expect(out.iron).toBe(0);
    expect(out.titanium).toBe(10);
  });

  it('does not mutate the input map', () => {
    const input = { iron: 100 };
    applyResourceDeltas(input, { iron: -50 });
    expect(input.iron).toBe(100);
  });

  it('skips zero and non-finite deltas', () => {
    const out = applyResourceDeltas({ iron: 5 }, { iron: 0, gold: Number.NaN });
    expect(out).toEqual({ iron: 5 });
  });
});

describe('applyReconciliationToState', () => {
  it('applies money + resource deltas and advances the ack cursor', () => {
    const state = minimalState();
    const next = applyReconciliationToState(state, {
      maxSeq: 7,
      moneyDelta: 250_000,
      resourceDeltas: { iron: -40 },
    });
    expect(next.money).toBe(1_250_000);
    expect(next.totalEarned).toBe(5_250_000);
    expect(next.resources.iron).toBe(60);
    expect(next.serverLedgerAck).toBe(7);
  });

  it('tracks debits in totalSpent', () => {
    const next = applyReconciliationToState(minimalState(), {
      maxSeq: 2, moneyDelta: -100_000, resourceDeltas: {},
    });
    expect(next.money).toBe(900_000);
    expect(next.totalSpent).toBe(2_100_000);
    expect(next.totalEarned).toBe(5_000_000);
  });

  it('is idempotent: a reconciliation at or below the ack cursor is a no-op', () => {
    const state = minimalState({ serverLedgerAck: 7 });
    const next = applyReconciliationToState(state, {
      maxSeq: 7, moneyDelta: 250_000, resourceDeltas: {},
    });
    expect(next).toBe(state);
    const stale = applyReconciliationToState(state, {
      maxSeq: 3, moneyDelta: 999, resourceDeltas: {},
    });
    expect(stale).toBe(state);
  });

  it('double application is impossible after the cursor advances', () => {
    const rec = { maxSeq: 4, moneyDelta: 50_000, resourceDeltas: {} };
    const once = applyReconciliationToState(minimalState(), rec);
    const twice = applyReconciliationToState(once, rec);
    expect(twice).toBe(once);
    expect(twice.money).toBe(1_050_000);
  });
});

// ─── Wave E1 (docs/ECONOMY_PVP_2026-08.md §E1, exploit #5): "client money is
// the reconciliation base" plausibility clamp ────────────────────────────────
describe('clampPlausibleMoney — E1 exploit #5 regression', () => {
  it('regression: an edited-save / forged sync claiming an absurd figure is rejected, not believed', () => {
    // This is exactly the exploit: reconcileBalance's BASE (clientMoney) was
    // never checked against anything, so a save edited to claim an
    // arbitrarily large `money` figure sailed straight through to
    // `reconciledMoney` and got persisted. The clamp must reject it.
    const prevMoney = 1_000_000_000; // $1B, plausible mid-game net worth
    const elapsedMs = 60_000; // one normal 60s sync interval
    const forgedClaim = 999_999_999_999_999; // near JS max safe integer
    const result = clampPlausibleMoney(forgedClaim, prevMoney, elapsedMs);

    expect(result.wasClamped).toBe(true);
    expect(result.clampedMoney).toBeLessThan(forgedClaim);
    expect(result.clampedMoney).toBe(prevMoney + elapsedMs * MAX_PLAUSIBLE_INCOME_PER_MS);
    expect(result.rejectedExcess).toBe(forgedClaim - result.clampedMoney);
  });

  it('does not clamp legitimate, generous tick income between syncs', () => {
    // A whale corp earning even $50M in a single 60s sync interval (very
    // generous relative to docs/BALANCE.md's largest single service revenue,
    // $160M/MONTH) must sail through untouched.
    const prevMoney = 5_000_000_000;
    const legitimateClaim = prevMoney + 50_000_000;
    const result = clampPlausibleMoney(legitimateClaim, prevMoney, 60_000);
    expect(result.wasClamped).toBe(false);
    expect(result.clampedMoney).toBe(legitimateClaim);
    expect(result.rejectedExcess).toBe(0);
  });

  it('never restricts downward movement (spending, hazard losses)', () => {
    const result = clampPlausibleMoney(100, 999_999_999, 60_000);
    expect(result.wasClamped).toBe(false);
    expect(result.clampedMoney).toBe(100);
  });

  it('C-2 regression: a rapid re-sync (< 5 s) gets ZERO headroom — there is no per-request floor to ratchet', () => {
    // The old 5 s FLOOR granted >= $10M of headroom to every request, and
    // every sync re-stamped lastSyncAt, so a tight loop minted ~$2B/min.
    const prevMoney = 1_000_000;
    const r0 = clampPlausibleMoney(prevMoney + 1, prevMoney, 0);
    expect(r0.ceiling).toBe(prevMoney);
    expect(r0.wasClamped).toBe(true);
    expect(r0.clampedMoney).toBe(prevMoney);
    const r4 = clampPlausibleMoney(prevMoney + 10_000_000, prevMoney, MIN_PLAUSIBILITY_ELAPSED_MS - 1);
    expect(r4.ceiling).toBe(prevMoney);
    expect(r4.clampedMoney).toBe(prevMoney);
    // Above the threshold the headroom is linear in elapsed time.
    const r5 = clampPlausibleMoney(prevMoney, prevMoney, MIN_PLAUSIBILITY_ELAPSED_MS);
    expect(r5.ceiling).toBe(prevMoney + MIN_PLAUSIBILITY_ELAPSED_MS * MAX_PLAUSIBLE_INCOME_PER_MS);
    expect(plausibleIncomeHeadroom(30_000)).toBe(30_000 * MAX_PLAUSIBLE_INCOME_PER_MS);
    expect(plausibleIncomeHeadroom(-1)).toBe(0);
  });

  it('caps elapsed time so a long-dormant lastSyncAt cannot produce an unbounded ceiling', () => {
    const prevMoney = 1_000_000;
    const oneYearMs = 365 * 24 * 3600_000;
    const result = clampPlausibleMoney(prevMoney, prevMoney, oneYearMs);
    expect(result.ceiling).toBe(prevMoney + MAX_PLAUSIBILITY_ELAPSED_MS * MAX_PLAUSIBLE_INCOME_PER_MS);
  });

  it('treats non-finite inputs as zero/floor rather than throwing or producing NaN', () => {
    const result = clampPlausibleMoney(Number.NaN, Number.NaN, Number.NaN);
    expect(Number.isFinite(result.clampedMoney)).toBe(true);
    expect(Number.isFinite(result.ceiling)).toBe(true);
  });
});

describe('reconciliation hand-off queue', () => {
  beforeEach(() => __clearReconciliationQueue());

  it('delivers a queued reconciliation exactly once', () => {
    queueServerReconciliation({ maxSeq: 3, moneyDelta: 100, resourceDeltas: {} });
    expect(consumeServerReconciliation()?.maxSeq).toBe(3);
    expect(consumeServerReconciliation()).toBeNull();
  });

  it('a newer reconciliation supersedes an unconsumed older one', () => {
    queueServerReconciliation({ maxSeq: 3, moneyDelta: 100, resourceDeltas: {} });
    queueServerReconciliation({ maxSeq: 5, moneyDelta: 300, resourceDeltas: {} });
    const rec = consumeServerReconciliation();
    expect(rec?.maxSeq).toBe(5);
    expect(rec?.moneyDelta).toBe(300);
  });

  it('an older reconciliation never replaces a newer queued one', () => {
    queueServerReconciliation({ maxSeq: 5, moneyDelta: 300, resourceDeltas: {} });
    queueServerReconciliation({ maxSeq: 3, moneyDelta: 100, resourceDeltas: {} });
    expect(consumeServerReconciliation()?.maxSeq).toBe(5);
  });

  it('rejects malformed payloads', () => {
    queueServerReconciliation({} as never);
    expect(consumeServerReconciliation()).toBeNull();
  });
});
