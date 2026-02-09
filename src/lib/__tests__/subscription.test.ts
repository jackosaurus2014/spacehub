import {
  canAccessFeature,
  canAccessModule,
  getRequiredTierForModule,
  isTrialActive,
  TIER_ACCESS,
} from '../subscription';

// ---------------------------------------------------------------------------
// TIER_ACCESS configuration
// ---------------------------------------------------------------------------
describe('TIER_ACCESS', () => {
  it('free tier has 25 max daily articles', () => {
    expect(TIER_ACCESS.free.maxDailyArticles).toBe(25);
  });

  it('pro tier has unlimited (-1) daily articles', () => {
    expect(TIER_ACCESS.pro.maxDailyArticles).toBe(-1);
  });

  it('enterprise tier has unlimited (-1) daily articles', () => {
    expect(TIER_ACCESS.enterprise.maxDailyArticles).toBe(-1);
  });

  it('free tier does not have stock tracking', () => {
    expect(TIER_ACCESS.free.hasStockTracking).toBe(false);
  });

  it('pro tier has stock tracking', () => {
    expect(TIER_ACCESS.pro.hasStockTracking).toBe(true);
  });

  it('enterprise tier has stock tracking', () => {
    expect(TIER_ACCESS.enterprise.hasStockTracking).toBe(true);
  });

  it('free tier is not ad-free', () => {
    expect(TIER_ACCESS.free.adFree).toBe(false);
  });

  it('pro tier is ad-free', () => {
    expect(TIER_ACCESS.pro.adFree).toBe(true);
  });

  it('enterprise tier is ad-free', () => {
    expect(TIER_ACCESS.enterprise.adFree).toBe(true);
  });

  it('only enterprise has API access', () => {
    expect(TIER_ACCESS.free.hasAPIAccess).toBe(false);
    expect(TIER_ACCESS.pro.hasAPIAccess).toBe(false);
    expect(TIER_ACCESS.enterprise.hasAPIAccess).toBe(true);
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

  it('enterprise users can access stock tracking', () => {
    expect(canAccessFeature('enterprise', 'hasStockTracking')).toBe(true);
  });

  it('enterprise users can access everything', () => {
    expect(canAccessFeature('enterprise', 'hasStockTracking')).toBe(true);
    expect(canAccessFeature('enterprise', 'hasMarketIntel')).toBe(true);
    expect(canAccessFeature('enterprise', 'hasResourceExchange')).toBe(true);
    expect(canAccessFeature('enterprise', 'hasAIOpportunities')).toBe(true);
    expect(canAccessFeature('enterprise', 'hasAlerts')).toBe(true);
    expect(canAccessFeature('enterprise', 'hasAPIAccess')).toBe(true);
    expect(canAccessFeature('enterprise', 'adFree')).toBe(true);
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

  it('free users cannot access enterprise modules (business-opportunities)', () => {
    expect(canAccessModule('free', 'business-opportunities')).toBe(false);
  });

  it('pro users can access pro modules (resource-exchange)', () => {
    expect(canAccessModule('pro', 'resource-exchange')).toBe(true);
  });

  it('pro users cannot access enterprise modules (business-opportunities)', () => {
    expect(canAccessModule('pro', 'business-opportunities')).toBe(false);
  });

  it('enterprise users can access all modules', () => {
    expect(canAccessModule('enterprise', 'news-feed')).toBe(true);
    expect(canAccessModule('enterprise', 'resource-exchange')).toBe(true);
    expect(canAccessModule('enterprise', 'business-opportunities')).toBe(true);
    expect(canAccessModule('enterprise', 'spectrum-tracker')).toBe(true);
    expect(canAccessModule('enterprise', 'space-insurance')).toBe(true);
    expect(canAccessModule('enterprise', 'compliance')).toBe(true);
    expect(canAccessModule('enterprise', 'orbital-services')).toBe(true);
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

  it('returns "enterprise" for business-opportunities', () => {
    expect(getRequiredTierForModule('business-opportunities')).toBe('enterprise');
  });

  it('returns "enterprise" for spectrum-tracker', () => {
    expect(getRequiredTierForModule('spectrum-tracker')).toBe('enterprise');
  });

  it('returns null for a free module', () => {
    expect(getRequiredTierForModule('news-feed')).toBeNull();
  });

  it('returns null for an unknown module', () => {
    expect(getRequiredTierForModule('nonexistent-module')).toBeNull();
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
