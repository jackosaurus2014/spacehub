import { coverageChangesInWindow } from '@/lib/hiring-coverage';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { CHART_DEFS, getChartDef } from '@/lib/charts/registry';
import { loadChartSeries } from '@/lib/charts/data';
import { formatValue } from '@/lib/charts/render';
import ChartFrame from '@/components/ui/ChartFrame';
import CiteEmbed from '@/components/CiteEmbed';

// Chart of the Week permalink. The image is the same SVG the digest mails as
// PNG; the table under it is the accessible, copyable version of the numbers.
export const dynamic = 'force-dynamic';
export const dynamicParams = false;

export function generateStaticParams() {
  return CHART_DEFS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const def = getChartDef(params.slug);
  if (!def) return {};
  const title = `${def.title} — Chart`;
  return {
    title,
    description: `${def.subtitle}. Source: ${def.source}.`,
    alternates: { canonical: `https://spacenexus.us/chart/${def.slug}` },
    openGraph: { title, description: def.subtitle, type: 'article', images: [{ url: `/api/chart/${def.slug}`, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description: def.subtitle, images: [`/api/chart/${def.slug}`] },
  };
}

export default async function ChartPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const def = getChartDef(params.slug);
  if (!def) notFound();
  const series = await loadChartSeries(def.slug);
  // Only the jobs series is distorted by a tracker-coverage change; every
  // other chart draws from a source whose scope has not moved.
  const coverageNotes = def.slug === 'open-space-jobs'
    ? coverageChangesInWindow(new Date(Date.now() - 120 * 86400000))
    : [];
  const others = CHART_DEFS.filter((c) => c.slug !== def.slug);

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
          <Link href="/chart" className="hover:text-white/80">Charts</Link><span>/</span>
          <span className="text-slate-400">{def.title}</span>
        </nav>

        <header className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{def.title}</h1>
          <p className="text-lg text-white/80">{def.subtitle}</p>
        </header>

        {series ? (
          <>
            {/* The record count comes from the loader, which knows how many
                rows it read. It used to be the SUM OF THE PLOTTED VALUES,
                which for a level series is meaningless: adding up the jobs
                open in each of six weeks published "120,763 records" for a
                site with about eight thousand open roles. A loader that has
                not stated a record count prints none. */}
            <ChartFrame title={def.title} deck={def.subtitle} slug={def.slug} source={def.source} recordCount={series.recordCount} asOf={new Date()} tableId="chart-data" className="mb-6">
              {/* Plain img on purpose: the endpoint is dynamic and already 1200×630. */}
              <img src={`/api/chart/${def.slug}?format=svg`} alt={`${def.title}: ${def.subtitle}`} width={1200} height={630} className="w-full h-auto block" />
            </ChartFrame>
            <div className="flex flex-wrap items-center gap-3 mb-8 text-sm">
              <Link href={def.exploreHref} className="btn-primary text-sm py-2 px-4">{def.exploreLabel}</Link>
              <a href={`/api/chart/${def.slug}`} className="btn-secondary text-sm py-2 px-4">Download PNG</a>
              {/* G3: CSV behind a FREE account (lead-gen, never a paywall) —
                  unauthenticated hits get redirected to /login by the route. */}
              <a href={`/api/chart/${def.slug}/csv`} className="btn-secondary text-sm py-2 px-4">Download CSV</a>
              <span className="text-xs text-slate-500">Source: {def.source}{series.note ? ` · ${series.note}` : ''} · CSV needs a free account</span>
            </div>

            {/* A coverage change looks exactly like a market move on a line
                chart. The open-jobs series steps up ~26% in the week of
                2026-09-01 because Blue Origin's board joined the tracker, not
                because the industry hired 1,590 people that week. The note is
                already carried on /hiring-trends, /jobs, the hiring index and
                the fastest-hiring ranking; the CHART is where the jump is most
                visible and was the one surface not saying so. */}
            {coverageNotes.length > 0 && (
              <div className="mb-8 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3" role="note">
                <p className="text-xs font-semibold text-amber-300/90 mb-1">Coverage change in this window</p>
                {coverageNotes.map((c) => (
                  <p key={`${c.date}-${c.company}`} className="text-xs text-slate-300 leading-relaxed">
                    <span className="font-mono">{c.date}</span> — {c.note}
                  </p>
                ))}
              </div>
            )}

            <div className="mb-6">
              <CiteEmbed
                title={def.title}
                pageUrl={`https://spacenexus.us/chart/${def.slug}`}
                embedUrl={`https://spacenexus.us/embed/chart/${def.slug}`}
                sourceLine={`SpaceNexus — ${def.title} (${def.source})`}
              />
            </div>

            <section id="chart-data" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-white mb-3">The numbers</h2>
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                      <th className="px-4 py-2.5">Period</th><th className="px-4 py-2.5 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.labels.map((label, i) => (
                      <tr key={`${label}-${i}`} className="border-b border-white/[0.06] last:border-0">
                        <td className="px-4 py-2 text-white">{label}</td>
                        <td className="px-4 py-2 text-right text-white font-mono">{formatValue(series.values[i] ?? 0, def.unit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <div className="card p-6 mb-10 text-sm text-slate-400">Not enough data to draw this one yet — it fills in as the trackers accumulate history.</div>
        )}

        <section className="pt-6 border-t border-white/[0.06] text-sm">
          <h3 className="text-lg font-bold text-white mb-3">Other charts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {others.map((c) => <Link key={c.slug} href={`/chart/${c.slug}`} className="text-slate-300 hover:text-white">{c.title} &rarr;</Link>)}
          </div>
          <p className="text-xs text-slate-500 mt-4">One of these runs in every <Link href="/newsletter" className="text-cyan-400 hover:text-cyan-300">M/Th Digest</Link> as the Chart of the Week.</p>
        </section>

        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Charts', href: '/chart' }, { name: def.title }]} />
      </div>
    </div>
  );
}
