/**
 * @jest-environment node
 *
 * Wave A2 (map as command theater, item 3) — orbital-slot occupancy rings.
 * The arc math and the model are PURE and shared by both renderers, so these
 * tests are the parity guarantee for the WebGL map and the 2D a11y canvas.
 */
import {
  allocateSlotFractions,
  slotRingSegments,
  computeSlotRing,
  computeSlotRings,
  getAtmosphere,
  ATMOSPHERES,
  SLOT_SEGMENT_STYLE,
  MIN_SLOT_SEGMENT_FRAC,
} from '../map-bodies';
import { ORBITAL_SLOT_POOLS, ORBITAL_SLOT_MAP } from '../spatial-strategy';
import type { GameState } from '../types';

const fixedNow = Date.UTC(2026, 7, 21, 12, 0, 0);

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    createdAt: fixedNow - 86_400_000,
    lastTickAt: fixedNow - 1_000,
    money: 100_000_000,
    totalEarned: 0,
    totalSpent: 0,
    gameDate: { year: 2026, month: 8 },
    tickSpeed: 1,
    buildings: [],
    completedResearch: [],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: ['earth_surface', 'leo', 'geo'],
    resources: {},
    eventLog: [],
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    npcCompanies: [],
    ships: [],
    workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0 },
    frontierStatus: 'graduated',
    ...overrides,
  } as GameState;
}

function building(instanceId: string, locationId: string, extra: Record<string, unknown> = {}) {
  return {
    instanceId,
    definitionId: 'sat_telecom_geo',
    locationId,
    buildStartDate: { year: 2026, month: 1 },
    completionDate: { year: 2026, month: 2 },
    isComplete: true,
    startedAtMs: fixedNow - 100_000,
    realDurationSeconds: 60,
    ...extra,
  };
}

describe('allocateSlotFractions', () => {
  it('splits proportionally and sums to a full circle', () => {
    const f = allocateSlotFractions([25, 25, 50], 100);
    expect(f[0]).toBeCloseTo(0.25, 6);
    expect(f[1]).toBeCloseTo(0.25, 6);
    expect(f[2]).toBeCloseTo(0.5, 6);
    expect(f.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it('gives a tiny non-zero segment a visible minimum arc', () => {
    // 1 slot out of 180 is 0.55% — below the visibility floor.
    const f = allocateSlotFractions([1, 0, 179], 180);
    expect(f[0]).toBeCloseTo(MIN_SLOT_SEGMENT_FRAC, 6);
    expect(f[1]).toBe(0);
    expect(f.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it('takes the boost deficit from segments with slack, never from the tiny ones', () => {
    const f = allocateSlotFractions([1, 1, 178], 180);
    expect(f[0]).toBeCloseTo(MIN_SLOT_SEGMENT_FRAC, 6);
    expect(f[1]).toBeCloseTo(MIN_SLOT_SEGMENT_FRAC, 6);
    expect(f[2]).toBeLessThan(178 / 180);
    expect(f.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it('never emits an arc for a zero count', () => {
    const f = allocateSlotFractions([0, 0, 10], 10);
    expect(f[0]).toBe(0);
    expect(f[1]).toBe(0);
    expect(f[2]).toBeCloseTo(1, 6);
  });

  it('handles a full pool and an empty pool without NaN', () => {
    expect(allocateSlotFractions([180, 0, 0], 180)[0]).toBeCloseTo(1, 6);
    expect(allocateSlotFractions([0, 0, 0], 0).every(v => v === 0)).toBe(true);
    expect(allocateSlotFractions([0, 0, 0], 180).every(v => Number.isFinite(v))).toBe(true);
  });

  it('normalises when the server count over-runs the pool size', () => {
    const f = allocateSlotFractions([100, 100, 0], 180);
    expect(f.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
});

describe('slotRingSegments', () => {
  it('produces contiguous, non-overlapping clockwise arcs', () => {
    const segs = slotRingSegments(3, 12, 165, 180);
    expect(segs.map(s => s.kind)).toEqual(['yours', 'others', 'free']);
    expect(segs[0].startFrac).toBe(0);
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].startFrac).toBeCloseTo(segs[i - 1].endFrac, 6);
    }
    expect(segs[segs.length - 1].endFrac).toBeCloseTo(1, 6);
  });

  it('omits zero-count kinds entirely', () => {
    expect(slotRingSegments(0, 0, 24, 24).map(s => s.kind)).toEqual(['free']);
    expect(slotRingSegments(24, 0, 0, 24).map(s => s.kind)).toEqual(['yours']);
  });

  it('carries the raw counts alongside the geometry (text redundancy)', () => {
    const segs = slotRingSegments(3, 12, 165, 180);
    expect(segs.find(s => s.kind === 'yours')!.count).toBe(3);
    expect(segs.find(s => s.kind === 'others')!.count).toBe(12);
    expect(segs.find(s => s.kind === 'free')!.count).toBe(165);
  });
});

describe('computeSlotRing', () => {
  it('returns null for locations with no finite slot pool', () => {
    expect(computeSlotRing(makeState(), 'earth_surface', fixedNow)).toBeNull();
    // Early-fab wave (2026-08-31): LEO joined ORBITAL_SLOT_POOLS — it now has a ring.
    expect(computeSlotRing(makeState(), 'leo', fixedNow)).not.toBeNull();
    expect(computeSlotRing(makeState(), 'asteroid_belt', fixedNow)).toBeNull();
  });

  it('reads REAL server occupancy and splits yours / others / free', () => {
    const state = makeState({
      buildings: [building('b1', 'geo'), building('b2', 'geo')] as never,
      orbitalSlotOccupancy: { geo: { occupiedCount: 40, bucket: 'medium' } },
    });
    const ring = computeSlotRing(state, 'geo', fixedNow)!;
    expect(ring.synced).toBe(true);
    expect(ring.total).toBe(ORBITAL_SLOT_MAP.get('geo')!.totalSlots);
    expect(ring.yours).toBe(2);
    expect(ring.occupied).toBe(40);
    expect(ring.others).toBe(38);
    expect(ring.free).toBe(ring.total - 40);
    expect(ring.bucket).toBe('medium');
    expect(ring.saturated).toBe(false);
    expect(ring.badge).toContain('40/180');
    expect(ring.srText).toContain('38 other corporations');
  });

  it('fails soft to your-footprint-only when the save has never synced', () => {
    const state = makeState({ buildings: [building('b1', 'geo')] as never });
    const ring = computeSlotRing(state, 'geo', fixedNow)!;
    expect(ring.synced).toBe(false);
    expect(ring.others).toBe(0);
    expect(ring.occupied).toBe(1);
    expect(ring.free).toBe(ring.total - 1);
    expect(ring.badge).toContain('unsynced');
    expect(ring.srText).toContain('has not synced');
  });

  it('excludes mothballed and decommissioning buildings from your count', () => {
    const state = makeState({
      buildings: [
        building('b1', 'geo'),
        building('b2', 'geo', { status: 'mothballed' }),
        building('b3', 'geo', { status: 'decommissioning' }),
        building('b4', 'geo', { isComplete: false }),
      ] as never,
    });
    expect(computeSlotRing(state, 'geo', fixedNow)!.yours).toBe(1);
  });

  it('marks saturation and surfaces an active lease', () => {
    const state = makeState({
      orbitalSlotOccupancy: { lunar_orbit: { occupiedCount: 23, bucket: 'saturated' } },
      orbitalSlotLeases: [{ locationId: 'lunar_orbit', expiresAtMs: fixedNow + 86_400_000 }],
    });
    const ring = computeSlotRing(state, 'lunar_orbit', fixedNow)!;
    expect(ring.saturated).toBe(true);
    expect(ring.leased).toBe(true);
    expect(ring.badge).toContain('FULL');
    expect(ring.srText).toContain('active slot lease');
  });

  it('never lets the server count contradict your own building count', () => {
    // Stale snapshot claims fewer occupants than the player alone has.
    const state = makeState({
      buildings: [building('b1', 'geo'), building('b2', 'geo'), building('b3', 'geo')] as never,
      orbitalSlotOccupancy: { geo: { occupiedCount: 1, bucket: 'low' } },
    });
    const ring = computeSlotRing(state, 'geo', fixedNow)!;
    expect(ring.occupied).toBe(3);
    expect(ring.others).toBe(0);
    expect(ring.free).toBe(ring.total - 3);
  });

  it('computeSlotRings covers exactly the declared pools', () => {
    const rings = computeSlotRings(makeState(), fixedNow);
    expect(rings.map(r => r.locationId).sort()).toEqual(ORBITAL_SLOT_POOLS.map(p => p.locationId).sort());
  });
});

describe('slot ring accessibility', () => {
  it('every segment kind is distinguished by pattern and weight, not just colour', () => {
    const kinds = ['yours', 'others', 'free'] as const;
    const patterns = kinds.map(k => JSON.stringify(SLOT_SEGMENT_STYLE[k].dash));
    expect(new Set(patterns).size).toBe(3);
    const weights = kinds.map(k => SLOT_SEGMENT_STYLE[k].weight);
    expect(new Set(weights).size).toBe(3);
    for (const k of kinds) expect(SLOT_SEGMENT_STYLE[k].label.length).toBeGreaterThan(3);
  });
});

describe('atmospheres', () => {
  it('is data-driven and only covers bodies that really have one', () => {
    expect(getAtmosphere('earth_surface')).not.toBeNull();
    expect(getAtmosphere('venus_orbit')!.opacity).toBeGreaterThan(getAtmosphere('earth_surface')!.opacity);
    expect(getAtmosphere('mars_surface')!.opacity).toBeLessThan(getAtmosphere('earth_surface')!.opacity);
    expect(getAtmosphere('lunar_surface')).toBeNull(); // airless
    expect(getAtmosphere('europa_surface')).toBeNull(); // airless
    expect(getAtmosphere('leo')).toBeNull();            // an orbit, not a body
    expect(getAtmosphere(undefined)).toBeNull();
  });

  it('every entry carries a text label so the glow is never the only signal', () => {
    for (const [, def] of Object.entries(ATMOSPHERES)) {
      expect(def.label.length).toBeGreaterThan(8);
      expect(def.shellScale).toBeGreaterThan(1);
      expect(def.opacity).toBeGreaterThan(0);
      expect(def.opacity).toBeLessThan(1);
    }
  });
});
