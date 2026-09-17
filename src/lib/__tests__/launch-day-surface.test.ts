/**
 * @jest-environment node
 */
import { isDocumentNavigation, isLaunchDaySurface } from '../launch-day-surface';

/**
 * Guards a privacy scope, not a feature.
 *
 * `sn_vid` is a one-year httpOnly UUID. Until 2026-09-17 middleware set it on
 * every page navigation, so every visitor to every page carried a persistent
 * unique identifier written before the cookie banner had asked them anything.
 * These tests pin the surfaces where setting it is actually load-bearing.
 *
 * If a new page starts calling `resolveLaunchDayActor()`, widen
 * `isLaunchDaySurface()` and add the path here in the same commit. Do not
 * widen it to make something else convenient.
 */
describe('isLaunchDaySurface', () => {
  it('matches the launch-day hub and an individual launch page', () => {
    expect(isLaunchDaySurface('/launch')).toBe(true);
    expect(isLaunchDaySurface('/launch/abc123')).toBe(true);
    expect(isLaunchDaySurface('/launch/abc123/replay')).toBe(true);
  });

  it.each([
    // One of our six busiest landing pages the month this was found.
    '/launches/cape-canaveral/2026-11',
    '/launches',
    '/launch-cadence',
    '/launch-slips',
    '/guide/space-launch-cost-comparison',
    '/jobs',
    '/',
  ])('does not mark a visitor on %s', (path) => {
    expect(isLaunchDaySurface(path)).toBe(false);
  });

  it('is not fooled by a prefix that merely starts with the word', () => {
    // `startsWith('/launch')` alone would have matched all of these, which is
    // the bug this helper exists to avoid.
    expect(isLaunchDaySurface('/launchpad')).toBe(false);
    expect(isLaunchDaySurface('/launches/anything')).toBe(false);
  });
});

/**
 * The path test alone was not enough, and this is the case that proved it:
 * /guide/space-launch-cost-comparison links to a launch page, Next.js
 * prefetches links that enter the viewport, and that prefetch set `sn_vid`
 * for a reader who never opened a launch page.
 */
describe('isDocumentNavigation', () => {
  const headers = (h: Record<string, string>) => ({
    get: (name: string) => h[name.toLowerCase()] ?? null,
  });

  it('accepts a person opening the page', () => {
    expect(
      isDocumentNavigation(headers({ 'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate' }))
    ).toBe(true);
  });

  it('rejects the Next.js link prefetch that caused the leak', () => {
    expect(
      isDocumentNavigation(
        headers({ rsc: '1', 'next-router-prefetch': '1', 'sec-fetch-dest': 'empty' })
      )
    ).toBe(false);
  });

  it('rejects a plain RSC payload fetch on client-side navigation', () => {
    expect(isDocumentNavigation(headers({ rsc: '1', 'sec-fetch-dest': 'empty' }))).toBe(false);
  });

  it('rejects a subresource fetch', () => {
    expect(isDocumentNavigation(headers({ 'sec-fetch-dest': 'empty' }))).toBe(false);
    expect(isDocumentNavigation(headers({ 'sec-fetch-dest': 'image' }))).toBe(false);
  });

  it('does not break a client too old to send Sec-Fetch-Dest', () => {
    // Refusing here would break the feature for a real visitor, which is a
    // worse outcome than marking one; an RSC header still disqualifies it.
    expect(isDocumentNavigation(headers({}))).toBe(true);
    expect(isDocumentNavigation(headers({ rsc: '1' }))).toBe(false);
  });
});
