import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Constellation Tracker',
  description: 'Track satellite mega-constellations including Starlink, OneWeb, and Kuiper. Deployment progress, coverage analysis, orbital shell data, and operator comparisons.',
  keywords: [
    'satellite constellation',
    'Starlink tracker',
    'OneWeb',
    'Kuiper',
    'mega-constellation',
    'LEO constellation',
  ],
  openGraph: {
    title: 'Constellation Tracker | SpaceNexus',
    description: 'Track satellite mega-constellations including Starlink, OneWeb, and Kuiper.',
    url: 'https://spacenexus.us/constellations',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Constellation Tracker | SpaceNexus',
    description: 'Track satellite mega-constellations including Starlink, OneWeb, and Kuiper.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/constellations',
  },
};

export default function ConstellationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
