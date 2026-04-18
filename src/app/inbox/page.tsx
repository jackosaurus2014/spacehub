'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Bell, Check, Trash2 } from 'lucide-react';

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  read: boolean;
  createdAt: string;
}

type Filter = 'all' | 'unread' | 'read';

const PAGE_SIZE = 25;

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function groupNotifications(rows: NotificationRow[]): {
  today: NotificationRow[];
  week: NotificationRow[];
  earlier: NotificationRow[];
} {
  const now = new Date();
  const todayStart = startOfDay(now).getTime();
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;

  const today: NotificationRow[] = [];
  const week: NotificationRow[] = [];
  const earlier: NotificationRow[] = [];

  for (const n of rows) {
    const t = new Date(n.createdAt).getTime();
    if (t >= todayStart) today.push(n);
    else if (t >= weekStart) week.push(n);
    else earlier.push(n);
  }

  return { today, week, earlier };
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function InboxPage() {
  const { data: session, status } = useSession();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (targetPage: number, targetFilter: Filter) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          pageSize: String(PAGE_SIZE),
        });
        if (targetFilter === 'unread') params.set('unread', 'true');
        const res = await fetch(`/api/notifications?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          throw new Error('Failed to load notifications');
        }
        const data = (await res.json()) as {
          notifications: NotificationRow[];
          hasMore?: boolean;
          total?: number;
        };
        // Client-side filter for "read" (API only supports unread filter).
        const filtered =
          targetFilter === 'read'
            ? data.notifications.filter((n) => n.read)
            : data.notifications;

        setRows(filtered);
        setHasMore(Boolean(data.hasMore));
        setTotal(data.total ?? filtered.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchPage(page, filter);
  }, [page, filter, status, fetchPage]);

  const handleFilter = (f: Filter) => {
    setFilter(f);
    setPage(1);
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setRows((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch {
      // silent
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      setRows((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // silent
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRows((prev) => prev.filter((n) => n.id !== id));
      }
    } catch {
      // silent
    }
  };

  const grouped = useMemo(() => groupNotifications(rows), [rows]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/60 text-sm">Loading...</p>
      </div>
    );
  }

  if (status === 'unauthenticated' || !session?.user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full border border-white/20 rounded-lg p-8 text-center">
          <Bell className="w-10 h-10 mx-auto mb-4 text-white/60" />
          <h1 className="text-xl font-semibold mb-2">Sign in to view inbox</h1>
          <p className="text-sm text-white/60 mb-6">
            Your notifications live here once you&apos;re logged in.
          </p>
          <Link
            href="/auth/signin"
            className="inline-block px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-white/90 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6" />
              Inbox
            </h1>
            <p className="text-sm text-white/60 mt-1">
              {total} notification{total === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-white/20 rounded-md hover:bg-white/5 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Mark all read
          </button>
        </header>

        <div className="flex gap-1 mb-6 border-b border-white/10">
          {(['all', 'unread', 'read'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => handleFilter(f)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                filter === f
                  ? 'border-white text-white'
                  : 'border-transparent text-white/50 hover:text-white/80'
              }`}
            >
              {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'Read'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 border border-red-500/40 bg-red-500/10 rounded-md text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && rows.length === 0 ? (
          <div className="py-16 text-center text-white/50 text-sm">
            Loading notifications...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center border border-white/10 rounded-lg">
            <Bell className="w-8 h-8 mx-auto mb-3 text-white/30" />
            <p className="text-white/70 text-sm font-medium">
              {filter === 'unread'
                ? 'No unread notifications'
                : filter === 'read'
                ? 'No read notifications'
                : 'Your inbox is empty'}
            </p>
            <p className="text-xs text-white/40 mt-1">
              New activity will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <Section
              label="Today"
              items={grouped.today}
              onRead={handleMarkOneRead}
              onDismiss={handleDismiss}
            />
            <Section
              label="This Week"
              items={grouped.week}
              onRead={handleMarkOneRead}
              onDismiss={handleDismiss}
            />
            <Section
              label="Earlier"
              items={grouped.earlier}
              onRead={handleMarkOneRead}
              onDismiss={handleDismiss}
            />
          </div>
        )}

        {(page > 1 || hasMore) && (
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-xs font-medium border border-white/20 rounded-md hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs text-white/50">Page {page}</span>
            <button
              type="button"
              disabled={!hasMore || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-xs font-medium border border-white/20 rounded-md hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  label,
  items,
  onRead,
  onDismiss,
}: {
  label: string;
  items: NotificationRow[];
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2 px-1">
        {label}
      </h2>
      <div className="border border-white/10 rounded-lg divide-y divide-white/10">
        {items.map((n) => (
          <Row key={n.id} n={n} onRead={onRead} onDismiss={onDismiss} />
        ))}
      </div>
    </section>
  );
}

function Row({
  n,
  onRead,
  onDismiss,
}: {
  n: NotificationRow;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const body = (
    <div className="flex items-start gap-3 flex-1 min-w-0">
      <div className="pt-1.5 flex-shrink-0">
        <span
          className={`block w-2 h-2 rounded-full ${
            n.read ? 'bg-transparent' : 'bg-white'
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{n.title}</p>
        {n.message && (
          <p className="text-xs text-white/60 mt-1">{n.message}</p>
        )}
        <p className="text-[11px] text-white/40 mt-1.5">
          {timeAgo(n.createdAt)}
        </p>
      </div>
    </div>
  );

  return (
    <div
      className={`flex items-start gap-2 p-4 hover:bg-white/5 transition-colors ${
        n.read ? '' : 'bg-white/[0.02]'
      }`}
    >
      {n.linkUrl ? (
        <Link
          href={n.linkUrl}
          onClick={() => !n.read && onRead(n.id)}
          className="flex items-start gap-3 flex-1 min-w-0"
        >
          {body}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => !n.read && onRead(n.id)}
          className="flex items-start gap-3 flex-1 min-w-0 text-left"
        >
          {body}
        </button>
      )}
      <div className="flex items-center gap-1 flex-shrink-0">
        {!n.read && (
          <button
            type="button"
            onClick={() => onRead(n.id)}
            aria-label="Mark as read"
            title="Mark as read"
            className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onDismiss(n.id)}
          aria-label="Dismiss"
          title="Dismiss"
          className="p-1.5 text-white/50 hover:text-red-400 hover:bg-white/10 rounded transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
