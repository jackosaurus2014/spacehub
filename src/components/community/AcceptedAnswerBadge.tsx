'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '@/lib/toast';

interface AcceptedAnswerBadgeProps {
  isAccepted: boolean;
  isThreadAuthor: boolean;
  postId: string;
  slug: string;
  threadId: string;
  onAccept?: (postId: string) => void;
}

export default function AcceptedAnswerBadge({
  isAccepted: initialIsAccepted,
  isThreadAuthor,
  postId,
  slug,
  threadId,
  onAccept,
}: AcceptedAnswerBadgeProps) {
  const { data: session } = useSession();
  const [isAccepted, setIsAccepted] = useState(initialIsAccepted);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleAccept = useCallback(async () => {
    if (!session) {
      toast.error('Sign in to manage accepted answers');
      return;
    }

    if (!isThreadAuthor || isSubmitting) return;

    const prevAccepted = isAccepted;
    setIsAccepted(!isAccepted);
    setIsSubmitting(true);

    try {
      const res = await fetch(
        `/api/community/forums/${slug}/${threadId}/accept`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: prevAccepted ? null : postId }),
        }
      );

      if (!res.ok) {
        throw new Error('Failed to update accepted answer');
      }

      toast.success(prevAccepted ? 'Answer unaccepted' : 'Answer accepted');
      onAccept?.(prevAccepted ? '' : postId);
    } catch {
      setIsAccepted(prevAccepted);
      toast.error('Failed to update accepted answer');
    } finally {
      setIsSubmitting(false);
    }
  }, [session, isThreadAuthor, isSubmitting, isAccepted, slug, threadId, postId, onAccept]);

  // Not accepted and not thread author — render nothing
  if (!isAccepted && !isThreadAuthor) {
    return null;
  }

  // Accepted answer badge (visible to everyone, non-interactive)
  if (isAccepted && !isThreadAuthor) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-500/10 border border-green-500/20">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4 text-green-400"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-xs font-semibold text-green-400">
          Accepted Answer
        </span>
      </div>
    );
  }

  // Thread author view — clickable toggle
  return (
    <button
      onClick={handleToggleAccept}
      disabled={isSubmitting}
      className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors duration-150 disabled:opacity-50 ${
        isAccepted
          ? 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20'
          : 'bg-slate-800/50 border-slate-700 hover:bg-green-500/10 hover:border-green-500/20'
      }`}
      title={isAccepted ? 'Unmark as accepted answer' : 'Mark as accepted answer'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`w-4 h-4 transition-colors duration-150 ${
          isAccepted
            ? 'text-green-400'
            : 'text-slate-500 group-hover:text-green-400'
        }`}
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span
        className={`text-xs font-semibold transition-colors duration-150 ${
          isAccepted
            ? 'text-green-400'
            : 'text-slate-500 group-hover:text-green-400'
        }`}
      >
        {isAccepted ? 'Accepted Answer' : 'Accept Answer'}
      </span>
    </button>
  );
}
