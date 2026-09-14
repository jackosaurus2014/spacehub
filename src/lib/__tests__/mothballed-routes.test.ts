/**
 * @jest-environment node
 */
/**
 * Mothball registry — Phase 2 of the 2026-08 consolidation. Pins three
 * things: every mothballed prefix lands on a hub that is itself live (never
 * a redirect loop), the live halves of each suite are untouched, and prefix
 * matching is segment-aware.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { MOTHBALLED_ROUTES, resolveMothball } from '../mothballed-routes';

describe('MOTHBALLED_ROUTES', () => {
  it('never redirects a hub to a mothballed path (no loops)', () => {
    for (const r of MOTHBALLED_ROUTES) {
      expect(resolveMothball(r.redirectTo)).toBeNull();
    }
  });

  it('has no duplicate prefixes', () => {
    const prefixes = MOTHBALLED_ROUTES.map((r) => r.prefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });
});

describe('resolveMothball', () => {
  it.each([
    ['/messages', '/community'],
    ['/messages/', '/community'],
    ['/mentors/user_1', '/community'],
    ['/speaking/submit', '/community'],
    ['/marketplace/rfq/new', '/marketplace'],
    ['/deal-rooms', '/marketplace'],
    ['/deal-room', '/marketplace'],
    ['/ticket-resale/my-listings', '/marketplace'],
    ['/gig-work/post', '/marketplace'],
  ])('%s → %s', (path, hub) => {
    expect(resolveMothball(path)?.redirectTo).toBe(hub);
  });

  it.each([
    '/community',
    '/community/guidelines',
    // Relisted 2026-09-14 with the anchor-based cold start. The rest of the
    // social suite below is still mothballed, so this pair pins that the
    // forum came off the list WITHOUT taking its neighbours with it.
    '/community/forums',
    '/community/forums/launch-tech',
    '/community/forums/launch-tech/abc123',
    '/marketplace',
    '/marketplace/search',
    '/marketplace/listings/rocket-lab-launch',
    '/provider-dashboard',
    '/inbox',
    '/hire',
    '/jobs',
    '/admin/speaking',
    '/api/speaking/123/exists',
    '/api/messages/unread',
    '/messagesboard',
    '/',
  ])('leaves %s live', (path) => {
    expect(resolveMothball(path)).toBeNull();
  });
});

describe('the forum is relisted, its neighbours are not', () => {
  // The registry and the route tree have to agree. A prefix left in the
  // registry while the pages are live is a silent 307 on a shipped feature;
  // a prefix removed while the pages are gone is a 404. This pins both
  // directions for the 2026-09-14 forum revival.
  it('has no /community/forums row left in the registry', () => {
    expect(MOTHBALLED_ROUTES.map((r) => r.prefix)).not.toContain('/community/forums');
  });

  it('still mothballs the rest of the social suite', () => {
    const social = MOTHBALLED_ROUTES.filter((r) => r.group === 'social').map((r) => r.prefix);
    expect(social).toEqual(
      expect.arrayContaining([
        '/community/directory',
        '/community/profile',
        '/messages',
        '/mentors',
        '/amas',
        '/study-groups',
        '/speaking',
        '/teams',
      ])
    );
  });

  it('serves a real page at every relisted forum route', () => {
    // resolveMothball returning null only means the middleware lets it
    // through — the page has to actually exist, or relisting swapped a 307
    // for a 404.
    for (const f of [
      '../../app/community/forums/page.tsx',
      '../../app/community/forums/[slug]/page.tsx',
      '../../app/community/forums/[slug]/[threadId]/page.tsx',
    ]) {
      expect(existsSync(join(__dirname, f))).toBe(true);
    }
  });
});

describe('sitemap', () => {
  it('lists no mothballed path — crawlers must not be sent into 307s', () => {
    const source = readFileSync(join(__dirname, '../../app/sitemap.ts'), 'utf8');
    const urls = Array.from(source.matchAll(/\$\{BASE_URL\}(\/[^`'"]*)/g)).map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(50);
    const offenders = urls.filter((u) => resolveMothball(u));
    expect(offenders).toEqual([]);
  });
});
