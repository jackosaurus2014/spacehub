import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Funding & Investment Flow Tracker',
  description:
    'Track space industry investment flows -- funding rounds, M&A exits, top investors, and capital allocation by sector and stage.',
  openGraph: {
    title: 'Funding & Investment Flow Tracker | SpaceNexus',
    description:
      'Track space industry investment flows -- funding rounds, M&A exits, top investors, and capital allocation by sector and stage.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Funding & Investment Flow Tracker | SpaceNexus',
    description:
      'Track space industry investment flows -- funding rounds, M&A exits, top investors, and capital allocation by sector and stage.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/investment-tracker',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
