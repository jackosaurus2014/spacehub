import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Weekly Intelligence Brief Archive - Space Industry Newsletter | SpaceNexus',
  description:
    'Every edition of the SpaceNexus Weekly Intelligence Brief. Curated space industry analysis covering funding rounds, launches, regulatory changes, market moves, and executive developments.',
  keywords: [
    'space industry newsletter',
    'space intelligence brief',
    'weekly space report',
    'space industry analysis',
    'space funding roundup',
    'launch schedule newsletter',
    'space market intelligence',
    'SpaceNexus newsletter',
    'aerospace industry newsletter',
    'space industry weekly',
  ],
  openGraph: {
    title: 'Weekly Intelligence Brief Archive | SpaceNexus',
    description:
      'Every edition of the SpaceNexus Weekly Intelligence Brief. Funding rounds, launches, regulatory updates, and market analysis for the space industry.',
    type: 'website',
    url: 'https://spacenexus.us/newsletter-archive',
    siteName: 'SpaceNexus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Weekly Intelligence Brief Archive | SpaceNexus',
    description:
      'Every edition of the SpaceNexus Weekly Intelligence Brief. Funding rounds, launches, regulatory updates, and market analysis.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/newsletter-archive',
  },
};

export default function NewsletterArchiveLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
