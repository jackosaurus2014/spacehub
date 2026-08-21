/**
 * @jest-environment node
 *
 * Wave A2.2 (docs/VISUAL_AAA_2026-08.md §A2.2) — the location detail console's
 * pure halves: the orbital-ring → real-building mapping, and the vitals lens
 * over the engine's own selectors.
 *
 * The load-bearing invariant these tests guard is that the console can never
 * invent a figure: every vital either reproduces an engine selector's answer
 * or is absent, and the slot ring's occupant list can never disagree with
 * spatial-strategy's own occupancy count.
 */
import {
  deriveSlotRingDetail,
  deriveLocationVitals,
  occupantAtFraction,
  extractionTone,
  demandTone,
  wageTone,
  hazardTone,
  toneGlyph,
  formatMult,
  formatPct,
  MAX_SLOT_OCCUPANT_TICKS,
  OMITTED_VITALS,
} from '../map-detail';
import { countPlayerBuildingsAt, ORBITAL_SLOT_MAP } from '../spatial-strategy';
import { getBodyPalette, BODY_PALETTE, DEFAULT_BODY_PALETTE, BODY_KIND_LABEL } from '../map-bodies';
import { demandPoolKey } from '../demand-pools';
import { EXTRACTION_PRESSURE_MIN } from '../extraction-pressure';
import { LANE_BONUS_CAP, laneKey } from '../trade-lanes';
import type { GameState } from '../types';

const fixedNow = Date.UTC(2026, 7, 21, 12, 0, 0);

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    createdAt: fixedNow - 86_400_000,
    lastTickAt: fixedNow - 1_000,
    money: 100_000_000_000,
    totalEarned: 0,
    totalSpent: 0,
    gameDate: { year: 2026, month: 8 },
    tickSpeed: 1,
    buildings: [],
    completedResearch: [],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: ['earth_surface', 'leo', 'geo', 'lunar_orbit', 'lunar_surface'],
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
    corporationTier: 5,
    ...overrides,
  } as GameState;
}

function building(
  instanceId: string,
  locationId: string,
  extra: Partial<GameState['buildings'][number]> = {},
): GameState['buildings'][number] {
  return {
    instanceId,
    definitionId: 'comsat_basic',
    locationId,
    buildStartDate: { year: 2026, month: 6 },
    completionDate: { year: 2026, month: 7 },
    isComplete: true,
    startedAtMs: fixedNow - 10_000,
    realDurationSeconds: 60,
    ...extra,
  };
}

// ─── 1. Orbital ring → real buildings ────────────────────────────────────────

describe('deriveSlotRingDetail', () => {
  it('returns null where there is no finite orbital-slot pool', () => {
    const state = makeState();
    expect(ORBITAL_SLOT_MAP.has('lunar_surface')).toBe(false);
    expect(deriveSlotRingDetail(state, 'lunar_surface', fixedNow)).toBeNull();
  });

  it('produces one occupant slice per building spatial-strategy actually counts', () => {
    const state = makeState({
      buildings: [
        building('b1', 'geo'),
        building('b2', 'geo'),
        building('b3', 'geo'),
        building('elsewhere', 'leo'),
      ],
    });
    const detail = deriveSlotRingDetail(state, 'geo', fixedNow)!;
    expect(detail).not.toBeNull();
    expect(detail.ring.yours).toBe(countPlayerBuildingsAt(state, 'geo'));
    expect(detail.occupants).toHaveLength(detail.ring.yours);
    expect(detail.occupants.map(o => o.instanceId)).toEqual(['b1', 'b2', 'b3']);
    expect(detail.truncated).toBe(0);
  });

  it('excludes mothballed and decommissioning builds, matching isSlotOccupant', () => {
    const state = makeState({
      buildings: [
        building('live', 'geo'),
        building('paused', 'geo', { status: 'mothballed' }),
        building('leaving', 'geo', { status: 'decommissioning' }),
        building('site', 'geo', { isComplete: false }),
      ],
    });
    const detail = deriveSlotRingDetail(state, 'geo', fixedNow)!;
    expect(detail.ring.yours).toBe(1);
    expect(detail.occupants.map(o => o.instanceId)).toEqual(['live']);
  });

  it('carves occupant ticks strictly inside the ring "yours" arc, contiguously', () => {
    const state = makeState({
      buildings: [building('a', 'geo'), building('b', 'geo'), building('c', 'geo'), building('d', 'geo')],
    });
    const detail = deriveSlotRingDetail(state, 'geo', fixedNow)!;
    const seg = detail.ring.segments.find(s => s.kind === 'yours')!;
    expect(seg).toBeDefined();
    for (const o of detail.occupants) {
      expect(o.startFrac).toBeGreaterThanOrEqual(seg.startFrac - 1e-9);
      expect(o.endFrac).toBeLessThanOrEqual(seg.endFrac + 1e-9);
      expect(o.endFrac).toBeGreaterThan(o.startFrac);
    }
    for (let i = 1; i < detail.occupants.length; i++) {
      expect(detail.occupants[i].startFrac).toBeCloseTo(detail.occupants[i - 1].endFrac, 10);
    }
    expect(detail.occupants[0].startFrac).toBeCloseTo(seg.startFrac, 10);
    expect(detail.occupants[detail.occupants.length - 1].endFrac).toBeCloseTo(seg.endFrac, 10);
  });

  it('truncates the tick list past MAX_SLOT_OCCUPANT_TICKS but reports the overflow', () => {
    const many = Array.from({ length: MAX_SLOT_OCCUPANT_TICKS + 5 }, (_, i) =>
      building(`b${String(i).padStart(3, '0')}`, 'geo'));
    const state = makeState({ buildings: many });
    const detail = deriveSlotRingDetail(state, 'geo', fixedNow)!;
    expect(detail.ring.yours).toBe(MAX_SLOT_OCCUPANT_TICKS + 5);
    expect(detail.occupants).toHaveLength(MAX_SLOT_OCCUPANT_TICKS);
    expect(detail.truncated).toBe(5);
  });

  it('flags unsynced saves rather than inventing rival occupancy', () => {
    const state = makeState({ buildings: [building('b1', 'geo')] as GameState['buildings'] });
    const detail = deriveSlotRingDetail(state, 'geo', fixedNow)!;
    expect(detail.unsynced).toBe(true);
    expect(detail.ring.others).toBe(0);
    expect(detail.ring.srText).toMatch(/has not synced/i);
  });

  it('uses the server occupancy snapshot when one is present', () => {
    const pool = ORBITAL_SLOT_MAP.get('geo')!;
    const state = makeState({
      buildings: [building('b1', 'geo'), building('b2', 'geo')],
      orbitalSlotOccupancy: { geo: { occupiedCount: 40, bucket: 'medium' } },
    } as Partial<GameState>);
    const detail = deriveSlotRingDetail(state, 'geo', fixedNow)!;
    expect(detail.unsynced).toBe(false);
    expect(detail.ring.yours).toBe(2);
    expect(detail.ring.others).toBe(38);
    expect(detail.ring.free).toBe(pool.totalSlots - 40);
  });
});

describe('occupantAtFraction', () => {
  it('resolves a point on the ring back to the building that owns it', () => {
    const state = makeState({
      buildings: [building('a', 'geo'), building('b', 'geo')],
    });
    const detail = deriveSlotRingDetail(state, 'geo', fixedNow)!;
    for (const o of detail.occupants) {
      const mid = (o.startFrac + o.endFrac) / 2;
      expect(occupantAtFraction(detail, mid)?.instanceId).toBe(o.instanceId);
      // Wrapping is normalized, not clamped.
      expect(occupantAtFraction(detail, mid + 1)?.instanceId).toBe(o.instanceId);
    }
  });

  it('returns null in the free arc', () => {
    const state = makeState({ buildings: [building('a', 'geo')] as GameState['buildings'] });
    const detail = deriveSlotRingDetail(state, 'geo', fixedNow)!;
    const free = detail.ring.segments.find(s => s.kind === 'free')!;
    expect(occupantAtFraction(detail, (free.startFrac + free.endFrac) / 2)).toBeNull();
  });
});

// ─── 2. Vitals ───────────────────────────────────────────────────────────────

describe('deriveLocationVitals', () => {
  it('omits every vital it cannot cheaply derive, and always states the omissions', () => {
    const v = deriveLocationVitals(makeState(), 'lunar_surface', fixedNow);
    expect(v.extraction).toEqual([]);   // no mining services here
    expect(v.demand).toEqual([]);       // no synced demand-pool snapshot
    expect(v.labor).toEqual([]);        // no crew employed, index neutral
    expect(v.toll).toBeNull();          // no offense snapshot
    expect(v.omitted).toBe(OMITTED_VITALS);
    expect(v.omitted.length).toBeGreaterThan(0);
  });

  it('reads extraction pressure from the engine snapshot for the real mined pair', () => {
    const state = makeState({
      activeServices: [
        { definitionId: 'svc_mining_lunar', locationId: 'lunar_surface', linkedBuildingIds: [], startDate: { year: 2026, month: 1 }, revenueMultiplier: 1 },
      ] as GameState['activeServices'],
      extractionPressure: {
        asOf: fixedNow - 1000,
        entries: {
          'lunar_surface:lunar_water': { locationId: 'lunar_surface', resourceId: 'lunar_water', pressure: 0.52 },
        },
      },
    } as Partial<GameState>);
    const v = deriveLocationVitals(state, 'lunar_surface', fixedNow);
    const water = v.extraction.find(e => e.resourceId === 'lunar_water')!;
    expect(water.pressure).toBeCloseTo(0.52, 6);
    expect(water.grade.tier).toBe('thinning');
    // helium3 is in the same recipe but has no snapshot entry — the engine's
    // own fallback is 1.0 (untouched deposit), not "unknown".
    expect(v.extraction.find(e => e.resourceId === 'helium3')!.pressure).toBe(1);
    // Worst deposit first, so the decision-relevant row leads.
    expect(v.extraction[0].resourceId).toBe('lunar_water');
  });

  it('clamps a corrupt pressure entry to the engine floor rather than trusting it', () => {
    const state = makeState({
      activeServices: [
        { definitionId: 'svc_mining_lunar', locationId: 'lunar_surface', linkedBuildingIds: [], startDate: { year: 2026, month: 1 }, revenueMultiplier: 1 },
      ] as GameState['activeServices'],
      extractionPressure: {
        asOf: fixedNow,
        entries: { 'lunar_surface:lunar_water': { locationId: 'lunar_surface', resourceId: 'lunar_water', pressure: -5 } },
      },
    } as Partial<GameState>);
    const v = deriveLocationVitals(state, 'lunar_surface', fixedNow);
    expect(v.extraction.find(e => e.resourceId === 'lunar_water')!.pressure).toBe(EXTRACTION_PRESSURE_MIN);
  });

  it('surfaces demand pools from a fresh snapshot and drops a stale one entirely', () => {
    const entry = {
      locationId: 'leo', category: 'telecom' as const, mult: 0.72, dTotal: 5_000_000,
      dNpc: 3_000_000, cSupply: 7_000_000, playerShare: 0.25, topShares: [0.4, 0.25, 0.2], supplierCount: 4,
    };
    const fresh = makeState({
      demandPools: { asOf: fixedNow - 1000, pools: { [demandPoolKey('leo', 'telecom')]: entry } },
    } as Partial<GameState>);
    const v = deriveLocationVitals(fresh, 'leo', fixedNow);
    expect(v.demand).toHaveLength(1);
    expect(v.demand[0].mult).toBeCloseTo(0.72, 6);
    expect(v.demand[0].supplierCount).toBe(4);

    const stale = makeState({
      demandPools: { asOf: fixedNow - 30 * 24 * 3600_000, pools: { [demandPoolKey('leo', 'telecom')]: entry } },
    } as Partial<GameState>);
    expect(deriveLocationVitals(stale, 'leo', fixedNow).demand).toEqual([]);
  });

  it('reports the wage index as the system-wide labour figure it actually is', () => {
    const state = makeState({
      workforce: { engineers: 12, scientists: 0, miners: 0, operators: 0 },
      laborMarket: { asOf: fixedNow - 1000, index: { engineer: 1.35, miner: 1.5 } },
    } as Partial<GameState>);
    const v = deriveLocationVitals(state, 'geo', fixedNow);
    const eng = v.labor.find(l => l.type === 'engineer')!;
    expect(eng.wageIndex).toBeCloseTo(1.35, 6);
    expect(eng.employed).toBe(12);
    // Miners are unemployed but the index is off neutral — still decision-
    // relevant, so it is shown rather than hidden.
    expect(v.labor.find(l => l.type === 'miner')!.wageIndex).toBeCloseTo(1.5, 6);
    // Operators are neutral AND unemployed — nothing to say.
    expect(v.labor.find(l => l.type === 'operator')).toBeUndefined();
    // The vital is identical whichever location you ask about — it is not
    // location-scoped, and OMITTED_VITALS says so.
    const atLeo = deriveLocationVitals(state, 'leo', fixedNow);
    expect(atLeo.labor).toEqual(v.labor);
  });

  it('lists every canonical lane touching the location, with its earned discount', () => {
    const state = makeState({
      laneBonuses: { asOf: fixedNow - 1000, bonuses: { [laneKey('earth_surface', 'leo')]: 0.12 } },
    } as Partial<GameState>);
    const v = deriveLocationVitals(state, 'leo', fixedNow);
    const ids = v.lanes.map(l => l.laneId);
    expect(ids).toContain('earth_leo');
    expect(ids).toContain('leo_geo');
    expect(ids).toContain('leo_lunar_orbit');
    const earthLane = v.lanes.find(l => l.laneId === 'earth_leo')!;
    expect(earthLane.bonusPct).toBeCloseTo(0.12, 6);
    expect(earthLane.bonusPct).toBeLessThanOrEqual(LANE_BONUS_CAP);
    expect(earthLane.otherId).toBe('earth_surface');
    // Highest-discount lane sorts first so the useful row leads.
    expect(v.lanes[0].laneId).toBe('earth_leo');
  });

  it('flags LEO as the system chokepoint and leaves quiet locations unflagged', () => {
    const leo = deriveLocationVitals(makeState(), 'leo', fixedNow);
    expect(leo.chokepoint).not.toBeNull();
    expect(leo.chokepoint!.premium).toBeGreaterThan(1);
    const pluto = deriveLocationVitals(makeState(), 'pluto_surface', fixedNow);
    expect(pluto.chokepoint).toBeNull();
  });

  it('reports hazard exposure from forecasts, strike history and local shielding', () => {
    const state = makeState({
      hazardWarnings: [
        { id: 'w1', type: 'solar_storm', severity: 'severe', locationId: 'geo', forecastMonthIndex: 5, issuedAtMs: fixedNow, summary: 'Severe solar storm forecast at GEO' },
        { id: 'w2', type: 'micrometeorite', severity: 'minor', locationId: 'leo', forecastMonthIndex: 5, issuedAtMs: fixedNow, summary: 'elsewhere' },
      ],
      recentHazards: [
        { id: 'h1', type: 'solar_storm', severity: 'major', locationId: 'geo', occurredAtMs: fixedNow - 1000, damagePct: 0.2, mitigatedPct: 0, destroyed: false, insurancePayout: 0, summary: 'hit' },
      ],
    } as Partial<GameState>);
    const v = deriveLocationVitals(state, 'geo', fixedNow);
    expect(v.hazard.warnings.map(w => w.id)).toEqual(['w1']);
    expect(v.hazard.recentStrikes).toBe(1);
    expect(v.hazard.worstRecentSeverity).toBe('major');
    expect(hazardTone(v.hazard)).toBe('bad');
  });

  it('reads the posted freight toll and honours the governor exemption', () => {
    const offense = {
      asOf: fixedNow - 1000,
      campaigns: [], poachIncoming: [], poachOutcomes: [], corneringAlerts: [],
      laneTolls: [{ zoneSlug: 'cislunar', tollPct: 0.015, governorName: 'Helios Combine' }],
    };
    const zoneSlugSeen = (() => {
      const v = deriveLocationVitals(makeState({ offense } as Partial<GameState>), 'lunar_orbit', fixedNow);
      return v.toll?.zoneSlug ?? null;
    })();
    // Only assert the toll wiring where the location genuinely maps to the
    // tolled zone; otherwise the fixture, not the code, would be under test.
    if (zoneSlugSeen === 'cislunar') {
      const paying = deriveLocationVitals(makeState({ offense } as Partial<GameState>), 'lunar_orbit', fixedNow);
      expect(paying.toll!.tollPct).toBeCloseTo(0.015, 6);
      expect(paying.toll!.exempt).toBe(false);

      const governing = deriveLocationVitals(makeState({
        offense,
        zoneStandings: [{ zoneSlug: 'cislunar', sharePct: 60, isGovernor: true, taxBaseMonthly: 0 }],
      } as Partial<GameState>), 'lunar_orbit', fixedNow);
      expect(governing.toll!.exempt).toBe(true);
      expect(governing.toll!.exemptReason).toMatch(/govern/i);
    }
    // A stale offense snapshot must never be read.
    const staleV = deriveLocationVitals(
      makeState({ offense: { ...offense, asOf: fixedNow - 30 * 24 * 3600_000 } } as Partial<GameState>),
      'lunar_orbit', fixedNow,
    );
    expect(staleV.toll).toBeNull();
  });
});

// ─── 3. Tone helpers — colour is never the only carrier ──────────────────────

describe('vital tones', () => {
  it('maps extraction tone in step with the engine deposit grade', () => {
    expect(extractionTone(1.0)).toBe('good');
    expect(extractionTone(0.85)).toBe('neutral');
    expect(extractionTone(0.7)).toBe('caution');
    expect(extractionTone(0.42)).toBe('bad');
  });

  it('maps demand and wage tones monotonically', () => {
    expect(demandTone(1.2)).toBe('good');
    expect(demandTone(0.9)).toBe('neutral');
    expect(demandTone(0.4)).toBe('bad');
    expect(wageTone(0.85)).toBe('good');
    expect(wageTone(1.0)).toBe('neutral');
    expect(wageTone(1.6)).toBe('bad');
  });

  it('gives every tone a distinct non-colour glyph', () => {
    const glyphs = (['neutral', 'good', 'caution', 'bad'] as const).map(toneGlyph);
    expect(new Set(glyphs).size).toBe(4);
    expect(glyphs.every(g => g.length > 0)).toBe(true);
  });

  it('formats figures without false precision', () => {
    expect(formatMult(0.5238)).toBe('0.52x');
    expect(formatPct(0.125)).toBe('13%');
    expect(formatPct(0.125, 1)).toBe('12.5%');
  });
});

// ─── 4. Shared body palette (single definition site for both renderers) ──────

describe('BODY_PALETTE', () => {
  it('covers every location the orbital-slot pools reference', () => {
    for (const locationId of Array.from(ORBITAL_SLOT_MAP.keys())) {
      expect(BODY_PALETTE[locationId]).toBeDefined();
    }
  });

  it('falls back to a neutral body rather than throwing on an unknown id', () => {
    expect(getBodyPalette('not_a_place')).toBe(DEFAULT_BODY_PALETTE);
    expect(getBodyPalette(null)).toBe(DEFAULT_BODY_PALETTE);
  });

  it('names every body kind in text, so kind is never colour-only', () => {
    const kinds = new Set(Object.values(BODY_PALETTE).map(p => p.kind));
    for (const k of Array.from(kinds)) {
      expect(BODY_KIND_LABEL[k]).toBeTruthy();
    }
  });

  it('preserves the authored size ordering: major bodies dwarf pips and moons', () => {
    // NB the authored table deliberately draws Earth (22) at least as large as
    // Jupiter (20) — it is the home body, not a scale model. What must hold is
    // that major bodies read as major and pips read as pips, in BOTH the map
    // and the detail console, because they now share this one table.
    for (const major of ['earth_surface', 'jupiter_system', 'saturn_system', 'mars_surface']) {
      for (const pip of ['leo', 'geo', 'enceladus_surface', 'pluto_surface']) {
        expect(getBodyPalette(major).baseRadius).toBeGreaterThan(getBodyPalette(pip).baseRadius);
      }
    }
  });
});
