'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { clientLogger } from '@/lib/client-logger';
import { INVESTOR_HUB_STAGES } from '@/lib/validations';

export const dynamic = 'force-dynamic';

interface Thesis {
  id: string;
  slug: string;
  title: string;
  summary: string;
  sectors: string[];
  stagePreference: string | null;
  geography: string | null;
  views: number;
  upvotes: number;
  publishedAt: string | null;
  author: { id: string; name: string | null; verifiedBadge: string | null };
}

const STAGE_LABELS: Record<string, string> = {
  pre_seed: 'Pre-Seed',
  seed: 'Seed',
  series_a: 'Series A',
  series_b: 'Series B',
  growth: 'Growth',
  late_stage: 'Late Stage',
};

export default function ThesesListPage() {
  const [theses, setTheses] = useState<Thesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sector, setSector] = useState('');
  const [stage, setStage] = useState('');
  const [geography, setGeography] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (sector) params.set('sector', sector);
        if (stage) params.set('stage', stage);
        if (geography) params.set('geography', geography);
        params.set('limit', '50');
        const res = await fetch(`/api/investor-hub/theses?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Failed to load theses');
        const json = await res.json();
        setTheses(json?.data?.theses ?? []);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError('Failed to load investor theses');
        clientLogger.error('theses list fetch failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [sector, stage, geography]);

  const sectors = useMemo(() => {
    const all = new Set<string>();
    theses.forEach((t) => t.sectors.forEach((s) => all.add(s)));
    return Array.from(all).sort();
  }, [theses]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/50 mb-2">
              <Link href="/investor-hub" className="hover:text-white">
                Investor Hub
              </Link>{' '}
              &rsaquo; Theses
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">Investor Theses</h1>
            <p className="text-white/60 mt-2 max-w-2xl">
              Public investment theses from verified space-economy investors.
            </p>
          </div>
          <Link
            href="/investor-hub/theses/new"
            className="px-5 py-3 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors self-start"
          >
            Write a thesis
          </Link>
        </div>

        <div className="bg-white/[0.04] rounded-xl border border-white/10 p-4 mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-white/60 mb-1">Sector</label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="bg-black border border-white/15 text-white rounded-lg px-3 py-2 text-sm h-10 min-w-[160px]"
            >
              <option value="">All sectors</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Stage</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="bg-black border border-white/15 text-white rounded-lg px-3 py-2 text-sm h-10 min-w-[160px]"
            >
              <option value="">All stages</option>
              {INVESTOR_HUB_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Geography</label>
            <input
              value={geography}
              onChange={(e) => setGeography(e.target.value)}
              placeholder="US, Europe, APAC..."
              className="bg-black border border-white/15 text-white rounded-lg px-3 py-2 text-sm h-10 min-w-[200px]"
            />
          </div>
          <div className="text-xs text-white/50 pb-2">
            Showing {theses.length} thes{theses.length === 1 ? 'is' : 'es'}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm p-4 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-white/50 text-sm">Loading theses...</div>
        ) : theses.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/60">
            No theses match your filters.
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {theses.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/investor-hub/theses/${t.slug}`}
                  className="block bg-white/[0.04] border border-white/10 rounded-xl p-5 hover:border-white/25 transition-colors h-full"
                >
                  <div className="text-lg font-semibold text-white mb-1 line-clamp-2">
                    {t.title}
                  </div>
                  <div className="text-white/60 text-sm line-clamp-3 mb-3">
                    {t.summary}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {t.sectors.slice(0, 4).map((s) => (
                      <span
                        key={s}
                        className="text-[11px] uppercase tracking-wide bg-white/[0.06] text-white/70 px-2 py-0.5 rounded"
                      >
                        {s}
                      </span>
                    ))}
                    {t.stagePreference && (
                      <span className="text-[11px] uppercase tracking-wide bg-white/[0.06] text-white/70 px-2 py-0.5 rounded">
                        {STAGE_LABELS[t.stagePreference] ?? t.stagePreference}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>{t.author.name ?? 'Anonymous'}</span>
                    <span>
                      {t.upvotes} upvote{t.upvotes === 1 ? '' : 's'} &middot;{' '}
                      {t.views} view{t.views === 1 ? '' : 's'}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
