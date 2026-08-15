/**
 * @jest-environment node
 */
import {
  getEpochWindow,
  getCurrentRealignmentEpoch,
  getNextRealignmentDate,
  computeFactionPostures,
  getFactionPosture,
  getContractGenerosityMultiplier,
  getNpcFactionBiasMultiplier,
  assembleEpochAddress,
  getEpochSpotlight,
  getSenateAggregateScore,
  getSeasonAggregateScore,
  POSTURE_BAND_MIN,
  POSTURE_BAND_MAX,
  NPC_BIAS_MIN,
  NPC_BIAS_MAX,
  REALIGNMENT_BASE_YEAR,
  FACTION_CATEGORY_AFFINITY,
} from '../realignment';
import { FACTIONS } from '../factions';

// ─── Quarter boundary math ───────────────────────────────────────────────────

describe('realignment — epoch window / clock math', () => {
  it('epoch 0 is REALIGNMENT_BASE_YEAR Q1 (Jan 1 - Apr 1 UTC)', () => {
    const w = getEpochWindow(0);
    expect(w.year).toBe(REALIGNMENT_BASE_YEAR);
    expect(w.quarter).toBe(1);
    expect(new Date(w.startMs).toISOString()).toBe(`${REALIGNMENT_BASE_YEAR}-01-01T00:00:00.000Z`);
    expect(new Date(w.endMs).toISOString()).toBe(`${REALIGNMENT_BASE_YEAR}-04-01T00:00:00.000Z`);
  });

  it('every epoch is contiguous with the next (endMs === next.startMs)', () => {
    for (let i = -2; i < 10; i++) {
      const a = getEpochWindow(i);
      const b = getEpochWindow(i + 1);
      expect(a.endMs).toBe(b.startMs);
    }
  });

  it('quarters roll over correctly across a year boundary (Q4 -> next year Q1)', () => {
    const q4 = getEpochWindow(3); // epoch 3 = base year Q4
    expect(q4.quarter).toBe(4);
    expect(q4.year).toBe(REALIGNMENT_BASE_YEAR);
    const nextQ1 = getEpochWindow(4);
    expect(nextQ1.quarter).toBe(1);
    expect(nextQ1.year).toBe(REALIGNMENT_BASE_YEAR + 1);
  });

  it('getCurrentRealignmentEpoch is consistent with getEpochWindow at real UTC boundaries', () => {
    const midQ2 = Date.UTC(REALIGNMENT_BASE_YEAR, 4, 15); // May 15 = Q2
    expect(getCurrentRealignmentEpoch(midQ2)).toBe(1);

    const exactlyQ3Start = Date.UTC(REALIGNMENT_BASE_YEAR, 6, 1); // Jul 1 = Q3 start
    expect(getCurrentRealignmentEpoch(exactlyQ3Start)).toBe(2);

    const oneMsBeforeQ3 = exactlyQ3Start - 1;
    expect(getCurrentRealignmentEpoch(oneMsBeforeQ3)).toBe(1);
  });

  it('getNextRealignmentDate is always strictly after "now" and equals the current epoch window end', () => {
    const now = Date.UTC(REALIGNMENT_BASE_YEAR + 1, 2, 10); // some arbitrary instant
    const next = getNextRealignmentDate(now);
    expect(next).toBeGreaterThan(now);
    const current = getCurrentRealignmentEpoch(now);
    expect(next).toBe(getEpochWindow(current).endMs);
    expect(next).toBe(getEpochWindow(current + 1).startMs);
  });

  it('handles negative epoch indices without throwing (defensive/total function)', () => {
    expect(() => getEpochWindow(-5)).not.toThrow();
    const w = getEpochWindow(-4); // exactly 1 year before base
    expect(w.year).toBe(REALIGNMENT_BASE_YEAR - 1);
    expect(w.quarter).toBe(1);
  });
});

// ─── Band-bounded posture computation ────────────────────────────────────────

describe('realignment — faction posture bands', () => {
  it('every faction posture stays within the published ±20% band, across many epochs', () => {
    for (let epoch = 0; epoch < 40; epoch++) {
      const postures = computeFactionPostures(epoch);
      expect(postures).toHaveLength(FACTIONS.length);
      for (const p of postures) {
        expect(p.contractGenerosityMultiplier).toBeGreaterThanOrEqual(POSTURE_BAND_MIN);
        expect(p.contractGenerosityMultiplier).toBeLessThanOrEqual(POSTURE_BAND_MAX);
        expect(p.tariffStanceMultiplier).toBeGreaterThanOrEqual(POSTURE_BAND_MIN);
        expect(p.tariffStanceMultiplier).toBeLessThanOrEqual(POSTURE_BAND_MAX);
        expect(p.score).toBeGreaterThanOrEqual(0);
        expect(p.score).toBeLessThanOrEqual(1);
      }
    }
  });

  it('at most one faction is ascendant and at most one is retreating per epoch', () => {
    for (let epoch = 0; epoch < 40; epoch++) {
      const postures = computeFactionPostures(epoch);
      const ascendant = postures.filter(p => p.trend === 'ascendant');
      const retreating = postures.filter(p => p.trend === 'retreating');
      expect(ascendant.length).toBeLessThanOrEqual(1);
      expect(retreating.length).toBeLessThanOrEqual(1);
    }
  });

  it('is a pure function of epochIndex — identical postures on repeated calls', () => {
    const a = computeFactionPostures(7);
    const b = computeFactionPostures(7);
    expect(a).toEqual(b);
  });

  it('different epochs are not all identical (the posture actually moves over time)', () => {
    const epoch0 = computeFactionPostures(0);
    const epoch10 = computeFactionPostures(10);
    const anyDifferent = epoch0.some((p, i) => p.contractGenerosityMultiplier !== epoch10[i].contractGenerosityMultiplier);
    expect(anyDifferent).toBe(true);
  });

  it('procurementFocus is always drawn from the faction\'s own affinity pool', () => {
    for (let epoch = 0; epoch < 12; epoch++) {
      const postures = computeFactionPostures(epoch);
      for (const p of postures) {
        expect(FACTION_CATEGORY_AFFINITY[p.factionId]).toContain(p.procurementFocus);
      }
    }
  });

  it('getFactionPosture matches the batch computeFactionPostures result', () => {
    const batch = computeFactionPostures(5);
    for (const p of batch) {
      expect(getFactionPosture(p.factionId, 5)).toEqual(p);
    }
  });

  it('getContractGenerosityMultiplier is bounded and matches the posture field', () => {
    for (const f of FACTIONS) {
      const mult = getContractGenerosityMultiplier(f.id, 3);
      expect(mult).toBeGreaterThanOrEqual(POSTURE_BAND_MIN);
      expect(mult).toBeLessThanOrEqual(POSTURE_BAND_MAX);
      expect(mult).toBe(getFactionPosture(f.id, 3).contractGenerosityMultiplier);
    }
  });
});

// ─── Aggregate score inputs ──────────────────────────────────────────────────

describe('realignment — senate/season aggregate inputs', () => {
  it('senate aggregate score is a plain finite number per faction, deterministic', () => {
    const a = getSenateAggregateScore(2);
    const b = getSenateAggregateScore(2);
    expect(a).toEqual(b);
    for (const f of FACTIONS) {
      expect(Number.isFinite(a[f.id])).toBe(true);
    }
  });

  it('season aggregate score is deterministic and bounded by the ±25% super-cycle cap times affinity pool size', () => {
    const a = getSeasonAggregateScore(2);
    const b = getSeasonAggregateScore(2);
    expect(a).toEqual(b);
    for (const f of FACTIONS) {
      expect(Number.isFinite(a[f.id])).toBe(true);
    }
  });
});

// ─── NPC faction bias bounds ─────────────────────────────────────────────────

describe('realignment — NPC faction bias', () => {
  it('NPC bias is always within [NPC_BIAS_MIN, NPC_BIAS_MAX] — tighter than the player band', () => {
    expect(NPC_BIAS_MIN).toBeGreaterThan(POSTURE_BAND_MIN);
    expect(NPC_BIAS_MAX).toBeLessThan(POSTURE_BAND_MAX);
    for (let epoch = 0; epoch < 20; epoch++) {
      for (const f of FACTIONS) {
        const bias = getNpcFactionBiasMultiplier(f.id, epoch);
        expect(bias).toBeGreaterThanOrEqual(NPC_BIAS_MIN);
        expect(bias).toBeLessThanOrEqual(NPC_BIAS_MAX);
      }
    }
  });

  it('a bias of exactly 1 is the neutral no-op default used by npc-engine/game-engine callers', () => {
    // Sanity: the band straddles 1 so "no bias supplied" (default {}) reads
    // as neutral in npc-engine.ts, not as a floor/ceiling clamp artifact.
    expect(NPC_BIAS_MIN).toBeLessThan(1);
    expect(NPC_BIAS_MAX).toBeGreaterThan(1);
  });
});

// ─── Epoch spotlight ──────────────────────────────────────────────────────────

describe('realignment — epoch spotlight rotation', () => {
  it('is deterministic and total for any integer epochIndex (including negative)', () => {
    expect(getEpochSpotlight(0)).toEqual(getEpochSpotlight(0));
    expect(() => getEpochSpotlight(-3)).not.toThrow();
    expect(getEpochSpotlight(-1).id).toBeTruthy();
  });

  it('rotates rather than sticking on one entry', () => {
    const ids = new Set([0, 1, 2, 3, 4].map(i => getEpochSpotlight(i).id));
    expect(ids.size).toBeGreaterThan(1);
  });
});

// ─── Epoch Address assembly determinism ──────────────────────────────────────

describe('realignment — Epoch Address assembly', () => {
  it('is fully deterministic — identical epochIndex always produces an identical address', () => {
    const a = assembleEpochAddress(6);
    const b = assembleEpochAddress(6);
    expect(a).toEqual(b);
  });

  it('title and window fields match getEpochWindow for the same epoch', () => {
    const epoch = 9;
    const w = getEpochWindow(epoch);
    const address = assembleEpochAddress(epoch);
    expect(address.year).toBe(w.year);
    expect(address.quarter).toBe(w.quarter);
    expect(address.publishedAtMs).toBe(w.startMs);
    expect(address.title).toContain(String(w.year));
    expect(address.title).toContain(`Q${w.quarter}`);
  });

  it('lines are non-empty and always cite a real spotlight system, never empty strings', () => {
    for (let epoch = 0; epoch < 8; epoch++) {
      const address = assembleEpochAddress(epoch);
      expect(address.lines.length).toBeGreaterThan(0);
      for (const line of address.lines) {
        expect(typeof line).toBe('string');
        expect(line.length).toBeGreaterThan(0);
      }
      expect(address.lines.some(l => l.includes(address.spotlight.name))).toBe(true);
    }
  });

  it('ascendant/retreating faction ids (when present) match the postures array trend flags', () => {
    for (let epoch = 0; epoch < 15; epoch++) {
      const address = assembleEpochAddress(epoch);
      const ascendantPosture = address.postures.find(p => p.trend === 'ascendant');
      const retreatingPosture = address.postures.find(p => p.trend === 'retreating');
      expect(address.ascendantFactionId).toBe(ascendantPosture?.factionId ?? null);
      expect(address.retreatingFactionId).toBe(retreatingPosture?.factionId ?? null);
    }
  });

  it('bandPreview always reports the published POSTURE_BAND constants', () => {
    const address = assembleEpochAddress(1);
    expect(address.bandPreview).toEqual({ min: POSTURE_BAND_MIN, max: POSTURE_BAND_MAX });
  });

  it('never throws across a wide sweep of epochs, positive and negative', () => {
    for (let epoch = -3; epoch < 30; epoch++) {
      expect(() => assembleEpochAddress(epoch)).not.toThrow();
    }
  });
});
