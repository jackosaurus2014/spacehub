import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Satellogic vs Planet Labs: Earth Observation Comparison 2026',
  description: 'Compare Satellogic and Planet Labs side by side — hyperspectral vs multispectral imaging, constellation approach, pricing, resolution, and defense customers. Updated 2026.',
  keywords: ['Satellogic vs Planet Labs', 'earth observation comparison', 'hyperspectral satellite', 'multispectral imaging', 'satellite imagery 2026'],
  openGraph: {
    title: 'Satellogic vs Planet Labs: Earth Observation Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Satellogic and Planet Labs — hyperspectral vs multispectral, pricing, and constellation strategy.',
    url: 'https://spacenexus.us/compare/satellogic-vs-planet-labs',
    type: 'article',
    images: [{
      url: '/api/og?title=Satellogic+vs+Planet+Labs&subtitle=Earth+Observation+Comparison+2026&type=compare',
      width: 1200,
      height: 630,
      alt: 'Satellogic vs Planet Labs Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Satellogic vs Planet Labs: Earth Observation Comparison 2026 | SpaceNexus',
    description: 'Satellogic vs Planet Labs — comparing hyperspectral and multispectral Earth observation approaches.',
    images: ['/api/og?title=Satellogic+vs+Planet+Labs&subtitle=Earth+Observation+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/satellogic-vs-planet-labs' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
