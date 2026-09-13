/**
 * @jest-environment node
 */
/**
 * Company salary pages (competitor review Tier 2 #8, 2026-09-13):
 *   - role-family clustering (first matching pattern wins; specific before generic)
 *   - median band arithmetic and the stated-vs-estimate split
 *   - the "SpaceNexus estimate" label matches the board and the job page
 *   - the eligibility threshold (SALARY_PAGE_MIN_ROLES) in the aggregation
 *     and in the data path (mocked Prisma)
 *   - metadata title/description composition (live counts, no brand suffix)
 */
import fs from 'fs';
import path from 'path';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    spaceJobPosting: { groupBy: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  },
}));

import prisma from '@/lib/db';
import type { SalaryBand } from '@/lib/salary-estimate';
import {
  SALARY_PAGE_MIN_ROLES,
  ESTIMATE_LABEL,
  STATED_LABEL,
  OTHER_FAMILY,
  ROLE_FAMILIES,
  roleFamilyFor,
  salaryCompanySlug,
  median,
  medianBand,
  summarizeBands,
  displayBand,
  formatRange,
  industryBenchmarkMedian,
  aggregateCompany,
  aggregateFamilies,
  isSalaryEligible,
  companyMetadataText,
  indexMetadataText,
  companyFaqs,
  getSalaryCompanies,
  resolveSalaryCompany,
  getCompanySalaries,
  hasSalaryPage,
  type SalaryJobInput,
} from '@/lib/salaries-by-company';

const db = prisma as unknown as { spaceJobPosting: Record<'groupBy' | 'count' | 'findMany', jest.Mock> };

const band = (min: number, max: number, source: SalaryBand['source'] = 'estimate'): SalaryBand => ({ min, max, median: null, source });

describe('roleFamilyFor', () => {
  it.each([
    ['Senior Propulsion Engineer', 'Propulsion'],
    ['Director of Propulsion', 'Propulsion'],
    ['Turbomachinery Lead', 'Propulsion'],
    ['Embedded Software Engineer', 'Avionics and electrical'],
    ['Software Engineer, Flight Software', 'Software engineering'],
    ['GNC Engineer', 'GNC and flight dynamics'],
    ['RF Engineer II', 'RF, communications and antenna'],
    ['Structures Engineer', 'Mechanical, structures and thermal'],
    ['Flight Controller', 'Mission and flight operations'],
    ['Systems Engineer - Starship', 'Systems engineering'],
    ['Integration and Test Engineer', 'Test and integration'],
    ['Quality Inspector', 'Quality, safety and mission assurance'],
    ['Composite Technician', 'Manufacturing and technicians'],
    ['Propulsion Test Technician', 'Manufacturing and technicians'],
    ['Supply Chain Manager', 'Supply chain and procurement'],
    ['Planetary Scientist', 'Science and research'],
    ['Data Scientist', 'Data, ML and AI'],
    ['Account Executive', 'Sales and business development'],
    ['Marketing Manager', 'Marketing and communications'],
    ['Corporate Counsel', 'Finance, legal and people'],
    ['Contracts Manager', 'Finance, legal and people'],
    ['Program Manager', 'Program and project management'],
    ['Vice President, Government Affairs', 'Executive and leadership'],
    ['Propulsion Intern (Summer 2027)', 'Internships and co-ops'],
    ['Optical Engineer', 'Other engineering'],
    ['Barista', OTHER_FAMILY],
    ['', OTHER_FAMILY],
  ])('%s → %s', (title, family) => {
    expect(roleFamilyFor(title)).toBe(family);
  });

  it('has unique ids and labels', () => {
    const ids = ROLE_FAMILIES.map((f) => f.id);
    const labels = ROLE_FAMILIES.map((f) => f.label);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('salaryCompanySlug', () => {
  it.each([
    ['Blue Origin', 'blue-origin'],
    ['L3Harris', 'l3harris'],
    ['Lockheed Martin Space', 'lockheed-martin-space'],
    ['SpaceX', 'spacex'],
    ['Ball & Sons, Inc.', 'ball-and-sons-inc'],
    ['  Rocket Lab  ', 'rocket-lab'],
    ['Astroscale Société', 'astroscale-societe'],
  ])('%s → %s', (name, slug) => {
    expect(salaryCompanySlug(name)).toBe(slug);
  });

  it('is idempotent so a URL param resolves to the same slug as the name', () => {
    expect(salaryCompanySlug(salaryCompanySlug('Blue Origin'))).toBe('blue-origin');
  });
});

describe('median and medianBand', () => {
  it('takes the middle value, averaging an even count, rounded to $1k', () => {
    expect(median([])).toBeNull();
    expect(median([120_400])).toBe(120_000);
    expect(median([100_000, 200_000])).toBe(150_000);
    expect(median([300_000, 100_000, 200_000])).toBe(200_000);
    expect(median([1, 2, 3, 4])).toBe(0);
  });

  it('medians the minimums and maximums separately', () => {
    expect(medianBand([])).toBeNull();
    expect(medianBand([band(100_000, 150_000), band(120_000, 200_000), band(90_000, 130_000)])).toEqual({ min: 100_000, max: 150_000, count: 3 });
  });
});

describe('summarizeBands / displayBand — stated vs estimate', () => {
  it('keeps stated and estimated medians apart', () => {
    const s = summarizeBands([band(100_000, 150_000, 'posting'), band(110_000, 160_000), band(90_000, 140_000)]);
    expect(s.stated).toEqual({ min: 100_000, max: 150_000, count: 1 });
    expect(s.estimate).toEqual({ min: 100_000, max: 150_000, count: 2 });
  });

  it('displays the stated median when any posting states one, else the estimate with the estimate label', () => {
    const stated = displayBand(summarizeBands([band(100_000, 150_000, 'posting'), band(200_000, 300_000)]));
    expect(stated).toMatchObject({ min: 100_000, max: 150_000, source: 'posting', label: STATED_LABEL, count: 1 });
    const est = displayBand(summarizeBands([band(200_000, 300_000)]));
    expect(est).toMatchObject({ source: 'estimate', label: ESTIMATE_LABEL, count: 1 });
    expect(displayBand(summarizeBands([]))).toBeNull();
    expect(displayBand(null)).toBeNull();
  });

  it('labels estimates exactly as the board and the job page do', () => {
    expect(ESTIMATE_LABEL).toBe('SpaceNexus estimate');
    const root = process.cwd();
    const board = fs.readFileSync(path.join(root, 'src/app/jobs/JobBoard.tsx'), 'utf8');
    const jobPage = fs.readFileSync(path.join(root, 'src/app/space-talent/job/[id]/page.tsx'), 'utf8');
    expect(board).toContain(ESTIMATE_LABEL);
    expect(jobPage).toContain(ESTIMATE_LABEL);
  });

  it('formats ranges in $k', () => {
    expect(formatRange(95_000, 140_000)).toBe('$95k–$140k');
    expect(formatRange(100_000, 100_000)).toBe('$100k');
  });
});

const JOBS: SalaryJobInput[] = [
  { title: 'Senior Propulsion Engineer', category: 'engineering', seniorityLevel: 'senior', location: 'Hawthorne, CA', remoteOk: false, salaryMin: 160_000, salaryMax: 220_000 },
  { title: 'Propulsion Engineer II', category: 'engineering', seniorityLevel: 'mid', location: 'Hawthorne, CA', remoteOk: false, salaryMin: 120_000, salaryMax: 170_000 },
  { title: 'Propulsion Test Technician', category: 'manufacturing', seniorityLevel: 'mid', location: 'McGregor, TX', remoteOk: false },
  { title: 'Software Engineer, Flight Software', category: 'engineering', seniorityLevel: 'mid', location: 'Remote - US', remoteOk: true },
  { title: 'Supply Chain Manager', category: 'business', seniorityLevel: 'senior', location: 'Hawthorne, CA', remoteOk: false },
  { title: 'Barista', category: 'operations', seniorityLevel: 'entry', location: 'Hawthorne, CA', remoteOk: false },
];

describe('aggregateCompany', () => {
  const s = aggregateCompany('SpaceX', JOBS, { profileSlug: 'spacex' });

  it('counts roles, stated ranges and estimates', () => {
    expect(s).toMatchObject({ name: 'SpaceX', slug: 'spacex', profileSlug: 'spacex', openRoles: 6, statedCount: 2, statedSharePct: 33, remoteCount: 1 });
    // Barista matches nothing in the dataset; everything else gets a band.
    expect(s.withBand).toBe(5);
    expect(s.estimateCount).toBe(3);
  });

  it('clusters titles into families, largest first, with the stated median where a posting states one', () => {
    expect(s.families[0]).toMatchObject({ family: 'Propulsion', count: 2 });
    expect(displayBand(s.families[0].summary)).toMatchObject({ min: 140_000, max: 195_000, source: 'posting', label: STATED_LABEL, count: 2 });
    expect(s.families[0].summary.estimate).toBeNull();
    // The technician is shop floor, not propulsion — technicians cluster first.
    const tech = s.families.find((f) => f.family === 'Manufacturing and technicians');
    expect(displayBand(tech!.summary)).toMatchObject({ source: 'estimate', label: ESTIMATE_LABEL, count: 1 });
    const software = s.families.find((f) => f.family === 'Software engineering');
    expect(displayBand(software!.summary)).toMatchObject({ source: 'estimate', label: ESTIMATE_LABEL, count: 1 });
    expect(software!.sampleTitles).toEqual(['Software Engineer, Flight Software']);
    const other = s.families.find((f) => f.family === OTHER_FAMILY);
    expect(other).toMatchObject({ count: 1 });
    expect(displayBand(other!.summary)).toBeNull();
  });

  it('groups by location with remote normalised', () => {
    expect(s.locations[0]).toMatchObject({ location: 'Hawthorne, CA', count: 4 });
    expect(s.locations.map((l) => l.location)).toEqual(expect.arrayContaining(['Remote', 'McGregor, TX']));
  });

  it('compares the overall median band midpoint with the industry benchmark', () => {
    expect(s.overall).toMatchObject({ count: 5 });
    expect(industryBenchmarkMedian()).toBeGreaterThan(50_000);
    expect(s.benchmark).toMatchObject({ industryMedian: industryBenchmarkMedian() });
    const expected = Math.round(((s.benchmark!.companyMidpoint - s.benchmark!.industryMedian) / s.benchmark!.industryMedian) * 100);
    expect(s.benchmark!.deltaPct).toBe(expected);
  });

  it('collects engineering-category bands for the FAQ', () => {
    expect(s.engineering.stated).toMatchObject({ count: 2 });
    expect(s.engineering.estimate).toMatchObject({ count: 1 });
  });

  it('handles a company with no bands at all', () => {
    const none = aggregateCompany('Nowhere', [{ title: 'Barista' }, { title: 'Greeter' }, { title: 'Host' }]);
    expect(none).toMatchObject({ openRoles: 3, withBand: 0, overall: null, benchmark: null, statedSharePct: 0 });
    expect(none.families).toEqual([expect.objectContaining({ family: OTHER_FAMILY, count: 3 })]);
  });

  it('aggregateFamilies ranks the board-wide families', () => {
    const fams = aggregateFamilies(JOBS, 2);
    expect(fams).toHaveLength(2);
    expect(fams[0].family).toBe('Propulsion');
  });
});

describe('eligibility threshold', () => {
  it('is three live roles', () => {
    expect(SALARY_PAGE_MIN_ROLES).toBe(3);
    expect(isSalaryEligible({ activeCount: 2 })).toBe(false);
    expect(isSalaryEligible({ activeCount: 3 })).toBe(true);
  });
});

describe('metadata', () => {
  const s = aggregateCompany('Blue Origin', JOBS);

  it('company title and description carry the live counts and the estimate label, without a brand suffix', () => {
    const { title, description } = companyMetadataText(s);
    expect(title).toMatch(/^Blue Origin Salaries: \$\d+k–\$\d+k Median Band Across 6 Open Roles$/);
    expect(title).not.toMatch(/\|\s*SpaceNexus/);
    expect(description).toContain('6 live roles');
    expect(description).toContain('2 state a range');
    expect(description).toContain(ESTIMATE_LABEL);
    expect(description).toContain('propulsion');
    expect(description.length).toBeLessThan(400);
  });

  it('falls back to a count-only title when no band exists', () => {
    const none = aggregateCompany('Nowhere', [{ title: 'Barista' }, { title: 'Greeter' }, { title: 'Host' }]);
    const { title, description } = companyMetadataText(none);
    expect(title).toBe('Nowhere Salaries: 3 Open Roles by Title and Location');
    expect(description).toContain('None state a range');
  });

  it('index title carries the company and role counts', () => {
    expect(indexMetadataText(240, 8_120).title).toBe('Space Company Salaries: 240 Employers, 8,120 Roles With Salary Bands');
    expect(indexMetadataText(0, 0).title).toBe('Space Company Salaries');
    expect(indexMetadataText(1, 1).description).toContain(ESTIMATE_LABEL);
  });

  it('builds three FAQs with the company name in every question', () => {
    const faqs = companyFaqs(s, new Date('2026-09-13T12:00:00Z'));
    expect(faqs).toHaveLength(3);
    expect(faqs[0].q).toBe('How much does Blue Origin pay engineers?');
    expect(faqs[0].a).toMatch(/Engineering roles at Blue Origin currently show a median band of \$\d+k–\$\d+k/);
    expect(faqs[1].a).toContain('6 live roles as of Sep 13, 12:00 PM UTC');
    expect(faqs[2].a).toContain('2 of 6 postings (33%)');
    expect(faqs[2].a).toContain(ESTIMATE_LABEL);
    for (const f of faqs) expect(f.q).toContain('Blue Origin');
  });
});

describe('data path (mocked Prisma)', () => {
  const NOW = new Date('2026-09-13T12:00:00Z');
  const groups = [
    { company: 'Blue Origin', _count: { _all: 5 } },
    { company: 'Rocket Lab', _count: { _all: 3 } },
    { company: 'Tiny Startup', _count: { _all: 2 } },
  ];
  const rowsFor = (company: string, n: number): Array<SalaryJobInput & { company: string }> =>
    Array.from({ length: n }, (_, i) => ({ company, title: i % 2 ? 'Propulsion Engineer' : 'Software Engineer', category: 'engineering', seniorityLevel: 'mid', location: 'Kent, WA', remoteOk: false, salaryMin: null, salaryMax: null, salaryMedian: null }));

  beforeEach(() => {
    jest.clearAllMocks();
    db.spaceJobPosting.groupBy.mockImplementation(async (args: { where?: { remoteOk?: boolean } }) => (args.where?.remoteOk ? [] : groups));
    db.spaceJobPosting.count.mockResolvedValue(10);
    db.spaceJobPosting.findMany.mockImplementation(async (args: { distinct?: string[]; where?: { company?: string | { in: string[] } } }) => {
      if (args.distinct) return [{ company: 'Blue Origin', companyProfile: { slug: 'blue-origin' } }];
      const c = args.where?.company;
      if (typeof c === 'string') return rowsFor(c, groups.find((g) => g.company === c)?._count._all ?? 0);
      if (c && typeof c === 'object') return c.in.flatMap((name) => rowsFor(name, groups.find((g) => g.company === name)?._count._all ?? 0));
      return [];
    });
  });

  it('getSalaryCompanies lists only companies at or above the threshold, with slugs and median bands', async () => {
    const { companies, families, totalRoles } = await getSalaryCompanies();
    expect(companies.map((c) => c.salarySlug)).toEqual(['blue-origin', 'rocket-lab']);
    expect(companies[0]).toMatchObject({ name: 'Blue Origin', slug: 'blue-origin', activeCount: 5, statedCount: 0 });
    expect(companies[0].overall).toMatchObject({ count: 5 });
    expect(totalRoles).toBe(8);
    expect(families.map((f) => f.family)).toEqual(['Software engineering', 'Propulsion']);
    // The threshold is passed down to jobs-by-company, so the DB filter and the page rule agree.
    expect(db.spaceJobPosting.groupBy.mock.calls[0][0]).toMatchObject({ by: ['company'] });
  });

  it('resolveSalaryCompany matches the slug of the company name and refuses under-threshold companies', async () => {
    expect(await resolveSalaryCompany('rocket-lab')).toMatchObject({ name: 'Rocket Lab', activeCount: 3 });
    expect(await resolveSalaryCompany('Rocket-Lab')).toMatchObject({ name: 'Rocket Lab' });
    expect(await resolveSalaryCompany('tiny-startup')).toBeNull();
    expect(await resolveSalaryCompany('nobody')).toBeNull();
    expect(await resolveSalaryCompany('')).toBeNull();
  });

  it('getCompanySalaries returns the full summary for an eligible company and null otherwise', async () => {
    const s = await getCompanySalaries('blue-origin');
    expect(s).toMatchObject({ name: 'Blue Origin', profileSlug: 'blue-origin', openRoles: 5, withBand: 5, statedCount: 0, statedSharePct: 0 });
    expect(s!.asOf).toBeInstanceOf(Date);
    expect(await getCompanySalaries('tiny-startup')).toBeNull();
    void NOW;
  });

  it('hasSalaryPage gates the job-page link on the same threshold', async () => {
    db.spaceJobPosting.count.mockResolvedValueOnce(3);
    expect(await hasSalaryPage('Rocket Lab')).toBe(true);
    db.spaceJobPosting.count.mockResolvedValueOnce(2);
    expect(await hasSalaryPage('Tiny Startup')).toBe(false);
    expect(db.spaceJobPosting.count.mock.calls[0][0]).toMatchObject({ where: { company: 'Rocket Lab', isActive: true } });
  });
});
