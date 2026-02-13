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
    title: 'Pricing | SpaceNexus',
    description: 'Choose your subscription plan for unlimited space industry intelligence.',
    url: 'https://spacenexus.us/pricing',
    images: [
      {
        url: '/og-pricing.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Pricing - Subscription Plans',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing | SpaceNexus',
    description: 'Choose your subscription plan for unlimited space industry intelligence.',
    images: ['/og-pricing.png'],
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
  return children;
}
