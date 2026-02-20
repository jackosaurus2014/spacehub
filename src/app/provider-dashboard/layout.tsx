import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Provider Dashboard | SpaceNexus',
  description:
    'Manage your service listings, view analytics, respond to RFQs, and track your marketplace performance on SpaceNexus.',
  keywords: [
    'space service provider',
    'marketplace dashboard',
    'RFQ management',
    'space service listings',
  ],
  openGraph: {
    title: 'Provider Dashboard | SpaceNexus',
    description:
      'Manage your service listings, view analytics, respond to RFQs, and track your marketplace performance on SpaceNexus.',
    type: 'website',
    url: 'https://spacenexus.us/provider-dashboard',
    siteName: 'SpaceNexus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Provider Dashboard | SpaceNexus',
    description:
      'Manage your service listings, view analytics, respond to RFQs, and track your marketplace performance on SpaceNexus.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/provider-dashboard',
  },
};

export default function ProviderDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
