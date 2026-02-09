import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/space-weather`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({
        kp_index: null,
        solar_wind_speed: null,
        alert_level: 'unknown',
        summary: 'Data unavailable',
      });
    }

    const data = await res.json();

    return NextResponse.json({
      kp_index: data.kpIndex ?? data.kp_index ?? null,
      solar_wind_speed: data.solarWindSpeed ?? data.solar_wind_speed ?? null,
      alert_level: data.alertLevel ?? data.alert_level ?? 'nominal',
      summary: data.summary || 'Space weather conditions normal',
    });
  } catch {
    return NextResponse.json({
      kp_index: null,
      solar_wind_speed: null,
      alert_level: 'unknown',
      summary: 'Data unavailable',
    });
  }
}
