import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ignition Tracker — NASA\'s $20B Moon Base Program | SpaceNexus',
  description: 'Track NASA Project Ignition, the $20 billion program to build a permanent lunar base. Contracts, timeline, companies, and milestones.',
  keywords: [
    'NASA ignition',
    'project ignition',
    'moon base tracker',
    'lunar base program',
    'NASA moon base',
    'artemis ignition',
    'lunar settlement',
    'moon base 2033',
  ],
  openGraph: {
    title: 'Ignition Tracker — NASA\'s $20B Moon Base Program | SpaceNexus',
    description: 'Track NASA Project Ignition, the $20 billion program to build a permanent lunar base. Contracts, timeline, companies, and milestones.',
    url: 'https://spacenexus.us/ignition',
    images: [
      {
        url: '/api/og?title=Ignition+Tracker&subtitle=NASA+Moon+Base+Program&type=data',
        width: 1200,
        height: 630,
        alt: 'Ignition Tracker - NASA Moon Base Program',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ignition Tracker — NASA\'s $20B Moon Base Program | SpaceNexus',
    description: 'Track NASA Project Ignition, the $20 billion program to build a permanent lunar base. Contracts, timeline, companies, and milestones.',
    images: ['/api/og?title=Ignition+Tracker&subtitle=NASA+Moon+Base+Program&type=data'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/ignition',
  },
};

export default function IgnitionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
