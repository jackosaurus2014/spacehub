import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Getting Started | SpaceNexus',
  description: 'Get started with SpaceNexus in minutes. Learn how to explore space market intelligence, track satellites, analyze company data, and use our engineering tools.',
  openGraph: {
    title: 'Getting Started | SpaceNexus',
    description: 'Get started with SpaceNexus in minutes — your space industry intelligence platform.',
    url: 'https://spacenexus.us/getting-started',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Getting Started | SpaceNexus',
    description: 'Get started with SpaceNexus in minutes.',
  },
  alternates: { canonical: 'https://spacenexus.us/getting-started' },
};

export default function GettingStartedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
