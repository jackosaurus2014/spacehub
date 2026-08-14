'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const DISMISS_KEY = 'spacenexus-feedback-tab-dismissed';
const DISMISS_DAYS = 14;

/**
 * Lightweight floating "Feedback" tab, mounted site-wide via the root layout.
 *
 * - Anchored to the right edge, vertically centered — never overlaps the
 *   bottom MobileTabBar, the bottom-left NPS FeedbackWidget, or the
 *   bottom-right HelpButton.
 * - Links to /feedback?page=<current path> so submissions auto-capture where
 *   the user was.
 * - Dismissible (14-day localStorage cooldown), keyboard focusable, and
 *   hidden on the game, admin, and the feedback page itself.
 */
export default function FeedbackTab() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY);
      if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
        setVisible(false);
        return;
      }
    } catch {
      // Storage unavailable — still show the tab
    }
    setVisible(true);
  }, []);

  if (!visible || !pathname) return null;
  if (
    pathname.startsWith('/space-tycoon') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/feedback') ||
    pathname.startsWith('/embed') ||
    pathname.startsWith('/widgets')
  ) {
    return null;
  }

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000));
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[9996] flex flex-col items-end print:hidden">
      <Link
        href={`/feedback?page=${encodeURIComponent(pathname)}`}
        aria-label="Send feedback about this page"
        className="block bg-white/[0.06] hover:bg-purple-500/20 border border-r-0 border-white/[0.1] hover:border-purple-500/30 rounded-l-lg px-1.5 py-3 text-[11px] font-semibold tracking-wider text-slate-300 hover:text-white transition-colors backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        style={{ writingMode: 'vertical-rl' }}
      >
        Feedback
      </Link>
      <button
        onClick={dismiss}
        aria-label="Hide feedback tab"
        className="mt-1 mr-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-white/[0.05] border border-white/[0.08] text-slate-500 hover:text-white text-[10px] leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
