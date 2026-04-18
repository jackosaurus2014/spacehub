'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { clientLogger } from '@/lib/client-logger';

interface Thesis {
  id: string;
  slug: string;
  title: string;
  summary: string;
  sectors: string[];
  upvotes: number;
  views: number;
  publishedAt: string | null;
  author: { id: string; name: string | null; verifiedBadge: string | null };
}

export default function FeaturedTheses() {
  const [theses, setTheses] = useState<Thesis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const res = await fetch('/api/investor-hub/theses?limit=3', {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = await res.json();
        setTheses(json?.data?.theses ?? []);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        clientLogger.warn('Failed to load featured theses', {
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  if (loading || theses.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Featured Investor Theses</h3>
        <Link
          href="/investor-hub/theses"
          className="text-xs text-white/70 hover:text-white underline"
        >
          View all &rarr;
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {theses.map((t) => (
          <Link
            key={t.id}
            href={`/investor-hub/theses/${t.slug}`}
            className="block bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 hover:border-white/20 transition-colors"
          >
            <div className="text-white font-medium text-sm mb-1 line-clamp-2">
              {t.title}
            </div>
            <div className="text-white/55 text-xs line-clamp-3 mb-2">
              {t.summary}
            </div>
            <div className="flex items-center justify-between text-[11px] text-white/50">
              <span className="truncate">
                {t.author.name ?? 'Anonymous'}
              </span>
              <span className="shrink-0">
                {t.upvotes} upvotes
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
