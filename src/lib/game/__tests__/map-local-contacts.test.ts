/**
 * @jest-environment node
 *
 * Graphics Phase 2, addendum (c): contact grouping per body (the Location
 * List count + the "n contacts here" chip) and the local-scene tag text.
 */
import { countContactsByBody, contactCountText } from '../map-flight';
import { contactTagText, pickTaggedContacts, LOCAL_CONTACT_TAG_CAP, type TrafficContact } from '../ship-traffic';

const transit = (id: string, a: string, b: string, over: Partial<TrafficContact> = {}): TrafficContact => ({
  id, hullClass: 'freighter', status: 'transit', laneId: `${a}|${b}`, laneA: a, laneB: b, progress: 0.4, etaMs: 90_000, ...over,
});
const holding = (id: string, loc: string, over: Partial<TrafficContact> = {}): TrafficContact => ({
  id, hullClass: 'miner', status: 'holding', locationId: loc, ...over,
});

describe('countContactsByBody', () => {
  it('groups holding contacts under the body their location belongs to (pips → parent)', () => {
    const counts = countContactsByBody([holding('a', 'leo'), holding('b', 'geo'), holding('c', 'lunar_orbit'), holding('d', 'ceres_surface')]);
    expect(counts.earth).toEqual({ holding: 2, arriving: 0, departing: 0, total: 2, revealed: 0 });
    expect(counts.moon).toEqual({ holding: 1, arriving: 0, departing: 0, total: 1, revealed: 0 });
    expect(counts.ceres).toEqual({ holding: 1, arriving: 0, departing: 0, total: 1, revealed: 0 });
  });

  it('a transit counts as arriving at its destination body and departing its origin body', () => {
    const counts = countContactsByBody([transit('t1', 'leo', 'mars_orbit')]);
    expect(counts.earth).toEqual({ holding: 0, arriving: 0, departing: 1, total: 1, revealed: 0 });
    expect(counts.mars).toEqual({ holding: 0, arriving: 1, departing: 0, total: 1, revealed: 0 });
  });

  it('a lane inside one body counts that body once', () => {
    const counts = countContactsByBody([transit('t2', 'leo', 'geo')]);
    expect(counts.earth.total).toBe(1);
    expect(counts.earth.arriving).toBe(1);
    expect(counts.earth.departing).toBe(0);
  });

  it('ignores lanes and locations with no local body (the belt region pip)', () => {
    const counts = countContactsByBody([holding('x', 'asteroid_belt'), transit('y', 'asteroid_belt', 'outer_system')]);
    expect(Object.keys(counts)).toHaveLength(0);
  });

  it('counts revealed identities', () => {
    const intel = { corpId: 'c1', corpName: 'Meridian', cargoSummary: 'Empty hold', destinationId: 'leo' };
    const counts = countContactsByBody([holding('r', 'leo', { intel }), holding('s', 'leo')]);
    expect(counts.earth.revealed).toBe(1);
    expect(contactCountText(counts.earth)).toBe('2 contacts here · 1 revealed');
    expect(contactCountText({ holding: 1, arriving: 0, departing: 0, total: 1, revealed: 0 })).toBe('1 contact here');
    expect(contactCountText(undefined)).toBe('');
  });
});

describe('contactTagText', () => {
  const asOf = 1_000_000;
  it('anonymised: hull class + ETA only, never an id', () => {
    const c = transit('c9', 'leo', 'lunar_orbit', { etaMs: 125_000 });
    const t = contactTagText(c, asOf + 5_000, asOf);
    expect(t).toBe('Freighter · ETA 2m 0s');
    expect(t).not.toContain('c9');
  });
  it('revealed: corporation + hull; NPC: honest NPC prefix; holding: no ETA', () => {
    const intel = { corpId: 'c1', corpName: 'Meridian Orbital', cargoSummary: 'Metal 120', destinationId: 'lunar_orbit' };
    expect(contactTagText(transit('r', 'leo', 'lunar_orbit', { intel, etaMs: 30_000 }), asOf, asOf)).toBe('Meridian Orbital · Freighter · ETA 30s');
    expect(contactTagText(transit('n', 'leo', 'lunar_orbit', { npc: true, etaMs: 30_000 }), asOf, asOf)).toBe('NPC freighter · ETA 30s');
    expect(contactTagText(holding('h', 'leo'), asOf, asOf)).toBe('Mining ship');
  });
  it('the ETA keeps counting down from the feed time and floors at 0', () => {
    const c = transit('c', 'leo', 'lunar_orbit', { etaMs: 10_000 });
    expect(contactTagText(c, asOf + 60_000, asOf)).toBe('Freighter · ETA 0s');
  });
});

describe('pickTaggedContacts', () => {
  it('tags transits only — revealed first, then soonest, NPC last — under the cap', () => {
    const intel = { corpId: 'c1', corpName: 'M', cargoSummary: '', destinationId: 'leo' };
    const list: TrafficContact[] = [
      holding('h', 'leo'),
      transit('npc', 'leo', 'geo', { npc: true, etaMs: 5_000 }),
      transit('late', 'leo', 'geo', { etaMs: 900_000 }),
      transit('soon', 'leo', 'geo', { etaMs: 20_000 }),
      transit('rev', 'leo', 'geo', { intel, etaMs: 500_000 }),
    ];
    expect(pickTaggedContacts(list).map(c => c.id)).toEqual(['rev', 'soon', 'late', 'npc']);
    expect(pickTaggedContacts(list, 2).map(c => c.id)).toEqual(['rev', 'soon']);
    expect(LOCAL_CONTACT_TAG_CAP).toBeGreaterThan(0);
    const many = Array.from({ length: 40 }, (_, i) => transit(`t${i}`, 'leo', 'geo', { etaMs: i * 1000 }));
    expect(pickTaggedContacts(many)).toHaveLength(LOCAL_CONTACT_TAG_CAP);
  });
});
