'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { trackGA4Event } from '@/lib/analytics';

const STORAGE_KEY = 'spacenexus-onboarding';
const DISMISSED_KEY = 'spacenexus-onboarding-dismissed';

interface ChecklistItem {
  id: string;
  label: string;
  href: string;
  alwaysChecked?: boolean;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'create-account', label: 'Create your account', href: '/dashboard', alwaysChecked: true },
  { id: 'explore-profiles', label: 'Explore company profiles', href: '/company-profiles' },
  { id: 'track-satellite', label: 'Track a satellite', href: '/satellites' },
  { id: 'read-brief', label: 'Read an intelligence brief', href: '/intelligence-brief' },
  { id: 'setup-alert', label: 'Set up a watchlist alert', href: '/alerts' },
];

function loadCompleted(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return ['create-account'];
}

function saveCompleted(completed: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
  } catch {
    // ignore
  }
}

function loadDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, 'true');
  } catch {
    // ignore
  }
}

export default function OnboardingChecklist() {
  const [completed, setCompleted] = useState<string[]>(['create-account']);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCompleted(loadCompleted());
    setDismissed(loadDismissed());
  }, []);

  const toggleItem = useCallback((id: string) => {
    setCompleted((prev) => {
      const wasCompleted = prev.includes(id);
      const next = wasCompleted
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      saveCompleted(next);

      // Track step completion (only when checking, not unchecking)
      if (!wasCompleted) {
        const step = CHECKLIST_ITEMS.find((item) => item.id === id);
        trackGA4Event('onboarding_step', { step: step?.label || id, step_id: id, completed: true });
      }

      return next;
    });
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    saveDismissed();
  }, []);

  // Don't render until mounted (avoids hydration mismatch with localStorage)
  if (!mounted) return null;

  // Don't render if dismissed
  if (dismissed) return null;

  const completedCount = CHECKLIST_ITEMS.filter(
    (item) => item.alwaysChecked || completed.includes(item.id)
  ).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const allDone = completedCount === totalCount;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="relative card p-5 mb-8 border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.02]">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/[0.06]"
        aria-label="Dismiss onboarding checklist"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {allDone ? (
        /* Congratulations state */
        <div className="text-center py-4">
          <div className="text-4xl mb-3">&#127881;</div>
          <h3 className="text-lg font-bold text-white mb-1">
            You&apos;re all set!
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            You&apos;ve completed all onboarding steps. Welcome to SpaceNexus!
          </p>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.06] text-sm text-slate-300 hover:text-white hover:border-white/10 transition-all"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-4 pr-6">
            <h3 className="text-base font-bold text-white mb-1">
              Get Started with SpaceNexus
            </h3>
            <p className="text-xs text-slate-400">
              Complete these steps to get the most out of the platform
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>{completedCount} of {totalCount} completed</span>
              <span>{progressPercent}%</span>
            </div>
            <div
              className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden"
              role="progressbar"
              aria-valuenow={completedCount}
              aria-valuemin={0}
              aria-valuemax={totalCount}
              aria-label={`Onboarding progress: ${completedCount} of ${totalCount} steps completed`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Checklist items */}
          <ul className="space-y-2">
            {CHECKLIST_ITEMS.map((item) => {
              const isChecked = item.alwaysChecked || completed.includes(item.id);
              return (
                <li key={item.id} className="flex items-center gap-3 group">
                  <button
                    role="checkbox"
                    aria-checked={isChecked}
                    onClick={() => !item.alwaysChecked && toggleItem(item.id)}
                    disabled={item.alwaysChecked}
                    className={`flex-shrink-0 w-5 h-5 rounded border transition-all flex items-center justify-center ${
                      isChecked
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-white/20 hover:border-white/40 bg-transparent'
                    } ${item.alwaysChecked ? 'cursor-default' : 'cursor-pointer'}`}
                    aria-label={item.label}
                  >
                    {isChecked && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <Link
                    href={item.href}
                    className={`text-sm transition-colors flex-1 ${
                      isChecked
                        ? 'text-slate-500 line-through'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                  {!isChecked && (
                    <Link
                      href={item.href}
                      className="text-xs text-slate-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Go &rarr;
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
