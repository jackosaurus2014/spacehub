'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'spacenexus-android-banner-dismiss';
const DISMISS_COOLDOWN = 14 * 24 * 60 * 60 * 1000; // 14 days
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.spacenexus.app&referrer=utm_source%3Dwebsite%26utm_medium%3Dbanner';

/**
 * Smart app banner for Android users who are browsing on mobile web.
 * Shows a non-intrusive top banner prompting Play Store install.
 * Does NOT show if user is already in the installed PWA/TWA.
 */
export default function AndroidInstallBanner() {
  const [visible, setVisible] = useState(false);

  const isAndroid = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return /Android/i.test(navigator.userAgent);
  }, []);

  const isStandalone = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    if ((window.navigator as Navigator & { standalone?: boolean }).standalone) return true;
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    // TWA detection: document referrer from android-app
    if (document.referrer.startsWith('android-app://')) return true;
    return false;
  }, []);

  const isDismissed = useCallback((): boolean => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const dismissedAt = parseInt(raw, 10);
      if (isNaN(dismissedAt)) return false;
      return Date.now() - dismissedAt < DISMISS_COOLDOWN;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!isAndroid()) return;
    if (isStandalone()) return;
    if (isDismissed()) return;

    // Delay slightly to not block initial paint
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [isAndroid, isStandalone, isDismissed]);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {
      // localStorage unavailable
    }
    setVisible(false);
  }, []);

  const handleInstall = useCallback(() => {
    window.open(PLAY_STORE_URL, '_blank', 'noopener,noreferrer');
    handleDismiss();
  }, [handleDismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] md:hidden animate-slideDown"
      role="banner"
      aria-label="Install SpaceNexus app"
    >
      <div
        className="flex items-center gap-3 px-3 py-2.5"
        style={{
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)',
          borderBottom: '1px solid rgba(6, 182, 212, 0.2)',
          backdropFilter: 'blur(12px)',
          paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
        }}
      >
        {/* Dismiss button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-white/70 hover:bg-white/[0.06] transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* App icon */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.841m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
          </svg>
        </div>

        {/* App info */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold leading-tight truncate">SpaceNexus</p>
          <p className="text-slate-400 text-[11px] leading-tight">FREE - On Google Play</p>
        </div>

        {/* Install button */}
        <button
          type="button"
          onClick={handleInstall}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shrink-0 active:scale-95"
        >
          INSTALL
        </button>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
