'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface MobileValuePropProps {
  /** Description of the feature the user is currently viewing */
  feature: string;
  /** CTA button text (defaults to "Create Free Account") */
  ctaText?: string;
}

const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function featureToSlug(feature: string): string {
  return feature
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function isDismissed(slug: string): boolean {
  try {
    const raw = localStorage.getItem(`spacenexus-value-${slug}`);
    if (!raw) return false;
    const dismissedAt = parseInt(raw, 10);
    if (isNaN(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function storeDismiss(slug: string): void {
  try {
    localStorage.setItem(`spacenexus-value-${slug}`, Date.now().toString());
  } catch {
    // localStorage unavailable
  }
}

export default function MobileValueProp({
  feature,
  ctaText = 'Create Free Account',
}: MobileValuePropProps) {
  const [visible, setVisible] = useState(false);
  const slug = featureToSlug(feature);

  useEffect(() => {
    if (!isDismissed(slug)) {
      setVisible(true);
    }
  }, [slug]);

  const handleDismiss = useCallback(() => {
    storeDismiss(slug);
    setVisible(false);
  }, [slug]);

  if (!visible) return null;

  return (
    <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-white/10 rounded-2xl p-5 overflow-hidden my-6">
      {/* Decorative glow */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/8 rounded-full blur-[50px] pointer-events-none" />

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
        aria-label="Dismiss value proposition"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="relative pr-6">
        {/* Sparkle icon */}
        <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center mb-3">
          <svg
            className="w-5 h-5 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
            />
          </svg>
        </div>

        {/* Copy */}
        <p className="text-sm text-slate-200 font-medium leading-snug mb-4">
          Unlock <span className="text-slate-300">{feature}</span> and 30+ more modules
        </p>

        {/* CTA button */}
        <Link
          href="/register"
          className="block w-full text-center py-3 px-4 rounded-xl bg-gradient-to-r bg-white hover:bg-slate-100 text-slate-900 text-sm font-semibold transition-all duration-200 shadow-lg shadow-black/20 active:scale-[0.98]"
          style={{ minHeight: '44px' }}
        >
          {ctaText}
        </Link>

        {/* Trust subtext */}
        <p className="text-xs text-slate-500 text-center mt-2.5">
          Free forever &middot; No credit card required
        </p>
      </div>
    </div>
  );
}
