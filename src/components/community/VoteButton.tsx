'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '@/lib/toast';

interface VoteButtonProps {
  contentType: 'thread' | 'post';
  contentId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  initialUserVote: number | null;
  slug: string;
  threadId: string;
  size?: 'sm' | 'md';
}

export default function VoteButton({
  contentType,
  contentId,
  initialUpvotes,
  initialDownvotes,
  initialUserVote,
  slug,
  threadId,
  size = 'sm',
}: VoteButtonProps) {
  const { data: session } = useSession();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<number | null>(initialUserVote);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const score = upvotes - downvotes;

  const iconSize = size === 'md' ? 'w-6 h-6' : 'w-5 h-5';
  const fontSize = size === 'md' ? 'text-base' : 'text-sm';
  const gap = size === 'md' ? 'gap-1' : 'gap-0.5';

  const getApiUrl = useCallback(() => {
    if (contentType === 'thread') {
      return `/api/community/forums/${slug}/${threadId}/vote`;
    }
    return `/api/community/forums/${slug}/${threadId}/posts/${contentId}/vote`;
  }, [contentType, slug, threadId, contentId]);

  const handleVote = useCallback(
    async (direction: 1 | -1) => {
      if (!session) {
        toast.error('Sign in to vote');
        return;
      }

      if (isSubmitting) return;

      // Determine new vote state: toggle off if same direction, otherwise set
      const newVote = userVote === direction ? null : direction;

      // Save previous state for rollback
      const prevUpvotes = upvotes;
      const prevDownvotes = downvotes;
      const prevUserVote = userVote;

      // Optimistic update
      let nextUpvotes = upvotes;
      let nextDownvotes = downvotes;

      // Remove old vote contribution
      if (prevUserVote === 1) nextUpvotes--;
      if (prevUserVote === -1) nextDownvotes--;

      // Apply new vote contribution
      if (newVote === 1) nextUpvotes++;
      if (newVote === -1) nextDownvotes++;

      setUpvotes(nextUpvotes);
      setDownvotes(nextDownvotes);
      setUserVote(newVote);
      setIsSubmitting(true);

      try {
        const res = await fetch(getApiUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vote: newVote ?? 0 }),
        });

        if (!res.ok) {
          throw new Error('Vote failed');
        }
      } catch {
        // Revert on error
        setUpvotes(prevUpvotes);
        setDownvotes(prevDownvotes);
        setUserVote(prevUserVote);
        toast.error('Failed to submit vote');
      } finally {
        setIsSubmitting(false);
      }
    },
    [session, isSubmitting, userVote, upvotes, downvotes, getApiUrl]
  );

  const scoreColor =
    score > 0
      ? 'text-green-400'
      : score < 0
        ? 'text-red-400'
        : 'text-slate-400';

  return (
    <div className={`flex flex-col items-center ${gap}`}>
      {/* Up arrow */}
      <button
        onClick={() => handleVote(1)}
        disabled={isSubmitting}
        className={`group p-0.5 rounded transition-colors duration-150 ${
          userVote === 1
            ? 'text-cyan-400'
            : 'text-slate-500 hover:text-cyan-300'
        } disabled:opacity-50`}
        aria-label="Upvote"
        title="Upvote"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`${iconSize} transition-transform duration-150 group-hover:scale-110`}
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      {/* Score */}
      <span
        className={`${fontSize} font-bold tabular-nums select-none ${scoreColor}`}
        title={`${upvotes} upvotes, ${downvotes} downvotes`}
      >
        {score}
      </span>

      {/* Down arrow */}
      <button
        onClick={() => handleVote(-1)}
        disabled={isSubmitting}
        className={`group p-0.5 rounded transition-colors duration-150 ${
          userVote === -1
            ? 'text-red-400'
            : 'text-slate-500 hover:text-red-300'
        } disabled:opacity-50`}
        aria-label="Downvote"
        title="Downvote"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`${iconSize} transition-transform duration-150 group-hover:scale-110`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  );
}
