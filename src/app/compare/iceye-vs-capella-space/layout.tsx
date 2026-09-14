import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'ICEYE vs Capella Space: SAR Satellites Compared (2026)' },
  description: 'ICEYE and Capella Space compared on SAR resolution, constellation size, revisit rate, defense contracts and funding: the two leading radar operators.',
  keywords: ['ICEYE vs Capella Space', 'SAR satellite comparison', 'synthetic aperture radar', 'ICEYE Capella 2026', 'SAR constellation', 'radar satellite companies'],
  openGraph: {
    title: 'ICEYE vs Capella Space: SAR Satellites Compared (2026) | SpaceNexus',
    description: 'ICEYE and Capella Space compared on SAR resolution, constellation size, revisit rate, defense contracts and funding: the two leading radar operators.',
    url: 'https://spacenexus.us/compare/iceye-vs-capella-space',
    type: 'article',
    images: [{
      url: '/api/og?title=ICEYE+vs+Capella+Space&subtitle=SAR+Satellite+Comparison+2026&type=compare',
      width: 1200,
      height: 630,
      alt: 'ICEYE vs Capella Space Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ICEYE vs Capella Space: SAR Satellites Compared (2026) | SpaceNexus',
    description: 'ICEYE and Capella Space compared on SAR resolution, constellation size, revisit rate, defense contracts and funding: the two leading radar operators.',
    images: ['/api/og?title=ICEYE+vs+Capella+Space&subtitle=SAR+Satellite+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/iceye-vs-capella-space' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
