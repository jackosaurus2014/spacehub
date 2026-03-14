'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const CONSENT_KEY = 'spacenexus-cookie-consent';
const CONSENT_EXPIRY_DAYS = 365;

interface CookiePreferences {
  essential: boolean; // always true
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
}

function isConsentExpired(preferences: CookiePreferences): boolean {
  const expiryMs = CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - preferences.timestamp > expiryMs;
}

function getSavedConsent(): CookiePreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed: CookiePreferences = JSON.parse(raw);
    if (!parsed.timestamp || isConsentExpired(parsed)) {
      localStorage.removeItem(CONSENT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveConsent(preferences: CookiePreferences): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONSENT_KEY, JSON.stringify(preferences));

  // Also update the legacy analytics consent key for GA integration
  const legacyStatus = preferences.analytics ? 'granted' : 'denied';
  localStorage.setItem('spacenexus_cookie_consent', legacyStatus);

  // Update Google Analytics consent mode if gtag is available
  if ((window as any).gtag) {
    (window as any).gtag('consent', 'update', {
      analytics_storage: legacyStatus,
      ad_storage: preferences.marketing ? 'granted' : 'denied',
    });
  }
}

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  useEffect(() => {
    const existing = getSavedConsent();
    if (existing) return; // consent already given and not expired

    // Small delay for better UX - don't flash immediately on load
    const timer = setTimeout(() => {
      setIsVisible(true);
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const closeBanner = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
    }, 300);
  }, []);

  const handleAcceptAll = useCallback(() => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
    });
    closeBanner();
  }, [closeBanner]);

  const handleRejectNonEssential = useCallback(() => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
    });
    closeBanner();
  }, [closeBanner]);

  const handleSaveSettings = useCallback(() => {
    saveConsent({
      essential: true,
      analytics: analyticsEnabled,
      marketing: marketingEnabled,
      timestamp: Date.now(),
    });
    closeBanner();
  }, [analyticsEnabled, marketingEnabled, closeBanner]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-16 lg:bottom-0 left-0 right-0 z-[60] transition-transform duration-300 ease-out
        ${isAnimating ? 'translate-y-0' : 'translate-y-full'}
        motion-reduce:transition-none`}
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
    >
      <div className="bg-black border-t border-white/[0.08] shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6">
          {/* Main banner content */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Text */}
              <div className="flex-1">
                <p className="text-sm text-white/70 leading-relaxed">
                  We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.{' '}
                  <Link
                    href="/cookies"
                    className="text-white/70 hover:text-white underline underline-offset-2 transition-colors"
                  >
                    Cookie Policy
                  </Link>
                </p>
              </div>

              {/* Buttons */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="px-4 py-2 rounded-lg text-sm font-medium
                           text-slate-400 hover:text-white/90
                           border border-white/[0.1] hover:border-white/[0.12]
                           transition-all duration-200
                           focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black"
                >
                  Cookie Settings
                </button>
                <button
                  onClick={handleRejectNonEssential}
                  className="px-4 py-2 rounded-lg text-sm font-medium
                           text-white/70
                           border border-white/[0.08] hover:border-white/[0.1]
                           hover:bg-white/[0.06]
                           transition-all duration-200
                           focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black"
                >
                  Reject Non-Essential
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-5 py-2 rounded-lg text-sm font-medium
                           text-slate-900 bg-white hover:bg-slate-200
                           transition-all duration-200
                           focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black"
                >
                  Accept All
                </button>
              </div>
            </div>

            {/* Expandable cookie settings panel */}
            {showSettings && (
              <div className="border-t border-white/[0.08]pt-4 mt-1">
                <div className="grid gap-4 sm:grid-cols-3 max-w-3xl">
                  {/* Essential cookies - always on */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <div
                        className="w-9 h-5 rounded-full bg-white relative cursor-not-allowed opacity-70"
                        title="Essential cookies are always enabled"
                      >
                        <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/90">Essential</p>
                      <p className="text-xs text-slate-400 mt-0.5">Required for the site to function. Always enabled.</p>
                    </div>
                  </div>

                  {/* Analytics cookies */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <button
                        onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                        className={`w-9 h-5 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/20 ${
                          analyticsEnabled ? 'bg-white' : 'bg-slate-600'
                        }`}
                        role="switch"
                        aria-checked={analyticsEnabled}
                        aria-label="Toggle analytics cookies"
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            analyticsEnabled ? 'right-0.5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/90">Analytics</p>
                      <p className="text-xs text-slate-400 mt-0.5">Help us understand how visitors use the site.</p>
                    </div>
                  </div>

                  {/* Marketing cookies */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <button
                        onClick={() => setMarketingEnabled(!marketingEnabled)}
                        className={`w-9 h-5 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/20 ${
                          marketingEnabled ? 'bg-white' : 'bg-slate-600'
                        }`}
                        role="switch"
                        aria-checked={marketingEnabled}
                        aria-label="Toggle marketing cookies"
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            marketingEnabled ? 'right-0.5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/90">Marketing</p>
                      <p className="text-xs text-slate-400 mt-0.5">Used to deliver relevant ads and track campaigns.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    className="px-5 py-2 rounded-lg text-sm font-medium
                             text-white bg-white/[0.08] hover:bg-white/[0.1]
                             border border-white/[0.1] hover:border-white/[0.12]
                             transition-all duration-200
                             focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
