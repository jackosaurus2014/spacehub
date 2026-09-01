import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import JsonLd from '@/components/seo/JsonLd';
import Console from '@/components/ui/Console';
import Telemetry from '@/components/ui/Telemetry';
import { APP_URL } from '@/lib/constants';
import { getJobsHubData, jobsHubTitle, jobPostingNode, type JobsHubData } from '@/lib/jobs-hub';
import { coverageChangesInWindow } from '@/lib/hiring-coverage';
import { latestEditionMonthKey } from '@/lib/hiring-index';
import { CATEGORY_COLORS } from '@/app/space-talent/data';
import type { JobCategory } from '@/types';
import JobAlertSignup from './JobAlertSignup';

// Server-rendered jobs hub (2026-09-01). Until now /jobs was a permanent
// redirect into the client-rendered Space Talent board, so the site's hottest
// business entry had no crawlable page. DB at request time → force-dynamic
// (the Railway build container has no database); freshness via the 600s
// unstable_cache in src/lib/jobs-hub.ts.
export const dynamic = 'force-dynamic';

const CANONICAL = 'https://spacenexus.us/jobs';
const nf = new Intl.NumberFormat('en-US');

export async function generateMetadata(): Promise<Metadata> {
  const data = await getJobsHubData();
  const title = jobsHubTitle(data);
  const description = data && data.activeCount > 0
    ? `${nf.format(data.activeCount)} open space industry jobs at ${nf.format(data.companiesHiring)} companies — engineering, operations, business, research, legal and manufacturing roles mirrored daily from official careers pages. ${nf.format(data.newLast7Days)} new this week.`
    : 'Open space industry jobs — engineering, operations, business, research, legal and manufacturing roles mirrored daily from official company careers pages.';
  const og = `/api/og?title=${encodeURIComponent('Space Industry Jobs')}&subtitle=${encodeURIComponent(
    data && data.activeCount > 0 ? `${nf.format(data.activeCount)} open roles, synced daily` : 'Open roles, synced daily',
  )}&type=tools`;
  return {
    title,
    description,
    alternates: { canonical: CANONICAL },
    openGraph: { title, description, url: CANONICAL, type: 'website', images: [og] },
    twitter: { card: 'summary_large_image', title, description, images: [og] },
  };
}

function formatPosted(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function buildJsonLd(data: JobsHubData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': CANONICAL,
    url: CANONICAL,
    name: 'Space Industry Jobs',
    description: `${nf.format(data.activeCount)} open space industry jobs at ${nf.format(data.companiesHiring)} companies, synced daily from official careers pages.`,
    isPartOf: { '@type': 'WebSite', name: 'SpaceNexus', url: APP_URL },
    mainEntity: {
      '@type': 'ItemList',
      name: 'Newest space industry job postings',
      numberOfItems: data.newest.length,
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      itemListElement: data.newest.map((job, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: jobPostingNode(job, APP_URL),
      })),
    },
  };
}

export default async function JobsHubPage() {
  const data = await getJobsHubData();
  const indexMonth = latestEditionMonthKey();
  const coverageNotes = coverageChangesInWindow(new Date(Date.now() - 30 * 86_400_000));
  const maxCategory = data ? Math.max(1, ...data.categories.map((c) => c.count)) : 1;
  const maxCompany = data && data.topCompanies.length ? data.topCompanies[0].activeCount : 1;

  return (
    <div className="min-h-screen pb-16">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Jobs', href: '/jobs' }]} />
      {data && data.newest.length > 0 && <JsonLd data={buildJsonLd(data)} />}

      <div className="container mx-auto px-4 max-w-6xl">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6">
          <Link href="/" className="hover:text-white/80 min-h-[44px] inline-flex items-center">Home</Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-400" aria-current="page">Jobs</span>
        </nav>

        <header className="mb-8">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-cyan-300/80 mb-2">Space industry jobs board</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            {data && data.activeCount > 0
              ? <>{nf.format(data.activeCount)} open space jobs at {nf.format(data.companiesHiring)} companies</>
              : 'Space industry jobs, synced daily'}
          </h1>
          <p className="text-lg text-white/70 max-w-3xl">
            Every role here is mirrored from an official company careers page (Greenhouse, Lever, Ashby, Workday) and
            re-synced every morning. Browse by category, see who is hiring hardest, or jump into the full board with filters.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link
              href="/space-talent?tab=jobs"
              className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg text-sm font-semibold bg-white text-black hover:bg-cyan-100 transition-colors"
            >
              Search all jobs with filters →
            </Link>
            <Link
              href="/hire"
              className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg text-sm font-medium border border-white/15 text-white/90 hover:bg-white/[0.06] transition-colors"
            >
              Hiring? Post a role
            </Link>
          </div>
        </header>

        {!data ? (
          <div className="card p-6">
            <p className="text-slate-400 text-sm">
              The jobs feed is temporarily unavailable — the daily sync will restore it shortly. You can still{' '}
              <Link href="/space-talent?tab=jobs" className="text-cyan-300 hover:underline">open the full board</Link>.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {coverageNotes.map((c) => (
              <p key={c.date} className="text-[12px] text-amber-300/80 bg-amber-500/5 border border-amber-500/15 rounded px-3 py-2">
                Coverage note ({c.date}): {c.note}
              </p>
            ))}

            <section aria-labelledby="jobs-live-counts">
              <h2 id="jobs-live-counts" className="sr-only">Live counts</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Telemetry label="Open roles" value={nf.format(data.activeCount)} sub="active postings" />
                <Telemetry label="Companies hiring" value={nf.format(data.companiesHiring)} sub="with at least one open role" />
                <Telemetry label="New this week" value={nf.format(data.newLast7Days)} sub="posted in the last 7 days" tone="ember" />
                <Telemetry label="Remote-friendly" value={nf.format(data.remoteCount)} sub="roles flagged remote OK" />
              </div>
            </section>

            <Console title="Browse by category" source="SpaceNexus ATS sync" asOf={data.asOf} as="section">
              <ul className="grid grid-cols-2 md:grid-cols-3 gap-3 list-none m-0 p-0">
                {data.categories.map((c) => {
                  const colors = CATEGORY_COLORS[c.value as JobCategory];
                  return (
                    <li key={c.value}>
                      <Link
                        href={`/space-talent?tab=jobs&category=${c.value}`}
                        className="block min-h-[44px] rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 hover:border-cyan-500/30 hover:bg-white/[0.05] transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex items-center gap-2 text-sm font-semibold ${colors?.text ?? 'text-white'}`}>
                            <span aria-hidden="true">{c.icon}</span>
                            {c.label}
                          </span>
                          <span className="font-mono text-sm text-white tabular-nums">{nf.format(c.count)}</span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden" aria-hidden="true">
                          <div className={`h-full rounded-full ${colors?.bg ?? 'bg-white/20'}`} style={{ width: `${Math.max(3, Math.round((c.count / maxCategory) * 100))}%` }} />
                        </div>
                        <span className="sr-only">{c.count} open {c.label.toLowerCase()} roles</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Console>

            <div className="grid lg:grid-cols-5 gap-6">
              <Console title="Newest postings" source="SpaceNexus ATS sync" asOf={data.asOf} as="section" padded={false} className="lg:col-span-3">
                {data.newest.length === 0 ? (
                  <p className="p-4 text-sm text-slate-400">No active postings yet — the sync runs every morning.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <caption className="sr-only">The {data.newest.length} most recently posted space industry jobs</caption>
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-slate-500 border-b border-white/[0.06]">
                          <th scope="col" className="px-4 py-2 font-medium">Role</th>
                          <th scope="col" className="px-4 py-2 font-medium">Company</th>
                          <th scope="col" className="px-4 py-2 font-medium hidden md:table-cell">Location</th>
                          <th scope="col" className="px-4 py-2 font-medium text-right whitespace-nowrap">Posted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.newest.map((job) => {
                          const colors = CATEGORY_COLORS[job.category as JobCategory];
                          return (
                            <tr key={job.id} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                              <th scope="row" className="px-4 py-2.5 font-normal align-top">
                                <Link href={`/space-talent/job/${job.id}`} className="text-white hover:text-cyan-300 font-medium inline-flex min-h-[44px] items-center">
                                  {job.title}
                                </Link>
                                <span className={`ml-2 hidden sm:inline-block text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${colors?.bg ?? 'bg-white/10'} ${colors?.text ?? 'text-white/70'}`}>
                                  {job.category}
                                </span>
                              </th>
                              <td className="px-4 py-2.5 align-top text-white/80">
                                {job.companySlug
                                  ? <Link href={`/company-profiles/${job.companySlug}`} className="text-cyan-300 hover:underline">{job.company}</Link>
                                  : job.company}
                              </td>
                              <td className="px-4 py-2.5 align-top text-slate-400 hidden md:table-cell">
                                {job.location}{job.remoteOk ? ' · Remote OK' : ''}
                              </td>
                              <td className="px-4 py-2.5 align-top text-right text-slate-400 whitespace-nowrap">
                                <time dateTime={job.postedAt}>{formatPosted(job.postedAt)}</time>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="px-4 py-3 border-t border-white/[0.06]">
                  <Link href="/space-talent?tab=jobs" className="text-sm text-cyan-300 hover:underline inline-flex min-h-[44px] items-center">
                    Browse all {nf.format(data.activeCount)} open roles →
                  </Link>
                </div>
              </Console>

              <Console title="Top hiring companies" source="active postings" asOf={data.asOf} as="section" padded={false} className="lg:col-span-2">
                {data.topCompanies.length === 0 ? (
                  <p className="p-4 text-sm text-slate-400">No employers with active postings yet.</p>
                ) : (
                  <ol className="list-none m-0 p-0 divide-y divide-white/[0.04]">
                    {data.topCompanies.map((c, i) => {
                      const href = c.slug ? `/company-profiles/${c.slug}?tab=jobs` : `/space-talent?tab=jobs&search=${encodeURIComponent(c.name)}`;
                      return (
                        <li key={c.name}>
                          <Link href={href} className="flex items-center gap-3 px-4 min-h-[44px] py-2 hover:bg-white/[0.03] transition-colors">
                            <span className="font-mono text-xs text-slate-500 w-5 text-right tabular-nums" aria-hidden="true">{i + 1}</span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm text-white truncate">{c.name}</span>
                              <span className="block mt-1 h-1 rounded-full bg-white/[0.06] overflow-hidden" aria-hidden="true">
                                <span className="block h-full rounded-full bg-cyan-400/60" style={{ width: `${Math.max(3, Math.round((c.activeCount / maxCompany) * 100))}%` }} />
                              </span>
                            </span>
                            <span className="font-mono text-sm text-cyan-200 tabular-nums">{nf.format(c.activeCount)}</span>
                            <span className="sr-only">open roles</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                )}
                <div className="px-4 py-3 border-t border-white/[0.06] text-sm">
                  <Link href="/hiring-trends" className="text-cyan-300 hover:underline inline-flex min-h-[44px] items-center">Hiring trends — who is accelerating →</Link>
                </div>
              </Console>
            </div>

            <section id="alerts" aria-labelledby="jobs-alerts-heading" className="card p-6">
              <h2 id="jobs-alerts-heading" className="text-lg font-semibold text-white mb-1">Get new space jobs by email</h2>
              <p className="text-sm text-slate-400 mb-4">
                Roughly {nf.format(data.newLast7Days)} new roles landed this week. Save an alert and we email you as matching postings arrive.
              </p>
              <JobAlertSignup />
            </section>

            <section aria-labelledby="jobs-intel-heading">
              <h2 id="jobs-intel-heading" className="text-lg font-semibold text-white mb-3">Hiring intelligence</h2>
              <ul className="grid sm:grid-cols-3 gap-3 list-none m-0 p-0">
                <li>
                  <Link href="/hiring-trends" className="block min-h-[44px] rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 hover:border-cyan-500/30 transition-colors">
                    <span className="block text-sm font-semibold text-white">Hiring Trends</span>
                    <span className="block text-xs text-slate-400 mt-1">Week-over-week velocity and top movers from daily snapshots.</span>
                  </Link>
                </li>
                <li>
                  <Link href={`/hiring-index/${indexMonth}`} className="block min-h-[44px] rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 hover:border-cyan-500/30 transition-colors">
                    <span className="block text-sm font-semibold text-white">Hiring Index — {indexMonth}</span>
                    <span className="block text-xs text-slate-400 mt-1">The monthly edition: category mix, locations, largest employers.</span>
                  </Link>
                </li>
                <li>
                  <Link href="/space-talent?tab=workforce&wfTab=salaries" className="block min-h-[44px] rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 hover:border-cyan-500/30 transition-colors">
                    <span className="block text-sm font-semibold text-white">Salary Benchmarks</span>
                    <span className="block text-xs text-slate-400 mt-1">Pay by role and seniority across the industry.</span>
                  </Link>
                </li>
              </ul>
            </section>

            <p className="text-[11px] text-slate-500">
              Listings mirror company careers pages and are synced daily; large employers often post the same role in several locations.
              Apply on the employer&apos;s own page — SpaceNexus never collects applications.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
