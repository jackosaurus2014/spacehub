'use client';

import { useEffect } from 'react';

interface Props {
  slug: string;
}

/**
 * Fires POST /api/countdown/[slug]/view?embed=true on the first mount
 * within a browser session. Tracked via sessionStorage so reloads in
 * the same tab don't inflate counts.
 */
export default function EmbedViewTracker({ slug }: Props) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `countdown-embed-viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // sessionStorage can throw inside cross-origin iframes in some browsers;
      // in that case we just best-effort record one view per page load.
    }

    fetch(`/api/countdown/${encodeURIComponent(slug)}/view?embed=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      keepalive: true,
    }).catch(() => {
      // Silently ignore — counting is best-effort.
    });
  }, [slug]);

  return null;
}
