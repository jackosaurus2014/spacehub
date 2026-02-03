import prisma from './db';
import { SpaceJobPosting, WorkforceTrend, JobCategory, SeniorityLevel } from '@/types';

// Seed data for Space Job Postings
export const JOB_POSTINGS_SEED = [
  {
    title: 'Senior Propulsion Engineer',
    company: 'SpaceX',
    location: 'Hawthorne, CA',
    remoteOk: false,
    category: 'engineering' as JobCategory,
    specialization: 'propulsion',
    seniorityLevel: 'senior' as SeniorityLevel,
    salaryMin: 140000,
    salaryMax: 195000,
    salaryMedian: 167000,
    yearsExperience: 6,
    clearanceRequired: false,
    degreeRequired: 'master',
    isActive: true,
    postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    sourceUrl: 'https://spacex.com/careers',
  },
  {
    title: 'Avionics Systems Lead',
    company: 'Blue Origin',
    location: 'Kent, WA',
    remoteOk: false,
    category: 'engineering' as JobCategory,
    specialization: 'avionics',
    seniorityLevel: 'lead' as SeniorityLevel,
    salaryMin: 165000,
    salaryMax: 220000,
    salaryMedian: 192000,
    yearsExperience: 8,
    clearanceRequired: false,
    degreeRequired: 'master',
    isActive: true,
    postedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    sourceUrl: 'https://blueorigin.com/careers',
  },
  {
    title: 'Flight Software Engineer',
    company: 'Rocket Lab',
    location: 'Long Beach, CA',
    remoteOk: false,
    category: 'engineering' as JobCategory,
    specialization: 'software',
    seniorityLevel: 'mid' as SeniorityLevel,
    salaryMin: 110000,
    salaryMax: 155000,
    salaryMedian: 132000,
    yearsExperience: 3,
    clearanceRequired: false,
    degreeRequired: 'bachelor',
    isActive: true,
    postedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    sourceUrl: 'https://rocketlabusa.com/careers',
  },
  {
    title: 'RF Communications Engineer',
    company: 'L3Harris',
    location: 'Melbourne, FL',
    remoteOk: false,
    category: 'engineering' as JobCategory,
    specialization: 'RF_communications',
    seniorityLevel: 'senior' as SeniorityLevel,
    salaryMin: 130000,
    salaryMax: 180000,
    salaryMedian: 155000,
    yearsExperience: 5,
    clearanceRequired: true,
    degreeRequired: 'bachelor',
    isActive: true,
    postedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    sourceUrl: 'https://l3harris.com/careers',
  },
  {
    title: 'Structures Engineer',
    company: 'Relativity Space',
    location: 'Long Beach, CA',
    remoteOk: false,
    category: 'engineering' as JobCategory,
    specialization: 'structures',
    seniorityLevel: 'entry' as SeniorityLevel,
    salaryMin: 85000,
    salaryMax: 115000,
    salaryMedian: 100000,
    yearsExperience: 0,
    clearanceRequired: false,
    degreeRequired: 'bachelor',
    isActive: true,
    postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    sourceUrl: 'https://relativityspace.com/careers',
  },
  {
    title: 'Mission Operations Director',
    company: 'Northrop Grumman',
    location: 'Dulles, VA',
    remoteOk: false,
    category: 'operations' as JobCategory,
    specialization: 'mission_ops',
    seniorityLevel: 'director' as SeniorityLevel,
    salaryMin: 190000,
    salaryMax: 250000,
    salaryMedian: 218000,
    yearsExperience: 12,
    clearanceRequired: true,
    degreeRequired: 'master',
    isActive: true,
    postedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    sourceUrl: 'https://northropgrumman.com/careers',
  },
  {
    title: 'Satellite Operations Analyst',
    company: 'Planet Labs',
    location: 'San Francisco, CA',
    remoteOk: true,
    category: 'operations' as JobCategory,
    specialization: 'mission_ops',
    seniorityLevel: 'mid' as SeniorityLevel,
    salaryMin: 100000,
    salaryMax: 140000,
    salaryMedian: 120000,
    yearsExperience: 2,
    clearanceRequired: false,
    degreeRequired: 'bachelor',
    isActive: true,
    postedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    sourceUrl: 'https://planet.com/careers',
  },
  {
    title: 'Business Development Manager - Launch Services',
    company: 'SpaceX',
    location: 'Washington, DC',
    remoteOk: false,
    category: 'business' as JobCategory,
    specialization: 'business_dev',
    seniorityLevel: 'senior' as SeniorityLevel,
    salaryMin: 145000,
    salaryMax: 200000,
    salaryMedian: 172000,
    yearsExperience: 7,
    clearanceRequired: false,
    degreeRequired: 'bachelor',
    isActive: true,
    postedDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
    sourceUrl: 'https://spacex.com/careers',
  },
  {
    title: 'Commercial Space Strategy Analyst',
    company: 'Axiom Space',
    location: 'Houston, TX',
    remoteOk: true,
    category: 'business' as JobCategory,
    specialization: 'business_dev',
    seniorityLevel: 'entry' as SeniorityLevel,
    salaryMin: 80000,
    salaryMax: 105000,
    salaryMedian: 92000,
    yearsExperience: 1,
    clearanceRequired: false,
    degreeRequired: 'bachelor',
    isActive: true,
    postedDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    sourceUrl: 'https://axiomspace.com/careers',
  },
  {
    title: 'GNC Research Scientist',
    company: 'Blue Origin',
    location: 'Kent, WA',
    remoteOk: false,
    category: 'research' as JobCategory,
    specialization: 'GNC',
    seniorityLevel: 'senior' as SeniorityLevel,
    salaryMin: 150000,
    salaryMax: 205000,
    salaryMedian: 178000,
    yearsExperience: 6,
    clearanceRequired: false,
    degreeRequired: 'phd',
    isActive: true,
    postedDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    sourceUrl: 'https://blueorigin.com/careers',
  },
  {
    title: 'Space Debris Research Engineer',
    company: 'Astroscale',
    location: 'Denver, CO',
    remoteOk: true,
    category: 'research' as JobCategory,
    specialization: 'GNC',
    seniorityLevel: 'mid' as SeniorityLevel,
    salaryMin: 115000,
    salaryMax: 160000,
    salaryMedian: 137000,
    yearsExperience: 3,
    clearanceRequired: false,
    degreeRequired: 'master',
    isActive: true,
    postedDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    sourceUrl: 'https://astroscale.com/careers',
  },
  {
    title: 'Space Regulatory Counsel',
    company: 'Sierra Space',
    location: 'Louisville, CO',
    remoteOk: true,
    category: 'legal' as JobCategory,
    specialization: 'space_law',
    seniorityLevel: 'senior' as SeniorityLevel,
    salaryMin: 160000,
    salaryMax: 225000,
    salaryMedian: 190000,
    yearsExperience: 7,
    clearanceRequired: false,
    degreeRequired: 'master',
    isActive: true,
    postedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    sourceUrl: 'https://sierraspace.com/careers',
  },
];

// Seed data for Workforce Trends (8 quarters: 2024-Q1 through 2025-Q4)
export const WORKFORCE_TRENDS_SEED = [
  {
    period: '2024-Q1',
    year: 2024,
    quarter: 1,
    totalOpenings: 4500,
    totalHires: 3200,
    avgSalary: 135000,
    medianSalary: 128000,
    engineeringOpenings: 2100,
    operationsOpenings: 850,
    businessOpenings: 700,
    researchOpenings: 850,
    topSkills: JSON.stringify(['Propulsion', 'Software', 'Avionics', 'AI/ML', 'Manufacturing', 'RF Systems']),
    topCompanies: JSON.stringify(['SpaceX', 'Blue Origin', 'Northrop Grumman', 'L3Harris']),
    yoyGrowth: 12.5,
  },
  {
    period: '2024-Q2',
    year: 2024,
    quarter: 2,
    totalOpenings: 4750,
    totalHires: 3400,
    avgSalary: 136500,
    medianSalary: 129500,
    engineeringOpenings: 2200,
    operationsOpenings: 900,
    businessOpenings: 750,
    researchOpenings: 900,
    topSkills: JSON.stringify(['Software', 'Propulsion', 'Avionics', 'AI/ML', 'Manufacturing', 'RF Systems']),
    topCompanies: JSON.stringify(['SpaceX', 'Blue Origin', 'Northrop Grumman', 'L3Harris']),
    yoyGrowth: 13.2,
  },
  {
    period: '2024-Q3',
    year: 2024,
    quarter: 3,
    totalOpenings: 5000,
    totalHires: 3550,
    avgSalary: 138000,
    medianSalary: 131000,
    engineeringOpenings: 2350,
    operationsOpenings: 920,
    businessOpenings: 780,
    researchOpenings: 950,
    topSkills: JSON.stringify(['Propulsion', 'AI/ML', 'Software', 'Avionics', 'Manufacturing', 'RF Systems']),
    topCompanies: JSON.stringify(['SpaceX', 'Blue Origin', 'Northrop Grumman', 'L3Harris']),
    yoyGrowth: 14.1,
  },
  {
    period: '2024-Q4',
    year: 2024,
    quarter: 4,
    totalOpenings: 5200,
    totalHires: 3700,
    avgSalary: 140000,
    medianSalary: 133000,
    engineeringOpenings: 2450,
    operationsOpenings: 950,
    businessOpenings: 810,
    researchOpenings: 990,
    topSkills: JSON.stringify(['AI/ML', 'Software', 'Propulsion', 'Avionics', 'RF Systems', 'Manufacturing']),
    topCompanies: JSON.stringify(['SpaceX', 'Blue Origin', 'Northrop Grumman', 'L3Harris']),
    yoyGrowth: 15.0,
  },
  {
    period: '2025-Q1',
    year: 2025,
    quarter: 1,
    totalOpenings: 5400,
    totalHires: 3850,
    avgSalary: 142000,
    medianSalary: 135000,
    engineeringOpenings: 2550,
    operationsOpenings: 980,
    businessOpenings: 830,
    researchOpenings: 1040,
    topSkills: JSON.stringify(['Propulsion', 'Software', 'AI/ML', 'Avionics', 'Manufacturing', 'RF Systems']),
    topCompanies: JSON.stringify(['SpaceX', 'Blue Origin', 'Northrop Grumman', 'L3Harris']),
    yoyGrowth: 15.8,
  },
  {
    period: '2025-Q2',
    year: 2025,
    quarter: 2,
    totalOpenings: 5650,
    totalHires: 4000,
    avgSalary: 144000,
    medianSalary: 137000,
    engineeringOpenings: 2650,
    operationsOpenings: 1020,
    businessOpenings: 870,
    researchOpenings: 1110,
    topSkills: JSON.stringify(['Software', 'AI/ML', 'Propulsion', 'Avionics', 'RF Systems', 'Manufacturing']),
    topCompanies: JSON.stringify(['SpaceX', 'Blue Origin', 'Northrop Grumman', 'L3Harris']),
    yoyGrowth: 16.4,
  },
  {
    period: '2025-Q3',
    year: 2025,
    quarter: 3,
    totalOpenings: 5900,
    totalHires: 4150,
    avgSalary: 146000,
    medianSalary: 139000,
    engineeringOpenings: 2780,
    operationsOpenings: 1060,
    businessOpenings: 900,
    researchOpenings: 1160,
    topSkills: JSON.stringify(['AI/ML', 'Software', 'Propulsion', 'Avionics', 'Manufacturing', 'RF Systems']),
    topCompanies: JSON.stringify(['SpaceX', 'Blue Origin', 'Northrop Grumman', 'L3Harris']),
    yoyGrowth: 17.2,
  },
  {
    period: '2025-Q4',
    year: 2025,
    quarter: 4,
    totalOpenings: 6200,
    totalHires: 4350,
    avgSalary: 148000,
    medianSalary: 141000,
    engineeringOpenings: 2920,
    operationsOpenings: 1100,
    businessOpenings: 950,
    researchOpenings: 1230,
    topSkills: JSON.stringify(['AI/ML', 'Software', 'Propulsion', 'Avionics', 'RF Systems', 'Manufacturing']),
    topCompanies: JSON.stringify(['SpaceX', 'Blue Origin', 'Northrop Grumman', 'L3Harris']),
    yoyGrowth: 18.0,
  },
];

// Initialize workforce data by upserting seed records
export async function initializeWorkforceData(): Promise<{ jobPostings: number; trends: number }> {
  let jobPostingsCount = 0;
  let trendsCount = 0;

  // Clear and re-seed job postings (no unique constraint other than id)
  await prisma.spaceJobPosting.deleteMany({});

  for (const jobSeed of JOB_POSTINGS_SEED) {
    try {
      await prisma.spaceJobPosting.create({
        data: jobSeed,
      });
      jobPostingsCount++;
    } catch (error) {
      console.error(`Failed to save job posting "${jobSeed.title}" at ${jobSeed.company}:`, error);
    }
  }

  // Upsert workforce trends using period as unique key
  for (const trendSeed of WORKFORCE_TRENDS_SEED) {
    try {
      await prisma.workforceTrend.upsert({
        where: { period: trendSeed.period },
        update: trendSeed,
        create: trendSeed,
      });
      trendsCount++;
    } catch (error) {
      console.error(`Failed to save workforce trend ${trendSeed.period}:`, error);
    }
  }

  return { jobPostings: jobPostingsCount, trends: trendsCount };
}

// Get job postings with optional filters
export async function getJobPostings(options?: {
  category?: JobCategory;
  seniorityLevel?: SeniorityLevel;
  company?: string;
  limit?: number;
}): Promise<SpaceJobPosting[]> {
  const where: any = {};

  if (options?.category) {
    where.category = options.category;
  }
  if (options?.seniorityLevel) {
    where.seniorityLevel = options.seniorityLevel;
  }
  if (options?.company) {
    where.company = options.company;
  }

  const results = await prisma.spaceJobPosting.findMany({
    where,
    orderBy: { postedDate: 'desc' },
    take: options?.limit || 50,
  });

  return results.map((r) => ({
    ...r,
    category: r.category as JobCategory,
    seniorityLevel: r.seniorityLevel as SeniorityLevel,
  }));
}

// Get all workforce trends ordered by year and quarter
export async function getWorkforceTrends(): Promise<WorkforceTrend[]> {
  const results = await prisma.workforceTrend.findMany({
    orderBy: [{ year: 'asc' }, { quarter: 'asc' }],
  });

  return results as WorkforceTrend[];
}

// Get aggregated workforce stats from the latest trend and job postings
export async function getWorkforceStats(): Promise<{
  totalOpenings: number;
  avgSalary: number;
  topCategory: string;
  topCompany: string;
  totalCompanies: number;
  growthRate: number;
}> {
  // Get the latest trend record
  const latestTrend = await prisma.workforceTrend.findFirst({
    orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
  });

  // Get distinct companies from active postings
  const companies = await prisma.spaceJobPosting.findMany({
    where: { isActive: true },
    select: { company: true },
    distinct: ['company'],
  });

  // Get category counts from active postings
  const categoryCounts = await prisma.spaceJobPosting.groupBy({
    by: ['category'],
    where: { isActive: true },
    _count: { category: true },
    orderBy: { _count: { category: 'desc' } },
  });

  // Get company counts from active postings
  const companyCounts = await prisma.spaceJobPosting.groupBy({
    by: ['company'],
    where: { isActive: true },
    _count: { company: true },
    orderBy: { _count: { company: 'desc' } },
  });

  return {
    totalOpenings: latestTrend?.totalOpenings ?? 0,
    avgSalary: latestTrend?.avgSalary ?? 0,
    topCategory: categoryCounts[0]?.category ?? 'engineering',
    topCompany: companyCounts[0]?.company ?? 'SpaceX',
    totalCompanies: companies.length,
    growthRate: latestTrend?.yoyGrowth ?? 0,
  };
}

// Get salary benchmarks grouped by category and seniority level
export async function getSalaryBenchmarks(): Promise<{
  byCategory: { category: JobCategory; avgMin: number; avgMax: number; avgMedian: number; count: number }[];
  bySeniority: { seniorityLevel: SeniorityLevel; avgMin: number; avgMax: number; avgMedian: number; count: number }[];
}> {
  const categoryBenchmarks = await prisma.spaceJobPosting.groupBy({
    by: ['category'],
    where: {
      isActive: true,
      salaryMin: { not: null },
      salaryMax: { not: null },
    },
    _avg: {
      salaryMin: true,
      salaryMax: true,
      salaryMedian: true,
    },
    _count: { category: true },
    orderBy: { category: 'asc' },
  });

  const seniorityBenchmarks = await prisma.spaceJobPosting.groupBy({
    by: ['seniorityLevel'],
    where: {
      isActive: true,
      salaryMin: { not: null },
      salaryMax: { not: null },
    },
    _avg: {
      salaryMin: true,
      salaryMax: true,
      salaryMedian: true,
    },
    _count: { seniorityLevel: true },
    orderBy: { seniorityLevel: 'asc' },
  });

  return {
    byCategory: categoryBenchmarks.map((c) => ({
      category: c.category as JobCategory,
      avgMin: Math.round(c._avg.salaryMin ?? 0),
      avgMax: Math.round(c._avg.salaryMax ?? 0),
      avgMedian: Math.round(c._avg.salaryMedian ?? 0),
      count: c._count.category,
    })),
    bySeniority: seniorityBenchmarks.map((s) => ({
      seniorityLevel: s.seniorityLevel as SeniorityLevel,
      avgMin: Math.round(s._avg.salaryMin ?? 0),
      avgMax: Math.round(s._avg.salaryMax ?? 0),
      avgMedian: Math.round(s._avg.salaryMedian ?? 0),
      count: s._count.seniorityLevel,
    })),
  };
}
