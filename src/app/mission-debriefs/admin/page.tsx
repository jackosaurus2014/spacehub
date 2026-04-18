'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { clientLogger } from '@/lib/client-logger';

export const dynamic = 'force-dynamic';

interface AdminDebriefRow {
  id: string;
  slug: string;
  missionName: string;
  missionDate: string;
  status: 'success' | 'partial' | 'failure' | 'scrubbed';
  generatedBy: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

const STATUS_COLORS = {
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  partial: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  failure: 'bg-red-500/15 text-red-300 border-red-500/30',
  scrubbed: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
} as const;

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function MissionDebriefsAdminPage() {
  const { data: session, status: authStatus } = useSession();
  const [rows, setRows] = useState<AdminDebriefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/mission-debriefs?includeDrafts=true&limit=100');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || `Server returned ${res.status}`);
      }
      const data = await res.json();
      setRows(data.debriefs || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load debriefs';
      setError(msg);
      clientLogger.error('admin debrief list load failed', { error: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated' && session?.user?.isAdmin) {
      load();
    }
  }, [authStatus, session, load]);

  if (authStatus === 'loading') {
    return <div className="container mx-auto px-4 py-16 text-center text-slate-500 text-sm">Checking access…</div>;
  }
  if (authStatus !== 'authenticated' || !session?.user?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-xl">
        <div className="card p-8 text-center">
          <div className="text-3xl mb-2">🔒</div>
          <p className="text-slate-300 mb-2">Admin access required.</p>
          <Link href="/login" className="text-sm text-slate-400 hover:text-white underline">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  async function handlePublish(slug: string) {
    setActionId(slug);
    try {
      const res = await fetch(`/api/mission-debriefs/${slug}/publish`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || 'Publish failed');
      }
      await load();
    } catch (e) {
      clientLogger.error('admin debrief publish failed', {
        slug,
        error: e instanceof Error ? e.message : String(e),
      });
      alert(`Publish failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setActionId(null);
    }
  }

  async function handleUnpublish(slug: string) {
    setActionId(slug);
    try {
      const res = await fetch(`/api/mission-debriefs/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishedAt: null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || 'Unpublish failed');
      }
      await load();
    } catch (e) {
      clientLogger.error('admin debrief unpublish failed', {
        slug,
        error: e instanceof Error ? e.message : String(e),
      });
      alert(`Unpublish failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(slug: string) {
    if (!confirm(`Delete debrief "${slug}"? This cannot be undone.`)) return;
    setActionId(slug);
    try {
      const res = await fetch(`/api/mission-debriefs/${slug}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || 'Delete failed');
      }
      await load();
    } catch (e) {
      clientLogger.error('admin debrief delete failed', {
        slug,
        error: e instanceof Error ? e.message : String(e),
      });
      alert(`Delete failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setActionId(null);
    }
  }

  const drafts = rows.filter((r) => !r.publishedAt);
  const published = rows.filter((r) => r.publishedAt);

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Mission Debriefs — Admin</h1>
          <p className="text-sm text-slate-400 mt-1">
            {rows.length} total · {drafts.length} drafts · {published.length} published
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/mission-debriefs/admin/new"
            className="text-sm bg-white text-black rounded px-4 py-2 hover:bg-slate-200"
          >
            + New Debrief
          </Link>
          <button
            onClick={load}
            className="text-sm border border-white/10 text-slate-300 rounded px-4 py-2 hover:bg-white/5"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-12 text-slate-500 text-sm">Loading…</div>}
      {error && !loading && (
        <div className="card p-4 border-red-500/30 text-sm text-red-300 mb-6">{error}</div>
      )}

      {!loading && rows.length === 0 && (
        <div className="card p-10 text-center text-slate-400 text-sm">
          No debriefs yet. Click <strong>+ New Debrief</strong> to create one.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 border-b border-white/10">
              <tr>
                <th className="text-left px-4 py-2.5">Mission</th>
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Source</th>
                <th className="text-left px-4 py-2.5">Published</th>
                <th className="text-right px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/mission-debriefs/${r.slug}`}
                      className="text-white hover:text-slate-300 font-medium"
                    >
                      {r.missionName}
                    </Link>
                    <div className="text-xs text-slate-500 mt-0.5">{r.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{formatDate(r.missionDate)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${STATUS_COLORS[r.status]}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{r.generatedBy || '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {r.publishedAt ? (
                      <span className="text-emerald-400">{formatDate(r.publishedAt)}</span>
                    ) : (
                      <span className="text-amber-400">Draft</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {r.publishedAt ? (
                        <button
                          disabled={actionId === r.slug}
                          onClick={() => handleUnpublish(r.slug)}
                          className="text-xs text-amber-300 hover:text-amber-200 px-2 py-1 border border-amber-500/30 rounded disabled:opacity-50"
                        >
                          Unpublish
                        </button>
                      ) : (
                        <button
                          disabled={actionId === r.slug}
                          onClick={() => handlePublish(r.slug)}
                          className="text-xs text-emerald-300 hover:text-emerald-200 px-2 py-1 border border-emerald-500/30 rounded disabled:opacity-50"
                        >
                          Publish
                        </button>
                      )}
                      <button
                        disabled={actionId === r.slug}
                        onClick={() => handleDelete(r.slug)}
                        className="text-xs text-red-300 hover:text-red-200 px-2 py-1 border border-red-500/30 rounded disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
