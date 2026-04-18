'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clientLogger } from '@/lib/client-logger';

export const dynamic = 'force-dynamic';

interface Thesis {
  id: string;
  slug: string;
  title: string;
  summary: string;
  bodyMd: string;
  sectors: string[];
  stagePreference: string | null;
  geography: string | null;
  views: number;
  upvotes: number;
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

export default function ThesisDetailPage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : '';

  const [thesis, setThesis] = useState<Thesis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upvoted, setUpvoted] = useState(false);
  const [upvoting, setUpvoting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/investor-hub/theses/${slug}`, { signal: controller.signal });
        if (res.status === 404) {
          setError('Thesis not found');
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error('Failed to load thesis');
        const json = await res.json();
        setThesis(json?.data?.thesis ?? null);
        // Client-side dedupe signal for the upvote button
        try {
          const stored = localStorage.getItem(`thesis-upvote:${slug}`);
          if (stored) setUpvoted(true);
        } catch {
          // localStorage may be disabled
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError('Failed to load thesis');
        clientLogger.error('thesis detail fetch failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [slug]);

  const handleUpvote = useCallback(async () => {
    if (!slug || upvoted || upvoting) return;
    setUpvoting(true);
    try {
      const res = await fetch(`/api/investor-hub/theses/${slug}/upvote`, {
        method: 'POST',
      });
      if (res.status === 401) {
        setError('Log in to upvote this thesis.');
        return;
      }
      if (!res.ok) throw new Error('Upvote failed');
      const json = await res.json();
      setThesis((prev) =>
        prev ? { ...prev, upvotes: json?.data?.upvotes ?? prev.upvotes + 1 } : prev
      );
      setUpvoted(true);
      try {
        localStorage.setItem(`thesis-upvote:${slug}`, String(Date.now()));
      } catch {
        // ignore
      }
    } catch (err) {
      clientLogger.error('thesis upvote failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setUpvoting(false);
    }
  }, [slug, upvoted, upvoting]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-white/50 text-sm">
          Loading thesis...
        </div>
      </div>
    );
  }

  if (error || !thesis) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <div className="text-white/70 mb-3">{error || 'Thesis not found'}</div>
            <Link
              href="/investor-hub/theses"
              className="text-white underline text-sm"
            >
              Back to theses
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
          <Link href="/investor-hub/theses" className="hover:text-white">
            Theses
          </Link>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-3">{thesis.title}</h1>

        <div className="flex flex-wrap items-center gap-3 text-sm text-white/60 mb-6">
          <span>
            By{' '}
            <span className="text-white/80 font-medium">
              {thesis.author.name ?? 'Anonymous'}
            </span>
            {thesis.author.verifiedBadge === 'investor' && (
              <span className="ml-2 text-[10px] uppercase tracking-widest bg-white/10 text-white/80 px-1.5 py-0.5 rounded">
                Verified Investor
              </span>
            )}
          </span>
          {thesis.publishedAt && (
            <span>
              &middot; Published {new Date(thesis.publishedAt).toLocaleDateString()}
            </span>
          )}
          <span>&middot; {thesis.views} views</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {thesis.sectors.map((s) => (
            <span
              key={s}
              className="text-xs uppercase tracking-wide bg-white/[0.06] text-white/70 px-2 py-1 rounded"
            >
              {s}
            </span>
          ))}
          {thesis.stagePreference && (
            <span className="text-xs uppercase tracking-wide bg-white/[0.06] text-white/70 px-2 py-1 rounded">
              {STAGE_LABELS[thesis.stagePreference] ?? thesis.stagePreference}
            </span>
          )}
          {thesis.geography && (
            <span className="text-xs uppercase tracking-wide bg-white/[0.06] text-white/70 px-2 py-1 rounded">
              {thesis.geography}
            </span>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 mb-8 text-white/80 leading-relaxed">
          {thesis.summary}
        </div>

        <article className="prose prose-invert max-w-none mb-10">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{thesis.bodyMd}</ReactMarkdown>
        </article>

        <div className="flex items-center gap-3 border-t border-white/10 pt-6">
          <button
            type="button"
            onClick={handleUpvote}
            disabled={upvoted || upvoting}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              upvoted
                ? 'bg-white/10 text-white/50 cursor-default'
                : 'bg-white text-black hover:bg-white/90'
            }`}
          >
            {upvoted ? 'Upvoted' : upvoting ? 'Upvoting...' : 'Upvote this thesis'}
          </button>
          <span className="text-white/60 text-sm">
            {thesis.upvotes} upvote{thesis.upvotes === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  );
}
