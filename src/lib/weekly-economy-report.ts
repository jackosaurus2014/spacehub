import prisma from '@/lib/db';

/**
 * Weekly "State of the Space Economy" report — generated entirely from our own
 * database (news volume, company mentions, launches, funding, hiring). No AI
 * calls; deterministic and free to run.
 */

export interface WeeklyEconomyReport {
  title: string;
  slug: string;
  summary: string;
  content: string; // GFM markdown, rendered by /ai-insights/[slug]
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function buildWeeklyEconomyReport(now = new Date()): Promise<WeeklyEconomyReport> {
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [
    articles,
    launchEvents,
    funding,
    newJobs,
    totalJobs,
    totalActiveJobs,
    privateCompanyActiveJobs,
    topHiringCompanies,
    engineeringJobs,
    softwareJobs,
    manufacturingJobs,
  ] = await Promise.all([
    prisma.newsArticle.findMany({
      where: { publishedAt: { gte: weekAgo } },
      select: {
        category: true,
        companyTags: { select: { name: true, slug: true } },
      },
    }),
    prisma.spaceEvent.findMany({
      where: {
        status: 'upcoming',
        type: 'launch',
        launchDate: { gte: now, lte: twoWeeksAhead },
      },
      orderBy: { launchDate: 'asc' },
      take: 6,
      select: { name: true, launchDate: true, agency: true, rocket: true, location: true, mission: true },
    }),
    prisma.fundingRound.findMany({
      where: { date: { gte: weekAgo } },
      orderBy: { amount: 'desc' },
      take: 10,
      select: {
        amount: true,
        seriesLabel: true,
        leadInvestor: true,
        date: true,
        company: { select: { name: true, slug: true } },
      },
    }),
    prisma.spaceJobPosting.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.spaceJobPosting.count(),
    // ── Hiring signals ──
    prisma.spaceJobPosting.count({ where: { isActive: true } }),
    prisma.spaceJobPosting.count({
      where: { isActive: true, companyProfile: { isPublic: false } },
    }),
    prisma.spaceJobPosting.groupBy({
      by: ['company'],
      where: { isActive: true },
      _count: { company: true },
      orderBy: { _count: { company: 'desc' } },
      take: 5,
    }),
    prisma.spaceJobPosting.count({ where: { isActive: true, category: 'engineering' } }),
    prisma.spaceJobPosting.count({
      where: { isActive: true, category: 'engineering', title: { contains: 'software', mode: 'insensitive' } },
    }),
    prisma.spaceJobPosting.count({ where: { isActive: true, category: 'manufacturing' } }),
  ]);

  // Upstream data sometimes mis-types celestial events as launches; a real
  // launch always has a vehicle (rocket field or "Vehicle | Mission" name).
  const launches = launchEvents.filter((l) => l.rocket || l.name.includes('|'));

  // News volume by category
  const byCategory = new Map<string, number>();
  for (const a of articles) {
    byCategory.set(a.category, (byCategory.get(a.category) || 0) + 1);
  }
  const topCategories = Array.from(byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Most-mentioned companies
  const mentions = new Map<string, { name: string; slug: string; count: number }>();
  for (const a of articles) {
    for (const c of a.companyTags) {
      const e = mentions.get(c.slug) || { name: c.name, slug: c.slug, count: 0 };
      e.count += 1;
      mentions.set(c.slug, e);
    }
  }
  const topCompanies = Array.from(mentions.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const fundingTotal = funding.reduce((s, f) => s + (f.amount || 0), 0);

  const weekOf = fmtDate(weekAgo);
  const slug = `state-of-the-space-economy-${fmtDate(now)}`;
  const title = `State of the Space Economy — Week of ${weekOf}`;

  const lines: string[] = [];
  lines.push(`*A weekly data brief generated from SpaceNexus tracking: ${articles.length} news items, ${funding.length} funding rounds, ${launches.length} upcoming launches, and ${totalJobs.toLocaleString()} open industry positions.*`);
  lines.push('');

  lines.push('## The week in numbers');
  lines.push('');
  lines.push('| Metric | This week |');
  lines.push('| --- | --- |');
  lines.push(`| News stories tracked | ${articles.length} |`);
  lines.push(`| Funding rounds recorded | ${funding.length}${fundingTotal > 0 ? ` (${fmtMoney(fundingTotal)} disclosed)` : ''} |`);
  lines.push(`| New job postings | ${newJobs} |`);
  lines.push(`| Launches in the next 14 days | ${launches.length} |`);
  lines.push('');

  if (topCategories.length > 0) {
    lines.push('## Where the news was');
    lines.push('');
    for (const [cat, count] of topCategories) {
      lines.push(`- **${cat}** — ${count} stories`);
    }
    lines.push('');
  }

  if (topCompanies.length > 0) {
    lines.push('## Most-covered companies');
    lines.push('');
    for (const c of topCompanies) {
      lines.push(`- [${c.name}](/company-profiles/${c.slug}) — ${c.count} mentions`);
    }
    lines.push('');
  }

  if (funding.length > 0) {
    lines.push('## Funding activity');
    lines.push('');
    for (const f of funding.slice(0, 5)) {
      const parts = [
        `[${f.company.name}](/company-profiles/${f.company.slug})`,
        f.seriesLabel ? `${f.seriesLabel}` : null,
        f.amount ? fmtMoney(f.amount) : 'undisclosed',
        f.leadInvestor ? `led by ${f.leadInvestor}` : null,
      ].filter(Boolean);
      lines.push(`- ${parts.join(' — ')}`);
    }
    lines.push('');
  }

  if (launches.length > 0) {
    lines.push('## Launch window');
    lines.push('');
    lines.push('| Date | Mission | Vehicle | Site |');
    lines.push('| --- | --- | --- | --- |');
    const cell = (s: string | null | undefined) => (s || '—').replace(/\|/g, '/');
    for (const l of launches) {
      // Source names often arrive as "Vehicle | Mission" — prefer the mission half
      const nameParts = l.name.split('|').map((p) => p.trim()).filter(Boolean);
      const missionName = l.mission || (nameParts.length > 1 ? nameParts[1] : nameParts[0]);
      const vehicle = l.rocket || (nameParts.length > 1 ? nameParts[0] : null);
      lines.push(`| ${l.launchDate ? fmtDate(l.launchDate) : 'TBD'} | ${cell(missionName)} | ${cell(vehicle)} | ${cell(l.location || l.agency)} |`);
    }
    lines.push('');
    lines.push('Track countdowns live in [Mission Control](/mission-control).');
    lines.push('');
  }

  if (totalActiveJobs > 0) {
    lines.push('## Hiring signals');
    lines.push('');
    const openLine = [
      `${totalActiveJobs.toLocaleString()} active job listings`,
      privateCompanyActiveJobs > 0
        ? `${privateCompanyActiveJobs.toLocaleString()} of them at private, pre-IPO companies`
        : null,
    ].filter(Boolean);
    lines.push(`${openLine.join(' — ')} across the space industry right now.`);
    lines.push('');

    if (topHiringCompanies.length > 0) {
      lines.push('**Top hiring companies (active listings):**');
      lines.push('');
      for (const c of topHiringCompanies) {
        lines.push(`- ${c.company} — ${c._count.company} open roles`);
      }
      lines.push('');
    }

    const categoryLines: string[] = [];
    if (engineeringJobs > 0) {
      categoryLines.push(
        `**Engineering** — ${engineeringJobs.toLocaleString()} listings${softwareJobs > 0 ? ` (${softwareJobs.toLocaleString()} software)` : ''}`,
      );
    }
    if (manufacturingJobs > 0) {
      categoryLines.push(`**Manufacturing** — ${manufacturingJobs.toLocaleString()} listings`);
    }
    if (categoryLines.length > 0) {
      lines.push('**By category:**');
      lines.push('');
      for (const c of categoryLines) {
        lines.push(`- ${c}`);
      }
      lines.push('');
    }

    lines.push('[Browse open roles on Space Talent](https://spacenexus.us/space-talent) · [Who\'s hiring at private space companies](https://spacenexus.us/startups)');
    lines.push('');
  }

  lines.push('## Go deeper');
  lines.push('');
  lines.push('- [Market intelligence dashboard](/market-intel)');
  lines.push('- [Space jobs & talent hub](/space-talent)');
  lines.push('- [Company directory](/company-profiles)');
  lines.push('');
  lines.push('*This brief is generated automatically every week from live SpaceNexus data.*');

  const summary = `Space economy week of ${weekOf}: ${articles.length} tracked stories, ${funding.length} funding rounds${fundingTotal > 0 ? ` totaling ${fmtMoney(fundingTotal)}` : ''}, ${newJobs} new job postings, and ${launches.length} launches on the two-week horizon.`;

  return { title, slug, summary, content: lines.join('\n') };
}
