/**
 * @jest-environment node
 *
 * Graphics Phase 2, item 3 (procedural planet shading): the three-free half
 * of the planet shader — uniform bookkeeping for late-loading textures (the
 * useMapRefresh contract), per-body flags, irradiance and the cloud-shadow
 * offset. The GLSL itself is exercised in the browser probe.
 */
import {
  syncPlanetMaps,
  bodyShaderFlags,
  bodySunIrradiance,
  sunIrradianceAt,
  cloudShiftFor,
  PLANET_RING_NORMAL,
  PLANET_RING_TILT,
  PLANET_FRAGMENT,
  PLANET_VERTEX,
  SKY_FRAGMENT,
  SUN_IRRADIANCE_MAX,
  SUN_IRRADIANCE_MIN,
  SUN_IRRADIANCE_COMPRESSION,
  GAS_GIANT_IDS,
  type PlanetMapUniformsLike,
} from '../map-shading';
import { ORBITAL_BODY_MAP, ORBITAL_BODIES, sceneOrbitRadius } from '../orbital-elements';

function uniforms(): PlanetMapUniformsLike {
  return { dayMap: { value: null }, hasMap: { value: 0 }, hasLights: { value: 0 }, cloudsMap: { value: null }, hasClouds: { value: 0 } };
}

describe('syncPlanetMaps (late texture → uniform + recompile)', () => {
  it('binds the day map when it lands and flags the recompile once', () => {
    const u = uniforms();
    expect(syncPlanetMaps(u, { day: null, clouds: null }, { lightsInAlpha: false })).toBe(false);
    const day = { name: 'day' };
    expect(syncPlanetMaps(u, { day, clouds: null }, { lightsInAlpha: false })).toBe(true);
    expect(u.dayMap.value).toBe(day);
    expect(u.hasMap.value).toBe(1);
    expect(u.hasLights.value).toBe(0);
    // Same maps again: no recompile.
    expect(syncPlanetMaps(u, { day, clouds: null }, { lightsInAlpha: false })).toBe(false);
  });

  it('turns on night lights only for a lights-in-alpha texture, and clouds when the cloud map lands', () => {
    const u = uniforms();
    const day = { name: 'earth_day_lights' };
    const clouds = { name: 'clouds' };
    expect(syncPlanetMaps(u, { day }, { lightsInAlpha: true })).toBe(true);
    expect(u.hasLights.value).toBe(1);
    expect(u.hasClouds.value).toBe(0);
    expect(syncPlanetMaps(u, { day, clouds }, { lightsInAlpha: true })).toBe(true);
    expect(u.cloudsMap.value).toBe(clouds);
    expect(u.hasClouds.value).toBe(1);
  });

  it('losing a map (dispose on unmount) clears the flags', () => {
    const u = uniforms();
    syncPlanetMaps(u, { day: { a: 1 }, clouds: { b: 1 } }, { lightsInAlpha: true });
    expect(syncPlanetMaps(u, {}, { lightsInAlpha: true })).toBe(true);
    expect(u.dayMap.value).toBeNull();
    expect(u.hasMap.value).toBe(0);
    expect(u.hasLights.value).toBe(0);
    expect(u.hasClouds.value).toBe(0);
  });
});

describe('bodyShaderFlags', () => {
  it('Earth gets ocean + lights-in-alpha, gas giants get bands, rock gets nothing', () => {
    const earth = bodyShaderFlags(ORBITAL_BODY_MAP.get('earth'));
    expect(earth).toEqual({ ocean: true, gasBands: false, lightsInAlpha: true });
    for (const id of GAS_GIANT_IDS) {
      expect(bodyShaderFlags(ORBITAL_BODY_MAP.get(id)).gasBands).toBe(true);
    }
    expect(bodyShaderFlags(ORBITAL_BODY_MAP.get('mars'))).toEqual({ ocean: false, gasBands: false, lightsInAlpha: false });
    expect(bodyShaderFlags(undefined)).toEqual({ ocean: false, gasBands: false, lightsInAlpha: false });
  });
  it('Earth ships the packed day+lights texture and no separate night map', () => {
    const earth = ORBITAL_BODY_MAP.get('earth')!;
    expect(earth.texture).toBe('/textures/earth_day_lights.webp');
    expect(earth.nightTexture).toBeUndefined();
  });
});

describe('irradiance', () => {
  it('follows the inverse square from the item-8 light, clamped at both ends', () => {
    expect(sunIrradianceAt(sceneOrbitRadius(1))).toBeCloseTo((170 / sceneOrbitRadius(1) ** 2) ** SUN_IRRADIANCE_COMPRESSION, 6);
    expect(sunIrradianceAt(sceneOrbitRadius(1))).toBeGreaterThan(0.95);
    expect(sunIrradianceAt(sceneOrbitRadius(1))).toBeLessThan(1.1);
    expect(sunIrradianceAt(0.1)).toBe(SUN_IRRADIANCE_MAX);
    expect(sunIrradianceAt(1e6)).toBe(SUN_IRRADIANCE_MIN);
    expect(sunIrradianceAt(0)).toBe(SUN_IRRADIANCE_MAX);
  });
  it('a moon takes its root body’s orbit; inner bodies brighter than outer', () => {
    expect(bodySunIrradiance('io')).toBe(bodySunIrradiance('jupiter'));
    expect(bodySunIrradiance('moon')).toBe(bodySunIrradiance('earth'));
    expect(bodySunIrradiance('earth')).toBeGreaterThan(bodySunIrradiance('jupiter'));
    expect(bodySunIrradiance('jupiter')).toBeGreaterThan(bodySunIrradiance('pluto'));
    for (const b of ORBITAL_BODIES) expect(Number.isFinite(bodySunIrradiance(b.id))).toBe(true);
  });
});

describe('cloud shadow offset + ring normal', () => {
  it('wraps to [0,1) and is 0 when surface and clouds align', () => {
    expect(cloudShiftFor(0, 0)).toBe(0);
    expect(cloudShiftFor(Math.PI, 0)).toBeCloseTo(0.5, 9);
    expect(cloudShiftFor(0, Math.PI / 2)).toBeCloseTo(0.75, 9);
    const s = cloudShiftFor(100, 37);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(1);
  });
  it('the ring normal matches PlanetRing’s tilt', () => {
    const [x, y, z] = PLANET_RING_NORMAL;
    expect(x).toBe(0);
    expect(y).toBeCloseTo(Math.cos(PLANET_RING_TILT), 9);
    expect(z).toBeCloseTo(Math.sin(PLANET_RING_TILT), 9);
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 9);
  });
});

describe('GLSL source', () => {
  it('reads at most two textures per planet fragment and carries every variant', () => {
    const planetBranch = PLANET_FRAGMENT.split('#else')[1].split('#endif')[0];
    expect((planetBranch.match(/texture2D\(/g) || []).length).toBe(2);
    for (const v of ['HALO', 'CLOUDS', 'RING']) expect(PLANET_FRAGMENT).toContain(`defined(${v})`);
    expect(PLANET_FRAGMENT).toContain('#include <tonemapping_fragment>');
    expect(PLANET_FRAGMENT).toContain('#include <colorspace_fragment>');
    expect(PLANET_VERTEX).toContain('vCenter');
    expect(SKY_FRAGMENT).toContain('mixAB');
  });
});
