import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/stocks`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({
        top_movers: [],
        trend: 'neutral',
        updated_at: new Date().toISOString(),
      });
    }

    const data = await res.json();
    const stocks = data.stocks || [];

    // Get top 3 movers by absolute change percentage
    const sorted = [...stocks]
      .filter((s: Record<string, unknown>) => s.changePercent !== undefined)
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        Math.abs(b.changePercent as number) - Math.abs(a.changePercent as number)
      )
      .slice(0, 3);

    const topMovers = sorted.map((s: Record<string, unknown>) => ({
      symbol: s.symbol || s.ticker,
      change_pct: Number((s.changePercent as number || 0).toFixed(2)),
    }));

    // Overall trend based on average change
    const avgChange = stocks.reduce((sum: number, s: Record<string, unknown>) =>
      sum + ((s.changePercent as number) || 0), 0) / Math.max(stocks.length, 1);

    return NextResponse.json({
      top_movers: topMovers,
      trend: avgChange > 0.5 ? 'up' : avgChange < -0.5 ? 'down' : 'neutral',
      updated_at: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      top_movers: [],
      trend: 'neutral',
      updated_at: new Date().toISOString(),
    });
  }
}
