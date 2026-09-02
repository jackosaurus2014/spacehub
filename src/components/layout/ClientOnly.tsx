'use client';

// Client-only chrome for the root layout. Next 15 forbids `ssr: false` with
// next/dynamic inside Server Components, so every browser-only widget the
// layout renders is declared here and imported by src/app/layout.tsx.
import dynamic from 'next/dynamic';

export const Footer = dynamic(() => import('@/components/Footer'), { ssr: false });
export const SearchCommandPalette = dynamic(() => import('@/components/SearchCommandPalette'), { ssr: false });
export const CookieConsent = dynamic(() => import('@/components/ui/CookieConsent'), { ssr: false });
export const PWAInstallPrompt = dynamic(() => import('@/components/PWAInstallPrompt'), { ssr: false });
export const InstallPrompt = dynamic(() => import('@/components/InstallPrompt'), { ssr: false });
export const IOSInstallPrompt = dynamic(() => import('@/components/mobile/IOSInstallPrompt'), { ssr: false });
export const KeyboardShortcutsModal = dynamic(() => import('@/components/ui/KeyboardShortcutsModal'), { ssr: false });
export const PageTracker = dynamic(() => import('@/components/PageTracker'), { ssr: false });
export const NpsSurvey = dynamic(() => import('@/components/ui/NpsSurvey'), { ssr: false });
export const ExitIntentPopup = dynamic(() => import('@/components/marketing/ExitIntentPopup'), { ssr: false });
export const QuickStartGuide = dynamic(() => import('@/components/onboarding/QuickStartGuide'), { ssr: false });
export const LiveNowBanner = dynamic(() => import('@/components/livestreams/LiveNowBanner'), { ssr: false });
export const TrialCountdownBanner = dynamic(() => import('@/components/billing/TrialCountdownBanner'), {
  ssr: false,
});
export const OnboardingTour = dynamic(() => import('@/components/ui/OnboardingTour'), { ssr: false });
export const PushOptInBanner = dynamic(() => import('@/components/mobile/PushOptInBanner'), { ssr: false });
export const WhatsNew = dynamic(() => import('@/components/mobile/WhatsNew').then(m => ({ default: m.default })), { ssr: false });
export const ReferralPrompt = dynamic(() => import('@/components/marketing/ReferralPrompt'), { ssr: false });
export const AppRatingPrompt = dynamic(() => import('@/components/mobile/AppRatingPrompt'), { ssr: false });
export const AndroidInstallBanner = dynamic(() => import('@/components/mobile/AndroidInstallBanner'), { ssr: false });
export const UsageLimitBanner = dynamic(() => import('@/components/marketing/UsageLimitBanner'), { ssr: false });
export const StreakNotification = dynamic(() => import('@/components/marketing/StreakNotification'), { ssr: false });
export const HelpButton = dynamic(() => import('@/components/HelpButton'), { ssr: false });
export const FeedbackWidget = dynamic(() => import('@/components/FeedbackWidget'), { ssr: false });
export const FeedbackTab = dynamic(() => import('@/components/FeedbackTab'), { ssr: false });
export const BackToTop = dynamic(() => import('@/components/ui/BackToTop'), { ssr: false });
export const ScrollProgress = dynamic(() => import('@/components/ui/ScrollProgress'), { ssr: false });
export const WebVitals = dynamic(() => import('@/components/analytics/WebVitals'), { ssr: false });
export const ErrorReporter = dynamic(() => import('@/components/ErrorReporter'), { ssr: false });
