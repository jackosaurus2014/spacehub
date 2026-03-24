import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/space-tycoon/market/history
 * Returns OHLCV price candle data for a resource.
 *
 * Query params:
 *   resourceSlug: string (required)
 *   timeframe: '1h' | '4h' | '1d' | '1w' (default: '1h')
 *   limit: number (default: 168 = 7 days of 1h candles)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resourceSlug = searchParams.get('resourceSlug');
    const timeframe = searchParams.get('timeframe') || '1h';
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '168', 10)));

    if (!resourceSlug) {
      return NextResponse.json({ error: 'resourceSlug is required' }, { status: 400 });
    }

    const validTimeframes = ['1h', '4h', '1d', '1w'];
    if (!validTimeframes.includes(timeframe)) {
      return NextResponse.json(
        { error: `timeframe must be one of: ${validTimeframes.join(', ')}` },
        { status: 400 },
      );
    }

    // For 1h, query directly. For larger timeframes, aggregate from 1h candles.
    if (timeframe === '1h') {
      const candles = await prisma.marketPriceCandle.findMany({
        where: {
          resourceSlug,
          timeframe: '1h',
        },
        orderBy: { openTime: 'desc' },
        take: limit,
      });

      // Reverse to chronological order
      candles.reverse();

      return NextResponse.json({
        resourceSlug,
        timeframe,
        candles: candles.map(c => ({
          t: c.openTime.toISOString(),
          o: c.open,
          h: c.high,
          l: c.low,
          c: c.close,
          v: c.volume,
          n: c.tradeCount,
        })),
      });
    }

    // For larger timeframes, we aggregate 1h candles.
    // Calculate how many 1h candles to fetch based on desired output limit.
    const hoursPerPeriod: Record<string, number> = {
      '4h': 4,
      '1d': 24,
      '1w': 168,
    };
    const hours = hoursPerPeriod[timeframe] || 1;
    const rawLimit = limit * hours;

    const rawCandles = await prisma.marketPriceCandle.findMany({
      where: {
        resourceSlug,
        timeframe: '1h',
      },
      orderBy: { openTime: 'desc' },
      take: rawLimit,
    });

    // Reverse to chronological
    rawCandles.reverse();

    if (rawCandles.length === 0) {
      return NextResponse.json({ resourceSlug, timeframe, candles: [] });
    }

    // Group candles into periods
    const grouped = new Map<string, typeof rawCandles>();

    for (const candle of rawCandles) {
      let periodKey: number;

      if (timeframe === '4h') {
        // Floor to 4-hour boundary
        const hour = candle.openTime.getUTCHours();
        const flooredHour = hour - (hour % 4);
        const d = new Date(candle.openTime);
        d.setUTCHours(flooredHour, 0, 0, 0);
        periodKey = d.getTime();
      } else if (timeframe === '1d') {
        // Floor to day boundary
        const d = new Date(candle.openTime);
        d.setUTCHours(0, 0, 0, 0);
        periodKey = d.getTime();
      } else {
        // 1w: floor to Monday
        const d = new Date(candle.openTime);
        d.setUTCHours(0, 0, 0, 0);
        const day = d.getUTCDay();
        const diff = day === 0 ? 6 : day - 1; // Monday = 0
        d.setUTCDate(d.getUTCDate() - diff);
        periodKey = d.getTime();
      }

      const key = periodKey.toString();
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(candle);
    }

    // Build aggregated candles
    const aggregated = Array.from(grouped.entries())
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .slice(-limit)
      .map(([key, candles]) => {
        const sorted = candles.sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
        return {
          t: new Date(parseInt(key)).toISOString(),
          o: sorted[0].open,
          h: Math.max(...sorted.map(c => c.high)),
          l: Math.min(...sorted.map(c => c.low)),
          c: sorted[sorted.length - 1].close,
          v: sorted.reduce((sum, c) => sum + c.volume, 0),
          n: sorted.reduce((sum, c) => sum + c.tradeCount, 0),
        };
      });

    return NextResponse.json({
      resourceSlug,
      timeframe,
      candles: aggregated,
    });
  } catch (error) {
    logger.error('Price history GET error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to fetch price history' }, { status: 500 });
  }
}
