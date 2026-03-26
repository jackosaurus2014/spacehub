import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iridium vs Starlink: Satellite Connectivity Comparison 2026',
  description: 'Compare Iridium and Starlink side by side — L-band IoT/voice vs Ka/Ku broadband, coverage, latency, use cases, pricing, and constellation architecture. Updated 2026.',
  keywords: ['Iridium vs Starlink', 'satellite internet comparison', 'LEO satellite connectivity', 'Iridium NEXT', 'Starlink broadband', 'satellite IoT 2026'],
  openGraph: {
    title: 'Iridium vs Starlink: Satellite Connectivity Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Iridium and Starlink — L-band voice/IoT vs broadband, coverage models, and target markets.',
    url: 'https://spacenexus.us/compare/iridium-vs-starlink',
    type: 'article',
    images: [{
      url: '/api/og?title=Iridium+vs+Starlink&subtitle=Satellite+Connectivity+Comparison+2026&type=compare',
      width: 1200,
      height: 630,
      alt: 'Iridium vs Starlink Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Iridium vs Starlink: Satellite Connectivity Comparison 2026 | SpaceNexus',
    description: 'Iridium vs Starlink — fundamentally different satellite connectivity approaches compared.',
    images: ['/api/og?title=Iridium+vs+Starlink&subtitle=Satellite+Connectivity+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/iridium-vs-starlink' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
