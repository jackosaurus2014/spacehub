import {
  zoomTierFromCameraDistance,
  zoomTierFromCanvasZoom,
  isMajorLocation,
  MAJOR_LOCATION_IDS,
  nameVisibleAt,
  lensVisibleAt,
  detailVisibleAt,
  entityVisibility,
  reticleLockState,
  RETICLE_LOCK_MS,
  ZOOM_3D_SYSTEM_MIN_DIST,
  ZOOM_3D_DETAIL_MAX_DIST,
  ZOOM_2D_SYSTEM_MAX,
  ZOOM_2D_DETAIL_MIN,
  MAP_ZOOM_TIERS,
  MAP_ZOOM_TIER_LABEL,
} from '../map-zoom';

describe('map-zoom: tier selection', () => {
  it('maps 3D camera distance to the three tiers', () => {
    expect(zoomTierFromCameraDistance(ZOOM_3D_SYSTEM_MIN_DIST + 1)).toBe('system');
    expect(zoomTierFromCameraDistance(160)).toBe('system');
    expect(zoomTierFromCameraDistance(ZOOM_3D_SYSTEM_MIN_DIST)).toBe('location');
    expect(zoomTierFromCameraDistance(53)).toBe('location'); // the default camera
    expect(zoomTierFromCameraDistance(ZOOM_3D_DETAIL_MAX_DIST)).toBe('location');
    expect(zoomTierFromCameraDistance(ZOOM_3D_DETAIL_MAX_DIST - 0.1)).toBe('detail');
    expect(zoomTierFromCameraDistance(4)).toBe('detail');
  });

  it('maps 2D canvas zoom to the same three tiers, inverted', () => {
    expect(zoomTierFromCanvasZoom(0.5)).toBe('system');
    expect(zoomTierFromCanvasZoom(ZOOM_2D_SYSTEM_MAX)).toBe('system');
    expect(zoomTierFromCanvasZoom(1)).toBe('location'); // the default zoom
    expect(zoomTierFromCanvasZoom(ZOOM_2D_DETAIL_MIN)).toBe('detail');
    expect(zoomTierFromCanvasZoom(3)).toBe('detail');
  });

  it('both renderers agree on their default view tier', () => {
    expect(zoomTierFromCameraDistance(53)).toBe(zoomTierFromCanvasZoom(1));
  });

  it('degrades to the middle tier on non-finite input', () => {
    expect(zoomTierFromCameraDistance(Number.NaN)).toBe('location');
    expect(zoomTierFromCanvasZoom(Number.NaN)).toBe('location');
  });

  it('exposes an ordered tier list with labels', () => {
    expect(MAP_ZOOM_TIERS).toEqual(['system', 'location', 'detail']);
    for (const t of MAP_ZOOM_TIERS) expect(MAP_ZOOM_TIER_LABEL[t]).toBeTruthy();
  });
});

describe('map-zoom: major-body derivation', () => {
  it('treats planets and region anchors as major', () => {
    expect(isMajorLocation('earth_surface')).toBe(true);
    expect(isMajorLocation('mars_surface')).toBe(true);
    expect(isMajorLocation('jupiter_system')).toBe(true);
    expect(isMajorLocation('saturn_system')).toBe(true);
    expect(isMajorLocation('asteroid_belt')).toBe(true); // belt anchor pip
    expect(isMajorLocation('outer_system')).toBe(true);
  });

  it('treats orbital pips, moons and dwarf bodies as minor', () => {
    expect(isMajorLocation('leo')).toBe(false);
    expect(isMajorLocation('geo')).toBe(false);
    expect(isMajorLocation('lunar_orbit')).toBe(false);
    expect(isMajorLocation('mars_orbit')).toBe(false);
    expect(isMajorLocation('lunar_surface')).toBe(false);
    expect(isMajorLocation('europa_surface')).toBe(false);
    expect(isMajorLocation('ceres_surface')).toBe(false);
  });

  it('is derived, not empty', () => {
    expect(MAJOR_LOCATION_IDS.size).toBeGreaterThan(5);
  });
});

describe('map-zoom: entity visibility', () => {
  it('system tier keeps only major bodies and your holdings labelled', () => {
    expect(nameVisibleAt('system', true, false)).toBe(true);
    expect(nameVisibleAt('system', false, true)).toBe(true);
    expect(nameVisibleAt('system', false, false)).toBe(false);
    expect(lensVisibleAt('system')).toBe(false);
    expect(detailVisibleAt('system')).toBe(false);
  });

  it('location tier adds names everywhere plus lens data, but no detail', () => {
    expect(nameVisibleAt('location', false, false)).toBe(true);
    expect(lensVisibleAt('location')).toBe(true);
    expect(detailVisibleAt('location')).toBe(false);
  });

  it('detail tier shows everything', () => {
    const v = entityVisibility({ tier: 'detail', isMajor: false, hasHoldings: false });
    expect(v).toEqual({ name: true, lens: true, detail: true });
  });

  it('alwaysLabels overrides every tier (information is never zoom-only)', () => {
    for (const tier of MAP_ZOOM_TIERS) {
      expect(entityVisibility({ tier, isMajor: false, hasHoldings: false, alwaysLabels: true }))
        .toEqual({ name: true, lens: true, detail: true });
    }
  });
});

describe('map-zoom: selection lock-on reticle', () => {
  it('converges from a wide radius to the resting radius', () => {
    const start = reticleLockState(0);
    const mid = reticleLockState(RETICLE_LOCK_MS / 2);
    const end = reticleLockState(RETICLE_LOCK_MS);
    expect(start.radiusScale).toBeGreaterThan(mid.radiusScale);
    expect(mid.radiusScale).toBeGreaterThan(end.radiusScale);
    expect(end.radiusScale).toBe(1);
    expect(start.opacity).toBeLessThan(end.opacity);
    expect(end.locked).toBe(true);
    expect(start.locked).toBe(false);
  });

  it('reduced motion is an instant state change, not an animation', () => {
    expect(reticleLockState(0, true)).toEqual({ progress: 1, radiusScale: 1, opacity: 1, locked: true });
    expect(reticleLockState(10, true).locked).toBe(true);
  });

  it('stays locked past the animation window and tolerates bad input', () => {
    expect(reticleLockState(99999).locked).toBe(true);
    expect(reticleLockState(Number.NaN).locked).toBe(true);
    expect(reticleLockState(-50).radiusScale).toBeCloseTo(1.85, 5);
  });
});
