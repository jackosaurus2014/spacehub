import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

export const dynamic = 'force-dynamic';

const yahooFinance = new YahooFinance();

export async function GET(
  request: Request,
  { params }: { params: { ticker: string } }
) {
  try {
    const ticker = params.ticker.toUpperCase();

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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Failed to fetch stock data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock data', ticker: params.ticker },
      { status: 500 }
    );
  }
}
