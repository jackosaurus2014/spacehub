'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { ENGAGEMENT_EVENTS } from '@/lib/engagement-events';

/**
 * Counts one page view, server-side and cookielessly, on every route.
 *
 * This is NOT gated on cookie consent, and that is deliberate: it writes
 * nothing to the visitor's device and stores no identifier, so there is
 * nothing to consent to. See `src/lib/traffic-truth.ts` for the privacy
 * construction and the measurement gap that made it necessary — GA4 reported
 * 748 monthly users for a month in which Search Console counted 2,916 clicks
 * from Google alone.
 *
 * If that ever stops being true — if someone adds a cookie, a stable id, or
 * anything that survives the daily salt rotation — this component has to move
 * behind the banner with the rest.
 *
 * `keepalive` lets the request survive a reader who clicks away immediately,
 * which is precisely the visitor GA4's lazy-loaded tag misses.
 */
export default function TrafficBeacon() {
  const pathname = usePathname();
  // A React 18 double-invoked effect must not count the same view twice.
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastSent.current === pathname) return;
    lastSent.current = pathname;

    // The referrer is sent only on the first page of a visit; after a
    // client-side navigation `document.referrer` still holds the original
    // external referrer, which would over-count that channel on every hop.
    const isFirstView = typeof window !== 'undefined'
      && window.history.length <= 2;

    try {
      void fetch('/api/beacon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: pathname,
          referrer: isFirstView ? document.referrer || null : null,
        }),
        keepalive: true,
        // Counting must never block or retry into a slow page.
        cache: 'no-store',
      }).catch(() => {});
    } catch {
      // A blocked request is a lost count, never a broken page.
    }
  }, [pathname]);

  // One `engaged` ping per document load, on the first real input. The raw
  // count above includes a crawler that runs JavaScript and looks like a
  // browser; it loads pages but never moves a pointer or presses a key. This
  // writes nothing to the device either, so it needs no consent for the same
  // reason the view ping does not.
  useEffect(() => {
    let sent = false;
    const opts = { passive: true, capture: true } as const;
    const stop = () => ENGAGEMENT_EVENTS.forEach((e) => window.removeEventListener(e, onInput, opts));
    function onInput(event: Event) {
      // Synthetic events dispatched by a script are not input.
      if (sent || !event.isTrusted) return;
      sent = true;
      stop();
      try {
        void fetch('/api/beacon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: window.location.pathname, engaged: true }),
          keepalive: true,
          cache: 'no-store',
        }).catch(() => {});
      } catch {
        // A blocked request is a lost count, never a broken page.
      }
    }
    ENGAGEMENT_EVENTS.forEach((e) => window.addEventListener(e, onInput, opts));
    return stop;
  }, []);

  return null;
}
