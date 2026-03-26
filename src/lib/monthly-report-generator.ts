// ─── Monthly "State of Space" Report Generator ──────────────────────────────
// Aggregates data from the past month into a comprehensive industry report.
// Web version is ungated. PDF download gated behind email.

import prisma from './db';
import { logger } from './logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReportStatCard {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  sublabel?: string;
}

export interface ReportHeadline {
  title: string;
  source?: string;
  date?: string;
  url?: string;
  category?: string;
}

export interface ReportDeal {
  company: string;
  amount: string;
  stage: string;
  leadInvestor?: string;
  slug?: string;
}

export interface ReportLaunch {
  name: string;
  date: string;
  agency?: string;
  status: string;
  rocket?: string;
  location?: string;
}

export interface ReportCompanyMover {
  name: string;
  slug?: string;
  ticker?: string;
  sector?: string;
  priceChange?: number;
  marketCap?: string;
  event?: string;
}

export interface ReportEvent {
  title: string;
  date: string;
  type: string;
  description?: string;
  company?: string;
}

export interface MonthlyReportSection {
  id: string;
  title: string;
  icon: string;
  stats: ReportStatCard[];
  narrative: string;
  headlines?: ReportHeadline[];
  deals?: ReportDeal[];
  launches?: ReportLaunch[];
  movers?: ReportCompanyMover[];
  events?: ReportEvent[];
  upcomingLaunches?: ReportLaunch[];
}

export interface MonthlyReport {
  month: string;
  monthShort: string;
  year: number;
  generatedAt: string;
  reportNumber: number;
  heroStat: { value: string; label: string };
  sections: MonthlyReportSection[];
}

// ─── Helper: Format currency ────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

// Compute report number (month count since Jan 2026)
function computeReportNumber(now: Date): number {
  return (now.getFullYear() - 2026) * 12 + now.getMonth() + 1;
}

// ─── Main Generator ─────────────────────────────────────────────────────────

export async function generateMonthlyReport(): Promise<MonthlyReport> {
  const now = new Date();
  const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const monthShort = now.toLocaleString('en-US', { month: 'short' });
  const year = now.getFullYear();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const sections: MonthlyReportSection[] = [];
  let heroStatValue = '0';
  const heroStatLabel = 'Launches This Month';

  // ─── 1. Launch Activity ─────────────────────────────────────────────────

  try {
    const [thisMonthLaunches, thisMonthSuccessful, lastMonthLaunches, notableLaunches, upcomingEvents] = await Promise.all([
      prisma.spaceEvent.count({
        where: { type: 'launch', launchDate: { gte: thirtyDaysAgo, lte: now } },
      }),
      prisma.spaceEvent.count({
        where: { type: 'launch', status: 'completed', launchDate: { gte: thirtyDaysAgo, lte: now } },
      }),
      prisma.spaceEvent.count({
        where: { type: 'launch', launchDate: { gte: sixtyDaysAgo, lte: thirtyDaysAgo } },
      }),
      prisma.spaceEvent.findMany({
        where: { type: 'launch', launchDate: { gte: thirtyDaysAgo, lte: now } },
        orderBy: { launchDate: 'desc' },
        take: 5,
        select: { name: true, launchDate: true, agency: true, status: true, rocket: true, location: true },
      }),
      prisma.spaceEvent.findMany({
        where: {
          launchDate: { gt: now, lte: thirtyDaysFromNow },
          status: { in: ['upcoming', 'go', 'tbc', 'tbd'] },
        },
        orderBy: { launchDate: 'asc' },
        take: 8,
        select: { name: true, launchDate: true, agency: true, status: true, rocket: true, location: true },
      }),
    ]);

    const successRate = thisMonthLaunches > 0 ? Math.round((thisMonthSuccessful / thisMonthLaunches) * 100) : 0;
    const launchTrend = lastMonthLaunches > 0
      ? Math.round(((thisMonthLaunches - lastMonthLaunches) / lastMonthLaunches) * 100)
      : 0;

    heroStatValue = String(thisMonthLaunches);

    sections.push({
      id: 'launch-activity',
      title: 'Launch Activity',
      icon: 'rocket',
      stats: [
        { label: 'Total Launches', value: String(thisMonthLaunches), change: launchTrend !== 0 ? `${launchTrend > 0 ? '+' : ''}${launchTrend}% vs last month` : 'Same as last month', changeType: launchTrend > 0 ? 'positive' : launchTrend < 0 ? 'negative' : 'neutral' },
        { label: 'Successful', value: String(thisMonthSuccessful) },
        { label: 'Success Rate', value: `${successRate}%`, changeType: successRate >= 90 ? 'positive' : successRate >= 70 ? 'neutral' : 'negative' },
        { label: 'Upcoming (30d)', value: String(upcomingEvents.length) },
      ],
      narrative: `${thisMonthLaunches} orbital launches were attempted this month with a ${successRate}% success rate. ${launchTrend > 0 ? `Launch cadence increased ${launchTrend}% compared to the prior month.` : launchTrend < 0 ? `Launch cadence decreased ${Math.abs(launchTrend)}% compared to the prior month.` : 'Launch cadence held steady versus the prior month.'} ${upcomingEvents.length} launches are on the manifest for the next 30 days.`,
      launches: notableLaunches.map(l => ({
        name: l.name,
        date: l.launchDate?.toISOString().slice(0, 10) || 'TBD',
        agency: l.agency || undefined,
        status: l.status,
        rocket: l.rocket || undefined,
        location: l.location || undefined,
      })),
      upcomingLaunches: upcomingEvents.map(l => ({
        name: l.name,
        date: l.launchDate?.toISOString().slice(0, 10) || 'TBD',
        agency: l.agency || undefined,
        status: l.status,
        rocket: l.rocket || undefined,
        location: l.location || undefined,
      })),
    });
  } catch (e) {
    logger.error('Report: launch section failed', { error: e instanceof Error ? e.message : String(e) });
    sections.push({ id: 'launch-activity', title: 'Launch Activity', icon: 'rocket', stats: [{ label: 'Data', value: 'Collecting...' }], narrative: 'Launch data is currently being aggregated.' });
  }

  // ─── 2. Funding & Investment ────────────────────────────────────────────

  try {
    const [thisMonthRounds, lastMonthRounds, allRecentRounds] = await Promise.all([
      prisma.fundingRound.findMany({
        where: { date: { gte: thirtyDaysAgo } },
        include: { company: { select: { name: true, slug: true, sector: true } } },
        orderBy: { amount: 'desc' },
      }),
      prisma.fundingRound.findMany({
        where: { date: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
        select: { amount: true },
      }),
      prisma.fundingRound.findMany({
        where: { date: { gte: thirtyDaysAgo } },
        include: { company: { select: { name: true, slug: true } } },
        orderBy: { amount: 'desc' },
        take: 5,
      }),
    ]);

    const totalCapital = thisMonthRounds.reduce((sum, r) => sum + (r.amount || 0), 0);
    const lastMonthCapital = lastMonthRounds.reduce((sum, r) => sum + (r.amount || 0), 0);
    const fundingTrend = lastMonthCapital > 0
      ? Math.round(((totalCapital - lastMonthCapital) / lastMonthCapital) * 100)
      : 0;

    // Sector breakdown
    const sectorMap: Record<string, number> = {};
    thisMonthRounds.forEach(r => {
      const sector = r.company?.sector || 'Other';
      sectorMap[sector] = (sectorMap[sector] || 0) + (r.amount || 0);
    });
    const topSector = Object.entries(sectorMap).sort((a, b) => b[1] - a[1])[0];

    sections.push({
      id: 'funding-investment',
      title: 'Funding & Investment',
      icon: 'dollar',
      stats: [
        { label: 'Total Raised', value: formatCurrency(totalCapital), change: fundingTrend !== 0 ? `${fundingTrend > 0 ? '+' : ''}${fundingTrend}% vs last month` : 'Flat', changeType: fundingTrend > 0 ? 'positive' : fundingTrend < 0 ? 'negative' : 'neutral' },
        { label: 'Deals Closed', value: String(thisMonthRounds.length) },
        { label: 'Avg Deal Size', value: thisMonthRounds.length > 0 ? formatCurrency(totalCapital / thisMonthRounds.length) : 'N/A' },
        { label: 'Top Sector', value: topSector ? topSector[0] : 'N/A', sublabel: topSector ? formatCurrency(topSector[1]) : undefined },
      ],
      narrative: `Space companies raised ${formatCurrency(totalCapital)} across ${thisMonthRounds.length} deals this month. ${fundingTrend > 0 ? `Investment activity grew ${fundingTrend}% versus the prior period.` : fundingTrend < 0 ? `Investment pulled back ${Math.abs(fundingTrend)}% from the prior period.` : 'Investment activity held steady.'} ${topSector ? `${topSector[0]} led sector funding with ${formatCurrency(topSector[1])}.` : ''}`,
      deals: allRecentRounds.slice(0, 5).map(r => ({
        company: r.company?.name || 'Undisclosed',
        amount: r.amount ? formatCurrency(r.amount) : 'Undisclosed',
        stage: r.seriesLabel || r.roundType || 'Unknown',
        leadInvestor: r.leadInvestor || undefined,
        slug: r.company?.slug || undefined,
      })),
    });
  } catch (e) {
    logger.error('Report: funding section failed', { error: e instanceof Error ? e.message : String(e) });
    sections.push({ id: 'funding-investment', title: 'Funding & Investment', icon: 'dollar', stats: [{ label: 'Data', value: 'Collecting...' }], narrative: 'Funding data is being aggregated.' });
  }

  // ─── 3. Market Movers ──────────────────────────────────────────────────

  try {
    const publicCompanies = await prisma.companyProfile.findMany({
      where: { isPublic: true, ticker: { not: null }, priceChange24h: { not: null } },
      select: { name: true, slug: true, ticker: true, sector: true, priceChange24h: true, marketCap: true, stockPrice: true },
      orderBy: { priceChange24h: 'desc' },
      take: 20,
    });

    const gainers = publicCompanies.filter(c => (c.priceChange24h || 0) > 0).slice(0, 3);
    const decliners = [...publicCompanies].sort((a, b) => (a.priceChange24h || 0) - (b.priceChange24h || 0)).filter(c => (c.priceChange24h || 0) < 0).slice(0, 3);
    const allMovers = [...gainers, ...decliners];
    const totalMarketCap = publicCompanies.reduce((sum, c) => sum + (c.marketCap || 0), 0);

    sections.push({
      id: 'market-movers',
      title: 'Market Movers',
      icon: 'chart',
      stats: [
        { label: 'Public Companies Tracked', value: String(publicCompanies.length) },
        { label: 'Combined Market Cap', value: formatCurrency(totalMarketCap) },
        { label: 'Top Gainer', value: gainers[0]?.ticker ? `${gainers[0].ticker} +${(gainers[0].priceChange24h || 0).toFixed(1)}%` : 'N/A', changeType: 'positive' },
        { label: 'Biggest Decliner', value: decliners[0]?.ticker ? `${decliners[0].ticker} ${(decliners[0].priceChange24h || 0).toFixed(1)}%` : 'N/A', changeType: 'negative' },
      ],
      narrative: `${publicCompanies.length} publicly traded space companies are tracked with a combined market capitalization of ${formatCurrency(totalMarketCap)}. ${gainers[0] ? `${gainers[0].name} (${gainers[0].ticker}) led gains at +${(gainers[0].priceChange24h || 0).toFixed(1)}%.` : ''} ${decliners[0] ? `${decliners[0].name} (${decliners[0].ticker}) saw the steepest decline at ${(decliners[0].priceChange24h || 0).toFixed(1)}%.` : ''}`,
      movers: allMovers.map(c => ({
        name: c.name,
        slug: c.slug,
        ticker: c.ticker || undefined,
        sector: c.sector || undefined,
        priceChange: c.priceChange24h || 0,
        marketCap: c.marketCap ? formatCurrency(c.marketCap) : undefined,
      })),
    });
  } catch (e) {
    logger.error('Report: market movers section failed', { error: e instanceof Error ? e.message : String(e) });
    sections.push({ id: 'market-movers', title: 'Market Movers', icon: 'chart', stats: [{ label: 'Data', value: 'Collecting...' }], narrative: 'Market data is being aggregated.' });
  }

  // ─── 4. Regulatory Watch ───────────────────────────────────────────────

  try {
    const [regulatoryEvents, regulatoryNews] = await Promise.all([
      prisma.companyEvent.findMany({
        where: {
          type: 'regulatory',
          date: { gte: thirtyDaysAgo },
        },
        include: { company: { select: { name: true, slug: true } } },
        orderBy: { importance: 'desc' },
        take: 5,
      }),
      prisma.newsArticle.findMany({
        where: {
          category: { in: ['policy', 'regulatory', 'government'] },
          publishedAt: { gte: thirtyDaysAgo },
        },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        select: { title: true, source: true, publishedAt: true, url: true, category: true },
      }),
    ]);

    const totalRegUpdates = regulatoryEvents.length + regulatoryNews.length;

    sections.push({
      id: 'regulatory-watch',
      title: 'Regulatory Watch',
      icon: 'shield',
      stats: [
        { label: 'Regulatory Updates', value: String(totalRegUpdates) },
        { label: 'Company Filings', value: String(regulatoryEvents.length) },
        { label: 'Policy News', value: String(regulatoryNews.length) },
      ],
      narrative: `${totalRegUpdates} regulatory developments were tracked this month including ${regulatoryEvents.length} company filings and ${regulatoryNews.length} policy news items. Space regulation continues to evolve as commercial activity scales and international coordination intensifies.`,
      headlines: regulatoryNews.map(n => ({
        title: n.title,
        source: n.source,
        date: n.publishedAt.toISOString().slice(0, 10),
        url: n.url,
        category: n.category,
      })),
      events: regulatoryEvents.map(e => ({
        title: e.title,
        date: e.date.toISOString().slice(0, 10),
        type: e.type,
        description: e.description || undefined,
        company: e.company?.name || undefined,
      })),
    });
  } catch (e) {
    logger.error('Report: regulatory section failed', { error: e instanceof Error ? e.message : String(e) });
    sections.push({ id: 'regulatory-watch', title: 'Regulatory Watch', icon: 'shield', stats: [{ label: 'Data', value: 'Collecting...' }], narrative: 'Regulatory data is being aggregated.' });
  }

  // ─── 5. Technology Milestones ──────────────────────────────────────────

  try {
    const [milestoneEvents, techNews] = await Promise.all([
      prisma.companyEvent.findMany({
        where: {
          type: { in: ['milestone', 'product_launch', 'first_launch'] },
          date: { gte: thirtyDaysAgo },
        },
        include: { company: { select: { name: true, slug: true } } },
        orderBy: { importance: 'desc' },
        take: 6,
      }),
      prisma.newsArticle.findMany({
        where: {
          category: { in: ['technology', 'science', 'exploration'] },
          publishedAt: { gte: thirtyDaysAgo },
        },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        select: { title: true, source: true, publishedAt: true, url: true, category: true },
      }),
    ]);

    sections.push({
      id: 'technology-milestones',
      title: 'Technology Milestones',
      icon: 'cpu',
      stats: [
        { label: 'Major Milestones', value: String(milestoneEvents.length) },
        { label: 'Tech Stories', value: String(techNews.length) },
      ],
      narrative: `${milestoneEvents.length} significant technology milestones were achieved this month across the space industry. ${milestoneEvents[0] ? `Highlight: ${milestoneEvents[0].company?.name || 'Industry'} — ${milestoneEvents[0].title}.` : 'Innovation continues across propulsion, satellite communications, Earth observation, and in-space manufacturing.'}`,
      events: milestoneEvents.map(e => ({
        title: e.title,
        date: e.date.toISOString().slice(0, 10),
        type: e.type,
        description: e.description || undefined,
        company: e.company?.name || undefined,
      })),
      headlines: techNews.map(n => ({
        title: n.title,
        source: n.source,
        date: n.publishedAt.toISOString().slice(0, 10),
        url: n.url,
        category: n.category,
      })),
    });
  } catch (e) {
    logger.error('Report: technology section failed', { error: e instanceof Error ? e.message : String(e) });
    sections.push({ id: 'technology-milestones', title: 'Technology Milestones', icon: 'cpu', stats: [{ label: 'Data', value: 'Collecting...' }], narrative: 'Technology milestone data is being aggregated.' });
  }

  // ─── 6. Month Ahead ───────────────────────────────────────────────────

  try {
    const upcomingLaunches = await prisma.spaceEvent.findMany({
      where: {
        launchDate: { gt: now, lte: thirtyDaysFromNow },
        status: { in: ['upcoming', 'go', 'tbc', 'tbd'] },
      },
      orderBy: { launchDate: 'asc' },
      take: 10,
      select: { name: true, launchDate: true, agency: true, status: true, rocket: true, location: true },
    });

    const upcomingContracts = await prisma.companyEvent.findMany({
      where: {
        type: { in: ['contract_win', 'partnership'] },
        date: { gt: now, lte: thirtyDaysFromNow },
      },
      include: { company: { select: { name: true } } },
      orderBy: { date: 'asc' },
      take: 5,
    });

    sections.push({
      id: 'month-ahead',
      title: 'Month Ahead',
      icon: 'calendar',
      stats: [
        { label: 'Scheduled Launches', value: String(upcomingLaunches.length) },
        { label: 'Key Events', value: String(upcomingContracts.length) },
      ],
      narrative: `Looking ahead: ${upcomingLaunches.length} launches are scheduled over the next 30 days. ${upcomingLaunches[0] ? `Next up: ${upcomingLaunches[0].name} (${upcomingLaunches[0].launchDate?.toISOString().slice(0, 10) || 'TBD'}).` : ''} Key themes to watch include commercial crew rotations, constellation deployment cadence, and defense procurement timelines.`,
      upcomingLaunches: upcomingLaunches.map(l => ({
        name: l.name,
        date: l.launchDate?.toISOString().slice(0, 10) || 'TBD',
        agency: l.agency || undefined,
        status: l.status,
        rocket: l.rocket || undefined,
        location: l.location || undefined,
      })),
      events: upcomingContracts.map(e => ({
        title: e.title,
        date: e.date.toISOString().slice(0, 10),
        type: e.type,
        description: e.description || undefined,
        company: e.company?.name || undefined,
      })),
    });
  } catch (e) {
    logger.error('Report: month ahead section failed', { error: e instanceof Error ? e.message : String(e) });
    sections.push({ id: 'month-ahead', title: 'Month Ahead', icon: 'calendar', stats: [{ label: 'Data', value: 'Collecting...' }], narrative: 'Upcoming events are being compiled.' });
  }

  // ─── 7. Industry Pulse (news + company intelligence overview) ─────────

  try {
    const [newsCount, companyCount, topNewsByCategory] = await Promise.all([
      prisma.newsArticle.count({ where: { publishedAt: { gte: thirtyDaysAgo } } }),
      prisma.companyProfile.count(),
      prisma.newsArticle.findMany({
        where: { publishedAt: { gte: thirtyDaysAgo } },
        orderBy: { publishedAt: 'desc' },
        take: 8,
        select: { title: true, source: true, publishedAt: true, url: true, category: true },
      }),
    ]);

    sections.push({
      id: 'industry-pulse',
      title: 'Industry Pulse',
      icon: 'pulse',
      stats: [
        { label: 'News Articles Tracked', value: String(newsCount) },
        { label: 'Companies Monitored', value: String(companyCount) },
        { label: 'Data Sources', value: '50+' },
        { label: 'Automated Pipelines', value: '30+' },
      ],
      narrative: `SpaceNexus tracked ${newsCount} industry news articles and monitored ${companyCount} companies this month across 50+ data sources including NASA, NOAA, SEC, CelesTrak, and SAM.gov.`,
      headlines: topNewsByCategory.map(n => ({
        title: n.title,
        source: n.source,
        date: n.publishedAt.toISOString().slice(0, 10),
        url: n.url,
        category: n.category,
      })),
    });
  } catch (e) {
    logger.error('Report: industry pulse section failed', { error: e instanceof Error ? e.message : String(e) });
    sections.push({ id: 'industry-pulse', title: 'Industry Pulse', icon: 'pulse', stats: [{ label: 'Data', value: 'Collecting...' }], narrative: 'Industry data is being compiled.' });
  }

  return {
    month: monthName,
    monthShort,
    year,
    generatedAt: now.toISOString(),
    reportNumber: computeReportNumber(now),
    heroStat: { value: heroStatValue, label: 'Launches This Month' },
    sections,
  };
}
