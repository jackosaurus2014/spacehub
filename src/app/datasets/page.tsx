import type { Metadata } from 'next';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import Console from '@/components/ui/Console';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import DatasetSchema from '@/components/seo/DatasetSchema';
import { TOTAL_SENTINEL, PRIVATE_TOTAL_SENTINEL } from '@/lib/hiring-snapshots';
import { RECORDING_SINCE } from '@/lib/launch-slips';

// G10 — free dataset downloads (growth plan): the lead-gen page. Each CSV
// needs a free account; attribution requested, never required by license
// walls. Counts are live so the page never oversells.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Free Space Industry Datasets — Companies, Funding, Launches',
  description: 'Download the SpaceNexus datasets as CSV: 300+ space companies with funding and valuations, verified funding rounds, the orbital launch log, launch slips, vehicle reliability, daily hiring counts and executive moves. Free with attribution; live API available.',
  alternates: { canonical: 'https://spacenexus.us/datasets' },
};

const HIRING_SENTINELS = [TOTAL_SENTINEL, PRIVATE_TOTAL_SENTINEL];
const HIRING_SINCE = '2026-08-13';

const getCounts = unstable_cache(async () => {
  try {
    const flownWhere = { status: { in: ['completed', 'failed'] }, rocket: { not: null } };
    const [companies, rounds, launches, moves, slips, hiring, hiringTotals, vehicles] = await Promise.all([
      prisma.companyProfile.count({ where: { status: { not: 'defunct' } } }),
      prisma.fundingRound.count(),
      prisma.spaceEvent.count({ where: flownWhere }),
      prisma.executiveMove.count(),
      prisma.launchDateChange.count(),
      prisma.companyJobSnapshot.count({ where: { companyName: { notIn: HIRING_SENTINELS } } }),
      prisma.companyJobSnapshot.count({ where: { companyName: { in: HIRING_SENTINELS } } }),
      prisma.spaceEvent.groupBy({ by: ['rocket'], where: flownWhere }).then(r => r.length),
    ]);
    return { companies, rounds, launches, moves, slips, hiring, hiringTotals, vehicles, asOf: new Date().toISOString() };
  } catch {
    return null;
  }
}, ['datasets-counts'], { revalidate: 3600 });

type CountKey = 'companies' | 'rounds' | 'launches' | 'moves' | 'slips' | 'hiring' | 'hiringTotals' | 'vehicles';

interface Card {
  slug: string;
  icon: string;
  title: string;
  body: string;
  countKey: CountKey;
  unit: string;
  /** ISO 8601 interval for the Dataset schema; open-ended for live ledgers. */
  temporalCoverage?: string;
  keywords: string[];
}

const slipsSince = new Date(RECORDING_SINCE + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const CARDS: Card[] = [
  { slug: 'space-companies', icon: '🏢', title: 'Space Company Database', body: 'Every tracked company: sector, country, ownership, ticker, valuation and total funding — public and private, US and international.', countKey: 'companies', unit: 'companies', keywords: ['space companies', 'aerospace', 'valuation', 'funding'] },
  { slug: 'funding-rounds', icon: '💸', title: 'Funding Rounds', body: 'Verified rounds with dates, amounts, series labels, post-money valuations and lead investors.', countKey: 'rounds', unit: 'rounds', keywords: ['space funding', 'venture capital', 'funding rounds'] },
  { slug: 'launch-log', icon: '🚀', title: 'Orbital Launch Log', body: 'Flown orbital attempts with mission, vehicle, provider, site and outcome — the dataset behind the Launch Cadence Index.', countKey: 'launches', unit: 'launches', keywords: ['orbital launches', 'launch log', 'rockets'] },
  { slug: 'launch-reliability', icon: '🎯', title: 'Launch Vehicle Reliability', body: 'Per-vehicle record computed from the launch log: flights, successes, failures, success rate, first and last flight. Grouped on the vehicle name as reported, so variants stay distinct.', countKey: 'vehicles', unit: 'vehicles', keywords: ['launch vehicle reliability', 'success rate', 'rockets'] },
  { slug: 'launch-slips', icon: '⏳', title: 'Launch Slip Ledger', body: `Every launch date change we observe, with the old and new dates and the size of the move. Recording began ${slipsSince} — no upstream revision feed exists, so it can't be backfilled and only grows.`, countKey: 'slips', unit: 'date changes', temporalCoverage: `${RECORDING_SINCE}/..`, keywords: ['launch slips', 'launch delays', 'manifest changes'] },
  { slug: 'hiring-index', icon: '📈', title: 'Hiring Index — by company', body: `Daily open-role counts per tracked company from ATS snapshots, one row per company per day since ${new Date(HIRING_SINCE + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}. The series behind Hiring Trends.`, countKey: 'hiring', unit: 'company-days', temporalCoverage: `${HIRING_SINCE}/..`, keywords: ['space jobs', 'hiring trends', 'job postings'] },
  { slug: 'hiring-index-totals', icon: '🧮', title: 'Hiring Index — site-wide totals', body: 'The daily industry-wide open-role count (all tracked companies, and private companies only) as two labeled series.', countKey: 'hiringTotals', unit: 'daily totals', temporalCoverage: `${HIRING_SINCE}/..`, keywords: ['space industry hiring', 'open roles', 'labor market'] },
  { slug: 'executive-moves', icon: '👔', title: 'Executive Moves', body: 'Leadership changes across the industry, recorded from primary sources since Aug 2026.', countKey: 'moves', unit: 'moves', temporalCoverage: '2026-08-24/..', keywords: ['executive moves', 'leadership changes', 'space industry'] },
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
            <div key={c.slug} id={c.slug} className="scroll-mt-24">
              <Console title={c.title} className="h-full">
                <p className="text-sm text-slate-400 mb-3"><span aria-hidden="true" className="mr-1">{c.icon}</span>{c.body}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono tabular-nums text-cyan-300 text-sm">
                    {counts ? `${counts[c.countKey].toLocaleString()} ${c.unit}` : '—'}
                  </span>
                  <a href={`/api/datasets/${c.slug}/csv`} className="btn-secondary text-sm py-2 px-4">Download CSV</a>
                </div>
              </Console>
            </div>
          ))}
        </div>

        <div className="mt-8 text-sm text-slate-500 space-y-2">
          <p><span className="text-slate-300 font-medium">Attribution:</span> “Data: SpaceNexus, spacenexus.us/datasets” — that&apos;s the whole license.</p>
          <p><span className="text-slate-300 font-medium">License:</span> every dataset here is published under{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/" className="text-cyan-300 hover:underline" rel="license noopener" target="_blank">CC BY 4.0</a> —
            use it commercially, remix it, redistribute it; just keep the attribution line.</p>
          <p><span className="text-slate-300 font-medium">Freshness:</span> files are generated at download time from the live database{counts ? ` (counts as of ${new Date(counts.asOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})` : ''}.</p>
          <p>Downloads need a free account — that&apos;s the ask. No tiers, no locked columns.</p>
        </div>
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Datasets' }]} />
        {CARDS.map(c => (
          <DatasetSchema
            key={c.slug}
            name={`SpaceNexus ${c.title}`}
            description={c.body}
            url={`https://spacenexus.us/datasets#${c.slug}`}
            distributionUrl={`https://spacenexus.us/api/datasets/${c.slug}/csv`}
            encodingFormat="text/csv"
            temporalCoverage={c.temporalCoverage}
            dateModified={counts?.asOf}
            keywords={c.keywords}
          />
        ))}
      </div>
    </div>
  );
}
