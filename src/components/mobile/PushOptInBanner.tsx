'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';

const STORAGE_KEYS = {
  PAGE_VIEWS: 'spacenexus-push-views',
  DISMISSED_AT: 'spacenexus-push-dismiss',
};

const MIN_PAGE_VIEWS = 5;
const DISMISS_COOLDOWN = 14 * 24 * 60 * 60 * 1000; // 14 days

// A hardcoded VAPID public key placeholder.
// In production, replace with your actual VAPID public key.
const VAPID_PUBLIC_KEY = '';

/** Convert a URL-safe base64 string to a Uint8Array for applicationServerKey */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Bell icon for the banner */
function BellIcon({ className }: { className?: string }) {
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
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
      {/* Small notification dot */}
      <circle cx="18" cy="5" r="3" fill="#06b6d4" stroke="none" />
    </svg>
  );
}

export default function PushOptInBanner() {
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [enabling, setEnabling] = useState(false);

  /** Check if running as standalone PWA */
  const isStandalone = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    if ((window.navigator as Navigator & { standalone?: boolean }).standalone) return true;
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    return false;
  }, []);

  /** Check if push is supported in this browser */
  const isPushSupported = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    if (!('serviceWorker' in navigator)) return false;
    if (!('PushManager' in window)) return false;
    if (!('Notification' in window)) return false;
    return true;
  }, []);

  /** Check if notifications are already granted or explicitly denied */
  const getPermissionState = useCallback((): NotificationPermission | null => {
    if (typeof window === 'undefined') return null;
    if (!('Notification' in window)) return null;
    return Notification.permission;
  }, []);

  /** Check if banner was recently dismissed (within cooldown) */
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

  /** Read the current page view count */
  const getPageViews = useCallback((): number => {
    try {
      return parseInt(localStorage.getItem(STORAGE_KEYS.PAGE_VIEWS) || '0', 10);
    } catch {
      return 0;
    }
  }, []);

  /** Increment and return the new page view count */
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
    // Guard: push must be supported
    if (!isPushSupported()) return;

    // Guard: not in standalone PWA mode
    if (isStandalone()) return;

    // Guard: permission not already granted or denied
    const permission = getPermissionState();
    if (permission === 'granted' || permission === 'denied') return;

    // Increment page views on each mount
    const views = incrementPageViews();

    // Guard: dismissed within cooldown
    if (isDismissed()) return;

    // Guard: not enough page views yet
    if (views < MIN_PAGE_VIEWS) return;

    // Show the banner after a brief delay to avoid appearing on initial paint
    const timer = setTimeout(() => {
      setVisible(true);
      // Double rAF to ensure the DOM has painted with translate-y-full
      // before we transition to translate-y-0
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimateIn(true);
        });
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [isPushSupported, isStandalone, getPermissionState, isDismissed, incrementPageViews]);

  /** Dismiss the banner with slide-down animation */
  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DISMISSED_AT, Date.now().toString());
    } catch {
      // localStorage unavailable
    }
    setAnimateIn(false);
    setTimeout(() => {
      setVisible(false);
    }, 300);
  }, []);

  /** Handle the "Enable Notifications" tap */
  const handleEnable = useCallback(async () => {
    if (enabling) return;
    setEnabling(true);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        // Try to subscribe to push via the service worker
        try {
          const registration = await navigator.serviceWorker.ready;

          if (registration.pushManager) {
            const subscribeOptions: PushSubscriptionOptionsInit = {
              userVisibleOnly: true,
            };

            // Only add applicationServerKey if VAPID key is configured
            if (VAPID_PUBLIC_KEY) {
              subscribeOptions.applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
            }

            await registration.pushManager.subscribe(subscribeOptions);
          }
        } catch (subscribeError) {
          // Push subscription failed but notification permission was granted.
          // This can happen if VAPID key is not configured, which is fine
          // for the client-side opt-in UX. Log it but don't show an error.
          console.warn('[PushOptIn] Push subscription error:', subscribeError);
        }

        toast.success(
          'You\'ll be notified about launches, breaking news, and market alerts.',
          'Notifications enabled'
        );

        // Dismiss the banner smoothly
        setAnimateIn(false);
        setTimeout(() => {
          setVisible(false);
        }, 300);
      } else if (permission === 'denied') {
        toast.error(
          'Notifications were blocked. You can re-enable them in your browser settings.',
          'Permission denied'
        );
        // Dismiss since the user explicitly blocked
        setAnimateIn(false);
        setTimeout(() => {
          setVisible(false);
        }, 300);
      } else {
        // 'default' - user dismissed the permission prompt without choosing
        toast.info('You can enable notifications anytime from your account settings.');
      }
    } catch (error) {
      console.error('[PushOptIn] Error requesting notification permission:', error);
      toast.error(
        'Something went wrong. Please try again later.',
        'Notification error'
      );
    } finally {
      setEnabling(false);
    }
  }, [enabling]);

  if (!visible) return null;

  return (
    <div
      className={[
        'fixed left-0 right-0 z-[55] md:hidden',
        'transition-transform duration-300 ease-out',
        animateIn ? 'translate-y-0' : 'translate-y-full',
      ].join(' ')}
      role="dialog"
      aria-label="Enable push notifications"
      style={{
        bottom: '4rem', // Position above MobileTabBar (h-16 = 4rem)
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Banner container */}
      <div
        className="mx-3 mb-2 rounded-2xl border border-white/10 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.97) 0%, rgba(22, 33, 56, 0.97) 50%, rgba(15, 23, 42, 0.97) 100%)',
          boxShadow: '0 -4px 24px -4px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(6, 182, 212, 0.08)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Gradient accent bar at top */}
        <div
          className="h-0.5"
          style={{
            background: 'linear-gradient(90deg, transparent, #06b6d4, #3b82f6, transparent)',
          }}
        />

        <div className="px-4 pt-3 pb-3">
          {/* Header row: icon + text + dismiss */}
          <div className="flex items-start gap-3">
            {/* Bell icon with gradient background */}
            <div
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border border-white/10"
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
              }}
            >
              <BellIcon className="w-5 h-5 text-slate-300" />
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm leading-tight">
                Never miss a launch
              </h3>
              <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                Get alerts for launches, breaking space news, and market moves
              </p>
            </div>

            {/* Dismiss X button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-shrink-0 -mt-0.5 -mr-1 w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
              aria-label="Dismiss notification prompt"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Action row */}
          <div className="flex items-center gap-3 mt-3">
            {/* Enable button */}
            <button
              type="button"
              onClick={handleEnable}
              disabled={enabling}
              className={[
                'flex-1 flex items-center justify-center gap-2',
                'min-h-[40px] py-2 px-4 rounded-xl',
                'text-sm font-semibold text-white',
                'transition-all duration-200',
                enabling
                  ? 'opacity-70 cursor-not-allowed'
                  : 'hover:shadow-lg hover:shadow-black/10 active:scale-[0.98]',
              ].join(' ')}
              style={{
                background: enabling
                  ? 'linear-gradient(135deg, #0e7490, #1d4ed8)'
                  : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              }}
            >
              {enabling ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray="31.4 31.4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>Enabling...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 01-3.46 0" />
                  </svg>
                  <span>Enable Notifications</span>
                </>
              )}
            </button>

            {/* Not now link */}
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-shrink-0 py-2 px-3 text-xs font-medium text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800/40 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
