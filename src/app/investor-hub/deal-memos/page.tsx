'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { clientLogger } from '@/lib/client-logger';
import { INVESTOR_HUB_STAGES, DEAL_MEMO_RECOMMENDATIONS } from '@/lib/validations';

export const dynamic = 'force-dynamic';

interface DealMemo {
  id: string;
  slug: string;
  companyName: string;
  companyId: string | null;
  dealStage: string;
  investmentAmount: number | null;
  currency: string | null;
  recommendation: string;
  visibility: string;
  publishedAt: string | null;
  createdAt: string;
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

const RECOMMENDATION_STYLE: Record<string, string> = {
  invest: 'bg-green-500/15 text-green-300 border-green-500/20',
  pass: 'bg-red-500/15 text-red-300 border-red-500/20',
  more_info: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
};

function formatAmount(amount: number | null, currency: string | null): string {
  if (!amount || amount <= 0) return '—';
  const c = currency || 'USD';
  if (amount >= 1_000_000_000) return `${c} ${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${c} ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${c} ${(amount / 1_000).toFixed(0)}K`;
  return `${c} ${amount.toLocaleString()}`;
}

export default function DealMemosListPage() {
  const [memos, setMemos] = useState<DealMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState('');
  const [dealStage, setDealStage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (recommendation) params.set('recommendation', recommendation);
        if (dealStage) params.set('dealStage', dealStage);
        params.set('limit', '50');
        const res = await fetch(`/api/investor-hub/deal-memos?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Failed to load memos');
        const json = await res.json();
        setMemos(json?.data?.memos ?? []);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError('Failed to load deal memos');
        clientLogger.error('deal memos list fetch failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [recommendation, dealStage]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/50 mb-2">
              <Link href="/investor-hub" className="hover:text-white">
                Investor Hub
              </Link>{' '}
              &rsaquo; Deal Memos
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">Deal Memos</h1>
            <p className="text-white/60 mt-2 max-w-2xl">
              Company-specific investment memos. Visibility rules are enforced
              by the API &mdash; private memos are visible only to their
              authors.
            </p>
          </div>
          <Link
            href="/investor-hub/deal-memos/new"
            className="px-5 py-3 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors self-start"
          >
            Draft a memo
          </Link>
        </div>

        <div className="bg-white/[0.04] rounded-xl border border-white/10 p-4 mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-white/60 mb-1">Recommendation</label>
            <select
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              className="bg-black border border-white/15 text-white rounded-lg px-3 py-2 text-sm h-10 min-w-[160px]"
            >
              <option value="">All</option>
              {DEAL_MEMO_RECOMMENDATIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Stage</label>
            <select
              value={dealStage}
              onChange={(e) => setDealStage(e.target.value)}
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
          <div className="text-xs text-white/50 pb-2">
            Showing {memos.length} memo{memos.length === 1 ? '' : 's'}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm p-4 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-white/50 text-sm">Loading memos...</div>
        ) : memos.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/60">
            No memos visible under the current filters.
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memos.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/investor-hub/deal-memos/${m.slug}`}
                  className="block bg-white/[0.04] border border-white/10 rounded-xl p-5 hover:border-white/25 transition-colors h-full"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-white">{m.companyName}</div>
                    <span
                      className={`text-[11px] uppercase tracking-wide px-2 py-0.5 rounded border ${
                        RECOMMENDATION_STYLE[m.recommendation] ?? 'bg-white/5 text-white/60 border-white/10'
                      }`}
                    >
                      {m.recommendation}
                    </span>
                  </div>
                  <div className="text-white/60 text-sm mb-3">
                    {STAGE_LABELS[m.dealStage] ?? m.dealStage} &middot;{' '}
                    {formatAmount(m.investmentAmount, m.currency)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>{m.author.name ?? 'Anonymous'}</span>
                    <span className="uppercase tracking-wide">{m.visibility}</span>
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
