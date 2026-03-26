'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

const COOLDOWN_KEY = 'spacenexus-feedback-cooldown';
const PAGE_COUNT_KEY = 'spacenexus-feedback-pagecount';
const COOLDOWN_DAYS = 30;
const MIN_PAGE_VIEWS = 5;

/**
 * Lightweight in-app feedback widget.
 *
 * - Appears after the user visits 5+ pages in a session
 * - Asks NPS (0-10) then a free-text follow-up
 * - Stores results via POST /api/feedback
 * - 30-day cooldown (localStorage) — also set on dismiss
 * - Positioned bottom-left to avoid collision with chat/help at bottom-right
 */
export default function FeedbackWidget() {
  const pathname = usePathname();
  const [step, setStep] = useState<'hidden' | 'nps' | 'comment' | 'thanks'>('hidden');
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Track page views in sessionStorage; check cooldown in localStorage
  useEffect(() => {
    if (!pathname) return;

    // Skip game page
    if (pathname.startsWith('/space-tycoon')) return;

    // Check 30-day cooldown
    try {
      const cooldownUntil = localStorage.getItem(COOLDOWN_KEY);
      if (cooldownUntil && Date.now() < parseInt(cooldownUntil, 10)) return;
    } catch {
      // Storage unavailable — don't show
      return;
    }

    // Increment session page count
    try {
      const current = parseInt(sessionStorage.getItem(PAGE_COUNT_KEY) || '0', 10);
      const next = current + 1;
      sessionStorage.setItem(PAGE_COUNT_KEY, String(next));

      if (next >= MIN_PAGE_VIEWS && step === 'hidden') {
        // Small delay so it doesn't flash on initial render
        const timer = setTimeout(() => setStep('nps'), 1500);
        return () => clearTimeout(timer);
      }
    } catch {
      // sessionStorage unavailable
    }
  }, [pathname, step]);

  const setCooldown = useCallback(() => {
    try {
      const expiresAt = Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(COOLDOWN_KEY, String(expiresAt));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const dismiss = useCallback(() => {
    setStep('hidden');
    setCooldown();
  }, [setCooldown]);

  const handleScoreSelect = useCallback((n: number) => {
    setScore(n);
    setStep('comment');
  }, []);

  const submitFeedback = useCallback(async (includeComment: boolean) => {
    if (score === null) return;
    setSubmitting(true);

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score,
          comment: includeComment && comment.trim() ? comment.trim() : undefined,
          pageUrl: pathname || undefined,
        }),
      });
    } catch {
      // Silent fail — don't disrupt the user
    }

    setCooldown();
    setSubmitting(false);
    setStep('thanks');

    // Auto-dismiss after 2.5s
    setTimeout(() => setStep('hidden'), 2500);
  }, [score, comment, pathname, setCooldown]);

  const handleSubmit = useCallback(() => {
    submitFeedback(true);
  }, [submitFeedback]);

  const handleSkipComment = useCallback(() => {
    submitFeedback(false);
  }, [submitFeedback]);

  if (step === 'hidden') return null;

  return (
    <div
      className="fixed bottom-4 left-4 z-[9997] w-[280px] animate-in slide-in-from-bottom-4 duration-300"
      role="dialog"
      aria-label="Feedback"
    >
      <div className="bg-black border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden">
        {/* --- Thank you step --- */}
        {step === 'thanks' && (
          <div className="p-5 text-center">
            <div className="text-lg mb-1">Thanks for your feedback!</div>
            <p className="text-slate-400 text-sm">It helps us build a better SpaceNexus.</p>
          </div>
        )}

        {/* --- NPS score step --- */}
        {step === 'nps' && (
          <>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Quick feedback
              </span>
              <button
                onClick={dismiss}
                className="text-slate-500 hover:text-white/70 transition-colors p-0.5"
                aria-label="Dismiss feedback"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-4 pt-3 pb-4">
              <p className="text-sm text-white/80 mb-3">
                How likely are you to recommend SpaceNexus? (0-10)
              </p>
              <div className="flex gap-[3px] mb-1">
                {Array.from({ length: 11 }, (_, n) => (
                  <button
                    key={n}
                    onClick={() => handleScoreSelect(n)}
                    aria-label={`Score ${n}`}
                    className={`flex-1 h-7 rounded text-[11px] font-bold transition-all hover:scale-110 ${
                      n <= 6
                        ? 'bg-red-500/70 hover:bg-red-500 text-white'
                        : n <= 8
                          ? 'bg-amber-500/70 hover:bg-amber-500 text-white'
                          : 'bg-emerald-500/70 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Not likely</span>
                <span>Very likely</span>
              </div>
            </div>
          </>
        )}

        {/* --- Comment step --- */}
        {step === 'comment' && (
          <>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                One more thing
              </span>
              <button
                onClick={dismiss}
                className="text-slate-500 hover:text-white/70 transition-colors p-0.5"
                aria-label="Dismiss feedback"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-4 pt-3 pb-4">
              <p className="text-sm text-white/80 mb-2">
                What&apos;s the #1 thing we could improve?
              </p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Your thoughts..."
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-white/20 transition-colors"
                rows={3}
                maxLength={2000}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSkipComment}
                  disabled={submitting}
                  className="flex-1 text-sm text-slate-400 hover:text-white/70 py-1.5 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-white hover:bg-slate-100 text-slate-900 text-sm font-medium py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Submit'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
