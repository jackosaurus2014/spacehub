import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

export const dynamic = 'force-dynamic';

const yahooFinance = new YahooFinance();

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

    // Fetch quotes for all tickers
    const quotes = await Promise.all(
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

          const quotes = historical.quotes || [];
          const currentPrice = quote.regularMarketPrice || 0;

          // Calculate 30D change
          const thirtyDaysAgoPrice = quotes.length > 30 ? quotes[quotes.length - 31]?.close : quotes[0]?.close;
          const change30D = thirtyDaysAgoPrice
            ? ((currentPrice - thirtyDaysAgoPrice) / thirtyDaysAgoPrice) * 100
            : 0;

          // Mini chart data (last 30 points)
          const chartData = quotes.slice(-30).map((q) => q.close || 0);

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
          console.error(`Failed to fetch ${ticker}:`, error);
          return {
            ticker,
            success: false,
            error: 'Failed to fetch',
          };
        }
      })
    );

    return NextResponse.json({
      stocks: quotes,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch stocks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock data' },
      { status: 500 }
    );
  }
}
