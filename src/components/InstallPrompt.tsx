'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

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

const STORAGE_KEY = 'spacenexus-install-dismissed';
const DISMISS_COOLDOWN = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const isStandalone = useCallback(() => {
    if (typeof window === 'undefined') return true;
    // Already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    // iOS standalone mode
    if ((window.navigator as Navigator & { standalone?: boolean }).standalone) return true;
    // TWA (Trusted Web Activity) mode
    if (document.referrer.includes('android-app://')) return true;
    return false;
  }, []);

  const isMobileWeb = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }, []);

  const isDismissed = useCallback(() => {
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
    // Only show on mobile web browsers, not in standalone/TWA mode
    if (isStandalone() || !isMobileWeb() || isDismissed()) return;

    let showTimer: ReturnType<typeof setTimeout> | null = null;

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Brief delay so it doesn't appear instantly on page load
      showTimer = setTimeout(() => {
        setVisible(true);
        // Trigger CSS transition after mount
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setAnimateIn(true);
          });
        });
      }, 3000);
    };

    const handleAppInstalled = () => {
      setAnimateIn(false);
      setTimeout(() => {
        setVisible(false);
        setDeferredPrompt(null);
      }, 300);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (showTimer) clearTimeout(showTimer);
    };
  }, [isStandalone, isMobileWeb, isDismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        closePrompt();
      }
      setDeferredPrompt(null);
    } catch {
      // Install prompt failed silently
    } finally {
      setIsInstalling(false);
    }
  };

  const closePrompt = () => {
    setAnimateIn(false);
    setTimeout(() => {
      setVisible(false);
    }, 300);
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {
      // localStorage unavailable
    }
    closePrompt();
  };

  if (!visible || !deferredPrompt) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[60] transition-transform duration-300 ease-out ${
        animateIn ? 'translate-y-0' : 'translate-y-full'
      }`}
      role="dialog"
      aria-label="Install SpaceNexus application"
    >
      <div className="bg-black border-t border-white/10 px-4 py-3 safe-area-bottom">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {/* SpaceNexus icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-white/10">
            <Image
              src="/icons/icon-192x192.png"
              alt="SpaceNexus"
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Message */}
          <p className="flex-1 text-white text-sm font-medium min-w-0">
            Install SpaceNexus for the best experience
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.07] transition-colors"
              aria-label="Dismiss install prompt"
            >
              Dismiss
            </button>
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-white hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isInstalling ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
                </svg>
              )}
              Install
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
