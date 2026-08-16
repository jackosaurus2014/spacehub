// ─── Wave E5 "Depletion, Labor & Lanes" — trade-lanes.ts tests ──────────────
// docs/ECONOMY_PVP_2026-08.md §2.8/§E5.

import {
  LANE_BONUS_CAP,
  LANE_USAGE_FOR_MAX_BONUS,
  LANE_USAGE_DECAY_PER_DAY,
  laneKey,
  decayLaneUsage,
  applyLaneUsageEvent,
  readLaneUsage,
  computeLaneBonus,
  getLaneBonus,
  LANE_BONUS_STALE_MS,
  accumulateLaneUsage,
  subtractTransmittedLaneUsage,
  queueLaneUsageFlush,
  consumeLaneUsageFlush,
  __clearLaneUsageQueue,
  type LaneBonusSnapshot,
} from '../trade-lanes';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('laneKey — undirected canonical key', () => {
  it('is order-independent', () => {
    expect(laneKey('earth_surface', 'leo')).toBe(laneKey('leo', 'earth_surface'));
  });

  it('is deterministic', () => {
    expect(laneKey('a', 'b')).toBe(laneKey('a', 'b'));
  });
});

describe('decayLaneUsage — improvement fades when a lane goes quiet', () => {
  it('is a no-op at zero elapsed time', () => {
    expect(decayLaneUsage(20, 0)).toBe(20);
  });

  it('decays by the daily factor after 1 day', () => {
    expect(decayLaneUsage(20, DAY_MS)).toBeCloseTo(20 * LANE_USAGE_DECAY_PER_DAY, 6);
  });

  it('decays SLOWER than extraction pressure (durable infrastructure, not a consumable deposit)', () => {
    expect(LANE_USAGE_DECAY_PER_DAY).toBeGreaterThan(0.9);
  });

  it('never goes negative', () => {
    expect(decayLaneUsage(0, DAY_MS)).toBe(0);
    expect(decayLaneUsage(-5, DAY_MS)).toBe(0);
  });
});

describe('computeLaneBonus — bounded [0, LANE_BONUS_CAP] curve', () => {
  it('is zero at zero usage', () => {
    expect(computeLaneBonus(0)).toBe(0);
  });

  it('reaches the cap at LANE_USAGE_FOR_MAX_BONUS', () => {
    expect(computeLaneBonus(LANE_USAGE_FOR_MAX_BONUS)).toBeCloseTo(LANE_BONUS_CAP, 9);
    expect(computeLaneBonus(LANE_USAGE_FOR_MAX_BONUS * 10)).toBeCloseTo(LANE_BONUS_CAP, 9);
  });

  it('is monotonically non-decreasing in usage', () => {
    let prev = 0;
    for (const u of [1, 5, 10, 20, 40, 80]) {
      const next = computeLaneBonus(u);
      expect(next).toBeGreaterThanOrEqual(prev);
      prev = next;
    }
  });

  it('never exceeds LANE_BONUS_CAP (15%) for any input', () => {
    for (const u of [0, 10, 40, 1000, 1_000_000]) {
      expect(computeLaneBonus(u)).toBeLessThanOrEqual(LANE_BONUS_CAP);
    }
  });
});

describe('applyLaneUsageEvent — decay-then-add, pure and deterministic', () => {
  it('accumulates fresh dispatches with zero decay at t=0 elapsed', () => {
    const result = applyLaneUsageEvent(0, 1000, 3, 1000);
    expect(result.usage).toBe(3);
    expect(result.updatedAtMs).toBe(1000);
  });

  it('decays the previous value before adding new dispatches', () => {
    const before = applyLaneUsageEvent(0, 0, 10, 0);
    const after = applyLaneUsageEvent(before.usage, before.updatedAtMs, 5, DAY_MS);
    expect(after.usage).toBeCloseTo(decayLaneUsage(before.usage, DAY_MS) + 5, 6);
  });

  it('is deterministic', () => {
    const a = applyLaneUsageEvent(12, 0, 4, 5 * DAY_MS);
    const b = applyLaneUsageEvent(12, 0, 4, 5 * DAY_MS);
    expect(a).toEqual(b);
  });
});

describe('improvement curve: repeated use raises the bonus; abandonment decays it (CLAUDE.md "shipping lanes are investments")', () => {
  it('one dispatch per day for a month meaningfully improves the lane', () => {
    let usage = 0;
    let updatedAt = 0;
    for (let day = 1; day <= 30; day++) {
      const nowMs = day * DAY_MS;
      const result = applyLaneUsageEvent(usage, updatedAt, 1, nowMs);
      usage = result.usage;
      updatedAt = result.updatedAtMs;
    }
    expect(computeLaneBonus(usage)).toBeGreaterThan(0);
  });

  it('an abandoned lane\'s bonus fades toward zero over time', () => {
    const heavy = applyLaneUsageEvent(0, 0, 100, 0);
    const bonusNow = computeLaneBonus(heavy.usage);
    const decayedLater = readLaneUsage(heavy.usage, heavy.updatedAtMs, 60 * DAY_MS);
    const bonusLater = computeLaneBonus(decayedLater);
    expect(bonusLater).toBeLessThan(bonusNow);
  });
});

describe('getLaneBonus — deterministic client read', () => {
  const snapshot: LaneBonusSnapshot = { bonuses: { [laneKey('leo', 'geo')]: 0.1 }, asOf: 1_000_000 };

  it('returns the snapshot value regardless of argument order', () => {
    expect(getLaneBonus(snapshot, 'leo', 'geo', snapshot.asOf)).toBe(0.1);
    expect(getLaneBonus(snapshot, 'geo', 'leo', snapshot.asOf)).toBe(0.1);
  });

  it('defaults to 0 for an absent snapshot', () => {
    expect(getLaneBonus(null, 'leo', 'geo')).toBe(0);
    expect(getLaneBonus(undefined, 'leo', 'geo')).toBe(0);
  });

  it('defaults to 0 for an untracked lane', () => {
    expect(getLaneBonus(snapshot, 'mars_orbit', 'mars_surface', snapshot.asOf)).toBe(0);
  });

  it('defaults to 0 for a stale snapshot', () => {
    expect(getLaneBonus(snapshot, 'leo', 'geo', snapshot.asOf + LANE_BONUS_STALE_MS + 1)).toBe(0);
  });
});

describe('client accumulation + hand-off (mirrors market-pressure.ts)', () => {
  beforeEach(() => __clearLaneUsageQueue());

  it('accumulateLaneUsage records one dispatch per call, keyed undirected', () => {
    let pending = accumulateLaneUsage(undefined, 'leo', 'geo');
    pending = accumulateLaneUsage(pending, 'geo', 'leo'); // reverse direction, same lane
    expect(pending[laneKey('leo', 'geo')]).toBe(2);
  });

  it('subtractTransmittedLaneUsage removes exactly what was sent', () => {
    const pending = { [laneKey('leo', 'geo')]: 5 };
    const sent = { [laneKey('leo', 'geo')]: 3 };
    const remaining = subtractTransmittedLaneUsage(pending, sent);
    expect(remaining[laneKey('leo', 'geo')]).toBe(2);
  });

  it('subtractTransmittedLaneUsage clamps at zero and drops empty entries', () => {
    const pending = { [laneKey('leo', 'geo')]: 2 };
    const sent = { [laneKey('leo', 'geo')]: 5 };
    const remaining = subtractTransmittedLaneUsage(pending, sent);
    expect(remaining[laneKey('leo', 'geo')]).toBeUndefined();
  });

  it('queue/consume round-trips exactly what was queued (single-slot, merged)', () => {
    expect(consumeLaneUsageFlush()).toBeNull();
    queueLaneUsageFlush({ [laneKey('leo', 'geo')]: 2 });
    queueLaneUsageFlush({ [laneKey('leo', 'geo')]: 3, [laneKey('earth_surface', 'leo')]: 1 });
    const flushed = consumeLaneUsageFlush();
    expect(flushed).toEqual({ [laneKey('leo', 'geo')]: 5, [laneKey('earth_surface', 'leo')]: 1 });
    // Consuming clears the queue.
    expect(consumeLaneUsageFlush()).toBeNull();
  });
});
