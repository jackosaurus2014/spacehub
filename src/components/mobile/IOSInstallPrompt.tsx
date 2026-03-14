'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEYS = {
  PAGE_VIEWS: 'spacenexus-ios-views',
  DISMISSED_AT: 'spacenexus-ios-dismiss',
};

const MIN_PAGE_VIEWS = 3;
const DISMISS_COOLDOWN = 14 * 24 * 60 * 60 * 1000; // 14 days

/** iOS Safari share icon (square with up-arrow) */
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <rect x="4" y="11" width="16" height="11" rx="2" />
    </svg>
  );
}

export default function IOSInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  const isIOSSafari = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    // Safari on iOS does NOT contain 'CriOS' (Chrome), 'FxiOS' (Firefox), 'EdgiOS' (Edge), etc.
    const isSafari = !/(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/.test(ua);

    return isIOS && isSafari;
  }, []);

  const isStandalone = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    // Check iOS navigator.standalone
    if ((window.navigator as Navigator & { standalone?: boolean }).standalone) return true;
    // Check display-mode media query
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    return false;
  }, []);

  const isDismissed = useCallback((): boolean => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DISMISSED_AT);
      if (!raw) return false;
      const dismissedAt = parseInt(raw, 10);
      if (isNaN(dismissedAt)) return false;
      return Date.now() - dismissedAt < DISMISS_COOLDOWN;
    } catch {
      return false;
    }
  }, []);

  const getPageViews = useCallback((): number => {
    try {
      return parseInt(localStorage.getItem(STORAGE_KEYS.PAGE_VIEWS) || '0', 10);
    } catch {
      return 0;
    }
  }, []);

  const incrementPageViews = useCallback((): number => {
    try {
      const current = getPageViews();
      const next = current + 1;
      localStorage.setItem(STORAGE_KEYS.PAGE_VIEWS, next.toString());
      return next;
    } catch {
      return 0;
    }
  }, [getPageViews]);

  useEffect(() => {
    // Must be iOS Safari, not already installed as PWA
    if (!isIOSSafari() || isStandalone()) return;

    // Increment page views
    const views = incrementPageViews();

    // Check if dismissed within cooldown
    if (isDismissed()) return;

    // Need at least MIN_PAGE_VIEWS
    if (views < MIN_PAGE_VIEWS) return;

    // Show after a brief delay so it doesn't appear on initial paint
    const timer = setTimeout(() => {
      setVisible(true);
      // Trigger entrance animation after mount
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimateIn(true);
        });
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [isIOSSafari, isStandalone, isDismissed, incrementPageViews]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.DISMISSED_AT, Date.now().toString());
    } catch {
      // localStorage unavailable
    }
    setAnimateIn(false);
    setTimeout(() => {
      setVisible(false);
    }, 300);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[60] md:hidden transition-transform duration-300 ease-out ${
        animateIn ? 'translate-y-0' : 'translate-y-full'
      }`}
      role="dialog"
      aria-label="Install SpaceNexus on your device"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="bg-black border-t border-white/[0.08] px-5 pt-5 pb-4">
        {/* Drag handle indicator */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-white/[0.1]" />
        </div>

        {/* Header with icon and title */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border border-white/10"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            }}
          >
            <svg
              className="w-7 h-7 text-white/70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold text-base">
              Install SpaceNexus
            </h3>
            <p className="text-slate-400 text-sm">
              Add to your home screen for the full experience
            </p>
          </div>
        </div>

        {/* Step-by-step instructions */}
        <div className="space-y-3 mb-5">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/8 text-white/70 text-xs font-bold flex items-center justify-center mt-0.5">
              1
            </span>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <span>Tap the</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.06] border border-white/[0.08]">
                <ShareIcon className="w-4 h-4 text-white/70" />
                <span className="text-white/70 font-medium text-xs">Share</span>
              </span>
              <span>button</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/8 text-white/70 text-xs font-bold flex items-center justify-center mt-0.5">
              2
            </span>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <span>Scroll down and tap</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.06] border border-white/[0.08]">
                <svg
                  className="w-4 h-4 text-white/70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m-8-8h16" />
                </svg>
                <span className="text-white/70 font-medium text-xs">Add to Home Screen</span>
              </span>
            </div>
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="w-full py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 rounded-xl hover:bg-white/[0.05] transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
