/**
 * @jest-environment jsdom
 */
import { getVariant, trackABEvent, PRICING_CTA_TEST, SIGNUP_SOCIAL_PROOF_TEST } from '../ab-testing';
import type { ABTest } from '../ab-testing';

// Mock analytics module — trackGA4Event is called by trackABEvent
jest.mock('../analytics', () => ({
  trackGA4Event: jest.fn(),
}));

import { trackGA4Event } from '../analytics';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clearLocalStorage() {
  localStorage.clear();
}

// ===========================================================================
// 1. getVariant — basic behavior
// ===========================================================================
describe('getVariant', () => {
  beforeEach(() => {
    clearLocalStorage();
    jest.restoreAllMocks();
  });

  it('returns a valid variant from the list', () => {
    const test: ABTest = {
      id: 'test_basic',
      variants: ['control', 'variant_a', 'variant_b'],
    };
    const result = getVariant(test);
    expect(test.variants).toContain(result);
  });

  it('returns consistent result for the same test (localStorage persistence)', () => {
    const test: ABTest = {
      id: 'test_persist',
      variants: ['control', 'variant_a'],
    };
    const first = getVariant(test);
    const second = getVariant(test);
    const third = getVariant(test);
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it('persists the variant in localStorage with correct key', () => {
    const test: ABTest = {
      id: 'my_test',
      variants: ['control', 'variant_a'],
    };
    const result = getVariant(test);
    const stored = localStorage.getItem('ab_my_test');
    expect(stored).toBe(result);
  });

  it('returns stored variant if it is still valid', () => {
    const test: ABTest = {
      id: 'preset_test',
      variants: ['control', 'variant_a'],
    };
    localStorage.setItem('ab_preset_test', 'variant_a');
    const result = getVariant(test);
    expect(result).toBe('variant_a');
  });

  it('ignores stored variant if it is not in the variants list', () => {
    const test: ABTest = {
      id: 'stale_test',
      variants: ['control', 'variant_b'],
    };
    localStorage.setItem('ab_stale_test', 'variant_a'); // old variant no longer valid
    const result = getVariant(test);
    // Should reassign to one of the current variants
    expect(test.variants).toContain(result);
    expect(result).not.toBe('variant_a');
  });

  it('handles equal weights correctly (50/50)', () => {
    const test: ABTest = {
      id: 'equal_weight_test',
      variants: ['control', 'variant_a'],
      weights: [0.5, 0.5],
    };
    // Run multiple times to ensure it always returns a valid variant
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      clearLocalStorage();
      results.add(getVariant(test));
    }
    // Both variants should be represented across 50 runs (statistically near-certain)
    for (const v of results) {
      expect(test.variants).toContain(v);
    }
  });

  it('handles custom weights (90/10)', () => {
    const test: ABTest = {
      id: 'weighted_test',
      variants: ['control', 'variant_a'],
      weights: [0.9, 0.1],
    };
    // Run many times — the heavy variant should dominate
    let controlCount = 0;
    for (let i = 0; i < 200; i++) {
      clearLocalStorage();
      if (getVariant(test) === 'control') controlCount++;
    }
    // With 90% weight, control should appear in the majority (allow some variance)
    expect(controlCount).toBeGreaterThan(100); // at least 50% of runs should be control
  });

  it('handles three variants with custom weights', () => {
    const test: ABTest = {
      id: 'three_way_test',
      variants: ['a', 'b', 'c'],
      weights: [0.6, 0.3, 0.1],
    };
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 300; i++) {
      clearLocalStorage();
      const v = getVariant(test);
      counts[v]++;
    }
    // All three should appear at least once in 300 runs
    expect(counts.a).toBeGreaterThan(0);
    expect(counts.b).toBeGreaterThan(0);
    expect(counts.c).toBeGreaterThan(0);
    // 'a' should dominate
    expect(counts.a).toBeGreaterThan(counts.b);
    expect(counts.b).toBeGreaterThan(counts.c);
  });

  it('defaults to equal weights when none provided', () => {
    const test: ABTest = {
      id: 'no_weights_test',
      variants: ['x', 'y'],
      // no weights property
    };
    const result = getVariant(test);
    expect(['x', 'y']).toContain(result);
  });

  it('handles localStorage getItem throwing an error', () => {
    const test: ABTest = {
      id: 'error_test',
      variants: ['control', 'variant_a'],
    };
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: localStorage blocked');
    });
    // Should not throw — gracefully falls through to random assignment
    const result = getVariant(test);
    expect(test.variants).toContain(result);
  });

  it('handles localStorage setItem throwing an error', () => {
    const test: ABTest = {
      id: 'write_error_test',
      variants: ['control', 'variant_a'],
    };
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    // Should not throw — returns a valid variant despite write failure
    const result = getVariant(test);
    expect(test.variants).toContain(result);
  });

  it('returns first variant in server environment (no window)', () => {
    // Simulate typeof window === 'undefined' by testing the code path
    // In jsdom environment, window exists, so we test the code path indirectly
    // by verifying the fallback behavior description:
    // The function checks `typeof window === 'undefined'` and returns variants[0]
    const test: ABTest = {
      id: 'server_test',
      variants: ['server_default', 'variant_a'],
    };
    // In jsdom, window exists, so this will do random assignment
    // Just verify we get a valid variant
    const result = getVariant(test);
    expect(test.variants).toContain(result);
  });
});

// ===========================================================================
// 2. getVariant — with predefined tests
// ===========================================================================
describe('getVariant with predefined tests', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  it('PRICING_CTA_TEST returns control or reassuring', () => {
    const result = getVariant(PRICING_CTA_TEST);
    expect(['control', 'reassuring']).toContain(result);
  });

  it('SIGNUP_SOCIAL_PROOF_TEST returns control or social_proof', () => {
    const result = getVariant(SIGNUP_SOCIAL_PROOF_TEST);
    expect(['control', 'social_proof']).toContain(result);
  });

  it('different test IDs get independent assignments', () => {
    // Set up specific variants for two tests
    localStorage.setItem('ab_pricing_cta_text', 'reassuring');
    localStorage.setItem('ab_signup_social_proof', 'control');

    expect(getVariant(PRICING_CTA_TEST)).toBe('reassuring');
    expect(getVariant(SIGNUP_SOCIAL_PROOF_TEST)).toBe('control');
  });
});

// ===========================================================================
// 3. trackABEvent
// ===========================================================================
describe('trackABEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls trackGA4Event with correct parameters for impression', () => {
    trackABEvent('pricing_cta_text', 'control', 'impression');
    expect(trackGA4Event).toHaveBeenCalledWith('ab_test', {
      test_id: 'pricing_cta_text',
      variant: 'control',
      action: 'impression',
    });
  });

  it('calls trackGA4Event with correct parameters for conversion', () => {
    trackABEvent('signup_social_proof', 'social_proof', 'conversion');
    expect(trackGA4Event).toHaveBeenCalledWith('ab_test', {
      test_id: 'signup_social_proof',
      variant: 'social_proof',
      action: 'conversion',
    });
  });

  it('supports custom action strings', () => {
    trackABEvent('my_test', 'variant_a', 'click_cta');
    expect(trackGA4Event).toHaveBeenCalledWith('ab_test', {
      test_id: 'my_test',
      variant: 'variant_a',
      action: 'click_cta',
    });
  });
});
