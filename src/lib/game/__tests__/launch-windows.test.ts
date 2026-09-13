// ─── Transfer (launch) windows ──────────────────────────────────────────────
// Graphics Phase 3 item 3. The Hohmann numbers are textbook and pinned
// against the published Earth→Mars figures: 259 days of flight, a +44.3 deg
// departure phase angle, a 780-day synodic period.

import {
  DAYS_PER_GAME_MONTH,
  TRANSFER_ORIGIN_ROOT,
  formatTransferTime,
  formatWindowChip,
  formatWindowLine,
  formatWindowPairLine,
  heliocentricRootOf,
  hohmannTransferDays,
  nextTransferWindow,
  nextTransferWindows,
  phaseAngleAt,
  requiredPhaseAngleDeg,
  rootName,
  synodicPeriodDays,
  transferRootForLocation,
  unlockedTransferPairs,
  unlockedTransferRoots,
  windowsForBody,
} from '../launch-windows';
import { KEPLER_ELEMENTS, wrapDegSigned } from '../orbital-elements';
import { formatEphemerisMs } from '../map-time';

const EARTH_A = 1.0;
const MARS_A = KEPLER_ELEMENTS.mars.aAU;
const REF = Date.UTC(2084, 6, 1);

describe('Hohmann maths', () => {
  it('reproduces the published Earth to Mars transfer', () => {
    expect(hohmannTransferDays(EARTH_A, MARS_A)).toBeCloseTo(258.9, 0);
    expect(requiredPhaseAngleDeg(EARTH_A, MARS_A)).toBeCloseTo(44.3, 1);
    expect(synodicPeriodDays(EARTH_A, MARS_A)).toBeCloseTo(779.9, 0);
  });

  it('is symmetric in flight time and asymmetric in phase angle', () => {
    expect(hohmannTransferDays(MARS_A, EARTH_A)).toBeCloseTo(hohmannTransferDays(EARTH_A, MARS_A), 6);
    // Coming home, Earth must TRAIL Mars.
    expect(requiredPhaseAngleDeg(MARS_A, EARTH_A)).toBeCloseTo(-75.1, 1);
  });

  it('reproduces the published Earth to Venus transfer', () => {
    const venus = KEPLER_ELEMENTS.venus.aAU;
    expect(hohmannTransferDays(EARTH_A, venus)).toBeCloseTo(146, 0);
    expect(synodicPeriodDays(EARTH_A, venus)).toBeCloseTo(583.9, 0);
  });

  it('has no synodic period for identical orbits', () => {
    expect(synodicPeriodDays(1, 1)).toBe(Infinity);
    expect(nextTransferWindows('earth', 'earth', REF)).toEqual([]);
  });
});

describe('phase angles', () => {
  it('is the signed longitude difference', () => {
    const phase = phaseAngleAt('earth', 'mars', REF)!;
    expect(phase).toBeGreaterThan(-180);
    expect(phase).toBeLessThanOrEqual(180);
    const reverse = phaseAngleAt('mars', 'earth', REF)!;
    expect(wrapDegSigned(phase + reverse)).toBeCloseTo(0, 6);
  });

  it('is null when a body has no elements', () => {
    expect(phaseAngleAt('earth', 'moon', REF)).toBeNull();
  });
});

describe('nextTransferWindows', () => {
  it('lands on a date where the phase angle really is the required one', () => {
    const w = nextTransferWindow('earth', 'mars', REF)!;
    expect(w).not.toBeNull();
    const phaseAtDeparture = phaseAngleAt('earth', 'mars', w.departMs)!;
    // Circular-orbit maths against an eccentric ephemeris: a few degrees.
    expect(Math.abs(wrapDegSigned(phaseAtDeparture - w.requiredPhaseDeg))).toBeLessThan(6);
  });

  it('always looks forward in time', () => {
    for (const to of ['mercury', 'venus', 'mars', 'ceres', 'jupiter', 'saturn', 'pluto']) {
      const w = nextTransferWindow('earth', to, REF)!;
      expect(w.waitDays).toBeGreaterThanOrEqual(0);
      expect(w.waitDays).toBeLessThanOrEqual(w.synodicDays + 1e-6);
      expect(w.departMs).toBeGreaterThanOrEqual(REF);
      expect(w.arriveMs).toBeGreaterThan(w.departMs);
    }
  });

  it('spaces later windows one synodic period apart', () => {
    const ws = nextTransferWindows('earth', 'mars', REF, 3);
    expect(ws).toHaveLength(3);
    expect(ws[1].waitDays - ws[0].waitDays).toBeCloseTo(ws[0].synodicDays, 6);
    expect(ws[2].waitDays - ws[1].waitDays).toBeCloseTo(ws[0].synodicDays, 6);
  });

  it('caps the requested count and rejects junk', () => {
    expect(nextTransferWindows('earth', 'mars', REF, 100)).toHaveLength(12);
    expect(nextTransferWindows('earth', 'mars', Number.NaN)).toEqual([]);
    expect(nextTransferWindows('earth', 'moon', REF)).toEqual([]);
  });

  it('reports the flight time in game months', () => {
    const w = nextTransferWindow('earth', 'mars', REF)!;
    expect(w.transferMonths).toBeCloseTo(w.transferDays / DAYS_PER_GAME_MONTH, 9);
    expect(w.transferMonths).toBeCloseTo(8.5, 1);
  });
});

describe('location and body resolution', () => {
  it('walks moons and orbital pips up to their heliocentric root', () => {
    expect(heliocentricRootOf('io')).toBe('jupiter');
    expect(heliocentricRootOf('moon')).toBe('earth');
    expect(heliocentricRootOf('mars')).toBe('mars');
    expect(heliocentricRootOf('nope')).toBeNull();
    expect(transferRootForLocation('leo')).toBe('earth');
    expect(transferRootForLocation('lunar_orbit')).toBe('earth');
    expect(transferRootForLocation('io_surface')).toBe('jupiter');
    expect(transferRootForLocation('mars_orbit')).toBe('mars');
    expect(transferRootForLocation('ceres_surface')).toBe('ceres');
  });

  it('has no root for the free-floating region pips', () => {
    expect(transferRootForLocation('asteroid_belt')).toBeNull();
    expect(transferRootForLocation('outer_system')).toBeNull();
    expect(transferRootForLocation(null)).toBeNull();
  });

  it('derives the unlocked roots and their pairs', () => {
    expect(unlockedTransferRoots(['earth_surface', 'leo', 'geo'])).toEqual(['earth']);
    const roots = unlockedTransferRoots(['earth_surface', 'mars_orbit', 'io_surface', 'asteroid_belt']);
    expect(roots).toEqual(['earth', 'mars', 'jupiter']);
    expect(unlockedTransferPairs(['earth_surface'])).toEqual([]);
    expect(unlockedTransferPairs(['earth_surface', 'mars_surface'])).toHaveLength(2);
  });

  it('gives a brand-new corporation windows against Earth anyway', () => {
    const ws = windowsForBody('mars', ['earth_surface', 'leo'], REF, 4);
    expect(ws.length).toBeGreaterThan(0);
    for (const w of ws) expect([w.fromId, w.toId]).toContain('mars');
    for (const w of ws) expect([w.fromId, w.toId]).toContain(TRANSFER_ORIGIN_ROOT);
    // Sorted soonest first.
    for (let i = 1; i < ws.length; i++) expect(ws[i].departMs).toBeGreaterThanOrEqual(ws[i - 1].departMs);
  });

  it('has nothing to say about a body with no orbit of its own', () => {
    expect(windowsForBody('not-a-body', ['earth_surface'], REF)).toEqual([]);
  });
});

describe('formatting', () => {
  it('picks days for short hops and months for long ones', () => {
    expect(formatTransferTime(24)).toBe('24 days');
    expect(formatTransferTime(258.9)).toBe('8.5 months');
  });

  it('writes the Location List line', () => {
    const w = nextTransferWindow('earth', 'mars', REF)!;
    const line = formatWindowLine(w, formatEphemerisMs);
    expect(line).toMatch(/^Next window to Mars: [A-Z][a-z]{2} \d{4}, 8\.5 months transit$/);
    const pair = formatWindowPairLine(w, formatEphemerisMs);
    expect(pair).toContain('Earth → Mars:');
    // The list-cell form has to fit ~110 px: glyph, month, duration.
    const chip = formatWindowChip(w, formatEphemerisMs);
    expect(chip).toMatch(/^◆ [A-Z][a-z]{2} \d{4} · 8\.5mo$/);
    expect(chip.length).toBeLessThanOrEqual(20);
  });

  it('names roots', () => {
    expect(rootName('mars')).toBe('Mars');
    expect(rootName('mystery')).toBe('mystery');
  });
});
