import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Daily Space Digest - Top Stories & Headlines',
  description:
    'Your daily curated summary of the most important space industry news, launches, funding rounds, and policy updates. Email-friendly format.',
  keywords: [
    'daily space news',
    'space news digest',
    'space industry summary',
    'space newsletter',
    'space headlines today',
  ],
  openGraph: {
    title: 'Daily Space Digest | SpaceNexus',
    description:
      'Your daily curated summary of the most important space industry news, launches, funding rounds, and policy updates.',
    type: 'website',
    url: 'https://spacenexus.us/daily-digest',
    siteName: 'SpaceNexus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Daily Space Digest | SpaceNexus',
    description:
      'Your daily curated summary of the most important space industry news, launches, funding rounds, and policy updates.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/daily-digest',
  },
};

export default function DailyDigestLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
