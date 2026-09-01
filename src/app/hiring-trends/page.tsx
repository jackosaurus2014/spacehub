import type { Metadata } from 'next';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import Console from '@/components/ui/Console';
import Telemetry from '@/components/ui/Telemetry';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { getHiringSeries, getHiringMovers, TOTAL_SENTINEL, type HiringMoverEntry } from '@/lib/hiring-snapshots';

// Terminal wave (2026-08-31, Jay "go"): hiring as market intelligence. Daily
// CompanyJobSnapshot history (live since 2026-08-13) + the ATS jobs machine,
// rendered as a Bloomberg-style dashboard. DB at request time → force-dynamic
// (the Railway build container has no database); freshness via unstable_cache.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Space Industry Hiring Trends — Who Is Hiring, Weekly Velocity',
  description: 'Live hiring intelligence for the space industry: open roles across tracked companies, week-over-week hiring velocity, top movers, new postings and category breakdowns — from daily ATS snapshots.',
  alternates: { canonical: 'https://spacenexus.us/hiring-trends' },
};

interface PageData {
  latestTotal: number | null;
  changeVs30d: number | null;
  newThisWeek: number;
  companiesHiring: number;
  gainers: (HiringMoverEntry & { slug: string | null })[];
  decliners: (HiringMoverEntry & { slug: string | null })[];
  asOf: string | null;
  newPostings: { title: string; company: string; category: string; sourceUrl: string | null; slug: string | null }[];
  categories: { category: string; count: number }[];
}

const getData = unstable_cache(async (): Promise<PageData | null> => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 86400_000);
    const [totals, movers, newCount, companiesHiring, recent, cats] = await Promise.all([
      getHiringSeries(TOTAL_SENTINEL),
      getHiringMovers(30),
      prisma.spaceJobPosting.count({ where: { isActive: true, postedDate: { gte: weekAgo } } }),
      prisma.spaceJobPosting.groupBy({ by: ['company'], where: { isActive: true } }).then(r => r.length),
      prisma.spaceJobPosting.findMany({
        where: { isActive: true, postedDate: { gte: weekAgo } },
        orderBy: { postedDate: 'desc' },
        take: 12,
        select: { title: true, company: true, category: true, sourceUrl: true, companyProfile: { select: { slug: true } } },
      }),
      prisma.spaceJobPosting.groupBy({ by: ['category'], where: { isActive: true }, _count: { _all: true } }),
    ]);
    const moverIds = [...movers.gainers.byAbsolute, ...movers.decliners.byAbsolute]
      .map(m => m.companyProfileId).filter((id): id is string => !!id);
    const slugRows = moverIds.length
      ? await prisma.companyProfile.findMany({ where: { id: { in: moverIds } }, select: { id: true, slug: true } })
      : [];
    const slugOf = new Map(slugRows.map(r => [r.id, r.slug]));
    const withSlug = (m: HiringMoverEntry) => ({ ...m, slug: m.companyProfileId ? (slugOf.get(m.companyProfileId) || null) : null });
    return {
      latestTotal: totals.latest,
      changeVs30d: totals.changeVs30d,
      newThisWeek: newCount,
      companiesHiring,
      gainers: movers.gainers.byAbsolute.slice(0, 10).map(withSlug),
      decliners: movers.decliners.byAbsolute.slice(0, 5).map(withSlug),
      asOf: movers.asOf,
      newPostings: recent.map(r => ({ title: r.title, company: r.company, category: r.category, sourceUrl: r.sourceUrl, slug: r.companyProfile?.slug || null })),
      categories: cats.map(c => ({ category: c.category, count: c._count._all })).sort((a, b) => b.count - a.count),
    };
  } catch {
    return null; // DB unreachable — page renders the honest empty state
  }
}, ['hiring-trends-page'], { revalidate: 3600 });

function CompanyCell({ name, slug }: { name: string; slug: string | null }) {
  return slug
    ? <Link href={`/company-profiles/${slug}`} className="text-cyan-300 hover:underline">{name}</Link>
    : <span className="text-white/90">{name}</span>;
}

export default async function HiringTrendsPage() {
  const data = await getData();
  const maxCat = data ? Math.max(1, ...data.categories.map(c => c.count)) : 1;
  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span><span className="text-slate-400">Hiring Trends</span>
        </nav>
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Space industry hiring trends</h1>
          <p className="text-lg text-white/70 max-w-3xl">
            Hiring is a leading indicator. These numbers come from our own daily snapshots of live postings
            across tracked company boards — the same data behind the <Link href="/space-talent?tab=jobs" className="text-cyan-300 hover:underline">jobs board</Link>.
          </p>
        </header>

        {!data ? (
          <div className="card p-6"><p className="text-slate-400 text-sm">Hiring data is temporarily unavailable — the daily snapshot service will restore this shortly.</p></div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Telemetry label="Open roles" value={data.latestTotal ?? '—'} sub="across tracked boards" />
              <Telemetry label="30-day change" value={data.changeVs30d == null ? '—' : `${data.changeVs30d >= 0 ? '+' : ''}${data.changeVs30d}`} tone={data.changeVs30d != null && data.changeVs30d < 0 ? 'ember' : 'signal'} sub={data.changeVs30d == null ? 'unlocks ~Sep 12 (history since Aug 13)' : 'open roles vs ~30d ago'} />
              <Telemetry label="New this week" value={data.newThisWeek} sub="postings in the last 7 days" />
              <Telemetry label="Companies hiring" value={data.companiesHiring} sub="with at least one open role" />
            </div>

            <Console title="Hiring velocity — top movers, 30 days" source="SpaceNexus daily snapshots" asOf={data.asOf}>
              {/* 2026-09-01 audit: snapshots began 2026-08-13, so 30-day
                  deltas are impossible until ~Sep 12 — an empty table with
                  headers read as "broken". Say what's actually happening. */}
              {data.gainers.length === 0 && (
                <p className="text-slate-400 text-sm">
                  Collecting history — daily snapshots began Aug 13, 2026, so 30-day movers unlock around Sep 12.
                  The tiles above and the weekly chart below are live now.
                </p>
              )}
              <div className={data.gainers.length === 0 ? 'hidden' : 'overflow-x-auto'}>
                <table className="w-full text-sm">
                  <caption className="sr-only">Companies with the largest change in open roles over the trailing 30 days</caption>
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                      <th className="py-2 pr-3">Company</th>
                      <th className="py-2 pr-3 text-right">Open now</th>
                      <th className="py-2 pr-3 text-right">Δ 30d</th>
                      <th className="py-2 text-right">Δ %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.gainers.map(m => (
                      <tr key={m.companyName} className="border-b border-white/[0.04]">
                        <td className="py-2 pr-3"><CompanyCell name={m.companyName} slug={m.slug} /></td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-white">{m.current}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-emerald-400">{m.absoluteChange != null ? `+${m.absoluteChange}` : '—'}</td>
                        <td className="py-2 text-right font-mono tabular-nums text-slate-400">{m.percentChange != null ? `${m.percentChange >= 0 ? '+' : ''}${Math.round(m.percentChange)}%` : '—'}</td>
                      </tr>
                    ))}
                    {data.decliners.filter(m => (m.absoluteChange ?? 0) < 0).map(m => (
                      <tr key={m.companyName} className="border-b border-white/[0.04]">
                        <td className="py-2 pr-3"><CompanyCell name={m.companyName} slug={m.slug} /></td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-white">{m.current}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-red-400">{m.absoluteChange}</td>
                        <td className="py-2 text-right font-mono tabular-nums text-slate-400">{m.percentChange != null ? `${Math.round(m.percentChange)}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Console>

            <div className="grid md:grid-cols-2 gap-6">
              <Console title="New postings this week" source="ATS sync, daily">
                {data.newPostings.length === 0 ? (
                  <p className="text-slate-500 text-sm">No new postings captured this week.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.newPostings.map((p, i) => (
                      <li key={i} className="text-sm">
                        {p.sourceUrl
                          ? <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-white hover:text-cyan-300">{p.title}</a>
                          : <span className="text-white">{p.title}</span>}
                        <span className="text-slate-500 text-xs ml-2"><CompanyCell name={p.company} slug={p.slug} /> · {p.category}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Console>

              <Console title="Open roles by category">
                <ul className="space-y-2">
                  {data.categories.map(c => (
                    <li key={c.category} className="text-sm">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-white/90 capitalize">{c.category.replace(/_/g, ' ')}</span>
                        <span className="font-mono tabular-nums text-slate-300">{c.count}</span>
                      </div>
                      <div className="h-1.5 rounded bg-white/[0.04] overflow-hidden">
                        <div className="h-full bg-cyan-500/60 rounded" style={{ width: `${Math.round((c.count / maxCat) * 100)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Console>
            </div>

            <Console title="Open roles over time" source="Weekly rollup of daily snapshots" actions={<Link href="/chart/open-space-jobs" className="text-xs text-cyan-300 hover:underline">Permalink + data →</Link>}>
              {/* Server-rendered SVG from the chart pipeline — same image the M/Th Digest embeds. */}
              <img src="/api/chart/open-space-jobs?format=svg" alt="Open space-industry jobs, weekly trend" width={1200} height={630} className="w-full h-auto rounded" loading="lazy" />
            </Console>

            <p className="text-sm text-slate-500">
              Explore further: <Link href="/space-talent?tab=jobs" className="text-cyan-300 hover:underline">browse all {data.latestTotal ?? ''} open roles</Link>{' · '}
              <Link href="/company-profiles" className="text-cyan-300 hover:underline">company profiles &amp; screener</Link>{' · '}
              <Link href="/space-talent?tab=workforce&wfTab=salaries" className="text-cyan-300 hover:underline">salary benchmarks</Link>
            </p>
          </div>
        )}
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Hiring Trends' }]} />
      </div>
    </div>
  );
}
