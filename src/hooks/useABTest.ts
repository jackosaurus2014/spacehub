/**
 * React hook for A/B testing.
 *
 * Assigns a variant on first render, fires an impression event once,
 * and returns the variant string plus a helper to track conversions.
 *
 * Usage:
 *   const { variant, trackConversion } = useABTest(PRICING_CTA_TEST);
 *   // variant === 'control' | 'reassuring'
 *   // call trackConversion() when the user clicks the CTA
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ABTest, getVariant, trackABEvent } from '@/lib/ab-testing';

export function useABTest(test: ABTest) {
  const [variant, setVariant] = useState<string>(() => {
    // SSR-safe: always return first variant on the server.
    // Client will reconcile in useEffect.
    if (typeof window === 'undefined') return test.variants[0];
    return getVariant(test);
  });

  const impressionFired = useRef(false);

  // On mount, assign variant (client-side) and fire impression
  useEffect(() => {
    const v = getVariant(test);
    setVariant(v);

    if (!impressionFired.current) {
      trackABEvent(test.id, v, 'impression');
      impressionFired.current = true;
    }
  }, [test]);

  const trackConversion = useCallback(() => {
    trackABEvent(test.id, variant, 'conversion');
  }, [test.id, variant]);

  return { variant, trackConversion };
}
