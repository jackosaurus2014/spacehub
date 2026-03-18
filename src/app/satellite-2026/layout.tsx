import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SpaceNexus at SATELLITE 2026 | March 23-26 Washington DC',
  description: 'Meet the SpaceNexus team at SATELLITE 2026 in Washington DC. See live demos of real-time satellite tracking, market intelligence, government contract tools, and embeddable widgets. Schedule a meeting and get 3 months of Professional free.',
  keywords: [
    'SATELLITE 2026',
    'SATELLITE conference 2026',
    'SATELLITE 2026 Washington DC',
    'space conference 2026',
    'satellite industry conference',
    'SpaceNexus SATELLITE 2026',
    'space industry intelligence',
    'satellite tracking demo',
    'space market intelligence',
  ],
  openGraph: {
    type: 'website',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'SpaceNexus at SATELLITE 2026 | March 23-26, Washington DC',
    description: 'Meet the SpaceNexus team at SATELLITE 2026. See live demos of satellite tracking, market intelligence, and government contract tools. Sign up and get 3 months of Professional free.',
    url: 'https://spacenexus.us/satellite-2026',
    images: ['/api/og?title=SATELLITE%202026&subtitle=SpaceNexus%20at%20Washington%20DC'],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'SpaceNexus at SATELLITE 2026 | March 23-26, Washington DC',
    description: 'Meet the SpaceNexus team at SATELLITE 2026. See live demos and get 3 months of Professional free with code SATELLITE2026.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/satellite-2026',
  },
};

export default function Satellite2026Layout({ children }: { children: React.ReactNode }) {
  return children;
}
