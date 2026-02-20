import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Smart Alert System',
  description: 'Set up custom alerts for launches, contract awards, solar storms, conjunction events, and market movements. Get notified by email or in-app when it matters.',
  keywords: [
    'space alerts',
    'launch alert',
    'conjunction alert',
    'solar storm alert',
    'space notifications',
  ],
  openGraph: {
    title: 'Smart Alert System | SpaceNexus',
    description: 'Set up custom alerts for launches, contract awards, solar storms, conjunction events, and market movements. Get notified by email or in-app when it matters.',
    url: 'https://spacenexus.us/alerts',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Smart Alert System | SpaceNexus',
    description: 'Set up custom alerts for launches, contract awards, solar storms, conjunction events, and market movements. Get notified by email or in-app when it matters.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/alerts',
  },
};

export default function AlertsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
