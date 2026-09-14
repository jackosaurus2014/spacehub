'use client';

import { useCallback, useEffect, useState } from 'react';
import { isSaved, toggleSaved, READING_LIST_EVENT, type ReadingListInput } from '@/lib/reading-list';
import { trackGA4Event } from '@/lib/analytics';

/**
 * The save affordance that goes on every news and blog card (competitor
 * review Tier 2 #10). Works signed-out — localStorage first, exactly like
 * saved jobs — and mirrors to the account when there is one.
 *
 * Two shapes: 'icon' for the floating corner control on image cards, 'label'
 * for card footers and rows where a word reads better than a glyph.
 */
export default function SaveToReadingListButton({
  item,
  variant = 'icon',
  className = '',
}: {
  item: ReadingListInput;
  variant?: 'icon' | 'label';
  className?: string;
}) {
  const [saved, setSaved] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const sync = () => setSaved(isSaved(item.url));
    sync();
    window.addEventListener(READING_LIST_EVENT, sync);
    return () => window.removeEventListener(READING_LIST_EVENT, sync);
  }, [item.url]);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      // Cards wrap the whole surface in a link; never navigate on save.
      e.preventDefault();
      e.stopPropagation();
      const now = toggleSaved(item);
      setSaved(now);
      if (now) {
        setFlash(true);
        setTimeout(() => setFlash(false), 1500);
      }
      trackGA4Event(now ? 'reading_list_save' : 'reading_list_unsave', {
        item_url: item.url,
        item_source: item.source ?? '',
      });
    },
    [item],
  );

  const label = saved ? 'Saved to reading list' : 'Save to reading list';

  if (variant === 'label') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        aria-label={label}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs min-h-[36px] transition-colors ${
          saved
            ? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
            : 'border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
        } ${className}`}
      >
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill={saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" />
        </svg>
        {saved ? 'Saved' : 'Save'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      className={`relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-all ${
        saved ? 'text-amber-300' : 'text-slate-400 hover:text-white'
      } ${className}`}
    >
      <svg
        className="w-5 h-5"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
      {flash && (
        <span
          role="status"
          className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-white bg-slate-900/95 border border-white/15 px-2 py-1 rounded shadow-lg whitespace-nowrap"
        >
          Saved
        </span>
      )}
    </button>
  );
}
