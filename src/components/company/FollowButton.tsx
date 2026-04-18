'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from '@/lib/toast';
import { clientLogger } from '@/lib/client-logger';

interface FollowButtonProps {
  companyId: string;
  initiallyFollowed: boolean;
  followerCount: number;
}

export default function FollowButton({
  companyId,
  initiallyFollowed,
  followerCount,
}: FollowButtonProps) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [following, setFollowing] = useState(initiallyFollowed);
  const [count, setCount] = useState(followerCount);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (status !== 'authenticated') {
      toast.error('Please sign in to follow companies.');
      router.push(`/login?returnTo=${encodeURIComponent(pathname || '/')}`);
      return;
    }

    if (loading) return;

    // Optimistic toggle
    const nextFollowing = !following;
    const prevFollowing = following;
    const prevCount = count;
    setFollowing(nextFollowing);
    setCount(c => c + (nextFollowing ? 1 : -1));
    setLoading(true);

    try {
      const res = await fetch(`/api/companies/${companyId}/follow`, {
        method: nextFollowing ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const data = await res.json().catch(() => null);
      if (data && typeof data.count === 'number') {
        setCount(data.count);
      }
      if (data && typeof data.userFollowing === 'boolean') {
        setFollowing(data.userFollowing);
      }
    } catch (err) {
      // Revert
      setFollowing(prevFollowing);
      setCount(prevCount);
      clientLogger.error('Follow toggle failed', {
        error: err instanceof Error ? err.message : String(err),
        companyId,
      });
      toast.error(
        nextFollowing
          ? 'Could not follow this company. Please try again.'
          : 'Could not unfollow this company. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const baseClasses =
    'text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 disabled:opacity-60';
  const activeClasses = following
    ? 'bg-white text-slate-900 hover:bg-slate-100'
    : 'bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/[0.12]';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-pressed={following}
      aria-label={following ? 'Unfollow company' : 'Follow company'}
      className={`${baseClasses} ${activeClasses}`}
    >
      <svg
        className="w-3.5 h-3.5"
        fill={following ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
      <span>{following ? 'Following' : 'Follow'}</span>
      <span
        className={`text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded ${
          following ? 'bg-slate-900/10 text-slate-900' : 'bg-white/[0.08] text-slate-300'
        }`}
      >
        {count.toLocaleString()}
      </span>
    </button>
  );
}
