/**
 * @jest-environment node
 *
 * Ship traffic layer (2026-09-13) — the server-side feed builder. The
 * privacy invariants from ship-traffic-server.ts's header are pinned here:
 * per-day opaque ids, no identity without intel, own ships out, cap and
 * ordering, NPC backdrop flagged, pool cache.
 *
 * Phase 2 (2026-09-14): movement comes from SERVER ROWS. The blob half is
 * now holding contacts only, and the forged-position case — a save that
 * claims a lane it has no ShipTransit row for — is pinned here too.
 */
import {
  utcDayKey,
  anonymiseContactId,
  contactsFromProfiles,
  contactsFromTransits,
  synthesiseNpcTraffic,
  buildFeedForRequester,
  loadTrafficPool,
  loadTrafficFeed,
  rankContacts,
  hopDistances,
  __resetTrafficPoolCache,
  MAX_SHIPS_PER_PROFILE,
  TRAFFIC_POOL_TTL_MS,
  FLEET_REVEAL_ACTION_LIST,
  type TrafficSourceProfile,
  type PooledContact,
} from '../ship-traffic-server';
import { LANES } from '../spatial-strategy';
import { TRAFFIC_FEED_CAP } from '../ship-traffic';
import { TRANSIT_ARRIVED, TRANSIT_IN_FLIGHT, type TrafficTransitRow } from '../ship-transit';

const NOW = Date.UTC(2026, 8, 13, 12, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

function ship(over: Record<string, unknown> = {}) {
  return {
    instanceId: 'ship-A', definitionId: 'freighter', name: 'SN Endeavour', status: 'idle',
    currentLocation: 'leo', isBuilt: true, ...over,
  };
}

function inTransit(from: string, to: string, departedAtMs: number, arrivalAtMs: number, extra: Record<string, unknown> = {}) {
  return ship({ status: 'in_transit', currentLocation: from, route: { from, to, departedAtMs, arrivalAtMs, cargo: { metal: 120, water: 40 } }, ...extra });
}

const profile = (id: string, companyName: string, ships: unknown[]): TrafficSourceProfile => ({ id, companyName, shipsData: ships });

/** A server movement row — what the feed actually places a hull from. */
function row(over: Partial<TrafficTransitRow> = {}): TrafficTransitRow {
  return {
    profileId: 'p1', shipInstanceId: 'ship-A', shipDefinitionId: 'freighter',
    originId: 'leo', destinationId: 'lunar_orbit',
    departedAtMs: NOW - 30_000, arrivesAtMs: NOW + 90_000,
    status: TRANSIT_IN_FLIGHT, cargo: { metal: 120, water: 40 }, ...over,
  };
}
const transitsOf = (rows: TrafficTransitRow[], profiles: TrafficSourceProfile[]) =>
  contactsFromTransits(rows, profiles, NOW, '2026-09-13', 's').contacts;

beforeEach(() => { __resetTrafficPoolCache(); });

describe('anonymiseContactId', () => {
  it('is stable within a day, differs across days and secrets, and never contains the inputs', () => {
    const a = anonymiseContactId('ship-A', 'profile-1', '2026-09-13', 's');
    const b = anonymiseContactId('ship-A', 'profile-1', '2026-09-13', 's');
    const next = anonymiseContactId('ship-A', 'profile-1', '2026-09-14', 's');
    const other = anonymiseContactId('ship-A', 'profile-1', '2026-09-13', 't');
    expect(a).toBe(b);
    expect(a).not.toBe(next);
    expect(a).not.toBe(other);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(a).not.toContain('ship');
    expect(a).not.toContain('profile');
  });
  it('utcDayKey is the UTC date', () => {
    expect(utcDayKey(NOW)).toBe('2026-09-13');
    expect(utcDayKey(NOW + DAY)).toBe('2026-09-14');
  });
});

describe('contactsFromTransits', () => {
  const profiles = [profile('p1', 'Acme', [ship({ instanceId: 'ship-A', definitionId: 'freighter' })])];

  it('derives transit progress and ETA from the SERVER row timestamps', () => {
    const pool = transitsOf([row()], profiles);
    expect(pool).toHaveLength(1);
    const c = pool[0].pub;
    expect(c.status).toBe('transit');
    expect(c.laneId).toBe('leo_lunar_orbit');
    expect(c.laneA).toBe('leo');
    expect(c.laneB).toBe('lunar_orbit');
    expect(c.progress).toBeCloseTo(0.25, 6);
    expect(c.etaMs).toBe(90_000);
    expect(c.hullClass).toBe('freighter');
    expect(pool[0].ownerId).toBe('p1');
    expect(pool[0].destinationId).toBe('lunar_orbit');
  });

  it('expresses progress from laneA to laneB even when the ship flies the lane backwards', () => {
    // lunar_orbit → leo: canonical key is leo|lunar_orbit, so 25% flown = 0.75 along A→B.
    const pool = transitsOf([row({ originId: 'lunar_orbit', destinationId: 'leo' })], profiles);
    expect(pool[0].pub.laneA).toBe('leo');
    expect(pool[0].pub.progress).toBeCloseTo(0.75, 6);
    expect(pool[0].destinationId).toBe('leo');
  });

  it('a row whose arrival has passed is ARRIVED, synced owner or not', () => {
    const live = transitsOf([row({ destinationId: 'ceres_surface', departedAtMs: NOW - 200_000, arrivesAtMs: NOW - 1 })], profiles);
    expect(live[0].pub).toMatchObject({ status: 'holding', locationId: 'ceres_surface' });
    const landed = transitsOf([row({ destinationId: 'ceres_surface', status: TRANSIT_ARRIVED, arrivesAtMs: NOW - 1 })], profiles);
    expect(landed[0].pub).toMatchObject({ status: 'holding', locationId: 'ceres_surface' });
  });

  it('drops rows whose owner is not in the active, non-QA profile set', () => {
    expect(transitsOf([row({ profileId: 'not-active' })], profiles)).toHaveLength(0);
  });

  it('keeps only the newest leg per hull and caps rows per profile', () => {
    const two = transitsOf([row({ destinationId: 'lunar_orbit' }), row({ destinationId: 'ceres_surface' })], profiles);
    expect(two).toHaveLength(1);
    expect(two[0].destinationId).toBe('lunar_orbit');
    const many = Array.from({ length: MAX_SHIPS_PER_PROFILE + 25 }, (_, i) => row({ shipInstanceId: `s${i}` }));
    expect(transitsOf(many, profiles)).toHaveLength(MAX_SHIPS_PER_PROFILE);
  });

  it('falls back to the synced definition id for a hull the row does not name (mining projection)', () => {
    const mined = [profile('p1', 'Acme', [ship({ instanceId: 'ship-A', definitionId: 'asteroid_miner' })])];
    expect(transitsOf([row({ shipDefinitionId: '' })], mined)[0].pub.hullClass).toBe('miner');
  });
});

describe('contactsFromProfiles', () => {
  it('places a HOLD for a stationary ship and nothing at all for a blob transit claim', () => {
    const pool = contactsFromProfiles([profile('p1', 'Acme', [
      ship({ instanceId: 'a', status: 'mining', currentLocation: 'asteroid_belt', definitionId: 'asteroid_miner' }),
      // A forged position: the save says mid-lane, no server row says so.
      inTransit('leo', 'lunar_orbit', NOW - 30_000, NOW + 90_000, { instanceId: 'forged' }),
      ship({ instanceId: 'b', isBuilt: false }),
      ship({ instanceId: 'c', status: 'building' }),
      ship({ instanceId: 'd', status: 'expedition', definitionId: 'starfarer_explorer' }),
      { garbage: true },
    ])], NOW);
    expect(pool).toHaveLength(1);
    expect(pool[0].pub).toMatchObject({ status: 'holding', locationId: 'asteroid_belt', hullClass: 'miner' });
    expect(pool.some(c => c.pub.status === 'transit')).toBe(false);
  });

  it('skips a hull the transit pass already placed and shares its per-profile budget', () => {
    const profiles = [profile('p1', 'Acme', [
      ship({ instanceId: 'ship-A' }),
      ship({ instanceId: 'ship-B', currentLocation: 'leo' }),
    ])];
    const moving = contactsFromTransits([row({ shipInstanceId: 'ship-A' })], profiles, NOW, '2026-09-13', 's');
    const held = contactsFromProfiles(profiles, NOW, '2026-09-13', 's', moving.coverage);
    expect(held).toHaveLength(1);
    expect(held[0].pub.id).not.toBe(moving.contacts[0].pub.id);
    // ship-A is not placed twice, and the budget carries across.
    expect(moving.coverage.used.get('p1')).toBe(1);
  });

  it('caps ships per profile', () => {
    const ships = Array.from({ length: MAX_SHIPS_PER_PROFILE + 25 }, (_, i) => ship({ instanceId: `s${i}` }));
    expect(contactsFromProfiles([profile('p1', 'Acme', ships)], NOW)).toHaveLength(MAX_SHIPS_PER_PROFILE);
  });
});

describe('synthesiseNpcTraffic', () => {
  it('covers every lane with flagged, faction-hinted, deterministic contacts', () => {
    const a = synthesiseNpcTraffic(NOW, '2026-09-13', 's');
    const b = synthesiseNpcTraffic(NOW, '2026-09-13', 's');
    expect(a.map(c => c.pub)).toEqual(b.map(c => c.pub));
    expect(a.length).toBeGreaterThanOrEqual(LANES.length);
    expect(a.length).toBeLessThan(80);
    const laneIds = new Set(a.map(c => c.pub.laneId));
    for (const lane of LANES) expect(laneIds.has(lane.id)).toBe(true);
    for (const c of a) {
      expect(c.pub.npc).toBe(true);
      expect(c.pub.factionHint).toBeTruthy();
      expect(c.ownerId).toBeNull();
      expect(c.pub.laneA! < c.pub.laneB!).toBe(true);
      expect(c.pub.progress).toBeGreaterThanOrEqual(0);
      expect(c.pub.progress).toBeLessThanOrEqual(1);
    }
    // They move: a later instant gives different positions.
    const later = synthesiseNpcTraffic(NOW + 60_000, '2026-09-13', 's');
    expect(later.some((c, i) => c.pub.progress !== a[i].pub.progress)).toBe(true);
  });
});

describe('buildFeedForRequester', () => {
  const pool = (): PooledContact[] => {
    const profiles = [
      profile('me', 'My Corp', [inTransit('leo', 'lunar_orbit', NOW - 10_000, NOW + 10_000)]),
      profile('p1', 'Acme Haulage', [inTransit('leo', 'lunar_orbit', NOW - 10_000, NOW + 10_000, { instanceId: 'acme-1' })]),
      profile('p2', 'Belt Ventures', [ship({ instanceId: 'belt-1', status: 'mining', currentLocation: 'ceres_surface', definitionId: 'ore_harvester' })]),
    ];
    const rows: TrafficTransitRow[] = [
      row({ profileId: 'me', shipInstanceId: 'ship-A', departedAtMs: NOW - 10_000, arrivesAtMs: NOW + 10_000 }),
      row({ profileId: 'p1', shipInstanceId: 'acme-1', departedAtMs: NOW - 10_000, arrivesAtMs: NOW + 10_000 }),
    ];
    const moving = contactsFromTransits(rows, profiles, NOW, '2026-09-13', 's');
    return [
      ...moving.contacts,
      ...contactsFromProfiles(profiles, NOW, '2026-09-13', 's', moving.coverage),
      ...synthesiseNpcTraffic(NOW, '2026-09-13', 's'),
    ];
  };

  it('excludes the requester\'s own ships and leaks no identity without intel', () => {
    const feed = buildFeedForRequester({ pool: pool(), requesterId: 'me', holdings: ['leo'], revealedOwners: new Set(), nowMs: NOW });
    const json = JSON.stringify(feed);
    expect(json).not.toContain('My Corp');
    expect(json).not.toContain('Acme');
    expect(json).not.toContain('Belt Ventures');
    expect(json).not.toContain('"p1"');
    expect(json).not.toContain('"p2"');
    expect(json).not.toContain('acme-1');
    expect(json).not.toContain('ownerId');
    expect(json).not.toContain('cargo');
    // hull CLASS ('miner') is fine; the definition id (ore_harvester) is not
    expect(json).not.toContain('ore_harvester');
    expect(feed.revealed).toBe(0);
    // own ship (same lane, same timestamps) is gone: only p1's transit + p2's hold + NPCs
    expect(feed.contacts.filter(c => !c.npc)).toHaveLength(2);
    expect(feed.asOfMs).toBe(NOW);
  });

  it('attaches identity only for owners in the active reveal set', () => {
    const feed = buildFeedForRequester({ pool: pool(), requesterId: 'me', holdings: ['leo'], revealedOwners: new Set(['p1']), nowMs: NOW });
    const revealed = feed.contacts.filter(c => c.intel);
    expect(revealed).toHaveLength(1);
    expect(revealed[0].intel).toEqual({ corpId: 'p1', corpName: 'Acme Haulage', cargoSummary: expect.stringContaining('120'), destinationId: 'lunar_orbit' });
    expect(feed.revealed).toBe(1);
    // p2 stays anonymous
    expect(JSON.stringify(feed)).not.toContain('Belt Ventures');
    // an expired/absent reveal (set without p1) attaches nothing
    const none = buildFeedForRequester({ pool: pool(), requesterId: 'me', holdings: ['leo'], revealedOwners: new Set(['p2-expired-elsewhere']), nowMs: NOW });
    expect(none.contacts.every(c => !c.intel)).toBe(true);
  });

  it('orders nearest to the requester\'s holdings first, player traffic before NPC at equal distance', () => {
    const feed = buildFeedForRequester({ pool: pool(), requesterId: 'me', holdings: ['ceres_surface'], revealedOwners: new Set(), nowMs: NOW });
    expect(feed.contacts[0]).toMatchObject({ status: 'holding', locationId: 'ceres_surface' });
    const dist = hopDistances(['ceres_surface']);
    expect(dist.get('ceres_surface')).toBe(0);
    expect(dist.get('asteroid_belt')).toBe(1);
    expect(dist.get('leo')).toBe(2);
    const ranked = rankContacts(pool().filter(c => c.ownerId !== 'me'), ['leo']);
    // first entries are on the leo lanes; a player hull precedes NPC hulls on the same lane
    expect(ranked[0].ownerId).toBe('p1');
  });

  it('caps the feed and reports the true total', () => {
    const ships = Array.from({ length: 60 }, (_, i) => inTransit('leo', 'lunar_orbit', NOW - 1000, NOW + 1000, { instanceId: `s${i}` }));
    const rows = Array.from({ length: 60 }, (_, i) => row({ shipInstanceId: `s${i}`, departedAtMs: NOW - 1000, arrivesAtMs: NOW + 1000 }));
    const big = transitsOf(rows, [profile('p1', 'Acme', ships)]);
    const feed = buildFeedForRequester({ pool: big, requesterId: 'me', holdings: ['leo'], revealedOwners: new Set(), nowMs: NOW, cap: 25 });
    expect(feed.contacts).toHaveLength(25);
    expect(feed.total).toBe(60);
    expect(feed.capped).toBe(true);
    expect(TRAFFIC_FEED_CAP).toBe(2000);
  });
});

describe('pool cache + loader', () => {
  it('builds the pool once per TTL and again on a new UTC day', async () => {
    const loadProfiles = jest.fn(async () => [profile('p1', 'Acme', [ship()])]);
    // loadTransits is optional: a lagging schema degrades to holds + NPCs.
    await loadTrafficPool({ loadProfiles }, NOW);
    await loadTrafficPool({ loadProfiles }, NOW + 10_000);
    expect(loadProfiles).toHaveBeenCalledTimes(1);
    await loadTrafficPool({ loadProfiles }, NOW + TRAFFIC_POOL_TTL_MS + 1);
    expect(loadProfiles).toHaveBeenCalledTimes(2);
    __resetTrafficPoolCache();
    await loadTrafficPool({ loadProfiles }, NOW + DAY - 30_000);
    await loadTrafficPool({ loadProfiles }, NOW + DAY - 20_000);
    expect(loadProfiles).toHaveBeenCalledTimes(3);
  });

  it('loadTrafficFeed wires reveals through and rotates ids across days', async () => {
    const deps = {
      loadProfiles: async () => [profile('p1', 'Acme', [ship()]), profile('me', 'Me', [ship({ instanceId: 'mine' })])],
      loadTransits: async () => [] as TrafficTransitRow[],
      loadRevealedOwners: jest.fn(async () => ['p1']),
    };
    const today = await loadTrafficFeed(deps, { id: 'me', holdings: ['leo'] }, NOW);
    expect(deps.loadRevealedOwners).toHaveBeenCalledWith('me', NOW);
    const mine = today.contacts.filter(c => !c.npc);
    expect(mine).toHaveLength(1);
    expect(mine[0].intel?.corpName).toBe('Acme');
    __resetTrafficPoolCache();
    const tomorrow = await loadTrafficFeed(deps, { id: 'me', holdings: ['leo'] }, NOW + DAY);
    expect(tomorrow.contacts.filter(c => !c.npc)[0].id).not.toBe(mine[0].id);
  });

  it('the reveal action list names fleet_tracking and trade_route_intel', () => {
    expect(FLEET_REVEAL_ACTION_LIST).toEqual(expect.arrayContaining(['fleet_tracking', 'trade_route_intel']));
  });
});
