'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import { clientLogger } from '@/lib/client-logger';
import { extractApiError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

interface ChannelRow {
  id: string;
  name: string;
  description: string | null;
  channelType: string;
  visibility: string;
  role: string;
  joinedAt: string;
  company: { id: string; slug: string; name: string; logoUrl: string | null } | null;
}

export default function TeamsIndexPage() {
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [unauth, setUnauth] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/teams/channels', { cache: 'no-store' });
        if (res.status === 401) {
          if (!cancelled) setUnauth(true);
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          throw new Error(extractApiError(data, 'Failed to load channels'));
        }
        if (!cancelled) {
          setChannels(data?.data?.channels || []);
        }
      } catch (e) {
        clientLogger.error('Failed to load teams channels', {
          error: e instanceof Error ? e.message : String(e),
        });
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const out = new Map<
      string,
      { company: ChannelRow['company']; channels: ChannelRow[] }
    >();
    for (const c of channels) {
      const key = c.company?.id || 'unknown';
      if (!out.has(key)) {
        out.set(key, { company: c.company, channels: [] });
      }
      out.get(key)!.channels.push(c);
    }
    return Array.from(out.values());
  }, [channels]);

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <AnimatedPageHeader
            title="Team Channels"
            subtitle="Private corporate spaces for your claimed companies"
          />
          <div className="flex gap-2">
            <Link
              href="/teams/projects"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            >
              Projects
            </Link>
            <Link
              href="/teams/new"
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 text-sm rounded-lg font-semibold transition-colors"
            >
              + New Channel
            </Link>
          </div>
        </div>

        {unauth && (
          <div className="card p-6 text-center">
            <p className="text-slate-300 mb-3">Please sign in to view your team channels.</p>
            <Link
              href="/login"
              className="inline-block px-4 py-2 bg-white text-slate-900 rounded-lg font-semibold"
            >
              Sign in
            </Link>
          </div>
        )}

        {loading && !unauth && (
          <div className="py-16 flex justify-center">
            <LoadingSpinner />
          </div>
        )}

        {!loading && !unauth && error && (
          <div className="card p-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!loading && !unauth && !error && grouped.length === 0 && (
          <div className="card p-8 text-center">
            <h2 className="text-lg font-semibold text-white mb-2">
              No channels yet
            </h2>
            <p className="text-slate-400 mb-4">
              You aren&apos;t a member of any team channels. If you&apos;ve
              claimed a company profile, you can create your first one.
            </p>
            <Link
              href="/teams/new"
              className="inline-block px-4 py-2 bg-white text-slate-900 rounded-lg font-semibold"
            >
              Create a channel
            </Link>
          </div>
        )}

        {!loading && grouped.length > 0 && (
          <div className="space-y-6">
            {grouped.map((g) => (
              <section key={g.company?.id || 'unknown'} className="space-y-3">
                <div className="flex items-center gap-3">
                  {g.company?.logoUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={g.company.logoUrl}
                      alt={g.company?.name || ''}
                      className="w-8 h-8 rounded object-cover bg-slate-800"
                    />
                  )}
                  <h2 className="text-lg font-semibold text-white">
                    {g.company?.name || 'Unknown company'}
                  </h2>
                  <span className="text-xs text-slate-500">
                    {g.channels.length} channel{g.channels.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {g.channels.map((c) => (
                    <Link
                      key={c.id}
                      href={`/teams/${c.id}`}
                      className="card p-4 hover:ring-1 hover:ring-white/15 transition-all block"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">
                            # {c.name}
                          </div>
                          {c.description && (
                            <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                              {c.description}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] uppercase tracking-wide bg-white/[0.08] text-slate-300 px-1.5 py-0.5 rounded">
                          {c.role}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="bg-white/[0.05] px-1.5 py-0.5 rounded">
                          {c.channelType}
                        </span>
                        <span className="bg-white/[0.05] px-1.5 py-0.5 rounded">
                          {c.visibility}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
