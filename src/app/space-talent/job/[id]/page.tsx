import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { APP_URL } from '@/lib/constants';
import { CATEGORY_COLORS, SENIORITY_LABELS } from '../../data';
import { JOB_CATEGORIES } from '@/types';
import type { JobCategory, SeniorityLevel } from '@/types';

export const revalidate = 3600;

// ────────────────────────────────────────
// Data fetching
// ────────────────────────────────────────

const JOB_SELECT = {
  id: true,
  title: true,
  company: true,
  location: true,
  remoteOk: true,
  description: true,
  employmentType: true,
  category: true,
  specialization: true,
  seniorityLevel: true,
  salaryMin: true,
  salaryMax: true,
  salaryMedian: true,
  yearsExperience: true,
  clearanceRequired: true,
  degreeRequired: true,
  isActive: true,
  postedDate: true,
  sourceUrl: true,
  companyProfileId: true,
  companyProfile: { select: { slug: true, name: true } },
} as const;

async function fetchJob(id: string) {
  try {
    return await prisma.spaceJobPosting.findUnique({
      where: { id },
      select: JOB_SELECT,
    });
  } catch (error) {
    logger.error('Failed to load job detail', {
      jobId: id,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function fetchMoreAtCompany(job: NonNullable<Awaited<ReturnType<typeof fetchJob>>>) {
  try {
    return await prisma.spaceJobPosting.findMany({
      where: {
        isActive: true,
        id: { not: job.id },
        ...(job.companyProfileId
          ? { companyProfileId: job.companyProfileId }
          : { company: job.company }),
      },
      select: {
        id: true,
        title: true,
        location: true,
        remoteOk: true,
        seniorityLevel: true,
        postedDate: true,
      },
      orderBy: { postedDate: 'desc' },
      take: 5,
    });
  } catch (error) {
    logger.error('Failed to load more-at-company jobs', {
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

async function fetchSimilarRoles(job: NonNullable<Awaited<ReturnType<typeof fetchJob>>>) {
  try {
    return await prisma.spaceJobPosting.findMany({
      where: {
        isActive: true,
        id: { not: job.id },
        category: job.category,
        company: { not: job.company },
      },
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        remoteOk: true,
        seniorityLevel: true,
        postedDate: true,
      },
      orderBy: { postedDate: 'desc' },
      take: 5,
    });
  } catch (error) {
    logger.error('Failed to load similar roles', {
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

// ────────────────────────────────────────
// Formatting helpers
// ────────────────────────────────────────

function formatSalary(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${Math.round(value)}`;
}

function formatSalaryRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${formatSalary(min)} – ${formatSalary(max)}`;
  if (min != null) return `From ${formatSalary(min)}`;
  return `Up to ${formatSalary(max as number)}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
};

// Google `JobPosting.employmentType` enum — https://schema.org/employmentType
const EMPLOYMENT_TYPE_SCHEMA: Record<string, string> = {
  full_time: 'FULL_TIME',
  part_time: 'PART_TIME',
  contract: 'CONTRACTOR',
  internship: 'INTERN',
};

const DEGREE_LABELS: Record<string, string> = {
  bachelor: "Bachelor's degree",
  master: "Master's degree",
  phd: 'PhD',
  none: 'No degree required',
};

// U.S. state / territory abbreviations and full names, used to best-effort
// detect a U.S. jobLocation from free-text ATS location strings.
const US_STATE_ABBRS = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY', 'DC', 'PR',
]);

interface ParsedLocation {
  locality?: string;
  region?: string;
  country?: string;
}

/**
 * Best-effort parse of free-text ATS location strings (e.g. "Hawthorne, CA",
 * "Long Beach, California, United States", "Denver, CO, USA") into a
 * locality/region/country tuple for schema.org PostalAddress. Returns null
 * when the string can't be confidently parsed (e.g. "Not specified",
 * "Remote", multi-site strings).
 */
function parseLocation(location: string): ParsedLocation | null {
  const raw = location.trim();
  if (!raw || /^(not specified|remote|various|multiple locations|tbd)$/i.test(raw)) {
    return null;
  }

  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const last = parts[parts.length - 1];
  const isUS = /^(usa|u\.s\.a\.?|united states( of america)?|us)$/i.test(last) || US_STATE_ABBRS.has(last.toUpperCase());

  if (parts.length === 1) {
    // Single token — only usable if it's itself a recognizable US state.
    if (US_STATE_ABBRS.has(parts[0].toUpperCase())) {
      return { region: parts[0], country: 'US' };
    }
    return { locality: parts[0] };
  }

  if (isUS) {
    // "City, State[, USA]"
    return {
      locality: parts[0],
      region: parts.length >= 3 ? parts[1] : parts[1],
      country: 'US',
    };
  }

  // Non-US or unrecognized trailing token — still surface city/region without guessing a country.
  return { locality: parts[0], region: parts[1] };
}

// ────────────────────────────────────────
// Metadata
// ────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const job = await fetchJob(params.id);
  if (!job || !job.isActive) {
    return { title: 'Job not found | SpaceNexus' };
  }

  const description = job.description
    ? job.description.replace(/\s+/g, ' ').trim().slice(0, 160)
    : `${job.title} at ${job.company} in ${job.location}. Apply directly through SpaceNexus's space industry jobs board.`;

  const url = `${APP_URL}/space-talent/job/${job.id}`;

  return {
    title: `${job.title} at ${job.company} | SpaceNexus`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${job.title} at ${job.company}`,
      description,
      url,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${job.title} at ${job.company}`,
      description,
      images: ['/og-image.png'],
    },
  };
}

// ────────────────────────────────────────
// JSON-LD (Google for Jobs)
// ────────────────────────────────────────

function buildJobPostingJsonLd(job: NonNullable<Awaited<ReturnType<typeof fetchJob>>>) {
  const description = job.description
    ? job.description
    : `${job.title} at ${job.company}. Located in ${job.location}.${job.remoteOk ? ' Remote-friendly.' : ''} View full details and apply on the official ${job.company} careers page.`;

  const postedDate = new Date(job.postedDate);
  const validThrough = new Date(postedDate.getTime() + 60 * 24 * 60 * 60 * 1000);

  const hiringOrganization: Record<string, unknown> = {
    '@type': 'Organization',
    name: job.company,
  };
  if (job.companyProfile?.slug) {
    hiringOrganization.sameAs = `${APP_URL}/company-profiles/${job.companyProfile.slug}`;
  }

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description,
    datePosted: postedDate.toISOString(),
    validThrough: validThrough.toISOString(),
    hiringOrganization,
    employmentType: EMPLOYMENT_TYPE_SCHEMA[job.employmentType || ''] || undefined,
    directApply: false,
    identifier: {
      '@type': 'PropertyValue',
      name: job.company,
      value: job.id,
    },
    url: `${APP_URL}/space-talent/job/${job.id}`,
  };

  const parsed = parseLocation(job.location);
  if (parsed) {
    const address: Record<string, string> = { '@type': 'PostalAddress' };
    if (parsed.locality) address.addressLocality = parsed.locality;
    if (parsed.region) address.addressRegion = parsed.region;
    if (parsed.country) address.addressCountry = parsed.country;
    schema.jobLocation = {
      '@type': 'Place',
      address,
    };
  } else if (job.remoteOk) {
    schema.jobLocationType = 'TELECOMMUTE';
    schema.applicantLocationRequirements = {
      '@type': 'Country',
      name: 'USA',
    };
  }
  // If location can't be parsed and the role isn't remote, we omit jobLocation
  // entirely rather than fabricate one — Google penalizes inaccurate location data.

  if (job.salaryMin != null || job.salaryMax != null) {
    const value: Record<string, unknown> = { '@type': 'QuantitativeValue', unitText: 'YEAR' };
    if (job.salaryMin != null) value.minValue = job.salaryMin;
    if (job.salaryMax != null) value.maxValue = job.salaryMax;
    schema.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value,
    };
  }

  // Drop undefined keys (JSON.stringify already skips them, but keeps code intent explicit).
  return schema;
}

// ────────────────────────────────────────
// Page
// ────────────────────────────────────────

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const job = await fetchJob(params.id);
  if (!job || !job.isActive) notFound();

  const [moreAtCompany, similarRoles] = await Promise.all([
    fetchMoreAtCompany(job),
    fetchSimilarRoles(job),
  ]);

  const cat = CATEGORY_COLORS[job.category as JobCategory];
  const catLabel = JOB_CATEGORIES.find((c) => c.value === job.category);
  const senLabel = SENIORITY_LABELS[job.seniorityLevel as SeniorityLevel] || job.seniorityLevel;
  const salaryRange = formatSalaryRange(job.salaryMin, job.salaryMax);
  const jsonLd = buildJobPostingJsonLd(job);

  return (
    <div className="min-h-screen bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/space-talent" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
          &larr; Back to Space Talent
        </Link>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">{job.title}</h1>
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    {job.companyProfile ? (
                      <Link
                        href={`/company-profiles/${job.companyProfile.slug}`}
                        className="text-slate-300 hover:text-cyan-400 underline-offset-2 hover:underline transition-colors"
                      >
                        {job.company}
                      </Link>
                    ) : (
                      <span className="text-slate-300">{job.company}</span>
                    )}
                    <span className="text-slate-500">&middot;</span>
                    <span className="text-slate-400 text-sm">{job.location}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {job.remoteOk && (
                    <span className="rounded bg-white/10 px-2 py-1 text-xs text-white/90">Remote OK</span>
                  )}
                  {job.clearanceRequired && (
                    <span className="rounded bg-yellow-500/20 px-2 py-1 text-xs text-yellow-300">
                      Clearance required
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-400">Category</div>
                  <div className={`mt-1 inline-block px-2 py-0.5 rounded ${cat?.bg || 'bg-white/[0.08]'} ${cat?.text || 'text-slate-300'}`}>
                    {catLabel?.icon} {catLabel?.label || job.category}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Seniority</div>
                  <div className="mt-1">{senLabel}</div>
                </div>
                {job.employmentType && (
                  <div>
                    <div className="text-xs text-slate-400">Employment type</div>
                    <div className="mt-1">{EMPLOYMENT_TYPE_LABELS[job.employmentType] || job.employmentType}</div>
                  </div>
                )}
                {salaryRange && (
                  <div>
                    <div className="text-xs text-slate-400">Salary</div>
                    <div className="mt-1 text-cyan-400 font-medium">{salaryRange}/yr</div>
                  </div>
                )}
                {job.yearsExperience != null && (
                  <div>
                    <div className="text-xs text-slate-400">Experience</div>
                    <div className="mt-1">
                      {job.yearsExperience === 0 ? 'No experience required' : `${job.yearsExperience}+ years`}
                    </div>
                  </div>
                )}
                {job.degreeRequired && (
                  <div>
                    <div className="text-xs text-slate-400">Education</div>
                    <div className="mt-1">{DEGREE_LABELS[job.degreeRequired] || job.degreeRequired}</div>
                  </div>
                )}
                {job.specialization && (
                  <div>
                    <div className="text-xs text-slate-400">Specialization</div>
                    <div className="mt-1">{job.specialization}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-slate-400">Posted</div>
                  <div className="mt-1">{formatDate(job.postedDate)}</div>
                </div>
              </div>

              {job.sourceUrl && (
                <div className="mt-6">
                  <a
                    href={job.sourceUrl}
                    target="_blank"
                    rel="nofollow noopener"
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-5 py-2.5 transition-colors"
                  >
                    Apply on company site &rarr;
                  </a>
                </div>
              )}
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-3">Job description</h2>
              {job.description ? (
                <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{job.description}</p>
              ) : (
                <p className="text-sm text-slate-400 leading-relaxed">
                  Full details for this role are posted on {job.company}&rsquo;s official careers page. Use the
                  &ldquo;Apply on company site&rdquo; link above to view the complete job description and
                  requirements.
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {moreAtCompany.length > 0 && (
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-slate-300 mb-3">More jobs at {job.company}</h2>
                <ul className="space-y-3">
                  {moreAtCompany.map((mj) => (
                    <li key={mj.id}>
                      <Link
                        href={`/space-talent/job/${mj.id}`}
                        className="block group"
                      >
                        <div className="text-sm text-white group-hover:text-cyan-400 transition-colors">
                          {mj.title}
                        </div>
                        <div className="text-xs text-slate-500">
                          {mj.location}{mj.remoteOk ? ' · Remote OK' : ''}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                {job.companyProfile && (
                  <Link
                    href={`/company-profiles/${job.companyProfile.slug}`}
                    className="mt-4 inline-block text-xs text-cyan-400 hover:underline"
                  >
                    View all {job.company} jobs &rarr;
                  </Link>
                )}
              </div>
            )}

            {similarRoles.length > 0 && (
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-slate-300 mb-3">Similar roles</h2>
                <ul className="space-y-3">
                  {similarRoles.map((sj) => (
                    <li key={sj.id}>
                      <Link href={`/space-talent/job/${sj.id}`} className="block group">
                        <div className="text-sm text-white group-hover:text-cyan-400 transition-colors">
                          {sj.title}
                        </div>
                        <div className="text-xs text-slate-500">
                          {sj.company} &middot; {sj.location}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="card p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-2">All space industry jobs</h2>
              <p className="text-xs text-slate-500 mb-3">
                Browse {catLabel?.label || 'all'} roles and thousands more ATS-synced listings across the space
                industry.
              </p>
              <Link href="/space-talent" className="text-xs text-cyan-400 hover:underline">
                Explore Space Talent &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
