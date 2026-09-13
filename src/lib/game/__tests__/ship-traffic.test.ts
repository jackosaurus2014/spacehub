/**
 * @jest-environment node
 *
 * Ship traffic layer (2026-09-13) — the renderer-neutral half: hull class
 * derivation, labels, and the placeContacts() maths both solar renderers
 * share.
 */
import {
  hullClassOf,
  contactLabel,
  contactDetail,
  liveProgress,
  placeContacts,
  contactPhase,
  corpRingColor,
  TRAFFIC_RENDER_CAP,
  type TrafficContact,
  type ContactAnchor,
} from '../ship-traffic';

const ANCHORS: Record<string, ContactAnchor> = {
  leo: { pos: [0, 0, 0], r: 0.2 },
  lunar_orbit: { pos: [10, 0, 0], r: 0.3 },
  ceres_surface: { pos: [0, 0, 20], r: 0.4 },
};

const transit = (over: Partial<TrafficContact> = {}): TrafficContact => ({
  id: 'c1', hullClass: 'freighter', status: 'transit',
  laneId: 'leo_lunar_orbit', laneA: 'leo', laneB: 'lunar_orbit', progress: 0.5, etaMs: 60_000,
  ...over,
});

describe('hullClassOf', () => {
  it('maps definitions to categories, never exposing the definition id', () => {
    expect(hullClassOf('freighter')).toBe('freighter');
    expect(hullClassOf('heavy_transport')).toBe('freighter');
    expect(hullClassOf('asteroid_miner')).toBe('miner');
    expect(hullClassOf('survey_probe')).toBe('survey');
    expect(hullClassOf('fuel_tanker')).toBe('tanker');
    expect(hullClassOf('servicer_tug')).toBe('servicer');
    expect(hullClassOf('colony_ark')).toBe('ark');
    expect(hullClassOf('starfarer_explorer')).toBe('flagship');
    expect(hullClassOf('no_such_ship')).toBe('freighter');
  });
});

describe('contactLabel / contactDetail', () => {
  it('anonymised contacts read as hull + lane, with no id', () => {
    const label = contactLabel(transit());
    expect(label).toBe('Freighter · Low Earth Orbit–Lunar Orbit lane');
    expect(label).not.toContain('c1');
  });
  it('holding contacts name the location; NPC contacts say so', () => {
    expect(contactLabel({ id: 'h', hullClass: 'miner', status: 'holding', locationId: 'ceres_surface' })).toMatch(/^Mining ship · /);
    expect(contactLabel(transit({ npc: true, factionHint: 'the-syndicate' }))).toMatch(/^NPC freighter · /);
  });
  it('revealed contacts show corporation and destination', () => {
    const c = transit({ intel: { corpId: 'p9', corpName: 'Meridian Orbital', cargoSummary: 'Metal 120', destinationId: 'lunar_orbit' } });
    expect(contactLabel(c)).toBe('Meridian Orbital · Freighter → Lunar Orbit');
    expect(contactDetail(c, 1_000, 0)).toContain('Metal 120');
    expect(contactDetail(transit(), 0, 0)).toContain('Identity: not held');
  });
});

describe('liveProgress', () => {
  it('extrapolates from the feed asOf at the ship speed implied by the ETA', () => {
    // 0.5 done with 60 s to go → after 30 s the ship is at 0.75.
    expect(liveProgress(0.5, 60_000, 30_000, 0)).toBeCloseTo(0.75, 6);
    expect(liveProgress(0.5, 60_000, 120_000, 0)).toBe(1);
    expect(liveProgress(0.5, 60_000, 0, 0)).toBe(0.5);
    expect(liveProgress(0.5, undefined, 30_000, 0)).toBe(0.5);
    expect(liveProgress(1.4, 60_000, 0, 0)).toBe(1);
  });
});

describe('placeContacts', () => {
  it('a transit contact sits on its endpoints at progress 0 and 1', () => {
    const at0 = placeContacts([transit({ progress: 0, etaMs: 100 })], ANCHORS, 0, { asOfMs: 0 });
    const at1 = placeContacts([transit({ progress: 1, etaMs: 0 })], ANCHORS, 0, { asOfMs: 0 });
    expect(at0[0].pos).toEqual([0, 0, 0]);
    expect(at1[0].pos).toEqual([10, 0, 0]);
    expect(at0[0].progress).toBe(0);
    expect(at1[0].progress).toBe(1);
  });
  it('mid-lane the arc lifts off the chord in +y (3D) and stays in-plane for 2D', () => {
    const p3 = placeContacts([transit({ progress: 0.5 })], ANCHORS, 0, { asOfMs: 0, plane: 'xz' })[0];
    expect(p3.pos[0]).toBeCloseTo(5, 6);
    expect(p3.pos[1]).toBeGreaterThan(0.2);
    expect(p3.heading).not.toBeNull();
    const h = p3.heading!;
    expect(Math.hypot(h[0], h[1], h[2])).toBeCloseTo(1, 6);
    expect(h[0]).toBeGreaterThan(0); // heading toward laneB
    const p2 = placeContacts([transit({ progress: 0.5 })], ANCHORS, 0, { asOfMs: 0, plane: 'xy' })[0];
    expect(p2.pos[2]).toBe(0);
    expect(p2.pos[0]).toBeCloseTo(5, 6);
  });
  it('extrapolates transit progress from asOf to now', () => {
    const c = transit({ progress: 0.5, etaMs: 60_000 });
    const later = placeContacts([c], ANCHORS, 30_000, { asOfMs: 0 })[0];
    expect(later.progress).toBeCloseTo(0.75, 6);
    expect(later.pos[0]).toBeGreaterThan(5);
  });
  it('holding contacts orbit their anchor outside its radius, static under reduced motion', () => {
    const c: TrafficContact = { id: 'hold-1', hullClass: 'miner', status: 'holding', locationId: 'ceres_surface' };
    const a = placeContacts([c], ANCHORS, 0, { staticOrbit: true, orbitGap: 0.5 })[0];
    const b = placeContacts([c], ANCHORS, 5_000, { staticOrbit: true, orbitGap: 0.5 })[0];
    expect(a.pos).toEqual(b.pos); // pinned
    const d = Math.hypot(a.pos[0] - 0, a.pos[2] - 20);
    expect(d).toBeCloseTo(0.4 + 0.5, 6);
    expect(a.heading).toBeNull();
    const moving = placeContacts([c], ANCHORS, 5_000, { staticOrbit: false, orbitGap: 0.5 })[0];
    expect(moving.pos).not.toEqual(a.pos);
  });
  it('drops contacts whose lane endpoints or location the renderer cannot place', () => {
    const out = placeContacts([
      transit({ id: 'ok' }),
      transit({ id: 'bad-lane', laneA: 'leo', laneB: 'alpha_centauri' }),
      { id: 'bad-loc', hullClass: 'survey', status: 'holding', locationId: 'nowhere' },
      transit({ id: 'no-progress', progress: undefined }),
    ], ANCHORS, 0);
    expect(out.map(p => p.contact.id)).toEqual(['ok']);
  });
  it('never places more than the render cap', () => {
    const many = Array.from({ length: TRAFFIC_RENDER_CAP + 50 }, (_, i) => transit({ id: `c${i}` }));
    expect(placeContacts(many, ANCHORS, 0).length).toBe(TRAFFIC_RENDER_CAP);
  });
  it('spreads two contacts on the same lane onto opposite arcs when their phases differ', () => {
    // Find two ids on opposite sides of the phase split.
    const ids = Array.from({ length: 40 }, (_, i) => `id-${i}`);
    const left = ids.find(id => contactPhase(id) < 0.5)!;
    const right = ids.find(id => contactPhase(id) >= 0.5)!;
    const [a, b] = placeContacts([transit({ id: left }), transit({ id: right })], ANCHORS, 0, { plane: 'xy' });
    expect(Math.sign(a.pos[1])).not.toBe(Math.sign(b.pos[1]));
  });
});

describe('corpRingColor', () => {
  it('is stable per corporation and differs between corporations', () => {
    expect(corpRingColor('corp-a')).toBe(corpRingColor('corp-a'));
    expect(corpRingColor('corp-a')).not.toBe(corpRingColor('corp-b'));
    expect(corpRingColor('corp-a')).toMatch(/^hsl\(/);
  });
});
