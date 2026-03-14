'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const BANNER_VERSION = 'v2026-03-14';
const STORAGE_KEY = `spacenexus-whats-new-dismissed-${BANNER_VERSION}`;

export default function WhatsNewBanner() {
  const [dismissed, setDismissed] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const wasDismissed = localStorage.getItem(STORAGE_KEY);
      setDismissed(wasDismissed === 'true');
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // localStorage unavailable
    }
  };

  if (!mounted || dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 border border-blue-500/20 mb-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(59,130,246,0.08),transparent_60%)]" />
      <div className="relative flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
            New
          </span>
          <p className="text-sm text-slate-300 truncate">
            <span className="hidden sm:inline">Podcast aggregation, SpaceX API data, Artemis II countdown, and 3 new analysis articles. </span>
            <span className="sm:hidden">New features and content available. </span>
            <Link
              href="/changelog"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors whitespace-nowrap"
            >
              See what&apos;s new &rarr;
            </Link>
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Dismiss banner"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
