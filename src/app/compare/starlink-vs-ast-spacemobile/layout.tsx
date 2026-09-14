import type { Metadata } from 'next';

// Figure fix (2026-09-14): title and description said Starlink had 6,500+
// satellites while the page's own comparison table (and /compare/starlink-vs-oneweb,
// /compare/starlink-vs-kuiper) said 10,000+. The table was right.
export const metadata: Metadata = {
  title: { absolute: 'Starlink vs AST SpaceMobile 2026: 10,000+ vs 5 Sats' },
  description: 'Starlink runs 10,000+ satellites; AST SpaceMobile runs 5 BlueBirds. Dish broadband vs direct-to-phone: coverage, speed, revenue and ASTS stock compared.',
  keywords: ['Starlink vs AST SpaceMobile', 'AST SpaceMobile', 'ASTS stock', 'Starlink comparison', 'satellite internet comparison', 'direct-to-device vs broadband', 'AST SpaceMobile Starlink 2026'],
  openGraph: {
    title: 'Starlink vs AST SpaceMobile 2026: 10,000+ vs 5 Sats | SpaceNexus',
    description: 'Starlink runs 10,000+ satellites; AST SpaceMobile runs 5 BlueBirds. Dish broadband vs direct-to-phone: coverage, speed, revenue and ASTS stock compared.',
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
    title: 'Starlink vs AST SpaceMobile 2026: 10,000+ vs 5 Sats | SpaceNexus',
    description: 'Starlink runs 10,000+ satellites; AST SpaceMobile runs 5 BlueBirds. Dish broadband vs direct-to-phone: coverage, speed, revenue and ASTS stock compared.',
    images: ['/api/og?title=Starlink+vs+AST+SpaceMobile&subtitle=Satellite+Internet+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/starlink-vs-ast-spacemobile' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
