import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Choose your SpaceNexus subscription plan. Get unlimited access to space industry intelligence, real-time stock tracking, AI-powered insights, and business opportunities.',
  keywords: [
    'SpaceNexus pricing',
    'space data subscription',
    'space industry intelligence',
    'space analytics pricing',
    'aerospace data plans',
    'space market data',
    'satellite tracking subscription',
    'launch data api',
  ],
  openGraph: {
    type: 'website',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'Pricing | SpaceNexus',
    description: 'Choose your subscription plan for unlimited space industry intelligence.',
    url: 'https://spacenexus.us/pricing',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Pricing - Subscription Plans',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'Pricing | SpaceNexus',
    description: 'Choose your subscription plan for unlimited space industry intelligence.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/pricing',
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Google Ads Conversion Tracking
          Replace AW-XXXXXXXXX with your Google Ads conversion ID.
          <script async src="https://www.googletagmanager.com/gtag/js?id=AW-XXXXXXXXX" />
          <script dangerouslySetInnerHTML={{ __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('config', 'AW-XXXXXXXXX');
          `}} />
      */}

      {/* LinkedIn Insight Tag
          Replace PARTNER_ID with your LinkedIn partner ID.
          <script dangerouslySetInnerHTML={{ __html: `
            _linkedin_partner_id = "PARTNER_ID";
            window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
            window._linkedin_data_partner_ids.push(_linkedin_partner_id);
            (function(l) { ... })(window.lintrk);
          `}} />
          <noscript>
            <img height="1" width="1" style={{ display: 'none' }} alt=""
              src="https://px.ads.linkedin.com/collect/?pid=PARTNER_ID&fmt=gif" />
          </noscript>
      */}

      {children}
    </>
  );
}
