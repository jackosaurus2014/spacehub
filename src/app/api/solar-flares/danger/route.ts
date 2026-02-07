import { NextResponse } from 'next/server';
import { getDangerForecasts } from '@/lib/solar-flare-data';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dangerForecasts = await getDangerForecasts();

    // Group by risk level
    const byRisk = dangerForecasts.reduce((acc, forecast) => {
      acc[forecast.riskLevel] = acc[forecast.riskLevel] || [];
      acc[forecast.riskLevel].push(forecast);
      return acc;
    }, {} as Record<string, typeof dangerForecasts>);

    return NextResponse.json({
      dangerForecasts,
      summary: {
        total: dangerForecasts.length,
        extreme: byRisk.extreme?.length || 0,
        severe: byRisk.severe?.length || 0,
        high: byRisk.high?.length || 0,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch danger forecasts', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch danger forecasts' },
      { status: 500 }
    );
  }
}
