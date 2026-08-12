import {
  canAccessFeature,
  canAccessModule,
  getRequiredTierForModule,
  isTrialActive,
  normalizeTier,
  TIER_ACCESS,
} from '../subscription';

// ---------------------------------------------------------------------------
// TIER_ACCESS configuration
// ---------------------------------------------------------------------------
describe('TIER_ACCESS', () => {
  it('free tier has 15 max daily articles', () => {
    expect(TIER_ACCESS.free.maxDailyArticles).toBe(15);
  });

  it('pro tier has unlimited (-1) daily articles', () => {
    expect(TIER_ACCESS.pro.maxDailyArticles).toBe(-1);
  });

  it('free tier does not have stock tracking', () => {
    expect(TIER_ACCESS.free.hasStockTracking).toBe(false);
  });

  it('pro tier has stock tracking', () => {
    expect(TIER_ACCESS.pro.hasStockTracking).toBe(true);
  });

  it('free tier is not ad-free', () => {
    expect(TIER_ACCESS.free.adFree).toBe(false);
  });

  it('pro tier is ad-free', () => {
    expect(TIER_ACCESS.pro.adFree).toBe(true);
  });

  it('pro and test have API access; free does not', () => {
    expect(TIER_ACCESS.free.hasAPIAccess).toBe(false);
    expect(TIER_ACCESS.pro.hasAPIAccess).toBe(true);
    expect(TIER_ACCESS.test.hasAPIAccess).toBe(true);
  });

  it('pro tier unlocks everything (single paid tier)', () => {
    expect(TIER_ACCESS.pro.hasAIOpportunities).toBe(true);
    expect(TIER_ACCESS.pro.hasDealFlow).toBe(true);
    expect(TIER_ACCESS.pro.hasSupplyChainMap).toBe(true);
    expect(TIER_ACCESS.pro.hasRegulatoryCalendar).toBe(true);
    expect(TIER_ACCESS.pro.hasAlerts).toBe(true);
    expect(TIER_ACCESS.pro.hasResourceExchange).toBe(true);
  });

  it('test tier has full access (same as pro)', () => {
    expect(TIER_ACCESS.test.maxDailyArticles).toBe(-1);
    expect(TIER_ACCESS.test.hasStockTracking).toBe(true);
    expect(TIER_ACCESS.test.hasMarketIntel).toBe(true);
    expect(TIER_ACCESS.test.hasResourceExchange).toBe(true);
    expect(TIER_ACCESS.test.hasAIOpportunities).toBe(true);
    expect(TIER_ACCESS.test.hasAlerts).toBe(true);
    expect(TIER_ACCESS.test.hasAPIAccess).toBe(true);
    expect(TIER_ACCESS.test.adFree).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// normalizeTier
// ---------------------------------------------------------------------------
describe('normalizeTier', () => {
  it('maps legacy "enterprise" to "pro"', () => {
    expect(normalizeTier('enterprise')).toBe('pro');
  });

  it('passes through "pro"', () => {
    expect(normalizeTier('pro')).toBe('pro');
  });

  it('passes through "test"', () => {
    expect(normalizeTier('test')).toBe('test');
  });

  it('passes through "free"', () => {
    expect(normalizeTier('free')).toBe('free');
  });

  it('maps null/undefined to "free"', () => {
    expect(normalizeTier(null)).toBe('free');
    expect(normalizeTier(undefined)).toBe('free');
  });

  it('maps unknown strings to "free"', () => {
    expect(normalizeTier('platinum')).toBe('free');
    expect(normalizeTier('')).toBe('free');
  });
});

// ---------------------------------------------------------------------------
// canAccessFeature
// ---------------------------------------------------------------------------
describe('canAccessFeature', () => {
  it('free users cannot access stock tracking', () => {
    expect(canAccessFeature('free', 'hasStockTracking')).toBe(false);
  });

  it('pro users can access stock tracking', () => {
    expect(canAccessFeature('pro', 'hasStockTracking')).toBe(true);
  });

  it('pro users can access everything', () => {
    expect(canAccessFeature('pro', 'hasStockTracking')).toBe(true);
    expect(canAccessFeature('pro', 'hasMarketIntel')).toBe(true);
    expect(canAccessFeature('pro', 'hasResourceExchange')).toBe(true);
    expect(canAccessFeature('pro', 'hasAIOpportunities')).toBe(true);
    expect(canAccessFeature('pro', 'hasAlerts')).toBe(true);
    expect(canAccessFeature('pro', 'hasAPIAccess')).toBe(true);
    expect(canAccessFeature('pro', 'adFree')).toBe(true);
    expect(canAccessFeature('pro', 'hasDealFlow')).toBe(true);
  });

  it('free users can access market intel (free feature)', () => {
    expect(canAccessFeature('free', 'hasMarketIntel')).toBe(true);
  });

  it('free users cannot access AI opportunities', () => {
    expect(canAccessFeature('free', 'hasAIOpportunities')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canAccessModule
// ---------------------------------------------------------------------------
describe('canAccessModule', () => {
  it('free users can access free modules (e.g. news-feed)', () => {
    expect(canAccessModule('free', 'news-feed')).toBe(true);
  });

  it('free users cannot access pro modules (resource-exchange)', () => {
    expect(canAccessModule('free', 'resource-exchange')).toBe(false);
  });

  it('free users cannot access pro modules (business-opportunities)', () => {
    expect(canAccessModule('free', 'business-opportunities')).toBe(false);
  });

  it('pro users can access all premium modules', () => {
    expect(canAccessModule('pro', 'news-feed')).toBe(true);
    expect(canAccessModule('pro', 'resource-exchange')).toBe(true);
    expect(canAccessModule('pro', 'business-opportunities')).toBe(true);
    expect(canAccessModule('pro', 'spectrum-tracker')).toBe(true);
    expect(canAccessModule('pro', 'space-insurance')).toBe(true);
    expect(canAccessModule('pro', 'compliance')).toBe(true);
    expect(canAccessModule('pro', 'orbital-services')).toBe(true);
    expect(canAccessModule('pro', 'api-docs')).toBe(true);
  });

  it('test users can access all modules', () => {
    expect(canAccessModule('test', 'news-feed')).toBe(true);
    expect(canAccessModule('test', 'resource-exchange')).toBe(true);
    expect(canAccessModule('test', 'business-opportunities')).toBe(true);
    expect(canAccessModule('test', 'spectrum-tracker')).toBe(true);
    expect(canAccessModule('test', 'compliance')).toBe(true);
    expect(canAccessModule('test', 'patent-tracker')).toBe(true);
  });

  it('any tier can access an unknown module (defaults to free)', () => {
    expect(canAccessModule('free', 'some-unknown-module')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getRequiredTierForModule
// ---------------------------------------------------------------------------
describe('getRequiredTierForModule', () => {
  it('returns "pro" for resource-exchange', () => {
    expect(getRequiredTierForModule('resource-exchange')).toBe('pro');
  });

  it('returns "pro" for business-opportunities', () => {
    expect(getRequiredTierForModule('business-opportunities')).toBe('pro');
  });

  it('returns "pro" for spectrum-tracker', () => {
    expect(getRequiredTierForModule('spectrum-tracker')).toBe('pro');
  });

  it('returns null for a free module', () => {
    expect(getRequiredTierForModule('news-feed')).toBeNull();
  });

  it('returns null for an unknown module', () => {
    expect(getRequiredTierForModule('nonexistent-module')).toBeNull();
  });

  it('returns null for removed AI report modules (intel-reports, investment-thesis)', () => {
    expect(getRequiredTierForModule('intel-reports')).toBeNull();
    expect(getRequiredTierForModule('investment-thesis')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isTrialActive
// ---------------------------------------------------------------------------
describe('isTrialActive', () => {
  it('returns true for a future trial end date', () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    expect(isTrialActive(futureDate)).toBe(true);
  });

  it('returns false for a past trial end date', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(isTrialActive(pastDate)).toBe(false);
  });

  it('returns false when trial end date is null', () => {
    expect(isTrialActive(null)).toBe(false);
  });
});
