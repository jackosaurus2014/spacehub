/**
 * Centralized company profile completeness scoring.
 *
 * Total: 100 points across 5 categories.
 *
 * The function is pure — it accepts a company object (with scalar fields
 * and `_count` for relations) and returns a 0-100 integer score.
 *
 * Expected shape (use Prisma `_count` select to populate relation counts):
 *   {
 *     name, slug, description, longDescription, ceo, headquarters, country,
 *     website, foundedYear, employeeCount, employeeRange, sector, tags,
 *     linkedinUrl, twitterUrl, totalFunding, marketCap, revenueEstimate,
 *     ticker, exchange, isPublic,
 *     _count: {
 *       fundingRounds, revenueEstimates, products, keyPersonnel,
 *       facilities, satelliteAssets, contracts, events, partnerships,
 *       acquisitions, scores, secFilings, competitorOf, newsArticles,
 *     }
 *   }
 */

/**
 * Minimal type describing the company object shape expected by calculateCompleteness.
 * This avoids coupling to the full Prisma type and allows seed scripts to pass
 * plain objects with the same keys.
 */
export interface CompanyForScoring {
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  longDescription?: string | null;
  ceo?: string | null;
  headquarters?: string | null;
  country?: string | null;
  website?: string | null;
  foundedYear?: number | null;
  employeeCount?: number | null;
  employeeRange?: string | null;
  sector?: string | null;
  tags?: string[] | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  totalFunding?: number | null;
  marketCap?: number | null;
  revenueEstimate?: number | null;
  ticker?: string | null;
  exchange?: string | null;
  isPublic?: boolean | null;
  _count?: {
    fundingRounds?: number;
    revenueEstimates?: number;
    products?: number;
    keyPersonnel?: number;
    facilities?: number;
    satelliteAssets?: number;
    contracts?: number;
    events?: number;
    partnerships?: number;
    acquisitions?: number;
    scores?: number;
    secFilings?: number;
    competitorOf?: number;
    newsArticles?: number;
  };
}

/**
 * Breakdown of the completeness score by category, useful for debugging
 * and for displaying which areas need improvement.
 */
export interface CompletenessBreakdown {
  total: number;
  basicInfo: number;
  financialData: number;
  productsOperations: number;
  businessIntelligence: number;
  externalData: number;
}

/** Helper to safely read a count value, defaulting to 0. */
function cnt(counts: CompanyForScoring['_count'], key: string): number {
  if (!counts) return 0;
  return (counts as Record<string, number | undefined>)[key] ?? 0;
}

/**
 * Calculate a 0-100 completeness score for a company profile.
 *
 * @param company  A company object with scalar fields and `_count` for relations.
 * @returns        Integer score clamped to [0, 100].
 */
export function calculateCompleteness(company: CompanyForScoring): number {
  return calculateCompletenessBreakdown(company).total;
}

/**
 * Calculate completeness with a per-category breakdown.
 *
 * Categories and their maximum points:
 *   Basic Info ............... 30
 *   Financial Data ........... 25
 *   Products & Operations .... 20
 *   Business Intelligence .... 15
 *   External Data ............ 10
 *                             ---
 *   Total ................... 100
 */
export function calculateCompletenessBreakdown(company: CompanyForScoring): CompletenessBreakdown {
  const counts = company._count;

  // ── Basic Info (30 pts max) ────────────────────────────────────────────
  let basicInfo = 5; // name + slug always exist for stored profiles

  if (company.description) basicInfo += 3;
  if (company.longDescription) basicInfo += 5;
  if (company.ceo) basicInfo += 3;
  if (company.headquarters && company.country) basicInfo += 3;
  if (company.website) basicInfo += 2;
  if (company.foundedYear) basicInfo += 2;
  if (company.employeeCount || company.employeeRange) basicInfo += 2;
  if (company.sector && company.tags && company.tags.length > 0) basicInfo += 2;
  if (company.linkedinUrl || company.twitterUrl) basicInfo += 3;

  basicInfo = Math.min(basicInfo, 30);

  // ── Financial Data (25 pts max) ────────────────────────────────────────
  let financialData = 0;

  if (company.totalFunding || company.marketCap) financialData += 5;
  if (company.revenueEstimate) financialData += 5;
  if (cnt(counts, 'fundingRounds') >= 1) financialData += 5;
  if (cnt(counts, 'fundingRounds') >= 3) financialData += 3; // bonus
  if (cnt(counts, 'revenueEstimates') >= 1) financialData += 4;
  if (company.ticker && company.exchange) financialData += 3;

  financialData = Math.min(financialData, 25);

  // ── Products & Operations (20 pts max) ─────────────────────────────────
  let productsOperations = 0;

  if (cnt(counts, 'products') >= 1) productsOperations += 5;
  if (cnt(counts, 'products') >= 3) productsOperations += 3; // bonus
  if (cnt(counts, 'keyPersonnel') >= 1) productsOperations += 4;
  if (cnt(counts, 'keyPersonnel') >= 3) productsOperations += 3; // bonus
  if (cnt(counts, 'facilities') >= 1) productsOperations += 3;
  if (cnt(counts, 'satelliteAssets') >= 1) productsOperations += 2; // for relevant sectors

  productsOperations = Math.min(productsOperations, 20);

  // ── Business Intelligence (15 pts max) ─────────────────────────────────
  let businessIntelligence = 0;

  if (cnt(counts, 'contracts') >= 1) businessIntelligence += 4;
  if (cnt(counts, 'contracts') >= 3) businessIntelligence += 2; // bonus
  if (cnt(counts, 'events') >= 1) businessIntelligence += 3;
  if (cnt(counts, 'events') >= 5) businessIntelligence += 2; // bonus
  if (cnt(counts, 'partnerships') >= 1) businessIntelligence += 2;
  if (cnt(counts, 'acquisitions') >= 1) businessIntelligence += 2;

  businessIntelligence = Math.min(businessIntelligence, 15);

  // ── External Data (10 pts max) ─────────────────────────────────────────
  let externalData = 0;

  if (cnt(counts, 'scores') >= 1) externalData += 3;
  if (cnt(counts, 'secFilings') >= 1) externalData += 2; // for public companies
  if (cnt(counts, 'competitorOf') >= 1) externalData += 3;
  if (cnt(counts, 'newsArticles') >= 1) externalData += 2;

  externalData = Math.min(externalData, 10);

  // ── Total ──────────────────────────────────────────────────────────────
  const total = Math.min(
    basicInfo + financialData + productsOperations + businessIntelligence + externalData,
    100
  );

  return {
    total,
    basicInfo,
    financialData,
    productsOperations,
    businessIntelligence,
    externalData,
  };
}

/**
 * The Prisma `_count` select object needed to populate the company object
 * for scoring. Import this in API routes / scripts to avoid duplicating
 * the field list.
 */
export const COMPLETENESS_COUNT_SELECT = {
  fundingRounds: true,
  revenueEstimates: true,
  products: true,
  keyPersonnel: true,
  facilities: true,
  satelliteAssets: true,
  contracts: true,
  events: true,
  partnerships: true,
  acquisitions: true,
  scores: true,
  secFilings: true,
  competitorOf: true,
  newsArticles: true,
} as const;

/**
 * The Prisma scalar field select needed for scoring (all the non-relation
 * fields that calculateCompleteness checks).
 */
export const COMPLETENESS_SCALAR_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  longDescription: true,
  ceo: true,
  headquarters: true,
  country: true,
  website: true,
  foundedYear: true,
  employeeCount: true,
  employeeRange: true,
  sector: true,
  tags: true,
  linkedinUrl: true,
  twitterUrl: true,
  totalFunding: true,
  marketCap: true,
  revenueEstimate: true,
  ticker: true,
  exchange: true,
  isPublic: true,
  dataCompleteness: true,
} as const;
