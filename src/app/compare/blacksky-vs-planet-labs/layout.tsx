import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BlackSky vs Planet Labs: Earth Observation Comparison 2026',
  description: 'Compare BlackSky Technology and Planet Labs side by side — satellite constellations, imaging resolution, revisit rates, revenue, defense vs commercial focus, and stock performance (BKSY vs PL).',
  keywords: ['BlackSky vs Planet Labs', 'BKSY vs PL', 'earth observation comparison', 'satellite imagery companies', 'EO satellite comparison 2026', 'BlackSky Planet Labs stock'],
  openGraph: {
    title: 'BlackSky vs Planet Labs: Earth Observation Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of BlackSky and Planet Labs — two leading Earth observation satellite companies.',
    url: 'https://spacenexus.us/compare/blacksky-vs-planet-labs',
    type: 'article',
    images: [{
      url: '/api/og?title=BlackSky+vs+Planet+Labs&subtitle=Earth+Observation+Comparison+2026&type=compare',
      width: 1200,
      height: 630,
      alt: 'BlackSky vs Planet Labs Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BlackSky vs Planet Labs: Earth Observation Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of BlackSky and Planet Labs — satellite imaging, analytics, and market strategy.',
    images: ['/api/og?title=BlackSky+vs+Planet+Labs&subtitle=Earth+Observation+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/blacksky-vs-planet-labs' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
