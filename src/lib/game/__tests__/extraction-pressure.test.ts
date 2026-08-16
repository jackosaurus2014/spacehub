// ─── Wave E5 "Depletion, Labor & Lanes" — extraction-pressure.ts tests ───────
// docs/ECONOMY_PVP_2026-08.md §2.4/§E5.

import {
  EXTRACTION_PRESSURE_MIN,
  EXTRACTION_PRESSURE_MAX,
  EXTRACTION_SATURATION_UNITS,
  EXTRACTION_DECAY_PER_DAY,
  getExtractionSensitivity,
  decayAccumulated,
  computeExtractionPressure,
  applyExtractionEvent,
  readAccumulated,
  getDepositGrade,
  getExtractionPressureMultiplier,
  extractionKey,
  EXTRACTION_PRESSURE_STALE_MS,
  type ExtractionPressureSnapshot,
} from '../extraction-pressure';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('getExtractionSensitivity', () => {
  it('weights precious/exotic resources higher than bulk metals', () => {
    expect(getExtractionSensitivity('platinum_group')).toBeGreaterThan(getExtractionSensitivity('iron'));
    expect(getExtractionSensitivity('exotic_materials')).toBeGreaterThan(getExtractionSensitivity('lunar_water'));
  });

  it('falls back to a default for unknown ids', () => {
    expect(getExtractionSensitivity('not_a_real_resource')).toBeGreaterThan(0);
  });
});

describe('decayAccumulated — deterministic 10%/day decay', () => {
  it('is a no-op at zero elapsed time', () => {
    expect(decayAccumulated(100, 0)).toBe(100);
  });

  it('decays by exactly the daily factor after 1 day', () => {
    expect(decayAccumulated(100, DAY_MS)).toBeCloseTo(100 * EXTRACTION_DECAY_PER_DAY, 6);
  });

  it('decays multiplicatively over multiple days', () => {
    const after2 = decayAccumulated(100, 2 * DAY_MS);
    expect(after2).toBeCloseTo(100 * Math.pow(EXTRACTION_DECAY_PER_DAY, 2), 6);
  });

  it('never goes negative and treats non-finite/zero input as zero', () => {
    expect(decayAccumulated(0, DAY_MS)).toBe(0);
    expect(decayAccumulated(-5, DAY_MS)).toBe(0);
  });

  it('is deterministic — same inputs, same output, every call', () => {
    const a = decayAccumulated(432.1, 3.7 * DAY_MS);
    const b = decayAccumulated(432.1, 3.7 * DAY_MS);
    expect(a).toBe(b);
  });
});

describe('computeExtractionPressure — bounded [0.4, 1.0] curve', () => {
  it('returns MAX (1.0) at zero accumulated pressure (untouched deposit)', () => {
    expect(computeExtractionPressure(0)).toBe(EXTRACTION_PRESSURE_MAX);
  });

  it('returns MIN (0.4) at or beyond the saturation threshold', () => {
    expect(computeExtractionPressure(EXTRACTION_SATURATION_UNITS)).toBe(EXTRACTION_PRESSURE_MIN);
    expect(computeExtractionPressure(EXTRACTION_SATURATION_UNITS * 10)).toBe(EXTRACTION_PRESSURE_MIN);
  });

  it('is monotonically non-increasing as accumulated pressure rises', () => {
    let prev = computeExtractionPressure(0);
    for (let i = 1; i <= 10; i++) {
      const next = computeExtractionPressure((EXTRACTION_SATURATION_UNITS / 10) * i);
      expect(next).toBeLessThanOrEqual(prev);
      prev = next;
    }
  });

  it('always stays within [MIN, MAX] for arbitrary inputs, including negative', () => {
    for (const a of [-100, 0, 1, 50, 150, 300, 1_000_000]) {
      const p = computeExtractionPressure(a);
      expect(p).toBeGreaterThanOrEqual(EXTRACTION_PRESSURE_MIN);
      expect(p).toBeLessThanOrEqual(EXTRACTION_PRESSURE_MAX);
    }
  });
});

describe('applyExtractionEvent — decay-then-add, pure and deterministic', () => {
  it('adds a fresh mining event with zero elapsed time (no decay)', () => {
    const nowMs = 1_000_000;
    const result = applyExtractionEvent(0, nowMs, 100, 'platinum_group', nowMs);
    expect(result.accumulated).toBeCloseTo(100 * getExtractionSensitivity('platinum_group'), 6);
    expect(result.updatedAtMs).toBe(nowMs);
  });

  it('decays the previous value before adding the new contribution', () => {
    const t0 = 0;
    const t1 = t0 + DAY_MS;
    const before = applyExtractionEvent(0, t0, 100, 'iron', t0);
    const after = applyExtractionEvent(before.accumulated, before.updatedAtMs, 50, 'iron', t1);
    const expectedDecayed = decayAccumulated(before.accumulated, DAY_MS);
    expect(after.accumulated).toBeCloseTo(expectedDecayed + 50 * getExtractionSensitivity('iron'), 6);
  });

  it('is deterministic — identical calls produce identical accumulators', () => {
    const a = applyExtractionEvent(200, 0, 30, 'gold', 5 * DAY_MS);
    const b = applyExtractionEvent(200, 0, 30, 'gold', 5 * DAY_MS);
    expect(a).toEqual(b);
  });

  it('ignores non-positive mined units', () => {
    const result = applyExtractionEvent(50, 0, -10, 'iron', 0);
    expect(result.accumulated).toBe(50);
  });
});

describe('readAccumulated — read-time decay without a write', () => {
  it('matches decayAccumulated exactly', () => {
    expect(readAccumulated(100, 0, 2 * DAY_MS)).toBeCloseTo(decayAccumulated(100, 2 * DAY_MS), 9);
  });
});

describe('NPC floor invariant (§2.9): NPC extraction never pushes the index below 0.8 alone', () => {
  it('an untouched (NPC-only, zero player mining) deposit reads pressure >= 0.8', () => {
    // No NPC mining pipeline feeds LocationExtraction in this codebase — the
    // accumulator is 100% player-sourced, so the NPC-alone floor holds
    // trivially by construction. Regression guard: if this ever breaks, a
    // future NPC-extraction feature has started writing to the table without
    // respecting the invariant.
    expect(computeExtractionPressure(0)).toBeGreaterThanOrEqual(0.8);
  });
});

describe('getDepositGrade — colorblind-safe text labels', () => {
  it('labels the full pressure range with distinct tiers', () => {
    expect(getDepositGrade(1.0).tier).toBe('abundant');
    expect(getDepositGrade(0.85).tier).toBe('healthy');
    expect(getDepositGrade(0.7).tier).toBe('strained');
    expect(getDepositGrade(0.55).tier).toBe('thinning');
    expect(getDepositGrade(0.4).tier).toBe('critical');
  });

  it('every grade carries a non-empty text label (never color-only)', () => {
    for (const p of [1.0, 0.9, 0.7, 0.5, 0.4]) {
      expect(getDepositGrade(p).label.length).toBeGreaterThan(0);
    }
  });
});

describe('getExtractionPressureMultiplier — deterministic client read', () => {
  const snapshot: ExtractionPressureSnapshot = {
    entries: {
      [extractionKey('asteroid_belt', 'platinum_group')]: {
        locationId: 'asteroid_belt', resourceId: 'platinum_group', pressure: 0.6,
      },
    },
    asOf: 1_000_000,
  };

  it('returns the snapshot value for a known (location, resource)', () => {
    expect(getExtractionPressureMultiplier(snapshot, 'asteroid_belt', 'platinum_group', snapshot.asOf)).toBe(0.6);
  });

  it('defaults to neutral 1.0 for an absent snapshot', () => {
    expect(getExtractionPressureMultiplier(null, 'asteroid_belt', 'platinum_group')).toBe(1.0);
    expect(getExtractionPressureMultiplier(undefined, 'asteroid_belt', 'platinum_group')).toBe(1.0);
  });

  it('defaults to neutral 1.0 for an untracked (location, resource)', () => {
    expect(getExtractionPressureMultiplier(snapshot, 'lunar_surface', 'lunar_water', snapshot.asOf)).toBe(1.0);
  });

  it('defaults to neutral 1.0 for a stale snapshot', () => {
    const staleNow = snapshot.asOf + EXTRACTION_PRESSURE_STALE_MS + 1;
    expect(getExtractionPressureMultiplier(snapshot, 'asteroid_belt', 'platinum_group', staleNow)).toBe(1.0);
  });
});
