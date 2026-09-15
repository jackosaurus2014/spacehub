import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import DeskByline from '@/components/desk/DeskByline';
import {
  chartWeekKey,
  chartWeekLabel,
  listChartWeekEditions,
  missingChartWeeks,
  EARLIEST_CHART_WEEK,
  PUBLICATION_TIME_UTC,
  PUBLICATION_WEEKDAY_LABEL,
} from '@/lib/chart-week';

// The Chart of the Week archive. force-dynamic: the current week rolls forward
// on the calendar and the gap list is computed against "now".
export const dynamic = 'force-dynamic';

const BASE = 'https://spacenexus.us';
const TITLE = 'Chart of the Week';
const DESCRIPTION =
  'One chart a week from SpaceNexus data, published every Wednesday, each with a permanent URL, a factual caption computed from the numbers, and the numbers themselves in a table.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}/chart/week` },
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'website', url: `${BASE}/chart/week` },
};

export default async function ChartWeekArchivePage() {
  const editions = await listChartWeekEditions(60);
  const thisWeek = chartWeekKey();
  const gaps = missingChartWeeks(
    editions.map((e) => e.weekKey),
    new Date()
  );
  const latest = editions[0] ?? null;

  return (
    <div className="min-h-screen pb-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <BreadcrumbSchema
          items={[
            { name: 'Home', href: '/' },
            { name: 'Charts', href: '/chart' },
            { name: 'Chart of the Week' },
          ]}
        />

        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/chart" className="hover:text-white/80">
            Charts
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-400">Chart of the Week</span>
        </nav>

        <p className="text-cyan-300 text-xs uppercase tracking-[0.14em] font-semibold mb-2">
          Every {PUBLICATION_WEEKDAY_LABEL}, {PUBLICATION_TIME_UTC}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{TITLE}</h1>
        <p className="text-slate-400 leading-relaxed max-w-2xl">
          One chart a week, drawn from the site&rsquo;s own trackers and then frozen. The caption states what
          the chart shows &mdash; it is arithmetic over the series, not commentary &mdash; and every edition
          keeps a permanent URL whose numbers do not move afterwards.
        </p>

        {latest && (
          <section className="mt-8" aria-labelledby="latest-week">
            <h2 id="latest-week" className="sr-only">
              This week&rsquo;s chart
            </h2>
            <Link
              href={`/chart/week/${latest.weekKey}`}
              className="card overflow-hidden block hover:border-cyan-500/30 transition-colors group"
            >
              <img
                src={`/api/chart/week/${latest.weekKey}?format=svg`}
                alt={`${latest.title}. ${latest.caption}`}
                width={1200}
                height={630}
                className="w-full h-auto block"
              />
              <div className="p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors">
                    {latest.title}
                  </h3>
                  <span className="text-[11px] uppercase tracking-wider text-cyan-300 border border-cyan-500/30 rounded px-1.5 py-0.5">
                    {latest.weekKey === thisWeek ? 'This week' : 'Most recent'}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">{latest.caption}</p>
              </div>
            </Link>
          </section>
        )}

        {gaps.length > 0 && (
          <div className="mt-8 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4">
            <p className="text-sm text-amber-100 font-medium mb-1">
              {gaps.length} week{gaps.length === 1 ? '' : 's'} without an edition
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              {gaps.slice(0, 8).join(', ')}
              {gaps.length > 8 ? ', …' : ''}. A missed week is left missing rather than backfilled with
              today&rsquo;s numbers &mdash; the point of the permalink is that it shows what was published at
              the time.
            </p>
          </div>
        )}

        <section className="mt-12" aria-labelledby="archive">
          <h2 id="archive" className="text-xl font-bold text-white mb-4">
            Archive
          </h2>
          {editions.length === 0 ? (
            <p className="text-sm text-slate-400 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              No editions have been published yet. The first is due on the next{' '}
              {PUBLICATION_WEEKDAY_LABEL} at {PUBLICATION_TIME_UTC}, starting with {EARLIEST_CHART_WEEK}.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-full border-collapse text-sm">
                <caption className="sr-only">
                  Published Chart of the Week editions, most recent first.
                </caption>
                <thead>
                  <tr className="text-left text-slate-400 bg-white/[0.03]">
                    <th scope="col" className="py-2.5 px-3 font-medium">
                      Week
                    </th>
                    <th scope="col" className="py-2.5 px-3 font-medium">
                      Chart
                    </th>
                    <th scope="col" className="py-2.5 px-3 font-medium">
                      Covering
                    </th>
                    <th scope="col" className="py-2.5 px-3 font-medium text-right">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {editions.map((e) => (
                    <tr key={e.weekKey} className="border-t border-white/[0.07]">
                      <th scope="row" className="py-2.5 px-3 text-left font-normal">
                        <Link href={`/chart/week/${e.weekKey}`} className="text-white hover:text-cyan-300">
                          {e.weekKey}
                        </Link>
                      </th>
                      <td className="py-2.5 px-3 text-slate-300">{e.title}</td>
                      <td className="py-2.5 px-3 text-slate-400">{chartWeekLabel(e.weekKey)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-300">{e.pointCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="text-sm text-slate-500 mt-6 max-w-2xl leading-relaxed">
          Looking for the live versions that move with the data?{' '}
          <Link href="/chart" className="text-cyan-300 hover:text-cyan-200">
            Every chart
          </Link>{' '}
          redraws on every load. The dated releases built from the same data are on{' '}
          <Link href="/releases" className="text-cyan-300 hover:text-cyan-200">
            the release calendar
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
