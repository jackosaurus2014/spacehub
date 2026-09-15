import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import ChartFrame from '@/components/ui/ChartFrame';
import CiteEmbed from '@/components/CiteEmbed';
import DeskByline from '@/components/desk/DeskByline';
import {
  getChartWeekEdition,
  listChartWeekEditions,
  previousChartWeek,
  chartWeekLabel,
  isChartWeekKey,
  EARLIEST_CHART_WEEK,
} from '@/lib/chart-week';
import { formatValue } from '@/lib/charts/render';
import type { ChartDef } from '@/lib/charts/registry';

// The permanent home of one week's chart.
//
// It renders the PINNED series out of the database, not live data. That is the
// whole difference between this page and /chart/[slug]: a reader who comes back
// in six months sees exactly what was published that week.
export const dynamic = 'force-dynamic';

const BASE = 'https://spacenexus.us';

interface PageProps {
  params: Promise<{ week: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { week } = await props.params;
  if (!isChartWeekKey(week)) return { title: 'Chart of the Week' };
  const edition = await getChartWeekEdition(week);
  if (!edition) return { title: `Chart of the Week — ${week}` };

  const title = `${edition.title} — Chart of the Week, ${week}`;
  const description = edition.caption;
  const og = `/api/chart/week/${week}`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/chart/week/${week}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${BASE}/chart/week/${week}`,
      images: [{ url: og, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [og] },
  };
}

export default async function ChartWeekPage(props: PageProps) {
  const { week } = await props.params;
  if (!isChartWeekKey(week) || week < EARLIEST_CHART_WEEK) notFound();

  const edition = await getChartWeekEdition(week);
  if (!edition) notFound();

  const all = await listChartWeekEditions(60);
  const index = all.findIndex((e) => e.weekKey === week);
  const newer = index > 0 ? all[index - 1] : null;
  const older = index >= 0 && index < all.length - 1 ? all[index + 1] : null;
  const prevKey = previousChartWeek(week);

  const total = edition.values.reduce((a, b) => a + b, 0);
  const unit = edition.unit as ChartDef['unit'];

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <BreadcrumbSchema
          items={[
            { name: 'Home', href: '/' },
            { name: 'Charts', href: '/chart' },
            { name: 'Chart of the Week', href: '/chart/week' },
            { name: week },
          ]}
        />

        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/chart" className="hover:text-white/80">
            Charts
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/chart/week" className="hover:text-white/80">
            Chart of the Week
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-400">{week}</span>
        </nav>

        <p className="text-cyan-300 text-xs uppercase tracking-[0.14em] font-semibold mb-2">
          Chart of the Week &middot; {week}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{edition.title}</h1>
        <p className="text-lg text-white/80">{edition.subtitle}</p>
        <p className="text-sm text-slate-500 mt-3">
          Week of {chartWeekLabel(week)} &middot; published{' '}
          <time dateTime={edition.publishedAt}>{edition.publishedAt.slice(0, 10)}</time>
        </p>

        <div className="mt-8">
          <ChartFrame
            title={edition.title}
            deck={edition.subtitle}
            slug={edition.slug}
            source={edition.source}
            asOf={edition.publishedAt}
            tableId="chart-week-data"
          >
            {/* Plain img on purpose: the endpoint renders the frozen series at
                1200×630 and is not a next/image-optimisable asset. */}
            <img
              src={`/api/chart/week/${week}?format=svg`}
              alt={`${edition.title}. ${edition.caption}`}
              width={1200}
              height={630}
              className="w-full h-auto block"
            />
          </ChartFrame>
        </div>

        {/* The caption. Computed from the series, never written. */}
        <p className="mt-5 text-[15px] text-slate-200 leading-relaxed max-w-3xl">{edition.caption}</p>
        <p className="mt-2 text-xs text-slate-500 max-w-3xl leading-relaxed">
          This caption is generated from the numbers in the chart — totals, the latest point, the highest and
          lowest, and the leader&rsquo;s share. It describes the data and nothing more. The series below was
          frozen on the day of publication and does not change.
        </p>

        {/* The accessible alternative to the image. Not optional. */}
        <section className="mt-10" aria-labelledby="chart-week-data-heading">
          <h2 id="chart-week-data-heading" className="text-xl font-bold text-white mb-3">
            The numbers behind the chart
          </h2>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table id="chart-week-data" className="min-w-full border-collapse text-sm">
              <caption className="sr-only">
                {edition.title}: {edition.subtitle}. {edition.values.length} data points as published in week{' '}
                {week}.
              </caption>
              <thead>
                <tr className="text-left text-slate-400 bg-white/[0.03]">
                  <th scope="col" className="py-2.5 px-3 font-medium">
                    Period
                  </th>
                  <th scope="col" className="py-2.5 px-3 font-medium text-right">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {edition.labels.map((label, i) => (
                  <tr key={`${label}-${i}`} className="border-t border-white/[0.07]">
                    <th scope="row" className="py-2.5 px-3 text-left font-normal text-slate-300">
                      {label}
                    </th>
                    <td className="py-2.5 px-3 text-right tabular-nums text-white">
                      {formatValue(edition.values[i] ?? 0, unit)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/20">
                  <th scope="row" className="py-2.5 px-3 text-left font-medium text-slate-300">
                    Total
                  </th>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white font-semibold">
                    {formatValue(total, unit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {edition.note && <p className="text-xs text-slate-500 mt-3">Note: {edition.note}.</p>}
          <p className="text-xs text-slate-500 mt-2">
            Source: {edition.source}. Live version of this chart:{' '}
            <Link href={`/chart/${edition.slug}`} className="text-cyan-300 hover:text-cyan-200">
              /chart/{edition.slug}
            </Link>{' '}
            &mdash; that page moves with the data; this one does not.
          </p>
        </section>

        <div className="flex flex-wrap items-center gap-4 mt-10 text-sm">
          {older ? (
            <Link href={`/chart/week/${older.weekKey}`} className="text-cyan-300 hover:text-cyan-200">
              &larr; {older.weekKey}
            </Link>
          ) : (
            <span className="text-slate-500">
              {prevKey && prevKey >= EARLIEST_CHART_WEEK
                ? `No edition was published for ${prevKey}.`
                : 'No earlier edition — this is the first.'}
            </span>
          )}
          {newer && (
            <Link href={`/chart/week/${newer.weekKey}`} className="text-cyan-300 hover:text-cyan-200">
              {newer.weekKey} &rarr;
            </Link>
          )}
          <Link href="/chart/week" className="text-slate-400 hover:text-white">
            Every week
          </Link>
        </div>

        <section className="mt-12">
          <div className="card p-5 border border-white/10">
            <CiteEmbed
              title={`${edition.title} — Chart of the Week ${week}`}
              pageUrl={`${BASE}/chart/week/${week}`}
              sourceLine={`${edition.title}, SpaceNexus Chart of the Week ${week}. Source: ${edition.source}. ${BASE}/chart/week/${week}`}
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
