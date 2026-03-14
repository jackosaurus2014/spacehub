'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const ANNOUNCEMENT = {
  id: 'mar-2026-redesign', // bump this to show new announcements
  text: 'New: Mobile-first redesign with 236+ pages, AI marketplace copilot, and 101 company profiles',
  cta: 'See what\u2019s new',
  href: '/features',
  emoji: '\u2728',
};

export default function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(true); // hidden by default until hydrated

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dismissed-announcement');
      setDismissed(stored === ANNOUNCEMENT.id);
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('dismissed-announcement', ANNOUNCEMENT.id);
    } catch { /* noop */ }
  };

  if (dismissed) return null;

  return (
    <div className="relative z-50 bg-white/[0.04] border-b border-white/[0.06]">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-3 py-2.5 text-sm">
          <span className="hidden sm:inline" aria-hidden="true">{ANNOUNCEMENT.emoji}</span>
          <p className="text-white/95 font-medium text-center">
            {ANNOUNCEMENT.text}
          </p>
          <Link
            href={ANNOUNCEMENT.href}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors whitespace-nowrap"
          >
            {ANNOUNCEMENT.cta}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <button
            onClick={dismiss}
            className="ml-2 text-white/60 hover:text-white transition-colors p-0.5"
            aria-label="Dismiss announcement"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
