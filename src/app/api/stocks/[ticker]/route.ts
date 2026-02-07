import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const yahooFinance = new YahooFinance();

const yahooBreaker = createCircuitBreaker('yahoo-finance-detail', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});

export async function GET(
  request: Request,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase();
  const cacheKey = `stock-detail:${ticker}`;

  try {
    const result = await yahooBreaker.execute(async () => {
      // Get current quote
      const quote = await yahooFinance.quote(ticker);

      // Get historical data for charts
      const now = new Date();
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const historical = await yahooFinance.chart(ticker, {
        period1: oneYearAgo,
        period2: now,
        interval: '1d',
      });

      // Calculate performance metrics
      const quotes = historical.quotes || [];
      const currentPrice = quote.regularMarketPrice || 0;

      // Get price points for different periods
      const oneDayAgo = quotes.length > 1 ? quotes[quotes.length - 2]?.close : currentPrice;
      const thirtyDaysAgo = quotes.length > 30 ? quotes[quotes.length - 31]?.close : quotes[0]?.close;
      const oneYearAgoPrice = quotes[0]?.close;

      // Calculate percentage changes
      const change1D = oneDayAgo ? ((currentPrice - oneDayAgo) / oneDayAgo) * 100 : 0;
      const change30D = thirtyDaysAgo ? ((currentPrice - thirtyDaysAgo) / thirtyDaysAgo) * 100 : 0;
      const change1Y = oneYearAgoPrice ? ((currentPrice - oneYearAgoPrice) / oneYearAgoPrice) * 100 : 0;

      // Get simplified chart data (last 30 days for mini chart)
      const last30Days = quotes.slice(-30).map((q) => ({
        date: q.date,
        close: q.close,
      }));

      // Get monthly data points for year chart
      const monthlyData = [];
      for (let i = 0; i < quotes.length; i += 21) { // ~21 trading days per month
        if (quotes[i]) {
          monthlyData.push({
            date: quotes[i].date,
            close: quotes[i].close,
          });
        }
      }
      // Always include the latest
      if (quotes.length > 0) {
        monthlyData.push({
          date: quotes[quotes.length - 1].date,
          close: quotes[quotes.length - 1].close,
        });
      }

      return {
        ticker,
        name: quote.shortName || quote.longName,
        price: currentPrice,
        previousClose: quote.regularMarketPreviousClose,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        dayHigh: quote.regularMarketDayHigh,
        dayLow: quote.regularMarketDayLow,
        volume: quote.regularMarketVolume,
        marketCap: quote.marketCap,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
        performance: {
          '1D': change1D,
          '30D': change30D,
          '1Y': change1Y,
        },
        chartData: {
          daily: last30Days,
          monthly: monthlyData,
        },
        lastUpdated: new Date().toISOString(),
        source: 'live' as const,
      };
    }, undefined); // no inline fallback -- handle below with cache

    if (result !== undefined) {
      // Cache successful result
      apiCache.set(cacheKey, result, CacheTTL.STOCKS);
      return NextResponse.json(result);
    }

    // Circuit breaker open -- try cache
    const cached = apiCache.getStale<Record<string, unknown>>(cacheKey);

    if (cached) {
      logger.info(`[Stocks/${ticker}] Serving cached data (stale: ${cached.isStale})`);
      return NextResponse.json({
        ...cached.value,
        source: 'cache',
        cached: true,
        cachedAt: new Date(cached.storedAt).toISOString(),
      });
    }

    // No cache -- return minimal fallback
    logger.warn(`[Stocks/${ticker}] No cache available, returning fallback`);
    return NextResponse.json(
      {
        ticker,
        error: 'Service temporarily unavailable',
        source: 'fallback',
        lastUpdated: new Date().toISOString(),
      },
      { status: 503 }
    );
  } catch (error) {
    logger.error(`Failed to fetch stock data for ${ticker}`, { error: error instanceof Error ? error.message : String(error) });

    // Try cache as last resort
    const cached = apiCache.getStale<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached.value,
        source: 'cache',
        cached: true,
        cachedAt: new Date(cached.storedAt).toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch stock data', ticker, source: 'fallback' },
      { status: 503 }
    );
  }
}
