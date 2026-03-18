'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Floating "Get Started" CTA — appears after 50% scroll depth        */
/*  Dismissible, only shows once per session (sessionStorage)           */
/*  Only renders on the homepage for non-authenticated visitors         */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'spacenexus-floating-cta-dismissed';

export default function FloatingCTA() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true); // start hidden

  // On mount, check sessionStorage for dismiss state
  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      // sessionStorage unavailable (e.g. private browsing edge cases)
    }
    setDismissed(false);
  }, []);

  // Track scroll depth
  useEffect(() => {
    if (dismissed) return;

    function onScroll() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = scrollTop / docHeight;
      if (pct >= 0.5) {
        setVisible(true);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [dismissed]);

  function handleDismiss() {
    setVisible(false);
    setDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  }

  if (dismissed || !visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="pointer-events-auto bg-black/80 backdrop-blur-md border-t border-white/[0.08]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-3 gap-4">
            <p className="text-sm text-slate-300">
              Ready to try SpaceNexus?
            </p>

            <div className="flex items-center gap-3">
              <Link
                href="/register?utm_source=website&utm_medium=floating_cta&utm_campaign=homepage"
                className="inline-flex items-center gap-1.5 bg-white text-slate-900 font-medium text-xs sm:text-sm py-2 px-5 rounded-lg transition-all duration-200 ease-smooth hover:bg-slate-100 active:scale-[0.98] whitespace-nowrap"
              >
                Start free
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>

              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors duration-150"
                aria-label="Dismiss banner"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
