import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Space Industry Insights',
  description: 'AI-powered analysis of space industry trends. Regulatory changes, market shifts, technology breakthroughs, and geopolitical developments distilled by AI.',
  keywords: [
    'AI space analysis',
    'space industry AI',
    'market intelligence AI',
    'space trends AI',
  ],
  openGraph: {
    title: 'AI Space Industry Insights | SpaceNexus',
    description: 'AI-powered analysis of space industry trends. Regulatory changes, market shifts, technology breakthroughs, and geopolitical developments distilled by AI.',
    url: 'https://spacenexus.us/ai-insights',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SpaceNexus' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Space Industry Insights | SpaceNexus',
    description: 'AI-powered analysis of space industry trends. Regulatory changes, market shifts, technology breakthroughs, and geopolitical developments distilled by AI.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/ai-insights',
  },
};

export default function AIInsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
