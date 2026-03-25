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

interface ReadingListItem {
  id: string;
  title: string;
  url: string;
  source: string;
  category: string;
  savedAt: string;
  read: boolean;
}

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

  useEffect(() => {
    if (status === 'loading') return;

    const fetchList = async () => {
      try {
        const res = await fetch('/api/reading-list');
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, [status]);

  const toggleRead = async (id: string) => {
    try {
      const res = await fetch('/api/reading-list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, read: data.read } : item
          )
        );
      }
    } catch {
      toast.error('Failed to update');
    }
  };

  const removeItem = async (id: string) => {
    try {
      const res = await fetch('/api/reading-list', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        toast.success('Removed from reading list');
      }
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

  if (!session?.user?.id) {
    return (
      <main className="min-h-screen bg-black py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <AnimatedPageHeader
            title="Reading List"
            subtitle="Save articles to read later"
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[0.04] flex items-center justify-center">
              <svg
                className="w-8 h-8 text-slate-500"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white/90 mb-2">
              Sign in to use your reading list
            </h2>
            <p className="text-slate-400 mb-6">
              Save articles from the news feed to read later.
            </p>
            <Link
              href="/login"
              className="btn-primary inline-block text-sm py-2.5 px-6"
            >
              Sign In
            </Link>
          </motion.div>
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
