import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iridium vs Globalstar: Satellite Communications Comparison | SpaceNexus',
  description:
    'Compare Iridium and Globalstar side-by-side: constellation architecture, global coverage, IoT services, voice and data capabilities, and satellite phone performance.',
  keywords: [
    'Iridium vs Globalstar',
    'satellite phone comparison',
    'satellite communications comparison',
    'Iridium NEXT vs Globalstar',
    'satellite IoT comparison',
    'mobile satellite services',
    'MSS provider comparison',
  ],
  openGraph: {
    title: 'Iridium vs Globalstar: Satellite Communications Comparison | SpaceNexus',
    description:
      'Compare Iridium and Globalstar side-by-side: constellation architecture, global coverage, IoT services, voice and data capabilities.',
    type: 'website',
    url: 'https://spacenexus.us/compare/iridium-vs-globalstar',
    siteName: 'SpaceNexus',
    images: [
      {
        url: '/api/og?title=Iridium+vs+Globalstar&type=compare',
        width: 1200,
        height: 630,
        alt: 'Iridium vs Globalstar Comparison',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Iridium vs Globalstar: Satellite Communications Comparison | SpaceNexus',
    description:
      'Compare Iridium and Globalstar side-by-side: constellation architecture, global coverage, IoT services, voice and data capabilities.',
    images: ['/api/og?title=Iridium+vs+Globalstar&type=compare'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/compare/iridium-vs-globalstar',
  },
};

export default function IridiumVsGlobalstarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
