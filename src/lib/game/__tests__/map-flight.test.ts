/**
 * @jest-environment node
 *
 * Flight mode part (a) — docs/GRAPHICS_REVIEW_2026-09-12.md addendum. The
 * pure helpers both solar renderers share: fly-path interpolation, the
 * local-sphere hysteresis, the local-scene model builder, the 2D diagram
 * layout and the breadcrumb state.
 */
import {
  flyDurationMs,
  flyProgress,
  interpolatePose,
  easeOutCubic,
  FLY_MIN_MS,
  FLY_MAX_MS,
  FLY_UNITS_FOR_MAX,
  localSphereRadii,
  frameDistance,
  nextLocalBody,
  LOCAL_SPHERE_ENTER_FACTOR,
  LOCAL_SPHERE_EXIT_FACTOR,
  LOCAL_FRAME_FACTOR,
  SYSTEM_FRAME_FACTOR,
  shellScale,
  SHELL_SCALE_MIN,
  LOCAL_SHELLS,
  localBodyForLocation,
  buildLocalSceneModel,
  localAnchorsAt,
  localMoonOffset,
  localCandidatesFrom,
  exitDirection,
  layoutLocalDiagram,
  DIAGRAM_BODY_PX,
  DIAGRAM_BODY_MIN_PX,
  buildBreadcrumb,
  bodyName,
  rootBodyId,
  LOCAL_EXIT_SCALE,
  type CameraPose,
  type LocalCandidate,
} from '../map-flight';
import { computeScenePositions, sceneBodyRadius, ORBITAL_BODY_MAP, ORBITAL_BODIES } from '../orbital-elements';
import { placeContacts, type TrafficContact } from '../ship-traffic';
import { ORBITAL_SLOT_MAP } from '../spatial-strategy';
import type { GameState } from '../types';

const fixedNow = Date.UTC(2026, 8, 13, 12, 0, 0);

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    createdAt: fixedNow - 86_400_000,
    lastTickAt: fixedNow - 1_000,
    money: 100_000_000,
    totalEarned: 0,
    totalSpent: 0,
    gameDate: { year: 2026, month: 9 },
    tickSpeed: 1,
    buildings: [],
    completedResearch: [],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: ['earth_surface', 'leo', 'geo', 'lunar_orbit'],
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

function building(instanceId: string, definitionId: string, locationId: string, isComplete = true) {
  return {
    instanceId, definitionId, locationId, isComplete,
    buildStartDate: { year: 2026, month: 1 },
    completionDate: { year: 2026, month: 2 },
    startedAtMs: fixedNow - 100_000,
    realDurationSeconds: 60,
  };
}

type Ship = NonNullable<GameState['ships']>[number];
function ship(instanceId: string, over: Partial<Ship> = {}): Ship {
  return {
    instanceId, definitionId: 'freighter', name: `Ship ${instanceId}`, status: 'idle', currentLocation: 'leo', isBuilt: true,
    ...over,
  } as Ship;
}

// ─── Fly paths ───────────────────────────────────────────────────────────────

describe('fly path', () => {
  it('duration scales with distance between the 1.5–3 s bounds', () => {
    expect(flyDurationMs(0)).toBe(FLY_MIN_MS);
    expect(flyDurationMs(FLY_UNITS_FOR_MAX / 2)).toBe(Math.round((FLY_MIN_MS + FLY_MAX_MS) / 2));
    expect(flyDurationMs(FLY_UNITS_FOR_MAX)).toBe(FLY_MAX_MS);
    expect(flyDurationMs(10_000)).toBe(FLY_MAX_MS);
    expect(flyDurationMs(Number.NaN)).toBe(FLY_MIN_MS);
  });

  it('reduced motion makes every flight a zero-length cut', () => {
    expect(flyDurationMs(40, true)).toBe(0);
    expect(flyProgress(0, 0)).toBe(1);
    expect(flyProgress(-5, 0)).toBe(1);
  });

  it('progress runs 0 → 1 and clamps', () => {
    expect(flyProgress(0, 2000)).toBe(0);
    expect(flyProgress(1000, 2000)).toBe(0.5);
    expect(flyProgress(2000, 2000)).toBe(1);
    expect(flyProgress(9000, 2000)).toBe(1);
  });

  it('interpolation is exact at both ends and eased in between', () => {
    const from: CameraPose = { pos: [0, 10, 40], target: [0, 0, 0] };
    const to: CameraPose = { pos: [12, 3, 5], target: [12, 0, 0] };
    expect(interpolatePose(from, to, 0)).toEqual(from);
    expect(interpolatePose(from, to, 1)).toEqual(to);
    const mid = interpolatePose(from, to, 0.5);
    // ease-out cubic at 0.5 = 0.875 → most of the way there already
    const e = easeOutCubic(0.5);
    expect(e).toBeCloseTo(0.875, 6);
    expect(mid.target[0]).toBeCloseTo(12 * e, 6);
    expect(mid.pos[0]).toBeCloseTo(12 * e, 6);
    // the arc lifts the position above the straight line, never below
    const straightY = 10 + (3 - 10) * e;
    expect(mid.pos[1]).toBeGreaterThan(straightY);
    // inputs are never mutated / aliased
    expect(interpolatePose(from, to, 1).pos).not.toBe(to.pos);
  });

  it('clamps out-of-range progress', () => {
    const from: CameraPose = { pos: [0, 0, 0], target: [0, 0, 0] };
    const to: CameraPose = { pos: [1, 1, 1], target: [1, 0, 0] };
    expect(interpolatePose(from, to, -1)).toEqual(from);
    expect(interpolatePose(from, to, 2)).toEqual(to);
  });
});

// ─── Local spheres ───────────────────────────────────────────────────────────

describe('local sphere', () => {
  const earthR = sceneBodyRadius(6371);

  it('enter < frame < exit and the frames straddle the sphere', () => {
    const { enter, exit } = localSphereRadii(earthR);
    expect(enter).toBeCloseTo(earthR * LOCAL_SPHERE_ENTER_FACTOR, 6);
    expect(exit).toBeCloseTo(earthR * LOCAL_SPHERE_EXIT_FACTOR, 6);
    expect(exit).toBeGreaterThan(enter);
    expect(frameDistance(earthR, 'local')).toBeLessThan(enter);
    expect(frameDistance(earthR, 'local')).toBeCloseTo(earthR * LOCAL_FRAME_FACTOR, 6);
    expect(frameDistance(earthR, 'system')).toBeGreaterThan(exit);
    expect(frameDistance(earthR, 'system')).toBeCloseTo(earthR * SYSTEM_FRAME_FACTOR, 6);
  });

  it('every drawn orbit fits inside the enter sphere', () => {
    for (const b of ORBITAL_BODIES) {
      if (!b.locationId) continue;
      const r = sceneBodyRadius(b.radiusKm);
      const { enter } = localSphereRadii(r);
      const moons = ORBITAL_BODIES.filter(m => m.parent === b.id);
      for (const m of moons) expect((m.orbitScale || 2) * r + sceneBodyRadius(m.radiusKm)).toBeLessThan(enter);
      for (const s of LOCAL_SHELLS[b.id] || []) expect(shellScale(s.altitudeKm, b.radiusKm) * r).toBeLessThan(enter);
      expect(LOCAL_EXIT_SCALE * r).toBeLessThan(enter);
    }
  });

  it('has no flicker at the boundary (hysteresis)', () => {
    const r = 1;
    const cand = (dist: number): LocalCandidate[] => [{ id: 'earth', dist, r }];
    const { enter, exit } = localSphereRadii(r);
    // Sweep in: stays null until strictly inside enter.
    let cur: string | null = null;
    for (let d = exit + 2; d > enter; d -= 0.05) cur = nextLocalBody(cur, cand(d));
    expect(cur).toBeNull();
    cur = nextLocalBody(cur, cand(enter - 0.01));
    expect(cur).toBe('earth');
    // Wobble inside the band between enter and exit: stays local.
    for (let d = enter - 0.5; d < exit; d += 0.1) {
      cur = nextLocalBody(cur, cand(d));
      expect(cur).toBe('earth');
    }
    // Only past exit does it leave …
    cur = nextLocalBody(cur, cand(exit + 0.01));
    expect(cur).toBeNull();
    // … and coming straight back into the band does NOT re-enter.
    cur = nextLocalBody(cur, cand(exit - 0.3));
    expect(cur).toBeNull();
    cur = nextLocalBody(cur, cand(enter - 0.3));
    expect(cur).toBe('earth');
  });

  it('a flight ending at the local frame distance enters; the system frame exits', () => {
    const cands = (dist: number): LocalCandidate[] => [{ id: 'earth', dist, r: earthR }];
    expect(nextLocalBody(null, cands(frameDistance(earthR, 'local')))).toBe('earth');
    expect(nextLocalBody('earth', cands(frameDistance(earthR, 'system')))).toBeNull();
  });

  it('nests: from Earth into the Moon and back to Earth without a system flash', () => {
    const moonR = 0.5;
    const cands = (dEarth: number, dMoon: number): LocalCandidate[] => [
      { id: 'earth', dist: dEarth, r: earthR },
      { id: 'moon', parent: 'earth', dist: dMoon, r: moonR },
    ];
    let cur: string | null = null;
    cur = nextLocalBody(cur, cands(3, 10));
    expect(cur).toBe('earth');
    // Approaching the Moon while still inside Earth's sphere → Moon scene.
    cur = nextLocalBody(cur, cands(2.5, localSphereRadii(moonR).enter - 0.1));
    expect(cur).toBe('moon');
    // Stay while inside the Moon's exit band.
    cur = nextLocalBody(cur, cands(2.5, localSphereRadii(moonR).exit - 0.1));
    expect(cur).toBe('moon');
    // Past the Moon's exit → straight back to Earth (same call, no null).
    cur = nextLocalBody(cur, cands(2.5, localSphereRadii(moonR).exit + 0.1));
    expect(cur).toBe('earth');
  });

  it('from the system view, the deepest body the camera is inside wins', () => {
    const cands: LocalCandidate[] = [
      { id: 'earth', dist: 2, r: earthR },
      { id: 'moon', parent: 'earth', dist: 1, r: 0.5 },
    ];
    expect(nextLocalBody(null, cands)).toBe('moon');
  });

  it('never switches sideways between two planets', () => {
    const cands: LocalCandidate[] = [
      { id: 'earth', dist: 4, r: earthR },
      { id: 'mars', dist: 1, r: 0.7 },
    ];
    expect(nextLocalBody('earth', cands)).toBe('earth');
  });
});

// ─── Shells & model ──────────────────────────────────────────────────────────

describe('shells', () => {
  it('log-compresses altitude, floors at the readability minimum, keeps ordering', () => {
    expect(shellScale(400, 6371)).toBe(SHELL_SCALE_MIN);
    const meo = shellScale(20_200, 6371);
    const geo = shellScale(35_786, 6371);
    expect(meo).toBeGreaterThan(SHELL_SCALE_MIN);
    expect(geo).toBeGreaterThan(meo);
    expect(geo).toBeLessThan(2.6); // inside the Moon's hand-tuned 2.6 r orbit
  });

  it('every shell with a location maps to a real slot pool and a real location', () => {
    for (const [bodyId, shells] of Object.entries(LOCAL_SHELLS)) {
      expect(ORBITAL_BODY_MAP.has(bodyId)).toBe(true);
      for (const s of shells) {
        if (!s.locationId) continue;
        expect(ORBITAL_SLOT_MAP.has(s.locationId)).toBe(true);
        expect(localBodyForLocation(s.locationId)).toBe(bodyId);
      }
    }
  });

  it('resolves locations to the body that owns their local scene', () => {
    expect(localBodyForLocation('earth_surface')).toBe('earth');
    expect(localBodyForLocation('leo')).toBe('earth');
    expect(localBodyForLocation('geo')).toBe('earth');
    expect(localBodyForLocation('lunar_orbit')).toBe('moon');
    expect(localBodyForLocation('lunar_surface')).toBe('moon');
    expect(localBodyForLocation('mars_orbit')).toBe('mars');
    expect(localBodyForLocation('europa_surface')).toBe('europa');
    expect(localBodyForLocation('asteroid_belt')).toBeNull();
    expect(localBodyForLocation('outer_system')).toBeNull(); // the relay pip overrides Uranus
    expect(localBodyForLocation(null)).toBeNull();
  });
});

describe('buildLocalSceneModel', () => {
  const contacts: TrafficContact[] = [
    { id: 'k1', hullClass: 'freighter', status: 'transit', laneA: 'leo', laneB: 'mars_orbit', progress: 0.2, etaMs: 90_000 },
    { id: 'k2', hullClass: 'miner', status: 'holding', locationId: 'geo', npc: true, factionHint: 'the-syndicate' },
    { id: 'k3', hullClass: 'tanker', status: 'transit', laneA: 'mars_orbit', laneB: 'ceres_surface', progress: 0.5, etaMs: 10_000 },
  ];
  const state = makeState({
    buildings: [
      building('b1', 'sat_telecom_geo', 'geo'),
      building('b2', 'sat_telecom_geo', 'geo'),
      building('b3', 'sat_telecom_geo', 'geo', false),
      building('b4', 'space_station_small', 'leo'),
      building('b5', 'launch_pad_small', 'earth_surface'),
    ],
    ships: [
      ship('s1', { currentLocation: 'leo' }),
      ship('s2', { status: 'in_transit', currentLocation: 'leo', route: { from: 'leo', to: 'mars_orbit', departedAtMs: fixedNow - 50_000, arrivalAtMs: fixedNow + 50_000, cargo: {} } }),
      ship('s3', { status: 'in_transit', currentLocation: 'lunar_orbit', route: { from: 'lunar_orbit', to: 'geo', departedAtMs: fixedNow - 75_000, arrivalAtMs: fixedNow + 25_000, cargo: {} } }),
      ship('s4', { currentLocation: 'ceres_surface' }),
      ship('s5', { currentLocation: 'leo', isBuilt: false }),
    ],
    orbitalSlotOccupancy: { geo: { occupiedCount: 5, bucket: 'low' }, leo: { occupiedCount: 3, bucket: 'low' } },
  });

  it('returns null for non-bodies', () => {
    expect(buildLocalSceneModel(state, 'belt')).toBeNull();
    expect(buildLocalSceneModel(state, 'nope')).toBeNull();
  });

  it('builds Earth: three shells, the Moon, pips/glints from state, ships from state + feed', () => {
    const m = buildLocalSceneModel(state, 'earth', { contacts, nowMs: fixedNow, worldNames: { geo: ['Meridian Orbital'] } });
    expect(m).not.toBeNull();
    const model = m!;
    expect(model.bodyR).toBeCloseTo(sceneBodyRadius(6371), 6);
    expect(model.shells.map(s => s.id)).toEqual(['leo', 'meo', 'geo']);
    expect(model.moons.map(x => x.id)).toEqual(['moon']);
    expect(model.moons[0].shells.map(x => x.locationId)).toEqual(['lunar_orbit']);
    expect(model.moons[0].shells[0].scale).toBeCloseTo(1.3, 6); // 100 km over a 1,737 km body → the floor
    expect(model.builtAtMs).toBe(fixedNow);
    expect(model.locationIds).toEqual(expect.arrayContaining(['earth_surface', 'leo', 'geo', 'lunar_surface', 'lunar_orbit']));
    // GEO: 2 complete satellites are yours (the incomplete one is not), 3 others, 175 free.
    const geo = model.shells.find(s => s.id === 'geo')!;
    expect(geo.satellites).toBe(2);
    expect(geo.stations).toBe(0);
    expect(geo.slots?.yours).toBe(2);
    expect(geo.slots?.others).toBe(3);
    expect(geo.otherSatellites).toBe(3);
    expect(geo.pips.length).toBe(180);
    expect(geo.pips.filter(p => p.kind === 'yours').length).toBe(2);
    expect(geo.pips.filter(p => p.kind === 'others').length).toBe(3);
    expect(geo.pips.filter(p => p.kind === 'free').length).toBe(175);
    expect(geo.pips[2].tag).toBe('Meridian Orbital');
    expect(geo.pips[0].tag).toBe('Yours');
    expect(geo.pips[179].tag).toBe('Free');
    expect(geo.pips[179].frac).toBeCloseTo(179 / 180, 6);
    // LEO: one station (non-satellite orbital asset) and no world names → generic tag.
    const leo = model.shells.find(s => s.id === 'leo')!;
    expect(leo.stations).toBe(1);
    expect(leo.satellites).toBe(0);
    expect(leo.pips.find(p => p.kind === 'others')?.tag).toBe('Other corporation');
    // MEO is decorative: no slots, no pips.
    expect(model.shells.find(s => s.id === 'meo')!.slots).toBeNull();
    // Ships: s1 holding at LEO, s2 departing to Mars, s3 arriving from lunar orbit
    // (both endpoints local → arriving), s4 elsewhere, s5 unbuilt; k1 departing,
    // k2 holding at GEO, k3 not local.
    const own = model.ships.filter(s => s.own);
    expect(own.map(s => [s.id, s.status])).toEqual([
      ['own:s1', 'holding'], ['own:s2', 'departing'], ['own:s3', 'arriving'],
    ]);
    expect(own[1].contact.progress).toBeCloseTo(0.5, 6);
    expect(own[1].etaMs).toBe(50_000);
    expect(own[1].contact.laneA).toBe('leo');
    expect(own[1].contact.laneB).toBe('mars_orbit');
    const theirs = model.ships.filter(s => !s.own);
    expect(theirs.map(s => [s.id, s.status])).toEqual([['k1', 'departing'], ['k2', 'holding']]);
    expect(model.externalIds).toEqual(['mars_orbit']);
    expect(model.extentScale).toBeCloseTo(2.6, 6); // the Moon's hand-tuned orbit
    expect(model.srText).toContain('Earth local view');
    expect(model.srText).toContain('1 moon');
    expect(model.srText).toContain('3 of your orbital assets');
    expect(model.srText).toContain('1 arriving, 1 departing');
  });

  it('builds Jupiter with four moons and the Jovian band; Saturn with rings only', () => {
    const j = buildLocalSceneModel(makeState(), 'jupiter', { nowMs: fixedNow })!;
    expect(j.moons.map(m => m.id)).toEqual(['io', 'europa', 'ganymede', 'callisto']);
    expect(j.shells.length).toBe(1);
    expect(j.shells[0].locationId).toBe('jupiter_system');
    const band = j.shells[0].scale;
    expect(band).toBeGreaterThan(2.3);
    expect(band).toBeLessThan(2.8);
    const s = buildLocalSceneModel(makeState(), 'saturn', { nowMs: fixedNow })!;
    expect(s.shells).toEqual([]);
    expect(s.moons.map(m => m.id)).toEqual(['titan', 'enceladus']);
  });

  it('is deterministic for the same inputs (cacheable)', () => {
    const a = buildLocalSceneModel(state, 'earth', { contacts, nowMs: fixedNow });
    const b = buildLocalSceneModel(state, 'earth', { contacts, nowMs: fixedNow });
    expect(a).toEqual(b);
  });
});

describe('local anchors + placement', () => {
  const state = makeState({
    ships: [
      ship('s1', { currentLocation: 'geo' }),
      ship('s2', { status: 'in_transit', currentLocation: 'leo', route: { from: 'leo', to: 'mars_orbit', departedAtMs: fixedNow - 50_000, arrivalAtMs: fixedNow + 50_000, cargo: {} } }),
    ],
  });
  const model = buildLocalSceneModel(state, 'earth', { nowMs: fixedNow })!;

  it('holding ships orbit ON their shell; departing ships head for the exit point', () => {
    const unit = 10;
    const { lane, hold } = localAnchorsAt(model, 0, unit, { mars_orbit: [1, 0] });
    const geoScale = model.shells.find(s => s.id === 'geo')!.scale;
    expect(hold.geo).toEqual({ pos: [0, 0, 0], r: geoScale * unit });
    expect(lane.mars_orbit.pos[0]).toBeCloseTo(LOCAL_EXIT_SCALE * unit, 6);
    expect(lane.mars_orbit.pos[2]).toBeCloseTo(0, 6);
    const holding = placeContacts([model.ships[0].contact], hold, fixedNow, { orbitGap: 0, staticOrbit: true });
    expect(holding.length).toBe(1);
    expect(Math.hypot(holding[0].pos[0], holding[0].pos[2])).toBeCloseTo(geoScale * unit, 4);
    const transit = placeContacts([model.ships[1].contact], lane, fixedNow, { asOfMs: fixedNow });
    expect(transit.length).toBe(1);
    // halfway between the LEO port and the exit point (bent, so x is between)
    expect(transit[0].pos[0]).toBeGreaterThan(lane.leo.pos[0]);
    expect(transit[0].pos[0]).toBeLessThan(lane.mars_orbit.pos[0]);
    expect(transit[0].heading).not.toBeNull();
  });

  it('moons orbit with time and freeze at t = 0', () => {
    const moon = model.moons[0];
    const a = localMoonOffset(moon, 0);
    const b = localMoonOffset(moon, 0);
    const c = localMoonOffset(moon, 20);
    expect(a).toEqual(b);
    expect(Math.hypot(a[0], a[2])).toBeCloseTo(moon.orbitScale, 6);
    expect(Math.hypot(c[0], c[2])).toBeCloseTo(moon.orbitScale, 6);
    expect(a[0] === c[0] && a[2] === c[2]).toBe(false);
    const anchors = localAnchorsAt(model, 20, 1);
    expect(anchors.lane.lunar_surface.pos[0]).toBeCloseTo(c[0], 6);
    expect(anchors.hold.lunar_orbit).toBeDefined();
  });

  it('falls back to a deterministic exit direction when none is supplied', () => {
    const a = localAnchorsAt(model, 0, 1);
    const b = localAnchorsAt(model, 0, 1);
    expect(a.lane.mars_orbit).toEqual(b.lane.mars_orbit);
    expect(Math.hypot(a.lane.mars_orbit.pos[0], a.lane.mars_orbit.pos[2])).toBeCloseTo(LOCAL_EXIT_SCALE, 6);
  });

  it('derives candidates and exit directions from live system positions', () => {
    const positions = computeScenePositions(0);
    const earth = positions.bodies.earth;
    const cands = localCandidatesFrom(positions, [earth[0], earth[1] + 3, earth[2]]);
    const e = cands.find(c => c.id === 'earth')!;
    expect(e.dist).toBeCloseTo(3, 6);
    expect(e.parent).toBeUndefined();
    expect(cands.find(c => c.id === 'moon')!.parent).toBe('earth');
    expect(cands.some(c => c.id === 'belt')).toBe(false);
    const dir = exitDirection(positions, 'earth', 'mars_orbit')!;
    expect(Math.hypot(dir[0], dir[1])).toBeCloseTo(1, 6);
    expect(exitDirection(positions, 'earth', 'nowhere')).toBeNull();
  });
});

// ─── 2D diagram ──────────────────────────────────────────────────────────────

describe('layoutLocalDiagram', () => {
  const model = buildLocalSceneModel(makeState(), 'earth', { nowMs: fixedNow })!;

  it('centres the body and keeps the outermost orbit inside the canvas', () => {
    const l = layoutLocalDiagram(model, 1366, 900);
    expect(l.cx).toBe(683);
    expect(l.cy).toBe(450);
    expect(l.R).toBe(DIAGRAM_BODY_PX);
    const outer = Math.max(...l.rings.map(r => r.radiusPx), ...l.moons.map(m => m.orbitPx + m.rPx));
    expect(outer).toBeLessThan(450);
    expect(l.rings.map(r => r.id)).toEqual(['leo', 'meo', 'geo']);
    expect(l.rings[0].radiusPx).toBeLessThan(l.rings[1].radiusPx);
    expect(l.rings[1].radiusPx).toBeLessThan(l.rings[2].radiusPx);
    expect(l.moons[0].orbitPx).toBeGreaterThan(l.rings[2].radiusPx);
  });

  it('shrinks to fit a phone and floors the body size', () => {
    const phone = layoutLocalDiagram(model, 390, 400);
    expect(phone.R).toBe(DIAGRAM_BODY_PX); // a phone still fits the full-size body
    expect(Math.max(...phone.moons.map(m => m.orbitPx + m.rPx))).toBeLessThan(195);
    const l = layoutLocalDiagram(model, 260, 300);
    expect(l.R).toBeLessThan(DIAGRAM_BODY_PX);
    expect(l.R).toBeGreaterThanOrEqual(DIAGRAM_BODY_MIN_PX);
    const outer = Math.max(...l.moons.map(m => m.orbitPx + m.rPx));
    expect(outer).toBeLessThan(130);
    const tiny = layoutLocalDiagram(model, 60, 60);
    expect(tiny.R).toBe(DIAGRAM_BODY_MIN_PX);
  });
});

// ─── Breadcrumb ──────────────────────────────────────────────────────────────

describe('breadcrumb', () => {
  it('system view with nothing selected is a single current chip', () => {
    const c = buildBreadcrumb(null, null);
    expect(c).toEqual([{ kind: 'system', label: 'System', current: true, actionable: false }]);
  });

  it('system view with Earth selected offers Local as an action', () => {
    const c = buildBreadcrumb(null, 'earth');
    expect(c.map(x => x.label)).toEqual(['System', 'Earth', 'Local']);
    expect(c[0].current).toBe(false);
    expect(c[2].current).toBe(false);
    expect(c[2].actionable).toBe(true);
    expect(c[2].bodyId).toBe('earth');
  });

  it('inside a local scene, Local is current and System is the way back', () => {
    const c = buildBreadcrumb('earth', 'earth');
    expect(c.map(x => x.label)).toEqual(['System', 'Earth', 'Local']);
    expect(c[0].actionable).toBe(true);
    expect(c[2].current).toBe(true);
    expect(c[2].actionable).toBe(false);
    expect(c.filter(x => x.current).length).toBe(1);
  });

  it('nests moons under their parent', () => {
    const c = buildBreadcrumb('moon', null);
    expect(c.map(x => x.label)).toEqual(['System', 'Earth', 'Moon', 'Local']);
    expect(c[1].bodyId).toBe('earth');
    expect(c[2].bodyId).toBe('moon');
  });

  it('the scene the camera is in beats the selection', () => {
    const c = buildBreadcrumb('mars', 'earth');
    expect(c.map(x => x.label)).toEqual(['System', 'Mars', 'Local']);
  });

  it('climbs a nested chain to its root body', () => {
    expect(rootBodyId('moon')).toBe('earth');
    expect(rootBodyId('europa')).toBe('jupiter');
    expect(rootBodyId('mars')).toBe('mars');
    expect(rootBodyId('nope')).toBe('nope');
  });

  it('names bodies and locations', () => {
    expect(bodyName('earth')).toBe('Earth');
    expect(bodyName('leo')).toBe('Low Earth Orbit');
    expect(bodyName(null)).toBe('');
  });
});
