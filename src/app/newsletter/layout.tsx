import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Newsletter | SpaceNexus Weekly Intelligence Brief',
  description: 'Free weekly space industry newsletter with top stories, market movers, launch schedules, and regulatory updates. Join space professionals who stay informed with SpaceNexus.',
  keywords: ['space newsletter', 'space industry newsletter', 'space news email', 'weekly space brief', 'space intelligence brief', 'SpaceNexus newsletter'],
  openGraph: {
    title: 'The SpaceNexus Weekly Intelligence Brief',
    description: 'Free weekly space industry insights delivered to your inbox. Top stories, market movers, launch schedules, and regulatory updates.',
    type: 'website',
    url: 'https://spacenexus.us/newsletter',
  },
  alternates: {
    canonical: 'https://spacenexus.us/newsletter',
  },
};

export default function NewsletterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
