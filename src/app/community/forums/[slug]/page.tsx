'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ThreadCard, { ThreadData } from '@/components/community/ThreadCard';
import ITARWarningBanner from '@/components/community/ITARWarningBanner';
import ThreadTags from '@/components/community/ThreadTags';
import { toast } from '@/lib/toast';
import { FORUM_TAGS } from '@/lib/validations';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

interface CategoryInfo {
  id: string;
  slug: string;
  name: string;
  description: string;
}

export default function ForumCategoryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [category, setCategory] = useState<CategoryInfo | null>(null);
  const [threads, setThreads] = useState<ThreadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryNotFound, setCategoryNotFound] = useState(false);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const res = await fetch(`/api/community/forums/${slug}`);
        if (res.ok) {
          const json = await res.json();
          const data = json.data || json;
          setCategory(data.category || { id: slug, slug, name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), description: '' });
          setCategoryNotFound(false);
          const threadsList = (data.threads || []).map((t: any) => ({
            id: t.id,
            title: t.title,
            authorName: t.author?.name || 'Unknown',
            authorId: t.author?.id || '',
            category: data.category?.name || slug,
            replyCount: t.postCount || 0,
            viewCount: t.viewCount || 0,
            isPinned: t.isPinned || false,
            isLocked: t.isLocked || false,
            lastActivityAt: t.updatedAt || t.createdAt,
            createdAt: t.createdAt,
            tags: t.tags || [],
            acceptedPostId: t.acceptedPostId || null,
            upvoteCount: t.upvoteCount || 0,
            downvoteCount: t.downvoteCount || 0,
          }));
          setThreads(threadsList);
        } else if (res.status === 404) {
          setCategoryNotFound(true);
          setCategory({ id: slug, slug, name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), description: '' });
        }
      } catch {
        // fallback
        setCategory({ id: slug, slug, name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), description: '' });
      } finally {
        setLoading(false);
      }
    };
    fetchThreads();
  }, [slug]);

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    setCreating(true);
    try {
      const res = await fetch(`/api/community/forums/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), content: newContent.trim(), tags: newTags }),
      });

      if (res.ok) {
        const json = await res.json();
        const thread = json.data || json.thread || json;
        toast.success('Thread created successfully');
        setShowNewThread(false);
        setNewTitle('');
        setNewContent('');
        setNewTags([]);
        // Add new thread to the top of the list
        if (thread.id) {
          setThreads((prev) => [{
            id: thread.id,
            title: thread.title,
            authorName: thread.author?.name || 'You',
            authorId: thread.author?.id || '',
            category: category?.name || slug,
            replyCount: 0,
            viewCount: 0,
            isPinned: false,
            isLocked: false,
            lastActivityAt: thread.createdAt,
            createdAt: thread.createdAt,
            tags: thread.tags || [],
            acceptedPostId: null,
            upvoteCount: 0,
            downvoteCount: 0,
          }, ...prev]);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = typeof errData.error === 'string'
          ? errData.error
          : errData.error?.message || 'Failed to create thread';
        toast.error(errMsg);
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Sort: pinned first, then by selected sort
  const sortedThreads = [...threads].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    if (sortBy === 'top') {
      const aScore = (a.upvoteCount || 0) - (a.downvoteCount || 0);
      const bScore = (b.upvoteCount || 0) - (b.downvoteCount || 0);
      return bScore - aScore;
    }
    if (sortBy === 'popular') {
      return (b.viewCount || 0) - (a.viewCount || 0);
    }
    return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[
          { label: 'Community', href: '/community' },
          { label: 'Forums', href: '/community/forums' },
          { label: category?.name || slug },
        ]} />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-100">
              {category?.name || 'Loading...'}
            </h1>
            {category?.description && (
              <p className="text-sm text-slate-400 mt-1">{category.description}</p>
            )}
          </div>
          <button
            onClick={() => setShowNewThread(!showNewThread)}
            disabled={categoryNotFound}
            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Thread
          </button>
        </div>

        <ITARWarningBanner />

        {/* Category not found state */}
        {!loading && categoryNotFound && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-amber-300 mb-1">Category Not Found</h3>
                <p className="text-sm text-slate-400">
                  The forum category &ldquo;{slug}&rdquo; does not exist yet. Forum categories may need to be initialized.
                  Please go back to the <Link href="/community/forums" className="text-cyan-400 hover:text-cyan-300 underline">forums page</Link> and try again, or contact an administrator.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* New thread form */}
        {showNewThread && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card p-5 mb-6"
          >
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Create New Thread</h3>
            <form onSubmit={handleCreateThread} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="What would you like to discuss?"
                  maxLength={200}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Content <span className="text-slate-500 font-normal">(Markdown supported)</span></label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Share your thoughts, questions, or insights..."
                  rows={5}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none resize-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Tags <span className="text-slate-500 font-normal">(optional, max 5)</span></label>
                <ThreadTags tags={newTags} editable onChange={setNewTags} />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Creating...
                    </>
                  ) : (
                    'Post Thread'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewThread(false); setNewTitle(''); setNewContent(''); setNewTags([]); }}
                  className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Empty state */}
        {!loading && !categoryNotFound && sortedThreads.length === 0 && (
          <div className="text-center py-20">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-1">No threads yet</h3>
            <p className="text-sm text-slate-400 mb-4">Be the first to start a discussion in this category.</p>
            <button
              onClick={() => setShowNewThread(true)}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
            >
              Start a Thread
            </button>
          </div>
        )}

        {/* Sort dropdown */}
        {!loading && sortedThreads.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-slate-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
            >
              <option value="newest">Newest</option>
              <option value="popular">Most Viewed</option>
              <option value="top">Top Voted</option>
            </select>
          </div>
        )}

        {/* Thread list */}
        {!loading && sortedThreads.length > 0 && (
          <div className="space-y-2">
            {sortedThreads.map((thread, idx) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                categorySlug={slug}
                index={idx}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
