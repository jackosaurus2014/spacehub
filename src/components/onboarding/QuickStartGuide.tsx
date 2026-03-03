'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'spacenexus-onboarding';
const DISMISSED_KEY = 'spacenexus-onboarding-dismissed';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

const STEPS: OnboardingStep[] = [
  {
    id: 'company-profiles',
    title: 'Explore Company Profiles',
    description: '200+ space companies with SpaceNexus Scores',
    href: '/company-profiles',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
  {
    id: 'satellite-tracker',
    title: 'Track Live Satellites',
    description: 'Real-time satellite positions on a world map',
    href: '/satellite-tracker',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
  {
    id: 'market-intel',
    title: 'Browse Market Intelligence',
    description: 'Industry trends, stock data, market analysis',
    href: '/market-intel',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    id: 'mission-control',
    title: 'Check Mission Control',
    description: 'Upcoming launches and space events',
    href: '/mission-control',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
  },
  {
    id: 'dashboard',
    title: 'Set Up Your Dashboard',
    description: 'Customize your personal dashboard layout',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    ),
  },
];

function loadCompleted(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function loadDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function QuickStartGuide() {
  const [completed, setCompleted] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(true);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedCompleted = loadCompleted();
    const savedDismissed = loadDismissed();
    setCompleted(savedCompleted);
    setDismissed(savedDismissed);
    setMounted(true);

    // Show after a short delay for entrance animation
    if (!savedDismissed && savedCompleted.length < STEPS.length) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const toggleStep = useCallback((stepId: string) => {
    setCompleted((prev) => {
      const next = prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      // Auto-hide when all complete
      if (next.length >= STEPS.length) {
        setTimeout(() => setVisible(false), 600);
      }
      return next;
    });
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  const handleDontShowAgain = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, 'true');
    } catch { /* ignore */ }
    setDismissed(true);
    setVisible(false);
  }, []);

  if (!mounted || dismissed || completed.length >= STEPS.length) return null;

  const completedCount = completed.length;

  return (
    <div
      className={`fixed z-50 transition-all duration-500 ease-out
        bottom-20 right-4 sm:bottom-auto sm:top-20 sm:right-4
        w-[min(calc(100vw-2rem),24rem)] sm:w-80 max-h-[70vh] overflow-y-auto
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Quick Start</h3>
              <p className="text-xs text-slate-400">{completedCount}/{STEPS.length} completed</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
            aria-label="Dismiss quick start guide"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
            style={{ width: `${(completedCount / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Steps */}
        <div className="p-3 space-y-1.5 max-h-[340px] overflow-y-auto">
          {STEPS.map((step) => {
            const isCompleted = completed.includes(step.id);
            return (
              <div
                key={step.id}
                className={`group flex items-start gap-3 p-2.5 rounded-xl transition-colors ${
                  isCompleted ? 'bg-slate-800/30' : 'bg-slate-800/60 hover:bg-slate-800'
                }`}
              >
                <button
                  onClick={() => toggleStep(step.id)}
                  className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                    isCompleted
                      ? 'bg-cyan-500 border-cyan-500'
                      : 'border-slate-600 hover:border-cyan-400'
                  }`}
                  aria-label={`Mark "${step.title}" as ${isCompleted ? 'incomplete' : 'complete'}`}
                >
                  {isCompleted && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <Link
                    href={step.href}
                    className={`text-sm font-medium transition-colors block ${
                      isCompleted
                        ? 'text-slate-500 line-through'
                        : 'text-white hover:text-cyan-400'
                    }`}
                  >
                    {step.title}
                  </Link>
                  <p className={`text-xs mt-0.5 ${isCompleted ? 'text-slate-600' : 'text-slate-400'}`}>
                    {step.description}
                  </p>
                </div>
                <span className={`flex-shrink-0 ${isCompleted ? 'text-slate-600' : 'text-slate-500'}`}>
                  {step.icon}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-700/60 flex items-center justify-between">
          <button
            onClick={handleDontShowAgain}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Don&apos;t show again
          </button>
          <button
            onClick={handleDismiss}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
