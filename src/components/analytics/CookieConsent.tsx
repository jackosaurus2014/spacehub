'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getConsentStatus, setConsentStatus, isGPCEnabled } from '@/lib/analytics';

/**
 * Cookie Consent Banner Component
 *
 * Features:
 * - Dark space theme matching site design
 * - Accept/Decline buttons
 * - Link to cookie policy
 * - Saves preference to localStorage
 * - Slide-up animation from bottom
 * - Respects prefers-reduced-motion
 */
export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Respect Global Privacy Control signal
    if (isGPCEnabled()) {
      setConsentStatus(false);
      return; // Don't show banner, GPC has opted out
    }

    // Check if user has already made a choice
    const consentStatus = getConsentStatus();

    if (consentStatus === null) {
      // Small delay before showing the banner for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
        // Trigger animation after a brief moment
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    setConsentStatus(true);
    closeBanner();
  };

  const handleDecline = () => {
    setConsentStatus(false);
    closeBanner();
  };

  const closeBanner = () => {
    setIsAnimating(false);
    // Wait for animation to complete before hiding
    setTimeout(() => {
      setIsVisible(false);
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-16 lg:bottom-0 left-0 right-0 z-[60] transition-transform duration-300 ease-out
        ${isAnimating ? 'translate-y-0' : 'translate-y-full'}
        motion-reduce:transition-none`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
    >
      {/* Banner container with dark space theme */}
      <div className="mx-4 mb-4 md:mx-auto md:max-w-4xl">
        <div
          className="backdrop-blur-xl border border-white/10 rounded-2xl p-6
                     shadow-lg shadow-black/50"
          style={{
            background: 'rgba(10, 10, 10, 0.98)',
          }}
        >
          {/* Top gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-t-2xl" />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Text content */}
            <div className="flex-1">
              <h2
                id="cookie-consent-title"
                className="text-lg font-semibold text-slate-100 mb-2"
              >
                Cookie Preferences
              </h2>
              <p
                id="cookie-consent-description"
                className="text-sm text-white/70 leading-relaxed"
              >
                We use cookies to analyze site usage and improve your experience.
                You can accept or decline analytics cookies.{' '}
                <Link
                  href="/privacy"
                  className="text-white/70 hover:text-white underline underline-offset-2 transition-colors"
                >
                  Learn more
                </Link>
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 md:ml-6">
              <button
                onClick={handleDecline}
                className="px-5 py-2.5 rounded-xl text-sm font-medium
                         text-white/70 border border-white/[0.08]
                         hover:bg-white/[0.08] hover:border-slate-400/50
                         transition-all duration-200
                         focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                className="px-5 py-2.5 rounded-xl text-sm font-medium
                         text-slate-900 bg-white
                         hover:bg-slate-200
                         transition-all duration-200
                         focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-black"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
