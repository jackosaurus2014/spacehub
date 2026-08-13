// ─── One Wallet (audit A1): ledger reconciliation math ───────────────────────

import {
  sumLedgerEntries,
  reconcileBalance,
  applyResourceDeltas,
  applyReconciliationToState,
  queueServerReconciliation,
  consumeServerReconciliation,
  __clearReconciliationQueue,
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
