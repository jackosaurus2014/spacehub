import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Advertiser Dashboard',
  description: 'Manage your advertising campaigns on SpaceNexus. Track impressions, clicks, and performance metrics for your space industry ads.',
  openGraph: {
    title: 'Advertiser Dashboard | SpaceNexus',
    description: 'Manage your advertising campaigns on SpaceNexus. Track impressions, clicks, and performance metrics for your space industry ads.',
  },
};

export default function AdvertiseDashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
