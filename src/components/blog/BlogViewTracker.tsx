'use client';

import { useEffect } from 'react';

/**
 * Zero-UI client component that fires a single POST to record a blog
 * page view on mount. Errors are silently caught — this is a non-critical
 * analytics call and should never degrade the reading experience.
 */
export default function BlogViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    // Fire-and-forget — no await, no state
    fetch('/api/blog/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    }).catch(() => {
      // Silently swallow — analytics should never break the page
    });
  }, [slug]);

  return null;
}
