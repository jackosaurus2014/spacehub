import Link from 'next/link';

const widgets = [
  {
    name: 'Next Launch',
    href: '/widgets/next-launch',
    description: 'Live countdown to the next rocket launch with mission details.',
  },
  {
    name: 'Space Weather',
    href: '/widgets/space-weather',
    description: 'Current solar activity, geomagnetic conditions, and space weather alerts.',
  },
  {
    name: 'Market Snapshot',
    href: '/widgets/market-snapshot',
    description: 'Space industry market data and key financial indicators at a glance.',
  },
];

export default function WidgetsIndex() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        SpaceNexus Widgets
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 32, fontSize: 14 }}>
        Embeddable widgets for your dashboard or website. Each widget is a standalone page that can be embedded via iframe.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {widgets.map((w) => (
          <Link
            key={w.href}
            href={w.href}
            style={{
              display: 'block',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.04)',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'background 0.15s',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              {w.name}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              {w.description}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 8, fontFamily: 'monospace' }}>
              {`<iframe src="https://spacenexus.us${w.href}" />`}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
