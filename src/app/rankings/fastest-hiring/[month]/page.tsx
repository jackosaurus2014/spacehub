import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import ItemListSchema from '@/components/seo/ItemListSchema';
import RankMovement from '@/components/rankings/RankMovement';
import DeskByline from '@/components/desk/DeskByline';
import { coverageChangesInWindow } from '@/lib/hiring-coverage';
import { getFastestHiringEdition } from '@/lib/rankings-data';
import {
  parseMonthParam,
  monthLabelOf,
  latestEditionMonthKey,
  EARLIEST_INDEX_MONTH,
} from '@/lib/hiring-index';
import { previousMonthKey, FASTEST_HIRING_METHODOLOGY } from '@/lib/rankings';

// Fastest-hiring companies — one monthly edition (competitor review Tier 2 #9).
// ISR for the same reason as the quarterly table; real-404 via middleware's
// SLUG_EXISTENCE_CHECKS and /api/rankings/fastest-hiring/[month]/exists.
export const revalidate = 3600;

const BASE = 'https://spacenexus.us';
const TITLE_BASE = 'Fastest-Hiring Space Companies';

export async function generateMetadata(props: { params: Promise<{ month: string }> }): Promise<Metadata> {
  const { month } = await props.params;
  const parsed = parseMonthParam(month);
  if (!parsed) return { title: TITLE_BASE };
  const label = monthLabelOf(parsed.year, parsed.month);

  let leader = '';
  try {
    const edition = await getFastestHiringEdition(month);
    const top = edition?.rows[0];
    if (top) leader = `${top.entry.name} added ${top.entry.change.toLocaleString('en-US')} roles`;
  } catch {
    // DB unreachable — fall back to the number-free description.
  }

  const title = `${TITLE_BASE} — ${label}`;
  const description = leader
    ? `Which space companies grew their open-role count fastest in ${label}. ${leader}. Ranked from SpaceNexus daily applicant-tracking-system snapshots, with the methodology stated in full.`
    : `Which space companies grew their open-role count fastest in ${label}, ranked from SpaceNexus daily applicant-tracking-system snapshots.`;
  const og = `/api/og?title=${encodeURIComponent(TITLE_BASE)}&subtitle=${encodeURIComponent(
    `${label}${leader ? ` · ${leader}` : ''}`,
  )}&type=data`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE}/rankings/fastest-hiring/${month}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${BASE}/rankings/fastest-hiring/${month}`,
      images: [{ url: og, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [og] },
  };
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function pct(v: number | null): string {
  if (v == null) return '—';
  const rounded = Math.round(v);
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

export default async function FastestHiringPage(props: { params: Promise<{ month: string }> }) {
  const { month } = await props.params;
  const parsed = parseMonthParam(month);
  if (!parsed) notFound();
  if (month < EARLIEST_INDEX_MONTH || month > latestEditionMonthKey()) notFound();

  const edition = await getFastestHiringEdition(month);
  if (!edition) notFound();

  const prevKey = previousMonthKey(month);
  const hasPrevPage = !!prevKey && prevKey >= EARLIEST_INDEX_MONTH;
  const latest = latestEditionMonthKey();
  const isLatest = month === latest;
  const latestParsed = parseMonthParam(latest);

  const coverage = coverageChangesInWindow(
    new Date(Date.UTC(parsed.year, parsed.month - 1, 1)),
    new Date(Date.UTC(parsed.year, parsed.month, 1)),
  );

  return (
    <div className="min-h-screen pb-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <BreadcrumbSchema
          items={[
            { name: 'Home', href: '/' },
            { name: 'Rankings', href: '/rankings' },
            { name: TITLE_BASE, href: '/rankings/fastest-hiring' },
            { name: edition.monthLabel },
          ]}
        />
        <ItemListSchema
          name={`${TITLE_BASE} — ${edition.monthLabel}`}
          description={`Space companies ranked by net open roles added during ${edition.monthLabel}.`}
          url={`/rankings/fastest-hiring/${month}`}
          items={edition.rows.map((r) => ({
            name: r.entry.name,
            url: r.entry.slug ? `/company-profiles/${r.entry.slug}` : `/rankings/fastest-hiring/${month}`,
            description: `${r.entry.change > 0 ? '+' : ''}${fmt(r.entry.change)} open roles in ${edition.monthLabel}`,
          }))}
        />

        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/rankings" className="hover:text-white/80">Rankings</Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-400">{TITLE_BASE}</span>
        </nav>

        <p className="text-cyan-300 text-xs uppercase tracking-[0.14em] font-semibold mb-2">
          Monthly ranking · {edition.monthLabel}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">{TITLE_BASE}</h1>
        <p className="text-slate-400 leading-relaxed max-w-2xl">
          Ranked by net open roles added between a company&rsquo;s first and last job-board snapshot inside{' '}
          {edition.monthLabel}. Hiring is the least-gameable public signal a private space company emits:
          job counts move before press releases do.
          {edition.activeAtMonthEnd != null && (
            <>
              {' '}
              Site-wide, {fmt(edition.activeAtMonthEnd)} roles were open at month end.
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-3 mt-5 text-sm">
          {hasPrevPage ? (
            <Link href={`/rankings/fastest-hiring/${prevKey}`} className="text-cyan-300 hover:text-cyan-200">
              &larr; Previous edition
            </Link>
          ) : (
            <span className="text-slate-500">No earlier edition &mdash; this is the first.</span>
          )}
          {!isLatest && latestParsed && (
            <Link href={`/rankings/fastest-hiring/${latest}`} className="text-cyan-300 hover:text-cyan-200">
              Latest edition ({monthLabelOf(latestParsed.year, latestParsed.month)}) &rarr;
            </Link>
          )}
          <Link href={`/hiring-index/${month}`} className="text-slate-400 hover:text-white">
            Full Hiring Index for this month
          </Link>
        </div>

        {!edition.hasPrevious && (
          <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4">
            <p className="text-sm text-amber-100 font-medium mb-1">First edition &mdash; no movement to report</p>
            <p className="text-sm text-slate-300 leading-relaxed">
              There is no published edition for the previous month, so the movement column is empty for every
              row. We would rather show nothing than draw arrows against a table that does not exist.
            </p>
          </div>
        )}

        {coverage.map((c) => (
          <div key={c.date} className="mt-4 rounded-xl border border-orange-400/30 bg-orange-400/[0.06] p-4">
            <p className="text-sm text-orange-100 font-medium mb-1">Coverage change inside this month</p>
            <p className="text-sm text-slate-300 leading-relaxed">{c.note}</p>
          </div>
        ))}

        {edition.rows.length === 0 ? (
          <div className="card p-6 mt-8">
            <p className="text-white font-medium">No company qualified in {edition.monthLabel}.</p>
            <p className="text-sm text-slate-400 mt-1">
              A company needs at least five open roles at month end and at least two snapshots inside the
              month to be ranked. See the methodology below.
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <caption className="sr-only">
                Fastest-hiring space companies in {edition.monthLabel}
              </caption>
              <thead>
                <tr className="text-left text-slate-400">
                  <th scope="col" className="py-2 pr-3 font-medium">#</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Company</th>
                  <th scope="col" className="py-2 pr-3 font-medium text-right">Net added</th>
                  <th scope="col" className="py-2 pr-3 font-medium text-right">Growth</th>
                  <th scope="col" className="py-2 pr-3 font-medium text-right">Open roles</th>
                  <th scope="col" className="py-2 font-medium">
                    {edition.hasPrevious ? 'vs last month' : 'Movement'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {edition.rows.map((r) => (
                  <tr key={`${r.rank}-${r.entry.name}`} className="border-t border-white/[0.07]">
                    <td className="py-2.5 pr-3 text-slate-500 tabular-nums">{r.rank}</td>
                    <td className="py-2.5 pr-3">
                      {r.entry.slug ? (
                        <Link href={`/company-profiles/${r.entry.slug}`} className="text-white hover:text-cyan-300">
                          {r.entry.name}
                        </Link>
                      ) : (
                        <span className="text-white">{r.entry.name}</span>
                      )}
                      <span className="block text-xs text-slate-500">
                        {r.entry.firstDate} &rarr; {r.entry.lastDate}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right text-emerald-300 tabular-nums">
                      +{fmt(r.entry.change)}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-slate-300 tabular-nums">
                      {pct(r.entry.percentChange)}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-white tabular-nums">{fmt(r.entry.last)}</td>
                    <td className="py-2.5">
                      <RankMovement delta={r} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <section className="mt-12" id="methodology">
          <h2 className="text-xl font-bold text-white mb-3">Methodology</h2>
          <ul className="space-y-3">
            {FASTEST_HIRING_METHODOLOGY.map((m) => (
              <li key={m} className="text-sm text-slate-400 leading-relaxed flex gap-2">
                <span aria-hidden="true" className="text-slate-600">&bull;</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-4">
            Edition generated {edition.generatedAt.slice(0, 10)}. The underlying series is published in full
            on the{' '}
            <Link href={`/hiring-index/${month}`} className="text-cyan-300 hover:text-cyan-200">
              Monthly Hiring Index
            </Link>{' '}
            and{' '}
            <Link href="/hiring-trends" className="text-cyan-300 hover:text-cyan-200">
              hiring trends
            </Link>
            .
          </p>
        </section>

        <div className="mt-10 card p-5 border border-white/10">
          <DeskByline />
        </div>
      </div>
    </div>
  );
}
