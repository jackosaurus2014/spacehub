'use client';

import { useSubscription } from '@/components/SubscriptionProvider';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';

type UrgencyLevel = 'info' | 'warning' | 'urgent' | 'critical';

function getUrgencyLevel(daysRemaining: number): UrgencyLevel {
  if (daysRemaining <= 0) return 'critical';
  if (daysRemaining <= 3) return 'urgent';
  if (daysRemaining <= 7) return 'warning';
  return 'info';
}

function getDaysRemaining(trialEndsAt: Date): number {
  const now = new Date();
  const diff = trialEndsAt.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const URGENCY_STYLES: Record<UrgencyLevel, { banner: string; button: string; icon: string }> = {
  info: {
    banner: 'bg-gradient-to-r from-white/5 to-white/10 border-white/10',
    button: 'bg-white hover:bg-slate-100 text-white',
    icon: 'text-slate-300',
  },
  warning: {
    banner: 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 border-amber-500/30',
    button: 'bg-amber-600 hover:bg-amber-500 text-white',
    icon: 'text-amber-400',
  },
  urgent: {
    banner: 'bg-gradient-to-r from-red-500/15 to-rose-500/15 border-red-500/30',
    button: 'bg-red-600 hover:bg-red-500 text-white',
    icon: 'text-red-400',
  },
  critical: {
    banner: 'bg-gradient-to-r from-red-600/20 to-rose-600/20 border-red-500/40',
    button: 'bg-red-600 hover:bg-red-500 text-white',
    icon: 'text-red-400',
  },
};

const DISMISSAL_KEY = 'spacenexus_trial_banner_dismissed_level';

export default function TrialCountdownBanner() {
  const { isTrialing, trialEndsAt, tier } = useSubscription();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const daysRemaining = useMemo(() => {
    if (!trialEndsAt) return null;
    return getDaysRemaining(trialEndsAt);
  }, [trialEndsAt]);

  const urgency = useMemo(() => {
    if (daysRemaining === null) return 'info' as UrgencyLevel;
    return getUrgencyLevel(daysRemaining);
  }, [daysRemaining]);

  // Check localStorage for dismissal on mount
  useEffect(() => {
    setMounted(true);
    try {
      const dismissedLevel = localStorage.getItem(DISMISSAL_KEY);
      // If urgency level changed since dismissal, show banner again
      if (dismissedLevel && dismissedLevel === urgency) {
        setDismissed(true);
      } else if (dismissedLevel && dismissedLevel !== urgency) {
        // Urgency changed, clear dismissal and show again
        localStorage.removeItem(DISMISSAL_KEY);
        setDismissed(false);
      }
    } catch {
      // localStorage not available
    }
  }, [urgency]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSAL_KEY, urgency);
    } catch {
      // localStorage not available
    }
  };

  // Don't render on server or if not trialing
  if (!mounted) return null;
  if (!isTrialing || !trialEndsAt) return null;
  if (dismissed) return null;

  const styles = URGENCY_STYLES[urgency];
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

  const getMessage = (): string => {
    if (daysRemaining === null) return '';
    if (daysRemaining <= 0) return 'Your trial has expired';
    if (daysRemaining <= 3)
      return `Your trial expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}! Don\u2019t lose access`;
    if (daysRemaining <= 7)
      return `Only ${daysRemaining} days left! Subscribe to keep your features`;
    return `You have ${daysRemaining} days left in your ${tierLabel} trial`;
  };

  return (
    <div
      className={`w-full border-b ${styles.banner} px-4 py-3`}
      role="alert"
      aria-live="polite"
    >
      <div className="container mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {/* Clock / warning icon */}
          <div className={`shrink-0 ${styles.icon}`}>
            {urgency === 'info' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-white">
              {getMessage()}
            </p>
            {(urgency === 'urgent' || urgency === 'critical') && (
              <p className="text-xs text-slate-400 mt-0.5">
                You&apos;ll lose access to deal flow, executive moves, and unlimited articles
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/pricing"
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${styles.button}`}
          >
            Subscribe Now
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            aria-label="Dismiss trial banner"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
