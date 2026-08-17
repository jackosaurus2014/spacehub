'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { clientLogger } from '@/lib/client-logger';
import { RADAR_CATEGORIES, RADAR_CATEGORY_LABELS, type RadarCategory } from '@/lib/regulatory-categorizer';
import {
  ClosingSoonCallout,
  RadarTimelineList,
  SOURCE_LABELS,
  type RadarTimelineEntry,
} from '@/components/regulatory/RadarTimeline';

/**
 * Regulatory Radar tab on /compliance — unified reverse-chron timeline of
 * congressional actions + Federal Register documents + agency actions, with
 * category chips, source filters, and an "action windows closing soon"
 * callout. Data from /api/regulatory-radar (RegulatoryAction table).
 */

const SOURCE_FILTERS = ['congress', 'federal-register'] as const;

export default function RegulatoryRadarTab() {
  const [entries, setEntries] = useState<RadarTimelineEntry[]>([]);
  const [closingSoon, setClosingSoon] = useState<RadarTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState<RadarCategory | 'all'>('all');
  const [source, setSource] = useState<string>('all');

  const fetchRadar = useCallback(async (cat: RadarCategory | 'all', src: string) => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ limit: '80' });
      if (cat !== 'all') params.set('category', cat);
      if (src !== 'all') params.set('source', src);
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
    fetchRadar(category, source);
  }, [fetchRadar, category, source]);

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
            Congressional actions, Federal Register publications, and agency actions — one timeline,
            newest first.
          </p>
        </div>
        <Link href="/regulatory-radar" className="text-xs text-violet-300 hover:text-violet-200 whitespace-nowrap">
          Public radar page &rarr;
        </Link>
      </div>

      {error && (
        <div className="card p-4 mb-4 border border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-400">Unable to load the regulatory radar right now.</p>
          <button
            onClick={() => fetchRadar(category, source)}
            className="text-xs text-red-300 hover:text-red-200 underline mt-1 min-h-[44px] inline-flex items-center"
          >
            Try again
          </button>
        </div>
      )}

      <ClosingSoonCallout entries={closingSoon} />

      {/* Category chips */}
      <div className="relative">
        <div
          role="group"
          aria-label="Filter by category"
          className="flex gap-2 mb-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin"
        >
          {(['all', ...RADAR_CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat as RadarCategory | 'all')}
              aria-pressed={category === cat}
              className={`px-3 py-2 min-h-[44px] rounded-lg text-xs font-medium transition-all whitespace-nowrap touch-target ${
                category === cat
                  ? 'bg-white text-slate-900'
                  : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/[0.1]'
              }`}
            >
              {cat === 'all' ? 'All Categories' : RADAR_CATEGORY_LABELS[cat as RadarCategory]}
            </button>
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent pointer-events-none md:hidden" />
      </div>

      {/* Source chips */}
      <div role="group" aria-label="Filter by source" className="flex flex-wrap gap-2 mb-5">
        {(['all', ...SOURCE_FILTERS] as const).map((src) => (
          <button
            key={src}
            onClick={() => setSource(src)}
            aria-pressed={source === src}
            className={`px-3 py-2 min-h-[44px] rounded-lg text-xs font-medium transition-all whitespace-nowrap touch-target ${
              source === src
                ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                : 'bg-transparent text-slate-400 border border-white/[0.06] hover:border-slate-300'
            }`}
          >
            {src === 'all' ? 'All Sources' : SOURCE_LABELS[src] || src}
          </button>
        ))}
      </div>

      <RadarTimelineList entries={entries} />
    </div>
  );
}
