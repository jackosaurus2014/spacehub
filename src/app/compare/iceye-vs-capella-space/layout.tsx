import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ICEYE vs Capella Space: SAR Satellite Comparison 2026',
  description: 'Compare ICEYE and Capella Space side by side — SAR satellite technology, imaging resolution, constellation size, customers, defense contracts, funding, and market positioning.',
  keywords: ['ICEYE vs Capella Space', 'SAR satellite comparison', 'synthetic aperture radar', 'ICEYE Capella 2026', 'SAR constellation', 'radar satellite companies'],
  openGraph: {
    title: 'ICEYE vs Capella Space: SAR Satellite Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of ICEYE and Capella Space — the two leading commercial SAR satellite operators.',
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
    title: 'ICEYE vs Capella Space: SAR Satellite Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of ICEYE and Capella Space — SAR technology, resolution, customers, and funding.',
    images: ['/api/og?title=ICEYE+vs+Capella+Space&subtitle=SAR+Satellite+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/iceye-vs-capella-space' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
