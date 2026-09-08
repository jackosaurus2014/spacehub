import { getLaunchCalendar, launchDisplayName } from '@/lib/launch-calendar';

// Embeddable launch calendar (2026-09-07, ideas list #9). The month grid and
// the next-launch line from the launch-schedule guide, as an iframe card
// with the attribution backlink that makes embeds an acquisition channel —
// same contract as /embed/launch-cadence. Inline styles only, so it renders
// identically inside any host page.
export const dynamic = 'force-dynamic';
export const metadata = {
  robots: { index: false, follow: false },
};

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export default async function EmbedLaunchCalendarPage() {
  const data = await getLaunchCalendar();
  const next = data?.nextLaunch ?? null;
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#0B0A09', color: '#fff', padding: 16, minHeight: '100%', boxSizing: 'border-box' }}>
      <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a8580' }}>SpaceNexus · Launch Calendar {data?.year ?? ''}</p>
      {!data ? (
        <p style={{ color: '#aaa', fontSize: 13 }}>Data temporarily unavailable.</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 24, margin: '12px 0', flexWrap: 'wrap' }}>
            <div><div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{data.flownYearToDate}</div><div style={{ fontSize: 11, color: '#8a8580' }}>launches flown this year</div></div>
            <div><div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#4FD8E8' }}>{data.next30Days.length}</div><div style={{ fontSize: 11, color: '#8a8580' }}>on the manifest, next 30 days</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, fontSize: 11 }}>
            {data.months.map((m) => {
              const past = m.isPast || m.isCurrent;
              const coarseOnly = !past && data.horizonMonth != null && m.month - 1 > data.horizonMonth;
              return (
                <div key={m.month} style={{ background: m.isCurrent ? 'rgba(79,216,232,0.12)' : 'rgba(255,255,255,0.04)', border: m.isCurrent ? '1px solid rgba(79,216,232,0.5)' : '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '6px 4px', textAlign: 'center' }}>
                  <div style={{ color: '#8a8580' }}>{m.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: past ? '#fff' : coarseOnly ? '#555' : '#cbd5e1' }}>{past ? m.flown : coarseOnly ? '—' : m.scheduled}</div>
                  <div style={{ fontSize: 9, color: '#6b6560' }}>{past ? (m.isCurrent && m.scheduled > 0 ? `flown · ${m.scheduled} to go` : 'flown') : coarseOnly ? 'beyond feed' : 'scheduled'}</div>
                </div>
              );
            })}
          </div>
          {next && (
            <p style={{ margin: '12px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>
              Next: <strong>{launchDisplayName(next.name, next.rocket)}</strong> · {fmtDay(next.launchDate)}{next.location ? ` · ${next.location.split(',')[0]}` : ''}
            </p>
          )}
        </>
      )}
      <p style={{ margin: '10px 0 0', fontSize: 11 }}>
        <a href="https://spacenexus.us/guide/space-launch-schedule-2026" target="_blank" rel="noopener" style={{ color: '#FF7A18', textDecoration: 'none' }}>Full schedule + every launch → spacenexus.us</a>
      </p>
    </div>
  );
}
