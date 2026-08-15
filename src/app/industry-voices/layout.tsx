import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Industry Voices',
  description: 'Curated third-party expert blogs covering the space industry — analysis, news, and insights from consultants, lawyers, investors, and engineers. Coverage of launches, satellite technology, space economy, regulatory developments, and market trends.',
  keywords: ['space industry blog', 'aerospace analysis', 'space news analysis', 'satellite industry insights', 'space economy articles'],
  openGraph: {
    title: 'Industry Voices - Curated Space Industry Analysis & Insights',
    description: 'Curated third-party expert blogs covering the space industry, aggregated from SpaceNexus.',
    url: 'https://spacenexus.us/industry-voices',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Industry Voices - Curated Space Industry Analysis & Insights',
    description: 'Curated third-party expert blogs covering the space industry, aggregated from SpaceNexus.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/industry-voices',
  },
};

export default function IndustryVoicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
