'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

/** Pages where the feedback button should NOT appear */
const EXCLUDED_PATHS = ['/', '/pricing', '/register', '/login', '/forgot-password', '/reset-password', '/verify-email'];

export default function FeedbackButton() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [dismissed, setDismissed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const isExcluded = EXCLUDED_PATHS.includes(pathname);

  /* Close panel when clicking outside */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  /* Close panel on Escape key */
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen]);

  /* Close on route change */
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleSubmit = async () => {
    if (!feedback.trim() || !session?.user) return;

    setStatus('submitting');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: session.user.name || 'Anonymous',
          email: session.user.email || '',
          subject: 'general',
          message: `[User Feedback] ${feedback}`,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit');
      setStatus('success');
      setFeedback('');

      // Auto-close after success
      setTimeout(() => {
        setIsOpen(false);
        // Reset status after close animation
        setTimeout(() => setStatus('idle'), 300);
      }, 3000);
    } catch {
      setStatus('error');
    }
  };

  /* Don't render if not logged in, on excluded pages, or dismissed */
  if (!session || isExcluded || dismissed) return null;

  return (
    <div ref={panelRef} className="fixed bottom-20 left-4 lg:bottom-6 lg:left-6 z-50">
      {/* Expanded panel */}
      {isOpen && (
        <div
          id="feedback-panel"
          role="dialog"
          aria-label="Send feedback"
          className="absolute bottom-14 left-0 w-80 rounded-xl border border-white/[0.1] bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <span className="text-sm font-semibold text-white">Send Feedback</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setDismissed(true);
                  setIsOpen(false);
                }}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded"
                aria-label="Dismiss feedback button"
              >
                Don&apos;t show
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
                aria-label="Close feedback panel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-4">
            {status === 'success' ? (
              <div className="flex items-center gap-3 py-4 text-center">
                <svg className="w-8 h-8 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-slate-300">
                  Thanks! Your feedback helps us build a better platform.
                </p>
              </div>
            ) : (
              <>
                <label htmlFor="feedback-textarea" className="block text-sm text-slate-300 mb-2">
                  How can we improve SpaceNexus?
                </label>
                <textarea
                  id="feedback-textarea"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us what you think..."
                  rows={4}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-white/15 focus:outline-none resize-none transition-colors"
                  maxLength={2000}
                  disabled={status === 'submitting'}
                />
                {status === 'error' && (
                  <p className="text-xs text-red-400 mt-1.5">
                    Something went wrong. Please try again.
                  </p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-slate-500">
                    {feedback.length}/2000
                  </span>
                  <button
                    onClick={handleSubmit}
                    disabled={!feedback.trim() || status === 'submitting'}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
                  >
                    {status === 'submitting' ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                        Submit
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full shadow-lg transition-all duration-200 ${
          isOpen
            ? 'bg-white/[0.12] text-white border border-white/[0.15]'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/30 hover:shadow-indigo-500/20 hover:shadow-xl'
        }`}
        aria-label={isOpen ? 'Close feedback' : 'Send feedback'}
        aria-expanded={isOpen}
        aria-controls="feedback-panel"
      >
        {isOpen ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            <span className="text-xs font-medium hidden sm:inline">Feedback</span>
          </>
        )}
      </button>
    </div>
  );
}
