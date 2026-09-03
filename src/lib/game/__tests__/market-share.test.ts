/**
 * @jest-environment node
 *
 * Wave E6 (docs/ECONOMY_PVP_2026-08.md §E6) — market-share.ts pure
 * aggregation/ranking helpers. market-share.ts also exports Prisma-backed
 * I/O helpers (getResourceShare, hasActiveMarketIntel, etc.) which this
 * suite does not exercise directly — '@/lib/db' is mocked purely so
 * importing the module (which has a top-level `import prisma from
 * '@/lib/db'`) doesn't try to construct a real PrismaClient, matching the
 * pattern used by other __tests__ files that import a prisma-touching
 * module (see src/lib/__tests__/ad-server.test.ts and friends).
 */

jest.mock('@/lib/db', () => ({ __esModule: true, default: {} }));

import {
  aggregateFillsByProfile,
  sumFillValue,
  rankShares,
  categoryOfResource,
  computeCategoryShares,
  NPC_PROFILE_ID,
  FREE_TIER_TOP_N,
  type RawFill,
} from '../market-share';

describe('aggregateFillsByProfile', () => {
  it('folds a fill into both the buyer and seller rows', () => {
    const fills: RawFill[] = [
      { buyerProfileId: 'p1', sellerProfileId: 'p2', quantity: 10, totalValue: 1000 },
    ];
    const agg = aggregateFillsByProfile(fills);
    expect(agg.get('p1')).toEqual({ profileId: 'p1', buyVolume: 10, sellVolume: 0, totalVolume: 10, totalValue: 1000 });
    expect(agg.get('p2')).toEqual({ profileId: 'p2', buyVolume: 0, sellVolume: 10, totalVolume: 10, totalValue: 1000 });
  });

  it('accumulates across multiple fills for the same profile on both sides', () => {
    const fills: RawFill[] = [
      { buyerProfileId: 'p1', sellerProfileId: 'p2', quantity: 10, totalValue: 1000 },
      { buyerProfileId: 'p3', sellerProfileId: 'p1', quantity: 5, totalValue: 600 },
    ];
    const agg = aggregateFillsByProfile(fills);
    const p1 = agg.get('p1')!;
    expect(p1.buyVolume).toBe(10);
    expect(p1.sellVolume).toBe(5);
    expect(p1.totalVolume).toBe(15);
    expect(p1.totalValue).toBe(1600);
  });

  it('skips fills with non-finite quantity/value rather than corrupting totals', () => {
    const fills: RawFill[] = [
      { buyerProfileId: 'p1', sellerProfileId: 'p2', quantity: NaN, totalValue: 1000 },
      { buyerProfileId: 'p1', sellerProfileId: 'p2', quantity: 10, totalValue: 1000 },
    ];
    const agg = aggregateFillsByProfile(fills);
    expect(agg.get('p1')!.totalValue).toBe(1000);
  });

  it('empty input yields an empty map', () => {
    expect(aggregateFillsByProfile([]).size).toBe(0);
  });
});

describe('sumFillValue', () => {
  it('sums each fill once (not double-counted like the per-profile agg)', () => {
    const fills: RawFill[] = [
      { buyerProfileId: 'p1', sellerProfileId: 'p2', quantity: 10, totalValue: 1000 },
      { buyerProfileId: 'p3', sellerProfileId: 'p4', quantity: 5, totalValue: 500 },
    ];
    expect(sumFillValue(fills)).toBe(1500);
  });
});

describe('rankShares', () => {
  // Fixed 2026-09-03 (balance-report-2026-q3.ts §8): `sharePct` used to be
  // computed against the SINGLE-counted market total even though `agg`
  // credits every fill's value to both the buyer and the seller — so a
  // participant touching all the trade in a 2-fill market read as "100%"
  // twice over (Σ sharePct = 200%). It's now computed against the DOUBLED
  // total so it sums to ~100% across participants; the old single-counted
  // reading survives as `sideValuePct` for callers that specifically want
  // "share of traded value I was on one side of" (e.g. corp-pacts-server.ts's
  // non-aggression 40%-of-market clause).
  it('computes the headline sharePct against the DOUBLED market total, and sideValuePct against the single-counted total', () => {
    const fills: RawFill[] = [
      { buyerProfileId: 'p1', sellerProfileId: 'p2', quantity: 10, totalValue: 3000 },
      { buyerProfileId: 'p3', sellerProfileId: 'p1', quantity: 5, totalValue: 1000 },
    ];
    const agg = aggregateFillsByProfile(fills);
    const marketTotal = sumFillValue(fills); // 4000 (single-counted)
    const ranked = rankShares(agg, marketTotal, new Map([['p1', 'Acme Corp']]));

    // p1: buyer on fill1 (3000) + seller on fill2 (1000) = 4000 touched value.
    // Doubled total = 8000 → headline share = 50%. sideValuePct (vs the
    // single-counted 4000 total) is still 100 — p1 touched every dollar traded.
    const p1 = ranked.find((r) => r.profileId === 'p1')!;
    expect(p1.totalValue).toBe(4000);
    expect(p1.sharePct).toBe(50);
    expect(p1.sideValuePct).toBe(100);
    expect(p1.companyName).toBe('Acme Corp');
    expect(p1.isNpc).toBe(false);

    expect(ranked[0].profileId).toBe('p1'); // highest value first
  });

  it('sums headline sharePct to ~100% across all participants in a multi-fill, multi-participant fixture', () => {
    const fills: RawFill[] = [
      { buyerProfileId: 'p1', sellerProfileId: 'p2', quantity: 1, totalValue: 1000 },
      { buyerProfileId: 'p3', sellerProfileId: 'p1', quantity: 1, totalValue: 500 },
      { buyerProfileId: 'p2', sellerProfileId: 'p3', quantity: 1, totalValue: 300 },
    ];
    const agg = aggregateFillsByProfile(fills);
    const ranked = rankShares(agg, sumFillValue(fills), new Map());
    const sum = ranked.reduce((s, r) => s + r.sharePct, 0);
    expect(sum).toBeCloseTo(100, 1);
    // Sanity: no single participant's headline share can exceed 100%.
    for (const r of ranked) expect(r.sharePct).toBeLessThanOrEqual(100);
  });

  it('tags the NPC market maker distinctly and never excludes it from totals', () => {
    const fills: RawFill[] = [
      { buyerProfileId: NPC_PROFILE_ID, sellerProfileId: 'p1', quantity: 10, totalValue: 1000 },
    ];
    const agg = aggregateFillsByProfile(fills);
    const ranked = rankShares(agg, sumFillValue(fills), new Map());
    const npcRow = ranked.find((r) => r.profileId === NPC_PROFILE_ID)!;
    expect(npcRow.isNpc).toBe(true);
    expect(npcRow.companyName).toBe('NPC Market Maker');
    expect(npcRow.sharePct).toBe(50); // doubled-total denominator, not excluded
    expect(npcRow.sideValuePct).toBe(100);
  });

  it('flags a __NPC_CORP_* industrial corporation as NPC (not a rival player) and gives it its real name', () => {
    const npcCorpId = '__NPC_CORP_stellar';
    const fills: RawFill[] = [
      { buyerProfileId: npcCorpId, sellerProfileId: 'p1', quantity: 10, totalValue: 1000 },
    ];
    const agg = aggregateFillsByProfile(fills);
    // Even if a stale/incomplete company-name map somehow had an entry for
    // this id, the NPC classification and display name must win.
    const ranked = rankShares(agg, sumFillValue(fills), new Map([[npcCorpId, 'should not be used']]));
    const npcRow = ranked.find((r) => r.profileId === npcCorpId)!;
    expect(npcRow.isNpc).toBe(true);
    expect(npcRow.companyName).toBe('Stellar Industries');
  });

  it('returns 0% shares when market total is 0 (no divide-by-zero)', () => {
    const agg = aggregateFillsByProfile([]);
    expect(rankShares(agg, 0, new Map())).toEqual([]);
  });

  it('free-tier top-N constant is 5 per canon ("never free, never perfect")', () => {
    expect(FREE_TIER_TOP_N).toBe(5);
  });
});

describe('categoryOfResource', () => {
  it('resolves known resource slugs to their real category', () => {
    expect(categoryOfResource('iron')).toBe('metal');
    expect(categoryOfResource('gold')).toBe('precious');
  });

  it('falls back to "other" for unknown/legacy slugs rather than throwing', () => {
    expect(categoryOfResource('not_a_real_resource')).toBe('other');
  });
});

describe('computeCategoryShares', () => {
  it('computes a profile\'s share of each category it participates in, against the WHOLE market', () => {
    const fills: (RawFill & { resourceSlug: string })[] = [
      // iron: p1 buys 900, someone else trades 100 more iron (p3<->p4) — market total iron = 1000
      { resourceSlug: 'iron', buyerProfileId: 'p1', sellerProfileId: 'p2', quantity: 10, totalValue: 900 },
      { resourceSlug: 'iron', buyerProfileId: 'p3', sellerProfileId: 'p4', quantity: 1, totalValue: 100 },
      // gold: p1 not involved at all
      { resourceSlug: 'gold', buyerProfileId: 'p3', sellerProfileId: 'p4', quantity: 1, totalValue: 500 },
    ];
    const shares = computeCategoryShares(fills, 'p1');
    const metal = shares.find((s) => s.category === 'metal')!;
    expect(metal.profileValue).toBe(900);
    expect(metal.marketValue).toBe(1000);
    expect(metal.sharePct).toBe(90);
    // p1 never touched gold (precious) — should not appear at all
    expect(shares.find((s) => s.category === 'precious')).toBeUndefined();
  });

  it('returns an empty array for a profile with zero trade activity', () => {
    const fills: (RawFill & { resourceSlug: string })[] = [
      { resourceSlug: 'iron', buyerProfileId: 'p3', sellerProfileId: 'p4', quantity: 1, totalValue: 100 },
    ];
    expect(computeCategoryShares(fills, 'p1')).toEqual([]);
  });
});
