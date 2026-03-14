'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSubscription } from '@/components/SubscriptionProvider';

interface UpgradeCTAProps {
  variant: 'inline' | 'card' | 'floating';
  feature?: string;
  module?: string;
}

const PRO_FEATURES = [
  'Advanced analytics & custom dashboards',
  'Real-time alerts & notifications',
  'Export tools & API access',
];

function InlineCTA({ feature, module }: { feature?: string; module?: string }) {
  const featureText = feature || 'advanced analytics';
  const moduleText = module ? ` in ${module}` : '';

  return (
    <div className="relative border-l-2 border-transparent bg-white/[0.04] rounded-r-lg px-4 py-3 my-4" style={{ borderImage: 'linear-gradient(to bottom, #06b6d4, #3b82f6) 1' }}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-white/70">
          <span className="text-white/70 font-medium">Unlock {featureText}</span>
          {moduleText} with Pro
        </p>
        <Link
          href="/pricing"
          className="text-xs font-semibold text-white/70 hover:text-white transition-colors flex items-center gap-1 shrink-0"
        >
          Upgrade
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

function CardCTA({ feature, module }: { feature?: string; module?: string }) {
  const featureText = feature || 'pro features';
  const moduleText = module ? `for ${module}` : '';

  return (
    <div className="relative bg-gradient-to-br from-white/[0.06] to-black border border-white/10 rounded-2xl p-6 overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-[60px] pointer-events-none" />

      <div className="relative">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        </div>

        <h3 className="text-lg font-semibold text-white mb-1">
          Unlock {featureText}
        </h3>
        {moduleText && (
          <p className="text-sm text-slate-400 mb-4">{moduleText}</p>
        )}
        {!moduleText && <div className="mb-4" />}

        {/* Feature list */}
        <ul className="space-y-2.5 mb-6">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-white/70">
              <svg className="w-4 h-4 text-white/70 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {f}
            </li>
          ))}
        </ul>

        <Link
          href="/pricing"
          className="block w-full text-center py-2.5 px-4 rounded-xl bg-gradient-to-r bg-white hover:bg-slate-100 text-slate-900 text-sm font-semibold transition-all duration-200 shadow-lg shadow-black/20"
        >
          Start 14-Day Trial
        </Link>
      </div>
    </div>
  );
}

function FloatingCTA({ feature }: { feature?: string }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Check if already dismissed
    try {
      const dismissedAt = localStorage.getItem('upgrade-cta-dismissed');
      if (dismissedAt) {
        // If dismissed within last 7 days, don't show
        const dismissedTime = parseInt(dismissedAt, 10);
        if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
          return;
        }
      }
    } catch {
      // localStorage unavailable
    }

    setDismissed(false);

    // Show after 30 seconds on page
    const timer = setTimeout(() => {
      setVisible(true);
    }, 30000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    try {
      localStorage.setItem('upgrade-cta-dismissed', String(Date.now()));
    } catch {
      // localStorage unavailable
    }
  };

  if (dismissed || !visible) return null;

  const featureText = feature || 'pro features';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300 max-w-xs">
      <div className="relative bg-black border border-white/[0.08] rounded-2xl p-4 shadow-2xl shadow-black/40">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-lg text-slate-500 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          aria-label="Dismiss upgrade notification"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-start gap-3 pr-6">
          {/* Sparkle icon */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white/5 to-white/10 border border-white/10 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white mb-1">
              Unlock {featureText}
            </p>
            <p className="text-xs text-slate-400 mb-3">
              Try Pro free for 14 days. No credit card required.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1 text-xs font-semibold text-white/70 hover:text-white transition-colors"
            >
              See plans
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UpgradeCTA({ variant, feature, module }: UpgradeCTAProps) {
  const { data: session } = useSession();
  const { tier, isLoading } = useSubscription();

  // Don't show to Pro or Enterprise users
  if (!isLoading && session && (tier === 'pro' || tier === 'enterprise')) {
    return null;
  }

  switch (variant) {
    case 'inline':
      return <InlineCTA feature={feature} module={module} />;
    case 'card':
      return <CardCTA feature={feature} module={module} />;
    case 'floating':
      return <FloatingCTA feature={feature} />;
    default:
      return null;
  }
}
