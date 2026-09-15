import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import ItemListSchema from '@/components/seo/ItemListSchema';
import DeskByline from '@/components/desk/DeskByline';
import ReleaseCalendarTable from '@/components/reports/ReleaseCalendarTable';
import {
  RESEARCH_RELEASES,
  latestPeriod,
  periodLabel,
} from '@/lib/research-releases';
import { releaseCalendarState } from '@/lib/research-release-log';
import {
  latestChartWeekEdition,
  PUBLICATION_TIME_UTC,
  PUBLICATION_WEEKDAY_LABEL,
} from '@/lib/chart-week';

// The recurring-release hub.
//
// PUBLIC, and public on purpose. These are citable, dated releases; a ranking
// nobody can see wins us nothing. The full row set and the export behind each
// edition are the Research capability — the summary, the method and the
// coverage limits are not. Nothing here advertises the paid tier when
// RESEARCH_TIER_ENABLED is off, because nothing here mentions it at all.
//
// force-dynamic: latest editions and overdue state roll forward on the
// calendar without a deploy, and the Railway build container has no database.
export const dynamic = 'force-dynamic';

const BASE = 'https://spacenexus.us';
const TITLE = 'SpaceNexus Recurring Releases';
const DESCRIPTION =
  'Named, dated releases on a fixed calendar — the Most Active Space Investors, the Launch Cadence and Slip Report, Supply-Chain Concentration, the Hiring Index and the Space Score Top 25 — every figure computed from SpaceNexus data, with the method and the coverage limits stated in full.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}/releases` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    url: `${BASE}/releases`,
    images: [
      {
        url: '/api/og?title=SpaceNexus+Recurring+Releases&subtitle=Named%2C+dated%2C+computed+from+our+own+data&type=data',
        width: 1200,
        height: 630,
        alt: TITLE,
      },
    ],
  },
};

export default async function ReleasesHubPage() {
  const [calendar, weekChart] = await Promise.all([
    releaseCalendarState(),
    latestChartWeekEdition(),
  ]);
  const overdue = calendar.filter((s) => s.status === 'overdue');

  return (
    <div className="min-h-screen pb-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Releases' }]} />
        <ItemListSchema
          name={TITLE}
          description={DESCRIPTION}
          url="/releases"
          items={RESEARCH_RELEASES.map((r) => ({
            name: r.title,
            url: r.href(latestPeriod(r)),
            description: r.summary,
          }))}
        />

        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-400">Releases</span>
        </nav>

        <p className="text-cyan-300 text-xs uppercase tracking-[0.14em] font-semibold mb-2">
          On a fixed calendar
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{TITLE}</h1>
        <p className="text-slate-400 leading-relaxed max-w-2xl">
          Every release here is <strong className="text-slate-200">computed, not written</strong>. Each
          figure is a count, a sum, a delta, a ranking or a ratio over rows in our own database, with the
          method stated and the coverage limits printed beside the numbers. Prose exists only to label what
          was computed. No model is called anywhere in this pipeline.
        </p>

        {overdue.length > 0 && (
          <div className="mt-8 rounded-xl border border-amber-400/40 bg-amber-400/[0.07] p-4">
            <p className="text-sm text-amber-100 font-medium mb-1">
              {overdue.length} release{overdue.length === 1 ? ' is' : 's are'} overdue
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              {overdue
                .map((s) => `${s.release.shortTitle} (${s.periodLabel}, ${s.daysLate}d)`)
                .join('; ')}
              . A release that quietly stops publishing is worse than one that never started, so a missed
              edition is shown here rather than left to be noticed by a reader.
            </p>
          </div>
        )}

        <section className="mt-10" aria-labelledby="calendar">
          <h2 id="calendar" className="text-xl font-bold text-white mb-4">
            The calendar
          </h2>
          <ReleaseCalendarTable calendar={calendar} />
        </section>

        <section className="mt-12" aria-labelledby="franchises">
          <h2 id="franchises" className="text-xl font-bold text-white mb-4">
            What each release computes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {RESEARCH_RELEASES.map((r) => {
              const period = latestPeriod(r);
              return (
                <article key={r.id} className="card p-5">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-cyan-300 font-semibold mb-1.5">
                    {r.cadence}
                  </p>
                  <h3 className="text-lg font-bold text-white mb-2">
                    <Link href={r.href(period)} className="hover:text-cyan-200">
                      {r.title}
                    </Link>
                  </h3>
                  <ul className="space-y-1.5 mb-4">
                    {r.computes.map((c) => (
                      <li key={c} className="text-sm text-slate-400 leading-relaxed flex gap-2">
                        <span aria-hidden="true" className="text-slate-600">
                          &bull;
                        </span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <Link href={r.href(period)} className="text-cyan-300 hover:text-cyan-200">
                      {periodLabel(r.cadence, period)} edition
                    </Link>
                    {r.surface === 'series' && (
                      <Link href={`/releases/${r.id}`} className="text-slate-400 hover:text-white">
                        All editions
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="weekly">
          <h2 id="weekly" className="text-xl font-bold text-white mb-1">
            Chart of the Week
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Every {PUBLICATION_WEEKDAY_LABEL} at {PUBLICATION_TIME_UTC}. One chart, frozen on publication,
            with a caption computed from the numbers and a permanent URL.
          </p>
          <div className="card p-5">
            {weekChart ? (
              <>
                <h3 className="text-white font-semibold mb-1">
                  <Link href={`/chart/week/${weekChart.weekKey}`} className="hover:text-cyan-200">
                    {weekChart.title}
                  </Link>{' '}
                  <span className="text-slate-500 font-normal">&middot; {weekChart.weekKey}</span>
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">{weekChart.caption}</p>
              </>
            ) : (
              <p className="text-sm text-slate-400 leading-relaxed">
                No edition has been pinned yet. The archive is at{' '}
                <Link href="/chart/week" className="text-cyan-300 hover:text-cyan-200">
                  /chart/week
                </Link>
                .
              </p>
            )}
            <p className="mt-3 text-sm">
              <Link href="/chart/week" className="text-cyan-300 hover:text-cyan-200">
                Every week
              </Link>
            </p>
          </div>
        </section>

        <section className="mt-12" aria-labelledby="how">
          <h2 id="how" className="text-xl font-bold text-white mb-3">
            How to read these
          </h2>
          <ul className="space-y-3 max-w-3xl">
            {[
              'Every edition carries an "as of" date — the date its figures describe, not the date it was run.',
              'Every edition carries a methodology block and a coverage block. The coverage block is the honest one: it says what the release cannot see, and it travels with every export of the numbers.',
              'A release never publishes a period that has not finished. The one exception, the Space Score Top 25, runs live through its quarter and says so.',
              'An edition whose numbers are identical to the one before it says so, rather than presenting unchanged figures as movement.',
              'Editions computed after the fact, before the release began publishing on a calendar, are labelled as back-computed.',
              'The summary, the method and the coverage limits are public on every edition, and the top of every table is quotable. The complete row set behind a table, with every column, is not published here.',
            ].map((line) => (
              <li key={line} className="text-sm text-slate-400 leading-relaxed flex gap-2">
                <span aria-hidden="true" className="text-slate-600">
                  &bull;
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-sm text-slate-500 mt-8 max-w-2xl leading-relaxed">
          Longer-form written reports and every weekly brief live on{' '}
          <Link href="/reports" className="text-cyan-300 hover:text-cyan-200">
            the reports page
          </Link>
          .
        </p>

        <div className="mt-10 card p-5 border border-white/10">
          <DeskByline />
        </div>
      </div>
    </div>
  );
}
