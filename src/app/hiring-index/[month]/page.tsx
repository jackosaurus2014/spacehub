import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Console from '@/components/ui/Console';
import Telemetry from '@/components/ui/Telemetry';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import CiteEmbed from '@/components/CiteEmbed';
import { coverageChangesInWindow } from '@/lib/hiring-coverage';
import {
  getHiringIndex,
  parseMonthParam,
  currentMonthKey,
  monthKey,
  monthLabelOf,
  EARLIEST_INDEX_MONTH,
  type HiringIndex,
  type HiringIndexCount,
  type HiringIndexMover,
} from '@/lib/hiring-index';

// G2 (growth plan): the SpaceNexus Monthly Hiring Index — a citable monthly
// data release. DB at request time → force-dynamic (the Railway build
// container has no database); freshness via the 6h unstable_cache inside
// getHiringIndex.
export const dynamic = 'force-dynamic';

const BASE_URL = 'https://spacenexus.us';

interface PageProps {
  params: { month: string };
}

/** Validate the route param; null when malformed or outside the served range. */
function resolveMonth(param: string): { year: number; month: number; key: string } | null {
  const parsed = parseMonthParam(param);
  if (!parsed) return null;
  const key = monthKey(parsed.year, parsed.month);
  if (key < EARLIEST_INDEX_MONTH || key > currentMonthKey()) return null;
  return { ...parsed, key };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = resolveMonth(params.month);
  if (!resolved) return { title: 'Space Industry Hiring Index' };
  const label = monthLabelOf(resolved.year, resolved.month);

  let headline: number | null = null;
  let newPostings: number | null = null;
  try {
    const index = await getHiringIndex(resolved.year, resolved.month);
    headline = index ? index.activeAtMonthEnd ?? index.activeNow : null;
    newPostings = index?.newPostings.total ?? null;
  } catch {
    // DB unreachable — metadata falls back to the number-free description
  }

  const description = headline != null
    ? `${headline.toLocaleString('en-US')} open space-industry roles at the end of ${label}, with ${newPostings?.toLocaleString('en-US') ?? 'hundreds of'} new postings during the month. Top hirers, fastest movers, category and location breakdowns — from SpaceNexus daily ATS tracking.`
    : `The SpaceNexus Monthly Hiring Index for ${label}: open space-industry roles, top hirers, fastest movers, and category breakdowns from daily ATS tracking.`;

  return {
    title: `Space Industry Hiring Index — ${label}`,
    description,
    alternates: { canonical: `${BASE_URL}/hiring-index/${resolved.key}` },
  };
}

function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

const SENIORITY_LABELS: Record<string, string> = {
  entry: 'Entry',
  mid: 'Mid-level',
  senior: 'Senior',
  lead: 'Lead',
  director: 'Director',
  vp: 'VP',
  c_suite: 'C-suite',
};

function labelFor(kind: 'category' | 'seniority', key: string): string {
  if (kind === 'seniority' && SENIORITY_LABELS[key]) return SENIORITY_LABELS[key];
  const words = key.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function CompanyCell({ name, slug }: { name: string; slug: string | null }) {
  return slug
    ? <Link href={`/company-profiles/${slug}`} className="text-cyan-300 hover:underline">{name}</Link>
    : <span className="text-white/90">{name}</span>;
}

/** Bar rows in the same idiom /hiring-trends uses for its category breakdown. */
function BarRows({ kind, rows }: { kind: 'category' | 'seniority'; rows: HiringIndexCount[] }) {
  if (rows.length === 0) {
    return <p className="text-slate-500 text-sm">No postings captured for this month.</p>;
  }
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.key} className="text-sm">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-white/90">{labelFor(kind, r.key)}</span>
            <span className="font-mono tabular-nums text-slate-300">{formatCount(r.count)}</span>
          </div>
          <div className="h-1.5 rounded bg-white/[0.04] overflow-hidden">
            <div className="h-full bg-cyan-500/60 rounded" style={{ width: `${Math.round((r.count / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function MoverRow({ m, positive }: { m: HiringIndexMover; positive: boolean }) {
  return (
    <tr className="border-b border-white/[0.04]">
      <td className="py-2 pr-3"><CompanyCell name={m.companyName} slug={m.slug} /></td>
      <td className="py-2 pr-3 text-right font-mono tabular-nums text-slate-400">{formatCount(m.first)}</td>
      <td className="py-2 pr-3 text-right font-mono tabular-nums text-white">{formatCount(m.last)}</td>
      <td className={`py-2 pr-3 text-right font-mono tabular-nums ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
        {m.change > 0 ? `+${m.change}` : m.change}
      </td>
      <td className="py-2 text-right font-mono tabular-nums text-slate-400">
        {m.percentChange != null ? `${m.percentChange >= 0 ? '+' : ''}${Math.round(m.percentChange)}%` : '—'}
      </td>
    </tr>
  );
}

export default async function HiringIndexMonthPage({ params }: PageProps) {
  const resolved = resolveMonth(params.month);
  if (!resolved) notFound();

  let index: HiringIndex | null = null;
  let dbUnavailable = false;
  try {
    index = await getHiringIndex(resolved.year, resolved.month);
  } catch {
    dbUnavailable = true; // render the honest empty state below
  }
  if (!dbUnavailable && !index) notFound();

  const label = monthLabelOf(resolved.year, resolved.month);
  const pageUrl = `${BASE_URL}/hiring-index/${resolved.key}`;

  // Prev/next edition links, kept inside the served range.
  const prevDate = new Date(Date.UTC(resolved.year, resolved.month - 2, 1));
  const prevKey = monthKey(prevDate.getUTCFullYear(), prevDate.getUTCMonth() + 1);
  const nextDate = new Date(Date.UTC(resolved.year, resolved.month, 1));
  const nextKey = monthKey(nextDate.getUTCFullYear(), nextDate.getUTCMonth() + 1);
  const hasPrev = prevKey >= EARLIEST_INDEX_MONTH;
  const hasNext = nextKey <= currentMonthKey();

  const headlineActive = index ? index.activeAtMonthEnd ?? index.activeNow : null;
  const movers = index ? [...index.movers.gainers, ...index.movers.decliners] : [];

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
          <Link href="/hiring-index" className="hover:text-white/80">Hiring Index</Link><span>/</span>
          <span className="text-slate-400">{label}</span>
        </nav>

        <header className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">SpaceNexus Monthly Hiring Index</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Space industry hiring — {label}</h1>
          <p className="text-lg text-white/70 max-w-3xl">
            The monthly edition of our hiring dataset: who was hiring, how fast the picture moved, and where
            the roles were. For the live day-to-day view, see the{' '}
            <Link href="/hiring-trends" className="text-cyan-300 hover:underline font-medium">hiring trends dashboard</Link>.
          </p>
          <div className="flex items-center gap-3 mt-3 text-sm">
            {hasPrev && <Link href={`/hiring-index/${prevKey}`} className="text-cyan-300 hover:underline">← Previous edition</Link>}
            {hasNext && <Link href={`/hiring-index/${nextKey}`} className="text-cyan-300 hover:underline">Next edition →</Link>}
          </div>
        </header>

        {!index ? (
          <div className="card p-6">
            <p className="text-slate-400 text-sm">
              Hiring index data is temporarily unavailable — the daily snapshot service will restore this shortly.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Telemetry
                label="Active postings"
                value={headlineActive != null ? formatCount(headlineActive) : '—'}
                sub={index.activeAtMonthEnd != null
                  ? `at month end (${index.activeAtMonthEndDate})`
                  : 'live count — no month-end snapshot yet'}
              />
              <Telemetry
                label="New postings"
                value={formatCount(index.newPostings.total)}
                sub={`first seen during ${label}`}
              />
              <Telemetry
                label="MoM change"
                value={index.momChange == null ? '—' : `${index.momChange >= 0 ? '+' : ''}${formatCount(index.momChange)}`}
                tone={index.momChange != null && index.momChange < 0 ? 'ember' : 'signal'}
                sub={index.momChange == null ? 'first edition — no prior month' : 'active postings vs prior month end'}
              />
              <Telemetry
                label="Remote share"
                value={index.remoteShare.percent != null ? `${index.remoteShare.percent.toFixed(1)}%` : '—'}
                sub={`${formatCount(index.remoteShare.remote)} of ${formatCount(index.remoteShare.total)} active roles`}
              />
            </div>

            <Console title={`Top 10 hirers — ${label}`} source="SpaceNexus daily snapshots" asOf={index.generatedAt}>
              {index.topCompanies.length === 0 ? (
                <p className="text-slate-500 text-sm">No company snapshots captured within this month.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Companies with the most active postings at their last snapshot in {label}</caption>
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                        <th className="py-2 pr-3">#</th>
                        <th className="py-2 pr-3">Company</th>
                        <th className="py-2 text-right">Active roles at month end</th>
                      </tr>
                    </thead>
                    <tbody>
                      {index.topCompanies.map((c, i) => (
                        <tr key={c.companyName} className="border-b border-white/[0.04]">
                          <td className="py-2 pr-3 font-mono tabular-nums text-slate-500">{i + 1}</td>
                          <td className="py-2 pr-3"><CompanyCell name={c.companyName} slug={c.slug} /></td>
                          <td className="py-2 text-right font-mono tabular-nums text-white">{formatCount(c.activeJobs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Console>

            <Console title={`Fastest movers within ${label}`} source="First vs last snapshot in month">
              {movers.length === 0 ? (
                <p className="text-slate-500 text-sm">
                  Not enough within-month history to compute movers for this edition.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Companies with the largest change in active postings within {label} (minimum 5 active roles)</caption>
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                        <th className="py-2 pr-3">Company</th>
                        <th className="py-2 pr-3 text-right">Start</th>
                        <th className="py-2 pr-3 text-right">End</th>
                        <th className="py-2 pr-3 text-right">Δ</th>
                        <th className="py-2 text-right">Δ %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {index.movers.gainers.map((m) => <MoverRow key={m.companyName} m={m} positive />)}
                      {index.movers.decliners.map((m) => <MoverRow key={m.companyName} m={m} positive={false} />)}
                    </tbody>
                  </table>
                  {movers[0] && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      Window: {movers[0].firstDate} → {movers[0].lastDate}. Companies with fewer than 5 active roles excluded.
                    </p>
                  )}
                </div>
              )}
            </Console>

            <div className="grid md:grid-cols-2 gap-6">
              <Console title="New postings by category" source="ATS sync, daily">
                <BarRows kind="category" rows={index.newPostings.byCategory} />
              </Console>
              <Console title="New postings by seniority" source="ATS sync, daily">
                <BarRows kind="seniority" rows={index.newPostings.bySeniority} />
              </Console>
            </div>

            <Console title="Top hiring locations" source="Active postings">
              {index.topLocations.length === 0 ? (
                <p className="text-slate-500 text-sm">No location data available.</p>
              ) : (
                <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
                  {index.topLocations.map((l, i) => (
                    <li key={l.location} className="flex items-center justify-between text-sm border-b border-white/[0.04] py-1.5">
                      <span className="text-white/90"><span className="font-mono tabular-nums text-slate-500 mr-2">{i + 1}</span>{l.location}</span>
                      <span className="font-mono tabular-nums text-slate-300">{formatCount(l.count)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-slate-500">
                Remote-only postings ({formatCount(index.remoteShare.remote)}) are excluded here and reported in the remote-share tile above.
              </p>
            </Console>

            <Console title="Methodology">
              <div className="space-y-3 text-sm text-white/70 leading-relaxed">
                {/* Coverage honesty (2026-09-01): board additions must be
                    disclosed — a totals jump from expanded tracking is not
                    market hiring, and this index gets cited. */}
                {coverageChangesInWindow(new Date(Date.UTC(resolved.year, resolved.month - 1, 1)), new Date(Date.UTC(resolved.year, resolved.month, 1))).map(c => (
                  <p key={c.date} className="text-[13px] text-amber-300/90 bg-amber-500/5 border border-amber-500/15 rounded px-3 py-2">
                    Coverage change ({c.date}): {c.note} Month-over-month comparisons spanning this date are
                    affected accordingly.
                  </p>
                ))}
                <p>
                  The SpaceNexus Monthly Hiring Index is built from our jobs tracker, which syncs live postings
                  daily from 16+ applicant-tracking-system (ATS) boards at space and space-adjacent companies,
                  plus curated sources. A posting counts as <span className="text-white/90">active</span> when it
                  is live on the employer&apos;s own board at our most recent sync; postings that disappear from a
                  board are marked inactive, and duplicates across boards are scrubbed during ingestion.
                </p>
                <p>
                  Per-company counts come from daily snapshots taken since <span className="text-white/90">August 13, 2026</span>.
                  &ldquo;Active postings&rdquo; is the last site-wide snapshot on or before the month&apos;s final day;
                  &ldquo;fastest movers&rdquo; compares each company&apos;s first and last snapshot within the month
                  {resolved.key === '2026-08' && (
                    <> (for this first edition that window is Aug 13&ndash;31, since snapshot history begins mid-month)</>
                  )}.
                  &ldquo;New postings&rdquo; counts roles whose posted date falls inside the calendar month (UTC).
                  Remote share and location rankings reflect currently active postings. Companies without a
                  linked profile appear under their board&apos;s name as-is.
                </p>
                <p>
                  This index is free to cite with attribution. Questions or corrections:{' '}
                  <Link href="/contact" className="text-cyan-300 hover:underline">contact us</Link>.
                </p>
              </div>
            </Console>

            <CiteEmbed
              title={`SpaceNexus Monthly Hiring Index — ${label}`}
              pageUrl={pageUrl}
              sourceLine={`SpaceNexus Monthly Hiring Index, ${label} edition (data: SpaceNexus jobs tracker)`}
            />

            <p className="text-sm text-slate-500">
              Explore further:{' '}
              <Link href="/hiring-trends" className="text-cyan-300 hover:underline">live hiring trends</Link>{' · '}
              <Link href="/space-talent?tab=jobs" className="text-cyan-300 hover:underline">browse all open roles</Link>{' · '}
              <Link href="/company-profiles" className="text-cyan-300 hover:underline">company profiles &amp; screener</Link>
            </p>
          </div>
        )}

        <BreadcrumbSchema items={[
          { name: 'Home', href: '/' },
          { name: 'Hiring Index', href: '/hiring-index' },
          { name: label },
        ]} />
      </div>
    </div>
  );
}
