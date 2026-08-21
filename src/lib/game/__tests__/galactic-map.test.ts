/**
 * @jest-environment node
 *
 * Wave A4 (docs/VISUAL_AAA_2026-08.md §A4.1) — the galactic restage's pure
 * halves: parallax layer math, real-distance layout, and per-system identity
 * derivation.
 *
 * The invariants under test are the ones the audit called out: the layer must
 * stop being a flat diagram of uniform dots (identity + distance are now real),
 * and parallax must be a genuine preference (reduced motion returns a HARD
 * zero, not a damped offset).
 */
import {
  PARALLAX_LAYERS,
  parallaxOffsets,
  normalizePointer,
  STAR_IDENTITY,
  DEFAULT_STAR_IDENTITY,
  getStarIdentity,
  starNodeSizePx,
  STAR_NODE_MIN_PX,
  STAR_NODE_MAX_PX,
  systemPosition,
  SYSTEM_POSITIONS,
  SYSTEM_BEARING_DEG,
  SOL_POSITION,
  GALACTIC_MIN_RADIUS,
  GALACTIC_MAX_RADIUS,
  radiusForDistanceLy,
  deriveSystemIdentity,
  deriveSystemIdentities,
  PRESENCE_META,
} from '../galactic-map';
import { INTERSTELLAR_SYSTEMS, INTERSTELLAR_SYSTEM_MAP } from '../interstellar';
import type { GameState } from '../types';

const fixedNow = Date.UTC(2026, 7, 21, 12, 0, 0);

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    createdAt: fixedNow - 86_400_000,
    lastTickAt: fixedNow - 1_000,
    money: 1_000_000_000,
    totalEarned: 0,
    totalSpent: 0,
    gameDate: { year: 2150, month: 3 },
    tickSpeed: 1,
    buildings: [],
    completedResearch: [],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: ['earth_surface'],
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

// ─── Parallax ────────────────────────────────────────────────────────────────

describe('parallaxOffsets', () => {
  it('returns a hard zero for every layer under reduced motion', () => {
    for (const [x, y] of [[1, 1], [-1, 0.4], [0.2, -0.9]]) {
      const offsets = parallaxOffsets(x, y, true);
      expect(offsets).toHaveLength(PARALLAX_LAYERS.length);
      expect(offsets.every(o => o.dx === 0 && o.dy === 0)).toBe(true);
    }
  });

  it('translates layers OPPOSITE the pointer, which is what reads as depth', () => {
    const offsets = parallaxOffsets(1, 1, false);
    expect(offsets.every(o => o.dx <= 0 && o.dy <= 0)).toBe(true);
    const inverted = parallaxOffsets(-1, -1, false);
    expect(inverted.every(o => o.dx >= 0 && o.dy >= 0)).toBe(true);
  });

  it('moves deeper plates less than nearer plates (the depth cue itself)', () => {
    const offsets = parallaxOffsets(1, 0, false);
    const byId = new Map(offsets.map(o => [o.id, o]));
    const ordered = PARALLAX_LAYERS.map(l => Math.abs(byId.get(l.id)!.dx));
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i]).toBeGreaterThan(ordered[i - 1]);
    }
  });

  it('is centred at zero and symmetric', () => {
    expect(parallaxOffsets(0, 0, false).every(o => o.dx === 0 && o.dy === 0)).toBe(true);
    const a = parallaxOffsets(0.6, -0.3, false);
    const b = parallaxOffsets(-0.6, 0.3, false);
    a.forEach((o, i) => {
      expect(o.dx).toBeCloseTo(-b[i].dx, 10);
      expect(o.dy).toBeCloseTo(-b[i].dy, 10);
    });
  });

  it('clamps out-of-range and non-finite offsets instead of flinging a layer', () => {
    const wild = parallaxOffsets(50, -50, false);
    const edge = parallaxOffsets(1, -1, false);
    wild.forEach((o, i) => {
      expect(o.dx).toBeCloseTo(edge[i].dx, 10);
      expect(o.dy).toBeCloseTo(edge[i].dy, 10);
    });
    expect(parallaxOffsets(NaN, Infinity, false).every(o => Number.isFinite(o.dx) && Number.isFinite(o.dy))).toBe(true);
  });

  it('keeps every layer inside its declared travel budget', () => {
    const offsets = parallaxOffsets(1, 1, false);
    const byId = new Map(offsets.map(o => [o.id, o]));
    for (const layer of PARALLAX_LAYERS) {
      expect(Math.abs(byId.get(layer.id)!.dx)).toBeLessThanOrEqual(layer.travelPx);
    }
  });
});

describe('normalizePointer', () => {
  it('maps the container corners to the -1..1 corners and the centre to zero', () => {
    expect(normalizePointer(0, 0, 400, 200)).toEqual({ x: -1, y: -1 });
    expect(normalizePointer(400, 200, 400, 200)).toEqual({ x: 1, y: 1 });
    expect(normalizePointer(200, 100, 400, 200)).toEqual({ x: 0, y: 0 });
  });

  it('is safe on a zero-sized container (first paint / hidden tab)', () => {
    expect(normalizePointer(10, 10, 0, 0)).toEqual({ x: 0, y: 0 });
  });
});

// ─── Star identity ───────────────────────────────────────────────────────────

describe('star identity', () => {
  it('catalogues every canonical destination', () => {
    for (const sys of INTERSTELLAR_SYSTEMS) {
      expect(STAR_IDENTITY[sys.id]).toBeDefined();
    }
  });

  it('agrees with each system canon description on binaries and flare stars', () => {
    // The description text in interstellar.ts is the canon these values must
    // not contradict — this test is the guard against silent drift.
    for (const sys of INTERSTELLAR_SYSTEMS) {
      const star = getStarIdentity(sys.id);
      const desc = sys.description.toLowerCase();
      if (desc.includes('binary')) expect(star.binary).toBe(true);
      if (!desc.includes('binary')) expect(star.binary).toBe(false);
      if (desc.includes('flare star')) expect(star.flareStar).toBe(true);
      if (star.binary) expect(star.companionClass).toBeTruthy();
      else expect(star.companionClass).toBeNull();
    }
  });

  it('always names the class in TEXT so colour is never the only carrier', () => {
    for (const sys of INTERSTELLAR_SYSTEMS) {
      const star = getStarIdentity(sys.id);
      expect(star.classLabel.length).toBeGreaterThan(0);
      expect(star.spectralClass.length).toBeGreaterThan(0);
      expect(star.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('falls back to an uncatalogued star rather than throwing', () => {
    expect(getStarIdentity('nowhere')).toBe(DEFAULT_STAR_IDENTITY);
  });

  it('sizes nodes by real stellar radius, ordered and always tappable', () => {
    const sirius = starNodeSizePx(getStarIdentity('sirius').solarRadii);
    const alpha = starNodeSizePx(getStarIdentity('alpha_centauri').solarRadii);
    const proxima = starNodeSizePx(getStarIdentity('proxima_centauri').solarRadii);
    expect(sirius).toBeGreaterThan(alpha);
    expect(alpha).toBeGreaterThan(proxima);
    for (const v of [sirius, alpha, proxima, starNodeSizePx(0), starNodeSizePx(1e6)]) {
      expect(v).toBeGreaterThanOrEqual(STAR_NODE_MIN_PX);
      expect(v).toBeLessThanOrEqual(STAR_NODE_MAX_PX);
    }
  });
});

// ─── Layout ──────────────────────────────────────────────────────────────────

describe('system layout', () => {
  it('places systems at a radius proportional to their REAL light-year distance', () => {
    const sorted = [...INTERSTELLAR_SYSTEMS].sort((a, b) => a.distanceLy - b.distanceLy);
    const radii = sorted.map(s => {
      const p = SYSTEM_POSITIONS[s.id];
      return Math.hypot(p.x - SOL_POSITION.x, p.y - SOL_POSITION.y);
    });
    for (let i = 1; i < radii.length; i++) {
      expect(radii[i]).toBeGreaterThanOrEqual(radii[i - 1] - 1e-9);
    }
    // The nearest sits on the inner ring, the furthest on the outer one.
    expect(radii[0]).toBeCloseTo(GALACTIC_MIN_RADIUS, 6);
    expect(radii[radii.length - 1]).toBeCloseTo(GALACTIC_MAX_RADIUS, 6);
  });

  it('keeps every node inside the container', () => {
    for (const sys of INTERSTELLAR_SYSTEMS) {
      const p = SYSTEM_POSITIONS[sys.id];
      expect(p.x).toBeGreaterThan(0.02);
      expect(p.x).toBeLessThan(0.98);
      expect(p.y).toBeGreaterThan(0.02);
      expect(p.y).toBeLessThan(0.98);
    }
  });

  it('gives every system a distinct bearing so labels never stack', () => {
    const bearings = INTERSTELLAR_SYSTEMS.map(s => SYSTEM_BEARING_DEG[s.id]);
    expect(bearings.every(b => typeof b === 'number')).toBe(true);
    expect(new Set(bearings).size).toBe(bearings.length);
  });

  it('degrades gracefully for an unknown system id', () => {
    const p = systemPosition('nowhere');
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.y)).toBe(true);
  });

  it('clamps radiusForDistanceLy to the declared band', () => {
    for (const d of [-10, 0, 4.24, 8.6, 1000, NaN]) {
      const r = radiusForDistanceLy(d);
      expect(r).toBeGreaterThanOrEqual(GALACTIC_MIN_RADIUS - 1e-9);
      expect(r).toBeLessThanOrEqual(GALACTIC_MAX_RADIUS + 1e-9);
    }
  });
});

// ─── Presence ────────────────────────────────────────────────────────────────

describe('deriveSystemIdentity', () => {
  const jumpReady = {
    completedResearch: ['jump_drive', 'exotic_matter_refining', 'heavy_radiation_shielding'],
    resources: { exotic_fuel: 100_000 },
  } as Partial<GameState>;

  it('returns null for an unknown system', () => {
    expect(deriveSystemIdentity(makeState(), 'nowhere')).toBeNull();
  });

  it('reports LOCKED with the real blockers on a fresh corporation', () => {
    const id = deriveSystemIdentity(makeState(), 'proxima_centauri')!;
    expect(id.presence).toBe('locked');
    expect(id.missingResearch).toContain('jump_drive');
    expect(id.fuelShort).toBe(true);
    expect(id.srText).toMatch(/research required/i);
    expect(id.srText).toMatch(/exotic fuel short/i);
  });

  it('reports READY only once research AND fuel are both satisfied', () => {
    const sys = INTERSTELLAR_SYSTEM_MAP.get('proxima_centauri')!;
    const researchedButDry = deriveSystemIdentity(
      makeState({ completedResearch: ['jump_drive'], resources: { exotic_fuel: sys.jumpFuelRequired - 1 } } as Partial<GameState>),
      'proxima_centauri',
    )!;
    expect(researchedButDry.presence).toBe('locked');
    expect(researchedButDry.missingResearch).toEqual([]);
    expect(researchedButDry.fuelShort).toBe(true);

    const ready = deriveSystemIdentity(makeState(jumpReady), 'proxima_centauri')!;
    expect(ready.presence).toBe('ready');
    expect(ready.fuelShort).toBe(false);
  });

  it('ranks colony over on-site over in-transit over ready', () => {
    const base = makeState(jumpReady);
    const withTransit = deriveSystemIdentity({
      ...base,
      expeditions: [{ id: 'e1', targetSystemId: 'proxima_centauri', phase: 'outbound', monthsElapsed: 2, outboundMonths: 10, exploreMonths: 6 }],
    } as GameState, 'proxima_centauri')!;
    expect(withTransit.presence).toBe('expedition_transit');

    const withOnsite = deriveSystemIdentity({
      ...base,
      expeditions: [{ id: 'e1', targetSystemId: 'proxima_centauri', phase: 'exploring', monthsElapsed: 12, outboundMonths: 10, exploreMonths: 6 }],
    } as GameState, 'proxima_centauri')!;
    expect(withOnsite.presence).toBe('expedition_onsite');

    const withColony = deriveSystemIdentity({
      ...base,
      expeditions: [{ id: 'e1', targetSystemId: 'proxima_centauri', phase: 'exploring', monthsElapsed: 12, outboundMonths: 10, exploreMonths: 6 }],
      interstellarColonies: [{ systemId: 'proxima_centauri', name: 'Landfall', population: 4200, infrastructureLevel: 2, localResources: ['helium3'] }],
    } as GameState, 'proxima_centauri')!;
    expect(withColony.presence).toBe('colonized');
    expect(withColony.colonyPopulation).toBe(4200);
  });

  it('ignores completed and lost expeditions', () => {
    const id = deriveSystemIdentity({
      ...makeState(jumpReady),
      expeditions: [
        { id: 'done', targetSystemId: 'proxima_centauri', phase: 'completed', monthsElapsed: 30, outboundMonths: 10, exploreMonths: 6 },
        { id: 'lost', targetSystemId: 'proxima_centauri', phase: 'lost', monthsElapsed: 4, outboundMonths: 10, exploreMonths: 6 },
      ],
    } as GameState, 'proxima_centauri')!;
    expect(id.presence).toBe('ready');
  });

  it('counts inbound shipments from the real trade-route state', () => {
    const id = deriveSystemIdentity({
      ...makeState(jumpReady),
      interstellarTradeRoutes: [
        { id: 'r1', systemId: 'proxima_centauri', resourceId: 'helium3', status: 'active', nextDepartureGameMonth: 5, inTransit: [{ quantity: 10, departedGameMonth: 1, arrivesGameMonth: 9 }, { quantity: 5, departedGameMonth: 2, arrivesGameMonth: 10 }] },
        { id: 'r2', systemId: 'sirius', resourceId: 'gold', status: 'active', nextDepartureGameMonth: 5, inTransit: [{ quantity: 1, departedGameMonth: 1, arrivesGameMonth: 9 }] },
      ],
    } as GameState, 'proxima_centauri')!;
    expect(id.inboundShipments).toBe(2);
    expect(id.srText).toMatch(/2 shipments inbound/i);
  });

  it('gives every presence state a distinct glyph and a word', () => {
    const metas = Object.values(PRESENCE_META);
    expect(new Set(metas.map(m => m.glyph)).size).toBe(metas.length);
    expect(new Set(metas.map(m => m.chip)).size).toBe(metas.length);
    expect(metas.every(m => m.label.length > 0)).toBe(true);
  });

  it('derives all five systems in catalog order', () => {
    const all = deriveSystemIdentities(makeState());
    expect(all.map(i => i.systemId)).toEqual(INTERSTELLAR_SYSTEMS.map(s => s.id));
    expect(all.every(i => i.srText.endsWith('.'))).toBe(true);
  });
});
