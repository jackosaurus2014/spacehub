'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ThreadCard, { ThreadData } from '@/components/community/ThreadCard';
import { toast } from '@/lib/toast';

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
  const [showNewThread, setShowNewThread] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const res = await fetch(`/api/community/forums/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setCategory(data.category || { id: slug, slug, name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), description: '' });
          setThreads(data.threads || []);
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
        body: JSON.stringify({ title: newTitle.trim(), content: newContent.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Thread created successfully');
        setShowNewThread(false);
        setNewTitle('');
        setNewContent('');
        // Add new thread to the top of the list
        if (data.thread) {
          setThreads((prev) => [data.thread, ...prev]);
        }
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create thread');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Sort: pinned first, then by newest
  const sortedThreads = [...threads].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <Link href="/community" className="hover:text-cyan-400 transition-colors">Community</Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/community/forums" className="hover:text-cyan-400 transition-colors">Forums</Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-300">{category?.name || slug}</span>
        </nav>

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
            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Thread
          </button>
        </div>

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
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Content</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Share your thoughts, questions, or insights..."
                  rows={5}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 resize-none"
                  required
                />
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
                  onClick={() => { setShowNewThread(false); setNewTitle(''); setNewContent(''); }}
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
        {!loading && sortedThreads.length === 0 && (
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
