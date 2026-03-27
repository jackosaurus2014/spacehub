import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Intelligence Briefs',
  description: 'AI-generated analysis of space industry trends, company developments, market movements, and regulatory changes.',
  openGraph: {
    title: 'AI Insights | SpaceNexus',
    description: 'AI-generated analysis of space industry trends, company developments, market movements, and regulatory changes.',
    images: [{ url: '/api/og?title=AI+Insights&type=data', width: 1200, height: 630, alt: 'AI Insights' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Insights | SpaceNexus',
    description: 'AI-generated analysis of space industry trends, company developments, market movements, and regulatory changes.',
    images: ['/api/og?title=AI+Insights&type=data'],
  },
};

export default function AIInsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
