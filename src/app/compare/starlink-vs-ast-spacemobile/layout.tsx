import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Starlink vs AST SpaceMobile: Satellite Internet Comparison 2026',
  description: 'Compare Starlink and AST SpaceMobile (ASTS) side by side — LEO broadband vs direct-to-phone satellite technology, constellation size, speeds, coverage, revenue models, and stock performance.',
  keywords: ['Starlink vs AST SpaceMobile', 'ASTS stock', 'Starlink comparison', 'satellite internet comparison', 'direct-to-device vs broadband', 'AST SpaceMobile Starlink 2026'],
  openGraph: {
    title: 'Starlink vs AST SpaceMobile: Satellite Internet Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Starlink LEO broadband and AST SpaceMobile direct-to-phone satellite connectivity.',
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
    title: 'Starlink vs AST SpaceMobile: Satellite Internet Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Starlink broadband and AST SpaceMobile direct-to-phone satellite technology.',
    images: ['/api/og?title=Starlink+vs+AST+SpaceMobile&subtitle=Satellite+Internet+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/starlink-vs-ast-spacemobile' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
