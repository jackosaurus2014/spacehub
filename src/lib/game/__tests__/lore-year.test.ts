/**
 * @jest-environment node
 */
import { LORE_YEAR_OFFSET, LORE_EPOCH_GAME_YEAR, LORE_EPOCH_REAL_YEAR, getInGameLoreYear, getLoreYearOffset } from '../lore-year';

describe('lore-year', () => {
  it('offset matches docs/LORE.md\'s stated "2150" against its 2026 real-world anchor', () => {
    expect(LORE_YEAR_OFFSET).toBe(LORE_EPOCH_GAME_YEAR - LORE_EPOCH_REAL_YEAR);
    expect(LORE_YEAR_OFFSET).toBe(124);
  });

  it('getInGameLoreYear reproduces the LORE.md year at the epoch real year', () => {
    expect(getInGameLoreYear(new Date('2026-06-01T00:00:00Z'))).toBe(2150);
  });

  it('getInGameLoreYear advances with the real calendar so copy never goes stale', () => {
    // Mid-year, mid-day UTC timestamps so this assertion holds regardless of
    // the test runner's local timezone offset (no year-boundary crossing).
    expect(getInGameLoreYear(new Date('2027-06-15T12:00:00Z'))).toBe(2151);
    expect(getInGameLoreYear(new Date('2030-06-15T12:00:00Z'))).toBe(2154);
  });

  it('getLoreYearOffset returns the fixed offset regardless of the date passed elsewhere', () => {
    expect(getLoreYearOffset()).toBe(124);
  });
});
