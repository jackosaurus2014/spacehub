/**
 * SpaceNexus Score System
 *
 * A proprietary company health/readiness scoring system (0-100) that synthesises
 * multiple data dimensions.  Inspired by SpaceFund's Reality Rating and
 * CB Insights' Mosaic Score, but adapted specifically for the space industry
 * intelligence context of SpaceNexus.
 *
 * Dimensions (weighted):
 *   1. Financial Health       (25%)
 *   2. Technology Readiness   (20%)
 *   3. Market Position        (20%)
 *   4. Growth Momentum        (15%)
 *   5. Operational Maturity   (10%)
 *   6. Risk Profile           (10%)
 */

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface CompanyScoreInput {
  // Core identifiers
  slug?: string;
  name?: string;
  sector?: string | null;
  subsector?: string | null;
  status?: string;
  tier?: number;
  isPublic?: boolean;
  foundedYear?: number | null;
  employeeCount?: number | null;
  employeeRange?: string | null;
  dataCompleteness?: number;
  tags?: string[];

  // Financials
  totalFunding?: number | null;
  revenueEstimate?: number | null;
  marketCap?: number | null;
  valuation?: number | null;
  stockPrice?: number | null;
  lastFundingRound?: string | null;

  // Relational arrays
  fundingRounds?: { id: string; date: string; amount: number | null; seriesLabel?: string | null; roundType?: string | null; [k: string]: unknown }[];
  products?: { id: string; name: string; status?: string; category?: string | null; [k: string]: unknown }[];
  keyPersonnel?: { id: string; name: string; title?: string; [k: string]: unknown }[];
  contracts?: { id: string; value?: number | null; title?: string; agency?: string; [k: string]: unknown }[];
  satelliteAssets?: { id: string; status?: string; [k: string]: unknown }[];
  facilities?: { id: string; type?: string; [k: string]: unknown }[];
  partnerships?: { id: string; partnerName?: string; [k: string]: unknown }[];
  acquisitions?: { id: string; [k: string]: unknown }[];
  events?: { id: string; type?: string; date?: string; [k: string]: unknown }[];
  scores?: { id: string; scoreType: string; score: number; [k: string]: unknown }[];

  // Pre-computed summary (from company profile page)
  summary?: {
    totalContractValue?: number;
    activeSatellites?: number;
    totalSatellites?: number;
    totalFundingRounds?: number;
    totalProducts?: number;
    totalPersonnel?: number;
    totalFacilities?: number;
    totalEvents?: number;
    [k: string]: unknown;
  };
}

// ─── Output Types ────────────────────────────────────────────────────────────

export interface DimensionScore {
  key: string;
  label: string;
  score: number;       // 0-100
  weight: number;      // 0-1 (the contribution weight)
  factors: { label: string; value: number; max: number }[];
}

export interface SpaceNexusScoreResult {
  overall: number;                          // 0-100
  grade: string;                            // A+ .. F
  label: string;                            // "Industry Leader", etc.
  dimensions: {
    financialHealth: DimensionScore;
    technologyReadiness: DimensionScore;
    marketPosition: DimensionScore;
    growthMomentum: DimensionScore;
    operationalMaturity: DimensionScore;
    riskProfile: DimensionScore;
  };
  insights: string[];
  dataConfidence: number;                   // 0-1
  timestamp: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const WEIGHTS = {
  financialHealth: 0.25,
  technologyReadiness: 0.20,
  marketPosition: 0.20,
  growthMomentum: 0.15,
  operationalMaturity: 0.10,
  riskProfile: 0.10,
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function logScale(value: number, thresholds: [number, number][]): number {
  // thresholds: sorted ascending pairs of [value, score]
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (value >= thresholds[i][0]) return thresholds[i][1];
  }
  return 0;
}

function estimateEmployees(range: string | null): number {
  if (!range) return 0;
  const m: Record<string, number> = {
    '1-10': 5, '11-50': 30, '51-200': 125, '201-500': 350,
    '501-1000': 750, '1001-5000': 3000, '5000+': 8000, '10000+': 15000,
  };
  return m[range] || 0;
}

function countArray(arr: unknown[] | undefined | null): number {
  return arr?.length ?? 0;
}

// ─── Dimension Calculators ───────────────────────────────────────────────────

function calcFinancialHealth(c: CompanyScoreInput): DimensionScore {
  const funding = c.totalFunding || 0;
  const revenue = c.revenueEstimate || 0;
  const mktCap = c.marketCap || c.valuation || 0;
  const roundsCount = c.summary?.totalFundingRounds ?? countArray(c.fundingRounds);

  // Funding raised (0-30)
  const fundingPts = logScale(funding, [
    [0, 0], [1e6, 6], [10e6, 12], [50e6, 18], [100e6, 22],
    [500e6, 26], [1e9, 28], [5e9, 30],
  ]);

  // Revenue (0-30)
  const revenuePts = logScale(revenue, [
    [0, 0], [1e6, 6], [10e6, 12], [50e6, 16], [100e6, 20],
    [500e6, 24], [1e9, 27], [10e9, 30],
  ]);

  // Market cap / valuation (0-20)
  const mktCapPts = logScale(mktCap, [
    [0, 0], [10e6, 4], [100e6, 8], [500e6, 11], [1e9, 14],
    [10e9, 17], [100e9, 20],
  ]);

  // Funding round depth (0-20)
  const roundsPts = logScale(roundsCount, [
    [0, 0], [1, 5], [2, 9], [3, 13], [5, 16], [8, 18], [12, 20],
  ]);

  const raw = fundingPts + revenuePts + mktCapPts + roundsPts;
  return {
    key: 'financialHealth',
    label: 'Financial Health',
    score: clamp(raw, 0, 100),
    weight: WEIGHTS.financialHealth,
    factors: [
      { label: 'Total Funding', value: fundingPts, max: 30 },
      { label: 'Revenue Estimate', value: revenuePts, max: 30 },
      { label: 'Market Cap / Valuation', value: mktCapPts, max: 20 },
      { label: 'Funding Rounds', value: roundsPts, max: 20 },
    ],
  };
}

function calcTechnologyReadiness(c: CompanyScoreInput): DimensionScore {
  const productsCount = c.summary?.totalProducts ?? countArray(c.products);
  const tags = c.tags ?? [];
  const activeSats = c.summary?.activeSatellites ?? 0;

  // Products breadth (0-35)
  const productsPts = logScale(productsCount, [
    [0, 0], [1, 10], [2, 18], [3, 24], [5, 30], [8, 35],
  ]);

  // Patent / proprietary tech signals (0-25)
  const hasPatentTag = tags.some(t => /patent|proprietary|ip/i.test(t));
  const hasAdvancedTech = tags.some(t => /reusable|electric.propulsion|ai|quantum|additive|3d.print/i.test(t));
  const patentPts = (hasPatentTag ? 15 : 0) + (hasAdvancedTech ? 10 : productsCount >= 2 ? 5 : 0);

  // Tech maturity signals (0-25)
  const activeProducts = c.products?.filter(p => p.status === 'operational' || p.status === 'active').length ?? 0;
  const maturityPts = logScale(activeProducts, [
    [0, 0], [1, 8], [2, 14], [3, 19], [5, 23], [8, 25],
  ]) + (activeSats > 0 ? Math.min(activeSats / 10, 5) : 0);

  // R&D indicators (0-15)
  const hasRdTag = tags.some(t => /r.d|sbir|research|nasa|darpa/i.test(t));
  const rdPts = hasRdTag ? 15 : productsCount >= 1 ? 8 : 3;

  const raw = productsPts + patentPts + clamp(maturityPts, 0, 25) + rdPts;
  return {
    key: 'technologyReadiness',
    label: 'Technology Readiness',
    score: clamp(raw, 0, 100),
    weight: WEIGHTS.technologyReadiness,
    factors: [
      { label: 'Product Portfolio', value: productsPts, max: 35 },
      { label: 'Patents & IP', value: clamp(patentPts, 0, 25), max: 25 },
      { label: 'Tech Maturity', value: clamp(Math.round(maturityPts), 0, 25), max: 25 },
      { label: 'R&D Activity', value: rdPts, max: 15 },
    ],
  };
}

function calcMarketPosition(c: CompanyScoreInput): DimensionScore {
  const empCount = c.employeeCount || estimateEmployees(c.employeeRange ?? null);
  const partnershipsCount = countArray(c.partnerships);
  const contractsCount = countArray(c.contracts);
  const totalContractValue = c.summary?.totalContractValue ?? 0;
  const tier = c.tier ?? 3;

  // Workforce scale (0-25)
  const empPts = logScale(empCount, [
    [0, 0], [10, 4], [50, 8], [100, 12], [500, 16],
    [1000, 19], [5000, 22], [10000, 25],
  ]);

  // Partnerships (0-20)
  const partnerPts = logScale(partnershipsCount, [
    [0, 0], [1, 6], [2, 10], [3, 14], [5, 17], [10, 20],
  ]);

  // Contracts (0-25)
  const contractPts = logScale(contractsCount, [
    [0, 0], [1, 8], [3, 14], [5, 18], [10, 22], [20, 25],
  ]);

  // Sector leadership (0-20)
  const leaderPts = tier === 1 ? 20 : tier === 2 ? 12 : 5;

  // Contract value bonus (0-10)
  const cvPts = logScale(totalContractValue, [
    [0, 0], [1e6, 2], [10e6, 4], [100e6, 6], [500e6, 8], [1e9, 10],
  ]);

  const raw = empPts + partnerPts + contractPts + leaderPts + cvPts;
  return {
    key: 'marketPosition',
    label: 'Market Position',
    score: clamp(raw, 0, 100),
    weight: WEIGHTS.marketPosition,
    factors: [
      { label: 'Workforce Scale', value: empPts, max: 25 },
      { label: 'Partnerships', value: partnerPts, max: 20 },
      { label: 'Government Contracts', value: contractPts, max: 25 },
      { label: 'Sector Leadership', value: leaderPts, max: 20 },
      { label: 'Contract Value', value: cvPts, max: 10 },
    ],
  };
}

function calcGrowthMomentum(c: CompanyScoreInput): DimensionScore {
  const roundsCount = c.summary?.totalFundingRounds ?? countArray(c.fundingRounds);
  const eventsCount = c.summary?.totalEvents ?? countArray(c.events);
  const empCount = c.employeeCount || estimateEmployees(c.employeeRange ?? null);
  const age = c.foundedYear ? Math.max(new Date().getFullYear() - c.foundedYear, 1) : 15;

  // Recent funding activity (0-30)
  let recentFundingPts = 0;
  if (c.lastFundingRound) {
    recentFundingPts = 20;
  } else if (c.fundingRounds && c.fundingRounds.length > 0) {
    const sorted = [...c.fundingRounds].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const latestDate = new Date(sorted[0].date);
    const monthsAgo = (Date.now() - latestDate.getTime()) / (30 * 24 * 60 * 60 * 1000);
    if (monthsAgo < 6) recentFundingPts = 30;
    else if (monthsAgo < 12) recentFundingPts = 24;
    else if (monthsAgo < 24) recentFundingPts = 16;
    else if (monthsAgo < 48) recentFundingPts = 8;
  } else if (roundsCount > 0) {
    recentFundingPts = 10;
  }

  // Hiring velocity proxy (0-25)
  const empPerYear = empCount / age;
  const hiringPts = logScale(empPerYear, [
    [0, 0], [2, 4], [5, 8], [20, 14], [50, 18], [100, 22], [500, 25],
  ]);

  // News/event activity (0-25)
  const activityPts = logScale(eventsCount, [
    [0, 0], [1, 5], [2, 10], [5, 16], [10, 20], [20, 25],
  ]);

  // Funding round trajectory (0-20)
  const trajectoryPts = logScale(roundsCount, [
    [0, 0], [1, 5], [2, 9], [3, 13], [5, 17], [8, 20],
  ]);

  const raw = recentFundingPts + hiringPts + activityPts + trajectoryPts;
  return {
    key: 'growthMomentum',
    label: 'Growth Momentum',
    score: clamp(raw, 0, 100),
    weight: WEIGHTS.growthMomentum,
    factors: [
      { label: 'Recent Funding', value: recentFundingPts, max: 30 },
      { label: 'Hiring Velocity', value: hiringPts, max: 25 },
      { label: 'Event Activity', value: activityPts, max: 25 },
      { label: 'Round Trajectory', value: trajectoryPts, max: 20 },
    ],
  };
}

function calcOperationalMaturity(c: CompanyScoreInput): DimensionScore {
  const totalSats = c.summary?.totalSatellites ?? countArray(c.satelliteAssets);
  const activeSats = c.summary?.activeSatellites ?? 0;
  const facilitiesCount = c.summary?.totalFacilities ?? countArray(c.facilities);
  const completeness = c.dataCompleteness ?? 0;

  // Satellites deployed (0-30)
  const satPts = logScale(totalSats, [
    [0, 0], [1, 8], [5, 14], [10, 18], [50, 22], [100, 26], [500, 30],
  ]);

  // Active satellite ratio bonus (0-15)
  const activeRatio = totalSats > 0 ? activeSats / totalSats : 0;
  const activeRatioPts = totalSats > 0 ? Math.round(activeRatio * 15) : 0;

  // Facilities (0-25)
  const facilityPts = logScale(facilitiesCount, [
    [0, 0], [1, 8], [2, 14], [3, 18], [5, 22], [10, 25],
  ]);

  // Data completeness proxy (0-20)
  const completenessPts = Math.round((completeness / 100) * 20);

  // Operational status (0-10)
  const statusPts = c.status === 'active' || c.status === 'Active' ? 10 :
    c.status === 'acquired' ? 7 : c.status === 'ipo' ? 8 : 3;

  const raw = satPts + activeRatioPts + facilityPts + completenessPts + statusPts;
  return {
    key: 'operationalMaturity',
    label: 'Operational Maturity',
    score: clamp(raw, 0, 100),
    weight: WEIGHTS.operationalMaturity,
    factors: [
      { label: 'Satellites Deployed', value: satPts, max: 30 },
      { label: 'Active Satellite Ratio', value: activeRatioPts, max: 15 },
      { label: 'Facility Network', value: facilityPts, max: 25 },
      { label: 'Data Completeness', value: completenessPts, max: 20 },
      { label: 'Operational Status', value: statusPts, max: 10 },
    ],
  };
}

function calcRiskProfile(c: CompanyScoreInput): DimensionScore {
  // Risk is inverted: fewer risk factors = higher score
  let riskDeductions = 0;

  // No revenue is a risk (-15)
  const noRevenue = !c.revenueEstimate || c.revenueEstimate <= 0;
  if (noRevenue) riskDeductions += 15;

  // Pre-revenue / inactive status (-10)
  const riskyStatus = c.status === 'inactive' || c.status === 'bankrupt' || c.status === 'defunct';
  if (riskyStatus) riskDeductions += 20;

  // No products (-10)
  const noProducts = (c.summary?.totalProducts ?? countArray(c.products)) === 0;
  if (noProducts) riskDeductions += 10;

  // No funding (-10)
  const noFunding = !c.totalFunding || c.totalFunding <= 0;
  if (noFunding) riskDeductions += 10;

  // Low data completeness (-10)
  const lowData = (c.dataCompleteness ?? 0) < 30;
  if (lowData) riskDeductions += 10;

  // Single product risk (-5)
  const singleProduct = (c.summary?.totalProducts ?? countArray(c.products)) === 1;
  if (singleProduct) riskDeductions += 5;

  // No partnerships = concentration risk (-5)
  const noPartners = countArray(c.partnerships) === 0;
  if (noPartners) riskDeductions += 5;

  // Small team risk (-5)
  const emp = c.employeeCount || estimateEmployees(c.employeeRange ?? null);
  if (emp > 0 && emp < 10) riskDeductions += 5;

  // Very young company risk (-5)
  const isVeryYoung = c.foundedYear && (new Date().getFullYear() - c.foundedYear) < 3;
  if (isVeryYoung) riskDeductions += 5;

  // Public company stability bonus (+10)
  const publicBonus = c.isPublic ? 10 : 0;

  // Diversification bonus: multiple sectors/products (+5)
  const hasDiversification = (c.summary?.totalProducts ?? countArray(c.products)) >= 3;
  const diversificationBonus = hasDiversification ? 5 : 0;

  // Start from 80 (baseline = "reasonably healthy"), then adjust
  const raw = 80 - riskDeductions + publicBonus + diversificationBonus;

  return {
    key: 'riskProfile',
    label: 'Risk Profile',
    score: clamp(raw, 0, 100),
    weight: WEIGHTS.riskProfile,
    factors: [
      { label: 'Revenue Risk', value: noRevenue ? 0 : 15, max: 15 },
      { label: 'Status Risk', value: riskyStatus ? 0 : 20, max: 20 },
      { label: 'Product Risk', value: noProducts ? 0 : (singleProduct ? 5 : 10), max: 10 },
      { label: 'Funding Risk', value: noFunding ? 0 : 10, max: 10 },
      { label: 'Data Risk', value: lowData ? 0 : 10, max: 10 },
      { label: 'Stability Bonus', value: publicBonus + diversificationBonus, max: 15 },
    ],
  };
}

// ─── Data Confidence ─────────────────────────────────────────────────────────

function calcDataConfidence(c: CompanyScoreInput): number {
  let available = 0;
  let total = 0;

  const fields: [unknown, number][] = [
    [c.totalFunding, 2],
    [c.revenueEstimate, 2],
    [c.marketCap || c.valuation, 2],
    [c.employeeCount || c.employeeRange, 1.5],
    [c.foundedYear, 1],
    [c.isPublic !== undefined, 0.5],
    [c.status, 0.5],
    [c.sector, 0.5],
    [countArray(c.fundingRounds) > 0, 1.5],
    [countArray(c.products) > 0, 1.5],
    [countArray(c.keyPersonnel) > 0, 1],
    [countArray(c.contracts) > 0, 1],
    [countArray(c.satelliteAssets) > 0, 1],
    [countArray(c.facilities) > 0, 1],
    [countArray(c.partnerships) > 0, 1],
    [countArray(c.acquisitions) > 0, 0.5],
    [countArray(c.events) > 0, 1],
    [(c.dataCompleteness ?? 0) > 0, 0.5],
  ];

  for (const [val, weight] of fields) {
    total += weight;
    if (val) available += weight;
  }

  return Math.round((available / total) * 100) / 100;
}

// ─── Insight Generator ───────────────────────────────────────────────────────

function generateInsights(
  c: CompanyScoreInput,
  dims: SpaceNexusScoreResult['dimensions'],
): string[] {
  const insights: string[] = [];
  const name = c.name || 'This company';

  // Financial insights
  if (dims.financialHealth.score >= 80) {
    insights.push(`${name} demonstrates exceptional financial health with strong capitalization.`);
  } else if (dims.financialHealth.score < 30) {
    insights.push(`Limited financial data available; funding and revenue details would improve the assessment.`);
  }

  if (c.totalFunding && c.totalFunding >= 1e9) {
    insights.push(`Has raised over $1B in total funding, placing it among the most well-capitalized space companies.`);
  }

  if (c.isPublic) {
    insights.push(`Publicly traded, providing transparency and access to capital markets.`);
  }

  // Technology insights
  const productsCount = c.summary?.totalProducts ?? countArray(c.products);
  if (dims.technologyReadiness.score >= 80) {
    insights.push(`Strong technology portfolio with ${productsCount} product${productsCount === 1 ? '' : 's'} demonstrating deep technical capability.`);
  } else if (productsCount === 0) {
    insights.push(`No products currently listed; technology readiness data is limited.`);
  }

  // Market position insights
  const contractsCount = countArray(c.contracts);
  if (contractsCount >= 5) {
    insights.push(`Active government contract portfolio (${contractsCount} contracts) signals strong institutional trust.`);
  }

  const partnershipsCount = countArray(c.partnerships);
  if (partnershipsCount >= 3) {
    insights.push(`Robust partnership network with ${partnershipsCount} strategic partnerships.`);
  }

  // Growth insights
  if (dims.growthMomentum.score >= 70) {
    insights.push(`Showing strong growth momentum with recent activity and funding trajectory.`);
  }

  // Operational maturity insights
  const totalSats = c.summary?.totalSatellites ?? countArray(c.satelliteAssets);
  if (totalSats >= 10) {
    insights.push(`Operates a constellation of ${totalSats} satellite${totalSats === 1 ? '' : 's'}, demonstrating operational scale.`);
  }

  const facilitiesCount = c.summary?.totalFacilities ?? countArray(c.facilities);
  if (facilitiesCount >= 3) {
    insights.push(`Multi-site operations across ${facilitiesCount} facilities.`);
  }

  // Risk insights
  if (dims.riskProfile.score < 40) {
    insights.push(`Elevated risk profile; key gaps in revenue, product diversification, or operational data.`);
  } else if (dims.riskProfile.score >= 80) {
    insights.push(`Low risk profile with diversified operations and strong fundamentals.`);
  }

  // Company maturity
  if (c.foundedYear) {
    const age = new Date().getFullYear() - c.foundedYear;
    if (age >= 20) {
      insights.push(`Established player with ${age}+ years in the industry.`);
    } else if (age <= 5) {
      insights.push(`Early-stage company founded ${age} year${age === 1 ? '' : 's'} ago; growth trajectory is critical to watch.`);
    }
  }

  // Data confidence insight
  const confidence = calcDataConfidence(c);
  if (confidence < 0.4) {
    insights.push(`Score is based on limited data (${Math.round(confidence * 100)}% coverage). Additional data would significantly improve accuracy.`);
  }

  return insights.slice(0, 8); // cap at 8 insights
}

// ─── Grade & Label Helpers ───────────────────────────────────────────────────

export function getScoreGrade(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D+';
  if (score >= 45) return 'D';
  if (score >= 40) return 'D-';
  return 'F';
}

export function getScoreLabel(score: number): string {
  if (score >= 85) return 'Industry Leader';
  if (score >= 70) return 'Strong Performer';
  if (score >= 55) return 'Emerging Player';
  if (score >= 40) return 'Early Stage';
  return 'Limited Data';
}

export function getScoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 70) return 'text-blue-400';
  if (score >= 55) return 'text-amber-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

export function getScoreBgColor(score: number): string {
  if (score >= 85) return 'bg-emerald-500';
  if (score >= 70) return 'bg-blue-500';
  if (score >= 55) return 'bg-amber-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

export function getScoreRingColor(score: number): string {
  if (score >= 85) return '#10b981'; // emerald-500
  if (score >= 70) return '#3b82f6'; // blue-500
  if (score >= 55) return '#f59e0b'; // amber-500
  if (score >= 40) return '#f97316'; // orange-500
  return '#ef4444';                   // red-500
}

export function getGradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'text-emerald-400';
  if (grade.startsWith('B')) return 'text-blue-400';
  if (grade.startsWith('C')) return 'text-amber-400';
  if (grade.startsWith('D')) return 'text-orange-400';
  return 'text-red-400';
}

// ─── Dimension Metadata ──────────────────────────────────────────────────────

export const DIMENSION_META: Record<string, { icon: string; color: string; bgColor: string }> = {
  financialHealth:       { icon: '$',  color: 'text-emerald-400', bgColor: 'bg-emerald-500' },
  technologyReadiness:   { icon: '{}', color: 'text-purple-400',  bgColor: 'bg-purple-500' },
  marketPosition:        { icon: '#',  color: 'text-cyan-400',    bgColor: 'bg-cyan-500' },
  growthMomentum:        { icon: '^',  color: 'text-blue-400',    bgColor: 'bg-blue-500' },
  operationalMaturity:   { icon: '*',  color: 'text-amber-400',   bgColor: 'bg-amber-500' },
  riskProfile:           { icon: '!',  color: 'text-rose-400',    bgColor: 'bg-rose-500' },
};

// ─── Main Calculator ─────────────────────────────────────────────────────────

export function calculateSpaceNexusScore(company: CompanyScoreInput): SpaceNexusScoreResult {
  const financialHealth = calcFinancialHealth(company);
  const technologyReadiness = calcTechnologyReadiness(company);
  const marketPosition = calcMarketPosition(company);
  const growthMomentum = calcGrowthMomentum(company);
  const operationalMaturity = calcOperationalMaturity(company);
  const riskProfile = calcRiskProfile(company);

  const dimensions = {
    financialHealth,
    technologyReadiness,
    marketPosition,
    growthMomentum,
    operationalMaturity,
    riskProfile,
  };

  // Weighted overall score
  const overall = Math.round(
    financialHealth.score * WEIGHTS.financialHealth +
    technologyReadiness.score * WEIGHTS.technologyReadiness +
    marketPosition.score * WEIGHTS.marketPosition +
    growthMomentum.score * WEIGHTS.growthMomentum +
    operationalMaturity.score * WEIGHTS.operationalMaturity +
    riskProfile.score * WEIGHTS.riskProfile,
  );

  const clampedOverall = clamp(overall, 0, 100);
  const dataConfidence = calcDataConfidence(company);
  const insights = generateInsights(company, dimensions);

  return {
    overall: clampedOverall,
    grade: getScoreGrade(clampedOverall),
    label: getScoreLabel(clampedOverall),
    dimensions,
    insights,
    dataConfidence,
    timestamp: new Date().toISOString(),
  };
}
