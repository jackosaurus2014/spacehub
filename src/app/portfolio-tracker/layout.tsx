import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Investment Portfolio Tracker | SpaceNexus',
  description: 'Track space industry stocks, market caps, and investment theses. Monitor 20+ publicly traded space companies and sector performance.',
  keywords: ['space stocks', 'space investment', 'space portfolio tracker', 'space industry stocks', 'space market cap', 'space SPACs', 'space IPOs'],
  openGraph: {
    title: 'SpaceNexus - Space Investment Portfolio Tracker',
    description: 'Track space industry stocks, market caps, and investment theses. Monitor 20+ publicly traded space companies and sector performance.',
    url: 'https://spacenexus.us/portfolio-tracker',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus - Space Investment Portfolio Tracker',
    description: 'Track space industry stocks, market caps, and investment theses. Monitor 20+ publicly traded space companies and sector performance.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/portfolio-tracker',
  },
};

export default function PortfolioTrackerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
