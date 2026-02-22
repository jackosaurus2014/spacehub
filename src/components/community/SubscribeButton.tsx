'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '@/lib/toast';

interface SubscribeButtonProps {
  slug: string;
  threadId: string;
  initialSubscribed: boolean;
}

export default function SubscribeButton({
  slug,
  threadId,
  initialSubscribed,
}: SubscribeButtonProps) {
  const { data: session } = useSession();
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = useCallback(async () => {
    if (!session) {
      toast.error('Sign in to subscribe');
      return;
    }

    if (isSubmitting) return;

    const prevSubscribed = subscribed;
    setSubscribed(!subscribed);
    setIsSubmitting(true);

    try {
      const res = await fetch(
        `/api/community/forums/${slug}/${threadId}/subscribe`,
        {
          method: prevSubscribed ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!res.ok) {
        throw new Error('Subscription update failed');
      }

      toast.success(
        prevSubscribed ? 'Unsubscribed from thread' : 'Subscribed to thread'
      );
    } catch {
      setSubscribed(prevSubscribed);
      toast.error('Failed to update subscription');
    } finally {
      setIsSubmitting(false);
    }
  }, [session, isSubmitting, subscribed, slug, threadId]);

  return (
    <button
      onClick={handleToggle}
      disabled={isSubmitting}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 disabled:opacity-50 ${
        subscribed
          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20'
          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-300'
      }`}
      title={subscribed ? 'Unsubscribe from thread' : 'Subscribe to thread'}
    >
      {subscribed ? (
        /* Filled bell icon */
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path
            fillRule="evenodd"
            d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 004.496 0 25.057 25.057 0 01-4.496 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        /* Outline bell icon */
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      )}
      <span>{subscribed ? 'Subscribed' : 'Subscribe'}</span>
    </button>
  );
}
