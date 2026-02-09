'use client';

import { useEffect, useState } from 'react';

interface WeatherData {
  kp_index: number | null;
  solar_wind_speed: number | null;
  alert_level: string;
  summary: string;
}

export default function SpaceWeatherWidget() {
  const [data, setData] = useState<WeatherData | null>(null);

  useEffect(() => {
    fetch('/api/widgets/space-weather')
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return <div style={{ padding: 16, color: '#94a3b8', fontSize: 12 }}>Loading...</div>;
  }

  const alertColors: Record<string, string> = {
    nominal: '#34d399',
    minor: '#fbbf24',
    moderate: '#f97316',
    severe: '#ef4444',
    extreme: '#dc2626',
    unknown: '#94a3b8',
  };

  const alertColor = alertColors[data.alert_level] || alertColors.unknown;

  return (
    <div style={{ padding: 16, maxWidth: 300 }}>
      <div style={{ fontSize: 10, color: '#06b6d4', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        Space Weather
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
        {data.kp_index !== null && (
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: alertColor, fontVariantNumeric: 'tabular-nums' }}>
              Kp {data.kp_index}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>Geomagnetic</div>
          </div>
        )}
        {data.solar_wind_speed !== null && (
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>
              {data.solar_wind_speed}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>km/s wind</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: alertColor, display: 'inline-block' }} />
        <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>
          {data.alert_level}
        </span>
      </div>
    </div>
  );
}
