'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clientLogger } from '@/lib/client-logger';

export const dynamic = 'force-dynamic';

interface DealMemo {
  id: string;
  slug: string;
  companyName: string;
  companyId: string | null;
  dealStage: string;
  investmentAmount: number | null;
  currency: string | null;
  thesis: string;
  risks: string | null;
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
  if (!amount || amount <= 0) return 'Undisclosed';
  const c = currency || 'USD';
  if (amount >= 1_000_000_000) return `${c} ${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000) return `${c} ${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${c} ${(amount / 1_000).toFixed(0)}K`;
  return `${c} ${amount.toLocaleString()}`;
}

export default function DealMemoDetailPage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : '';

  const [memo, setMemo] = useState<DealMemo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/investor-hub/deal-memos/${slug}`, {
          signal: controller.signal,
        });
        if (res.status === 404) {
          setError('This memo is either private or does not exist.');
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error('Failed to load memo');
        const json = await res.json();
        setMemo(json?.data?.memo ?? null);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError('Failed to load memo');
        clientLogger.error('deal memo detail fetch failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-white/50 text-sm">
          Loading memo...
        </div>
      </div>
    );
  }

  if (error || !memo) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <div className="text-white/70 mb-3">{error || 'Memo not found'}</div>
            <Link
              href="/investor-hub/deal-memos"
              className="text-white underline text-sm"
            >
              Back to deal memos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-xs uppercase tracking-widest text-white/50 mb-4">
          <Link href="/investor-hub" className="hover:text-white">
            Investor Hub
          </Link>{' '}
          &rsaquo;{' '}
          <Link href="/investor-hub/deal-memos" className="hover:text-white">
            Deal Memos
          </Link>
        </div>

        <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
          <h1 className="text-3xl md:text-4xl font-bold">{memo.companyName}</h1>
          <span
            className={`text-xs uppercase tracking-wide px-2.5 py-1 rounded border ${
              RECOMMENDATION_STYLE[memo.recommendation] ??
              'bg-white/5 text-white/60 border-white/10'
            }`}
          >
            {memo.recommendation}
          </span>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-white/60 mb-6">
          <span>Stage: {STAGE_LABELS[memo.dealStage] ?? memo.dealStage}</span>
          <span>Check: {formatAmount(memo.investmentAmount, memo.currency)}</span>
          <span>Visibility: {memo.visibility}</span>
          {memo.publishedAt && (
            <span>
              Published {new Date(memo.publishedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="text-sm text-white/60 mb-8">
          Author:{' '}
          <span className="text-white/80 font-medium">
            {memo.author.name ?? 'Anonymous'}
          </span>
          {memo.author.verifiedBadge === 'investor' && (
            <span className="ml-2 text-[10px] uppercase tracking-widest bg-white/10 text-white/80 px-1.5 py-0.5 rounded">
              Verified Investor
            </span>
          )}
        </div>

        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-widest text-white/50 mb-2">
            Thesis
          </h2>
          <article className="prose prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{memo.thesis}</ReactMarkdown>
          </article>
        </section>

        {memo.risks && (
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-widest text-white/50 mb-2">
              Risks
            </h2>
            <article className="prose prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{memo.risks}</ReactMarkdown>
            </article>
          </section>
        )}
      </div>
    </div>
  );
}
