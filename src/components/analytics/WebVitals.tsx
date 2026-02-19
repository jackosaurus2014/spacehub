'use client';

import { useEffect } from 'react';

/**
 * Reports Core Web Vitals metrics to Google Analytics 4.
 * Metrics: LCP, FID, CLS, INP, TTFB, FCP
 *
 * Uses the web-vitals library via dynamic import to avoid
 * adding to the critical bundle.
 */
export default function WebVitals() {
  useEffect(() => {
    // Only report in production
    if (process.env.NODE_ENV !== 'production') return;

    import('web-vitals').then(({ onCLS, onLCP, onINP, onTTFB, onFCP }) => {
      const sendToAnalytics = (metric: { name: string; value: number; id: string }) => {
        // Send to GA4 if available
        if (typeof window !== 'undefined' && 'gtag' in window) {
          (window as any).gtag('event', metric.name, {
            value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
            event_label: metric.id,
            non_interaction: true,
          });
        }
      };

      onCLS(sendToAnalytics);
      onLCP(sendToAnalytics);
      onINP(sendToAnalytics);
      onTTFB(sendToAnalytics);
      onFCP(sendToAnalytics);
    }).catch(() => {
      // web-vitals not available — ignore silently
    });
  }, []);

  return null;
}
