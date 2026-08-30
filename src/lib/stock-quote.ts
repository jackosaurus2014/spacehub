/**
 * Shared live-quote helpers for CompanyProfile stock data.
 *
 * Fixes the stock-price split-brain: /company-profiles/[slug] used to render
 * static CompanyProfile.marketCap / stockPrice DB fields that could go months
 * stale, while /api/stocks served live Yahoo Finance quotes for the same
 * tickers elsewhere on the site. This module is the single place that maps a
 * Yahoo Finance quote onto the CompanyProfile stock fields, so the daily sync
 * cron (src/app/api/cron/stock-sync/route.ts) and the render-time lookup
 * (src/app/api/company-profiles/[slug]/route.ts) stay consistent.
 */
import YahooFinance from 'yahoo-finance2';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { logger } from '@/lib/logger';

const yahooFinance = new YahooFinance();

const yahooBreaker = createCircuitBreaker('yahoo-finance-quote-shared', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});

export interface LiveQuoteFields {
  stockPrice: number;
  marketCap: number | null;
  priceChange24h: number | null;
}

/** Minimal shape of a Yahoo Finance quote this module cares about. */
export interface RawQuoteLike {
  regularMarketPrice?: number | null;
  marketCap?: number | null;
  regularMarketChangePercent?: number | null;
  currency?: string | null;
}

/**
 * Pure mapping: Yahoo Finance quote -> CompanyProfile stock fields.
 * Returns null when the quote has no usable price (e.g. delisted, unquotable,
 * or a non-numeric/zero/negative price), so callers can skip the update
 * instead of writing garbage over good data.
 *
 * CompanyProfile.stockPrice / marketCap are USD fields used site-wide
 * (formatted with a "$" prefix, summed into the /api/companies/stats
 * aggregate). Many non-US-listed tickers (e.g. Euronext/Xetra/KSE/TSX/Nordic
 * listings) quote in their local currency, and Yahoo's `marketCap` is in
 * that same local currency -- NOT auto-converted to USD. Treating those
 * figures as USD would silently corrupt the data (e.g. a KRW market cap
 * written in as if it were USD is off by ~1300x). Rather than guess at an
 * FX rate, we treat non-USD quotes the same as unquotable tickers: skip and
 * warn, leaving the existing (possibly stale but at least USD-denominated)
 * DB value alone.
 */
export function mapQuoteToProfileFields(quote: RawQuoteLike | null | undefined): LiveQuoteFields | null {
  if (!quote) return null;
  if (quote.currency && quote.currency !== 'USD') return null;
  const price = quote.regularMarketPrice;
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;

  const marketCap =
    typeof quote.marketCap === 'number' && Number.isFinite(quote.marketCap) && quote.marketCap > 0
      ? quote.marketCap
      : null;

  const priceChange24h =
    typeof quote.regularMarketChangePercent === 'number' && Number.isFinite(quote.regularMarketChangePercent)
      ? quote.regularMarketChangePercent
      : null;

  return { stockPrice: price, marketCap, priceChange24h };
}

/**
 * Fetch a single live quote with a short timeout. Never throws — returns null
 * on any failure (timeout, unquotable ticker, Yahoo outage, circuit open) so
 * callers rendering a page can always fall back to DB values.
 */
export async function getLiveQuoteSafe(ticker: string, timeoutMs = 2500): Promise<LiveQuoteFields | null> {
  if (!ticker || !ticker.trim()) return null;
  const symbol = ticker.trim().toUpperCase();

  try {
    const result = await yahooBreaker.execute(async () => {
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('yahoo quote timeout')), timeoutMs);
      });
      const quote = await Promise.race([yahooFinance.quote(symbol), timeout]);
      return mapQuoteToProfileFields(quote as RawQuoteLike);
    }, null);
    return result ?? null;
  } catch (error) {
    logger.warn(`[stock-quote] Failed to fetch live quote for ${symbol}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Batch-fetch quotes for many tickers (used by the daily sync cron). Chunks
 * requests to be polite to Yahoo, and falls back to per-ticker fetches within
 * a failed chunk so one bad/foreign/unquotable symbol can't sink the whole
 * batch. Never throws — unresolved tickers map to null.
 */
export async function getLiveQuotesBatch(
  tickers: string[],
  chunkSize = 15,
  delayMs = 500
): Promise<Map<string, LiveQuoteFields | null>> {
  const results = new Map<string, LiveQuoteFields | null>();
  const unique = Array.from(
    new Set(tickers.filter((t) => t && t.trim().length > 0).map((t) => t.trim().toUpperCase()))
  );

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);

    try {
      const quoteMap = await yahooFinance.quote(chunk, { return: 'map' });
      for (const ticker of chunk) {
        const q = quoteMap.get(ticker);
        results.set(ticker, mapQuoteToProfileFields(q as RawQuoteLike | undefined));
      }
    } catch (error) {
      logger.warn('[stock-quote] Batch quote failed, falling back to per-ticker fetch', {
        chunk,
        error: error instanceof Error ? error.message : String(error),
      });

      for (const ticker of chunk) {
        try {
          const q = await yahooFinance.quote(ticker);
          results.set(ticker, mapQuoteToProfileFields(q as RawQuoteLike));
        } catch (innerError) {
          logger.warn(`[stock-quote] Failed to fetch quote for ${ticker} (skipping)`, {
            error: innerError instanceof Error ? innerError.message : String(innerError),
          });
          results.set(ticker, null);
        }
      }
    }

    if (i + chunkSize < unique.length && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * ~90 trading days of daily closes for a sparkline and a 52-week-ish range
 * (SYNTHESIS.md item 31). One Yahoo chart call per ticker, cached six hours
 * per ticker via unstable_cache; never throws — a ticker that does not
 * answer maps to null and the row simply shows no sparkline.
 */
export interface PriceHistory { closes: number[]; low: number; high: number; asOf: string }

async function fetchPriceHistory(symbol: string): Promise<PriceHistory | null> {
  try {
    const period1 = new Date(Date.now() - 130 * 86400000);
    const chart = await Promise.race([
      yahooFinance.chart(symbol, { period1, interval: '1d' }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('yahoo chart timeout')), 4000)),
    ]);
    const closes = ((chart as { quotes?: Array<{ close?: number | null }> }).quotes ?? [])
      .map((q) => q.close)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
      .slice(-90);
    if (closes.length < 5) return null;
    return { closes, low: Math.min(...closes), high: Math.max(...closes), asOf: new Date().toISOString() };
  } catch (error) {
    logger.warn(`[stock-quote] price history failed for ${symbol}`, { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

export async function getPriceHistoriesCached(tickers: string[]): Promise<Record<string, PriceHistory | null>> {
  const { unstable_cache } = await import('next/cache');
  const out: Record<string, PriceHistory | null> = {};
  await Promise.all(tickers.map(async (t) => {
    const symbol = t.trim().toUpperCase();
    const cached = unstable_cache(() => fetchPriceHistory(symbol), ['price-history-v1', symbol], { revalidate: 6 * 3600 });
    out[symbol] = await cached();
  }));
  return out;
}
