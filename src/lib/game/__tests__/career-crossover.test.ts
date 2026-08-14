/**
 * @jest-environment node
 */
import { buildCareerCrossoverLine } from '../career-crossover';

describe('buildCareerCrossoverLine', () => {
  it('builds the sentence with the dynamic in-game year and a formatted job count', () => {
    const line = buildCareerCrossoverLine(6432, new Date('2026-06-01T00:00:00Z'));
    expect(line).toBe('Your corporation is hiring in 2150. In the real world, 6,432 space-industry jobs are open right now.');
  });

  it('advances the in-game year with the real calendar', () => {
    // Mid-year, mid-day UTC so this holds regardless of the test runner's
    // local timezone offset (no year-boundary crossing).
    const line = buildCareerCrossoverLine(100, new Date('2027-06-15T12:00:00Z'));
    expect(line).toContain('hiring in 2151');
  });

  it('returns null for a missing, zero, negative, or non-finite count — never a fabricated number', () => {
    expect(buildCareerCrossoverLine(null)).toBeNull();
    expect(buildCareerCrossoverLine(undefined)).toBeNull();
    expect(buildCareerCrossoverLine(0)).toBeNull();
    expect(buildCareerCrossoverLine(-5)).toBeNull();
    expect(buildCareerCrossoverLine(NaN)).toBeNull();
    expect(buildCareerCrossoverLine(Infinity)).toBeNull();
  });

  it('rounds fractional counts and formats with thousands separators', () => {
    expect(buildCareerCrossoverLine(1234.6, new Date('2026-01-01T00:00:00Z'))).toContain('1,235 space-industry jobs');
  });
});
