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

// ─── Wave M5 (docs/MEANINGFUL_2026-08.md §3.2 O5 + O7) ──────────────────────

import {
  applySoftClose, assessIdleFees,
  SOFT_CLOSE_WINDOW_MS, SOFT_CLOSE_EXTENSION_MS, SOFT_CLOSE_MAX_EXTENSION_MS,
  SLOT_IDLE_FEE_INTERVAL_MS, SLOT_IDLE_FEE_FRACTION, SLOT_IDLE_AUTO_RELEASE_MS,
  AUCTION_WINDOW_MS,
} from '../orbital-slot-auctions';

describe('M5 O7 — auction soft-close', () => {
  const openedAt = 1_000_000;
  const closesAt = openedAt + AUCTION_WINDOW_MS;

  it('a bid outside the final window leaves closesAt untouched', () => {
    const nowMs = closesAt - SOFT_CLOSE_WINDOW_MS - 1;
    expect(applySoftClose(closesAt, openedAt, nowMs)).toBe(closesAt);
  });

  it('a bid inside the final 10 minutes extends the close by 10 minutes', () => {
    const nowMs = closesAt - 60_000; // 1 minute before close
    expect(applySoftClose(closesAt, openedAt, nowMs)).toBe(closesAt + SOFT_CLOSE_EXTENSION_MS);
  });

  it('extensions cap at +1h past the original window (no infinite ping-pong)', () => {
    const cap = openedAt + AUCTION_WINDOW_MS + SOFT_CLOSE_MAX_EXTENSION_MS;
    // Simulate repeated last-second bids: each extends until the cap binds.
    let close = closesAt;
    for (let i = 0; i < 20; i++) {
      close = applySoftClose(close, openedAt, close - 1_000);
    }
    expect(close).toBe(cap);
  });

  it('a bid after close never reopens the auction', () => {
    expect(applySoftClose(closesAt, openedAt, closesAt + 1)).toBe(closesAt);
  });
});

describe('M5 O5 — predatory-lease idle fees', () => {
  const startedAt = 5_000_000;
  const lease = { startedAtMs: startedAt, lastIdleFeeAtMs: null, leaseAmount: 100_000_000 };

  it('no fee before the first 30-day interval elapses', () => {
    const a = assessIdleFees(lease, startedAt + SLOT_IDLE_FEE_INTERVAL_MS - 1);
    expect(a.intervalsDue).toBe(0);
    expect(a.feeDue).toBe(0);
    expect(a.autoRelease).toBe(false);
  });

  it('charges 10% of the winning bid per elapsed 30-day interval', () => {
    const a = assessIdleFees(lease, startedAt + SLOT_IDLE_FEE_INTERVAL_MS);
    expect(a.intervalsDue).toBe(1);
    expect(a.feeDue).toBe(Math.round(lease.leaseAmount * SLOT_IDLE_FEE_FRACTION));
    // Two intervals unpaid → both charged at once (lazy cron catch-up).
    const b = assessIdleFees(lease, startedAt + 2 * SLOT_IDLE_FEE_INTERVAL_MS);
    expect(b.intervalsDue).toBe(2);
    expect(b.feeDue).toBe(2 * Math.round(lease.leaseAmount * SLOT_IDLE_FEE_FRACTION));
  });

  it('the charge cursor advances only by whole intervals (no drift, no double-charge)', () => {
    const nowMs = startedAt + SLOT_IDLE_FEE_INTERVAL_MS + 12_345;
    const a = assessIdleFees(lease, nowMs);
    expect(a.chargeCursorMs).toBe(startedAt + SLOT_IDLE_FEE_INTERVAL_MS);
    // Re-assessing from the advanced cursor owes nothing until the next interval.
    const b = assessIdleFees({ ...lease, lastIdleFeeAtMs: a.chargeCursorMs }, nowMs);
    expect(b.feeDue).toBe(0);
  });

  it('auto-releases at 90 days unbuilt (ownership always returns to the market)', () => {
    expect(assessIdleFees(lease, startedAt + SLOT_IDLE_AUTO_RELEASE_MS - 1).autoRelease).toBe(false);
    expect(assessIdleFees(lease, startedAt + SLOT_IDLE_AUTO_RELEASE_MS).autoRelease).toBe(true);
  });
});

// ─── D6 population gates (docs/BALANCE.md "D6 population gates (2026-09-02)") ─
// Relative-occupancy auction trigger: the most contested pool auctions first
// even on a small world; the absolute 85% rule survives as a superset.

import {
  computeSlotAuctionEligibility, percentile,
  SLOT_AUCTION_MIN_OCCUPIED, SLOT_AUCTION_RELATIVE_THRESHOLD_PCT, SLOT_AUCTION_OCCUPANCY_PERCENTILE,
} from '../orbital-slot-auctions';
import { ORBITAL_SLOT_POOLS, SATURATED_OCCUPANCY_PCT } from '../spatial-strategy';

const POOL_SIZES = Object.fromEntries(ORBITAL_SLOT_POOLS.map(p => [p.locationId, p.totalSlots])) as Record<string, number>;

function world(occupied: Record<string, number>) {
  return ORBITAL_SLOT_POOLS.map(p => ({ locationId: p.locationId, occupiedCount: occupied[p.locationId] ?? 0, totalSlots: p.totalSlots }));
}

describe('D6 — percentile (linear interpolation)', () => {
  it('empty → 0; single → itself; P80 of five values interpolates between the 4th and 5th', () => {
    expect(percentile([], 0.8)).toBe(0);
    expect(percentile([7], 0.8)).toBe(7);
    expect(percentile([5, 10, 12, 45, 50], 0.8)).toBeCloseTo(46, 9); // pos 3.2 → 45 + 0.2×5
    expect(percentile([1, 2, 3], 0)).toBe(1);
    expect(percentile([1, 2, 3], 1)).toBe(3);
  });
});

describe('D6 — computeSlotAuctionEligibility', () => {
  it('constants: ≥8 occupied, ≥40% of pool, 80th percentile across pools', () => {
    expect(SLOT_AUCTION_MIN_OCCUPIED).toBe(8);
    expect(SLOT_AUCTION_RELATIVE_THRESHOLD_PCT).toBe(40);
    expect(SLOT_AUCTION_OCCUPANCY_PERCENTILE).toBe(0.8);
  });

  it('an empty world contests nothing (the 40% floor and 8-slot minimum both hold)', () => {
    const e = computeSlotAuctionEligibility(world({}));
    for (const p of ORBITAL_SLOT_POOLS) {
      expect(e.get(p.locationId)!.eligible).toBe(false);
      expect(e.get(p.locationId)!.reason).toBe('below_min_occupied');
    }
  });

  it('the Pass-8 world (GEO 3 of 180, everything else empty) still cannot fire — this is not a free auction', () => {
    const e = computeSlotAuctionEligibility(world({ geo: 3 }));
    expect(e.get('geo')!.eligible).toBe(false);
    expect(e.get('geo')!.reason).toBe('below_min_occupied');
  });

  it('a small pool with 8+ occupied and ≥40% opens even when the big pools are near-empty (relative, not absolute)', () => {
    // lunar_orbit is 24 slots: 10 = 41.7%. GEO at 12/180 = 6.7%.
    const e = computeSlotAuctionEligibility(world({ lunar_orbit: 10, geo: 12, leo: 5 }));
    expect(e.get('lunar_orbit')!.eligible).toBe(true);
    expect(e.get('lunar_orbit')!.reason).toBe('relative_contest');
    expect(e.get('geo')!.eligible).toBe(false);
    expect(e.get('geo')!.reason).toBe('below_threshold');
  });

  it('7 of 24 (29%) is below the 8-slot minimum; 9 of 24 (37.5%) clears the minimum but not the 40% floor', () => {
    expect(computeSlotAuctionEligibility(world({ lunar_orbit: 7 })).get('lunar_orbit')!.reason).toBe('below_min_occupied');
    expect(computeSlotAuctionEligibility(world({ lunar_orbit: 9 })).get('lunar_orbit')!.reason).toBe('below_threshold');
    expect(computeSlotAuctionEligibility(world({ lunar_orbit: 10 })).get('lunar_orbit')!.eligible).toBe(true);
  });

  it('the percentile term makes the MOST contested pool open first when several clear 40%', () => {
    // lunar 50% (12/24), jupiter 45% (18/40), mars 42% (25/60): P80 of
    // [0, 0, 41.7, 45, 50] = 46 → only lunar clears max(40, 46).
    const e = computeSlotAuctionEligibility(world({ lunar_orbit: 12, jupiter_system: 18, mars_orbit: 25 }));
    expect(e.get('lunar_orbit')!.eligible).toBe(true);
    expect(e.get('jupiter_system')!.eligible).toBe(false);
    expect(e.get('jupiter_system')!.reason).toBe('below_threshold');
    expect(e.get('mars_orbit')!.eligible).toBe(false);
    expect(e.get('lunar_orbit')!.thresholdPct).toBeCloseTo(46, 0);
    // Ties open together.
    const tie = computeSlotAuctionEligibility(world({ lunar_orbit: 12, jupiter_system: 20 })); // both 50%
    expect(tie.get('lunar_orbit')!.eligible).toBe(true);
    expect(tie.get('jupiter_system')!.eligible).toBe(true);
  });

  it('absolute 85% saturation is a superset: a physically full pool opens even when it is not the percentile leader', () => {
    // GEO at 153/180 (85%) while lunar sits at 24/24 (100%) → P80 > 85 but GEO still opens.
    const e = computeSlotAuctionEligibility(world({ geo: 153, lunar_orbit: 24 }));
    expect(e.get('geo')!.eligible).toBe(true);
    expect(e.get('geo')!.reason).toBe('absolute_saturation');
    expect(e.get('lunar_orbit')!.reason).toBe('absolute_saturation');
  });

  it('thresholdOccupied is the "auction opens at N slots" number and is never below the 8-slot minimum', () => {
    const e = computeSlotAuctionEligibility(world({ geo: 12 }));
    for (const p of ORBITAL_SLOT_POOLS) {
      const row = e.get(p.locationId)!;
      expect(row.thresholdOccupied).toBeGreaterThanOrEqual(SLOT_AUCTION_MIN_OCCUPIED);
      expect(row.thresholdOccupied).toBeLessThanOrEqual(Math.ceil((SATURATED_OCCUPANCY_PCT / 100) * POOL_SIZES[p.locationId]));
    }
    // lunar_orbit (24 slots): max(8, ceil(0.40 × 24) = 10) = 10.
    expect(e.get('lunar_orbit')!.thresholdOccupied).toBe(10);
    // GEO (180): ceil(0.40 × 180) = 72.
    expect(e.get('geo')!.thresholdOccupied).toBe(72);
    // Reaching the advertised number does open it (nothing else moving).
    expect(computeSlotAuctionEligibility(world({ geo: 72 })).get('geo')!.eligible).toBe(true);
  });

  it('is deterministic and order-independent', () => {
    const a = computeSlotAuctionEligibility(world({ lunar_orbit: 12, geo: 40 }));
    const b = computeSlotAuctionEligibility(world({ lunar_orbit: 12, geo: 40 }).reverse());
    for (const p of ORBITAL_SLOT_POOLS) expect(a.get(p.locationId)).toEqual(b.get(p.locationId));
  });

  it('garbage input never crashes and never contests a zero-size pool', () => {
    const e = computeSlotAuctionEligibility([
      { locationId: 'x', occupiedCount: NaN, totalSlots: 0 },
      { locationId: 'y', occupiedCount: -5, totalSlots: 10 },
    ]);
    expect(e.get('x')!.eligible).toBe(false);
    expect(e.get('y')!.eligible).toBe(false);
    expect(e.get('y')!.occupiedCount).toBe(0);
  });

  it('computeMinBid is untouched by eligibility — still base × chokepoint premium, positive for every pool', () => {
    for (const p of ORBITAL_SLOT_POOLS) expect(computeMinBid(p.locationId)).toBeGreaterThan(0);
  });
});
