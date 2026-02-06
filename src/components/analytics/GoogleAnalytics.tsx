'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { trackPageView, isTrackingAllowed } from '@/lib/analytics';

interface GoogleAnalyticsProps {
  /**
   * Google Analytics 4 Measurement ID (format: G-XXXXXXXXXX)
   * Get this from Google Analytics > Admin > Data Streams > Web
   */
  measurementId?: string;
  /**
   * Enable or disable analytics (useful for development)
   * @default false - Analytics is disabled by default until configured
   */
  enabled?: boolean;
}

/**
 * Tracks page views when route changes
 */
function PageViewTracker({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!measurementId || !isTrackingAllowed()) return;

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    trackPageView(url, document.title);
  }, [pathname, searchParams, measurementId]);

  return null;
}

/**
 * Google Analytics 4 Integration Component
 *
 * Features:
 * - Configurable measurement ID
 * - Respects user consent preferences (via CookieConsent component)
 * - Automatic page view tracking on route changes
 * - Easy to enable/disable for development vs production
 *
 * Usage:
 * ```tsx
 * // In layout.tsx
 * <GoogleAnalytics
 *   measurementId="G-XXXXXXXXXX"
 *   enabled={process.env.NODE_ENV === 'production'}
 * />
 * ```
 *
 * To enable analytics:
 * 1. Create a Google Analytics 4 property
 * 2. Get your Measurement ID from Admin > Data Streams > Web
 * 3. Replace GA_MEASUREMENT_ID with your actual ID
 * 4. Set enabled={true} or use environment-based logic
 */
export default function GoogleAnalytics({
  measurementId = 'GA_MEASUREMENT_ID',
  enabled = false
}: GoogleAnalyticsProps) {
  // Don't render anything if not enabled or using placeholder ID
  if (!enabled || measurementId === 'GA_MEASUREMENT_ID' || !measurementId) {
    return null;
  }

  return (
    <>
      {/* Initialize data layer before loading gtag.js */}
      <Script
        id="ga-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}

            // Set default consent to denied until user accepts
            gtag('consent', 'default', {
              'analytics_storage': 'denied'
            });

            // Check if consent was previously granted
            const consent = localStorage.getItem('spacenexus_cookie_consent');
            if (consent === 'granted') {
              gtag('consent', 'update', {
                'analytics_storage': 'granted'
              });
            }

            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              page_location: window.location.href,
              page_path: window.location.pathname,
            });
          `,
        }}
      />

      {/* Google Analytics gtag.js script */}
      <Script
        id="ga-script"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />

      {/* Page view tracker - wrapped in Suspense for useSearchParams */}
      <Suspense fallback={null}>
        <PageViewTracker measurementId={measurementId} />
      </Suspense>
    </>
  );
}
