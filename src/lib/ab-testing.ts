/**
 * Lightweight A/B Testing Utility
 *
 * Uses localStorage for persistent variant assignment so users always see
 * the same variant. Tracks impressions and conversions via GA4 custom events.
 *
 * No external dependencies — just localStorage + gtag.
 *
 * Usage:
 *   import { getVariant, trackABEvent } from '@/lib/ab-testing';
 *
 *   const variant = getVariant(PRICING_CTA_TEST);
 *   trackABEvent(PRICING_CTA_TEST.id, variant, 'impression');
 *   // ... on CTA click:
 *   trackABEvent(PRICING_CTA_TEST.id, variant, 'conversion');
 */

import { trackGA4Event } from '@/lib/analytics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ABTest {
  /** Unique identifier for this test (used as localStorage key suffix) */
  id: string;
  /** Variant names, e.g. ['control', 'variant_a'] */
  variants: string[];
  /** Optional weights (must sum to 1). Defaults to equal distribution. */
  weights?: number[];
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'ab_';

/**
 * Get (or assign) a variant for the given test.
 * Assignment is persisted in localStorage so the user always sees the same variant.
 */
export function getVariant(test: ABTest): string {
  if (typeof window === 'undefined') return test.variants[0];

  const key = `${STORAGE_PREFIX}${test.id}`;

  // Return existing assignment if valid
  try {
    const stored = localStorage.getItem(key);
    if (stored && test.variants.includes(stored)) return stored;
  } catch {
    // localStorage may be blocked (private browsing, etc.) — fall through
  }

  // Assign randomly based on weights
  const weights =
    test.weights || test.variants.map(() => 1 / test.variants.length);
  const rand = Math.random();
  let cumulative = 0;

  for (let i = 0; i < test.variants.length; i++) {
    cumulative += weights[i];
    if (rand <= cumulative) {
      const chosen = test.variants[i];
      try {
        localStorage.setItem(key, chosen);
      } catch {
        // ignore write failures
      }
      return chosen;
    }
  }

  // Fallback (should never reach here, but just in case of floating-point drift)
  const fallback = test.variants[0];
  try {
    localStorage.setItem(key, fallback);
  } catch {
    // ignore
  }
  return fallback;
}

/**
 * Track an A/B test event via GA4.
 *
 * Common actions:
 *  - 'impression' — page/component was viewed
 *  - 'conversion' — user took the desired action (click, submit, etc.)
 */
export function trackABEvent(
  testId: string,
  variant: string,
  action: 'impression' | 'conversion' | string,
): void {
  trackGA4Event('ab_test', {
    test_id: testId,
    variant,
    action,
  });
}

// ---------------------------------------------------------------------------
// Active test definitions
// ---------------------------------------------------------------------------

/**
 * Pricing page CTA wording test.
 *
 * control    — current text ("Start 14-Day Free Trial")
 * reassuring — longer, trust-oriented text ("Start Your 14-Day Free Trial — No Credit Card")
 */
export const PRICING_CTA_TEST: ABTest = {
  id: 'pricing_cta_text',
  variants: ['control', 'reassuring'],
  weights: [0.5, 0.5],
};

/**
 * Signup page social proof test.
 *
 * control      — current signup page (no change)
 * social_proof — adds a small social proof badge near the form header
 */
export const SIGNUP_SOCIAL_PROOF_TEST: ABTest = {
  id: 'signup_social_proof',
  variants: ['control', 'social_proof'],
  weights: [0.5, 0.5],
};
