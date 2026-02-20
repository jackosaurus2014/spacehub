import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Resource Exchange',
  description: 'Browse and list space industry resources for trade. Satellite capacity, ground station time, launch rideshare slots, and orbital transfer vehicle services.',
  keywords: [
    'space resource exchange',
    'satellite capacity',
    'launch rideshare',
    'ground station time',
    'space services',
  ],
  openGraph: {
    title: 'Space Resource Exchange | SpaceNexus',
    description: 'Browse and list space industry resources for trade.',
    url: 'https://spacenexus.us/resource-exchange',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Resource Exchange | SpaceNexus',
    description: 'Browse and list space industry resources for trade.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/resource-exchange',
  },
};

export default function ResourceExchangeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
