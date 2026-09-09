/**
 * AdSense gating guard (2026-09-09).
 *
 * /pricing promises Pro members an ad-free site. The AdSense script used to
 * load unconditionally from the root layout, so Google's page-level units
 * (anchor bars, vignettes) reached every visitor on every route — Pro and
 * trial members included, and the Space Tycoon command deck, where an anchor
 * bar was found sitting over the outliner. The script now loads only through
 * AdSenseLoader, and AdBanner renders nothing on an ad-free tier.
 */
import fs from 'fs';
import path from 'path';
import { AD_FREE_ROUTE_PREFIXES, adsAllowedOnRoute } from '@/components/ads/AdSenseLoader';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');

describe('AdSense gating', () => {
  it('the root layout does not load adsbygoogle directly', () => {
    const layout = read('src/app/layout.tsx');
    expect(layout).not.toMatch(/pagead2\.googlesyndication\.com/);
    expect(layout).toMatch(/<AdSenseLoader \/>/);
  });

  it('the loader is tier- and route-gated', () => {
    const loader = read('src/components/ads/AdSenseLoader.tsx');
    expect(loader).toMatch(/tier !== 'free'/);
    expect(loader).toMatch(/adsAllowedOnRoute\(pathname\)/);
  });

  it('AdBanner renders nothing for an ad-free tier', () => {
    const banner = read('src/components/ads/AdBanner.tsx');
    expect(banner).toMatch(/const adFree = isLoading \|\| tier !== 'free'/);
    expect(banner).toMatch(/\|\| adFree\) \{\s*return null;/);
  });

  it('the game and account surfaces are ad-free routes', () => {
    for (const route of ['/space-tycoon', '/space-tycoon/about', '/embed/launch-calendar', '/widgets', '/account', '/checkout/success', '/login']) {
      expect(adsAllowedOnRoute(route)).toBe(false);
    }
    for (const route of ['/', '/news', '/launches', '/guide/blue-origin-vs-spacex', '/company-profiles/spacex']) {
      expect(adsAllowedOnRoute(route)).toBe(true);
    }
    expect(AD_FREE_ROUTE_PREFIXES).toContain('/space-tycoon');
  });
});
