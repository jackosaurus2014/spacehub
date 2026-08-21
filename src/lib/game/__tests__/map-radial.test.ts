/**
 * @jest-environment node
 *
 * Wave A2 (map as command theater, item 1) — the radial command menu's pure
 * halves: the action-set derivation and the arc geometry.
 */
import {
  deriveRadialActions,
  deriveSystemRadialActions,
  computeRadialLayout,
  cycleRadialIndex,
  RADIAL_DEFAULT_ITEM_RADIUS,
  RADIAL_DEFAULT_PADDING,
  type RadialActionId,
} from '../map-radial';
import { ORBITAL_SLOT_MAP } from '../spatial-strategy';
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
    corporationTier: 5,
    ...overrides,
  } as GameState;
}

function ship(instanceId: string, currentLocation: string, status: string) {
  return {
    instanceId,
    definitionId: 'freighter_small',
    name: instanceId,
    currentLocation,
    status,
    isBuilt: true,
    purchasedAtMs: fixedNow - 100_000,
  };
}

function ids(state: GameState, locId: string): RadialActionId[] {
  return deriveRadialActions(state, locId, fixedNow).map(a => a.id);
}

function find(state: GameState, locId: string, id: RadialActionId) {
  return deriveRadialActions(state, locId, fixedNow).find(a => a.id === id)!;
}

describe('deriveRadialActions: composition', () => {
  it('always offers Detail, Build, Dispatch, Demand and Orders', () => {
    const list = ids(makeState(), 'leo');
    for (const id of ['detail', 'build', 'dispatch', 'demand', 'orders'] as RadialActionId[]) {
      expect(list).toContain(id);
    }
  });

  it('opens with Detail so the pre-A2 click-to-panel route is first', () => {
    expect(ids(makeState(), 'leo')[0]).toBe('detail');
  });

  it('offers Unlock only while the location is locked', () => {
    expect(ids(makeState(), 'leo')).not.toContain('unlock');
    expect(ids(makeState(), 'mars_surface')).toContain('unlock');
  });

  it('offers Slots only where a finite orbital-slot pool exists', () => {
    expect(ORBITAL_SLOT_MAP.has('geo')).toBe(true);
    expect(ids(makeState(), 'geo')).toContain('slots');
    expect(ids(makeState(), 'earth_surface')).not.toContain('slots');
    expect(ids(makeState(), 'leo')).not.toContain('slots');
  });

  it('is order-stable across state changes so the ring never reshuffles', () => {
    const a = ids(makeState(), 'geo');
    const b = ids(makeState({ money: 1, ships: [ship('s1', 'leo', 'idle')] as never }), 'geo');
    expect(a).toEqual(b);
  });

  it('every action carries a description, and every disabled one carries a reason', () => {
    for (const locId of ['leo', 'geo', 'mars_surface']) {
      for (const a of deriveRadialActions(makeState(), locId, fixedNow)) {
        expect(a.label.length).toBeGreaterThan(0);
        expect(a.description.length).toBeGreaterThan(8);
        if (!a.enabled) expect((a.reason || '').length).toBeGreaterThan(4);
      }
    }
  });
});

describe('deriveRadialActions: disabled-with-reason gating', () => {
  it('disables Build and Dispatch at a locked location, naming the location', () => {
    const state = makeState();
    const build = find(state, 'mars_surface', 'build');
    expect(build.enabled).toBe(false);
    expect(build.reason).toContain('Unlock');
    expect(find(state, 'mars_surface', 'dispatch').enabled).toBe(false);
  });

  it('explains an unaffordable unlock as a shortfall, not a research gap', () => {
    const state = makeState({ money: 10, completedResearch: ['super_heavy_lift', 'ion_drives', 'resource_prospecting'] });
    const unlock = find(state, 'mars_surface', 'unlock');
    expect(unlock.enabled).toBe(false);
    expect(unlock.reason).toMatch(/Need .* more/);
  });

  it('explains a missing research prerequisite by name', () => {
    const unlock = find(makeState(), 'mars_surface', 'unlock');
    expect(unlock.reason).toContain('Research required');
    expect(unlock.reason).toContain('super heavy lift');
  });

  it('enables Unlock once research and money are both satisfied', () => {
    const state = makeState({ completedResearch: ['super_heavy_lift', 'ion_drives', 'resource_prospecting'] });
    expect(find(state, 'mars_surface', 'unlock').enabled).toBe(true);
  });

  it('passes the orbital slot gate reason through verbatim', () => {
    const state = makeState({
      orbitalSlotOccupancy: { geo: { occupiedCount: 179, bucket: 'saturated' } },
    });
    const build = find(state, 'geo', 'build');
    expect(build.enabled).toBe(false);
    expect(build.reason).toContain('saturated');
    expect(build.reason).toContain('slot-lease auction');
  });

  it('re-enables Build at a saturated pool when you hold a lease', () => {
    const state = makeState({
      orbitalSlotOccupancy: { geo: { occupiedCount: 179, bucket: 'saturated' } },
      orbitalSlotLeases: [{ locationId: 'geo', expiresAtMs: fixedNow + 86_400_000 }],
    });
    expect(find(state, 'geo', 'build').enabled).toBe(true);
  });

  it('distinguishes "no ships at all" from "no idle ships"', () => {
    expect(find(makeState(), 'geo', 'dispatch').reason).toContain('no ships yet');
    const busy = makeState({ ships: [ship('s1', 'leo', 'mining')] as never });
    expect(find(busy, 'geo', 'dispatch').reason).toContain('No idle ships');
  });

  it('enables Dispatch and counts the idle ships elsewhere', () => {
    const state = makeState({
      ships: [ship('s1', 'leo', 'idle'), ship('s2', 'earth_surface', 'idle'), ship('s3', 'geo', 'idle')] as never,
    });
    const dispatch = find(state, 'geo', 'dispatch');
    expect(dispatch.enabled).toBe(true);
    expect(dispatch.detail).toBe('2 idle');
  });

  it('gates the tier-locked navigation actions with a tier reason', () => {
    const rookie = makeState({ corporationTier: 1 });
    const demand = find(rookie, 'geo', 'demand');
    expect(demand.enabled).toBe(false);
    expect(demand.reason).toMatch(/Tier|grows/);
    const slots = find(rookie, 'geo', 'slots');
    expect(slots.enabled).toBe(false);
    expect(slots.reason).toContain('Tier');
  });

  it('shows live slot occupancy on the Slots action', () => {
    const synced = makeState({ orbitalSlotOccupancy: { geo: { occupiedCount: 40, bucket: 'medium' } } });
    expect(find(synced, 'geo', 'slots').detail).toBe('40/180 slots');
    expect(find(makeState(), 'geo', 'slots').detail).toContain('you 0');
  });
});

describe('computeRadialLayout', () => {
  const base = { count: 6, viewportW: 1200, viewportH: 800 };

  it('centres on the click point when there is room', () => {
    const l = computeRadialLayout({ ...base, anchorX: 600, anchorY: 400 });
    expect(l.centerX).toBe(600);
    expect(l.centerY).toBe(400);
    expect(l.displaced).toBe(false);
  });

  it('starts at 12 oclock and runs clockwise', () => {
    const l = computeRadialLayout({ ...base, anchorX: 600, anchorY: 400 });
    expect(l.items[0].x).toBeCloseTo(l.centerX, 6);
    expect(l.items[0].y).toBeLessThan(l.centerY); // above the centre
    expect(l.items[1].x).toBeGreaterThan(l.centerX); // then clockwise
  });

  it('spaces items evenly around the full circle', () => {
    const l = computeRadialLayout({ ...base, count: 4, anchorX: 600, anchorY: 400 });
    const step = l.items[1].angleRad - l.items[0].angleRad;
    expect(step).toBeCloseTo(Math.PI / 2, 6);
    for (const it of l.items) {
      const d = Math.hypot(it.x - l.centerX, it.y - l.centerY);
      expect(d).toBeCloseTo(l.radius, 6);
    }
  });

  it('slides inward near an edge so every target stays on screen', () => {
    const l = computeRadialLayout({ ...base, anchorX: 4, anchorY: 4 });
    expect(l.displaced).toBe(true);
    for (const it of l.items) {
      expect(it.x - RADIAL_DEFAULT_ITEM_RADIUS).toBeGreaterThanOrEqual(RADIAL_DEFAULT_PADDING - 0.001);
      expect(it.y - RADIAL_DEFAULT_ITEM_RADIUS).toBeGreaterThanOrEqual(RADIAL_DEFAULT_PADDING - 0.001);
    }
    expect(l.anchorX).toBe(4); // the tether still points at the real click
    expect(l.anchorY).toBe(4);
  });

  it('keeps every target on screen at a 375px phone viewport, all four corners', () => {
    const W = 375, H = 560;
    for (const [ax, ay] of [[0, 0], [W, 0], [0, H], [W, H], [W / 2, H / 2]]) {
      const l = computeRadialLayout({ count: 7, anchorX: ax, anchorY: ay, viewportW: W, viewportH: H, radius: 84 });
      for (const it of l.items) {
        expect(it.x - RADIAL_DEFAULT_ITEM_RADIUS).toBeGreaterThanOrEqual(-0.001);
        expect(it.x + RADIAL_DEFAULT_ITEM_RADIUS).toBeLessThanOrEqual(W + 0.001);
        expect(it.y - RADIAL_DEFAULT_ITEM_RADIUS).toBeGreaterThanOrEqual(-0.001);
        expect(it.y + RADIAL_DEFAULT_ITEM_RADIUS).toBeLessThanOrEqual(H + 0.001);
      }
    }
  });

  it('shrinks the ring rather than overflowing a tiny container', () => {
    const l = computeRadialLayout({ count: 6, anchorX: 50, anchorY: 50, viewportW: 200, viewportH: 200 });
    expect(l.radius).toBeLessThan(96);
    expect(l.radius).toBeGreaterThan(0);
  });

  it('never divides by zero on a degenerate count', () => {
    const l = computeRadialLayout({ count: 0, anchorX: 10, anchorY: 10, viewportW: 800, viewportH: 600 });
    expect(l.items).toHaveLength(1);
    expect(Number.isFinite(l.items[0].x)).toBe(true);
  });
});

describe('cycleRadialIndex', () => {
  it('wraps in both directions', () => {
    expect(cycleRadialIndex(0, -1, 5)).toBe(4);
    expect(cycleRadialIndex(4, 1, 5)).toBe(0);
    expect(cycleRadialIndex(2, 1, 5)).toBe(3);
    expect(cycleRadialIndex(0, 1, 0)).toBe(0);
  });
});

// ─── Wave A4 — the galactic action set ──────────────────────────────────────
// The solar arc's verbs (build / dispatch / slots / demand) do not exist at a
// star four light-years away. These tests pin the two action sets apart and
// hold the galactic gating to the same rule the expedition planner enforces.

describe('deriveSystemRadialActions', () => {
  it('never offers a location-shaped verb at a star system', () => {
    const actions = deriveSystemRadialActions(makeState(), 'proxima_centauri');
    const ids = actions.map(a => a.id);
    for (const solarOnly of ['build', 'dispatch', 'slots', 'demand', 'unlock', 'orders']) {
      expect(ids).not.toContain(solarOnly);
    }
    expect(ids.every(id => id.startsWith('sys-'))).toBe(true);
  });

  it('is order-stable so the ring never reshuffles under the cursor', () => {
    const a = deriveSystemRadialActions(makeState(), 'sirius').map(x => x.id);
    const b = deriveSystemRadialActions(
      makeState({ completedResearch: ['jump_drive'], resources: { exotic_fuel: 9_999 } }),
      'sirius',
    ).map(x => x.id);
    expect(a).toEqual(b);
    expect(a[0]).toBe('sys-detail'); // 'open the dossier' is always first
  });

  it('always keeps Dossier available, even on an unknown system', () => {
    const actions = deriveSystemRadialActions(makeState(), 'not_a_system');
    const detail = actions.find(a => a.id === 'sys-detail')!;
    expect(detail.enabled).toBe(true);
  });

  it('blocks the expedition verb with the REAL reason, never by hiding it', () => {
    const fresh = deriveSystemRadialActions(makeState(), 'proxima_centauri');
    const exp = fresh.find(a => a.id === 'sys-expedition')!;
    expect(exp.enabled).toBe(false);
    expect(exp.reason).toMatch(/research required/i);

    const researched = deriveSystemRadialActions(
      makeState({ completedResearch: ['jump_drive'], resources: { exotic_fuel: 1 } }),
      'proxima_centauri',
    ).find(a => a.id === 'sys-expedition')!;
    expect(researched.enabled).toBe(false);
    expect(researched.reason).toMatch(/exotic fuel/i);

    const fuelled = deriveSystemRadialActions(
      makeState({ completedResearch: ['jump_drive'], resources: { exotic_fuel: 100_000 } }),
      'proxima_centauri',
    ).find(a => a.id === 'sys-expedition')!;
    // Research and fuel are satisfied; the only remaining blocker is the hull.
    expect(fuelled.enabled).toBe(false);
    expect(fuelled.reason).toMatch(/Starfarer|Colony Ark/i);
  });

  it('reports the research prerequisite count without ever disabling the route to it', () => {
    const blocked = deriveSystemRadialActions(makeState(), 'sirius').find(a => a.id === 'sys-research')!;
    expect(blocked.enabled).toBe(true);
    expect(blocked.detail).toMatch(/missing/);

    const done = deriveSystemRadialActions(
      makeState({ completedResearch: ['jump_drive', 'exotic_matter_refining', 'heavy_radiation_shielding'] }),
      'sirius',
    ).find(a => a.id === 'sys-research')!;
    expect(done.detail).toBe('complete');
  });

  it('gates the shipyard on the Fleet tab, with the tier reason spelled out', () => {
    const locked = deriveSystemRadialActions(makeState({ corporationTier: 1 }), 'wolf_359')
      .find(a => a.id === 'sys-fleet')!;
    if (!locked.enabled) expect(locked.reason).toBeTruthy();
    const open = deriveSystemRadialActions(makeState({ corporationTier: 5 }), 'wolf_359')
      .find(a => a.id === 'sys-fleet')!;
    expect(open.enabled).toBe(true);
  });

  it('gives every action a description and a non-empty label', () => {
    for (const a of deriveSystemRadialActions(makeState(), 'alpha_centauri')) {
      expect(a.label.length).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(0);
      if (!a.enabled) expect(a.reason).toBeTruthy();
    }
  });
});
