'use client';

import { useEffect, useState } from 'react';
import { clientLogger } from '@/lib/client-logger';

interface LegalUpdateItem {
  id: string;
  slug: string;
  title: string;
  url: string;
  publishedAt: string;
  source?: {
    name?: string | null;
  } | null;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return '';
  }
}

/**
 * Compact "Recent Legal & Regulatory Updates" feed sourced from the
 * LegalUpdate table via /api/compliance/legal?type=updates. Shown at the
 * top of the Regulatory Hub, independent of which sub-tab is active, since
 * it's a live cross-cutting feed rather than a single-category dataset.
 */
export default function RecentLegalUpdates() {
  const [updates, setUpdates] = useState<LegalUpdateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/compliance/legal?type=updates&limit=10');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setUpdates(Array.isArray(data?.updates) ? data.updates : []);
        }
      } catch (err) {
        clientLogger.error('Failed to fetch legal updates', {
          error: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing to show and nothing went wrong yet (still loading) — render the
  // skeleton. If loading finished with zero rows or an error, render a
  // small empty/error state rather than disappearing silently.
  if (loading) {
    return (
      <div className="card p-4 mb-6" aria-busy="true" aria-label="Loading recent legal and regulatory updates">
        <div className="h-4 w-56 bg-white/[0.08] rounded mb-3 animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-white/[0.05] rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-4 mb-6 border border-red-500/20 bg-red-500/5">
        <p className="text-sm text-red-400">Unable to load recent legal &amp; regulatory updates right now.</p>
      </div>
    );
  }

  return (
    <div className="card p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg" aria-hidden="true">📰</span>
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
          Recent Legal &amp; Regulatory Updates
        </h3>
      </div>

      {updates.length === 0 ? (
        <p className="text-sm text-slate-400">
          No recent legal or regulatory updates on file yet. Check back soon.
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {updates.map((update) => (
            <li key={update.id} className="py-2.5 first:pt-0 last:pb-0">
              <a
                href={update.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3"
              >
                <span className="text-sm text-slate-200 group-hover:text-white transition-colors leading-snug">
                  {update.title}
                </span>
                <span className="flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap shrink-0">
                  {update.source?.name && (
                    <span className="bg-white/[0.06] text-slate-400 px-2 py-0.5 rounded">
                      {update.source.name}
                    </span>
                  )}
                  <span>{formatDate(update.publishedAt)}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
