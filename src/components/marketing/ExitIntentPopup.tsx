'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

const TRIAL_BENEFITS = [
  '30-day Pro trial (normally 14 days)',
  'Full access to 200+ intelligence modules',
  'Daily curated space industry alerts',
];

const NEWSLETTER_BENEFITS = [
  'Weekly curated space industry brief',
  'Key launches, funding rounds & policy changes',
  'Free forever — no account required',
];

const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MIN_TIME_ON_SITE_MS = 15000; // 15 seconds
const SCROLL_THRESHOLD = 500; // px scrolled before mobile detection activates
const SESSION_KEY = 'exit-popup-shown-this-session';

export default function ExitIntentPopup() {
  const { data: session, status: sessionStatus } = useSession();
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'trial' | 'newsletter'>('trial');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState({ hours: 23, minutes: 59, seconds: 59 });

  const triggeredRef = useRef(false);
  const pageLoadTimeRef = useRef(Date.now());
  const maxScrollRef = useRef(0);
  const lastScrollYRef = useRef(0);

  const shouldSuppress = useCallback(() => {
    // Don't show to logged-in users
    if (session) return true;

    // Still loading auth — suppress to avoid flash
    if (sessionStatus === 'loading') return true;

    // Don't show to newsletter subscribers
    try {
      if (localStorage.getItem('newsletter-subscribed')) return true;
    } catch {
      // localStorage unavailable
    }

    // Only trigger once per session
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return true;
    } catch {
      // sessionStorage unavailable
    }

    // Don't show if dismissed within the last 7 days
    try {
      const dismissedAt = localStorage.getItem('exit-popup-dismissed');
      if (dismissedAt) {
        const dismissedTime = parseInt(dismissedAt, 10);
        if (Date.now() - dismissedTime < DISMISS_DURATION_MS) return true;
      }
    } catch {
      // localStorage unavailable
    }

    return false;
  }, [session, sessionStatus]);

  const showPopup = useCallback(() => {
    if (triggeredRef.current) return;
    if (shouldSuppress()) return;

    // Must have been on site for at least 15 seconds
    if (Date.now() - pageLoadTimeRef.current < MIN_TIME_ON_SITE_MS) return;

    triggeredRef.current = true;

    // Mark as shown for this session
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
    } catch {
      // sessionStorage unavailable
    }

    setVisible(true);
  }, [shouldSuppress]);

  useEffect(() => {
    if (shouldSuppress()) return;

    // Desktop: mouse leaving viewport from top
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 0) {
        showPopup();
      }
    };

    // Mobile: rapid scroll-to-top detection
    const handleScroll = () => {
      const currentY = window.scrollY;

      // Track max scroll position
      if (currentY > maxScrollRef.current) {
        maxScrollRef.current = currentY;
      }

      // Detect rapid scroll to top: user was >500px down and now near top
      if (
        maxScrollRef.current > SCROLL_THRESHOLD &&
        currentY < 50 &&
        lastScrollYRef.current > 200
      ) {
        showPopup();
      }

      lastScrollYRef.current = currentY;
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [shouldSuppress, showPopup]);

  // Countdown timer for urgency (trial tab only)
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        const totalSeconds = prev.hours * 3600 + prev.minutes * 60 + prev.seconds - 1;
        if (totalSeconds <= 0) return { hours: 0, minutes: 0, seconds: 0 };
        return {
          hours: Math.floor(totalSeconds / 3600),
          minutes: Math.floor((totalSeconds % 3600) / 60),
          seconds: totalSeconds % 60,
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem('exit-popup-dismissed', String(Date.now()));
    } catch {
      // localStorage unavailable
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const source = activeTab === 'newsletter' ? 'exit-intent-newsletter' : 'exit-intent';

      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        try {
          localStorage.setItem('newsletter-subscribed', 'true');
        } catch {
          // localStorage unavailable
        }
      } else {
        setStatus('error');
        if (data.code === 'ALREADY_SUBSCRIBED') {
          setErrorMessage('This email is already subscribed.');
        } else {
          setErrorMessage(data.error || 'Failed to subscribe. Please try again.');
        }
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  if (!visible) return null;

  const currentBenefits = activeTab === 'trial' ? TRIAL_BENEFITS : NEWSLETTER_BENEFITS;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-label={activeTab === 'trial' ? 'Free trial signup' : 'Newsletter signup'}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="relative bg-black border border-white/[0.08] rounded-2xl max-w-md w-full p-8 shadow-2xl shadow-black/50 animate-in slide-in-from-bottom-4 duration-300">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-2.5 rounded-lg text-slate-500 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          aria-label="Close popup"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Decorative glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-40 h-40 bg-white/10 rounded-full blur-[60px] pointer-events-none" />

        {status === 'success' ? (
          /* Success state */
          <div className="text-center relative">
            <div className="w-14 h-14 rounded-full bg-emerald-900/40 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Check your inbox!</h3>
            <p className="text-slate-400 text-sm mb-5">
              {activeTab === 'newsletter'
                ? 'You\u2019ll receive your first weekly space intelligence brief soon.'
                : 'We\u2019ve sent a confirmation email. Verify to start receiving space intelligence.'}
            </p>
            <button
              onClick={handleDismiss}
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          /* Form state */
          <div className="relative">
            {/* Rocket icon */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10 flex items-center justify-center mx-auto mb-5">
              <svg className="w-6 h-6 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-white text-center mb-2">
              Wait — before you go
            </h3>

            {/* Tab switcher */}
            <div className="flex rounded-lg bg-white/[0.04] border border-white/[0.08] p-1 mb-5">
              <button
                onClick={() => setActiveTab('trial')}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'trial'
                    ? 'bg-white/[0.1] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Free 30-Day Trial
              </button>
              <button
                onClick={() => setActiveTab('newsletter')}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'newsletter'
                    ? 'bg-white/[0.1] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Free Weekly Brief
              </button>
            </div>

            {activeTab === 'trial' ? (
              <p className="text-sm text-slate-400 text-center mb-3">
                Subscribe now and get a <span className="text-white/70 font-semibold">free extended 30-day trial</span> of SpaceNexus Pro
              </p>
            ) : (
              <p className="text-sm text-slate-400 text-center mb-3">
                Get the <span className="text-white/70 font-semibold">free weekly intelligence brief</span> — top stories, launches, and deals
              </p>
            )}

            {/* Countdown timer (trial tab only) */}
            {activeTab === 'trial' && (
              <div className="flex justify-center gap-2 mb-5">
                {[
                  { value: countdown.hours, label: 'HRS' },
                  { value: countdown.minutes, label: 'MIN' },
                  { value: countdown.seconds, label: 'SEC' },
                ].map((unit) => (
                  <div key={unit.label} className="text-center">
                    <div className="w-12 h-12 rounded-lg bg-white/[0.06] border border-white/[0.1] flex items-center justify-center">
                      <span className="text-lg font-bold text-white/70 tabular-nums">
                        {String(unit.value).padStart(2, '0')}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">{unit.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Benefits */}
            <ul className="space-y-2.5 mb-6">
              {currentBenefits.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-white/70">
                  <svg className="w-4 h-4 text-white/70 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {b}
                </li>
              ))}
            </ul>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                enterKeyHint="send"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                aria-label="Email address"
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-white/15 transition-colors text-sm"
                required
                disabled={status === 'loading'}
                autoFocus
              />
              <button
                type="submit"
                disabled={status === 'loading' || !email}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold text-sm transition-all duration-200 shadow-lg shadow-black/20"
              >
                {status === 'loading' ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Subscribing...
                  </span>
                ) : activeTab === 'trial' ? (
                  'Start Free Trial'
                ) : (
                  'Subscribe Free'
                )}
              </button>
            </form>

            {status === 'error' && (
              <p className="mt-3 text-red-400 text-xs text-center">{errorMessage}</p>
            )}

            {/* Dismiss link */}
            <button
              onClick={handleDismiss}
              className="block w-full text-center mt-4 text-xs text-slate-500 hover:text-slate-400 transition-colors"
            >
              No thanks
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
