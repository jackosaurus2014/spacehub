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
  plausibleAllowanceRatePerMs,
  MONEY_HEADROOM_MULT,
  MAX_ABSOLUTE_INCOME_PER_MS,
  MONEY_ALLOWANCE_FLOOR_PER_MS,
  MONEY_ALLOWANCE_GROSS_MULT,
  MIN_PLAUSIBILITY_ELAPSED_MS,
  MAX_PLAUSIBILITY_ELAPSED_MS,
  type LedgerEntryLite,
} from '../ledger-reconcile';
import { REAL_MS_PER_GAME_MONTH } from '../server-time';
import type { GameState } from '../types';

/** A mid-game corporation's server-derived monthly gross for the clamp tests. */
const GROSS = 273_000_000;
/** Independent oracle for the headroom formula (ledger-reconcile.ts header):
 *  the state-derived term, bounded by an allowance rail that SCALES with the
 *  same verified gross and never drops below the $500/ms floor. */
const headroomFor = (ms: number, gross: number = GROSS) => {
  const stateDerived = gross * MONEY_HEADROOM_MULT * (ms / REAL_MS_PER_GAME_MONTH);
  const railRate = Math.max(MONEY_ALLOWANCE_FLOOR_PER_MS, (gross * MONEY_ALLOWANCE_GROSS_MULT) / REAL_MS_PER_GAME_MONTH);
  return Math.round(Math.min(stateDerived, ms * railRate));
};

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
describe('clampPlausibleMoney — E1 exploit #5 regression (state-derived ceiling, 2026-09-02)', () => {
  it('regression: an edited-save / forged sync claiming an absurd figure is rejected, not believed', () => {
    // This is exactly the exploit: reconcileBalance's BASE (clientMoney) was
    // never checked against anything, so a save edited to claim an
    // arbitrarily large `money` figure sailed straight through to
    // `reconciledMoney` and got persisted. The clamp must reject it.
    const prevMoney = 1_000_000_000; // $1B, plausible mid-game net worth
    const elapsedMs = 60_000; // one normal 60s sync interval
    const forgedClaim = 999_999_999_999_999; // near JS max safe integer
    const result = clampPlausibleMoney(forgedClaim, prevMoney, elapsedMs, GROSS);

    expect(result.wasClamped).toBe(true);
    expect(result.clampedMoney).toBeLessThan(forgedClaim);
    expect(result.clampedMoney).toBe(prevMoney + headroomFor(elapsedMs));
    expect(result.headroom).toBe(headroomFor(elapsedMs));
    expect(result.rejectedExcess).toBe(forgedClaim - result.clampedMoney);
  });

  it('does not clamp legitimate tick income between syncs', () => {
    // A $273M/month corporation earns ≈ $760K per 60 s sync interval on the
    // 6 h calendar; the ceiling grants 2x that.
    const prevMoney = 5_000_000_000;
    const perMinute = GROSS * (60_000 / REAL_MS_PER_GAME_MONTH);
    const legitimateClaim = prevMoney + Math.round(perMinute * 1.5);
    const result = clampPlausibleMoney(legitimateClaim, prevMoney, 60_000, GROSS);
    expect(result.wasClamped).toBe(false);
    expect(result.clampedMoney).toBe(legitimateClaim);
    expect(result.rejectedExcess).toBe(0);
  });

  it('the ceiling is derived from the profile state: a corp with no revenue state gets no headroom', () => {
    const prevMoney = 1_000_000;
    const r = clampPlausibleMoney(prevMoney + 1, prevMoney, 60_000, 0);
    expect(r.headroom).toBe(0);
    expect(r.wasClamped).toBe(true);
    expect(r.clampedMoney).toBe(prevMoney);
    expect(plausibleIncomeHeadroom(60_000, Number.NaN)).toBe(0);
    expect(plausibleIncomeHeadroom(60_000, -5)).toBe(0);
  });

  it('the 360x clock bug would now be rejected: a 60 s claim of a full month of gross is clamped', () => {
    const prevMoney = 1_000_000_000;
    const oldClockClaim = prevMoney + GROSS; // what the 60 s month used to credit per minute
    const r = clampPlausibleMoney(oldClockClaim, prevMoney, 60_000, GROSS);
    expect(r.wasClamped).toBe(true);
    expect(r.rejectedExcess).toBeGreaterThan(GROSS * 0.99);
  });

  it('never restricts downward movement (spending, hazard losses)', () => {
    const result = clampPlausibleMoney(100, 999_999_999, 60_000, GROSS);
    expect(result.wasClamped).toBe(false);
    expect(result.clampedMoney).toBe(100);
  });

  it('C-2 regression: a rapid re-sync (< 5 s) gets ZERO headroom — there is no per-request floor to ratchet', () => {
    // The old 5 s FLOOR granted >= $10M of headroom to every request, and
    // every sync re-stamped lastSyncAt, so a tight loop minted ~$2B/min.
    const prevMoney = 1_000_000;
    const r0 = clampPlausibleMoney(prevMoney + 1, prevMoney, 0, GROSS);
    expect(r0.ceiling).toBe(prevMoney);
    expect(r0.wasClamped).toBe(true);
    expect(r0.clampedMoney).toBe(prevMoney);
    const r4 = clampPlausibleMoney(prevMoney + 10_000_000, prevMoney, MIN_PLAUSIBILITY_ELAPSED_MS - 1, GROSS);
    expect(r4.ceiling).toBe(prevMoney);
    expect(r4.clampedMoney).toBe(prevMoney);
    // Above the threshold the headroom is linear in elapsed time.
    const r5 = clampPlausibleMoney(prevMoney, prevMoney, MIN_PLAUSIBILITY_ELAPSED_MS, GROSS);
    expect(r5.ceiling).toBe(prevMoney + headroomFor(MIN_PLAUSIBILITY_ELAPSED_MS));
    expect(plausibleIncomeHeadroom(30_000, GROSS)).toBe(headroomFor(30_000));
    expect(Math.abs(plausibleIncomeHeadroom(60_000, GROSS) - 2 * plausibleIncomeHeadroom(30_000, GROSS))).toBeLessThanOrEqual(1);
    expect(plausibleIncomeHeadroom(-1, GROSS)).toBe(0);
  });

  it('2026-09-13 scaling fix: the rail scales with the verified gross of the profile', () => {
    // REGRESSION. The rail used to be a FLAT $500/ms ($30M per real minute)
    // and was the binding term in production: a profile whose own
    // serverMonthlyGross was $192.7B was granted headroom = 29,968,500 for a
    // 60 s gap and had the rest of its legitimate tick income rejected on
    // every single sync. The rail is now derived from that same gross.
    const whale = 192_700_000_000; // the production clamp record
    const r = clampPlausibleMoney(1e18, 0, 60_000, whale);
    const flatOldRail = 60_000 * MONEY_ALLOWANCE_FLOOR_PER_MS; // 30,000,000
    expect(r.headroom).toBe(headroomFor(60_000, whale));
    expect(r.headroom).toBe(Math.round(whale * MONEY_HEADROOM_MULT * (60_000 / REAL_MS_PER_GAME_MONTH)));
    expect(r.headroom).toBeGreaterThan(flatOldRail * 30); // was the binding term; no longer is
    // The rail is still a real outer bound, strictly looser than the
    // state-derived term so it can never clamp a corporation for being large.
    expect(MONEY_ALLOWANCE_GROSS_MULT).toBeGreaterThan(MONEY_HEADROOM_MULT);
    expect(60_000 * plausibleAllowanceRatePerMs(whale)).toBeGreaterThan(r.headroom);
    // …and it is the $500/ms floor for a profile the server cannot vouch for.
    expect(plausibleAllowanceRatePerMs(0)).toBe(MONEY_ALLOWANCE_FLOOR_PER_MS);
    expect(MAX_ABSOLUTE_INCOME_PER_MS).toBe(MONEY_ALLOWANCE_FLOOR_PER_MS);
    // A gross so large the state term overflows degrades to the floor, not
    // to an unbounded ceiling.
    expect(Number.isFinite(plausibleIncomeHeadroom(60_000, Number.MAX_VALUE))).toBe(true);
  });

  it('caps elapsed time so a long-dormant lastSyncAt cannot produce an unbounded ceiling', () => {
    const prevMoney = 1_000_000;
    const oneYearMs = 365 * 24 * 3600_000;
    const result = clampPlausibleMoney(prevMoney, prevMoney, oneYearMs, GROSS);
    expect(result.ceiling).toBe(prevMoney + headroomFor(MAX_PLAUSIBILITY_ELAPSED_MS));
  });

  it('treats non-finite inputs as zero/floor rather than throwing or producing NaN', () => {
    const result = clampPlausibleMoney(Number.NaN, Number.NaN, Number.NaN, Number.NaN);
    expect(Number.isFinite(result.clampedMoney)).toBe(true);
    expect(Number.isFinite(result.ceiling)).toBe(true);
  });
});

// ─── Scaling property (2026-09-13): the ceiling must follow the corporation ──
// The clamp's job is to reject income the profile's persisted state cannot
// produce — never to cap how large a corporation may become. Before the
// scaling fix the second term of the headroom was a flat $500/ms, so every
// corporation grossing more than ~$10.8B per 6 h game-month lost money on
// screen on every sync. This suite encodes the property directly at three
// sizes spanning four orders of magnitude.

describe('money ceiling scales with the corporation (2026-09-13)', () => {
  /** A realistic session cadence: the client syncs every 60 s, with a 30 s
   *  floor, and stretches to ~5 min when the tab is backgrounded. */
  const CADENCE_MS = [60_000, 60_000, 30_000, 60_000, 300_000, 60_000];

  /** Bank one full game-month of `gross` across that cadence, claiming the
   *  profile's exact legitimate tick income each sync. Returns the run. */
  function bankAGameMonth(gross: number, startMoney: number, claimFraction = 1.0) {
    let money = startMoney;
    let elapsedTotal = 0;
    let clamps = 0;
    let i = 0;
    while (elapsedTotal < REAL_MS_PER_GAME_MONTH) {
      const dt = Math.min(CADENCE_MS[i++ % CADENCE_MS.length], REAL_MS_PER_GAME_MONTH - elapsedTotal);
      const earned = gross * (dt / REAL_MS_PER_GAME_MONTH) * claimFraction;
      const r = clampPlausibleMoney(money + earned, money, dt, gross);
      if (r.wasClamped) clamps++;
      money = r.clampedMoney;
      elapsedTotal += dt;
    }
    return { money, clamps, gained: money - startMoney, syncs: i };
  }

  const SIZES: { label: string; gross: number; startMoney: number }[] = [
    { label: '$10M/game-month (early corporation)', gross: 10_000_000, startMoney: 5_000_000 },
    { label: '$1B/game-month (mid-game)', gross: 1_000_000_000, startMoney: 500_000_000 },
    { label: '$50B/game-month (integrator, the 50-year sim end state)', gross: 50_000_000_000, startMoney: 10_000_000_000 },
  ];

  for (const { label, gross, startMoney } of SIZES) {
    it(`banks a full game-month of its own verified income unclamped — ${label}`, () => {
      const run = bankAGameMonth(gross, startMoney);
      expect(run.clamps).toBe(0);
      // A whole game-month of gross arrives intact (rounding only).
      expect(run.gained).toBeGreaterThan(gross * 0.999);
      expect(run.gained).toBeLessThanOrEqual(gross * 1.001);
      // …and MONEY_HEADROOM_MULT still leaves real slack for burst ticks:
      // claiming 1.9x the nominal rate every sync is also accepted.
      expect(bankAGameMonth(gross, startMoney, 1.9).clamps).toBe(0);
    });

    it(`still rejects a claim far beyond the verified gross — ${label}`, () => {
      // 100x the legitimate rate, every sync, is refused every sync and the
      // profile is held to exactly prev + headroom.
      const dt = 60_000;
      const legit = gross * (dt / REAL_MS_PER_GAME_MONTH);
      const r = clampPlausibleMoney(startMoney + legit * 100, startMoney, dt, gross);
      expect(r.wasClamped).toBe(true);
      expect(r.clampedMoney).toBe(startMoney + headroomFor(dt, gross));
      expect(r.headroom).toBeLessThanOrEqual(legit * MONEY_HEADROOM_MULT + 1);
      // Running the forged cadence for a month never ratchets: the gain is
      // still bounded by 2x a month of verified gross.
      const forged = bankAGameMonth(gross, startMoney, 100);
      expect(forged.clamps).toBe(forged.syncs);
      expect(forged.gained).toBeLessThanOrEqual(gross * MONEY_HEADROOM_MULT + forged.syncs);
      // A flat forged figure (the E1 exploit) is rejected at every size.
      expect(clampPlausibleMoney(9e14, startMoney, dt, gross).clampedMoney)
        .toBe(startMoney + headroomFor(dt, gross));
    });
  }

  it('the old flat $500/ms rail was the binding term above ~$10.8B/game-month', () => {
    const flatRailPerMinute = 60_000 * MONEY_ALLOWANCE_FLOOR_PER_MS; // $30M
    const breakEvenGross = MONEY_ALLOWANCE_FLOOR_PER_MS * REAL_MS_PER_GAME_MONTH / MONEY_HEADROOM_MULT;
    expect(breakEvenGross).toBeCloseTo(5_400_000_000, -6); // $5.4B x MULT 2 = $10.8B of income
    // Under the old rule the $50B integrator lost income on every sync…
    const perMinute50B = 50_000_000_000 * (60_000 / REAL_MS_PER_GAME_MONTH);
    expect(perMinute50B).toBeGreaterThan(flatRailPerMinute);
    // …and under the new rule it is inside its own ceiling.
    expect(headroomFor(60_000, 50_000_000_000)).toBeGreaterThan(perMinute50B);
    // The early and mid-game corporations are unaffected by the change:
    // their state-derived term was, and remains, the binding one.
    expect(headroomFor(60_000, 10_000_000)).toBe(
      Math.round(10_000_000 * MONEY_HEADROOM_MULT * (60_000 / REAL_MS_PER_GAME_MONTH)));
    expect(headroomFor(60_000, 1_000_000_000)).toBeLessThan(flatRailPerMinute);
  });

  it('a week away: the 30-day elapsed cap still covers away-operations income', () => {
    // away-operations.ts is uncapped in DURATION but capped in RATE at
    // AWAY_EFFICIENCY_INVESTMENT_CAP = 0.85, so a week away (28 game-months)
    // can legitimately bank at most 0.85 x 28 months of gross against a
    // headroom of 2 x 28. Under the OLD flat rail the same week granted a
    // $50B integrator only 7d x $500/ms = $302B — less than one month of its
    // own income — and clamped the rest.
    const gross = 50_000_000_000;
    const weekMs = 7 * 24 * 3600_000;
    const awayIncome = gross * (weekMs / REAL_MS_PER_GAME_MONTH) * 0.85;
    expect(plausibleIncomeHeadroom(weekMs, gross)).toBeGreaterThan(awayIncome);
    expect(weekMs * MONEY_ALLOWANCE_FLOOR_PER_MS).toBeLessThan(awayIncome); // the old rail failed here
    // The 30-day cap is the real limit: it covers absences up to
    // MONEY_HEADROOM_MULT / 0.85 x 30d ≈ 70 real days.
    const sixtyDays = 60 * 24 * 3600_000;
    expect(plausibleIncomeHeadroom(sixtyDays, gross)).toBe(plausibleIncomeHeadroom(MAX_PLAUSIBILITY_ELAPSED_MS, gross));
    expect(plausibleIncomeHeadroom(sixtyDays, gross)).toBeGreaterThan(gross * (sixtyDays / REAL_MS_PER_GAME_MONTH) * 0.85);
    const hundredDays = 100 * 24 * 3600_000;
    expect(plausibleIncomeHeadroom(hundredDays, gross)).toBeLessThan(gross * (hundredDays / REAL_MS_PER_GAME_MONTH) * 0.85);
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

// ─── Money desync fix (2026-09-12): verified one-shot headroom + client
// adoption of the server figure ───────────────────────────────────────────────

import {
  computeMoneyCorrection,
  queueMoneyCorrection,
  consumeMoneyCorrection,
  applyMoneyCorrectionToState,
  MONEY_CORRECTION_MIN_ABS,
} from '../ledger-reconcile';

describe('clampPlausibleMoney — extraHeadroom (contract credit)', () => {
  it('adds the verified one-shot credit on top of the time-proportional term', () => {
    const elapsed = 60_000;
    const base = plausibleIncomeHeadroom(elapsed, GROSS);
    const credit = 60_000_000;
    const r = clampPlausibleMoney(1_000_000_000, 100_000_000, elapsed, GROSS, credit);
    expect(r.headroom).toBe(base + credit);
    expect(r.ceiling).toBe(100_000_000 + base + credit);
    expect(r.clampedMoney).toBe(r.ceiling);
    expect(r.wasClamped).toBe(true);
  });

  it('a claim inside prev + headroom + credit passes untouched', () => {
    const r = clampPlausibleMoney(160_000_000, 100_000_000, 60_000, GROSS, 60_000_000);
    expect(r.wasClamped).toBe(false);
    expect(r.clampedMoney).toBe(160_000_000);
  });

  it('is granted even inside the no-growth window (a contract is not tick income)', () => {
    const r = clampPlausibleMoney(160_000_000, 100_000_000, 1_000, GROSS, 60_000_000);
    expect(plausibleIncomeHeadroom(1_000, GROSS)).toBe(0);
    expect(r.headroom).toBe(60_000_000);
    expect(r.wasClamped).toBe(false);
  });

  it('does not loosen the constants: without a credit the ceiling is unchanged', () => {
    const a = clampPlausibleMoney(1e12, 1e6, 60_000, GROSS);
    const b = clampPlausibleMoney(1e12, 1e6, 60_000, GROSS, 0);
    const c = clampPlausibleMoney(1e12, 1e6, 60_000, GROSS, -5_000_000);
    const d = clampPlausibleMoney(1e12, 1e6, 60_000, GROSS, Number.NaN);
    expect(b).toEqual(a);
    expect(c).toEqual(a);
    expect(d).toEqual(a);
    expect(a.headroom).toBe(plausibleIncomeHeadroom(60_000, GROSS));
    expect(MONEY_HEADROOM_MULT).toBe(2.0);
    expect(MAX_ABSOLUTE_INCOME_PER_MS).toBe(500);
  });
});

describe('computeMoneyCorrection', () => {
  it('is the server figure minus what was sent, minus the ledger delta applied separately', () => {
    expect(computeMoneyCorrection(80_000_000, 100_000_000)).toBe(-20_000_000);
    expect(computeMoneyCorrection(95_000_000, 100_000_000, 10_000_000)).toBe(-15_000_000);
    expect(computeMoneyCorrection(105_000_000, 100_000_000)).toBe(5_000_000);
  });

  it('ignores noise below the floor and non-finite inputs', () => {
    expect(computeMoneyCorrection(100_000_500, 100_000_000)).toBe(0);
    expect(computeMoneyCorrection(100_000_000 - MONEY_CORRECTION_MIN_ABS, 100_000_000)).toBe(-MONEY_CORRECTION_MIN_ABS);
    expect(computeMoneyCorrection(Number.NaN, 100)).toBe(0);
    expect(computeMoneyCorrection(100, Number.POSITIVE_INFINITY)).toBe(0);
    expect(computeMoneyCorrection(50, 100, Number.NaN)).toBe(0); // |−50| < floor
  });
});

describe('money correction queue + apply', () => {
  beforeEach(() => __clearReconciliationQueue());

  it('single slot: the newest correction supersedes an unconsumed one; consumed once', () => {
    queueMoneyCorrection(-20_000_000);
    queueMoneyCorrection(-5_000_000);
    expect(consumeMoneyCorrection()).toBe(-5_000_000);
    expect(consumeMoneyCorrection()).toBeNull();
  });

  it('zero / non-finite corrections are not queued', () => {
    queueMoneyCorrection(0);
    queueMoneyCorrection(Number.NaN);
    expect(consumeMoneyCorrection()).toBeNull();
  });

  it('applies as a delta so income ticked since the payload survives; only money moves', () => {
    const s = minimalState({ money: 101_000_000, totalEarned: 500, totalSpent: 200 });
    const out = applyMoneyCorrectionToState(s, -20_000_000);
    expect(out.money).toBe(81_000_000);
    expect(out.totalEarned).toBe(500);
    expect(out.totalSpent).toBe(200);
    expect(out.resources).toBe(s.resources);
    expect(applyMoneyCorrectionToState(s, 0)).toBe(s);
  });

  it('is independent of the ledger ack guard', () => {
    const s = minimalState({ money: 100, serverLedgerAck: 10 });
    // A ledger reconciliation at/below the ack is a no-op...
    expect(applyReconciliationToState(s, { maxSeq: 10, moneyDelta: 5, resourceDeltas: {} })).toBe(s);
    // ...but a money correction still lands.
    expect(applyMoneyCorrectionToState(s, -50_000).money).toBe(100 - 50_000);
  });
});

// ─── 2026-09-13: never remove money silently twice + the Mail record ─────────

import {
  moneyCorrectionKey,
  wasNegativeCorrectionQueued,
  consumeMoneyCorrectionDetail,
  buildMoneyCorrectionReport,
  moneyCorrectionReportId,
  formatCorrectionAmount,
  MONEY_CORRECTION_KEY_MEMORY,
  type MoneyCorrectionDetail,
} from '../ledger-reconcile';

function detailFor(reconciledMoney: number, syncedAtMs: number, extra: Partial<MoneyCorrectionDetail> = {}): MoneyCorrectionDetail {
  return {
    key: moneyCorrectionKey(reconciledMoney, syncedAtMs),
    reconciledMoney,
    syncedAtMs,
    rejectedExcess: 0,
    unverified: { contracts: [], timedEvents: [], deliveries: [] },
    ...extra,
  };
}

describe('negative money corrections are idempotent on (reconciledMoney, syncedAtMs)', () => {
  beforeEach(() => __clearReconciliationQueue());

  it('the same server figure is refused the second time, even after the first was consumed', () => {
    const d = detailFor(101_000_000, 1_800_000_000_000);
    expect(queueMoneyCorrection(-499_000_000, d)).toBe(true);
    expect(consumeMoneyCorrection()).toBe(-499_000_000);
    expect(queueMoneyCorrection(-499_000_000, d)).toBe(false);
    expect(consumeMoneyCorrection()).toBeNull();
    expect(wasNegativeCorrectionQueued(d.key)).toBe(true);
  });

  it('a different sync timestamp or figure is a new correction', () => {
    expect(queueMoneyCorrection(-10_000_000, detailFor(101_000_000, 1))).toBe(true);
    expect(queueMoneyCorrection(-10_000_000, detailFor(101_000_000, 2))).toBe(true);
    expect(queueMoneyCorrection(-10_000_000, detailFor(102_000_000, 2))).toBe(true);
    expect(moneyCorrectionKey(101_000_000, 1)).not.toBe(moneyCorrectionKey(101_000_000, 2));
  });

  it('positive corrections and detail-less negatives are never keyed', () => {
    const d = detailFor(150_000_000, 5);
    expect(queueMoneyCorrection(20_000_000, d)).toBe(true);
    expect(queueMoneyCorrection(20_000_000, d)).toBe(true);
    expect(wasNegativeCorrectionQueued(d.key)).toBe(false);
    expect(queueMoneyCorrection(-5_000_000)).toBe(true);
    expect(queueMoneyCorrection(-5_000_000)).toBe(true);
  });

  it('remembers a bounded number of keys (the newest win)', () => {
    for (let i = 0; i < MONEY_CORRECTION_KEY_MEMORY + 5; i++) {
      queueMoneyCorrection(-1_000_000, detailFor(1_000_000, i));
    }
    expect(wasNegativeCorrectionQueued(moneyCorrectionKey(1_000_000, 0))).toBe(false);
    expect(wasNegativeCorrectionQueued(moneyCorrectionKey(1_000_000, MONEY_CORRECTION_KEY_MEMORY + 4))).toBe(true);
  });

  it('consumeMoneyCorrectionDetail hands the engine the delta and the detail, once', () => {
    const d = detailFor(101_000_000, 9, { rejectedExcess: 499_000_000 });
    queueMoneyCorrection(-499_000_000, d);
    expect(consumeMoneyCorrectionDetail()).toEqual({ delta: -499_000_000, detail: d });
    expect(consumeMoneyCorrectionDetail()).toBeNull();
  });
});

describe('buildMoneyCorrectionReport — the Mail record', () => {
  it('names the amount, the server figure, the rejected excess and every unverified id; id = the correction key', () => {
    const d = detailFor(101_000_000, 1_800_000_000_000, {
      rejectedExcess: 499_000_000,
      unverified: { contracts: ['c_forged'], timedEvents: ['evt:evt_precious_metals:5'], deliveries: ['dlv-the-dominion-a-b'] },
    });
    const r = buildMoneyCorrectionReport(-499_000_000, d, 1_800_000_060_000);
    expect(r.id).toBe(moneyCorrectionReportId(d.key));
    expect(r.type).toBe('system_alert');
    expect(r.read).toBe(false);
    expect(r.createdAt).toBe(1_800_000_060_000);
    expect(r.title).toBe('Balance reconciled: $499.0M removed');
    expect(r.body).toContain('$499.0M was removed');
    expect(r.body).toContain("server's figure ($101.0M)");
    expect(r.body).toContain('Claim above the ceiling this sync: $499.0M');
    expect(r.body).toContain('contracts: c_forged');
    expect(r.body).toContain('timed events: evt:evt_precious_metals:5');
    expect(r.body).toContain('deliveries: dlv-the-dominion-a-b');
    expect(r.body).toContain('contact support');
  });

  it('explains a correction with no named ids, and survives a missing detail', () => {
    const r = buildMoneyCorrectionReport(-2_500_000, detailFor(50_000_000, 3), 10);
    expect(r.body).toContain('No specific contract, event or delivery was named');
    const bare = buildMoneyCorrectionReport(-1_500_000_000, null, 10);
    expect(bare.title).toBe('Balance reconciled: $1.50B removed');
    expect(bare.id).toBe(moneyCorrectionReportId(moneyCorrectionKey(0, 10)));
  });

  it('formatCorrectionAmount picks B / M / K', () => {
    expect(formatCorrectionAmount(1_500_000_000)).toBe('$1.50B');
    expect(formatCorrectionAmount(20_000_000)).toBe('$20.0M');
    expect(formatCorrectionAmount(450_000)).toBe('$450K');
  });
});
