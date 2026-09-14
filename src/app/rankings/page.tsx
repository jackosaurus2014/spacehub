import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import DeskByline from '@/components/desk/DeskByline';
import {
  latestSpaceScoreQuarter,
  spaceScoreQuarterKeys,
  quarterShortLabel,
  monthKeysBetween,
} from '@/lib/rankings';
import { latestEditionMonthKey, EARLIEST_INDEX_MONTH, parseMonthParam, monthLabelOf } from '@/lib/hiring-index';
import { SPACE_SCORE_TOP_N } from '@/lib/rankings-data';

// Rankings hub (competitor review Tier 2 #9). force-dynamic because the
// "latest edition" targets roll forward on the calendar without a deploy.
export const dynamic = 'force-dynamic';

const BASE = 'https://spacenexus.us';
const TITLE = 'SpaceNexus Rankings';
const DESCRIPTION =
  'Dated, citable league tables built from SpaceNexus data: the quarterly Space Score Top 25 and the monthly fastest-hiring space companies, each with its methodology stated in full.';
const OG_IMAGE =
  '/api/og?title=SpaceNexus+Rankings&subtitle=Quarterly+Space+Score+Top+25+and+monthly+fastest-hiring+companies&type=data';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}/rankings` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE}/rankings`,
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: TITLE }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [OG_IMAGE] },
};

function monthLabel(key: string): string {
  const p = parseMonthParam(key);
  return p ? monthLabelOf(p.year, p.month) : key;
}

export default function RankingsIndexPage() {
  const latestQuarter = latestSpaceScoreQuarter();
  const quarters = spaceScoreQuarterKeys().slice().reverse();
  const latestMonth = latestEditionMonthKey();
  const months = monthKeysBetween(EARLIEST_INDEX_MONTH, latestMonth).slice().reverse();

  return (
    <div className="min-h-screen pb-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Rankings' }]} />

        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80">Home</Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-400">Rankings</span>
        </nav>

        <p className="text-cyan-300 text-xs uppercase tracking-[0.14em] font-semibold mb-2">Recurring</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{TITLE}</h1>
        <p className="text-slate-400 leading-relaxed max-w-2xl">
          Every ranking here is dated, permanently linkable and built from data we publish elsewhere on the
          site. Each edition states its method, links the edition before it, and shows rank movement only
          where a previous edition actually exists.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          <section className="card p-6">
            <p className="text-xs uppercase tracking-[0.12em] text-cyan-300 font-semibold mb-2">Quarterly</p>
            <h2 className="text-xl font-bold text-white mb-2">
              <Link href="/rankings/space-score-top-25" className="hover:text-cyan-200">
                Space Score Top {SPACE_SCORE_TOP_N}
              </Link>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              The highest-rated space companies on a 0&ndash;1000 composite across innovation, financial
              health, market position, operational capacity and growth trajectory.
            </p>
            <Link
              href={`/rankings/space-score-top-25/${latestQuarter}`}
              className="btn-primary inline-flex px-4 py-2 rounded-lg text-sm"
            >
              {quarterShortLabel(latestQuarter)} edition
            </Link>
            <ul className="mt-4 space-y-1">
              {quarters.map((q) => (
                <li key={q}>
                  <Link
                    href={`/rankings/space-score-top-25/${q}`}
                    className="text-sm text-slate-400 hover:text-white"
                  >
                    {quarterShortLabel(q)}
                    {q === latestQuarter && <span className="text-slate-600"> &middot; current</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-6">
            <p className="text-xs uppercase tracking-[0.12em] text-cyan-300 font-semibold mb-2">Monthly</p>
            <h2 className="text-xl font-bold text-white mb-2">
              <Link href="/rankings/fastest-hiring" className="hover:text-cyan-200">
                Fastest-Hiring Space Companies
              </Link>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Which employers grew their open-role count fastest, from daily applicant-tracking-system
              snapshots across the companies we track.
            </p>
            <Link
              href={`/rankings/fastest-hiring/${latestMonth}`}
              className="btn-primary inline-flex px-4 py-2 rounded-lg text-sm"
            >
              {monthLabel(latestMonth)} edition
            </Link>
            <ul className="mt-4 space-y-1">
              {months.map((m) => (
                <li key={m}>
                  <Link href={`/rankings/fastest-hiring/${m}`} className="text-sm text-slate-400 hover:text-white">
                    {monthLabel(m)}
                    {m === latestMonth && <span className="text-slate-600"> &middot; latest</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-12">
          <h2 className="text-xl font-bold text-white mb-3">The rule these tables follow</h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
            A ranking that invents movement is worse than no ranking. Where there is no previous edition to
            compare against &mdash; because the table is new, or the month before it had no qualifying data
            &mdash; the movement column stays empty and the page says why. Arrows appear only when they mean
            something.
          </p>
        </section>

        <div className="mt-10 card p-5 border border-white/10">
          <DeskByline />
        </div>
      </div>
    </div>
  );
}
