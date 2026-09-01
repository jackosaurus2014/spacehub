/**
 * @jest-environment node
 */
import {
  localNightWindow, sunElevationDeg, isDark, brightnessHint, tonightTitle, computeTonight,
  TONIGHT_CITIES, getTonightCity, tzOffsetMs,
} from '@/lib/tonight';

// Fixed, real elements so the daylight/eclipse checks run against actual
// pass geometry without touching CelesTrak. ISS epoch 2024-01-01.
jest.mock('@/lib/satellite-pass-predictor', () => {
  const actual = jest.requireActual('@/lib/satellite-pass-predictor');
  const { parseTLE } = jest.requireActual('@/lib/satellite-propagator');
  const iss = parseTLE(
    '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9025',
    '2 25544  51.6400 208.9163 0006703  35.1560  51.3800 15.49560833    18',
    'ISS (ZARYA)'
  );
  return {
    ...actual,
    fetchTLE: jest.fn(async (id: string) => (id === '25544' ? iss : null)),
  };
});

describe('localNightWindow', () => {
  it('New York (negative offset, standard time): afternoon → the coming night', () => {
    const { start, end } = localNightWindow(new Date('2026-01-15T20:00:00Z'), 'America/New_York'); // 15:00 EST
    expect(start.toISOString()).toBe('2026-01-15T23:00:00.000Z'); // 18:00 EST
    expect(end.toISOString()).toBe('2026-01-16T11:00:00.000Z'); // 06:00 EST next day
  });

  it('New York: 03:00 local is still last night', () => {
    const { start, end } = localNightWindow(new Date('2026-01-16T08:00:00Z'), 'America/New_York'); // 03:00 EST
    expect(start.toISOString()).toBe('2026-01-15T23:00:00.000Z');
    expect(end.toISOString()).toBe('2026-01-16T11:00:00.000Z');
  });

  it('New York in DST uses the -4 offset', () => {
    const { start, end } = localNightWindow(new Date('2026-07-04T12:00:00Z'), 'America/New_York'); // 08:00 EDT
    expect(start.toISOString()).toBe('2026-07-04T22:00:00.000Z');
    expect(end.toISOString()).toBe('2026-07-05T10:00:00.000Z');
  });

  it('Sydney (positive offset, AEDT +11 in January)', () => {
    const { start, end } = localNightWindow(new Date('2026-01-15T03:00:00Z'), 'Australia/Sydney'); // 14:00 AEDT
    expect(start.toISOString()).toBe('2026-01-15T07:00:00.000Z'); // 18:00 AEDT
    expect(end.toISOString()).toBe('2026-01-15T19:00:00.000Z'); // 06:00 AEDT Jan 16
  });

  it('Sydney in winter (AEST +10) and across a month boundary', () => {
    const { start, end } = localNightWindow(new Date('2026-06-30T23:30:00Z'), 'Australia/Sydney'); // 09:30 AEST Jul 1
    expect(start.toISOString()).toBe('2026-07-01T08:00:00.000Z');
    expect(end.toISOString()).toBe('2026-07-01T20:00:00.000Z');
    expect(tzOffsetMs(new Date('2026-07-01T00:00:00Z'), 'Australia/Sydney')).toBe(10 * 3_600_000);
  });

  it('is always a 12-hour window', () => {
    for (const c of TONIGHT_CITIES) {
      const { start, end } = localNightWindow(new Date('2026-03-08T09:30:00Z'), c.tz);
      // 11 or 13 h only on a DST-change night; 12 otherwise.
      expect([11, 12, 13]).toContain(Math.round((end.getTime() - start.getTime()) / 3_600_000));
    }
  });
});

describe('sunElevationDeg / isDark', () => {
  const LONDON = { lat: 51.5074, lon: -0.1278 };
  it('London, June solstice noon UTC ≈ 62°', () => {
    expect(sunElevationDeg(new Date('2026-06-21T12:00:00Z'), LONDON.lat, LONDON.lon)).toBeCloseTo(62, 0);
    expect(isDark(new Date('2026-06-21T12:00:00Z'), LONDON.lat, LONDON.lon)).toBe(false);
  });
  it('London, June solstice midnight UTC ≈ −15° (dark)', () => {
    const e = sunElevationDeg(new Date('2026-06-21T00:00:00Z'), LONDON.lat, LONDON.lon);
    expect(e).toBeGreaterThan(-17);
    expect(e).toBeLessThan(-13);
    expect(isDark(new Date('2026-06-21T00:00:00Z'), LONDON.lat, LONDON.lon)).toBe(true);
  });
  it('New York, December solstice local noon ≈ 26°', () => {
    expect(sunElevationDeg(new Date('2026-12-21T16:56:00Z'), 40.7128, -74.006)).toBeCloseTo(26, 0);
  });
  it('civil twilight: New York 21:00 EST in January is dark, 17:00 is not', () => {
    expect(isDark(new Date('2026-01-16T02:00:00Z'), 40.7128, -74.006)).toBe(true);
    expect(isDark(new Date('2026-01-15T22:00:00Z'), 40.7128, -74.006)).toBe(false);
  });
});

describe('brightnessHint bands', () => {
  it.each([[89, 'bright'], [60, 'bright'], [59.9, 'visible'], [30, 'visible'], [29.9, 'faint'], [10, 'faint']])(
    '%s° → %s', (elev, hint) => { expect(brightnessHint(elev as number)).toBe(hint); }
  );
});

describe('computeTonight (mocked ISS elements)', () => {
  it('separates daylight passes from the headline count and never throws on a missing object', async () => {
    const city = getTonightCity('new-york')!;
    const r = await computeTonight(city, new Date('2024-01-02T20:00:00Z'));
    expect(r.error).toBe(false);
    expect(r.city.slug).toBe('new-york');
    expect(r.windowStartIso).toBe('2024-01-02T23:00:00.000Z');
    expect(r.windowEndIso).toBe('2024-01-03T11:00:00.000Z');
    const iss = r.sats.find((s) => s.id === '25544')!;
    expect(iss.error).toBe(false);
    expect(iss.stale).toBe(false);
    expect(r.sats.filter((s) => s.error).map((s) => s.id).sort()).toEqual(['20580', '48274']);
    for (const p of iss.passes) {
      const peak = new Date(p.maxElevationAtIso);
      expect(peak.getTime()).toBeGreaterThanOrEqual(new Date(r.scanStartIso).getTime());
      expect(peak.getTime()).toBeLessThanOrEqual(new Date(r.windowEndIso).getTime());
      expect(p.daylight).toBe(!isDark(peak, city.lat, city.lon));
      expect(p.visible).toBe(!p.daylight && !p.eclipsed);
      expect(p.brightnessHint).toBe(brightnessHint(p.maxElevationDeg));
      expect(p.maxElevationDeg).toBeGreaterThanOrEqual(10);
    }
    expect(iss.visibleCount).toBe(iss.passes.filter((p) => p.visible).length);
    expect(r.visibleCount).toBe(iss.visibleCount);
    expect(r.tleAsOf).toBe('2024-01-01T12:00:00.000Z');
    expect(r.sourceLine).toContain('CelesTrak');
  });

  it('flags elements older than 30 days as stale', async () => {
    const r = await computeTonight(getTonightCity('london')!, new Date('2026-09-01T20:00:00Z'));
    expect(r.sats.find((s) => s.id === '25544')!.stale).toBe(true);
  });
});

describe('TONIGHT_CITIES registry', () => {
  it('has unique, url-safe slugs', () => {
    const slugs = TONIGHT_CITIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });
  it('every tz is a valid IANA zone (Intl throws otherwise) and coordinates are on Earth', () => {
    for (const c of TONIGHT_CITIES) {
      expect(() => new Intl.DateTimeFormat('en-US', { timeZone: c.tz })).not.toThrow();
      expect(Math.abs(c.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(c.lon)).toBeLessThanOrEqual(180);
    }
    expect(() => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Nowhere' })).toThrow();
  });
  it('titles stay within 60 characters for every city', () => {
    for (const c of TONIGHT_CITIES) expect(tonightTitle(c.name).length).toBeLessThanOrEqual(60);
  });
  it('lookup is case-insensitive and null for unknown slugs', () => {
    expect(getTonightCity('Chicago')?.slug).toBe('chicago');
    expect(getTonightCity('atlantis')).toBeNull();
  });
});
