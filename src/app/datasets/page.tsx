import type { Metadata } from 'next';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import Console from '@/components/ui/Console';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

// G10 — free dataset downloads (growth plan): the lead-gen page. Each CSV
// needs a free account; attribution requested, never required by license
// walls. Counts are live so the page never oversells.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Free Space Industry Datasets — Companies, Funding, Launches',
  description: 'Download the SpaceNexus datasets as CSV: 300+ space companies with funding and valuations, verified funding rounds, the orbital launch log, and executive moves. Free with attribution; live API available.',
  alternates: { canonical: 'https://spacenexus.us/datasets' },
};

const getCounts = unstable_cache(async () => {
  try {
    const [companies, rounds, launches, moves] = await Promise.all([
      prisma.companyProfile.count({ where: { status: { not: 'defunct' } } }),
      prisma.fundingRound.count(),
      prisma.spaceEvent.count({ where: { status: { in: ['completed', 'failed'] }, rocket: { not: null } } }),
      prisma.executiveMove.count(),
    ]);
    return { companies, rounds, launches, moves, asOf: new Date().toISOString() };
  } catch {
    return null;
  }
}, ['datasets-counts'], { revalidate: 3600 });

const CARDS = [
  { slug: 'space-companies', icon: '🏢', title: 'Space Company Database', body: 'Every tracked company: sector, country, ownership, ticker, valuation and total funding — public and private, US and international.', countKey: 'companies' as const, unit: 'companies' },
  { slug: 'funding-rounds', icon: '💸', title: 'Funding Rounds', body: 'Verified rounds with dates, amounts, series labels, post-money valuations and lead investors.', countKey: 'rounds' as const, unit: 'rounds' },
  { slug: 'launch-log', icon: '🚀', title: 'Orbital Launch Log', body: 'Flown orbital attempts with mission, vehicle, provider, site and outcome — the dataset behind the Launch Cadence Index.', countKey: 'launches' as const, unit: 'launches' },
  { slug: 'executive-moves', icon: '👔', title: 'Executive Moves', body: 'Leadership changes across the industry, recorded from primary sources since Aug 2026.', countKey: 'moves' as const, unit: 'moves' },
];

export default async function DatasetsPage() {
  const counts = await getCounts();
  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span><span className="text-slate-400">Datasets</span>
        </nav>
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Free space industry datasets</h1>
          <p className="text-lg text-white/70 max-w-3xl">
            The data behind SpaceNexus, downloadable as CSV. Free with a free account and an attribution line —
            because cited data is how this industry gets better numbers. Need it live instead?{' '}
            <Link href="/developer" className="text-cyan-300 hover:underline">The API serves the same tables</Link>.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-4">
          {CARDS.map(c => (
            <Console key={c.slug} title={c.title}>
              <p className="text-sm text-slate-400 mb-3"><span aria-hidden="true" className="mr-1">{c.icon}</span>{c.body}</p>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono tabular-nums text-cyan-300 text-sm">
                  {counts ? `${counts[c.countKey].toLocaleString()} ${c.unit}` : '—'}
                </span>
                <a href={`/api/datasets/${c.slug}/csv`} className="btn-secondary text-sm py-2 px-4">Download CSV</a>
              </div>
            </Console>
          ))}
        </div>

        <div className="mt-8 text-sm text-slate-500 space-y-2">
          <p><span className="text-slate-300 font-medium">Attribution:</span> “Data: SpaceNexus, spacenexus.us/datasets” — that&apos;s the whole license.</p>
          <p><span className="text-slate-300 font-medium">Freshness:</span> files are generated at download time from the live database{counts ? ` (counts as of ${new Date(counts.asOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})` : ''}.</p>
          <p>Downloads need a free account — that&apos;s the ask. No tiers, no locked columns.</p>
        </div>
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Datasets' }]} />
      </div>
    </div>
  );
}
