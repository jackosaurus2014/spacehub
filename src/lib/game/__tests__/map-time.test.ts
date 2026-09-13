// ─── Map scene clock + time scrubber state ──────────────────────────────────
// Graphics Phase 3 items 1 & 2. The scrubber is presentation only, so the
// contract under test is: it clamps, it round-trips through the game
// calendar, it never touches state, and "now" is always one call away.

import {
  SCRUB_MAX_MONTHS,
  SCRUB_MIN_MONTHS,
  SCRUB_RANGE_MONTHS,
  SCRUB_STEP_MONTHS,
  clampScrubMonths,
  describeScrubOffset,
  ephemerisMsForGameMonths,
  formatEphemerisMs,
  formatGameMonths,
  gameDateAtMonths,
  gameMonthsElapsed,
  gameMonthsForEphemerisMs,
  isPreviewing,
  previewChipText,
  previewRefusalMessage,
  callUnlessPreviewing,
  sceneSecondsFor,
  sceneTimeAt,
} from '../map-time';
import {
  GAME_START_YEAR,
  REAL_MS_PER_GAME_MONTH,
  REAL_SECONDS_PER_GAME_MONTH,
  SERVER_EPOCH_MS,
  getGlobalGameDate,
} from '../server-time';

describe('scrubber clamping', () => {
  it('rounds to whole game months and clamps to the range', () => {
    expect(clampScrubMonths(0)).toBe(0);
    expect(clampScrubMonths(3.4)).toBe(3);
    expect(clampScrubMonths(-3.6)).toBe(-4);
    expect(clampScrubMonths(999)).toBe(SCRUB_MAX_MONTHS);
    expect(clampScrubMonths(-999)).toBe(SCRUB_MIN_MONTHS);
    expect(SCRUB_MAX_MONTHS).toBe(SCRUB_RANGE_MONTHS);
    expect(SCRUB_MIN_MONTHS).toBe(-SCRUB_RANGE_MONTHS);
    expect(SCRUB_STEP_MONTHS).toBe(1);
  });

  it('treats junk as "now" rather than throwing', () => {
    expect(clampScrubMonths(Number.NaN)).toBe(0);
    // Non-finite is not "the far end", it is "we have no idea" — go live.
    expect(clampScrubMonths(Infinity)).toBe(0);
    expect(isPreviewing(Number.NaN)).toBe(false);
  });

  it('knows when it is previewing', () => {
    expect(isPreviewing(0)).toBe(false);
    expect(isPreviewing(0.2)).toBe(false); // rounds to 0
    expect(isPreviewing(1)).toBe(true);
    expect(isPreviewing(-24)).toBe(true);
  });
});

describe('game calendar', () => {
  it('agrees with server-time at the month boundary', () => {
    for (const months of [0, 1, 11, 12, 13, 703]) {
      const ms = SERVER_EPOCH_MS + months * REAL_MS_PER_GAME_MONTH + 1000;
      expect(gameDateAtMonths(gameMonthsElapsed(ms))).toEqual(getGlobalGameDate(ms));
    }
  });

  it('never reports a pre-epoch calendar', () => {
    expect(gameMonthsElapsed(SERVER_EPOCH_MS - 10 * REAL_MS_PER_GAME_MONTH)).toBe(0);
    expect(gameMonthsElapsed(Number.NaN)).toBe(0);
  });

  it('formats a game date the HUD way', () => {
    // server-time.ts counts month 1 of the game calendar as January, even
    // though the server epoch is a real March — the game keeps its own
    // calendar and the ephemeris follows THAT, which is the point.
    expect(formatGameMonths(0)).toBe(`Jan ${GAME_START_YEAR}`);
    expect(formatGameMonths(12)).toBe(`Jan ${GAME_START_YEAR + 1}`);
    expect(formatGameMonths(703)).toBe(formatGameMonths(703.9));
  });

  it('round-trips through the ephemeris instant', () => {
    for (const months of [0, 7.5, 100, 702.25, 1000]) {
      expect(gameMonthsForEphemerisMs(ephemerisMsForGameMonths(months))).toBeCloseTo(months, 6);
    }
  });

  it('maps the game calendar onto the real calendar of the same year', () => {
    // Game month 703 = year 2084, month 8 (Aug). The ephemeris is evaluated
    // in the real August 2084 sky — that is the whole point.
    const d = gameDateAtMonths(703);
    const ms = ephemerisMsForGameMonths(703);
    expect(new Date(ms).getUTCFullYear()).toBe(d.year);
    expect(new Date(ms).getUTCMonth() + 1).toBe(d.month);
    expect(formatEphemerisMs(ms)).toBe(formatGameMonths(703));
  });
});

describe('scene clock', () => {
  it('ticks one second per real second at the live date', () => {
    const t0 = sceneSecondsFor(SERVER_EPOCH_MS + 5_000, 0);
    const t1 = sceneSecondsFor(SERVER_EPOCH_MS + 6_000, 0);
    expect(t1 - t0).toBeCloseTo(1, 9);
  });

  it('jumps a whole game month per scrubbed month', () => {
    const base = sceneSecondsFor(SERVER_EPOCH_MS, 0);
    expect(sceneSecondsFor(SERVER_EPOCH_MS, 1) - base).toBeCloseTo(REAL_SECONDS_PER_GAME_MONTH, 6);
    expect(sceneSecondsFor(SERVER_EPOCH_MS, -2) - base).toBeCloseTo(-2 * REAL_SECONDS_PER_GAME_MONTH, 6);
    // Out-of-range values are clamped before they reach the clock.
    expect(sceneSecondsFor(SERVER_EPOCH_MS, 500) - base)
      .toBeCloseTo(SCRUB_MAX_MONTHS * REAL_SECONDS_PER_GAME_MONTH, 6);
  });

  it('bundles both clocks and the label', () => {
    const ms = SERVER_EPOCH_MS + 703 * REAL_MS_PER_GAME_MONTH;
    const live = sceneTimeAt(ms, 0);
    expect(live.previewing).toBe(false);
    expect(live.scrubMonths).toBe(0);
    expect(live.label).toBe(formatGameMonths(gameMonthsElapsed(ms)));

    const ahead = sceneTimeAt(ms, 12);
    expect(ahead.previewing).toBe(true);
    expect(ahead.gameMonths).toBeCloseTo(live.gameMonths + 12, 6);
    // A year ahead is the same month of the next year.
    expect(ahead.label.slice(0, 3)).toBe(live.label.slice(0, 3));
    expect(Number(ahead.label.slice(4))).toBe(Number(live.label.slice(4)) + 1);
    expect(ahead.ephemerisMs).toBeGreaterThan(live.ephemerisMs);
  });

  it('is pure — the same inputs give the same answer', () => {
    const ms = SERVER_EPOCH_MS + 12_345_678;
    expect(sceneTimeAt(ms, 3)).toEqual(sceneTimeAt(ms, 3));
  });
});

describe('preview refusal copy', () => {
  it('names the previewed date and the way out', () => {
    const msg = previewRefusalMessage('Nov 2084');
    expect(msg).toContain('Nov 2084');
    expect(msg).toContain('Now');
    expect(previewChipText('Nov 2084')).toBe('Preview — Nov 2084');
  });

  it('describes the offset in words, never position alone', () => {
    expect(describeScrubOffset(0)).toBe('live game date');
    expect(describeScrubOffset(1)).toBe('+1 game month');
    expect(describeScrubOffset(7)).toBe('+7 game months');
    expect(describeScrubOffset(-3)).toBe('-3 game months');
  });
});

describe('preview refusal enforcement', () => {
  it('runs the action at the live date', () => {
    const fn = jest.fn();
    const refused = jest.fn();
    expect(callUnlessPreviewing(0, 'Jan 2084', fn, refused, ['leo'])).toBe(true);
    expect(fn).toHaveBeenCalledWith('leo');
    expect(refused).not.toHaveBeenCalled();
  });

  it('refuses — and never calls the action — while previewing', () => {
    const state = { cash: 1_000 };
    const spend = jest.fn(() => { state.cash -= 500; });
    const refused = jest.fn();
    expect(callUnlessPreviewing(7, 'Aug 2084', spend, refused, [])).toBe(false);
    expect(spend).not.toHaveBeenCalled();
    expect(state.cash).toBe(1_000); // the point: no state moved
    expect(refused).toHaveBeenCalledWith(previewRefusalMessage('Aug 2084'));
  });

  it('refuses in both directions and resumes once snapped back', () => {
    const fn = jest.fn();
    const refused = jest.fn();
    expect(callUnlessPreviewing(-1, 'Dec 2083', fn, refused, [])).toBe(false);
    expect(callUnlessPreviewing(24, 'Jul 2086', fn, refused, [])).toBe(false);
    expect(fn).not.toHaveBeenCalled();
    expect(callUnlessPreviewing(0, 'Jul 2084', fn, refused, [])).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
