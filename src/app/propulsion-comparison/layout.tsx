import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Propulsion Systems Comparison - Engine Database & Analysis',
  description: 'Compare 20+ rocket engines and propulsion technologies side-by-side. Detailed specs for chemical, electric, nuclear thermal, and green propulsion systems with thrust, Isp, and TRL data.',
  keywords: ['rocket engines', 'propulsion comparison', 'specific impulse', 'Hall thruster', 'ion engine', 'Merlin engine', 'Raptor engine', 'RS-25', 'space propulsion'],
  openGraph: {
    title: 'SpaceNexus Propulsion Systems Comparison',
    description: 'Compare 20+ rocket engines and propulsion technologies. Chemical, electric, nuclear thermal, and green propulsion systems with detailed specs.',
    url: 'https://spacenexus.us/propulsion-comparison',
    images: [
      {
        url: '/og-propulsion.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Propulsion Systems Comparison',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus Propulsion Systems Comparison',
    description: 'Compare 20+ rocket engines and propulsion technologies side-by-side.',
    images: ['/og-propulsion.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/propulsion-comparison',
  },
};

export default function PropulsionComparisonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
