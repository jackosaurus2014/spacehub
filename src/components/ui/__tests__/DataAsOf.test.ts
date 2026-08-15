import { formatAsOfDate, oldestAsOfDate } from '@/components/ui/DataAsOf';

describe('formatAsOfDate', () => {
  it('formats a Date into "Month Day, Year"', () => {
    expect(formatAsOfDate(new Date('2026-03-15T00:00:00Z'))).toBe('March 15, 2026');
  });

  it('formats an ISO string', () => {
    expect(formatAsOfDate('2025-11-01T12:00:00Z')).toBe('November 1, 2025');
  });

  it('returns null for null/undefined', () => {
    expect(formatAsOfDate(null)).toBeNull();
    expect(formatAsOfDate(undefined)).toBeNull();
  });

  it('returns null for an unparseable string', () => {
    expect(formatAsOfDate('not-a-date')).toBeNull();
  });
});

describe('oldestAsOfDate', () => {
  it('picks the oldest of several dates', () => {
    const result = oldestAsOfDate([
      '2026-06-01T00:00:00Z',
      '2026-01-15T00:00:00Z', // oldest
      '2026-03-01T00:00:00Z',
    ]);
    expect(result).toBe('January 15, 2026');
  });

  it('ignores null/undefined/unparseable entries', () => {
    const result = oldestAsOfDate([null, undefined, 'garbage', '2026-02-01T00:00:00Z']);
    expect(result).toBe('February 1, 2026');
  });

  it('returns null when every entry is missing/unparseable', () => {
    expect(oldestAsOfDate([null, undefined, 'garbage'])).toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(oldestAsOfDate([])).toBeNull();
  });
});
