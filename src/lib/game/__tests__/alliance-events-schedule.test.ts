/**
 * 4X Upgrade Wave W3 — alliance-event generation schedule
 * (docs/4X_BASELINE_2026-08.md defect ledger #8 / audit C4). Covers the
 * pure, DB-free scheduling functions consumed by the alliance-cron route's
 * new "Alliance Event Generation" step:
 *  - Determinism per category.
 *  - No overlap within a category's own cycle.
 *  - Full rotation across each category's type list.
 */
import {
  getAllianceEventSchedule,
  getAllianceEventCycleNumber,
  ALLIANCE_EVENT_MAP,
  type AllianceEventCategory,
} from '../alliance-events';

const CATEGORIES: AllianceEventCategory[] = ['sprint', 'challenge', 'mega_event'];

describe('alliance-events: getAllianceEventSchedule determinism', () => {
  test.each(CATEGORIES)('%s: same cycle number always returns the same window', (category) => {
    const a = getAllianceEventSchedule(category, 4);
    const b = getAllianceEventSchedule(category, 4);
    expect(a.type).toBe(b.type);
    expect(a.startsAt.getTime()).toBe(b.startsAt.getTime());
    expect(a.endsAt.getTime()).toBe(b.endsAt.getTime());
  });

  test.each(CATEGORIES)('%s: cycle window duration matches the event def durationDays', (category) => {
    const { type, startsAt, endsAt } = getAllianceEventSchedule(category, 1);
    const def = ALLIANCE_EVENT_MAP.get(type)!;
    const durationDays = (endsAt.getTime() - startsAt.getTime()) / (24 * 60 * 60 * 1000);
    expect(durationDays).toBeCloseTo(def.durationDays, 5);
  });

  test.each(CATEGORIES)('%s: consecutive cycles never overlap', (category) => {
    for (let c = 1; c < 12; c++) {
      const cur = getAllianceEventSchedule(category, c);
      const next = getAllianceEventSchedule(category, c + 1);
      expect(next.startsAt.getTime()).toBeGreaterThanOrEqual(cur.endsAt.getTime());
    }
  });

  test('sprint category rotates through all 5 of its types across one cycle', () => {
    const seen = new Set<string>();
    for (let c = 1; c <= 5; c++) seen.add(getAllianceEventSchedule('sprint', c).type);
    expect(seen.size).toBe(5);
    expect(getAllianceEventSchedule('sprint', 6).type).toBe(getAllianceEventSchedule('sprint', 1).type);
  });

  test('mega_event category rotates through both of its types', () => {
    const t1 = getAllianceEventSchedule('mega_event', 1).type;
    const t2 = getAllianceEventSchedule('mega_event', 2).type;
    expect(t1).not.toBe(t2);
    expect(getAllianceEventSchedule('mega_event', 3).type).toBe(t1);
  });
});

describe('alliance-events: getAllianceEventCycleNumber', () => {
  test.each(CATEGORIES)('%s: agrees with getAllianceEventSchedule at cycle boundaries', (category) => {
    for (let c = 1; c <= 6; c++) {
      const { startsAt, endsAt } = getAllianceEventSchedule(category, c);
      const mid = new Date((startsAt.getTime() + endsAt.getTime()) / 2);
      expect(getAllianceEventCycleNumber(category, mid)).toBe(c);
      expect(getAllianceEventCycleNumber(category, startsAt)).toBe(c);
    }
  });
});
