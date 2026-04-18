'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { clientLogger } from '@/lib/client-logger';

export const dynamic = 'force-dynamic';

interface CompanyLite {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
}

interface DebriefListItem {
  id: string;
  slug: string;
  eventId: string | null;
  missionName: string;
  missionDate: string;
  status: 'success' | 'partial' | 'failure' | 'scrubbed';
  executiveSummary: string;
  costsEstimate: number | null;
  currency: string | null;
  companyIds: string[];
  keyTakeaways: string[];
  generatedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  companies: CompanyLite[];
}

const STATUS_LABELS: Record<DebriefListItem['status'], string> = {
  success: 'Success',
  partial: 'Partial',
  failure: 'Failure',
  scrubbed: 'Scrubbed',
};

const STATUS_COLORS: Record<DebriefListItem['status'], string> = {
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  partial: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  failure: 'bg-red-500/15 text-red-300 border-red-500/30',
  scrubbed: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(value: number | null, currency: string | null): string {
  if (value === null || value === undefined) return '—';
  const c = currency || 'USD';
  if (value >= 1_000_000_000) return `${c} ${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${c} ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${c} ${(value / 1_000).toFixed(0)}K`;
  return `${c} ${value.toLocaleString()}`;
}

export default function MissionDebriefsPage() {
  const [debriefs, setDebriefs] = useState<DebriefListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (companyFilter !== 'all') params.set('companyId', companyFilter);
      const res = await fetch(`/api/mission-debriefs?${params.toString()}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setDebriefs(data.debriefs || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load mission debriefs';
      setError(msg);
      clientLogger.error('mission-debriefs list load failed', { error: msg });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, companyFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Build a unique company filter list from currently-loaded debriefs.
  const companyOptions = useMemo(() => {
    const map = new Map<string, CompanyLite>();
    for (const d of debriefs) {
      for (const c of d.companies || []) {
        if (c && !map.has(c.id)) map.set(c.id, c);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [debriefs]);

  const featured = debriefs.slice(0, 3);
  const rest = debriefs.slice(3);

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Mission Debriefs
        </h1>
        <p className="text-slate-400 text-sm md:text-base max-w-2xl">
          Post-launch analysis of every major space mission — outcomes, anomalies,
          commercial impact, and what comes next. Human-curated, AI-augmented.
        </p>
      </motion.div>

      {/* Filters */}
      <div className="card mb-6 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-black border border-white/10 text-white text-sm rounded px-2 py-1.5"
          >
            <option value="all">All</option>
            <option value="success">Success</option>
            <option value="partial">Partial</option>
            <option value="failure">Failure</option>
            <option value="scrubbed">Scrubbed</option>
          </select>
        </div>
        {companyOptions.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Company</label>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="bg-black border border-white/10 text-white text-sm rounded px-2 py-1.5"
            >
              <option value="all">All</option>
              {companyOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex-1" />
        <button
          onClick={load}
          className="text-xs text-slate-400 hover:text-white border border-white/10 rounded px-3 py-1.5"
        >
          Refresh
        </button>
      </div>

      {/* States */}
      {loading && (
        <div className="text-center py-16 text-slate-500 text-sm">
          Loading mission debriefs…
        </div>
      )}
      {error && !loading && (
        <div className="card p-6 border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}
      {!loading && !error && debriefs.length === 0 && (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-3">🚀</div>
          <p className="text-slate-300 text-sm">No mission debriefs published yet.</p>
          <p className="text-slate-500 text-xs mt-2">
            Check back after the next major launch.
          </p>
        </div>
      )}

      {/* Featured (top 3) */}
      {!loading && featured.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {featured.map((d) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="card p-5 hover:border-white/20 transition-all"
            >
              <Link href={`/mission-debriefs/${d.slug}`} className="block">
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${STATUS_COLORS[d.status]}`}
                  >
                    {STATUS_LABELS[d.status]}
                  </span>
                  <span className="text-xs text-slate-500">{formatDate(d.missionDate)}</span>
                </div>
                <h2 className="text-lg font-semibold text-white mb-2 leading-snug">
                  {d.missionName}
                </h2>
                <p className="text-sm text-slate-400 line-clamp-3 mb-3">
                  {d.executiveSummary}
                </p>
                {d.companies && d.companies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {d.companies.slice(0, 4).map((c) => (
                      <span
                        key={c.id}
                        className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/10"
                      >
                        {c.name}
                      </span>
                    ))}
                    {d.companies.length > 4 && (
                      <span className="text-[10px] text-slate-500">
                        +{d.companies.length - 4}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {formatCurrency(d.costsEstimate, d.currency)}
                  </span>
                  <span className="text-slate-300 hover:text-white">Read debrief →</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* List (the rest) */}
      {!loading && rest.length > 0 && (
        <div className="space-y-3">
          {rest.map((d) => (
            <Link
              key={d.id}
              href={`/mission-debriefs/${d.slug}`}
              className="card p-4 hover:border-white/20 transition-all block"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${STATUS_COLORS[d.status]}`}
                    >
                      {STATUS_LABELS[d.status]}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDate(d.missionDate)}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1 truncate">
                    {d.missionName}
                  </h3>
                  <p className="text-sm text-slate-400 line-clamp-2">
                    {d.executiveSummary}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-500 mb-1">Est. cost</div>
                  <div className="text-sm text-slate-300">
                    {formatCurrency(d.costsEstimate, d.currency)}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
