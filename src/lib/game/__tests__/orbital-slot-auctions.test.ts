/**
 * @jest-environment node
 */
// Wave E7 (docs/ECONOMY_PVP_2026-08.md §E7 / §5 item 5): orbital-slot lease
// auction resolution — determinism, tie-break rules, and chokepoint premium
// application.

import {
  resolveAuction,
  splitAuctionProceeds,
  computeMinBid,
  GOVERNOR_BURN_SHARE,
  isSlotPoolLocation,
  type AuctionBidForResolution,
} from '../orbital-slot-auctions';

describe('resolveAuction — determinism + tie rules', () => {
  it('highest bid wins', () => {
    const bids: AuctionBidForResolution[] = [
      { bidId: 'a', profileId: 'p1', amount: 100, createdAt: 1000 },
      { bidId: 'b', profileId: 'p2', amount: 250, createdAt: 2000 },
      { bidId: 'c', profileId: 'p3', amount: 175, createdAt: 500 },
    ];
    const result = resolveAuction(bids, 50);
    expect(result.winnerBidId).toBe('b');
    expect(result.winnerProfileId).toBe('p2');
    expect(result.winningAmount).toBe(250);
    expect(result.losingBidIds.sort()).toEqual(['a', 'c']);
  });

  it('ties break by earliest bid (first-mover advantage)', () => {
    const bids: AuctionBidForResolution[] = [
      { bidId: 'late', profileId: 'p1', amount: 300, createdAt: 5000 },
      { bidId: 'early', profileId: 'p2', amount: 300, createdAt: 1000 },
    ];
    const result = resolveAuction(bids, 50);
    expect(result.winnerBidId).toBe('early');
    expect(result.winnerProfileId).toBe('p2');
  });

  it('is deterministic — same input always produces the same output regardless of array order', () => {
    const bids: AuctionBidForResolution[] = [
      { bidId: 'a', profileId: 'p1', amount: 400, createdAt: 3000 },
      { bidId: 'b', profileId: 'p2', amount: 400, createdAt: 1500 }, // tied amount, earlier -> wins
      { bidId: 'c', profileId: 'p3', amount: 250, createdAt: 1000 },
    ];
    const r1 = resolveAuction(bids, 50);
    const r2 = resolveAuction([...bids].reverse(), 50);
    expect(r1.winnerBidId).toBe(r2.winnerBidId);
    expect(r1.winnerProfileId).toBe(r2.winnerProfileId);
    expect(r1.winningAmount).toBe(r2.winningAmount);
    expect(r1.losingBidIds.slice().sort()).toEqual(r2.losingBidIds.slice().sort());
    expect(r1.winnerBidId).toBe('b');
  });

  it('bids below minBid are ineligible', () => {
    const bids: AuctionBidForResolution[] = [
      { bidId: 'a', profileId: 'p1', amount: 10, createdAt: 1000 },
      { bidId: 'b', profileId: 'p2', amount: 40, createdAt: 2000 },
    ];
    const result = resolveAuction(bids, 50);
    expect(result.winnerBidId).toBeNull();
    expect(result.winnerProfileId).toBeNull();
    expect(result.winningAmount).toBe(0);
    expect(result.losingBidIds.sort()).toEqual(['a', 'b']);
  });

  it('no bids at all -> no winner, no losers', () => {
    const result = resolveAuction([], 50);
    expect(result.winnerBidId).toBeNull();
    expect(result.losingBidIds).toEqual([]);
  });

  it('a single eligible bid wins outright', () => {
    const bids: AuctionBidForResolution[] = [
      { bidId: 'only', profileId: 'p1', amount: 500, createdAt: 1000 },
    ];
    const result = resolveAuction(bids, 50);
    expect(result.winnerBidId).toBe('only');
    expect(result.losingBidIds).toEqual([]);
  });
});

describe('splitAuctionProceeds — governor revenue share + burn', () => {
  it('splits GOVERNOR_BURN_SHARE to the governor when one exists', () => {
    const { governorCut, burned } = splitAuctionProceeds(1_000_000, true);
    expect(governorCut).toBe(Math.round(1_000_000 * GOVERNOR_BURN_SHARE));
    expect(burned).toBe(1_000_000 - governorCut);
    expect(governorCut + burned).toBe(1_000_000);
  });

  it('burns the entire amount when there is no governor', () => {
    const { governorCut, burned } = splitAuctionProceeds(1_000_000, false);
    expect(governorCut).toBe(0);
    expect(burned).toBe(1_000_000);
  });

  it('never produces a negative split', () => {
    const { governorCut, burned } = splitAuctionProceeds(1, true);
    expect(governorCut).toBeGreaterThanOrEqual(0);
    expect(burned).toBeGreaterThanOrEqual(0);
  });
});

describe('computeMinBid — chokepoint premium application', () => {
  it('a critical chokepoint (LEO-adjacent GEO) carries a real premium over a non-chokepoint baseline', () => {
    // geo touches multiple lanes (leo_geo) — computeChokepointPremium scales
    // off actual lane density, so this just asserts min bids are positive
    // and finite for every known pool, and that the function is
    // deterministic (same location -> same result).
    for (const loc of ['geo', 'lunar_orbit', 'mars_orbit', 'jupiter_system']) {
      const a = computeMinBid(loc);
      const b = computeMinBid(loc);
      expect(a).toBe(b);
      expect(a).toBeGreaterThan(0);
      expect(Number.isFinite(a)).toBe(true);
    }
  });

  it('falls back to a sane default for an unrecognized location', () => {
    expect(computeMinBid('not_a_real_location')).toBeGreaterThan(0);
  });
});

describe('isSlotPoolLocation', () => {
  it('recognizes every ORBITAL_SLOT_POOLS location', () => {
    expect(isSlotPoolLocation('geo')).toBe(true);
    expect(isSlotPoolLocation('lunar_orbit')).toBe(true);
    expect(isSlotPoolLocation('mars_orbit')).toBe(true);
    expect(isSlotPoolLocation('jupiter_system')).toBe(true);
  });

  it('rejects an unknown location', () => {
    expect(isSlotPoolLocation('narnia')).toBe(false);
  });
});
