import { SubscriptionTier } from '@/types';

export interface UserSubscription {
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'past_due';
  startDate: Date | null;
  endDate: Date | null;
}

// Feature access by tier
export const TIER_ACCESS: Record<SubscriptionTier, {
  maxDailyArticles: number;
  hasStockTracking: boolean;
  hasMarketIntel: boolean;
  hasResourceExchange: boolean;
  hasAIOpportunities: boolean;
  hasAlerts: boolean;
  hasAPIAccess: boolean;
  adFree: boolean;
}> = {
  free: {
    maxDailyArticles: 25,
    hasStockTracking: false,
    hasMarketIntel: true,
    hasResourceExchange: false,
    hasAIOpportunities: false,
    hasAlerts: false,
    hasAPIAccess: false,
    adFree: false,
  },
  pro: {
    maxDailyArticles: -1, // unlimited
    hasStockTracking: true,
    hasMarketIntel: true,
    hasResourceExchange: true,
    hasAIOpportunities: false,
    hasAlerts: true,
    hasAPIAccess: false,
    adFree: true,
  },
  enterprise: {
    maxDailyArticles: -1,
    hasStockTracking: true,
    hasMarketIntel: true,
    hasResourceExchange: true,
    hasAIOpportunities: true,
    hasAlerts: true,
    hasAPIAccess: true,
    adFree: true,
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

// Module tier requirements — single source of truth
const PREMIUM_MODULES: Record<string, SubscriptionTier> = {
  // Pro tier — professional analytics & intelligence
  'resource-exchange': 'pro',
  'supply-chain': 'pro',
  'startup-tracker': 'pro',
  'space-economy': 'pro',
  // Enterprise tier — organizational & compliance tools
  'business-opportunities': 'enterprise',
  'spectrum-tracker': 'enterprise',
  'space-insurance': 'enterprise',
  'compliance': 'enterprise',
  'orbital-services': 'enterprise',
  'patent-tracker': 'enterprise',
};

const TIER_ORDER: SubscriptionTier[] = ['free', 'pro', 'enterprise'];

export function canAccessModule(tier: SubscriptionTier, moduleId: string): boolean {
  const requiredTier = PREMIUM_MODULES[moduleId];
  if (!requiredTier) return true; // Free module
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(requiredTier);
}

export function getRequiredTierForModule(moduleId: string): SubscriptionTier | null {
  return PREMIUM_MODULES[moduleId] || null;
}
