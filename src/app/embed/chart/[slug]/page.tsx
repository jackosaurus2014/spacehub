import { notFound } from 'next/navigation';
import { CHART_DEFS, getChartDef } from '@/lib/charts/registry';

// Real-404 mechanism (route-404-status guard): the registry is static, so
// the router itself 404s unknown slugs — same pattern as /chart/[slug].
export const dynamicParams = false;
export function generateStaticParams() {
  return CHART_DEFS.map((c) => ({ slug: c.slug }));
}

// G3 — embeddable chart card: the server-rendered SVG plus the attribution
// backlink. Inline styles only so it renders identically in any host iframe.
export const dynamic = 'force-dynamic';

export const metadata = {
  robots: { index: false, follow: false },
};

export default function EmbedChartPage({ params }: { params: { slug: string } }) {
  const def = getChartDef(params.slug);
  if (!def) notFound();
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#0B0A09', padding: 8, minHeight: '100%', boxSizing: 'border-box' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/chart/${def.slug}?format=svg`} alt={`${def.title} — ${def.subtitle}`} width={1200} height={630} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 6 }} />
      <p style={{ margin: '6px 2px 0', fontSize: 11 }}>
        <a href={`https://spacenexus.us/chart/${def.slug}`} target="_blank" rel="noopener" style={{ color: '#FF7A18', textDecoration: 'none' }}>
          {def.title} · live data by SpaceNexus →
        </a>
      </p>
    </div>
  );
}
