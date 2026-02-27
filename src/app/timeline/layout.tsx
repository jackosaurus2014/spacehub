import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Timeline | SpaceNexus',
  description: 'Interactive timeline of major milestones in space exploration from Sputnik to present-day commercial space.',
  openGraph: {
    title: 'Space Industry Timeline | SpaceNexus',
    description: 'Interactive timeline of major milestones in space exploration from Sputnik to present-day commercial space.',
  },
  alternates: {
    canonical: 'https://spacenexus.io/timeline',
  },
};

export default function TimelineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
