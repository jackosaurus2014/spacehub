import { SubscriptionTier } from '@/types';

export interface UserSubscription {
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'past_due';
  startDate: Date | null;
  endDate: Date | null;
}

/**
 * Normalize a tier string read from the database (or any external source)
 * into the current tier set. Legacy 'enterprise' subscribers keep full paid
 * access by mapping to 'pro'.
 */
export function normalizeTier(tier: string | null | undefined): SubscriptionTier {
  if (tier === 'enterprise') return 'pro';
  if (tier === 'pro' || tier === 'test') return tier;
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
}> = {
  free: {
    maxDailyArticles: 15,
    hasStockTracking: false,
    hasMarketIntel: true,
    hasResourceExchange: false,
    hasAIOpportunities: false,
    hasAlerts: false,
    hasAPIAccess: false,
    adFree: false,
    hasDealFlow: false,
    hasSupplyChainMap: false,
    hasExecutiveMoves: true, // free teaser (limited)
    hasRegulatoryCalendar: false,
    hasSpaceScore: true, // free teaser (top 10 only)
    hasSalaryData: true, // free SEO page
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
  },
};

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
const PREMIUM_MODULES: Record<string, SubscriptionTier> = {
  'resource-exchange': 'pro',
  'supply-chain': 'pro',
  'space-capital': 'pro',
  'space-economy': 'pro',
  'deal-flow': 'pro',
  'supply-chain-map': 'pro',
  'regulatory-calendar': 'pro',
  'business-opportunities': 'pro',
  'spectrum-tracker': 'pro',
  'space-insurance': 'pro',
  'compliance': 'pro',
  'orbital-services': 'pro',
  'patent-tracker': 'pro',
  'api-docs': 'pro',
  'deal-rooms': 'pro',
  'funding-tracker': 'pro',
  'customer-discovery': 'pro',
};

const TIER_ORDER: SubscriptionTier[] = ['free', 'pro', 'test'];

export function canAccessModule(tier: SubscriptionTier, moduleId: string): boolean {
  const requiredTier = PREMIUM_MODULES[moduleId];
  if (!requiredTier) return true; // Free module
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(requiredTier);
}

export function getRequiredTierForModule(moduleId: string): SubscriptionTier | null {
  return PREMIUM_MODULES[moduleId] || null;
}
