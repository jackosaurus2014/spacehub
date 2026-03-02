'use client';

import { useState, useEffect } from 'react';

interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  timestamp: number;
}

export default function BookmarkButton({ itemId, itemTitle, itemUrl, className = '' }: {
  itemId: string;
  itemTitle: string;
  itemUrl: string;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('spacenexus-bookmarks');
      if (raw) {
        const items: BookmarkItem[] = JSON.parse(raw);
        setSaved(items.some(b => b.id === itemId));
      }
    } catch {}
  }, [itemId]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      const raw = localStorage.getItem('spacenexus-bookmarks');
      let items: BookmarkItem[] = raw ? JSON.parse(raw) : [];

      if (saved) {
        items = items.filter(b => b.id !== itemId);
        setSaved(false);
      } else {
        items = [{ id: itemId, title: itemTitle, url: itemUrl, timestamp: Date.now() }, ...items].slice(0, 50);
        setSaved(true);
        setFlash(true);
        setTimeout(() => setFlash(false), 1500);
      }
      localStorage.setItem('spacenexus-bookmarks', JSON.stringify(items));
    } catch {}
  };

  return (
    <button
      onClick={toggle}
      className={`relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-all ${saved ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-300'} ${className}`}
      aria-label={saved ? 'Remove from reading list' : 'Save to reading list'}
    >
      <svg className="w-5 h-5" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
      {flash && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-cyan-400 bg-slate-800 px-2 py-1 rounded shadow-lg whitespace-nowrap animate-fade-in-up">
          Saved!
        </span>
      )}
    </button>
  );
}
