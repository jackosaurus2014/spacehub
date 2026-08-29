/**
 * @jest-environment node
 */
import { VIEWING_CITIES, SITE_PADS, bearingDeg, cityGeometry, compass, distanceKm, visibilityTier } from '@/lib/launch-viewing-cities';
import { getSite } from '@/lib/launch-site-registry';

describe('viewing-city geometry', () => {
  it('haversine and bearing are sane on known pairs', () => {
    const orlando = { lat: 28.5384, lon: -81.3789 }; const slc40 = SITE_PADS['cape-canaveral'];
    const km = distanceKm(orlando, slc40);
    expect(km).toBeGreaterThan(70); expect(km).toBeLessThan(90); // ~78 km
    expect(compass(bearingDeg(orlando, slc40))).toBe('E');
    const la = { lat: 34.0522, lon: -118.2437 }; const vbg = SITE_PADS.vandenberg;
    expect(compass(bearingDeg(la, vbg))).toMatch(/^(W|WNW|NW)$/);
    expect(distanceKm(la, vbg)).toBeGreaterThan(200);
  });

  it('visibility tiers are honest about distance', () => {
    expect(visibilityTier(10).tier).toBe('pad');
    expect(visibilityTier(80).tier).toBe('ascent');
    expect(visibilityTier(300).tier).toBe('horizon');
    expect(visibilityTier(600).tier).toBe('stream');
  });

  it('every city maps to a real site with pad coordinates and a viewing guide', () => {
    for (const c of VIEWING_CITIES) {
      expect(getSite(c.site)).not.toBeNull();
      expect(SITE_PADS[c.site]).toBeDefined();
      const g = cityGeometry(c);
      expect(g.km).toBeGreaterThan(0);
      expect(g.bearing).toBeGreaterThanOrEqual(0); expect(g.bearing).toBeLessThan(360);
      expect(c.spots.length).toBeGreaterThan(0);
    }
    // Houston is genuinely too far to see Starbase; the page must say so.
    expect(cityGeometry(VIEWING_CITIES.find((c) => c.slug === 'houston')!).visibility.tier).toBe('stream');
    expect(cityGeometry(VIEWING_CITIES.find((c) => c.slug === 'south-padre-island')!).visibility.tier).toBe('pad');
  });

  it('slugs are unique', () => {
    const slugs = VIEWING_CITIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
