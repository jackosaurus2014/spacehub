'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const STORAGE_KEY = 'spacenexus-nps-last-shown';
const NPS_INTERVAL_DAYS = 90; // Show quarterly after initial
const INITIAL_DELAY_DAYS = 14; // First show after 14 days

export default function NpsSurvey() {
  const { data: session } = useSession();
  const [isVisible, setIsVisible] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!session?.user) return;

    const lastShown = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();

    if (lastShown) {
      const daysSinceLastShown = (now - parseInt(lastShown, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceLastShown < NPS_INTERVAL_DAYS) return;
    } else {
      // Check if user has been registered for at least INITIAL_DELAY_DAYS
      // We use session creation as a proxy since we don't have createdAt on client
      // The survey will appear on first visit after 14 days
      const registeredKey = `spacenexus-registered-at`;
      const registeredAt = localStorage.getItem(registeredKey);
      if (!registeredAt) {
        localStorage.setItem(registeredKey, now.toString());
        return;
      }
      const daysSinceRegistered = (now - parseInt(registeredAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceRegistered < INITIAL_DELAY_DAYS) return;
    }

    // Show after a 5-second delay so it doesn't interrupt page load
    const timer = setTimeout(() => setIsVisible(true), 5000);
    return () => clearTimeout(timer);
  }, [session]);

  async function handleSubmit() {
    if (score === null) return;

    try {
      await fetch('/api/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, feedback: feedback.trim() || undefined }),
      });
    } catch {
      // Silently fail — don't interrupt user experience
    }

    setSubmitted(true);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());

    setTimeout(() => setIsVisible(false), 2000);
  }

  function handleDismiss() {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  }

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9998] w-full max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden">
        {submitted ? (
          <div className="p-6 text-center">
            <p className="text-white font-medium mb-1">Thank you!</p>
            <p className="text-slate-400 text-sm">Your feedback helps us improve SpaceNexus.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
              <p className="text-sm font-medium text-white">Quick feedback</p>
              <button
                onClick={handleDismiss}
                className="text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              <p className="text-sm text-slate-300 mb-3">
                How likely are you to recommend SpaceNexus to a colleague?
              </p>

              {/* Score buttons */}
              <div className="flex gap-1 mb-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setScore(n)}
                    className={`flex-1 h-8 rounded text-xs font-bold transition-all ${
                      score === n
                        ? 'ring-2 ring-white scale-110'
                        : 'hover:scale-105'
                    } ${
                      n <= 6
                        ? 'bg-red-500/80 text-white'
                        : n <= 8
                        ? 'bg-amber-500/80 text-white'
                        : 'bg-emerald-500/80 text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-3">
                <span>Not likely</span>
                <span>Very likely</span>
              </div>

              {/* Feedback text (shown after selecting a score) */}
              {score !== null && (
                <div className="mb-3">
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder={
                      score <= 6
                        ? 'What could we do better?'
                        : score <= 8
                        ? 'What would make it a 10?'
                        : 'What do you like most?'
                    }
                    className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-nebula-500/50"
                    rows={2}
                  />
                </div>
              )}

              {/* Submit */}
              {score !== null && (
                <button
                  onClick={handleSubmit}
                  className="w-full bg-nebula-500 hover:bg-nebula-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  Submit
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
