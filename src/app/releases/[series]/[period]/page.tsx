import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import DeskByline from '@/components/desk/DeskByline';
import CiteEmbed from '@/components/CiteEmbed';
import ReleaseEditionView from '@/components/reports/ReleaseEditionView';
import { authOptions } from '@/lib/auth';
import { resolveResearchAccess, getResearchAvailability } from '@/lib/research';
import {
  citationFor,
  getRelease,
  isPublishedPeriod,
  isRetrospectiveEdition,
  latestPeriod,
  nextPeriod,
  periodLabel,
  previousPeriod,
} from '@/lib/research-releases';
import { readReleaseLog } from '@/lib/research-release-log';
import { buildReleaseEdition } from '@/lib/research-report-build';

// One dated edition of a recurring release.
//
// force-dynamic: the edition is computed from the database at request time and
// the gate is resolved from the caller's own session, so there is nothing safe
// to prerender. (The Railway build container reaches no database either.)
export const dynamic = 'force-dynamic';

const BASE = 'https://spacenexus.us';

interface PageProps {
  params: Promise<{ series: string; period: string }>;
}

/**
 * Only 'series'-surfaced releases render here. The Hiring Index and the Space
 * Score Top 25 have long-standing public pages of their own; duplicating them
 * would give us two surfaces that can disagree, so /reports/<those>/<period>
 * is not a page at all.
 */
function resolve(series: string, period: string) {
  const release = getRelease(series);
  if (!release || release.surface !== 'series') return null;
  if (!isPublishedPeriod(release, period)) return null;
  return release;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { series, period } = await props.params;
  const release = resolve(series, period);
  if (!release) return { title: 'Report not found' };

  const title = `${release.title}, ${periodLabel(release.cadence, period)}`;
  const description = `${release.summary} Computed from SpaceNexus data, with the method and the coverage limits stated in full.`;
  const og = `/api/og?title=${encodeURIComponent(release.shortTitle)}&subtitle=${encodeURIComponent(
    periodLabel(release.cadence, period)
  )}&type=data`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE}${release.href(period)}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${BASE}${release.href(period)}`,
      images: [{ url: og, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [og] },
  };
}

export default async function ReleaseEditionPage(props: PageProps) {
  const { series, period } = await props.params;
  const release = resolve(series, period);
  if (!release) notFound();

  const edition = await buildReleaseEdition(release.id, period).catch(() => null);
  if (!edition) notFound();

  // The gate. Server-side, from the same authorization the export route uses —
  // the client never decides what it may see.
  const session = await getServerSession(authOptions);
  const access = await resolveResearchAccess(session?.user?.id);
  const hasFullAccess = access.ok;
  const researchAvailable = getResearchAvailability().available;

  // "Unchanged since" needs the previous edition's stored hash, which is what
  // the publication ledger is for.
  const priorKey = previousPeriod(release.cadence, period);
  const priorLog = priorKey ? await readReleaseLog(release.id, priorKey) : null;
  const unchangedSince =
    priorLog && priorLog.inputHash === edition.inputHash
      ? periodLabel(release.cadence, priorLog.period)
      : null;

  const latest = latestPeriod(release);
  const isLatest = period === latest;
  const prevPage = priorKey && isPublishedPeriod(release, priorKey) ? priorKey : null;
  const nextKey = nextPeriod(release.cadence, period);
  const nextPage = nextKey && isPublishedPeriod(release, nextKey) ? nextKey : null;
  const citation = citationFor(release, period, edition.asOf);

  return (
    <div className="min-h-screen pb-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <BreadcrumbSchema
          items={[
            { name: 'Home', href: '/' },
            { name: 'Releases', href: '/releases' },
            { name: release.shortTitle, href: `/releases/${release.id}` },
            { name: periodLabel(release.cadence, period) },
          ]}
        />

        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/releases" className="hover:text-white/80">
            Releases
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={`/releases/${release.id}`} className="hover:text-white/80">
            {release.shortTitle}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-400">{periodLabel(release.cadence, period)}</span>
        </nav>

        <p className="text-cyan-300 text-xs uppercase tracking-[0.14em] font-semibold mb-2">
          {release.cadence === 'monthly' ? 'Monthly' : 'Quarterly'} release &middot;{' '}
          {periodLabel(release.cadence, period)}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">{release.title}</h1>
        <p className="text-slate-400 leading-relaxed max-w-2xl">{release.summary}</p>

        <p className="text-sm text-slate-500 mt-4">
          Data as of <time dateTime={edition.asOf}>{edition.asOf}</time> &middot; computed{' '}
          <time dateTime={edition.computedAt}>{edition.computedAt.slice(0, 10)}</time>
          {isLatest && <span> &middot; current edition</span>}
        </p>

        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
          {prevPage ? (
            <Link href={release.href(prevPage)} className="text-cyan-300 hover:text-cyan-200">
              &larr; {periodLabel(release.cadence, prevPage)}
            </Link>
          ) : (
            <span className="text-slate-500">No earlier edition &mdash; this is the first.</span>
          )}
          {nextPage && (
            <Link href={release.href(nextPage)} className="text-cyan-300 hover:text-cyan-200">
              {periodLabel(release.cadence, nextPage)} &rarr;
            </Link>
          )}
          <Link href={`/releases/${release.id}`} className="text-slate-400 hover:text-white">
            All editions
          </Link>
        </div>

        <ReleaseEditionView
          release={release}
          edition={edition}
          hasFullAccess={hasFullAccess}
          researchAvailable={researchAvailable}
          unchangedSince={unchangedSince}
          retrospective={isRetrospectiveEdition(release, period)}
        />

        <section className="mt-14" aria-labelledby="cite-heading">
          <h2 id="cite-heading" className="text-xl font-bold text-white mb-3">
            Cite this edition
          </h2>
          <div className="card p-5 border border-white/10">
            <CiteEmbed
              title={`${release.title}, ${periodLabel(release.cadence, period)}`}
              pageUrl={`${BASE}${release.href(period)}`}
              sourceLine={citation}
            />
          </div>
        </section>

        <div className="mt-10 card p-5 border border-white/10">
          <DeskByline />
        </div>
      </div>
    </div>
  );
}
