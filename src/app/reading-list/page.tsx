'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { toast } from '@/lib/toast';
import EmptyState from '@/components/ui/EmptyState';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import {
  READING_LIST_EVENT,
  fetchAccountReadingList,
  mergeReadingLists,
  readLocalReadingList,
  removeLocalByUrl,
  syncLocalToAccount,
  unsyncedItems,
  writeLocalReadingList,
  type ReadingListItem,
} from '@/lib/reading-list';

// 2026-09-13 (competitor review #10): this page used to be account-only while
// the save button on news cards wrote to a localStorage key nothing read. Both
// now share src/lib/reading-list.ts, so a signed-out visitor sees the articles
// they saved and is offered the account rather than being blocked by it.

const categoryColors: Record<string, string> = {
  launches: 'bg-white/[0.08] text-white/70',
  missions: 'bg-white/10 text-slate-300',
  companies: 'bg-blue-500/20 text-blue-400',
  satellites: 'bg-white/10 text-slate-300',
  defense: 'bg-slate-500/20 text-slate-300',
  earnings: 'bg-green-500/20 text-green-400',
  mergers: 'bg-purple-500/20 text-purple-400',
  development: 'bg-yellow-500/20 text-yellow-400',
  policy: 'bg-red-500/20 text-red-400',
  debris: 'bg-orange-500/20 text-orange-400',
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function ReadingListPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<ReadingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [syncing, setSyncing] = useState(false);

  const signedIn = !!session?.user?.id;

  useEffect(() => {
    if (status === 'loading') return;

    // Browser copy first (instant, works signed out), account copy second.
    const load = async () => {
      setItems(mergeReadingLists(readLocalReadingList(), []));
      const account = await fetchAccountReadingList();
      setItems(mergeReadingLists(readLocalReadingList(), account));
      setLoading(false);
    };

    void load();

    // Saves made elsewhere in the tab (a card, the /reading-list/save link)
    // land here without a reload.
    const onLocalChange = () =>
      setItems((prev) =>
        mergeReadingLists(
          readLocalReadingList(),
          prev.filter((i) => i.synced),
        ),
      );
    window.addEventListener(READING_LIST_EVENT, onLocalChange);
    return () => window.removeEventListener(READING_LIST_EVENT, onLocalChange);
  }, [status]);

  const pendingCount = unsyncedItems(items).length;

  const keepOnAccount = async () => {
    setSyncing(true);
    try {
      const saved = await syncLocalToAccount();
      const account = await fetchAccountReadingList();
      setItems(mergeReadingLists(readLocalReadingList(), account));
      toast.success(
        saved > 0
          ? `Kept ${saved} article${saved !== 1 ? 's' : ''} on your account`
          : 'Nothing new to keep',
      );
    } catch {
      toast.error('Could not sync your reading list');
    } finally {
      setSyncing(false);
    }
  };

  const toggleRead = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    // Local-only rows have no server row to PATCH — flip them in the browser.
    if (!item.synced) {
      const next = readLocalReadingList().map((i) =>
        i.id === id ? { ...i, read: !i.read } : i,
      );
      writeLocalReadingList(next);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: !i.read } : i)));
      return;
    }

    try {
      const res = await fetch('/api/reading-list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, read: data.read } : i))
        );
      }
    } catch {
      toast.error('Failed to update');
    }
  };

  const removeItem = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    // Always clear the browser copy, so the save button on the feed goes
    // back to "Save" immediately whether or not the account call succeeds.
    removeLocalByUrl(item.url);
    setItems((prev) => prev.filter((i) => i.id !== id));

    if (!item.synced) {
      toast.success('Removed from reading list');
      return;
    }
    try {
      await fetch('/api/reading-list', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      toast.success('Removed from reading list');
    } catch {
      toast.error('Failed to remove');
    }
  };

  const filteredItems = items.filter((item) => {
    if (filter === 'unread') return !item.read;
    if (filter === 'read') return item.read;
    return true;
  });

  const unreadCount = items.filter((i) => !i.read).length;
  const readCount = items.filter((i) => i.read).length;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeAgo = (dateStr: string) => {
    const now = Date.now();
    const saved = new Date(dateStr).getTime();
    const diffMs = now - saved;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return formatDate(dateStr);
  };

  if (status === 'loading' || loading) {
    return (
      <main className="min-h-screen bg-black py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <AnimatedPageHeader
            title="Reading List"
            subtitle="Your saved articles"
            accentColor="cyan"
            icon={
              <svg
                className="w-8 h-8 text-slate-300"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            }
          />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-white/[0.04] animate-pulse"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <AnimatedPageHeader
          title="Reading List"
          subtitle={`${items.length} saved article${items.length !== 1 ? 's' : ''}${unreadCount > 0 ? ' · ' + unreadCount + ' unread' : ''}`}
          accentColor="cyan"
          icon={
            <svg
              className="w-8 h-8 text-slate-300"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          }
        >
          <div className="flex items-center gap-2">
            <Link
              href="/news"
              className="text-sm text-slate-300 hover:text-white transition-colors inline-flex items-center gap-1"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Browse News
            </Link>
          </div>
        </AnimatedPageHeader>

        {/* Keep-these-on-your-account nudge. Signed out, this is the only
            place we ask for an account; signed in, it appears only while the
            browser still holds rows the server has not accepted. */}
        {!loading && pendingCount > 0 && (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.05] p-4 mb-6 text-sm text-slate-200">
            {signedIn ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  {pendingCount} article{pendingCount !== 1 ? 's' : ''} {pendingCount !== 1 ? 'are' : 'is'} saved
                  in this browser only.
                </span>
                <button
                  type="button"
                  onClick={keepOnAccount}
                  disabled={syncing}
                  className="btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                >
                  {syncing ? 'Keeping…' : 'Keep them on my account'}
                </button>
              </div>
            ) : (
              <span>
                These {pendingCount} saved article{pendingCount !== 1 ? 's' : ''} live only in this browser.{' '}
                <Link href="/login?callbackUrl=%2Freading-list" className="text-cyan-300 underline underline-offset-2">
                  Sign in
                </Link>{' '}
                or{' '}
                <Link href="/register?callbackUrl=%2Freading-list" className="text-cyan-300 underline underline-offset-2">
                  create a free account
                </Link>{' '}
                to keep them across devices.
              </span>
            )}
          </div>
        )}

        {/* Filter tabs */}
        <ScrollReveal>
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2 mb-6"
          >
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white/10 text-white/90 border border-white/10'
                  : 'text-slate-400 hover:text-white/90 hover:bg-white/[0.08]'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-white/10 text-white/90 border border-white/10'
                  : 'text-slate-400 hover:text-white/90 hover:bg-white/[0.08]'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'read'
                  ? 'bg-white/10 text-white/90 border border-white/10'
                  : 'text-slate-400 hover:text-white/90 hover:bg-white/[0.08]'
              }`}
            >
              Read ({readCount})
            </button>
          </motion.div>
        )}

        </ScrollReveal>

        {/* Empty state */}
        <ScrollReveal delay={0.1}>
        {items.length === 0 && (
          <EmptyState
            reason="Nothing is missing — the reading list contains only what you bookmark, and it fills the first time you save an article."
            icon={<span className="text-4xl">🔖</span>}
            illustration="/art/empty-state-getting-started.png"
            title="Your reading list is empty"
            description="Browse articles and click the bookmark icon to save them here. Build your personal library of space industry news and research."
            action={
              <Link
                href="/news"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-medium rounded-lg transition-colors"
              >
                Browse News Articles
              </Link>
            }
          />
        )}

        {/* Filtered empty state */}
        {items.length > 0 && filteredItems.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-slate-400">
              {filter === 'unread'
                ? 'No unread articles. Great job staying up to date!'
                : 'No read articles yet.'}
            </p>
          </motion.div>
        )}

        </ScrollReveal>

        {/* Reading list items */}
        <ScrollReveal delay={0.1}>
        {filteredItems.length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                variants={fadeInUp}
                className={`group relative rounded-xl border transition-all duration-200 ${
                  item.read
                    ? 'bg-white/[0.04] border-white/[0.06]'
                    : 'bg-white/[0.04] border-white/[0.06] hover:border-white/10'
                }`}
              >
                <div className="flex items-start gap-4 p-4">
                  {/* Read toggle checkbox */}
                  <button
                    onClick={() => toggleRead(item.id)}
                    className={`mt-1 flex-shrink-0 w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${
                      item.read
                        ? 'bg-white/10 border-white/15 text-slate-300'
                        : 'border-white/[0.1] hover:border-white/15'
                    }`}
                    aria-label={
                      item.read ? 'Mark as unread' : 'Mark as read'
                    }
                    title={item.read ? 'Mark as unread' : 'Mark as read'}
                  >
                    {item.read && (
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Article content */}
                  <div className="flex-1 min-w-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block font-medium leading-snug transition-colors ${
                        item.read
                          ? 'text-slate-400 hover:text-white/90'
                          : 'text-white hover:text-white'
                      }`}
                    >
                      {item.title}
                    </a>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {item.source && (
                        <span className="text-xs text-slate-500">
                          {item.source}
                        </span>
                      )}
                      {item.source && item.category && (
                        <span className="text-slate-600 text-xs">
                          &middot;
                        </span>
                      )}
                      {item.category && (
                        <span
                          className={`text-xs font-medium px-1.5 py-0.5 rounded uppercase tracking-wide ${
                            categoryColors[item.category] ||
                            'bg-white/[0.08] text-slate-400'
                          }`}
                        >
                          {item.category}
                        </span>
                      )}
                      <span className="text-slate-600 text-xs">
                        &middot;
                      </span>
                      <span className="text-xs text-slate-500">
                        Saved {formatTimeAgo(item.savedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.08] transition-colors"
                      aria-label="Open article"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      aria-label="Remove from reading list"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
        </ScrollReveal>
        <RelatedModules modules={PAGE_RELATIONS['reading-list']} />
      </div>
    </main>
  );
}
