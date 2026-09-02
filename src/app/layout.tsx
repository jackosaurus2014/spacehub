import type { Metadata, Viewport } from 'next';
import { DM_Sans, JetBrains_Mono, Orbitron } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Navigation from '@/components/Navigation';
import AuthProvider from '@/components/AuthProvider';
import SubscriptionProvider from '@/components/SubscriptionProvider';
import DataInitializer from '@/components/DataInitializer';
import MobileTabBar from '@/components/mobile/MobileTabBar';
import StructuredData from '@/components/StructuredData';
import dynamic from 'next/dynamic';
import { SITE_STATS } from '@/lib/site-stats';
import { INLINE_SCRIPTS } from '@/lib/csp';
// Starfield removed in V2 redesign — true black background needs no decoration
const Footer = dynamic(() => import('@/components/Footer'), { ssr: false });
const SearchCommandPalette = dynamic(() => import('@/components/SearchCommandPalette'), { ssr: false });
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
const CookieConsent = dynamic(() => import('@/components/ui/CookieConsent'), { ssr: false });
const PWAInstallPrompt = dynamic(() => import('@/components/PWAInstallPrompt'), { ssr: false });
const InstallPrompt = dynamic(() => import('@/components/InstallPrompt'), { ssr: false });
const IOSInstallPrompt = dynamic(() => import('@/components/mobile/IOSInstallPrompt'), { ssr: false });
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import ToastContainer from '@/components/ui/Toast';
import NavigationProgress from '@/components/ui/NavigationProgress';
const KeyboardShortcutsModal = dynamic(() => import('@/components/ui/KeyboardShortcutsModal'), { ssr: false });
const PageTracker = dynamic(() => import('@/components/PageTracker'), { ssr: false });
import PageTransitionProvider from '@/components/mobile/PageTransitionProvider';
import OfflineIndicator from '@/components/ui/OfflineIndicator';
// Changelog modal removed — no longer shown on visit
const NpsSurvey = dynamic(() => import('@/components/ui/NpsSurvey'), { ssr: false });
const ExitIntentPopup = dynamic(() => import('@/components/marketing/ExitIntentPopup'), { ssr: false });
const QuickStartGuide = dynamic(() => import('@/components/onboarding/QuickStartGuide'), { ssr: false });
const LiveNowBanner = dynamic(() => import('@/components/livestreams/LiveNowBanner'), { ssr: false });
const TrialCountdownBanner = dynamic(() => import('@/components/billing/TrialCountdownBanner'), {
  ssr: false,
});
const OnboardingTour = dynamic(() => import('@/components/ui/OnboardingTour'), { ssr: false });
const PushOptInBanner = dynamic(() => import('@/components/mobile/PushOptInBanner'), { ssr: false });
const WhatsNew = dynamic(() => import('@/components/mobile/WhatsNew').then(m => ({ default: m.default })), { ssr: false });
const ReferralPrompt = dynamic(() => import('@/components/marketing/ReferralPrompt'), { ssr: false });
const AppRatingPrompt = dynamic(() => import('@/components/mobile/AppRatingPrompt'), { ssr: false });
const AndroidInstallBanner = dynamic(() => import('@/components/mobile/AndroidInstallBanner'), { ssr: false });
const UsageLimitBanner = dynamic(() => import('@/components/marketing/UsageLimitBanner'), { ssr: false });
const StreakNotification = dynamic(() => import('@/components/marketing/StreakNotification'), { ssr: false });
const HelpButton = dynamic(() => import('@/components/HelpButton'), { ssr: false });
// FeedbackButton removed — replaced with /feedback page to avoid blocking left nav
const FeedbackWidget = dynamic(() => import('@/components/FeedbackWidget'), { ssr: false });
const FeedbackTab = dynamic(() => import('@/components/FeedbackTab'), { ssr: false });
const BackToTop = dynamic(() => import('@/components/ui/BackToTop'), { ssr: false });
const ScrollProgress = dynamic(() => import('@/components/ui/ScrollProgress'), { ssr: false });
const WebVitals = dynamic(() => import('@/components/analytics/WebVitals'), { ssr: false });
const ErrorReporter = dynamic(() => import('@/components/ErrorReporter'), { ssr: false });
import AutoBreadcrumb from '@/components/ui/AutoBreadcrumb';
import LiveRail from '@/components/LiveRail';

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});
// HUD display face — used for Space Tycoon readouts, tab labels, section
// headings. Intentionally scoped via a CSS variable so it doesn't leak onto
// the rest of the marketing site.
const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-hud',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://spacenexus.us'),
  title: {
    template: '%s | SpaceNexus',
    default: 'SpaceNexus - Space Industry Intelligence Platform',
  },
  description: `SpaceNexus — Space industry intelligence platform. Track satellites, monitor launches, analyze space stocks, and access ${SITE_STATS.companies} company profiles. Free to start.`,
  keywords: [
    'space industry',
    'space intelligence',
    'space industry intelligence',
    'space market intelligence',
    'space market data',
    'space investor tools',
    'satellite tracking',
    'satellite companies',
    'launch vehicles',
    'space economy',
    'space startup funding',
    'space industry market size',
    'space companies',
    'space companies list',
    'space mining',
    'asteroid mining',
    'space business',
    'space business opportunities',
    'orbital mechanics',
    'space procurement',
    'rocket launches',
    'rocket launch schedule',
    'aerospace',
    'aerospace companies',
    'space grants',
    'space weather',
    'satellite internet',
    'space defense',
    'space stations',
    'SpaceX',
    'Starlink',
    'space tycoon game',
    'space news',
    'nasa',
    'artemis',
    'blue origin',
    'rocket lab',
  ],
  authors: [{ name: 'SpaceNexus LLC' }],
  creator: 'SpaceNexus LLC',
  publisher: 'SpaceNexus LLC',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://spacenexus.us',
    siteName: 'SpaceNexus',
    title: 'SpaceNexus \u2014 Space Industry Intelligence Platform',
    description: `Track satellites, monitor launches, analyze space markets, and access ${SITE_STATS.companies} company profiles. The all-in-one intelligence platform for space industry professionals, investors, and engineers.`,
    images: [
      {
        url: '/api/og?title=SpaceNexus&subtitle=Space%20Industry%20Intelligence',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus \u2014 Space Industry Intelligence Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus \u2014 Space Industry Intelligence Platform',
    description: `Track satellites, monitor launches, analyze space markets, and access ${SITE_STATS.companies} company profiles. The all-in-one intelligence platform for space industry professionals, investors, and engineers.`,
    images: ['/api/og?title=SpaceNexus&subtitle=Space%20Industry%20Intelligence'],
    creator: '@spacenexus',
    site: '@spacenexus',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#6366f1' },
    ],
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: 'https://spacenexus.us',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: {
      ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
        ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
        : {}),
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#000000' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="dark light" />
        <link rel="preconnect" href="https://ll.thespacedevs.com" />
        <link rel="dns-prefetch" href="https://ll.thespacedevs.com" />
        <link rel="preconnect" href="https://celestrak.org" />
        <link rel="dns-prefetch" href="https://celestrak.org" />
        <link rel="preconnect" href="https://images2.imgbox.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images2.imgbox.com" />
        <link rel="preconnect" href="https://www.googleapis.com" />
        <link rel="dns-prefetch" href="https://www.googleapis.com" />
        <link rel="preconnect" href="https://api.spacexdata.com" />
        <link rel="dns-prefetch" href="https://api.spacexdata.com" />
        <link rel="preconnect" href="https://eonet.gsfc.nasa.gov" />
        <link rel="dns-prefetch" href="https://eonet.gsfc.nasa.gov" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://api.nasa.gov" />
        <link rel="dns-prefetch" href="https://api.nasa.gov" />
        <link rel="preconnect" href="https://services.swpc.noaa.gov" />
        <link rel="dns-prefetch" href="https://services.swpc.noaa.gov" />
        <link rel="alternate" hrefLang="en" href="https://spacenexus.us" />
        <link rel="alternate" hrefLang="x-default" href="https://spacenexus.us" />
        <StructuredData />
        {/* Inline service worker registration for PWA crawlers (PWABuilder, Lighthouse) */}
        {/* The full SW lifecycle management is in ServiceWorkerRegistration component */}
        {/*
          CSP (src/lib/csp.ts): these two inline scripts are allow-listed by
          SHA-256 hash, and the strings MUST be rendered byte-for-byte from
          INLINE_SCRIPTS or the hash no longer matches. They are deliberately
          not nonced: reading headers() here would opt every prerendered and
          ISR route (600+) out of static rendering. Next stamps the request
          nonce on its own scripts and on next/script tags by itself.
        */}
        <script dangerouslySetInnerHTML={{ __html: INLINE_SCRIPTS.oledTheme }} />
        {process.env.NODE_ENV === 'production' && (
          <script dangerouslySetInnerHTML={{ __html: INLINE_SCRIPTS.swRegister }} />
        )}
        {/* Smart App Banners — uncomment when native apps are published */}
        {/* PWA Meta Tags for iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SpaceNexus" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="SpaceNexus" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        {/* iOS splash screen / startup images */}
        <meta name="apple-touch-fullscreen" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-167x167.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        {/* Google Analytics 4 — respects cookie consent preferences */}
        <GoogleAnalytics
          measurementId="G-6N63DLGQMJ"
          enabled={true}
        />
        {/* Preload critical fonts for LCP */}
      </head>
      <body className={`${dmSans.variable} ${jetbrainsMono.variable} ${orbitron.variable} ${dmSans.className}`}>
        {/* Google AdSense — lazyOnload prevents blocking LCP/INP */}
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
          <Script
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
            strategy="lazyOnload"
            crossOrigin="anonymous"
          />
        )}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-lg focus:outline-none">
          Skip to main content
        </a>
        <NavigationProgress />
        <OfflineIndicator />
        <AuthProvider>
          <SubscriptionProvider>
            <DataInitializer />
            <div className="relative z-10 min-h-screen flex flex-col">
              <LiveNowBanner />
              <LiveRail />
              <Navigation />
              <main id="main-content" className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-0" tabIndex={-1}>
                <AutoBreadcrumb />
                <TrialCountdownBanner />
                <PageTransitionProvider>
                  {children}
                </PageTransitionProvider>
              </main>
              <Footer />
              <MobileTabBar />
              <SearchCommandPalette />
              <CookieConsent />
              <PWAInstallPrompt />
              <ServiceWorkerRegistration />
              <ToastContainer />
              {/* ChangelogModal removed */}
              <NpsSurvey />
              <OnboardingTour />
              <PageTracker />
              <KeyboardShortcutsModal />
              <WebVitals />
              <InstallPrompt />
              <IOSInstallPrompt />
              <AndroidInstallBanner />
              <PushOptInBanner />
              <WhatsNew />
              <ReferralPrompt />
              <AppRatingPrompt />
              <ErrorReporter />
              <UsageLimitBanner />
              <StreakNotification />
              <HelpButton />
              <BackToTop />
              <ScrollProgress />
              <ExitIntentPopup />
              <QuickStartGuide />
              <FeedbackWidget />
              <FeedbackTab />
            </div>
          </SubscriptionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
