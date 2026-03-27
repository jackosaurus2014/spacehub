import type { Metadata } from 'next';

export const metadata: Metadata = {
  description: 'Discover the space industry with SpaceNexus. Explore satellites, launches, companies, and market intelligence.',
  alternates: {
    canonical: 'https://spacenexus.us/discover',
  },
  openGraph: {
    title: 'Discover SpaceNexus',
    description: 'Explore everything SpaceNexus has to offer. Find the right tools, data, and content for your role in the space industry.',
    images: [{ url: '/api/og?title=Discover+Space&type=data', width: 1200, height: 630, alt: 'Discover Space' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discover SpaceNexus',
    description: 'Explore everything SpaceNexus has to offer. Find the right tools, data, and content for your role in the space industry.',
    images: ['/api/og?title=Discover+Space&type=data'],
  },
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
