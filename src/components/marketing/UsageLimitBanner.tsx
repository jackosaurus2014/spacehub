'use client';

import { useState } from 'react';
import { useSubscription } from '@/components/SubscriptionProvider';
import Link from 'next/link';

/**
 * Shows a banner when free-tier users are approaching their daily article limit.
 * Dismissible — but reappears when down to the last article.
 * Hidden for Pro/Enterprise users.
 */
export default function UsageLimitBanner() {
  const { tier, remainingArticles } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  // Only show for free tier
  if (tier !== 'free') return null;

  const maxDaily = 25;
  const used = maxDaily - (remainingArticles ?? maxDaily);
  const pctUsed = (used / maxDaily) * 100;
  const remaining = remainingArticles ?? maxDaily;

  // Don't show until 60% usage (15+ articles viewed)
  if (pctUsed < 60) return null;

  const isAlmostOut = pctUsed >= 80;
  const isOut = remaining <= 0;
  const isLastArticle = remaining === 1;

  // If dismissed, only reappear on last article or when fully out
  if (dismissed && !isLastArticle && !isOut) return null;

  return (
    <div className={`fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 rounded-xl border p-4 shadow-2xl shadow-black/50 backdrop-blur-sm transition-all duration-300 ${
      isOut
        ? 'border-red-500/30 bg-red-950/90'
        : isAlmostOut
          ? 'border-amber-500/30 bg-amber-950/90'
          : 'border-cyan-500/20 bg-slate-950/90'
    }`}>
      {/* Close button — hidden when fully out (must see upgrade CTA) */}
      {!isOut && (
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Usage bar */}
      <div className="flex items-center justify-between mb-2 pr-6">
        <span className="text-white text-xs font-medium">
          {isOut ? 'Daily limit reached' : `${used}/${maxDaily} free articles today`}
        </span>
        <span className={`text-xs font-mono ${isOut ? 'text-red-400' : isAlmostOut ? 'text-amber-400' : 'text-cyan-400'}`}>
          {remaining} left
        </span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isOut ? 'bg-red-500' : isAlmostOut ? 'bg-amber-500' : 'bg-cyan-500'
          }`}
          style={{ width: `${Math.min(100, pctUsed)}%` }}
        />
      </div>

      {isOut ? (
        <div>
          <p className="text-slate-300 text-xs mb-3">
            Upgrade to Pro for <strong className="text-white">unlimited articles</strong>, deal flow, executive tracking, alerts, and more.
          </p>
          <Link
            href="/pricing?utm_source=usage_limit&utm_medium=banner"
            className="block w-full py-2 text-center text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded-lg transition-all"
          >
            Upgrade to Pro — $19.99/mo
          </Link>
        </div>
      ) : (
        <p className="text-slate-400 text-xs">
          {isLastArticle ? 'Last free article! ' : isAlmostOut ? 'Running low! ' : ''}
          <Link href="/pricing?utm_source=usage_limit&utm_medium=banner" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
            Upgrade to Pro
          </Link>
          {' '}for unlimited articles + premium features.
        </p>
      )}
    </div>
  );
}
