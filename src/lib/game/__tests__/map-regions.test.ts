/**
 * @jest-environment node
 *
 * Graphics Phase 2, item 4 (volumetric region identity): the region table
 * both solar renderers read, region selection by camera distance / body,
 * and the 2D/3D tint parity.
 */
import {
  MAP_REGION_IDS,
  MAP_REGION_SKY,
  regionForBody,
  regionForLocation,
  systemRegionAt,
  regionFadeMix,
  syncSkyUniforms,
  REGION_FADE_MS,
  REGION_HELIOPAUSE_CAMERA_DIST,
  REGION_INTERSTELLAR_CAMERA_DIST,
  REGION_EARTH_ENVIRONS_DIST,
  type MapRegionId,
  type SkyUniformsLike,
} from '../map-regions';
import { ORBITAL_BODIES, ORBITAL_PIPS, sceneOrbitRadius, ORBITAL_BODY_MAP } from '../orbital-elements';
import { ALL_LOCATIONS } from '../solar-system';
import { ZOOM_3D_SYSTEM_MIN_DIST } from '../map-zoom';

const HEX = /^#[0-9a-f]{6}$/i;
const RGBA = /^rgba\(\d{1,3},\d{1,3},\d{1,3},0?\.\d+\)$/;

describe('region table', () => {
  it('has all eight regions with a skybox, a label, a tint pair and an intensity', () => {
    expect(MAP_REGION_IDS).toHaveLength(8);
    for (const id of MAP_REGION_IDS) {
      const r = MAP_REGION_SKY[id];
      expect(r.id).toBe(id);
      expect(r.label.length).toBeGreaterThan(3);
      expect(r.skybox).toBe(`/game/sky/${id}.webp`);
      expect(r.intensity).toBeGreaterThan(0);
      expect(r.intensity).toBeLessThanOrEqual(1);
      expect(r.tint.a).toMatch(RGBA);
      expect(r.tint.b).toMatch(RGBA);
    }
  });

  it('particle fields use existing colour tokens and sane budgets', () => {
    const known = new Set<string>([
      ...ORBITAL_BODIES.map(b => b.color),
      ...ORBITAL_PIPS.map(p => p.color),
      '#7dd3fc', '#67e8f9', '#e0f2fe',
    ]);
    for (const id of MAP_REGION_IDS) {
      const p = MAP_REGION_SKY[id].particles;
      if (!p) continue;
      expect(p.color).toMatch(HEX);
      expect(known.has(p.color)).toBe(true);
      expect(p.count).toBeGreaterThan(0);
      expect(p.count).toBeLessThanOrEqual(2500);
      expect(p.opacity).toBeGreaterThan(0);
      expect(p.opacity).toBeLessThanOrEqual(0.5);
    }
  });

  it('the belt dust ring sits on the belt orbit', () => {
    expect(MAP_REGION_SKY.asteroid_belt.particles?.shape).toBe('ring');
    expect(MAP_REGION_SKY.asteroid_belt.particles?.radius).toBeCloseTo(sceneOrbitRadius(2.77), 6);
  });
});

describe('regionForBody / regionForLocation', () => {
  it('maps every orbital body, moons through their parent', () => {
    for (const b of ORBITAL_BODIES) {
      const r = regionForBody(b.id);
      expect(MAP_REGION_IDS).toContain(r);
      if (b.parent) expect(r).toBe(regionForBody(b.parent));
    }
    expect(regionForBody('earth')).toBe('earth_environs');
    expect(regionForBody('moon')).toBe('earth_environs');
    expect(regionForBody('mars')).toBe('inner_system');
    expect(regionForBody('ceres')).toBe('asteroid_belt');
    expect(regionForBody('io')).toBe('jovian');
    expect(regionForBody('titan')).toBe('saturnian');
    expect(regionForBody('triton')).toBe('outer_system');
    expect(regionForBody('pluto')).toBe('outer_system');
    expect(regionForBody(null)).toBe('inner_system');
    expect(regionForBody('nope')).toBe('inner_system');
  });

  it('maps every game location (RegionBackdrop ids) to a region, pips through their parent', () => {
    for (const loc of ALL_LOCATIONS) {
      expect(MAP_REGION_IDS).toContain(regionForLocation(loc.id));
    }
    expect(regionForLocation('leo')).toBe('earth_environs');
    expect(regionForLocation('lunar_orbit')).toBe('earth_environs');
    expect(regionForLocation('mars_orbit')).toBe('inner_system');
    expect(regionForLocation('asteroid_belt')).toBe('asteroid_belt');
    expect(regionForLocation('outer_system')).toBe('outer_system');
    expect(regionForLocation('jupiter_system')).toBe('jovian');
    expect(regionForLocation('enceladus_surface')).toBe('saturnian');
  });

  it('2D tint parity: a location and its local body resolve to the same row', () => {
    for (const b of ORBITAL_BODIES) {
      if (!b.locationId) continue;
      const viaBody = MAP_REGION_SKY[regionForBody(b.id)];
      const viaLoc = MAP_REGION_SKY[regionForLocation(b.locationId)];
      // outer_system is shared by Uranus/Neptune and the relay pip — same region either way.
      expect(viaLoc.tint).toEqual(viaBody.tint);
      expect(viaLoc.skybox).toBe(viaBody.skybox);
    }
  });
});

describe('systemRegionAt', () => {
  const earthR = sceneOrbitRadius(ORBITAL_BODY_MAP.get('earth')!.aAU!);
  it('bands the orbit target radius through the system', () => {
    const at = (r: number) => systemRegionAt(r, 40);
    expect(at(0)).toBe('inner_system');
    expect(at(earthR)).toBe('inner_system');
    expect(at(sceneOrbitRadius(1.524))).toBe('inner_system'); // Mars
    expect(at(sceneOrbitRadius(2.77))).toBe('asteroid_belt'); // Ceres
    expect(at(sceneOrbitRadius(5.203))).toBe('jovian');
    expect(at(sceneOrbitRadius(9.537))).toBe('saturnian');
    expect(at(sceneOrbitRadius(19.19))).toBe('outer_system');
    expect(at(sceneOrbitRadius(39.48))).toBe('outer_system');
  });
  it('the far tiers come from the camera distance, agreeing with the zoom tier', () => {
    expect(REGION_HELIOPAUSE_CAMERA_DIST).toBe(ZOOM_3D_SYSTEM_MIN_DIST);
    expect(systemRegionAt(21, ZOOM_3D_SYSTEM_MIN_DIST + 1)).toBe('heliopause');
    expect(systemRegionAt(21, REGION_INTERSTELLAR_CAMERA_DIST)).toBe('interstellar');
    expect(systemRegionAt(21, 159)).toBe('interstellar');
    expect(systemRegionAt(21, ZOOM_3D_SYSTEM_MIN_DIST)).toBe('asteroid_belt');
  });
  it('a target beside Earth is Earth environs, but not from the far tiers', () => {
    expect(systemRegionAt(earthR, 30, REGION_EARTH_ENVIRONS_DIST - 0.1)).toBe('earth_environs');
    expect(systemRegionAt(earthR, 30, REGION_EARTH_ENVIRONS_DIST + 0.1)).toBe('inner_system');
    expect(systemRegionAt(earthR, 120, 0)).toBe('heliopause');
  });
  it('is total on bad input', () => {
    expect(systemRegionAt(NaN, 10)).toBe('inner_system');
    expect(systemRegionAt(10, Infinity)).toBe('inner_system');
  });
});

describe('crossfade', () => {
  it('eases 0 → 1 over REGION_FADE_MS and is instant under reduced motion', () => {
    expect(regionFadeMix(0)).toBe(0);
    expect(regionFadeMix(REGION_FADE_MS / 2)).toBeCloseTo(0.5, 6);
    expect(regionFadeMix(REGION_FADE_MS)).toBe(1);
    expect(regionFadeMix(REGION_FADE_MS * 5)).toBe(1);
    expect(regionFadeMix(0, true)).toBe(1);
  });

  it('syncSkyUniforms binds a late texture into the waiting slot and reports the recompile', () => {
    const u: SkyUniformsLike = {
      texA: { value: null }, texB: { value: null }, hasA: { value: 0 }, hasB: { value: 0 },
      intensityA: { value: 0 }, intensityB: { value: 0 }, mixAB: { value: 0 },
    };
    const tex = { id: 'belt' };
    expect(syncSkyUniforms(u, 'B', tex, 0.7)).toBe(true);
    expect(u.texB.value).toBe(tex);
    expect(u.hasB.value).toBe(1);
    expect(u.intensityB.value).toBe(0.7);
    expect(u.texA.value).toBeNull();
    // Same texture again: nothing to recompile.
    expect(syncSkyUniforms(u, 'B', tex, 0.7)).toBe(false);
    // Clearing a slot is a program change too.
    expect(syncSkyUniforms(u, 'B', null, 0)).toBe(true);
    expect(u.hasB.value).toBe(0);
  });
});

describe('ids', () => {
  it('every region id is a stable snake_case token', () => {
    const ids: MapRegionId[] = [...MAP_REGION_IDS];
    for (const id of ids) expect(id).toMatch(/^[a-z_]+$/);
  });
});
