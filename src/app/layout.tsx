import type { Metadata, Viewport } from 'next';
import { Inter, Orbitron } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import AuthProvider from '@/components/AuthProvider';
import SubscriptionProvider from '@/components/SubscriptionProvider';
import DataInitializer from '@/components/DataInitializer';
import MobileTabBar from '@/components/mobile/MobileTabBar';
import StructuredData from '@/components/StructuredData';
import dynamic from 'next/dynamic';
// Starfield removed in V2 redesign — true black background needs no decoration
const Footer = dynamic(() => import('@/components/Footer'), { ssr: false });
const QuickAccessSidebar = dynamic(() => import('@/components/QuickAccessSidebar'), { ssr: false });
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
const AnnouncementBanner = dynamic(() => import('@/components/AnnouncementBanner'), { ssr: false });
const TrialBanner = dynamic(() => import('@/components/TrialBanner'), { ssr: false });
const TrialCountdownBanner = dynamic(() => import('@/components/billing/TrialCountdownBanner'), {
  ssr: false,
});
const OnboardingTour = dynamic(() => import('@/components/ui/OnboardingTour'), { ssr: false });
const SwipeModuleNavigation = dynamic(() => import('@/components/mobile/SwipeModuleNavigation'), { ssr: false });
const PushOptInBanner = dynamic(() => import('@/components/mobile/PushOptInBanner'), { ssr: false });
const WhatsNew = dynamic(() => import('@/components/mobile/WhatsNew').then(m => ({ default: m.default })), { ssr: false });
const ReferralPrompt = dynamic(() => import('@/components/marketing/ReferralPrompt'), { ssr: false });
const AppRatingPrompt = dynamic(() => import('@/components/mobile/AppRatingPrompt'), { ssr: false });
const AndroidInstallBanner = dynamic(() => import('@/components/mobile/AndroidInstallBanner'), { ssr: false });
const MobileSocialProofBar = dynamic(() => import('@/components/marketing/MobileSocialProofBar'), { ssr: false });
const HelpButton = dynamic(() => import('@/components/HelpButton'), { ssr: false });
const FeedbackButton = dynamic(() => import('@/components/FeedbackButton'), { ssr: false });
const BackToTop = dynamic(() => import('@/components/ui/BackToTop'), { ssr: false });
const ScrollProgress = dynamic(() => import('@/components/ui/ScrollProgress'), { ssr: false });
const WebVitals = dynamic(() => import('@/components/analytics/WebVitals'), { ssr: false });
const ErrorReporter = dynamic(() => import('@/components/ErrorReporter'), { ssr: false });
import ModuleNavBar from '@/components/ModuleNavBar';
import AutoBreadcrumb from '@/components/ui/AutoBreadcrumb';

const inter = Inter({ subsets: ['latin'], display: 'swap' });
const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron', display: 'optional' });

export const metadata: Metadata = {
  metadataBase: new URL('https://spacenexus.us'),
  title: {
    template: '%s | SpaceNexus',
    default: 'SpaceNexus - Space Industry Intelligence Platform',
  },
  description: 'SpaceNexus — Space industry intelligence platform. Track satellites, monitor launches, analyze space stocks, and access 200+ company profiles. Free to start.',
  keywords: [
    'space industry',
    'space intelligence',
    'space industry intelligence',
    'space market intelligence',
    'space market data',
    'space investor tools',
    'satellite tracking',
    'launch vehicles',
    'space economy',
    'space startup funding',
    'space industry market size',
    'space companies',
    'orbital mechanics',
    'space procurement',
    'rocket launches',
    'aerospace',
    'space grants',
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
    description: 'Track satellites, monitor launches, analyze space markets, and access 200+ company profiles. The all-in-one intelligence platform for space industry professionals, investors, and engineers.',
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
    description: 'Track satellites, monitor launches, analyze space markets, and access 200+ company profiles. The all-in-one intelligence platform for space industry professionals, investors, and engineers.',
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
        <link rel="alternate" hrefLang="en" href="https://spacenexus.us" />
        <link rel="alternate" hrefLang="x-default" href="https://spacenexus.us" />
        <StructuredData />
        {/* Inline service worker registration for PWA crawlers (PWABuilder, Lighthouse) */}
        {/* The full SW lifecycle management is in ServiceWorkerRegistration component */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('spacenexus-oled')==='true')document.documentElement.classList.add('oled')}catch(e){}` }} />
        <script dangerouslySetInnerHTML={{ __html: `
          if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js',{scope:'/'})}
        `}} />
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
        {/* Google AdSense — loaded only when NEXT_PUBLIC_ADSENSE_CLIENT_ID is set */}
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className={inter.className}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-lg focus:outline-none">
          Skip to main content
        </a>
        <NavigationProgress />
        <MobileSocialProofBar />
        <OfflineIndicator />
        <AuthProvider>
          <SubscriptionProvider>
            <DataInitializer />
            <div className="relative z-10 min-h-screen flex flex-col">
              <TrialBanner />
              <AnnouncementBanner />
              <Navigation />
              <QuickAccessSidebar />
              <main id="main-content" className="flex-1 lg:pl-16 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-0" tabIndex={-1}>
                <ModuleNavBar />
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
              <SwipeModuleNavigation />
              <WebVitals />
              <InstallPrompt />
              <IOSInstallPrompt />
              <AndroidInstallBanner />
              <PushOptInBanner />
              <WhatsNew />
              <ReferralPrompt />
              <AppRatingPrompt />
              <ErrorReporter />
              <FeedbackButton />
              <HelpButton />
              <BackToTop />
              <ScrollProgress />
              <ExitIntentPopup />
              <QuickStartGuide />
            </div>
          </SubscriptionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
