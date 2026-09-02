// ─── Wave M6 (docs/MEANINGFUL_2026-08.md §M6): share registry & takeovers ───
// Pure-math coverage: valuation formula, deterministic tender resolution
// (incl. ties), pro-rata allocation, minority protections (mandatory bid,
// dividends), population gate, Frontier shield, distress classification,
// diligence noise, and snapshot clamping. Escrow flows are covered via
// transferShares against a mocked prisma transaction client
// (server-equity.ts) plus the money-conservation invariant on
// planTenderSettlement.

// server-equity.ts imports the real prisma client + logger at module load;
// transferShares only ever touches the tx client we hand it, so both are
// stubbed out (no DB in unit tests).
jest.mock('@/lib/db', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

import {
  TOTAL_SHARES,
  CONTROL_SHARES,
  TAKEOVER_MIN_ACTIVE_CORPS,
  ACTIVE_CORP_WINDOW_MS,
  MIN_VALUATION,
  MARKET_PREMIUM_MIN,
  MARKET_PREMIUM_MAX,
  TENDER_MIN_PREMIUM,
  DISTRESS_TRANCHE_SHARES,
  DILIGENCE_NOISE_PCT,
  getTakeoverGateStatus,
  isProfileTakeoverProtected,
  FRONTIER_SHIELD_DURATION_MS,
  FRONTIER_SHIELD_HARD_CAP_NET_WORTH,
  computeValuation,
  minTenderPricePerShare,
  arbitrationFee,
  rankContestOffers,
  allocateProRata,
  planTenderSettlement,
  classifyDistressMonth,
  distressTrancheShares,
  distressPricePerShare,
  raisePricePerShare,
  planDividend,
  seededUnitNoise,
  applyDiligenceNoise,
  diligenceWeekKey,
  clampEquitySnapshot,
  type ContestOffer,
  type EquitySnapshot,
} from '../share-registry';
import { transferShares } from '../server-equity';

// ─── Valuation ──────────────────────────────────────────────────────────────

describe('computeValuation', () => {
  it('anchors to book net worth at premium 1.0 when no growth data', () => {
    const v = computeValuation(1_000_000_000, null);
    expect(v.marketPremium).toBe(1);
    expect(v.valuation).toBe(1_000_000_000);
    expect(v.fairSharePrice).toBe(1_000_000_000 / TOTAL_SHARES);
  });

  it('applies growth premium at half-weight, clamped both directions', () => {
    expect(computeValuation(1e9, 40).marketPremium).toBe(1.2); // 1 + 0.5*0.4
    expect(computeValuation(1e9, 100_000).marketPremium).toBe(MARKET_PREMIUM_MAX);
    expect(computeValuation(1e9, -100_000).marketPremium).toBe(MARKET_PREMIUM_MIN);
  });

  it('never values below the floor (zero/negative/NaN book)', () => {
    expect(computeValuation(0, null).valuation).toBe(MIN_VALUATION);
    expect(computeValuation(-5e9, null).valuation).toBe(MIN_VALUATION);
    expect(computeValuation(NaN, null).valuation).toBe(MIN_VALUATION);
  });

  it('min tender price carries the control premium', () => {
    const v = computeValuation(1e9, null);
    expect(v.minTenderPricePerShare).toBe(Math.ceil(v.fairSharePrice * TENDER_MIN_PREMIUM));
    expect(minTenderPricePerShare(v.fairSharePrice)).toBe(v.minTenderPricePerShare);
  });

  it('arbitration fee is 2% of the offer value', () => {
    expect(arbitrationFee(10_000_000, 50)).toBe(Math.round(10_000_000 * 50 * 0.02));
  });
});

// ─── Population gate ────────────────────────────────────────────────────────

describe('getTakeoverGateStatus', () => {
  it('D6 population gates (docs/BALANCE.md 2026-09-02): the takeover gate is 10 active corps, 30-day window', () => {
    expect(TAKEOVER_MIN_ACTIVE_CORPS).toBe(10);
    expect(ACTIVE_CORP_WINDOW_MS).toBe(30 * 24 * 60 * 60 * 1000);
    expect(getTakeoverGateStatus(9, {}).enabled).toBe(false);
    expect(getTakeoverGateStatus(10, {}).enabled).toBe(true);
  });

  it('is dormant below the active-corp threshold — awaiting market depth', () => {
    const g = getTakeoverGateStatus(TAKEOVER_MIN_ACTIVE_CORPS - 1, {});
    expect(g.enabled).toBe(false);
    expect(g.reason).toBe('awaiting_market_depth');
    expect(g.requiredCorps).toBe(TAKEOVER_MIN_ACTIVE_CORPS);
  });

  it('opens at the threshold', () => {
    expect(getTakeoverGateStatus(TAKEOVER_MIN_ACTIVE_CORPS, {}).enabled).toBe(true);
  });

  it('force flag opens the dry-run cohort regardless of population', () => {
    const g = getTakeoverGateStatus(3, { TYCOON_TAKEOVERS_FORCE: 'true' });
    expect(g.enabled).toBe(true);
  });

  it('kill switch wins over both population and force', () => {
    const g = getTakeoverGateStatus(9999, { TYCOON_TAKEOVERS_ENABLED: 'false', TYCOON_TAKEOVERS_FORCE: 'true' });
    expect(g.enabled).toBe(false);
    expect(g.reason).toBe('disabled_by_flag');
  });
});

// ─── Frontier shield ────────────────────────────────────────────────────────

describe('isProfileTakeoverProtected', () => {
  const now = 1_800_000_000_000;
  it('shields a young, small corp', () => {
    expect(isProfileTakeoverProtected({ createdAtMs: now - 1000, netWorth: 50_000_000 }, now)).toBe(true);
  });
  it('drops the shield after the frontier duration', () => {
    expect(isProfileTakeoverProtected({ createdAtMs: now - FRONTIER_SHIELD_DURATION_MS - 1, netWorth: 1 }, now)).toBe(false);
  });
  it('drops the shield at the hard net-worth cap even when young', () => {
    expect(isProfileTakeoverProtected({ createdAtMs: now - 1000, netWorth: FRONTIER_SHIELD_HARD_CAP_NET_WORTH }, now)).toBe(false);
  });
});

// ─── Tender contest resolution ──────────────────────────────────────────────

describe('rankContestOffers — deterministic resolution', () => {
  const base = (over: Partial<ContestOffer>): ContestOffer => ({
    id: 'x',
    kind: 'tender',
    initiatorProfileId: 'p',
    pricePerShare: 100,
    sharesSought: 30,
    createdAtMs: 1000,
    ...over,
  });

  it('highest price wins', () => {
    const ranked = rankContestOffers([
      base({ id: 'a', pricePerShare: 100 }),
      base({ id: 'b', pricePerShare: 150 }),
      base({ id: 'c', pricePerShare: 120 }),
    ]);
    expect(ranked.map(o => o.id)).toEqual(['b', 'c', 'a']);
  });

  it('the defender wins price ties: buyback > white_knight > tender', () => {
    const ranked = rankContestOffers([
      base({ id: 'hostile', kind: 'tender' }),
      base({ id: 'knight', kind: 'white_knight' }),
      base({ id: 'board', kind: 'buyback' }),
    ]);
    expect(ranked[0].id).toBe('board');
    expect(ranked[1].id).toBe('knight');
    expect(ranked[2].id).toBe('hostile');
  });

  it('remaining ties break by createdAt then id — fully deterministic', () => {
    const offers = [
      base({ id: 'z', createdAtMs: 2000 }),
      base({ id: 'a', createdAtMs: 2000 }),
      base({ id: 'm', createdAtMs: 1000 }),
    ];
    const ranked = rankContestOffers(offers);
    expect(ranked.map(o => o.id)).toEqual(['m', 'a', 'z']);
    // Same inputs in any order → same output order.
    const ranked2 = rankContestOffers([...offers].reverse());
    expect(ranked2.map(o => o.id)).toEqual(['m', 'a', 'z']);
  });

  it('does not mutate its input', () => {
    const offers = [base({ id: 'b', pricePerShare: 1 }), base({ id: 'a', pricePerShare: 2 })];
    rankContestOffers(offers);
    expect(offers[0].id).toBe('b');
  });
});

// ─── Pro-rata allocation ────────────────────────────────────────────────────

describe('allocateProRata', () => {
  it('takes everything when undersubscribed', () => {
    const alloc = allocateProRata(50, [
      { holderProfileId: 'a', shares: 10 },
      { holderProfileId: 'b', shares: 20 },
    ]);
    expect(alloc.get('a')).toBe(10);
    expect(alloc.get('b')).toBe(20);
  });

  it('allocates exactly `sought` when oversubscribed (largest remainder)', () => {
    const alloc = allocateProRata(10, [
      { holderProfileId: 'a', shares: 7 },
      { holderProfileId: 'b', shares: 7 },
      { holderProfileId: 'c', shares: 7 },
    ]);
    const total = Array.from(alloc.values()).reduce((s, v) => s + v, 0);
    expect(total).toBe(10);
    // Deterministic remainder tie-break by holder id ascending: a and b get
    // the two extra shares over the floor of 3.
    expect(alloc.get('a')).toBe(4);
    expect(alloc.get('b')).toBe(3);
    expect(alloc.get('c')).toBe(3);
  });

  it('never allocates more than a holder accepted', () => {
    const alloc = allocateProRata(100, [{ holderProfileId: 'a', shares: 5 }]);
    expect(alloc.get('a')).toBe(5);
  });

  it('ignores garbage acceptances', () => {
    const alloc = allocateProRata(10, [
      { holderProfileId: 'a', shares: NaN },
      { holderProfileId: 'b', shares: -3 },
      { holderProfileId: 'c', shares: 4 },
    ]);
    expect(Array.from(alloc.keys())).toEqual(['c']);
    expect(alloc.get('c')).toBe(4);
  });

  it('is deterministic regardless of input order', () => {
    const accA = [
      { holderProfileId: 'b', shares: 9 },
      { holderProfileId: 'a', shares: 9 },
      { holderProfileId: 'c', shares: 9 },
    ];
    const r1 = allocateProRata(11, accA);
    const r2 = allocateProRata(11, [...accA].reverse());
    expect(Array.from(r1.entries()).sort()).toEqual(Array.from(r2.entries()).sort());
  });
});

// ─── Settlement plan / minority protections ─────────────────────────────────

describe('planTenderSettlement', () => {
  const offer: ContestOffer = {
    id: 'offer1',
    kind: 'tender',
    initiatorProfileId: 'buyer',
    pricePerShare: 1_000_000,
    sharesSought: 40,
    createdAtMs: 0,
  };

  it('conserves money: escrow = payments to holders + refund', () => {
    const escrow = offer.pricePerShare * offer.sharesSought;
    const plan = planTenderSettlement({
      offer,
      targetProfileId: 'target',
      acceptances: [
        { holderProfileId: 'h1', shares: 10 },
        { holderProfileId: 'h2', shares: 15 },
      ],
      buyerCurrentShares: 0,
      escrowAmount: escrow,
    });
    const paidOut = plan.moneyMoves
      .filter(m => m.reason === 'share_sale_proceeds')
      .reduce((s, m) => s + m.delta, 0);
    expect(plan.spent).toBe(paidOut);
    expect(plan.spent + plan.escrowRefund).toBe(escrow);
    expect(plan.sharesAcquired).toBe(25);
  });

  it('flags control when the buyer crosses 50% and pins the mandatory-bid price', () => {
    const plan = planTenderSettlement({
      offer: { ...offer, sharesSought: 30 },
      targetProfileId: 'target',
      acceptances: [{ holderProfileId: 'h1', shares: 30 }],
      buyerCurrentShares: 25,
      escrowAmount: 30 * offer.pricePerShare,
    });
    expect(plan.buyerSharesAfter).toBe(55);
    expect(plan.buyerSharesAfter).toBeGreaterThanOrEqual(CONTROL_SHARES);
    expect(plan.crossedControl).toBe(true);
    expect(plan.mandatoryBidPricePerShare).toBe(offer.pricePerShare);
  });

  it('does not re-flag control for a buyer already in control', () => {
    const plan = planTenderSettlement({
      offer: { ...offer, sharesSought: 10 },
      targetProfileId: 'target',
      acceptances: [{ holderProfileId: 'h1', shares: 10 }],
      buyerCurrentShares: 60,
      escrowAmount: 10 * offer.pricePerShare,
    });
    expect(plan.crossedControl).toBe(false);
    expect(plan.mandatoryBidPricePerShare).toBeNull();
  });

  it('buyback returns shares to the founder and never triggers control', () => {
    const plan = planTenderSettlement({
      offer: { ...offer, kind: 'buyback', initiatorProfileId: 'target' },
      targetProfileId: 'target',
      acceptances: [{ holderProfileId: 'h1', shares: 20 }],
      buyerCurrentShares: 60,
      escrowAmount: 40 * offer.pricePerShare,
    });
    expect(plan.crossedControl).toBe(false);
    expect(plan.shareMoves.every(m => m.toProfileId === 'target')).toBe(true);
  });

  it('an offer with zero acceptances refunds the full escrow (nobody is forced to sell)', () => {
    const escrow = offer.pricePerShare * offer.sharesSought;
    const plan = planTenderSettlement({
      offer,
      targetProfileId: 'target',
      acceptances: [],
      buyerCurrentShares: 0,
      escrowAmount: escrow,
    });
    expect(plan.sharesAcquired).toBe(0);
    expect(plan.escrowRefund).toBe(escrow);
    expect(plan.crossedControl).toBe(false);
  });
});

// ─── Distress ───────────────────────────────────────────────────────────────

describe('distress classification & tranches', () => {
  it('classifies pinned-low, non-recovering cash as distress', () => {
    expect(classifyDistressMonth(500_000, 400_000, 1_000_000_000)).toBe(true);
  });
  it('recovering cash resets even below the floor', () => {
    expect(classifyDistressMonth(100_000, 900_000, 1_000_000_000)).toBe(false);
  });
  it('healthy cash is never distress', () => {
    expect(classifyDistressMonth(null, 500_000_000, 1_000_000_000)).toBe(false);
  });
  it('first check (no previous cash) can classify', () => {
    expect(classifyDistressMonth(null, 0, 1_000_000_000)).toBe(true);
  });
  it('tranche stays inside the spec band and never exceeds the founder holding', () => {
    expect(distressTrancheShares(100)).toBe(DISTRESS_TRANCHE_SHARES);
    expect(DISTRESS_TRANCHE_SHARES).toBeGreaterThanOrEqual(5);
    expect(DISTRESS_TRANCHE_SHARES).toBeLessThanOrEqual(15);
    expect(distressTrancheShares(4)).toBe(4);
    expect(distressTrancheShares(0)).toBe(0);
  });
  it('distress prices below fair value, raises below fair value but above distress', () => {
    const fair = 10_000_000;
    expect(distressPricePerShare(fair)).toBeLessThan(fair);
    expect(raisePricePerShare(fair)).toBeLessThan(fair);
    expect(raisePricePerShare(fair)).toBeGreaterThan(distressPricePerShare(fair));
  });
});

// ─── Dividends ──────────────────────────────────────────────────────────────

describe('planDividend', () => {
  const holdings = [
    { holderProfileId: 'founder', shares: 70 },
    { holderProfileId: 'minA', shares: 20 },
    { holderProfileId: 'minB', shares: 10 },
  ];

  it('pays minorities pro-rata; the founder never pays themselves', () => {
    const plan = planDividend({
      quarterProfit: 100_000_000,
      payoutRatioPct: 20,
      holdings,
      founderProfileId: 'founder',
      founderCash: 1e12,
    });
    // pool = 20M, per share = 200k → minA 4M, minB 2M
    expect(plan.entries).toEqual([
      { holderProfileId: 'minA', amount: 4_000_000 },
      { holderProfileId: 'minB', amount: 2_000_000 },
    ]);
    expect(plan.total).toBe(6_000_000);
  });

  it('pays nothing on a loss quarter or zero ratio', () => {
    expect(planDividend({ quarterProfit: -5, payoutRatioPct: 20, holdings, founderProfileId: 'founder', founderCash: 1e12 }).total).toBe(0);
    expect(planDividend({ quarterProfit: 1e8, payoutRatioPct: 0, holdings, founderProfileId: 'founder', founderCash: 1e12 }).total).toBe(0);
  });

  it('never drives the payer negative — insufficient cash cancels the payout', () => {
    const plan = planDividend({ quarterProfit: 1e8, payoutRatioPct: 20, holdings, founderProfileId: 'founder', founderCash: 1_000_000 });
    expect(plan.total).toBe(0);
    expect(plan.entries).toEqual([]);
  });

  it('clamps the payout ratio to the 50% cap', () => {
    const capped = planDividend({ quarterProfit: 1e8, payoutRatioPct: 400, holdings, founderProfileId: 'founder', founderCash: 1e12 });
    const atCap = planDividend({ quarterProfit: 1e8, payoutRatioPct: 50, holdings, founderProfileId: 'founder', founderCash: 1e12 });
    expect(capped.total).toBe(atCap.total);
  });
});

// ─── Diligence noise ────────────────────────────────────────────────────────

describe('diligence noise', () => {
  it('is deterministic for the same seed and bounded by ±15%', () => {
    for (const seed of ['a:b:1:cash', 'x:y:2:book', 'p:q:3:profit']) {
      expect(seededUnitNoise(seed)).toBe(seededUnitNoise(seed));
      expect(Math.abs(seededUnitNoise(seed))).toBeLessThanOrEqual(1);
      const noisy = applyDiligenceNoise(1_000_000_000, seed);
      expect(Math.abs(noisy - 1_000_000_000)).toBeLessThanOrEqual(1_000_000_000 * DILIGENCE_NOISE_PCT + 1);
    }
  });

  it('different seeds produce different estimates (no single fixed offset)', () => {
    const values = new Set(['s1', 's2', 's3', 's4'].map(s => applyDiligenceNoise(1e9, s)));
    expect(values.size).toBeGreaterThan(1);
  });

  it('the week key pins repeat purchases within a week to identical numbers', () => {
    const t = Date.UTC(2026, 7, 16);
    expect(diligenceWeekKey(t)).toBe(diligenceWeekKey(t + 3 * 86_400_000 - 1));
  });
});

// ─── Snapshot clamp ─────────────────────────────────────────────────────────

describe('clampEquitySnapshot', () => {
  it('nulls out garbage', () => {
    expect(clampEquitySnapshot(null)).toBeNull();
    expect(clampEquitySnapshot(undefined)).toBeNull();
    expect(clampEquitySnapshot({} as EquitySnapshot)).toBeNull();
  });

  it('clamps registry numbers into sane ranges', () => {
    const snap = clampEquitySnapshot({
      enabled: true,
      reason: 'ok',
      activeCorps: 30,
      requiredCorps: TAKEOVER_MIN_ACTIVE_CORPS,
      registry: {
        totalShares: 100,
        founderShares: 5000, // forged
        floatShares: -20,
        valuation: NaN,
        fairSharePrice: 1e6,
        marketPremium: 99,
        controllerName: 'Rival',
        dividendPayoutPct: 900,
        distressMonths: -3,
        integrationMalusPct: 5, // forged — must clamp ≤ 0.25
      },
      tendersOnMe: [],
      myOffers: [],
      holdings: [],
      asOf: 123,
    });
    expect(snap?.registry?.founderShares).toBe(100);
    expect(snap?.registry?.floatShares).toBe(0);
    expect(snap?.registry?.valuation).toBe(0);
    expect(snap?.registry?.marketPremium).toBe(MARKET_PREMIUM_MAX);
    expect(snap?.registry?.dividendPayoutPct).toBe(50);
    expect(snap?.registry?.distressMonths).toBe(0);
    expect(snap?.registry?.integrationMalusPct).toBe(0.25);
  });

  it('preserves a well-formed snapshot', () => {
    const snap = clampEquitySnapshot({
      enabled: false,
      reason: 'awaiting_market_depth',
      activeCorps: 9,
      requiredCorps: TAKEOVER_MIN_ACTIVE_CORPS,
      registry: null,
      tendersOnMe: [{ id: 't1', kind: 'tender', initiatorName: 'A', targetName: 'B', pricePerShare: 5, sharesSought: 10, closesAtMs: 99, status: 'open' }],
      myOffers: [],
      holdings: [{ targetProfileId: 'x', targetName: 'X Corp', shares: 12 }],
      asOf: 5,
    });
    expect(snap?.enabled).toBe(false);
    expect(snap?.reason).toBe('awaiting_market_depth');
    expect(snap?.tendersOnMe[0].sharesSought).toBe(10);
    expect(snap?.holdings[0].shares).toBe(12);
  });
});

// ─── Escrow/holding flows against a mocked prisma tx ────────────────────────

type HoldingRow = { id: string; registryId: string; holderProfileId: string; shares: number };

function makeMockTx(rows: HoldingRow[]) {
  const table = new Map(rows.map(r => [`${r.registryId}:${r.holderProfileId}`, { ...r }]));
  return {
    table,
    corpShareHolding: {
      findUnique: jest.fn(async ({ where }: { where: { registryId_holderProfileId: { registryId: string; holderProfileId: string } } }) => {
        const k = `${where.registryId_holderProfileId.registryId}:${where.registryId_holderProfileId.holderProfileId}`;
        return table.get(k) ?? null;
      }),
      delete: jest.fn(async ({ where }: { where: { id: string } }) => {
        for (const [k, v] of Array.from(table.entries())) if (v.id === where.id) table.delete(k);
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: { shares: number } }) => {
        for (const v of Array.from(table.values())) if (v.id === where.id) v.shares = data.shares;
      }),
      upsert: jest.fn(async ({ where, create, update }: {
        where: { registryId_holderProfileId: { registryId: string; holderProfileId: string } };
        create: HoldingRow;
        update: { shares: { increment: number } };
      }) => {
        const k = `${where.registryId_holderProfileId.registryId}:${where.registryId_holderProfileId.holderProfileId}`;
        const existing = table.get(k);
        if (existing) existing.shares += update.shares.increment;
        else table.set(k, { ...create, id: `new_${k}` });
      }),
    },
  };
}

describe('transferShares (mocked prisma tx)', () => {
  it('moves shares and keeps the total invariant', async () => {
    const tx = makeMockTx([
      { id: 'h1', registryId: 'r1', holderProfileId: 'founder', shares: 100 },
    ]);
    await transferShares(tx as never, 'r1', 'founder', 'buyer', 30);
    const total = Array.from(tx.table.values()).reduce((s, r) => s + r.shares, 0);
    expect(total).toBe(TOTAL_SHARES);
    expect(tx.table.get('r1:founder')?.shares).toBe(70);
    expect(tx.table.get('r1:buyer')?.shares).toBe(30);
  });

  it('deletes an emptied holding row instead of leaving a zero row', async () => {
    const tx = makeMockTx([
      { id: 'h1', registryId: 'r1', holderProfileId: 'founder', shares: 60 },
      { id: 'h2', registryId: 'r1', holderProfileId: 'minor', shares: 40 },
    ]);
    await transferShares(tx as never, 'r1', 'minor', 'founder', 40);
    expect(tx.table.has('r1:minor')).toBe(false);
    expect(tx.table.get('r1:founder')?.shares).toBe(100);
  });

  it('throws on underflow — an over-accepted settlement can never mint shares', async () => {
    const tx = makeMockTx([
      { id: 'h1', registryId: 'r1', holderProfileId: 'minor', shares: 5 },
    ]);
    await expect(transferShares(tx as never, 'r1', 'minor', 'buyer', 10)).rejects.toThrow(/underflow/i);
  });

  it('is a no-op for self-transfers and non-positive amounts', async () => {
    const tx = makeMockTx([
      { id: 'h1', registryId: 'r1', holderProfileId: 'founder', shares: 100 },
    ]);
    await transferShares(tx as never, 'r1', 'founder', 'founder', 10);
    await transferShares(tx as never, 'r1', 'founder', 'buyer', 0);
    expect(tx.table.get('r1:founder')?.shares).toBe(100);
    expect(tx.corpShareHolding.upsert).not.toHaveBeenCalled();
  });
});

// ─── End-to-end determinism: contest → allocation → settlement ──────────────

describe('full contest determinism', () => {
  it('same contest inputs always produce the identical settlement plan', () => {
    const offers: ContestOffer[] = [
      { id: 'o1', kind: 'tender', initiatorProfileId: 'raider', pricePerShare: 2_000_000, sharesSought: 51, createdAtMs: 10 },
      { id: 'o2', kind: 'white_knight', initiatorProfileId: 'ally', pricePerShare: 2_000_000, sharesSought: 51, createdAtMs: 20 },
    ];
    const acceptances = [
      { holderProfileId: 'h1', shares: 30 },
      { holderProfileId: 'h2', shares: 30 },
    ];
    const run = () => {
      const winner = rankContestOffers(offers)[0];
      return planTenderSettlement({
        offer: winner,
        targetProfileId: 'target',
        acceptances,
        buyerCurrentShares: 0,
        escrowAmount: winner.pricePerShare * winner.sharesSought,
      });
    };
    const a = run();
    const b = run();
    expect(a).toEqual(b);
    // The white knight wins the tie over the hostile tender (defender-friendly).
    expect(a.offerId).toBe('o2');
    // 60 accepted vs 51 sought → pro-rata, control crossed.
    expect(a.sharesAcquired).toBe(51);
    expect(a.crossedControl).toBe(true);
  });
});
