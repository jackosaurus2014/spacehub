/**
 * @jest-environment node
 */
// HUD header density (2026-09-14) — the rules that decide how much vertical
// space the game's own chrome takes above the map stage. Pure functions, so
// the "band or chip" and "how many resources need a decision" decisions are
// pinned here rather than being re-derived by eye from a screenshot.

import {
  FRONTIER_BAND_NEW_DAYS,
  FRONTIER_BAND_URGENT_DAYS,
  RESOURCE_ATTENTION_MONTHS,
  frontierIsUrgent,
  frontierVariant,
  resourceStripSummary,
} from '../hud-layout';

const f = (remainingDays: number, autoGraduateReady = false) => ({ remainingDays, autoGraduateReady });

describe('frontierIsUrgent', () => {
  it('is urgent inside the last three days', () => {
    expect(frontierIsUrgent(f(FRONTIER_BAND_URGENT_DAYS))).toBe(true);
    expect(frontierIsUrgent(f(FRONTIER_BAND_URGENT_DAYS + 1))).toBe(false);
  });

  it('counts the grace period (zero days left) as urgent', () => {
    expect(frontierIsUrgent(f(0))).toBe(true);
  });

  it('is urgent the moment auto-graduation is armed, however long is left', () => {
    expect(frontierIsUrgent(f(25, true))).toBe(true);
  });
});

describe('frontierVariant', () => {
  it('keeps the full-width band while the Frontier is still news', () => {
    expect(frontierVariant(f(30))).toBe('band');
    expect(frontierVariant(f(30 - FRONTIER_BAND_NEW_DAYS + 1))).toBe('band');
  });

  it('drops to a chip once the band stops being news', () => {
    expect(frontierVariant(f(30 - FRONTIER_BAND_NEW_DAYS))).toBe('chip');
    expect(frontierVariant(f(12))).toBe('chip');
  });

  it('brings the band back when graduation is imminent', () => {
    expect(frontierVariant(f(3))).toBe('band');
    expect(frontierVariant(f(0))).toBe('band');
    expect(frontierVariant(f(18, true))).toBe('band');
  });

  // Bridge mode is the aggressive treatment: the player has asked for the map
  // to take the screen, so only urgency still earns a full-width band.
  it('collapses the news window in bridge mode', () => {
    expect(frontierVariant(f(30), true)).toBe('chip');
    expect(frontierVariant(f(12), true)).toBe('chip');
  });

  it('never buries an imminent deadline, even in bridge mode', () => {
    expect(frontierVariant(f(2), true)).toBe('band');
    expect(frontierVariant(f(0), true)).toBe('band');
    expect(frontierVariant(f(20, true), true)).toBe('band');
  });

  it('treats a missing summary as nothing worth a band', () => {
    expect(frontierVariant(null)).toBe('chip');
    expect(frontierVariant(undefined, true)).toBe('chip');
  });
});

describe('resourceStripSummary', () => {
  it('counts an empty strip without inventing a warning', () => {
    const s = resourceStripSummary([]);
    expect(s).toMatchObject({ total: 0, attention: 0, label: '0 resources' });
    expect(s.ariaLabel).not.toMatch(/running low/);
  });

  it('uses the singular noun for one stockpile', () => {
    expect(resourceStripSummary([{ depletionMonths: null }]).label).toBe('1 resource');
  });

  it('flags a stockpile a facility is short of', () => {
    const s = resourceStripSummary([{ short: true, depletionMonths: null }, { depletionMonths: null }]);
    expect(s.attention).toBe(1);
    expect(s.label).toBe('2 resources · 1 low');
  });

  it('flags a stockpile draining inside the attention window, and only that', () => {
    const s = resourceStripSummary([
      { depletionMonths: RESOURCE_ATTENTION_MONTHS },
      { depletionMonths: RESOURCE_ATTENTION_MONTHS + 1 },
    ]);
    expect(s.attention).toBe(1);
  });

  it('never double-counts a stockpile that is both short and draining', () => {
    expect(resourceStripSummary([{ short: true, depletionMonths: 1 }]).attention).toBe(1);
  });

  // Colour is never the only carrier: the warning is in the words, and those
  // words are what a screen reader gets.
  it('puts the warning in the accessible name, not only in the styling', () => {
    const s = resourceStripSummary([{ short: true, depletionMonths: null }]);
    expect(s.ariaLabel).toContain('1 running low');
  });
});
