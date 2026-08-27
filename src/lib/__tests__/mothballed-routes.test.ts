/**
 * @jest-environment node
 */
/**
 * Mothball registry — Phase 2 of the 2026-08 consolidation. Pins three
 * things: every mothballed prefix lands on a hub that is itself live (never
 * a redirect loop), the live halves of each suite are untouched, and prefix
 * matching is segment-aware.
 */
import { readFileSync } from 'fs';
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
    ['/community/forums', '/community'],
    ['/community/forums/launch-tech/abc123', '/community'],
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

describe('sitemap', () => {
  it('lists no mothballed path — crawlers must not be sent into 307s', () => {
    const source = readFileSync(join(__dirname, '../../app/sitemap.ts'), 'utf8');
    const urls = Array.from(source.matchAll(/\$\{BASE_URL\}(\/[^`'"]*)/g)).map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(50);
    const offenders = urls.filter((u) => resolveMothball(u));
    expect(offenders).toEqual([]);
  });
});
