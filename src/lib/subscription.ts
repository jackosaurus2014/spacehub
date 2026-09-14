import { SubscriptionTier } from '@/types';

export interface UserSubscription {
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'past_due';
  startDate: Date | null;
  endDate: Date | null;
}

/**
 * Normalize a tier string read from the database (or any external source)
 * into the current tier set.
 *
 * MIGRATION NOTE (2026-09-14, SpaceNexus Research):
 * Legacy 'enterprise' rows are the withdrawn $49.99/mo Enterprise plan that was
 * collapsed into Pro on 2026-08-11 (c940dce7, one production row migrated).
 * They keep mapping to 'pro' and must NOT be promoted to 'research': Research
 * is an annual firm seat at a very different price, and silently granting it
 * would give away paid capability. Equally they are not demoted — an
 * 'enterprise' row resolves to exactly the access it has had since August. The
 * legacy STRIPE_PRICE_ENTERPRISE_* price IDs likewise keep resolving to 'pro'
 * in lib/stripe.ts; Research is sold from its own price ID.
 */
export function normalizeTier(tier: string | null | undefined): SubscriptionTier {
  if (tier === 'enterprise') return 'pro';
  if (tier === 'pro' || tier === 'research' || tier === 'test') return tier;
  return 'free';
}

// Feature access by tier — a single paid tier (Pro) unlocks everything.
export const TIER_ACCESS: Record<SubscriptionTier, {
  maxDailyArticles: number;
  hasStockTracking: boolean;
  hasMarketIntel: boolean;
  hasResourceExchange: boolean;
  hasAIOpportunities: boolean;
  hasAlerts: boolean;
  hasAPIAccess: boolean;
  adFree: boolean;
  hasDealFlow: boolean;
  hasSupplyChainMap: boolean;
  hasExecutiveMoves: boolean;
  hasRegulatoryCalendar: boolean;
  hasSpaceScore: boolean;
  hasSalaryData: boolean;
  // --- SpaceNexus Research (2026-09-14) ---------------------------------
  // Every flag below was ADDED for the Research tier and is false for free
  // and pro. No flag above this line changed value when Research shipped: no
  // free or Pro capability was moved up. Adding a capability to free or pro
  // later is fine; flipping an OLDER flag from true to false for them is a
  // downgrade and is forbidden — tier-model.test.ts asserts the free and pro
  // rows against a frozen 2026-09-14 baseline.
  /** Full-history CSV/JSON exports of funding, supply-chain and score data. */
  hasResearchExports: boolean;
  /** Supply-chain risk exposure computed across a saved company portfolio. */
  hasPortfolioExposure: boolean;
  /** Space Score time series + published methodology, not just today's score. */
  hasScoreHistory: boolean;
  /** Saved multi-criteria screens with scheduled change alerts. */
  hasResearchScreens: boolean;
  /** The dated quarterly sector-report archive. */
  hasQuarterlyReport: boolean;
  /** Multi-seat: one payer, several named users on the firm's subscription. */
  hasSeats: boolean;
}> = {
  free: {
    maxDailyArticles: 15,
    hasStockTracking: true, // /space-stocks is public
    hasMarketIntel: true,
    hasResourceExchange: true,
    hasAIOpportunities: true,
    hasAlerts: false,
    hasAPIAccess: false,
    adFree: false,
    hasDealFlow: true, // funding rounds are open (founder ruling 2026-08-29)
    hasSupplyChainMap: false,
    hasExecutiveMoves: true, // free teaser (limited)
    hasRegulatoryCalendar: false,
    hasSpaceScore: true, // free teaser (top 10 only)
    hasSalaryData: true, // free SEO page
    hasResearchExports: false,
    hasPortfolioExposure: false,
    hasScoreHistory: false,
    hasResearchScreens: false,
    hasQuarterlyReport: false,
    hasSeats: false,
  },
  pro: {
    maxDailyArticles: -1, // unlimited
    hasStockTracking: true,
    hasMarketIntel: true,
    hasResourceExchange: true,
    hasAIOpportunities: true,
    hasAlerts: true,
    hasAPIAccess: true,
    adFree: true,
    hasDealFlow: true,
    hasSupplyChainMap: true,
    hasExecutiveMoves: true,
    hasRegulatoryCalendar: true,
    hasSpaceScore: true,
    hasSalaryData: true,
    hasResearchExports: false,
    hasPortfolioExposure: false,
    hasScoreHistory: false,
    hasResearchScreens: false,
    hasQuarterlyReport: false,
    hasSeats: false,
  },
  // SpaceNexus Research — a strict SUPERSET of Pro. Every Pro value above is
  // repeated here unchanged; Research only adds. Note what is NOT here: API
  // rate limits are identical to Pro, because Pro API keys already reach the
  // unlimited 'enterprise' API tier (lib/api-keys.ts API_RATE_LIMITS) and
  // taking that away to resell it would be a downgrade.
  research: {
    maxDailyArticles: -1,
    hasStockTracking: true,
    hasMarketIntel: true,
    hasResourceExchange: true,
    hasAIOpportunities: true,
    hasAlerts: true,
    hasAPIAccess: true,
    adFree: true,
    hasDealFlow: true,
    hasSupplyChainMap: true,
    hasExecutiveMoves: true,
    hasRegulatoryCalendar: true,
    hasSpaceScore: true,
    hasSalaryData: true,
    hasResearchExports: true,
    hasPortfolioExposure: true,
    hasScoreHistory: true,
    hasResearchScreens: true,
    hasQuarterlyReport: true,
    hasSeats: true,
  },
  test: {
    maxDailyArticles: -1,
    hasStockTracking: true,
    hasMarketIntel: true,
    hasResourceExchange: true,
    hasAIOpportunities: true,
    hasAlerts: true,
    hasAPIAccess: true,
    adFree: true,
    hasDealFlow: true,
    hasSupplyChainMap: true,
    hasExecutiveMoves: true,
    hasRegulatoryCalendar: true,
    hasSpaceScore: true,
    hasSalaryData: true,
    hasResearchExports: true,
    hasPortfolioExposure: true,
    hasScoreHistory: true,
    hasResearchScreens: true,
    hasQuarterlyReport: true,
    hasSeats: true,
  },
};

/**
 * Length of the Professional trial. Registration auto-starts one and the
 * pricing page can start one for accounts that never had it; both must
 * agree with the "14-day" copy on /pricing and in the trial drip emails
 * (2026-09-08: registration silently granted 3 days while every email and
 * the pricing page promised 14).
 */
export const TRIAL_DAYS = 14;

export function isTrialActive(trialEndDate: Date | null): boolean {
  if (!trialEndDate) return false;
  return new Date() < new Date(trialEndDate);
}

export function canAccessFeature(
  tier: SubscriptionTier,
  feature: keyof typeof TIER_ACCESS['free']
): boolean {
  return TIER_ACCESS[tier][feature] as boolean;
}

// Module tier requirements — single source of truth.
// Every premium module requires the single paid tier (Pro).
// NOTE: recruitment-relevant modules (jobs, workforce, salary, executive-moves)
// are intentionally NOT listed here — they are fully public.
// Only surfaces whose own route is gated belong here. Funding rounds, patents,
// insurance, resource exchange, spectrum, orbital services, business
// opportunities and the economy dashboards are open at their URLs (founder
// ruling 2026-08-29, "information over profit"), so gating their homepage
// module while the same data is free one click away only misled people.
const PREMIUM_MODULES: Record<string, SubscriptionTier> = {
  'supply-chain': 'pro',
  'supply-chain-map': 'pro',
  'regulatory-calendar': 'pro',
  'compliance': 'pro',
  'api-docs': 'pro',
  'deal-rooms': 'pro',
  'customer-discovery': 'pro',
  // --- SpaceNexus Research modules (2026-09-14) -------------------------
  // All five are NEW surfaces that did not exist before Research. None of
  // them re-gates anything a free or Pro member could reach: /supply-chain,
  // /space-score, /funding-tracker, /regulatory-calendar and the v1 API all
  // keep the exact tier they had on 2026-09-13.
  'research-exports': 'research',
  'research-portfolio': 'research',
  'research-screens': 'research',
  'research-quarterly': 'research',
  'score-history': 'research',
};

// Ordered least- to most-privileged. 'research' sits above 'pro' so every Pro
// gate also passes for Research; 'test' stays at the top.
const TIER_ORDER: SubscriptionTier[] = ['free', 'pro', 'research', 'test'];

export function canAccessModule(tier: SubscriptionTier, moduleId: string): boolean {
  const requiredTier = PREMIUM_MODULES[moduleId];
  if (!requiredTier) return true; // Free module
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(requiredTier);
}

export function getRequiredTierForModule(moduleId: string): SubscriptionTier | null {
  return PREMIUM_MODULES[moduleId] || null;
}
