'use client';

import { useState, useEffect, useCallback } from 'react';
import { getStreak } from '@/lib/streak';

const STORAGE_KEYS = {
  DISMISSED_AT: 'spacenexus-rating-dismiss',
};

const STREAK_THRESHOLD = 7;
const DISMISS_COOLDOWN = 60 * 24 * 60 * 60 * 1000; // 60 days

/** Decorative star icon */
function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  );
}

/** Share icon for the non-standalone CTA */
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
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98" />
      <path d="M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}

type Platform = 'ios' | 'android' | 'unknown';

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'unknown';
}

function getRatingUrl(platform: Platform): string {
  // Placeholder store URLs -- replace with real App Store / Play Store links when available
  switch (platform) {
    case 'ios':
      return 'https://spacenexus.us/feedback';
    case 'android':
      return 'https://spacenexus.us/feedback';
    default:
      return '/feedback';
  }
}

export default function AppRatingPrompt() {
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);
  const [streak, setStreak] = useState(0);

  /** Check if running as installed PWA */
  const checkStandalone = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    if ((window.navigator as Navigator & { standalone?: boolean }).standalone) return true;
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    return false;
  }, []);

  /** Check if dismissed within the 60-day cooldown */
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

  /** Check if on mobile via matchMedia (mirrors md:hidden breakpoint) */
  const isMobile = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  }, []);

  useEffect(() => {
    // Must be on mobile
    if (!isMobile()) return;

    // Check dismiss cooldown
    if (isDismissed()) return;

    // Read streak data
    const streakData = getStreak();
    if (streakData.currentStreak < STREAK_THRESHOLD) return;

    const standalone = checkStandalone();
    setIsStandaloneMode(standalone);
    setStreak(streakData.currentStreak);

    // Show after a brief delay to avoid appearing on initial paint
    const timer = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimateIn(true);
        });
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [isMobile, isDismissed, checkStandalone]);

  /** Dismiss with slide-down animation and set 60-day cooldown */
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

  /** Handle the primary CTA tap */
  const handlePrimaryCTA = useCallback(() => {
    if (isStandaloneMode) {
      // Open the rating / feedback URL
      const platform = detectPlatform();
      const url = getRatingUrl(platform);
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      // Use native share API if available, else fall back to copy-link
      if (navigator.share) {
        navigator.share({
          title: 'SpaceNexus - Space Industry Intelligence',
          text: 'Check out SpaceNexus for real-time space industry data, launches, and news.',
          url: 'https://spacenexus.us',
        }).catch(() => {
          // User cancelled or share failed -- silent
        });
      } else {
        // Fallback: copy link to clipboard
        navigator.clipboard?.writeText('https://spacenexus.us').catch(() => {
          // clipboard unavailable
        });
      }
    }
    handleDismiss();
  }, [isStandaloneMode, handleDismiss]);

  if (!visible) return null;

  return (
    <div
      className={[
        'fixed inset-0 z-[58] md:hidden',
        'flex items-end justify-center',
        'transition-opacity duration-300',
        animateIn ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
      role="dialog"
      aria-label={isStandaloneMode ? 'Rate SpaceNexus' : 'Share SpaceNexus'}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Bottom sheet card */}
      <div
        className={[
          'relative w-full max-w-md mx-3 mb-3 rounded-2xl overflow-hidden',
          'transition-transform duration-300 ease-out',
          animateIn ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
        style={{
          background:
            'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(22, 33, 56, 0.98) 50%, rgba(15, 23, 42, 0.98) 100%)',
          boxShadow:
            '0 -8px 32px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(6, 182, 212, 0.1)',
          backdropFilter: 'blur(16px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Gradient accent bar */}
        <div
          className="h-0.5"
          style={{
            background:
              'linear-gradient(90deg, transparent, #06b6d4, #facc15, transparent)',
          }}
        />

        {/* Dismiss X button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors z-10"
          aria-label="Dismiss"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="px-5 pt-5 pb-4 text-center">
          {/* Star rating visual (decorative) */}
          <div className="flex items-center justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon
                key={star}
                filled={true}
                className="w-7 h-7 text-yellow-400 rating-star"
                />
            ))}
          </div>

          {/* Heading */}
          <h3 className="text-white font-semibold text-lg mb-1">
            {isStandaloneMode ? 'Enjoying SpaceNexus?' : 'Love SpaceNexus? Share it!'}
          </h3>

          {/* Subtext */}
          <p className="text-slate-400 text-sm leading-relaxed mb-5 max-w-xs mx-auto">
            {isStandaloneMode
              ? `You've been exploring for ${streak} days! If you're finding value, a quick rating helps us grow.`
              : `You've been exploring for ${streak} days! Share SpaceNexus with fellow space enthusiasts.`}
          </p>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {/* Primary CTA */}
            <button
              type="button"
              onClick={handlePrimaryCTA}
              className={[
                'flex items-center justify-center gap-2',
                'w-full py-3 px-4 rounded-xl',
                'text-sm font-semibold text-white',
                'hover:shadow-lg hover:shadow-cyan-500/20 active:scale-[0.98]',
                'transition-all duration-200',
              ].join(' ')}
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              }}
            >
              {isStandaloneMode ? (
                <>
                  <StarIcon filled={true} className="w-4 h-4 text-yellow-300" />
                  <span>Rate Us</span>
                </>
              ) : (
                <>
                  <ShareIcon className="w-4 h-4" />
                  <span>Share SpaceNexus</span>
                </>
              )}
            </button>

            {/* Secondary: Not now */}
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-2.5 text-sm font-medium text-slate-500 hover:text-slate-300 rounded-xl hover:bg-slate-800/40 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>

      {/* Star shimmer animation */}
      <style jsx>{`
        .rating-star {
          animation: starShimmer 2s ease-in-out infinite;
        }
        .rating-star:nth-child(1) { animation-delay: 0s; }
        .rating-star:nth-child(2) { animation-delay: 0.15s; }
        .rating-star:nth-child(3) { animation-delay: 0.3s; }
        .rating-star:nth-child(4) { animation-delay: 0.45s; }
        .rating-star:nth-child(5) { animation-delay: 0.6s; }

        @keyframes starShimmer {
          0%, 100% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.15);
            filter: brightness(1.3) drop-shadow(0 0 6px rgba(250, 204, 21, 0.5));
          }
        }
      `}</style>
    </div>
  );
}
