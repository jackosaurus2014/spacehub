'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

const HIDDEN_PATHS = ['/register', '/login', '/pricing', '/book-demo'];

export default function TrialBanner() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(true); // hidden until hydrated

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('trial-banner-dismissed');
      setDismissed(stored === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('trial-banner-dismissed', '1');
    } catch { /* noop */ }
  };

  // Don't show for authenticated users, on excluded pages, or while loading
  if (status === 'loading' || session?.user || dismissed) return null;
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  return (
    <div className="relative z-50 bg-gradient-to-r from-indigo-600/90 to-blue-600/90 border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-3 py-2 text-sm">
          <p className="text-white/95 font-medium text-center text-xs sm:text-sm">
            Try SpaceNexus Professional free for 14 days &mdash; no credit card required
          </p>
          <Link
            href="/register?trial=true&utm_source=website&utm_medium=trial_banner&utm_campaign=trial"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-indigo-700 text-xs font-semibold hover:bg-white/90 transition-colors whitespace-nowrap"
          >
            Start Free Trial
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <button
            onClick={dismiss}
            className="ml-1 text-white/60 hover:text-white transition-colors p-0.5 shrink-0"
            aria-label="Dismiss trial banner"
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
