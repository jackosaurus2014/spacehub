'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { clientLogger } from '@/lib/client-logger';
import {
  ClosingSoonCallout,
  RadarTimelineList,
  type RadarTimelineEntry,
} from '@/components/regulatory/RadarTimeline';

/**
 * Regulatory Radar tab on /compliance — a teaser: the "action windows
 * closing soon" callout plus the eight newest actions, then a hand-off to
 * /regulatory-radar, which owns the filters and the deadline calendar.
 * (Roadmap 2026-09: the full timeline lived in both places.)
 * Data from /api/regulatory-radar (RegulatoryAction table).
 */

export default function RegulatoryRadarTab() {
  const [entries, setEntries] = useState<RadarTimelineEntry[]>([]);
  const [closingSoon, setClosingSoon] = useState<RadarTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchRadar = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ limit: '8' });
      const res = await fetch(`/api/regulatory-radar?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEntries(Array.isArray(data?.entries) ? data.entries : []);
      setClosingSoon(Array.isArray(data?.closingSoon) ? data.closingSoon : []);
    } catch (err) {
      clientLogger.error('Failed to fetch regulatory radar', {
        error: err instanceof Error ? err.message : String(err),
      });
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRadar();
  }, [fetchRadar]);

  if (loading && entries.length === 0) {
    return (
      <div className="animate-pulse space-y-3" aria-busy="true" aria-label="Loading regulatory radar">
        <div className="h-32 bg-white/[0.06] rounded-lg" />
        <div className="h-10 bg-white/[0.06] rounded-lg" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-white/[0.06] rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Regulatory Radar</h2>
          <p className="text-sm text-slate-400">
            The eight newest congressional, Federal Register and agency actions. Filters, sources and
            the 90-day deadline calendar live on the public radar.
          </p>
        </div>
        <Link href="/regulatory-radar" className="text-xs text-violet-300 hover:text-violet-200 whitespace-nowrap">
          Full radar &rarr;
        </Link>
      </div>

      {error && (
        <div className="card p-4 mb-4 border border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-400">Unable to load the regulatory radar right now.</p>
          <button
            onClick={() => fetchRadar()}
            className="text-xs text-red-300 hover:text-red-200 underline mt-1 min-h-[44px] inline-flex items-center"
          >
            Try again
          </button>
        </div>
      )}

      <ClosingSoonCallout entries={closingSoon} />

      <RadarTimelineList entries={entries} />

      <div className="mt-6 card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Everything else is on the public radar</div>
          <div className="text-xs text-slate-400">Category and source filters, the full timeline, and the 90-day comment-deadline calendar.</div>
        </div>
        <Link href="/regulatory-radar" className="btn-primary text-sm py-2 px-4 flex-shrink-0">Open Regulatory Radar</Link>
      </div>
    </div>
  );
}
