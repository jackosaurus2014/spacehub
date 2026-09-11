/**
 * @jest-environment jsdom
 *
 * Market ticker back in global chrome with a per-browser off switch
 * (2026-09-10). Pins: default ON, the pref round-trips, hidden routes,
 * the layout mount, no duplicate mount on /space-stocks, and both places
 * that write the preference.
 */
import fs from 'fs';
import path from 'path';
import { isMarketTickerEnabled, setMarketTickerEnabled, marketTickerHiddenOnPath, MARKET_TICKER_PREF_KEY } from '../market-ticker-pref';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');

describe('market ticker preference', () => {
  beforeEach(() => localStorage.clear());
  it('is on by default and round-trips off/on', () => {
    expect(isMarketTickerEnabled()).toBe(true);
    setMarketTickerEnabled(false);
    expect(localStorage.getItem(MARKET_TICKER_PREF_KEY)).toBe('off');
    expect(isMarketTickerEnabled()).toBe(false);
    setMarketTickerEnabled(true);
    expect(localStorage.getItem(MARKET_TICKER_PREF_KEY)).toBeNull();
    expect(isMarketTickerEnabled()).toBe(true);
  });
  it('stays out of the game, embeds and the employer portal', () => {
    for (const p of ['/space-tycoon', '/space-tycoon/corp', '/embed/launch-calendar', '/hire/dashboard']) expect(marketTickerHiddenOnPath(p)).toBe(true);
    for (const p of ['/', '/space-stocks', '/jobs', '/hire', null]) expect(marketTickerHiddenOnPath(p)).toBe(false);
  });
});

describe('market ticker wiring', () => {
  it('is mounted once in the root layout, right after the navigation, and not on /space-stocks', () => {
    const layout = read('src/app/layout.tsx');
    expect(layout).toMatch(/<Navigation \/>\s*<IndustryTicker \/>/);
    expect(read('src/components/layout/ClientOnly.tsx')).toMatch(/export const IndustryTicker = dynamic/);
    expect(read('src/app/space-stocks/page.tsx')).not.toContain('IndustryTicker');
  });
  it('the strip honours the preference and offers a hide control; Appearance offers the toggle', () => {
    const t = read('src/components/ui/IndustryTicker.tsx');
    expect(t).toMatch(/if \(!enabled \|\| marketTickerHiddenOnPath\(pathname\)/);
    expect(t).toMatch(/aria-label="Hide market ticker"/);
    expect(read('src/app/account/page.tsx')).toMatch(/setMarketTickerEnabled\(/);
  });
});
