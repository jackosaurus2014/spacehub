import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { SALARY_ROLES, SALARY_DATA_AS_OF } from '@/lib/salary-data';
import {
  getSalaryCompanies,
  indexMetadataText,
  displayBand,
  formatRange,
  fmtDateUtc,
  ESTIMATE_LABEL,
  SALARY_PAGE_MIN_ROLES,
} from '@/lib/salaries-by-company';

/**
 * /salaries (competitor review Tier 2 #8, 2026-09-13): every employer with
 * a salary page, ranked by open roles with its median band, plus what the
 * biggest role families pay across the whole board. The per-company pages
 * hang off this index; the salary guide explains the estimates.
 */
export const revalidate = 1800;

const CANONICAL = 'https://spacenexus.us/salaries';

export async function generateMetadata(): Promise<Metadata> {
  let companies = 0; let roles = 0;
  try { const d = await getSalaryCompanies(); companies = d.companies.length; roles = d.totalRoles; } catch { /* static fallback */ }
  const { title, description } = indexMetadataText(companies, roles);
  return { title, description, alternates: { canonical: CANONICAL }, openGraph: { title, description, url: CANONICAL, type: 'website' } };
}

export default async function SalariesIndexPage() {
  const data = await getSalaryCompanies().catch(() => ({ companies: [], families: [], totalRoles: 0, asOf: new Date() }));
  const top = data.companies.slice(0, 12);
  const rest = data.companies.slice(12);

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <nav className="hidden md:block text-sm text-slate-500 mb-4"><Link href="/jobs" className="hover:text-white">Jobs</Link> / Salaries by company</nav>
        <h1 className="text-3xl font-bold text-white">Space company salaries</h1>
        <p className="text-slate-400 mt-2 max-w-3xl">
          {data.companies.length.toLocaleString('en-US')} employers with {SALARY_PAGE_MIN_ROLES} or more open roles, ranked by live positions, each with the median salary band across its listings. Bands are the employer&apos;s stated range where the posting has one and a {ESTIMATE_LABEL} otherwise — the same bands shown on the <Link href="/jobs" className="text-cyan-300 hover:underline">jobs board</Link>. <Link href="/guide/space-industry-salaries" className="text-cyan-300 hover:underline">Read the salary guide</Link> for what {SALARY_ROLES.length} roles pay by seniority and city.
        </p>

        {data.families.length > 0 && (
          <section className="mt-8" aria-labelledby="families-heading">
            <h2 id="families-heading" className="text-lg font-semibold text-white mb-1">What the biggest role families pay</h2>
            <p className="text-sm text-slate-400 mb-3">Across the {data.totalRoles.toLocaleString('en-US')} live roles at these employers. Estimated band is the median of our {ESTIMATE_LABEL}s; stated band is the median of employer-posted ranges, where any exist.</p>
            <div className="overflow-x-auto card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-white/[0.06]">
                    <th scope="col" className="px-4 py-2.5 font-medium">Role family</th>
                    <th scope="col" className="px-4 py-2.5 font-medium text-right">Open</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Estimated band</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Stated band</th>
                  </tr>
                </thead>
                <tbody>
                  {data.families.map((f) => (
                    <tr key={f.family} className="border-b border-white/[0.04] last:border-0">
                      <td className="px-4 py-2.5 text-slate-200"><span title={f.sampleTitles.join(' · ')}>{f.family}</span></td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-300">{f.count.toLocaleString('en-US')}</td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-200">{f.summary.estimate ? <span title={`${ESTIMATE_LABEL}, median of ${f.summary.estimate.count}`}>{formatRange(f.summary.estimate.min, f.summary.estimate.max)}</span> : <span className="text-slate-500">—</span>}</td>
                      <td className="px-4 py-2.5 tabular-nums">{f.summary.stated ? <span className="text-emerald-300" title={`Median of ${f.summary.stated.count} posted ranges`}>{formatRange(f.summary.stated.min, f.summary.stated.max)} <span className="text-xs text-slate-500">({f.summary.stated.count})</span></span> : <span className="text-slate-500">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {top.length > 0 && (
          <section className="mt-10" aria-labelledby="top-heading">
            <h2 id="top-heading" className="text-lg font-semibold text-white mb-3">Largest employers on the board</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {top.map((c) => {
                const band = c.overall ? formatRange(c.overall.min, c.overall.max) : null;
                return (
                  <li key={c.salarySlug} className="card p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/salaries/${c.salarySlug}`} className="text-white font-semibold hover:text-cyan-300 block truncate">{c.name} salaries</Link>
                      <div className="text-xs text-slate-500 mt-0.5">{c.activeCount.toLocaleString('en-US')} open roles{c.statedCount > 0 ? ` · ${c.statedCount} with a stated range` : ''}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-semibold text-white tabular-nums">{band ?? '—'}</div>
                      <div className="text-[11px] text-slate-500">median band</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {rest.length > 0 && (
          <section className="mt-10" aria-labelledby="all-heading">
            <h2 id="all-heading" className="text-lg font-semibold text-white mb-3">All companies with salary pages ({data.companies.length.toLocaleString('en-US')})</h2>
            <ul className="columns-1 sm:columns-2 lg:columns-3 gap-6 text-sm">
              {rest.map((c) => (
                <li key={c.salarySlug} className="break-inside-avoid flex items-baseline justify-between gap-2 py-1 border-b border-white/[0.05]">
                  <Link href={`/salaries/${c.salarySlug}`} className="text-slate-200 hover:text-cyan-300 truncate">{c.name}</Link>
                  <span className="text-slate-500 tabular-nums whitespace-nowrap">{c.overall ? formatRange(c.overall.min, c.overall.max) : '—'} · {c.activeCount}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.companies.length === 0 && <p className="mt-8 text-slate-400">The board is refreshing; check back in a few minutes.</p>}

        <section className="mt-12 card p-5 text-sm">
          <h2 className="text-white font-semibold mb-1">How these bands are made</h2>
          <p className="text-slate-400">A posting that states a range is shown verbatim. Everything else is matched to our benchmark dataset of {SALARY_ROLES.length} space-industry roles (as of {SALARY_DATA_AS_OF}), adjusted for seniority and metro, and labelled &quot;{ESTIMATE_LABEL}&quot;. A company&apos;s median band is the median of the minimums and maximums across its listings. <Link href="/guide/space-industry-salaries#estimate" className="text-cyan-300 hover:underline">Full method</Link> · <Link href="/jobs/companies" className="text-cyan-300 hover:underline">Every company hiring</Link>, including those below the {SALARY_PAGE_MIN_ROLES}-role threshold.</p>
        </section>
        <p className="text-xs text-slate-500 mt-6">Counts are live as of {fmtDateUtc(data.asOf)}. Listings mirror each company&apos;s own careers page. Estimates are guidance, not offers.</p>
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Jobs', href: '/jobs' }, { name: 'Salaries' }]} />
      </div>
    </div>
  );
}
