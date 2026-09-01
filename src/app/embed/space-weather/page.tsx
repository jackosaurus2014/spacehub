import { getSpaceWeatherPage, formatKp, gScaleFromKp } from '@/lib/space-weather-page';

// Embeddable Space Weather card — same pattern as /embed/launch-cadence:
// frame-friendly, inline styles only, attribution backlink.
export const dynamic = 'force-dynamic';

export const metadata = {
  robots: { index: false, follow: false },
};

const SEV_COLOR: Record<string, string> = {
  quiet: '#34d399',
  minor: '#fbbf24',
  moderate: '#fb923c',
  severe: '#f87171',
};

export default async function EmbedSpaceWeatherPage() {
  const data = await getSpaceWeatherPage();
  const d1 = data?.forecast.days[0];
  const windFresh = data?.solarWind.fetchedAt ? Date.now() - Date.parse(data.solarWind.fetchedAt) < 6 * 3600_000 : false;
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#0B0A09', color: '#fff', padding: 16, minHeight: '100%', boxSizing: 'border-box' }}>
      <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a8580' }}>SpaceNexus · Space Weather Now</p>
      {!data ? (
        <p style={{ color: '#aaa', fontSize: 13 }}>Data temporarily unavailable.</p>
      ) : (
        <>
          <p style={{ margin: '10px 0 0', fontSize: 13, color: SEV_COLOR[data.severity] || '#fff' }}>
            ● {data.severity === 'quiet' ? 'Quiet' : data.severity === 'minor' ? 'Unsettled' : data.severity === 'moderate' ? 'Geomagnetic storm' : 'Severe storm'}
            <span style={{ color: '#8a8580' }}> · {data.severityLabel}</span>
          </p>
          <div style={{ display: 'flex', gap: 24, margin: '12px 0', flexWrap: 'wrap' }}>
            <div><div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatKp(data.kp.value)}</div><div style={{ fontSize: 11, color: '#8a8580' }}>Kp{data.kp.value != null && gScaleFromKp(data.kp.value) > 0 ? ` · G${gScaleFromKp(data.kp.value)}` : ''}</div></div>
            <div><div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{windFresh && data.solarWind.speed != null ? Math.round(data.solarWind.speed) : '—'}</div><div style={{ fontSize: 11, color: '#8a8580' }}>solar wind km/s</div></div>
            <div><div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{windFresh && data.solarWind.bz != null ? `${data.solarWind.bz > 0 ? '+' : ''}${data.solarWind.bz.toFixed(1)}` : '—'}</div><div style={{ fontSize: 11, color: '#8a8580' }}>Bz nT</div></div>
            <div><div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d1 && d1.probX != null ? `${d1.probX}%` : '—'}</div><div style={{ fontSize: 11, color: '#8a8580' }}>X-flare, next 24 h</div></div>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: '#8a8580' }}>
            {data.flares.rows.length} flare{data.flares.rows.length === 1 ? '' : 's'} logged in the last {data.flares.windowDays} days
            {data.flares.rows[0] ? ` · latest ${data.flares.rows[0].classLabel}` : ''}
          </p>
        </>
      )}
      <p style={{ margin: '10px 0 0', fontSize: 11 }}>
        <a href="https://spacenexus.us/space-weather" target="_blank" rel="noopener" style={{ color: '#FF7A18', textDecoration: 'none' }}>Live conditions + sources → spacenexus.us/space-weather</a>
      </p>
    </div>
  );
}
