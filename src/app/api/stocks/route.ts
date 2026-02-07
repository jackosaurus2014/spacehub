import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const yahooFinance = new YahooFinance();

const yahooBreaker = createCircuitBreaker('yahoo-finance', {
  failureThreshold: 3,
  resetTimeout: 120_000, // 2 minutes
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tickersParam = searchParams.get('tickers');

    if (!tickersParam) {
      return NextResponse.json(
        { error: 'Missing tickers parameter' },
        { status: 400 }
      );
    }

    const tickers = tickersParam.split(',').map((t) => t.trim().toUpperCase());
    const cacheKey = `stocks:${tickers.sort().join(',')}`;

    // Attempt to fetch from Yahoo Finance through circuit breaker
    const quotes = await yahooBreaker.execute(async () => {
      const results = await Promise.all(
        tickers.map(async (ticker) => {
          try {
            const quote = await yahooFinance.quote(ticker);

            // Get last 30 days for mini chart
            const now = new Date();
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 45); // Extra buffer for trading days

            const historical = await yahooFinance.chart(ticker, {
              period1: thirtyDaysAgo,
              period2: now,
              interval: '1d',
            });

            const historicalQuotes = historical.quotes || [];
            const currentPrice = quote.regularMarketPrice || 0;

            // Calculate 30D change
            const thirtyDaysAgoPrice = historicalQuotes.length > 30 ? historicalQuotes[historicalQuotes.length - 31]?.close : historicalQuotes[0]?.close;
            const change30D = thirtyDaysAgoPrice
              ? ((currentPrice - thirtyDaysAgoPrice) / thirtyDaysAgoPrice) * 100
              : 0;

            // Mini chart data (last 30 points)
            const chartData = historicalQuotes.slice(-30).map((q) => q.close || 0);

            return {
              ticker,
              name: quote.shortName || quote.longName,
              price: currentPrice,
              change: quote.regularMarketChange,
              changePercent: quote.regularMarketChangePercent,
              change30D,
              marketCap: quote.marketCap,
              chartData,
              success: true,
            };
          } catch (error) {
            logger.warn(`Failed to fetch ${ticker}`, { error: error instanceof Error ? error.message : String(error) });
            return {
              ticker,
              success: false,
              error: 'Failed to fetch',
            };
          }
        })
      );

      return results;
    }, undefined); // no inline fallback -- we handle it below with cache

    // If circuit breaker returned data (not fallback)
    if (quotes !== undefined) {
      const responseData = {
        stocks: quotes,
        lastUpdated: new Date().toISOString(),
        source: 'live' as const,
      };

      // Update cache on success
      apiCache.set(cacheKey, responseData, CacheTTL.STOCKS);

      return NextResponse.json(responseData);
    }

    // Circuit breaker is open or call failed -- try cache
    const cached = apiCache.getStale<{
      stocks: unknown[];
      lastUpdated: string;
      source: string;
    }>(cacheKey);

    if (cached) {
      logger.info(`[Stocks] Serving cached data (stale: ${cached.isStale})`, {
        storedAt: new Date(cached.storedAt).toISOString(),
      });

      return NextResponse.json({
        ...cached.value,
        source: 'cache',
        cached: true,
        cachedAt: new Date(cached.storedAt).toISOString(),
      });
    }

    // No cache available -- return empty fallback
    logger.warn('[Stocks] No cache available, returning fallback');
    return NextResponse.json({
      stocks: tickers.map((ticker) => ({
        ticker,
        success: false,
        error: 'Service temporarily unavailable',
      })),
      lastUpdated: new Date().toISOString(),
      source: 'fallback',
    });
  } catch (error) {
    logger.error('Failed to fetch stocks', { error: error instanceof Error ? error.message : String(error) });

    return NextResponse.json(
      {
        error: 'Failed to fetch stock data',
        source: 'fallback',
      },
      { status: 503 }
    );
  }
}
