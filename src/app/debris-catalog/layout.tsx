import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Debris Catalog - Orbital Debris Tracking & Analysis',
  description: 'Comprehensive catalog of tracked orbital debris including fragments, defunct satellites, and rocket bodies. Explore debris events, remediation programs, and Kessler Syndrome risk.',
  keywords: ['space debris', 'orbital debris catalog', 'tracked objects', 'Kessler syndrome', 'debris remediation', 'collision avoidance', 'space junk', 'debris tracking'],
  openGraph: {
    title: 'Space Debris Catalog | SpaceNexus',
    description: 'Comprehensive catalog of 36,500+ tracked orbital debris objects with event timelines, remediation programs, and Kessler Syndrome risk assessment.',
    url: 'https://spacenexus.us/debris-catalog',
    images: [
      {
        url: '/og-debris-catalog.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Space Debris Catalog - Orbital Debris Tracking & Analysis',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Debris Catalog | SpaceNexus',
    description: 'Comprehensive catalog of 36,500+ tracked orbital debris objects with event timelines and risk assessment.',
    images: ['/og-debris-catalog.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/debris-catalog',
  },
};

export default function DebrisCatalogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
