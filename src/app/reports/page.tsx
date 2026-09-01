import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import JsonLd from '@/components/seo/JsonLd';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import EmptyState from '@/components/ui/EmptyState';
import Provenance from '@/components/ui/Provenance';

// Railway's build container has no DB, and the list below is read from
// PublishedBrief — render per request, with a 10-minute server cache.
export const dynamic = 'force-dynamic';

// ─── Flagship (hand-written) reports ────────────────────────────────────────
// Every href below is a real page under src/app/reports/* (verified 2026-09-01
// against the route tree, site-directory and the mothball registry). Add a
// card only when the page exists.
const FLAGSHIP_REPORTS = [
  {
    slug: 'space-economy-2026',
    title: 'The Space Economy in 2026',
    description:
      'Comprehensive breakdown of the $626B+ current global space economy: market sizing by sector and region, profiles of the top 50 space companies, investment trends, the regulatory landscape, and growth projections toward $1.8T by 2035.',
    tag: 'Annual Report',
    year: '2026',
  },
  {
    slug: 'state-of-space-2026',
    title: 'State of the Space Industry 2026',
    description:
      "A comprehensive, data-driven analysis of today's $626B+ space economy — projected to reach $1.8 trillion by 2035. Market sizing, funding trends, launch data, satellite deployments, and forecasts across every major segment.",
    tag: 'Free Report',
    year: '2026',
  },
  {
    slug: 'monthly',
    title: 'State of Space — Monthly Industry Report',
    description:
      'The monthly State of Space report: launch activity, funding trends, market movers, regulatory developments, technology milestones, and the month ahead. Generated from tracked platform data each month.',
    tag: 'Monthly',
    year: 'Updated monthly',
  },
];

// ─── Published briefs (DB) ──────────────────────────────────────────────────
// src/lib/monthly-report-generator.ts computes its report on the fly and never
// persists it; the only stored, dated report corpus on the site is
// PublishedBrief (weekly intelligence / economy / hiring / regulatory /
// special), written by the weekly crons via src/lib/published-briefs.ts and
// rendered by the /intelligence-brief hub. That is what this page lists.

type BriefType = 'weekly_intelligence' | 'economy' | 'hiring' | 'regulatory' | 'special';

interface ReportRow {
  id: string;
  slug: string;
  title: string;
  briefType: string;
  summary: string;
  publishedAt: string; // ISO
}

const TYPE_LABELS: Record<BriefType, string> = {
  weekly_intelligence: 'Weekly Intelligence',
  economy: 'State of the Economy',
  hiring: "Who's Hiring",
  regulatory: 'Regulatory Radar',
  special: 'Special Report',
};

const TYPE_BADGE: Record<BriefType, string> = {
  weekly_intelligence: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
  economy: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  hiring: 'text-purple-300 bg-purple-500/10 border-purple-500/20',
  regulatory: 'text-orange-300 bg-orange-500/10 border-orange-500/20',
  special: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
};

function typeLabel(t: string): string {
  return (TYPE_LABELS as Record<string, string>)[t] ?? 'Report';
}
function typeBadge(t: string): string {
  return (TYPE_BADGE as Record<string, string>)[t] ?? 'text-slate-300 bg-white/10 border-white/10';
}

/** "2026-08" style month bucket from an ISO date. */
function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

/** ISO date only (YYYY-MM-DD) — never a locale-formatted string. */
function isoDate(iso: string): string {
  return iso.slice(0, 10);
}

const getPublishedReports = unstable_cache(
  async (): Promise<ReportRow[] | null> => {
    try {
      const rows = await prisma.publishedBrief.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 100, // matches the /api/published-briefs cap the hub deep-link requests
        select: { id: true, slug: true, title: true, briefType: true, summary: true, publishedAt: true },
      });
      return rows.map((r) => ({ ...r, publishedAt: r.publishedAt.toISOString() }));
    } catch (error) {
      logger.error('Reports index: PublishedBrief read failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null; // null = read failed; [] = genuinely empty
    }
  },
  ['reports-index'],
  { revalidate: 600 }
);

export default async function ReportsPage() {
  const reports = await getPublishedReports();
  const rows = reports ?? [];
  const newest = rows[0]?.publishedAt ?? null;

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'SpaceNexus Industry Reports',
    url: 'https://spacenexus.us/reports',
    description:
      'Every published SpaceNexus research report and intelligence brief — annual and monthly industry reports plus the weekly intelligence, economy, hiring and regulatory briefs.',
    publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: FLAGSHIP_REPORTS.length + rows.length,
      itemListElement: [
        ...FLAGSHIP_REPORTS.map((r, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `https://spacenexus.us/reports/${r.slug}`,
          name: r.title,
        })),
        ...rows.map((r, i) => ({
          '@type': 'ListItem',
          position: FLAGSHIP_REPORTS.length + i + 1,
          url: `https://spacenexus.us/intelligence-brief?brief=${encodeURIComponent(r.slug)}`,
          name: r.title,
        })),
      ],
    },
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <JsonLd data={collectionJsonLd} />
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Industry Reports', href: '/reports' }]} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <p className="text-sm uppercase tracking-widest text-slate-500 mb-2">SpaceNexus Intelligence</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Industry Reports</h1>
          <p className="text-slate-400 max-w-2xl">
            In-depth research reports on the space industry — market sizing, company landscapes,
            investment trends, and regulatory developments — plus every weekly brief the platform
            has published, newest first.
          </p>
        </div>

        {/* Flagship reports */}
        <section aria-labelledby="flagship-heading" className="mb-12">
          <h2 id="flagship-heading" className="text-lg font-semibold text-white mb-4">
            Flagship reports
          </h2>
          <div className="grid grid-cols-1 gap-6">
            {FLAGSHIP_REPORTS.map((report) => (
              <Link
                key={report.slug}
                href={`/reports/${report.slug}`}
                className="group block rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all p-6 md:p-8"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide bg-white/10 text-slate-300 px-2.5 py-1 rounded">
                    {report.tag}
                  </span>
                  <span className="text-xs text-slate-500">{report.year}</span>
                </div>
                <h3 className="text-xl md:text-2xl font-semibold text-white mb-2 group-hover:text-slate-200">
                  {report.title}
                </h3>
                <p className="text-slate-400 text-sm md:text-base mb-4">{report.description}</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-white/80 group-hover:text-white">
                  Read the report
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                    &rarr;
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Published briefs — every dated report in the archive */}
        <section aria-labelledby="published-heading" className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
            <div>
              <h2 id="published-heading" className="text-lg font-semibold text-white">
                Published briefs
                {rows.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-slate-500">({rows.length})</span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Weekly intelligence, State of the Space Economy, Who&apos;s Hiring and Regulatory Radar
                editions, rendered in the{' '}
                <Link href="/intelligence-brief" className="text-cyan-400 hover:underline">
                  Intelligence Brief hub
                </Link>
                .
              </p>
            </div>
            {newest && <Provenance source="SpaceNexus PublishedBrief archive" asOf={isoDate(newest)} />}
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={<span className="text-3xl" aria-hidden="true">📚</span>}
              title={reports === null ? 'Report archive temporarily unavailable' : 'No briefs published yet'}
              description={
                reports === null
                  ? 'The published-brief archive could not be read just now. The flagship reports above are unaffected.'
                  : 'The weekly briefs land here automatically as each edition is published.'
              }
              reason={
                reports === null
                  ? 'The PublishedBrief table did not answer within this request; the list rebuilds on the next visit (10-minute cache).'
                  : 'The State of the Space Economy brief publishes Mondays and Who\'s Hiring Wednesdays; the first edition after a fresh deploy appears within a week.'
              }
              suggestions={[
                { label: 'Intelligence Brief hub', href: '/intelligence-brief' },
                { label: 'AI Insights', href: '/ai-insights' },
              ]}
            />
          ) : (
            <ol className="divide-y divide-white/[0.06] rounded-xl border border-white/10 bg-white/[0.02]">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/intelligence-brief?brief=${encodeURIComponent(r.slug)}`}
                    className="group flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6 p-5 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="sm:w-40 flex-shrink-0">
                      <time dateTime={isoDate(r.publishedAt)} className="block font-mono text-xs text-slate-400">
                        {isoDate(r.publishedAt)}
                      </time>
                      <span className="block text-[11px] text-slate-600 mt-0.5">{monthOf(r.publishedAt)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${typeBadge(r.briefType)}`}
                        >
                          {typeLabel(r.briefType)}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-white group-hover:text-slate-200 leading-snug">
                        {r.title}
                      </h3>
                      {r.summary && (
                        <p className="text-sm text-slate-400 mt-1 line-clamp-2">{r.summary}</p>
                      )}
                    </div>
                    <span
                      aria-hidden="true"
                      className="hidden sm:block text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-0.5"
                    >
                      &rarr;
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Footer note */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">More research</h3>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Looking for company-by-company scorecards? Check out{' '}
            <Link href="/report-cards" className="text-slate-200 underline hover:text-white">
              Report Cards
            </Link>
            . For live data, explore{' '}
            <Link href="/market-intel" className="text-slate-200 underline hover:text-white">
              Market Intelligence
            </Link>{' '}
            or browse the{' '}
            <Link href="/company-profiles" className="text-slate-200 underline hover:text-white">
              Company Directory
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
