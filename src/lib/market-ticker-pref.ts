/**
 * Market ticker visibility (2026-09-10). The terminal-style stock strip
 * (IndustryTicker) is global chrome again — it left the root layout in the
 * 2026-08-29 chrome cull and Jay asked for it back with a per-person off
 * switch. Preference is per browser (localStorage), default ON; the strip's
 * own "hide" control and Account → Appearance both write it, and the
 * ticker re-reads on the custom event so no reload is needed.
 */
export const MARKET_TICKER_PREF_KEY = 'spacenexus-market-ticker';
export const MARKET_TICKER_EVENT = 'spacenexus:market-ticker';

export function isMarketTickerEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try { return localStorage.getItem(MARKET_TICKER_PREF_KEY) !== 'off'; } catch { return true; }
}

export function setMarketTickerEnabled(on: boolean): void {
  try {
    if (on) localStorage.removeItem(MARKET_TICKER_PREF_KEY);
    else localStorage.setItem(MARKET_TICKER_PREF_KEY, 'off');
  } catch { /* private mode: the change lasts for this page only */ }
  try { window.dispatchEvent(new CustomEvent(MARKET_TICKER_EVENT, { detail: { on } })); } catch { /* SSR */ }
}

/** Routes where global chrome stays out of the way (game, embeds, employer portal). */
export function marketTickerHiddenOnPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === '/space-tycoon' || pathname.startsWith('/space-tycoon/') || pathname.startsWith('/embed/') || pathname.startsWith('/hire/dashboard');
}
