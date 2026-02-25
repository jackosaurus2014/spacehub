'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '@/lib/toast';

interface BookmarkButtonProps {
  title: string;
  url: string;
  source?: string;
  category?: string;
  className?: string;
}

export default function BookmarkButton({
  title,
  url,
  source,
  category,
  className = '',
}: BookmarkButtonProps) {
  const { data: session } = useSession();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if this article is already saved on mount
  useEffect(() => {
    if (!session?.user?.id) return;

    const checkSaved = async () => {
      try {
        const res = await fetch('/api/reading-list');
        if (res.ok) {
          const data = await res.json();
          const isSaved = data.items?.some(
            (item: any) => item.url === url
          );
          if (isSaved) setSaved(true);
        }
      } catch {
        // Silently fail — just show un-bookmarked state
      }
    };

    checkSaved();
  }, [session?.user?.id, url]);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!session?.user?.id) {
      toast.info('Sign in to save articles to your reading list');
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      if (saved) {
        // Need to find the item ID first, then remove
        const listRes = await fetch('/api/reading-list');
        if (listRes.ok) {
          const listData = await listRes.json();
          const item = listData.items?.find(
            (i: any) => i.url === url
          );
          if (item) {
            const res = await fetch('/api/reading-list', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: item.id }),
            });
            if (res.ok) {
              setSaved(false);
              toast.success('Removed from reading list');
            }
          }
        }
      } else {
        const res = await fetch('/api/reading-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, url, source, category }),
        });
        if (res.ok) {
          setSaved(true);
          toast.success('Saved to reading list');
        } else {
          toast.error('Failed to save article');
        }
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`p-1.5 rounded-lg transition-all duration-200 group/bookmark ${
        saved
          ? 'text-cyan-400 hover:text-cyan-300'
          : 'text-slate-400 hover:text-cyan-400'
      } ${loading ? 'opacity-50 cursor-wait' : 'hover:bg-white/10'} ${className}`}
      aria-label={saved ? 'Remove from reading list' : 'Save to reading list'}
      title={saved ? 'Remove from reading list' : 'Save to reading list'}
    >
      {loading ? (
        <svg
          className="w-4 h-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <svg
          className="w-4 h-4"
          fill={saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={saved ? 0 : 2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      )}
    </button>
  );
}
