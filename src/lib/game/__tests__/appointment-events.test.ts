/**
 * @jest-environment node
 *
 * Live-Service Wave LS3 — fixed-UTC appointment world events.
 * Covers: deterministic weekly cadence/seeding, window math, bonus
 * derivation and its cap-friendly shape.
 */
import {
  APPOINTMENT_WEEK_MS,
  APPOINTMENT_EVENT_CATALOG,
  getAppointmentWeekIndex,
  isAppointmentEventWeek,
  getAppointmentEventForWeek,
  getUpcomingAppointmentEvents,
  getActiveAppointmentEvents,
  deriveAppointmentEventBonuses,
} from '../appointment-events';

const NOW = Date.UTC(2026, 7, 14, 12, 0, 0); // 2026-08-14 12:00 UTC

describe('appointment event cadence', () => {
  it('fires only on even week indices', () => {
    const weekIndex = getAppointmentWeekIndex(NOW);
    for (let w = weekIndex; w < weekIndex + 10; w++) {
      expect(isAppointmentEventWeek(w)).toBe(w % 2 === 0);
    }
  });

  it('produces an instance on an "on" week and null on an "off" week', () => {
    const weekIndex = getAppointmentWeekIndex(NOW);
    const onWeek = weekIndex % 2 === 0 ? weekIndex : weekIndex + 1;
    const offWeek = onWeek + 1;
    expect(getAppointmentEventForWeek(onWeek)).not.toBeNull();
    expect(getAppointmentEventForWeek(offWeek)).toBeNull();
  });

  it('keeps the instance window inside its own week', () => {
    const weekIndex = getAppointmentWeekIndex(NOW);
    const onWeek = weekIndex % 2 === 0 ? weekIndex : weekIndex + 1;
    const inst = getAppointmentEventForWeek(onWeek)!;
    const weekStart = onWeek * APPOINTMENT_WEEK_MS;
    expect(inst.startsAtMs).toBeGreaterThanOrEqual(weekStart);
    expect(inst.startsAtMs).toBeLessThan(weekStart + APPOINTMENT_WEEK_MS);
    expect(inst.endsAtMs).toBeGreaterThan(inst.startsAtMs);
    expect(APPOINTMENT_EVENT_CATALOG).toContainEqual(inst.def);
  });
});

describe('determinism', () => {
  it('the same week index always yields the identical instance', () => {
    const weekIndex = getAppointmentWeekIndex(NOW);
    const a = getAppointmentEventForWeek(weekIndex);
    const b = getAppointmentEventForWeek(weekIndex);
    expect(a).toEqual(b);
  });

  it('different week indices are not forced into the same catalog entry every time', () => {
    // Sample several "on" weeks and confirm the catalog isn't degenerate
    // (i.e. the RNG selection actually varies across weeks).
    const seen = new Set<string>();
    for (let w = 0; w < 40; w += 2) {
      const inst = getAppointmentEventForWeek(w);
      if (inst) seen.add(inst.def.id);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('getUpcomingAppointmentEvents', () => {
  it('only returns instances overlapping the requested horizon', () => {
    const upcoming = getUpcomingAppointmentEvents(NOW, 14);
    for (const inst of upcoming) {
      expect(inst.endsAtMs).toBeGreaterThanOrEqual(NOW);
      expect(inst.startsAtMs).toBeLessThanOrEqual(NOW + 14 * 24 * 60 * 60 * 1000);
    }
  });

  it('is sorted ascending by start time', () => {
    const upcoming = getUpcomingAppointmentEvents(NOW, 60);
    for (let i = 1; i < upcoming.length; i++) {
      expect(upcoming[i].startsAtMs).toBeGreaterThanOrEqual(upcoming[i - 1].startsAtMs);
    }
  });

  it('a longer horizon never returns fewer events than a shorter one', () => {
    const short = getUpcomingAppointmentEvents(NOW, 7);
    const long = getUpcomingAppointmentEvents(NOW, 30);
    expect(long.length).toBeGreaterThanOrEqual(short.length);
  });
});

describe('getActiveAppointmentEvents + bonuses', () => {
  it('returns no active events when none overlap "now"', () => {
    // Find an off-week moment (a week with no event at all) to test the
    // null path deterministically.
    const weekIndex = getAppointmentWeekIndex(NOW);
    const offWeek = weekIndex % 2 === 0 ? weekIndex + 1 : weekIndex;
    const offWeekMidpoint = offWeek * APPOINTMENT_WEEK_MS + APPOINTMENT_WEEK_MS / 2;
    expect(getActiveAppointmentEvents(offWeekMidpoint)).toEqual([]);
    expect(deriveAppointmentEventBonuses(offWeekMidpoint)).toBeNull();
  });

  it('an active event contributes a bonus on its declared channel, capped sanely', () => {
    const weekIndex = getAppointmentWeekIndex(NOW);
    const onWeek = weekIndex % 2 === 0 ? weekIndex : weekIndex + 1;
    const inst = getAppointmentEventForWeek(onWeek)!;
    const midpoint = inst.startsAtMs + 1000; // just after it starts
    const active = getActiveAppointmentEvents(midpoint);
    expect(active.length).toBeGreaterThan(0);

    const bonuses = deriveAppointmentEventBonuses(midpoint);
    expect(bonuses).not.toBeNull();
    expect(bonuses!.contractPayoutBonus).toBeGreaterThanOrEqual(0);
    expect(bonuses!.researchSpeedBonus).toBeGreaterThanOrEqual(0);
    expect(bonuses!.contractPayoutBonus + bonuses!.researchSpeedBonus).toBeGreaterThan(0);
    expect(bonuses!.expiresAtMs).toBe(inst.endsAtMs);
  });
});

describe('catalog integrity', () => {
  it('every catalog entry has a modest, positive, capped bonus amount', () => {
    for (const def of APPOINTMENT_EVENT_CATALOG) {
      expect(def.bonusAmount).toBeGreaterThan(0);
      expect(def.bonusAmount).toBeLessThanOrEqual(0.10); // WORLD_EVENT_*_BONUS_CAP in server-effects.ts
      expect(def.durationHours).toBeGreaterThan(0);
    }
  });
});
