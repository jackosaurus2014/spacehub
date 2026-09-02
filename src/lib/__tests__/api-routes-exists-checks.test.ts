/**
 * @jest-environment node
 */

/**
 * Behavioural tests for the `exists` API routes that back middleware.ts's
 * SLUG_EXISTENCE_CHECKS — the mechanism that gives DB-backed dynamic pages
 * a real HTTP 404 instead of the HTTP 200 that an in-route notFound()
 * produces (see src/lib/__tests__/route-404-status.test.ts for the why).
 *
 * The contract each handler must honour:
 *   - 404 exactly when the page itself would call notFound();
 *   - 200 when the page would render;
 *   - 200 on ANY internal error — middleware treats non-404 as "exists", so
 *     failing open is what stops a DB blip from 404ing real content.
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    buildGuide: { findUnique: jest.fn() },
    countdownWidget: { findUnique: jest.fn() },
    gigOpportunity: { findUnique: jest.fn() },
    spaceHistoryEvent: { findUnique: jest.fn() },
    spaceJobPosting: { findUnique: jest.fn() },
    regulatoryAction: { findUnique: jest.fn() },
    gameProfile: { findUnique: jest.fn() },
    seasonalEvent: { findFirst: jest.fn() },
    courseModule: { findUnique: jest.fn() },
    lesson: { findFirst: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import prisma from '@/lib/db';
import { GET as buildGuideExists } from '@/app/api/build-guides/[slug]/exists/route';
import { GET as jobExists } from '@/app/api/space-jobs/[id]/exists/route';
import { GET as historyExists } from '@/app/api/history/[slug]/exists/route';
import { GET as radarExists } from '@/app/api/regulatory-radar/action/[id]/exists/route';
import { GET as seasonExists } from '@/app/api/space-tycoon/seasons/[n]/exists/route';
import { GET as learnExists } from '@/app/api/learn/exists/route';

const db = prisma as unknown as Record<string, Record<string, jest.Mock>>;

function req(url = 'https://spacenexus.us/api/probe'): NextRequest {
  return new NextRequest(url);
}

beforeEach(() => jest.clearAllMocks());

describe('build-guides exists', () => {
  it('404s an unknown slug', async () => {
    db.buildGuide.findUnique.mockResolvedValue(null);
    expect((await buildGuideExists(req(), { params: Promise.resolve({ slug: 'nope' }) })).status).toBe(404);
  });

  it('404s an unpublished guide — matching the page\'s own notFound() gate', async () => {
    db.buildGuide.findUnique.mockResolvedValue({ id: 'a', published: false });
    expect((await buildGuideExists(req(), { params: Promise.resolve({ slug: 'draft' }) })).status).toBe(404);
  });

  it('200s a published guide', async () => {
    db.buildGuide.findUnique.mockResolvedValue({ id: 'a', published: true });
    expect((await buildGuideExists(req(), { params: Promise.resolve({ slug: 'cansat' }) })).status).toBe(200);
  });

  it('fails OPEN when the query throws', async () => {
    db.buildGuide.findUnique.mockRejectedValue(new Error('connection reset'));
    const res = await buildGuideExists(req(), { params: Promise.resolve({ slug: 'cansat' }) });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ exists: true, error: true });
  });

  it('reads only the columns the decision needs', async () => {
    db.buildGuide.findUnique.mockResolvedValue({ id: 'a', published: true });
    await buildGuideExists(req(), { params: Promise.resolve({ slug: 'cansat' }) });
    expect(db.buildGuide.findUnique).toHaveBeenCalledWith({
      where: { slug: 'cansat' },
      select: { id: true, published: true },
    });
  });
});

describe('space-talent job exists', () => {
  it('404s an inactive posting — the page notFound()s on !isActive', async () => {
    db.spaceJobPosting.findUnique.mockResolvedValue({ id: 'j1', isActive: false });
    expect((await jobExists(req(), { params: Promise.resolve({ id: 'j1' }) })).status).toBe(404);
  });

  it('200s an active posting', async () => {
    db.spaceJobPosting.findUnique.mockResolvedValue({ id: 'j1', isActive: true });
    expect((await jobExists(req(), { params: Promise.resolve({ id: 'j1' }) })).status).toBe(200);
  });

  it('fails OPEN when the query throws', async () => {
    db.spaceJobPosting.findUnique.mockRejectedValue(new Error('timeout'));
    expect((await jobExists(req(), { params: Promise.resolve({ id: 'j1' }) })).status).toBe(200);
  });
});

describe('history exists', () => {
  it('404s unknown, 200s known', async () => {
    db.spaceHistoryEvent.findUnique.mockResolvedValue(null);
    expect((await historyExists(req(), { params: Promise.resolve({ slug: 'x' }) })).status).toBe(404);
    db.spaceHistoryEvent.findUnique.mockResolvedValue({ id: 'h1' });
    expect((await historyExists(req(), { params: Promise.resolve({ slug: 'apollo-11' }) })).status).toBe(200);
  });
});

describe('regulatory-radar action exists', () => {
  it('404s a malformed id without touching the database', async () => {
    const res = await radarExists(req(), { params: Promise.resolve({ id: 'not a cuid!' }) });
    expect(res.status).toBe(404);
    expect(db.regulatoryAction.findUnique).not.toHaveBeenCalled();
  });

  it('404s an id that is well-formed but absent', async () => {
    db.regulatoryAction.findUnique.mockResolvedValue(null);
    expect((await radarExists(req(), { params: Promise.resolve({ id: 'clx123abc' }) })).status).toBe(404);
  });

  it('200s a real action', async () => {
    db.regulatoryAction.findUnique.mockResolvedValue({ id: 'clx123abc' });
    expect((await radarExists(req(), { params: Promise.resolve({ id: 'clx123abc' }) })).status).toBe(200);
  });
});

describe('season chronicle exists', () => {
  it.each(['abc', '', '-1', '3.5', '12abc'])('404s non-integer season %p without querying', async (n) => {
    const res = await seasonExists(req(), { params: Promise.resolve({ n }) });
    expect(res.status).toBe(404);
    expect(db.seasonalEvent.findFirst).not.toHaveBeenCalled();
  });

  it('404s a numeric season with no sealed chronicle (the thin-page case)', async () => {
    db.seasonalEvent.findFirst.mockResolvedValue(null);
    expect((await seasonExists(req(), { params: Promise.resolve({ n: '9999' }) })).status).toBe(404);
  });

  it('200s a sealed season', async () => {
    db.seasonalEvent.findFirst.mockResolvedValue({ id: 's1' });
    expect((await seasonExists(req(), { params: Promise.resolve({ n: '3' }) })).status).toBe(200);
  });

  it('fails OPEN when the query throws', async () => {
    db.seasonalEvent.findFirst.mockRejectedValue(new Error('db down'));
    expect((await seasonExists(req(), { params: Promise.resolve({ n: '3' }) })).status).toBe(200);
  });
});

describe('learn exists (all three depths through one endpoint)', () => {
  const url = (p: string) =>
    req(`https://spacenexus.us/api/learn/exists?path=${encodeURIComponent(p)}`);

  it('404s an unknown track without touching the database', async () => {
    const res = await learnExists(url('not-a-track'));
    expect(res.status).toBe(404);
    expect(db.courseModule.findUnique).not.toHaveBeenCalled();
  });

  it('200s a known track without touching the database (static list)', async () => {
    const res = await learnExists(url('propulsion'));
    expect(res.status).toBe(200);
    expect(db.courseModule.findUnique).not.toHaveBeenCalled();
  });

  it('404s a module whose track column disagrees with the URL', async () => {
    db.courseModule.findUnique.mockResolvedValue({ track: 'space-law', published: true });
    expect((await learnExists(url('propulsion/some-module'))).status).toBe(404);
  });

  it('404s an unpublished module', async () => {
    db.courseModule.findUnique.mockResolvedValue({ track: 'propulsion', published: false });
    expect((await learnExists(url('propulsion/some-module'))).status).toBe(404);
  });

  it('200s a published module on the right track', async () => {
    db.courseModule.findUnique.mockResolvedValue({ track: 'propulsion', published: true });
    expect((await learnExists(url('propulsion/some-module'))).status).toBe(200);
  });

  it('404s a missing lesson', async () => {
    db.lesson.findFirst.mockResolvedValue(null);
    expect((await learnExists(url('propulsion/mod/lesson'))).status).toBe(404);
  });

  it('404s a lesson whose module is on another track', async () => {
    db.lesson.findFirst.mockResolvedValue({ module: { track: 'kids', published: true } });
    expect((await learnExists(url('propulsion/mod/lesson'))).status).toBe(404);
  });

  it('200s a real lesson', async () => {
    db.lesson.findFirst.mockResolvedValue({ module: { track: 'propulsion', published: true } });
    expect((await learnExists(url('propulsion/mod/lesson'))).status).toBe(200);
  });

  it('fails OPEN for a path shape it does not speak for', async () => {
    const res = await learnExists(url('a/b/c/d'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ unchecked: true });
  });

  it('fails OPEN when the query throws', async () => {
    db.courseModule.findUnique.mockRejectedValue(new Error('db down'));
    expect((await learnExists(url('propulsion/some-module'))).status).toBe(200);
  });
});
