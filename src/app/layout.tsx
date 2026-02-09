import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import Starfield from '@/components/Starfield';
import AuthProvider from '@/components/AuthProvider';
import SubscriptionProvider from '@/components/SubscriptionProvider';
import DataInitializer from '@/components/DataInitializer';
import Footer from '@/components/Footer';
import QuickAccessSidebar from '@/components/QuickAccessSidebar';
import MobileTabBar from '@/components/mobile/MobileTabBar';
import StructuredData from '@/components/StructuredData';
import SearchCommandPalette from '@/components/SearchCommandPalette';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import CookieConsent from '@/components/analytics/CookieConsent';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import ToastContainer from '@/components/ui/Toast';
import NavigationProgress from '@/components/ui/NavigationProgress';
import KeyboardShortcutsModal from '@/components/ui/KeyboardShortcutsModal';
import PageTracker from '@/components/PageTracker';
import SwipeModuleNavigation from '@/components/mobile/SwipeModuleNavigation';
import PageTransitionProvider from '@/components/mobile/PageTransitionProvider';
import OfflineIndicator from '@/components/ui/OfflineIndicator';
import ModuleNavBar from '@/components/ModuleNavBar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://spacenexus.com'),
  title: {
    template: 'SpaceNexus | %s',
    default: 'SpaceNexus - Space Industry Intelligence Platform',
  },
  description: 'Your comprehensive gateway to space industry intelligence. Track launches, market data, solar activity, orbital slots, and discover business opportunities in the space economy.',
  keywords: [
    'space industry',
    'space news',
    'rocket launches',
    'satellite tracking',
    'space market intelligence',
    'solar flares',
    'orbital slots',
    'space companies',
    'space economy',
    'aerospace',
  ],
  authors: [{ name: 'SpaceNexus Team' }],
  creator: 'SpaceNexus',
  publisher: 'SpaceNexus',
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
    url: 'https://spacenexus.com',
    siteName: 'SpaceNexus',
    title: 'SpaceNexus - Space Industry Intelligence Platform',
    description: 'Your comprehensive gateway to space industry intelligence. Track launches, market data, solar activity, and discover business opportunities.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus - Space Industry Intelligence Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus - Space Industry Intelligence Platform',
    description: 'Your comprehensive gateway to space industry intelligence. Track launches, market data, solar activity, and discover business opportunities.',
    images: ['/og-image.png'],
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
    canonical: 'https://spacenexus.com',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
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
        <StructuredData />
        {/* PWA Meta Tags for iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SpaceNexus" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="SpaceNexus" />
        <meta name="msapplication-TileColor" content="#0f172a" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        {/* iOS splash screen / startup images */}
        <meta name="apple-touch-fullscreen" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-167x167.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        {/* Google Analytics 4
            To enable analytics:
            1. Replace GA_MEASUREMENT_ID with your actual Measurement ID (G-XXXXXXXXXX)
            2. Set enabled={true} or use: enabled={process.env.NODE_ENV === 'production'}
            Analytics respects user cookie consent preferences.
        */}
        <GoogleAnalytics
          measurementId="GA_MEASUREMENT_ID"
          enabled={false}
        />
        {/* Google AdSense Script
            Uncomment the following script tag once your AdSense account is approved
            and replace ca-pub-XXXXXXXXXXXXXXXXX with your actual publisher ID.
            See public/AD_SETUP_GUIDE.md for detailed setup instructions.
        */}
        {/* <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXXX"
          crossOrigin="anonymous"
        /> */}
      </head>
      <body className={inter.className}>
        {/* Skip to content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-cyan-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          Skip to main content
        </a>
        <NavigationProgress />
        <OfflineIndicator />
        <AuthProvider>
          <SubscriptionProvider>
            <DataInitializer />
            <Starfield />
            <div className="relative z-10 min-h-screen flex flex-col">
              <Navigation />
              <QuickAccessSidebar />
              <main id="main-content" className="flex-1 lg:pl-16 pb-16 lg:pb-0" tabIndex={-1}>
                <ModuleNavBar />
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
              <PageTracker />
              <KeyboardShortcutsModal />
              <SwipeModuleNavigation />
            </div>
          </SubscriptionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
