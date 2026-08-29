import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { CHART_DEFS, getChartDef } from '@/lib/charts/registry';
import { loadChartSeries } from '@/lib/charts/data';
import { formatValue } from '@/lib/charts/render';

// Chart of the Week permalink. The image is the same SVG the digest mails as
// PNG; the table under it is the accessible, copyable version of the numbers.
export const dynamic = 'force-dynamic';
export const dynamicParams = false;

export function generateStaticParams() {
  return CHART_DEFS.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
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

export default async function ChartPage({ params }: { params: { slug: string } }) {
  const def = getChartDef(params.slug);
  if (!def) notFound();
  const series = await loadChartSeries(def.slug);
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
            <div className="card overflow-hidden mb-6">
              {/* Plain img on purpose: the endpoint is dynamic and already 1200×630. */}
              <img src={`/api/chart/${def.slug}?format=svg`} alt={`${def.title}: ${def.subtitle}`} width={1200} height={630} className="w-full h-auto block" />
            </div>
            <div className="flex flex-wrap items-center gap-3 mb-8 text-sm">
              <Link href={def.exploreHref} className="btn-primary text-sm py-2 px-4">{def.exploreLabel}</Link>
              <a href={`/api/chart/${def.slug}`} className="btn-secondary text-sm py-2 px-4">Download PNG</a>
              <span className="text-xs text-slate-500">Source: {def.source}{series.note ? ` · ${series.note}` : ''}</span>
            </div>

            <section className="mb-10">
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
