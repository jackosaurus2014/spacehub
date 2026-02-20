import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | SpaceNexus Dashboard',
    default: 'Dashboard | SpaceNexus',
  },
  description:
    'Your personalized SpaceNexus dashboard with custom widgets, alerts, and real-time space industry data.',
  keywords: [
    'space dashboard',
    'custom dashboard',
    'space data widgets',
    'space industry monitoring',
  ],
  openGraph: {
    title: 'Dashboard | SpaceNexus',
    description:
      'Your personalized SpaceNexus dashboard with custom widgets, alerts, and real-time space industry data.',
    type: 'website',
    url: 'https://spacenexus.us/dashboard',
    siteName: 'SpaceNexus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dashboard | SpaceNexus',
    description:
      'Your personalized SpaceNexus dashboard with custom widgets, alerts, and real-time space industry data.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/dashboard',
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
