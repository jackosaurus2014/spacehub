import { cache } from 'react';
import prisma from '@/lib/db';
import { getJobsByCompany, type JobsByCompanyRow } from '@/lib/jobs-by-company';
import { salaryBandFor, type SalaryBand } from '@/lib/salary-estimate';
import { SALARY_ROLES, SALARY_DATA_AS_OF } from '@/lib/salary-data';

/**
 * Company salary pages (competitor review Tier 2 #8, 2026-09-13).
 *
 * /salaries and /salaries/[company] are built from the same rows as the
 * board: every live SpaceJobPosting for an employer, each carrying the band
 * the board already shows — the employer's stated range when the ATS
 * provides one, otherwise the SpaceNexus estimate from salary-estimate.ts.
 * This module clusters those rows into role families and locations and
 * summarises the bands; nothing here invents a number the board does not
 * already display. The label on an estimate is always ESTIMATE_LABEL.
 *
 * Eligibility: a company gets a page when it has at least
 * SALARY_PAGE_MIN_ROLES live roles (three) — below that a "median band" is
 * one posting wearing a hat. The company list reuses jobs-by-company's data
 * path so the two indexes never disagree about who is hiring.
 */

export const SALARY_PAGE_MIN_ROLES = 3;
export const ESTIMATE_LABEL = 'SpaceNexus estimate';
export const STATED_LABEL = 'Stated in posting';
/** How many role families / locations the company page tabulates. */
export const MAX_FAMILY_ROWS = 14;
export const MAX_LOCATION_ROWS = 10;

// ── Slugs ─────────────────────────────────────────────────────────────────

/** URL slug for a company name: "Blue Origin" → "blue-origin", "L3Harris" → "l3harris". */
export function salaryCompanySlug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Role families ─────────────────────────────────────────────────────────

export interface RoleFamilyDef {
  id: string;
  label: string;
  re: RegExp;
}

/**
 * Ordered — the first pattern that matches a title wins, so the specific
 * disciplines sit above the catch-alls (a "Director of Propulsion" is
 * propulsion, not leadership; an "Embedded Software Engineer" is avionics).
 * Technicians come first of all: a "Composite Technician" is shop floor,
 * not structures.
 */
export const ROLE_FAMILIES: readonly RoleFamilyDef[] = [
  { id: 'intern', label: 'Internships and co-ops', re: /\b(intern|internship|co-?op)\b/i },
  { id: 'manufacturing', label: 'Manufacturing and technicians', re: /\b(technician|manufactur\w*|machinist|welder|assembl\w*|fabricat\w*|production|cnc|tooling|process engineer|industrial engineer)\b/i },
  { id: 'data', label: 'Data, ML and AI', re: /\b(data (scientist|engineer|analyst|science)|machine learning|\bml\b|\bai\b|analytics)\b/i },
  { id: 'avionics', label: 'Avionics and electrical', re: /\b(avionics|electrical|electronics|embedded|firmware|fpga|pcb|power electronics|harness)\b/i },
  { id: 'software', label: 'Software engineering', re: /\b(software|developer|devops|sre|site reliability|full[- ]?stack|front[- ]?end|back[- ]?end|web|cloud|cyber\w*|platform engineer|simulation)\b/i },
  { id: 'propulsion', label: 'Propulsion', re: /\b(propulsion|engine|turbomachinery|combustion|thruster|turbopump|injector)\b/i },
  { id: 'gnc', label: 'GNC and flight dynamics', re: /\b(gnc|guidance|navigation|controls? engineer|flight dynamics|astrodynamics|orbit(al)? (analyst|dynamics)|trajectory)\b/i },
  { id: 'rf', label: 'RF, communications and antenna', re: /\b(rf|radio frequency|antenna|microwave|phased array|comm(unication)?s? (systems? )?engineer|signal processing)\b/i },
  { id: 'mechanical', label: 'Mechanical, structures and thermal', re: /\b(mechanical|structur(al|es)|stress|composites?|thermal|fluids?|cfd|fea|mechanisms?|design engineer)\b/i },
  { id: 'missionops', label: 'Mission and flight operations', re: /\b(mission (operations|ops|manager|director|control)|flight (operations|ops|controller|director)|operations engineer|satellite operat|spacecraft operat|ground (station|segment|systems)|launch (operations|engineer|director))\b/i },
  { id: 'systems', label: 'Systems engineering', re: /\b(systems? engineer|systems integration|mission systems|sys ?eng|systems architect)\b/i },
  { id: 'test', label: 'Test and integration', re: /\b(test|integration|qualification|verification|validation)\b/i },
  { id: 'quality', label: 'Quality, safety and mission assurance', re: /\b(quality|qa|mission assurance|safety|reliability|inspector|inspection)\b/i },
  { id: 'supply', label: 'Supply chain and procurement', re: /\b(supply chain|procurement|purchasing|buyer|logistics|sourcing|materials? planner|warehouse|inventory)\b/i },
  { id: 'science', label: 'Science and research', re: /\b(scientist|research\w*|physicist|astronom\w*|planetary|geolog\w*|chemist|biolog\w*|postdoc\w*)\b/i },
  { id: 'sales', label: 'Sales and business development', re: /\b(sales|business development|account (executive|manager|director)|customer success|partnerships?|solutions engineer|bd)\b/i },
  { id: 'marketing', label: 'Marketing and communications', re: /\b(marketing|communications?|content|brand|public relations|pr|social media|community manager)\b/i },
  { id: 'corporate', label: 'Finance, legal and people', re: /\b(finance|financial|accountant|accounting|controller|legal|counsel|paralegal|contracts?|compliance|hr|human resources|recruit\w*|talent|people (ops|operations|partner)|payroll|export control|administrative|executive assistant|office manager)\b/i },
  { id: 'facilities', label: 'Facilities, EHS and security', re: /\b(facilit\w*|ehs|environmental health|security|maintenance|janitorial|custodian)\b/i },
  { id: 'program', label: 'Program and project management', re: /\b(program|project|pmo|planner|scheduler|chief of staff|product manager|product owner)\b/i },
  { id: 'leadership', label: 'Executive and leadership', re: /\b(chief|vp|vice president|head of|director|president|general manager)\b/i },
  { id: 'engineering', label: 'Other engineering', re: /\bengineer/i },
];

export const OTHER_FAMILY = 'Other roles';

/** The role family a title belongs to (label), or OTHER_FAMILY. */
export function roleFamilyFor(title: string): string {
  const t = (title || '').replace(/[()/,&+_]/g, ' ');
  for (const fam of ROLE_FAMILIES) if (fam.re.test(t)) return fam.label;
  return OTHER_FAMILY;
}

// ── Bands ─────────────────────────────────────────────────────────────────

export interface SalaryJobInput {
  title: string;
  category?: string | null;
  seniorityLevel?: string | null;
  location?: string | null;
  remoteOk?: boolean | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryMedian?: number | null;
}

export interface BandStat {
  min: number;
  max: number;
  /** Rows this stat was taken over. */
  count: number;
}

/** The stated and estimated medians of a group, kept apart so the label is honest. */
export interface BandSummary {
  stated: BandStat | null;
  estimate: BandStat | null;
}

export interface DisplayBand {
  min: number;
  max: number;
  source: 'posting' | 'estimate';
  label: string;
  count: number;
}

const round1k = (n: number) => Math.round(n / 1000) * 1000;

/** Median of a list, rounded to the nearest $1k; null for an empty list. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return round1k(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
}

/** Median band of a group: median of the minimums and median of the maximums. */
export function medianBand(bands: SalaryBand[]): BandStat | null {
  if (bands.length === 0) return null;
  const min = median(bands.map((b) => b.min)) as number;
  const max = median(bands.map((b) => b.max)) as number;
  return { min, max: Math.max(min, max), count: bands.length };
}

export function summarizeBands(bands: SalaryBand[]): BandSummary {
  return {
    stated: medianBand(bands.filter((b) => b.source === 'posting')),
    estimate: medianBand(bands.filter((b) => b.source === 'estimate')),
  };
}

/** The band a row displays: the stated median when any posting states one, else the estimate. */
export function displayBand(s: BandSummary | null | undefined): DisplayBand | null {
  if (!s) return null;
  if (s.stated) return { min: s.stated.min, max: s.stated.max, source: 'posting', label: STATED_LABEL, count: s.stated.count };
  if (s.estimate) return { min: s.estimate.min, max: s.estimate.max, source: 'estimate', label: ESTIMATE_LABEL, count: s.estimate.count };
  return null;
}

export function formatRange(min: number, max: number): string {
  const k = (n: number) => `$${Math.round(n / 1000)}k`;
  return min === max ? k(min) : `${k(min)}–${k(max)}`;
}

/** Median of the curated dataset's role medians — the industry line every company is compared to. */
export function industryBenchmarkMedian(): number {
  return median(SALARY_ROLES.map((r) => r.salaryRange.median)) ?? 0;
}

// ── Aggregation ───────────────────────────────────────────────────────────

export interface RoleFamilyRow {
  family: string;
  count: number;
  summary: BandSummary;
  /** Up to three live titles, for the row's hover text. */
  sampleTitles: string[];
}

export interface LocationRow {
  location: string;
  count: number;
  summary: BandSummary;
}

export interface Benchmark {
  /** Midpoint of the company's median band, all bands combined. */
  companyMidpoint: number;
  industryMedian: number;
  /** Rounded percent; positive when the company sits above the benchmark. */
  deltaPct: number;
  asOf: string;
}

export interface CompanySalarySummary {
  name: string;
  slug: string;
  profileSlug: string | null;
  openRoles: number;
  /** Rows with any band at all (some titles match nothing in the dataset). */
  withBand: number;
  statedCount: number;
  estimateCount: number;
  /** Share of open roles whose posting states a range, 0–100. */
  statedSharePct: number;
  remoteCount: number;
  /** All bands combined — the headline figure. */
  overall: BandStat | null;
  /** Stated and estimated medians of every role, kept apart. */
  summary: BandSummary;
  /** Bands of engineering-category roles, for the "how much do engineers make" answer. */
  engineering: BandSummary;
  families: RoleFamilyRow[];
  locations: LocationRow[];
  benchmark: Benchmark | null;
}

export function locationLabel(job: Pick<SalaryJobInput, 'location' | 'remoteOk'>): string {
  const raw = (job.location || '').trim();
  if (!raw || /^remote\b/i.test(raw)) return 'Remote';
  return raw.replace(/\s+/g, ' ');
}

/** Pure: cluster one employer's live rows into the shape the page renders. */
export function aggregateCompany(
  name: string,
  jobs: SalaryJobInput[],
  opts: { profileSlug?: string | null; industryMedian?: number } = {}
): CompanySalarySummary {
  const banded = jobs.map((job) => ({ job, band: salaryBandFor(job) }));
  const bands = banded.map((b) => b.band).filter((b): b is SalaryBand => b != null);
  const statedCount = bands.filter((b) => b.source === 'posting').length;
  const estimateCount = bands.length - statedCount;

  const familyMap = new Map<string, { bands: SalaryBand[]; count: number; titles: string[] }>();
  for (const { job, band } of banded) {
    const fam = roleFamilyFor(job.title);
    const entry = familyMap.get(fam) ?? { bands: [], count: 0, titles: [] };
    entry.count += 1;
    if (band) entry.bands.push(band);
    if (entry.titles.length < 3 && !entry.titles.includes(job.title)) entry.titles.push(job.title);
    familyMap.set(fam, entry);
  }
  const families: RoleFamilyRow[] = [...familyMap.entries()]
    .map(([family, e]) => ({ family, count: e.count, summary: summarizeBands(e.bands), sampleTitles: e.titles }))
    .sort((a, b) => b.count - a.count || a.family.localeCompare(b.family))
    .slice(0, MAX_FAMILY_ROWS);

  const locMap = new Map<string, { bands: SalaryBand[]; count: number }>();
  for (const { job, band } of banded) {
    const loc = locationLabel(job);
    const entry = locMap.get(loc) ?? { bands: [], count: 0 };
    entry.count += 1;
    if (band) entry.bands.push(band);
    locMap.set(loc, entry);
  }
  const locations: LocationRow[] = [...locMap.entries()]
    .map(([location, e]) => ({ location, count: e.count, summary: summarizeBands(e.bands) }))
    .sort((a, b) => b.count - a.count || a.location.localeCompare(b.location))
    .slice(0, MAX_LOCATION_ROWS);

  const overall = medianBand(bands);
  const industryMedian = opts.industryMedian ?? industryBenchmarkMedian();
  const benchmark: Benchmark | null = overall && industryMedian > 0
    ? (() => {
        const companyMidpoint = round1k((overall.min + overall.max) / 2);
        return { companyMidpoint, industryMedian, deltaPct: Math.round(((companyMidpoint - industryMedian) / industryMedian) * 100), asOf: SALARY_DATA_AS_OF };
      })()
    : null;

  return {
    name,
    slug: salaryCompanySlug(name),
    profileSlug: opts.profileSlug ?? null,
    openRoles: jobs.length,
    withBand: bands.length,
    statedCount,
    estimateCount,
    statedSharePct: jobs.length ? Math.round((statedCount / jobs.length) * 100) : 0,
    remoteCount: jobs.filter((j) => j.remoteOk || locationLabel(j) === 'Remote').length,
    overall,
    summary: summarizeBands(bands),
    engineering: summarizeBands(banded.filter((b) => b.job.category === 'engineering').map((b) => b.band).filter((b): b is SalaryBand => b != null)),
    families,
    locations,
    benchmark,
  };
}

/** Pure: the board-wide role families for the index, largest first. */
export function aggregateFamilies(jobs: SalaryJobInput[], limit = 12): RoleFamilyRow[] {
  return aggregateCompany('board', jobs, { industryMedian: 1 }).families.slice(0, limit);
}

/** Eligibility rule, in one place so the index, the page and the exists probe agree. */
export function isSalaryEligible(row: Pick<JobsByCompanyRow, 'activeCount'>): boolean {
  return row.activeCount >= SALARY_PAGE_MIN_ROLES;
}

// ── Metadata ──────────────────────────────────────────────────────────────

/** Title/description for /salaries/[company]; no brand suffix (the root template appends it). */
export function companyMetadataText(s: Pick<CompanySalarySummary, 'name' | 'openRoles' | 'overall' | 'statedCount' | 'families'>): { title: string; description: string } {
  const band = s.overall ? formatRange(s.overall.min, s.overall.max) : null;
  const title = band
    ? `${s.name} Salaries: ${band} Median Band Across ${s.openRoles.toLocaleString('en-US')} Open Roles`
    : `${s.name} Salaries: ${s.openRoles.toLocaleString('en-US')} Open Roles by Title and Location`;
  const top = s.families.slice(0, 3).map((f) => f.family.toLowerCase()).join(', ');
  const stated = s.statedCount > 0
    ? `${s.statedCount.toLocaleString('en-US')} state a range in the posting; the rest carry a ${ESTIMATE_LABEL}.`
    : `None state a range in the posting, so every band is a ${ESTIMATE_LABEL} from our benchmark dataset.`;
  const description = `What ${s.name} pays, from its ${s.openRoles.toLocaleString('en-US')} live roles${top ? ` in ${top}` : ''}: salary bands by role family and location, compared with the space-industry benchmark. ${stated} Synced daily from ${s.name}'s careers page.`;
  return { title, description };
}

/** Title/description for /salaries. */
export function indexMetadataText(companyCount: number, roleCount: number): { title: string; description: string } {
  const title = companyCount
    ? `Space Company Salaries: ${companyCount.toLocaleString('en-US')} Employers, ${roleCount.toLocaleString('en-US')} Roles With Salary Bands`
    : 'Space Company Salaries';
  const description = `Salary bands at every space and aerospace employer with three or more open roles — SpaceX, Blue Origin, Rocket Lab, Lockheed Martin, Northrop Grumman and more — ranked by live positions with the median band for each, plus what the biggest role families pay across the board. Employer-stated ranges where postings have them, ${ESTIMATE_LABEL}s elsewhere.`;
  return { title, description };
}

export function fmtDateUtc(d: Date): string {
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
}

/** The three FAQ entries on /salaries/[company]; also the FAQPage JSON-LD. */
export function companyFaqs(s: CompanySalarySummary, asOf: Date): { q: string; a: string }[] {
  const eng = displayBand(s.engineering);
  const overall = s.overall ? formatRange(s.overall.min, s.overall.max) : null;
  const top = s.families.slice(0, 3).map((f) => `${f.family.toLowerCase()} (${f.count})`).join(', ');
  const locs = s.locations.slice(0, 3).map((l) => l.location).join(', ');
  const engAnswer = eng
    ? `Engineering roles at ${s.name} currently show a median band of ${formatRange(eng.min, eng.max)} per year across ${eng.count} live listing${eng.count === 1 ? '' : 's'} (${eng.source === 'posting' ? 'ranges stated in the postings' : `${ESTIMATE_LABEL}s, matched to each title and adjusted for seniority and location`}).${overall ? ` Across all ${s.openRoles} open roles the median band is ${overall}.` : ''}`
    : overall
      ? `${s.name} has no engineering-category roles open right now. Across its ${s.openRoles} open roles the median band is ${overall} per year.`
      : `${s.name} has ${s.openRoles} open roles, but none of the titles match our benchmark dataset closely enough to estimate a band yet.`;
  return [
    { q: `How much does ${s.name} pay engineers?`, a: engAnswer },
    {
      q: `How many open roles does ${s.name} have?`,
      a: `${s.openRoles} live roles as of ${fmtDateUtc(asOf)}, synced from ${s.name}'s own careers page${top ? `, led by ${top}` : ''}.${locs ? ` The largest locations are ${locs}.` : ''}${s.remoteCount > 0 ? ` ${s.remoteCount} ${s.remoteCount === 1 ? 'is' : 'are'} remote-friendly.` : ''}`,
    },
    {
      q: `Are these ${s.name} salaries stated by the company or estimated?`,
      a: s.statedCount > 0
        ? `${s.statedCount} of ${s.openRoles} postings (${s.statedSharePct}%) state a salary range; those are shown verbatim and labelled "${STATED_LABEL}". The rest carry a ${ESTIMATE_LABEL}: our benchmark dataset of ${SALARY_ROLES.length} roles (as of ${SALARY_DATA_AS_OF}) matched to the title and adjusted for seniority and metro. Estimates are guidance, not offers.`
        : `None of ${s.name}'s ${s.openRoles} current postings state a range, so every band on this page is a ${ESTIMATE_LABEL}: our benchmark dataset of ${SALARY_ROLES.length} roles (as of ${SALARY_DATA_AS_OF}) matched to the title and adjusted for seniority and metro. Estimates are guidance, not offers.`,
    },
  ];
}

// ── Data path ─────────────────────────────────────────────────────────────

const JOB_SELECT = {
  title: true,
  category: true,
  seniorityLevel: true,
  location: true,
  remoteOk: true,
  salaryMin: true,
  salaryMax: true,
  salaryMedian: true,
} as const;

function liveWhere(now: Date) {
  return { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}

export interface SalaryCompanyIndexRow extends JobsByCompanyRow {
  salarySlug: string;
  overall: BandStat | null;
  statedCount: number;
}

/**
 * Every company eligible for a salary page, ranked by open roles, with its
 * median band; plus the board-wide role families. One pass over the live
 * rows of the eligible companies.
 */
export const getSalaryCompanies = cache(async (): Promise<{ companies: SalaryCompanyIndexRow[]; families: RoleFamilyRow[]; totalRoles: number; asOf: Date }> => {
  const { rows, asOf } = await getJobsByCompany(SALARY_PAGE_MIN_ROLES);
  const eligible = rows.filter(isSalaryEligible);
  const names = eligible.map((r) => r.name);
  const jobs = names.length
    ? await prisma.spaceJobPosting.findMany({ where: { ...liveWhere(asOf), company: { in: names } }, select: { ...JOB_SELECT, company: true } })
    : [];
  const byCompany = new Map<string, SalaryJobInput[]>();
  for (const j of jobs) {
    const list = byCompany.get(j.company) ?? [];
    list.push(j);
    byCompany.set(j.company, list);
  }
  // Two names that slug identically (rare: "Astra" / "ASTRA") keep the larger one.
  const seen = new Set<string>();
  const companies: SalaryCompanyIndexRow[] = [];
  for (const row of eligible) {
    const salarySlug = salaryCompanySlug(row.name);
    if (!salarySlug || seen.has(salarySlug)) continue;
    seen.add(salarySlug);
    const bands = (byCompany.get(row.name) ?? []).map((j) => salaryBandFor(j)).filter((b): b is SalaryBand => b != null);
    companies.push({ ...row, salarySlug, overall: medianBand(bands), statedCount: bands.filter((b) => b.source === 'posting').length });
  }
  return { companies, families: aggregateFamilies(jobs), totalRoles: jobs.length, asOf };
});

/** The company behind a /salaries/[company] slug, or null when it has no page. */
export const resolveSalaryCompany = cache(async (slug: string): Promise<JobsByCompanyRow | null> => {
  const wanted = salaryCompanySlug(slug);
  if (!wanted) return null;
  const { rows } = await getJobsByCompany(SALARY_PAGE_MIN_ROLES);
  return rows.filter(isSalaryEligible).find((r) => salaryCompanySlug(r.name) === wanted) ?? null;
});

/** Full page data for one company, or null when it has no page. */
export const getCompanySalaries = cache(async (slug: string): Promise<(CompanySalarySummary & { asOf: Date }) | null> => {
  const row = await resolveSalaryCompany(slug);
  if (!row) return null;
  const asOf = new Date();
  const jobs = await prisma.spaceJobPosting.findMany({ where: { ...liveWhere(asOf), company: row.name }, select: JOB_SELECT, orderBy: { postedDate: 'desc' } });
  if (jobs.length < SALARY_PAGE_MIN_ROLES) return null;
  return { ...aggregateCompany(row.name, jobs, { profileSlug: row.slug }), asOf };
});

/** True when an employer has enough live roles for a salary page (job-page link gate). */
export const hasSalaryPage = cache(async (company: string): Promise<boolean> => {
  const n = await prisma.spaceJobPosting.count({ where: { ...liveWhere(new Date()), company } });
  return n >= SALARY_PAGE_MIN_ROLES;
});
