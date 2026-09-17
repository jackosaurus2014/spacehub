/**
 * @jest-environment node
 */
import { isLaunchDaySurface } from '../launch-day-surface';

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
