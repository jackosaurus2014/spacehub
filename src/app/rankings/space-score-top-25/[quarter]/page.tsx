import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import ItemListSchema from '@/components/seo/ItemListSchema';
import RankMovement from '@/components/rankings/RankMovement';
import DeskByline from '@/components/desk/DeskByline';
import { getSpaceScoreEdition, SPACE_SCORE_TOP_N } from '@/lib/rankings-data';
import {
  parseQuarterParam,
  previousQuarterKey,
  quarterLabel,
  quarterShortLabel,
  quarterOf,
  latestSpaceScoreQuarter,
  EARLIEST_SPACE_SCORE_QUARTER,
  SPACE_SCORE_TOP_25_METHODOLOGY,
} from '@/lib/rankings';

// Space Score Top 25 — one quarterly edition (competitor review Tier 2 #9).
//
// ISR, not force-dynamic: no generateStaticParams, so nothing is prerendered
// in the DB-less Railway build container; each quarter renders on first
// request and is cached for an hour. The real-404 for unknown quarters comes
// from middleware's SLUG_EXISTENCE_CHECKS via
// /api/rankings/space-score-top-25/[quarter]/exists.
export const revalidate = 3600;

const BASE = 'https://spacenexus.us';

function ogFor(editionKey: string, headline: string): string {
  return `/api/og?title=${encodeURIComponent(`Space Score Top ${SPACE_SCORE_TOP_N}`)}&subtitle=${encodeURIComponent(
    `${quarterShortLabel(editionKey)} · ${headline}`,
  )}&type=data`;
}

export async function generateMetadata(props: { params: Promise<{ quarter: string }> }): Promise<Metadata> {
  const { quarter } = await props.params;
  const parsed = parseQuarterParam(quarter);
  if (!parsed) return { title: `Space Score Top ${SPACE_SCORE_TOP_N}` };

  let leader = '';
  try {
    const edition = await getSpaceScoreEdition(parsed.key);
    leader = edition?.rows[0] ? `${edition.rows[0].entry.name} leads` : '';
  } catch {
    // DB unreachable — fall back to the number-free description.
  }

  const title = `Space Score Top ${SPACE_SCORE_TOP_N} — ${quarterShortLabel(parsed.key)}`;
  const description = leader
    ? `The 25 highest-rated space companies for ${quarterShortLabel(parsed.key)} on the SpaceNexus Space Score, a 0–1000 composite across innovation, financial health, market position, operational capacity and growth. ${leader}. Methodology and previous editions included.`
    : `The 25 highest-rated space companies for ${quarterShortLabel(parsed.key)} on the SpaceNexus Space Score — a 0–1000 composite across five dimensions, with the methodology stated in full.`;
  const og = ogFor(parsed.key, leader || 'Quarterly ranking');

  return {
    title,
    description,
    alternates: { canonical: `${BASE}/rankings/space-score-top-25/${parsed.key}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${BASE}/rankings/space-score-top-25/${parsed.key}`,
      images: [{ url: og, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [og] },
  };
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

export default async function SpaceScoreTop25Page(props: { params: Promise<{ quarter: string }> }) {
  const { quarter } = await props.params;
  const parsed = parseQuarterParam(quarter);
  if (!parsed) notFound();
  if (parsed.key < EARLIEST_SPACE_SCORE_QUARTER || parsed.key > quarterOf().key) notFound();

  const edition = await getSpaceScoreEdition(parsed.key);
  if (!edition) notFound();

  const prevKey = previousQuarterKey(parsed.key);
  const hasPrevPage = !!prevKey && prevKey >= EARLIEST_SPACE_SCORE_QUARTER;
  const latest = latestSpaceScoreQuarter();
  const isLatest = parsed.key === latest;

  return (
    <div className="min-h-screen pb-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <BreadcrumbSchema
          items={[
            { name: 'Home', href: '/' },
            { name: 'Rankings', href: '/rankings' },
            { name: `Space Score Top ${SPACE_SCORE_TOP_N}`, href: '/rankings/space-score-top-25' },
            { name: quarterShortLabel(parsed.key) },
          ]}
        />
        <ItemListSchema
          name={`Space Score Top ${SPACE_SCORE_TOP_N} — ${quarterShortLabel(parsed.key)}`}
          description={`The ${SPACE_SCORE_TOP_N} highest-rated space companies on the SpaceNexus Space Score for ${quarterShortLabel(parsed.key)}.`}
          url={`/rankings/space-score-top-25/${parsed.key}`}
          items={edition.rows.map((r) => ({
            name: r.entry.name,
            url: r.entry.slug ? `/company-profiles/${r.entry.slug}` : `/rankings/space-score-top-25/${parsed.key}`,
            description: `Space Score ${r.entry.total} of 1000${r.entry.tierLabel ? ` · ${r.entry.tierLabel}` : ''}`,
          }))}
        />

        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/rankings" className="hover:text-white/80">Rankings</Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-400">Space Score Top {SPACE_SCORE_TOP_N}</span>
        </nav>

        <p className="text-cyan-300 text-xs uppercase tracking-[0.14em] font-semibold mb-2">
          Quarterly ranking · {quarterLabel(parsed.key)}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
          Space Score Top {SPACE_SCORE_TOP_N}
        </h1>
        <p className="text-slate-400 leading-relaxed max-w-2xl">
          The {SPACE_SCORE_TOP_N} highest-rated companies of {fmt(edition.poolSize)} scored, on a 0–1000
          composite across innovation, financial health, market position, operational capacity and growth
          trajectory. The full method is at the foot of this page.
        </p>

        <div className="flex flex-wrap items-center gap-3 mt-5 text-sm">
          {hasPrevPage ? (
            <Link href={`/rankings/space-score-top-25/${prevKey}`} className="text-cyan-300 hover:text-cyan-200">
              &larr; {quarterShortLabel(prevKey!)} edition
            </Link>
          ) : (
            <span className="text-slate-500">No earlier edition &mdash; this is the first.</span>
          )}
          {!isLatest && (
            <Link href={`/rankings/space-score-top-25/${latest}`} className="text-cyan-300 hover:text-cyan-200">
              Latest edition ({quarterShortLabel(latest)}) &rarr;
            </Link>
          )}
        </div>

        {/* Honesty banner. Movement is only shown when a previous edition
            genuinely exists; otherwise we say so rather than draw arrows. */}
        {!edition.hasPrevious && (
          <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4">
            <p className="text-sm text-amber-100 font-medium mb-1">First edition &mdash; no movement to report</p>
            <p className="text-sm text-slate-300 leading-relaxed">
              This is the first published Space Score Top {SPACE_SCORE_TOP_N}. There is no prior quarter to
              compare against, so the movement column is empty for every row. It will fill in from the next
              edition onward, measured against this table.
            </p>
          </div>
        )}
        {edition.reconstructed && (
          <div className="mt-4 rounded-xl border border-orange-400/30 bg-orange-400/[0.06] p-4">
            <p className="text-sm text-orange-100 font-medium mb-1">Reconstructed edition</p>
            <p className="text-sm text-slate-300 leading-relaxed">
              This quarter closed before the ranking was archived, so the table below is derived from the
              current score data rather than from a contemporaneous snapshot. Treat it as a back-calculation,
              not as what we would have published at the time.
            </p>
          </div>
        )}

        <div className="mt-8 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <caption className="sr-only">
              Space Score Top {SPACE_SCORE_TOP_N} for {quarterLabel(parsed.key)}
            </caption>
            <thead>
              <tr className="text-left text-slate-400">
                <th scope="col" className="py-2 pr-3 font-medium">#</th>
                <th scope="col" className="py-2 pr-3 font-medium">Company</th>
                <th scope="col" className="py-2 pr-3 font-medium">Sector</th>
                <th scope="col" className="py-2 pr-3 font-medium text-right">Score</th>
                <th scope="col" className="py-2 pr-3 font-medium">Tier</th>
                <th scope="col" className="py-2 font-medium">
                  {edition.hasPrevious ? `vs ${quarterShortLabel(edition.previousEdition!)}` : 'Movement'}
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
                  </td>
                  <td className="py-2.5 pr-3 text-slate-400 capitalize">
                    {r.entry.sector ? r.entry.sector.replace(/-/g, ' ') : '—'}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-white tabular-nums">{fmt(r.entry.total)}</td>
                  <td className="py-2.5 pr-3 text-slate-400">{r.entry.tierLabel || '—'}</td>
                  <td className="py-2.5">
                    <RankMovement delta={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-12" id="methodology">
          <h2 className="text-xl font-bold text-white mb-3">Methodology</h2>
          <ul className="space-y-3">
            {SPACE_SCORE_TOP_25_METHODOLOGY.map((m) => (
              <li key={m} className="text-sm text-slate-400 leading-relaxed flex gap-2">
                <span aria-hidden="true" className="text-slate-600">&bull;</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
          {edition.scoresUpdatedAt && (
            <p className="text-xs text-slate-500 mt-4">
              Underlying score table last revised {edition.scoresUpdatedAt.slice(0, 10)}. Edition generated{' '}
              {edition.generatedAt.slice(0, 10)}.
            </p>
          )}
          <p className="text-xs text-slate-500 mt-2">
            Full per-company breakdowns live on each{' '}
            <Link href="/company-profiles" className="text-cyan-300 hover:text-cyan-200">company profile</Link>.
          </p>
        </section>

        <div className="mt-10 card p-5 border border-white/10">
          <DeskByline />
        </div>
      </div>
    </div>
  );
}
