import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Marketplace AI Copilot | SpaceNexus',
  description:
    'AI-powered procurement assistant for the space industry. Describe your needs and get matched with qualified service providers instantly.',
  keywords: [
    'space procurement AI',
    'marketplace copilot',
    'space service matching',
    'AI procurement assistant',
  ],
  openGraph: {
    title: 'Marketplace AI Copilot | SpaceNexus',
    description:
      'AI-powered procurement assistant for the space industry. Describe your needs and get matched with qualified service providers instantly.',
    type: 'website',
    url: 'https://spacenexus.us/marketplace/copilot',
    siteName: 'SpaceNexus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marketplace AI Copilot | SpaceNexus',
    description:
      'AI-powered procurement assistant for the space industry. Describe your needs and get matched with qualified service providers instantly.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/marketplace/copilot',
  },
};

export default function MarketplaceCopilotLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
