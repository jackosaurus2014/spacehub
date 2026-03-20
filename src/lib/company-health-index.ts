// ─── Space Company Health Index (SCHI) ──────────────────────────────────────
// Proprietary composite score (0-100) for each space company.
// Combines funding velocity, news sentiment, hiring, patents, contracts.
// Updated weekly. Published as rankings. Our key differentiator.

import prisma from './db';
import { logger } from './logger';

export interface HealthScore {
  companyId: string;
  companyName: string;
  score: number; // 0-100
  grade: 'Strong Growth' | 'Stable' | 'Watch' | 'At Risk' | 'Distressed';
  gradeColor: string;
  breakdown: {
    fundingVelocity: number;  // 0-25
    newsSentiment: number;    // 0-20
    hiringMomentum: number;   // 0-20
    patentActivity: number;   // 0-15
    contractWins: number;     // 0-10
    marketPosition: number;   // 0-10
  };
  signals: string[]; // Human-readable signal descriptions
  updatedAt: Date;
}

function getGrade(score: number): { grade: HealthScore['grade']; color: string } {
  if (score >= 80) return { grade: 'Strong Growth', color: '#22c55e' };
  if (score >= 60) return { grade: 'Stable', color: '#06b6d4' };
  if (score >= 40) return { grade: 'Watch', color: '#eab308' };
  if (score >= 20) return { grade: 'At Risk', color: '#f97316' };
  return { grade: 'Distressed', color: '#ef4444' };
}

/**
 * Calculate health score for a single company.
 */
export async function calculateCompanyHealth(companyId: string): Promise<HealthScore | null> {
  try {
    // Fetch company with all fields
    const companyBase = await prisma.companyProfile.findUnique({
      where: { id: companyId },
    });
    if (!companyBase) return null;

    // Fetch related data separately to avoid type issues
    const recentFunding = await prisma.fundingRound.findMany({
      where: { companyId },
      orderBy: { date: 'desc' },
      take: 5,
    });

    const newsArticles = await prisma.newsArticle.findMany({
      where: { companyTags: { some: { id: companyId } } },
      orderBy: { publishedAt: 'desc' },
      take: 20,
    });

    const company = companyBase as Record<string, unknown>;

    const signals: string[] = [];

    // ─── 1. Funding Velocity (0-25) ─────────────────────────────────
    let fundingScore = 12; // Baseline
    if (recentFunding.length > 0) {
      const latestRound = recentFunding[0];
      const monthsSinceLastRound = latestRound.date
        ? (Date.now() - new Date(latestRound.date).getTime()) / (30 * 24 * 60 * 60 * 1000)
        : 999;

      if (monthsSinceLastRound <= 6) { fundingScore = 25; signals.push('Raised funding in last 6 months'); }
      else if (monthsSinceLastRound <= 12) { fundingScore = 20; signals.push('Funded within the year'); }
      else if (monthsSinceLastRound <= 24) { fundingScore = 15; }
      else { fundingScore = 8; signals.push('No recent funding activity'); }

      // Bonus for large rounds
      if (latestRound.amount && latestRound.amount >= 500_000_000) {
        fundingScore = Math.min(25, fundingScore + 5);
        signals.push('Mega-round ($500M+)');
      }
    } else {
      fundingScore = 5;
      signals.push('No funding data available');
    }

    // ─── 2. News Sentiment (0-20) ───────────────────────────────────
    let newsScore = 10; // Baseline
    if (newsArticles.length > 0) {
      // Simple heuristic: more recent news = more active company
      const recentNewsCount = newsArticles.filter(n =>
        n.publishedAt && (Date.now() - new Date(n.publishedAt).getTime()) < 30 * 24 * 60 * 60 * 1000
      ).length;

      if (recentNewsCount >= 10) { newsScore = 20; signals.push('High media coverage (10+ articles/month)'); }
      else if (recentNewsCount >= 5) { newsScore = 16; signals.push('Active in news'); }
      else if (recentNewsCount >= 2) { newsScore = 12; }
      else { newsScore = 6; signals.push('Low media visibility'); }
    }

    // ─── 3. Hiring Momentum (0-20) ──────────────────────────────────
    // Proxy: company size and growth indicators from profile
    let hiringScore = 10;
    const employeeRange = String(company.employeeCount || company.employeeRange || '');
    if (employeeRange.includes('10000') || employeeRange.includes('5000')) {
      hiringScore = 18; signals.push('Large workforce (5000+)');
    } else if (employeeRange.includes('1000') || employeeRange.includes('500')) {
      hiringScore = 15;
    } else if (employeeRange.includes('100') || employeeRange.includes('250')) {
      hiringScore = 12;
    } else if (employeeRange.includes('50')) {
      hiringScore = 10;
    } else {
      hiringScore = 7;
    }

    // ─── 4. Patent Activity (0-15) ──────────────────────────────────
    // Proxy from company tier and focus areas
    let patentScore = 7;
    const tier = Number(company.tier) || 3;
    if (tier === 1) { patentScore = 14; signals.push('Tier 1 company — strong IP position'); }
    else if (tier === 2) { patentScore = 10; }
    else { patentScore = 6; }

    // ─── 5. Contract Wins (0-10) ────────────────────────────────────
    let contractScore = 5;
    // Check if company has government-related focus
    const focusAreas = String(company.focusAreas || '').toLowerCase();
    if (focusAreas.includes('defense') || focusAreas.includes('government') || focusAreas.includes('nasa')) {
      contractScore = 8;
      signals.push('Government/defense contractor');
    }

    // ─── 6. Market Position (0-10) ──────────────────────────────────
    let marketScore = 5;
    const marketCap = Number(company.marketCap) || 0;
    const totalFunding = Number(company.totalFunding) || 0;
    if (marketCap > 10_000_000_000) {
      marketScore = 10; signals.push('$10B+ market cap');
    } else if (marketCap > 1_000_000_000) {
      marketScore = 8;
    } else if (totalFunding > 500_000_000) {
      marketScore = 7; signals.push('$500M+ total funding');
    }

    // ─── Composite Score ────────────────────────────────────────────
    const totalScore = Math.min(100, Math.round(
      fundingScore + newsScore + hiringScore + patentScore + contractScore + marketScore
    ));

    const { grade, color } = getGrade(totalScore);

    return {
      companyId,
      companyName: String(company.name),
      score: totalScore,
      grade,
      gradeColor: color,
      breakdown: {
        fundingVelocity: fundingScore,
        newsSentiment: newsScore,
        hiringMomentum: hiringScore,
        patentActivity: patentScore,
        contractWins: contractScore,
        marketPosition: marketScore,
      },
      signals,
      updatedAt: new Date(),
    };
  } catch (err) {
    logger.error('Health score calculation failed', { companyId, error: String(err) });
    return null;
  }
}

/**
 * Calculate health scores for all tracked companies and return rankings.
 */
export async function calculateAllHealthScores(): Promise<HealthScore[]> {
  try {
    const companies = await prisma.companyProfile.findMany({
      where: { status: { not: 'inactive' } },
      select: { id: true },
      take: 200,
    });

    const scores: HealthScore[] = [];

    for (const company of companies) {
      const score = await calculateCompanyHealth(company.id);
      if (score) scores.push(score);
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    logger.info(`Health Index calculated for ${scores.length} companies`);
    return scores;
  } catch (err) {
    logger.error('Health index batch calculation failed', { error: String(err) });
    return [];
  }
}

/**
 * Get grade label and color for a given score.
 */
export function getHealthGrade(score: number) {
  return getGrade(score);
}
