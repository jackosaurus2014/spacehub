import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import ItemListSchema from '@/components/seo/ItemListSchema';
import { CHART_DEFS, chartOfTheWeekSlug } from '@/lib/charts/registry';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Space Industry Charts — Launches, Funding, Jobs',
  description: 'Server-rendered charts from SpaceNexus data: launches per month, who launched most, private funding by month, open space jobs, launch slips. One runs in every M/Th Digest.',
  alternates: { canonical: 'https://spacenexus.us/chart' },
};

export default function ChartIndexPage() {
  const thisWeek = chartOfTheWeekSlug(new Date());
  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span><span className="text-slate-400">Charts</span>
        </nav>
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Charts</h1>
          <p className="text-lg text-white/70">Drawn from the site&apos;s own trackers, refreshed every time you load them. Each has a permalink, a PNG, and the numbers in a table.</p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CHART_DEFS.map((c) => (
            <Link key={c.slug} href={`/chart/${c.slug}`} className="card overflow-hidden hover:border-cyan-500/30 transition-colors group">
              <img src={`/api/chart/${c.slug}?format=svg`} alt="" width={1200} height={630} className="w-full h-auto block" loading="lazy" />
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-white group-hover:text-cyan-300 transition-colors">{c.title}</h2>
                  {c.slug === thisWeek && <span className="text-[10px] uppercase tracking-wider text-cyan-300 border border-cyan-500/30 rounded px-1.5 py-0.5 whitespace-nowrap">This week</span>}
                </div>
                <p className="text-xs text-slate-400 mt-1">{c.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
        <ItemListSchema name="Space industry charts" url="/chart" description={metadata.description as string} items={CHART_DEFS.map((c) => ({ name: c.title, url: `/chart/${c.slug}`, description: c.subtitle }))} />
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Charts' }]} />
      </div>
    </div>
  );
}
