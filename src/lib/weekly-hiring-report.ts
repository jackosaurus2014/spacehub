import prisma from '@/lib/db';

/**
 * Weekly "Who's Hiring in Space" report — generated entirely from our own
 * SpaceJobPosting data (synced daily from company ATS feeds). No AI calls;
 * deterministic and free to run. Modeled directly on weekly-economy-report.ts.
 */

export interface WeeklyHiringReport {
  title: string;
  slug: string;
  summary: string;
  content: string; // GFM markdown, rendered by /ai-insights/[slug]
}

// Seniority levels we treat as "notable" for the new-roles spotlight.
const NOTABLE_SENIORITY = new Set(['director', 'vp', 'c_suite']);
const SENIORITY_LABELS: Record<string, string> = {
  entry: 'Entry',
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead',
  director: 'Director',
  vp: 'VP',
  c_suite: 'C-Suite',
};
const CATEGORY_LABELS: Record<string, string> = {
  engineering: 'Engineering',
  operations: 'Operations',
  business: 'Business',
  research: 'Research',
  legal: 'Legal',
  manufacturing: 'Manufacturing',
};

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${Math.round(n).toLocaleString()}`;
}

// Markdown table cells: neutralize pipes so a title/company name never
// breaks table formatting (mirrors the `cell` helper in weekly-economy-report.ts).
function cell(s: string | null | undefined): string {
  return (s || '—').replace(/\|/g, '/');
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Best-effort week-over-week delta on total active listings, sourced from
 * CompanyJobSnapshot (src/lib/hiring-snapshots.ts) — a parallel workstream's
 * daily per-company active-listing snapshot table, queried here via its
 * '_TOTAL' sentinel series. That table only has data once the daily
 * hiring-snapshot cron has run a few times, so this is fully guarded:
 * no history, less than 7 days of points, or any query failure (e.g. the
 * migration hasn't been applied to this database yet) all resolve to `null`
 * — never a fabricated or guessed number.
 */
async function getWeekOverWeekJobDelta(): Promise<{ delta: number; previousTotal: number } | null> {
  try {
    const snapshots = await import('@/lib/hiring-snapshots');
    const result = await snapshots.getHiringSeries(snapshots.TOTAL_SENTINEL, 14);
    if (!result.series.length) return null;

    const latest = result.series[result.series.length - 1];
    const targetDate = new Date(`${latest.date}T00:00:00Z`);
    targetDate.setUTCDate(targetDate.getUTCDate() - 7);
    const targetKey = fmtDate(targetDate);

    // Closest available point on/before the 7-day-ago target date.
    let comparePoint: { date: string; activeJobs: number } | null = null;
    for (const p of result.series) {
      if (p.date <= targetKey) comparePoint = p;
      else break;
    }
    if (!comparePoint) return null;

    return { delta: latest.activeJobs - comparePoint.activeJobs, previousTotal: comparePoint.activeJobs };
  } catch {
    // Module missing, table not migrated yet, or any other query failure.
    return null;
  }
}

export async function generateWeeklyHiringPost(now = new Date()): Promise<WeeklyHiringReport> {
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalActiveJobs,
    privateCompanyActiveJobs,
    topHiringCompaniesRaw,
    newThisWeekCount,
    notableNewRoles,
    categoryBreakdownRaw,
    salaryRows,
    weekOverWeek,
  ] = await Promise.all([
    prisma.spaceJobPosting.count({ where: { isActive: true } }),
    prisma.spaceJobPosting.count({
      where: { isActive: true, companyProfile: { isPublic: false } },
    }),
    prisma.spaceJobPosting.groupBy({
      by: ['company'],
      where: { isActive: true },
      _count: { company: true },
      orderBy: { _count: { company: 'desc' } },
      take: 10,
    }),
    prisma.spaceJobPosting.count({
      where: {
        isActive: true,
        OR: [{ postedDate: { gte: weekAgo } }, { createdAt: { gte: weekAgo } }],
      },
    }),
    prisma.spaceJobPosting.findMany({
      where: {
        isActive: true,
        OR: [{ postedDate: { gte: weekAgo } }, { createdAt: { gte: weekAgo } }],
        AND: [
          {
            OR: [
              { seniorityLevel: { in: Array.from(NOTABLE_SENIORITY) } },
              { title: { contains: 'principal', mode: 'insensitive' } },
            ],
          },
        ],
      },
      orderBy: { postedDate: 'desc' },
      take: 5,
      select: { id: true, title: true, company: true, seniorityLevel: true, postedDate: true },
    }),
    prisma.spaceJobPosting.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
    }),
    prisma.spaceJobPosting.findMany({
      where: { isActive: true, salaryMedian: { not: null } },
      select: { salaryMedian: true },
    }),
    getWeekOverWeekJobDelta(),
  ]);

  // Resolve company-profile slugs for the top hirers (groupBy has no relations).
  const topNames = topHiringCompaniesRaw.map((c) => c.company);
  const profileRows = topNames.length
    ? await prisma.spaceJobPosting.findMany({
        where: { company: { in: topNames }, companyProfileId: { not: null } },
        select: { company: true, companyProfile: { select: { slug: true } } },
        distinct: ['company'],
      })
    : [];
  const slugByCompany = new Map<string, string>();
  for (const r of profileRows) {
    if (r.companyProfile?.slug) slugByCompany.set(r.company, r.companyProfile.slug);
  }

  const weekOf = fmtDate(weekAgo);
  const slug = `whos-hiring-week-of-${fmtDate(now)}`;
  const title = `Who's Hiring in Space — Week of ${weekOf}`;

  const salaryValues = salaryRows
    .map((r) => r.salaryMedian)
    .filter((v): v is number => typeof v === 'number');
  const salaryCount = salaryValues.length;
  const salaryMedianValue = salaryCount > 0 ? median(salaryValues) : null;

  const lines: string[] = [];

  const leadParts = [
    `${totalActiveJobs.toLocaleString()} active job listings`,
    privateCompanyActiveJobs > 0
      ? `${privateCompanyActiveJobs.toLocaleString()} of them at private, pre-IPO companies`
      : null,
  ].filter(Boolean);
  let leadLine = `*${leadParts.join(', ')} across the space industry right now`;
  if (weekOverWeek) {
    const sign = weekOverWeek.delta > 0 ? '+' : '';
    leadLine += ` — ${sign}${weekOverWeek.delta.toLocaleString()} vs. last week`;
  }
  leadLine += `.*`;
  lines.push(leadLine);
  lines.push('');

  lines.push('## The week in numbers');
  lines.push('');
  lines.push('| Metric | This week |');
  lines.push('| --- | --- |');
  lines.push(`| Active job listings | ${totalActiveJobs.toLocaleString()} |`);
  lines.push(`| At private / pre-IPO companies | ${privateCompanyActiveJobs.toLocaleString()} |`);
  lines.push(`| New listings this week | ${newThisWeekCount.toLocaleString()} |`);
  if (weekOverWeek) {
    const sign = weekOverWeek.delta > 0 ? '+' : '';
    lines.push(`| Week-over-week change | ${sign}${weekOverWeek.delta.toLocaleString()} |`);
  }
  lines.push('');

  if (topHiringCompaniesRaw.length > 0) {
    lines.push('## Top hiring companies');
    lines.push('');
    lines.push('| Company | Open roles |');
    lines.push('| --- | --- |');
    for (const c of topHiringCompaniesRaw) {
      const companySlug = slugByCompany.get(c.company);
      const name = companySlug ? `[${cell(c.company)}](/company-profiles/${companySlug})` : cell(c.company);
      lines.push(`| ${name} | ${c._count.company.toLocaleString()} |`);
    }
    lines.push('');
  }

  lines.push('## New this week');
  lines.push('');
  lines.push(`**${newThisWeekCount.toLocaleString()} listings** were first posted in the last seven days.`);
  lines.push('');
  if (notableNewRoles.length > 0) {
    lines.push('**Notable new roles:**');
    lines.push('');
    for (const r of notableNewRoles) {
      const label = SENIORITY_LABELS[r.seniorityLevel] || r.seniorityLevel;
      lines.push(`- [${cell(r.title)}](/space-talent/job/${r.id}) at ${cell(r.company)} — ${label}`);
    }
    lines.push('');
  }

  if (categoryBreakdownRaw.length > 0) {
    lines.push('## By category');
    lines.push('');
    for (const c of categoryBreakdownRaw) {
      const label = CATEGORY_LABELS[c.category] || c.category;
      lines.push(`- **${label}** — ${c._count.category.toLocaleString()} listings`);
    }
    lines.push('');
  }

  if (salaryCount >= 30 && salaryMedianValue !== null) {
    lines.push('## Salary transparency');
    lines.push('');
    lines.push(
      `Median disclosed salary is ${fmtMoney(salaryMedianValue)}, based on ${salaryCount.toLocaleString()} listings that disclose salary.`,
    );
    lines.push('');
  }

  lines.push('## Go deeper');
  lines.push('');
  lines.push('- [Browse open roles on Space Talent](/space-talent)');
  lines.push("- [Who's hiring at private space companies](/startups)");
  lines.push('');
  lines.push('*Job data is synced daily from company ATS feeds. This brief is generated automatically every week — no AI, pure data aggregation.*');

  const summary = `Who's hiring in space, week of ${weekOf}: ${totalActiveJobs.toLocaleString()} active listings${weekOverWeek ? ` (${weekOverWeek.delta > 0 ? '+' : ''}${weekOverWeek.delta.toLocaleString()} vs. last week)` : ''}, ${newThisWeekCount.toLocaleString()} new this week across ${topHiringCompaniesRaw.length} top hiring companies.`;

  return { title, slug, summary, content: lines.join('\n') };
}
