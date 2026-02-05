'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const STORAGE_KEYS = {
  DISMISSED: 'pwa-install-dismissed',
  DISMISSED_AT: 'pwa-install-dismissed-at',
  VISIT_COUNT: 'pwa-visit-count',
  INSTALLED: 'pwa-installed',
};

const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const MIN_VISITS_REQUIRED = 2;

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Check if app is already installed
  const checkIfInstalled = useCallback(() => {
    // Check if running in standalone mode (installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
    // Check iOS standalone mode
    if ((window.navigator as Navigator & { standalone?: boolean }).standalone) {
      return true;
    }
    // Check localStorage flag
    if (localStorage.getItem(STORAGE_KEYS.INSTALLED) === 'true') {
      return true;
    }
    return false;
  }, []);

  // Check if prompt was recently dismissed
  const checkIfDismissed = useCallback(() => {
    const dismissedAt = localStorage.getItem(STORAGE_KEYS.DISMISSED_AT);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_DURATION) {
        return true;
      }
      // Clear old dismissal
      localStorage.removeItem(STORAGE_KEYS.DISMISSED);
      localStorage.removeItem(STORAGE_KEYS.DISMISSED_AT);
    }
    return localStorage.getItem(STORAGE_KEYS.DISMISSED) === 'true';
  }, []);

  // Track visit count
  const trackVisit = useCallback(() => {
    const currentCount = parseInt(localStorage.getItem(STORAGE_KEYS.VISIT_COUNT) || '0', 10);
    const newCount = currentCount + 1;
    localStorage.setItem(STORAGE_KEYS.VISIT_COUNT, newCount.toString());
    return newCount;
  }, []);

  // Check if user has visited enough times
  const hasEnoughVisits = useCallback(() => {
    const visitCount = parseInt(localStorage.getItem(STORAGE_KEYS.VISIT_COUNT) || '0', 10);
    return visitCount >= MIN_VISITS_REQUIRED;
  }, []);

  // Check if device is mobile
  const isMobileDevice = useCallback(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }, []);

  useEffect(() => {
    // Track visit
    trackVisit();

    // Check if already installed
    if (checkIfInstalled()) {
      setIsInstalled(true);
      localStorage.setItem(STORAGE_KEYS.INSTALLED, 'true');
      return;
    }

    // Check if dismissed
    if (checkIfDismissed()) {
      return;
    }

    // Check if enough visits
    if (!hasEnoughVisits()) {
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event so it can be triggered later
      setDeferredPrompt(e);
      // Show custom install prompt only on mobile
      if (isMobileDevice()) {
        // Small delay to not show immediately on page load
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
      }
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem(STORAGE_KEYS.INSTALLED, 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check for display mode changes (installation)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        handleAppInstalled();
      }
    };
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, [checkIfInstalled, checkIfDismissed, hasEnoughVisits, isMobileDevice, trackVisit]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        localStorage.setItem(STORAGE_KEYS.INSTALLED, 'true');
        setIsInstalled(true);
      }

      // Clear the deferred prompt - it can only be used once
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error showing install prompt:', error);
    } finally {
      setIsInstalling(false);
      handleClose();
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowPrompt(false);
      setIsClosing(false);
    }, 300);
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEYS.DISMISSED, 'true');
    localStorage.setItem(STORAGE_KEYS.DISMISSED_AT, Date.now().toString());
    handleClose();
  };

  // Don't render if installed or prompt shouldn't show
  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-20 left-4 right-4 z-50 transition-all duration-300 lg:hidden ${
        isClosing ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
      }`}
      style={{
        animation: isClosing ? 'none' : 'slideUp 0.3s ease-out',
      }}
    >
      <div
        className="relative overflow-hidden rounded-2xl border border-cyan-400/30 p-4"
        style={{
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.96) 50%, rgba(15, 23, 42, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(6, 182, 212, 0.1)',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-slate-700/50 transition-colors"
          aria-label="Dismiss"
        >
          <svg
            className="w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="flex items-start gap-4">
          {/* App icon */}
          <div
            className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}
          >
            <svg
              className="w-8 h-8 text-cyan-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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

          {/* Content */}
          <div className="flex-1 min-w-0 pr-6">
            <h3 className="text-slate-100 font-semibold text-base mb-1">
              Install SpaceNexus
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Add to your home screen for quick access to space industry intelligence.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-300 rounded-xl hover:bg-slate-700/50 transition-colors"
          >
            Not Now
          </button>
          <button
            onClick={handleInstall}
            disabled={isInstalling || !deferredPrompt}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
              boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)',
            }}
          >
            {isInstalling ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Installing...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v12m0 0l-4-4m4 4l4-4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                  />
                </svg>
                Add to Home Screen
              </>
            )}
          </button>
        </div>

        {/* Subtle indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
