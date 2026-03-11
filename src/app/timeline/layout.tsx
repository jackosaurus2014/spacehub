import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Timeline',
  description: 'Interactive timeline of major milestones in space exploration from Sputnik to present-day commercial space.',
  openGraph: {
    title: 'Space Industry Timeline | SpaceNexus',
    description: 'Interactive timeline of major milestones in space exploration from Sputnik to present-day commercial space.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Timeline | SpaceNexus',
    description: 'Interactive timeline of major milestones in space exploration from Sputnik to present-day commercial space.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/timeline',
  },
};

export default function TimelineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
