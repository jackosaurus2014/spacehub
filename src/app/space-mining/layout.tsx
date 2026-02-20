import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Asteroid & Space Mining Intelligence',
  description: 'Track asteroid mining ventures and space resource utilization. Target body analysis, extraction economics, regulatory frameworks, and company activity.',
  keywords: [
    'asteroid mining',
    'space mining',
    'space resources',
    'ISRU',
    'asteroid prospecting',
    'in-situ resource',
  ],
  openGraph: {
    title: 'Asteroid & Space Mining Intelligence | SpaceNexus',
    description: 'Track asteroid mining ventures and space resource utilization. Target body analysis, extraction economics, regulatory frameworks, and company activity.',
    url: 'https://spacenexus.us/space-mining',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Asteroid & Space Mining Intelligence | SpaceNexus',
    description: 'Track asteroid mining ventures and space resource utilization. Target body analysis, extraction economics, regulatory frameworks, and company activity.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-mining',
  },
};

export default function SpaceMiningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
