/**
 * Company Scoring System - SpaceNexus Intelligence Rating
 *
 * Calculates composite scores (0-100) for space companies based on
 * available data. Similar to SpaceFund's "Reality Rating" concept.
 */

interface CompanyDataForScoring {
  tier: number;
  isPublic: boolean;
  totalFunding: number | null;
  revenueEstimate: number | null;
  employeeCount: number | null;
  _count: {
    products: number;
    keyPersonnel: number;
    fundingRounds: number;
    contracts: number;
    events: number;
    newsArticles: number;
    satelliteAssets: number;
    partnerships: number;
  };
  // Optional: recent event dates, revenue history, etc.
  latestFundingDate?: Date | null;
  foundedYear?: number | null;
}

export interface ScoreBreakdown {
  technology: number;
  team: number;
  funding: number;
  marketPosition: number;
  growth: number;
  momentum: number;
  overall: number;
}

/**
 * Calculate technology score based on products and assets.
 * More products + operational satellites = higher tech readiness.
 */
function calculateTechnologyScore(data: CompanyDataForScoring): number {
  let score = 0;

  // Products (0-40 points)
  const products = data._count.products;
  if (products >= 5) score += 40;
  else if (products >= 3) score += 30;
  else if (products >= 1) score += 20;

  // Satellite assets (0-30 points)
  const satellites = data._count.satelliteAssets;
  if (satellites >= 50) score += 30;
  else if (satellites >= 10) score += 25;
  else if (satellites >= 1) score += 15;

  // Partnerships indicate tech validation (0-20 points)
  const partnerships = data._count.partnerships;
  if (partnerships >= 5) score += 20;
  else if (partnerships >= 2) score += 12;
  else if (partnerships >= 1) score += 6;

  // Tier bonus (0-10 points)
  if (data.tier === 1) score += 10;
  else if (data.tier === 2) score += 5;

  return Math.min(score, 100);
}

/**
 * Calculate team score based on key personnel.
 */
function calculateTeamScore(data: CompanyDataForScoring): number {
  let score = 0;

  // Key personnel count (0-50 points)
  const personnel = data._count.keyPersonnel;
  if (personnel >= 5) score += 50;
  else if (personnel >= 3) score += 35;
  else if (personnel >= 1) score += 20;

  // Employee count (0-30 points)
  const employees = data.employeeCount || 0;
  if (employees >= 10000) score += 30;
  else if (employees >= 1000) score += 25;
  else if (employees >= 100) score += 18;
  else if (employees >= 10) score += 10;

  // Public company = established governance (0-20 points)
  if (data.isPublic) score += 20;
  else if (data.tier === 1) score += 10;

  return Math.min(score, 100);
}

/**
 * Calculate funding score based on capital raised.
 */
function calculateFundingScore(data: CompanyDataForScoring): number {
  let score = 0;

  // Total funding (0-40 points)
  const funding = data.totalFunding || 0;
  if (funding >= 1e9) score += 40;       // $1B+
  else if (funding >= 500e6) score += 35; // $500M+
  else if (funding >= 100e6) score += 28; // $100M+
  else if (funding >= 50e6) score += 22;  // $50M+
  else if (funding >= 10e6) score += 15;  // $10M+
  else if (funding > 0) score += 8;

  // Number of funding rounds (0-30 points)
  const rounds = data._count.fundingRounds;
  if (rounds >= 5) score += 30;
  else if (rounds >= 3) score += 22;
  else if (rounds >= 1) score += 12;

  // Public companies get full funding score (0-20 points)
  if (data.isPublic) score += 20;

  // Recent funding (0-10 points)
  if (data.latestFundingDate) {
    const monthsAgo = (Date.now() - new Date(data.latestFundingDate).getTime()) / (30 * 24 * 60 * 60 * 1000);
    if (monthsAgo < 12) score += 10;
    else if (monthsAgo < 24) score += 6;
    else if (monthsAgo < 48) score += 3;
  }

  return Math.min(score, 100);
}

/**
 * Calculate market position score.
 */
function calculateMarketPositionScore(data: CompanyDataForScoring): number {
  let score = 0;

  // Tier (0-30 points)
  if (data.tier === 1) score += 30;
  else if (data.tier === 2) score += 18;
  else score += 8;

  // Government contracts (0-25 points)
  const contracts = data._count.contracts;
  if (contracts >= 10) score += 25;
  else if (contracts >= 5) score += 20;
  else if (contracts >= 1) score += 12;

  // Revenue (0-25 points)
  const revenue = data.revenueEstimate || 0;
  if (revenue >= 1e9) score += 25;
  else if (revenue >= 100e6) score += 20;
  else if (revenue >= 10e6) score += 14;
  else if (revenue > 0) score += 8;

  // Marketplace presence (0-10 points)
  if (data.isPublic) score += 10;

  // Company age (0-10 points)
  if (data.foundedYear) {
    const age = new Date().getFullYear() - data.foundedYear;
    if (age >= 20) score += 10;
    else if (age >= 10) score += 7;
    else if (age >= 5) score += 4;
  }

  return Math.min(score, 100);
}

/**
 * Calculate growth score based on trajectory indicators.
 */
function calculateGrowthScore(data: CompanyDataForScoring): number {
  let score = 0;

  // Multiple funding rounds indicate growth trajectory (0-30 points)
  const rounds = data._count.fundingRounds;
  if (rounds >= 4) score += 30;
  else if (rounds >= 2) score += 20;
  else if (rounds >= 1) score += 10;

  // Employee growth proxy: higher employee count + not ancient (0-25 points)
  const employees = data.employeeCount || 0;
  const age = data.foundedYear ? (new Date().getFullYear() - data.foundedYear) : 20;
  if (employees > 0 && age > 0) {
    const employeesPerYear = employees / age;
    if (employeesPerYear >= 500) score += 25;
    else if (employeesPerYear >= 100) score += 20;
    else if (employeesPerYear >= 20) score += 14;
    else if (employeesPerYear >= 5) score += 8;
  }

  // Recent partnerships = expansion (0-20 points)
  const partnerships = data._count.partnerships;
  if (partnerships >= 3) score += 20;
  else if (partnerships >= 1) score += 10;

  // Products breadth = diversification (0-25 points)
  const products = data._count.products;
  if (products >= 4) score += 25;
  else if (products >= 2) score += 16;
  else if (products >= 1) score += 8;

  return Math.min(score, 100);
}

/**
 * Calculate momentum score based on recent activity.
 */
function calculateMomentumScore(data: CompanyDataForScoring): number {
  let score = 0;

  // News coverage (0-35 points)
  const news = data._count.newsArticles;
  if (news >= 50) score += 35;
  else if (news >= 20) score += 28;
  else if (news >= 10) score += 20;
  else if (news >= 3) score += 12;
  else if (news >= 1) score += 5;

  // Events / milestones (0-30 points)
  const events = data._count.events;
  if (events >= 10) score += 30;
  else if (events >= 5) score += 22;
  else if (events >= 2) score += 14;
  else if (events >= 1) score += 7;

  // Contract wins (0-20 points)
  const contracts = data._count.contracts;
  if (contracts >= 5) score += 20;
  else if (contracts >= 2) score += 14;
  else if (contracts >= 1) score += 8;

  // Recent funding (0-15 points)
  if (data.latestFundingDate) {
    const monthsAgo = (Date.now() - new Date(data.latestFundingDate).getTime()) / (30 * 24 * 60 * 60 * 1000);
    if (monthsAgo < 6) score += 15;
    else if (monthsAgo < 12) score += 10;
    else if (monthsAgo < 24) score += 5;
  }

  return Math.min(score, 100);
}

/**
 * Calculate all scores for a company.
 */
export function calculateCompanyScores(data: CompanyDataForScoring): ScoreBreakdown {
  const technology = calculateTechnologyScore(data);
  const team = calculateTeamScore(data);
  const funding = calculateFundingScore(data);
  const marketPosition = calculateMarketPositionScore(data);
  const growth = calculateGrowthScore(data);
  const momentum = calculateMomentumScore(data);

  // Weighted average for overall score
  const overall = Math.round(
    technology * 0.20 +
    team * 0.15 +
    funding * 0.20 +
    marketPosition * 0.20 +
    growth * 0.15 +
    momentum * 0.10
  );

  return {
    technology,
    team,
    funding,
    marketPosition,
    growth,
    momentum,
    overall: Math.min(overall, 100),
  };
}

/**
 * Map ScoreBreakdown to the format expected by CompanyScore Prisma model.
 */
export function scoresToPrismaFormat(scores: ScoreBreakdown): Array<{
  scoreType: string;
  score: number;
  methodology: string;
}> {
  return [
    { scoreType: 'technology', score: scores.technology, methodology: 'Products count, satellite assets, partnerships, tier' },
    { scoreType: 'team', score: scores.team, methodology: 'Key personnel count, employee count, public status' },
    { scoreType: 'funding', score: scores.funding, methodology: 'Total funding, round count, recency, public status' },
    { scoreType: 'market_position', score: scores.marketPosition, methodology: 'Tier, contracts, revenue, age, public status' },
    { scoreType: 'growth', score: scores.growth, methodology: 'Funding rounds, employee/age ratio, partnerships, products' },
    { scoreType: 'momentum', score: scores.momentum, methodology: 'News coverage, events, contracts, recent funding' },
    { scoreType: 'overall', score: scores.overall, methodology: 'Weighted average: tech 20%, team 15%, funding 20%, market 20%, growth 15%, momentum 10%' },
  ];
}
