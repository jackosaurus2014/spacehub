/**
 * @jest-environment node
 */
import type { RadarEntry, RadarEffectiveEntry } from '../regulatory-radar';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { regulatoryAction: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() } },
}));

import {
  assembleRegulatoryDeadlines,
  groupDeadlinesByWeek,
  serializeDeadlineWeeks,
  startOfWeekUtc,
} from '../regulatory-deadlines';

const NOW = new Date('2026-08-17T12:00:00Z'); // a Monday

let seq = 0;
function entry(overrides: Partial<RadarEntry> = {}): RadarEntry {
  seq++;
  return {
    id: `entry${seq}`,
    dedupKey: `federal-register:doc-${seq}`,
    source: 'federal-register',
    category: 'spectrum',
    title: `Tracked action ${seq}`,
    summary: null,
    actionDate: new Date('2026-08-10T12:00:00Z'),
    url: `https://www.federalregister.gov/documents/${seq}`,
    agency: 'Federal Communications Commission',
    documentType: 'Proposed Rule',
    actionText: null,
    commentUrl: null,
    commentCloseDate: null,
    significant: false,
    ...overrides,
  };
}

function effectiveEntry(effectiveDate: Date, overrides: Partial<RadarEntry> = {}): RadarEffectiveEntry {
  return { ...entry(overrides), effectiveDate };
}

describe('startOfWeekUtc', () => {
  it('returns Monday 00:00 UTC for any day of the week', () => {
    expect(startOfWeekUtc(new Date('2026-08-17T12:00:00Z'))).toEqual(new Date('2026-08-17T00:00:00Z')); // Monday
    expect(startOfWeekUtc(new Date('2026-08-20T23:59:00Z'))).toEqual(new Date('2026-08-17T00:00:00Z')); // Thursday
    expect(startOfWeekUtc(new Date('2026-08-23T01:00:00Z'))).toEqual(new Date('2026-08-17T00:00:00Z')); // Sunday
    expect(startOfWeekUtc(new Date('2026-08-24T00:00:00Z'))).toEqual(new Date('2026-08-24T00:00:00Z')); // next Monday
  });
});

describe('assembleRegulatoryDeadlines', () => {
  it('merges comment closings and effective dates chronologically', () => {
    const items = assembleRegulatoryDeadlines(
      [entry({ commentCloseDate: new Date('2026-09-05T23:59:59Z'), commentUrl: 'https://www.regulations.gov/c/1' })],
      [effectiveEntry(new Date('2026-08-25T12:00:00Z'))],
      NOW
    );
    expect(items.map((i) => i.kind)).toEqual(['rule-effective', 'comments-close']);
    expect(items[1].url).toBe('https://www.regulations.gov/c/1'); // comment portal preferred
  });

  it('bounds items to [now, now + horizon]', () => {
    const items = assembleRegulatoryDeadlines(
      [entry({ commentCloseDate: new Date('2026-08-01T23:59:59Z') })], // past
      [effectiveEntry(new Date('2027-01-15T12:00:00Z'))], // beyond 90 days
      NOW,
      90
    );
    expect(items).toEqual([]);
  });

  it('yields two items for an entry carrying both a comment close AND an effective date', () => {
    const both = entry({ commentCloseDate: new Date('2026-08-30T23:59:59Z') });
    const items = assembleRegulatoryDeadlines(
      [both],
      [{ ...both, effectiveDate: new Date('2026-10-01T12:00:00Z') }],
      NOW
    );
    expect(items).toHaveLength(2);
    expect(new Set(items.map((i) => i.kind))).toEqual(new Set(['comments-close', 'rule-effective']));
  });

  it('deduplicates repeated entries by key', () => {
    const e = entry({ commentCloseDate: new Date('2026-08-30T23:59:59Z') });
    const items = assembleRegulatoryDeadlines([e, e], [], NOW);
    expect(items).toHaveLength(1);
  });
});

describe('groupDeadlinesByWeek + serializeDeadlineWeeks', () => {
  it('groups sorted items into UTC weeks, preserving order', () => {
    const items = assembleRegulatoryDeadlines(
      [
        entry({ commentCloseDate: new Date('2026-08-19T23:59:59Z') }),
        entry({ commentCloseDate: new Date('2026-08-21T23:59:59Z') }),
        entry({ commentCloseDate: new Date('2026-09-02T23:59:59Z') }),
      ],
      [],
      NOW
    );
    const weeks = groupDeadlinesByWeek(items);
    expect(weeks).toHaveLength(2);
    expect(weeks[0].weekStart).toEqual(new Date('2026-08-17T00:00:00Z'));
    expect(weeks[0].items).toHaveLength(2);
    expect(weeks[1].weekStart).toEqual(new Date('2026-08-31T00:00:00Z'));

    const serialized = serializeDeadlineWeeks(items);
    expect(serialized[0].weekStart).toBe('2026-08-17T00:00:00.000Z');
    expect(serialized[0].items[0].date < serialized[0].items[1].date).toBe(true);
    expect(serialized[0].items[0].kind).toBe('comments-close');
  });

  it('serializes to [] for an empty calendar (honest empty state)', () => {
    expect(serializeDeadlineWeeks([])).toEqual([]);
  });
});
