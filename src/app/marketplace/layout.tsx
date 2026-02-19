import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Marketplace - Products & Services',
  description: 'Buy and sell space industry products and services. Find launch slots, satellite components, ground station time, engineering services, and more. Post RFQs and connect with verified providers.',
  keywords: ['space marketplace', 'satellite parts', 'launch services', 'space procurement', 'space industry suppliers'],
  openGraph: {
    title: 'SpaceNexus Marketplace - Space Industry Products & Services',
    description: 'The B2B marketplace for the space industry. Find launch services, satellite components, and engineering providers.',
    url: 'https://spacenexus.us/marketplace',
    images: [
      {
        url: '/og-marketplace.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Marketplace - B2B Space Industry Products & Services',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus Marketplace - Space Industry Products & Services',
    description: 'The B2B marketplace for the space industry. Find launch services, satellite components, and engineering providers.',
    images: ['/og-marketplace.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/marketplace',
  },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
