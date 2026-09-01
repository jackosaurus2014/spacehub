/**
 * /jobs hub loader (2026-09-01).
 *
 * The masthead "Jobs" link is the site's hottest business entry, but until
 * now /jobs was a permanent redirect into the client-rendered Space Talent
 * board — ~8,400 synced ATS postings with no crawlable hub. This module reads
 * the hub's first screen (counts, categories, top employers, newest roles)
 * straight from SpaceJobPosting and hands the page plain JSON (ISO strings,
 * no Dates) so it can be cached with unstable_cache and rendered on the
 * server. DB at request time → the page must stay force-dynamic (the Railway
 * build container has no database).
 */
import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { JOB_CATEGORIES } from '@/types';
import type { JobCategory } from '@/types';

export const JOBS_HUB_REVALIDATE_SECONDS = 600;
export const NEWEST_POSTINGS_LIMIT = 25;
export const TOP_COMPANIES_LIMIT = 15;

export interface JobsHubCategory {
  value: JobCategory;
  label: string;
  icon: string;
  count: number;
}

export interface JobsHubCompany {
  name: string;
  /** CompanyProfile slug when the postings are linked to a profile. */
  slug: string | null;
  activeCount: number;
}

export interface JobsHubPosting {
  id: string;
  title: string;
  company: string;
  companySlug: string | null;
  location: string;
  remoteOk: boolean;
  category: string;
  employmentType: string | null;
  /** ISO 8601. */
  postedAt: string;
}

export interface JobsHubData {
  activeCount: number;
  companiesHiring: number;
  newLast7Days: number;
  remoteCount: number;
  categories: JobsHubCategory[];
  topCompanies: JobsHubCompany[];
  newest: JobsHubPosting[];
  /** ISO 8601 — when this snapshot was read. */
  asOf: string;
}

async function loadJobsHubData(): Promise<JobsHubData> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const active = { isActive: true } as const;

  const [activeCount, newLast7Days, remoteCount, companyGroups, categoryGroups, newestRows] = await Promise.all([
    prisma.spaceJobPosting.count({ where: active }),
    prisma.spaceJobPosting.count({ where: { ...active, postedDate: { gte: weekAgo } } }),
    prisma.spaceJobPosting.count({ where: { ...active, remoteOk: true } }),
    prisma.spaceJobPosting.groupBy({
      by: ['company'],
      where: active,
      _count: { _all: true },
      orderBy: { _count: { company: 'desc' } },
    }),
    prisma.spaceJobPosting.groupBy({
      by: ['category'],
      where: active,
      _count: { _all: true },
    }),
    prisma.spaceJobPosting.findMany({
      where: active,
      orderBy: [{ postedDate: 'desc' }, { id: 'asc' }],
      take: NEWEST_POSTINGS_LIMIT,
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        remoteOk: true,
        category: true,
        employmentType: true,
        postedDate: true,
        companyProfile: { select: { slug: true } },
      },
    }),
  ]);

  // Top employers: one groupBy row per company name; resolve profile slugs
  // in a single follow-up query (a company's rows may mix linked/unlinked).
  const topGroups = companyGroups.slice(0, TOP_COMPANIES_LIMIT);
  const topNames = topGroups.map((g) => g.company);
  const slugRows = topNames.length
    ? await prisma.spaceJobPosting.findMany({
        where: { ...active, company: { in: topNames }, companyProfileId: { not: null } },
        distinct: ['company'],
        select: { company: true, companyProfile: { select: { slug: true } } },
      })
    : [];
  const slugOf = new Map(slugRows.map((r) => [r.company, r.companyProfile?.slug ?? null]));

  const countOfCategory = new Map(categoryGroups.map((g) => [g.category, g._count._all]));

  return {
    activeCount,
    companiesHiring: companyGroups.length,
    newLast7Days,
    remoteCount,
    categories: JOB_CATEGORIES.map((c) => ({
      value: c.value,
      label: c.label,
      icon: c.icon,
      count: countOfCategory.get(c.value) ?? 0,
    })),
    topCompanies: topGroups.map((g) => ({
      name: g.company,
      slug: slugOf.get(g.company) ?? null,
      activeCount: g._count._all,
    })),
    newest: newestRows.map((r) => ({
      id: r.id,
      title: r.title,
      company: r.company,
      companySlug: r.companyProfile?.slug ?? null,
      location: r.location,
      remoteOk: r.remoteOk,
      category: r.category,
      employmentType: r.employmentType,
      postedAt: r.postedDate.toISOString(),
    })),
    asOf: now.toISOString(),
  };
}

/**
 * Cached hub snapshot. Returns null when the database is unreachable so the
 * page can render an honest empty state instead of a 500.
 */
export const getJobsHubData = unstable_cache(
  async (): Promise<JobsHubData | null> => {
    try {
      return await loadJobsHubData();
    } catch (error) {
      logger.error('Failed to load /jobs hub data', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  },
  ['jobs-hub-data'],
  { revalidate: JOBS_HUB_REVALIDATE_SECONDS, tags: ['jobs-hub'] },
);

const nf = new Intl.NumberFormat('en-US');

/**
 * "<title> — <N> Open Roles at <M> Companies", trimmed to fit a 60-char
 * SERP title. Falls back step by step when counts are missing or too wide.
 */
export function jobsHubTitle(data: Pick<JobsHubData, 'activeCount' | 'companiesHiring'> | null, max = 60): string {
  const base = 'Space Industry Jobs';
  if (!data || data.activeCount <= 0) return `${base} — Synced Daily from Company Boards`.slice(0, max);
  const roles = `${base} — ${nf.format(data.activeCount)} Open Roles`;
  const full = data.companiesHiring > 0 ? `${roles} at ${nf.format(data.companiesHiring)} Companies` : roles;
  if (full.length <= max) return full;
  if (roles.length <= max) return roles;
  return base;
}

// ── Location parsing for JSON-LD (mirrors the per-job page's approach) ──

const US_STATE_ABBRS = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
]);

export interface ParsedJobLocation {
  locality?: string;
  region?: string;
  country?: string;
}

/**
 * Best-effort "City, ST[, USA]" parse. Returns null for placeholders
 * ("Remote", "Various") so callers never fabricate a jobLocation — Google
 * penalises inaccurate location data more than it rewards a guess.
 */
export function parseJobLocation(location: string): ParsedJobLocation | null {
  const raw = (location || '').trim();
  if (!raw || /^(not specified|remote|various|multiple locations|tbd)$/i.test(raw)) return null;
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const last = parts[parts.length - 1];
  const isUS = /^(usa|u\.s\.a\.?|united states( of america)?|us)$/i.test(last) || US_STATE_ABBRS.has(last.toUpperCase());
  if (parts.length === 1) {
    return US_STATE_ABBRS.has(parts[0].toUpperCase()) ? { region: parts[0], country: 'US' } : { locality: parts[0] };
  }
  if (isUS) return { locality: parts[0], region: parts[1], country: 'US' };
  return { locality: parts[0], region: parts[1] };
}

const EMPLOYMENT_TYPE_SCHEMA: Record<string, string> = {
  full_time: 'FULL_TIME',
  part_time: 'PART_TIME',
  contract: 'CONTRACTOR',
  internship: 'INTERN',
};

/** schema.org JobPosting node for one hub row (no @context — nested in a graph). */
export function jobPostingNode(job: JobsHubPosting, baseUrl: string): Record<string, unknown> {
  const posted = new Date(job.postedAt);
  const validThrough = new Date(posted.getTime() + 60 * 86_400_000);
  const hiringOrganization: Record<string, unknown> = { '@type': 'Organization', name: job.company };
  if (job.companySlug) hiringOrganization.sameAs = `${baseUrl}/company-profiles/${job.companySlug}`;

  const node: Record<string, unknown> = {
    '@type': 'JobPosting',
    title: job.title,
    description: `${job.title} at ${job.company}. Located in ${job.location}.${job.remoteOk ? ' Remote-friendly.' : ''} View full details and apply on the official ${job.company} careers page.`,
    datePosted: posted.toISOString(),
    validThrough: validThrough.toISOString(),
    hiringOrganization,
    directApply: false,
    identifier: { '@type': 'PropertyValue', name: job.company, value: job.id },
    url: `${baseUrl}/space-talent/job/${job.id}`,
  };
  const employmentType = EMPLOYMENT_TYPE_SCHEMA[job.employmentType || ''];
  if (employmentType) node.employmentType = employmentType;

  const parsed = parseJobLocation(job.location);
  if (parsed) {
    const address: Record<string, string> = { '@type': 'PostalAddress' };
    if (parsed.locality) address.addressLocality = parsed.locality;
    if (parsed.region) address.addressRegion = parsed.region;
    if (parsed.country) address.addressCountry = parsed.country;
    node.jobLocation = { '@type': 'Place', address };
  } else if (job.remoteOk) {
    node.jobLocationType = 'TELECOMMUTE';
    node.applicantLocationRequirements = { '@type': 'Country', name: 'USA' };
  }
  return node;
}
