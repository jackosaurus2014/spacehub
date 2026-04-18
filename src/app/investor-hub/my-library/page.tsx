'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { clientLogger } from '@/lib/client-logger';

export const dynamic = 'force-dynamic';

interface Thesis {
  id: string;
  slug: string;
  title: string;
  sectors: string[];
  publishedAt: string | null;
  updatedAt: string;
  views: number;
  upvotes: number;
}

interface DealMemo {
  id: string;
  slug: string;
  companyName: string;
  dealStage: string;
  recommendation: string;
  visibility: string;
  publishedAt: string | null;
  updatedAt: string;
}

export default function MyLibraryPage() {
  const [theses, setTheses] = useState<Thesis[]>([]);
  const [memos, setMemos] = useState<DealMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [tRes, mRes] = await Promise.all([
          fetch('/api/investor-hub/theses?author=me&publishedOnly=false&limit=100', {
            signal: controller.signal,
          }),
          fetch('/api/investor-hub/deal-memos?author=me&limit=100', {
            signal: controller.signal,
          }),
        ]);

        if (tRes.status === 401 || mRes.status === 401) {
          setError('You must be logged in to view your library.');
          return;
        }

        if (tRes.ok) {
          const tj = await tRes.json();
          setTheses(tj?.data?.theses ?? []);
        }
        if (mRes.ok) {
          const mj = await mRes.json();
          setMemos(mj?.data?.memos ?? []);
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        clientLogger.error('my-library fetch failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        setError('Failed to load your library');
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-xs uppercase tracking-widest text-white/50 mb-3">
          <Link href="/investor-hub" className="hover:text-white">
            Investor Hub
          </Link>{' '}
          &rsaquo; My Library
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-6">My Library</h1>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm p-4 mb-6">
            {error}{' '}
            <Link href="/login" className="underline">
              Log in
            </Link>
          </div>
        )}

        {loading ? (
          <div className="text-white/50 text-sm">Loading...</div>
        ) : (
          <>
            <section className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold">My Theses</h2>
                <Link
                  href="/investor-hub/theses/new"
                  className="text-xs px-3 py-1.5 rounded border border-white/15 text-white/80 hover:bg-white/5"
                >
                  New thesis
                </Link>
              </div>
              {theses.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-6 text-white/50 text-sm">
                  You haven&apos;t written any theses yet.
                </div>
              ) : (
                <ul className="space-y-2">
                  {theses.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/investor-hub/theses/${t.slug}`}
                        className="flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 hover:border-white/25"
                      >
                        <div>
                          <div className="text-white font-medium">{t.title}</div>
                          <div className="text-white/50 text-xs mt-1">
                            {t.publishedAt
                              ? `Published ${new Date(t.publishedAt).toLocaleDateString()}`
                              : 'Draft'}{' '}
                            &middot; {t.views} views &middot; {t.upvotes} upvotes
                          </div>
                        </div>
                        <span className="text-white/40 text-xs">
                          {t.publishedAt ? 'Published' : 'Draft'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold">My Deal Memos</h2>
                <Link
                  href="/investor-hub/deal-memos/new"
                  className="text-xs px-3 py-1.5 rounded border border-white/15 text-white/80 hover:bg-white/5"
                >
                  New memo
                </Link>
              </div>
              {memos.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-6 text-white/50 text-sm">
                  You haven&apos;t written any deal memos yet.
                </div>
              ) : (
                <ul className="space-y-2">
                  {memos.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/investor-hub/deal-memos/${m.slug}`}
                        className="flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 hover:border-white/25"
                      >
                        <div>
                          <div className="text-white font-medium">
                            {m.companyName}
                          </div>
                          <div className="text-white/50 text-xs mt-1">
                            {m.dealStage} &middot; {m.recommendation} &middot;{' '}
                            {m.visibility}{' '}
                            {m.publishedAt ? '' : ' (draft)'}
                          </div>
                        </div>
                        <span className="text-white/40 text-xs">
                          {m.publishedAt ? 'Published' : 'Draft'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
