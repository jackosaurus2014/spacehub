'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ReportButton from '@/components/community/ReportButton';
import BlockButton from '@/components/community/BlockButton';
import VoteButton from '@/components/community/VoteButton';
import AcceptedAnswerBadge from '@/components/community/AcceptedAnswerBadge';
import SubscribeButton from '@/components/community/SubscribeButton';
import ThreadTags from '@/components/community/ThreadTags';
import { toast } from '@/lib/toast';
import { extractApiError } from '@/lib/errors';
import { useSession } from 'next-auth/react';

// Lazy-load MarkdownContent (react-markdown + remark-gfm are heavy)
const MarkdownContent = dynamic(() => import('@/components/community/MarkdownContent'), {
  ssr: false,
  loading: () => <div className="animate-pulse space-y-2 py-2"><div className="h-4 bg-slate-800 rounded w-full"></div><div className="h-4 bg-slate-800 rounded w-5/6"></div><div className="h-4 bg-slate-800 rounded w-4/6"></div></div>,
});

interface ForumPost {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  upvoteCount: number;
  downvoteCount: number;
  isAccepted: boolean;
  userVote: number | null;
}

interface ThreadDetail {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  category: string;
  categorySlug: string;
  categoryName: string;
  replyCount: number;
  viewCount: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  tags: string[];
  acceptedPostId: string | null;
  upvoteCount: number;
  downvoteCount: number;
  userVote: number | null;
  isSubscribed: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

export default function ThreadDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const threadId = params.threadId as string;
  const { data: session } = useSession();

  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [replies, setReplies] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [acceptedPostId, setAcceptedPostId] = useState<string | null>(null);

  useEffect(() => {
    const fetchThread = async () => {
      try {
        const res = await fetch(`/api/community/forums/${slug}/${threadId}`);
        if (res.ok) {
          const json = await res.json();
          const data = json.data || json;
          const t = data.thread;
          if (t) {
            setThread({
              id: t.id,
              title: t.title,
              content: t.content,
              authorId: t.author?.id || '',
              authorName: t.author?.name || 'Unknown',
              category: data.category?.name || slug,
              categorySlug: data.category?.slug || slug,
              categoryName: data.category?.name || slug,
              replyCount: t.postCount || 0,
              viewCount: t.viewCount || 0,
              isPinned: t.isPinned || false,
              isLocked: t.isLocked || false,
              createdAt: t.createdAt,
              tags: t.tags || [],
              acceptedPostId: t.acceptedPostId || null,
              upvoteCount: t.upvoteCount || 0,
              downvoteCount: t.downvoteCount || 0,
              userVote: t.userVote ?? null,
              isSubscribed: t.isSubscribed || false,
            });
            setAcceptedPostId(t.acceptedPostId || null);
          }
          const posts = (data.posts || []).map((p: any) => ({
            id: p.id,
            content: p.content,
            authorId: p.author?.id || p.authorId || '',
            authorName: p.author?.name || p.authorName || 'Unknown',
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            upvoteCount: p.upvoteCount || 0,
            downvoteCount: p.downvoteCount || 0,
            isAccepted: p.isAccepted || false,
            userVote: p.userVote ?? null,
          }));
          setReplies(posts);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchThread();
  }, [slug, threadId]);

  const handleAcceptAnswer = useCallback((postId: string) => {
    setAcceptedPostId((prev) => prev === postId ? null : postId);
    setReplies((prev) =>
      prev.map((r) => ({
        ...r,
        isAccepted: r.id === postId ? !r.isAccepted : false,
      }))
    );
  }, []);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/community/forums/${slug}/${threadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim() }),
      });

      if (res.ok) {
        const json = await res.json();
        toast.success('Reply posted');
        setReplyContent('');
        // API returns { success, data: post } — map to our ForumPost shape
        const newPost = json.data || json.reply;
        if (newPost) {
          setReplies((prev) => [...prev, {
            id: newPost.id,
            content: newPost.content,
            authorId: newPost.author?.id || newPost.authorId || '',
            authorName: newPost.author?.name || newPost.authorName || 'Unknown',
            createdAt: newPost.createdAt,
            updatedAt: newPost.updatedAt || newPost.createdAt,
            upvoteCount: newPost.upvoteCount || 0,
            downvoteCount: newPost.downvoteCount || 0,
            isAccepted: false,
            userVote: null,
          }]);
        }
      } else {
        const data = await res.json();
        toast.error(extractApiError(data, 'Failed to post reply'));
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Thread Not Found</h2>
            <p className="text-slate-400 mb-6">This thread may have been deleted or the URL is incorrect.</p>
            <Link
              href={`/community/forums/${slug}`}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
            >
              Back to Forum
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6 overflow-x-auto" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-cyan-400 whitespace-nowrap min-h-[44px] flex items-center">Home</Link>
          <span className="text-slate-600">/</span>
          <Link href="/community" className="hover:text-cyan-400 whitespace-nowrap min-h-[44px] flex items-center">Community</Link>
          <span className="text-slate-600">/</span>
          <Link href="/community/forums" className="hover:text-cyan-400 whitespace-nowrap min-h-[44px] flex items-center">Forums</Link>
          <span className="text-slate-600">/</span>
          <Link href={`/community/forums/${slug}`} className="hover:text-cyan-400 whitespace-nowrap min-h-[44px] flex items-center">
            {thread.categoryName || slug}
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-slate-300 whitespace-nowrap">{thread.title}</span>
        </nav>

        {/* Thread header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="card p-6 mb-6"
        >
          <div className="flex gap-4">
            {/* Vote column */}
            <div className="flex-shrink-0">
              <VoteButton
                contentType="thread"
                contentId={thread.id}
                initialUpvotes={thread.upvoteCount}
                initialDownvotes={thread.downvoteCount}
                initialUserVote={thread.userVote}
                slug={slug}
                threadId={thread.id}
              />
            </div>

            {/* Thread content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {thread.isPinned && (
                  <span className="text-xs px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded font-medium flex items-center gap-0.5">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Pinned
                  </span>
                )}
                {thread.isLocked && (
                  <span className="text-xs px-1.5 py-0.5 bg-slate-600/30 text-slate-400 rounded font-medium flex items-center gap-0.5">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Locked
                  </span>
                )}
                <span className="text-xs px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">
                  {thread.category}
                </span>
                {thread.acceptedPostId && (
                  <span className="text-xs px-1.5 py-0.5 bg-green-500/15 text-green-400 rounded font-medium flex items-center gap-0.5">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Answered
                  </span>
                )}
              </div>

              <h1 className="text-xl md:text-2xl font-bold text-slate-100 mb-2">{thread.title}</h1>

              {/* Tags */}
              {thread.tags && thread.tags.length > 0 && (
                <div className="mb-3">
                  <ThreadTags tags={thread.tags} />
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center text-xs font-bold text-cyan-300">
                  {getInitials(thread.authorName)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{thread.authorName}</p>
                  <p className="text-xs text-slate-500">{formatDate(thread.createdAt)}</p>
                </div>
              </div>

              {/* Markdown content */}
              <MarkdownContent content={thread.content} />

              {/* Stats + Actions */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {thread.viewCount} views
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <SubscribeButton
                    slug={slug}
                    threadId={thread.id}
                    initialSubscribed={thread.isSubscribed}
                  />
                  <ReportButton contentType="thread" contentId={thread.id} size="sm" />
                  <BlockButton targetUserId={thread.authorId} targetUserName={thread.authorName} size="sm" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Replies */}
        {replies.length > 0 && (
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Replies ({replies.length})
            </h3>
            {replies.map((reply, idx) => (
              <motion.div
                key={reply.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.3 }}
                className={`card p-5 ${reply.isAccepted ? 'border-l-2 border-l-green-500/60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Vote column */}
                  <div className="flex-shrink-0">
                    <VoteButton
                      contentType="post"
                      contentId={reply.id}
                      initialUpvotes={reply.upvoteCount}
                      initialDownvotes={reply.downvoteCount}
                      initialUserVote={reply.userVote}
                      slug={slug}
                      threadId={threadId}
                      size="sm"
                    />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0">
                    {getInitials(reply.authorName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium text-slate-200">{reply.authorName}</span>
                      <span className="text-xs text-slate-500">{timeAgo(reply.createdAt)}</span>
                      {reply.isAccepted && (
                        <span className="text-xs px-1.5 py-0.5 bg-green-500/15 text-green-400 rounded font-medium flex items-center gap-0.5">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Accepted Answer
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-1">
                        <AcceptedAnswerBadge
                          isAccepted={reply.isAccepted}
                          isThreadAuthor={session?.user?.id === thread.authorId}
                          postId={reply.id}
                          slug={slug}
                          threadId={threadId}
                          onAccept={handleAcceptAnswer}
                        />
                        <ReportButton contentType="post" contentId={reply.id} size="sm" />
                        <BlockButton targetUserId={reply.authorId} targetUserName={reply.authorName} size="sm" />
                      </div>
                    </div>
                    <MarkdownContent content={reply.content} className="text-sm" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Reply form */}
        {thread.isLocked ? (
          <div className="card p-5 text-center">
            <svg className="w-8 h-8 mx-auto text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-sm text-slate-400">This thread is locked. No new replies can be posted.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="card p-5"
          >
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Post a Reply</h3>
            <form onSubmit={handleReply}>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Share your thoughts... (Markdown supported, use @username to mention someone)"
                rows={4}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none resize-none mb-1"
                required
              />
              <p className="text-xs text-slate-500 mb-3">Supports **bold**, *italic*, `code`, [links](url), @mentions, and more Markdown formatting</p>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !replyContent.trim()}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Post Reply
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
