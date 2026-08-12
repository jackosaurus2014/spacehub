// ─── ATS Jobs Fetcher ────────────────────────────────────────────────────────
// Pulls live job postings from public applicant-tracking-system APIs
// (Greenhouse Job Board API, Lever Postings API, Ashby Posting API) for
// space companies with public boards, and syncs them into SpaceJobPosting.
//
// - Upserts by { source, externalId } so re-runs are idempotent.
// - Soft-expires postings that vanish from a board (isActive: false).
// - Skips a whole board on fetch failure — never wipes its existing jobs.

import prisma from '../db';
import { logger } from '../logger';

export type ATSProvider = 'greenhouse' | 'lever' | 'ashby';

export interface ATSBoard {
  provider: ATSProvider;
  token: string;
  company: string;
  /** Verified CompanyProfile.slug (see scripts/seed-company-profiles.ts + batch seeds) */
  companyProfileSlug?: string;
}

export const ATS_BOARDS: ATSBoard[] = [
  // Greenhouse
  { provider: 'greenhouse', token: 'spacex', company: 'SpaceX', companyProfileSlug: 'spacex' },
  { provider: 'greenhouse', token: 'andurilindustries', company: 'Anduril', companyProfileSlug: 'anduril-industries' },
  { provider: 'greenhouse', token: 'rocketlab', company: 'Rocket Lab', companyProfileSlug: 'rocket-lab' },
  { provider: 'greenhouse', token: 'relativity', company: 'Relativity Space', companyProfileSlug: 'relativity-space' },
  { provider: 'greenhouse', token: 'k2spacecorporation', company: 'K2 Space', companyProfileSlug: 'k2-space' },
  { provider: 'greenhouse', token: 'vast', company: 'Vast', companyProfileSlug: 'vast' },
  { provider: 'greenhouse', token: 'trueanomalyinc', company: 'True Anomaly', companyProfileSlug: 'true-anomaly' },
  { provider: 'greenhouse', token: 'voyagertechnologiesinc', company: 'Voyager Technologies', companyProfileSlug: 'voyager-space' },
  { provider: 'greenhouse', token: 'vardaspace', company: 'Varda Space Industries', companyProfileSlug: 'varda-space-industries' },
  { provider: 'greenhouse', token: 'ursamajor', company: 'Ursa Major', companyProfileSlug: 'ursa-major' },
  { provider: 'greenhouse', token: 'astranis', company: 'Astranis', companyProfileSlug: 'astranis' },
  { provider: 'greenhouse', token: 'planetlabs', company: 'Planet', companyProfileSlug: 'planet-labs' },
  { provider: 'greenhouse', token: 'muonspace', company: 'Muon Space', companyProfileSlug: 'muon-space' },
  { provider: 'greenhouse', token: 'stokespacetechnologies', company: 'Stoke Space', companyProfileSlug: 'stoke-space' },
  // Lever
  { provider: 'lever', token: 'hermeus', company: 'Hermeus', companyProfileSlug: 'hermeus' },
  // Ashby
  { provider: 'ashby', token: 'hadrian-automation', company: 'Hadrian', companyProfileSlug: 'hadrian' },
];

const FETCH_TIMEOUT_MS = 10_000;
const DESCRIPTION_MAX_CHARS = 5_000;

// ─── Pure classification helpers (unit-tested) ──────────────────────────────

const LEGAL_KEYWORDS = ['legal', 'counsel', 'attorney', 'paralegal', 'compliance', 'regulatory', 'export control'];
const RESEARCH_KEYWORDS = ['research', 'scientist', 'science', 'r&d', 'phd'];
const MANUFACTURING_KEYWORDS = [
  'manufactur', 'machinist', 'technician', 'welder', 'weld', 'assembl', 'fabricat',
  'cnc', 'production', 'quality inspector', 'tooling',
];
const OPERATIONS_KEYWORDS = [
  'operations', 'mission control', 'logistics', 'supply chain', 'facilities',
  'launch site', 'range', 'ehs', 'safety', 'security officer', 'it support',
];
const BUSINESS_KEYWORDS = [
  'sales', 'marketing', 'finance', 'accounting', 'accountant', 'business development',
  'people', 'talent', 'recruit', 'human resources', 'hr ', 'communications', 'brand',
  'growth', 'partnership', 'procurement', 'buyer', 'customer success', 'account executive',
  'business operations',
];

/**
 * Classify a job into a SpaceJobPosting category from its department + title.
 * Defaults to 'engineering' (most space-company postings are engineering).
 */
export function classifyCategory(dept: string | null | undefined, title: string): string {
  const text = `${dept || ''} ${title || ''}`.toLowerCase();

  if (LEGAL_KEYWORDS.some((kw) => text.includes(kw))) return 'legal';
  if (RESEARCH_KEYWORDS.some((kw) => text.includes(kw))) return 'research';
  if (MANUFACTURING_KEYWORDS.some((kw) => text.includes(kw))) return 'manufacturing';
  if (OPERATIONS_KEYWORDS.some((kw) => text.includes(kw))) return 'operations';
  if (BUSINESS_KEYWORDS.some((kw) => text.includes(kw))) return 'business';
  return 'engineering';
}

/**
 * Derive seniority level from a job title.
 * intern/associate/junior → entry; senior → senior; staff/principal/lead → lead;
 * director → director; vp → vp; chief → c_suite; default mid.
 */
export function deriveSeniority(title: string): string {
  const t = (title || '').toLowerCase();

  if (/\bchief\b|\bc[eotf]o\b/.test(t)) return 'c_suite';
  if (/\bvp\b|vice president/.test(t)) return 'vp';
  if (/\bdirector\b/.test(t)) return 'director';
  if (/\bstaff\b|\bprincipal\b|\blead\b/.test(t)) return 'lead';
  if (/\bsenior\b|\bsr\.?\b/.test(t)) return 'senior';
  if (/\bintern\b|\binternship\b|\bassociate\b|\bjunior\b|\bjr\.?\b|entry.level|new grad|early career/.test(t)) return 'entry';
  return 'mid';
}

/**
 * Determine remote-friendliness per provider convention:
 * Greenhouse — location string contains 'remote';
 * Lever — workplaceType === 'remote';
 * Ashby — isRemote boolean.
 */
export function parseRemote(
  provider: ATSProvider,
  input: { location?: string | null; workplaceType?: string | null; isRemote?: boolean | null },
): boolean {
  switch (provider) {
    case 'greenhouse':
      return (input.location || '').toLowerCase().includes('remote');
    case 'lever':
      return (input.workplaceType || '').toLowerCase() === 'remote';
    case 'ashby':
      return input.isRemote === true;
    default:
      return false;
  }
}

/**
 * Normalize provider employment-type strings to SpaceJobPosting values
 * (full_time, part_time, contract, internship). Unknown → null.
 */
export function mapEmploymentType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.toLowerCase().replace(/[\s_-]+/g, '');
  if (t === 'fulltime' || t === 'full') return 'full_time';
  if (t === 'parttime' || t === 'part') return 'part_time';
  if (t === 'contract' || t === 'contractor' || t === 'temporary' || t === 'temp') return 'contract';
  if (t === 'intern' || t === 'internship') return 'internship';
  return null;
}

/**
 * Detect a security-clearance requirement from title + description keywords.
 */
export function detectClearance(text: string | null | undefined): boolean {
  if (!text) return false;
  return /clearance|ts\/sci|top secret|\bsecret\b/i.test(text);
}

// ─── Normalized job shape ───────────────────────────────────────────────────

interface NormalizedJob {
  externalId: string;
  title: string;
  location: string;
  remoteOk: boolean;
  description: string | null;
  employmentType: string | null;
  category: string;
  seniorityLevel: string;
  salaryMin: number | null;
  salaryMax: number | null;
  clearanceRequired: boolean;
  postedDate: Date;
  sourceUrl: string | null;
}

function truncate(text: string | null | undefined, max = DESCRIPTION_MAX_CHARS): string | null {
  if (!text) return null;
  return text.length > max ? text.slice(0, max) : text;
}

function toDate(value: unknown): Date {
  if (typeof value === 'number') {
    const d = new Date(value); // epoch ms (Lever createdAt)
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

// ─── Provider fetchers ──────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

async function fetchGreenhouseJobs(token: string): Promise<NormalizedJob[]> {
  // NOTE: no ?content=true — skip descriptions to keep volume boards (SpaceX ~2k jobs) light
  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Greenhouse ${token} HTTP ${res.status}`);
  const data = await res.json();
  const jobs: any[] = Array.isArray(data?.jobs) ? data.jobs : [];

  return jobs
    .filter((j) => j?.id != null && j?.title)
    .map((j): NormalizedJob => {
      const location = j.location?.name || 'Not specified';
      const dept = Array.isArray(j.departments) && j.departments[0]?.name ? j.departments[0].name : null;
      const title = String(j.title);
      return {
        externalId: String(j.id),
        title,
        location,
        remoteOk: parseRemote('greenhouse', { location }),
        description: null, // descriptions intentionally skipped for Greenhouse volume boards
        employmentType: null, // not exposed by the Greenhouse jobs list endpoint
        category: classifyCategory(dept, title),
        seniorityLevel: deriveSeniority(title),
        salaryMin: null,
        salaryMax: null,
        clearanceRequired: detectClearance(title),
        postedDate: toDate(j.first_published || j.updated_at),
        sourceUrl: j.absolute_url || null,
      };
    });
}

async function fetchLeverJobs(token: string): Promise<NormalizedJob[]> {
  const res = await fetch(`https://api.lever.co/v0/postings/${token}?mode=json`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Lever ${token} HTTP ${res.status}`);
  const data = await res.json();
  const jobs: any[] = Array.isArray(data) ? data : [];

  return jobs
    .filter((j) => j?.id && j?.text)
    .map((j): NormalizedJob => {
      const title = String(j.text);
      const description = truncate(j.descriptionPlain);
      let salaryMin: number | null = null;
      let salaryMax: number | null = null;
      const range = j.salaryRange;
      if (range && typeof range.min === 'number' && typeof range.max === 'number') {
        const interval = String(range.interval || '').toLowerCase();
        const isAnnual = interval.includes('year') || range.min >= 10_000;
        const isUSD = !range.currency || String(range.currency).toUpperCase() === 'USD';
        if (isAnnual && isUSD) {
          salaryMin = range.min;
          salaryMax = range.max;
        }
      }
      return {
        externalId: String(j.id),
        title,
        location: j.categories?.location || 'Not specified',
        remoteOk: parseRemote('lever', { workplaceType: j.workplaceType }),
        description,
        employmentType: mapEmploymentType(j.categories?.commitment),
        category: classifyCategory(j.categories?.team || j.categories?.department, title),
        seniorityLevel: deriveSeniority(title),
        salaryMin,
        salaryMax,
        clearanceRequired: detectClearance(`${title} ${description || ''}`),
        postedDate: toDate(j.createdAt),
        sourceUrl: j.hostedUrl || null,
      };
    });
}

async function fetchAshbyJobs(token: string): Promise<NormalizedJob[]> {
  const res = await fetch(
    `https://api.ashbyhq.com/posting-api/job-board/${token}?includeCompensation=true`,
    {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    },
  );
  if (!res.ok) throw new Error(`Ashby ${token} HTTP ${res.status}`);
  const data = await res.json();
  const jobs: any[] = Array.isArray(data?.jobs) ? data.jobs : [];

  return jobs
    .filter((j) => j?.id && j?.title)
    .map((j): NormalizedJob => {
      const title = String(j.title);
      const description = truncate(j.descriptionPlain);
      let salaryMin: number | null = null;
      let salaryMax: number | null = null;
      const components = j.compensation?.summaryComponents;
      if (Array.isArray(components)) {
        const salary = components.find(
          (c: any) => String(c?.compensationType || '').toLowerCase() === 'salary',
        );
        if (salary && typeof salary.minValue === 'number' && typeof salary.maxValue === 'number') {
          salaryMin = salary.minValue;
          salaryMax = salary.maxValue;
        }
      }
      return {
        externalId: String(j.id),
        title,
        location: j.location || 'Not specified',
        remoteOk: parseRemote('ashby', { isRemote: j.isRemote }),
        description,
        employmentType: mapEmploymentType(j.employmentType),
        category: classifyCategory(j.department || j.team, title),
        seniorityLevel: deriveSeniority(title),
        salaryMin,
        salaryMax,
        clearanceRequired: detectClearance(`${title} ${description || ''}`),
        postedDate: toDate(j.publishedAt),
        sourceUrl: j.jobUrl || j.applyUrl || null,
      };
    });
}

/* eslint-enable @typescript-eslint/no-explicit-any */

async function fetchBoardJobs(board: ATSBoard): Promise<NormalizedJob[]> {
  switch (board.provider) {
    case 'greenhouse':
      return fetchGreenhouseJobs(board.token);
    case 'lever':
      return fetchLeverJobs(board.token);
    case 'ashby':
      return fetchAshbyJobs(board.token);
  }
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

export interface ATSSyncResult {
  boards: number;
  jobsUpserted: number;
  jobsDeactivated: number;
  failures: string[];
}

/**
 * Fetch all configured ATS boards and sync postings into SpaceJobPosting.
 * Runs daily via cron ('/api/refresh?type=ats-jobs').
 */
export async function fetchAndStoreATSJobs(): Promise<ATSSyncResult> {
  const result: ATSSyncResult = { boards: 0, jobsUpserted: 0, jobsDeactivated: 0, failures: [] };

  // Resolve verified CompanyProfile slugs → ids for linking
  const slugs = ATS_BOARDS.map((b) => b.companyProfileSlug).filter((s): s is string => !!s);
  const profileIdBySlug = new Map<string, string>();
  try {
    const profiles = await prisma.companyProfile.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true },
    });
    for (const p of profiles) profileIdBySlug.set(p.slug, p.id);
  } catch (err) {
    logger.warn('ATS jobs: company profile lookup failed, syncing without profile links', {
      error: String(err),
    });
  }

  for (const board of ATS_BOARDS) {
    let jobs: NormalizedJob[];
    try {
      jobs = await fetchBoardJobs(board);
    } catch (err) {
      // Skip the whole board — existing postings stay active until a successful sync
      result.failures.push(`${board.provider}:${board.token}`);
      logger.warn('ATS board fetch failed, skipping', {
        provider: board.provider,
        token: board.token,
        error: String(err),
      });
      continue;
    }

    const companyProfileId = board.companyProfileSlug
      ? profileIdBySlug.get(board.companyProfileSlug) || null
      : null;
    const seenIds: string[] = [];
    let boardUpserted = 0;

    for (const job of jobs) {
      try {
        const salaryMedian =
          job.salaryMin != null && job.salaryMax != null ? (job.salaryMin + job.salaryMax) / 2 : null;
        await prisma.spaceJobPosting.upsert({
          where: {
            source_externalId: { source: board.provider, externalId: job.externalId },
          },
          create: {
            source: board.provider,
            externalId: job.externalId,
            title: job.title,
            company: board.company,
            companyProfileId,
            location: job.location,
            remoteOk: job.remoteOk,
            description: job.description,
            employmentType: job.employmentType,
            category: job.category,
            seniorityLevel: job.seniorityLevel,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryMedian,
            clearanceRequired: job.clearanceRequired,
            isActive: true,
            postedDate: job.postedDate,
            sourceUrl: job.sourceUrl,
          },
          update: {
            title: job.title,
            company: board.company,
            companyProfileId,
            location: job.location,
            remoteOk: job.remoteOk,
            description: job.description,
            employmentType: job.employmentType,
            category: job.category,
            seniorityLevel: job.seniorityLevel,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryMedian,
            clearanceRequired: job.clearanceRequired,
            isActive: true,
            postedDate: job.postedDate,
            sourceUrl: job.sourceUrl,
          },
        });
        seenIds.push(job.externalId);
        boardUpserted++;
      } catch (err) {
        logger.warn('ATS job upsert failed', {
          provider: board.provider,
          token: board.token,
          externalId: job.externalId,
          error: String(err),
        });
      }
    }

    // Soft-expire postings that vanished from this board.
    // Guard: if the board returned jobs but every upsert failed (DB issue),
    // don't mass-deactivate — wait for a healthy sync.
    if (jobs.length > 0 && seenIds.length === 0) {
      result.boards++;
      continue;
    }
    try {
      const deactivated = await prisma.spaceJobPosting.updateMany({
        where: {
          source: board.provider,
          company: board.company,
          externalId: { notIn: seenIds },
          isActive: true,
        },
        data: { isActive: false },
      });
      result.jobsDeactivated += deactivated.count;
    } catch (err) {
      logger.warn('ATS job deactivation failed', {
        provider: board.provider,
        token: board.token,
        error: String(err),
      });
    }

    result.boards++;
    result.jobsUpserted += boardUpserted;
  }

  logger.info('ATS jobs sync complete', { ...result, failures: result.failures.join(',') || 'none' });
  return result;
}
