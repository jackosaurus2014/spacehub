import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { APP_URL } from '@/lib/constants';
import { JOB_LANDING_PAGES, getJobLandingPage, type JobLandingPageEntry } from '@/lib/job-landing-pages';
import { CATEGORY_COLORS, SENIORITY_LABELS } from '../../data';
import { JOB_CATEGORIES } from '@/types';
import type { JobCategory, SeniorityLevel } from '@/types';

export const revalidate = 3600;
// JOB_LANDING_PAGES (src/lib/job-landing-pages.ts) is a static,
// build-time-known array — generateStaticParams() below already enumerates
// every valid slug. dynamicParams=false makes Next's router 404 any slug
// NOT in that list at the routing layer, before this page's notFound()
// call (line ~131) ever runs. That matters because notFound() called from
// inside a matched route is caught by a client-side React error boundary
// (see node_modules/next/dist/client/components/not-found-boundary.js)
// that can swap in the right UI but can't set the HTTP status code — only
// a route-level "no page matched" 404 (this one) reliably returns a real
// 404 status. Safe here specifically because the slug list is static: a
// new landing page requires a code change + redeploy anyway.
export const dynamicParams = false;

// A page with fewer than this many live matches is thin content — still
// fully functional, but flagged noindex rather than pretending it's a
// substantial category. Honest thin-content guard, not a broken page.
const MIN_INDEXABLE_MATCHES = 5;
const JOBS_PER_PAGE = 50;

// ────────────────────────────────────────
// Data fetching
// ────────────────────────────────────────

const LISTING_SELECT = {
  id: true,
  title: true,
  company: true,
  location: true,
  remoteOk: true,
  category: true,
  seniorityLevel: true,
  postedDate: true,
  companyProfile: { select: { slug: true, name: true } },
} as const;

type LandingJob = Prisma.SpaceJobPostingGetPayload<{ select: typeof LISTING_SELECT }>;

async function fetchLandingData(entry: JobLandingPageEntry): Promise<{ count: number; jobs: LandingJob[] }> {
  try {
    const where: Prisma.SpaceJobPostingWhereInput = { isActive: true, ...entry.where };
    const [count, jobs] = await Promise.all([
      prisma.spaceJobPosting.count({ where }),
      prisma.spaceJobPosting.findMany({
        where,
        select: LISTING_SELECT,
        orderBy: { postedDate: 'desc' },
        take: JOBS_PER_PAGE,
      }),
    ]);
    return { count, jobs };
  } catch (error) {
    logger.error('Failed to load job landing page data', {
      slug: entry.slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return { count: 0, jobs: [] };
  }
}

// ────────────────────────────────────────
// Formatting helpers
// ────────────────────────────────────────

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function daysAgo(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 60) return '1 month ago';
  return `${Math.floor(diffDays / 30)} months ago`;
}

// ────────────────────────────────────────
// Static params & metadata
// ────────────────────────────────────────

export async function generateStaticParams() {
  return JOB_LANDING_PAGES.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const entry = getJobLandingPage(params.slug);
  if (!entry) {
    return { title: 'Jobs not found | SpaceNexus' };
  }

  const { count } = await fetchLandingData(entry);
  const url = `${APP_URL}/space-talent/browse/${entry.slug}`;
  const description = `${entry.intro} ${count.toLocaleString()} active listing${count === 1 ? '' : 's'} right now, updated daily from live ATS boards.`;

  return {
    title: `${entry.title} | SpaceNexus`,
    description,
    alternates: { canonical: url },
    ...(count < MIN_INDEXABLE_MATCHES ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: `${entry.title} | SpaceNexus`,
      description,
      url,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${entry.title} | SpaceNexus`,
      description,
    },
  };
}

// ────────────────────────────────────────
// Page
// ────────────────────────────────────────

export default async function JobLandingPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const entry = getJobLandingPage(params.slug);
  if (!entry) notFound();

  const { count, jobs } = await fetchLandingData(entry);

  const siblingCategories = JOB_LANDING_PAGES.filter((e) => e.kind === 'category' && e.slug !== entry.slug);
  const siblingLocations = JOB_LANDING_PAGES.filter((e) => e.kind === 'location' && e.slug !== entry.slug);
  const remoteEntry = JOB_LANDING_PAGES.find((e) => e.kind === 'remote' && e.slug !== entry.slug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: entry.title,
    description: entry.intro,
    url: `${APP_URL}/space-talent/browse/${entry.slug}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: jobs.length,
      itemListElement: jobs.map((job, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${APP_URL}/space-talent/job/${job.id}`,
        name: `${job.title} at ${job.company}`,
      })),
    },
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <nav className="text-sm text-slate-400 flex items-center gap-2 flex-wrap">
          <Link href="/" className="hover:text-cyan-400 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/space-talent" className="hover:text-cyan-400 transition-colors">Space Talent</Link>
          <span>/</span>
          <span className="text-slate-300">{entry.title}</span>
        </nav>

        <div className="mt-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{entry.h1}</h1>
          <p className="mt-2 text-slate-400 text-sm max-w-3xl leading-relaxed">{entry.intro}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2">
            <span className="text-2xl font-bold text-cyan-400">{count.toLocaleString()}</span>
            <span className="text-sm text-slate-300">
              active listing{count === 1 ? '' : 's'} right now
            </span>
          </div>
        </div>

        {/* CTA row */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/space-talent?${entry.boardQuery}`}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-5 py-2.5 transition-colors text-sm"
          >
            See these on the full board &rarr;
          </Link>
          <Link
            href={`/space-talent?${entry.boardQuery}`}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 hover:border-white/30 text-white px-5 py-2.5 transition-colors text-sm"
          >
            🔔 Save as a job alert
          </Link>
        </div>

        {/* Job listing */}
        <div className="mt-8">
          {jobs.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-slate-300 font-medium">No active listings match this page right now.</p>
              <p className="text-slate-500 text-sm mt-2">
                The board refreshes daily from live company ATS feeds — check back soon, or browse the{' '}
                <Link href="/space-talent" className="text-cyan-400 hover:underline">full jobs board</Link>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {jobs.map((job) => {
                const cat = CATEGORY_COLORS[job.category as JobCategory];
                const catLabel = JOB_CATEGORIES.find((c) => c.value === job.category);
                const senLabel = SENIORITY_LABELS[job.seniorityLevel as SeniorityLevel] || job.seniorityLevel;
                return (
                  <div key={job.id} className="card p-5">
                    <h2 className="font-semibold text-base">
                      <Link
                        href={`/space-talent/job/${job.id}`}
                        className="text-white hover:text-cyan-400 hover:underline underline-offset-2 transition-colors"
                      >
                        {job.title}
                      </Link>
                    </h2>
                    <div className="mt-0.5">
                      {job.companyProfile ? (
                        <Link
                          href={`/company-profiles/${job.companyProfile.slug}`}
                          className="text-slate-400 text-sm hover:text-cyan-400 underline-offset-2 hover:underline transition-colors"
                        >
                          {job.company}
                        </Link>
                      ) : (
                        <span className="text-slate-400 text-sm">{job.company}</span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-slate-400">{job.location}</span>
                      {job.remoteOk && (
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-white/90">Remote</span>
                      )}
                      <span className="text-slate-600">|</span>
                      <span className={`px-2 py-0.5 rounded ${cat?.bg || 'bg-white/[0.08]'} ${cat?.text || 'text-slate-500'}`}>
                        {catLabel?.icon} {catLabel?.label || job.category}
                      </span>
                      <span className="text-slate-600">|</span>
                      <span className="text-slate-400">{senLabel}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <time dateTime={new Date(job.postedDate).toISOString()} className="text-slate-500">
                        {formatDate(job.postedDate)}
                      </time>
                      <span className="text-slate-500">{daysAgo(job.postedDate)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {jobs.length >= JOBS_PER_PAGE && count > jobs.length && (
            <p className="mt-4 text-center text-xs text-slate-500">
              Showing the {jobs.length} most recent of {count.toLocaleString()} active listings.{' '}
              <Link href={`/space-talent?${entry.boardQuery}`} className="text-cyan-400 hover:underline">
                See the rest on the full board &rarr;
              </Link>
            </p>
          )}
        </div>

        {/* Sibling landing pages */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Browse by category</h2>
            <ul className="space-y-2">
              {siblingCategories.map((sib) => (
                <li key={sib.slug}>
                  <Link href={`/space-talent/browse/${sib.slug}`} className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
                    {sib.title}
                  </Link>
                </li>
              ))}
              {remoteEntry && (
                <li>
                  <Link href={`/space-talent/browse/${remoteEntry.slug}`} className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
                    {remoteEntry.title}
                  </Link>
                </li>
              )}
            </ul>
          </div>
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Browse by location</h2>
            <ul className="space-y-2">
              {siblingLocations.map((sib) => (
                <li key={sib.slug}>
                  <Link href={`/space-talent/browse/${sib.slug}`} className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
                    {sib.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-2">All space industry jobs</h2>
          <p className="text-xs text-slate-500 mb-3">
            {count.toLocaleString()} listings here are a slice of the full board — thousands of ATS-synced
            postings across every category, location, and seniority level.
          </p>
          <Link href="/space-talent" className="text-xs text-cyan-400 hover:underline">
            Explore the full Space Talent board &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
