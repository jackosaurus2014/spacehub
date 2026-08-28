/**
 * @jest-environment node
 */
/**
 * Registry pins for /rockets and /launches. The fixtures are the real
 * SpaceEvent.rocket and .location strings from production on 2026-08-28.
 */
jest.mock('@/lib/db', () => ({ __esModule: true, default: {} }));

import { ROCKET_REGISTRY, allRocketSlugs, getRocketSpec, rocketSlugForName } from '@/lib/rockets';
import { LAUNCH_SITES, monthParam, monthWindow, parseMonthParam, shiftMonth, siteSlugForLocation } from '@/lib/launch-sites';

describe('rocket registry', () => {
  it('every registry slug has a spec in the catalogue', () => {
    for (const r of ROCKET_REGISTRY) expect(getRocketSpec(r.slug)).not.toBeNull();
    expect(allRocketSlugs().length).toBe(ROCKET_REGISTRY.length);
  });

  it.each([
    ['Falcon 9 Block 5', 'falcon-9'], ['Falcon 9', 'falcon-9'], ['Falcon Heavy', 'falcon-heavy'], ['Starship V3', 'starship'],
    ['Electron', 'electron'], ['Vulcan', 'vulcan-centaur'], ['Atlas V 551', 'atlas-v'], ['Atlas V N22', 'atlas-v'], ['New Glenn', 'new-glenn'],
    ['Ariane 64', 'ariane-6'], ['Ariane 62', 'ariane-6'], ['Ariane 64 Block 2', 'ariane-6'], ['Vega-C', 'vega-c'], ['H3-22', 'h3'], ['H3-24', 'h3'],
    ['PSLV XL', 'pslv'], ['LVM3', 'lvm3'], ['GSLV Mk III', 'lvm3'], ['Long March 5', 'long-march-5'], ['Long March 2D', 'long-march-2d'], ['Long March 3B/E', 'long-march-3b'],
    ['Soyuz 2.1b', 'soyuz-2'], ['Soyuz 2.1a Fregat-M', 'soyuz-2'], ['Proton-M Blok DM-03', 'proton-m'], ['Firefly Alpha Block 2', 'firefly-alpha'], ['Long March 6A', 'long-march-6a'],
  ])('%s → %s', (name, slug) => {
    expect(rocketSlugForName(name)).toBe(slug);
  });

  it('does not confuse siblings', () => {
    expect(rocketSlugForName('Falcon Heavy')).not.toBe('falcon-9');
    expect(rocketSlugForName('Long March 5')).toBe('long-march-5');
    expect(rocketSlugForName('Long March 5B')).toBe('long-march-5');
    expect(rocketSlugForName('Long March 6C')).toBeNull(); // uncatalogued: no page, no false match on 6A
    expect(rocketSlugForName('GSLV Mk. II')).toBeNull();     // Mk II is not LVM3
    expect(rocketSlugForName('Angara 1.2')).toBeNull();      // only A5 is catalogued
  });
});

describe('launch sites', () => {
  it.each([
    ['Cape Canaveral SFS, FL, USA', 'cape-canaveral'], ['Kennedy Space Center, FL, USA', 'cape-canaveral'], ['Vandenberg SFB, CA, USA', 'vandenberg'],
    ['SpaceX Starbase, TX, USA', 'starbase'], ['Starbase. Texas', 'starbase'], ['Wallops Flight Facility, Virginia, USA', 'wallops'],
    ['Rocket Lab Launch Complex 1, Mahia Peninsula, New Zealand', 'mahia'], ['Guiana Space Centre, French Guiana', 'kourou'],
    ["Jiuquan Satellite Launch Center, People's Republic of China", 'jiuquan'], ["Wenchang Space Launch Site, People's Republic of China", 'wenchang'],
    ["Taiyuan Satellite Launch Center, People's Republic of China", 'taiyuan'], ["Xichang Satellite Launch Center, People's Republic of China", 'xichang'],
    ['Haiyang Oriental Spaceport', 'haiyang'], ['Satish Dhawan Space Centre, India', 'sriharikota'], ['Baikonur Cosmodrome, Republic of Kazakhstan', 'baikonur'],
    ['Plesetsk Cosmodrome, Russian Federation', 'plesetsk'], ['Tanegashima Space Center, Japan', 'tanegashima'], ['Andøya Spaceport', 'andoya'],
  ])('%s → %s', (loc, slug) => {
    expect(siteSlugForLocation(loc)).toBe(slug);
  });

  it('non-launch LL2 event venues map to no site', () => {
    expect(siteSlugForLocation('International Space Station')).toBeNull();
    expect(siteSlugForLocation('Johnson Space Center, Houston, TX, USA')).toBeNull();
    expect(siteSlugForLocation('Online')).toBeNull();
  });

  it('site slugs are unique', () => {
    const slugs = LAUNCH_SITES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('month helpers', () => {
  it('parses and rejects month params', () => {
    expect(parseMonthParam('2026-10')).toEqual({ year: 2026, month: 10 });
    expect(parseMonthParam('2026-13')).toBeNull();
    expect(parseMonthParam('2026-1')).toBeNull();
    expect(parseMonthParam('oct-2026')).toBeNull();
  });
  it('round-trips and shifts across year boundaries', () => {
    expect(monthParam(2026, 1)).toBe('2026-01');
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });
  it('window covers 12 past + current + 6 future months', () => {
    const w = monthWindow(new Date('2026-08-28T00:00:00Z'));
    expect(w).toHaveLength(19);
    expect(w[0]).toEqual({ year: 2025, month: 8 });
    expect(w[12]).toEqual({ year: 2026, month: 8 });
    expect(w[18]).toEqual({ year: 2027, month: 2 });
  });
});
