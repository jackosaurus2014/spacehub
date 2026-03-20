// ─── Monthly Space Economy Report Generator ─────────────────────────────────
// Aggregates data from the past month into a structured report.
// Web version is ungated. PDF download gated behind email.

import prisma from './db';
import { logger } from './logger';

export interface MonthlyReportSection {
  title: string;
  icon: string;
  items: { label: string; value: string; change?: string; changeType?: 'positive' | 'negative' | 'neutral' }[];
  narrative?: string;
}

export interface MonthlyReport {
  month: string; // "March 2026"
  generatedAt: string;
  sections: MonthlyReportSection[];
}

export async function generateMonthlyReport(): Promise<MonthlyReport> {
  const now = new Date();
  const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const sections: MonthlyReportSection[] = [];

  // ─── 1. Launch Activity ─────────────────────────────────────────
  try {
    const launches = await prisma.spaceEvent.count({
      where: {
        type: 'launch',
        launchDate: { gte: thirtyDaysAgo, lte: now },
      },
    });
    const successfulLaunches = await prisma.spaceEvent.count({
      where: {
        type: 'launch',
        status: 'completed',
        launchDate: { gte: thirtyDaysAgo, lte: now },
      },
    });

    sections.push({
      title: 'Launch Activity',
      icon: '🚀',
      items: [
        { label: 'Total Launches', value: String(launches) },
        { label: 'Successful', value: String(successfulLaunches) },
        { label: 'Success Rate', value: launches > 0 ? `${Math.round((successfulLaunches / launches) * 100)}%` : 'N/A' },
      ],
      narrative: `${launches} orbital launches were attempted this month with a ${launches > 0 ? Math.round((successfulLaunches / launches) * 100) : 0}% success rate.`,
    });
  } catch {
    sections.push({ title: 'Launch Activity', icon: '🚀', items: [{ label: 'Data', value: 'Collecting...' }] });
  }

  // ─── 2. Funding & Investment ────────────────────────────────────
  try {
    const rounds = await prisma.fundingRound.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      include: { company: { select: { name: true } } },
      orderBy: { amount: 'desc' },
      take: 5,
    });

    const totalCapital = rounds.reduce((sum, r) => sum + (r.amount || 0), 0);
    const topDeal = rounds[0];

    sections.push({
      title: 'Funding & Investment',
      icon: '💰',
      items: [
        { label: 'Rounds Closed', value: String(rounds.length) },
        { label: 'Total Capital Deployed', value: `$${(totalCapital / 1_000_000).toFixed(0)}M` },
        { label: 'Largest Deal', value: topDeal ? `${topDeal.company?.name}: $${((topDeal.amount || 0) / 1_000_000).toFixed(0)}M` : 'N/A' },
      ],
      narrative: `${rounds.length} funding rounds closed this month totaling $${(totalCapital / 1_000_000).toFixed(0)}M in capital deployed.`,
    });
  } catch {
    sections.push({ title: 'Funding & Investment', icon: '💰', items: [{ label: 'Data', value: 'Collecting...' }] });
  }

  // ─── 3. News Activity ──────────────────────────────────────────
  try {
    const newsCount = await prisma.newsArticle.count({
      where: { publishedAt: { gte: thirtyDaysAgo } },
    });

    sections.push({
      title: 'News & Media Coverage',
      icon: '📰',
      items: [
        { label: 'Articles Published', value: String(newsCount) },
        { label: 'SpaceNexus Original Articles', value: '200+' },
      ],
    });
  } catch {
    sections.push({ title: 'News & Media', icon: '📰', items: [{ label: 'Coverage', value: 'Active' }] });
  }

  // ─── 4. Company Activity ───────────────────────────────────────
  try {
    const companyCount = await prisma.companyProfile.count();
    sections.push({
      title: 'Company Intelligence',
      icon: '🏢',
      items: [
        { label: 'Companies Tracked', value: String(companyCount) },
        { label: 'Health Index Coverage', value: `${companyCount} companies scored` },
      ],
    });
  } catch {
    sections.push({ title: 'Company Intelligence', icon: '🏢', items: [{ label: 'Companies', value: '200+' }] });
  }

  // ─── 5. Platform Stats ─────────────────────────────────────────
  sections.push({
    title: 'SpaceNexus Platform',
    icon: '📊',
    items: [
      { label: 'Total Pages', value: '270+' },
      { label: 'Original Articles', value: '200+' },
      { label: 'Data Sources', value: '50+' },
      { label: 'Automated Pipelines', value: '30+' },
    ],
  });

  // ─── 6. SpaceNexus Outlook ─────────────────────────────────────
  sections.push({
    title: 'SpaceNexus Outlook',
    icon: '🔮',
    items: [],
    narrative: 'The space economy continues to accelerate. Key areas to watch: LEO broadband expansion (Starlink, Kuiper), commercial space station development (Axiom, Vast), and growing defense space budgets. SpaceNexus continues to expand coverage with new tools, deeper analysis, and the Space Tycoon game.',
  });

  return {
    month: monthName,
    generatedAt: now.toISOString(),
    sections,
  };
}
