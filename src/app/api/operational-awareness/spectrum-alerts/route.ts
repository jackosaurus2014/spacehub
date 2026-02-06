export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  getSpectrumAlerts,
  getSpectrumAlertCounts,
  SpectrumAlertType,
  SpectrumSeverity,
  SpectrumAlertStatus,
  FREQUENCY_BANDS,
} from '@/lib/operational-awareness-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertType = searchParams.get('alertType') as SpectrumAlertType | null;
    const severity = searchParams.get('severity') as SpectrumSeverity | null;
    const status = searchParams.get('status') as SpectrumAlertStatus | null;
    const frequencyBand = searchParams.get('frequencyBand');
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeCounts = searchParams.get('includeCounts') === 'true';
    const includeBandInfo = searchParams.get('includeBandInfo') === 'true';

    const [alerts, counts] = await Promise.all([
      getSpectrumAlerts({
        alertType: alertType || undefined,
        severity: severity || undefined,
        status: status || undefined,
        frequencyBand: frequencyBand || undefined,
        limit,
      }),
      includeCounts ? getSpectrumAlertCounts() : null,
    ]);

    // Group alerts by frequency band
    const alertsByBand = alerts.reduce((acc, alert) => {
      if (!acc[alert.frequencyBand]) {
        acc[alert.frequencyBand] = [];
      }
      acc[alert.frequencyBand].push(alert);
      return acc;
    }, {} as Record<string, typeof alerts>);

    return NextResponse.json({
      alerts,
      counts: counts || undefined,
      total: alerts.length,
      alertsByBand,
      frequencyBands: includeBandInfo ? FREQUENCY_BANDS : undefined,
    });
  } catch (error) {
    console.error('Failed to fetch spectrum alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch spectrum alerts' },
      { status: 500 }
    );
  }
}
