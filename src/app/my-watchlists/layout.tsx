import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Watchlists | SpaceNexus',
  description:
    'Track your favorite satellites, companies, launches, and space events with personalized watchlists on SpaceNexus.',
  keywords: [
    'satellite watchlist',
    'space company tracking',
    'launch tracking',
    'space event alerts',
  ],
  openGraph: {
    title: 'My Watchlists | SpaceNexus',
    description:
      'Track your favorite satellites, companies, launches, and space events with personalized watchlists on SpaceNexus.',
    type: 'website',
    url: 'https://spacenexus.us/my-watchlists',
    siteName: 'SpaceNexus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My Watchlists | SpaceNexus',
    description:
      'Track your favorite satellites, companies, launches, and space events with personalized watchlists on SpaceNexus.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/my-watchlists',
  },
};

export default function MyWatchlistsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
