import {
  DEFAULT_MAP_CAMERA,
  MAP_MIN_ZOOM,
  MAP_MAX_ZOOM,
  MIN_HIT_RADIUS_PX,
  clampZoom,
  zoomAboutPoint,
  wheelZoom,
  pinchCamera,
  hitRadius,
  pickNearest,
  type MapCamera,
} from '../map-camera';

/** Invert the canvas transform: screen px → world fraction (per axis). */
function worldOf(cam: MapCamera, screen: number, offset: number, dim: number): number {
  return (screen - offset) / (dim * cam.zoom);
}

describe('map-camera: zoom clamping', () => {
  it('clamps to the min/max band and defends against NaN', () => {
    expect(clampZoom(0.01)).toBe(MAP_MIN_ZOOM);
    expect(clampZoom(99)).toBe(MAP_MAX_ZOOM);
    expect(clampZoom(1.7)).toBe(1.7);
    expect(clampZoom(Number.NaN)).toBe(1);
  });

  it('keeps the old 2D tier thresholds reachable (0.8 system / 1.6 detail)', () => {
    expect(MAP_MIN_ZOOM).toBeLessThanOrEqual(0.8);
    expect(MAP_MAX_ZOOM).toBeGreaterThanOrEqual(1.6);
  });
});

describe('map-camera: zoom about a point', () => {
  it('keeps the world point under the focal point stationary', () => {
    const cam: MapCamera = { zoom: 1, x: -40, y: 25 };
    const focal = { x: 300, y: 180 };
    const w = 800;
    const h = 500;
    const before = {
      x: worldOf(cam, focal.x, cam.x, w),
      y: worldOf(cam, focal.y, cam.y, h),
    };
    const next = zoomAboutPoint(cam, 2.5, focal);
    expect(next.zoom).toBe(2.5);
    expect(worldOf(next, focal.x, next.x, w)).toBeCloseTo(before.x, 10);
    expect(worldOf(next, focal.y, next.y, h)).toBeCloseTo(before.y, 10);
  });

  it('is the identity when the zoom does not change (already at the clamp)', () => {
    const cam: MapCamera = { zoom: MAP_MAX_ZOOM, x: 12, y: -7 };
    const next = zoomAboutPoint(cam, MAP_MAX_ZOOM * 2, { x: 100, y: 100 });
    expect(next).toEqual(cam);
  });

  it('spreads a close pair of screen points apart when zooming in', () => {
    // The founder complaint in miniature: two bodies 12px apart on screen must
    // end up further apart after zooming in about their midpoint.
    const cam = DEFAULT_MAP_CAMERA;
    const a = { fx: 0.215, fy: 0.36 }; // leo
    const b = { fx: 0.25, fy: 0.4 };
    const w = 400;
    const h = 300;
    const screen = (p: { fx: number; fy: number }, c: MapCamera) => ({
      x: p.fx * w * c.zoom + c.x,
      y: p.fy * h * c.zoom + c.y,
    });
    const gapBefore = Math.hypot(
      screen(a, cam).x - screen(b, cam).x,
      screen(a, cam).y - screen(b, cam).y,
    );
    const next = zoomAboutPoint(cam, 4, screen(a, cam));
    const gapAfter = Math.hypot(
      screen(a, next).x - screen(b, next).x,
      screen(a, next).y - screen(b, next).y,
    );
    expect(gapAfter).toBeCloseTo(gapBefore * 4, 8);
  });
});

describe('map-camera: wheel zoom', () => {
  it('zooms in on negative deltaY and out on positive, symmetrically', () => {
    const cam = DEFAULT_MAP_CAMERA;
    const focal = { x: 50, y: 50 };
    const zoomedIn = wheelZoom(cam, -100, focal);
    const zoomedOut = wheelZoom(cam, 100, focal);
    expect(zoomedIn.zoom).toBeGreaterThan(1);
    expect(zoomedOut.zoom).toBeLessThan(1);
    expect(zoomedIn.zoom * zoomedOut.zoom).toBeCloseTo(1, 10);
  });

  it('uses the hotter trackpad coefficient for ctrl+wheel', () => {
    const cam = DEFAULT_MAP_CAMERA;
    const focal = { x: 0, y: 0 };
    expect(wheelZoom(cam, -20, focal, true).zoom).toBeGreaterThan(wheelZoom(cam, -20, focal, false).zoom);
  });
});

describe('map-camera: pinch', () => {
  it('doubling the pinch distance doubles the zoom, midpoint pinned', () => {
    const cam: MapCamera = { zoom: 1, x: 10, y: -20 };
    const prev = { dist: 80, x: 200, y: 150 };
    const next = { dist: 160, x: 200, y: 150 };
    const out = pinchCamera(cam, prev, next);
    expect(out.zoom).toBeCloseTo(2, 10);
    // Same fixed point as zoomAboutPoint about the (unmoved) midpoint.
    expect(out).toEqual(zoomAboutPoint(cam, 2, { x: 200, y: 150 }));
  });

  it('equal distances = pure two-finger pan by the midpoint drift', () => {
    const cam: MapCamera = { zoom: 1.5, x: 5, y: 5 };
    const out = pinchCamera(cam, { dist: 100, x: 100, y: 100 }, { dist: 100, x: 130, y: 80 });
    expect(out.zoom).toBe(1.5);
    expect(out.x).toBeCloseTo(35, 10);
    expect(out.y).toBeCloseTo(-15, 10);
  });

  it('a degenerate zero starting distance falls back to pan, never NaN', () => {
    const cam = DEFAULT_MAP_CAMERA;
    const out = pinchCamera(cam, { dist: 0, x: 50, y: 50 }, { dist: 40, x: 60, y: 50 });
    expect(out.zoom).toBe(1);
    expect(Number.isFinite(out.x)).toBe(true);
  });
});

describe('map-camera: hit-testing', () => {
  it('floors tiny bodies to a real touch target and scales with zoom', () => {
    expect(hitRadius(3, 1)).toBe(MIN_HIT_RADIUS_PX); // 3px pip at zoom 1
    expect(hitRadius(22, 1)).toBe(32); // Earth: 22*1 + 10
    expect(hitRadius(7, 4)).toBe(38); // leo/geo pip at max zoom: 7*4 + 10
  });

  it('picks the nearest centre among overlapping targets, not array order', () => {
    // leo listed first, geo second, both overlapping the click point — the
    // old first-hit loop would always answer leo.
    const candidates = [
      { id: 'leo', x: 100, y: 100, r: 30 },
      { id: 'geo', x: 130, y: 110, r: 30 },
    ];
    expect(pickNearest(126, 108, candidates)).toBe('geo');
    expect(pickNearest(104, 101, candidates)).toBe('leo');
  });

  it('returns null on a miss', () => {
    expect(pickNearest(0, 0, [{ id: 'a', x: 500, y: 500, r: 20 }])).toBeNull();
  });
});
