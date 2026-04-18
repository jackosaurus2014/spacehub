'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { toast } from '@/lib/toast';
import { extractApiError } from '@/lib/errors';
import { clientLogger } from '@/lib/client-logger';

export const dynamic = 'force-dynamic';

type NotifyChannel = 'email' | 'notification' | 'both';
type SearchType = 'all' | 'news' | 'companies' | 'jobs' | 'investors' | 'marketplace' | 'forum' | 'blog';

interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  query: string | null;
  searchType: string;
  type: SearchType;
  notifyVia: NotifyChannel;
  alertEnabled: boolean;
  lastRunAt: string | null;
  lastResultCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  success: true;
  data: {
    savedSearches: SavedSearch[];
    count: number;
    limit: number | null;
    tier: string;
  };
}

const TYPE_OPTIONS: { value: SearchType; label: string }[] = [
  { value: 'all', label: 'All categories' },
  { value: 'news', label: 'News' },
  { value: 'companies', label: 'Companies' },
  { value: 'jobs', label: 'Jobs' },
  { value: 'investors', label: 'Investors' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'forum', label: 'Community' },
  { value: 'blog', label: 'Blog' },
];

const NOTIFY_OPTIONS: { value: NotifyChannel; label: string; description: string }[] = [
  { value: 'notification', label: 'In-app only', description: 'Notification bell only' },
  { value: 'email', label: 'Email only', description: 'Daily digest email' },
  { value: 'both', label: 'In-app + email', description: 'Both channels' },
];

function formatDateTime(value: string | null): string {
  if (!value) return 'Never';
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Never';
  }
}

function searchHref(query: string, type: SearchType): string {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (type && type !== 'all') params.set('type', type);
  const qs = params.toString();
  return qs ? `/search?${qs}` : '/search';
}

export default function SavedSearchesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      }
    >
      <SavedSearchesPageInner />
    </Suspense>
  );
}

function SavedSearchesPageInner() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const sp = useSearchParams();

  const [items, setItems] = useState<SavedSearch[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<string>('free');
  const [limit, setLimit] = useState<number | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  // Edit modal state
  const [editing, setEditing] = useState<SavedSearch | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuery, setEditQuery] = useState('');
  const [editType, setEditType] = useState<SearchType>('all');
  const [editNotify, setEditNotify] = useState<NotifyChannel>('notification');
  const [savingEdit, setSavingEdit] = useState(false);

  // Create modal state (when arriving from /search via "Save current search")
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQuery, setNewQuery] = useState('');
  const [newType, setNewType] = useState<SearchType>('all');
  const [newNotify, setNewNotify] = useState<NotifyChannel>('notification');
  const [savingNew, setSavingNew] = useState(false);

  // ─── Auth gate ──────────────────────────────────────────────
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login?next=/saved-searches');
    }
  }, [sessionStatus, router]);

  // ─── Fetch list ─────────────────────────────────────────────
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/saved-searches', { cache: 'no-store' });
      const json = (await res.json()) as ListResponse | Record<string, unknown>;
      if (!res.ok || !('success' in json) || !json.success) {
        toast.error(extractApiError(json as Record<string, unknown>, 'Failed to load saved searches'));
        setItems([]);
        return;
      }
      const data = (json as ListResponse).data;
      // Show only the global-search rows here. Module-level saved searches are
      // managed from their own UIs (company directory, marketplace, etc.).
      const globals = data.savedSearches.filter((s) => s.searchType === 'global_search');
      setItems(globals);
      setTier(data.tier);
      setLimit(data.limit);
    } catch (err) {
      clientLogger.error('Failed to load saved searches', {
        error: err instanceof Error ? err.message : String(err),
      });
      toast.error('Failed to load saved searches');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      refresh();
    }
  }, [sessionStatus, refresh]);

  // ─── Auto-prefill the create modal when arriving with ?save= ─
  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    if (sp.get('save') !== '1') return;

    const q = sp.get('q') || '';
    const t = (sp.get('type') || 'all') as SearchType;
    if (!q.trim()) return;

    setNewQuery(q);
    setNewType(TYPE_OPTIONS.some((o) => o.value === t) ? t : 'all');
    setNewName(`${q.slice(0, 60)}${q.length > 60 ? '…' : ''}`);
    setNewNotify('notification');
    setCreating(true);

    // Strip query so re-mounts don't reopen the modal
    const url = new URL(window.location.href);
    url.searchParams.delete('save');
    url.searchParams.delete('q');
    url.searchParams.delete('type');
    router.replace(url.pathname + (url.search || ''), { scroll: false });
  }, [sessionStatus, sp, router]);

  // ─── Mutations ──────────────────────────────────────────────
  const onCreate = async () => {
    if (!newName.trim() || !newQuery.trim()) {
      toast.error('Name and query are required');
      return;
    }
    setSavingNew(true);
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          query: newQuery.trim(),
          type: newType,
          notifyVia: newNotify,
        }),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok || !json.success) {
        toast.error(extractApiError(json, 'Failed to save search'));
        return;
      }
      toast.success('Saved search created');
      setCreating(false);
      setNewName('');
      setNewQuery('');
      setNewType('all');
      setNewNotify('notification');
      refresh();
    } catch (err) {
      clientLogger.error('Failed to create saved search', {
        error: err instanceof Error ? err.message : String(err),
      });
      toast.error('Failed to save search');
    } finally {
      setSavingNew(false);
    }
  };

  const onEditOpen = (s: SavedSearch) => {
    setEditing(s);
    setEditName(s.name);
    setEditQuery(s.query || '');
    setEditType(s.type);
    setEditNotify(s.notifyVia);
  };

  const onEditSave = async () => {
    if (!editing) return;
    if (!editName.trim() || !editQuery.trim()) {
      toast.error('Name and query are required');
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/saved-searches/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          query: editQuery.trim(),
          type: editType,
          notifyVia: editNotify,
        }),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok || !json.success) {
        toast.error(extractApiError(json, 'Failed to update saved search'));
        return;
      }
      toast.success('Saved search updated');
      setEditing(null);
      refresh();
    } catch (err) {
      clientLogger.error('Failed to update saved search', {
        error: err instanceof Error ? err.message : String(err),
      });
      toast.error('Failed to update saved search');
    } finally {
      setSavingEdit(false);
    }
  };

  const onDelete = async (s: SavedSearch) => {
    if (!confirm(`Delete saved search "${s.name}"?`)) return;
    try {
      const res = await fetch(`/api/saved-searches/${s.id}`, { method: 'DELETE' });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok || !json.success) {
        toast.error(extractApiError(json, 'Failed to delete saved search'));
        return;
      }
      toast.success('Saved search deleted');
      refresh();
    } catch (err) {
      clientLogger.error('Failed to delete saved search', {
        error: err instanceof Error ? err.message : String(err),
      });
      toast.error('Failed to delete saved search');
    }
  };

  const onRunNow = async (s: SavedSearch) => {
    setRunning(s.id);
    try {
      const res = await fetch(`/api/saved-searches/${s.id}/run`, { method: 'POST' });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok || !json.success) {
        toast.error(extractApiError(json, 'Failed to run search'));
        return;
      }
      const data = (json as { data: { newCount: number; results: unknown[] } }).data;
      toast.success(
        `Ran "${s.name}": ${data.results.length} ${data.results.length === 1 ? 'result' : 'results'}, ${data.newCount} new`
      );
      refresh();
    } catch (err) {
      clientLogger.error('Failed to run saved search', {
        error: err instanceof Error ? err.message : String(err),
      });
      toast.error('Failed to run search');
    } finally {
      setRunning(null);
    }
  };

  // ─── Render ─────────────────────────────────────────────────
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }
  if (sessionStatus === 'unauthenticated') return null;

  const itemsList = items || [];
  const atLimit = limit !== null && itemsList.length >= limit;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 pb-12">
        <AnimatedPageHeader
          title="Saved Searches"
          subtitle="Smart alerts for the queries you care about"
          icon="🔔"
          accentColor="cyan"
        />

        {/* Top action bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="text-sm text-star-300">
            <span className="text-white font-medium">{itemsList.length}</span>
            {limit !== null ? (
              <>
                {' / '}
                <span>{limit}</span>{' '}
                <span className="text-star-300/70">on the {tier} tier</span>
              </>
            ) : (
              <span className="text-star-300/70"> — unlimited on {tier}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/search"
              className="px-3 py-2 text-sm rounded-xl bg-white/[0.06] text-star-200 border border-white/[0.06] hover:border-white/10 hover:text-white transition-all"
            >
              Browse search
            </Link>
            <button
              onClick={() => {
                if (atLimit) {
                  toast.error(
                    `You've reached the maximum of ${limit} saved searches on the ${tier} tier. Upgrade to Pro for unlimited.`
                  );
                  return;
                }
                setNewName('');
                setNewQuery('');
                setNewType('all');
                setNewNotify('notification');
                setCreating(true);
              }}
              className="px-4 py-2 text-sm rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/[0.15] transition-all"
            >
              + Save current search
            </button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="md" />
          </div>
        ) : itemsList.length === 0 ? (
          <EmptyState
            icon={<span className="text-4xl">🔔</span>}
            title="No saved searches yet"
            description="Save a search from the search page to get notified when new results match your query."
            action={
              <Link
                href="/search"
                className="px-4 py-2 text-sm rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/[0.15] transition-all"
              >
                Go to search
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {itemsList.map((s) => (
              <div
                key={s.id}
                className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h3 className="text-white font-medium truncate">{s.name}</h3>
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-cyan-400 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.06]">
                      {s.type}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-star-300 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                      {s.notifyVia === 'both' ? 'in-app + email' : s.notifyVia === 'email' ? 'email' : 'in-app'}
                    </span>
                  </div>
                  <p className="text-sm text-star-300 truncate">
                    Query: <code className="text-cyan-300">{s.query || '(no query)'}</code>
                  </p>
                  <p className="text-xs text-star-300/70 mt-1.5">
                    Last run {formatDateTime(s.lastRunAt)} · {s.lastResultCount} {s.lastResultCount === 1 ? 'result' : 'results'} cached
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
                  <Link
                    href={searchHref(s.query || '', s.type)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] text-star-200 border border-white/[0.06] hover:text-white hover:border-white/10 transition-all"
                  >
                    Open
                  </Link>
                  <button
                    onClick={() => onRunNow(s)}
                    disabled={running === s.id}
                    className="px-3 py-1.5 text-xs rounded-lg bg-white/10 text-white border border-white/10 hover:bg-white/[0.15] disabled:opacity-50 transition-all"
                  >
                    {running === s.id ? 'Running…' : 'Run Now'}
                  </button>
                  <button
                    onClick={() => onEditOpen(s)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] text-star-200 border border-white/[0.06] hover:text-white hover:border-white/10 transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(s)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] text-rose-300 border border-white/[0.06] hover:text-rose-200 hover:border-rose-400/40 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Create modal ──────────────────────────────────── */}
      <Modal isOpen={creating} onClose={() => setCreating(false)} title="Save this search">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-star-200 mb-1.5">Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={200}
              placeholder="e.g. SpaceX news"
              className="w-full px-3 py-2 text-sm bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-star-400 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <div>
            <label className="block text-sm text-star-200 mb-1.5">Query</label>
            <input
              value={newQuery}
              onChange={(e) => setNewQuery(e.target.value)}
              maxLength={500}
              placeholder="What to search for"
              className="w-full px-3 py-2 text-sm bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-star-400 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <div>
            <label className="block text-sm text-star-200 mb-1.5">Category</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as SearchType)}
              className="w-full px-3 py-2 text-sm bg-white/[0.06] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-black">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-star-200 mb-1.5">Notify via</label>
            <div className="space-y-1.5">
              {NOTIFY_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-all ${
                    newNotify === o.value
                      ? 'bg-white/10 border-white/15'
                      : 'bg-white/[0.04] border-white/[0.06] hover:border-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="newNotify"
                    value={o.value}
                    checked={newNotify === o.value}
                    onChange={() => setNewNotify(o.value)}
                    className="accent-cyan-400"
                  />
                  <div>
                    <div className="text-sm text-white">{o.label}</div>
                    <div className="text-xs text-star-300/70">{o.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setCreating(false)}
              className="px-3 py-2 text-sm rounded-xl bg-white/[0.04] text-star-200 border border-white/[0.06] hover:text-white hover:border-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onCreate}
              disabled={savingNew}
              className="px-4 py-2 text-sm rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/[0.15] disabled:opacity-50 transition-all"
            >
              {savingNew ? 'Saving…' : 'Save search'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Edit modal ────────────────────────────────────── */}
      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title="Edit saved search">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-star-200 mb-1.5">Name</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={200}
              className="w-full px-3 py-2 text-sm bg-white/[0.06] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <div>
            <label className="block text-sm text-star-200 mb-1.5">Query</label>
            <input
              value={editQuery}
              onChange={(e) => setEditQuery(e.target.value)}
              maxLength={500}
              className="w-full px-3 py-2 text-sm bg-white/[0.06] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <div>
            <label className="block text-sm text-star-200 mb-1.5">Category</label>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value as SearchType)}
              className="w-full px-3 py-2 text-sm bg-white/[0.06] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-black">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-star-200 mb-1.5">Notify via</label>
            <div className="space-y-1.5">
              {NOTIFY_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-all ${
                    editNotify === o.value
                      ? 'bg-white/10 border-white/15'
                      : 'bg-white/[0.04] border-white/[0.06] hover:border-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="editNotify"
                    value={o.value}
                    checked={editNotify === o.value}
                    onChange={() => setEditNotify(o.value)}
                    className="accent-cyan-400"
                  />
                  <div>
                    <div className="text-sm text-white">{o.label}</div>
                    <div className="text-xs text-star-300/70">{o.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setEditing(null)}
              className="px-3 py-2 text-sm rounded-xl bg-white/[0.04] text-star-200 border border-white/[0.06] hover:text-white hover:border-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onEditSave}
              disabled={savingEdit}
              className="px-4 py-2 text-sm rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/[0.15] disabled:opacity-50 transition-all"
            >
              {savingEdit ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
