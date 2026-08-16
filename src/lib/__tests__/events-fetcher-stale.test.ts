/**
 * Tests for expireStaleUpcomingEvents() in src/lib/events-fetcher.ts.
 *
 * Bug: Launch Library's /upcoming feed stops returning a launch once it's in
 * the past, so fetchLaunchLibraryEvents()'s upsert-only sync never moves a
 * launch's status off 'upcoming'/'go' — the row is stuck forever and
 * pollutes every status-filtered query (getUpcomingEvents, prediction-exchange
 * generation, live/pulse/v1 endpoints, etc). This transition pass sweeps
 * those stale rows to 'scrubbed' after a grace period.
 *
 * Pure date-logic + a mocked prisma.spaceEvent.updateMany — no real DB.
 */

const mockUpdateMany = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    spaceEvent: {
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}));

import { expireStaleUpcomingEvents, STALE_EVENT_GRACE_MS } from '@/lib/events-fetcher';

describe('expireStaleUpcomingEvents', () => {
  beforeEach(() => {
    mockUpdateMany.mockReset();
    mockUpdateMany.mockResolvedValue({ count: 0 });
  });

  it('queries only upcoming/go statuses with launchDate older than the grace cutoff', async () => {
    const now = new Date('2026-08-16T12:00:00Z');
    await expireStaleUpcomingEvents(now);

    expect(mockUpdateMany).toHaveBeenCalledTimes(1);
    const call = mockUpdateMany.mock.calls[0][0];

    expect(call.where.status).toEqual({ in: ['upcoming', 'go'] });
    expect(call.where.launchDate.lt.getTime()).toBe(now.getTime() - STALE_EVENT_GRACE_MS);
  });

  it('writes status "scrubbed" (not "completed") so prediction-exchange keeps resolving conservatively', async () => {
    const now = new Date('2026-08-16T12:00:00Z');
    await expireStaleUpcomingEvents(now);

    const call = mockUpdateMany.mock.calls[0][0];
    expect(call.data.status).toBe('scrubbed');
    expect(call.data.status).not.toBe('completed');
    expect(call.data.updatedAt).toEqual(now);
  });

  it('does not include tbd/tbc statuses in the sweep (out of scope for this pass)', async () => {
    const now = new Date('2026-08-16T12:00:00Z');
    await expireStaleUpcomingEvents(now);

    const call = mockUpdateMany.mock.calls[0][0];
    expect(call.where.status.in).not.toContain('tbd');
    expect(call.where.status.in).not.toContain('tbc');
    expect(call.where.status.in).not.toContain('completed');
    expect(call.where.status.in).not.toContain('scrubbed');
  });

  it('defaults `now` to the current time when not provided', async () => {
    const before = Date.now();
    await expireStaleUpcomingEvents();
    const after = Date.now();

    const call = mockUpdateMany.mock.calls[0][0];
    const cutoff = call.where.launchDate.lt.getTime();
    // cutoff should be ~24h before "now" (some point between the before/after
    // timestamps bracketing the call), i.e. within [before, after] - grace.
    expect(cutoff).toBeGreaterThanOrEqual(before - STALE_EVENT_GRACE_MS);
    expect(cutoff).toBeLessThanOrEqual(after - STALE_EVENT_GRACE_MS);
  });

  it('returns the count of rows updated by prisma', async () => {
    mockUpdateMany.mockResolvedValueOnce({ count: 7 });
    const result = await expireStaleUpcomingEvents(new Date('2026-08-16T12:00:00Z'));
    expect(result).toBe(7);
  });

  it('returns 0 when nothing is stale', async () => {
    mockUpdateMany.mockResolvedValueOnce({ count: 0 });
    const result = await expireStaleUpcomingEvents(new Date('2026-08-16T12:00:00Z'));
    expect(result).toBe(0);
  });

  it('grace period is exactly 24 hours', () => {
    expect(STALE_EVENT_GRACE_MS).toBe(24 * 60 * 60 * 1000);
  });
});
