import { getLaunchCadence } from '@/lib/launch-cadence';

// G1 — embeddable Launch Cadence card. Lives under /embed (frame-friendly
// layout) and carries the attribution backlink that makes embeds an
// acquisition channel. Kept dependency-light: inline styles only, so it
// renders identically inside any host page's iframe.
export const dynamic = 'force-dynamic';

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function EmbedLaunchCadencePage() {
  const data = await getLaunchCadence();
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#0B0A09', color: '#fff', padding: 16, minHeight: '100%', boxSizing: 'border-box' }}>
      <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a8580' }}>SpaceNexus · Launch Cadence Index</p>
      {!data ? (
        <p style={{ color: '#aaa', fontSize: 13 }}>Data temporarily unavailable.</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 24, margin: '12px 0', flexWrap: 'wrap' }}>
            <div><div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{data.thisYearToDate}</div><div style={{ fontSize: 11, color: '#8a8580' }}>{data.year} attempts to date</div></div>
            <div><div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#8a8580' }}>{data.lastYearToDate}</div><div style={{ fontSize: 11, color: '#8a8580' }}>{data.year - 1} same date</div></div>
            <div><div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: (data.paceDeltaPct ?? 0) >= 0 ? '#4FD8E8' : '#FF7A18' }}>{data.paceDeltaPct == null ? '—' : `${data.paceDeltaPct >= 0 ? '+' : ''}${data.paceDeltaPct}%`}</div><div style={{ fontSize: 11, color: '#8a8580' }}>pace vs last year</div></div>
            <div><div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>~{data.projectedFullYear}</div><div style={{ fontSize: 11, color: '#8a8580' }}>projected {data.year}</div></div>
          </div>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <tbody>
              {data.providers.slice(0, 5).map(p => (
                <tr key={p.provider} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <td style={{ padding: '4px 0', color: 'rgba(255,255,255,0.9)' }}>{p.provider}</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{p.thisYear}</td>
                  <td style={{ padding: '4px 0 4px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: p.delta >= 0 ? '#34d399' : '#f87171' }}>{p.delta >= 0 ? `+${p.delta}` : p.delta} YoY</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <p style={{ margin: '10px 0 0', fontSize: 11 }}>
        <a href="https://spacenexus.us/launch-cadence" target="_blank" rel="noopener" style={{ color: '#FF7A18', textDecoration: 'none' }}>Live index + methodology → spacenexus.us/launch-cadence</a>
      </p>
    </div>
  );
}
