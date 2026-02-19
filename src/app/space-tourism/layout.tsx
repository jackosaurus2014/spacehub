import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Tourism - Compare Commercial Space Experiences',
  description: 'Compare commercial space tourism offerings from Virgin Galactic, Blue Origin, SpaceX, and more. Explore suborbital flights, orbital stays, and lunar missions with pricing, training, and booking details.',
  keywords: ['space tourism', 'Virgin Galactic', 'Blue Origin tourism', 'SpaceX Polaris', 'commercial spaceflight', 'suborbital flight', 'space hotel'],
  openGraph: {
    title: 'Space Tourism | SpaceNexus',
    description: 'Compare commercial space tourism experiences — suborbital flights, orbital stays, and lunar missions.',
    url: 'https://spacenexus.us/space-tourism',
    images: [
      {
        url: '/og-tourism.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Space Tourism - Compare Commercial Space Experiences',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Tourism | SpaceNexus',
    description: 'Compare commercial space tourism experiences — suborbital flights, orbital stays, and lunar missions.',
    images: ['/og-tourism.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-tourism',
  },
};

export default function SpaceTourismLayout({ children }: { children: React.ReactNode }) {
  return children;
}
