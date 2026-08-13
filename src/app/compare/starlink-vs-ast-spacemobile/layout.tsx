import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Starlink vs AST SpaceMobile 2026: 6.5K vs 5 Sats',
  description: 'Starlink\'s 6,500+ satellites vs AST SpaceMobile\'s 5 BlueBirds — LEO broadband vs direct-to-phone. Compare coverage, speeds, revenue, and stock for 2026.',
  keywords: ['Starlink vs AST SpaceMobile', 'AST SpaceMobile', 'ASTS stock', 'Starlink comparison', 'satellite internet comparison', 'direct-to-device vs broadband', 'AST SpaceMobile Starlink 2026'],
  openGraph: {
    title: 'Starlink vs AST SpaceMobile 2026: 6.5K vs 5 Sats',
    description: 'Starlink\'s 6,500+ satellites vs AST SpaceMobile\'s 5 BlueBirds — LEO broadband vs direct-to-phone. Compare coverage, speeds, revenue, and stock for 2026.',
    url: 'https://spacenexus.us/compare/starlink-vs-ast-spacemobile',
    type: 'article',
    images: [{
      url: '/api/og?title=Starlink+vs+AST+SpaceMobile&subtitle=Satellite+Internet+Comparison+2026&type=compare',
      width: 1200,
      height: 630,
      alt: 'Starlink vs AST SpaceMobile Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Starlink vs AST SpaceMobile 2026: 6.5K vs 5 Sats',
    description: 'Starlink\'s 6,500+ satellites vs AST SpaceMobile\'s 5 BlueBirds — LEO broadband vs direct-to-phone, compared for 2026.',
    images: ['/api/og?title=Starlink+vs+AST+SpaceMobile&subtitle=Satellite+Internet+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/starlink-vs-ast-spacemobile' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
