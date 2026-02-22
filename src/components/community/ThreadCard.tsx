'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import ReportButton from './ReportButton';

export interface ThreadData {
  id: string;
  title: string;
  authorName: string;
  authorId: string;
  category: string;
  replyCount: number;
  viewCount: number;
  isPinned: boolean;
  isLocked: boolean;
  lastActivityAt: string;
  createdAt: string;
}

interface ThreadCardProps {
  thread: ThreadData;
  categorySlug: string;
  index?: number;
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
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ThreadCard({ thread, categorySlug, index = 0 }: ThreadCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
    >
      <Link href={`/community/forums/${categorySlug}/${thread.id}`}>
        <div
          className={`card px-5 py-4 group cursor-pointer transition-colors hover:border-cyan-500/30 ${
            thread.isPinned ? 'border-l-2 border-l-amber-500/50' : ''
          }`}
        >
          <div className="flex items-start gap-3">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {/* Indicators */}
                {thread.isPinned && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded font-medium flex-shrink-0">
                    Pinned
                  </span>
                )}
                {thread.isLocked && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-600/30 text-slate-400 rounded font-medium flex-shrink-0 flex items-center gap-0.5">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Locked
                  </span>
                )}
                <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded flex-shrink-0">
                  {thread.category}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-medium text-slate-200 group-hover:text-cyan-400 transition-colors line-clamp-1 mb-1">
                {thread.title}
              </h3>

              {/* Meta row */}
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>by <span className="text-slate-400">{thread.authorName}</span></span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {thread.viewCount}
                </span>
                <span className="ml-auto flex-shrink-0">{timeAgo(thread.lastActivityAt)}</span>
                <span className="flex-shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                  <ReportButton contentType="thread" contentId={thread.id} size="sm" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
