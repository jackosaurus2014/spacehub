import type { Metadata } from 'next';

export const metadata: Metadata = {
  description: 'What happened in space on this day? Historical space events, launches, and milestones throughout history.',
  alternates: {
    canonical: 'https://spacenexus.us/this-day-in-space',
  },
  openGraph: {
    title: 'This Day in Space History | SpaceNexus',
    description: 'Discover what happened in space history on this day. Major launches, discoveries, milestones, and achievements throughout the history of spaceflight.',
    images: [{ url: '/api/og?title=This+Day+in+Space&type=data', width: 1200, height: 630, alt: 'This Day in Space' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'This Day in Space History | SpaceNexus',
    description: 'Discover what happened in space history on this day. Major launches, discoveries, milestones, and achievements throughout the history of spaceflight.',
    images: ['/api/og?title=This+Day+in+Space&type=data'],
  },
};

export default function ThisDayInSpaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
