import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Station Tracker',
  description: 'Monitor the ISS and commercial space stations. Real-time orbital data, crew updates, research activities, and next-generation station development programs.',
  keywords: [
    'space station',
    'ISS tracker',
    'commercial space station',
    'Axiom Space',
    'Orbital Reef',
    'Tiangong',
  ],
  openGraph: {
    title: 'Space Station Tracker | SpaceNexus',
    description: 'Monitor the ISS and commercial space stations with real-time orbital data and crew updates.',
    url: 'https://spacenexus.us/space-stations',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Station Tracker | SpaceNexus',
    description: 'Monitor the ISS and commercial space stations with real-time orbital data and crew updates.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-stations',
  },
};

export default function SpaceStationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
