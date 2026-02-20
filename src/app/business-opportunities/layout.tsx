import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Business Opportunities',
  description: 'Discover business opportunities in the space economy. Government contracts, supply chain openings, partnership leads, and market entry strategies for aerospace.',
  keywords: [
    'space business opportunities',
    'aerospace contracts',
    'space industry partnerships',
    'space economy business',
    'commercial space',
  ],
  openGraph: {
    title: 'Space Business Opportunities | SpaceNexus',
    description: 'Discover business opportunities in the space economy with contracts, partnerships, and market strategies.',
    url: 'https://spacenexus.us/business-opportunities',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Business Opportunities | SpaceNexus',
    description: 'Discover business opportunities in the space economy with contracts, partnerships, and market strategies.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/business-opportunities',
  },
};

export default function BusinessOpportunitiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
