import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import DeskByline from '@/components/desk/DeskByline';
import {
  getRelease,
  isRetrospectiveEdition,
  latestPeriod,
  periodLabel,
  publishedPeriods,
  RELEASE_STATUS_LABEL,
} from '@/lib/research-releases';
import { listReleaseLog, releaseState } from '@/lib/research-release-log';

// The archive for one franchise: every edition, oldest to newest, plus where
// the next one stands. force-dynamic because "latest edition" and the overdue
// state both roll forward on the calendar without a deploy.
export const dynamic = 'force-dynamic';

const BASE = 'https://spacenexus.us';

interface PageProps {
  params: Promise<{ series: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { series } = await props.params;
  const release = getRelease(series);
  if (!release) return { title: 'Report not found' };

  const title = `${release.title} — every edition`;
  const description = `${release.summary} Published ${release.cadence}, every edition dated and permanently linkable, each with its methodology and coverage limits.`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/releases/${release.id}` },
    openGraph: { title, description, type: 'website', url: `${BASE}/releases/${release.id}` },
  };
}

export default async function ReleaseArchivePage(props: PageProps) {
  const { series } = await props.params;
  const release = getRelease(series);
  if (!release) notFound();

  // The Hiring Index and the Space Score Top 25 live on their own long-standing
  // public pages. Sending the reader there rather than building a second view
  // of the same data is how two surfaces stay unable to disagree.
  if (release.surface !== 'series') {
    redirect(release.href(latestPeriod(release)));
  }

  const periods = publishedPeriods(release).slice().reverse();
  const [state, log] = await Promise.all([releaseState(release), listReleaseLog(release.id, 48)]);
  const logByPeriod = new Map(log.map((r) => [r.period, r]));

  return (
    <div className="min-h-screen pb-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <BreadcrumbSchema
          items={[
            { name: 'Home', href: '/' },
            { name: 'Releases', href: '/releases' },
            { name: release.shortTitle },
          ]}
        />

        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/releases" className="hover:text-white/80">
            Releases
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-400">{release.shortTitle}</span>
        </nav>

        <p className="text-cyan-300 text-xs uppercase tracking-[0.14em] font-semibold mb-2">
          {release.cadence === 'monthly' ? 'Monthly' : 'Quarterly'} release
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{release.title}</h1>
        <p className="text-slate-400 leading-relaxed max-w-2xl">{release.summary}</p>

        <section className="mt-8" aria-labelledby="computes">
          <h2 id="computes" className="text-sm uppercase tracking-[0.12em] text-slate-400 font-semibold mb-3">
            What every edition computes
          </h2>
          <ul className="space-y-2 max-w-2xl">
            {release.computes.map((c) => (
              <li key={c} className="text-sm text-slate-300 leading-relaxed flex gap-2">
                <span aria-hidden="true" className="text-slate-600">
                  &bull;
                </span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* The release's own punctuality, in public. A franchise that quietly
            stops publishing is worse than one that never started. */}
        <div
          className={`mt-8 rounded-xl border p-4 ${
            state.status === 'overdue'
              ? 'border-amber-400/40 bg-amber-400/[0.07]'
              : 'border-white/10 bg-white/[0.03]'
          }`}
        >
          <p className="text-sm font-medium text-white mb-1">
            {RELEASE_STATUS_LABEL[state.status]}
            {state.status === 'overdue' && ` — ${state.daysLate} day${state.daysLate === 1 ? '' : 's'} late`}
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            {state.status === 'published' &&
              `The ${state.periodLabel} edition was published on ${state.publishedAt!.toISOString().slice(0, 10)}. The next edition, ${periodLabel(release.cadence, state.nextPeriod)}, is due ${state.nextDueAt.toISOString().slice(0, 10)}.`}
            {state.status === 'awaiting-period-end' &&
              `The ${state.periodLabel} edition is due ${state.dueAt.toISOString().slice(0, 10)}, ${release.graceDays} days after the period closes.`}
            {state.status === 'due' &&
              `The ${state.periodLabel} edition came due on ${state.dueAt.toISOString().slice(0, 10)} and has not been recorded yet.`}
            {state.status === 'overdue' &&
              `The ${state.periodLabel} edition was due on ${state.dueAt.toISOString().slice(0, 10)} and has not been recorded. We would rather say so here than let a missed edition pass unnoticed.`}
          </p>
        </div>

        <section className="mt-10" aria-labelledby="editions">
          <h2 id="editions" className="text-xl font-bold text-white mb-4">
            Every edition
          </h2>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full border-collapse text-sm">
              <caption className="sr-only">
                Published editions of {release.title}, most recent first.
              </caption>
              <thead>
                <tr className="text-left text-slate-400 bg-white/[0.03]">
                  <th scope="col" className="py-2.5 px-3 font-medium">
                    Edition
                  </th>
                  <th scope="col" className="py-2.5 px-3 font-medium">
                    Published
                  </th>
                  <th scope="col" className="py-2.5 px-3 font-medium text-right">
                    Rows
                  </th>
                  <th scope="col" className="py-2.5 px-3 font-medium">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => {
                  const row = logByPeriod.get(p);
                  const retro = isRetrospectiveEdition(release, p);
                  return (
                    <tr key={p} className="border-t border-white/[0.07]">
                      <th scope="row" className="py-2.5 px-3 text-left font-normal">
                        <Link href={release.href(p)} className="text-white hover:text-cyan-300">
                          {periodLabel(release.cadence, p)}
                        </Link>
                      </th>
                      <td className="py-2.5 px-3 text-slate-400">
                        {row ? row.publishedAt.toISOString().slice(0, 10) : 'Not recorded'}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-300">
                        {row ? row.rowCount.toLocaleString('en-US') : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {row?.empty
                          ? 'Nothing recorded'
                          : row?.unchanged
                            ? 'Unchanged from the edition before'
                            : retro
                              ? 'Back-computed'
                              : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3 max-w-3xl leading-relaxed">
            Editions before {release.firstScheduledPeriod} are back-computed from the same tables: the data
            is real, but they were not published at the time and the pages say so. &quot;Not recorded&quot;
            means the publication ledger holds no row for that edition; the page still computes.
          </p>
        </section>

        <div className="mt-10 card p-5 border border-white/10">
          <DeskByline />
        </div>
      </div>
    </div>
  );
}
