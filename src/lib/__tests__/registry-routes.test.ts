/**
 * @jest-environment node
 */
import { registryRouteMissing } from '@/lib/registry-routes';

const NOW = new Date('2026-08-28T12:00:00Z');

describe('registryRouteMissing', () => {
  it.each([
    '/rockets/falcon-9', '/rockets/new-glenn/', '/launches/cape-canaveral', '/launches/vandenberg/',
    '/launches/cape-canaveral/2026-08', '/launches/cape-canaveral/2025-08', '/launches/cape-canaveral/2027-02',
    '/guide/watch-a-launch/orlando', '/guide/watch-a-launch/los-angeles/',
    '/tonight/chicago', '/tonight/new-york/', '/tonight/Sydney',
  ])('%s is live', (p) => {
    expect(registryRouteMissing(p, NOW)).toBe(false);
  });

  it.each([
    '/rockets/nope', '/rockets/falcon-10', '/launches/moonbase', '/launches/cape-canaveral/2031-01',
    '/launches/cape-canaveral/2025-07', '/launches/cape-canaveral/2027-03', '/launches/cape-canaveral/october-2026',
    '/launches/nope/2026-08', '/guide/watch-a-launch/atlantis',
    '/tonight/atlantis', '/tonight/houston-tx',
  ])('%s is a real 404', (p) => {
    expect(registryRouteMissing(p, NOW)).toBe(true);
  });

  it('ignores every other path, including the index pages and APIs', () => {
    for (const p of ['/rockets', '/launches', '/launches/', '/api/rockets/x', '/launch/abc', '/rocketsx/falcon-9', '/tonight', '/tonight/']) {
      expect(registryRouteMissing(p, NOW)).toBe(false);
    }
  });

  it('tolerates malformed percent-encoding', () => {
    expect(registryRouteMissing('/rockets/%E0%A4%A', NOW)).toBe(true);
  });
});
