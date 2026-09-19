/**
 * @jest-environment node
 *
 * /api/beacon — the counters. Prisma is mocked; nothing touches a database.
 *
 * The raw unique count turned out to be mostly a crawler that runs JavaScript
 * (2026-09-18: 3,004 "visitors", flat around the clock, top entry /feedback),
 * so the numbers anyone reasons from are `engagedUniques` and
 * `referredUniques`. These tests pin how those two move, because a counter
 * that double-counts is worse than the one it replaced: it looks measured.
 */
import { NextRequest } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    siteTrafficVisitor: { createMany: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
    siteTrafficDay: { upsert: jest.fn() },
  },
}));

import prisma from '@/lib/db';
import * as route from '@/app/api/beacon/route';
import { ENGAGEMENT_EVENTS } from '../traffic-truth';

const db = prisma as unknown as {
  siteTrafficVisitor: { createMany: jest.Mock; updateMany: jest.Mock; deleteMany: jest.Mock };
  siteTrafficDay: { upsert: jest.Mock };
};

const BROWSER =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';

function post(body: unknown, ua: string = BROWSER): NextRequest {
  return new NextRequest('https://spacenexus.us/api/beacon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'user-agent': ua, 'x-forwarded-for': '203.0.113.7' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  db.siteTrafficVisitor.createMany.mockResolvedValue({ count: 1 });
  db.siteTrafficVisitor.updateMany.mockResolvedValue({ count: 1 });
  db.siteTrafficVisitor.deleteMany.mockResolvedValue({ count: 0 });
  // Not the first view of the day, so the purge stays out of the way.
  db.siteTrafficDay.upsert.mockResolvedValue({ pageViews: 5 });
});

describe('beacon: a page view', () => {
  it('counts a new referred visitor as a unique and a referred unique', async () => {
    const res = await route.POST(post({ path: '/jobs', referrer: 'https://www.google.com/search?q=x' }));
    expect(res.status).toBe(204);
    const { update } = db.siteTrafficDay.upsert.mock.calls[0][0];
    expect(update).toEqual({
      pageViews: { increment: 1 },
      uniques: { increment: 1 },
      referredUniques: { increment: 1 },
    });
  });

  it('does not count an unreferred visitor as referred', async () => {
    await route.POST(post({ path: '/feedback', referrer: null }));
    const { update } = db.siteTrafficDay.upsert.mock.calls[0][0];
    expect(update).toEqual({ pageViews: { increment: 1 }, uniques: { increment: 1 } });
  });

  it('counts a repeat view as a view only, even if it carries a referrer', async () => {
    db.siteTrafficVisitor.createMany.mockResolvedValue({ count: 0 });
    await route.POST(post({ path: '/news', referrer: 'https://bing.com/' }));
    const { update } = db.siteTrafficDay.upsert.mock.calls[0][0];
    expect(update).toEqual({ pageViews: { increment: 1 } });
  });

  it('never marks a view as engaged', async () => {
    await route.POST(post({ path: '/jobs' }));
    expect(db.siteTrafficVisitor.createMany.mock.calls[0][0].data[0].engaged).toBeUndefined();
    expect(db.siteTrafficVisitor.updateMany).not.toHaveBeenCalled();
  });
});

describe('beacon: an engaged ping', () => {
  it('flips an existing visitor once and counts no view', async () => {
    db.siteTrafficVisitor.createMany.mockResolvedValue({ count: 0 });
    await route.POST(post({ path: '/jobs', engaged: true }));
    expect(db.siteTrafficVisitor.updateMany.mock.calls[0][0].where.engaged).toBe(false);
    const { update } = db.siteTrafficDay.upsert.mock.calls[0][0];
    expect(update).toEqual({ engagedUniques: { increment: 1 } });
  });

  it('counts nothing the second time the same visitor reports input', async () => {
    db.siteTrafficVisitor.createMany.mockResolvedValue({ count: 0 });
    db.siteTrafficVisitor.updateMany.mockResolvedValue({ count: 0 });
    await route.POST(post({ path: '/news', engaged: true }));
    expect(db.siteTrafficDay.upsert).not.toHaveBeenCalled();
  });

  it('still counts the visitor when the view ping never landed', async () => {
    await route.POST(post({ path: '/jobs', engaged: true }));
    expect(db.siteTrafficVisitor.updateMany).not.toHaveBeenCalled();
    const { update } = db.siteTrafficDay.upsert.mock.calls[0][0];
    expect(update).toEqual({ engagedUniques: { increment: 1 }, uniques: { increment: 1 } });
  });

  it('is dropped for an automated user agent like any other ping', async () => {
    await route.POST(post({ path: '/jobs', engaged: true }, 'HeadlessChrome/120.0.0.0'));
    expect(db.siteTrafficVisitor.createMany).not.toHaveBeenCalled();
  });
});

describe('beacon: what counts as input', () => {
  it('does not accept scroll, which a crawler fires with scrollTo()', () => {
    expect(ENGAGEMENT_EVENTS).not.toContain('scroll');
    expect(ENGAGEMENT_EVENTS).toEqual(
      expect.arrayContaining(['pointermove', 'touchstart', 'wheel', 'keydown'])
    );
  });

  it('keeps the event list importable by a client component', () => {
    // traffic-truth.ts imports node crypto; the client beacon must not.
    const src = (f: string) => readFileSync(join(process.cwd(), f), 'utf8');
    expect(src('src/lib/engagement-events.ts')).not.toMatch(/from ['"]crypto['"]/);
    const beacon = src('src/components/analytics/TrafficBeacon.tsx');
    expect(beacon).not.toMatch(/traffic-truth['"]/);
    expect(beacon).toMatch(/isTrusted/);
  });
});
