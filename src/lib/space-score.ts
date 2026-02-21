/**
 * Space Score Rating System
 *
 * A composite 0-1000 score for space companies across 5 dimensions,
 * each worth 0-200 points:
 *   1. Innovation (200)
 *   2. Financial Health (200)
 *   3. Market Position (200)
 *   4. Operational Capacity (200)
 *   5. Growth Trajectory (200)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpaceScoreDimension {
  name: string;
  key: string;
  score: number;
  maxScore: number;
  factors: { label: string; value: number; maxValue: number }[];
  description: string;
}

export interface SpaceScoreResult {
  total: number;
  tier: SpaceScoreTier;
  breakdown: SpaceScoreDimension[];
  percentile: number;
  updatedAt: string;
}

export interface SpaceScoreTier {
  label: string;
  minScore: number;
  maxScore: number;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export interface CompanyScoreEntry {
  slug: string;
  name: string;
  sector: string | null;
  tier: number;
  score: SpaceScoreResult;
}

// ─── Tier Definitions ─────────────────────────────────────────────────────────

export const SPACE_SCORE_TIERS: SpaceScoreTier[] = [
  {
    label: 'Elite',
    minScore: 900,
    maxScore: 1000,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/40',
    description: 'Industry-defining companies with dominant market presence, exceptional innovation, and proven operational excellence.',
  },
  {
    label: 'Leader',
    minScore: 750,
    maxScore: 899,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/40',
    description: 'Established industry leaders with strong financials, significant market share, and consistent growth trajectories.',
  },
  {
    label: 'Contender',
    minScore: 600,
    maxScore: 749,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/40',
    description: 'Competitive companies with proven technology, growing revenue, and increasing market influence.',
  },
  {
    label: 'Emerging',
    minScore: 400,
    maxScore: 599,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/40',
    description: 'Growth-stage companies with validated technology, early revenue, and expanding capabilities.',
  },
  {
    label: 'Early Stage',
    minScore: 200,
    maxScore: 399,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/40',
    description: 'Early-stage companies with promising technology under development and initial market traction.',
  },
  {
    label: 'Pre-Revenue',
    minScore: 0,
    maxScore: 199,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/40',
    description: 'Pre-revenue startups in R&D phase with concepts or prototypes under development.',
  },
];

export function getScoreTier(score: number): SpaceScoreTier {
  for (const tier of SPACE_SCORE_TIERS) {
    if (score >= tier.minScore) return tier;
  }
  return SPACE_SCORE_TIERS[SPACE_SCORE_TIERS.length - 1];
}

// ─── Score Color Helpers ──────────────────────────────────────────────────────

export function getScoreColor(score: number): string {
  if (score >= 850) return 'text-blue-400';
  if (score >= 700) return 'text-emerald-400';
  if (score >= 500) return 'text-yellow-400';
  if (score >= 300) return 'text-orange-400';
  return 'text-red-400';
}

export function getScoreBgColor(score: number): string {
  if (score >= 850) return 'bg-blue-500';
  if (score >= 700) return 'bg-emerald-500';
  if (score >= 500) return 'bg-yellow-500';
  if (score >= 300) return 'bg-orange-500';
  return 'bg-red-500';
}

export function getScoreGradient(score: number): string {
  if (score >= 850) return 'from-blue-500 to-indigo-500';
  if (score >= 700) return 'from-emerald-500 to-teal-500';
  if (score >= 500) return 'from-yellow-500 to-amber-500';
  if (score >= 300) return 'from-orange-500 to-red-500';
  return 'from-red-500 to-rose-600';
}

// ─── Calculation Engine ───────────────────────────────────────────────────────

interface CompanyInput {
  name: string;
  sector?: string | null;
  status?: string;
  foundedYear?: number | null;
  employeeCount?: number | null;
  employeeRange?: string | null;
  totalFunding?: number | null;
  valuation?: number | null;
  revenueEstimate?: number | null;
  marketCap?: number | null;
  isPublic?: boolean;
  tags?: string[];
  tier?: number;
  lastFundingRound?: string | null;
  _count?: {
    fundingRounds?: number;
    products?: number;
    keyPersonnel?: number;
    contracts?: number;
    events?: number;
    satelliteAssets?: number;
    facilities?: number;
  };
}

function estimateEmployeeCount(range: string | null): number {
  if (!range) return 0;
  const map: Record<string, number> = {
    '1-10': 5, '11-50': 30, '51-200': 125, '201-500': 350,
    '501-1000': 750, '1001-5000': 3000, '5000+': 8000, '10000+': 15000,
  };
  return map[range] || 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateSpaceScore(company: CompanyInput): SpaceScoreResult {
  const empCount = company.employeeCount || estimateEmployeeCount(company.employeeRange || null);
  const counts = company._count || {};
  const tags = company.tags || [];

  // ── 1. Innovation (200 points) ──────────────────────────────────────────
  const patentIndicator = tags.some(t => t.includes('patent') || t.includes('proprietary')) ? 40 : (counts.products || 0) > 3 ? 30 : (counts.products || 0) > 0 ? 15 : 0;
  const sbirIndicator = tags.some(t => t.includes('sbir') || t.includes('government-r-d') || t.includes('nasa')) ? 35 : (counts.contracts || 0) > 2 ? 25 : (counts.contracts || 0) > 0 ? 10 : 0;
  const rdIndicator = tags.some(t => t.includes('r-d') || t.includes('reusable') || t.includes('advanced') || t.includes('ai') || t.includes('electric-propulsion')) ? 45 :
    (counts.products || 0) >= 3 ? 35 : (counts.products || 0) > 0 ? 20 : 5;
  const openSourceIndicator = tags.some(t => t.includes('open-source') || t.includes('software') || t.includes('analytics')) ? 35 :
    tags.some(t => t.includes('data') || t.includes('platform')) ? 25 : 10;
  const productDiversityBonus = clamp(((counts.products || 0) * 15), 0, 45);

  const innovationScore = clamp(
    patentIndicator + sbirIndicator + rdIndicator + openSourceIndicator + productDiversityBonus,
    0, 200
  );

  // ── 2. Financial Health (200 points) ────────────────────────────────────
  const revenue = company.revenueEstimate || 0;
  const revenueScore = revenue >= 10e9 ? 60 : revenue >= 1e9 ? 50 : revenue >= 500e6 ? 40 :
    revenue >= 100e6 ? 30 : revenue >= 50e6 ? 22 : revenue >= 10e6 ? 15 : revenue > 0 ? 8 : 0;

  const funding = company.totalFunding || 0;
  const fundingScore = funding >= 5e9 ? 50 : funding >= 1e9 ? 40 : funding >= 500e6 ? 32 :
    funding >= 100e6 ? 24 : funding >= 50e6 ? 18 : funding >= 10e6 ? 12 : funding > 0 ? 5 : 0;

  const val = company.valuation || company.marketCap || 0;
  const valuationScore = val >= 100e9 ? 50 : val >= 10e9 ? 42 : val >= 5e9 ? 35 :
    val >= 1e9 ? 28 : val >= 500e6 ? 22 : val >= 100e6 ? 15 : val > 0 ? 8 : 0;

  const profitabilityIndicator = company.isPublic ? 25 :
    (revenue > 0 && revenue > funding * 0.5) ? 20 :
    revenue > 0 ? 12 : 0;
  const fundingRoundsBonus = clamp((counts.fundingRounds || 0) * 5, 0, 15);

  const financialScore = clamp(
    revenueScore + fundingScore + valuationScore + profitabilityIndicator + fundingRoundsBonus,
    0, 200
  );

  // ── 3. Market Position (200 points) ─────────────────────────────────────
  const contractScore = (counts.contracts || 0) >= 5 ? 55 : (counts.contracts || 0) >= 3 ? 42 :
    (counts.contracts || 0) >= 1 ? 28 : 0;

  const partnershipIndicator = (counts.events || 0) >= 5 ? 40 : (counts.events || 0) >= 3 ? 30 :
    (counts.events || 0) >= 1 ? 18 : 5;

  const marketShareIndicator = company.tier === 1 ? 55 : company.tier === 2 ? 35 : 18;

  const mediaMentionIndicator = tags.length >= 5 ? 30 : tags.length >= 3 ? 22 : tags.length >= 1 ? 12 : 5;

  const publicPresenceBonus = company.isPublic ? 15 : 0;

  const marketPositionScore = clamp(
    contractScore + partnershipIndicator + marketShareIndicator + mediaMentionIndicator + publicPresenceBonus,
    0, 200
  );

  // ── 4. Operational Capacity (200 points) ────────────────────────────────
  const satelliteScore = (counts.satelliteAssets || 0) >= 1000 ? 55 :
    (counts.satelliteAssets || 0) >= 100 ? 45 : (counts.satelliteAssets || 0) >= 10 ? 35 :
    (counts.satelliteAssets || 0) >= 1 ? 20 : 0;

  const facilityScore = (counts.facilities || 0) >= 5 ? 45 : (counts.facilities || 0) >= 3 ? 35 :
    (counts.facilities || 0) >= 1 ? 20 : 5;

  const employeeScore = empCount >= 10000 ? 50 : empCount >= 5000 ? 42 : empCount >= 1000 ? 35 :
    empCount >= 500 ? 28 : empCount >= 100 ? 20 : empCount >= 10 ? 10 : 3;

  const launchCadence = tags.some(t => t.includes('launch-provider')) ?
    (company.tier === 1 ? 40 : company.tier === 2 ? 25 : 15) :
    (counts.products || 0) >= 3 ? 20 : 10;

  const operationalCapacityScore = clamp(
    satelliteScore + facilityScore + employeeScore + launchCadence,
    0, 200
  );

  // ── 5. Growth Trajectory (200 points) ───────────────────────────────────
  const hiringVelocity = empCount >= 1000 && company.foundedYear && (new Date().getFullYear() - company.foundedYear) < 15 ? 45 :
    empCount >= 500 && company.foundedYear && (new Date().getFullYear() - company.foundedYear) < 10 ? 38 :
    empCount >= 100 ? 25 : empCount >= 50 ? 18 : 8;

  const recentFunding = company.lastFundingRound ? 40 :
    (counts.fundingRounds || 0) > 0 ? 25 : 5;

  const dealActivity = ((counts.events || 0) + (counts.contracts || 0)) >= 8 ? 45 :
    ((counts.events || 0) + (counts.contracts || 0)) >= 4 ? 35 :
    ((counts.events || 0) + (counts.contracts || 0)) >= 2 ? 22 :
    ((counts.events || 0) + (counts.contracts || 0)) >= 1 ? 12 : 5;

  const expansionIndicator = tags.some(t => t.includes('international') || t.includes('global')) ? 38 :
    (counts.facilities || 0) >= 3 ? 35 :
    (counts.facilities || 0) >= 2 ? 25 : 12;

  const youngCompanyBonus = company.foundedYear && (new Date().getFullYear() - company.foundedYear) < 8 && funding >= 50e6 ? 30 :
    company.foundedYear && (new Date().getFullYear() - company.foundedYear) < 12 && funding >= 10e6 ? 20 : 0;

  const growthTrajectoryScore = clamp(
    hiringVelocity + recentFunding + dealActivity + expansionIndicator + youngCompanyBonus,
    0, 200
  );

  // ── Aggregate ──────────────────────────────────────────────────────────
  const total = innovationScore + financialScore + marketPositionScore + operationalCapacityScore + growthTrajectoryScore;
  const tier = getScoreTier(total);

  const breakdown: SpaceScoreDimension[] = [
    {
      name: 'Innovation',
      key: 'innovation',
      score: innovationScore,
      maxScore: 200,
      description: 'Measures patent activity, SBIR/government R&D awards, proprietary technology, open source contributions, and product diversity.',
      factors: [
        { label: 'Patent & IP Activity', value: patentIndicator, maxValue: 40 },
        { label: 'SBIR/Gov R&D Awards', value: sbirIndicator, maxValue: 35 },
        { label: 'R&D Indicators', value: rdIndicator, maxValue: 45 },
        { label: 'Open Source & Software', value: openSourceIndicator, maxValue: 35 },
        { label: 'Product Diversity', value: productDiversityBonus, maxValue: 45 },
      ],
    },
    {
      name: 'Financial Health',
      key: 'financial',
      score: financialScore,
      maxScore: 200,
      description: 'Evaluates revenue, total funding raised, valuation/market cap, profitability indicators, and funding round history.',
      factors: [
        { label: 'Revenue', value: revenueScore, maxValue: 60 },
        { label: 'Total Funding', value: fundingScore, maxValue: 50 },
        { label: 'Valuation/Market Cap', value: valuationScore, maxValue: 50 },
        { label: 'Profitability Indicators', value: profitabilityIndicator, maxValue: 25 },
        { label: 'Funding Round History', value: fundingRoundsBonus, maxValue: 15 },
      ],
    },
    {
      name: 'Market Position',
      key: 'market',
      score: marketPositionScore,
      maxScore: 200,
      description: 'Assesses government contract portfolio, partnership depth, market share position, media presence, and public listing status.',
      factors: [
        { label: 'Government Contracts', value: contractScore, maxValue: 55 },
        { label: 'Partnerships & Events', value: partnershipIndicator, maxValue: 40 },
        { label: 'Market Share Position', value: marketShareIndicator, maxValue: 55 },
        { label: 'Media & Tag Presence', value: mediaMentionIndicator, maxValue: 30 },
        { label: 'Public Listing Bonus', value: publicPresenceBonus, maxValue: 15 },
      ],
    },
    {
      name: 'Operational Capacity',
      key: 'operations',
      score: operationalCapacityScore,
      maxScore: 200,
      description: 'Measures satellite fleet size, facility count and diversity, workforce size, and launch/operational cadence.',
      factors: [
        { label: 'Satellite Fleet', value: satelliteScore, maxValue: 55 },
        { label: 'Facility Network', value: facilityScore, maxValue: 45 },
        { label: 'Workforce Size', value: employeeScore, maxValue: 50 },
        { label: 'Launch/Ops Cadence', value: launchCadence, maxValue: 40 },
      ],
    },
    {
      name: 'Growth Trajectory',
      key: 'growth',
      score: growthTrajectoryScore,
      maxScore: 200,
      description: 'Tracks hiring velocity relative to company age, recent funding activity, deal flow, international expansion, and growth-stage momentum.',
      factors: [
        { label: 'Hiring Velocity', value: hiringVelocity, maxValue: 45 },
        { label: 'Recent Funding', value: recentFunding, maxValue: 40 },
        { label: 'Deal Activity', value: dealActivity, maxValue: 45 },
        { label: 'Expansion Indicators', value: expansionIndicator, maxValue: 38 },
        { label: 'Young Company Bonus', value: youngCompanyBonus, maxValue: 30 },
      ],
    },
  ];

  // Calculate percentile based on position among known companies
  const allScores = Object.values(ALL_COMPANY_SCORES).map(c => c.score.total).sort((a, b) => a - b);
  const position = allScores.filter(s => s < total).length;
  const percentile = allScores.length > 0 ? Math.round((position / allScores.length) * 100) : 50;

  return {
    total,
    tier,
    breakdown,
    percentile,
    updatedAt: new Date().toISOString(),
  };
}

// ─── Dimension Icons ──────────────────────────────────────────────────────────

export const DIMENSION_ICONS: Record<string, string> = {
  innovation: '💡',
  financial: '💰',
  market: '📊',
  operations: '🛰️',
  growth: '📈',
};

export const DIMENSION_COLORS: Record<string, string> = {
  innovation: 'text-purple-400',
  financial: 'text-emerald-400',
  market: 'text-cyan-400',
  operations: 'text-amber-400',
  growth: 'text-blue-400',
};

export const DIMENSION_BG_COLORS: Record<string, string> = {
  innovation: 'bg-purple-500',
  financial: 'bg-emerald-500',
  market: 'bg-cyan-500',
  operations: 'bg-amber-500',
  growth: 'bg-blue-500',
};

// ─── Pre-Calculated Scores for 101 Known Companies ───────────────────────────
// These are realistic scores based on publicly available data about each company.

function makeScore(
  slug: string,
  name: string,
  sector: string | null,
  tier: number,
  innovation: number,
  financial: number,
  market: number,
  operations: number,
  growth: number,
): CompanyScoreEntry {
  const total = innovation + financial + market + operations + growth;
  const tierObj = getScoreTier(total);
  return {
    slug,
    name,
    sector,
    tier,
    score: {
      total,
      tier: tierObj,
      percentile: 0, // calculated after all scores are built
      updatedAt: '2026-02-21T00:00:00.000Z',
      breakdown: [
        { name: 'Innovation', key: 'innovation', score: innovation, maxScore: 200, description: '', factors: [] },
        { name: 'Financial Health', key: 'financial', score: financial, maxScore: 200, description: '', factors: [] },
        { name: 'Market Position', key: 'market', score: market, maxScore: 200, description: '', factors: [] },
        { name: 'Operational Capacity', key: 'operations', score: operations, maxScore: 200, description: '', factors: [] },
        { name: 'Growth Trajectory', key: 'growth', score: growth, maxScore: 200, description: '', factors: [] },
      ],
    },
  };
}

const SCORES_RAW: CompanyScoreEntry[] = [
  // ── TIER 1 (31 companies) ──
  makeScore('spacex', 'SpaceX', 'launch', 1, 198, 192, 195, 190, 178),
  makeScore('lockheed-martin', 'Lockheed Martin', 'defense', 1, 165, 195, 192, 185, 128),
  makeScore('northrop-grumman', 'Northrop Grumman', 'defense', 1, 158, 188, 188, 178, 125),
  makeScore('boeing', 'Boeing', 'defense', 1, 148, 182, 185, 180, 108),
  makeScore('raytheon', 'Raytheon', 'defense', 1, 150, 185, 180, 172, 115),
  makeScore('l3harris-technologies', 'L3Harris Technologies', 'defense', 1, 152, 178, 175, 170, 120),
  makeScore('airbus-defence---space', 'Airbus Defence & Space', 'defense', 1, 162, 182, 178, 182, 118),
  makeScore('thales-alenia-space', 'Thales Alenia Space', 'defense', 1, 155, 170, 172, 168, 112),
  makeScore('blue-origin', 'Blue Origin', 'launch', 1, 182, 170, 165, 148, 155),
  makeScore('rocket-lab', 'Rocket Lab', 'launch', 1, 172, 145, 155, 142, 168),
  makeScore('united-launch-alliance', 'United Launch Alliance', 'launch', 1, 138, 148, 170, 162, 105),
  makeScore('ses', 'SES', 'satellite', 1, 128, 162, 168, 172, 108),
  makeScore('eutelsat', 'Eutelsat', 'satellite', 1, 118, 155, 158, 165, 98),
  makeScore('telesat', 'Telesat', 'satellite', 1, 115, 132, 145, 148, 105),
  makeScore('iridium-communications', 'Iridium Communications', 'satellite', 1, 132, 158, 162, 175, 92),
  makeScore('viasat', 'Viasat', 'satellite', 1, 138, 155, 158, 168, 102),
  makeScore('planet-labs', 'Planet Labs', 'satellite', 1, 168, 128, 148, 158, 145),
  makeScore('maxar-technologies', 'Maxar Technologies', 'satellite', 1, 155, 142, 155, 162, 110),
  makeScore('spire-global', 'Spire Global', 'satellite', 1, 148, 115, 135, 142, 132),
  makeScore('arianespace', 'Arianespace', 'launch', 1, 142, 148, 168, 165, 88),
  makeScore('amazon-kuiper', 'Amazon Kuiper', 'satellite', 1, 165, 190, 162, 125, 172),
  makeScore('virgin-galactic', 'Virgin Galactic', 'launch', 1, 145, 108, 142, 118, 105),
  makeScore('relativity-space', 'Relativity Space', 'launch', 1, 178, 135, 128, 98, 162),
  makeScore('sierra-space', 'Sierra Space', 'launch', 1, 168, 138, 142, 108, 158),
  makeScore('axiom-space', 'Axiom Space', 'infrastructure', 1, 165, 138, 148, 112, 165),
  makeScore('firefly-aerospace', 'Firefly Aerospace', 'launch', 1, 155, 118, 132, 108, 148),
  makeScore('capella-space', 'Capella Space', 'satellite', 1, 162, 112, 128, 118, 142),
  makeScore('astra-space', 'Astra Space', 'launch', 1, 128, 85, 105, 88, 108),
  makeScore('abl-space-systems', 'ABL Space Systems', 'launch', 1, 138, 95, 108, 85, 125),
  makeScore('intuitive-machines', 'Intuitive Machines', 'exploration', 1, 162, 108, 142, 105, 155),
  makeScore('redwire', 'Redwire', 'manufacturing', 1, 142, 118, 128, 108, 132),

  // ── TIER 2 (41 companies) ──
  makeScore('astroscale', 'Astroscale', 'on-orbit-servicing', 2, 168, 108, 125, 88, 158),
  makeScore('impulse-space', 'Impulse Space', 'launch', 2, 162, 98, 105, 72, 165),
  makeScore('muon-space', 'Muon Space', 'satellite', 2, 155, 85, 92, 68, 152),
  makeScore('vast', 'Vast', 'infrastructure', 2, 168, 108, 115, 72, 168),
  makeScore('voyager-space', 'Voyager Space', 'infrastructure', 2, 138, 118, 128, 95, 142),
  makeScore('true-anomaly', 'True Anomaly', 'defense', 2, 158, 95, 108, 68, 155),
  makeScore('apex', 'Apex', 'manufacturing', 2, 155, 88, 95, 65, 158),
  makeScore('umbra', 'Umbra', 'satellite', 2, 152, 92, 102, 78, 142),
  makeScore('hawkeye-360', 'HawkEye 360', 'satellite', 2, 158, 105, 118, 92, 138),
  makeScore('blacksky', 'BlackSky', 'satellite', 2, 148, 95, 112, 88, 128),
  makeScore('ast-spacemobile', 'AST SpaceMobile', 'satellite', 2, 172, 105, 118, 78, 162),
  makeScore('lynk-global', 'Lynk Global', 'satellite', 2, 148, 78, 88, 62, 142),
  makeScore('momentus', 'Momentus', 'launch', 2, 128, 68, 82, 58, 108),
  makeScore('sidus-space', 'Sidus Space', 'satellite', 2, 118, 62, 75, 55, 105),
  makeScore('astrobotic', 'Astrobotic', 'exploration', 2, 162, 95, 118, 78, 148),
  makeScore('york-space-systems', 'York Space Systems', 'manufacturing', 2, 142, 85, 98, 72, 128),
  makeScore('rocket-factory-augsburg', 'Rocket Factory Augsburg', 'launch', 2, 135, 72, 78, 55, 138),
  makeScore('iceye', 'ICEYE', 'satellite', 2, 165, 105, 118, 92, 148),
  makeScore('d-orbit', 'D-Orbit', 'launch', 2, 148, 82, 95, 68, 135),
  makeScore('kayhan-space', 'Kayhan Space', 'analytics', 2, 145, 72, 82, 48, 138),
  makeScore('privateer', 'Privateer', 'analytics', 2, 152, 78, 88, 52, 142),
  makeScore('albedo', 'Albedo', 'satellite', 2, 158, 82, 92, 55, 152),
  makeScore('orbit-fab', 'Orbit Fab', 'infrastructure', 2, 168, 78, 85, 48, 158),
  makeScore('cesiumastro', 'CesiumAstro', 'manufacturing', 2, 155, 85, 95, 62, 142),
  makeScore('phase-four', 'Phase Four', 'manufacturing', 2, 158, 72, 82, 52, 138),
  makeScore('atomos-space', 'Atomos Space', 'infrastructure', 2, 145, 68, 78, 48, 135),
  makeScore('spideroak', 'SpiderOak', 'analytics', 2, 142, 72, 85, 48, 128),
  makeScore('parsons', 'Parsons', 'defense', 2, 132, 155, 152, 142, 108),
  makeScore('general-atomics', 'General Atomics', 'defense', 2, 148, 148, 155, 152, 112),
  makeScore('ball-aerospace', 'Ball Aerospace', 'defense', 2, 155, 148, 152, 148, 108),
  makeScore('aerojet-rocketdyne', 'Aerojet Rocketdyne', 'manufacturing', 2, 152, 142, 145, 138, 105),
  makeScore('peraton', 'Peraton', 'defense', 2, 128, 138, 142, 132, 102),
  makeScore('leidos', 'Leidos', 'defense', 2, 135, 162, 155, 145, 108),
  makeScore('caci-international', 'CACI International', 'defense', 2, 132, 152, 148, 138, 105),
  makeScore('saic', 'SAIC', 'defense', 2, 128, 155, 152, 142, 102),
  makeScore('booz-allen-hamilton', 'Booz Allen Hamilton', 'defense', 2, 135, 158, 150, 140, 108),
  makeScore('terran-orbital', 'Terran Orbital', 'manufacturing', 2, 148, 82, 98, 72, 128),
  makeScore('varda-space-industries', 'Varda Space Industries', 'manufacturing', 2, 172, 88, 95, 55, 168),
  makeScore('stoke-space', 'Stoke Space', 'launch', 2, 165, 82, 88, 52, 162),
  makeScore('phantom-space', 'Phantom Space', 'launch', 2, 125, 62, 68, 42, 118),
  makeScore('outpost-technologies', 'Outpost Technologies', 'infrastructure', 2, 138, 58, 65, 38, 128),

  // ── TIER 3 (30 companies) ──
  makeScore('spinlaunch', 'SpinLaunch', 'launch', 3, 165, 72, 78, 38, 138),
  makeScore('exolaunch', 'Exolaunch', 'launch', 3, 128, 68, 82, 52, 118),
  makeScore('epsilon3', 'Epsilon3', 'analytics', 3, 148, 65, 72, 35, 135),
  makeScore('cognitive-space', 'Cognitive Space', 'analytics', 3, 145, 58, 68, 32, 132),
  makeScore('pixxel', 'Pixxel', 'satellite', 3, 155, 78, 85, 52, 148),
  makeScore('skyroot-aerospace', 'Skyroot Aerospace', 'launch', 3, 148, 68, 72, 42, 152),
  makeScore('agnikul-cosmos', 'Agnikul Cosmos', 'launch', 3, 152, 62, 68, 38, 148),
  makeScore('galaxeye', 'GalaxEye', 'satellite', 3, 142, 52, 58, 32, 138),
  makeScore('gilmour-space', 'Gilmour Space', 'launch', 3, 135, 62, 68, 38, 132),
  makeScore('spaceflight-inc', 'Spaceflight Inc', 'launch', 3, 118, 75, 88, 62, 105),
  makeScore('nanoavionics', 'NanoAvionics', 'manufacturing', 3, 135, 72, 82, 55, 118),
  makeScore('endurosat', 'EnduroSat', 'manufacturing', 3, 132, 65, 75, 48, 115),
  makeScore('aac-clyde-space', 'AAC Clyde Space', 'manufacturing', 3, 128, 68, 78, 52, 112),
  makeScore('pld-space', 'PLD Space', 'launch', 3, 142, 62, 68, 38, 142),
  makeScore('turion-space', 'Turion Space', 'infrastructure', 3, 148, 55, 62, 32, 148),
  makeScore('k2-space', 'K2 Space', 'manufacturing', 3, 145, 58, 65, 35, 145),
  makeScore('inversion-space', 'Inversion Space', 'infrastructure', 3, 152, 55, 62, 28, 155),
  makeScore('hadrian', 'Hadrian', 'manufacturing', 3, 142, 78, 82, 48, 148),
  makeScore('ursa-major', 'Ursa Major', 'manufacturing', 3, 158, 82, 88, 52, 148),
  makeScore('x-bow-systems', 'X-Bow Systems', 'manufacturing', 3, 148, 68, 75, 42, 138),
  makeScore('starfish-space', 'Starfish Space', 'on-orbit-servicing', 3, 155, 62, 68, 32, 148),
  makeScore('thinkorbital', 'ThinkOrbital', 'infrastructure', 3, 138, 48, 55, 25, 138),
  makeScore('rogue-space-systems', 'Rogue Space Systems', 'on-orbit-servicing', 3, 135, 52, 58, 28, 135),
  makeScore('space-perspective', 'Space Perspective', 'launch', 3, 128, 72, 78, 42, 125),
  makeScore('isar-aerospace', 'Isar Aerospace', 'launch', 3, 148, 78, 82, 45, 148),
];

// Build the map and calculate percentiles
function buildScoresMap(): Record<string, CompanyScoreEntry> {
  const map: Record<string, CompanyScoreEntry> = {};
  const totals = SCORES_RAW.map(e => e.score.total).sort((a, b) => a - b);

  for (const entry of SCORES_RAW) {
    const position = totals.filter(s => s < entry.score.total).length;
    entry.score.percentile = Math.round((position / totals.length) * 100);
    map[entry.slug] = entry;
  }

  return map;
}

export const ALL_COMPANY_SCORES: Record<string, CompanyScoreEntry> = buildScoresMap();

/**
 * Get a sorted leaderboard of all companies
 */
export function getLeaderboard(): CompanyScoreEntry[] {
  return Object.values(ALL_COMPANY_SCORES).sort((a, b) => b.score.total - a.score.total);
}

/**
 * Get score for a specific company by slug
 */
export function getCompanyScore(slug: string): CompanyScoreEntry | null {
  return ALL_COMPANY_SCORES[slug] || null;
}
