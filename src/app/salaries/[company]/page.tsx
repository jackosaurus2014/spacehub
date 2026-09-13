import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { SALARY_ROLES } from '@/lib/salary-data';
import {
  getCompanySalaries,
  companyMetadataText,
  companyFaqs,
  fmtDateUtc,
  displayBand,
  formatRange,
  ESTIMATE_LABEL,
  type BandSummary,
} from '@/lib/salaries-by-company';

/**
 * /salaries/[company] (competitor review Tier 2 #8, 2026-09-13): what one
 * employer pays, from its live postings — salary bands by role family and
 * location, the share that state a range, and the company against the
 * industry benchmark. SpaceCrew ranks for "<company> salary" queries with
 * thin pages; ours is built from the same rows as the board, so the numbers
 * here are the numbers on the listings.
 *
 * Unknown or under-threshold companies get a real 404 via middleware's
 * SLUG_EXISTENCE_CHECKS (/api/salaries/[company]/exists); notFound() here
 * is the in-render backstop.
 */
export const revalidate = 1800;

const BASE = 'https://spacenexus.us';

function BandCell({ summary }: { summary: BandSummary }) {
  const band = displayBand(summary);
  if (!band) return <span className="text-slate-500">—</span>;
  return (
    <span className={band.source === 'posting' ? 'text-emerald-300' : 'text-slate-200'} title={band.source === 'posting' ? `Median of ${band.count} posted range${band.count === 1 ? '' : 's'}` : `${ESTIMATE_LABEL} — median of ${band.count} estimated band${band.count === 1 ? '' : 's'}`}>
      {formatRange(band.min, band.max)}
    </span>
  );
}

function SourceCell({ summary }: { summary: BandSummary }) {
  const band = displayBand(summary);
  if (!band) return <span className="text-slate-500 text-xs">No match in dataset</span>;
  return (
    <span className={`text-xs ${band.source === 'posting' ? 'text-emerald-400/90' : 'text-slate-400'}`}>
      {band.label}{band.source === 'posting' && summary.estimate ? ` (${summary.stated?.count} of ${(summary.stated?.count ?? 0) + summary.estimate.count})` : ''}
    </span>
  );
}

export async function generateMetadata(props: { params: Promise<{ company: string }> }): Promise<Metadata> {
  const { company } = await props.params;
  const data = await getCompanySalaries(company).catch(() => null);
  if (!data) return { title: 'Salaries not found', robots: { index: false } };
  const { title, description } = companyMetadataText(data);
  const url = `${BASE}/salaries/${data.slug}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: 'website' } };
}

export default async function CompanySalariesPage(props: { params: Promise<{ company: string }> }) {
  const { company } = await props.params;
  const data = await getCompanySalaries(company).catch(() => null);
  if (!data) notFound();

  const faqs = companyFaqs(data, data.asOf);
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  const boardHref = `/jobs?company=${encodeURIComponent(data.name)}`;
  const overall = data.overall;
  const bm = data.benchmark;

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <nav className="hidden md:block text-sm text-slate-500 mb-4">
          <Link href="/jobs" className="hover:text-white">Jobs</Link> / <Link href="/salaries" className="hover:text-white">Salaries</Link> / {data.name}
        </nav>
        <h1 className="text-3xl font-bold text-white">{data.name} salaries</h1>
        <p className="text-slate-400 mt-2 max-w-3xl">
          Salary bands for the {data.openRoles.toLocaleString('en-US')} roles {data.name} has open right now, by role family and location. Where a posting states a range we show it verbatim; otherwise the band is a {ESTIMATE_LABEL} — the same bands that appear on <Link href={boardHref} className="text-cyan-300 hover:underline">{data.name}&apos;s listings</Link>. <Link href="/guide/space-industry-salaries#estimate" className="text-cyan-300 hover:underline">How the estimates are made</Link>.
        </p>

        {/* Summary card */}
        <section className="mt-8 card p-5" aria-labelledby="summary-heading">
          <h2 id="summary-heading" className="sr-only">Summary</h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-500">Open roles</dt>
              <dd className="text-2xl font-semibold text-white tabular-nums">{data.openRoles.toLocaleString('en-US')}</dd>
              <dd className="text-xs text-slate-500">{data.remoteCount > 0 ? `${data.remoteCount} remote-friendly` : 'On site'}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-500">Median band</dt>
              <dd className="text-2xl font-semibold text-white tabular-nums">{overall ? formatRange(overall.min, overall.max) : '—'}</dd>
              <dd className="text-xs text-slate-500">{overall ? `across ${overall.count} role${overall.count === 1 ? '' : 's'} with a band` : 'no titles matched the dataset'}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-500">Range stated in posting</dt>
              <dd className="text-2xl font-semibold text-white tabular-nums">{data.statedSharePct}%</dd>
              <dd className="text-xs text-slate-500">{data.statedCount} stated · {data.estimateCount} {ESTIMATE_LABEL}{data.estimateCount === 1 ? '' : 's'}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-500">Vs industry benchmark</dt>
              <dd className={`text-2xl font-semibold tabular-nums ${bm ? (bm.deltaPct > 0 ? 'text-emerald-300' : bm.deltaPct < 0 ? 'text-amber-300' : 'text-white') : 'text-white'}`}>
                {bm ? `${bm.deltaPct > 0 ? '+' : ''}${bm.deltaPct}%` : '—'}
              </dd>
              <dd className="text-xs text-slate-500">{bm ? `midpoint $${Math.round(bm.companyMidpoint / 1000)}k vs $${Math.round(bm.industryMedian / 1000)}k` : 'not enough data'}</dd>
            </div>
          </dl>
          {bm && (
            <p className="mt-4 text-sm text-slate-400">
              {data.name}&apos;s median band midpoint of ${Math.round(bm.companyMidpoint / 1000)}k sits {bm.deltaPct === 0 ? 'level with' : `${Math.abs(bm.deltaPct)}% ${bm.deltaPct > 0 ? 'above' : 'below'}`} the SpaceNexus industry benchmark of ${Math.round(bm.industryMedian / 1000)}k — the median across {SALARY_ROLES.length} curated space-industry roles, US base salary, as of {bm.asOf}. Mix matters: an employer hiring mostly technicians will sit below a benchmark weighted toward engineers, and vice versa.
            </p>
          )}
        </section>

        {/* By role family */}
        <section className="mt-10" aria-labelledby="families-heading">
          <h2 id="families-heading" className="text-lg font-semibold text-white mb-1">By role family</h2>
          <p className="text-sm text-slate-400 mb-3">Titles are clustered into families (a &quot;Senior Propulsion Engineer&quot; and a &quot;Turbomachinery Lead&quot; both land in Propulsion). The band is the median of the family&apos;s listings.</p>
          <div className="overflow-x-auto card">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-white/[0.06]">
                  <th scope="col" className="px-4 py-2.5 font-medium">Role family</th>
                  <th scope="col" className="px-4 py-2.5 font-medium text-right">Open</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Median band</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {data.families.map((f) => (
                  <tr key={f.family} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-2.5 text-slate-200">
                      <span title={f.sampleTitles.join(' · ')}>{f.family}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-300">{f.count}</td>
                    <td className="px-4 py-2.5 tabular-nums"><BandCell summary={f.summary} /></td>
                    <td className="px-4 py-2.5"><SourceCell summary={f.summary} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* By location */}
        <section className="mt-10" aria-labelledby="locations-heading">
          <h2 id="locations-heading" className="text-lg font-semibold text-white mb-1">By location and remote</h2>
          <p className="text-sm text-slate-400 mb-3">Estimates are adjusted for metro (LA/Bay +20%, Seattle +15%, DC +10%, Houston and remote −5%, Huntsville −10%); stated ranges are the employer&apos;s own.</p>
          <div className="overflow-x-auto card">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-white/[0.06]">
                  <th scope="col" className="px-4 py-2.5 font-medium">Location</th>
                  <th scope="col" className="px-4 py-2.5 font-medium text-right">Open</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Median band</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {data.locations.map((l) => (
                  <tr key={l.location} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-2.5 text-slate-200">{l.location}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-300">{l.count}</td>
                    <td className="px-4 py-2.5 tabular-nums"><BandCell summary={l.summary} /></td>
                    <td className="px-4 py-2.5"><SourceCell summary={l.summary} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Links */}
        <section className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3" aria-label="Related pages">
          <Link href={boardHref} className="card p-4 hover:border-cyan-500/40 transition-colors">
            <div className="text-white font-semibold">All {data.name} jobs</div>
            <div className="text-xs text-slate-500 mt-1">{data.openRoles.toLocaleString('en-US')} live roles on the board, each with its band</div>
          </Link>
          {data.profileSlug ? (
            <Link href={`/company-profiles/${data.profileSlug}`} className="card p-4 hover:border-cyan-500/40 transition-colors">
              <div className="text-white font-semibold">{data.name} company profile</div>
              <div className="text-xs text-slate-500 mt-1">Overview, funding, news and open roles</div>
            </Link>
          ) : (
            <Link href="/salaries" className="card p-4 hover:border-cyan-500/40 transition-colors">
              <div className="text-white font-semibold">All company salaries</div>
              <div className="text-xs text-slate-500 mt-1">Every employer with a salary page, ranked by open roles</div>
            </Link>
          )}
          <Link href="/guide/space-industry-salaries" className="card p-4 hover:border-cyan-500/40 transition-colors">
            <div className="text-white font-semibold">Space industry salary guide</div>
            <div className="text-xs text-slate-500 mt-1">{SALARY_ROLES.length} roles by seniority and city, and how to negotiate</div>
          </Link>
        </section>

        {/* FAQ */}
        <section id="faq" className="mt-10" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-lg font-semibold text-white mb-4">Frequently asked</h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q}>
                <h3 className="text-base font-semibold text-white mb-1">{f.q}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="text-xs text-slate-500 mt-8">
          Counts are live as of {fmtDateUtc(data.asOf)}. Listings mirror {data.name}&apos;s careers page; large employers often post the same role in several locations. Bands labelled &quot;{ESTIMATE_LABEL}&quot; are guidance from a benchmark dataset, not offers. Nothing here is a statement by {data.name}.
        </p>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, '\\u003c') }} />
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Jobs', href: '/jobs' }, { name: 'Salaries', href: '/salaries' }, { name: `${data.name} salaries` }]} />
      </div>
    </div>
  );
}
