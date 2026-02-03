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
    maxDailyArticles: 10,
    hasStockTracking: false,
    hasMarketIntel: false,
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

export function canAccessFeature(
  tier: SubscriptionTier,
  feature: keyof typeof TIER_ACCESS['free']
): boolean {
  return TIER_ACCESS[tier][feature] as boolean;
}

export function canAccessModule(tier: SubscriptionTier, moduleId: string): boolean {
  const premiumModules: Record<string, SubscriptionTier> = {
    'market-intel': 'pro',
    'resource-exchange': 'pro',
    'business-opportunities': 'enterprise',
  };

  const requiredTier = premiumModules[moduleId];
  if (!requiredTier) return true; // Free module

  const tierOrder: SubscriptionTier[] = ['free', 'pro', 'enterprise'];
  return tierOrder.indexOf(tier) >= tierOrder.indexOf(requiredTier);
}

export function getRequiredTierForModule(moduleId: string): SubscriptionTier | null {
  const premiumModules: Record<string, SubscriptionTier> = {
    'market-intel': 'pro',
    'resource-exchange': 'pro',
    'business-opportunities': 'enterprise',
  };
  return premiumModules[moduleId] || null;
}
