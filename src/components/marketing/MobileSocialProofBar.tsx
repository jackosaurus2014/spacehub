'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const SCROLL_THRESHOLD = 500;
const SESSION_KEY = 'spacenexus-social-proof-dismissed';

export default function MobileSocialProofBar() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  const checkDismissed = useCallback((): boolean => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (checkDismissed()) return;
    setDismissed(false);

    const handleScroll = () => {
      const scrollY = window.scrollY;
      setVisible(scrollY > SCROLL_THRESHOLD);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [checkDismissed]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  if (dismissed) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[45] md:hidden transition-transform duration-300 ease-out ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
      role="banner"
      aria-label="Social proof"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="bg-slate-900/85 backdrop-blur-md border-b border-slate-700/50">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          {/* Social proof text + CTA */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Avatars cluster */}
            <div className="flex -space-x-1.5 shrink-0" aria-hidden="true">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 border border-slate-900 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
              </div>
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 border border-slate-900 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
              </div>
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border border-slate-900 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
              </div>
            </div>

            <p className="text-xs text-slate-300 truncate">
              Join <span className="text-cyan-400 font-semibold">10,000+</span> space professionals
            </p>

            <Link
              href="/register"
              className="shrink-0 inline-flex items-center gap-0.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Start Free
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
            aria-label="Dismiss social proof bar"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
